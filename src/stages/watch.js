// WATCH stage: "screening room" mood around the founder video card (stop 1).
// Projector beam (additive cone from behind camera), screen-spill pool on the floor,
// dim proscenium frame + aisle lights. MeshBasic/Lines only, <1k tris.
export default function (ctx) {
  const { THREE, scene } = ctx;
  const CARD = new THREE.Vector3(0, 2.1, 9);
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const warm = new THREE.Color('#e8eaed');
  const accent = new THREE.Color('#ff2a1a');
  const mats = [];
  const mk = (color, base) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    m.userData.base = base; mats.push(m); return m;
  };

  // 1) projector beam: open cone from projector (behind/above camera) to the screen
  const proj = new THREE.Vector3(0, 3.6, 24);
  const len = proj.distanceTo(CARD) - 0.3;
  const beamGeo = new THREE.CylinderGeometry(2.3, 0.08, len, 24, 1, true);
  beamGeo.translate(0, -len / 2, 0);
  const beam = new THREE.Mesh(beamGeo, mk(warm, 0.05));
  beam.position.copy(proj);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), CARD.clone().sub(proj).normalize());
  group.add(beam);
  const beam2 = new THREE.Mesh(beamGeo, mk(warm, 0.03));
  beam2.position.copy(proj); beam2.quaternion.copy(beam.quaternion); beam2.scale.set(0.6, 1, 0.6);
  group.add(beam2);

  // 2) screen spill: radial gradient pool on the floor in front of the card
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  const spillMat = mk(warm, 0.12); spillMat.map = tex;
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), spillMat);
  spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.02, 11.2);
  group.add(spill);
  // halo behind the card (screen bleed onto the "wall")
  const haloMat = mk(warm, 0.08); haloMat.map = tex;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.6), haloMat);
  halo.position.set(0, 2.1, 8.7);
  group.add(halo);

  // 3) proscenium frame + aisle runner lights (thin lines, letterbox restraint)
  const lineMat = new THREE.LineBasicMaterial({ color: warm, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  lineMat.userData.base = 0.3; mats.push(lineMat);
  const pts = [];
  const fx = 2.95, fy0 = 0.5, fy1 = 3.7, fz = 8.95;
  pts.push(-fx, fy0, fz, fx, fy0, fz, fx, fy0, fz, fx, fy1, fz, fx, fy1, fz, -fx, fy1, fz, -fx, fy1, fz, -fx, fy0, fz);
  for (let i = 0; i < 6; i++) { const z = 11 + i * 1.5; pts.push(-3.2, 0.03, z, -3.2, 0.03, z + 0.5, 3.2, 0.03, z, 3.2, 0.03, z + 0.5); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(lg, lineMat));
  // red corner ticks (single sparing accent)
  const redMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false });
  redMat.userData.base = 0.9; redMat.userData.noBlend = true; mats.push(redMat);
  const rp = [], c = 0.35;
  for (const [x, y, sx, sy] of [[-fx, fy1, 1, -1], [fx, fy1, -1, -1], [-fx, fy0, 1, 1], [fx, fy0, -1, 1]])
    rp.push(x, y, fz, x + sx * c, y, fz, x, y, fz, x, y + sy * c, fz);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  group.add(new THREE.LineSegments(rg, redMat));
  // floor point-cloud scan grid in the spill area
  const pp = [];
  for (let x = -4; x <= 4.001; x += 0.25) for (let z = 9.4; z <= 15; z += 0.25) pp.push(x, 0.015, z);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  const ptMat = new THREE.PointsMaterial({ color: warm, size: 0.03, transparent: true, opacity: 0, depthWrite: false });
  ptMat.userData.base = 0.35; mats.push(ptMat);
  group.add(new THREE.Points(pg, ptMat));

  let k = 0, light = !!ctx.isLight;
  function applyBlend() {
    for (const m of mats) { if (m.userData.noBlend) continue; m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; m.needsUpdate = true; }
  }
  applyBlend();

  return {
    update(t, dt) {
      const si = ctx.stopIndex;
      const target = si === 1 ? 1 : 0;
      if (target === 0 && k === 0) { group.visible = false; return; }
      const rate = ctx.reducedMotion ? 1 : Math.min(1, (dt || 0.016) * 2.5);
      k += (target - k) * rate;
      if (Math.abs(target - k) < 0.002) k = target;
      group.visible = k > 0;
      const flick = ctx.reducedMotion ? 1 : 0.92 + 0.08 * Math.sin(t * 23.0) * Math.sin(t * 7.3);
      const lf = light ? 0.35 : 1;
      for (const m of mats) m.opacity = m.userData.base * k * lf * (m === lineMat ? 1 : flick);
    },
    setTheme(l) { light = !!l; applyBlend(); },
  };
}
