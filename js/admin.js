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
let produitsCache = [];

function commencerEdition(id) {
  const produit = produitsCache.find(p => p.id === id);
  if (!produit) return;

  document.getElementById('p-edit-id').value = produit.id;
  document.getElementById('p-nom').value = produit.nom;
  document.getElementById('p-categorie').value = produit.categorie;
  document.getElementById('p-prix').value = produit.prix;
  document.getElementById('p-tailles').value = produit.tailles || '';
  document.getElementById('p-description').value = produit.description || '';
  document.getElementById('p-image').value = produit.image_url || '';
  document.getElementById('p-image-actuelle-label').textContent = produit.image_url ? '(une photo existe déjà, choisis-en une seulement si tu veux la remplacer)' : '';

  document.getElementById('p-submit-btn').textContent = 'Enregistrer les modifications';
  document.getElementById('p-annuler-btn').style.display = 'inline-flex';

  document.getElementById('form-nouveau-produit').scrollIntoView({ behavior: 'smooth' });
}

function annulerEdition() {
  document.getElementById('form-nouveau-produit').reset();
  document.getElementById('p-edit-id').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-image-actuelle-label').textContent = '';
  document.getElementById('p-submit-btn').textContent = 'Ajouter le produit';
  document.getElementById('p-annuler-btn').style.display = 'none';
}

document.getElementById('p-annuler-btn').addEventListener('click', annulerEdition);

document.getElementById('form-nouveau-produit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boutonSubmit = document.getElementById('p-submit-btn');
  const statutEl = document.getElementById('p-image-statut');
  const fichier = document.getElementById('p-image-file').files[0];
  const editId = document.getElementById('p-edit-id').value;

  boutonSubmit.disabled = true;
  boutonSubmit.textContent = 'Envoi en cours...';

  let imageUrl = document.getElementById('p-image').value || '';

  if (fichier) {
    statutEl.textContent = 'Envoi de la photo...';
    const nomFichier = `${Date.now()}-${fichier.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    const { error: erreurUpload } = await supabaseClient.storage
      .from('produits')
      .upload(nomFichier, fichier);

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

  statutEl.textContent = '';

  const donneesProduit = {
    nom: document.getElementById('p-nom').value.trim(),
    categorie: document.getElementById('p-categorie').value.trim(),
    prix: Number(document.getElementById('p-prix').value),
    description: document.getElementById('p-description').value.trim(),
    image_url: imageUrl,
    tailles: document.getElementById('p-tailles').value.trim(),
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
  const tbody =
