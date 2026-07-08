const SUPABASE_URL = "https://shuzyobfytegnlyulgdj.supabase.co";
const SUPABASE_KEY = "sb_publishable_AHhrwdfio4wPM2kcUjdZ8w_DReukYdM";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// ===================== PANIER =====================
const PANIER_KEY = 'style_ivoirien_panier';
const NUMERO_WHATSAPP = '224626321860';

function getPanier() {
  try {
    return JSON.parse(localStorage.getItem(PANIER_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function savePanier(panier) {
  localStorage.setItem(PANIER_KEY, JSON.stringify(panier));
  mettreAJourBadge();
}

function mettreAJourBadge() {
  const total = getPanier().reduce((somme, item) => somme + item.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => el.textContent = total);
}

function ajouterAuPanier(produit) {
  const panier = getPanier();
  const existant = panier.find(item => item.id === produit.id);
  if (existant) {
    existant.qty += 1;
  } else {
    panier.push({ ...produit, qty: 1 });
  }
  savePanier(panier);
  ouvrirPanier();
}

function modifierQuantite(id, delta) {
  const panier = getPanier();
  const item = panier.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  const nouveauPanier = item.qty <= 0 ? panier.filter(i => i.id !== id) : panier;
  savePanier(nouveauPanier);
  afficherPanier();
}

function supprimerDuPanier(id) {
  savePanier(getPanier().filter(i => i.id !== id));
  afficherPanier();
}

function calculerTotal(panier) {
  return panier.reduce((somme, item) => somme + item.qty * Number(item.prix), 0);
}

function creerPanierDrawer() {
  const overlay = document.createElement('div');
  overlay.id = 'panier-overlay';
  overlay.className = 'panier-overlay';

  const drawer = document.createElement('div');
  drawer.id = 'panier-drawer';
  drawer.className = 'panier-drawer';
  drawer.innerHTML = `
    <div class="panier-header">
      <h3>Votre panier</h3>
      <button id="panier-fermer" class="panier-fermer" aria-label="Fermer">&times;</button>
    </div>
    <div id="panier-items" class="panier-items"></div>
    <div class="panier-footer">
      <div class="panier-total">
        <span>Total</span>
        <span id="panier-total-montant">0 GNF</span>
      </div>
      <input type="text" id="panier-nom" placeholder="Votre nom" class="panier-input">
      <input type="tel" id="panier-telephone" placeholder="Votre numéro de téléphone" class="panier-input">
      <button id="panier-commander" class="btn btn-primary panier-commander-btn">Commander via WhatsApp</button>
      <p class="panier-note">Vous serez redirigé vers WhatsApp pour finaliser avec Style Ivoirien.</p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  overlay.addEventListener('click', fermerPanier);
  document.getElementById('panier-fermer').addEventListener('click', fermerPanier);
  document.getElementById('panier-commander').addEventListener('click', envoyerCommande);
}

function ouvrirPanier() {
  afficherPanier();
  document.getElementById('panier-overlay').classList.add('ouvert');
  document.getElementById('panier-drawer').classList.add('ouvert');
}

function fermerPanier() {
  document.getElementById('panier-overlay').classList.remove('ouvert');
  document.getElementById('panier-drawer').classList.remove('ouvert');
}

function afficherPanier() {
  const panier = getPanier();
  const conteneur = document.getElementById('panier-items');

  if (panier.length === 0) {
    conteneur.innerHTML = '<p class="panier-vide">Votre panier est vide.</p>';
  } else {
    conteneur.innerHTML = panier.map(item => `
      <div class="panier-item">
        <div class="panier-item-image">
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.nom}">` : ''}
        </div>
        <div class="panier-item-info">
          <span class="panier-item-nom">${item.nom}</span>
          <span class="panier-item-prix">${Number(item.prix).toLocaleString('fr-FR')} GNF</span>
          <div class="panier-item-qty">
            <button data-action="moins" data-id="${item.id}">−</button>
            <span>${item.qty}</span>
            <button data-action="plus" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="panier-item-supprimer" data-action="supprimer" data-id="${item.id}">Retirer</button>
      </div>
    `).join('');
  }

  document.getElementById('panier-total-montant').textContent = calculerTotal(panier).toLocaleString('fr-FR') + ' GNF';
}

document.addEventListener('click', (e) => {
  const target = e.target;
  if (target.matches('[data-action="moins"]')) modifierQuantite(target.dataset.id, -1);
  if (target.matches('[data-action="plus"]')) modifierQuantite(target.dataset.id, 1);
  if (target.matches('[data-action="supprimer"]')) supprimerDuPanier(target.dataset.id);

  const boutonAjouter = target.closest('.btn-ajouter');
  if (boutonAjouter) {
    const produit = JSON.parse(decodeURIComponent(boutonAjouter.dataset.produit));
    ajouterAuPanier(produit);
  }

  if (target.closest('.cart-btn')) {
    ouvrirPanier();
  }
});

async function envoyerCommande() {
  const panier = getPanier();
  const nom = document.getElementById('panier-nom').value.trim();
  const telephone = document.getElementById('panier-telephone').value.trim();

  if (panier.length === 0) {
    alert('Votre panier est vide.');
    return;
  }
  if (!nom || !telephone) {
    alert('Merci de renseigner votre nom et votre numéro de téléphone.');
    return;
  }

  const total = calculerTotal(panier);

  const { error } = await supabaseClient.from('commandes').insert({
    client_nom: nom,
    client_telephone: telephone,
    articles: panier,
    total: total,
    statut: 'En attente'
  });
  if (error) console.error('Erreur enregistrement commande :', error);

  const lignes = panier.map(item =>
    `- ${item.nom} x${item.qty} (${Number(item.prix).toLocaleString('fr-FR')} GNF)`
  ).join('\n');

  const message = `Bonjour, je souhaite commander :\n${lignes}\n\nTotal : ${total.toLocaleString('fr-FR')} GNF\nNom : ${nom}\nTéléphone : ${telephone}`;
  const lienWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;

  window.open(lienWhatsApp, '_blank');
  savePanier([]);
  fermerPanier();
}

creerPanierDrawer();
mettreAJourBadge();
