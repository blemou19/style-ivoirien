const PAGE_SIZE = 12;
let currentCategorie = null;
let offset = 0;

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
  chargerProduits();
}

function carteProduitHtml(p) {
  const produitData = encodeURIComponent(JSON.stringify({
    id: p.id, nom: p.nom, prix: p.prix, image_url: p.image_url || ''
  }));
  return `
    <div class="produit-card">
      <div class="produit-image">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.nom}">` : 'Photo à venir'}
      </div>
      <div class="produit-info">
        <span class="produit-categorie">${p.categorie}</span>
        <h3 class="produit-nom">${p.nom}</h3>
        <span class="produit-prix">${Number(p.prix).toLocaleString('fr-FR')} GNF</span>
        <button class="btn-ajouter" data-produit="${produitData}">Ajouter au panier</button>
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

  const { data, error } = await requete;

  if (error) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Impossible de charger les produits pour le moment.</p>';
    boutonVoirPlus.style.display = 'none';
    return;
  }

  if (offset === 0 && data.length === 0) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Aucun produit dans cette catégorie pour le moment.</p>';
    boutonVoirPlus.style.display = 'none';
    return;
  }

  const cartesHtml = data.map(carteProduitHtml).join('');
  conteneur.innerHTML = (offset === 0) ? cartesHtml : conteneur.innerHTML + cartesHtml;

  offset += data.length;
  boutonVoirPlus.style.display = (data.length < PAGE_SIZE) ? 'none' : 'inline-flex';
}

document.getElementById('bouton-voir-plus').addEventListener('click', chargerProduits);

chargerCategories();
chargerProduits();
