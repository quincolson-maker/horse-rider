// ---------------- v65 saloon POKER: five-card draw for you, your friends and three regulars ----------------
// Buy in for 200 points worth of chips at the round table in the saloon. Each hand: ante 10 → everyone draws (tap the
// cards you want to swap, up to 3, or stand pat) → one betting round (check / bet 25 / call / fold, one raise allowed)
// → showdown, best hand takes the pot. Cash out whenever you like and your chips go back into your points.
// Networking: the host (or a solo player) runs the table. Clients send actions ({t:'pk'}) and the host sends each
// seated rider their own view ({t:'pks'}) via H.zSendTo, so nobody's hole cards ever reach another player's machine.
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
    open(); netOut({ a: 'join' }); K.el.querySelector('.lg').textContent = 'Taking a seat…'; }
  function cashOut(m) { const got = Math.max(0, m.cash | 0); if (K.cash > 0 || got) { addScore(got); const pr = got - BUYIN; if (H.stats) { H.stats.pokerNet = (H.stats.pokerNet || 0) + pr; } if (pr > 0 && H.lb) H.lb.add(pr, 'poker');
      msg(m.why === 'bust' ? 'Busted! The regulars thank you kindly.' : 'Cashed out ' + got + ' chips ' + (pr >= 0 ? '(+' + pr + ')' : '(' + pr + ')'), 3); } K.cash = 0; K.V = null; ui(); }
  function netState(m) { if (!m) return; if (m.g === null) { if (m.full) { addScore(K.cash); K.cash = 0; msg('The poker table is full', 2); close(); return; } cashOut(m); return; }
    const G = m.g; if (!G || !Array.isArray(G.seats)) return; K.rx = K.t; const old = K.V; K.V = G; if (!old || old.hand !== G.hand) K.sel.clear();
    if (old && old.phase !== 'show' && G.phase === 'show' && G.res) { const w = G.res.win.includes(me()); msg(w ? '🃏 You win ' + G.res.pot + ' — ' + G.res.name : '🃏 ' + G.log, 3); if (c.sfx && c.sfx.tone && c.sfx.ctx) c.sfx.tone('triangle', w ? 520 : 300, w ? 880 : 220, .25, .14); }
    else if (old && G.turn >= 0 && G.seats[G.turn] && G.seats[G.turn].n === me() && (old.turn !== G.turn || old.phase !== 'bet') && c.sfx && c.sfx.tone && c.sfx.ctx) c.sfx.tone('sine', 660, 660, .08, .1);
    if (K.el && !K.el.hidden) ui(); }
  function open() { if (!K.el) build(); K.el.hidden = false; H.uiOpen = true; if (document.pointerLockElement) document.exitPointerLock(); ui(); }
  function close() { if (K.el) K.el.hidden = true; H.uiOpen = false; }
  const cardHTML = (cd, i, sel, dim) => cd == null ? `<div class="pc bk"></div>` : `<div class="pc${st(cd) === 1 || st(cd) === 2 ? ' rd' : ''}${sel ? ' sel' : ''}${dim ? ' dim' : ''}" data-i="${i}"><b>${RANKS[rk(cd)].replace('T', '10')}</b><i>${SUITS[st(cd)]}</i></div>`;
  function build() { const el = K.el = document.createElement('div'); el.id = 'hrPoker'; el.hidden = true;
    el.innerHTML = '<div class="pt"><div class="ttl">🃏 FIVE-CARD DRAW <small>ante ' + ANTE + ' · bet ' + BET + ' · buy-in ' + BUYIN + '</small></div><div class="opp"></div><div class="pot"></div><div class="lg"></div><div class="mine"></div><div class="mi"></div><div class="bt"></div></div>';
    document.body.appendChild(el); const css = document.createElement('style'); css.textContent = `
#hrPoker{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(10,6,3,.55);font:14px system-ui,sans-serif;color:#f3e6c8}
#hrPoker[hidden]{display:none}#hrPoker .pt{width:min(560px,96vw);background:radial-gradient(ellipse at 50% 40%,#1f6b3a,#0e3a1f 75%);border:10px solid #5b3a1f;border-radius:28px;box-shadow:0 10px 40px #000a,inset 0 0 40px #0008;padding:12px 14px 14px;text-align:center}
#hrPoker .ttl{font-weight:800;letter-spacing:.08em;color:#ffd98a}#hrPoker .ttl small{font-weight:500;letter-spacing:0;color:#cfe8c8;opacity:.8;margin-left:6px}
#hrPoker .opp{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 0}#hrPoker .sv{background:#0006;border-radius:10px;padding:4px 7px;min-width:96px}#hrPoker .sv.on{outline:2px solid #ffd34a}#hrPoker .sv.f{opacity:.45}#hrPoker .sv .nm{font-weight:700;font-size:12px}#hrPoker .sv .ch{font-size:11px;color:#ffd98a}#hrPoker .sv .ls{font-size:11px;color:#cfe8c8;min-height:13px}
#hrPoker .sv .cs{display:flex;gap:2px;justify-content:center;margin:3px 0}#hrPoker .sv .pc{width:17px;height:25px;font-size:9px;border-radius:3px}#hrPoker .sv .pc i{font-size:9px}
#hrPoker .pc{width:58px;height:82px;background:#fbf7ec;color:#1a1a1a;border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 6px #0007;cursor:pointer;transition:transform .12s;user-select:none}
#hrPoker .pc b{font-size:20px;line-height:1}#hrPoker .pc i{font-style:normal;font-size:24px;line-height:1}#hrPoker .pc.rd{color:#c0392b}#hrPoker .pc.sel{transform:translateY(-14px);outline:3px solid #ffb347}#hrPoker .pc.dim{opacity:.55}
#hrPoker .pc.bk{background:repeating-linear-gradient(45deg,#7a1f1f 0 4px,#9a2b2b 4px 8px);border:2px solid #fbf7ec}
#hrPoker .mine{display:flex;gap:7px;justify-content:center;margin:16px 0 6px;min-height:84px}#hrPoker .pot{font-size:18px;font-weight:800;color:#ffd34a}#hrPoker .lg{min-height:18px;font-size:13px;color:#e8f5e0}#hrPoker .mi{font-size:12px;color:#ffd98a;min-height:15px}
#hrPoker .bt{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px}#hrPoker button{background:#3a2412;color:#ffe9b8;border:1px solid #c79a55;border-radius:8px;padding:8px 13px;font:700 13px system-ui;cursor:pointer}#hrPoker button.go{background:#a8741f;color:#1a0f05}#hrPoker button:disabled{opacity:.35}`;
    document.head.appendChild(css);
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelector('.mine').addEventListener('click', e => { const p = e.target.closest('.pc'); const V = K.V; if (!p || !V || V.phase !== 'draw') return; const s = mySeat(); if (!s || !s.in || s.drew >= 0) return; const i = +p.dataset.i;
      if (K.sel.has(i)) K.sel.delete(i); else if (K.sel.size < 3) K.sel.add(i); else msg('You can swap at most 3 cards', 1.2); ui(); });
    el.querySelector('.bt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a;
      if (a === 'x') { if (K.V) netOut({ a: 'leave' }); else if (K.cash > 0) cashOut({ cash: K.cash }); close(); } else if (a === 'hide') close(); else if (a === 'join') join();
      else if (a === 'draw') { netOut({ a: 'draw', idx: [...K.sel] }); K.sel.clear(); } else netOut({ a }); }); }
  const mySeat = () => K.V ? K.V.seats.find(s => s.n === me()) : null;
  function ui() { if (!K.el || K.el.hidden) return; const V = K.V, q = s => K.el.querySelector(s), nm = n => n === me() ? 'YOU' : n;
    if (!V) { q('.opp').innerHTML = ''; q('.pot').textContent = ''; q('.mine').innerHTML = ''; q('.mi').textContent = 'You have ' + score() + ' points';
      q('.lg').textContent = 'Friends standing at the table can sit down too — up to 6 players. The regulars fill empty seats.'; q('.bt').innerHTML = '<button class="go" data-a="join">SIT DOWN (' + BUYIN + ')</button><button data-a="x">WALK AWAY</button>'; return; }
    const s = mySeat(), turnS = V.turn >= 0 ? V.seats[V.turn] : null, myTurn = V.phase === 'bet' && turnS && turnS.n === me();
    q('.opp').innerHTML = V.seats.filter(x => x.n !== me()).map(x => `<div class="sv${turnS === x ? ' on' : ''}${x.fold || !x.in ? ' f' : ''}"><div class="nm">${x.bot ? '🤠 ' : '🧑 '}${x.n}</div><div class="cs">${x.in ? (x.hand || [null, null, null, null, null]).map((cd, i) => cardHTML(cd, i)).join('') : ''}</div><div class="ch">${x.chips} chips${x.put ? ' · in ' + x.put : ''}</div><div class="ls">${x.val || x.last || (x.in ? '' : 'next hand')}</div></div>`).join('');
    q('.pot').textContent = V.pot ? 'POT ' + V.pot : ''; q('.lg').textContent = (V.phase === 'draw' ? '⏳ ' + V.t + 's · ' : myTurn ? '⏳ ' + V.t + 's · ' : '') + (myTurn ? 'Your move' + (V.bet - s.put > 0 ? ' — ' + (V.bet - s.put) + ' to call' : '') : V.log);
    const dim = V.phase === 'show' && V.res && !V.res.win.includes(me()); q('.mine').innerHTML = s && s.in && s.hand ? s.hand.map((cd, i) => cardHTML(cd, i, K.sel.has(i), dim || s.fold)).join('') : '<div class="lg">Sitting in next hand…</div>';
    q('.mi').textContent = s ? (s.in && s.hand ? pkName(pkEval(s.hand)) + ' · ' : '') + s.chips + ' chips' : '';
    let b = ''; if (s && s.in && !s.fold) { if (V.phase === 'draw' && s.drew < 0) b += `<button class="go" data-a="draw">${K.sel.size ? 'SWAP ' + K.sel.size : 'STAND PAT'}</button>`;
      if (myTurn) { const owe = V.bet - s.put; b += owe > 0 ? `<button class="go" data-a="call">CALL ${Math.min(owe, s.chips)}</button>` : `<button class="go" data-a="check">CHECK</button>`; if ((V.bet === 0 || !V.raised) && s.chips > owe) b += `<button data-a="bet">${V.bet ? 'RAISE' : 'BET'} ${BET}</button>`; b += `<button data-a="fold">FOLD</button>`; } }
    q('.bt').innerHTML = b + '<button data-a="hide">STAY · HIDE</button><button data-a="x">CASH OUT</button>'; }
  function tick(dt) { K.t += dt; if (isAuth()) { hostTick(dt); if (K.V && !K.T) { const s = mySeat(); netState({ g: null, cash: s ? s.chips : K.cash, why: 'lost' }); } } else if (K.V && K.t - (K.rx || 0) > 12) { const s = mySeat(); netState({ g: null, cash: s ? s.chips : K.cash, why: 'lost' }); } /* host vanished: keep your chips */ if (K.V && K.el && !K.el.hidden && K.V.t > 0 && (K.t % 1) < dt) { K.V.t = Math.max(0, K.V.t - 1); ui(); } }
  Object.assign(K, { open: () => (K.V ? open() : (open(), ui())), join, close, netIn, netState, tick, isOpen: () => !!(K.el && !K.el.hidden), table: () => K.T, view: () => K.V }); return K; }
