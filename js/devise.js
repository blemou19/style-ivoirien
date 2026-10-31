// ===================== DEVISES : GNF, EURO, FCFA =====================
// Les prix sont saisis dans l'admin en GNF (prix) et, si on veut, en euros (prix_eur).
// - GNF  : le prix GNF du produit.
// - EURO : le prix en euros saisi dans l'admin ; sinon conversion du prix GNF au taux ci-dessous.
// - FCFA : calculé depuis le prix en euros (parité fixe 1 € = 655,957 FCFA), arrondi à 500 FCFA.
const TAUX_EUR = 10100;          // GNF pour 1 euro : à ajuster de temps en temps selon le taux réel
const TAUX_FCFA_EUR = 655.957;   // parité fixe du franc CFA avec l'euro
const DEVISES = { GNF: 'GNF', EUR: '€ Euro', XOF: 'FCFA' };
const CLE_DEVISE = 'style_ivoirien_devise';

// Devise proposée au premier passage, d'après le fuseau horaire du téléphone
function deviseParDefaut() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  if (/^Africa\/(Abidjan|Dakar|Bamako|Ouagadougou|Niamey|Lome|Porto-Novo|Bissau|Douala|Libreville|Brazzaville|Bangui|Ndjamena|Malabo)$/.test(tz)) return 'XOF';
  if (/^Europe\//.test(tz)) return 'EUR';
  return 'GNF';
}

let deviseActive = (() => {
  try { const d = localStorage.getItem(CLE_DEVISE); if (DEVISES[d]) return d; } catch (e) {}
  return deviseParDefaut();
})();

function prixEnEuros(p) {
  const eur = Number(p.prix_eur);
  if (eur > 0) return eur;
  const gnf = Number(p.prix) || 0;
  if (gnf <= 0) return 0;
  return Math.max(1, Math.round(gnf / TAUX_EUR));
}

// Prix d'un produit (ou d'un article du panier) dans une devise
function montantProduit(p, devise = deviseActive) {
  if (devise === 'GNF') return Number(p.prix) || 0;
  const eur = prixEnEuros(p);
  if (devise === 'EUR') return eur;
  return Math.round(eur * TAUX_FCFA_EUR / 500) * 500;
}

function formaterMontant(montant, devise = deviseActive) {
  const m = Number(montant) || 0;
  if (devise === 'EUR') {
    return m.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(m) ? 0 : 2, maximumFractionDigits: 2 }) + ' €';
  }
  return Math.round(m).toLocaleString('fr-FR') + (devise === 'XOF' ? ' FCFA' : ' GNF');
}

// Frais d'expédition vers la France (environ 12 € le kilo), dans la devise affichée
function fraisParKilo(devise = deviseActive) {
  if (devise === 'EUR') return '12 €/kg';
  if (devise === 'XOF') return '≈ ' + formaterMontant(Math.round(12 * TAUX_FCFA_EUR / 100) * 100, 'XOF') + '/kg (12 €)';
  return '≈ ' + formaterMontant(12 * TAUX_EUR, 'GNF') + '/kg (12 €)';
}

// Prix à insérer dans une carte produit : se met à jour quand on change de devise
function prixHtml(p) {
  return `<span class="prix-devise" data-gnf="${Number(p.prix) || 0}" data-eur="${Number(p.prix_eur) || ''}">${formaterMontant(montantProduit(p))}</span>`;
}

function rafraichirPrix() {
  document.querySelectorAll('.prix-devise').forEach(el => {
    el.textContent = formaterMontant(montantProduit({ prix: el.dataset.gnf, prix_eur: el.dataset.eur }));
  });
  document.querySelectorAll('.choix-devise').forEach(s => { s.value = deviseActive; });
  document.dispatchEvent(new CustomEvent('devise-changee', { detail: deviseActive }));
}

function changerDevise(devise) {
  if (!DEVISES[devise] || devise === deviseActive) return;
  deviseActive = devise;
  try { localStorage.setItem(CLE_DEVISE, devise); } catch (e) {}
  rafraichirPrix();
}

// Sélecteur de devise dans l'en-tête, à côté du panier
function creerChoixDevise() {
  document.querySelectorAll('.nav-actions').forEach(zone => {
    if (zone.querySelector('.choix-devise')) return;
    const select = document.createElement('select');
    select.className = 'choix-devise';
    select.setAttribute('aria-label', 'Devise des prix');
    select.innerHTML = Object.entries(DEVISES).map(([code, nom]) => `<option value="${code}">${nom}</option>`).join('');
    select.value = deviseActive;
    select.addEventListener('change', () => changerDevise(select.value));
    zone.insertBefore(select, zone.firstChild);
  });
  // version téléphone : une petite barre sous l'en-tête
  const entete = document.querySelector('header');
  if (entete && !entete.querySelector('.barre-devise')) {
    const barre = document.createElement('div');
    barre.className = 'barre-devise';
    barre.innerHTML = '<label for="choix-devise-mobile">Prix en</label>';
    const select = document.createElement('select');
    select.className = 'choix-devise'; select.id = 'choix-devise-mobile';
    select.innerHTML = Object.entries(DEVISES).map(([code, nom]) => `<option value="${code}">${nom}</option>`).join('');
    select.value = deviseActive;
    select.addEventListener('change', () => changerDevise(select.value));
    barre.appendChild(select);
    entete.appendChild(barre);
  }
}
