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
const TAUX_EUR = 10100; // GNF pour 1 euro — à ajuster de temps en temps selon le taux réel

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
  const stockMax = (produit.stock === null || produit.stock === undefined) ? null : Number(produit.stock);
  const existant = panier.find(item => item.id === produit.id && (item.taille || '') === taille);

  if (existant) {
    if (stockMax !== null && existant.qty >= stockMax) {
      alert(`Seulement ${stockMax} en stock pour ce produit.`);
      return;
    }
    existant.qty += 1;
  } else {
    if (stockMax !== null && stockMax <= 0) {
      alert('Ce produit est épuisé.');
      return;
    }
    panier.push({ ...produit, taille, stock: stockMax, qty: 1 });
  }
  savePanier(panier);
  ouvrirPanier();
}

function modifierQuantite(id, taille, delta) {
  const panier = getPanier();
  const item = panier.find(i => i.id === id && (i.taille || '') === (taille || ''));
  if (!item) return;

  if (delta > 0 && item.stock !== null && item.stock !== undefined && item.qty >= item.stock) {
    alert(`Seulement ${item.stock} en stock pour ce produit.`);
    return;
  }

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
      <select id="panier-paiement" class="panier-input">
        <option value="Orange Money">Orange Money</option>
        <option value="Espèces en boutique">Espèces en boutique</option>
      </select>
      <div id="panier-recap" class="panier-recap">
        <div class="panier-recap-ligne">
          <span>Prix du panier</span>
          <span id="recap-prix-panier">0 GNF</span>
        </div>
        <div class="panier-recap-ligne">
          <span id="recap-commission-label">Commission service</span>
          <span id="recap-commission">0 GNF</span>
        </div>
        <div class="panier-recap-ligne panier-recap-total">
          <span>Total à payer</span>
          <span id="recap-total">0 GNF</span>
        </div>
        <p id="panier-recap-note" class="panier-recap-note" style="display:none;">⚠️ Ce montant ne couvre pas la livraison. Les frais d'expédition (environ 12€/kg, soit ≈ 121 200 GNF/kg) seront communiqués séparément une fois votre colis prêt et pesé.</p>
      </div>
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
  if (e.target.id === 'panier-zone') {
    majRecap();
    majOptionsPaiement();
  }
});

function majOptionsPaiement() {
  const zone = document.getElementById('panier-zone').value;
  const selectPaiement = document.getElementById('panier-paiement');
  const estFrance = zone.startsWith('Livraison France');

  selectPaiement.innerHTML = estFrance
    ? `<option value="Carte bancaire">Carte bancaire</option><option value="Wero">Wero</option>`
    : `<option value="Orange Money">Orange Money</option><option value="Espèces en boutique">Espèces en boutique</option>`;
}

function calculerCommission(zone, total) {
  return zone.startsWith('Livraison France') ? Math.round(total * 0.10) : Math.round(total * 0.03);
}

function majRecap() {
  const zoneEl = document.getElementById('panier-zone');
  if (!zoneEl) return;
  const zone = zoneEl.value;
  const estFrance = zone.startsWith('Livraison France');
  const panier = getPanier();
  const total = calculerTotal(panier);
  const commission = calculerCommission(zone, total);
  const totalFinal = total + commission;

  document.getElementById('recap-prix-panier').textContent = total.toLocaleString('fr-FR') + ' GNF' + (estFrance ? ` (≈ ${(total / TAUX_EUR).toFixed(2)} €)` : '');
  document.getElementById('recap-commission-label').textContent = 'Commission service';
  document.getElementById('recap-commission').textContent = estFrance
    ? (commission / TAUX_EUR).toFixed(2) + ' €'
    : commission.toLocaleString('fr-FR') + ' GNF';
  document.getElementById('recap-total').textContent = totalFinal.toLocaleString('fr-FR') + ' GNF' + (estFrance ? ` (≈ ${(totalFinal / TAUX_EUR).toFixed(2)} €)` : '');
  document.getElementById('panier-recap-note').style.display = estFrance ? 'block' : 'none';
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
  majRecap();
  majOptionsPaiement();
}

document.addEventListener('click', (e) => {
  const target = e.target;
  if (target.matches('[data-action="moins"]')) modifierQuantite(target.dataset.id, target.dataset.taille, -1);
  if (target.matches('[data-action="plus"]')) modifierQuantite(target.dataset.id, target.dataset.taille, 1);
  if (target.matches('[data-action="supprimer"]')) supprimerDuPanier(target.dataset.id, target.dataset.taille);

  const boutonAjouter = target.closest('.btn-ajouter');
  if (boutonAjouter && boutonAjouter.dataset.produit && !boutonAjouter.disabled) {
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
  const moyenPaiement = document.getElementById('panier-paiement').value;

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
  const commission = calculerCommission(zone, total);
  const estFrance = zone.startsWith('Livraison France');
  const totalFinal = total + commission;

  const donneesCommande = { reference, nom, telephone, articles: panier, total, zone, commission, totalFinal, estFrance, date: new Date().toISOString() };
  const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
  const lienDetail = `${base}commande.html?d=${encodeURIComponent(JSON.stringify(donneesCommande))}`;

  const lignes = panier.map(item =>
    `- ${item.nom}${item.taille ? ` (Taille ${item.taille})` : ''} x${item.qty} (${Number(item.prix).toLocaleString('fr-FR')} GNF)`
  ).join('\n');

  const recap = estFrance
    ? `\nPrix du panier : ${total.toLocaleString('fr-FR')} GNF (≈ ${(total / TAUX_EUR).toFixed(2)} €)\nCommission service : ${(commission / TAUX_EUR).toFixed(2)} €\nÀ payer maintenant : ${totalFinal.toLocaleString('fr-FR')} GNF (≈ ${(totalFinal / TAUX_EUR).toFixed(2)} €)\nFrais de livraison : environ 12€/kg (≈ 121 200 GNF/kg), montant exact communiqué après pesée du colis\n`
    : `\nPrix du panier : ${total.toLocaleString('fr-FR')} GNF\nCommission service : ${commission.toLocaleString('fr-FR')} GNF\nTotal à payer : ${totalFinal.toLocaleString('fr-FR')} GNF\n`;

  const infoPaiement = `\nMoyen de paiement souhaité : ${moyenPaiement}\n`;

  const message = `Bonjour, je souhaite commander (réf. ${reference}) :\n${lignes}\n${recap}${infoPaiement}\nZone : ${zone}\nNom : ${nom}\nTéléphone : ${telephone}\n\nVoir le détail avec photos : ${lienDetail}`;

  const numeroDestinataire = estFrance ? NUMERO_WHATSAPP_FRANCE : NUMERO_WHATSAPP;
  window.open(`https://wa.me/${numeroDestinataire}?text=${encodeURIComponent(message)}`, '_blank');

  savePanier([]);
  fermerPanier();

  const { error } = await supabaseClient.from('commandes').insert({
    client_nom: nom,
    client_telephone: telephone,
    articles: panier,
    total: total,
    statut: 'En attente',
    zone_livraison: zone,
    reference: reference,
    commission_gnf: commission,
    moyen_paiement: moyenPaiement
  });
  if (error) console.error('Erreur enregistrement commande :', error);
}

creerPanierDrawer();
mettreAJourBadge();

// ===================== BANNIÈRE D'INSTALLATION =====================
let deferredInstallPrompt = null;

function estStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function estIOS() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function creerBanniereInstall() {
  if (estStandalone()) return; // déjà installé, on n'affiche rien
  if (localStorage.getItem('si_install_dismiss') === 'true') return; // déjà fermé une fois

  const banniere = document.createElement('div');
  banniere.id = 'install-banniere';
  banniere.className = 'install-banniere';
  banniere.innerHTML = `
    <div class="install-banniere-texte">
      <strong>📲 Installer Style Ivoirien</strong>
      <span id="install-banniere-sous-texte">Accédez au site en un tap, comme une application.</span>
    </div>
    <div class="install-banniere-actions">
      <button id="install-banniere-bouton" class="btn btn-primary" style="display:none;">Installer</button>
      <button id="install-banniere-fermer" class="install-banniere-fermer" aria-label="Fermer">&times;</button>
    </div>
  `;
  document.body.appendChild(banniere);

  document.getElementById('install-banniere-fermer').addEventListener('click', () => {
    banniere.remove();
    localStorage.setItem('si_install_dismiss', 'true');
  });

  if (estIOS()) {
    document.getElementById('install-banniere-sous-texte').textContent =
      'Appuyez sur Partager (⬆️) puis "Sur l\'écran d\'accueil".';
  } else {
    const boutonInstaller = document.getElementById('install-banniere-bouton');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      boutonInstaller.style.display = 'inline-flex';
    });
    boutonInstaller.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      banniere.remove();
      localStorage.setItem('si_install_dismiss', 'true');
    });
  }
}

creerBanniereInstall();
