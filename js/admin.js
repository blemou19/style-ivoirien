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
  document.getElementById('p-a-la-une').checked = !!produit.a_la_une;
  imagesSupplementaires = Array.isArray(produit.images) ? [...produit.images] : [];
  afficherImagesSupplementaires();
  document.getElementById('p-description').value = produit.description || '';
  document.getElementById('p-image').value = produit.image_url || '';
  document.getElementById('p-video').value = produit.video_url || '';
  document.getElementById('p-image-actuelle-label').textContent = produit.image_url ? '(une photo existe déjà, choisis-en une seulement si tu veux la remplacer)' : '';
  document.getElementById('p-video-actuelle-label').textContent = produit.video_url ? '(une vidéo existe déjà, choisis-en une seulement si tu veux la remplacer)' : '';

  document.getElementById('p-submit-btn').textContent = 'Enregistrer les modifications';
  ouvrirFormulaire('form-nouveau-produit');
}

function annulerEdition() {
  document.getElementById('form-nouveau-produit').reset();
  document.getElementById('p-edit-id').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-video').value = '';
  document.getElementById('p-image-actuelle-label').textContent = '';
  document.getElementById('p-video-actuelle-label').textContent = '';
  document.getElementById('p-submit-btn').textContent = 'Ajouter le produit';
  fermerFormulaire('form-nouveau-produit');
  imagesSupplementaires = [];
  afficherImagesSupplementaires();
}

document.getElementById('p-annuler-btn').addEventListener('click', annulerEdition);

document.getElementById('form-nouveau-produit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boutonSubmit = document.getElementById('p-submit-btn');
  const statutEl = document.getElementById('p-image-statut');
  let fichierImage = document.getElementById('p-image-file').files[0];
  const fichierVideo = document.getElementById('p-video-file').files[0];
  const editId = document.getElementById('p-edit-id').value;

  boutonSubmit.disabled = true;
  boutonSubmit.textContent = 'Envoi en cours...';

  let imageUrl = document.getElementById('p-image').value || '';
  let videoUrl = document.getElementById('p-video').value || '';

  if (fichierImage) {
    statutEl.textContent = 'Compression de la photo...';
    fichierImage = await compresserImage(fichierImage);
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

  // photos supplémentaires (plusieurs angles)
  const nouvellesPhotos = [...document.getElementById('p-images-file').files];
  for (let k = 0; k < nouvellesPhotos.length; k++) {
    statutEl.textContent = `Envoi des autres photos (${k + 1}/${nouvellesPhotos.length})...`;
    const fichier = await compresserImage(nouvellesPhotos[k]);
    const nom = `${Date.now()}-${k}-${fichier.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: errPhoto } = await supabaseClient.storage.from('produits').upload(nom, fichier);
    if (errPhoto) {
      alert("Erreur lors de l'envoi d'une photo : " + errPhoto.message);
      boutonSubmit.disabled = false;
      boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le produit';
      statutEl.textContent = '';
      return;
    }
    imagesSupplementaires.push(supabaseClient.storage.from('produits').getPublicUrl(nom).data.publicUrl);
  }

  if (videoTropLourde(fichierVideo)) {
    alert(`Vidéo trop lourde (max ${TAILLE_MAX_VIDEO_MO} Mo). Raccourcis-la ou réduis sa qualité avant de l'envoyer.`);
    boutonSubmit.disabled = false;
    boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le produit';
    statutEl.textContent = '';
    return;
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

  if (document.getElementById('p-a-la-une').checked && !videoUrl) {
    alert("Pour mettre ce produit à la une, ajoute d'abord une vidéo.");
  }

  const donneesProduit = {
    nom: document.getElementById('p-nom').value.trim(),
    categorie: document.getElementById('p-categorie').value.trim(),
    prix: Number(document.getElementById('p-prix').value),
    description: document.getElementById('p-description').value.trim(),
    image_url: imageUrl,
    video_url: videoUrl,
    tailles: document.getElementById('p-tailles').value.trim(),
    stock: document.getElementById('p-stock').value === '' ? null : Number(document.getElementById('p-stock').value),
    a_la_une: document.getElementById('p-a-la-une').checked && !!videoUrl,
    images: imagesSupplementaires,
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
  let { data, error } = await supabaseClient.from('produits').select('*')
    .order('ordre', { ascending: true, nullsFirst: true }).order('cree_le', { ascending: false });
  ordreDisponible = !error;
  if (error) ({ data, error } = await supabaseClient.from('produits').select('*').order('cree_le', { ascending: false }));
  const tbody = document.getElementById('tbody-produits');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="8">Erreur de chargement.</td></tr>'; return; }

  produitsCache = data;

  tbody.innerHTML = data.map(p => `
    <tr data-id="${esc(p.id)}">
      <td class="admin-td-glisser"><span class="poignee-glisser" title="Glisser pour changer l'ordre" aria-label="Glisser pour changer l'ordre">⠿</span></td>
      <td>${p.image_url ? `<img src="${urlSure(p.image_url)}" alt="">` : '—'}</td>
      <td style="font-family:var(--font-mono); font-size:11px;">${formatRefProduit(p.num)}</td>
      <td>${esc(p.nom)}${p.video_url ? ' 🎥' : ''}${p.a_la_une ? ' <span class="admin-badge-une">À la une</span>' : ''}${Array.isArray(p.images) && p.images.length ? ` <span style="font-size:11px; color:#665b51;">+${p.images.length} photo(s)</span>` : ''}</td>
      <td>${esc(p.categorie)}</td>
      <td>${Number(p.prix).toLocaleString('fr-FR')} GNF</td>
      <td>${p.stock !== null && p.stock !== undefined ? p.stock : '∞'}</td>
      <td>
        <select data-id="${esc(p.id)}" class="select-actif-produit">
          <option value="true" ${p.actif ? 'selected' : ''}>En vente</option>
          <option value="false" ${!p.actif ? 'selected' : ''}>Masqué</option>
        </select>
      </td>
      <td style="white-space:nowrap;">
        <button class="admin-action-btn" data-id="${esc(p.id)}" data-action="modifier-produit">Modifier</button>
        <button class="admin-action-btn" data-id="${esc(p.id)}" data-action="supprimer-produit">Supprimer</button>
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
  activerGlisser(tbody);
}

// ===================== ORDRE DES PRODUITS (glisser-déposer) =====================
// On attrape un produit par sa poignée ⠿ et on le fait glisser : l'ordre est enregistré
// dans la colonne "ordre" et le site affiche les produits dans cet ordre.
let ordreDisponible = true;
function activerGlisser(tbody) {
  tbody.querySelectorAll('.poignee-glisser').forEach(poignee => {
    poignee.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const ligne = poignee.closest('tr');
      const ordreAvant = [...tbody.children].map(tr => tr.dataset.id).join(',');
      ligne.classList.add('ligne-glissee');

      const bouger = ev => {
        const y = ev.clientY;
        const autres = [...tbody.children].filter(tr => tr !== ligne);
        let avant = null;
        for (const tr of autres) {
          const r = tr.getBoundingClientRect();
          if (y < r.top + r.height / 2) { avant = tr; break; }
        }
        if (avant) { if (ligne.nextSibling !== avant) tbody.insertBefore(ligne, avant); }
        else if (tbody.lastElementChild !== ligne) tbody.appendChild(ligne);
        // défilement automatique près des bords de l'écran
        if (y < 70) window.scrollBy(0, -12); else if (y > window.innerHeight - 70) window.scrollBy(0, 12);
      };
      const lacher = () => {
        window.removeEventListener('pointermove', bouger);
        window.removeEventListener('pointerup', lacher);
        window.removeEventListener('pointercancel', lacher);
        ligne.classList.remove('ligne-glissee');
        const ids = [...tbody.children].map(tr => tr.dataset.id);
        if (ids.join(',') !== ordreAvant) enregistrerOrdre(ids);
      };
      // écoute sur toute la fenêtre : la ligne change de place dans le tableau pendant le glisser
      window.addEventListener('pointermove', bouger);
      window.addEventListener('pointerup', lacher);
      window.addEventListener('pointercancel', lacher);
    });
  });
}

async function enregistrerOrdre(ids) {
  const statut = document.getElementById('ordre-statut');
  if (!ordreDisponible) {
    statut.textContent = "Impossible d'enregistrer l'ordre : la colonne « ordre » n'existe pas encore dans la base.";
    statut.className = 'ordre-statut erreur';
    return;
  }
  statut.textContent = "Enregistrement de l'ordre…";
  statut.className = 'ordre-statut';
  const aChanger = ids.map((id, i) => ({ id, ordre: i + 1 }))
    .filter(({ id, ordre }) => { const p = produitsCache.find(x => x.id === id); return !p || p.ordre !== ordre; });
  const resultats = await Promise.all(aChanger.map(({ id, ordre }) =>
    supabaseClient.from('produits').update({ ordre }).eq('id', id)));
  const echec = resultats.find(r => r.error);
  if (echec) {
    statut.textContent = "Erreur pendant l'enregistrement : " + echec.error.message;
    statut.className = 'ordre-statut erreur';
    return;
  }
  aChanger.forEach(({ id, ordre }) => { const p = produitsCache.find(x => x.id === id); if (p) p.ordre = ordre; });
  statut.textContent = 'Ordre enregistré. Le site affiche maintenant les produits dans cet ordre.';
  statut.className = 'ordre-statut ok';
}

// ===================== COMMANDES =====================
let commandesCache = [];

async function chargerCommandesAdmin() {
  const { data, error } = await supabaseClient.from('commandes').select('*').order('cree_le', { ascending: false });
  const tbody = document.getElementById('tbody-commandes');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="7">Erreur de chargement.</td></tr>'; return; }

  commandesCache = data;

  document.getElementById('stat-total-commandes').textContent = data.length;
  const confirmees = data.filter(c => c.statut === 'Confirmée' || c.statut === 'Livrée');
  const chiffreAffaires = confirmees.reduce((s, c) => s + Number(c.total), 0);
  document.getElementById('stat-ca').textContent = chiffreAffaires.toLocaleString('fr-FR') + ' GNF';
  document.getElementById('stat-en-attente').textContent = data.filter(c => c.statut === 'En attente').length;

  const commissionTotale = confirmees.reduce((s, c) => s + Number(c.commission_gnf || 0), 0);
  document.getElementById('stat-commission').textContent = commissionTotale.toLocaleString('fr-FR') + ' GNF';
  // commission désactivée pour l'instant : la carte n'apparaît que s'il y en a eu
  document.getElementById('stat-commission').closest('.admin-stat-card').style.display = commissionTotale === 0 ? 'none' : '';

  tbody.innerHTML = data.map(c => `
    <tr>
      <td>${esc(c.reference || '—')}<br><span style="color:#665b51; font-size:11px;">${new Date(c.cree_le).toLocaleDateString('fr-FR')}</span></td>
      <td>${esc(c.client_nom)}<br><span style="color:#665b51;">${esc(c.client_telephone)}</span></td>
      <td>${c.articles.length} article(s)<br><span style="color:#665b51; font-size:11px;">${esc(c.zone_livraison || '')}${c.moyen_paiement ? ' · ' + esc(c.moyen_paiement) : ''}</span></td>
      <td>${Number(c.total).toLocaleString('fr-FR')} GNF</td>
      <td>${c.commission_gnf ? Number(c.commission_gnf).toLocaleString('fr-FR') + ' GNF' : '—'}</td>
      <td>
        <select data-id="${esc(c.id)}" class="select-statut-commande">
          <option ${c.statut==='En attente'?'selected':''}>En attente</option>
          <option ${c.statut==='Confirmée'?'selected':''}>Confirmée</option>
          <option ${c.statut==='Livrée'?'selected':''}>Livrée</option>
          <option ${c.statut==='Annulée'?'selected':''}>Annulée</option>
        </select>
      </td>
      <td><button class="admin-action-btn" data-id="${esc(c.id)}" data-action="contacter-commande">Contacter</button></td>
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
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="7">Erreur de chargement.</td></tr>'; return; }

  rdvCache = data;

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${new Date(r.date_souhaitee).toLocaleDateString('fr-FR')} ${esc(r.heure_souhaitee || '')}</td>
      <td>${esc(r.client_nom)}<br><span style="color:#665b51;">${esc(r.client_telephone)}</span></td>
      <td>${esc(r.type_vetement)}${r.modele_ref ? `<br><span style="color:#665b51; font-size:11px;">Catalogue : ${esc(r.modele_ref)}</span>` : ''}${r.photo_modele_url ? `<br><a href="${urlSure(r.photo_modele_url)}" target="_blank" style="color:var(--terracotta-dark); font-size:11px;">Voir photo jointe</a>` : ''}</td>
      <td>${esc(r.mode)}<br><span style="color:#665b51; font-size:11px;">${esc(r.moyen_paiement || '')}</span></td>
      <td><input type="number" class="input-devis" data-id="${esc(r.id)}" value="${esc(r.devis_gnf || '')}" placeholder="Montant" style="width:110px; padding:6px 8px; border-radius:6px; border:1px solid var(--line); font-size:12px;"></td>
      <td>
        <select data-id="${esc(r.id)}" class="select-statut-rdv">
          <option ${r.statut==='Nouvelle demande'?'selected':''}>Nouvelle demande</option>
          <option ${r.statut==='Confirmé'?'selected':''}>Confirmé</option>
          <option ${r.statut==='Terminé'?'selected':''}>Terminé</option>
          <option ${r.statut==='Annulé'?'selected':''}>Annulé</option>
        </select>
      </td>
      <td><button class="admin-action-btn" data-id="${esc(r.id)}" data-action="contacter-rdv">Contacter</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-statut-rdv').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('rendez_vous').update({ statut: sel.value }).eq('id', sel.dataset.id);
    });
  });

  document.querySelectorAll('.input-devis').forEach(input => {
    input.addEventListener('change', async () => {
      const valeur = input.value === '' ? null : Number(input.value);
      await supabaseClient.from('rendez_vous').update({ devis_gnf: valeur }).eq('id', input.dataset.id);
      const r = rdvCache.find(x => x.id === input.dataset.id);
      if (r) r.devis_gnf = valeur;
    });
  });

  document.querySelectorAll('[data-action="contacter-rdv"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = rdvCache.find(x => x.id === btn.dataset.id);
      if (!r) return;
      const statutActuel = document.querySelector(`.select-statut-rdv[data-id="${r.id}"]`).value;
      const dateLisible = new Date(r.date_souhaitee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const devisInput = document.querySelector(`.input-devis[data-id="${r.id}"]`);
      const devisActuel = devisInput ? devisInput.value : (r.devis_gnf || '');
      const devisTexte = devisActuel ? ` Le devis pour cette création est de ${Number(devisActuel).toLocaleString('fr-FR')} GNF.` : '';

      const messages = {
        'Nouvelle demande': `Bonjour ${r.client_nom}, nous avons bien reçu votre demande pour "${r.type_vetement}" le ${dateLisible} à ${r.heure_souhaitee}. Nous revenons vers vous rapidement.`,
        'Confirmé': `Bonjour ${r.client_nom}, votre rendez-vous pour "${r.type_vetement}" est confirmé pour le ${dateLisible} à ${r.heure_souhaitee}.${devisTexte} À bientôt !`,
        'Terminé': `Bonjour ${r.client_nom}, merci d'être passée pour votre "${r.type_vetement}" ! N'hésitez pas à laisser un avis : ${BASE_URL}avis.html?type=rendez_vous&nom=${encodeURIComponent(r.client_nom)}\n\nÀ bientôt pour une prochaine création !`,
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
      <td>${esc(i.motif || '—')}</td>
      <td><button class="admin-action-btn" data-id="${esc(i.id)}" data-action="supprimer-indispo">Supprimer</button></td>
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
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="8">Erreur de chargement.</td></tr>'; return; }

  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${new Date(a.cree_le).toLocaleDateString('fr-FR')}</td>
      <td>${a.type === 'commande' ? 'Commande' : 'Sur mesure'}${a.reference ? `<br><span style="color:#665b51; font-size:11px;">${esc(a.reference)}</span>` : ''}</td>
      <td>${esc(a.client_nom)}</td>
      <td>${'★'.repeat(Math.max(0, Math.min(5, Number(a.note) || 0)))}${'☆'.repeat(5 - Math.max(0, Math.min(5, Number(a.note) || 0)))}</td>
      <td style="max-width:220px;">${esc(a.commentaire || '—')}</td>
      <td>${a.media_url ? `<a href="${urlSure(a.media_url)}" target="_blank" style="color:var(--terracotta-dark);">Voir</a>` : '—'}</td>
      <td>
        <select data-id="${esc(a.id)}" class="select-visible-avis">
          <option value="true" ${a.visible ? 'selected' : ''}>Visible</option>
          <option value="false" ${!a.visible ? 'selected' : ''}>Masqué</option>
        </select>
      </td>
      <td><button class="admin-action-btn" data-id="${esc(a.id)}" data-action="supprimer-avis">Supprimer</button></td>
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
  ouvrirFormulaire('form-nouveau-modele');
}

function annulerEditionModele() {
  document.getElementById('form-nouveau-modele').reset();
  document.getElementById('m-edit-id').value = '';
  document.getElementById('m-image').value = '';
  document.getElementById('m-video').value = '';
  document.getElementById('m-image-actuelle-label').textContent = '';
  document.getElementById('m-video-actuelle-label').textContent = '';
  document.getElementById('m-submit-btn').textContent = 'Ajouter le modèle';
  fermerFormulaire('form-nouveau-modele');
}
document.getElementById('m-annuler-btn').addEventListener('click', annulerEditionModele);

document.getElementById('form-nouveau-modele').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boutonSubmit = document.getElementById('m-submit-btn');
  const statutEl = document.getElementById('m-image-statut');
  let fichierImage = document.getElementById('m-image-file').files[0];
  const fichierVideo = document.getElementById('m-video-file').files[0];
  const editId = document.getElementById('m-edit-id').value;

  boutonSubmit.disabled = true;
  boutonSubmit.textContent = 'Envoi en cours...';

  let imageUrl = document.getElementById('m-image').value || '';
  let videoUrl = document.getElementById('m-video').value || '';

  if (fichierImage) {
    statutEl.textContent = 'Compression de la photo...';
    fichierImage = await compresserImage(fichierImage);
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

  if (videoTropLourde(fichierVideo)) {
    alert(`Vidéo trop lourde (max ${TAILLE_MAX_VIDEO_MO} Mo). Raccourcis-la ou réduis sa qualité avant de l'envoyer.`);
    boutonSubmit.disabled = false;
    boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le modèle';
    statutEl.textContent = '';
    return;
  }
  if (fichierVideo) {
    statutEl.textContent = 'Envoi de la vidéo...';
    const nomFichierVideo = `modele-${Date.now()}-${fichierVideo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: erreurUploadVideo } = await supabaseClient.storage.from('produits').upload(nomFichierVideo, fichierVideo);
    if (erreurUploadVideo) {
      alert("Erreur lors de l'envoi de la vidéo : " + erreurUploadVideo.message);
      boutonSubmit.disabled = false;
      boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le modèle';
      statutEl.textContent = '';
      return;
    }
    const { data: urlDataVideo } = supabaseClient.storage.from('produits').getPublicUrl(nomFichierVideo);
    videoUrl = urlDataVideo.publicUrl;
  }

  statutEl.textContent = '';

  const donneesModele = {
    nom: document.getElementById('m-nom').value.trim(),
    categorie: document.getElementById('m-categorie').value.trim(),
    description: document.getElementById('m-description').value.trim(),
    image_url: imageUrl,
    video_url: videoUrl,
  };

  let error;
  if (editId) {
    ({ error } = await supabaseClient.from('modeles').update(donneesModele).eq('id', editId));
  } else {
    ({ error } = await supabaseClient.from('modeles').insert({ ...donneesModele, actif: true }));
  }

  boutonSubmit.disabled = false;

  if (error) {
    alert("Erreur : " + error.message);
    boutonSubmit.textContent = editId ? 'Enregistrer les modifications' : 'Ajouter le modèle';
    return;
  }

  annulerEditionModele();
  chargerModelesAdmin();
});

async function chargerModelesAdmin() {
  const { data, error } = await supabaseClient.from('modeles').select('*').order('cree_le', { ascending: false });
  const tbody = document.getElementById('tbody-modeles');
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="6">Erreur de chargement.</td></tr>'; return; }

  modelesCache = data;

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${m.image_url ? `<img src="${urlSure(m.image_url)}" alt="">` : '—'}</td>
      <td style="font-family:var(--font-mono); font-size:11px;">${m.num ? `M-${String(m.num).padStart(4,'0')}` : '—'}</td>
      <td>${esc(m.nom)}${m.video_url ? ' 🎥' : ''}</td>
      <td>${esc(m.categorie)}</td>
      <td>
        <select data-id="${esc(m.id)}" class="select-actif-modele">
          <option value="true" ${m.actif ? 'selected' : ''}>Visible</option>
          <option value="false" ${!m.actif ? 'selected' : ''}>Masqué</option>
        </select>
      </td>
      <td style="white-space:nowrap;">
        <button class="admin-action-btn" data-id="${esc(m.id)}" data-action="modifier-modele">Modifier</button>
        <button class="admin-action-btn" data-id="${esc(m.id)}" data-action="supprimer-modele">Supprimer</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.select-actif-modele').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('modeles').update({ actif: sel.value === 'true' }).eq('id', sel.dataset.id);
    });
  });
  document.querySelectorAll('[data-action="supprimer-modele"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce modèle définitivement ?')) return;
      await supabaseClient.from('modeles').delete().eq('id', btn.dataset.id);
      chargerModelesAdmin();
    });
  });
  document.querySelectorAll('[data-action="modifier-modele"]').forEach(btn => {
    btn.addEventListener('click', () => commencerEditionModele(btn.dataset.id));
  });
}

verifierSession();


// ===================== AFFICHAGE MOBILE =====================
// Formulaires repliables : la liste passe en premier, le formulaire s'ouvre au besoin
function ouvrirFormulaire(id) {
  const form = document.getElementById(id);
  form.classList.add('ouvert');
  const btn = document.querySelector(`.admin-ouvrir-form[data-form="${id}"]`);
  if (btn) btn.hidden = true;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function fermerFormulaire(id) {
  const form = document.getElementById(id);
  form.classList.remove('ouvert');
  const btn = document.querySelector(`.admin-ouvrir-form[data-form="${id}"]`);
  if (btn) btn.hidden = false;
}
document.querySelectorAll('.admin-ouvrir-form').forEach(btn => {
  btn.addEventListener('click', () => ouvrirFormulaire(btn.dataset.form));
});

// Sur téléphone, chaque ligne de tableau devient une carte : on recopie le titre de la colonne dans chaque case
function etiqueterTableau(table) {
  const titres = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
  table.querySelectorAll('tbody tr').forEach(tr => {
    [...tr.children].forEach((td, i) => { if (titres[i]) td.setAttribute('data-label', titres[i]); else td.classList.add('admin-td-actions'); });
  });
}
document.querySelectorAll('.admin-table').forEach(table => {
  etiqueterTableau(table);
  new MutationObserver(() => etiqueterTableau(table)).observe(table.querySelector('tbody'), { childList: true });
});


// ===================== PHOTOS SUPPLÉMENTAIRES D'UN PRODUIT =====================
let imagesSupplementaires = [];
function afficherImagesSupplementaires() {
  const liste = document.getElementById('p-images-liste');
  liste.innerHTML = imagesSupplementaires.map((url, i) => `
    <div class="admin-galerie-item">
      <img src="${urlSure(url)}" alt="">
      <div class="admin-galerie-actions">
        <button type="button" data-gauche="${i}" aria-label="Déplacer vers la gauche" ${i === 0 ? 'disabled' : ''}>←</button>
        <button type="button" data-retirer-photo="${i}" aria-label="Retirer cette photo">✕</button>
      </div>
    </div>`).join('');
}
document.getElementById('p-images-liste').addEventListener('click', (e) => {
  const r = e.target.closest('[data-retirer-photo]');
  if (r) { imagesSupplementaires.splice(Number(r.dataset.retirerPhoto), 1); afficherImagesSupplementaires(); return; }
  const g = e.target.closest('[data-gauche]');
  if (g) {
    const i = Number(g.dataset.gauche);
    if (i > 0) { [imagesSupplementaires[i - 1], imagesSupplementaires[i]] = [imagesSupplementaires[i], imagesSupplementaires[i - 1]]; afficherImagesSupplementaires(); }
  }
});
