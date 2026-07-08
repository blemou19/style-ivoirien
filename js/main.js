const SUPABASE_URL = "https://shuzyobfytegnlyulgdj.supabase.co";
const SUPABASE_KEY = "sb_publishable_AHhrwdfio4wPM2kcUjdZ8w_DReukYdM";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnexion() {
  const { data, error } = await supabaseClient.from('produits').select('*');
  if (error) {
    console.error("Erreur de connexion Supabase :", error);
  } else {
    console.log("Connexion Supabase OK, produits trouvés :", data.length);
  }
}
testConnexion();

async function chargerProduits() {
  const conteneur = document.getElementById('grille-produits');
  const { data, error } = await supabaseClient
    .from('produits')
    .select('*')
    .eq('actif', true);

  if (error) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Impossible de charger les produits pour le moment.</p>';
    console.error('Erreur chargement produits :', error);
    return;
  }

  if (data.length === 0) {
    conteneur.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#7a6f64;">Aucun produit pour le moment.</p>';
    return;
  }

  conteneur.innerHTML = data.map(p => `
    <div class="produit-card">
      <div class="produit-image">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.nom}">` : 'Photo à venir'}
      </div>
      <div class="produit-info">
        <span class="produit-categorie">${p.categorie}</span>
        <h3 class="produit-nom">${p.nom}</h3>
        <span class="produit-prix">${Number(p.prix).toLocaleString('fr-FR')} GNF</span>
      </div>
    </div>
  `).join('');
}
chargerProduits();

const burger = document.querySelector('.burger');
const mainNav = document.getElementById('mainNav');

burger.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});
