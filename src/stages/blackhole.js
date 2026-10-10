// APPLY finale: a black-hole / accretion-disk moment around the end card (reference: "typography & colours" poster).
// Cheap: Points + Lines only, one buffer updated in place, no lights.
export default function (ctx) {
  const { THREE, segC, SHAFT_BOTTOM } = ctx;
  const g = new THREE.Group(); segC.add(g);
  const Y0 = SHAFT_BOTTOM + .9;                         // just above the end card
  const N = ctx.tier === 'low' ? 1800 : 4200;

  // accretion disk: particles on flattened orbits, denser near the event horizon
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 2.55 + Math.pow(Math.random(), 2.2) * 1.0;         // inside the shaft walls (±3.6)
    seed[i * 3] = r; seed[i * 3 + 1] = Math.random() * Math.PI * 2; seed[i * 3 + 2] = (Math.random() - .5) * .35;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: '#ffffff', size: .028, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  mat.userData.subtle = true;
  g.add(new THREE.Points(geo, mat));

  // rising jet: dust streaming up the shaft toward the viewer
  const J = ctx.tier === 'low' ? 300 : 800, jpos = new Float32Array(J * 3), jseed = new Float32Array(J * 2);
  for (let i = 0; i < J; i++) { jseed[i * 2] = Math.random(); jseed[i * 2 + 1] = Math.random() * Math.PI * 2; }
  const jgeo = new THREE.BufferGeometry(); jgeo.setAttribute('position', new THREE.BufferAttribute(jpos, 3));
  const jmat = new THREE.PointsMaterial({ color: '#ffffff', size: .02, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
  jmat.userData.subtle = true;
  g.add(new THREE.Points(jgeo, jmat));

  // thin construction circles + cross rules
  const lm = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .16, depthWrite: false });
  lm.userData.subtle = true;
  const circle = (r, y) => { const p = []; for (let k = 0; k <= 128; k++) { const a = k / 128 * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); } g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), lm)); };
  circle(3.45, Y0 + .02); circle(2.6, Y0 + .02); circle(3.5, Y0 + 3.5);
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3.5, Y0 + .02, 0), new THREE.Vector3(3.5, Y0 + .02, 0), new THREE.Vector3(0, Y0 + .02, -3.5), new THREE.Vector3(0, Y0 + .02, 3.5)]), lm));

  // four-point star sparkles at the compass points + accent swatch
  const sparkTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.beginPath(); x.moveTo(32, 0); x.quadraticCurveTo(35, 29, 64, 32); x.quadraticCurveTo(35, 35, 32, 64); x.quadraticCurveTo(29, 35, 0, 32); x.quadraticCurveTo(29, 29, 32, 0); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const sparks = [];
  [[3.45, 0], [-3.45, 0], [0, 3.45], [0, -3.45], [2.44, 2.44], [-2.44, -2.44]].forEach(([x, z], i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.material.userData.subtle = true;
    s.position.set(x, Y0 + .05, z); s.scale.setScalar(i < 4 ? .32 : .2); g.add(s); sparks.push(s);
  });

  let shown = 0;
  return {
    update(t, dt) {
      const want = ctx.stopIndex >= 5 ? 1 : 0;
      shown += (want - shown) * (1 - Math.exp(-dt * 2));
      g.visible = shown > .01;
      if (!g.visible) return;
      mat.opacity = .85 * shown; jmat.opacity = .55 * shown; lm.opacity = .16 * shown;
      const spin = ctx.reducedMotion ? 0 : t;
      for (let i = 0; i < N; i++) {
        const r = seed[i * 3], a = seed[i * 3 + 1] + spin * (.9 / (r * r)) * 3, h = seed[i * 3 + 2] * (r - 2.4);
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Y0 + h + .15; pos[i * 3 + 2] = Math.sin(a) * r * .98;
      }
      geo.attributes.position.needsUpdate = true;
      for (let i = 0; i < J; i++) {
        const k = (jseed[i * 2] + spin * .04) % 1, a = jseed[i * 2 + 1] + spin * .2, r = .3 + k * 2.6;
        jpos[i * 3] = Math.cos(a) * r; jpos[i * 3 + 1] = Y0 + .4 + k * 14; jpos[i * 3 + 2] = Math.sin(a) * r;
      }
      jgeo.attributes.position.needsUpdate = true;
      sparks.forEach((s, i) => { s.material.opacity = shown * (.6 + .4 * Math.sin(t * 2 + i)); });
    },
    setTheme(light) {
      const c = light ? '#111' : '#fff', b = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      [mat, jmat].forEach((m) => { m.color.set(c); m.blending = b; m.needsUpdate = true; });
      lm.color.set(c);
      sparks.forEach((s) => { s.material.color.set(c); s.material.blending = b; s.material.needsUpdate = true; });
    },
  };
}
