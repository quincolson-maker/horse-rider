// v330 PARADISE COVE: a tropical cove on the far side of the eastern mountains - white sand under a wall of jungle, limestone
// karst towers standing out of a turquoise sea (think El Nido), palms, and a surf break that rolls in on the shared clock.
// Terrain comes from beachPad (hrbeachwave.js, folded into hAt); this module adds the sand/jungle skin, the ocean (a custom
// shader running the same wave model as the surf physics), palms, jungle, karst islands, swimming, and the surf itself (hrsurf.js).
import * as THREE from 'three';
import { BEACH, shoreX, waveAt, surfTime, WAVE_GLSL, depthAt } from './hrbeachwave.js?v=335';
import { createSurf } from './hrsurf.js?v=335';

export function createBeach(ctx) {
  const { scene, H, P, T, hAt, msg, sfx, mobile, fx } = ctx, { SEA, ZC } = BEACH, B = { surfing: false };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const root = new THREE.Group(); root.name = 'Paradise Cove'; scene.add(root);

  // ---------- the sand + jungle + limestone skin over the coast ----------
  { const X0 = 880, Z0 = -330, Z1 = 650, st = mobile ? 4 : 3; const nx = Math.ceil((1140 - X0) / st) + 1, nz = Math.ceil((Z1 - Z0) / st) + 1;
    const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 4), idx = []; const hs = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = X0 + i * st, z = Z0 + j * st, k = j * nx + i; hs[k] = hAt(x, z); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = X0 + i * st, z = Z0 + j * st, k = j * nx + i, h = hs[k]; pos[k * 3] = x; pos[k * 3 + 1] = h + .14; pos[k * 3 + 2] = z;
      const hx = hs[j * nx + Math.min(nx - 1, i + 1)] - hs[j * nx + Math.max(0, i - 1)], hz = hs[Math.min(nz - 1, j + 1) * nx + i] - hs[Math.max(0, j - 1) * nx + i], slope = Math.hypot(hx, hz) / (2 * st);
      const d = shoreX(z) - x, n1 = Math.sin(x * .13 + z * .07) * .5 + Math.sin(x * .031 - z * .043) * .5; let r, g, b;
      if (d < 38 && h < SEA + 4.5) { const wet = sstep(6, 0, d); r = .86 - wet * .26; g = .77 - wet * .24; b = .58 - wet * .18; if (d < -2) { r = .86; g = .8; b = .62; } }
      else { r = .16 + n1 * .05; g = .4 + n1 * .08; b = .13 + n1 * .03; const edge = sstep(52, 38, d) * (h < SEA + 8 ? 1 : 0); r += (.85 - r) * edge * .6; g += (.8 - g) * edge * .6; b += (.6 - b) * edge * .6; }
      const rock = sstep(.75, 1.15, slope); r += (.62 + n1 * .05 - r) * rock; g += (.6 + n1 * .04 - g) * rock; b += (.53 - b) * rock;
      const a = sstep(X0, X0 + 40, x) * sstep(Z0, Z0 + 60, z) * sstep(Z1, Z1 - 60, z) * (1 - sstep(490, 560, Math.abs(z - ZC)) * sstep(900, 1000, x) * 0) ;
      col[k * 4] = r; col[k * 4 + 1] = g; col[k * 4 + 2] = b; col[k * 4 + 3] = a; }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: .95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: true }));
    m.receiveShadow = true; m.name = 'cove skin'; root.add(m); }

  // ---------- the ocean: a dense surf patch + an outer ring of open sea, both on the wave shader ----------
  const sunDir = new THREE.Vector3(.4, .8, .3).normalize(); scene.traverse(o => { if (o.isDirectionalLight) sunDir.copy(o.position).normalize(); });
  const oceanU = { uT: { value: 0 }, uSun: { value: sunDir }, uNight: { value: 0 }, uFogC: { value: new THREE.Color(0xbcd0dc) } };
  const oceanM = new THREE.ShaderMaterial({ uniforms: oceanU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: WAVE_GLSL + `
      varying vec3 vW; varying vec3 vN; varying float vFoam; varying float vDepth;
      void main(){ vec2 p = position.xz; vec2 w = surfWave(p); float e1 = surfWave(p + vec2(.7, 0.0)).x, e2 = surfWave(p + vec2(0.0, .7)).x;
        vN = normalize(vec3(-(e1 - w.x) / .7, 1.0, -(e2 - w.x) / .7)); vFoam = w.y; vec3 wp = vec3(p.x, ${SEA.toFixed(1)} + w.x, p.y); vW = wp;
        float az = abs(p.y - ${ZC.toFixed(1)}); float sh = ${BEACH.SHORE.toFixed(1)} + 150.0 * smoothstep(300.0, 430.0, az) + 6.0 * sin(p.y * .021) + 4.0 * sin(p.y * .053); vDepth = max(0.0, (p.x - sh) * .06);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: `uniform float uT; uniform vec3 uSun; uniform float uNight; uniform vec3 uFogC; varying vec3 vW; varying vec3 vN; varying float vFoam; varying float vDepth;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); } float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 q = vW.xz; vec3 n = normalize(vN + vec3(sin(q.x * 1.3 + uT * 2.1) * .04 + sin(q.y * 1.7 - uT * 1.6) * .03, 0.0, cos(q.y * 1.1 + uT * 1.8) * .04 + sin(q.x * .9 + q.y * .7 + uT) * .03));
        vec3 v = normalize(cameraPosition - vW); float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 shallow = vec3(.16, .78, .74), mid = vec3(.03, .5, .62), deep = vec3(.01, .2, .4); vec3 col = mix(shallow, mid, smoothstep(.3, 3.0, vDepth)); col = mix(col, deep, smoothstep(3.0, 16.0, vDepth));
        float face = smoothstep(.15, .8, -n.x) * smoothstep(.3, 2.5, vW.y - ${SEA.toFixed(1)}); col = mix(col, vec3(.1, .62, .6), face * .5); col += vec3(.05, .28, .22) * face * smoothstep(1.5, 4.0, vW.y - ${SEA.toFixed(1)}); // the face darkens to deep green-blue with light glowing through its thin top
        float dif = max(dot(n, normalize(uSun)), 0.0); col *= .62 + .5 * dif;
        vec3 sky = mix(vec3(.62, .8, .96), vec3(.06, .09, .16), uNight); col = mix(col, sky, fres * .55);
        float spec = pow(max(dot(reflect(-uSun, n), v), 0.0), 140.0) * (1.0 - uNight) * 1.6;
        float fm = vFoam * (.55 + .45 * vn(q * .7 + vec2(uT * .25, 0.0))) + smoothstep(.35, 0.0, vDepth) * (.5 + .5 * sin(q.y * .3 + uT * 1.5 + vn(q * .4) * 4.0)) * .6;
        fm = clamp(fm, 0.0, 1.0); col = mix(col, vec3(.96, .98, 1.0), fm); col *= mix(1.0, .28, uNight); col += spec;
        float a = mix(.42, .93, smoothstep(0.0, 2.5, vDepth)); a = max(a, fm); float dist = length(cameraPosition - vW); col = mix(col, uFogC, 1.0 - exp(-dist * .0007));
        gl_FragColor = vec4(col, a); }` });
  const mkGrid = (xs, zs, skip) => { const pos = [], idx = [], nx = xs.length, nz = zs.length; for (const z of zs) for (const x of xs) pos.push(x, 0, z); for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { if (skip && skip(xs[i], zs[j], xs[i + 1], zs[j + 1])) continue; const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g; };
  const PX0 = 1104, PX1 = 1490, PZ0 = -270, PZ1 = 600; const xs = []; for (let x = PX0; x < 1150; x += 1.4) xs.push(x); for (let x = 1150; x < 1235; x += mobile ? 1.1 : .75) xs.push(x); for (let x = 1235; x <= PX1; x += 3) xs.push(x); const zs = []; for (let z = PZ0; z <= PZ1; z += mobile ? 3 : 2) zs.push(z);
  const surfMesh = new THREE.Mesh(mkGrid(xs, zs), oceanM); surfMesh.frustumCulled = false; surfMesh.renderOrder = 3; surfMesh.name = 'surf'; root.add(surfMesh);
  { const oxs = [], ozs = []; for (let x = 1100; x <= 4400; x += x < 1600 ? 20 : 80) oxs.push(x); for (let z = -900; z <= 1200; z += 30) ozs.push(z); const ring = new THREE.Mesh(mkGrid(oxs, ozs, (x0, z0, x1, z1) => x0 >= PX0 && x1 <= PX1 && z0 >= PZ0 && z1 <= PZ1 || x1 < shoreX((z0 + z1) / 2) - 30), oceanM); ring.frustumCulled = false; ring.renderOrder = 2; ring.position.y = -.02; ring.name = 'open sea'; root.add(ring); }

  // ---------- palms (instanced: a leaning, curving trunk + a crown of drooping fronds) ----------
  const palmGeo = (() => { const tr = [], fr = []; const segs = 7, Ht = 9; let x = 0, y = 0; for (let k = 0; k < segs; k++) { const g = new THREE.CylinderGeometry(.2 - k * .012, .24 - k * .012, Ht / segs + .05, 7); const lean = (k / segs) ** 1.6 * 2.2; g.rotateZ(-.08 - k * .03); g.translate(lean, y + Ht / segs / 2, 0); tr.push(g); y += Ht / segs; x = lean; }
      for (let f = 0; f < 9; f++) { const a = f / 9 * Math.PI * 2, L = 4.2 + (f % 3) * .5, p = [], ii = []; for (let s = 0; s <= 6; s++) { const t = s / 6, wid = Math.sin(t * Math.PI) * .55, dr = t * L, yy = Math.sin(t * 1.9) * 1.3 - t * t * 2.6; const cx = Math.cos(a) * dr, cz = Math.sin(a) * dr, px = -Math.sin(a) * wid, pz = Math.cos(a) * wid; p.push(x + cx + px, Ht + yy, cz + pz, x + cx - px, Ht + yy, cz - pz); if (s) { const o = s * 2; ii.push(o - 2, o - 1, o, o - 1, o + 1, o); } }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ii); g.computeVertexNormals(); fr.push(g); }
      const coco = new THREE.SphereGeometry(.22, 6, 5); for (let c = 0; c < 4; c++) { const cg = coco.clone(); cg.translate(x + Math.cos(c * 1.6) * .3, Ht - .3, Math.sin(c * 1.6) * .3); tr.push(cg); }
      const merge = (gs) => { const all = gs.map(g => g.index ? g.toNonIndexed() : g); for (const g of all) { if (!g.attributes.normal) g.computeVertexNormals(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); } let n = 0; for (const g of all) n += g.attributes.position.count; const P2 = new Float32Array(n * 3), N2 = new Float32Array(n * 3); let o = 0; for (const g of all) { P2.set(g.attributes.position.array, o * 3); N2.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; } const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P2, 3)); G.setAttribute('normal', new THREE.BufferAttribute(N2, 3)); return G; };
      return { trunk: merge(tr), fronds: merge(fr) }; })();
  const palms = []; { const N = mobile ? 70 : 150; for (let i = 0; i < N * 4 && palms.length < N; i++) { const z = -240 + rnd() * 760, d = 24 + rnd() * (rnd() < .7 ? 30 : 90), x = shoreX(z) - d; if (Math.abs(z - ZC) > 440) continue; const y = hAt(x, z); if (y > SEA + 30) continue; palms.push([x, y - .2, z, rnd() * 6.28, .8 + rnd() * .5]); } }
  const IT = new THREE.InstancedMesh(palmGeo.trunk, new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: .9 }), palms.length), IF = new THREE.InstancedMesh(palmGeo.fronds, new THREE.MeshStandardMaterial({ color: 0x3c8a34, roughness: .7, side: THREE.DoubleSide }), palms.length);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), v = new THREE.Vector3(); palms.forEach(([x, y, z, r, s], i) => { e.set(0, r, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, s3.setScalar(s)); IT.setMatrixAt(i, m4); IF.setMatrixAt(i, m4); }); }
  IT.castShadow = IF.castShadow = !mobile; IT.name = 'palms'; root.add(IT, IF);
  // jungle canopy on the hills behind the beach
  { const N = mobile ? 260 : 600, ico = new THREE.IcosahedronGeometry(1, 1), JM = new THREE.InstancedMesh(ico, new THREE.MeshStandardMaterial({ roughness: .9, flatShading: true }), N), m4 = new THREE.Matrix4(), c = new THREE.Color(); let n = 0;
    for (let i = 0; i < N * 5 && n < N; i++) { const z = -320 + rnd() * 960, x = shoreX(z) - 60 - rnd() * 230; if (x < 885 || Math.abs(z - ZC) > 470) continue; const y = hAt(x, z), s = 3.5 + rnd() * 5.5; m4.makeScale(s, s * (.7 + rnd() * .4), s).setPosition(x, y + s * .55, z); JM.setMatrixAt(n, m4); JM.setColorAt(n, c.setHSL(.27 + rnd() * .08, .5 + rnd() * .2, .16 + rnd() * .12)); n++; }
    JM.count = n; JM.castShadow = !mobile; JM.name = 'jungle'; root.add(JM); }

  // ---------- karst islands: tall limestone towers with jungle caps standing out of the sea ----------
  const karst = (x, z, R, Hh) => { const prof = []; for (let k = 0; k <= 14; k++) { const t = k / 14, r = R * (1.05 - .25 * t + .18 * Math.sin(t * 9 + R) * (1 - t) + (t > .92 ? -(t - .92) * 6 : 0)); prof.push(new THREE.Vector2(Math.max(.5, r), -8 + t * (Hh + 8))); } prof.push(new THREE.Vector2(.01, Hh + R * .15));
    const g = new THREE.LatheGeometry(prof, mobile ? 16 : 26); const p = g.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(pz, px), nn = Math.sin(a * 5 + py * .2) * .5 + Math.sin(a * 13 - py * .07) * .5, k = 1 + nn * .12; p.setX(i, px * k); p.setZ(i, pz * k);
        const top = sstep(Hh * .82, Hh * .95, py), streak = Math.sin(a * 21 + py * .05) > .7 ? .82 : 1; const moss = sstep(.4, 1.2, Math.sin(a * 2.3 + py * .035) + Math.sin(a * 1.7 - py * .05) * .7) * (1 - top), gr = Math.max(top, moss * .85), st2 = .5 + nn * .04 - (streak < 1 ? .06 : 0); col.push(st2 + (.17 - st2) * gr, st2 - .01 + (.4 - st2) * gr, st2 - .06 + (.14 - st2 + .06) * gr); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); m.position.set(x, SEA, z); m.castShadow = !mobile; m.name = 'karst'; root.add(m); };
  for (const [x, z, R, Hh] of [[1420, -120, 32, 95], [1560, 60, 46, 140], [1500, 330, 28, 80], [1700, 470, 60, 170], [1880, 160, 70, 210], [1640, -260, 40, 120], [1350, 480, 18, 55], [2100, -40, 80, 240]]) karst(x, z, R, Hh);

  // ---------- safe zone, swimming, deep-water check ----------
  (H.safeRects || (H.safeRects = [])).push({ x: 1090, z: ZC, hw: 160, hd: 440, name: 'PARADISE COVE', label: '🛡 NO ZOMBIES · PARADISE COVE' });
  H.places && (H.places.cove = { x: 1100, z: ZC });
  B.deep = (x, z) => x > shoreX(z) + 16; B.root = root;
  const wv = {}; let swimMsg = false, welcome = false;
  const surf = createSurf({ ...ctx, B }); B.surf = surf;
  B.update = dt => { const t = surfTime(); oceanU.uT.value = t; oceanU.uNight.value = H.night || 0; const me = H.mounted ? H.mounted.pos : P.pos, near = me.x > 820;
    root.visible = near || me.x > 600; if (!root.visible) return;
    if (me.x > 1000 && Math.abs(me.z - ZC) < 450 && !welcome) { welcome = true; msg('🌴 Paradise Cove', 3); const S = H.stats || (H.stats = {}); if (!S.coveVisit) { S.coveVisit = 1; const g = H.guns; if (g) { g.state.score += 300; g.save && g.save(); } setTimeout(() => msg('First time at the sea!  +300 · rent a board at the surf shack and paddle out', 4.5), 1800); } } else if (me.x < 900) welcome = false;
    surf.update(dt, t);
    if (!B.surfing && !H.mounted && !H.trainRide && P.pos.x > shoreX(P.pos.z) + 2) { waveAt(P.pos.x, P.pos.z, t, wv); const surface = SEA + wv.eta, floor = hAt(P.pos.x, P.pos.z); if (surface - floor > 1.05) { const fy = surface - 1.25; if (P.pos.y < fy) { P.pos.y = fy; H.vy = Math.max(0, H.vy || 0); } if (!swimMsg) { swimMsg = true; msg('🏊 Swimming - rent a board at the surf shack to surf', 2.5); } } } };
  return B;
}
