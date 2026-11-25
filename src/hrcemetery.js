// v175 BOOT HILL: a little cemetery just west of town. Wooden crosses and headstones, a picket fence, a dead tree.
// After dark, will-o'-the-wisps drift between the graves. USE the big cross to pay your respects (+100 once a day).
// Everything is merged per material, so it costs one draw per material.
import * as THREE from 'three';
import { mergeStatic } from './hrmerge.js?v=395';
export function createCemetery({ scene, H, P, T, hAt, msg }) {
  const s = T.structs.find(q => q.kind === 'town'); if (!s) return null;
  const [cx, cz] = T.toW(s, -50, 6), g = new THREE.Group(); g.position.set(cx, hAt(cx, cz), cz); g.rotation.y = s.rot || 0; scene.add(g);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: .95 }), stone = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: .95 }), dirt = new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 1 });
  const y = (x, z) => { const v = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y); return hAt(cx + v.x, cz + v.z) - g.position.y; };
  const add = (geo, m, x, yy, z, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y(x, z) + yy, z); o.rotation.set(0, ry, rz); o.castShadow = true; g.add(o); return o; };
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = -6 + i * 3.6 + (r() - .5), z = -5 + j * 3.2 + (r() - .5), tilt = (r() - .5) * .25;
    add(new THREE.BoxGeometry(.9, .18, 1.9), dirt, x, .05, z + .9);
    if (r() < .55) { add(new THREE.BoxGeometry(.08, 1.1, .08), wood, x, .55, z, 0, tilt); add(new THREE.BoxGeometry(.6, .08, .08), wood, x, .82, z, 0, tilt); }
    else { const st = add(new THREE.BoxGeometry(.55, .75, .14), stone, x, .37, z, 0, tilt); const top = add(new THREE.CylinderGeometry(.275, .275, .14, 12, 1, false, 0, Math.PI), stone, x, .75, z, 0, tilt); top.rotation.x = Math.PI / 2; top.rotation.z = Math.PI / 2 + tilt; } }
  // the big cross, fence, dead tree
  add(new THREE.BoxGeometry(.18, 3, .18), wood, 0, 1.5, -8.5); add(new THREE.BoxGeometry(1.5, .16, .16), wood, 0, 2.3, -8.5);
  for (const [ax, az, bx, bz] of [[-9, -10, 9, -10], [9, -10, 9, 9], [9, 9, 2, 9], [-2, 9, -9, 9], [-9, 9, -9, -10]]) { const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / .45);
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; add(new THREE.BoxGeometry(.07, .8, .05), wood, x, .4, z, Math.atan2(bx - ax, bz - az)); } }
  { const trunk = add(new THREE.CylinderGeometry(.12, .25, 4, 7), wood, 7, 2, -7); for (let k = 0; k < 4; k++) { const b = add(new THREE.CylinderGeometry(.04, .08, 1.6, 5), wood, 7 + Math.cos(k * 1.7) * .5, 3 + k * .3, -7 + Math.sin(k * 1.7) * .5); b.rotation.z = .9 * (k % 2 ? 1 : -1); b.rotation.y = k * 1.7; } }
  try { mergeStatic(g); } catch (_) {} H.cullAdd && H.cullAdd(g, 300, { x: cx, z: cz });
  // will-o'-the-wisps
  const wm = new THREE.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), wisps = [];
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), wm); g.add(w); wisps.push({ w, ph: i * 1.7 }); }
  const [sx, sz] = (() => { const v = new THREE.Vector3(0, 0, -7.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y); return [cx + v.x, cz + v.z]; })();
  const spot = { x: sx, z: sz, y: hAt(sx, sz), kind: 'respects', label: 'Pay your respects', r: 1.8 }; T.spots.push(spot); if (T.TL) T.TL.respects = 'PAY<small>RESPECTS</small>';
  const prev = T.onUse; T.onUse = o => { if (o !== spot) return prev ? prev(o) : false; const day = new Date().toDateString(), st = H.stats || (H.stats = {}); if (st.respectDay === day) { msg('🕯️ You stand a while in the quiet.', 2); return true; } st.respectDay = day; st.respects = (st.respects || 0) + 1; if (H.guns) { H.guns.state.score += 100; H.guns.save && H.guns.save(); } msg('🕯️ You tip your hat to the departed.  +100', 2.5); return true; };
  H.bootHill = [cx, cz];
  // v180 midnight: the graves open - six of the dead claw their way up when you're close after dark (once a night)
  let risen = -1; function rise() { const Z = H.zombies; if (!Z || !Z.spawnKind || Z.state.on === false || (Z.state.role && Z.state.role() === 'client')) return; const cyc = Math.floor(Date.now() / 1200000); if (risen === cyc) return; risen = cyc;
    for (let i = 0; i < 6; i++) { const v = new THREE.Vector3(-6 + (i % 3) * 3.6, 0, -5 + Math.floor(i / 3) * 3.2 + .9).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y); try { const o = Z.spawnKind(i % 2 ? 'crawler' : 'walker', [cx + v.x, cz + v.z]); if (o) o.pos.y = hAt(cx + v.x, cz + v.z) - .8; } catch (_) {} } msg('⚰️ The graves on Boot Hill are opening!', 3); }
  return { update(dt) { const n = H.night || 0, dd = Math.hypot(P.pos.x - cx, P.pos.z - cz), near = dd < 150; if (n > .85 && dd < 70) rise(); wm.opacity = near ? Math.max(0, n - .5) * 1.4 : 0; if (wm.opacity <= 0) return; const t = performance.now() / 1000;
    wisps.forEach((q, i) => { q.w.position.set(Math.sin(t * .3 + q.ph) * 6, y(0, 0) + 1 + Math.sin(t * 1.1 + q.ph) * .5, Math.cos(t * .23 + q.ph * 1.3) * 6); q.w.scale.setScalar(1 + Math.sin(t * 4 + i) * .2); }); } };
}
