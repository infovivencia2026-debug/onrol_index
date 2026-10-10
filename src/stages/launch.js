// LAUNCH (stop 4): projects go live — a countdown strip, signal pulses racing outward
// along floor/ceiling traces, and a network map of nodes lighting up in a propagating wave.
export default function (ctx) {
  const { THREE, segB, zoneColor, reducedMotion } = ctx;
  const ROOT = new THREE.Group();
  segB.add(ROOT);
  const RX = 12;                    // rig local x
  const W = ctx.W ?? 3.6, CEIL = ctx.CEIL ?? 4;

  const col = new THREE.Color('#e8eaed'), RED = new THREE.Color('#ff2a1a');
  const add = () => ({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });

  // ---- 1. network map: nodes on ceiling + upper walls, edges between neighbours ----
  const nodes = [];
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 46; i++) {
    const side = i % 3; // 0 ceiling, 1 left wall, 2 right wall
    const x = 5 + rnd() * 17.5;
    if (side === 0) nodes.push(new THREE.Vector3(x, CEIL - .03, (rnd() - .5) * 2 * (W - .4)));
    else nodes.push(new THREE.Vector3(x, 2.9 + rnd() * 1.0, (side === 1 ? -1 : 1) * (W - .04)));
  }
  const N = nodes.length;
  const nPos = new Float32Array(N * 3), nCol = new Float32Array(N * 3), dist = new Float32Array(N);
  const origin = new THREE.Vector3(RX, CEIL, 0);
  nodes.forEach((p, i) => { p.toArray(nPos, i * 3); dist[i] = p.distanceTo(origin); });
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute('color', new THREE.BufferAttribute(nCol, 3));
  const nMat = new THREE.PointsMaterial({ size: .11, vertexColors: true, ...add() });
  ROOT.add(new THREE.Points(nGeo, nMat));

  const edges = [];
  for (let i = 0; i < N; i++) {
    let best = -1, bd = 1e9, best2 = -1, bd2 = 1e9;
    for (let j = 0; j < N; j++) if (j !== i) {
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < bd) { bd2 = bd; best2 = best; bd = d; best = j; } else if (d < bd2) { bd2 = d; best2 = j; }
    }
    edges.push([i, best]); if (bd2 < 3.2) edges.push([i, best2]);
  }
  const E = edges.length;
  const ePos = new Float32Array(E * 6), eCol = new Float32Array(E * 6);
  edges.forEach(([a, b], k) => { nodes[a].toArray(ePos, k * 6); nodes[b].toArray(ePos, k * 6 + 3); });
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
  const eMat = new THREE.LineBasicMaterial({ vertexColors: true, ...add() });
  ROOT.add(new THREE.LineSegments(eGeo, eMat));

  // ---- 2. signal pulses travelling outward along floor traces from the rig ----
  const TRACES = [];
  const tz = [-3.1, -2.5, 2.5, 3.1];
  for (const z of tz) {   // run from under the rig back toward the camera and onward along the corridor
    TRACES.push([new THREE.Vector3(RX - .4, .015, z * .35), new THREE.Vector3(RX - 1.2, .015, z), new THREE.Vector3(3.8, .015, z)]);
    TRACES.push([new THREE.Vector3(RX + .4, .015, z * .35), new THREE.Vector3(RX + 1.2, .015, z), new THREE.Vector3(22.2, .015, z)]);
  }
  // vertical risers up the walls to the network
  for (const z of [-W + .05, W - .05]) TRACES.push([new THREE.Vector3(RX, .02, z), new THREE.Vector3(RX, CEIL - .02, z), new THREE.Vector3(RX, CEIL - .02, 0)]);
  const tPts = [];
  TRACES.forEach((tr) => { for (let i = 0; i < tr.length - 1; i++) tPts.push(tr[i], tr[i + 1]); });
  const tGeo = new THREE.BufferGeometry().setFromPoints(tPts);
  const tMat = new THREE.LineBasicMaterial({ color: col, opacity: .14, ...add() });
  ROOT.add(new THREE.LineSegments(tGeo, tMat));
  // precompute segment lengths for sampling
  const trLen = TRACES.map((tr) => { let L = 0; for (let i = 0; i < tr.length - 1; i++) L += tr[i].distanceTo(tr[i + 1]); return L; });
  const PER = 3, P = TRACES.length * PER, TAIL = 4;
  const pPos = new Float32Array(P * TAIL * 3), pCol = new Float32Array(P * TAIL * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({ size: .09, vertexColors: true, ...add() });
  const pulses = new THREE.Points(pGeo, pMat); pulses.frustumCulled = false;
  ROOT.add(pulses);
  const tmp = new THREE.Vector3();
  function sample(ti, s, out) {
    const tr = TRACES[ti]; let d = s * trLen[ti];
    for (let i = 0; i < tr.length - 1; i++) {
      const l = tr[i].distanceTo(tr[i + 1]);
      if (d <= l || i === tr.length - 2) return out.lerpVectors(tr[i], tr[i + 1], Math.min(d / l, 1));
      d -= l;
    }
    return out;
  }

  // ---- 3. countdown lights: 5 floor pips between camera and rig, then a "LIVE" ring burst ----
  const PIPS = 5;
  const pipGeo = new THREE.CircleGeometry(.09, 16); pipGeo.rotateX(-Math.PI / 2);
  const pipMat = new THREE.MeshBasicMaterial({ color: 0xffffff, ...add() });
  const pips = new THREE.InstancedMesh(pipGeo, pipMat, PIPS * 2);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < PIPS; i++) for (let s = 0; s < 2; s++) {
    m4.makeTranslation(RX - 5.6 + i * .9, .02, (s ? 1 : -1) * 1.9); pips.setMatrixAt(i * 2 + s, m4);
  }
  pips.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PIPS * 6), 3);
  ROOT.add(pips);
  const ringGeo = new THREE.RingGeometry(.96, 1, 64); ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: RED, opacity: 0, ...add() });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.set(RX, .03, 0);
  ROOT.add(ring);

  const c = new THREE.Color(), dim = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  let light = !!ctx.isLight;
  const CYCLE = 6;   // seconds: 0-2.5 countdown, 2.5 live, then propagation

  function paint(t) {
    const k = light ? .8 : 1;
    const ph = reducedMotion ? 4.5 : (t % CYCLE);
    // countdown
    for (let i = 0; i < PIPS; i++) {
      const on = ph > i * .5 && ph < 5.6;
      const live = ph > 2.5;
      c.copy(live ? RED : col).multiplyScalar((on ? (live ? .9 : .75) : .12) * k);
      pips.setColorAt(i * 2, c); pips.setColorAt(i * 2 + 1, c);
    }
    pips.instanceColor.needsUpdate = true;
    // live ring burst
    const rb = ph - 2.5;
    if (rb > 0 && rb < 2.2 && !reducedMotion) { ring.scale.setScalar(.5 + rb * 3.2); ringMat.opacity = (1 - rb / 2.2) * .7 * k; }
    else { ringMat.opacity = reducedMotion ? .25 * k : 0; ring.scale.setScalar(2.5); }
    // network wave: radius grows from origin after launch
    const R = reducedMotion ? 99 : (rb > 0 ? rb * 6 : -1);
    for (let i = 0; i < N; i++) {
      const front = R - dist[i];
      let v = .1;
      if (front > 0) v = .35 + .65 * Math.exp(-front * 1.2);
      if (front > 0 && front < .7) c.copy(RED).multiplyScalar(k); else c.copy(col).multiplyScalar(v * .7 * k);
      c.toArray(nCol, i * 3);
    }
    for (let e = 0; e < E; e++) {
      const [a, b] = edges[e];
      for (let j = 0; j < 3; j++) { eCol[e * 6 + j] = nCol[a * 3 + j] * .55; eCol[e * 6 + 3 + j] = nCol[b * 3 + j] * .55; }
    }
    nGeo.attributes.color.needsUpdate = true; eGeo.attributes.color.needsUpdate = true;
    // pulses (only after launch; continuous trickle in reducedMotion is static)
    for (let ti = 0, n = 0; ti < TRACES.length; ti++) for (let q = 0; q < PER; q++, n++) {
      const s0 = reducedMotion ? (q + .5) / PER : ((t * .35 + q / PER + ti * .13) % 1);
      const fade = reducedMotion ? .5 : (rb > 0 ? 1 : .25);
      for (let h = 0; h < TAIL; h++) {
        const s = Math.max(0, s0 - h * .012);
        sample(ti, s, tmp).toArray(pPos, (n * TAIL + h) * 3);
        (h === 0 && ti % 4 === 0 ? dim.copy(RED) : dim.copy(col)).multiplyScalar(fade * (1 - h / TAIL) * k * Math.sin(Math.PI * Math.min(s0, 1)));
        dim.toArray(pCol, (n * TAIL + h) * 3);
      }
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  }

  const mats = [nMat, eMat, tMat, pMat, pipMat, ringMat];
  function setTheme(l) {
    light = !!l;
    col.set(light ? '#2a2c30' : '#e8eaed');
    tMat.color.copy(col); ringMat.color.copy(RED);
    for (const m of mats) { m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; m.needsUpdate = true; }
    tMat.opacity = light ? .3 : .14;
    paint(0);
  }
  setTheme(light);

  let painted = false;
  return {
    update(t) {
      const active = Math.abs(ctx.stopIndex - 4) <= 1;
      ROOT.visible = active;
      if (!active) return;
      if (reducedMotion) { if (!painted) { paint(0); painted = true; } return; }
      paint(t);
    },
    setTheme(l) { setTheme(l); painted = false; },
  };
}
