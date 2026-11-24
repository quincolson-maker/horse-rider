// v89 NIGHT RAIDS: once a night, when you are near town, a horde marches on one of the four palisade gates.
// A plank barricade goes up across the gate. The raiders ignore you unless you get close and batter it down.
// Kill every raider before the barricade breaks for a big payout. If the gate falls the raid is lost,
// although the town itself stays a safe zone. The host runs it, and the zombies sync to everyone as usual.
import * as THREE from 'three';
export function createRaid({ scene, H, P, hAt, msg, sfx, mobile, fx }) {
  const R = { on: false, hp: 0, max: 100, gate: null, raiders: [], kills: 0, waves: 0, doneCyc: -1, warnT: 0, spawnQ: [] };
  try { R.doneCyc = +(localStorage.getItem('hr_raid') || -1); } catch (_) {}
  const cyc = () => Math.floor(Date.now() / 1200000), Z = () => H.zombies, host = () => !Z() || Z().state.role() !== 'client';
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const bell = () => { for (let i = 0; i < 4; i++) setTimeout(() => { tone('sine', 523, 520, 1.4, .35); tone('sine', 1046, 1040, 1, .12); }, i * 900); };
  const ST = () => H.stats || (H.stats = {}), bump = k => { const s = ST(); s[k] = (s[k] || 0) + 1; try { localStorage.setItem('hr_stats', JSON.stringify(s)); } catch (_) {} };
  const award = (p, kind) => { const g = H.guns && H.guns.state; if (g) { g.score += p; H.guns.save && H.guns.save(); } H.lb && H.lb.add(p, kind); };
  const gateName = g => Math.abs(g.nz) > Math.abs(g.nx) ? (g.nz < 0 ? 'North' : 'South') : (g.nx > 0 ? 'East' : 'West');

  // ---- barricade: planks + cross braces across the gateway; it shakes when hit and splinters when it breaks ----
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5636, roughness: .9 }), iron = new THREE.MeshStandardMaterial({ color: 0x3a3836, metalness: .6, roughness: .5 });
  const bar = new THREE.Group(); bar.visible = false; scene.add(bar); const inner = new THREE.Group(); bar.add(inner);
  function buildBar(half) { inner.clear(); const W = half * 2 + .4;
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(W, .34, .09), wood); p.position.set(0, .35 + i * .4, (i % 2) * .05); p.rotation.z = (i % 3 - 1) * .015; p.castShadow = !mobile; inner.add(p); }
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.16, Math.hypot(W, 2.4) * .98, .1), wood); b.position.set(0, 1.35, .12); b.rotation.z = s * Math.atan2(W, 2.4); inner.add(b); }
    for (let i = 0; i < 12; i++) { const n = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .05), iron); n.position.set((i % 4 - 1.5) * W / 4, .35 + Math.floor(i / 4) * .8, .1); inner.add(n); } }

  // ---- HUD ----
  let el = null; const hud = () => { if (!el) { el = document.createElement('div'); el.id = 'hrRaid'; el.style.cssText = 'position:fixed;left:12px;top:58px;max-width:180px;z-index:30;pointer-events:none;font:800 12px system-ui,sans-serif;color:#ffe3b0;text-shadow:0 1px 3px #000;text-align:left;display:none'; el.innerHTML = '<div class="t"></div><div style="width:180px;height:8px;margin:3px 0 0;background:#0008;border:1px solid #ffd27a66;border-radius:5px;overflow:hidden"><i style="display:block;height:100%;background:linear-gradient(90deg,#c8642a,#f0b040);width:100%"></i></div>'; document.body.appendChild(el); } return el; };

  function start(gate) { const z = Z(); if (!z) return; R.on = true; R.gate = gate; R.max = R.hp = 100; R.armor = (() => { try { return localStorage.getItem('hr_gate') === '1'; } catch (_) { return false; } })(); R.kills = 0; R.raiders = []; R.waves = 0; R.doneCyc = cyc(); try { localStorage.setItem('hr_raid', String(R.doneCyc)); } catch (_) {}
    buildBar(gate.half); bar.position.set(gate.x, gate.y, gate.z); bar.rotation.y = gate.ang; bar.visible = true; R.shake = 0;
    const n = mobile ? 10 : 16, w = z.state.wave || 1; R.total = n + 1;
    for (let b = 0; b < 3; b++) R.spawnQ.push({ t: b * 9, n: b === 2 ? n - 2 * Math.floor(n / 3) : Math.floor(n / 3), boss: b === 2 });
    msg(`🔔 NIGHT RAID! The dead are marching on the ${gateName(gate)} Gate — hold the barricade!`, 5); bell(); H.vib && H.vib(80); }
  function spawnBurst(q) { const z = Z(), g = R.gate; const kinds = ['walker', 'coyote', 'runner', 'crawler', 'lawman', 'bloater', 'torch', 'walker', 'coyote', 'screamer'];
    for (let i = 0; i < q.n + (q.boss ? 1 : 0); i++) { const d = 55 + Math.random() * 20, side = (Math.random() - .5) * 30, tx = -g.nz, tz = g.nx; // tangent
      const x = g.x + g.nx * d + tx * side, zz = g.z + g.nz * d + tz * side, k = q.boss && i === q.n ? 'brute' : kinds[(i + R.waves * 3) % kinds.length];
      try { const o = z.spawnKind(k, [x, zz]); o.raid = R.gate; o.raidSlot = (Math.random() - .5) * g.half * 1.4; R.raiders.push(o); } catch (e) { console.warn('raid spawn', e); } }
    R.waves++; if (R.waves > 1) msg(q.boss ? 'A brute leads the last wave in!' : 'More of them coming up the road…', 2.5); }

  // zombie AI hook: returns 1 while bashing (handled), a target point to walk to, or null to fight a nearby player normally
  function hook(o, dt) { const g = o.raid; if (!R.on || g !== R.gate) { o.raid = null; return null; }
    for (const p of [P.pos]) if (Math.hypot(p.x - o.pos.x, p.z - o.pos.z) < 5 && !(Z().inSafeZone && Z().inSafeZone(p.x, p.z))) return null; // you came out to fight
    const tx = -g.nz, tz = g.nx, gx = g.x + g.nx * 1.3 + tx * o.raidSlot, gz = g.z + g.nz * 1.3 + tz * o.raidSlot, d = Math.hypot(gx - o.pos.x, gz - o.pos.z);
    if (d > 1.1) return [gx, gz];
    o.sp = 0; o.st = 1; const want = Math.atan2(g.nx, g.nz); o.yaw += Math.atan2(Math.sin(want - o.yaw), Math.cos(want - o.yaw)) * Math.min(1, dt * 6);
    o.cd -= dt; if (o.cd <= 0) { o.cd = o.K.cd * 1.2;
      if (o.kind === 'bloater') { o.hp = 0; Z().damage(o, 9999, false, o.pos, null, 'bandit'); hitGate(8); }
      else hitGate(o.kind === 'brute' ? 2.5 : o.kind === 'lawman' ? .8 : .45); }
    return 1; }
  function hitGate(d) { if (!R.on) return; R.hp = Math.max(0, R.hp - d * (R.armor ? .6 : 1)); R.shake = .25; if (sfx && sfx.at && sfx.ctx) sfx.at(bar.position, () => { sfx.nz('lowpass', 380, 1, .12, .7); tone('square', 90, 60, .08, .25); }, .5);
    if (R.hp <= 0) end(false); }
  function end(win, quiet) { if (!R.on) return; R.on = false; R.spawnQ.length = 0;
    for (const o of R.raiders) o.raid = null;
    if (win) chest(R.gate);
    if (win) { const p = 600 + R.kills * 40 + Math.round(R.hp * 6); award(p, 'raid'); bump('raids'); msg(`🏆 RAID REPELLED — the ${gateName(R.gate)} Gate held at ${Math.round(R.hp)}%  +${p}`, 5); tone('triangle', 523, 784, .5, .4); H.vib && H.vib([40, 40, 80]); }
    else if (!quiet) { const p = R.kills * 25; if (p) award(p, 'raid'); msg(`💥 The ${gateName(R.gate)} Gate fell! The town still stands — they can't get past the stakes.${p ? '  +' + p : ''}`, 5); }
    else msg('🌅 Dawn — the raiders scatter.', 3);
    if (!win && fxSplinter) fxSplinter(); bar.visible = false; if (el) el.style.display = 'none'; }
  // v128 the town's thank-you: a strongbox appears inside the gate after a win (USE to open: 300-900 + a few apples)
  function chest(g) { const T = H.town2; if (!T || !T.spots) return; const x = g.x - g.nx * 3, z = g.z - g.nz * 3, y = hAt(x, z), box = new THREE.Group(); box.position.set(x, y, z); box.rotation.y = g.ang; scene.add(box);
    const wd = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: .8 }), mt = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: .9, roughness: .3, emissive: 0x4a3000, emissiveIntensity: .6 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(.9, .5, .55), wd); b.position.y = .25; box.add(b); const lid = new THREE.Mesh(new THREE.CylinderGeometry(.275, .275, .9, 12, 1, false, 0, Math.PI), wd); lid.rotation.z = Math.PI / 2; lid.position.y = .5; box.add(lid);
    for (const xx of [-.3, .3]) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(.06, .82, .58), mt); s2.position.set(xx, .4, 0); box.add(s2); }
    H.chestPos = [x, z]; const sp = { x, z, y, kind: 'raidchest', label: 'Open the town\'s strongbox', r: 1.8 }; T.spots.push(sp); if (T.TL) T.TL.raidchest = 'OPEN<small>STRONGBOX</small>';
    const prev = T.onUse; T.onUse = o => { if (o !== sp || sp.used) return prev ? prev(o) : false; sp.used = true; H.chestPos = null; const pts = 300 + ((Math.random() * 7) | 0) * 100; award(pts, 'raid'); if (H.gear) { H.gear.state.apples = Math.min(10, (H.gear.state.apples || 0) + 2); try { localStorage.setItem('hr_gear', JSON.stringify(H.gear.state)); } catch (_) {} }
      msg(`💰 The town's strongbox: +${pts} and 2 apples for your horse`, 3); tone('triangle', 523, 1046, .4, .25); const i = T.spots.indexOf(sp); if (i >= 0) T.spots.splice(i, 1); box.removeFromParent(); return true; }; }
  const fxSplinter = () => { if (fx && fx.debris) fx.debris(bar.position.x, bar.position.y + 1.2, bar.position.z, 0x7a5636, 30, 1.4); };

  function tick(dt) { const z = Z(), pal = H.palisade; if (!z || !pal || !pal.gates) return;
    if (!R.on) { // trigger: host, deep night, near town, once per night
      if (host() && z.state.on !== false && (H.night || 0) > .75 && R.doneCyc !== cyc() && !z.chaos && !H.dead) { let best = null, bd = 260; for (const g of pal.gates) { const d = Math.hypot(g.x - P.pos.x, g.z - P.pos.z); if (d < bd) { bd = d; best = g; } }
        if (best) { R.warnT += dt; if (R.warnT > 4) { R.warnT = 0; start(pal.gates[(Math.random() * 4) | 0]); } } } return; }
    for (const q of R.spawnQ) q.t -= dt; while (R.spawnQ.length && R.spawnQ[0].t <= 0) spawnBurst(R.spawnQ.shift());
    // count kills
    for (let i = R.raiders.length - 1; i >= 0; i--) { const o = R.raiders[i]; if (!o.alive || !z.list.includes(o)) { if (!o.alive) R.kills++; R.raiders.splice(i, 1); } }
    if (!R.spawnQ.length && !R.raiders.length) return end(true);
    if ((H.night || 0) < .15) return end(false, true);
    if (R.shake > 0) { R.shake -= dt; inner.position.x = Math.sin(R.shake * 90) * .05 * (R.shake / .25); inner.rotation.z = Math.sin(R.shake * 70) * .02; } else { inner.position.x = 0; inner.rotation.z = 0; }
    const e = hud(); e.style.display = H.uiOpen ? 'none' : 'block'; const left = R.raiders.length + R.spawnQ.reduce((a, q) => a + q.n + (q.boss ? 1 : 0), 0);
    const t = `🌙 NIGHT RAID · ${gateName(R.gate).toUpperCase()} GATE ${Math.round(R.hp)}% · ${left} left`; if (e.firstChild.textContent !== t) { e.firstChild.textContent = t; e.querySelector('i').style.width = R.hp + '%'; } }
  if (H.zombies) H.zombies.state.raidHook = hook;
  R.item = { state: { id: 'gatearmor', name: '🛡️ Iron-banded barricades · raid gates take 40% less damage', price: 1200, get owned() { try { return localStorage.getItem('hr_gate') === '1'; } catch (_) { return false; } }, maxed: false, get label() { return this.owned ? 'OWNED' : ''; } },
    buy() { const g = H.guns; if (!g || g.pts() < 1200) { msg('Not enough points', 1.5); return; } g.state.spent = (g.state.spent || 0) + 1200; g.save && g.save(); try { localStorage.setItem('hr_gate', '1'); } catch (_) {} R.armor = true; msg('🛡️ The town blacksmith bands every gate barricade with iron', 3); }, toggle() { msg('Already fitted to every gate', 1.4); } }; // v148
  R.tick = tick; R.start = g => start(g || H.palisade.gates[0]); R.end = end; R.hook = hook;
  return R;
}
