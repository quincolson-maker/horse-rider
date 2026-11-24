// v99 HATS at the General Store. Each one swaps out the straw hat and sits on the Head bone, so it follows every animation.
// The straw hat comes back when you take the new one off. The spec-ops helmet still wins while the kit is on.
import * as THREE from 'three';
import { wearHat } from './hrkit.js?v=289';
const HX = 0, HY = .835, HZ = .065; // skull centre in bind-pose model space (the same frame hrkit's helmet uses)
const felt = (c, r = .85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
// lathe profile helper: [radius, height] pairs, revolved around the head axis
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
function stetson(g, crownC, bandC, brimR = .31, pinch = true) { const m = felt(crownC), band = felt(bandC, .6), base = HY - .008;
  const crown = new THREE.Mesh(lathe([[0, .135], [.07, .14], [.12, .128], [.145, .1], [.152, .05], [.158, 0]]), m); crown.scale.set(.92, 1, 1.08); crown.position.set(HX, base, HZ); g.add(crown);
  if (pinch) for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), m); d.scale.set(.5, .7, 1.2); d.position.set(HX + s * .118, base + .1, HZ + .05); g.add(d); } // front pinch dents (raised felt reads as the pinch)
  const crease = new THREE.Mesh(new THREE.BoxGeometry(.03, .015, .2), felt(new THREE.Color(crownC).multiplyScalar(.7).getHex())); crease.position.set(HX, base + .136, HZ); g.add(crease); // centre crease
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(.16, .162, .03, 40, 1, true), band); bd.material.side = THREE.DoubleSide; bd.scale.set(.92, 1, 1.08); bd.position.set(HX, base + .018, HZ); g.add(bd);
  const brim = new THREE.Mesh(lathe([[.15, .002], [brimR * .8, -.004], [brimR * .95, .012], [brimR, .04], [brimR - .006, .046], [brimR * .94, .018], [brimR * .8, .006], [.15, .012]], 48), m); brim.material = m; brim.scale.set(.95, 1, 1.05); brim.position.set(HX, base - .004, HZ); g.add(brim); }
function bowler(g) { const m = felt(0x151413, .55), base = HY - .008;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(.158, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), m); crown.scale.set(.95, .82, 1.06); crown.position.set(HX, base, HZ); g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.152, .156, .028, 36, 1, true), felt(0x2a2420, .5)); band.material.side = THREE.DoubleSide; band.scale.set(.95, 1, 1.06); band.position.set(HX, base + .014, HZ); g.add(band);
  const brim = new THREE.Mesh(lathe([[.15, 0], [.2, .003], [.215, .022], [.208, .027], [.195, .01], [.15, .01]], 40), m); brim.scale.set(.95, 1, 1.06); brim.position.set(HX, base - .002, HZ); g.add(brim); }
function gambler(g) { const m = felt(0x2a2a2e, .8), base = HY - .008;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(.14, .155, .1, 40), m); crown.scale.set(.92, 1, 1.08); crown.position.set(HX, base + .05, HZ); g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.157, .158, .03, 40, 1, true), felt(0x8a1a1a, .6)); band.material.side = THREE.DoubleSide; band.scale.set(.92, 1, 1.08); band.position.set(HX, base + .017, HZ); g.add(band);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .01, 48), m); brim.scale.set(.95, 1, 1.05); brim.position.set(HX, base, HZ); g.add(brim);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.34, .006, 6, 48), m); ring.rotation.x = Math.PI / 2; ring.scale.set(.95, 1.05, 1); ring.position.set(HX, base + .004, HZ); g.add(ring); }
function badgeOn(g) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .006, 5), new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: .9, roughness: .3 })); s.rotation.x = Math.PI / 2; s.position.set(HX, HY + .017, HZ + .176); g.add(s); }
const HATS = [
  { id: 'black', n: 'Black Stetson', price: 800, b: g => stetson(g, 0x1b1a19, 0x5a4636) },
  { id: 'silver', n: 'Silverbelly Stetson', price: 1200, b: g => stetson(g, 0xd9d2c2, 0x2a2420) },
  { id: 'sheriff', n: "Sheriff's tan + star", price: 1000, b: g => { stetson(g, 0xa47c4e, 0x3a2a1a); badgeOn(g); } },
  { id: 'brown', n: 'Trail-worn brown', price: 600, b: g => stetson(g, 0x5a3a22, 0x2a1a10, .29, false) },
  { id: 'bowler', n: 'Bowler', price: 700, b: bowler },
  { id: 'gambler', n: "Gambler's flat-brim", price: 900, b: gambler },
  { id: 'tophat', n: 'Undertaker top hat', price: 1100, b: g => { const m = felt(0x121212, .6), base = HY - .008; const c = new THREE.Mesh(new THREE.CylinderGeometry(.15, .145, .3, 32), m); c.scale.set(.92, 1, 1.08); c.position.set(HX, base + .15, HZ); g.add(c); const b = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .015, 32), m); b.scale.set(.95, 1, 1.08); b.position.set(HX, base, HZ); g.add(b); const band = new THREE.Mesh(new THREE.CylinderGeometry(.152, .152, .04, 32, 1, true), felt(0x5a1010, .5)); band.material.side = THREE.DoubleSide; band.scale.set(.92, 1, 1.08); band.position.set(HX, base + .03, HZ); g.add(band); } },
  { id: 'vaquero', n: 'Vaquero sombrero', price: 1300, b: g => { stetson(g, 0x8a6a3a, 0x3a2414, .42, false); } },
  { id: 'ranger', n: 'Ranger hat + feather', price: 1000, b: g => { stetson(g, 0x6a5a48, 0x2a1a10); const f = new THREE.Mesh(new THREE.ConeGeometry(.025, .3, 6), felt(0xd8d0c0, .8)); f.position.set(HX + .15, HY + .12, HZ - .05); f.rotation.z = -.5; g.add(f); } },
];
export function createHats({ H, msg, rig }) {
  const ld = () => { try { return JSON.parse(localStorage.getItem('hr_hats') || 'null') || {}; } catch (_) { return {}; } }, st = Object.assign({ owned: [], on: null }, ld());
  const save = () => { try { localStorage.setItem('hr_hats', JSON.stringify(st)); } catch (_) {} };
  const cur = () => HATS.find(h => h.id === st.on && st.owned.includes(h.id)) || null;
  function apply(root) { root = root || rig(); if (!root || !root.userData) return; const h = cur(); try { wearHat(root, h ? h.b : null); if (root.userData.hatG) root.userData.hatG.traverse(o => { if (o.isMesh) o.castShadow = true; }); } catch (e) { console.warn('hat', e); } }
  const items = HATS.map(h => ({ state: { id: 'hat-' + h.id, name: `🤠 ${h.n}`, price: h.price, get owned() { return st.owned.includes(h.id); }, get equipped() { return st.on === h.id; }, maxed: false, get label() { return st.owned.includes(h.id) ? (st.on === h.id ? 'TAKE OFF' : 'WEAR') : ''; } },
    buy() { const g = H.guns; if (g.pts() < h.price) { msg('Not enough points', 1.5); return; } g.state.spent = (g.state.spent || 0) + h.price; g.save(); st.owned.push(h.id); st.on = h.id; save(); apply(); msg(`🤠 ${h.n} — looking sharp`, 2.5); },
    toggle() { st.on = st.on === h.id ? null : h.id; save(); apply(); msg(st.on ? 'Hat on' : 'Back to the straw hat', 1.3); } }));
  return { items, apply, list: HATS, state: st, idx: () => { const h = cur(); return h ? HATS.indexOf(h) : -1; } };
}
