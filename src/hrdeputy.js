// v170 HIRED GUNS (sheriff's office, 500): two deputies follow you for 3 minutes and shoot the dead near you.
// They keep up when you ride by catching up out of sight. Hire them at the store (Gear tab).
import * as THREE from 'three';
import { makeFrontierCharacter, poseFrontierCharacter } from './hrcharacters.js?v=297';
export function createDeputies({ scene, H, P, hAt, msg, sfx, mobile }) {
  let D = [], T = 0, pool = []; const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const flashM = new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  function hire() { const g = H.guns; if (!g || g.pts() < 500) { msg('Not enough points', 1.5); return; } g.state.spent = (g.state.spent || 0) + 500; g.save && g.save(); if (D.length) { T += 180; msg('Your deputies sign on for another 3 minutes', 2); return; }
    if (pool.length) { D = pool; pool = []; for (const d of D) { const a = d.off; d.c.g.position.set(P.pos.x + Math.sin(a) * 3, P.pos.y, P.pos.z + Math.cos(a) * 3); d.c.g.visible = true; scene.add(d.c.g); scene.add(d.fl); } T = 180; msg('🤠 Two deputies ride with you for 3 minutes', 3); return; }
    for (let i = 0; i < 2; i++) { const c = makeFrontierCharacter({ kind: 'townsfolk', sex: 'male', quality: mobile ? 'low' : 'high', coat: [0x3a2c20, 0x2a3440][i], top: 0xe6dcc6, hatC: [0x2a1e14, 0x4a3a28][i], skin: [0xb07a54, 0x7a4c30][i], hair: 0x1a120c, bandana: 0x8a1a1a, name: 'Deputy' });
      const star = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .012, 5), new THREE.MeshStandardMaterial({ color: 0xffcf4a, metalness: .7, roughness: .3 })); star.rotation.x = Math.PI / 2; star.position.set(-.1, .18, .14); c.spine && c.spine.add(star);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 4), flashM.clone()); scene.add(fl); const a = i ? -2.2 : 2.2; c.g.position.set(P.pos.x + Math.sin(a) * 3, P.pos.y, P.pos.z + Math.cos(a) * 3); scene.add(c.g); D.push({ c, fl, off: a, cd: Math.random(), sp: 0 }); }
    T = 180; msg('🤠 Two deputies ride with you for 3 minutes', 3); tone('triangle', 392, 523, .3, .15); }
  function dismiss() { for (const d of D) { d.c.g.removeFromParent(); d.fl.removeFromParent(); } pool = D; D = []; } // v204: kept for next time (no rebuild, no leak)
  let guardMsg = false; function update(dt) { if (!D.length) return; const RD = H.raid && H.raid.on && H.raid.gate; T -= RD ? 0 : dt; /* v218: the clock stops while they hold a raid gate */ if (T <= 0 || H.dead && T < 170) { dismiss(); msg('Your deputies head back to town', 2); return; }
    const me = H.mounted ? H.mounted.pos : P.pos, Z = H.zombies;
    const tw = H.places && H.places.town, guard = RD && tw && Math.hypot(me.x - RD.x, me.z - RD.z) < 70; if (guard && !guardMsg) { guardMsg = true; msg('🤠 Your deputies take up the barricade', 2.5); } if (!RD) guardMsg = false;
    for (const d of D) { const g = d.c.g, ang = (H.mounted ? H.mounted.yaw : (P.yaw || 0)) + d.off; let tx = me.x + Math.sin(ang) * 3.2, tz = me.z + Math.cos(ang) * 3.2;
      if (guard) { const ix = tw[0] - RD.x, iz = tw[1] - RD.z, il = Math.hypot(ix, iz) || 1, k = D.indexOf(d) ? 1 : -1; tx = RD.x + ix / il * 3.5 + (-iz / il) * k * 2.2; tz = RD.z + iz / il * 3.5 + (ix / il) * k * 2.2; } /* v218 raid guard post */
      const dx = tx - g.position.x, dz = tz - g.position.z, dist = Math.hypot(dx, dz);
      if (dist > 30) { g.position.set(tx, hAt(tx, tz), tz); } else if (dist > .6) { const sp = Math.min(H.mounted ? 12 : 5.5, dist * 1.6); g.position.x += dx / dist * sp * dt; g.position.z += dz / dist * sp * dt; d.sp = sp; } else d.sp = 0;
      g.position.y = hAt(g.position.x, g.position.z);
      // shoot the nearest zombie within 32 m
      d.cd -= dt; let best = null, bd = 32; if (Z) for (const o of Z.list) { if (!o.alive || o.kind === 'outlaw') continue; const e = Math.hypot(o.pos.x - g.position.x, o.pos.z - g.position.z); if (e < bd) { bd = e; best = o; } }
      if (best) { g.rotation.y = Math.atan2(best.pos.x - g.position.x, best.pos.z - g.position.z); if (d.cd <= 0) { d.cd = 1.1 + Math.random() * .5; try { const p = best.pos.clone(); p.y += 1.3; Z.onHit && Z.onHit(best, 'revolver', Math.random() < .2, p, null, .8); } catch (_) {}
          d.fl.position.set(g.position.x + Math.sin(g.rotation.y) * .6, g.position.y + 1.35, g.position.z + Math.cos(g.rotation.y) * .6); d.fl.material.opacity = 1; if (sfx && sfx.at && sfx.ctx) sfx.at(g.position, () => { sfx.nz && sfx.nz('highpass', 900, 1, .08, .8); sfx.tone('square', 170, 55, .09, .4); }, .5); } }
      else if (d.sp > .1) g.rotation.y = Math.atan2(dx, dz);
      d.fl.material.opacity = Math.max(0, d.fl.material.opacity - dt * 12); poseFrontierCharacter(d.c, dt, { speed: d.sp }); } }
  const item = { state: { id: 'deputies', name: '🤠 Hire two deputies · they ride with you and shoot the dead for 3 min', price: 500, get owned() { return false; }, maxed: false, get label() { return D.length ? `ON DUTY ${Math.ceil(T)}s · +3 MIN` : ''; } }, buy() { hire(); }, toggle() { hire(); } };
  return { update, hire, item, get active() { return D.length; } };
}
