// ============================================================
// LOGIS FREIGHT â€” app.js
// Cinematic Scroll Engine | LERP 0.02 | CONCURRENCY 48
// ============================================================

const TOTAL_FRAMES = 419;     // logis-freight-ru frames
const PAGE_COUNT   = 6;
const LERP         = 0.02;
const CONCURRENCY  = 48;

// === DEVICE DETECTION ===
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || innerWidth < 768;
const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';

// === CANVAS ===
const canvas = document.getElementById('gl-canvas');
const ctx    = canvas.getContext('2d');
let canvasDpr = 1; // module-level â€” MUST match between resize() and drawFrame()

function resize() {
  canvasDpr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2);
  canvas.width  = innerWidth  * canvasDpr;
  canvas.height = innerHeight * canvasDpr;
  canvas.style.width  = innerWidth  + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// === FRAME LOADING ===
const frames = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isReady     = false;

function frameName(i) {
  return FRAME_DIR + '/frame_' + String(i + 1).padStart(6, '0') + '.webp';
}

async function loadAll() {
  const queue = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      await new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => {
          frames[i] = img;
          loadedCount++;
          const pct = Math.round(loadedCount / TOTAL_FRAMES * 100);
          const bar = document.getElementById('progress-bar');
          if (bar) bar.style.width = pct + '%';
          if (loadedCount === 1) { isReady = true; startAnim(); }
          if (loadedCount === TOTAL_FRAMES) {
            const loader = document.getElementById('loader');
            if (loader) {
              loader.style.transition = 'opacity 0.8s';
              loader.style.opacity = '0';
              setTimeout(() => { loader.style.display = 'none'; }, 800);
            }
          }
          resolve();
        };
        img.src = frameName(i);
      });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

// === ANIMATION LOOP ===
let currentFrame = 0;
let targetFrame  = 0;

window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress  = maxScroll > 0 ? scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(Math.round(idx), TOTAL_FRAMES - 1))];
  if (!img || !img.complete) return;

  // Use innerWidth/innerHeight â€” ctx.setTransform handles DPR scaling
  const W = innerWidth;
  const H = innerHeight;

  // Cover-fit (background-size: cover equivalent)
  const r  = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth  * r;
  const ih = img.naturalHeight * r;
  const x  = (W - iw) / 2;
  const y  = (H - ih) / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, x, y, iw, ih);

  // Radial vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.88);
  vig.addColorStop(0, 'rgba(6,6,6,0)');
  vig.addColorStop(1, 'rgba(6,6,6,0.82)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Bottom gradient darkening
  const bot = ctx.createLinearGradient(0, H * 0.55, 0, H);
  bot.addColorStop(0, 'rgba(6,6,6,0)');
  bot.addColorStop(1, 'rgba(6,6,6,0.90)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  // Top gradient (navbar protection)
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.2);
  top.addColorStop(0, 'rgba(6,6,6,0.55)');
  top.addColorStop(1, 'rgba(6,6,6,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.2);
}

function startAnim() {
  (function loop() {
    requestAnimationFrame(loop);
    currentFrame += (targetFrame - currentFrame) * LERP;
    if (isReady) drawFrame(currentFrame);
  })();
}

// === INTERSECTION OBSERVER â€” section activation ===
const pages    = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i)    => p.classList.toggle('is-active', i === idx));
      navLinks.forEach((l, i) => l.classList.toggle('active',    i === idx - 1));
    }
  });
}, { rootMargin: '-40% 0px -40% 0px' });

pages.forEach(p => observer.observe(p));

// Ensure hero starts active
if (pages[0]) pages[0].classList.add('is-active');

// === BURGER MENU ===
const burger         = document.getElementById('burger');
const navDrawer      = document.getElementById('nav-drawer');
const drawerClose    = document.getElementById('drawer-close');
const drawerBackdrop = document.getElementById('drawer-backdrop');

function openDrawer() {
  navDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
  burger.classList.add('open');
  burger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  navDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (burger)         burger.addEventListener('click', openDrawer);
if (drawerClose)    drawerClose.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

// Close drawer on any drawer link click
document.querySelectorAll('.drawer-link').forEach(link => {
  link.addEventListener('click', closeDrawer);
});

// === FORM SUBMIT ===
function handleFormSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.textContent = 'âœ“ Ð—Ð°ÑÐ²ÐºÐ° Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð°!';
    btn.style.borderColor = '#FFC107';
    btn.style.color = '#FFC107';
    setTimeout(() => {
      btn.textContent = 'ÐžÑ‚Ð¿Ñ€Ð°Ð²Ð¸Ñ‚ÑŒ Ð·Ð°ÑÐ²ÐºÑƒ';
      btn.style.borderColor = '';
      btn.style.color = '';
      e.target.reset();
    }, 3500);
  }
}

// === KEYBOARD NAV ===
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});

// === START ===
loadAll();
