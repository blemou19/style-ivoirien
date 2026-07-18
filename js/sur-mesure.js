const MODELES_KEY = 'style_ivoirien_modeles_choisis';

function getModelesChoisis() {
  try { return JSON.parse(localStorage.getItem(MODELES_KEY)) || []; } catch (e) { return []; }
}

function retirerModeleChoisi(id) {
  const liste = getModelesChoisis().filter(m => m.id !== id);
  localStorage.setItem(MODELES_KEY, JSON.stringify(liste));
  afficherModelesChoisis();
}

function afficherModelesChoisis() {
  const liste = getModelesChoisis();
  const box = document.getElementById('modeles-choisis-box');
  const conteneur = document.getElementById('modeles-choisis-liste');
  const prompt = document.getElementById('prompt-modele');

  if (liste.length === 0) {
    box.style.display = 'none';
    prompt.style.display = 'block';
    return;
  }

  prompt.style.display = 'none';
  box.style.display = 'block';
  conteneur.innerHTML = liste.map(m => `
    <div class="modele-choisi-box">
      ${m.image_url ? `<img src="${m.image_url}" alt="${m.nom}">` : ''}
      <div><p style="margin:0; font-family:var(--font-display); font-size:15px;">${m.nom}</p></div>
      <button type="button" class="admin-action-btn" data-retirer="${m.id}">Retirer</button>
    </div>
  `).join('');

  conteneur.querySelectorAll('[data-retirer]').forEach(btn => {
    btn.addEventListener('click', () => retirerModeleChoisi(btn.dataset.retirer));
  });

  const champVetement = document.getElementById('sm-vetement');
  if (!champVetement.value.trim()) {
    champVetement.value = liste.map(m => m.nom).join(', ');
  }
}

document.querySelectorAll('input[name="a-modele"]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('lien-catalogue').style.display = (r.value === 'oui' && r.checked) ? 'inline-flex' : 'none';
  });
});

afficherModelesChoisis();

let indispoRanges = [];
let moisAffiche = new Date();
moisAffiche.setDate(1);
let dateChoisie = null;

document.getElementById('sm-indicatif').addEventListener('change', (e) => {
  const champ = document.getElementById('sm-telephone');
  const champAutre = document.getElementById('sm-indicatif-autre');
  champ.placeholder = e.target.value === '33' ? 'Numéro sans le 0 (ex: 612345678)' : 'Numéro (ex: 622334455)';
  champAutre.style.display = e.target.value === 'autre' ? 'block' : 'none';
});

function formatDateISO(d) {
  return d.toISOString().split('T')[0];
}

function estBloque(dateStr) {
  return indispoRanges.some(r => dateStr >= r.date_debut && dateStr <= r.date_fin);
}

async function chargerIndisponibilites() {
  const { data, error } = await supabaseClient.from('indisponibilites').select('date_debut,date_fin');
  if (!error) indispoRanges = data || [];
  genererCalendrier();
}

function genererCalendrier() {
  const grille = document.getElementById('calendrier-grille');
  grille.innerHTML = '';

  const annee = moisAffiche.getFullYear();
  const mois = moisAffiche.getMonth();
  document.getElementById('mois-label').textContent =
    moisAffiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const premierJour = new Date(annee, mois, 1);
  const decalage = (premierJour.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const aujourdHui = formatDateISO(new Date());

  for (let i = 0; i < decalage; i++) {
    grille.appendChild(document.createElement('div'));
  }

  for (let jour = 1; jour <= nbJours; jour++) {
    const dateObj = new Date(annee, mois, jour);
    const dateStr = formatDateISO(dateObj);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.textContent = jour;
    cell.className = 'jour-cell';

    const passe = dateStr < aujourdHui;
    const bloque = estBloque(dateStr);

    if (passe || bloque) {
      cell.disabled = true;
    } else {
      cell.addEventListener('click', () => choisirDate(dateStr, cell));
    }
    if (dateStr === dateChoisie) cell.classList.add('jour-selectionne');

    grille.appendChild(cell);
  }
}

async function choisirDate(dateStr, cell) {
  dateChoisie = dateStr;
  document.querySelectorAll('.jour-cell').forEach(c => c.classList.remove('jour-selectionne'));
  cell.classList.add('jour-selectionne');
  const dateLisible = new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('date-choisie-affichage').textContent = `Date choisie : ${dateLisible}`;

  const { data } = await supabaseClient
    .from('rendez_vous')
    .select('heure_souhaitee')
    .eq('date_souhaitee', dateStr)
    .neq('statut', 'Annulé');

  const heuresPrises = (data || []).map(r => r.heure_souhaitee).filter(Boolean);
  const affichage = document.getElementById('heures-prises-affichage');
  affichage.textContent = heuresPrises.length > 0
    ? `Créneaux déjà pris ce jour : ${heuresPrises.join(', ')}`
    : '';
}

document.getElementById('mois-prec').addEventListener('click', () => {
  moisAffiche.setMonth(moisAffiche.getMonth() - 1);
  genererCalendrier();
});
document.getElementById('mois-suiv').addEventListener('click', () => {
  moisAffiche.setMonth(moisAffiche.getMonth() + 1);
  genererCalendrier();
});

document.querySelectorAll('input[name="sait-mesures"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.getElementById('bloc-mesures').style.display =
      (radio.value === 'oui' && radio.checked) ? 'grid' : 'none';
  });
});

function collecterMesures() {
  const saitMesures = document.querySelector('input[name="sait-mesures"]:checked').value;
  if (saitMesures === 'non') return "À prendre sur place lors du rendez-vous";

  const champs = [
    ['Tour de poitrine', 'm-poitrine'],
    ['Tour de taille', 'm-taille'],
    ['Tour de hanches', 'm-hanches'],
    ['Longueur souhaitée', 'm-longueur'],
    ['Tour de bras', 'm-bras'],
    ['Épaules', 'm-epaules'],
  ];

  const lignes = champs
    .map(([label, id]) => {
      const val = document.getElementById(id).value;
      return val ? `${label} : ${val} cm` : null;
    })
    .filter(Boolean);

  return lignes.length > 0 ? lignes.join(', ') : "Mesures à confirmer avec la cliente";
}

document.getElementById('form-sur-mesure').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!dateChoisie) {
    alert('Merci de choisir une date dans le calendrier.');
    return;
  }

  const nom = document.getElementById('sm-nom').value.trim();
  const indicatifSelect = document.getElementById('sm-indicatif').value;
  const indicatif = indicatifSelect === 'autre'
    ? document.getElementById('sm-indicatif-autre').value.trim().replace(/[^0-9]/g, '')
    : indicatifSelect;
  const numeroLocal = document.getElementById('sm-telephone').value.trim().replace(/^0+/, '').replace(/[^0-9]/g, '');
  const telephone = numeroLocal ? `+${indicatif}${numeroLocal}` : '';
  const vetement = document.getElementById('sm-vetement').value.trim();
  const mesures = collecterMesures();
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const heure = document.getElementById('sm-heure').value;
  const notes = document.getElementById('sm-notes').value.trim();
  const modeles = getModelesChoisis();
  const modeleRef = modeles.length > 0 ? modeles.map(m => m.nom).join(' / ') : null;
  const modeleImage = modeles.length > 0 ? modeles[0].image_url : null;

  if (!nom || !telephone || !vetement) {
    alert('Merci de remplir au moins votre nom, téléphone et le type de vêtement souhaité.');
    return;
  }

  const { error } = await supabaseClient.from('rendez_vous').insert({
    client_nom: nom,
    client_telephone: telephone,
    type_vetement: vetement,
    mesures: mesures,
    mode: mode,
    date_souhaitee: dateChoisie,
    heure_souhaitee: heure,
    notes: notes,
    statut: 'Nouvelle demande',
    modele_ref: modeleRef,
    modele_image: modeleImage
  });

  if (error) {
    console.error('Erreur enregistrement rendez-vous :', error);
    alert("Un problème est survenu, réessaie dans un instant.");
    return;
  }

  const dateLisible = new Date(dateChoisie + 'T00:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const message = `Bonjour, je souhaite une création sur mesure :\n` +
    `Vêtement : ${vetement}\n` +
    (modeleRef ? `Modèle(s) inspiré(s) du catalogue : ${modeleRef}\n` : '') +
    `Mesures : ${mesures}\n` +
    `Mode : ${mode}\n` +
    `Date souhaitée : ${dateLisible} à ${heure}\n` +
    (notes ? `Notes : ${notes}\n` : '') +
    `Nom : ${nom}\nTéléphone : ${telephone}`;

  const lienWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(lienWhatsApp, '_blank');

  localStorage.removeItem(MODELES_KEY);
  document.getElementById('form-sur-mesure').reset();
  document.getElementById('bloc-mesures').style.display = 'none';
  afficherModelesChoisis();
  dateChoisie = null;
  document.getElementById('date-choisie-affichage').textContent = 'Choisissez une date dans le calendrier ci-dessus.';
  genererCalendrier();
});

chargerIndisponibilites();
