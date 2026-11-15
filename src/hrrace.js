// v54 HORSE RACES: "Pen-to-Town Derby". Ride into the start gate (south of the pen) on horseback: a 3-2-1 countdown starts,
// and any buddy sitting mounted near the start joins the same race (net message 'rc'). Eight glowing gates, a light beam on
// the next one, a timer, places for head-to-head races, best time saved, and a translucent gold GHOST of your best lap.
import * as THREE from 'three';
export function createRace({ scene, H, P, hAt, sfx, msg, PEN, send, makeRealHorse, realAnim }) {
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  let best = 0; try { best = +(localStorage.getItem('hr_race_best') || 0); } catch (_) {}
  let ghostPath = null; try { ghostPath = JSON.parse(localStorage.getItem('hr_race_ghost') || 'null'); } catch (_) {}
  const gates = []; let built = false, R = null, CD = null, R0 = null, lastBeep = 4;
  const ringG = new THREE.TorusGeometry(4.6, .42, 8, 40), postG = new THREE.CylinderGeometry(.22, .26, 1, 8);
  const mOn = new THREE.MeshBasicMaterial({ color: 0xffc21a, fog: false }), mOff = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, fog: false }), mPost = new THREE.MeshStandardMaterial({ color: 0x6a4524, roughness: .8 });
  const beamM = new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }), beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 60, 8, 1, true), beamM); beam.visible = false; scene.add(beam);
  function build() { const town = H.places && H.places.town; if (!town) return; built = true;
    const sx = PEN.x, sz = PEN.z + 22, tx = town[0], tz = town[1], dx = tx - sx, dz = tz - sz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    const pts = [[-.05, 0], [.2, 60], [.6, 95], [1.05, 90], [1.45, 0], [1.05, -90], [.6, -95], [.2, -60]].map(([f, s]) => [sx + dx * f + nx * s, sz + dz * f + nz * s]);
    for (const [x, z] of pts) { let gx = x, gz = z; for (let k = 0; k < 12 && H.blockedAt && H.blockedAt(gx, gz, 2.5); k++) { gx += nx * 3; gz += nz * 3; }
      const y = hAt(gx, gz), g = new THREE.Group(); g.position.set(gx, y, gz); const ring = new THREE.Mesh(ringG, mOff); ring.position.y = 4.6; g.add(ring);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(postG, mPost); p.scale.y = 4.6; p.position.set(s * 4.6, 2.3, 0); g.add(p); } g.userData.ring = ring; scene.add(g); gates.push(g); }
    for (let i = 0; i < gates.length; i++) { const a = gates[i].position, b = gates[(i + 1) % gates.length].position; gates[i].rotation.y = Math.atan2(b.x - a.x, b.z - a.z); }
    H.raceStart = [gates[0].position.x, gates[0].position.z]; setGate(-1); }
  // ---- ghost of your best lap ----
  let ghost = null; const gm = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: .38, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  function ghostMesh() { if (ghost || !H.A || !makeRealHorse) return ghost; const g = makeRealHorse(H.A, 0); g.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = false; } }); if (g.userData.far) g.userData.far.visible = false; g.visible = false; scene.add(g); ghost = g; return g; }
  // ---- HUD ----
  const el = document.createElement('div'); el.id = 'hrRace'; document.body.appendChild(el);
  const st = document.createElement('style'); st.textContent = '#hrRace{position:fixed;left:50%;top:calc(max(8px,env(safe-area-inset-top)) + 120px);transform:translateX(-50%);z-index:31;pointer-events:none;display:none;text-align:center;font:900 26px/1 system-ui,sans-serif;color:#fff;text-shadow:0 2px 0 #7a4a00,0 0 12px rgba(255,190,40,.7)}#hrRace small{display:block;font:800 11px/1.5 system-ui,sans-serif;letter-spacing:.14em;color:#ffe08a}#hrRace.on{display:block}#hrRace.cd{font-size:64px}'; document.head.appendChild(st);
  const fmt = t => t.toFixed(2) + 's', me = () => H.me || 'P1', name = () => (H.callsign ? H.callsign() : 'Rider').slice(0, 16);
  function setGate(i) { gates.forEach((g, k) => { g.visible = i >= 0 ? k === i : k === 0; g.userData.ring.visible = i >= 0; /* v59: no rings on the map; between races the start is just two posts, mid-race only the next gate shows */ g.userData.ring.material = k === i ? mOn : mOff; g.userData.ring.scale.setScalar(k === i ? 1.08 : 1); }); const gi = gates[i < 0 ? 0 : i]; if (gi) { beam.visible = i >= 0; beam.position.set(gi.position.x, gi.position.y + 30, gi.position.z); beamM.color.set(i < 0 ? 0x40ff80 : 0xffd040); } H.raceNext = i >= 0 && gates[i] ? [gates[i].position.x, gates[i].position.z] : null; }
  const nearStart = (d = 26) => { const g0 = gates[0] && gates[0].position, p = H.mounted ? H.mounted.pos : P.pos; return !!(g0 && H.mounted && Math.hypot(p.x - g0.x, p.z - g0.z) < d); };
  function countdown(from, who) { if (R || CD != null) return; CD = 3.2; lastBeep = 4; R0 = { rivals: new Set(from ? [from] : []), fin: [] }; el.className = 'on cd'; if (!from) send && send({ t: 'rc', k: 'cd', n: name() }); msg('🏁 Get ready…' + (from ? ` racing ${who || 'your buddy'}` : ''), 2); }
  function go() { CD = null; R = Object.assign(R0 || { rivals: new Set(), fin: [] }, { i: 1, t: 0, rec: [] }); R0 = null; setGate(1); el.className = 'on';
    tone('square', 1046, 1046, .35, .2); msg('GO!' + (best ? `  ·  beat ${fmt(best)} (gold ghost)` : ''), 1.5); if (ghostPath && ghostPath.length > 4) { const g = ghostMesh(); if (g) g.visible = true; } }
  function stop(why) { R = null; CD = null; R0 = null; setGate(-1); el.className = ''; if (ghost) ghost.visible = false; if (why) msg(why, 2); }
  function finish() { const t = R.t, place = R.fin.length + 1, multi = R.rivals.size > 0, pb = !best || t < best; send && send({ t: 'rc', k: 'fin', n: name(), tm: +t.toFixed(2) });
    if (pb) { best = t; ghostPath = R.rec; try { localStorage.setItem('hr_race_best', String(t)); localStorage.setItem('hr_race_ghost', JSON.stringify(ghostPath)); } catch (_) {} }
    let pts = t < 70 ? 700 : t < 90 ? 450 : 250; if (multi && place === 1) pts += 300; const g = H.guns && H.guns.state; if (g) { g.score += pts; H.guns.save && H.guns.save(); } H.lb && H.lb.add(pts);
    const S = H.stats || (H.stats = {}); S.races = (S.races || 0) + 1; if (!S.raceBest || t < S.raceBest) S.raceBest = t; if (multi && place === 1) S.raceWins = (S.raceWins || 0) + 1; try { localStorage.setItem('hr_stats', JSON.stringify(S)); } catch (_) {}
    const medal = multi ? (['🥇 1st', '🥈 2nd', '🥉 3rd'][place - 1] || place + 'th') : '🏁 Finished';
    msg(`${medal} — ${fmt(t)}${pb ? ' — NEW BEST!' : ` (best ${fmt(best)})`}  +${pts}`, 4.5); [784, 988, 1175, 1568].forEach((f, k) => setTimeout(() => tone('triangle', f, f, .16, .18), k * 100)); stop(); }
  function netIn(m, from) { if (!m || m.t !== 'rc' || !from || from === me()) return; const who = m.n || 'a rider';
    if (m.k === 'cd') { if (!R && CD == null && nearStart(30)) countdown(from, who); else if (R0 && CD != null) R0.rivals.add(from); else if (R) R.rivals.add(from); }
    if (m.k === 'fin') { const tgt = R || R0; if (tgt) tgt.fin.push(from); if (R && R.rivals.has(from)) msg(`🏁 ${who} finished in ${(+m.tm).toFixed(2)}s`, 2.4); } }
  let cool = 0;
  function update(dt) { if (!built) { if (!H.places) return; build(); if (!built) return; } cool = Math.max(0, cool - dt); for (const g of gates) g.userData.ring.rotation.z += dt * .4;
    const h = H.mounted, p = h ? h.pos : P.pos;
    if (CD != null) { if (!h || !nearStart(30)) { stop('Race cancelled — stay by the start gate'); cool = 3; return; } CD -= dt; const n = Math.ceil(CD); if (n !== lastBeep && n > 0) { lastBeep = n; tone('square', 523, 523, .14, .16); }
      el.innerHTML = n > 0 ? String(n) : 'GO!'; if (CD <= 0) go(); return; }
    if (!R) { if (h && !cool) { const g0 = gates[0].position; if (Math.hypot(p.x - g0.x, p.z - g0.z) < 4.8) { countdown(null); cool = 5; } } return; }
    if (!h) { stop('Race abandoned — stay in the saddle'); cool = 3; return; }
    R.t += dt; if (R.t > 300) { stop(); return; }
    if (R.rec.length < 3000 && R.t >= R.rec.length * .1) R.rec.push([+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1), +h.yaw.toFixed(2)]);
    if (ghost && ghost.visible && ghostPath) { const f = R.t / .1, i = Math.min(ghostPath.length - 2, Math.floor(f)), a = ghostPath[i], b = ghostPath[i + 1] || a, k = Math.min(1, f - i);
      if (f >= ghostPath.length - 1) ghost.visible = false; else { ghost.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k); let dy = b[3] - a[3]; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ghost.rotation.y = a[3] + dy * k;
        realAnim && realAnim(ghost, dt, Math.hypot(b[0] - a[0], b[2] - a[2]) / .1, false, R.t); } }
    const g = gates[R.i].position; if (Math.hypot(p.x - g.x, p.z - g.z) < 5 && Math.abs(p.y - g.y) < 6) { tone('sine', 1320, 1760, .1, .14); if (R.i === 0) { finish(); cool = 5; return; } R.i = (R.i + 1) % gates.length; setGate(R.i); }
    const vs = R.rivals.size ? ` · ${R.rivals.size + 1} RIDERS` : '';
    el.innerHTML = `${fmt(R.t)}<small>GATE ${R.i === 0 ? gates.length : R.i} / ${gates.length}${best ? ' · BEST ' + fmt(best) : ''}${vs}</small>`; }
  return { update, netIn, get best() { return best; }, get racing() { return !!R; }, get counting() { return CD != null; }, gates };
}
