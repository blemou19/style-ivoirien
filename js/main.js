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
const NUMERO_WHATSAPP_FRANCE = '33744192080';

function genererReference() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SI-${yy}${mm}${dd}-${rand}`;
}

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
  const taille = produit.taille || '';
  const existant = panier.find(item => item.id === produit.id && (item.taille || '') === taille);
  if (existant) {
    existant.qty += 1;
  } else {
    panier.push({ ...produit, taille, qty: 1 });
  }
  savePanier(panier);
  ouvrirPanier();
}

function modifierQuantite(id, taille, delta) {
  const panier = getPanier();
  const item = panier.find(i => i.id === id && (i.taille || '') === (taille || ''));
  if (!item) return;
  item.qty += delta;
  const nouveauPanier = item.qty <= 0 ? panier.filter(i => !(i.id === id && (i.taille || '') === (taille || ''))) : panier;
  savePanier(nouveauPanier);
  afficherPanier();
}

function supprimerDuPanier(id, taille) {
  savePanier(getPanier().filter(i => !(i.id === id && (i.taille || '') === (taille || ''))));
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
      <div style="display:flex; gap:8px; margin-bottom:10px;">
        <select id="panier-indicatif" class="panier-input" style="flex:0 0 130px; margin-bottom:0;">
          <option value="224">🇬🇳 Guinée +224</option>
          <option value="225">🇨🇮 Côte d'Ivoire +225</option>
          <option value="223">🇲🇱 Mali +223</option>
          <option value="221">🇸🇳 Sénégal +221</option>
          <option value="229">🇧🇯 Bénin +229</option>
          <option value="228">🇹🇬 Togo +228</option>
          <option value="226">🇧🇫 Burkina Faso +226</option>
          <option value="33">🇫🇷 France +33</option>
          <option value="autre">🌍 Autre pays</option>
        </select>
        <input type="tel" id="panier-telephone" placeholder="Numéro (ex: 622334455)" class="panier-input" style="margin-bottom:0; flex:1;">
      </div>
      <input type="text" id="panier-indicatif-autre" placeholder="Indicatif du pays (ex: 32 pour la Belgique)" class="panier-input" style="display:none;">
      <select id="panier-zone" class="panier-input">
        <option value="Retrait à Conakry">Retrait à Conakry</option>
        <option value="Livraison France (Paris)">Livraison France (Paris)</option>
        <option value="Livraison France (Angers)">Livraison France (Angers)</option>
        <option value="Autre / à discuter">Autre destination (à discuter)</option>
      </select>
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

document.addEventListener('change', (e) => {
  if (e.target.id === 'panier-indicatif') {
    const champ = document.getElementById('panier-telephone');
    const champAutre = document.getElementById('panier-indicatif-autre');
    champ.placeholder = e.target.value === '33' ? 'Numéro sans le 0 (ex: 612345678)' : 'Numéro (ex: 622334455)';
    champAutre.style.display = e.target.value === 'autre' ? 'block' : 'none';
  }
});

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
          <span class="panier-item-nom">${item.nom}${item.taille ? ` — Taille ${item.taille}` : ''}</span>
          <span class="panier-item-prix">${Number(item.prix).toLocaleString('fr-FR')} GNF</span>
          <div class="panier-item-qty">
            <button data-action="moins" data-id="${item.id}" data-taille="${item.taille || ''}">−</button>
            <span>${item.qty}</span>
            <button data-action="plus" data-id="${item.id}" data-taille="${item.taille || ''}">+</button>
          </div>
        </div>
        <button class="panier-item-supprimer" data-action="supprimer" data-id="${item.id}" data-taille="${item.taille || ''}">Retirer</button>
      </div>
    `).join('');
  }

  document.getElementById('panier-total-montant').textContent = calculerTotal(panier).toLocaleString('fr-FR') + ' GNF';
}

document.addEventListener('click', (e) => {
  const target = e.target;
  if (target.matches('[data-action="moins"]')) modifierQuantite(target.dataset.id, target.dataset.taille, -1);
  if (target.matches('[data-action="plus"]')) modifierQuantite(target.dataset.id, target.dataset.taille, 1);
  if (target.matches('[data-action="supprimer"]')) supprimerDuPanier(target.dataset.id, target.dataset.taille);

  const boutonAjouter = target.closest('.btn-ajouter');
  if (boutonAjouter && boutonAjouter.dataset.produit) {
    const produit = JSON.parse(decodeURIComponent(boutonAjouter.dataset.produit));
    if (!produit.tailleRequise) ajouterAuPanier(produit);
  }

  if (target.closest('.cart-btn')) {
    ouvrirPanier();
  }
});

async function envoyerCommande() {
  const panier = getPanier();
  const nom = document.getElementById('panier-nom').value.trim();
  const indicatifSelect = document.getElementById('panier-indicatif').value;
  const indicatif = indicatifSelect === 'autre'
    ? document.getElementById('panier-indicatif-autre').value.trim().replace(/[^0-9]/g, '')
    : indicatifSelect;
  const numeroLocal = document.getElementById('panier-telephone').value.trim().replace(/^0+/, '').replace(/[^0-9]/g, '');
  const telephone = numeroLocal ? `+${indicatif}${numeroLocal}` : '';
  const zone = document.getElementById('panier-zone').value;

  if (panier.length === 0) {
    alert('Votre panier est vide.');
    return;
  }
  if (!nom || !telephone) {
    alert('Merci de renseigner votre nom et votre numéro de téléphone.');
    return;
  }

  const total = calculerTotal(panier);
  const reference = genererReference();

  const { error } = await supabaseClient.from('commandes').insert({
    client_nom: nom,
    client_telephone: telephone,
    articles: panier,
    total: total,
    statut: 'En attente',
    zone_livraison: zone,
    reference: reference
  });
  if (error) console.error('Erreur enregistrement commande :', error);

  const donneesCommande = { reference, nom, telephone, articles: panier, total, zone, date: new Date().toISOString() };
  const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
  const lienDetail = `${base}commande.html?d=${encodeURIComponent(JSON.stringify(donneesCommande))}`;

  const lignes = panier.map(item =>
    `- ${item.nom}${item.taille ? ` (Taille ${item.taille})` : ''} x${item.qty} (${Number(item.prix).toLocaleString('fr-FR')} GNF)`
  ).join('\n');

  const message = `Bonjour, je souhaite commander (réf. ${reference}) :\n${lignes}\n\nTotal : ${total.toLocaleString('fr-FR')} GNF\nZone : ${zone}\nNom : ${nom}\nTéléphone : ${telephone}\n\nVoir le détail avec photos : ${lienDetail}`;

  window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');

  if (zone.startsWith('Livraison France')) {
    const messageFrance = `🇫🇷 Nouvelle commande à destination de la France (réf. ${reference}) :\n${lignes}\n\nTotal : ${total.toLocaleString('fr-FR')} GNF\nZone : ${zone}\nClient : ${nom} — ${telephone}`;
    window.open(`https://wa.me/${NUMERO_WHATSAPP_FRANCE}?text=${encodeURIComponent(messageFrance)}`, '_blank');
  }

  savePanier([]);
  fermerPanier();
}

creerPanierDrawer();
mettreAJourBadge();
