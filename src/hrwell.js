// v176 TOWN WELL + HORSE TROUGH in the town square.
//  The well: USE to drink a cold dipper of water (+30 health, every 20 s).
//  The trough: ride your horse up to it and it drinks, which refills its stamina and heals it.
import * as THREE from 'three';
import { mergeStatic } from './hrmerge.js?v=297';
export function createWell({ scene, H, P, T, hAt, msg, sfx }) {
  const s = T.structs.find(q => q.kind === 'town'); if (!s) return null;
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: .95 }), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .9 }), water = new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: .05, metalness: .2 });
  const put = (lx, lz) => { const [x, z] = T.toW(s, lx, lz), g = new THREE.Group(); g.position.set(x, Math.min(hAt(x, z), s.y0 + .5), z); g.rotation.y = s.rot || 0; scene.add(g); return g; };
  const well = put(-12, -13); { const ring = new THREE.Mesh(new THREE.CylinderGeometry(.85, .9, .8, 14, 1, true), stone); ring.material.side = THREE.DoubleSide; ring.position.y = .4; well.add(ring); const w = new THREE.Mesh(new THREE.CircleGeometry(.8, 14), water); w.rotation.x = -Math.PI / 2; w.position.y = .3; well.add(w);
    for (const sx of [-.8, .8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.8, .12), wood); p.position.set(sx, 1.2, 0); well.add(p); } const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, .7, 4), wood); roof.rotation.y = Math.PI / 4; roof.position.y = 2.45; well.add(roof);
    const ax = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.7, 8), wood); ax.rotation.z = Math.PI / 2; ax.position.y = 1.65; well.add(ax); const bk = new THREE.Mesh(new THREE.CylinderGeometry(.14, .11, .25, 10), wood); bk.position.set(.2, 1.1, 0); well.add(bk); }
  const trough = put(6.5, -7.2); { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, .55, .7), wood); b.position.y = .32; trough.add(b); const w = new THREE.Mesh(new THREE.BoxGeometry(2.2, .02, .55), water); w.position.y = .56; trough.add(w); }
  for (const g of [well, trough]) { g.traverse(o => { if (o.isMesh) o.castShadow = true; }); try { mergeStatic(g); } catch (_) {} }
  const ws = { x: well.position.x, z: well.position.z, y: well.position.y, kind: 'well', label: 'Drink from the well', r: 1.9 }; T.spots.push(ws); if (T.TL) T.TL.well = 'DRINK<small>WATER</small>';
  let cd = 0; const prev = T.onUse; T.onUse = o => { if (o !== ws) return prev ? prev(o) : false; if (cd > 0) { msg('Give it a moment — the bucket is still coming up', 1.4); return true; } cd = 20; const Z = H.zombies; if (Z) Z.state.hp = Math.min(100, Z.state.hp + 30); msg('💧 Cold well water  +30 health', 1.8); if (sfx && sfx.ctx && sfx.nz) sfx.nz('lowpass', 900, 1, .3, .25); return true; };
  let drank = 0; return { update(dt) { cd = Math.max(0, cd - dt); const h = H.mounted; if (!h) { drank = 0; return; } const d = Math.hypot(h.pos.x - trough.position.x, h.pos.z - trough.position.z); if (d < 2.6 && Math.abs(H.speed || 0) < 1) { H.stam = Math.min(100, (H.stam || 0) + 30 * dt); h.hp = Math.min(16, (h.hp ?? 16) + 4 * dt); H.winded = 0; if (!drank) { drank = 1; msg('🐴 Your horse drinks from the trough — stamina back up', 2); } } else if (d > 5) drank = 0; } };
}
