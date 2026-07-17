const params = new URLSearchParams(window.location.search);
const typeParam = params.get('type');
const refParam = params.get('ref');
const nomParam = params.get('nom');

if (typeParam) {
  const radio = document.querySelector(`input[name="avis-type"][value="${typeParam}"]`);
  if (radio) radio.checked = true;
}
if (nomParam) {
  document.getElementById('avis-nom').value = decodeURIComponent(nomParam);
}

let noteChoisie = 0;
document.querySelectorAll('#avis-etoiles span').forEach(etoile => {
  etoile.addEventListener('click', () => {
    noteChoisie = Number(etoile.dataset.valeur);
    document.querySelectorAll('#avis-etoiles span').forEach(e => {
      e.classList.toggle('active', Number(e.dataset.valeur) <= noteChoisie);
    });
  });
});

document.getElementById('form-avis').addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById('avis-message');

  if (!noteChoisie) {
    messageEl.textContent = 'Merci de choisir une note en cliquant sur les étoiles.';
    return;
  }

  const nom = document.getElementById('avis-nom').value.trim();
  const type = document.querySelector('input[name="avis-type"]:checked').value;
  const commentaire = document.getElementById('avis-commentaire').value.trim();

  const { error } = await supabaseClient.from('avis').insert({
    type: type,
    reference: refParam || null,
    client_nom: nom,
    note: noteChoisie,
    commentaire: commentaire
  });

  if (error) {
    messageEl.textContent = "Un problème est survenu, réessaie dans un instant.";
    console.error(error);
    return;
  }

  document.getElementById('form-avis').innerHTML =
    '<p style="text-align:center; color:var(--terracotta-dark); font-family:var(--font-display); font-size:18px;">Merci pour votre avis ! 🙏</p>';
});
