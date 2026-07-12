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

  const heuresPrises = (data || []).map(r => r.heure_souhaitee);
  document.querySelectorAll('#sm-heure option').forEach(opt => {
    const prise = heuresPrises.includes(opt.value);
    opt.disabled = prise;
    opt.textContent = opt.value + (prise ? ' (déjà pris)' : '');
  });
}

document.getElementById('mois-prec').addEventListener('click', () => {
  moisAffiche.setMonth(moisAffiche.getMonth() - 1);
  genererCalendrier();
});
document.getElementById('mois-suiv').addEventListener('click', () => {
  moisAffiche.setMonth(moisAffiche.getMonth() + 1);
  genererCalendrier();
});

// ===================== TOGGLE MESURES =====================
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

// ===================== SOUMISSION =====================
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
    statut: 'Nouvelle demande'
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
    `Mesures : ${mesures}\n` +
    `Mode : ${mode}\n` +
    `Date souhaitée : ${dateLisible} à ${heure}\n` +
    (notes ? `Notes : ${notes}\n` : '') +
    `Nom : ${nom}\nTéléphone : ${telephone}`;

  const lienWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(lienWhatsApp, '_blank');

  document.getElementById('form-sur-mesure').reset();
  document.getElementById('bloc-mesures').style.display = 'none';
  dateChoisie = null;
  document.getElementById('date-choisie-affichage').textContent = 'Choisissez une date dans le calendrier ci-dessus.';
  genererCalendrier();
});

chargerIndisponibilites();
