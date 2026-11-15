// v58 FRONTIER EVENTS
//  🚨 STAGECOACH ROBBERY: every few minutes outlaws ambush the stagecoach. It stops; drop every robber to save it (+800 each
//     rider nearby). Host-run (outlaws are host-authoritative); clients get the banner, pin and payout via 'rb'.
//  📜 WANTED POSTER: a new named outlaw every day (same for everyone), hiding out somewhere on the range with two henchmen.
//     The poster hangs by the sheriff at the main gate. Bring him down for +2,500 (once a day).
import * as THREE from 'three';
const FIRST = ['Black', 'Dusty', 'One-Eyed', 'Rattlesnake', 'Mad', 'Silver', 'Cold', 'Lucky', 'Dead-Eye', 'Whiskey', 'Iron', 'Smilin\''];
const LAST = ['Jack Kane', 'Bart Malloy', 'Jesse Crow', 'Pete Harlan', 'Clay Mercer', 'Sam Boone', 'Ned Varga', 'Cole Ruckus', 'Hank Dolan', 'Wes Tolliver', 'Jim Garrow', 'Rufus Pike'];
export function createEvents({ scene, H, P, T, hAt, msg, sfx, send, role }) {
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const host = () => (role ? role() : 'solo') !== 'client', Zs = () => H.zombies;
  const ST = () => H.stats || (H.stats = {}), bump = k => { const s = ST(); s[k] = (s[k] || 0) + 1; try { localStorage.setItem('hr_stats', JSON.stringify(s)); } catch (_) {} };
  const award = (p, kind) => { const g = H.guns && H.guns.state; if (g) { g.score += p; H.guns.save && H.guns.save(); } H.lb && H.lb.add(p, kind); };
  const hash = n => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
  // ---------------- robbery ----------------
  let rob = null, robT = 95 + Math.random() * 60;
  function robStart() { const C = H.townLife && H.townLife.coach, Z = Zs(); if (!C || !Z || !Z.spawnOutlaw) return; const cx = C.position.x, cz = C.position.z; const list = [];
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.random() * .6, d = 7 + Math.random() * 4, x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d; const o = Z.spawnOutlaw(x, z, hAt(x, z), Math.atan2(cx - x, cz - z), ''); if (o) { o.hostile = true; o.post = [x, z]; list.push(o); } }
    if (!list.length) return; rob = { list, t: 0, x: cx, z: cz }; H.coachHalt = true; H.robPos = [cx, cz]; banner(true); send && send({ t: 'rb', a: 1, x: +cx.toFixed(1), z: +cz.toFixed(1) }); }
  function banner(on, saved) { if (on) { msg('🚨 Outlaws are robbing the stagecoach! Ride out and stop them', 4); [660, 520, 660, 520].forEach((f, i) => setTimeout(() => tone('square', f, f, .18, .14), i * 200)); }
    else if (saved) { msg('🛡️ Stagecoach saved! The driver tips you +800', 3.5); bump('robberies'); [784, 988, 1175].forEach((f, i) => setTimeout(() => tone('triangle', f, f, .18, .18), i * 110)); } else msg('💨 The robbers got away with the strongbox', 3); }
  function robEnd(saved) { const r = rob; rob = null; H.coachHalt = false; H.robPos = null; robT = 170 + Math.random() * 120; if (saved && r && Math.hypot(P.pos.x - r.x, P.pos.z - r.z) < 180) award(800); banner(false, saved); send && send({ t: 'rb', a: 0, s: saved ? 1 : 0, x: r ? r.x : 0, z: r ? r.z : 0 }); }
  function robTick(dt) { if (!host()) return; if (!rob) { const C = H.townLife && H.townLife.coach; if (!C) return; if (Math.hypot(P.pos.x - C.position.x, P.pos.z - C.position.z) > 320) return; if ((robT -= dt) <= 0) robStart(); return; }
    rob.t += dt; if (rob.list.every(o => !o.alive)) robEnd(true); else if (rob.t > 180) { for (const o of rob.list) o.hostile = o.alive; robEnd(false); } }
  // ---------------- wanted poster ----------------
  const day = () => Math.floor(Date.now() / 864e5); let W = null;
  function wantedFor(d) { const h1 = hash(d), h2 = hash(d + 7.3), h3 = hash(d + 19.1), name = `${FIRST[Math.floor(h1 * FIRST.length)]} ${LAST[Math.floor(h2 * LAST.length)]}`; const town = H.places && H.places.town; if (!town) return null; const Z = Zs();
    for (let k = 0; k < 40; k++) { const a = hash(d * 3.1 + k) * Math.PI * 2, r = 320 + hash(d * 5.7 + k) * 380, x = town[0] + Math.sin(a) * r, z = town[1] + Math.cos(a) * r; if (Z && Z.goodGround && !Z.goodGround(x, z)) continue; if (Math.abs(x) > (H.WALK || 1000) - 40 || Math.abs(z) > (H.WALK || 1000) - 40) continue;
      const dirs = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'], ang = Math.atan2(x - town[0], -(z - town[1])); return { d, name, x, z, dir: dirs[(Math.round(ang / (Math.PI / 4)) + 8) % 8], dist: Math.round(r / 10) * 10, reward: 2500, h3 }; }
    return null; }
  const claimed = () => { try { return +(localStorage.getItem('hr_wanted') || -1) === day(); } catch (_) { return false; } };
  let posterTex = null, posterMesh = null, posterFor = -1, readT = 0;
  function poster() { if (!W) return; const s = T.structs.find(q => q.kind === 'town'); if (!s) return; if (!posterTex) { const c = document.createElement('canvas'); c.width = 256; c.height = 340; posterTex = new THREE.CanvasTexture(c); posterTex.colorSpace = THREE.SRGBColorSpace;
      posterMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.46), Object.assign(new THREE.MeshStandardMaterial({ map: posterTex, roughness: .9 }), { defines: { STY_SHARP: '' } })); const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.9, .12), new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: .9 }));
      const [x, z] = T.toW(s, 6.8, 22.4), y = Math.min(hAt(x, z), s.y0 + .6); board.position.set(x, y + 1.45, z); board.rotation.y = (s.rot || 0) + Math.PI; /* inside the main gate beside the sheriff, facing into town */ posterMesh.position.set(0, .45, .07); board.add(posterMesh); board.castShadow = true; scene.add(board); W.board = board; }
    if (posterFor === W.d + (claimed() ? .5 : 0)) return; posterFor = W.d + (claimed() ? .5 : 0); const g = posterTex.image.getContext('2d'); g.fillStyle = '#e8d6a8'; g.fillRect(0, 0, 256, 340); g.strokeStyle = '#6a4a24'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 328);
    g.fillStyle = '#3a2210'; g.textAlign = 'center'; g.font = '900 48px Georgia, serif'; g.fillText('WANTED', 128, 62); g.font = '700 14px Georgia, serif'; g.fillText('DEAD OR ALIVE', 128, 84);
    g.fillStyle = '#5a3a1e'; g.beginPath(); g.arc(128, 150, 44, 0, 7); g.fill(); g.fillStyle = '#2a1608'; g.fillRect(84, 102, 88, 22); g.fillRect(70, 120, 116, 8); // silhouette in a hat
    g.fillStyle = '#3a2210'; g.font = '900 20px Georgia, serif'; const parts = W.name.split(' '); g.fillText(parts.slice(0, -1).join(' ').toUpperCase(), 128, 228); g.fillText(parts.slice(-1)[0].toUpperCase(), 128, 252);
    g.font = '900 34px Georgia, serif'; g.fillStyle = claimed() ? '#8a1a14' : '#3a2210'; g.fillText(claimed() ? 'CAUGHT' : '$2,500', 128, 300); posterTex.needsUpdate = true; }
  let crew = null;
  function wantedTick(dt) { const d = day(); if (!W || W.d !== d) { W = wantedFor(d); crew = null; posterFor = -1; } if (!W) return; poster(); H.wantedPos = claimed() ? null : [W.x, W.z];
    if (W.board) { const b = W.board.position, dd = Math.hypot(P.pos.x - b.x, P.pos.z - b.z); readT = Math.max(0, readT - dt); if (dd < 3 && !readT) { readT = 30; msg(claimed() ? `📜 ${W.name} is behind bars. A new face goes up tomorrow.` : `📜 WANTED: ${W.name} — last seen ${W.dist} m ${W.dir} of town. Reward $2,500 (follow WANTED on the compass)`, 5); } }
    if (claimed()) return; const near = Math.hypot(P.pos.x - W.x, P.pos.z - W.z);
    if (!crew && near < 170 && host()) { const Z = Zs(); if (!Z || !Z.spawnOutlaw) return; crew = []; for (let i = 0; i < 3; i++) { const a = i * 2.1, r = i ? 6 : 0, x = W.x + Math.sin(a) * r, z = W.z + Math.cos(a) * r; const o = Z.spawnOutlaw(x, z, hAt(x, z), a, ''); if (!o) continue; o.hostile = true;
        if (!i) { o.boss = true; o.wantedName = W.name; o.K = Object.assign({}, o.K, { hp: 700, dmg: (o.K.dmg || 5) * 2, s: 1.15, range: 42 }); o.hp = 700; const m = o.g && o.g.children[0]; if (m) m.scale.setScalar(1.15); } crew.push(o); }
      msg(`🤠 You've found ${W.name}'s camp — take him down!`, 3); }
    if (crew && crew.length && !crew[0].alive && !claimed()) { try { localStorage.setItem('hr_wanted', String(d)); } catch (_) {} if (near < 220) { award(2500, 'boss'); bump('wanted'); } msg(`📜 ${W.name} brought to justice!  +2,500`, 4); [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone('triangle', f, f, .16, .18), i * 100)); posterFor = -1; } }
  function netIn(m) { if (!m || m.t !== 'rb' || host()) return; if (m.a) { H.robPos = [m.x, m.z]; H.coachHalt = true; banner(true); } else { H.robPos = null; H.coachHalt = false; if (m.s && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < 180) award(800); banner(false, !!m.s); } }
  return { update(dt) { try { robTick(dt); wantedTick(dt); } catch (e) { console.warn('events', e); } }, netIn, get robbery() { return rob; }, get wanted() { return W; }, startRobbery: robStart };
}
