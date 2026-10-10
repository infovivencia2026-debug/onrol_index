// APPLY (stop 6) — arrival: warm halo ring opening around the end card,
// rising light motes, shaft walls warming as you land. Basic/Points/Lines only.
export default function (ctx) {
  const { THREE, segC, SHAFT_BOTTOM, W, reducedMotion } = ctx;
  const ORANGE = new THREE.Color(0xff2a1a), WARM = new THREE.Color(0xe8eaed);
  const root = new THREE.Group(); segC.add(root);
  const floorY = SHAFT_BOTTOM + 0.08;
  const mats = [];
  const mk = (m) => { mats.push(m); return m; };
  const blend = () => (ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending);

  // 1) halo rings opening on the floor around the card (thin annuli, outside the card)
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const m = mk(new THREE.MeshBasicMaterial({ color: i ? WARM : ORANGE, transparent: true, opacity: 0, depthWrite: false, blending: blend(), side: THREE.DoubleSide }));
    const r = new THREE.Mesh(new THREE.RingGeometry(2.55 + i * .32, 2.62 + i * .32 + (i ? 0 : .06), 96), m);
    r.rotation.x = -Math.PI / 2; r.position.y = floorY + i * .01; r.renderOrder = 2;
    root.add(r); rings.push(r);
  }
  // soft glow disc (radial gradient via vertex colors) under/around the card
  const gGeo = new THREE.RingGeometry(2.4, 3.55, 96, 1);
  const gc = [], gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const d = Math.hypot(gp.getX(i), gp.getY(i)), k = d < 2.6 ? 1 : 0;
    gc.push(WARM.r * k * .5, WARM.g * k * .5, WARM.b * k * .5);
  }
  gGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
  const glowMat = mk(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: blend() }));
  const glow = new THREE.Mesh(gGeo, glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = floorY - .02; root.add(glow);

  // 2) warm light rising up the walls: vertical gradient bands on the 4 shaft walls
  const wGeo = new THREE.PlaneGeometry(W * 2, 9, 1, 1);
  const wc = [], wp = wGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) { const k = wp.getY(i) < 0 ? 1 : 0; wc.push(WARM.r * k, WARM.g * k, WARM.b * k); }
  wGeo.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
  const wallMat = mk(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: blend(), side: THREE.DoubleSide }));
  const walls = new THREE.Group(); walls.position.y = SHAFT_BOTTOM + 4.5; root.add(walls);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, p = new THREE.Mesh(wGeo, wallMat);
    p.position.set(Math.sin(a) * (W - .05), 0, Math.cos(a) * (W - .05)); p.rotation.y = a + Math.PI;
    walls.add(p);
  }

  // 3) rising motes, kept near the walls (|x| or |z| > 2.6) so the card stays clear
  const N = ctx.tier === 'low' ? 60 : 140;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const side = i % 4, s = (Math.random() * 2 - 1) * (W - .3), e = (2.7 + Math.random() * .7) * (side < 2 ? 1 : -1);
    pos[i * 3] = side % 2 ? s : e; pos[i * 3 + 2] = side % 2 ? e : s;
    seed[i * 2] = Math.random(); seed[i * 2 + 1] = .25 + Math.random() * .5;
  }
  const mGeo = new THREE.BufferGeometry(); mGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const moteMat = mk(new THREE.PointsMaterial({ color: WARM, size: .035, transparent: true, opacity: 0, depthWrite: false, blending: blend() }));
  const motes = new THREE.Points(mGeo, moteMat); motes.frustumCulled = false; root.add(motes);
  const RISE = 7;

  let a = 0; // arrival amount 0..1
  root.visible = false;
  function update(t, dt) {
    const target = ctx.stopIndex >= 6 ? 1 : ctx.stopIndex >= 5 ? .15 : 0;
    a += (target - a) * Math.min(1, (dt || .016) * 1.6);
    if (ctx.stopIndex < 5 && a < .005) { root.visible = false; return; }
    root.visible = true;
    const light = ctx.isLight, rm = reducedMotion;
    const ease = a * a * (3 - 2 * a);
    // rings open outward from the card edge and breathe
    for (let i = 0; i < 3; i++) {
      const br = rm ? 1 : 1 + Math.sin(t * .9 - i * .8) * .015;
      rings[i].scale.setScalar((.82 + .18 * ease) * br);
      rings[i].material.opacity = ease * (i ? .35 - i * .08 : .75) * (light ? .9 : 1);
    }
    glowMat.opacity = ease * (light ? .25 : .55) * (rm ? 1 : .85 + .15 * Math.sin(t * 1.3));
    wallMat.opacity = ease * (light ? .06 : .1);
    walls.scale.y = .3 + .7 * ease;
    walls.position.y = SHAFT_BOTTOM + 4.5 * walls.scale.y;
    // motes rise and fade
    const p = mGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const ph = rm ? seed[i * 2] : (seed[i * 2] + t * seed[i * 2 + 1] / RISE) % 1;
      p[i * 3 + 1] = SHAFT_BOTTOM + .2 + ph * RISE;
    }
    if (!rm) mGeo.attributes.position.needsUpdate = true;
    moteMat.opacity = ease * (light ? .6 : .8);
  }
  function setTheme(light) {
    const b = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    for (const m of mats) { m.blending = b; m.needsUpdate = true; }
    moteMat.color.set(light ? 0x30343a : 0xe8eaed);
  }
  setTheme(!!ctx.isLight);
  return { update, setTheme };
}
