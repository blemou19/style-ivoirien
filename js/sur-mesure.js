let indispoRanges = [];
let moisAffiche = new Date();
moisAffiche.setDate(1);
let dateChoisie = null;

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

function choisirDate(dateStr, cell) {
  dateChoisie = dateStr;
  document.querySelectorAll('.jour-cell').forEach(c => c.classList.remove('jour-selectionne'));
  cell.classList.add('jour-selectionne');
  const dateLisible = new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('date-choisie-affichage').textContent = `Date choisie : ${dateLisible}`;
}

document.getElementById('mois-prec').addEventListener('click', () => {
  moisAffiche.setMonth(moisAffiche.getMonth() - 1);
  genererCalendrier();
});
document.getElementById('mois-suiv').addEventListener('click', () => {
  moisAffiche.setMonth(moisAffiche.getMonth() + 1);
  genererCalendrier();
});

document.getElementById('form-sur-mesure').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!dateChoisie) {
    alert('Merci de choisir une date dans le calendrier.');
    return;
  }

  const nom = document.getElementById('sm-nom').value.trim();
  const telephone = document.getElementById('sm-telephone').value.trim();
  const vetement = document.getElementById('sm-vetement').value.trim();
  const mesures = document.getElementById('sm-mesures').value.trim();
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
    `Mesures : ${mesures || 'à discuter'}\n` +
    `Mode : ${mode}\n` +
    `Date souhaitée : ${dateLisible} à ${heure}\n` +
    (notes ? `Notes : ${notes}\n` : '') +
    `Nom : ${nom}\nTéléphone : ${telephone}`;

  const lienWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(lienWhatsApp, '_blank');

  document.getElementById('form-sur-mesure').reset();
  dateChoisie = null;
  document.getElementById('date-choisie-affichage').textContent = 'Choisissez une date dans le calendrier ci-dessus.';
  genererCalendrier();
});

chargerIndisponibilites();
