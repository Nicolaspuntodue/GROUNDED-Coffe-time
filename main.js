import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import Lenis from 'lenis';
import { createAvocado } from './avocado.js';

gsap.registerPlugin(ScrollTrigger);
// mobile URL bar show/hide fires height-only resizes; don't re-layout pins mid-scroll for those
ScrollTrigger.config({ ignoreMobileResize: true });
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ menu data */
const MENU = [
  { id: 'toast', name: 'Avocado Toast', price: 9.5, img: 'toast', tags: ['vegan', 'whole grain'], desc: 'Sourdough, a whole avocado fanned to order, lime, chili, pumpkin seeds.' },
  { id: 'acai', name: 'Açaí Bowl', price: 10, img: 'acai', tags: ['gluten free'], desc: 'Pure açaí, banana, blueberries, hemp, coconut, house granola, raw honey.' },
  { id: 'grain', name: 'Grounded Bowl', price: 12.5, img: 'grain', tags: ['vegan', 'gluten free'], desc: 'Quinoa, roast sweet potato, avocado, kale, chickpeas, tahini.' },
  { id: 'smoothie', name: 'Green Smoothie', price: 7, img: 'smoothie', tags: ['vegan'], desc: 'Spinach, avocado, banana, kiwi, mint. Nothing else.' },
  { id: 'matcha', name: 'Iced Matcha', price: 5.5, img: 'matcha', tags: ['vegan', 'oat milk'], desc: 'Ceremonial-grade matcha poured over oat milk and ice.' },
  { id: 'flatwhite', name: 'Flat White & Banana Bread', price: 7.5, img: 'flatwhite', tags: ['whole grain'], desc: 'Single-origin espresso with a slab of walnut banana bread.' },
];
const euro = n => '€' + n.toFixed(2);

$('[data-track]').innerHTML = MENU.map(m => `
  <article class="card">
    <div class="card__img"><img src="assets/img/${m.img}.webp" alt="${m.name}" loading="lazy" width="900" height="1117" /></div>
    <div class="card__body">
      <div class="card__row"><h3>${m.name}</h3><span class="card__price">${euro(m.price)}</span></div>
      <p>${m.desc}</p>
      <div class="card__tags">${m.tags.map(t => `<span>${t}</span>`).join('')}</div>
      <button class="card__add" type="button" data-add="${m.id}">Add to order</button>
    </div>
  </article>`).join('');

/* ------------------------------------------------------------------ smooth scroll */
const lenis = reduced ? null : new Lenis({ lerp: 0.09, anchors: { offset: 0 }, autoRaf: false });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------------------------------------------ 3D avocado + scroll poses */
let avo = null;
try { avo = createAvocado($('.stage'), { reduced }); }
catch (err) { console.warn('WebGL unavailable, continuing without 3D', err); $('.stage').remove(); }

// Each section names a pose; poses depend on viewport aspect so the fruit stays framed on phones.
// The fruit opens like a real one: seam (slice) → twist → apart.
function poses() {
  const a = avo ? avo.aspect() : innerWidth / innerHeight, hw = 2.2 * a, m = a < 0.9;
  const P = {
    hero:   m ? { x: 0.25, y: 1.12, s: 0.46, rx: 0.2, ry: -0.6, rz: -0.35, split: 0, open: 0, pit: 0, sway: 1 }
              : { x: hw * 0.48, y: -0.15, s: 1.18, rx: 0.2, ry: -0.6, rz: -0.3, split: 0, open: 0, pit: 0, sway: 1 },
    seam:   { x: m ? 0 : hw * 0.18, y: m ? -0.55 : -0.05, s: m ? 0.6 : 1.0, rx: 0.06, ry: 0, rz: 0.08, split: 0.04, open: 0, pit: 0, sway: 0.15 },
    twist:  { x: m ? 0 : -hw * 0.2, y: m ? -0.55 : -0.05, s: m ? 0.6 : 1.0, rx: 0.06, ry: 0.15, rz: -0.06, split: 0.22, open: 0.2, twist: 1.05, pit: 0, sway: 0.1 },
    split:  { x: 0, y: m ? -0.6 : -0.45, s: m ? 0.6 : 0.88, rx: 0.08, ry: 0, rz: 0, split: m ? 0.62 : 1, open: 1, pit: 0, sway: 0.25 },
    tuck:   { x: 0, y: m ? 1.55 : 1.25, s: m ? 0.34 : 0.55, rx: 0.08, ry: 0, rz: 0, split: m ? 0.62 : 1, open: 1, pit: 0, sway: 0.25 },
    wide:   m ? { x: 0, y: 1.22, s: 0.4, rx: 0.05, ry: 0, rz: 0, split: 1.15, open: 0.9, pit: 0, sway: 0.2 }
            : { x: 0, y: 0, s: 0.95, rx: 0.05, ry: 0, rz: 0, split: (hw * (m ? 0.62 : 0.84)) / (m ? 0.5 : 0.95), open: 0.88, pit: 0, sway: 0.2 },
    pit:    m ? { x: 0, y: 1.08, s: 0.52, rx: -0.1, ry: -0.2, rz: 0, split: 0.5, open: 1, pit: 1, sway: 0.3 }
              : { x: hw * 0.42, y: 0.2, s: 1.15, rx: -0.1, ry: -0.35, rz: 0.05, split: 0.7, open: 1, pit: 1, sway: 0.3 },
    away:   { x: 0, y: -5.5, s: 0.6, rx: 0.4, ry: 2.2, rz: 0, split: 0, open: 0, pit: 0, sway: 0 },
    exit:   { x: 0, y: 4.2, s: m ? 0.4 : 0.7, rx: 0.3, ry: 1.2, rz: 0, split: 0.1, open: 0.2, pit: 0, sway: 0 },
    finale: m ? { x: 0, y: 0.15, s: 0.42, rx: 0.15, ry: -0.4, rz: 0.2, split: 0.25, open: 0.4, pit: 0, sway: 1 }
              : { x: 0, y: 0.2, s: 0.85, rx: 0.15, ry: 0, rz: 0.1, split: (hw * 0.62) / 0.85, open: 0.55, pit: 0, sway: 0.6 },
  };
  for (const k in P) P[k].twist ??= 0;
  return P;
}
let anchors = [];
function measure() {
  const P = poses(), vh = innerHeight, sy = scrollY;
  anchors = [];
  $$('[data-pose]').forEach((el, i) => {
    const r = el.getBoundingClientRect(), top = r.top + sy, name = el.dataset.pose;
    const at = i === 0 ? 0 : name === 'away' ? top - vh * 0.25 : top + r.height / 2 - vh / 2;
    anchors.push({ at, pose: P[name] });
  });
}
const KEYS = ['x', 'y', 's', 'rx', 'ry', 'rz', 'split', 'open', 'twist', 'pit', 'sway'];
const smooth = t => t * t * (3 - 2 * t);
function targetPose(scroll) {
  if (!anchors.length) return null;
  if (scroll <= anchors[0].at) return anchors[0].pose;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (scroll < b.at) {
      const p = smooth(Math.min(1, Math.max(0, (scroll - a.at) / Math.max(1, b.at - a.at))));
      const o = {}; for (const k of KEYS) o[k] = a.pose[k] + (b.pose[k] - a.pose[k]) * p; return o;
    }
  }
  return anchors[anchors.length - 1].pose;
}
const intro = { v: 0 };
// [stiffness rad/s, damping ratio]; < 1 settles with a small, natural overshoot
const SPRING = { base: [7, 0.95], split: [9, 0.62], open: [8, 0.7], twist: [9, 0.6], pit: [8, 0.5] };
const vel = Object.fromEntries(KEYS.map(k => [k, 0]));
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (avo) {
    const tp = targetPose(lenis ? lenis.animatedScroll : scrollY);
    if (tp) {
      // springs instead of a plain ease: the fruit has weight, the halves give a little as they part
      for (const key of KEYS) {
        let goal = tp[key];
        if (key === 's') goal *= intro.v;
        if (key === 'ry') goal += (1 - intro.v) * -2.5;
        const [w, z] = SPRING[key] || SPRING.base;
        vel[key] += (w * w * (goal - avo.cur[key]) - 2 * z * w * vel[key]) * dt;
        avo.cur[key] += vel[key] * dt;
      }
    }
    avo.render(now, lenis ? lenis.velocity : 0);
  }
  requestAnimationFrame(tick);
}
ScrollTrigger.addEventListener('refresh', measure);   // ST refreshes on real (width) resizes

/* ------------------------------------------------------------------ scroll choreography */
function scrollFx() {
  // generic reveals
  $$('.reveal').forEach(el => gsap.from(el, {
    y: 48, opacity: 0, duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
  }));

  // count-up numbers
  $$('[data-num]').forEach(el => {
    const o = { n: 0 }, end = +el.dataset.num;
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { n: end, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.n).toLocaleString('en'); } }) });
  });

  // A v o c a d o — letters swing into line as you scroll
  gsap.fromTo('.word__big span',
    { yPercent: i => (i % 2 ? 70 : -70), rotate: i => (i - 3) * 9, opacity: 0 },
    { yPercent: 0, rotate: 0, opacity: 1, ease: 'none', stagger: 0.06,
      scrollTrigger: { trigger: '.word', start: 'top 85%', end: 'center 55%', scrub: 1 } });

  // horizontal menu: pin and translate the track
  const track = $('[data-track]');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const pan = gsap.to(track, { x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.menu', pin: true, start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true } });
  // photos drift inside their frames as the cards slide past (the img is 115% tall for this)
  $$('.card__img img', track).forEach(img => gsap.fromTo(img, { yPercent: -13 }, { yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: img.parentElement, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true } }));

  // statement parallax
  $$('.statement__img img').forEach(img => gsap.fromTo(img, { yPercent: -15 }, { yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.float').forEach(el => gsap.to(el, { y: +el.dataset.speed * -420, rotate: +el.dataset.speed * 120, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true } }));

  gsap.from('.footer__big', { yPercent: 45, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  // hide nav on scroll down, show on scroll up
  const nav = $('.nav');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => nav.classList.toggle('is-hidden', s.direction === 1 && s.scroll() > 240) });
}

/* ------------------------------------------------------------------ loader + intro */
async function boot() {
  document.body.classList.add('is-loading');
  lenis?.stop();
  const count = $('[data-count]'), o = { n: 0 };
  const counting = gsap.to(o, { n: 100, duration: reduced ? 0.2 : 1.6, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(o.n); } });
  const fontsOrTimeout = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]);
  await Promise.all([fontsOrTimeout, counting.then()]);

  scrollFx();
  ScrollTrigger.refresh();
  measure();
  requestAnimationFrame(tick);

  const tl = gsap.timeline({ onComplete: () => { document.body.classList.remove('is-loading'); lenis?.start(); } });
  tl.to('.loader', { yPercent: -100, duration: reduced ? 0.01 : 1.1, ease: 'expo.inOut' })
    .set('.loader', { display: 'none' })
    .to(intro, { v: 1, duration: 1.8, ease: 'elastic.out(1, 0.6)' }, '-=0.45')
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.2, stagger: 0.09, ease: 'expo.out' }, '<')
    .from('.hero__note, .hero__tags li, .hero__lede, .hero .btn', { y: 24, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out' }, '<0.25');
}
boot();

/* ------------------------------------------------------------------ basket */
const KEY = 'grounded-basket';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = b => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* private mode — basket lives in memory */ } };
let basket = read();
const basketEl = $('.basket');

function renderBasket() {
  const items = MENU.filter(m => basket[m.id] > 0);
  const total = items.reduce((s, m) => s + m.price * basket[m.id], 0);
  const qty = items.reduce((s, m) => s + basket[m.id], 0);
  $('[data-basket-list]').innerHTML = items.map(m => `
    <li class="basket__item">
      <img src="assets/img/${m.img}.webp" alt="" width="56" height="56" />
      <div><h3>${m.name}</h3><small>${euro(m.price)}</small></div>
      <div class="qty">
        <button type="button" data-dec="${m.id}" aria-label="Remove one ${m.name}">−</button>
        <output aria-label="Quantity">${basket[m.id]}</output>
        <button type="button" data-inc="${m.id}" aria-label="Add one ${m.name}">+</button>
      </div>
    </li>`).join('');
  $('[data-basket-total]').textContent = euro(total);
  $('[data-basket-count]').textContent = qty;
  basketEl.classList.toggle('is-empty', qty === 0);
}
function change(id, d) {
  basket[id] = Math.max(0, (basket[id] || 0) + d);
  if (!basket[id]) delete basket[id];
  write(basket); renderBasket();
}

let toastTimer;
function toast(msg) {
  const t = $('[data-toast]'); t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
}

let lastFocus = null;
function openBasket() {
  lastFocus = document.activeElement; renderBasket();
  $('[data-basket-done]').hidden = true; $('[data-basket-form]').hidden = false;
  basketEl.inert = false; basketEl.classList.add('is-open'); lenis?.stop();
  setTimeout(() => $('.basket__close').focus(), 50);
}
function closeBasket() {
  basketEl.classList.remove('is-open'); basketEl.inert = true; lenis?.start();
  lastFocus?.focus?.();
}

document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-close-basket]'); if (!t) return;
  if (t.dataset.add) {
    const m = MENU.find(x => x.id === t.dataset.add);
    change(m.id, 1); toast(`${m.name} added`);
    t.classList.add('is-added'); t.textContent = 'Added ✓';
    setTimeout(() => { t.classList.remove('is-added'); t.textContent = 'Add to order'; }, 1400);
    const c = $('[data-basket-count]'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  }
  else if (t.dataset.inc) change(t.dataset.inc, 1);
  else if (t.dataset.dec) change(t.dataset.dec, -1);
  else if ('openBasket' in t.dataset) openBasket();
  else if ('closeBasket' in t.dataset) closeBasket();
});
document.addEventListener('keydown', e => {
  if (!basketEl.classList.contains('is-open')) return;
  if (e.key === 'Escape') return closeBasket();
  if (e.key === 'Tab') {   // keep focus inside the dialog
    const f = $$('button, input, select, a[href]', $('.basket__panel')).filter(x => !x.closest('[hidden]') && x.offsetParent);
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  }
});
$('[data-basket-form]').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  $('[data-done-name]').textContent = String(fd.get('name')).trim();
  $('[data-done-time]').textContent = fd.get('time');
  basket = {}; write(basket); renderBasket();
  e.target.reset(); e.target.hidden = true;
  $('[data-basket-done]').hidden = false;
  basketEl.classList.remove('is-empty');   // keep the thank-you visible
});
renderBasket();
