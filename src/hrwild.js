// v60 WILDLIFE
//  🦌 Deer: small herds graze around you (they drift with you as you travel), bolt from riders and gunshots. Hunting: +40.
//  🐎 Wild mustangs: a herd roams the far range in rare coats. Walk up slowly ON FOOT and stay close until the bar fills to
//     tame one (+500): it's yours — its coat unlocks for the Coat Kit and it joins your ranch corral.
// Local per player (decorative wildlife doesn't need syncing).
import { mergeStatic } from './hrmerge.js?v=360';
import * as THREE from 'three';
export function createWild({ scene, H, P, hAt, msg, sfx, makeRealHorse, realAnim, mobile }) {
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const ST = () => H.stats || (H.stats = {}), save = () => { try { localStorage.setItem('hr_stats', JSON.stringify(ST())); } catch (_) {} };
  const award = (p, kind) => { const g = H.guns && H.guns.state; if (g) { g.score += p; H.guns.save && H.guns.save(); } H.lb && H.lb.add(p, kind); };
  const WALK = (H.WALK || 1000) - 20, inMap = (x, z) => Math.abs(x) < WALK && Math.abs(z) < WALK;
  const okGround = (x, z) => { const Z = H.zombies; if (Z && Z.goodGround) return Z.goodGround(x, z); const h = hAt(x, z); return Math.abs(hAt(x + 2, z) - h) < 1.2 && Math.abs(hAt(x, z + 2) - h) < 1.2; };
  const safe = (x, z) => (H.safeRects || []).some(r => Math.abs(x - r.x) < r.hw + 8 && Math.abs(z - r.z) < r.hd + 8);
  // ---------- deer model ----------
  const coat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: .9 }), belly = new THREE.MeshStandardMaterial({ color: 0xe8d8c0, roughness: .9 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: .8 }), horn = new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: .7 });
  const G = { body: new THREE.CapsuleGeometry(.32, .9, 4, 10), neck: new THREE.CylinderGeometry(.12, .17, .6, 7), head: new THREE.CapsuleGeometry(.13, .28, 3, 8), leg: new THREE.CylinderGeometry(.045, .035, .78, 5), ear: new THREE.ConeGeometry(.07, .2, 5), tail: new THREE.ConeGeometry(.08, .2, 5), ant: new THREE.CylinderGeometry(.018, .025, .42, 4) };
  function deerMesh(buck) { const g = new THREE.Group(), m = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
    m(G.body, coat, 0, 1.0, 0, Math.PI / 2); m(G.body, belly, 0, .9, 0, Math.PI / 2).scale.set(.85, .8, .9); const nk = m(G.neck, coat, 0, 1.38, .58, -.6); const hd = new THREE.Group(); hd.position.set(0, 1.68, .78); g.add(hd);
    const h = new THREE.Mesh(G.head, coat); h.rotation.x = Math.PI / 2 - .3; h.position.z = .12; hd.add(h); const n = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 5), dark); n.position.set(0, -.06, .32); hd.add(n);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(G.ear, coat); e.position.set(s * .12, .12, -.02); e.rotation.z = -s * .9; hd.add(e); if (buck) for (const k of [0, 1]) { const a = new THREE.Mesh(G.ant, horn); a.position.set(s * (.08 + k * .1), .3 + k * .05, -.02 - k * .06); a.rotation.set(-.3, 0, -s * (.35 + k * .4)); hd.add(a); } }
    m(G.tail, belly, 0, 1.15, -.72, -2.2); const legs = []; for (const [x, z] of [[-.17, .48], [.17, .48], [-.17, -.48], [.17, -.48]]) { const p = new THREE.Group(); p.position.set(x, .86, z); g.add(p); const l = new THREE.Mesh(G.leg, coat); l.position.y = -.39; l.castShadow = true; p.add(l); const hf = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .07, 5), dark); hf.position.y = -.78; p.add(hf); legs.push(p); }
    g.userData = { legs, hd, nk }; nk.userData.keep = true; try { mergeStatic(g); } catch (_) {} return g; } // v110: fewer draws per deer
  // ---------- deer ----------
  const DEER = []; const DN = mobile ? 7 : 12;
  function placeHerd(cx, cz) { for (let k = 0; k < 40; k++) { const a = Math.random() * 6.28, d = 140 + Math.random() * 110, x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d; if (inMap(x, z) && okGround(x, z) && !safe(x, z)) return [x, z]; } return null; }
  for (let i = 0; i < DN; i++) { const g = deerMesh(i % 4 === 0); g.visible = false; scene.add(g); DEER.push({ g, pos: g.position, yaw: Math.random() * 6.28, state: 'graze', t: Math.random() * 5, ph: Math.random() * 9, alive: false, herd: Math.floor(i / 4) }); }
  function respawnHerd(hi) { const c = placeHerd(P.pos.x, P.pos.z); if (!c) return; for (const d of DEER) if (d.herd === hi) { const x = c[0] + (Math.random() - .5) * 14, z = c[1] + (Math.random() - .5) * 14; d.pos.set(x, hAt(x, z), z); d.alive = true; d.state = 'graze'; d.dead = 0; d.g.visible = true; d.g.rotation.set(0, d.yaw, 0); } }
  let scareT = 0; const scare = (x, z, r) => { for (const d of DEER) if (d.alive && d.state !== 'dead' && Math.hypot(d.pos.x - x, d.pos.z - z) < r) { d.state = 'flee'; d.t = 6 + Math.random() * 3; d.yaw = Math.atan2(d.pos.x - x, d.pos.z - z) + (Math.random() - .5) * .6; } };
  function deerTick(dt) { const herds = Math.ceil(DN / 4); for (let hi = 0; hi < herds; hi++) { const hs = DEER.filter(d => d.herd === hi); if (!hs.some(d => d.alive) || hs.every(d => !d.alive || Math.hypot(d.pos.x - P.pos.x, d.pos.z - P.pos.z) > 420)) respawnHerd(hi); }
    const rider = H.mounted, me = rider ? rider.pos : P.pos, fast = rider ? Math.abs(H.speed || 0) > 3 : false;
    for (const d of DEER) { if (!d.alive) continue; const dist = Math.hypot(d.pos.x - me.x, d.pos.z - me.z); d.g.visible = dist < 260; if (!d.g.visible && d.state !== 'flee') continue; const U = d.g.userData;
      if (d.state === 'dead') { d.dead += dt; d.g.rotation.z = Math.min(1.5, d.dead * 3); if (d.dead > 8) { d.alive = false; d.g.visible = false; } continue; }
      if (d.state !== 'flee' && (dist < (fast ? 38 : 16))) scare(me.x, me.z, 30);
      let sp = 0; if (d.state === 'flee') { sp = 11; d.t -= dt; if (d.t <= 0) d.state = 'graze'; } else { d.t -= dt; if (d.t <= 0) { d.state = d.state === 'graze' ? 'walk' : 'graze'; d.t = 3 + Math.random() * 6; if (d.state === 'walk') d.yaw += (Math.random() - .5) * 1.6; } sp = d.state === 'walk' ? 1.2 : 0; }
      if (sp) { const nx = d.pos.x - Math.sin(d.yaw) * sp * dt * -1, nz = d.pos.z + Math.cos(d.yaw) * sp * dt; if (inMap(nx, nz) && okGround(nx, nz) && !safe(nx, nz)) { d.pos.x = nx; d.pos.z = nz; } else d.yaw += 1.4 * dt * 4; }
      d.pos.y = hAt(d.pos.x, d.pos.z); d.g.rotation.y = d.yaw; d.ph += dt * (sp > 5 ? 9 : sp > 0 ? 3.5 : 0); const amp = sp > 5 ? .9 : sp > 0 ? .35 : 0;
      U.legs.forEach((l, i) => { l.rotation.x = Math.sin(d.ph + (i === 0 || i === 3 ? 0 : Math.PI)) * amp * (sp > 5 ? (i < 2 ? 1 : -1) : 1); }); U.hd.rotation.x = d.state === 'graze' ? .9 + Math.sin(d.ph * .3 + d.t) * .1 : 0; U.hd.position.y = d.state === 'graze' ? 1.05 : 1.68; U.hd.position.z = d.state === 'graze' ? 1.02 : .78; U.nk.rotation.x = d.state === 'graze' ? -1.4 : -.6; U.nk.position.y = d.state === 'graze' ? 1.18 : 1.38;
      if (sp > 5) d.pos.y += Math.abs(Math.sin(d.ph)) * .25; } }
  const v = new THREE.Vector3();
  function shot(o, dir) { scare(o.x, o.z, 70); for (const d of DEER) { if (!d.alive || d.state === 'dead') continue; v.set(d.pos.x, d.pos.y + 1, d.pos.z).sub(o); const t = v.dot(dir); if (t < 0 || t > 220) continue; if (v.lengthSq() - t * t > .75 * .75) continue;
      d.state = 'dead'; d.dead = 0; H.hitX && H.hitX(false, true); award(40); const s = ST(); s.deer = (s.deer || 0) + 1; save(); msg(`🦌 Clean shot  +40  (${s.deer} deer)`, 1.6); break; } }
  // ---------- wild mustangs ----------
  const MN = 5, coats = [8, 9, 4, 3, 7]; let herd = null, home = null, tame = null, tamed = []; try { tamed = JSON.parse(localStorage.getItem('hr_tamed') || '[]'); } catch (_) {}
  H.tamed = tamed;
  function findHome() { const town = H.places && H.places.town; if (!town) return null; for (let k = 0; k < 80; k++) { const a = k * 2.399 + .7, d = 420 + (k % 5) * 40, x = town[0] + Math.sin(a) * d, z = town[1] + Math.cos(a) * d; if (!inMap(x, z) || safe(x, z)) continue; let ok = true; for (let i = 0; i < 8 && ok; i++) { const q = i * .785; ok = okGround(x + Math.sin(q) * 25, z + Math.cos(q) * 25); } if (ok && okGround(x, z)) return [x, z]; } return null; }
  function buildHerd() { if (herd || !H.A || !makeRealHorse) return; home = findHome(); if (!home) return; herd = []; H.mustangHome = home;
    for (let i = 0; i < MN; i++) { const g = makeRealHorse(H.A, 0), ci = coats[i % coats.length]; if (g.userData.saddle) g.userData.saddle.visible = false; /* wild: no tack */ if (H.A.matN[ci]) { g.userData.near.material = H.A.matN[ci]; g.userData.far.material = H.A.matF[ci]; } const x = home[0] + (Math.random() - .5) * 20, z = home[1] + (Math.random() - .5) * 20; g.position.set(x, hAt(x, z), z); scene.add(g);
      herd.push({ g, ci, yaw: Math.random() * 6.28, sp: 0, t: Math.random() * 6, flee: 0, gone: false }); } }
  const bar = document.createElement('div'); bar.id = 'hrTame'; bar.innerHTML = '<b>🐎 TAMING — stay close, move slow</b><div><i></i></div>'; document.body.appendChild(bar);
  const st = document.createElement('style'); st.textContent = '#hrTame{position:fixed;left:50%;bottom:28%;transform:translateX(-50%);z-index:31;pointer-events:none;display:none;text-align:center;font:800 12px/1.4 system-ui,sans-serif;color:#fff;text-shadow:0 2px 3px #000}#hrTame.on{display:block}#hrTame div{width:220px;height:10px;margin:4px auto 0;border-radius:6px;background:rgba(0,0,0,.55);border:1.5px solid #ffd77a;overflow:hidden}#hrTame i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c8822a,#ffe27a)}'; document.head.appendChild(st);
  function herdTick(dt) { buildHerd(); if (!herd) return; const me = H.mounted ? H.mounted.pos : P.pos, fastMe = H.mounted ? Math.abs(H.speed || 0) > 4 : (H.sprint || false);
    let near = null, nd = 1e9; for (const m of herd) { if (m.gone) continue; const p = m.g.position, d = Math.hypot(p.x - me.x, p.z - me.z); m.g.visible = d < 300; if (d < nd) { nd = d; near = m; }
      if (m.roped > 0) { m.roped -= dt; m.flee = 0; m.sp = 0; m.t = 1; } // v90 lasso: a roped mustang stands
      else if ((H.mounted || fastMe) && d < 18 && !m.flee) { m.flee = 5; m.yaw = Math.atan2(p.x - me.x, p.z - me.z) + Math.PI; if (!H.mustangHint) { H.mustangHint = 1; msg(H.mounted ? '🐎 Wild mustangs spook at riders — get off and walk up slowly to tame one' : '🐎 Too fast! Walk (no sprint) up to a mustang to tame it', 4); } } // v74: 18 m (was 30) + say why
      let sp = 0; if (m.flee > 0) { m.flee -= dt; sp = 13; } else { m.t -= dt; if (m.t <= 0) { m.t = 3 + Math.random() * 6; m.sp = Math.random() < .5 ? 0 : 1.4; m.yaw += (Math.random() - .5) * 1.4; const hx = home[0] - p.x, hz = home[1] - p.z; if (Math.hypot(hx, hz) > 45) { m.yaw = Math.atan2(-hx, -hz); m.sp = 2.5; } } sp = m.sp; }
      if (sp) { const nx = p.x - Math.sin(m.yaw) * sp * dt, nz = p.z - Math.cos(m.yaw) * sp * dt; if (inMap(nx, nz) && okGround(nx, nz) && !safe(nx, nz)) { p.x = nx; p.z = nz; } else m.yaw += 2 * dt; }
      p.y = hAt(p.x, p.z); m.g.rotation.y = m.yaw; if (m.g.visible) { m.t2 = (m.t2 || 0) + dt; realAnim && realAnim(m.g, dt, sp, sp === 0, m.t2); } }
    // taming: on foot, within 4 m, not sprinting
    if (near && ((!H.mounted && nd < 4) || (near.roped > 0 && nd < 14)) && !near.flee) { if (!tame || tame.m !== near) tame = { m: near, k: 0 }; tame.k += dt / 5; near.sp = 0; near.t = 1; bar.className = 'on'; bar.querySelector('i').style.width = (tame.k * 100).toFixed(0) + '%';
      if (Math.random() < dt * .5) { tone('sawtooth', 300, 180, .2, .1); near.g.rotation.x = -.25; setTimeout(() => near.g.rotation.x = 0, 250); }
      if (tame.k >= 1) { near.gone = true; near.g.visible = false; tamed.push(near.ci); try { localStorage.setItem('hr_tamed', JSON.stringify(tamed)); } catch (_) {} award(500); const s = ST(); s.tamed = (s.tamed || 0) + 1; save();
        const name = (H.COATS && H.COATS[near.ci] && H.COATS[near.ci].n) || 'mustang'; msg(`🐎 You tamed a wild ${name}!  +500 · It's headed to your ranch corral`, 4.5); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone('triangle', f, f, .16, .18), i * 100)); tame = null; bar.className = '';
        if (H.ranch && H.ranch.addHorse) H.ranch.addHorse(near.ci); if (herd.every(m => m.gone)) setTimeout(() => { for (const m of herd) m.g.removeFromParent(); herd = null; }, 60000); } }
    else if (tame) { tame.k = Math.max(0, tame.k - dt * .3); if (tame.k <= 0 || nd > 6) { tame = null; bar.className = ''; } } }
  H.shotHooks = H.shotHooks || []; H.shotHooks.push((o, dir) => { shot(o, dir); if (herd) for (const m of herd) if (!m.gone && Math.hypot(m.g.position.x - o.x, m.g.position.z - o.z) < 80) { m.flee = 6; m.yaw = Math.atan2(m.g.position.x - o.x, m.g.position.z - o.z) + Math.PI; } });
  return { update(dt) { try { deerTick(dt); herdTick(dt); } catch (e) { console.warn('wild', e); } }, deer: DEER, get herd() { return herd; } };
}
