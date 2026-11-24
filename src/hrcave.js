// v38 BANDIT FALLS — a waterfall bandit hideout cut into a mountainside, held by outlaws who guard a vault.
// The cave itself (rock shell, falls, bar, stage, tables, vault, lights, colliders, markers) is ChatGPT-generated code supplied
// by Quin (src/hrbanditcave.js, credited in CREDITS.md). This file places it in our world — a flattened notch in a hillside,
// picked the same way on every machine — and wires it into our controller (walls + floors), guns (rock stops bullets),
// host-authoritative co-op (the host runs the outlaws and the vault) and game points. Points are game points only.
import { mergeStatic } from './hrmerge.js?v=336';
import { CAVE_CUT } from './hrworld.js?v=336';
import * as THREE from 'three';
import { createHideout } from './hrhideout.js?v=336';
import { createFalls, baseZ } from './hrfalls.js?v=336';
import { makeFrontierCharacter } from './hrcharacters.js?v=336';
import { poseDoll } from './hrsaloon.js?v=336';

export const CAVE = { chest: 2500, dance: 50, slotBet: 10, outlaw: 60, outlawHead: 75 };
const FU = 40, FV0 = -59, FV1 = 8, BL = 16, BS = 5; // footprint in the cave's own frame (u across, v out of the mouth); terrain blend: 16 m apron in front, 5 m to the sides and back (the hill meets the rock)
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const toLocal = (S, x, z) => { const dx = x - S.x, dz = z - S.z, c = Math.cos(S.rot), s = Math.sin(S.rot); return [dx * c - dz * s, dx * s + dz * c]; };
export const toWorld = (S, u, v) => { const c = Math.cos(S.rot), s = Math.sin(S.rot); return [S.x + u * c + v * s, S.z - u * s + v * c]; };
// world-space rectangle of the footprint (+ m) — the rotation is a multiple of 90 degrees, so it is exact
export function caveRect(S, m = 0, front = 0) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const [u, v] of [[-FU - m, FV0 - m], [FU + m, FV0 - m], [-FU - m, FV1 + m + front], [FU + m, FV1 + m + front]]) { const [x, z] = toWorld(S, u, v); a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, z); d = Math.max(d, z); }
  return { x: (a + b) / 2, z: (c + d) / 2, hw: (b - a) / 2, hd: (d - c) / 2 }; }

// Deterministic site: the mouth faces the pen, 240-360 m out, on a flat apron, with ground rising behind (into the hill).
export function pickCaveSite(hAt, F, o) { const { PEN, WALK } = o, tops = (F.trails || []).map(t => t.top);
  for (let pass = 0; pass < 2; pass++) { let best = null; const maxR = pass ? 9 : 5, minRise = pass ? -20 : 3;
    for (let k = 0; k < 4; k++) { const rot = k * Math.PI / 2, ix = -Math.sin(rot), iz = -Math.cos(rot), px = Math.cos(rot), pz = -Math.sin(rot);
      for (let d = 240; d <= 360; d += 12) for (let l = -216; l <= 216; l += 24) { const S = { x: PEN.x - ix * 0 + ix * d + px * l, z: PEN.z + iz * d + pz * l, rot };
        // the mouth (local +v) must face back toward the pen: the interior runs away from it
        let ok = true; for (const [u, v] of [[-FU - 20, FV0 - 20], [FU + 20, FV0 - 20], [-FU - 20, FV1 + 24], [FU + 20, FV1 + 24]]) { const [x, z] = toWorld(S, u, v); if (Math.abs(x) > WALK - 40 || Math.abs(z) > WALK - 40) ok = false; } if (!ok) continue;
        let a = 1e9, b = -1e9, sum = 0, n = 0; for (let u = -10; u <= 10; u += 5) for (let v = 2; v <= 16; v += 3.5) { const [x, z] = toWorld(S, u, v), h = hAt(x, z); a = Math.min(a, h); b = Math.max(b, h); sum += h; n++; }
        const range = b - a; if (range > maxR) continue; const y0 = sum / n;
        let rise = 0, rn = 0, lo = 1e9; for (let u = -36; u <= 36; u += 12) for (let v = -54; v <= -14; v += 10) { const [x, z] = toWorld(S, u, v), h = hAt(x, z) - y0; rise += h; rn++; lo = Math.min(lo, h); } rise /= rn; if (rise < minRise || rise > 55) continue;
        const sc = range * 2 + Math.abs(rise - 14) * .3 + Math.max(0, -lo) * .5 + Math.abs(l) * .004 + (d - 240) * .004; if (best && sc >= best.sc) continue;
        for (const t of tops) if (Math.hypot(t[0] - S.x, t[1] - S.z) < 110) ok = false; if (!ok) continue;
        for (let u = -FU - 12; u <= FU + 12 && ok; u += 8) for (let v = FV0 - 12; v <= FV1 + 20 && ok; v += 8) { const [x, z] = toWorld(S, u, v); if (o.avoid(x, z) || F.waterDist(x, z) < 6 || F.trailDist(x, z) < 8) ok = false; } if (!ok) continue;
        best = { ...S, y0, sc, rise: +rise.toFixed(1), range: +range.toFixed(2), d, l, pass }; } }
    if (best) return best; }
  return null; }

// the terrain notch: flat under the footprint (a dip under the falls pool), blending back into the hill over 16 m
export function makePad(S) { const R = 150; return (x, z, h) => { if (Math.abs(x - S.x) > R || Math.abs(z - S.z) > R) return h; const [u, v] = toLocal(S, x, z);
  const du = Math.max(0, Math.abs(u) - (FU + 1)), dv = Math.max(0, FV0 - 1 - v, v - FV1), dist = Math.hypot(du, dv), w = v > FV1 ? BL : BS; if (dist >= w) return h;
  const p = (u / 9.6) ** 2 + ((v - 4.4) / 4.7) ** 2 < 1 || (Math.abs(u) < 3 && v > -1.4 && v < 4.4) ? S.y0 - .45 : S.y0 - .08; /* v41: an oval pool basin in front of the mouth */ return mound(u, v, h, dist <= 0 ? p : p + (h - p) * sstep(0, w, dist)); };
  // v42: the hideout lies inside a mountain: behind the cliff line the ground rises to (at least) 15 m over the cave floor
  function mound(u, v, h, r) { const cl = Math.max(FV0 - 1, baseZ(u) - 4); if (v > cl) return r; const MU = FU + 2, du = Math.max(0, Math.abs(u) - MU), dv = Math.max(0, FV0 - 1 - v), dm = Math.hypot(du, dv); if (dm >= 22) return r;
    const top = Math.max(h, S.y0 + 18 + 2 * (Math.sin(u * .07) + Math.cos(v * .09))); return Math.max(r, r + (top - r) * (1 - sstep(0, 22, dm)) * sstep(0, 4, cl - v)); } }

const OUTLAW_LOOKS = [{ coat: 0x3a2a1c, hatC: 0x15100c, bandana: 0x7a1612, top: 0x4a3a2a, hair: 0x22160e, skin: 0xd0a07a, rifle: true }, { coat: 0x26221f, hatC: 0x2a1e14, bandana: 0x161616, top: 0x5a2a1e, hair: 0x4a3018, skin: 0xb88664 },
  { coat: 0x4c3a26, hatC: 0x1c1610, bandana: 0x2a3a5a, top: 0x3a3a30, hair: 0x18120c, skin: 0x9a6a4a, rifle: true }, { coat: 0x5a2a1a, hatC: 0x2c2018, bandana: 0x6a5a1a, top: 0x2a2a2a, hair: 0x6a4a2a, skin: 0xe0b090 }];
const CAVE_DANCERS = [{ name: 'Rosa', top: 0x2a6a4a, skirt: 0x1f7a52, trim: 0xf0d890, feather: 0xffe08a, hair: 0x2a160c, long: true, skin: 0xd8a07a, legs: 0x16121a, shoe: 0x111111 },
  { name: 'Maisie', top: 0x5a2a8a, skirt: 0x6e34a6, trim: 0x111111, feather: 0xd0a0ff, hair: 0xd8b060, long: true, skin: 0xf2caa8, legs: 0x18121a, shoe: 0x111111 },
  { name: 'Lou', top: 0xc06a10, skirt: 0xd8801a, trim: 0x2a1a10, feather: 0xffc060, hair: 0x5a2a14, long: false, skin: 0xb8805a, legs: 0x16121a, shoe: 0x111111 }];
const REEL = ['🍒', '🔔', '⭐', '💎', '🐎', '7'];
const PH = ['idle', 'fight', 'key', 'open'];

export function createCave(c) {
  const { scene, H, P, T, hAt, sfx, msg, mobile, site: S } = c, g = () => H.guns;
  const cave = createHideout({ position: new THREE.Vector3(S.x, S.y0, S.z), rotationY: S.rot, quality: mobile || c.low ? 'low' : 'high', viewDist: mobile ? 240 : 340 }); // v42: the new three-level hideout
  scene.add(cave.group); const falls = createFalls({ position: new THREE.Vector3(S.x, S.y0, S.z), rot: S.rot, high: !(mobile || c.low) }); scene.add(falls.group); cave.group.updateMatrixWorld(true); falls.group.updateMatrixWorld(true); H.fallsPool = { c: falls.group.localToWorld(new THREE.Vector3(0, -.16, 4.4)), shore: falls.group.localToWorld(new THREE.Vector3(0, 0, 10.6)), rot: S.rot, toW: (x, z) => falls.group.localToWorld(new THREE.Vector3(x, -.16, z)) }; // v62 fishing
  if (mobile) cave.lights.forEach((l, i) => { if (i >= 2) l.removeFromParent(); });
  cave.group.updateMatrixWorld(true); for (const l of cave.lights) if (l.parent) scene.attach(l); // v42: lamps live in the scene, not the (often hidden) cave group: hiding them changed the light count and recompiled every shader // phones: two of the five lamps (each lamp costs every lit pixel)
  const BOX = cave.colliders, WALLS = BOX.filter(b => b.max.y - b.min.y > .65), ALL = new THREE.Box3(); for (const b of BOX) ALL.union(b); ALL.expandByScalar(1);
  const IN = caveRect(S, 2), R = { ...caveRect(S, 2), name: 'BANDIT FALLS', label: '🛡 NO ZOMBIES · BANDIT FALLS' }; (H.safeRects || (H.safeRects = [])).push(R);
  const inside = (x, z) => Math.abs(x - IN.x) < IN.hw && Math.abs(z - IN.z) < IN.hd, deep = (x, z) => { const [u, v] = toLocal(S, x, z); return Math.abs(u) < FU && v < -3 && v > FV0; };
  const out = { site: S, cave, rect: R, inside, deep, state: { phase: 0, left: 0, key: null, startedAt: 0 } };
  // ---- collisions: height-aware walls, walkable box tops, bullets stop on rock ----
  out.wallHit = (x, z, r, y) => { if (falls.hit(x, z, r, y)) return true; if (x < ALL.min.x - r || x > ALL.max.x + r || z < ALL.min.z - r || z > ALL.max.z + r) return false;
    for (const b of WALLS) { if (b.isEmpty() || y + 1.7 < b.min.y || y + .4 > b.max.y) continue; const cx = Math.max(b.min.x, Math.min(x, b.max.x)), cz = Math.max(b.min.z, Math.min(z, b.max.z)); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true; } return false; };
  CAVE_CUT.value.set(S.x, S.z, S.rot, S.y0);
  const under = out.under = (x, z, y) => { const [u, v] = toLocal(S, x, z); if (Math.abs(u) < 3.4 && v < 1.6 && v > -15 && y < S.y0 + 4.8) return true; /* the entrance tunnel: indoors whatever the mountain above does */ return Math.abs(u) < FU && v < 2.2 && v > FV0 && y < c.hAt(x, z) - 1.5; };
  out.floorAt = (x, z, y, base) => { if (x < ALL.min.x || x > ALL.max.x || z < ALL.min.z || z > ALL.max.z) return base; const und = under(x, z, y); let f = und ? -1e9 : base;
    for (const b of BOX) { if (b.isEmpty() || x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue; if (b.max.y <= y + .55 && b.max.y > f) f = b.max.y; } return f === -1e9 ? base : f; };
  out.groundAt = (x, z, y) => under(x, z, y) ? out.floorAt(x, z, y, -1e9) : null;
  const cDir = new THREE.Vector3();
  const fireW = cave.fireAt ? cave.fireAt() : null, riverW = cave.riverAt ? cave.riverAt() : null; out.fireAt = () => fireW; out.riverAt = () => riverW;
  out.camClip = (from, to) => { if (!out.underP && !under(from.x, from.z, from.y)) return; cDir.subVectors(to, from); const L = cDir.length(); if (L < .05) return; cDir.divideScalar(L);
    const t = out.rayHit(from, cDir, L); if (t > 0) to.copy(from).addScaledVector(cDir, Math.max(.3, t - .35));
    const cl = cave.ceilAt(to.x, to.y, to.z); if (to.y > cl - .25) to.y = Math.max(from.y - .3, cl - .25); };
  const ray = new THREE.Ray(), hp = new THREE.Vector3();
  out.rayHit = (o, d, maxT) => { ray.origin.copy(o); ray.direction.copy(d); if (!ray.intersectBox(ALL, hp) && !ALL.containsPoint(o)) return -1; let best = -1;
    for (const b of WALLS) { if (b.isEmpty()) continue; if (ray.intersectBox(b, hp)) { const t = hp.distanceTo(o); if (t > .05 && t < maxT && (best < 0 || t < best)) best = t; } } return best; };
  const A = new THREE.Vector3(), Dd = new THREE.Vector3();
  out.los = (ax, ay, az, bx, by, bz) => { A.set(ax, ay, az); Dd.set(bx - ax, by - ay, bz - az); const L = Dd.length(); if (L < .1) return true; Dd.divideScalar(L); const t = out.rayHit(A, Dd, L - .3); return !(t > 0); };
  // ---- the people of the hideout: three dancers on the stage (adult, fully costumed), the outlaws (zombie-system 'outlaw' kind) ----
  const dancers = cave.dancerSpots.map((p, i) => { const D = makeFrontierCharacter({ kind: 'dancer', ...CAVE_DANCERS[i], quality: 'low' }); try { mergeStatic(D.g); } catch (_) {} D.g.position.copy(p); D.g.rotation.y = S.rot - Math.PI / 2; D.baseYaw = S.rot - Math.PI / 2; D.t = i * 1.3; D.cheer = 0; scene.add(D.g); return D; });
  let look = 0; out.outlawBody = () => { const D = makeFrontierCharacter({ kind: 'bandit', ...OUTLAW_LOOKS[look++ % 4], quality: 'low' }); D.g.traverse(m => { if (m.isMesh) m.castShadow = !mobile; });
    return { m: D.g, D, outlaw: true, update(dt, v, o) { poseDoll(D, dt, !o || !o.alive ? 'idle' : o.st === 1 ? 'aim' : v > .3 ? 'walk' : 'idle', v); } }; };
  out.spawnY = (x, z) => { let y = S.y0; for (const s of cave.spawnPoints) if (Math.hypot(s.position.x - x, s.position.z - z) < 2) y = s.position.y; return y; };
  // ---- interaction spots (our USE system) ----
  const IA = id => cave.interactions.find(q => q.id === id), spots = [];
  const sp = (kind, p, label, r = 1.8, extra = {}) => { const o = { kind, x: p.x, y: p.y, z: p.z, label, r, cave: 1, ...extra }; T.spots.push(o); spots.push(o); return o; };
  const lad = IA('ladder'); sp('cave-climb', lad.position, 'Climb to the lookout', 1.6, { to: lad.destination.clone() });
  const top = lad.destination.clone(); sp('cave-down', top, 'Climb down', 1.4, { to: lad.position.clone().add(new THREE.Vector3(0, .1, 0)) });
  sp('drink', IA('bar').position, 'Whiskey at the outlaw bar (20 pts)', 1.8);
  sp('cave-poker', IA('poker').position, 'Poker with the gang (practice chips)', 1.8);
  for (let i = 0; i < 3; i++) sp('cave-slot', IA('slots-' + i).position, 'Lucky Strike slots (' + CAVE.slotBet + ' pts a pull)', 1.1);
  for (let i = 0; i < 3; i++) { const p = IA('dance-' + i).position.clone(); p.y = S.y0; sp('cave-dance', p, 'Tip ' + CAVE_DANCERS[i].name + ' (' + CAVE.dance + ' pts)', 1.4, { i }); }
  const gateSp = sp('cave-gate', IA('vault-gate').position, '', 2.2), keySp = sp('cave-key', IA('vault-key').position, '', 2.2);
  const chestSp = [0, 1, 2].map(i => sp('cave-chest', IA('chest-' + i).position, '', 1.4, { id: 'chest-' + i }));
  Object.assign(T.TL, { 'cave-climb': 'CLIMB', 'cave-down': 'CLIMB<small>DOWN</small>', 'cave-poker': 'PLAY<small>POKER</small>', 'cave-slot': 'PULL<small>10 PTS</small>', 'cave-dance': 'TIP<small>50 PTS</small>', 'cave-key': 'TAKE<small>KEY</small>', 'cave-chest': 'OPEN', 'cave-gate': 'VAULT' });
  const LK = 'hr_cave_loot', loot = (() => { try { return JSON.parse(localStorage.getItem(LK) || '{}') || {}; } catch (_) { return {}; } })();
  const saveLoot = () => { try { localStorage.setItem(LK, JSON.stringify(loot)); } catch (_) {} };
  const pts = () => { const G = g(); return G ? G.pts() : 0; }, spend = n => { const G = g(); if (!G || G.pts() < n) return false; G.state.spent += n; G.save(); return true; }, earn = n => { const G = g(); if (!G) return; G.state.score += n; G.save(); };
  function labels() { const ph = out.state.phase;
    gateSp.label = ph >= 3 ? '' : ph === 2 ? 'Vault locked — take the key the last outlaw dropped' : 'Vault locked — clear the hideout of outlaws first';
    keySp.label = ph === 2 ? 'Take the vault key' : ''; if (out.state.key) { keySp.x = out.state.key[0]; keySp.y = out.state.key[1] - .5; keySp.z = out.state.key[2]; }
    for (const s of chestSp) s.label = ph < 3 ? '' : loot[s.id] ? 'Empty — you already took this strongbox' : 'Open the strongbox (+' + CAVE.chest.toLocaleString() + ' pts)'; }
  const prevUse = T.onUse;
  T.onUse = o => { if (!o || !o.cave) return prevUse ? prevUse(o) : false;
    if (o.kind === 'cave-climb' || o.kind === 'cave-down') { P.pos.copy(o.to); H.vy = 0; msg(o.kind === 'cave-climb' ? 'Up on the lookout ledge' : 'Back down', 1.2); return true; }
    if (o.kind === 'cave-poker') { const cs = H.saloon && H.saloon.casino; if (cs && cs.open('poker')) msg('The gang deals you into the house game — practice chips only', 2.5); else msg('The table is busy — practice-chip poker is in the saloon too', 2); return true; }
    if (o.kind === 'cave-slot') { if (!spend(CAVE.slotBet)) { msg('A pull is ' + CAVE.slotBet + ' game points', 1.5); return true; } const r = [0, 0, 0].map(() => (Math.random() * 6) | 0), m = r[0] === r[1] && r[1] === r[2] ? 20 : r[0] === r[1] ? 2 : 0, w = m * CAVE.slotBet;
      if (w) earn(w); msg(r.map(i => REEL[i]).join(' ') + (w ? '  — you win ' + w + ' pts!' : '  — no luck'), 2); sfx.tone && sfx.ctx && sfx.tone('square', w ? 880 : 300, w ? 1320 : 200, .12, .2); out.slotPulls = (out.slotPulls || 0) + 1; return true; }
    if (o.kind === 'cave-dance') { if (!spend(CAVE.dance)) { msg('A tip is ' + CAVE.dance + ' game points', 1.5); return true; } const D = dancers[o.i]; D.cheer = 3; msg(CAVE_DANCERS[o.i].name + ' tips her hat — "Thank you kindly, partner!"', 2.2); out.tips = (out.tips || 0) + 1; return true; }
    if (o.kind === 'cave-key') { if (out.state.phase !== 2) return true; if (c.role() === 'client') { c.send({ t: 'cvk' }); msg('You grab the key…', 1); } else openVault(H.me || 'P1'); return true; }
    if (o.kind === 'cave-chest') { if (out.state.phase < 3 || loot[o.id]) return true; loot[o.id] = 1; saveLoot(); earn(CAVE.chest); cave.openChest && cave.openChest(o.id); if (H.guns && !H.guns.state.owned.gatling && H.guns.give('gatling')) { setTimeout(() => msg('Under the gold: a hand-crank GATLING GUN! Press 6 (or cycle 🔫) — hold fire to spin it up', 5), 3200); } msg('Strongbox: gold coin and banknotes — +' + CAVE.chest.toLocaleString() + ' points', 3); sfx.tone && sfx.ctx && sfx.tone('triangle', 660, 1320, .3, .35); return true; }
    if (o.kind === 'cave-gate') { msg(o.label || 'The vault is open', 2); return true; }
    return prevUse ? prevUse(o) : false; };
  // ---- the fight (host authority): guards spawn when someone walks in; the last one down drops the key; the key opens the vault for everyone ----
  const Zs = () => H.zombies, outlaws = () => { const Z = Zs(); return Z ? Z.list.filter(o => o.kind === 'outlaw' && o.alive && !o.hostile) : []; };
  function everyone() { const L = [[P.pos.x, P.pos.z]]; for (const r of (c.remotes ? c.remotes() : [])) if (r && r.s && Number.isFinite(r.s.x)) L.push([r.s.x, r.s.z, r.id]); return L; }
  let lastDown = null, bcT = 0;
  function bc() { bcT = 0; if (c.role() === 'host') c.send({ t: 'cv', p: out.state.phase, n: out.state.left, k: out.state.key, bo: out.state.boss || 0 }); }
  function startFight() { const Z = Zs(); if (!Z || !Z.spawnOutlaw || !Z.state.on) return; cave.startChallenge();
    let deep = null; for (const s of cave.spawnPoints) { const o = Z.spawnOutlaw(s.position.x, s.position.z, s.position.y, s.rotationY, s.role); if (o && (!deep || s.position.y < deep.y)) deep = { o, y: s.position.y }; } // facing out toward the mouth
    if (deep) { makeDiablo(deep.o); out.state.boss = deep.o.id; } // v47: El Diablo holds the deepest level
    Z.state.outlawCalm = true; out.state.phase = 1; out.state.left = cave.spawnPoints.length; out.state.startedAt = performance.now(); msg(out.state.left + ' outlaws guard Bandit Falls. They will leave you be — unless you start shooting. The last one carries the vault key', 5); bc(); }
  function makeDiablo(o) { if (!o || o.boss) return; o.boss = true; o.K = Object.assign({}, o.K, { hp: 900, dmg: (o.K.dmg || 5) * 2.4, s: 1.24, range: 40 }); if (o.hp > 0) o.hp = Math.max(o.hp, 900); const m = o.g && o.g.children[0]; if (m) m.scale.setScalar(1.24); }
  out.makeDiablo = makeDiablo;
  out.provoked = () => msg('You started a gunfight! The outlaws open fire', 2.5);
  out.provoke = () => { const Z = Zs(); if (Z && Z.state.outlawCalm && out.state.phase === 1) { Z.state.outlawCalm = false; out.provoked(); } };
  out.outlawDown = o => { lastDown = o.pos.clone(); };
  function dropKey(at) { if (!cave.state.challenge) cave.startChallenge(); for (const s of cave.spawnPoints) cave.guardDefeated(s.id, at); const k = IA('vault-key').position; out.state.key = [+k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2)]; }
  function showOpen() { if (cave.state.vaultOpen) return; if (!cave.state.keyDropped) dropKey(null); const k = IA('vault-key'); cave.interact('vault-key', k.position); cave.interact('vault-gate', IA('vault-gate').position); }
  function openVault(who) { if (out.state.phase !== 2) return; out.state.phase = 3; showOpen(); msg(who === (H.me || 'P1') ? 'You took the vault key — the iron gate grinds open' : 'The vault gate grinds open', 3); bc(); }
  out.netIn = (m, from) => { if (!m) return; if (m.t === 'cvk' && c.role() !== 'client') { if (out.state.phase !== 2 || !out.state.key) return; const R0 = (c.remotes ? c.remotes() : []).find(q => q.id === from);
      if (!R0 || !R0.s || Math.hypot(R0.s.x - out.state.key[0], R0.s.z - out.state.key[2]) > 6) return; openVault(from); return; }
    if (m.t === 'cv' && c.role() === 'client') { const ph = Math.max(0, Math.min(3, m.p | 0)); if (m.bo) { const Z = Zs(), o = Z && Z.byId && Z.byId(m.bo); if (o) makeDiablo(o); } if (Array.isArray(m.k) && m.k.length === 3 && m.k.every(Number.isFinite)) out.state.key = m.k;
      if (ph === 1 && out.state.phase === 0) msg('Outlaws! They hold Bandit Falls — the last one carries the vault key', 3);
      if (ph >= 2 && !cave.state.keyDropped && out.state.key) dropKey(new THREE.Vector3(out.state.key[0], out.state.key[1] - .5, out.state.key[2]).sub(new THREE.Vector3(0, 0, 0)));
      if (ph === 2 && out.state.phase < 2) msg('The last outlaw dropped the vault key', 2.5);
      if (ph === 3 && out.state.phase < 3) { showOpen(); msg('The vault gate grinds open', 3); }
      out.state.phase = ph; out.state.left = Number.isFinite(m.n) ? m.n : 0; } };
  const cp = new THREE.Vector3(), fallP = cave.group.localToWorld(new THREE.Vector3(0, 3, 2));
  // v38.1: the falls roar — one looped noise source (low rumble + hiss), loudness by distance, built only within 90 m
  let wl = null; out.water = () => wl ? +wl.v.toFixed(3) : 0; // the loudness it is heading for (tests: a suspended context never ramps)
  function waterSound(d) { const ac = sfx.ctx; if (!ac || !sfx.noise || !sfx.master) return;
    if (d < 90 && !wl) { const src = ac.createBufferSource(); src.buffer = sfx.noise; src.loop = true; src.playbackRate.value = .55; const lo = ac.createBiquadFilter(); lo.type = 'lowpass'; lo.frequency.value = 520; const hi = ac.createBiquadFilter(); hi.type = 'bandpass'; hi.frequency.value = 2600; hi.Q.value = .5;
      const hg = ac.createGain(); hg.gain.value = .35; const g = ac.createGain(); g.gain.value = 0; src.connect(lo); lo.connect(g); src.connect(hi); hi.connect(hg); hg.connect(g); g.connect(sfx.master); src.start(); wl = { src, g, nodes: [lo, hi, hg] }; }
    if (!wl) return; const k = Math.max(0, 1 - d / 85), v = .2 * k * k; wl.v = v; wl.g.gain.setTargetAtTime(v, ac.currentTime, .25);
    if (d > 100) { const w = wl; wl = null; w.g.gain.setTargetAtTime(0, ac.currentTime, .1); setTimeout(() => { try { w.src.stop(); w.src.disconnect(); w.g.disconnect(); w.nodes.forEach(n => n.disconnect()); } catch (_) {} }, 600); } }
  out.update = dt => { cp.copy(P.pos); if (H.mounted) cp.copy(H.mounted.pos); cave.update(dt, null, cp); const near = cave.group.visible && cp.distanceToSquared(cave.entrance) < 70 * 70; falls.group.visible = cave.group.visible || cp.distanceToSquared(cave.entrance) < 600 * 600; falls.update(dt, cp.distanceToSquared(cave.entrance) < 160 * 160); waterSound(cp.distanceTo(fallP));
    if (!near) for (const l of cave.lights) l.intensity = 0; // lamps stay in the scene (no shader rebuilds), dark when you are away
    { const und = !H.mounted && under(P.pos.x, P.pos.z, P.pos.y); out.underP = und; const [, lv] = toLocal(S, P.pos.x, P.pos.z), tgt = und ? sstep(-2, -13, lv) : 0; H.caveDark = (H.caveDark || 0) + (tgt - (H.caveDark || 0)) * Math.min(1, dt * 2.5);
      if (und && P.pos.y < S.y0 - 16) { const [x, z] = toWorld(S, 28, -29.5); P.pos.set(x, S.y0 - 6 + .1, z); H.vy = 0; const Z = H.zombies; if (Z && Z.hurtMe) Z.hurtMe(20, 0); msg('You fell into the river — the current washed you back to the ledge', 3); } }
    for (const D of dancers) { D.g.visible = near; if (!near) continue; D.cheer = Math.max(0, D.cheer - dt); poseDoll(D, dt, D.cheer > 0 ? 'cheer' : 'dance'); }
    if (c.role() !== 'client') { const st = out.state;
      if (st.phase === 0 && everyone().some(([x, z]) => deep(x, z))) startFight();
      else if (st.phase === 1) { const n = outlaws().length; if (n !== st.left) { st.left = n; if (n > 0) { if (n <= 3 || n % 3 === 0) msg(n + (n === 1 ? ' outlaw left' : ' outlaws left'), 1.6); bc(); } }
        if (n === 0) { dropKey(lastDown || cave.entrance.clone()); st.phase = 2; msg('The last outlaw drops the vault key!', 3); bc(); } }
      if ((bcT += dt) > 2) bc(); }
    labels(); };
  out.info = () => ({ x: +S.x.toFixed(1), z: +S.z.toFixed(1), y0: +S.y0.toFixed(2), rot: S.rot, rise: S.rise, range: S.range, pass: S.pass, phase: PH[out.state.phase], left: out.state.left, key: out.state.key, open: cave.state.vaultOpen, loot: { ...loot } });
  labels(); return out;
}
