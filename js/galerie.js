// ===================== GALERIE PRODUIT (plusieurs photos + vidéo, défilement au doigt) =====================
// Utilisée dans la fiche produit de la boutique et de l'accueil.

// Liste ordonnée des médias d'un produit : photo principale, photos supplémentaires, puis vidéo
function mediasProduit(p) {
  const photos = [p.image_url, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean);
  const medias = photos.map(url => ({ type: 'photo', url }));
  if (p.video_url) medias.push({ type: 'video', url: p.video_url, poster: photos[0] || '' });
  return medias;
}

function nombrePhotos(p) {
  return [p.image_url, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean).length;
}

// Remplit le conteneur avec la galerie et active les points, flèches et miniatures
function afficherGalerie(conteneur, p) {
  const medias = mediasProduit(p);
  if (medias.length === 0) { conteneur.innerHTML = ''; return; }

  const slides = medias.map((m, i) => m.type === 'video'
    ? `<div class="galerie-slide"><video src="${urlSure(m.url)}" controls playsinline preload="metadata" ${m.poster ? `poster="${urlSure(m.poster)}"` : ''}></video></div>`
    : `<div class="galerie-slide"><img src="${urlSure(m.url)}" alt="${esc(p.nom)}, photo ${i + 1}" ${i > 0 ? 'loading="lazy"' : ''} decoding="async"></div>`
  ).join('');

  const plusieurs = medias.length > 1;
  conteneur.innerHTML = `
    <div class="galerie">
      <div class="galerie-piste" tabindex="0" aria-label="Photos du produit">${slides}</div>
      ${plusieurs ? `
        <button type="button" class="galerie-fleche galerie-prec" aria-label="Photo précédente">‹</button>
        <button type="button" class="galerie-fleche galerie-suiv" aria-label="Photo suivante">›</button>
        <span class="galerie-compteur">1 / ${medias.length}</span>
        <div class="galerie-points">${medias.map((m, i) => `<button type="button" class="galerie-point${i === 0 ? ' actif' : ''}" data-i="${i}" aria-label="Voir ${m.type === 'video' ? 'la vidéo' : 'la photo ' + (i + 1)}"></button>`).join('')}</div>
      ` : ''}
    </div>
    ${plusieurs ? `<div class="galerie-miniatures">${medias.map((m, i) => `
      <button type="button" class="galerie-mini${i === 0 ? ' actif' : ''}" data-i="${i}" aria-label="${m.type === 'video' ? 'Vidéo' : 'Photo ' + (i + 1)}">
        ${m.type === 'video' ? (m.poster ? `<img src="${urlSure(m.poster)}" alt="">` : '') + '<span class="galerie-mini-video">▶</span>' : `<img src="${urlSure(m.url)}" alt="" loading="lazy">`}
      </button>`).join('')}</div>` : ''}
  `;
  if (!plusieurs) return;

  const piste = conteneur.querySelector('.galerie-piste');
  const points = [...conteneur.querySelectorAll('.galerie-point')];
  const minis = [...conteneur.querySelectorAll('.galerie-mini')];
  const compteur = conteneur.querySelector('.galerie-compteur');
  let courant = 0;

  const aller = i => {
    i = Math.max(0, Math.min(medias.length - 1, i));
    piste.scrollTo({ left: i * piste.clientWidth, behavior: 'smooth' });
  };
  const majIndicateurs = () => {
    const i = Math.round(piste.scrollLeft / Math.max(1, piste.clientWidth));
    if (i === courant) return;
    courant = i;
    points.forEach((pt, k) => pt.classList.toggle('actif', k === i));
    minis.forEach((mn, k) => mn.classList.toggle('actif', k === i));
    compteur.textContent = `${i + 1} / ${medias.length}`;
    // met en pause une vidéo qu'on vient de quitter
    piste.querySelectorAll('video').forEach(v => { if (!v.paused) v.pause(); });
  };

  piste.addEventListener('scroll', () => window.requestAnimationFrame(majIndicateurs), { passive: true });
  conteneur.querySelector('.galerie-prec').addEventListener('click', () => aller(courant - 1));
  conteneur.querySelector('.galerie-suiv').addEventListener('click', () => aller(courant + 1));
  [...points, ...minis].forEach(b => b.addEventListener('click', () => aller(Number(b.dataset.i))));
  piste.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); aller(courant + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); aller(courant - 1); }
  });
}

// ===================== ORDRE D'AFFICHAGE =====================
// Ordre choisi dans l'admin en faisant glisser les produits (colonne "ordre"),
// puis les plus récents. Un produit jamais rangé (ordre vide) passe en premier.
// Si la colonne n'existe pas encore en base, on retombe sur l'ordre par date.
function trierProduits(requete, avecOrdre) {
  if (avecOrdre) requete = requete.order('ordre', { ascending: true, nullsFirst: true });
  return requete.order('cree_le', { ascending: false });
}
async function chargerProduitsTries(construire) {
  let reponse = await construire(true);
  if (reponse.error && /ordre/i.test(reponse.error.message || '')) reponse = await construire(false);
  return reponse;
}
