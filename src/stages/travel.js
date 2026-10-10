// TRAVEL: motion cues between stops. Monochrome (white, low opacity) with a rare signal-red accent.
// 1) wall light streaks just under the ceiling, stretched by speed (motion parallax + speed lines)
// 2) data pulses racing ahead along the ceiling cable runs
// 3) threshold gates: a thin HUD frame flashes at each zone boundary as the camera passes it
// Everything fades to zero when parked, so the stops stay calm.
export default function (ctx) {
  const { THREE, scene, path, W, CEIL, SHAFT_X, TURN_Z } = ctx;
  if (ctx.reducedMotion) return { update() {}, setTheme() {} };

  const WHITE = new THREE.Color('#e8eaed'), RED = new THREE.Color('#ff2a1a');
  const L = path.getLength();
  const low = ctx.tier === 'low';
  const NS = low ? 24 : 48, NP = low ? 8 : 16;

  const mkMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
  const quad = new THREE.PlaneGeometry(1, 1);
  const streakMat = mkMat(), pulseMat = mkMat();
  const streaks = new THREE.InstancedMesh(quad, streakMat, NS);
  const pulses = new THREE.InstancedMesh(quad, pulseMat, NP);
  for (const m of [streaks, pulses]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }

  // temps (no per-frame allocation)
  const P = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3(), N = new THREE.Vector3(),
    UP = new THREE.Vector3(0, 1, 0), AX = new THREE.Vector3(1, 0, 0), M = new THREE.Matrix4(), tmp = new THREE.Vector3();
  const clampU = (u) => Math.min(1, Math.max(0, u));

  // frame at u: P point, T tangent, S lateral (wall normal), N "up" relative to the wall plane
  function frame(u) {
    path.getPointAt(u, P); path.getTangentAt(u, T);
    if (Math.abs(T.y) < .5) { T.y = 0; T.normalize(); S.crossVectors(T, UP).normalize(); N.copy(UP); }
    else { S.copy(AX); N.set(0, 0, 1); }                      // vertical shaft
    return Math.abs(T.y) < .5;
  }
  // place a quad: length along T, thickness along `wid`, face normal along `nrm`
  function place(mesh, i, pos, wid, nrm, len, thick) {
    M.makeBasis(tmp.copy(T).multiplyScalar(len), wid.clone ? wid : wid, nrm);
    M.elements[4] *= thick; M.elements[5] *= thick; M.elements[6] *= thick;
    M.setPosition(pos); mesh.setMatrixAt(i, M);
  }
  const WV = new THREE.Vector3(), NV = new THREE.Vector3(), POS = new THREE.Vector3();

  // ---- streaks: world-fixed slots respawned ahead of the camera ----
  const sU = new Float32Array(NS), sSide = new Float32Array(NS), sH = new Float32Array(NS), sLen = new Float32Array(NS);
  const sRed = new Uint8Array(NS);
  function spawnStreak(i, u0, dir) {
    sU[i] = clampU(u0 + dir * (2 + Math.random() * 26) / L);
    sSide[i] = Math.random() < .5 ? -1 : 1;
    sH[i] = Math.random(); sLen[i] = .6 + Math.random() * 1.6;
    sRed[i] = Math.random() < .06 ? 1 : 0;
    streaks.setColorAt(i, sRed[i] ? RED : WHITE);
  }
  // ---- pulses: travel along the path at a multiple of camera speed ----
  const pU = new Float32Array(NP), pLat = new Float32Array(NP), pRed = new Uint8Array(NP);
  function spawnPulse(i, u0, dir) {
    pU[i] = clampU(u0 + dir * (Math.random() * 6) / L);
    pLat[i] = [-2.2, -1.4, 1.4, 2.2][i & 3];
    pRed[i] = Math.random() < .08 ? 1 : 0;
    pulses.setColorAt(i, pRed[i] ? RED : WHITE);
  }
  const u00 = ctx.currentU;
  for (let i = 0; i < NS; i++) { spawnStreak(i, u00, 1); sU[i] = clampU(u00 + (Math.random() * 2 - 1) * 26 / L); }
  for (let i = 0; i < NP; i++) spawnPulse(i, u00, 1);

  // ---- gates at zone thresholds: thin rectangular HUD frames hugging walls/ceiling/floor ----
  const gateDefs = [
    { p: new THREE.Vector3(0, 0, 2), axis: 'z' }, { p: new THREE.Vector3(0, 0, -18), axis: 'z' },
    { p: new THREE.Vector3(W + .4, 0, TURN_Z), axis: 'x' }, { p: new THREE.Vector3(SHAFT_X, -.5, TURN_Z), axis: 'y' },
  ];
  const gates = gateDefs.map((g) => {
    const e = W - .04, c = CEIL - .04, f = .03, pts = [];
    const r = (a, b) => g.axis === 'z' ? [a, b, 0] : g.axis === 'x' ? [0, b, a] : [a, 0, b];
    const rect = g.axis === 'y' ? [[-e, -e], [e, -e], [e, e], [-e, e]] : [[-e, f], [e, f], [e, c], [-e, c]];
    for (let k = 0; k < 4; k++) pts.push(...r(...rect[k]), ...r(...rect[(k + 1) % 4]));
    // short red tick marks at the top corners (the one accent)
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const line = new THREE.LineSegments(geo, mat); line.position.copy(g.p); line.frustumCulled = false; scene.add(line);
    const tick = [];
    const tk = .5;
    const tr = g.axis === 'y' ? [[-e, -e, -e + tk, -e], [e, e, e - tk, e]] : [[-e, c, -e + tk, c], [e, c, e - tk, c]];
    for (const [a, b, a2, b2] of tr) tick.push(...r(a, b), ...r(a2, b2));
    const tgeo = new THREE.BufferGeometry(); tgeo.setAttribute('position', new THREE.Float32BufferAttribute(tick, 3));
    const tmat = mat.clone(); tmat.color = RED.clone();
    const tl = new THREE.LineSegments(tgeo, tmat); tl.position.copy(g.p); tl.frustumCulled = false; scene.add(tl);
    // u of the gate: nearest sample on the path
    let best = 0, bd = 1e9;
    for (let i = 0; i <= 600; i++) { path.getPointAt(i / 600, P); const d = P.distanceToSquared(g.p); if (d < bd) { bd = d; best = i / 600; } }
    return { u: best, mat, tmat, flash: 0, side: 0 };
  });

  let light = !!ctx.isLight, prevU = ctx.currentU, spd = 0;
  function setTheme(l) {
    light = l;
    const b = l ? THREE.NormalBlending : THREE.AdditiveBlending;
    const col = l ? new THREE.Color('#1a1c1f') : new THREE.Color('#e8eaed');
    WHITE.copy(col);
    for (const m of [streakMat, pulseMat]) { m.blending = b; m.needsUpdate = true; }
    for (const g of gates) { g.mat.blending = g.tmat.blending = b; g.mat.color.copy(col); g.mat.needsUpdate = g.tmat.needsUpdate = true; }
    for (let i = 0; i < NS; i++) streaks.setColorAt(i, sRed[i] ? RED : WHITE);
    for (let i = 0; i < NP; i++) pulses.setColorAt(i, pRed[i] ? RED : WHITE);
    streaks.instanceColor.needsUpdate = pulses.instanceColor.needsUpdate = true;
  }
  setTheme(light);

  function update(t, dt) {
    dt = Math.min(Math.max(dt, 1e-3), .1);
    const u = ctx.currentU, du = u - prevU; prevU = u;
    const raw = Math.abs(du) / dt;                              // u per second
    spd += (raw - spd) * (1 - Math.exp(-dt * 8));
    const dir = du < 0 ? -1 : 1;
    const k = THREE.MathUtils.smoothstep(spd, .01, .12);       // 0 parked .. 1 cruising
    const amp = light ? .45 : 1;
    streakMat.opacity = .35 * k * amp; pulseMat.opacity = .7 * k * amp;
    streaks.visible = pulses.visible = k > .002;

    if (streaks.visible) {
      const mps = spd * L;                                      // metres per second
      for (let i = 0; i < NS; i++) {
        const rel = (sU[i] - u) * dir * L;
        if (rel < -1 || rel > 30) spawnStreak(i, u, dir);
        const horiz = frame(sU[i]);
        if (horiz) {
          const half = P.z > 2 ? 6.3 : W - .06;
          POS.copy(P).addScaledVector(S, sSide[i] * half); POS.y = 3.45 + sH[i] * .45;
          place(streaks, i, POS, N, S, sLen[i] * (.4 + mps * .12), .025);
        } else {
          const a = (i & 1) ? S : N;                            // shaft walls: ±X or ±Z
          WV.copy(a === S ? N : S);
          POS.copy(P).addScaledVector(a, sSide[i] * (W - .06)).addScaledVector(WV, (sH[i] - .5) * 2 * (W - .3));
          place(streaks, i, POS, WV, a, sLen[i] * (.4 + mps * .12), .025);
        }
      }
      streaks.instanceMatrix.needsUpdate = true; streaks.instanceColor.needsUpdate = true;

      for (let i = 0; i < NP; i++) {
        pU[i] = clampU(pU[i] + dir * spd * 1.7 * dt);
        const rel = (pU[i] - u) * dir * L;
        if (rel > 34 || rel < -2 || pU[i] <= 0 || pU[i] >= 1) spawnPulse(i, u, dir);
        const horiz = frame(pU[i]);
        if (horiz) { POS.copy(P).addScaledVector(S, pLat[i]); POS.y = CEIL - .1; place(pulses, i, POS, S, UP, .5 + mps * .1, .05); }
        else { POS.copy(P).addScaledVector(S, pLat[i] < 0 ? -(W - .06) : W - .06).addScaledVector(N, pLat[i] * .8); place(pulses, i, POS, N, S, .5 + mps * .1, .05); }
      }
      pulses.instanceMatrix.needsUpdate = true; pulses.instanceColor.needsUpdate = true;
    }

    for (const g of gates) {
      const side = Math.sign(u - g.u) || 1;
      if (g.side && side !== g.side && k > .05) g.flash = 1;   // crossed it while moving
      g.side = side;
      const near = Math.max(0, 1 - Math.abs(u - g.u) * L / 14);
      g.flash *= Math.exp(-dt * 3);
      const o = (Math.max(g.flash, near * k * .6)) * amp;
      g.mat.opacity = .5 * o; g.tmat.opacity = .9 * o;
    }
  }

  return { update, setTheme };
}
