// v50 HORSE RACES: a start post by the pen. Ride through it on horseback to start the "Pen-to-Town Derby": 8 glowing gates
// looping out past town and back. Timer on screen, best time saved, a bounty for under 90 s. Gates are tall rings you can see far off.
import * as THREE from 'three';
export function createRace({ scene, H, P, hAt, sfx, msg, PEN }) {
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  let best = 0; try { best = +(localStorage.getItem('hr_race_best') || 0); } catch (_) {}
  const gates = []; let built = false, R = null; // R = { i, t }
  const ringG = new THREE.TorusGeometry(4.6, .42, 8, 40), postG = new THREE.CylinderGeometry(.22, .26, 1, 8);
  const mOn = new THREE.MeshBasicMaterial({ color: 0xffc21a, fog: false }); const beamG = new THREE.CylinderGeometry(.5, .5, 60, 8, 1, true), beamM = new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }); const beam = new THREE.Mesh(beamG, beamM); beam.visible = false; scene.add(beam);
  const mOn2 = mOn, mOff = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, fog: false }), mPost = new THREE.MeshStandardMaterial({ color: 0x6a4524, roughness: .8 });
  function build() { const town = H.places && H.places.town; if (!town) return; built = true;
    const sx = PEN.x, sz = PEN.z + 22, tx = town[0], tz = town[1], dx = tx - sx, dz = tz - sz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    const pts = [[-.05, 0], [.2, 60], [.6, 95], [1.05, 90], [1.45, 0], [1.05, -90], [.6, -95], [.2, -60]].map(([f, s]) => [sx + dx * f + nx * s, sz + dz * f + nz * s]);
    for (const [x, z] of pts) { let gx = x, gz = z; for (let k = 0; k < 12 && H.blockedAt && H.blockedAt(gx, gz, 2.5); k++) { gx += nx * 3; gz += nz * 3; }
      const y = hAt(gx, gz), g = new THREE.Group(); g.position.set(gx, y, gz); const ring = new THREE.Mesh(ringG, mOff); ring.position.y = 4.6; g.add(ring);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(postG, mPost); p.scale.y = 4.6; p.position.set(s * 4.2, 2.3, 0); g.add(p); } g.userData.ring = ring; scene.add(g); gates.push(g); }
    for (let i = 0; i < gates.length; i++) { const a = gates[i].position, b = gates[(i + 1) % gates.length].position; gates[i].rotation.y = Math.atan2(b.x - a.x, b.z - a.z); }
    H.raceStart = [gates[0].position.x, gates[0].position.z]; }
  const el = document.createElement('div'); el.id = 'hrRace'; document.body.appendChild(el);
  const st = document.createElement('style'); st.textContent = '#hrRace{position:fixed;left:50%;top:calc(max(8px,env(safe-area-inset-top)) + 120px);transform:translateX(-50%);z-index:31;pointer-events:none;display:none;text-align:center;font:900 26px/1 system-ui,sans-serif;color:#fff;text-shadow:0 2px 0 #7a4a00,0 0 12px rgba(255,190,40,.7)}#hrRace small{display:block;font:800 11px/1.5 system-ui,sans-serif;letter-spacing:.14em;color:#ffe08a}#hrRace.on{display:block}'; document.head.appendChild(st);
  const fmt = t => t.toFixed(2) + 's';
  function setGate(i) { gates.forEach((g, k) => { g.userData.ring.material = k === i ? mOn : mOff; g.userData.ring.scale.setScalar(k === i ? 1.08 : 1); }); const gi = gates[i === -1 ? 0 : i]; if (gi) { beam.visible = true; beam.position.set(gi.position.x, gi.position.y + 30, gi.position.z); beamM.color.set(i === -1 ? 0x40ff80 : 0xffd040); } H.raceNext = i >= 0 && gates[i] ? [gates[i].position.x, gates[i].position.z] : null; }
  function start() { R = { i: 1, t: 0 }; setGate(1); el.className = 'on'; msg('🏁 Pen-to-Town Derby! Ride through every glowing gate' + (best ? ` · best ${fmt(best)}` : ''), 3); [523, 523, 784].forEach((f, k) => setTimeout(() => tone('square', f, f, .14, .14), k * 220)); }
  function finish() { const t = R.t; R = null; setGate(-1); el.className = ''; const pb = !best || t < best; if (pb) { best = t; try { localStorage.setItem('hr_race_best', String(t)); } catch (_) {} }
    const pts = t < 70 ? 700 : t < 90 ? 450 : 250, g = H.guns && H.guns.state; if (g) { g.score += pts; H.guns.save && H.guns.save(); } H.lb && H.lb.add(pts);
    const S = H.stats || (H.stats = {}); S.races = (S.races || 0) + 1; if (!S.raceBest || t < S.raceBest) S.raceBest = t; try { localStorage.setItem('hr_stats', JSON.stringify(S)); } catch (_) {}
    msg(`🏁 Finished in ${fmt(t)}${pb ? ' — NEW BEST!' : ` (best ${fmt(best)})`}  +${pts}`, 4); [784, 988, 1175, 1568].forEach((f, k) => setTimeout(() => tone('triangle', f, f, .16, .18), k * 100)); }
  let cool = 0;
  function update(dt) { if (!built) { if (!H.places) return; build(); setGate(-1); } cool = Math.max(0, cool - dt);
    for (const g of gates) g.userData.ring.rotation.z += dt * .4;
    const h = H.mounted, p = h ? h.pos : P.pos;
    if (!R) { if (h && !cool && H.speed > 4) { const g0 = gates[0].position; if (Math.hypot(p.x - g0.x, p.z - g0.z) < 4.6) { start(); cool = 3; } } return; }
    if (!h) { R = null; setGate(-1); el.className = ''; msg('Race abandoned — stay in the saddle', 2); cool = 3; return; }
    R.t += dt; if (R.t > 300) { R = null; setGate(-1); el.className = ''; return; }
    const g = gates[R.i].position; if (Math.hypot(p.x - g.x, p.z - g.z) < 5 && Math.abs(p.y - g.y) < 6) { tone('sine', 1320, 1760, .1, .14); if (R.i === 0) { finish(); cool = 4; return; } R.i = (R.i + 1) % gates.length; setGate(R.i); }
    el.innerHTML = `${fmt(R.t)}<small>GATE ${R.i === 0 ? gates.length : R.i} / ${gates.length}${best ? ' · BEST ' + fmt(best) : ''}</small>`; }
  return { update, get best() { return best; }, get racing() { return !!R; }, gates };
}
