// HOME — the lobby (stop 0). Cheap, restrained entrance for an AI school:
//  1) depth layering: near wall "neural lattice" (back), halo frame behind the intro card (mid), floor guide lines (fore)
//  2) one key accent (orange halo) framing the card, everything else low-contrast
//  3) slow, subtle motion only (signal pulses on lattice, halo breathing) — nothing between camera and card.
export default function (ctx) {
  const { THREE, segA, reducedMotion } = ctx;
  const WHITE = new THREE.Color('#e8eaed'), INK = new THREE.Color('#1a1a1a'), RED = new THREE.Color('#ff2a1a');
  const zoneColor = (_, l) => l ? INK : WHITE;
  const WI = ctx.WI ?? 6.4, CEIL = ctx.CEIL ?? 4;
  const root = new THREE.Group(); root.name = 'home-stage'; segA.add(root);
  const mats = [];
  const mk = (op) => { const m = new THREE.LineBasicMaterial({ color: zoneColor(0, ctx.isLight), transparent: true, opacity: op, depthWrite: false, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }); m.userData.base = op; mats.push(m); return m; };
  const lines = (pts, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const l = new THREE.LineSegments(g, mk(op)); root.add(l); return l; };

  // --- neural lattice on both lobby walls (x = ±WI), z in [4, 40]; nodes + nearest-neighbour edges
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nodes = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 46; i++) nodes.push([sx * (WI - .02), .5 + rnd() * (CEIL - .9), 4 + rnd() * 36, sx]);
  const edge = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]; let c = 0;
    for (let j = i + 1; j < nodes.length && c < 3; j++) {
      const b = nodes[j]; if (a[3] !== b[3]) continue;
      if (Math.hypot(a[1] - b[1], a[2] - b[2]) < 4.2) { edge.push(a[0], a[1], a[2], b[0], b[1], b[2]); c++; }
    }
  }
  lines(edge, .09);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodes.flatMap(n => [n[0], n[1], n[2]]), 3));
  const dotMat = new THREE.PointsMaterial({ color: zoneColor(0, ctx.isLight), size: .07, transparent: true, opacity: .8, depthWrite: false });
  dotMat.userData.base = .8; mats.push(dotMat);
  root.add(new THREE.Points(dotGeo, dotMat));

  // --- signal pulses travelling along a few edges (single Points, updated in place)
  const NP = 14, pulse = new Float32Array(NP * 3), pEdge = [], pPh = [];
  const nE = edge.length / 6;
  for (let i = 0; i < NP; i++) { pEdge.push(Math.floor(rnd() * nE) * 6); pPh.push(rnd()); }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pulse, 3));
  const pMat = new THREE.PointsMaterial({ color: RED, size: .13, transparent: true, opacity: 1, depthWrite: false });
  pMat.userData.base = 1; pMat.userData.red = true; mats.push(pMat);
  const pulses = new THREE.Points(pGeo, pMat); pulses.frustumCulled = false; root.add(pulses);
  const placePulses = (t) => {
    for (let i = 0; i < NP; i++) {
      const e = pEdge[i], k = (pPh[i] + t * .25) % 1;
      for (let c = 0; c < 3; c++) pulse[i * 3 + c] = edge[e + c] + (edge[e + 3 + c] - edge[e + c]) * k;
    }
    pGeo.attributes.position.needsUpdate = true;
  };
  placePulses(0);

  // --- halo frame behind the intro card (z = 19.6, behind the card plane at z=20) — nested portal rectangles
  const halo = [];
  const rect = (hw, hh, z) => { const y = 2.1; return [-hw, y - hh, z, hw, y - hh, z, hw, y - hh, z, hw, y + hh, z, hw, y + hh, z, -hw, y + hh, z, -hw, y + hh, z, -hw, y - hh, z]; };
  for (let i = 0; i < 4; i++) halo.push(lines(rect(4.3 + i * .55, 1.95 + i * .32, 19.4 - i * 1.6), .5 - i * .1));
  halo[0].material.userData.red = true;

  // --- floor guide lines (outside the rails, along the lobby, fade to the card) + ceiling ribs
  const fl = [];
  for (const x of [-4.8, -3.0, 3.0, 4.8]) fl.push(x, .01, 43, x, .01, 4);
  for (let z = 6; z <= 42; z += 3) fl.push(-WI, CEIL - .02, z, WI, CEIL - .02, z);
  lines(fl, .12);

  // --- point-cloud floor scan: low terrain (y < .3) — sits under the sightline
  const tp = [];
  for (let z = 4; z <= 44; z += .5) for (let x = -WI; x <= WI; x += .4) {
    const h = Math.abs(x) < 1.2 ? 0 : (.12 + .1 * Math.sin(x * 1.3 + z * .4) * Math.cos(z * .23)) * Math.min(1, (Math.abs(x) - 1.2) / 3);
    tp.push(x, .02 + Math.max(0, h), z);
  }
  const tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  const tMat = new THREE.PointsMaterial({ color: WHITE, size: .025, transparent: true, opacity: .35, depthWrite: false });
  tMat.userData.base = .35; mats.push(tMat); root.add(new THREE.Points(tGeo, tMat));

  let light = !!ctx.isLight;
  function setTheme(l) {
    light = !!l;
    const col = zoneColor(0, light);
    for (const m of mats) { m.color.copy(m.userData.red ? RED : col); m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; m.opacity = m.userData.base * (light ? 1.15 : 1); m.needsUpdate = true; }
  }
  setTheme(light);

  function update(t) {
    const vis = ctx.stopIndex <= 1;
    root.visible = vis || ctx.currentU < .25;
    if (!vis || reducedMotion) return;
    placePulses(t);
    for (let i = 0; i < halo.length; i++) {
      const m = halo[i].material; m.opacity = m.userData.base * (light ? 1.15 : 1) * (.75 + .25 * Math.sin(t * 1.2 - i * .7));
    }
  }
  return { update, setTheme };
}
