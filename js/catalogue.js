const PAGE_SIZE = 12;
const MODELES_KEY = 'style_ivoirien_modeles_choisis';
let currentCategorie = null;
let currentRecherche = '';
let offset = 0;
let modelesCharges = [];
let timeoutRecherche = null;

function getSelection() {
  try { return JSON.parse(localStorage.getItem(MODELES_KEY)) || []; } catch (e) { return []; }
}
function saveSelection(liste) {
  localStorage.setItem(MODELES_KEY, JSON.stringify(liste));
  majBarreSelection();
}
function estSelectionne(id) {
  return getSelection().some(m => m.id === id);
}
function toggleSelection(m) {
  let liste = getSelection();
  if (liste.some(x => x.id === m.id)) {
    liste = liste.filter(x => x.id !== m.id);
  } else {
    liste.push({ id: m.id, nom: m.nom, image_url: m.image_url || '' });
  }
  saveSelection(liste);
}
function majBarreSelection() {
  const liste = getSelection();
  const barre = document.getElementById('barre-selection');
  if (liste.length === 0) { barre.style.display = 'none'; return; }
  barre.style.display = 'flex';
  document.getElementById('barre-selection-texte').textContent = `${liste.length} modèle(s) sélectionné(s)`;
}
document.getElementById('barre-selection-continuer').addEventListener('click', () => {
  window.location.href = 'rendez-vous.html';
});

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

function carteModeleHtml(m) {
  const selectionne = estSelectionne(m.id);
  return `
    <div class="produit-card" data-id="${m.id}">
      <div class="produit-image">
        ${m.image_url ? `<img src="${m.image_url}" alt="${m.nom}">` : 'Photo à venir'}
        ${m.video_url ? '<span class="badge-video">🎥 Vidéo</span>' : ''}
      </div>
      <div class="produit-info">
        <span class="produit-categorie">${m.categorie}</span>
        <h3 class="produit-nom">${m.nom}</h3>
        <button class="btn-ajouter ${selectionne ? 'selectionne' : ''}" data-action="toggle-selection" data-id="${m.id}">${selectionne ? '✓ Sélectionné' : 'Sélectionner'}</button>
      </div>
    </div>
  `;
}

function rerenderGrille() {
  document.getElementById('grille-modeles').innerHTML = modelesCharges.map(carteModeleHtml).join('');
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

  const boutonChoisir = document.getElementById('modal-choisir');
  function majBoutonChoisir() {
    boutonChoisir.textContent = estSelectionne(m.id) ? '✓ Retirer de ma sélection' : 'Ajouter à ma sélection';
  }
  majBoutonChoisir();
  boutonChoisir.onclick = () => {
    toggleSelection(m);
    majBoutonChoisir();
    rerenderGrille();
  };

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
  const boutonToggle = e.target.closest('[data-action="toggle-selection"]');
  if (boutonToggle) {
    e.stopPropagation();
    const m = modelesCharges.find(x => x.id === boutonToggle.dataset.id);
    if (m) {
      toggleSelection(m);
      rerenderGrille();
    }
    return;
  }
  const card = e.target.closest('.produit-card');
  if (card) ouvrirDetailModele(card.dataset.id);
});

majBarreSelection();
chargerCategories();
chargerModeles();
