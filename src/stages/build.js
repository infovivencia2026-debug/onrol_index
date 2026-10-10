// BUILD (stop 3) — "construction moment":
//  1. light-scan: a violet scan bar sweeps across the triptych, like a build/test pass
//  2. wireframe-to-solid component blocks assemble behind the cards (floor + truss)
//  3. faint data links between tests panel -> editor -> chat preview, with travelling pulses
export default function (ctx) {
  const { THREE, scene, reducedMotion } = ctx;
  const Z = 2;
  const root = new THREE.Group(); root.name = 'build-stage';
  scene.add(root);
  const col = new THREE.Color(0xe8eaed), RED = new THREE.Color(0xff2a1a);
  const redMats = new Set();
  const mats = [];
  const mk = (M, o) => { const m = new M({ color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...o }); mats.push(m); return m; };

  // ---------- 1. scan bar (just behind cards' plane, very faint) ----------
  const scanG = new THREE.PlaneGeometry(.9, 3.0);
  // horizontal gradient via vertex colours: bright at leading edge
  const cArr = [];
  const pos = scanG.attributes.position;
  for (let i = 0; i < pos.count; i++) { const a = pos.getX(i) > 0 ? 1 : 0; cArr.push(a, a, a); }
  scanG.setAttribute('color', new THREE.Float32BufferAttribute(cArr, 3));
  const scanMat = mk(THREE.MeshBasicMaterial, { vertexColors: true, opacity: .16, side: THREE.DoubleSide });
  const scan = new THREE.Mesh(scanG, scanMat);
  scan.position.set(0, 2.1, -20.25); root.add(scan);
  const edgeG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.5, 0), new THREE.Vector3(0, 1.5, 0)]);
  const edgeMat = mk(THREE.LineBasicMaterial, { opacity: .7 }); redMats.add(edgeMat);
  const scanEdge = new THREE.Line(edgeG, edgeMat); scanEdge.position.x = .45; scan.add(scanEdge);

  // ---------- 2. component blocks (wireframe -> solid) ----------
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  const edgesG = new THREE.EdgesGeometry(boxG);
  const blocks = [];
  const spots = [
    // floor stacks behind the triptych
    [-2.6, .25, -22.0, .9, .5, .7], [-1.6, .2, -22.3, .7, .4, .6], [-2.2, .7, -22.1, .6, .4, .5],
    [1.7, .25, -22.1, .8, .5, .7], [2.7, .3, -21.9, .6, .6, .6], [2.1, .75, -22.0, .5, .4, .5],
    [0, .18, -22.6, 1.4, .36, .6], [-.4, .55, -22.6, .5, .38, .5], [.45, .55, -22.6, .5, .38, .5],
    // modules docking onto the truss
    [-2.0, 3.72, -21.2, .9, .22, .4], [0, 3.72, -21.2, 1.1, .22, .4], [2.0, 3.72, -21.2, .9, .22, .4],
  ];
  spots.forEach(([x, y, z, sx, sy, sz], i) => {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.scale.set(sx, sy, sz);
    const em = mk(THREE.LineBasicMaterial, { opacity: 0 });
    const fm = mk(THREE.MeshBasicMaterial, { opacity: 0 });
    const e = new THREE.LineSegments(edgesG, em), f = new THREE.Mesh(boxG, fm);
    f.scale.setScalar(.985);
    g.add(f, e); root.add(g);
    blocks.push({ g, em, fm, y, delay: i * .22 + (y > 3 ? .6 : 0), drop: y > 3 ? -.8 : 1.4 });
  });

  // ---------- 3. links between panels ----------
  const link = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const curves = [
    link([[-3.1, 1.0, -19.6], [-2.6, .55, -20.6], [-1.5, .7, -20.5], [-1.0, 1.0, -20.3]]),
    link([[1.0, 1.0, -20.3], [1.5, .7, -20.5], [2.6, .55, -20.6], [3.1, 1.0, -19.6]]),
    link([[-3.1, 3.2, -19.6], [-1.5, 3.55, -20.6], [1.5, 3.55, -20.6], [3.1, 3.2, -19.6]]),
  ];
  const linkMat = mk(THREE.LineBasicMaterial, { opacity: .22 });
  curves.forEach((c) => root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)), linkMat)));
  const PER = 3, NP = curves.length * PER;
  const pulseG = new THREE.BufferGeometry();
  const pArr = new Float32Array(NP * 3);
  pulseG.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
  const pulseMat = mk(THREE.PointsMaterial, { size: .07, opacity: .9, sizeAttenuation: true }); redMats.add(pulseMat);
  const pulses = new THREE.Points(pulseG, pulseMat); pulses.frustumCulled = false; root.add(pulses);
  const tmp = new THREE.Vector3();

  const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
  const CYCLE = 9;
  let active = true;

  function pose(t) {
    const c = t % CYCLE;
    // scan sweeps once per cycle (after blocks assemble), then fades
    const s = (c - 3.2) / 2.4;
    const on = s > 0 && s < 1;
    scan.visible = on;
    if (on) {
      scan.position.x = -3.6 + s * 7.2;
      const k = Math.sin(s * Math.PI);
      scanMat.opacity = .09 * k; edgeMat.opacity = .7 * k;
    }
    // blocks: drop in as wireframe, then fill solid; hold; dissolve at end
    const out = ease((c - (CYCLE - 1.1)) / 1.0);
    for (const b of blocks) {
      const a = ease((c - b.delay) / .7);
      const fill = ease((c - b.delay - .6) / .8);
      b.g.position.y = b.y + (1 - a) * b.drop;
      b.em.opacity = (.55 * a + .25 * fill) * (1 - out);
      b.fm.opacity = .06 * fill * (1 - out);
    }
    // pulses
    let k = 0;
    for (let i = 0; i < curves.length; i++) for (let j = 0; j < PER; j++) {
      curves[i].getPointAt(((t * .28 + j / PER + i * .17) % 1), tmp);
      pArr[k++] = tmp.x; pArr[k++] = tmp.y; pArr[k++] = tmp.z;
    }
    pulseG.attributes.position.needsUpdate = true;
  }

  function setTheme(light) {
    col.set(light ? 0x2a2a2e : 0xe8eaed);
    for (const m of mats) { m.color.copy(redMats.has(m) ? RED : col); m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; m.needsUpdate = true; }
  }
  setTheme(ctx.isLight);
  if (reducedMotion) { pose(6.5); scan.visible = false; }
  else pose(0);

  return {
    update(t, dt) {
      const near = Math.abs(ctx.stopIndex - 3) <= 1;
      if (near !== active) { active = near; root.visible = near; }
      if (!near || reducedMotion) return;
      pose(t);
    },
    setTheme,
  };
}
