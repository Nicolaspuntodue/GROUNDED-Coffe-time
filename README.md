# GROUNDED — whole food bar & coffee

Scroll-driven homepage demo for **GROUNDED**, a whole-food café / coffee bar.
Inspired by [palmo.co.in](https://www.palmo.co.in/) — the coconut is replaced by a real-time WebGL avocado
that you slice, twist and open just by scrolling.

## Run

No build step. Any static server works:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. Deployable as-is to GitHub Pages / Netlify / Vercel.

## What's inside

| File | Role |
|------|------|
| `index.html` | Sections — each `data-pose` names where the avocado should be at that point of the scroll |
| `avocado.js` | Procedural three.js avocado: lathe halves, physically-lit flesh shader, veined pit, stem (no 3D model download) |
| `main.js` | Lenis smooth scroll, pose interpolation, GSAP ScrollTrigger reveals, pinned horizontal menu, basket |
| `style.css` | Design tokens + layout |
| `assets/img` | Photography generated with Higgsfield, film-graded and exported as WebP |

**Scroll story:** whole avocado → 01 Slice (seam) → 02 Twist → 03 Open (stats) → *A v o c a d o* → pit pops out → menu → story → visit (halves return).

**Design system:** Fraunces (soft display) · Instrument Sans (body) · Caveat (hand notes). Palette: cream `#F4EFDF`, avocado skin `#223015`, green `#4F6B22`, flesh `#C9D96A`, butter `#F2D65C`.

**Functional demo:** add to order, quantity +/−, totals, pickup form, persisted in `localStorage`. No payment is taken.

**Performance / a11y:** zero-download 3D, DPR capped at 1.75, render loop skips the GPU when the fruit is parked off-screen, WebP images (~1.6 MB total, lazy-loaded), `prefers-reduced-motion` disables smooth scroll and idle motion, focus-trapped dialog, skip link.
