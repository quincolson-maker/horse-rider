// v103 BARDING YOU CAN SEE: the Barding upgrade at the store now shows on the horse you ride.
// Tier 1 is boiled leather, tier 2 adds brass studs, tier 3 is blued steel plate with gold trim.
// Pieces: flank plates and a chest plate on the body bone. They follow the rig, the same way the saddle does.
import * as THREE from 'three';
const MATS = {};
const mats = tier => MATS[tier] || (MATS[tier] = tier >= 3 ? { plate: new THREE.MeshStandardMaterial({ color: 0x4a5560, metalness: .85, roughness: .32 }), trim: new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: .9, roughness: .3 }) }
  : { plate: new THREE.MeshStandardMaterial({ color: tier >= 2 ? 0x5a3418 : 0x6e4426, roughness: .78 }), trim: new THREE.MeshStandardMaterial({ color: tier >= 2 ? 0xc9a04a : 0x3a2414, metalness: tier >= 2 ? .85 : 0, roughness: tier >= 2 ? .35 : .8 }) });
function build(tier) { const M = mats(tier), body = new THREE.Group(), neck = new THREE.Group(), head = new THREE.Group(), side = THREE.DoubleSide; M.plate.side = side;
  const arc = (r, len, t0, tl, mat, seg = 18) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg, 1, true, t0, tl), mat);
  // flank plates: open cylinder segments along the trunk (axis = z), one per side, plus a rolled trim edge
  for (const s of [-1, 1]) { const p = arc(.36, .95, s > 0 ? Math.PI * .18 : Math.PI * 1.32, Math.PI * .5, M.plate); p.rotation.x = Math.PI / 2; p.position.set(0, 1.17, -.32); p.scale.set(1, 1, 1.05); body.add(p);
    const tr = arc(.365, .95, s > 0 ? Math.PI * .18 : Math.PI * 1.32, .05, M.trim, 4); tr.rotation.x = Math.PI / 2; tr.position.copy(p.position); body.add(tr);
    if (tier >= 2) for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const a = (s > 0 ? Math.PI * .18 : Math.PI * 1.32) + Math.PI * (.12 + j * .26), st = new THREE.Mesh(new THREE.SphereGeometry(.014, 6, 4), M.trim); st.position.set(Math.sin(a) * .385, 1.16 - Math.cos(a) * .385, -.85 + i * .19); body.add(st); } }
  // chest plate (peytral): a front arc across the breast
  const pey = arc(.36, .36, -Math.PI * .42, Math.PI * .84, M.plate); pey.position.set(0, 1.1, .3); body.add(pey);
  const pt = arc(.365, .04, -Math.PI * .42, Math.PI * .84, M.trim); pt.position.set(0, 1.28, .3); body.add(pt);
  for (const g of [body, neck, head]) g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { body, neck, head }; }
export function createBarding({ H }) {
  let cur = null; const tier = () => (H.stable && H.stable.levels && H.stable.levels.armor) | 0;
  function off(h) { if (!cur) return; cur.parts.body.removeFromParent(); cur = null; }
  function on(h) { off(); const t = tier(); if (!t || !h || !h.g || h.g.userData.kind !== 'real') return; const u = h.g.userData, B = u.bones, parts = build(t);
    h.g.updateMatrixWorld(true); for (const [k, bi] of [['body', 1]]) { u.mdl.add(parts[k]); parts[k].updateMatrixWorld(true); B[bi].attach(parts[k]); } cur = { h, parts, t }; }
  function tick() { const h = H.mounted; if (h && (!cur || cur.h !== h || cur.t !== tier())) on(h); else if (!h && cur) off(); }
  return { on, off, tick };
}
