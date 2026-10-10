// EARN (stop 5) — execution skills open three directions.
// One trunk of light rises from deep in the shaft, splits into three branches, each climbing to one
// direction tile (career / freelance / own products). Pulses travel up the branches, a soft light
// column falls from above, and layered motes drift upward for depth parallax. No money imagery.
export default function (ctx) {
  const { THREE, segC, cards, reducedMotion } = ctx;
  const GOLD = new THREE.Color('#e8eaed'), GOLD_L = new THREE.Color('#2a2a2a'), RED = new THREE.Color('#ff2a1a');
  const root = new THREE.Group(); root.name = 'earnStage'; segC.add(root);
  const mats = [];
  const mk = (m) => { mats.push(m); return m; };

  // ---- tile anchors (in segC-local space), fall back to the known layout ----
  const rig = cards.earn?.userData?.rig;
  const anchors = [];
  if (rig) {
    rig.updateWorldMatrix(true, true); segC.updateWorldMatrix(true, false);
    const inv = new THREE.Matrix4().copy(segC.matrixWorld).invert();
    const sats = (cards.earn.userData.sats || []).slice(-3);
    for (const s of sats) anchors.push(s.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv));
  }
  if (anchors.length !== 3) for (const z of [-2.35, 0, 2.35]) anchors.push(new THREE.Vector3(-.6, -12.75, z));

  // ---- 1. branching light paths: trunk from below, split, three branches up to the tiles ----
  const ROOT = new THREE.Vector3(0, -27, 0), SPLIT = new THREE.Vector3(0, -19.5, 0);
  const curves = anchors.map((a) => {
    const end = a.clone(); end.y -= .35;                    // stop just under the tile
    return new THREE.CubicBezierCurve3(ROOT, SPLIT, new THREE.Vector3(a.x * .6, -16, a.z * 1.05), end);
  });
  const SEG = 64;
  const lineMat = mk(new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glowMat = mk(new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }));
  for (const c of curves) {
    const pts = c.getSpacedPoints(SEG);
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    // two offset strands = cheap soft "width"
    for (const o of [.06, -.06]) {
      const p2 = pts.map((p) => p.clone().add(new THREE.Vector3(o, 0, o)));
      root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p2), glowMat));
    }
  }
  // landing rings under each tile
  const ringGeo = new THREE.RingGeometry(.28, .34, 32); ringGeo.rotateX(-Math.PI / 2);
  const ringMat = mk(new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const rings = curves.map((c) => { const r = new THREE.Mesh(ringGeo, ringMat); r.position.copy(c.getPoint(1)); root.add(r); return r; });

  // pulses climbing the branches (InstancedMesh of tiny camera-facing quads -> use flat discs facing +Y)
  const PER = 5, NP = PER * 3;
  const pGeo = new THREE.CircleGeometry(.09, 10); pGeo.rotateX(-Math.PI / 2);
  const pMat = mk(new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const pulses = new THREE.InstancedMesh(pGeo, pMat, NP); pulses.frustumCulled = false; root.add(pulses);
  const m4 = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
  const placePulses = (t) => {
    for (let b = 0; b < 3; b++) for (let k = 0; k < PER; k++) {
      const u = ((t * .09 + k / PER + b * .13) % 1);
      curves[b].getPoint(u, tmpV);
      const s = Math.sin(Math.PI * u) * (.6 + .6 * u);
      tmpS.set(s, s, s); m4.compose(tmpV, tmpQ, tmpS);
      pulses.setMatrixAt(b * PER + k, m4);
    }
    pulses.instanceMatrix.needsUpdate = true;
  };
  placePulses(1.7);

  // ---- 2. soft light column from above (open cylinder, vertical alpha gradient via vertex colour) ----
  const colGeo = new THREE.CylinderGeometry(3.1, 2.2, 10, 24, 6, true);
  const cc = [], pos = colGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const f = (pos.getY(i) + 5) / 10; const a = f * f * .5; cc.push(a * .4, a * .4, a * .4); }
  colGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  const colMat = mk(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
  const column = new THREE.Mesh(colGeo, colMat); column.position.set(0, -2, 0); root.add(column);

  // ---- 3. parallax motes in depth layers below the tiles, drifting upward ----
  const NM = ctx.tier === 'low' ? 90 : 220;
  const mp = new Float32Array(NM * 3), base = new Float32Array(NM), speed = new Float32Array(NM);
  for (let i = 0; i < NM; i++) {
    mp[i * 3] = (Math.random() * 2 - 1) * 3.3; mp[i * 3 + 2] = (Math.random() * 2 - 1) * 3.3;
    base[i] = -29 + Math.random() * 15.5; speed[i] = .15 + (i % 3) * .18;   // three speed layers
    mp[i * 3 + 1] = base[i];
  }
  const mGeo = new THREE.BufferGeometry(); mGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const mMat = mk(new THREE.PointsMaterial({ color: GOLD, size: .06, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  const motes = new THREE.Points(mGeo, mMat); motes.frustumCulled = false; root.add(motes);

  const baseOp = mats.map((m) => m.opacity);
  function setTheme(light) {
    mats.forEach((m, i) => {
      m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (m.color && !m.vertexColors && m !== pMat) m.color.copy(light ? GOLD_L : GOLD);
      m.opacity = baseOp[i] * (light ? (m === colMat ? .25 : .8) : 1);
      m.needsUpdate = true;
    });
  }
  setTheme(ctx.isLight);
  let lastLight = ctx.isLight;

  return {
    update(t) {
      if (ctx.isLight !== lastLight) { lastLight = ctx.isLight; setTheme(lastLight); }
      const near = Math.abs(ctx.stopIndex - 5) <= 1;
      root.visible = ctx.currentU > ctx.STOPS[3] - .02;
      if (!near || reducedMotion) return;
      placePulses(t);
      for (let i = 0; i < NM; i++) {
        let y = base[i] + ((t * speed[i]) % 15.5);
        if (y > -13.5) y -= 15.5;
        mp[i * 3 + 1] = y;
      }
      mGeo.attributes.position.needsUpdate = true;
      const br = .8 + .2 * Math.sin(t * 1.3);
      for (let i = 0; i < 3; i++) rings[i].scale.setScalar(1 + .25 * ((t * .5 + i * .33) % 1));
      lineMat.opacity = baseOp[0] * br * (lastLight ? .8 : 1);
    },
    setTheme(light) { lastLight = light; setTheme(light); },
  };
}
