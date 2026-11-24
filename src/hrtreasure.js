// v154 TREASURE MAPS: buy one at the store (400), or pull one out of the falls pool while fishing (5%).
// An ❌ appears on your map and compass 150-450 m away; ride there and USE the dig spot for 800-1600 points.
// You can only hold one map at a time.
import * as THREE from 'three';
export function createTreasure({ scene, H, P, hAt, msg, sfx, T }) {
  const LS = 'hr_treasure'; let st = {}; try { st = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (_) {} };
  const mk = new THREE.Group(); mk.visible = false; scene.add(mk); { const m = new THREE.MeshBasicMaterial({ color: 0xff3020 }); for (const r of [.7, -.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, .06, .22), m); b.rotation.y = r; b.position.y = .05; mk.add(b); } const mound = new THREE.Mesh(new THREE.SphereGeometry(.7, 10, 6, 0, 6.28, 0, 1.2), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 })); mound.scale.y = .35; mk.add(mound); }
  let spot = null;
  function place() { if (!st.x) { mk.visible = false; H.treasurePos = null; if (spot) spot.off = true; return; } const y = hAt(st.x, st.z); mk.position.set(st.x, y, st.z); mk.visible = true; H.treasurePos = [st.x, st.z];
    if (!spot) { spot = { kind: 'dig', label: 'Dig up the treasure', r: 2.4 }; T.spots.push(spot); if (T.TL) T.TL.dig = 'DIG<small>TREASURE</small>'; const prev = T.onUse; T.onUse = o => (o === spot && !spot.off ? (dig(), true) : (prev ? prev(o) : false)); }
    Object.assign(spot, { x: st.x, z: st.z, y, off: false }); }
  function newMap(why) { if (st.x) { msg('You already carry a treasure map — follow the ❌', 2); return false; } for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, d = 150 + Math.random() * 300, x = P.pos.x + Math.cos(a) * d, z = P.pos.z + Math.sin(a) * d;
      if (Math.abs(x) > 1150 || Math.abs(z) > 1150) continue; const g = hAt(x, z), sl = Math.abs(hAt(x + 2, z) - g) + Math.abs(hAt(x, z + 2) - g); if (sl > 1.6 || (H.zombies && H.zombies.inSafeZone && H.zombies.inSafeZone(x, z))) continue; st = { x: +x.toFixed(1), z: +z.toFixed(1) }; save(); place(); msg(`🗺️ ${why} — a treasure map! Follow the ❌ on your compass`, 3.5); return true; } return false; }
  function dig() { const pts = 800 + ((Math.random() * 9) | 0) * 100; const g = H.guns; if (g) { g.state.score += pts; g.save && g.save(); } const S2 = H.stats || (H.stats = {}); S2.treasures = (S2.treasures || 0) + 1; st = {}; save(); place();
    msg(`💰 You dig up an old strongbox — +${pts}!`, 3.5); if (sfx && sfx.ctx && sfx.tone) [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => sfx.tone('triangle', f, f, .15, .16), i * 90)); }
  place();
  const item = { state: { id: 'tmap', name: '🗺️ Treasure map · an ❌ marks buried loot 150-450 m out (800-1600)', price: 400, get owned() { return !!st.x; }, maxed: false, get label() { return st.x ? 'FOLLOW ❌' : ''; } },
    buy() { const g = H.guns; if (!g || g.pts() < 400) { msg('Not enough points', 1.5); return; } if (st.x) { msg('You already carry one', 1.4); return; } g.state.spent = (g.state.spent || 0) + 400; g.save && g.save(); newMap('Bought'); }, toggle() { msg('Follow the ❌ on your compass and map', 1.6); } };
  return { item, newMap, tick() { if (mk.visible) mk.rotation.y += .01; } };
}
