// LEARN (stop 2) — knowledge as light: five data streams (one per AI tool) leave the server racks
// and converge into the class panels; soft ceiling beams pick the panels out; a floor "hour ring"
// fills as you arrive (1 hr/day). Cheap: Points + Lines + a few additive meshes, no per-frame allocs.
export default function (ctx) {
  const { THREE, scene, V, zoneColor, cards, CEIL } = ctx;
  const rig = cards.learn?.userData?.rig;
  const root = new THREE.Group(); root.name = 'learnStage';
  scene.add(root);
  // rig sits at (0,2.1,-4); use world coordinates directly
  const CARD = V(-1.15, 2.1, -4.05), PANEL = V(2.85, 2.1, -3.35);

  const col = new THREE.Color(), tmp = new THREE.Vector3();
  let light = !!ctx.isLight;
  const blend = () => (light ? THREE.NormalBlending : THREE.AdditiveBlending);

  // ---------- 1. data streams: 5 curves from rack mouths into panel edges ----------
  const STREAMS = 5, PER = ctx.tier === 'low' ? 24 : 48;
  const curves = [];
  const starts = [V(-3.4, 3.2, -11), V(-3.4, 1.0, -8.5), V(3.4, 3.0, -12.5), V(3.4, 0.9, -9), V(-3.4, 2.2, -14)];
  const ends = [V(-2.7, 2.9, -4.15), V(-2.7, 1.2, -4.15), V(3.9, 3.0, -3.4), V(3.9, 1.1, -3.4), V(0.4, 3.3, -4.15)];
  for (let i = 0; i < STREAMS; i++) {
    const a = starts[i], b = ends[i];
    const m1 = V(a.x * .55, (a.y + CEIL) * .5, a.z * .7 + b.z * .3);
    const m2 = V(b.x * 1.02, b.y + (i % 2 ? -.3 : .35), b.z - 1.6);
    curves.push(new THREE.CubicBezierCurve3(a, m1, m2, b));
  }
  // faint guide lines
  const guideGeo = new THREE.BufferGeometry();
  const gp = [];
  for (const c of curves) { const pts = c.getPoints(40); for (let k = 0; k < pts.length - 1; k++) gp.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z); }
  guideGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  const guideMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: blend() });
  root.add(new THREE.LineSegments(guideGeo, guideMat));

  const N = STREAMS * PER;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) seed[i] = Math.random();
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const ptMat = new THREE.PointsMaterial({ size: .035, transparent: true, opacity: 0, depthWrite: false, blending: blend(), sizeAttenuation: true });
  const points = new THREE.Points(ptGeo, ptMat); points.frustumCulled = false;
  root.add(points);

  // ---------- 2. volumetric beams from ceiling arches onto the two panels ----------
  const beamGeo = new THREE.CylinderGeometry(.25, 1.6, CEIL - .3, 24, 1, true);
  beamGeo.translate(0, -(CEIL - .3) / 2, 0);
  { // vertical alpha gradient via vertex colours (bright at top)
    const p = beamGeo.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const f = 1 - (-p.getY(i)) / (CEIL - .3); c.set([f, f, f], i * 3); }
    beamGeo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  const beamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const beams = [CARD, PANEL].map((p, i) => {
    const m = new THREE.Mesh(beamGeo, beamMat);
    m.position.set(p.x, CEIL - .05, p.z - .5);
    m.rotation.x = .12; m.scale.setScalar(i ? .8 : 1.05);
    root.add(m); return m;
  });

  // ---------- 3. floor hour ring: 60 ticks, fills to show "1 hr / day" on arrival ----------
  const TICKS = 60, RING = 2.3;
  const tickGeo = new THREE.BufferGeometry();
  const tp = new Float32Array(TICKS * 6), tc = new Float32Array(TICKS * 6);
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2, r0 = i % 5 ? RING : RING - .18;
    tp.set([Math.cos(a) * r0, .015, Math.sin(a) * r0, Math.cos(a) * (RING + .12), .015, Math.sin(a) * (RING + .12)], i * 6);
  }
  tickGeo.setAttribute('position', new THREE.BufferAttribute(tp, 3));
  tickGeo.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const tickMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: blend() });
  const ring = new THREE.LineSegments(tickGeo, tickMat);
  ring.position.set(.6, 0, -4.2);
  root.add(ring);
  // soft pool of light on the floor under the panels
  const poolGeo = new THREE.CircleGeometry(RING - .25, 48);
  { const p = poolGeo.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const f = Math.max(0, 1 - Math.hypot(p.getX(i), p.getY(i)) / (RING - .25)) ** 2; c.set([f, f, f], i * 3); }
    poolGeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const poolMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2; pool.position.set(.6, .01, -4.2);
  root.add(pool);

  const base = new THREE.Color(), dim = new THREE.Color(), RED = new THREE.Color('#ff2a1a');
  function setTheme(l) {
    light = l;
    base.set(l ? '#2a2c30' : '#e8eaed');
    dim.copy(base).multiplyScalar(l ? .35 : .12);
    for (const m of [guideMat, ptMat, tickMat]) { m.blending = blend(); m.needsUpdate = true; }
    guideMat.color.copy(base); ptMat.color.copy(base);
    beamMat.color.copy(base); poolMat.color.copy(base);
    beamMat.visible = poolMat.visible = !l;   // additive glow vanishes on the cream bg; skip it
  }
  setTheme(light);

  let arrive = 0, lastFill = -1;
  function update(t, dt) {
    const si = ctx.stopIndex;
    const near = Math.abs(si - 2) <= 1;
    root.visible = near;
    if (!near) { arrive = 0; return; }
    const S = ctx.STOPS, d = Math.abs(ctx.currentU - S[2]);
    const span = Math.max(.001, Math.abs(S[2] - S[1]) * .6);
    const target = 1 - THREE.MathUtils.smoothstep(d, span * .15, span);
    const k = ctx.reducedMotion ? 1 : Math.min(1, dt * 2.5);
    arrive += (target - arrive) * k;
    const a = arrive;

    guideMat.opacity = a * (light ? .22 : .14);
    ptMat.opacity = a * (light ? .6 : .55);
    beamMat.opacity = a * .045 * (ctx.reducedMotion ? 1 : .85 + .15 * Math.sin(t * 1.3));
    poolMat.opacity = a * .16;
    tickMat.opacity = Math.min(1, a * 1.4) * (light ? .8 : .7);

    // particles flow along streams; heads gather toward the panels as you arrive
    const speed = ctx.reducedMotion ? 0 : .09;
    for (let s = 0, n = 0; s < STREAMS; s++) {
      const c = curves[s];
      for (let j = 0; j < PER; j++, n++) {
        let u = (seed[n] + t * speed * (1 + seed[n] * .4)) % 1;
        u *= .25 + .75 * a;              // stream "reaches" the panel on arrival
        c.getPointAt(u, tmp);
        const w = .04 * Math.sin(seed[n] * 40 + t * 2);
        pos[n * 3] = tmp.x + w; pos[n * 3 + 1] = tmp.y + w * .6; pos[n * 3 + 2] = tmp.z;
      }
    }
    ptGeo.attributes.position.needsUpdate = true;

    // hour ring fill
    const fill = Math.round(a * TICKS);
    if (fill !== lastFill || !ctx.reducedMotion) {
      lastFill = fill;
      const head = ctx.reducedMotion ? -1 : Math.floor(t * 6) % TICKS;
      for (let i = 0; i < TICKS; i++) {
        col.copy(i < fill ? base : dim);
        if (i === head && i < fill) col.copy(RED);
        tc.set([col.r, col.g, col.b, col.r, col.g, col.b], i * 6);
      }
      tickGeo.attributes.color.needsUpdate = true;
    }
  }

  return { update, setTheme };
}
