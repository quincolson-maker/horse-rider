// v52 TOWN PALISADE: a ring of sharpened log stakes around town with four gateways (arch, sign, lanterns). It matches the
// zombie-proof safe zone (which grows to the fence line), so the dead mill around OUTSIDE the stakes. Everything is instanced
// (stakes, rails) = 3 draw calls. Colliders go into town.walls so riders use the gates.
import * as THREE from 'three';
export function buildPalisade({ scene, T, H, hAt }) {
  const s = T.structs.find(q => q.kind === 'town'); if (!s) return null;
  const CX = -3.5, CZ = 3.6, HX = 30, HZ = 24, GATE = 4.2, R = 6; // local frame: centre, half extents, half gate width, corner radius
  // rounded-rect perimeter sampled every ~0.42 m; gates leave gaps at the middle of each side
  const pts = []; const per = [];
  const corner = (cx, cz, a0) => { for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * Math.PI / 2; per.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); } };
  corner(CX + HX - R, CZ + HZ - R, 0); corner(CX - HX + R, CZ + HZ - R, Math.PI / 2); corner(CX - HX + R, CZ - HZ + R, Math.PI); corner(CX + HX - R, CZ - HZ + R, Math.PI * 1.5);
  per.push(per[0]);
  const inGate = (x, z) => (Math.abs(x - CX) < GATE && Math.abs(Math.abs(z - CZ) - HZ) < 1.2) || (Math.abs(z - CZ) < GATE && Math.abs(Math.abs(x - CX) - HX) < 1.2);
  const segs = []; let run = null;
  for (let i = 0; i < per.length - 1; i++) { const [ax, az] = per[i], [bx, bz] = per[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / .42));
    for (let k = 0; k < n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (inGate(x, z)) { if (run) { segs.push(run); run = null; } continue; } pts.push([x, z]); if (!run) run = [[x, z]]; else run.push([x, z]); } }
  if (run) segs.push(run);
  let seed = 911; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // stake = log + sharpened tip
  const log = new THREE.CylinderGeometry(.2, .23, 1, 7, 1); log.translate(0, .5, 0); const tip = new THREE.ConeGeometry(.2, .55, 7); tip.translate(0, 1.27, 0);
  const merge = (a, b) => { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) { const A = a.attributes[k].array, B = b.attributes[k].array, C = new Float32Array(A.length + B.length); C.set(A); C.set(B, A.length); g.setAttribute(k, new THREE.BufferAttribute(C, a.attributes[k].itemSize)); }
    const ia = a.index.array, ib = b.index.array, I = new Uint32Array(ia.length + ib.length); I.set(ia); for (let k = 0; k < ib.length; k++) I[ia.length + k] = ib[k] + a.attributes.position.count; g.setIndex(new THREE.BufferAttribute(I, 1)); return g; };
  const stakeG = merge(log, tip);
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: .9 }), dark = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: .9 });
  const stakes = new THREE.InstancedMesh(stakeG, wood, pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  pts.forEach(([lx, lz], i) => { const [x, z] = T.toW(s, lx, lz), h = 3.1 + rnd() * .7; e.set((rnd() - .5) * .06, rnd() * 6.28, (rnd() - .5) * .06); q.setFromEuler(e); v.set(x, Math.min(hAt(x, z), s.y0 + .5) - .4, z); sc.set(1 + (rnd() - .5) * .2, h, 1 + (rnd() - .5) * .2); m4.compose(v, q, sc); stakes.setMatrixAt(i, m4); stakes.setColorAt(i, col.setHSL(.07 + rnd() * .03, .35 + rnd() * .15, .3 + rnd() * .12)); });
  stakes.castShadow = true; stakes.receiveShadow = true; scene.add(stakes);
  // two lashed rails along each run (inside face) + colliders
  const railG = new THREE.BoxGeometry(1, .16, .16), rails = []; const walls = [];
  for (const r of segs) { for (let i = 0; i < r.length - 1; i += 4) { const j = Math.min(r.length - 1, i + 4), [ax, az] = T.toW(s, r[i][0], r[i][1]), [bx, bz] = T.toW(s, r[j][0], r[j][1]); rails.push([ax, az, bx, bz]); walls.push([ax, az, bx, bz, s.y0 - 2, s.y0 + 4.2]); } }
  const railM = new THREE.InstancedMesh(railG, dark, rails.length * 2); let ri = 0;
  for (const [ax, az, bx, bz] of rails) for (const yy of [.9, 2.3]) { const L = Math.hypot(bx - ax, bz - az) + .1, mx = (ax + bx) / 2, mz = (az + bz) / 2; e.set(0, Math.atan2(-(bz - az), bx - ax), 0); q.setFromEuler(e); v.set(mx, Math.min(hAt(mx, mz), s.y0 + .5) + yy - .4, mz); sc.set(L, 1, 1); m4.compose(v, q, sc); railM.setMatrixAt(ri++, m4); }
  railM.castShadow = true; scene.add(railM);
  for (const w of walls) T.walls.push(w);
  // gateways: two tall posts, a crossbeam, a carved sign, a lantern on each post
  const lampM = new THREE.MeshStandardMaterial({ color: 0x2a1a0c, emissive: 0xffa040, emissiveIntensity: 2.6 }), signTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#6a4424'; g.fillRect(0, 0, 512, 96); g.strokeStyle = '#3a2410'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 88);
    g.font = '900 52px Georgia, serif'; g.fillStyle = '#f2d39a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HORSE RIDER', 256, 50); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const signM = new THREE.MeshStandardMaterial({ map: signTex, roughness: .85 }), gates = new THREE.Group(); scene.add(gates);
  for (const [gx, gz, ang] of [[CX, CZ + HZ, 0], [CX, CZ - HZ, 0], [CX + HX, CZ, Math.PI / 2], [CX - HX, CZ, Math.PI / 2]]) {
    const g = new THREE.Group(), [wx, wz] = T.toW(s, gx, gz); g.position.set(wx, Math.min(hAt(wx, wz), s.y0 + .5) - .3, wz); g.rotation.y = (s.rot || 0) + ang; gates.add(g);
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.34, .38, 6.2, 9), dark); p.position.set(sx * (GATE + .3), 3.1, 0); p.castShadow = true; g.add(p);
      const l = new THREE.Mesh(new THREE.BoxGeometry(.32, .45, .32), lampM); l.position.set(sx * (GATE + .3), 4.1, .5); g.add(l); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(GATE * 2 + 1.6, .42, .42), dark); beam.position.y = 6.0; g.add(beam);
    for (const z of [-.24, .24]) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1), signM); sg.position.set(0, 5.2, z); if (z < 0) sg.rotation.y = Math.PI; g.add(sg); } }
  // the safe zone (no zombies) grows to the fence line
  const zone = T.safe.find(r => r.town); if (zone) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [lx, lz] of per) { const [x, z] = T.toW(s, lx, lz); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } zone.x = (x0 + x1) / 2; zone.z = (z0 + z1) / 2; zone.hw = (x1 - x0) / 2 + 1; zone.hd = (z1 - z0) / 2 + 1; } // world-aligned box that contains the whole (rotated) fence
  const gateList = [[CX, CZ + HZ, 0, 1, 'South'], [CX, CZ - HZ, 0, -1, 'North'], [CX + HX, CZ, 1, 0, 'East'], [CX - HX, CZ, -1, 0, 'West']].map(([gx, gz, nx, nz, nm]) => { const [x, z] = T.toW(s, gx, gz), [ox, oz] = T.toW(s, gx + nx, gz + nz), ang = (s.rot || 0) + (nx ? Math.PI / 2 : 0); return { x, z, nx: ox - x, nz: oz - z, ang, y: Math.min(hAt(x, z), s.y0 + .5), name: nm, half: GATE }; }); // v89 raid gates (outward normals)
  return { lamps: lampM, stakes: pts.length, gates: gateList };
}
