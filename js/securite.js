// ===================== OUTILS PARTAGÉS (sécurité, formulaires, images) =====================
// Chargé AVANT les autres scripts sur toutes les pages.

// Échappe un texte avant de l'insérer dans du HTML (empêche l'injection de code via un nom, un avis, etc.)
function esc(valeur) {
  return String(valeur ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// N'accepte que les liens http(s) — bloque les "javascript:..." injectés dans une URL
function urlSure(url) {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.href);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? esc(u.href) : '';
  } catch (e) {
    return '';
  }
}

// Anti-spam : champ piège invisible + délai minimum de remplissage
function marquerOuvertureFormulaire(form) {
  if (form) form.dataset.ouvertLe = String(Date.now());
}
function estRobot(form) {
  if (!form) return false;
  const piege = form.querySelector('input[name="site_web"]');
  if (piege && piege.value) return true;
  const ouvertLe = Number(form.dataset.ouvertLe || 0);
  return ouvertLe > 0 && (Date.now() - ouvertLe) < 3000;
}

// Validation simple d'un numéro (chiffres uniquement, indicatif compris)
function telephoneValide(numeroComplet) {
  const chiffres = String(numeroComplet || '').replace(/[^0-9]/g, '');
  return chiffres.length >= 8 && chiffres.length <= 15;
}

// Compresse une photo avant envoi (max 1600 px, JPEG ~82 %). Renvoie le fichier d'origine si impossible.
async function compresserImage(fichier, tailleMax = 1600, qualite = 0.82) {
  if (!fichier || !fichier.type || !fichier.type.startsWith('image/') || fichier.type === 'image/gif') return fichier;
  try {
    const image = await createImageBitmap(fichier);
    const ratio = Math.min(1, tailleMax / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', qualite));
    if (!blob || blob.size >= fichier.size) return fichier;
    const nom = fichier.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nom, { type: 'image/jpeg' });
  } catch (e) {
    return fichier;
  }
}

// Taille maximale des vidéos envoyées (Mo)
const TAILLE_MAX_VIDEO_MO = 45;
function videoTropLourde(fichier) {
  return !!fichier && fichier.type && fichier.type.startsWith('video/') && fichier.size > TAILLE_MAX_VIDEO_MO * 1024 * 1024;
}
