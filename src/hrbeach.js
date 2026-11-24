// v330 PARADISE COVE: a tropical cove on the far side of the eastern mountains - white sand under a wall of jungle, limestone
// karst towers standing out of a turquoise sea (think El Nido), palms, and a surf break that rolls in on the shared clock.
// Terrain comes from beachPad (hrbeachwave.js, folded into hAt); this module adds the sand/jungle skin, the ocean (a custom
// shader running the same wave model as the surf physics), palms, jungle, karst islands, swimming, and the surf itself (hrsurf.js).
import * as THREE from 'three';
import { BEACH, shoreX, waveAt, surfTime, WAVE_GLSL, depthAt } from './hrbeachwave.js?v=337';
import { createSurf } from './hrsurf.js?v=337';

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

  // ---------- v336 beach life: bangka outriggers, nipa huts on stilts, a beach bar, umbrellas + loungers, a hammock, a bonfire, gulls ----------
  const GEO = new Map(), push = (m, g) => (GEO.get(m) || GEO.set(m, []).get(m)).push(g.index ? g.toNonIndexed() : g); const std = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: .85 }, o));
  const BM = { bamboo: std({ color: 0xc8a868 }), thatch: std({ color: 0xa88a50, roughness: 1 }), wood: std({ color: 0x7a5a3a }), white: std({ color: 0xf0ece0 }), red: std({ color: 0xc8382a }), blue: std({ color: 0x2a8ac8 }), yellow: std({ color: 0xf0c83a }), cloth: std({ color: 0xe8e0c8, side: THREE.DoubleSide }), stone: std({ color: 0x6a6460 }) };
  const bx = (m, x, y, z, w, h, d, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); push(m, g); }, cy = (m, x, y, z, r, h, n = 8, r2 = r, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r2, r, h, n); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); push(m, g); }, cn = (m, x, y, z, r, h, n = 4, ry = 0) => { const g = new THREE.ConeGeometry(r, h, n); g.rotateY(ry); g.translate(x, y, z); push(m, g); };
  const spots = [], spot = (x, y, z, kind, label, r = 1.8) => { const o = { x, y, z, kind, label, r, bch: true }; T.spots.push(o); spots.push(o); return o; };
  // nipa huts on stilts behind the sand, with a ladder and a walkable floor + porch (registered as a structure)
  const SH = { cx: 1080, cz: ZC, rot: 0, y0: 0, c: 1, s: 0, floors: [], R: 600, geo: new Map(), kind: 'cove' }; T.structs.push(SH); const wall = (ax, az, bx2, bz, ya, yb) => T.walls.push([ax, az, bx2, bz, ya, yb]);
  const hutZ = [ZC - 150, ZC - 95, ZC + 125, ZC + 185, ZC + 240]; hutZ.forEach((z, i) => { const x = shoreX(z) - 46 - (i % 2) * 6, gy = hAt(x, z), fy = gy + 1.8, W = 4.4, D = 4;
    for (const [dx, dz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) cy(BM.bamboo, x + dx, gy + .9, z + dz, .12, 1.9, 6);
    bx(BM.bamboo, x, fy - .06, z, W + .4, .12, D + .4); bx(BM.bamboo, x + W / 2 + .9, fy - .06, z, 1.8, .1, D); // porch on the sea side
    SH.floors.push({ x0: x - W / 2 - .2 - 1080, x1: x + W / 2 + 1.8 - 1080, z0: z - D / 2 - .2 - ZC, z1: z + D / 2 + .2 - ZC, ya: fy, yb: fy, axis: 'x' });
    for (const [a1, b1, a2, b2] of [[x - W / 2, z - D / 2, x + W / 2, z - D / 2], [x - W / 2, z + D / 2, x + W / 2, z + D / 2], [x - W / 2, z - D / 2, x - W / 2, z + D / 2]]) { bx(BM.thatch, (a1 + a2) / 2, fy + 1.2, (b1 + b2) / 2, Math.abs(a2 - a1) + .1, 2.4, Math.abs(b2 - b1) + .1); wall(a1, b1, a2, b2, fy - .3, fy + 2.4); }
    bx(BM.thatch, x + W / 2, fy + 1.9, z - 1.2, .1, 1.0, 1.6); bx(BM.thatch, x + W / 2, fy + 1.9, z + 1.2, .1, 1.0, 1.6); wall(x + W / 2, z - D / 2, x + W / 2, z - .6, fy - .3, fy + 2.4); wall(x + W / 2, z + .6, x + W / 2, z + D / 2, fy - .3, fy + 2.4);
    cn(BM.thatch, x, fy + 3.5, z, W * .95, 2.4, 4, Math.PI / 4); // tall pyramid thatch roof
    // ladder from the sand to the porch (a ramp)
    const lx0 = x + W / 2 + 1.8, lx1 = lx0 + 2.6; SH.floors.push({ x0: lx0 - 1080, x1: lx1 - 1080, z0: z - .6 - ZC, z1: z + .6 - ZC, ya: fy, yb: hAt(lx1, z) + .05, axis: 'x' }); for (let k = 0; k < 7; k++) bx(BM.bamboo, lx0 + (k + .5) * 2.6 / 7, fy - (k + .5) * (fy - hAt(lx1, z)) / 7, z, .12, .06, 1.1); for (const sz of [-.6, .6]) { const g = new THREE.CylinderGeometry(.05, .05, Math.hypot(2.6, fy - gy), 5); g.rotateZ(Math.atan2(2.6, fy - gy)); g.translate((lx0 + lx1) / 2, (fy + gy) / 2, z + sz); push(BM.bamboo, g); }
    spot(x, fy, z, 'bch_hut', '🛖 Rest in the nipa hut (heal)', 1.8); });
  // beach bar: a bamboo counter under thatch with stools; buko (coconut) juice
  { const z = ZC + 20, x = shoreX(z) - 30, y = hAt(x, z); for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) cy(BM.bamboo, x + dx, y + 1.5, z + dz, .12, 3, 6); cn(BM.thatch, x, y + 3.9, z, 4.6, 2, 4, Math.PI / 4); bx(BM.bamboo, x + 1.6, y + .55, z, .6, 1.1, 4.6); bx(BM.wood, x + 1.6, y + 1.12, z, .8, .08, 4.8);
    for (let k = 0; k < 4; k++) { cy(BM.wood, x + 2.6, y + .4, z - 1.8 + k * 1.2, .2, .08, 10); cy(BM.bamboo, x + 2.6, y + .2, z - 1.8 + k * 1.2, .04, .4, 5); } for (let k = 0; k < 5; k++) { const g = new THREE.SphereGeometry(.16, 8, 6); g.translate(x + 1.5, y + 1.3, z - 1.6 + k * .8); push(std({ color: 0x5a7a2a }), g); }
    wall(x + 1.3, z - 2.3, x + 1.3, z + 2.3, y - 1, y + 1.2); wall(x + 1.9, z - 2.3, x + 1.9, z + 2.3, y - 1, y + 1.2); spot(x + 3, y, z, 'bch_buko', '🥥 Buko juice from the beach bar (10 pts · heal)', 2.2); }
  // umbrellas + loungers on the sand
  const UC = [BM.red, BM.blue, BM.yellow, BM.white]; for (let i = 0; i < 8; i++) { const z = ZC - 120 + i * 34, x = shoreX(z) - 16 - (i % 3) * 3, y = hAt(x, z); cy(BM.white, x, y + 1.25, z, .04, 2.5, 6); cn(UC[i % 4], x, y + 2.55, z, 1.7, .55, 10); bx(BM.white, x + 1.2, y + .25, z + .3, .7, .1, 1.9); bx(BM.white, x + 1.2, y + .5, z - .55, .7, .5, .12, 0); if (i % 2 === 0) spot(x + 1.2, y, z + .3, 'bch_lounge', '🏖️ Lie in the sun a while (heal)', 1.4); }
  // hammock between two palms near the bar
  { const z = ZC - 40, x = shoreX(z) - 26, y = hAt(x, z); for (const dz of [-2.2, 2.2]) cy(BM.wood, x, y + 1.2, z + dz, .14, 2.4, 6); const g = new THREE.PlaneGeometry(1.1, 4.0, 1, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.cos(p.getY(i) / 4 * Math.PI) * .6); g.rotateX(-Math.PI / 2); g.translate(x, y + 1.6, z); push(BM.cloth, g); spot(x, y, z, 'bch_hammock', '🌴 Swing in the hammock (rest + heal)', 1.6); }
  // bonfire circle down the beach
  const fireX = shoreX(ZC - 70) - 22, fireZ = ZC - 70, fireY = hAt(fireX, fireZ); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; cy(BM.stone, fireX + Math.cos(a) * 1, fireY + .12, fireZ + Math.sin(a) * 1, .22, .25, 6); } for (let k = 0; k < 4; k++) cy(BM.wood, fireX, fireY + .3, fireZ, .08, 1.6, 5, .08, 0, Math.PI / 2 * (k % 2 ? 1 : .6) + k);
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + .3; cy(BM.wood, fireX + Math.cos(a) * 3.2, fireY + .22, fireZ + Math.sin(a) * 3.2, .25, 1.6, 8, .25, 0, Math.PI / 2); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .9 })); flame.position.set(fireX, fireY + .8, fireZ); flame.visible = false; root.add(flame); spot(fireX, fireY, fireZ + 2.4, 'bch_fire', '🔥 Sit by the bonfire', 2);
  // bangka outrigger boats moored in the shallows (bob with the swell)
  const boats = []; for (let i = 0; i < 5; i++) { const g = new THREE.Group(), hullM = std({ color: [0xf0ece0, 0x3ab0e0, 0xe8c83a, 0xe85a3a, 0x7ad87a][i] }), trim = std({ color: [0x2a6ac8, 0xf0ece0, 0x2a2a2a, 0xf0ece0, 0x2a6ac8][i] });
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(.45, 6.5, 4, 10), hullM); hull.rotation.x = Math.PI / 2; hull.scale.set(1, 1, .7); g.add(hull); const tr = new THREE.Mesh(new THREE.BoxGeometry(.95, .12, 7), trim); tr.position.y = .3; g.add(tr);
    for (const sx of [-2.6, 2.6]) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 5.6, 6), BM.bamboo); fl.rotation.x = Math.PI / 2; fl.position.set(sx, -.15, 0); g.add(fl); for (const z of [-1.6, 1.6]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 5.3, 5), BM.bamboo); arm.rotation.z = Math.PI / 2; arm.position.set(0, .35, z); g.add(arm); } }
    const roofB = new THREE.Mesh(new THREE.BoxGeometry(1.4, .06, 2.4), std({ color: 0xc8382a })); roofB.position.set(0, 1.6, -.6); g.add(roofB); for (const [dx, dz] of [[-.6, -1.7], [.6, -1.7], [-.6, .5], [.6, .5]]) { const pp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 4), BM.bamboo); pp.position.set(dx, .95, dz); g.add(pp); }
    const z = ZC - 200 + i * 95 + (i % 2) * 20, x = shoreX(z) + 7 + (i % 3) * 4; g.position.set(x, SEA, z); g.rotation.y = .3 + i * .4; g.name = 'bangka'; root.add(g); boats.push(g); }
  // merge statics
  for (const [m, gs] of GEO) { let n = 0; for (const g of gs) { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; } const P2 = new Float32Array(n * 3), N2 = new Float32Array(n * 3); let o = 0; for (const g of gs) { P2.set(g.attributes.position.array, o * 3); N2.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const G2 = new THREE.BufferGeometry(); G2.setAttribute('position', new THREE.BufferAttribute(P2, 3)); G2.setAttribute('normal', new THREE.BufferAttribute(N2, 3)); const me = new THREE.Mesh(G2, m); me.castShadow = !mobile; me.receiveShadow = true; me.name = 'cove props'; root.add(me); } GEO.clear();
  // gulls
  const NG = mobile ? 8 : 16, GG = new THREE.InstancedMesh((() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .2, -.7, .12, -.05, 0, 0, -.15, 0, 0, .2, 0, 0, -.15, .7, .12, -.05], 3)); g.computeVertexNormals(); return g; })(), new THREE.MeshBasicMaterial({ color: 0xf4f4f0, side: THREE.DoubleSide }), NG); GG.frustumCulled = false; root.add(GG);
  const gulls = Array.from({ length: NG }, (_, i) => ({ a: i / NG * 6.28, r: 20 + (i % 5) * 9, h: 14 + (i % 4) * 5, sp: .2 + (i % 3) * .07, cx: 1180 + (i % 3) * 30, cz: ZC - 100 + (i % 4) * 70 }));
  const beachLife = (dt, t, me) => { const n = H.night || 0; flame.visible = n > .45; if (flame.visible) { flame.scale.set(1 + Math.sin(t * 11) * .1, 1 + Math.sin(t * 17) * .2, 1 + Math.cos(t * 13) * .1); if (fx && fx.smoke && Math.random() < dt * 4) fx.smoke.emit(fireX, fireY + 1.6, fireZ, 0, .9, 0, .5, .45, .4, .4, 2, 1.4, -.01, .05); }
    boats.forEach((b, i) => { waveAt(b.position.x, b.position.z, t, wv); b.position.y = SEA + wv.eta + .05; b.rotation.z = Math.sin(t * 1.1 + i) * .05; b.rotation.x = Math.sin(t * .8 + i * 2) * .04; });
    const m4 = GG.userData.m || (GG.userData.m = new THREE.Matrix4()), q = GG.userData.q || (GG.userData.q = new THREE.Quaternion()), e = GG.userData.e || (GG.userData.e = new THREE.Euler()), v = GG.userData.v || (GG.userData.v = new THREE.Vector3()), s3 = GG.userData.s || (GG.userData.s = new THREE.Vector3(1, 1, 1));
    gulls.forEach((g, i) => { g.a += g.sp * dt; const x = g.cx + Math.cos(g.a) * g.r, z = g.cz + Math.sin(g.a) * g.r, y = SEA + g.h + Math.sin(t * .7 + i) * 2, fl = Math.sin(t * 7 + i) * .5; e.set(0, -g.a, .3 + fl * .2); q.setFromEuler(e); s3.set(1, 1 + fl * .3, 1); m4.compose(v.set(x, y, z), q, s3); GG.setMatrixAt(i, m4); }); GG.instanceMatrix.needsUpdate = true;
    if (me.x > 1000 && sfx.tone && sfx.ctx && Math.random() < dt * .12) { const f = 1800 + Math.random() * 400; sfx.tone('sine', f, f * .7, .02, .25); setTimeout(() => sfx.tone('sine', f * .9, f * .6, .018, .2), 260); } };
  const prevUse = T.onUse; T.onUse = o => { if (!o || !o.bch) return prevUse ? prevUse(o) : false; const Z = H.zombies, heal = n => { if (Z && Z.state) Z.state.hp = Math.min(100, (Z.state.hp || 0) + n); }, S = H.stats || (H.stats = {}), g = H.guns;
    if (o.kind === 'bch_buko') { if (!g || g.state.score < 10) msg('You need 10 pts', 1.5); else { g.state.score -= 10; g.save && g.save(); heal(60); H.burnT = 0; msg('🥥 Ice-cold buko juice straight from the coconut', 2.4); S.buko = (S.buko || 0) + 1; } }
    else if (o.kind === 'bch_hut') { heal(100); msg('🛖 You doze in the shade of the nipa hut, the surf rolling below', 2.6); }
    else if (o.kind === 'bch_lounge') { heal(50); msg('🏖️ Warm sand, cold drink, waves on the reef', 2.2); }
    else if (o.kind === 'bch_hammock') { heal(100); msg('🌴 You swing in the hammock until the sun moves', 2.6); S.hammock = 1; }
    else if (o.kind === 'bch_fire') { heal(60); msg((H.night || 0) > .45 ? '🔥 Sparks fly up into a sky full of stars' : '🔥 The bonfire\'s laid ready for tonight', 2.4); }
    return true; };

  // ---------- safe zone, swimming, deep-water check ----------
  (H.safeRects || (H.safeRects = [])).push({ x: 1090, z: ZC, hw: 160, hd: 440, name: 'PARADISE COVE', label: '🛡 NO ZOMBIES · PARADISE COVE' });
  H.places && (H.places.cove = { x: 1100, z: ZC });
  B.deep = (x, z) => x > shoreX(z) + 16; B.root = root;
  const wv = {}; let swimMsg = false, welcome = false;
  const surf = createSurf({ ...ctx, B }); B.surf = surf;
  B.update = dt => { const t = surfTime(); oceanU.uT.value = t; oceanU.uNight.value = H.night || 0; const me = H.mounted ? H.mounted.pos : P.pos, near = me.x > 820;
    root.visible = near || me.x > 600; if (!root.visible) return;
    if (me.x > 1000 && Math.abs(me.z - ZC) < 450 && !welcome) { welcome = true; msg('🌴 Paradise Cove', 3); const S = H.stats || (H.stats = {}); if (!S.coveVisit) { S.coveVisit = 1; const g = H.guns; if (g) { g.state.score += 300; g.save && g.save(); } setTimeout(() => msg('First time at the sea!  +300 · rent a board at the surf shack and paddle out', 4.5), 1800); } } else if (me.x < 900) welcome = false;
    surf.update(dt, t); beachLife(dt, t, me);
    if (!B.surfing && !H.mounted && !H.trainRide && P.pos.x > shoreX(P.pos.z) + 2) { waveAt(P.pos.x, P.pos.z, t, wv); const surface = SEA + wv.eta, floor = hAt(P.pos.x, P.pos.z); if (surface - floor > 1.05) { const fy = surface - 1.25; if (P.pos.y < fy) { P.pos.y = fy; H.vy = Math.max(0, H.vy || 0); } if (!swimMsg) { swimMsg = true; msg('🏊 Swimming - rent a board at the surf shack to surf', 2.5); } } } };
  return B;
}
