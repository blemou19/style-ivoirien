// ===================== CONNEXION =====================
const loginForm = document.getElementById('admin-login-form');
const loginErreur = document.getElementById('admin-erreur');

async function verifierSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    afficherAdmin();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const code = document.getElementById('admin-code').value.trim();

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: code });
  if (error) {
    loginErreur.textContent = "Code incorrect. Réessaie.";
    return;
  }
  afficherAdmin();
});

function afficherAdmin() {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-shell').style.display = 'block';
  chargerProduitsAdmin();
  chargerCommandesAdmin();
  chargerRendezVousAdmin();
  chargerIndisponibilitesAdmin();
}

document.getElementById('admin-deconnexion').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

// ===================== ONGLETS =====================
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('actif'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('actif'));
    tab.classList.add('actif');
    document.getElementById('panel-' + tab.dataset.panel).classList.add('actif');
  });
});

// ===================== PRODUITS =====================
document.getElementById('form-nouveau-produit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boutonSubmit = e.target.querySelector('button[type="submit"]');
  const statutEl = document.getElementById('p-image-statut');
  const fichier = document.getElementById('p-image-file').files[0];

  boutonSubmit.disabled = true;
  boutonSubmit.textContent = 'Envoi en cours...';

  let imageUrl = '';

  if (fichier) {
    statutEl.textContent = 'Envoi de la photo...';
    const nomFichier = `${Date.now()}-${fichier.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    const { error: erreurUpload } = await supabaseClient.storage
      .from('produits')
      .upload(nomFichier, fichier);

    if (erreurUpload) {
      alert("Erreur lors de l'envoi de la photo : " + erreurUpload.message);
      boutonSubmit.disabled = false;
      boutonSubmit.textContent = 'Ajouter le produit';
      statutEl.textContent = '';
      return;
    }

    const { data: urlData } = supabaseClient.storage.from('produits').getPublicUrl(nomFichier);
    imageUrl = urlData.publicUrl;
  }

  statutEl.textContent = '';

  const { error } = await supabaseClient.from('produits').insert({
    nom: document.getElementById('p-nom').value.trim(),
    categorie: document.getElementById('p-categorie').value.trim(),
    prix: Number(document.getElementById('p-prix').value),
    description: document.getElementById('p-description').value.trim(),
    image_url: imageUrl,
    tailles: document.getElementById('p-tailles').value.trim(),
    actif: true
  });

  boutonSubmit.disabled = false;
  boutonSubmit.textContent = 'Ajouter le produit';

  if (error) {
    alert("Erreur lors de l'ajout : " + error.message);
    return;
  }
  e.target.reset();
  chargerProduitsAdmin();
});

async function chargerProduitsAdmin() {
  const { data, error } = await supabaseClient.from('produits').select('*').order('cree_le', { ascending: false });
  const tbody = document.getElementById('tbody-produits');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="6">Erreur de chargement.</td></tr>'; return; }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.image_url ? `<img src="${p.image_url}" alt="">` : '—'}</td>
      <td>${p.nom}</td>
      <td>${p.categorie}</td>
      <td>${Number(p.prix).toLocaleString('fr-FR')} GNF</td>
      <td>
        <select data-id="${p.id}" class="select-actif-produit">
          <option value="true" ${p.actif ? 'selected' : ''}>En vente</option>
          <option value="false" ${!p.actif ? 'selected' : ''}>Masqué</option>
        </select>
      </td>
      <td><button class="admin-action-btn" data-id="${p.id}" data-action="supprimer-produit">Supprimer</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-actif-produit').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('produits').update({ actif: sel.value === 'true' }).eq('id', sel.dataset.id);
    });
  });
  document.querySelectorAll('[data-action="supprimer-produit"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce produit définitivement ?')) return;
      await supabaseClient.from('produits').delete().eq('id', btn.dataset.id);
      chargerProduitsAdmin();
    });
  });
}

// ===================== COMMANDES =====================
async function chargerCommandesAdmin() {
  const { data, error } = await supabaseClient.from('commandes').select('*').order('cree_le', { ascending: false });
  const tbody = document.getElementById('tbody-commandes');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="6">Erreur de chargement.</td></tr>'; return; }

  document.getElementById('stat-total-commandes').textContent = data.length;
  const confirmees = data.filter(c => c.statut === 'Confirmée' || c.statut === 'Livrée');
  const chiffreAffaires = confirmees.reduce((s, c) => s + Number(c.total), 0);
  document.getElementById('stat-ca').textContent = chiffreAffaires.toLocaleString('fr-FR') + ' GNF';
  document.getElementById('stat-en-attente').textContent = data.filter(c => c.statut === 'En attente').length;

  tbody.innerHTML = data.map(c => `
    <tr>
      <td>${new Date(c.cree_le).toLocaleDateString('fr-FR')}</td>
      <td>${c.client_nom}<br><span style="color:#7a6f64;">${c.client_telephone}</span></td>
      <td>${c.articles.length} article(s)</td>
      <td>${Number(c.total).toLocaleString('fr-FR')} GNF</td>
      <td>
        <select data-id="${c.id}" class="select-statut-commande">
          <option ${c.statut==='En attente'?'selected':''}>En attente</option>
          <option ${c.statut==='Confirmée'?'selected':''}>Confirmée</option>
          <option ${c.statut==='Livrée'?'selected':''}>Livrée</option>
          <option ${c.statut==='Annulée'?'selected':''}>Annulée</option>
        </select>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-statut-commande').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('commandes').update({ statut: sel.value }).eq('id', sel.dataset.id);
      chargerCommandesAdmin();
    });
  });
}

// ===================== RENDEZ-VOUS =====================
async function chargerRendezVousAdmin() {
  const { data, error } = await supabaseClient.from('rendez_vous').select('*').order('date_souhaitee', { ascending: true });
  const tbody = document.getElementById('tbody-rdv');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="6">Erreur de chargement.</td></tr>'; return; }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${new Date(r.date_souhaitee).toLocaleDateString('fr-FR')} ${r.heure_souhaitee || ''}</td>
      <td>${r.client_nom}<br><span style="color:#7a6f64;">${r.client_telephone}</span></td>
      <td>${r.type_vetement}</td>
      <td>${r.mode}</td>
      <td>
        <select data-id="${r.id}" class="select-statut-rdv">
          <option ${r.statut==='Nouvelle demande'?'selected':''}>Nouvelle demande</option>
          <option ${r.statut==='Confirmé'?'selected':''}>Confirmé</option>
          <option ${r.statut==='Terminé'?'selected':''}>Terminé</option>
          <option ${r.statut==='Annulé'?'selected':''}>Annulé</option>
        </select>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-statut-rdv').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('rendez_vous').update({ statut: sel.value }).eq('id', sel.dataset.id);
    });
  });
}

// ===================== INDISPONIBILITES =====================
document.getElementById('form-indispo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.from('indisponibilites').insert({
    date_debut: document.getElementById('indispo-debut').value,
    date_fin: document.getElementById('indispo-fin').value,
    motif: document.getElementById('indispo-motif').value.trim()
  });
  if (error) { alert("Erreur : " + error.message); return; }
  e.target.reset();
  chargerIndisponibilitesAdmin();
});

async function chargerIndisponibilitesAdmin() {
  const { data, error } = await supabaseClient.from('indisponibilites').select('*').order('date_debut', { ascending: true });
  const tbody = document.getElementById('tbody-indispo');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="4">Erreur de chargement.</td></tr>'; return; }

  tbody.innerHTML = data.map(i => `
    <tr>
      <td>${new Date(i.date_debut).toLocaleDateString('fr-FR')}</td>
      <td>${new Date(i.date_fin).toLocaleDateString('fr-FR')}</td>
      <td>${i.motif || '—'}</td>
      <td><button class="admin-action-btn" data-id="${i.id}" data-action="supprimer-indispo">Supprimer</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-action="supprimer-indispo"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('indisponibilites').delete().eq('id', btn.dataset.id);
      chargerIndisponibilitesAdmin();
    });
  });
}

verifierSession();
