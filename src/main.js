import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { createArt, createPoster, USPS, SCREEN_W, SCREEN_H, POSTER_W, POSTER_H } from './screens.js';

const $ = (id) => document.getElementById(id);
const APPLY_URL = 'https://onrol.in/programs/ai-generalist';

// ---------- analytics hook: works with GTM/GA (dataLayer) or any listener ----------
function track(event, data = {}) {
  try { (window.dataLayer = window.dataLayer || []).push({ event: 'onrol_' + event, ...data }); } catch {}
  dispatchEvent(new CustomEvent('onrol:' + event, { detail: data }));
}
document.querySelectorAll(`a[href="${APPLY_URL}"]`).forEach((a) => a.addEventListener('click', () => track('apply_click', { from: a.closest('[id]')?.id || 'page' })));

function showFallback() {
  $('loader')?.remove();
  $('fallback').style.display = 'flex';
}

// ---------- capability + quality tier ----------
const params = new URLSearchParams(location.search);
const OG = params.has('og');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();

function pickTier() {
  const forced = params.get('q');
  if (['low', 'mid', 'high'].includes(forced)) return forced;
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  if (navigator.connection?.saveData || mem <= 2 || cores <= 2) return 'low';
  if (coarse || mem <= 4 || cores <= 4) return 'mid';
  return 'high';
}
let tier = pickTier();

if (!hasGL) { showFallback(); }
else { start().catch((err) => { console.error(err); showFallback(); }); }

async function start() {
  await Promise.race([
    Promise.all([
      document.fonts.load(`800 170px "Plus Jakarta Sans"`),
      document.fonts.load(`600 30px "Plus Jakarta Sans"`),
      document.fonts.load(`700 20px "JetBrains Mono"`),
      document.fonts.load(`500 20px "JetBrains Mono"`),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});

  // ---------- levels: each has its own color ----------
  const ZONES = [
    { key: 'intro',  name: 'Intro',  sub: 'The path / 4 steps',   dark: '#ff7d1a', light: '#b03e00' },
    { key: 'learn',  name: 'Learn',  sub: 'Learn the AI tools',   dark: '#22d3c5', light: '#00736b' },
    { key: 'build',  name: 'Build',  sub: 'Build real projects',  dark: '#8b7bff', light: '#3d27c4' },
    { key: 'launch', name: 'Launch', sub: 'Launch to the web',    dark: '#ff4f7b', light: '#b30a3a' },
    { key: 'earn',   name: 'Earn',   sub: 'Earn from the skill',  dark: '#ffc23d', light: '#805300' },
    { key: 'apply',  name: 'Apply',  sub: 'No payment to apply',  dark: '#ff7d1a', light: '#b03e00' },
  ];
  const zoneColor = (z, light) => new THREE.Color(light ? ZONES[z].light : ZONES[z].dark);

  const RACK_X = 2.6, RACK_W = 1.4, RACK_H = 3.4, RACK_D = 1.9, W = 3.6, CEIL = RACK_H + 0.6;
  const SHAFT_X = 40, TURN_Z = -60, SHAFT_BOTTOM = -44;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const canvas = $('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance' });
  const maxDpr = { high: 2, mid: 1.5, low: 1 }[tier];
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxDpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showFallback(); track('webgl_lost'); });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070403');
  scene.fog = new THREE.FogExp2('#090503', 0.04);
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 260);

  // ---------- themed, per-level materials ----------
  const themed = { lines: [], dust: [], faces: [], leds: [], lights: [], reflectors: [], satins: [], satinMeshes: [], glossy: [], glass: [] };
  const matCache = new Map();
  function lineMat(z, o) {
    const k = z + ':' + o;
    if (matCache.has(k)) return matCache.get(k);
    const m = new THREE.LineBasicMaterial({ color: zoneColor(z, false), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
    m.userData.zone = z; m.userData.baseO = o; themed.lines.push(m); matCache.set(k, m); return m;
  }
  // batch many segments into one LineSegments per (parent, zone, opacity) for performance
  const batches = new Map();
  function seg(parent, a, b, z, o) {
    const k = parent.uuid + z + ':' + o;
    if (!batches.has(k)) batches.set(k, { parent, z, o, pts: [] });
    batches.get(k).pts.push(a, b);
  }
  function poly(parent, pts, z, o, closed = false) {
    for (let i = 0; i < pts.length - 1; i++) seg(parent, pts[i], pts[i + 1], z, o);
    if (closed) seg(parent, pts[pts.length - 1], pts[0], z, o);
  }
  function flushLines() {
    batches.forEach(({ parent, z, o, pts }) => parent.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(z, o))));
    batches.clear();
  }

  const segA = new THREE.Group(); scene.add(segA);                                    // straight: intro, learn, build (−Z)
  const segB = new THREE.Group(); segB.position.set(0, 0, TURN_Z); scene.add(segB);   // right turn: launch (+X)
  const segC = new THREE.Group(); segC.position.set(SHAFT_X, 0, TURN_Z); scene.add(segC); // shaft: earn, apply (−Y)

  // ---- shell (edges) for a stretch of the straight corridor ----
  const WI = 6.4;                                             // the home lobby is wider than the corridor
  function shellZ(z0, z1, zone, w = W) {
    [-w, w].forEach((x) => { seg(segA, V(x, 0, z0), V(x, 0, z1), zone, .55); seg(segA, V(x, CEIL, z0), V(x, CEIL, z1), zone, .4); });
  }
  // ---- unique floors & ceilings ----
  function floorGrid(g, z0, z1, zone, w = W) {               // intro: runway grid across the lobby
    [-1.8, -0.9, 0, 0.9, 1.8].forEach((x) => seg(g, V(x, 0, z0), V(x, 0, z1), zone, x === 0 ? .25 : .4));
    [-w + .9, w - .9].forEach((x) => seg(g, V(x, 0, z0), V(x, 0, z1), zone, .18));
    for (let z = z0; z > z1; z -= 2) seg(g, V(-w, 0, z), V(w, 0, z), zone, .1);
  }
  function floorHex(g, z0, z1, zone) {                        // learn: hexagon tiles
    const r = 0.55, h = Math.sqrt(3) * r;
    for (let row = 0, z = z0; z > z1; row++, z -= h / 2) {
      for (let x = -W + r + (row % 2 ? 1.5 * r : 0); x < W - r; x += 3 * r) {
        const pts = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pts.push(V(x + Math.cos(a) * r * .92, 0.002, z + Math.sin(a) * r * .92)); }
        poly(g, pts, zone, .22, true);
      }
    }
  }
  function floorBlueprint(g, z0, z1, zone) {                  // build: dense drafting grid
    for (let x = -W; x <= W + .01; x += .45) seg(g, V(x, 0, z0), V(x, 0, z1), zone, Math.abs(x % 1.8) < .05 ? .35 : .1);
    for (let z = z0; z > z1; z -= .45) seg(g, V(-W, 0, z), V(W, 0, z), zone, .1);
  }
  function floorChevrons(g, x0, x1, zone) {                   // launch: arrows pointing forward (+X local)
    for (let x = x0; x < x1; x += 1.6) {
      poly(g, [V(x, 0.002, -2.4), V(x + 1, 0.002, 0), V(x, 0.002, 2.4)], zone, .35);
      poly(g, [V(x - .35, 0.002, -2.4), V(x + .65, 0.002, 0), V(x - .35, 0.002, 2.4)], zone, .12);
    }
    [-W, W].forEach((z) => { seg(g, V(x0, 0, z), V(x1, 0, z), zone, .55); seg(g, V(x0, CEIL, z), V(x1, CEIL, z), zone, .4); });
  }
  function ceilLightBars(g, z0, z1) {
    for (let z = z0; z > z1; z -= 6) [-1.2, 1.2].forEach((x) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 2.4), barMat); b.position.set(x, CEIL - .05, z); g.add(b);
    });
  }
  function ceilArches(g, z0, z1, zone) {                      // learn: vaulted arches
    for (let z = z0; z > z1; z -= 3) {
      const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(V(-Math.cos(a) * W, CEIL + Math.sin(a) * 1.4, z)); }
      poly(g, pts, zone, .45);
    }
    seg(g, V(0, CEIL + 1.4, z0), V(0, CEIL + 1.4, z1), zone, .3);
  }
  function ceilTruss(g, z0, z1, zone) {                       // build: steel truss
    [-1.6, 1.6].forEach((x) => { seg(g, V(x, CEIL, z0), V(x, CEIL, z1), zone, .5); seg(g, V(x, CEIL + .7, z0), V(x, CEIL + .7, z1), zone, .35); });
    for (let z = z0, f = 0; z > z1; z -= 1.2, f ^= 1) {
      [-1.6, 1.6].forEach((x) => seg(g, V(x, f ? CEIL : CEIL + .7, z), V(x, f ? CEIL + .7 : CEIL, z - 1.2), zone, .35));
      seg(g, V(-1.6, CEIL, z), V(1.6, CEIL, z), zone, .25);
    }
  }
  function ceilHoops(g, x0, x1, zone) {                       // launch: tube of rings
    for (let x = x0; x < x1; x += 2.4) {
      const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push(V(x, 2.1 + Math.sin(a) * 3.3, Math.cos(a) * 4.1)); }
      poly(g, pts.filter((p) => p.y >= -0.01), zone, .4);
    }
  }
  function shaftHelix(g, yTop, yBot, zone) {                  // earn: spiral down the shaft
    [-W, W].forEach((x) => [-W, W].forEach((z) => seg(g, V(x, yTop, z), V(x, yBot, z), zone, .45)));
    for (let k = 0; k < 2; k++) {
      const pts = []; for (let y = yTop; y > yBot; y -= .25) { const a = y * .55 + k * Math.PI; pts.push(V(Math.cos(a) * W * .98, y, Math.sin(a) * W * .98)); }
      poly(g, pts, zone, .5);
    }
    for (let y = yTop; y > yBot; y -= 6) poly(g, [V(-W, y, -W), V(W, y, -W), V(W, y, W), V(-W, y, W)], zone, .3, true);
  }
  function floorRadial(g, y, zone) {                          // apply: target rings at the bottom
    for (let r = 1; r < W * 1.4; r += .7) {
      const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
      poly(g, pts, zone, .3);
    }
  }

  const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb070').multiplyScalar(1.4) });

  // zone boundaries along the straight corridor
  const Z_INTRO = [34, 2], Z_LEARN = [2, -26], Z_BUILD = [-26, TURN_Z - W];
  shellZ(...Z_INTRO, 0, WI); floorGrid(segA, ...Z_INTRO, 0, WI); ceilLightBars(segA, 30, 2);
  shellZ(...Z_LEARN, 1); floorHex(segA, ...Z_LEARN, 1); ceilArches(segA, ...Z_LEARN, 1);
  shellZ(...Z_BUILD, 2); floorBlueprint(segA, ...Z_BUILD, 2); ceilTruss(segA, ...Z_BUILD, 2);
  floorChevrons(segB, W, SHAFT_X - W, 3); ceilHoops(segB, W + 1, SHAFT_X - W, 3);
  shaftHelix(segC, CEIL, SHAFT_BOTTOM, 4);
  poly(segC, [V(-W, 0, -W), V(W, 0, -W), V(W, 0, W), V(-W, 0, W)], 3, .5, true);
  floorRadial(segC, SHAFT_BOTTOM + .2, 5);
  // gate frames where one level hands over to the next
  // lobby → corridor step: short walls closing the wide lobby down to the corridor
  [-1, 1].forEach((sd) => { seg(segA, V(sd * WI, 0, 2), V(sd * W, 0, 2), 0, .55); seg(segA, V(sd * WI, CEIL, 2), V(sd * W, CEIL, 2), 0, .4); seg(segA, V(sd * WI, 0, 2), V(sd * WI, CEIL, 2), 0, .45); });
  [[2, 1], [-26, 2]].forEach(([z, zone]) => poly(segA, [V(-W, 0, z), V(-W, CEIL, z), V(W, CEIL, z), V(W, 0, z)], zone, .8));
  flushLines();

  // ---------- dust ----------
  const dustN = { high: 1400, mid: 700, low: 300 }[tier];
  function dust(zone, box) {
    const dp = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) { dp[i*3] = box[0] + Math.random() * (box[1]-box[0]); dp[i*3+1] = box[2] + Math.random() * (box[3]-box[2]); dp[i*3+2] = box[4] + Math.random() * (box[5]-box[4]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const pm = new THREE.PointsMaterial({ color: zoneColor(zone, false), size: .03, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
    pm.userData.zone = zone; themed.dust.push(pm); scene.add(new THREE.Points(geo, pm));
  }
  dust(0, [-WI, WI, 0, 4.5, 2, 34]); dust(1, [-4, 4, 0, 4.5, -26, 2]); dust(2, [-4, 4, 0, 4.5, TURN_Z - 4, -26]);
  dust(3, [0, SHAFT_X, 0, 4.5, TURN_Z - 4, TURN_Z + 4]); dust(4, [SHAFT_X - 4, SHAFT_X + 4, SHAFT_BOTTOM, 4, TURN_Z - 4, TURN_Z + 4]);

  // ---------- lighting + floors ----------
  const hemi = new THREE.HemisphereLight('#ffffff', '#120604', 0.25); scene.add(hemi);
  [[0,3,6,0],[0,3,20,0],[0,3,-12,1],[0,3,-38,2],[0,3,-52,2],[14,3,TURN_Z,3],[30,3,TURN_Z,3],[SHAFT_X,-14,TURN_Z,4],[SHAFT_X,-34,TURN_Z,5]].forEach(([x,y,z,zone]) => {
    const l = new THREE.PointLight(zoneColor(zone, false), 14, 14, 1.6); l.position.set(x, y, z); l.userData.zone = zone; scene.add(l); themed.lights.push(l);
  });
  function floorPlane(parent, w, l, pos) {
    // high tier: real reflections; others: cheap glossy plane
    const glossy = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ color: '#0b0705', metalness: .6, roughness: .35 }));
    glossy.rotation.x = -Math.PI / 2; glossy.position.copy(pos); parent.add(glossy); themed.glossy.push(glossy);
    if (tier !== 'high') return;
    glossy.visible = false;
    const r = new Reflector(new THREE.PlaneGeometry(w, l), { textureWidth: innerWidth * .5, textureHeight: innerHeight * .5, color: 0x2a1c14 });
    r.rotation.x = -Math.PI / 2; r.position.copy(pos); parent.add(r); themed.reflectors.push(r);
    const satin = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ color: '#070302', transparent: true, opacity: .55, depthWrite: false }));
    satin.rotation.x = -Math.PI / 2; satin.position.copy(pos).add(V(0, .002, 0)); parent.add(satin); themed.satins.push(satin.material); themed.satinMeshes.push(satin);
  }
  floorPlane(segA, WI * 2, 32, V(0, -0.01, 18));                              // lobby
  floorPlane(segA, W * 2, 2 - (TURN_Z - W), V(0, -0.01, (2 + TURN_Z - W) / 2)); // corridor
  floorPlane(segB, SHAFT_X - W * 2, W * 2, V(SHAFT_X / 2, -0.01, 0));
  function dropReflections() {
    themed.reflectors.forEach((r) => { r.visible = false; });
    themed.satinMeshes.forEach((m) => { m.visible = false; });
    themed.glossy.forEach((m) => { m.visible = true; });
  }

  // ---------- racks (tinted per level) ----------
  function rackTex(hex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 320;
    const g = c.getContext('2d'), col = new THREE.Color(hex);
    const rgb = (a, k = 1) => `rgba(${col.r*255*k|0},${col.g*255*k|0},${col.b*255*k|0},${a})`;
    g.fillStyle = rgb(.07); g.fillRect(0, 0, 128, 320);
    for (let y = 18; y < 300; y += 7) {
      g.fillStyle = rgb(.18 + Math.random() * .4, .8 + Math.random() * .3);
      g.fillRect(8, y, 112 * (.5 + Math.random() * .5), 1.5);
      if (Math.random() < .35) { g.fillStyle = rgb(.95, 1.2); g.fillRect(114, y - 1, 3, 3); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rackBody = new THREE.MeshStandardMaterial({ color: '#120d0b', metalness: .85, roughness: .35 });
  const rackGeo = new THREE.BoxGeometry(RACK_D, RACK_H, RACK_W), rackEdges = new THREE.EdgesGeometry(rackGeo);
  const ledGeo = new THREE.BoxGeometry(0.02, RACK_H * .92, 0.03), faceGeo = new THREE.PlaneGeometry(RACK_W * .92, RACK_H * .95);
  const zoneRes = ZONES.map((z, i) => {
    const led = new THREE.MeshBasicMaterial({ color: zoneColor(i, false).multiplyScalar(2) }); led.userData.zone = i; themed.leds.push(led);
    const faces = [0, 1, 2].map(() => { const m = new THREE.MeshBasicMaterial({ map: rackTex(z.dark), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); themed.faces.push(m); return m; });
    return { led, faces };
  });
  const clickable = [];
  function makeRack(zone, n) {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(rackGeo, rackBody));
    grp.add(new THREE.LineSegments(rackEdges, lineMat(zone, .4)));
    [-1, 1].forEach((s) => { const led = new THREE.Mesh(ledGeo, zoneRes[zone].led); led.position.set(RACK_D / 2 + .02, 0, s * (RACK_W / 2 - .04)); grp.add(led); });
    const face = new THREE.Mesh(faceGeo, zoneRes[zone].faces[n % 3]);
    face.position.x = RACK_D / 2 + .01; face.rotation.y = Math.PI / 2; grp.add(face);
    grp.children.forEach((m) => { m.position.y += RACK_H / 2; });
    face.userData = { id: ZONES[zone].name }; clickable.push(face);
    return grp;
  }
  function rackRow(parent, zone, start, along, across, up = V(0, 1, 0)) {
    for (let j = 0; j < 6; j++) [-1, 1].forEach((side) => {
      const r = makeRack(zone, j + (side > 0 ? 1 : 0));
      const spacing = up.y === 1 ? RACK_W + .25 : RACK_H + .4;
      r.position.copy(start).addScaledVector(along, j * spacing).addScaledVector(across, side * (RACK_X + RACK_D / 2));
      const front = across.clone().multiplyScalar(-side);
      r.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(front, up, front.clone().cross(up)));
      if (up.y !== 1) r.position.addScaledVector(up, -RACK_H / 2);
      parent.add(r);
    });
  }

  // ---------- screens ----------
  const screens = [], allScreens = [];
  let isLight = document.documentElement.dataset.theme === 'light';
  function makeScreen(parent, pos, normal, up, key, zone, opts = {}) {
    const frosted = tier !== 'low';
    const art = createArt(key, isLight ? ZONES[zone].light : ZONES[zone].dark, isLight, frosted);
    const tex = new THREE.CanvasTexture(art.canvas); tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const w = (opts.scale || 1) * (W * 2 - .2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * SCREEN_H / SCREEN_W),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.position.copy(pos); m.up.copy(up); parent.add(m);
    m.updateWorldMatrix(true, false);
    m.lookAt(m.getWorldPosition(V(0, 0, 0)).add(normal));
    m.userData = { art, tex, zone, lastDraw: -1, glass: null };
    if (frosted) {
      // frosted glass just behind the card: the corridor behind it is seen blurred, so the text reads cleanly
      const gm = new THREE.MeshPhysicalMaterial({
        color: isLight ? '#f6efe8' : '#1a120d', roughness: .55, metalness: 0, transmission: 1, thickness: .6, ior: 1.25,
        transparent: true, opacity: 1, depthWrite: true,   // hides the glowing lines behind; only the blurred room shows through
      });
      themed.glass.push(gm);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, w * SCREEN_H / SCREEN_W), gm);
      glass.position.z = -.03; glass.renderOrder = -1; m.add(glass);
      m.userData.glass = glass;
    }
    allScreens.push(m);
    if (!opts.solid) screens.push({ mesh: m, side: 1 });
    return m;
  }
  // home posters: USPs on the left and right walls, angled toward the visitor
  const posters = [];
  function makePoster(usp, side, z) {
    const art = createPoster(usp, isLight ? ZONES[0].light : ZONES[0].dark, isLight);
    const tex = new THREE.CanvasTexture(art.canvas); tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const h = 2.75, w = h * POSTER_W / POSTER_H;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(side * (WI - .7), 2.05, z);
    const a = .78;                                            // turn the poster toward the approaching camera
    m.lookAt(m.position.clone().add(V(-side * Math.cos(a), 0, Math.sin(a))));
    segA.add(m);
    // thin bracket lines tying the poster to the wall
    poly(segA, [V(side * WI, 3.4, z), m.position.clone().add(V(0, 1.37, 0))], 0, .35);
    poly(segA, [V(side * WI, .6, z), m.position.clone().add(V(0, -1.37, 0))], 0, .35);
    m.userData = { art, tex, zone: 0, lastDraw: -1 };
    m.userData.desk = { pos: m.position.clone(), quat: m.quaternion.clone() };
    posters.push(m); allScreens.push(m);
  }
  // phones: home reads  [poster] [ONROL] [poster]  — two posters stand beside the screen, facing you
  let portraitHome = false;
  function layoutPosters() {
    portraitHome = camera.aspect < 1;
    posters.forEach((m, i) => {
      if (!portraitHome) { m.position.copy(m.userData.desk.pos); m.quaternion.copy(m.userData.desk.quat); m.scale.setScalar(1); m.visible = true; return; }
      m.visible = false;                         // phones: the HTML trio shows the USPs
    });
  }
  makePoster(USPS[0], -1, 16.6); makePoster(USPS[1], 1, 16.6);
  makePoster(USPS[2], -1, 12.2); makePoster(USPS[3], 1, 12.2);
  flushLines();

  const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
  const introScreen = makeScreen(segA, V(0, 2.1, 10), Z, Y, 'intro', 0);
  makeScreen(segA, V(0, 2.1, -4), Z, Y, 'learn', 1);
  rackRow(segA, 1, V(0, 0, -7), V(0, 0, -1), X);
  makeScreen(segA, V(0, 2.1, -32), Z, Y, 'build', 2);
  rackRow(segA, 2, V(0, 0, -35), V(0, 0, -1), X);
  for (let k = -2; k <= 2; k++) { const r = makeRack(2, k + 2); r.rotation.y = -Math.PI / 2; r.position.set(k * (RACK_W + .2), 0, TURN_Z - W - RACK_D / 2); scene.add(r); }
  makeScreen(segB, V(14, 2.1, 0), V(-1, 0, 0), Y, 'launch', 3);
  rackRow(segB, 3, V(17, 0, 0), X, Z);
  makeScreen(segC, V(0, -8, 0), Y, X, 'earn', 4);
  rackRow(segC, 4, V(0, -11, 0), V(0, -1, 0), Z, X);
  const endScreen = makeScreen(segC, V(0, SHAFT_BOTTOM + .5, 0), Y, X, 'apply', 5, { solid: true, scale: .95 });
  endScreen.userData.href = APPLY_URL; clickable.push(endScreen);

  // ---------- post-processing ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .8, .5, .82);
  bloom.enabled = tier !== 'low';
  composer.addPass(bloom);
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, ca: { value: .0011 }, vig: { value: 1.35 }, grain: { value: .022 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float time; uniform float ca; uniform float vig; uniform float grain; varying vec2 vUv;
      float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - .5; float r2 = dot(d,d);
        vec2 off = d * ca * (1. + r2 * 6.);
        vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        col = (col - .5) * 1.06 + .5;
        col *= 1. - r2 * vig;
        col += (rand(vUv * 900. + time) - .5) * grain;
        gl_FragColor = vec4(max(col, 0.), 1.);
      }`,
  });
  composer.addPass(film);
  composer.addPass(new OutputPass());

  // ---------- path ----------
  const H = 1.7, R1 = 7, R2 = 6;
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(V(0, H, 32), V(0, H, TURN_Z + R1)));
  path.add(new THREE.CubicBezierCurve3(V(0, H, TURN_Z + R1), V(0, H, TURN_Z + R1 * .45), V(R1 * .45, H, TURN_Z), V(R1, H, TURN_Z)));
  path.add(new THREE.LineCurve3(V(R1, H, TURN_Z), V(SHAFT_X - R2, H, TURN_Z)));
  path.add(new THREE.CubicBezierCurve3(V(SHAFT_X - R2, H, TURN_Z), V(SHAFT_X - R2 * .45, H, TURN_Z), V(SHAFT_X, H - R2 * .45, TURN_Z), V(SHAFT_X, H - R2, TURN_Z)));
  path.add(new THREE.LineCurve3(V(SHAFT_X, H - R2, TURN_Z), V(SHAFT_X, SHAFT_BOTTOM + 7, TURN_Z)));
  path.updateArcLengths();
  const PATH_LEN = path.getLength();
  const clampU = (v) => THREE.MathUtils.clamp(v, 0, 1);
  function nearestU(p) {
    let best = 0, bd = Infinity;
    for (let i = 0; i <= 800; i++) { const d = path.getPointAt(i / 800).distanceToSquared(p); if (d < bd) { bd = d; best = i / 800; } }
    return best;
  }
  const SCREEN_U = [V(0, H, 10), V(0, H, -4), V(0, H, -32), V(14, H, TURN_Z), V(SHAFT_X, -8, TURN_Z)].map(nearestU);
  let STOPS = [], baseFov = 58;
  function computeStops() {
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * camera.aspect);
    const d = THREE.MathUtils.clamp(3.9 / Math.tan(hf), 6.5, 12);
    // home stands further back so the USP posters on both walls are in view
    // home stands further back so the USP posters are in view; on phones far enough to fit [poster][ONROL][poster]
    const homeD = camera.aspect > 1 ? d + 9.5 : d + 3;
    STOPS = [...SCREEN_U.map((u, i) => clampU(u - (i === 0 ? homeD : d) / PATH_LEN)), 1];
  }

  // ---------- state ----------
  let targetU = 0, currentU = 0, focus = null, fovKick = 0, auto = false, plainOn = false, menuOpen = false, started = false;
  let isDragging = false, dragDist = 0, lastY = 0;
  const mouse = { x: 0, y: 0 };
  const joy = { active: false, x: 0, y: 0 };
  let yaw = 0;

  function seen() { clearTimeout(hintTimer); $('hint').classList.remove('on'); }
  function stopAuto() {
    if (!auto) return; auto = false;
    $('autoBtn').setAttribute('aria-pressed', 'false'); $('autoBtn').textContent = '▶ Autopilot'; $('mAuto').textContent = '▶ Autopilot';
  }
  function goStop(i) { stopAuto(); focus = null; targetU = STOPS[THREE.MathUtils.clamp(i, 0, STOPS.length - 1)]; seen(); }
  function stepBy(dir) {
    stopAuto(); focus = null;
    const eps = .004;
    const next = dir > 0 ? STOPS.find((u) => u > targetU + eps) : [...STOPS].reverse().find((u) => u < targetU - eps);
    if (next !== undefined) { targetU = next; seen(); }
  }
  const nearestStop = (u) => { let b = 0, bd = Infinity; STOPS.forEach((s, i) => { const d = Math.abs(s - u); if (d < bd) { bd = d; b = i; } }); return b; };
  const zoneAt = (u) => { let z = 0; STOPS.forEach((s, i) => { if (u >= s - .012) z = i; }); return z; };

  // ---------- input ----------
  let wheelAcc = 0, wheelLock = 0, wheelIdle = 0;
  addEventListener('wheel', (e) => {
    if (plainOn || menuOpen || e.target.closest?.('#menu, .endnav')) return;
    const now = performance.now();
    if (now - wheelIdle > 250) wheelAcc = 0;
    wheelIdle = now;
    if (now < wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 30) { stepBy(Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = now + 850; }
  }, { passive: true });
  canvas.addEventListener('mousedown', (e) => { isDragging = true; dragDist = 0; lastY = e.clientY; });
  addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    if (!isDragging) return;
    const dy = lastY - e.clientY; lastY = e.clientY; dragDist += Math.abs(dy);
    if (dragDist > 4) { stopAuto(); seen(); focus = null; targetU = clampU(targetU + dy * .0016); }
  });
  addEventListener('mouseup', () => { if (isDragging && dragDist > 4) targetU = STOPS[nearestStop(targetU)]; isDragging = false; });
  let touchY0 = null, touchX0 = 0;
  canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { touchY0 = e.touches[0].clientY; touchX0 = e.touches[0].clientX; } }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (touchY0 === null || plainOn || menuOpen) return;
    const t = e.changedTouches[0], dy = touchY0 - t.clientY, dx = touchX0 - t.clientX;
    touchY0 = null;
    if (Math.abs(dy) > 35 && Math.abs(dy) > Math.abs(dx)) stepBy(Math.sign(dy));
  }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) return setMenu(false);
    if (plainOn || menuOpen || e.target.closest?.('button, a')) return;
    seen();
    if (e.key === 'Escape') focus = null;
    else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); stepBy(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); stepBy(-1); }
    else if (e.key === 'Home') { e.preventDefault(); goStop(0); }
    else if (e.key === 'End') { e.preventDefault(); goStop(STOPS.length - 1); }
  });
  canvas.addEventListener('click', (e) => {
    if (dragDist > 4) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const hit = ray.intersectObjects(clickable)[0];
    if (hit?.object.userData.href) { track('apply_click', { from: 'screen' }); open(hit.object.userData.href, '_blank', 'noopener'); return; }
    focus = hit ? hit.object : null;
  });

  // ---------- joystick ----------
  const joyEl = $('joy'), knob = joyEl.querySelector('.knob');
  function joyMove(e) {
    const r = joyEl.getBoundingClientRect(), R = r.width / 2 - 14;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy); if (len > R) { dx *= R / len; dy *= R / len; }
    joy.x = dx / R; joy.y = -dy / R;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  joyEl.addEventListener('pointerdown', (e) => {
    joyEl.setPointerCapture(e.pointerId); joy.active = true; joyEl.classList.add('active');
    stopAuto(); seen(); focus = null; joyMove(e); track('joystick');
  });
  joyEl.addEventListener('pointermove', (e) => { if (joy.active) joyMove(e); });
  const joyEnd = () => {
    if (!joy.active) return;
    joy.active = false; joy.x = joy.y = 0; joyEl.classList.remove('active'); knob.style.transform = '';
    targetU = STOPS[nearestStop(currentU)];        // glide to the closest stop
  };
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);

  // ---------- buttons, dots, menu ----------
  const dotsEl = $('dots');
  ZONES.forEach((z, i) => {
    const b = document.createElement('button'); b.setAttribute('aria-label', z.name); b.title = z.name;
    b.onclick = () => goStop(i); dotsEl.appendChild(b);
  });
  function goHome() {
    if (plainOn) { $('plain').scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); return; }
    goStop(0); track('home');
  }
  $('homeBtn').onclick = goHome;
  $('logoHome').onclick = (e) => { e.preventDefault(); goHome(); };
  $('mHome').onclick = () => { setMenu(false); goHome(); };
  $('upBtn').onclick = $('mUp').onclick = () => stepBy(-1);
  $('downBtn').onclick = $('mDown').onclick = () => stepBy(1);
  $('hintText').textContent = coarse ? 'Swipe up to enter' : 'Scroll to enter';
  $('hintArrow').textContent = coarse ? '↑' : '↓';
  $('hint').style.setProperty('--nudge', coarse ? '-6px' : '6px');
  let hintTimer = OG ? 0 : setTimeout(() => $('hint').classList.add('on'), 1600);

  $('menuLinks').innerHTML = document.querySelector('#endnav .cols').outerHTML + document.querySelector('#endnav small').outerHTML;
  function setMenu(on) {
    menuOpen = on;
    $('menu').classList.toggle('on', on); $('scrim').classList.toggle('on', on);
    $('menu').setAttribute('aria-hidden', String(!on)); $('menuBtn').setAttribute('aria-expanded', String(on));
    $('menuBtn').textContent = on ? '✕' : '☰';
  }
  $('menuBtn').onclick = () => setMenu(!menuOpen);
  $('scrim').onclick = () => setMenu(false);
  $('mAuto').onclick = () => { setMenu(false); $('autoBtn').click(); };
  $('mPlain').onclick = () => { setMenu(false); $('plainBtn').click(); };
  $('mTheme').onclick = () => $('themeBtn').click();
  $('autoBtn').onclick = () => {
    if (auto) return stopAuto();
    if (targetU >= .999) targetU = currentU = STOPS[0];
    auto = true; focus = null; seen(); track('autopilot');
    $('autoBtn').setAttribute('aria-pressed', 'true'); $('autoBtn').textContent = '❚❚ Pause'; $('mAuto').textContent = '❚❚ Pause';
  };
  const clock = new THREE.Clock();
  function setPlain(on, save = true) {
    plainOn = on; stopAuto();
    document.documentElement.classList.toggle('plain', on);
    $('plainBtn').setAttribute('aria-pressed', String(on));
    $('plainBtn').textContent = $('mPlain').textContent = on ? '3D view' : 'Plain view';
    if (on) renderer.setAnimationLoop(null); else { clock.getDelta(); renderer.setAnimationLoop(frame); }
    if (save) { try { localStorage.setItem('onrol-view', on ? 'plain' : '3d'); } catch {} track('view', { mode: on ? 'plain' : '3d' }); }
  }
  $('plainBtn').onclick = () => setPlain(!plainOn);

  // ---------- theme ----------
  const DARK = { hemiSky: '#ffffff', hemiGround: '#120604', hemiI: .25, lightI: 14, ledMul: 2, faceO: 1, ca: .0011, bg: '#070403', body: '#120d0b', metal: .85, glossy: '#0b0705', refl: 0x2a1c14, satin: '#070302', satinO: .78, bloom: .8, vig: 1.35, grain: .022, exposure: 1, barMul: 1.4 };
  const LIGHT = { hemiSky: '#ffffff', hemiGround: '#d9c9b8', hemiI: 1.5, lightI: 1.5, ledMul: 1, faceO: .95, ca: .0003, bg: '#efe6dc', body: '#cfc3b6', metal: .25, glossy: '#e4d9cd', refl: 0xcfc2b5, satin: '#efe6dc', satinO: .86, bloom: .18, vig: .1, grain: .01, exposure: 1, barMul: 1 };
  let T = DARK, caBase = .0011;
  function setTheme(light, save = true) {
    isLight = light; T = light ? LIGHT : DARK;
    const blend = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]').content = T.bg;
    scene.background.set(T.bg); scene.fog.color.set(T.bg);   // snap — don't fade in from the other theme
    themed.lines.forEach((m) => { m.color.copy(zoneColor(m.userData.zone, light)); m.blending = blend; m.opacity = light ? Math.min(1, m.userData.baseO * 2.8 + .12) : m.userData.baseO; m.needsUpdate = true; });
    themed.dust.forEach((m) => { m.color.copy(zoneColor(m.userData.zone, light)); m.blending = blend; m.opacity = light ? .8 : .55; m.size = light ? .04 : .03; m.needsUpdate = true; });
    themed.faces.forEach((m) => { m.blending = blend; m.opacity = T.faceO; m.color.setScalar(light ? .55 : 1); m.needsUpdate = true; });
    themed.leds.forEach((m) => m.color.copy(zoneColor(m.userData.zone, light)).multiplyScalar(T.ledMul));
    themed.lights.forEach((l) => { l.intensity = T.lightI; });
    themed.reflectors.forEach((r) => r.material.uniforms.color.value.setHex(T.refl));
    themed.satins.forEach((m) => { m.color.set(T.satin); m.opacity = T.satinO; });
    themed.glossy.forEach((m) => m.material.color.set(T.glossy));
    themed.glass.forEach((m) => m.color.set('#1a120d'));
    // light mode: solid cards (frosted glass picks up grey smudges on a light room)
    allScreens.forEach((m) => { if (m.userData.glass) m.userData.glass.userData.off = light; if (m.userData.art.frosted !== undefined && m.userData.glass) m.userData.art.frosted = !light; });
    themed.glossy.forEach((m) => { m.material.roughness = light ? .7 : .35; m.material.metalness = light ? 0 : .6; m.material.emissive.set(light ? '#d9ccbe' : '#000000'); m.material.emissiveIntensity = light ? .55 : 0; });
    rackBody.color.set(T.body); rackBody.metalness = T.metal;
    scene.fog.density = light ? .022 : .04;            // light mode: see further down the corridor
    hemi.groundColor.set(T.hemiGround); hemi.intensity = T.hemiI;
    barMat.color.set(light ? '#d98a4e' : '#ffb070').multiplyScalar(T.barMul * (camera.aspect < 1 ? .6 : 1));
    caBase = T.ca; bloom.strength = T.bloom; bloom.enabled = !light && tier !== 'low';   // glow washes out dark text on light cards film.uniforms.vig.value = T.vig; film.uniforms.grain.value = T.grain;
    // ACES greys out light colors, so light mode uses plain linear output to keep the cream background clean
    renderer.toneMapping = light ? THREE.LinearToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = T.exposure;
    allScreens.forEach((m) => { const a = m.userData.art; a.light = light; a.accent = light ? ZONES[m.userData.zone].light : ZONES[m.userData.zone].dark; a.draw(clock.elapsedTime); m.userData.tex.needsUpdate = true; });
    $('themeBtn').textContent = $('mTheme').textContent = light ? 'Dark' : 'Light';
    $('themeBtn').setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    lastZone = -1;                                   // re-apply the level accent for this theme
    if (save) { try { localStorage.setItem('onrol-theme', light ? 'light' : 'dark'); } catch {} track('theme', { mode: light ? 'light' : 'dark' }); }
  }
  $('themeBtn').onclick = () => setTheme(!isLight);

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    baseFov = camera.aspect < 1 ? 68 : 58;
    layoutPosters();
    camera.updateProjectionMatrix();
    computeStops();
  }
  addEventListener('resize', resize); resize();

  // ---------- deep links ----------
  const SLUGS = ['', 'learn', 'build', 'launch', 'earn', 'apply'];
  function fromHash() {
    const i = SLUGS.indexOf(location.hash.slice(1));
    if (i > 0) { targetU = STOPS[i]; if (!started) currentU = targetU; seen(); }
  }
  targetU = currentU = STOPS[0];
  addEventListener('hashchange', fromHash); fromHash();
  document.addEventListener('visibilitychange', () => {
    if (plainOn) return;
    if (document.hidden) renderer.setAnimationLoop(null); else { clock.getDelta(); renderer.setAnimationLoop(frame); }
  });

  const flash = $('flash');
  function pierce() { if (reducedMotion) return; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); fovKick = 1; }

  // ---------- phone home trio ----------
  const trio = $('homeTrio');
  let trioFlip = 0;
  function fillSide(el, u) {
    el.querySelector('b').textContent = u.big[0] + u.big.slice(1).toLowerCase().replace('hr', 'hr');
    el.querySelector('em').textContent = u.unit ? u.unit.toLowerCase() : '';
    el.querySelector('p').textContent = u.sub.join(' ');
  }
  function swapTrio(flip) {
    ['trioL', 'trioR'].forEach((id, i) => {
      const el = $(id);
      fillSide(el, USPS[i + flip * 2]);
      el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');   // replay the fade-in
    });
  }

  // ---------- frame loop ----------
  const tmp = V(0, 0, 0), q = new THREE.Quaternion(), camPos = V(0, 0, 0), camLook = V(0, 0, 0);
  const camUp = V(0, 1, 0), upTarget = V(0, 0, 0), dir = V(0, 0, 0), look = V(0, 0, 0), tA = V(0, 0, 0);
  // place the camera exactly (position, facing, up) — used at boot and for deep links
  function snapCamera() {
    camPos.copy(path.getPointAt(currentU));
    look.set(0, 0, 0);
    for (let i = 0; i <= 6; i++) look.addScaledVector(path.getTangentAt(clampU(currentU + i * .008)), 1 - i / 8);
    camLook.copy(camPos).addScaledVector(look.normalize(), 6);
    const down = THREE.MathUtils.clamp(-look.y, 0, 1);
    camUp.set(down, 1 - down, 0).normalize();
  }
  snapCamera();
  const fogDark = new THREE.Color(), fogTarget = new THREE.Color(), accent = new THREE.Color();
  let lastZone = -1, roll = 0, prevU = 0, velU = 0, fovNow = baseFov, fpsT = 0, fpsN = 0, fpsChecked = OG;

  function frame() {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    if (auto) { targetU = clampU(targetU + dt * .022); if (targetU >= 1) stopAuto(); }
    if (joy.active) targetU = clampU(currentU + joy.y * .05);       // joystick drives speed
    const stiff = auto ? 10 : 14;
    velU += ((targetU - currentU) * stiff - velU * 2 * Math.sqrt(stiff)) * dt;
    velU = THREE.MathUtils.clamp(velU, -.12, .12);
    currentU = clampU(currentU + velU * dt);
    // at the end (wide screens) turn slightly right so the Apply screen sits left of the link panel
    const endTurn = camera.aspect > 1.1 && !focus ? -.45 * THREE.MathUtils.smoothstep(currentU, .93, 1) : 0;
    yaw += ((joy.active ? -joy.x * .7 : 0) + endTurn - yaw) * (1 - Math.exp(-dt * 5));

    if (focus) {
      focus.getWorldPosition(tmp);
      const n = V(0, 0, 1).applyQuaternion(focus.getWorldQuaternion(q));
      camPos.lerp(tmp.clone().addScaledVector(n, 2.4), (1 - Math.exp(-dt * 6)) * .5);
      camLook.lerp(tmp, (1 - Math.exp(-dt * 6)) * .5);
    } else {
      const pos = path.getPointAt(currentU);
      look.set(0, 0, 0);
      for (let i = 0; i <= 6; i++) look.addScaledVector(path.getTangentAt(clampU(currentU + i * .008)), 1 - i / 8);
      look.normalize();
      const ahead = pos.clone().addScaledVector(look, 6);
      const side = V(0, 0, 0).crossVectors(path.getTangentAt(currentU), camUp).normalize();
      if (!coarse) pos.addScaledVector(side, mouse.x * .14).addScaledVector(camUp, mouse.y * .14);
      camPos.lerp(pos, 1 - Math.exp(-dt * 10));
      camLook.lerp(ahead, 1 - Math.exp(-dt * 4));
    }
    dir.subVectors(camLook, camPos).normalize();
    const down = THREE.MathUtils.clamp(-dir.y, 0, 1);
    upTarget.set(down, 1 - down, 0).normalize();
    camUp.lerp(upTarget, 1 - Math.exp(-dt * 2.5)).normalize();
    camera.up.copy(camUp);
    camera.position.copy(camPos);
    camera.lookAt(tmp.copy(camLook).sub(camPos).applyAxisAngle(camUp, yaw).add(camPos));
    const t0 = path.getTangentAt(currentU), t1 = path.getTangentAt(clampU(currentU + .03));
    const bank = THREE.MathUtils.clamp(tA.crossVectors(t0, t1).dot(camUp) * 3.5, -.1, .1);
    roll += ((focus ? 0 : bank) - roll) * (1 - Math.exp(-dt * 2));
    camera.rotateZ(roll);

    // screens: fly-through fade + penetration flash + animate the ones nearby (~30fps)
    screens.forEach((s) => {
      const local = s.mesh.worldToLocal(tmp.copy(camPos));
      s.mesh.material.opacity = local.z > 0 ? Math.min(1, local.z / 1.2) : 0;
      const gl = s.mesh.userData.glass; if (gl) { gl.material.opacity = s.mesh.material.opacity; gl.visible = !gl.userData.off && s.mesh.material.opacity > .35; }
      const sd = Math.sign(local.z) || 1;
      if (sd !== s.side && Math.abs(local.x) < W && Math.abs(local.y) < W && !focus) pierce();
      s.side = sd;
    });
    // phone home trio: hide the 3D intro screen behind it, fade the trio once you move on
    const atHome = portraitHome && !focus && currentU < STOPS[0] + .02;
    trio.classList.toggle('gone', !atHome);
    introScreen.visible = !atHome;
    if (atHome) {
      const flip = Math.floor(t / 4) % 2;
      if (flip !== trioFlip) { trioFlip = flip; swapTrio(flip); }
    }
    if (!reducedMotion) allScreens.forEach((m) => {
      const u = m.userData;
      if (t - u.lastDraw < 1 / 30 || m.getWorldPosition(tmp).distanceTo(camPos) > 30) return;
      u.lastDraw = t; u.art.draw(t); u.tex.needsUpdate = true;
    });

    // level color: UI accent + fog tint follow the level you're in
    const z = zoneAt(currentU);
    if (z !== lastZone) {
      lastZone = z;
      const hex = isLight ? ZONES[z].light : ZONES[z].dark;
      document.documentElement.style.setProperty('--or', hex);
      [...dotsEl.children].forEach((b, i) => { b.classList.toggle('on', i === z); b.setAttribute('aria-current', i === z ? 'step' : 'false'); });
      $('metaL').textContent = ZONES[z].sub;
      $('metaR').textContent = String(Math.min(z, 4)).padStart(2, '0') + '—04';
      const slug = SLUGS[z] ? '#' + SLUGS[z] : location.pathname + location.search;
      if (started && location.hash !== '#' + SLUGS[z]) history.replaceState(null, '', slug);
      if (started) track('step_view', { step: ZONES[z].key });
    }
    accent.copy(zoneColor(z, isLight));
    fogTarget.set(T.bg).lerp(accent, isLight ? .06 : .05);
    scene.fog.color.lerp(fogTarget, 1 - Math.exp(-dt * 2));
    scene.background.copy(scene.fog.color);

    fovKick *= Math.exp(-dt * 3);
    const speed = Math.abs(currentU - prevU) / Math.max(dt, 1e-3); prevU = currentU;
    fovNow += (baseFov + Math.min(speed * 30, 7) + fovKick * 10 - fovNow) * (1 - Math.exp(-dt * 4));
    camera.fov = fovNow; camera.updateProjectionMatrix();
    film.uniforms.time.value = t % 100; film.uniforms.ca.value = tier === 'low' ? 0 : caBase + fovKick * .004;

    const atStart = targetU <= STOPS[0] + .001, atEnd = targetU >= .999;
    $('upBtn').disabled = $('mUp').disabled = $('homeBtn').disabled = atStart;
    $('downBtn').disabled = $('mDown').disabled = atEnd;
    $('head').classList.toggle('gone', !!focus || currentU > STOPS[0] + .03);
    $('endnav').classList.toggle('on', currentU > .94 && !focus);

    composer.render();

    // frame-rate watchdog: step quality down once if the device is struggling
    if (!fpsChecked && started) {
      fpsT += dt; fpsN++;
      if (fpsT > 2.5) {
        const fps = fpsN / fpsT; fpsChecked = true;
        if (fps < 40 && tier === 'high') { tier = 'mid'; dropReflections(); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); resize(); track('quality_down', { to: 'mid', fps: Math.round(fps) }); }
        else if (fps < 30 && tier === 'mid') { tier = 'low'; bloom.enabled = false; renderer.setPixelRatio(1); resize(); track('quality_down', { to: 'low', fps: Math.round(fps) }); }
        if (fps < 40 && tier !== 'low') { fpsChecked = false; fpsT = fpsN = 0; }   // re-check after one downgrade
      }
    }
  }

  if (params.has('debug')) window.__onrol = { scene, renderer, get T() { return T; }, get isLight() { return isLight; } };
  // ---------- boot ----------
  let savedView = null;
  try { savedView = localStorage.getItem('onrol-view'); } catch {}
  setTheme(isLight, false);
  renderer.setAnimationLoop(frame);
  const plainFirst = savedView === 'plain' || (savedView !== '3d' && (reducedMotion || tier === 'low'));
  if (plainFirst && !OG) setPlain(true, false);
  requestAnimationFrame(() => requestAnimationFrame(() => { started = true; $('loader').classList.add('done'); track('ready', { tier }); }));
}
