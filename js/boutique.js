const PAGE_SIZE = 12;
let currentCategorie = null;
let currentRecherche = '';
let offset = 0;
let produitsCharges = [];
let modalQty = 1;
let modalTailleChoisie = '';
let timeoutRecherche = null;

async function chargerCategories() {
  const { data, error } = await supabaseClient
    .from('produits')
    .select('categorie')
    .eq('actif', true);
  if (error || !data) return;

  const categories = [...new Set(data.map(p => p.categorie))];
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
  produitsCharges = [];
  chargerProduits();
}

document.getElementById('recherche-produits').addEventListener('input', (e) => {
  clearTimeout(timeoutRecherche);
  timeoutRecherche = setTimeout(() => {
    currentRecherche = e.target.value.trim();
    offset = 0;
    produitsCharges = [];
    chargerProduits();
  }, 350);
});

function formatRefProduit(num) {
  return num ? `P-${String(num).padStart(4, '0')}` : '';
}

function carteProduitHtml(p) {
  const produitData = encodeURIComponent(JSON.stringify({
    id: p.id, nom: p.nom, prix: p.prix, image_url: p.image_url || ''
  }));
  return `
    <div class="produit-card" data-id="${p.id}">
      <div class="produit-image">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.nom}">` : 'Photo à venir'}
        ${p.video_url ? '<span class="badge-video">🎥 Vidéo</span>' : ''}
      </div>
      <div class="produit-info">
        <span class="produit-categorie">${p.categorie}</span>
        <h3 class="produit-nom">${p.nom}</h3>
        <span class="produit-prix">${Number(p.prix).toLocaleString('fr-FR')} GNF</span>
        <button class="btn-ajouter" data-produit="${produitData}" data-id="${p.id}">Ajouter au panier</button>
      </div>
    </div>
  `;
}

async function chargerProduits() {
  const conteneur = document.getElementById('grille-produits');
  const boutonVoirPlus = document.getElementById('bouton-voir-plus');

  let requete = supabaseClient
    .from('produits')
    .select('*')
    .eq('actif', true)
    .order('cree_le', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (currentCategorie) requete = requete.eq('categorie', currentCategorie);
  if (currentRecherche) requete = requete.ilike('nom', `%${currentRecherche}%`);

  const { data, error } = await requete;

  if (error) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Impossible de charger les produits pour le moment.</p>';
    boutonVoirPlus.style.display = 'none';
    return;
  }

  if (offset === 0 && data.length === 0) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Aucun produit trouvé.</p>';
    boutonVoirPlus.style.display = 'none';
    return;
  }

  produitsCharges = produitsCharges.concat(data);

  const cartesHtml = data.map(carteProduitHtml).join('');
  conteneur.innerHTML = (offset === 0) ? cartesHtml : conteneur.innerHTML + cartesHtml;

  offset += data.length;
  boutonVoirPlus.style.display = (data.length < PAGE_SIZE) ? 'none' : 'inline-flex';
}

document.getElementById('bouton-voir-plus').addEventListener('click', chargerProduits);

// ===================== MODAL DETAIL =====================
function ouvrirDetailProduit(id) {
  const p = produitsCharges.find(x => x.id === id);
  if (!p) return;

  modalQty = 1;
  modalTailleChoisie = '';
  document.getElementById('modal-qty-valeur').textContent = '1';

  const media = document.getElementById('modal-media');
  if (p.video_url) {
    media.innerHTML = `<video src="${p.video_url}" controls playsinline ${p.image_url ? `poster="${p.image_url}"` : ''}></video>`;
  } else if (p.image_url) {
    media.innerHTML = `<img src="${p.image_url}" alt="${p.nom}">`;
  } else {
    media.innerHTML = '';
  }

  document.getElementById('modal-categorie').textContent = p.categorie;
  document.getElementById('modal-nom').textContent = p.nom;
  document.getElementById('modal-ref').textContent = formatRefProduit(p.num);
  document.getElementById('modal-prix').textContent = Number(p.prix).toLocaleString('fr-FR') + ' GNF';
  document.getElementById('modal-desc').textContent = p.description || 'Aucune description pour ce produit.';

  const taillesEl = document.getElementById('modal-tailles');
  if (p.tailles) {
    const listeTailles = p.tailles.split(',').map(t => t.trim()).filter(Boolean);
    modalTailleChoisie = listeTailles[0] || '';
    taillesEl.innerHTML = listeTailles.map((t, i) =>
      `<span class="${i === 0 ? 'taille-active' : ''}" data-taille="${t}">${t}</span>`
    ).join('');
  } else {
    modalTailleChoisie = '';
    taillesEl.innerHTML = '';
  }

  document.getElementById('modal-ajouter').dataset.produit = encodeURIComponent(JSON.stringify({
    id: p.id, nom: p.nom, prix: p.prix, image_url: p.image_url || ''
  }));

  document.getElementById('produit-modal-overlay').classList.add('ouvert');
}

function fermerDetailProduit() {
  document.getElementById('modal-media').innerHTML = '';
  document.getElementById('produit-modal-overlay').classList.remove('ouvert');
}

document.getElementById('produit-modal-fermer').addEventListener('click', fermerDetailProduit);
document.getElementById('produit-modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'produit-modal-overlay') fermerDetailProduit();
});

document.getElementById('modal-tailles').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-taille]');
  if (!chip) return;
  modalTailleChoisie = chip.dataset.taille;
  document.querySelectorAll('#modal-tailles span').forEach(s => s.classList.remove('taille-active'));
  chip.classList.add('taille-active');
});

document.getElementById('modal-qty-moins').addEventListener('click', () => {
  if (modalQty > 1) modalQty--;
  document.getElementById('modal-qty-valeur').textContent = modalQty;
});
document.getElementById('modal-qty-plus').addEventListener('click', () => {
  modalQty++;
  document.getElementById('modal-qty-valeur').textContent = modalQty;
});

document.getElementById('modal-ajouter').addEventListener('click', (e) => {
  const produit = JSON.parse(decodeURIComponent(e.target.dataset.produit));
  produit.taille = modalTailleChoisie || '';
  for (let i = 0; i < modalQty; i++) {
    ajouterAuPanier(produit);
  }
  fermerDetailProduit();
});

document.getElementById('grille-produits').addEventListener('click', (e) => {
  const boutonAjouter = e.target.closest('.btn-ajouter');
  if (boutonAjouter) {
    const p = produitsCharges.find(x => x.id === boutonAjouter.dataset.id);
    if (p && p.tailles) {
      ouvrirDetailProduit(p.id);
    }
    return;
  }
  const card = e.target.closest('.produit-card');
  if (card) ouvrirDetailProduit(card.dataset.id);
});

chargerCategories();
chargerProduits();
