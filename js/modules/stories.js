/**
 * FICHIER : stories.js
 * RÔLE    : Section « Motion » (reels verticaux) :
 *             - survol à la souris : aperçu muet en boucle dans la carte ;
 *             - clic : lecteur plein écran façon stories — barres de
 *               progression, tap gauche/droite pour précédent/suivant,
 *               appui long pour mettre en pause, son activable, flèches
 *               du clavier, enchaînement automatique des vidéos.
 *           Les données de chaque vidéo sont lues sur les attributs
 *           data-* des cartes .reel-card (générées par scripts/build.mjs).
 *           Sans JavaScript, la section reste une galerie d'images.
 * DÉPEND  : components/_story.css, sections/_motion.css
 */

const HOLD_DELAY_MS = 200; // au-delà, un appui devient « pause » (pas un tap)

/**
 * Initialise les aperçus et le lecteur. Ne fait rien si la page n'a ni
 * reels ni lecteur.
 */
export function init() {
  const cards = [...document.querySelectorAll('.reel-card')];
  const dialog = document.getElementById('story');
  if (!cards.length || !dialog) return;

  const reels = cards.map((card) => ({
    src: card.dataset.src,
    poster: card.dataset.poster,
    title: card.dataset.title,
    text: card.dataset.text,
  }));

  setupPreviews(cards);
  const player = createPlayer(dialog, reels);

  cards.forEach((card, index) => {
    card.querySelector('.reel-card__trigger').addEventListener('click', () => {
      card.querySelector('.reel-card__video')?.pause();
      card.classList.remove('is-previewing');
      player.open(index);
    });
  });
}

/* ---------- Aperçus au survol ---------- */

function setupPreviews(cards) {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Sur mobile, pas de lecture automatique : on n'entame pas le forfait
  // data du visiteur, l'image de couverture suffit.
  if (!finePointer || reducedMotion) return;

  cards.forEach((card) => {
    const trigger = card.querySelector('.reel-card__trigger');
    const video = card.querySelector('.reel-card__video');
    if (!video) return;

    trigger.addEventListener('pointerenter', () => {
      video.preload = 'auto';
      video.currentTime = 0;
      const playing = video.play();
      if (playing) playing.then(() => card.classList.add('is-previewing')).catch(() => {});
    });

    trigger.addEventListener('pointerleave', () => {
      video.pause();
      card.classList.remove('is-previewing');
    });
  });
}

/* ---------- Lecteur stories ---------- */

function createPlayer(dialog, reels) {
  const video = dialog.querySelector('#story-video');
  const progress = dialog.querySelector('#story-progress');
  const title = dialog.querySelector('#story-title');
  const text = dialog.querySelector('#story-text');
  const muteButton = dialog.querySelector('#story-mute');
  const navButtons = dialog.querySelectorAll('.story__nav');

  progress.innerHTML = reels.map(() => '<li><span></span></li>').join('');
  const bars = [...progress.querySelectorAll('span')];

  let current = 0;
  let muted = false;
  let rafId = 0;
  let holdTimer = 0;
  let heldPause = false;
  let pointerDownAt = 0;

  function setBar(index, ratio) {
    bars[index].style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  }

  function tick() {
    if (video.duration) setBar(current, video.currentTime / video.duration);
    rafId = requestAnimationFrame(tick);
  }

  function setPaused(paused) {
    dialog.classList.toggle('is-paused', paused);
  }

  function play() {
    video.muted = muted;
    const attempt = video.play();
    if (!attempt) return;
    attempt.catch(() => {
      // Lecture avec son refusée par le navigateur : on relance en muet
      muted = true;
      syncMute();
      video.muted = true;
      video.play().catch(() => setPaused(true));
    });
  }

  function load(index) {
    current = index;
    const reel = reels[index];
    bars.forEach((_, i) => setBar(i, i < index ? 1 : 0));
    navButtons[0].disabled = index === 0;
    navButtons[1].disabled = index === reels.length - 1;

    dialog.classList.add('is-switching');
    video.poster = reel.poster || '';
    video.src = reel.src;
    title.textContent = reel.title;
    text.textContent = reel.text;
    setPaused(false);
    play();
  }

  function next() {
    if (current < reels.length - 1) load(current + 1);
    else close();
  }

  function prev() {
    // Comme sur Instagram : si la vidéo a bien commencé, « précédent »
    // la reprend du début plutôt que de changer de vidéo.
    if (video.currentTime > 2 || current === 0) {
      video.currentTime = 0;
      setPaused(false);
      play();
    } else {
      load(current - 1);
    }
  }

  function togglePause() {
    if (video.paused) {
      setPaused(false);
      play();
    } else {
      video.pause();
      setPaused(true);
    }
  }

  function syncMute() {
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son');
  }

  function open(index) {
    dialog.showModal();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
    load(index);
  }

  function close() {
    dialog.close();
  }

  /* Événements de la vidéo */
  video.addEventListener('playing', () => dialog.classList.remove('is-switching'));
  video.addEventListener('loadeddata', () => dialog.classList.remove('is-switching'));
  video.addEventListener('ended', next);

  /* Commandes */
  muteButton.addEventListener('click', () => {
    muted = !muted;
    video.muted = muted;
    syncMute();
  });
  dialog.querySelector('#story-close').addEventListener('click', close);

  // Zones de tap + flèches. Un appui long met en pause tant qu'on tient ;
  // le clic qui suit le relâchement est alors ignoré.
  dialog.querySelectorAll('[data-story]').forEach((button) => {
    button.addEventListener('click', (event) => {
      // detail === 0 : activation au clavier (Entrée/Espace), toujours valide
      const fromPointer = event.detail !== 0;
      if (fromPointer && (heldPause || Date.now() - pointerDownAt > 600)) {
        heldPause = false;
        return;
      }
      if (button.dataset.story === 'next') next();
      else prev();
    });
  });

  dialog.querySelectorAll('.story__zone').forEach((zone) => {
    zone.addEventListener('pointerdown', () => {
      pointerDownAt = Date.now();
      heldPause = false;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        if (video.paused) return;
        heldPause = true;
        video.pause();
      }, HOLD_DELAY_MS);
    });
    const release = () => {
      clearTimeout(holdTimer);
      if (heldPause) play();
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
    zone.addEventListener('pointerleave', release);
    // Empêche le menu « enregistrer la vidéo » lors d'un appui long
    zone.addEventListener('contextmenu', (event) => event.preventDefault());
  });
  // Les flèches n'ont pas d'appui long : leur clic est toujours valide
  navButtons.forEach((button) => button.addEventListener('pointerdown', () => {
    pointerDownAt = Date.now();
    heldPause = false;
  }));

  // Clavier : ← → pour naviguer, Espace/K pause, M son (Échap est natif)
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); prev(); }
    else if (event.key === ' ' || event.key.toLowerCase() === 'k') { event.preventDefault(); togglePause(); }
    else if (event.key.toLowerCase() === 'm') { muteButton.click(); }
  });

  // Clic sur le fond sombre (hors du cadre) : fermeture
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener('close', () => {
    cancelAnimationFrame(rafId);
    clearTimeout(holdTimer);
    video.pause();
    video.removeAttribute('src');
    video.load(); // libère la connexion réseau
    setPaused(false);
  });

  syncMute();
  return { open };
}
