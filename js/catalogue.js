const PAGE_SIZE = 12;
let currentCategorie = null;
let currentRecherche = '';
let offset = 0;
let modelesCharges = [];
let timeoutRecherche = null;

async function chargerCategories() {
  const { data, error } = await supabaseClient.from('modeles').select('categorie').eq('actif', true);
  if (error || !data) return;

  const categories = [...new Set(data.map(m => m.categorie))];
  const conteneur = document.getElementById('filtres-categories');
  conteneur.innerHTML = '';

  const chipTous = document.createElement('button');
  chipTous.className = 'chip chip-active';
  chipTous.textContent = 'Tous';
  chipTous.addEventListener('click', () => selectionnerCategorie(null, chipTous));
  conteneur.appendChild(chipTous);

  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.addEventListener('click', () => selectionnerCategorie(cat, chip));
    conteneur.appendChild(chip);
  });
}

function selectionnerCategorie(categorie, chipElement) {
  currentCategorie = categorie;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-active'));
  chipElement.classList.add('chip-active');
  offset = 0;
  modelesCharges = [];
  chargerModeles();
}

document.getElementById('recherche-modeles').addEventListener('input', (e) => {
  clearTimeout(timeoutRecherche);
  timeoutRecherche = setTimeout(() => {
    currentRecherche = e.target.value.trim();
    offset = 0;
    modelesCharges = [];
    chargerModeles();
  }, 350);
});

function allerVersRdv(m) {
  const donnees = encodeURIComponent(JSON.stringify({ nom: m.nom, image_url: m.image_url || '' }));
  window.location.href = `index.html?modele=${donnees}#sur-mesure`;
}

function carteModeleHtml(m) {
  return `
    <div class="produit-card" data-id="${m.id}">
      <div class="produit-image">
        ${m.image_url ? `<img src="${m.image_url}" alt="${m.nom}">` : 'Photo à venir'}
        ${m.video_url ? '<span class="badge-video">🎥 Vidéo</span>' : ''}
      </div>
      <div class="produit-info">
        <span class="produit-categorie">${m.categorie}</span>
        <h3 class="produit-nom">${m.nom}</h3>
        <button class="btn-ajouter" data-action="choisir-rapide" data-id="${m.id}">Choisir ce modèle</button>
      </div>
    </div>
  `;
}

async function chargerModeles() {
  const conteneur = document.getElementById('grille-modeles');
  const boutonVoirPlus = document.getElementById('bouton-voir-plus');

  let requete = supabaseClient
    .from('modeles')
    .select('*')
    .eq('actif', true)
    .order('cree_le', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (currentCategorie) requete = requete.eq('categorie', currentCategorie);
  if (currentRecherche) requete = requete.ilike('nom', `%${currentRecherche}%`);

  const { data, error } = await requete;

  if (error) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Impossible de charger le catalogue.</p>';
    boutonVoirPlus.style.display = 'none';
    return;
  }

  if (offset === 0 && data.length === 0) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Aucun modèle trouvé.</p>';
    boutonVoirPlus.style.display = 'none';
    return;
  }

  modelesCharges = modelesCharges.concat(data);
  const cartesHtml = data.map(carteModeleHtml).join('');
  conteneur.innerHTML = (offset === 0) ? cartesHtml : conteneur.innerHTML + cartesHtml;

  offset += data.length;
  boutonVoirPlus.style.display = (data.length < PAGE_SIZE) ? 'none' : 'inline-flex';
}

document.getElementById('bouton-voir-plus').addEventListener('click', chargerModeles);

function ouvrirDetailModele(id) {
  const m = modelesCharges.find(x => x.id === id);
  if (!m) return;

  const media = document.getElementById('modal-media');
  if (m.video_url) {
    media.innerHTML = `<video src="${m.video_url}" controls playsinline ${m.image_url ? `poster="${m.image_url}"` : ''}></video>`;
  } else if (m.image_url) {
    media.innerHTML = `<img src="${m.image_url}" alt="${m.nom}">`;
  } else {
    media.innerHTML = '';
  }

  document.getElementById('modal-categorie').textContent = m.categorie;
  document.getElementById('modal-nom').textContent = m.nom;
  document.getElementById('modal-desc').textContent = m.description || 'Aucune description pour ce modèle.';
  document.getElementById('modal-choisir').onclick = () => allerVersRdv(m);

  document.getElementById('modele-modal-overlay').classList.add('ouvert');
}

document.getElementById('modele-modal-fermer').addEventListener('click', () => {
  document.getElementById('modal-media').innerHTML = '';
  document.getElementById('modele-modal-overlay').classList.remove('ouvert');
});
document.getElementById('modele-modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modele-modal-overlay') {
    document.getElementById('modal-media').innerHTML = '';
    document.getElementById('modele-modal-overlay').classList.remove('ouvert');
  }
});

document.getElementById('grille-modeles').addEventListener('click', (e) => {
  const boutonChoisir = e.target.closest('[data-action="choisir-rapide"]');
  if (boutonChoisir) {
    const m = modelesCharges.find(x => x.id === boutonChoisir.dataset.id);
    if (m) allerVersRdv(m);
    return;
  }
  const card = e.target.closest('.produit-card');
  if (card) ouvrirDetailModele(card.dataset.id);
});

chargerCategories();
chargerModeles();
