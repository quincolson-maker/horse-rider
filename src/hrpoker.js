// ---------------- v65 saloon POKER: five-card draw for you, your friends and three regulars ----------------
// Buy in for 200 points worth of chips at the round table in the saloon. Each hand: ante 10 → everyone draws (tap the
// cards you want to swap, up to 3, or stand pat) → one betting round (check / bet 25 / call / fold, one raise allowed)
// → showdown, best hand takes the pot. Cash out whenever you like and your chips go back into your points.
// Networking: the host (or a solo player) runs the table. Clients send actions ({t:'pk'}) and the host sends each
// seated rider their own view ({t:'pks'}) via H.zSendTo, so nobody's hole cards ever reach another player's machine.
import { mergeStatic } from './hrmerge.js?v=292';
import * as THREE from 'three';
import { makeFrontierCharacter } from './hrcharacters.js?v=292';
const RANKS = '23456789TJQKA', SUITS = '♠♥♦♣', ANTE = 10, BET = 25, BUYIN = 200, MAXS = 6;
const BOTS = [{ n: 'DOC', loose: .35, bluff: .08 }, { n: 'SLIM', loose: .6, bluff: .16 }, { n: 'ROSA', loose: .45, bluff: .1 }];
const rk = c => c % 13, st = c => (c / 13) | 0;
// hand value: [category, tiebreak...] — 8 straight flush, 7 quads, 6 full house, 5 flush, 4 straight, 3 trips, 2 two pair, 1 pair, 0 high
export function pkEval(h) { const r = h.map(rk).sort((a, b) => b - a), cnt = new Map(); for (const x of r) cnt.set(x, (cnt.get(x) || 0) + 1);
  const g = [...cnt].sort((a, b) => b[1] - a[1] || b[0] - a[0]), fl = h.every(c => st(c) === st(h[0]));
  let sv = -1; const u = [...new Set(r)]; if (u.length === 5) { if (u[0] - u[4] === 4) sv = u[0]; else if (u[0] === 12 && u[1] === 3) sv = 3; } // A-2-3-4-5 wheel
  if (sv >= 0 && fl) return [8, sv]; if (g[0][1] === 4) return [7, g[0][0], g[1][0]]; if (g[0][1] === 3 && g[1][1] === 2) return [6, g[0][0], g[1][0]];
  if (fl) return [5, ...r]; if (sv >= 0) return [4, sv]; if (g[0][1] === 3) return [3, ...g.map(x => x[0])]; if (g[0][1] === 2 && g[1][1] === 2) return [2, ...g.map(x => x[0])];
  if (g[0][1] === 2) return [1, ...g.map(x => x[0])]; return [0, ...r]; }
export const pkCmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
export const pkName = v => ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'][v[0]] + (v[0] === 8 && v[1] === 12 ? ' (ROYAL!)' : '');
// which cards a sensible player throws away
export function pkDiscard(h) { const v = pkEval(h); if (v[0] >= 4 && v[0] !== 7) return []; const cnt = new Map(); for (const c of h) cnt.set(rk(c), (cnt.get(rk(c)) || 0) + 1);
  if (v[0] >= 1) return h.map((c, i) => cnt.get(rk(c)) > 1 ? -1 : i).filter(i => i >= 0);
  const bs = new Map(); for (const c of h) bs.set(st(c), (bs.get(st(c)) || 0) + 1); const [fs, fn] = [...bs].sort((a, b) => b[1] - a[1])[0]; if (fn === 4) return h.map((c, i) => st(c) === fs ? -1 : i).filter(i => i >= 0);
  const hi = h.map((c, i) => [rk(c), i]).sort((a, b) => b[0] - a[0]); return hi.slice(2).map(x => x[1]); } // keep the two highest
const strength = h => { const v = pkEval(h); return v[0] + (v[0] === 1 ? v[1] / 13 * .8 : v[0] === 0 ? v[1] / 13 * .4 : .5); }; // ~0..8.5

export function createPoker(c) { const { H, msg } = c, K = { el: null, V: null, t: 0, sel: new Set(), T: null, cash: 0 };
  const me = () => H.me || 'P1', role = () => H.netRole ? H.netRole() : 'solo', isAuth = () => role() !== 'client';
  const score = () => H.guns ? H.guns.state.score : 0, addScore = d => { if (H.guns) H.guns.state.score = Math.max(0, H.guns.state.score + d); };
  // ---------------- host side: the table ----------------
  function table() { if (!K.T) K.T = { id: 'p' + Math.random().toString(36).slice(2, 7), seats: [], pot: 0, phase: 'wait', turn: -1, bet: 0, raised: false, t: 0, deck: [], hand: 0, log: '' }; return K.T; }
  const humans = T => T.seats.filter(s => !s.bot), live = T => T.seats.filter(s => s.in && !s.fold);
  function seat(T, n, bot) { if (T.seats.length >= MAXS) return null; const s = { n, bot: bot || null, chips: bot ? 400 : BUYIN, hand: [], in: false, fold: false, put: 0, acted: false, drew: -1, last: '' }; T.seats.push(s); return s; }
  function fillBots(T) { const want = Math.max(0, Math.min(3, 4 - humans(T).length)); let have = T.seats.filter(s => s.bot); while (have.length > want) { const b = have.pop(); if (!b.in || T.phase === 'wait' || T.phase === 'show') T.seats.splice(T.seats.indexOf(b), 1); else break; }
    for (const b of BOTS) { if (T.seats.filter(s => s.bot).length >= want) break; if (!T.seats.some(s => s.n === b.n)) seat(T, b.n, b); } }
  function deal(T) { fillBots(T); for (const s of T.seats) if (s.bot && s.chips < ANTE + BET) s.chips += 300; // the regulars always find more money
    const pl = T.seats.filter(s => s.chips >= ANTE); if (pl.length < 2 || !humans(T).length) { T.phase = 'wait'; T.t = 3; return; }
    T.deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [T.deck[i], T.deck[j]] = [T.deck[j], T.deck[i]]; }
    T.pot = 0; T.bet = 0; T.raised = false; T.hand++; T.res = null; T.log = 'Antes in — pick the cards you want to swap';
    for (const s of T.seats) { s.in = s.chips >= ANTE; s.fold = false; s.put = 0; s.acted = false; s.drew = -1; s.last = ''; s.hand = s.in ? T.deck.splice(0, 5) : []; if (s.in) { s.chips -= ANTE; T.pot += ANTE; } }
    T.phase = 'draw'; T.t = 25; }
  function startBet(T) { T.phase = 'bet'; T.bet = 0; T.raised = false; for (const s of T.seats) { s.put = 0; s.acted = false; } T.turn = T.seats.findIndex(s => s.in && !s.fold); T.t = 20; T.log = 'Betting — ' + T.seats[T.turn].n + ' to act'; }
  function next(T) { const L = live(T); if (L.length <= 1) return show(T); const done = L.every(s => s.acted && (s.put === T.bet || s.chips === 0)); if (done) return show(T);
    for (let k = 1; k <= T.seats.length; k++) { const i = (T.turn + k) % T.seats.length, s = T.seats[i]; if (s.in && !s.fold && s.chips > 0 && !(s.acted && s.put === T.bet)) { T.turn = i; T.t = 20; return; } } show(T); }
  function show(T) { T.phase = 'show'; T.turn = -1; T.t = 7; const L = live(T); let win = [];
    if (L.length === 1) win = [L[0]]; else { let best = null; for (const s of L) { s.val = pkEval(s.hand); const d = best ? pkCmp(s.val, best) : 1; if (d > 0) { best = s.val; win = [s]; } else if (d === 0) win.push(s); } }
    const share = Math.floor(T.pot / win.length); for (const s of win) s.chips += share; T.res = { win: win.map(s => s.n), pot: T.pot, name: L.length > 1 ? pkName(win[0].val) : 'everyone else folded' };
    T.log = win.map(s => s.n).join(' & ') + ' take' + (win.length > 1 ? '' : 's') + ' ' + T.pot + ' with ' + T.res.name; T.pot = 0; }
  function act(T, s, a) { const owe = T.bet - s.put;
    if (a === 'fold') { s.fold = true; s.last = 'fold'; }
    else if (a === 'check' && owe <= 0) s.last = 'check';
    else if (a === 'call' && owe > 0) { const p = Math.min(owe, s.chips); s.chips -= p; s.put += p; T.pot += p; s.last = 'call'; }
    else if (a === 'bet' && (T.bet === 0 || !T.raised)) { const tgt = T.bet + BET, p = Math.min(tgt - s.put, s.chips); if (T.bet > 0) T.raised = true; s.chips -= p; s.put += p; T.pot += p; T.bet = Math.max(T.bet, s.put); s.last = T.raised ? 'raise' : 'bet'; for (const o of T.seats) if (o !== s) o.acted = false; }
    else return false; s.acted = true; T.log = s.n + ' ' + s.last + (s.last === 'bet' || s.last === 'raise' ? 's ' + BET : s.last === 'call' ? 's' : s.last === 'fold' ? 's' : 's'); return true; }
  function botAct(T, s) { const b = s.bot, str = strength(s.hand) + (Math.random() - .5) * .6, owe = T.bet - s.put, bluff = Math.random() < b.bluff;
    if (owe <= 0) return act(T, s, (str > 1.6 || bluff) && s.chips >= BET ? 'bet' : 'check');
    if (str > 2.4 && !T.raised && s.chips > owe + BET && Math.random() < .5) return act(T, s, 'bet');
    return act(T, s, str > 1.25 - b.loose || bluff ? 'call' : 'fold'); }
  function drawFor(s, idx, T) { if (s.drew >= 0) return; const ok = [...new Set((idx || []).filter(i => Number.isInteger(i) && i >= 0 && i < 5))].slice(0, 3); for (const i of ok) s.hand[i] = T.deck.pop(); s.drew = ok.length; s.last = ok.length ? 'drew ' + ok.length : 'stands pat'; }
  function view(T, who) { // what one rider is allowed to see
    return { id: T.id, phase: T.phase, pot: T.pot, bet: T.bet, raised: T.raised, turn: T.turn, t: Math.ceil(T.t), log: T.log, res: T.res, hand: T.hand,
      seats: T.seats.map(s => ({ n: s.n, bot: !!s.bot, chips: s.chips, in: s.in, fold: s.fold, put: s.put, drew: s.drew, last: s.last, hand: s.n === who || (T.phase === 'show' && s.in && !s.fold && live(T).length > 1) ? s.hand : null, val: T.phase === 'show' && s.val && !s.fold ? pkName(s.val) : null })) }; }
  function bcast() { const T = K.T; if (!T) return; for (const s of humans(T)) { if (s.n === me()) netState({ t: 'pks', g: view(T, s.n) }); else H.zSendTo && H.zSendTo(s.n, { t: 'pks', g: view(T, s.n) }); } }
  function kick(T, s, why) { const out = s.chips; T.seats.splice(T.seats.indexOf(s), 1); if (T.turn >= T.seats.length) T.turn = 0; const m = { t: 'pks', g: null, cash: out, why };
    if (s.n === me()) netState(m); else H.zSendTo && H.zSendTo(s.n, m); if (T.phase === 'bet') { if (live(T).length <= 1) show(T); else if (T.turn >= 0 && (!T.seats[T.turn].in || T.seats[T.turn].fold)) next(T); } }
  function netIn(m, from) { if (!m || !from) return; const T = table(); let s = T.seats.find(x => x.n === from && !x.bot);
    if (m.a === 'join') { if (s) { bcast(); return; } s = seat(T, from); if (!s) { const r = { t: 'pks', g: null, full: 1 }; from === me() ? netState(r) : H.zSendTo && H.zSendTo(from, r); return; }
      fillBots(T); if (T.phase === 'wait') deal(T); else T.log = from + ' sits down (in next hand)'; bcast(); return; }
    if (!s) return;
    if (m.a === 'leave') { kick(T, s); bcast(); return; }
    if (m.a === 'draw' && T.phase === 'draw' && s.in) { drawFor(s, m.idx, T); if (T.seats.every(x => !x.in || x.drew >= 0)) startBet(T); bcast(); return; }
    if (T.phase === 'bet' && T.seats[T.turn] === s && ['fold', 'check', 'call', 'bet'].includes(m.a)) { if (act(T, s, m.a)) { next(T); bcast(); } } }
  function hostTick(dt) { const T = K.T; if (!T || !T.seats.length) return; T.t -= dt;
    const here = new Set([me(), ...(H.netRemotes ? H.netRemotes() : []).map(r => r.id)]); for (const s of [...T.seats]) if (!s.bot && !here.has(s.n)) kick(T, s, 'left');
    if (!humans(T).length) { K.T = null; return; } let dirty = false;
    if (T.phase === 'draw') { for (const s of T.seats) if (s.bot && s.in && s.drew < 0 && T.t < 22 - (s.n.length % 3)) { drawFor(s, pkDiscard(s.hand), T); dirty = true; }
      if (T.t <= 0) for (const s of T.seats) if (s.in && s.drew < 0) drawFor(s, [], T); if (T.seats.every(x => !x.in || x.drew >= 0)) { startBet(T); dirty = true; } }
    else if (T.phase === 'bet') { const s = T.seats[T.turn]; if (s && s.bot && T.t < 18.6) { botAct(T, s); next(T); dirty = true; } else if (s && T.t <= 0) { act(T, s, T.bet - s.put > 0 ? 'fold' : 'check'); next(T); dirty = true; } }
    else if (T.phase === 'show' || T.phase === 'wait') { if (T.t <= 0) { for (const s of [...T.seats]) if (!s.bot && s.chips < ANTE) kick(T, s, 'bust'); if (humans(T).length) deal(T); dirty = true; } }
    K.bt = (K.bt || 0) + dt; if (dirty || K.bt > 1) { K.bt = 0; bcast(); } }
  // ---------------- every rider: the UI ----------------
  function netOut(m) { if (isAuth()) netIn(m, me()); else c.send && c.send({ t: 'pk', ...m }); }
  function join() { if (K.V) return open(); if (K.cash <= 0) { if (score() < BUYIN) { msg('Poker buy-in is ' + BUYIN + ' points — you have ' + score(), 2.5); return; } addScore(-BUYIN); K.cash = BUYIN; }
    open(); netOut({ a: 'join' }); }
  function cashOut(m) { const got = Math.max(0, m.cash | 0); if (K.cash > 0 || got) { addScore(got); const pr = got - BUYIN; if (H.stats) { H.stats.pokerNet = (H.stats.pokerNet || 0) + pr; } if (pr > 0 && H.lb) H.lb.add(pr, 'poker');
      msg(m.why === 'bust' ? 'Busted! The regulars thank you kindly.' : 'Cashed out ' + got + ' chips ' + (pr >= 0 ? '(+' + pr + ')' : '(' + pr + ')'), 3); } K.cash = 0; K.V = null; sync3D(); ui(); }
  function netState(m) { if (!m) return; if (m.g === null) { if (m.full) { addScore(K.cash); K.cash = 0; msg('The poker table is full', 2); close(); return; } cashOut(m); return; }
    const G = m.g; if (!G || !Array.isArray(G.seats)) return; K.rx = K.t; const old = K.V; K.V = G; if (!old || old.hand !== G.hand) K.sel.clear();
    if (old && old.phase !== 'show' && G.phase === 'show' && G.res) { const w = G.res.win.includes(me()); msg(w ? '🃏 You win ' + G.res.pot + ' — ' + G.res.name : '🃏 ' + G.log, 3); if (c.sfx && c.sfx.tone && c.sfx.ctx) c.sfx.tone('triangle', w ? 520 : 300, w ? 880 : 220, .25, .14); }
    else if (old && G.turn >= 0 && G.seats[G.turn] && G.seats[G.turn].n === me() && (old.turn !== G.turn || old.phase !== 'bet') && c.sfx && c.sfx.tone && c.sfx.ctx) c.sfx.tone('sine', 660, 660, .08, .1);
    if (old && old.hand !== G.hand && c.sfx && c.sfx.tone && c.sfx.ctx) c.sfx.tone('square', 1800, 1400, .03, .05); // shuffle tick
    sync3D(); if (K.el && !K.el.hidden) ui(); }
  // first-person seat at the table (like the Hold'em table): you sit, the camera looks at the felt
  function open() { if (!K.el) build(); if (!K.saved) { K.saved = { pos: c.P.pos.clone(), yaw: c.P.yaw, pitch: c.P.pitch, fp: H.fp, seated: H.seated, noGun: H.noGun }; H.guns && H.guns.holster && H.guns.holster(); }
    H.fp = H.seated = H.noGun = true; K.el.hidden = false; H.uiOpen = true; if (document.pointerLockElement) document.exitPointerLock(); ui(); sync3D(); }
  function close() { if (K.el) K.el.hidden = true; H.uiOpen = false; const S = K.saved; if (S) { c.P.pos.copy(S.pos); c.P.yaw = S.yaw; c.P.pitch = S.pitch; H.fp = S.fp; H.seated = S.seated; H.noGun = S.noGun; K.saved = null; } }
  // ---------------- the 3D table ----------------
  const D3 = { built: false }, TC = { x: -14.2, z: 6.2 }, SEATR = 1.42;
  const seatAng = i => Math.PI + i / MAXS * Math.PI * 2; // seat 0 faces the saloon door side
  const loc = (r, a) => [TC.x + Math.sin(a) * r, TC.z - Math.cos(a) * r];
  function atlas() { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640; const x = cv.getContext('2d'); // 13 x 5 cells of 78x128; cell 52 = back
    for (let i = 0; i < 53; i++) { const px = (i % 13) * 78.77, py = ((i / 13) | 0) * 128; x.fillStyle = '#fbf6ea'; x.fillRect(px + 2, py + 2, 74, 124); x.strokeStyle = '#c9b48a'; x.lineWidth = 2; x.strokeRect(px + 4, py + 4, 70, 120);
      if (i === 52) { x.fillStyle = '#8a2424'; x.fillRect(px + 7, py + 7, 64, 114); x.strokeStyle = '#e8c27a'; x.lineWidth = 2; for (let k = -10; k < 12; k++) { x.beginPath(); x.moveTo(px + 7 + k * 8, py + 7); x.lineTo(px + 7 + k * 8 + 64, py + 121); x.stroke(); } x.strokeRect(px + 10, py + 10, 58, 108); continue; }
      const red = st(i) === 1 || st(i) === 2, R = RANKS[rk(i)].replace('T', '10'), S = SUITS[st(i)]; x.fillStyle = red ? '#c0392b' : '#1b1b1b';
      x.font = 'bold 30px Georgia'; x.textAlign = 'left'; x.fillText(R, px + 9, py + 34); x.font = '26px serif'; x.fillText(S, px + 10, py + 60); x.font = '54px serif'; x.textAlign = 'center'; x.fillText(S, px + 40, py + 102); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function faceUV(g, f) { const u0 = (f % 13) / 13, v1 = 1 - ((f / 13) | 0) / 5, u1 = u0 + 1 / 13, v0 = v1 - 1 / 5, uv = g.attributes.uv; // plane uv order: (0,1)(1,1)(0,0)(1,0)
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true; }
  function build3D() { const s = c.town && c.town(); if (!s || !c.scene) return; D3.built = true; const F = s.F, root = D3.root = new THREE.Group(); root.position.set(s.cx, s.y0, s.cz); root.rotation.y = s.rot; c.scene.add(root); D3.s = s;
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: .55 }), felt = new THREE.MeshStandardMaterial({ color: 0x1d6b3c, roughness: 1 }), rail = new THREE.MeshStandardMaterial({ color: 0x3a1f10, roughness: .45 }), brass = new THREE.MeshStandardMaterial({ color: 0xc5a05a, metalness: .7, roughness: .35 });
    const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); root.add(o); return o; };
    add(new THREE.CylinderGeometry(1.08, 1.0, .1, 48), wood, TC.x, F + .76, TC.z); add(new THREE.CylinderGeometry(.98, .98, .012, 48), felt, TC.x, F + .815, TC.z);
    add(new THREE.TorusGeometry(1.03, .055, 8, 48).rotateX(Math.PI / 2), rail, TC.x, F + .82, TC.z); add(new THREE.CylinderGeometry(.12, .18, .72, 12), wood, TC.x, F + .36, TC.z); add(new THREE.CylinderGeometry(.5, .55, .05, 24), wood, TC.x, F + .025, TC.z);
    add(new THREE.TorusGeometry(.55, .008, 4, 48).rotateX(Math.PI / 2), brass, TC.x, F + .823, TC.z); // pot ring on the felt
    { const lamp = add(new THREE.CylinderGeometry(.08, .32, .22, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a5a32, roughness: .6, side: THREE.DoubleSide, emissive: 0x112a12 }), TC.x, F + 2.25, TC.z); add(new THREE.CylinderGeometry(.006, .006, 1.2, 4), brass, TC.x, F + 2.95, TC.z);
      if (!c.mobile) { const L = new THREE.PointLight(0xffd9a0, 2.6, 4.5, 1.6); L.position.set(TC.x, F + 2.05, TC.z); root.add(L); } lamp.material.emissiveIntensity = 1; }
    for (let i = 0; i < MAXS; i++) { const a = seatAng(i), [x, z] = loc(SEATR + .1, a), ch = new THREE.Group(); ch.position.set(x, F, z); ch.rotation.y = -a + Math.PI; root.add(ch); // chair, back away from the table
      const pc = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); o.position.set(px, py, pz); ch.add(o); }; pc(.44, .05, .44, 0, .46, 0); pc(.44, .6, .05, 0, .78, -.2); for (const [u, v] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) pc(.04, .46, .04, u, .23, v); }
    const tex = atlas(), cm = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, emissive: 0x5a5a5a, emissiveMap: tex }); D3.cards = [];
    for (let i = 0; i < MAXS * 5; i++) { const g = new THREE.PlaneGeometry(.13, .19); faceUV(g, 52); const m = new THREE.Mesh(g, cm); m.visible = false; m.userData.face = 52; root.add(m); D3.cards.push(m); }
    D3.chips = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .03, .011, 14), new THREE.MeshStandardMaterial({ roughness: .5 }), 160); D3.chips.count = 0; D3.chips.frustumCulled = false; root.add(D3.chips);
    D3.dolls = BOTS.map((b, k) => { const Dl = makeFrontierCharacter({ kind: 'bandit', skin: [0xd0a180, 0x8a5a3c, 0xb58462][k], hair: [0x6b6b6b, 0x2a1a10, 0x3a2414][k], top: [0xd8c8a0, 0xa83a2a, 0x5a6a8a][k], coat: [0x3d3328, 0x2a2a2a, 0x6a4a30][k], quality: c.mobile ? 'low' : 'high' }); try { mergeStatic(Dl.g); } catch (_) {}
      Dl.hips.position.y = .55; for (const l of Dl.legs) { l[0].rotation.x = -1.5; l[1].rotation.x = 1.5; } for (const ar of Dl.arms) { ar[0].rotation.x = -.9; ar[1].rotation.x = -.7; } Dl.g.visible = false; root.add(Dl.g); return Dl; });
    D3.labels = []; for (let i = 0; i < MAXS; i++) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); sp.scale.set(.62, .175, 1); sp.visible = false; sp.renderOrder = 5; root.add(sp); D3.labels.push({ sp, cv, t, txt: '' }); }
    // a little stake fence so nobody walks through the table
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = (i + 1) / 12 * Math.PI * 2, [ax, az] = c.toW(s, TC.x + Math.sin(a) * 1.08, TC.z + Math.cos(a) * 1.08), [bx, bz] = c.toW(s, TC.x + Math.sin(b) * 1.08, TC.z + Math.cos(b) * 1.08); c.walls && c.walls.push([ax, az, bx, bz, s.y0 + F, s.y0 + F + .85]); }
    sync3D(); }
  function label(L, a, b, hot) { const tx = a + '|' + b + '|' + hot; if (L.txt === tx) return; L.txt = tx; const x = L.cv.getContext('2d'); x.clearRect(0, 0, 256, 72); x.fillStyle = hot ? 'rgba(120,80,10,.85)' : 'rgba(10,8,5,.7)'; x.beginPath(); x.roundRect(4, 4, 248, 64, 14); x.fill();
    if (hot) { x.strokeStyle = '#ffd34a'; x.lineWidth = 4; x.stroke(); } x.fillStyle = '#ffe9b8'; x.font = 'bold 26px system-ui'; x.textAlign = 'center'; x.fillText(a, 128, 32); x.fillStyle = '#cfe8c8'; x.font = '20px system-ui'; x.fillText(b, 128, 58); L.t.needsUpdate = true; }
  const CHIPC = [new THREE.Color(0xc0392b), new THREE.Color(0xf2f2f2), new THREE.Color(0x2a5bd7), new THREE.Color(0x1f1f1f)];
  function sync3D() { if (!D3.built) return; const V = K.V, F = D3.s.F, Y = F + .826; let ci = 0, chipN = 0; const MX = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P3 = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
    const chip = (x, y, z, k) => { if (chipN >= 160) return; MX.compose(P3.set(x, y, z), Q.identity(), S1); D3.chips.setMatrixAt(chipN, MX); D3.chips.setColorAt(chipN, CHIPC[k % 4]); chipN++; };
    const stack = (x, z, n, k0) => { for (let j = 0; j < n; j++) chip(x + Math.sin(j * 2.4) * .004, Y + .006 + j * .0115, z, k0 + ((j / 4) | 0)); };
    // seats: who sits where (seat index = position in the host's list, the same on every screen)
    const seats = V ? V.seats : BOTS.map(b => ({ n: b.n, bot: true, chips: 400, in: false })), myI = V ? V.seats.findIndex(x => x.n === me()) : -1; let bi = 0;
    for (const d of D3.dolls) d.g.visible = false; for (const L of D3.labels) L.sp.visible = false;
    const idle = H.saloon && H.saloon.seated; if (idle) for (const d of idle) d.g.visible = !V; if (!V) { D3.chips.count = 0; for (const m of D3.cards) m.visible = false; D3.chips.instanceMatrix.needsUpdate = true; return; } // nobody's playing: the saloon's bandits hold the chairs
    seats.forEach((x, i) => { const a = seatAng(i);
      if (x.bot) { const k = BOTS.findIndex(b => b.n === x.n), d = D3.dolls[k >= 0 ? k : bi++ % 3], [sx, sz] = loc(SEATR + .05, a); d.g.position.set(sx, F, sz); d.g.rotation.y = Math.atan2(TC.x - sx, TC.z - sz); d.g.visible = true; }
      if (i !== myI) { const L = D3.labels[i], [lx, lz] = loc(SEATR + .05, a); L.sp.position.set(lx, F + 1.95, lz); L.sp.visible = true; const hot = V && V.turn === i;
        label(L, (x.bot ? '🤠 ' : '🧑 ') + x.n, x.val || (x.fold ? 'folded' : x.last || (V && !x.in ? 'next hand' : x.chips + ' chips')) + (x.put ? ' · in ' + x.put : ''), hot); }
      // chip stack by the seat
      const [cx, cz] = loc(i === myI ? .9 : .8, a + (i === myI ? .62 : .32)); stack(cx, cz, Math.min(10, Math.ceil(x.chips / 50)), i);
      if (!V || !x.in) return; const mine = i === myI, show = x.hand, r = mine ? .74 : .66;
      for (let j = 0; j < 5; j++) { const m = D3.cards[ci++]; const f = show ? x.hand[j] : 52; if (m.userData.face !== f) { faceUV(m.geometry, f); m.userData.face = f; }
        const off = (mine ? 2 - j : j - 2) * (mine ? .118 : .085), aa = a + off / r, [px, pz] = loc(r - (mine ? 0 : Math.abs(j - 2) * .01), aa), lift = mine && K.sel.has(j) ? .05 : 0;
        const U = m.userData, tp = U.tp || (U.tp = new THREE.Vector3()), held = !mine && !x.fold && !(V.phase === 'show' && show);
        if (mine && !x.fold) { tp.set(px, Y + .035 + lift, pz); E.set(-1.2, -a + Math.PI + (j - 2) * .1, 0, 'YXZ'); } // stood up toward your eyes
        else if (held) { const [hx, hz] = loc(1.02, a + (j - 2) * .045); tp.set(hx, Y + .2 + Math.abs(j - 2) * -.008, hz); E.set(.35, -a + (j - 2) * .16, (j - 2) * -.12, 'YXZ'); } // v76: the regulars hold their hand up, fanned (you see the backs)
        else { tp.set(px, Y + .002 + j * .0005, pz); E.set(-Math.PI / 2, 0, -a + (j - 2) * .12 + (x.fold ? .6 : 0), 'XYZ'); if (x.fold) tp.lerp(new THREE.Vector3(TC.x, Y, TC.z), .35); }
        (U.tq || (U.tq = new THREE.Quaternion())).setFromEuler(E);
        if (V.hand !== U.hand) { U.hand = V.hand; U.delay = (j * V.seats.length + i) * .07; m.position.set(TC.x, Y + .02, TC.z); m.quaternion.setFromEuler(E.set(-Math.PI / 2, 0, 0)); } // v76: a fresh deal flies out of the deck, round the table, one card at a time
        if (!U.anim) { m.position.copy(tp); m.quaternion.copy(U.tq); } U.slot = mine ? j : -1; m.visible = true; } });
    for (; ci < D3.cards.length; ci++) D3.cards[ci].visible = false;
    if (V && V.pot) { const n = Math.min(40, Math.ceil(V.pot / 10)); for (let j = 0; j < n; j++) { const a = j * 2.39, r = .05 + (j % 5) * .045; chip(TC.x + Math.sin(a) * r, Y + .006 + ((j / 5) | 0) * .0115, TC.z + Math.cos(a) * r, j); } }
    D3.chips.count = chipN; D3.chips.instanceMatrix.needsUpdate = true; if (D3.chips.instanceColor) D3.chips.instanceColor.needsUpdate = true; }
  // tap your own 3D cards to mark them for the draw
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  addEventListener('pointerdown', e => { if (!K.V || !K.el || K.el.hidden || !D3.built || !c.camera || e.target.tagName !== 'CANVAS') return; ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, c.camera);
    const hit = ray.intersectObjects(D3.cards.filter(m => m.visible && m.userData.slot >= 0), false)[0]; if (hit) { e.stopPropagation(); pick(hit.object.userData.slot); } }, true);
  function pick(i) { const V = K.V; if (!V || V.phase !== 'draw') return; const s = mySeat(); if (!s || !s.in || s.drew >= 0) return; if (K.sel.has(i)) K.sel.delete(i); else if (K.sel.size < 3) K.sel.add(i); else msg('You can swap at most 3 cards', 1.2); sync3D(); ui(); }
  const cardHTML = (cd, i, sel, dim) => cd == null ? `<div class="pc bk"></div>` : `<div class="pc${st(cd) === 1 || st(cd) === 2 ? ' rd' : ''}${sel ? ' sel' : ''}${dim ? ' dim' : ''}" data-i="${i}"><b>${RANKS[rk(cd)].replace('T', '10')}</b><i>${SUITS[st(cd)]}</i></div>`;
  function build() { const el = K.el = document.createElement('div'); el.id = 'hrPoker'; el.hidden = true;
    el.innerHTML = '<div class="pt"><div class="ttl">🃏 DRAW POKER <small>ante ' + ANTE + ' · bet ' + BET + ' · real points</small><span class="pot"></span></div><div class="lg"></div><div class="mine"></div><div class="mi"></div><div class="bt"></div></div>';
    document.body.appendChild(el); const css = document.createElement('style'); css.textContent = `
#hrPoker{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:60;width:min(600px,96vw);font:14px system-ui,sans-serif;color:#f3e6c8;pointer-events:none}
#hrPoker[hidden]{display:none}#hrPoker .pt{pointer-events:auto;background:linear-gradient(160deg,#173d27ee,#21150fee);border:2px solid #b8904f;border-radius:12px;box-shadow:0 8px 30px #000a;padding:8px 12px 10px;text-align:center}
#hrPoker .ttl{font-weight:800;letter-spacing:.06em;color:#ffd98a;display:flex;align-items:center;justify-content:center;gap:8px}#hrPoker .ttl small{font-weight:500;letter-spacing:0;color:#cfe8c8;opacity:.8}#hrPoker .pot{color:#ffd34a;font-size:16px}
#hrPoker .pc{width:44px;height:62px;background:#fbf7ec;color:#1a1a1a;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 6px #0007;cursor:pointer;transition:transform .12s;user-select:none}
#hrPoker .pc b{font-size:16px;line-height:1}#hrPoker .pc i{font-style:normal;font-size:19px;line-height:1}#hrPoker .pc.rd{color:#c0392b}#hrPoker .pc.sel{transform:translateY(-9px);outline:3px solid #ffb347}#hrPoker .pc.dim{opacity:.5}
#hrPoker .mine{display:flex;gap:6px;justify-content:center;margin:9px 0 3px;min-height:64px}#hrPoker .lg{min-height:18px;font-size:13px;color:#e8f5e0;margin-top:3px}#hrPoker .mi{font-size:12px;color:#ffd98a;min-height:15px}
#hrPoker .bt{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px}#hrPoker button{background:#3a2412;color:#ffe9b8;border:1px solid #c79a55;border-radius:8px;padding:9px 13px;min-height:42px;font:700 13px system-ui;cursor:pointer;touch-action:manipulation}#hrPoker button.go{background:#a8741f;color:#1a0f05}`;
    document.head.appendChild(css);
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelector('.mine').addEventListener('click', e => { const p = e.target.closest('.pc'); if (p && p.dataset.i != null) pick(+p.dataset.i); });
    el.querySelector('.bt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a;
      if (a === 'x') { if (K.V) netOut({ a: 'leave' }); else if (K.cash > 0) cashOut({ cash: K.cash }); close(); } else if (a === 'join') join();
      else if (a === 'draw') { netOut({ a: 'draw', idx: [...K.sel] }); K.sel.clear(); } else netOut({ a }); });
    addEventListener('keydown', e => { if (K.el && !K.el.hidden && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (K.V) netOut({ a: 'leave' }); close(); } }, true); }
  const mySeat = () => K.V ? K.V.seats.find(s => s.n === me()) : null;
  function ui() { if (!K.el || K.el.hidden) return; const V = K.V, q = s => K.el.querySelector(s);
    if (!V) { q('.pot').textContent = ''; q('.mine').innerHTML = ''; q('.mi').textContent = 'You have ' + score() + ' points';
      q('.lg').textContent = K.cash > 0 ? 'Taking a seat…' : 'Buy in for ' + BUYIN + ' points. Friends can sit too — up to 6 players; the regulars fill empty seats.'; q('.bt').innerHTML = K.cash > 0 ? '' : '<button class="go" data-a="join">SIT DOWN (' + BUYIN + ')</button><button data-a="x">WALK AWAY</button>'; return; }
    const s = mySeat(), turnS = V.turn >= 0 ? V.seats[V.turn] : null, myTurn = V.phase === 'bet' && turnS && turnS.n === me();
    q('.pot').textContent = V.pot ? 'POT ' + V.pot : ''; q('.lg').textContent = (V.phase === 'draw' || myTurn ? '⏳ ' + V.t + 's · ' : '') + (myTurn ? 'Your move' + (V.bet - s.put > 0 ? ' — ' + (V.bet - s.put) + ' to call' : '') : V.phase === 'draw' && s && s.in && s.drew < 0 ? 'Tap up to 3 cards to swap (on the table or here)' : V.log);
    const dim = V.phase === 'show' && V.res && !V.res.win.includes(me()); q('.mine').innerHTML = s && s.in && s.hand ? s.hand.map((cd, i) => cardHTML(cd, i, K.sel.has(i), dim || s.fold)).join('') : '<div class="lg">Sitting in next hand…</div>';
    q('.mi').textContent = s ? (s.in && s.hand ? pkName(pkEval(s.hand)) + ' · ' : '') + s.chips + ' chips' : '';
    let b = ''; if (s && s.in && !s.fold) { if (V.phase === 'draw' && s.drew < 0) b += `<button class="go" data-a="draw">${K.sel.size ? 'SWAP ' + K.sel.size : 'STAND PAT'}</button>`;
      if (myTurn) { const owe = V.bet - s.put; b += owe > 0 ? `<button class="go" data-a="call">CALL ${Math.min(owe, s.chips)}</button>` : `<button class="go" data-a="check">CHECK</button>`; if ((V.bet === 0 || !V.raised) && s.chips > owe) b += `<button data-a="bet">${V.bet ? 'RAISE' : 'BET'} ${BET}</button>`; b += `<button data-a="fold">FOLD</button>`; } }
    q('.bt').innerHTML = b + '<button data-a="x">CASH OUT & LEAVE</button>'; }
  function tick(dt) { K.t += dt; if (!D3.built && c.town && c.town()) build3D();
    if (isAuth()) { hostTick(dt); if (K.V && !K.T) { const s = mySeat(); netState({ g: null, cash: s ? s.chips : K.cash, why: 'lost' }); } } else if (K.V && K.t - (K.rx || 0) > 12) { const s = mySeat(); netState({ g: null, cash: s ? s.chips : K.cash, why: 'lost' }); } /* host vanished: keep your chips */
    if (D3.built && K.V) { for (const m of D3.cards) { const U = m.userData; if (!m.visible || !U.tp) continue; U.anim = true; if (U.delay > 0) { U.delay -= dt; if (U.delay <= 0 && c.sfx && c.sfx.tone && c.sfx.ctx && Math.random() < .5) c.sfx.tone('triangle', 2400, 1600, .02, .03); continue; }
        const k = 1 - Math.exp(-dt * 11); if (m.position.distanceToSquared(U.tp) > 1e-7) { const arc = Math.min(.08, m.position.distanceTo(U.tp) * .25); m.position.lerp(U.tp, k); m.position.y += arc * k; } m.quaternion.slerp(U.tq, k); } } // v76: cards glide / flip into place
    if (D3.built) { const near = Math.hypot(c.P.pos.x - D3.s.cx, c.P.pos.z - D3.s.cz) < 70; D3.root.visible = near;
      if (near) D3.dolls.forEach((d, i) => { if (d.g.visible && d.head) d.head.rotation.y = Math.sin(K.t * .5 + i * 2) * .25; }); }
    if (K.saved && D3.built) { const s = D3.s, V = K.V, i = V ? V.seats.findIndex(x => x.n === me()) : -1, a = seatAng(i >= 0 ? i : 0), [lx, lz] = loc(i >= 0 ? SEATR - .02 : SEATR + .5, a), [wx, wz] = c.toW(s, lx, lz), [tx, tz] = c.toW(s, TC.x, TC.z);
      c.P.pos.set(wx, s.y0 + s.F, wz); H.fv && H.fv.set(0, 0); c.P.yaw = Math.atan2(-(tx - wx), -(tz - wz)); c.P.pitch = -.24; } // v97: look across the felt at the table centre (was -.5: stared at the rail / pedestal)
    if (K.V && K.el && !K.el.hidden && K.V.t > 0 && (K.t % 1) < dt) { K.V.t = Math.max(0, K.V.t - 1); ui(); } }
  Object.assign(K, { open: () => (open(), ui()), join, close, netIn, netState, tick, isOpen: () => !!(K.el && !K.el.hidden), table: () => K.T, view: () => K.V, pick, D3 }); return K; }
