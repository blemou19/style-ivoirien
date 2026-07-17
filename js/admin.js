// ===================== CONNEXION =====================
const loginForm = document.getElementById('admin-login-form');
const loginErreur = document.getElementById('admin-erreur');
const BASE_URL = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

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
  chargerAvisAdmin();
  chargerModelesAdmin();
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
let produitsCache = [];

function formatRefProduit(num) {
  return num ? `P-${String(num).padStart(4, '0')}` : '—';
}

function commencerEdition(id) {
  const produit = produitsCache.find(p => p.id === id);
  if (!produit) return;

  document.getElementById('p-edit-id').value = produit.id;
  document.getElementById('p-nom').value = produit.nom;
  document.getElementById('p-categorie').value = produit.categorie;
  document.getElementById('p-prix').value = produit.prix;
  document.getElementById('p-tailles').value = produit.tailles || '';
  document.getElementById('p-stock').value = produit.stock ?? '';
  document.getElementById('p-description').value = produit.description || '';
  document.getElementById('p-image').value = produit.image_url || '';
  document.getElementById('p-video').value = produit.video_url || '';
  document.getElementById('p-image-actuelle-label').textContent = produit.image_url ? '(une photo existe déjà, choisis-en une seulement si tu veux la remplacer)' : '';
  document.getElementById('p-video-actuelle-label').textContent = produit.video_url ? '(une vidéo existe déjà, choisis-en une seulement si tu veux la remplacer)' : '';

  document.getElementById('p-submit-btn').textContent = 'Enregistrer les modifications';
  document.getElementById('p-annuler-btn').style.display = 'inline-flex';

  document.getElementById('form-nouveau-produit').scrollIntoView({ behavior: 'smooth' });
}

function annulerEdition() {
  document.getElementById('form-nouveau-produit').reset();
  document.getElementById('p-edit-id').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-video').value = '';
  document.getElementById('p-image-actuelle-label').textContent = '';
  document.getElementById('p-video-actuelle-label').textContent = '';
  document.getElementById('p-submit-btn').textContent = 'Ajouter le produit';
  document.getElementById('p-annuler-btn').style.display = 'none';
}

document.getElementById('p-annuler-btn').addEventListener('click', annulerEdition);

document.getElementById('form-nouveau-produit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boutonSubmit = document.getElementById('p-submit-btn');
  const statutEl = document.getElementById('p-image-statut');
  const fichierImage = document.getElementById('p-image-file').files[0];
  const fichierVideo = document.getElementById('p-video-file').files[0];
  const editId = document.getElementById('p-edit-id').value;

  boutonSubmit.disabled = true;
  boutonSubmit.textContent = 'Envoi en cours...';

  let imageUrl = document.getElementById('p-image').value || '';
  let videoUrl = document.getElementById('p-video').value || '';

  if (fichierImage) {
    statutEl.textContent = 'Envoi de la photo...';
    const nomFichier = `${Date.now()}-${fichierImage.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: erreurUpload } = await supabaseClient.storage.from('produits').upload(nomFichier, fichierImage);
    if (erreurUpload) {
      alert("Erreur lors de l'envoi de la photo : " + erreurUpload.message);
      boutonSubmit.disabled = false;
      boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le produit';
      statutEl.textContent = '';
      return;
    }
    const { data: urlData } = supabaseClient.storage.from('produits').getPublicUrl(nomFichier);
    imageUrl = urlData.publicUrl;
  }

  if (fichierVideo) {
    statutEl.textContent = 'Envoi de la vidéo...';
    const nomFichierVideo = `${Date.now()}-${fichierVideo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: erreurUploadVideo } = await supabaseClient.storage.from('produits').upload(nomFichierVideo, fichierVideo);
    if (erreurUploadVideo) {
      alert("Erreur lors de l'envoi de la vidéo : " + erreurUploadVideo.message);
      boutonSubmit.disabled = false;
      boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le produit';
      statutEl.textContent = '';
      return;
    }
    const { data: urlDataVideo } = supabaseClient.storage.from('produits').getPublicUrl(nomFichierVideo);
    videoUrl = urlDataVideo.publicUrl;
  }

  statutEl.textContent = '';

  const donneesProduit = {
    nom: document.getElementById('p-nom').value.trim(),
    categorie: document.getElementById('p-categorie').value.trim(),
    prix: Number(document.getElementById('p-prix').value),
    description: document.getElementById('p-description').value.trim(),
    image_url: imageUrl,
    video_url: videoUrl,
    tailles: document.getElementById('p-tailles').value.trim(),
    stock: document.getElementById('p-stock').value === '' ? null : Number(document.getElementById('p-stock').value),
  };

  let error;
  if (editId) {
    ({ error } = await supabaseClient.from('produits').update(donneesProduit).eq('id', editId));
  } else {
    ({ error } = await supabaseClient.from('produits').insert({ ...donneesProduit, actif: true }));
  }

  boutonSubmit.disabled = false;

  if (error) {
    alert("Erreur : " + error.message);
    boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le produit';
    return;
  }

  annulerEdition();
  chargerProduitsAdmin();
});

async function chargerProduitsAdmin() {
  const { data, error } = await supabaseClient.from('produits').select('*').order('cree_le', { ascending: false });
  const tbody = document.getElementById('tbody-produits');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="8">Erreur de chargement.</td></tr>'; return; }

  produitsCache = data;

  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.image_url ? `<img src="${p.image_url}" alt="">` : '—'}</td>
      <td style="font-family:var(--font-mono); font-size:11px;">${formatRefProduit(p.num)}</td>
      <td>${p.nom}${p.video_url ? ' 🎥' : ''}</td>
      <td>${p.categorie}</td>
      <td>${Number(p.prix).toLocaleString('fr-FR')} GNF</td>
      <td>${p.stock !== null && p.stock !== undefined ? p.stock : '∞'}</td>
      <td>
        <select data-id="${p.id}" class="select-actif-produit">
          <option value="true" ${p.actif ? 'selected' : ''}>En vente</option>
          <option value="false" ${!p.actif ? 'selected' : ''}>Masqué</option>
        </select>
      </td>
      <td style="white-space:nowrap;">
        <button class="admin-action-btn" data-id="${p.id}" data-action="modifier-produit">Modifier</button>
        <button class="admin-action-btn" data-id="${p.id}" data-action="supprimer-produit">Supprimer</button>
      </td>
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
  document.querySelectorAll('[data-action="modifier-produit"]').forEach(btn => {
    btn.addEventListener('click', () => commencerEdition(btn.dataset.id));
  });
}

// ===================== COMMANDES =====================
let commandesCache = [];

async function chargerCommandesAdmin() {
  const { data, error } = await supabaseClient.from('commandes').select('*').order('cree_le', { ascending: false });
  const tbody = document.getElementById('tbody-commandes');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="6">Erreur de chargement.</td></tr>'; return; }

  commandesCache = data;

  document.getElementById('stat-total-commandes').textContent = data.length;
  const confirmees = data.filter(c => c.statut === 'Confirmée' || c.statut === 'Livrée');
  const chiffreAffaires = confirmees.reduce((s, c) => s + Number(c.total), 0);
  document.getElementById('stat-ca').textContent = chiffreAffaires.toLocaleString('fr-FR') + ' GNF';
  document.getElementById('stat-en-attente').textContent = data.filter(c => c.statut === 'En attente').length;

  tbody.innerHTML = data.map(c => `
    <tr>
      <td>${c.reference || '—'}<br><span style="color:#7a6f64; font-size:11px;">${new Date(c.cree_le).toLocaleDateString('fr-FR')}</span></td>
      <td>${c.client_nom}<br><span style="color:#7a6f64;">${c.client_telephone}</span></td>
      <td>${c.articles.length} article(s)<br><span style="color:#7a6f64; font-size:11px;">${c.zone_livraison || ''}</span></td>
      <td>${Number(c.total).toLocaleString('fr-FR')} GNF</td>
      <td>
        <select data-id="${c.id}" class="select-statut-commande">
          <option ${c.statut==='En attente'?'selected':''}>En attente</option>
          <option ${c.statut==='Confirmée'?'selected':''}>Confirmée</option>
          <option ${c.statut==='Livrée'?'selected':''}>Livrée</option>
          <option ${c.statut==='Annulée'?'selected':''}>Annulée</option>
        </select>
      </td>
      <td><button class="admin-action-btn" data-id="${c.id}" data-action="contacter-commande">Contacter</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-statut-commande').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('commandes').update({ statut: sel.value }).eq('id', sel.dataset.id);
      chargerCommandesAdmin();
    });
  });

  document.querySelectorAll('[data-action="contacter-commande"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = commandesCache.find(x => x.id === btn.dataset.id);
      if (!c) return;
      const statutActuel = document.querySelector(`.select-statut-commande[data-id="${c.id}"]`).value;
      const totalFormate = Number(c.total).toLocaleString('fr-FR') + ' GNF';

      const messages = {
        'En attente': `Bonjour ${c.client_nom}, nous avons bien reçu votre commande (${totalFormate}). Nous revenons vers vous rapidement pour la confirmer.`,
        'Confirmée': `Bonjour ${c.client_nom}, votre commande (${totalFormate}) est confirmée ! Nous préparons vos articles.`,
        'Livrée': `Bonjour ${c.client_nom}, votre commande a bien été livrée. Merci pour votre confiance ! N'hésitez pas à laisser un avis : ${BASE_URL}avis.html?type=commande&ref=${c.reference || ''}&nom=${encodeURIComponent(c.client_nom)}`,
        'Annulée': `Bonjour ${c.client_nom}, votre commande (${totalFormate}) a été annulée. N'hésitez pas à repasser commande si besoin.`
      };
      const message = messages[statutActuel] || `Bonjour ${c.client_nom}, `;
      const numero = c.client_telephone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(message)}`, '_blank');
    });
  });
}

// ===================== RENDEZ-VOUS =====================
let rdvCache = [];

async function chargerRendezVousAdmin() {
  const { data, error } = await supabaseClient.from('rendez_vous').select('*').order('date_souhaitee', { ascending: true });
  const tbody = document.getElementById('tbody-rdv');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="6">Erreur de chargement.</td></tr>'; return; }

  rdvCache = data;

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${new Date(r.date_souhaitee).toLocaleDateString('fr-FR')} ${r.heure_souhaitee || ''}</td>
      <td>${r.client_nom}<br><span style="color:#7a6f64;">${r.client_telephone}</span></td>
      <td>${r.type_vetement}${r.modele_ref ? `<br><span style="color:#7a6f64; font-size:11px;">Catalogue : ${r.modele_ref}</span>` : ''}</td>
      <td>${r.mode}<br><span style="color:#7a6f64; font-size:11px;">${r.zone_livraison || ''}</span></td>
      <td>
        <select data-id="${r.id}" class="select-statut-rdv">
          <option ${r.statut==='Nouvelle demande'?'selected':''}>Nouvelle demande</option>
          <option ${r.statut==='Confirmé'?'selected':''}>Confirmé</option>
          <option ${r.statut==='Terminé'?'selected':''}>Terminé</option>
          <option ${r.statut==='Annulé'?'selected':''}>Annulé</option>
        </select>
      </td>
      <td><button class="admin-action-btn" data-id="${r.id}" data-action="contacter-rdv">Contacter</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-statut-rdv').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('rendez_vous').update({ statut: sel.value }).eq('id', sel.dataset.id);
    });
  });

  document.querySelectorAll('[data-action="contacter-rdv"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = rdvCache.find(x => x.id === btn.dataset.id);
      if (!r) return;
      const statutActuel = document.querySelector(`.select-statut-rdv[data-id="${r.id}"]`).value;
      const dateLisible = new Date(r.date_souhaitee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

      const messages = {
        'Nouvelle demande': `Bonjour ${r.client_nom}, nous avons bien reçu votre demande pour "${r.type_vetement}" le ${dateLisible} à ${r.heure_souhaitee}. Nous revenons vers vous rapidement.`,
        'Confirmé': `Bonjour ${r.client_nom}, votre rendez-vous pour "${r.type_vetement}" est confirmé pour le ${dateLisible} à ${r.heure_souhaitee}. À bientôt !`,
        'Terminé': `Bonjour ${r.client_nom}, merci d'être passée pour votre "${r.type_vetement}" ! N'hésitez pas à laisser un avis : ${BASE_URL}avis.html?type=rendez_vous&nom=${encodeURIComponent(r.client_nom)} — et à revenir vers nous pour une prochaine création.`,
        'Annulé': `Bonjour ${r.client_nom}, nous sommes désolés, votre rendez-vous du ${dateLisible} pour "${r.type_vetement}" a dû être annulé. N'hésitez pas à reprendre rendez-vous à une autre date.`
      };
      const message = messages[statutActuel] || `Bonjour ${r.client_nom}, `;
      const numero = r.client_telephone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(message)}`, '_blank');
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

// ===================== AVIS =====================
async function chargerAvisAdmin() {
  const { data, error } = await supabaseClient.from('avis').select('*').order('cree_le', { ascending: false });
  const tbody = document.getElementById('tbody-avis');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="7">Erreur de chargement.</td></tr>'; return; }

  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${new Date(a.cree_le).toLocaleDateString('fr-FR')}</td>
      <td>${a.type === 'commande' ? 'Commande' : 'Sur mesure'}${a.reference ? `<br><span style="color:#7a6f64; font-size:11px;">${a.reference}</span>` : ''}</td>
      <td>${a.client_nom}</td>
      <td>${'★'.repeat(a.note)}${'☆'.repeat(5 - a.note)}</td>
      <td style="max-width:220px;">${a.commentaire || '—'}</td>
      <td>
        <select data-id="${a.id}" class="select-visible-avis">
          <option value="true" ${a.visible ? 'selected' : ''}>Visible</option>
          <option value="false" ${!a.visible ? 'selected' : ''}>Masqué</option>
        </select>
      </td>
      <td><button class="admin-action-btn" data-id="${a.id}" data-action="supprimer-avis">Supprimer</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-visible-avis').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('avis').update({ visible: sel.value === 'true' }).eq('id', sel.dataset.id);
    });
  });
  document.querySelectorAll('[data-action="supprimer-avis"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cet avis ?')) return;
      await supabaseClient.from('avis').delete().eq('id', btn.dataset.id);
      chargerAvisAdmin();
    });
  });
}

// ===================== CATALOGUE (MODELES) =====================
let modelesCache = [];

function commencerEditionModele(id) {
  const m = modelesCache.find(x => x.id === id);
  if (!m) return;

  document.getElementById('m-edit-id').value = m.id;
  document.getElementById('m-nom').value = m.nom;
  document.getElementById('m-categorie').value = m.categorie;
  document.getElementById('m-description').value = m.description || '';
  document.getElementById('m-image').value = m.image_url || '';
  document.getElementById('m-video').value = m.video_url || '';
  document.getElementById('m-image-actuelle-label').textContent = m.image_url ? '(une photo existe déjà)' : '';
  document.getElementById('m-video-actuelle-label').textContent = m.video_url ? '(une vidéo existe déjà)' : '';
  document.getElementById('m-submit-btn').textContent = 'Enregistrer les modifications';
  document.getElementById('m-annuler-btn').style.display = 'inline-flex';
  document.getElementById('form-nouveau-modele').scrollIntoView({ behavior: 'smooth' });
}

function annulerEditionModele() {
  document.getElementById('form-nouveau-modele').reset();
  document.getElementById('m-edit-id').value = '';
  document.getElementById('m-image').value = '';
  document.getElementById('m-video').value = '';
  document.getElementById('m-image-actuelle-label').textContent = '';
  document.getElementById('m-video-actuelle-label').textContent = '';
  document.getElementById('m-submit-btn').textContent = 'Ajouter le modèle';
  document.getElementById('m-annuler-btn').style.display = 'none';
}
document.getElementById('m-annuler-btn').addEventListener('click', annulerEditionModele);

document.getElementById('form-nouveau-modele').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boutonSubmit = document.getElementById('m-submit-btn');
  const statutEl = document.getElementById('m-image-statut');
  const fichierImage = document.getElementById('m-image-file').files[0];
  const fichierVideo = document.getElementById('m-video-file').files[0];
  const editId = document.getElementById('m-edit-id').value;

  boutonSubmit.disabled = true;
  boutonSubmit.textContent = 'Envoi en cours...';

  let imageUrl = document.getElementById('m-image').value || '';
  let videoUrl = document.getElementById('m-video').value || '';

  if (fichierImage) {
    statutEl.textContent = 'Envoi de la photo...';
    const nomFichier = `modele-${Date.now()}-${fichierImage.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: erreurUpload } = await supabaseClient.storage.from('produits').upload(nomFichier, fichierImage);
    if (erreurUpload) {
      alert("Erreur lors de l'envoi de la photo : " + erreurUpload.message);
      boutonSubmit.disabled = false;
      boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le modèle';
      statutEl.textContent = '';
      return;
    }
    const { data: urlData } = supabaseClient.storage.from('produits').getPublicUrl(nomFichier);
    imageUrl = urlData.publicUrl;
  }

  if (fichierVideo) {
    statutEl.textContent = 'Envoi de la vidéo...';
    const nomFichierVideo = `modele-${Date.now()}-${fichierVideo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: erreurUploadVideo } = await supabaseClient.storage.from('produits').upload(nomFichierVideo, fichierVideo);
    if (erreurUploadVideo) {
      alert("Erreur lors de l'envoi de la vidéo : " + erreurUploadVideo.message);
      boutonSubmit.disabled = false;
