// v149 LOOT DROPS: the dead sometimes drop something. Walk or ride over it to pick it up. Drops last 60 s.
//  🦷 gold tooth +25 (most) · 💰 coin pouch +80 · 🍎 an apple for your horse · 🧨 a stick of dynamite (if you carry any).
import * as THREE from 'three';
export function createDrops({ scene, H, P, msg, sfx }) {
  const list = [], gold = new THREE.MeshStandardMaterial({ color: 0xffd34a, metalness: .9, roughness: .25, emissive: 0x6a4a00, emissiveIntensity: .8 }), red = new THREE.MeshStandardMaterial({ color: 0xc0201a, roughness: .5, emissive: 0x400000 }), sack = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .9 });
  const G = { tooth: new THREE.ConeGeometry(.08, .2, 5), pouch: new THREE.SphereGeometry(.16, 8, 6), apple: new THREE.SphereGeometry(.11, 8, 6) };
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  function drop(p) { if (list.length > 14) return; const r = Math.random(), kind = r < .65 ? 'tooth' : r < .85 ? 'pouch' : r < .95 ? 'apple' : 'dyn';
    const m = new THREE.Mesh(kind === 'pouch' ? G.pouch : kind === 'apple' ? G.apple : G.tooth, kind === 'pouch' ? sack : kind === 'apple' ? red : gold); if (kind === 'dyn') { m.material = red; m.scale.set(.6, 1.6, .6); } if (kind === 'tooth') m.rotation.x = Math.PI;
    m.position.set(p.x, p.y + .35, p.z); scene.add(m); list.push({ m, kind, t: 60, y: p.y + .35 }); }
  function grab(d) { const g = H.guns; let txt = ''; if (d.kind === 'tooth' && g) { g.state.score += 25; txt = '🦷 Gold tooth  +25'; } else if (d.kind === 'pouch' && g) { g.state.score += 80; txt = '💰 Coin pouch  +80'; }
    else if (d.kind === 'apple') { if (H.gear) { H.gear.state.apples = Math.min(10, (H.gear.state.apples || 0) + 1); try { localStorage.setItem('hr_gear', JSON.stringify(H.gear.state)); } catch (_) {} } txt = '🍎 An apple for your horse'; }
    else if (d.kind === 'dyn') { if (H.dyn && H.dyn.state) { H.dyn.state.count = (H.dyn.state.count || 0) + 1; txt = '🧨 +1 dynamite'; } else if (g) { g.state.score += 50; txt = '+50'; } }
    g && g.save && g.save(); if (txt) msg(txt, 1.3); tone('triangle', 988, 1318, .12, .12); const st = H.stats || (H.stats = {}); st.loot = (st.loot || 0) + 1; }
  function update(dt) { const t = performance.now() / 1000, me = H.mounted ? H.mounted.pos : P.pos, R2 = H.mounted ? 4 : 2.2;
    for (let i = list.length - 1; i >= 0; i--) { const d = list[i]; d.t -= dt; d.m.rotation.y += dt * 2.5; d.m.position.y = d.y + Math.sin(t * 3 + i) * .08; const dx = d.m.position.x - me.x, dz = d.m.position.z - me.z;
      if (dx * dx + dz * dz < R2 && Math.abs(d.m.position.y - me.y) < 2.5) { grab(d); d.t = 0; } if (d.t <= 0) { d.m.removeFromParent(); list.splice(i, 1); } } }
  return { drop, update, list };
}
