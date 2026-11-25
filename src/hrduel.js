// v186 HIGH-NOON DUEL on main street: USE the duel post in the town square to call out a gunslinger (bet 100).
// Wait for "DRAW!" then press FIRE / SPACE (or tap) faster than he does. Too early = you lose.
// His reaction gets quicker each time you beat him (5 tiers). Win = +250 (+ tier bonus).
import * as THREE from 'three';
import { makeFrontierCharacter, poseFrontierCharacter } from './hrcharacters.js?v=386';
export function createDuel({ scene, H, P, T, hAt, msg, sfx, mobile }) {
  const s = T.structs.find(q => q.kind === 'town'); if (!s) return null;
  const [px, pz] = T.toW(s, -3.5, -16), post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 1.6, 7), new THREE.MeshStandardMaterial({ color: 0x5a3a1e })); post.position.set(px, Math.min(hAt(px, pz), s.y0 + .5) + .8, pz); scene.add(post);
  const spot = { x: px, z: pz, y: post.position.y - .8, kind: 'duel', label: 'Call out a gunslinger (bet 100)', r: 1.8 }; T.spots.push(spot); if (T.TL) T.TL.duel = 'DUEL<small>BET 100</small>';
  let tier = 0; try { tier = Math.min(4, +localStorage.getItem('hr_duel') || 0); } catch (_) {}
  const REACT = [.62, .52, .44, .37, .31], NAMES = ['Dusty Pete', 'Two-Bit Jack', 'Silver Sam', 'Black Bart', 'The Kid'];
  let G = null, foe = null, el = null; const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  function ui(txt, big) { if (!el) { el = document.createElement('div'); el.style.cssText = 'position:fixed;left:50%;top:32%;transform:translateX(-50%);z-index:60;pointer-events:none;font:900 34px Georgia,serif;color:#ffd27a;text-shadow:0 3px 0 #000,0 0 18px #000;text-align:center'; document.body.appendChild(el); } el.innerHTML = txt; el.style.fontSize = big ? '64px' : '30px'; el.style.display = txt ? 'block' : 'none'; }
  function start() { const g = H.guns; if (G) return; if (!g || g.pts() < 100) { msg('A duel costs 100 points', 1.6); return; } g.state.spent = (g.state.spent || 0) + 100; g.save && g.save(); if (g.holster) g.holster();
    if (!foe) { foe = makeFrontierCharacter({ kind: 'townsfolk', sex: 'male', quality: mobile ? 'low' : 'high', coat: 0x1a1a1a, top: 0x8a1a1a, hatC: 0x111111, skin: 0xc89a72, hair: 0x111111, bandana: 0x111111, name: 'Gunslinger' }); scene.add(foe.g); }
    const yaw = (s.rot || 0); const [fx, fz] = T.toW(s, -3.5, -28); foe.g.position.set(fx, Math.min(hAt(fx, fz), s.y0 + .5), fz); foe.g.rotation.y = Math.atan2(px - fx, pz - fz); foe.g.visible = true;
    P.pos.set(px, spot.y, pz); P.yaw = Math.atan2(-(fx - px), -(fz - pz)); P.pitch = 0; H.noGun = true; G = { t: 0, draw: 2.2 + Math.random() * 3, state: 'wait', react: REACT[tier] * (.9 + Math.random() * .2) }; ui(`${NAMES[tier]} steps out…<br><small style="font-size:16px">wait for DRAW!</small>`); }
  function fire() { if (!G) return; if (G.state === 'wait') { end(false, 'Too early! He wins.'); } else if (G.state === 'draw') { const rt = G.t - G.draw; end(true, `⚡ ${Math.round(rt * 1000)} ms — you were faster!`); } }
  function end(win, why) { if (!G) return; const g = H.guns; let pay = 0; if (win) { pay = 250 + tier * 100; g.state.score += pay; g.save && g.save(); tier = Math.min(4, tier + 1); try { localStorage.setItem('hr_duel', String(tier)); } catch (_) {} const st = H.stats || (H.stats = {}); st.duels = (st.duels || 0) + 1; tone('triangle', 523, 1046, .4, .25); }
    else tone('sawtooth', 220, 90, .4, .25); tone('square', 180, 50, .12, .5); ui(win ? `${why}<br><small style="font-size:18px">+${pay}</small>` : `💀 ${why}`); G = null; H.noGun = false; setTimeout(() => { ui(''); if (foe) foe.g.visible = false; }, 2200); }
  addEventListener('keydown', e => { if (!G) return; if (e.code === 'Space' || e.code === 'KeyF') { e.preventDefault(); fire(); } }, true);
  addEventListener('pointerdown', e => { if (G && G.state !== 'done') fire(); }, true);
  const prev = T.onUse; T.onUse = o => (o === spot ? (start(), true) : (prev ? prev(o) : false));
  return { update(dt) { if (foe && foe.g.visible) poseFrontierCharacter(foe, dt, { speed: 0 }); if (!G) return; G.t += dt; if (H.fv && H.fv.length() > 1.5 && G.state === 'wait') { end(false, 'You walked away.'); return; }
      if (G.state === 'wait' && G.t >= G.draw) { G.state = 'draw'; ui('DRAW!', true); tone('square', 880, 880, .08, .3); }
      else if (G.state === 'draw' && G.t - G.draw > G.react) end(false, `${NAMES[tier]} drew first.`); } };
}
