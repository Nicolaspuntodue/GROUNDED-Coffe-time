// Procedural WebGL avocado: two lathe-built halves, physically lit flesh, veined pit, stem.
// No model download — it is all geometry + small canvas textures, so it splits cleanly on scroll.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Silhouette r(t), t = 0 bottom → 1 tip. Shared by the lathe (JS) and the flesh shader (GLSL).
const H = 2.55, Y0 = -1.1, R = 1.0;
const PIT_Y = -0.32, PIT_R = 0.42;
// sin^0.5 keeps both ends round; the (1-t) term makes the pear; a soft dip forms the neck
const profile = t => Math.pow(Math.sin(Math.PI * t), 0.5) * Math.pow(0.5 + 0.5 * (1 - t), 1.15) * R
  * (1 - 0.08 * Math.exp(-(((t - 0.68) / 0.13) ** 2)));
const GLSL_PROFILE = /* glsl */`
  float profile(float t) {
    float neck = 1.0 - 0.08 * exp(-pow((t - 0.68) / 0.13, 2.0));
    return pow(sin(3.14159265 * t), 0.5) * pow(0.5 + 0.5 * (1.0 - t), 1.15) * ${R.toFixed(3)} * neck;
  }`;

function canvasTex(draw, repeat, srgb) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const dots = (g, n, rMin, rMax, tone) => {
  for (let i = 0; i < n; i++) {
    const x = rnd(0, 512), y = rnd(0, 512), r = rnd(rMin, rMax);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, tone()); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
};
// Pebbly Hass skin
const skinBump = () => canvasTex(g => {
  g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, 512, 512);
  dots(g, 9000, 2, 6, () => { const v = rnd(170, 255) | 0; return `rgb(${v},${v},${v})`; });
}, [7, 7]);
const skinColor = () => canvasTex(g => {
  g.fillStyle = '#34501b'; g.fillRect(0, 0, 512, 512);
  dots(g, 260, 20, 70, () => Math.random() < 0.55 ? 'rgba(24,32,14,.6)' : 'rgba(88,116,40,.45)');
  dots(g, 40, 30, 90, () => 'rgba(40,24,30,.25)');                 // ripening purple-black patches
  dots(g, 4000, 1, 3, () => 'rgba(160,178,86,.35)');                // lenticels
}, [2, 2], true);
// Avocado stone: brown with pale wandering veins
const pitColor = () => canvasTex(g => {
  g.fillStyle = '#6a3a1d'; g.fillRect(0, 0, 512, 512);
  dots(g, 120, 20, 60, () => Math.random() < 0.5 ? 'rgba(130,78,40,.5)' : 'rgba(60,30,14,.45)');
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(${rnd(170, 205) | 0},${rnd(120, 150) | 0},${rnd(80, 100) | 0},${rnd(0.25, 0.55)})`;
    g.lineWidth = rnd(1, 3.5); g.beginPath();
    let x = rnd(0, 512), y = rnd(0, 512); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += rnd(-40, 40); y += rnd(10, 60); g.quadraticCurveTo(x + rnd(-30, 30), y - 20, x, y); }
    g.stroke();
  }
}, [1, 1], true);
// fine fibrous bump for the cut flesh
const fleshBump = () => canvasTex(g => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  dots(g, 6000, 0.5, 2.5, () => { const v = rnd(90, 170) | 0; return `rgb(${v},${v},${v})`; });
}, [3, 3]);

// Flesh = MeshPhysicalMaterial (real lighting, wet sheen) with the colour painted procedurally.
function fleshMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.35, bumpMap: fleshBump(), bumpScale: 0.6, sheen: 0.3, sheenColor: new THREE.Color('#fff7c2') });
  const col = hex => new THREE.Color(hex);
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {
      uCore: { value: col('#F5ECA8') }, uMid: { value: col('#DDE37E') }, uRim: { value: col('#86AC34') },
      uSkin: { value: col('#22301A') }, uHollow: { value: col('#EADB86') }, uHollowDeep: { value: col('#B49E4C') },
    });
    sh.vertexShader = 'varying vec2 vP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vP = vec2(position.z, position.y);');
    sh.fragmentShader = /* glsl */`
      varying vec2 vP;
      uniform vec3 uCore, uMid, uRim, uSkin, uHollow, uHollowDeep;
      ${GLSL_PROFILE}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec3 flesh(vec2 p) {
        float t = clamp((p.y - (${Y0.toFixed(3)})) / ${H.toFixed(3)}, 0.0, 1.0);
        float d = abs(p.x) / max(profile(t), 1e-3);                     // 0 centre → 1 skin
        vec2 toPit = vec2(p.x, p.y - (${PIT_Y.toFixed(3)}));
        float dp = length(toPit) / ${PIT_R.toFixed(3)};
        vec3 c = mix(uCore, uMid, smoothstep(0.25, 0.75, d));
        c = mix(c, uRim, smoothstep(0.68, 0.95, d));
        c = mix(c, uSkin, smoothstep(0.955, 0.985, d));
        c = mix(c, uCore * 1.04, (1.0 - smoothstep(1.0, 1.8, dp)) * 0.55);
        float ang = atan(toPit.y, toPit.x);                               // vascular fibres from the stone
        c *= 1.0 - 0.035 * smoothstep(0.55, 1.0, sin(ang * 90.0 + hash(floor(vec2(ang * 30.0, dp * 5.0))) * 6.0)) * smoothstep(1.1, 2.2, dp);
        if (dp < 1.0) c = mix(uHollow, uHollowDeep, pow(dp, 3.0));        // the empty cup
        return c;
      }
    ` + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = flesh(vP);');
  };
  return m;
}

function buildHalf(side, skinMat, fleshMat) {
  // side = +1 → half at x ≥ 0 with its cut face pointing -x
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';                 // twist about the cut-plane normal first, then swing open
  const pts = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80; pts.push(new THREE.Vector2(Math.max(profile(t), 1e-4), Y0 + t * H)); }
  const skin = new THREE.Mesh(new THREE.LatheGeometry(pts, 96, side > 0 ? 0 : Math.PI, Math.PI), skinMat);
  const shape = new THREE.Shape();
  pts.forEach((p, i) => i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y));
  for (let i = pts.length - 1; i >= 0; i--) shape.lineTo(-pts[i].x, pts[i].y);
  const faceGeo = new THREE.ShapeGeometry(shape, 64);
  faceGeo.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2);
  g.add(skin, new THREE.Mesh(faceGeo, fleshMat));
  return g;
}

export function createAvocado(canvas, { reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const key = new THREE.DirectionalLight('#fff1d6', 2.6); key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight('#e6f3b4', 1.8); rim.position.set(4, 1.5, -3);
  scene.add(key, rim, new THREE.HemisphereLight('#fffbe8', '#4f6b22', 0.55));

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const bump = skinBump();
  const skinMat = new THREE.MeshPhysicalMaterial({ map: skinColor(), roughness: 0.55, bumpMap: bump, bumpScale: 9, clearcoat: 0.5, clearcoatRoughness: 0.42, sheen: 0.5, sheenColor: new THREE.Color('#8fae4a') });
  const fleshMat = fleshMaterial();
  const pitMat = new THREE.MeshPhysicalMaterial({ map: pitColor(), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, bumpMap: bump, bumpScale: 1 });

  const root = new THREE.Group();
  const halfL = buildHalf(-1, skinMat, fleshMat);
  const halfR = buildHalf(1, skinMat, fleshMat);
  const pit = new THREE.Mesh(new THREE.SphereGeometry(PIT_R * 0.97, 64, 48), pitMat);
  pit.scale.set(1, 1.1, 1);
  pit.position.set(0, PIT_Y, 0);
  halfR.add(pit);
  // little woody stem nub at the tip
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.06, 16), new THREE.MeshStandardMaterial({ color: '#5a4126', roughness: 0.9, bumpMap: bump, bumpScale: 2 }));
  stem.position.y = Y0 + H - 0.005;
  halfL.add(stem);
  root.add(halfL, halfR);
  scene.add(root);

  // Pose state — every field is scroll-driven from main.js
  const cur = { x: 0, y: 0, z: 0, s: 0, rx: 0, ry: 0, rz: 0, split: 0, open: 0, twist: 0, pit: 0, sway: 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth * 2 - 1; pointer.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  let wobble = 0, wobbleV = 0;     // spring driven by scroll velocity → the fruit feels weighty

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  let wasVisible = true;
  function render(time, velocity = 0) {
    const t = time / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    const sw = reduced ? 0 : cur.sway;
    if (!reduced) {
      wobbleV += (Math.max(-40, Math.min(40, velocity)) * 0.004 - wobble) * 0.08;
      wobbleV *= 0.86; wobble += wobbleV;
    }

    root.position.set(cur.x, cur.y + Math.sin(t * 1.1) * 0.05 * sw, cur.z);
    root.scale.setScalar(cur.s * (1 + Math.sin(t * 2.2) * 0.006 * sw));
    root.rotation.set(cur.rx + pointer.y * 0.12 + wobble * 0.6, cur.ry + Math.sin(t * 0.5) * 0.45 * sw + pointer.x * 0.25, cur.rz + wobble);

    halfR.position.x = cur.split; halfL.position.x = -cur.split;
    halfR.rotation.y = cur.open * 1.5; halfL.rotation.y = -cur.open * 1.5;
    halfR.rotation.x = cur.twist; halfL.rotation.x = -cur.twist;
    halfR.position.z = halfL.position.z = -cur.open * 0.25;
    pit.position.x = -cur.pit * 0.95;               // local -x = out of the cut face, toward camera once opened
    pit.position.y = PIT_Y + cur.pit * 0.35;
    pit.rotation.set(cur.pit * t * 0.8, cur.pit * t * 1.2, 0);

    const visible = cur.s > 0.02 && cur.y > -3.8;
    if (visible || wasVisible) renderer.render(scene, camera);   // skip GPU work while parked offscreen
    wasVisible = visible;
  }

  return { cur, render };
}
