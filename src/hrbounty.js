// v43 BOUNTY BOARD — a chain of jobs that walks a rider through everything the frontier has, one at a time,
// with a rank that climbs from Greenhorn to Legend. Purely local (each rider has their own board), saved in localStorage.
// Hooks are read-only peeks at the other systems, so nothing else has to know the board exists.
const KEY = 'hr_bounty';
const RANKS = [[0, 'Greenhorn'], [2, 'Drifter'], [4, 'Gunslinger'], [6, 'Deputy'], [8, 'Marshal'], [10, 'Sheriff'], [11, 'Legend of the West']];
export function createBounty({ H, P, T, msg, sfx, PEN }) {
  let S = { i: 0, base: {}, prog: {}, done: [] }; try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Number.isInteger(v.i)) S = Object.assign(S, v); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };
  const G = () => H.guns && H.guns.state, kills = () => (G() && G().kills) || 0;
  const tw = () => (T && T.towers) || [];
  const nearTower = () => { let b = null, bd = 1e9; for (const t of tw()) { const d = Math.hypot(t.cx - P.pos.x, t.cz - P.pos.z); if (d < bd) { bd = d; b = t; } } return b; };
  const inCab = () => tw().some(t => { const [x, z] = T.toL(t, P.pos.x, P.pos.z); return Math.abs(x) < 3.5 && Math.abs(z) < 3.5 && P.pos.y > t.y0 + 15; });
  const place = k => { const pl = H.places || {}; return pl[k] ? [pl[k].x, pl[k].z] : null; };
  const killsSince = (id, n) => ({ p: () => Math.min(1, (kills() - (S.base[id] ?? kills())) / n), t: () => `${Math.max(0, Math.min(n, kills() - (S.base[id] ?? kills())))} / ${n}`, start: () => { S.base[id] = kills(); } });
  // [id, title, task, reward, progress 0..1, target for the compass, optional progress text, on-start]
  const JOBS = [
    { id: 'saddle', title: 'Saddle Up', task: 'Ride 300 m on horseback', pay: 150, p: () => Math.min(1, (S.prog.ride || 0) / 300), txt: () => `${Math.round(Math.min(300, S.prog.ride || 0))} / 300 m`, to: () => H.mounted || !PEN ? null : [PEN.x, PEN.z] },
    { id: 'whiskey', title: 'Wet Your Whistle', task: 'Order a whiskey at the saloon', pay: 100, p: () => (S.prog.drinks || 0) > 0 ? 1 : 0, to: () => H.places && H.places.town },
    { id: 'pest', title: 'Pest Control', task: 'Drop 25 zombies', pay: 400, ...killsSince('pest', 25) },
    { id: 'lookout', title: 'Eyes on the Range', task: 'Climb into the cab of a lookout tower', pay: 400, p: () => inCab() ? 1 : 0, to: () => { const t = nearTower(); return t ? [t.cx, t.cz] : null; } },
    { id: 'falls', title: 'Behind the Falls', task: 'Find the outlaw hideout hidden behind a waterfall', pay: 400, p: () => H.cave && H.cave.underP ? 1 : 0, to: () => place('cave') },
    { id: 'justice', title: 'Outlaw Justice', task: 'Clear Bandit Falls of every outlaw (shoot first to start it)', pay: 1500, p: () => H.cave && H.cave.state.phase >= 2 ? 1 : H.cave && H.cave.state.phase === 1 ? .5 : 0, to: () => place('cave') },
    { id: 'crank', title: 'Crank It', task: 'Claim the hand-crank Gatling from the vault chest', pay: 1000, p: () => G() && G().owned.gatling ? 1 : 0, to: () => place('cave') },
    { id: 'seal', title: 'Sunseeker', task: 'Push open the seal of the Hollow Sun temple', pay: 500, p: () => H.temple && H.temple.temple.doors[0].target > 0 ? 1 : 0, to: () => place('temple') },
    { id: 'sun', title: 'Keeper of the Sun', task: 'Solve the three seals and claim the Sun Pyramid', pay: 5000, p: () => H.temple && H.temple.claims.sun ? 1 : 0, txt: () => { const st = H.temple && H.temple.temple.state; return st ? `${['mirror', 'glyph', 'weight'].filter(k => st[k]).length} / 3 seals` : ''; }, to: () => place('temple') },
    { id: 'slayer', title: 'Slayer', task: 'Drop 150 zombies', pay: 3000, ...killsSince('slayer', 150) },
    { id: 'legend', title: 'Legend of the West', task: 'Drop 500 zombies', pay: 10000, ...killsSince('legend', 500) },
  ];
  const rank = () => { let r = RANKS[0][1]; for (const [n, name] of RANKS) if (S.done.length >= n) r = name; return r; };
  const job = () => JOBS[S.i] || null;
  // ---- HUD card (tap to fold) ----
  const st = document.createElement('style');
  st.textContent = `#hrBounty{position:fixed;right:12px;top:96px;z-index:30;width:230px;max-width:46vw;font:600 11px/1.3 system-ui,sans-serif;color:#fff;background:linear-gradient(180deg,rgba(26,18,8,.82),rgba(14,10,4,.72));border:1.5px solid #e2b24a;border-radius:10px;padding:6px 9px 7px;box-shadow:0 3px 10px rgba(0,0,0,.45);cursor:pointer;user-select:none;-webkit-user-select:none}
#hrBounty .bh{display:flex;justify-content:space-between;gap:6px;color:#ffd77a;font:800 9.5px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}#hrBounty .bt{font:900 13px/1.2 system-ui,sans-serif;margin-top:3px;letter-spacing:.02em}
#hrBounty .bk{opacity:.86;margin-top:1px}#hrBounty .bb{height:4px;border-radius:3px;background:rgba(255,255,255,.18);margin-top:5px;overflow:hidden}#hrBounty .bb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffb020,#ffe27a);transition:width .3s}
#hrBounty .bp{display:flex;justify-content:space-between;margin-top:3px;font-size:10px;opacity:.9}#hrBounty.fold .bk,#hrBounty.fold .bb,#hrBounty.fold .bp{display:none}
#hrBounty.pop{animation:hrBp .9s ease-out}@keyframes hrBp{0%{transform:scale(1.12);box-shadow:0 0 26px #ffd23a}100%{transform:scale(1)}}
body.touch #hrBounty{top:calc(max(8px,env(safe-area-inset-top)) + 30px);right:calc(max(8px,env(safe-area-inset-right)) + 2px);width:200px;font-size:10px;padding:5px 8px 6px}body.touch #hrBounty .bt{font-size:12px}
#hrBountyWin{position:fixed;left:50%;top:24%;transform:translateX(-50%);z-index:70;pointer-events:none;text-align:center;color:#fff;font:900 30px/1.1 system-ui,sans-serif;letter-spacing:.04em;text-shadow:0 3px 0 #7a4a00,0 0 18px rgba(255,190,40,.8);opacity:0}
#hrBountyWin small{display:block;font:800 13px/1.4 system-ui,sans-serif;color:#ffe08a;letter-spacing:.18em;text-shadow:0 2px 3px #000}#hrBountyWin.on{animation:hrBw 3.2s ease-out}
@keyframes hrBw{0%{opacity:0;transform:translateX(-50%) scale(.6)}10%{opacity:1;transform:translateX(-50%) scale(1.08)}18%{transform:translateX(-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-14px)}}
.hr-ui-open #hrBounty,body.hr-scoped #hrBounty{display:none}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'hrBounty'; el.innerHTML = '<div class="bh"><span>★ Bounty</span><span class="rk"></span></div><div class="bt"></div><div class="bk"></div><div class="bb"><i></i></div><div class="bp"><span class="pt"></span><span class="pay"></span></div>'; document.body.appendChild(el);
  try { if (localStorage.getItem('hr_bfold') === '1') el.classList.add('fold'); } catch (_) {}
  const stop = e => e.stopPropagation(); el.addEventListener('pointerdown', stop); el.addEventListener('touchstart', stop, { passive: true });
  el.addEventListener('click', e => { e.stopPropagation(); el.classList.toggle('fold'); try { localStorage.setItem('hr_bfold', el.classList.contains('fold') ? '1' : '0'); } catch (_) {} });
  const win = document.createElement('div'); win.id = 'hrBountyWin'; document.body.appendChild(win);
  const $ = q => el.querySelector(q);
  function fanfare() { const t = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a); [[784, 0], [988, 110], [1175, 220], [1568, 360]].forEach(([f, d]) => setTimeout(() => t('triangle', f, f, d === 360 ? .5 : .14, .2), d)); setTimeout(() => t('sine', 392, 392, .6, .12), 360); }
  function startJob() { const j = job(); if (j && j.start && S.base[j.id] === undefined) j.start(); save(); }
  function complete(j) { S.done.push(j.id); const g = G(); if (g) { g.score += j.pay; H.guns.save && H.guns.save(); }
    const before = rank(); S.i++; startJob(); const after = rank();
    win.innerHTML = `BOUNTY COMPLETE<small>${j.title.toUpperCase()} · +${j.pay.toLocaleString()} PTS${after !== before ? ' · RANK UP: ' + after.toUpperCase() : ''}</small>`; win.className = ''; void win.offsetWidth; win.className = 'on';
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); fanfare(); }
  startJob();
  let lastX = P.pos.x, lastZ = P.pos.z, lastDrinks = T ? T.drinks || 0 : 0, uiT = 0, doneT = 0;
  function update(dt) { const j = job();
    // passive trackers
    const step = Math.hypot(P.pos.x - lastX, P.pos.z - lastZ); if (H.mounted && step < 30) S.prog.ride = (S.prog.ride || 0) + step; lastX = P.pos.x; lastZ = P.pos.z;
    if (T && (T.drinks || 0) > lastDrinks) S.prog.drinks = (S.prog.drinks || 0) + 1; lastDrinks = T ? T.drinks || 0 : 0;
    H.bountyTarget = j && j.to ? j.to() : null;
    if (j && j.p() >= 1) { doneT += dt; if (doneT > .4) { doneT = 0; complete(j); } } else doneT = 0;
    if ((uiT -= dt) > 0) return; uiT = .25; const jj = job(), n = S.done.length;
    $('.rk').textContent = rank() + ' · ' + n + '/' + JOBS.length;
    if (!jj) { $('.bt').textContent = 'All bounties claimed'; $('.bk').textContent = 'You are a Legend of the West. Keep riding.'; $('.bb i').style.width = '100%'; $('.pt').textContent = ''; $('.pay').textContent = ''; return; }
    const pr = Math.max(0, Math.min(1, jj.p())); $('.bt').textContent = jj.title; $('.bk').textContent = jj.task; $('.bb i').style.width = (pr * 100).toFixed(0) + '%';
    $('.pt').textContent = jj.txt ? jj.txt() : pr >= 1 ? 'Done!' : ''; $('.pay').textContent = '+' + jj.pay.toLocaleString() + ' pts';
    if (Math.random() < .02) save(); }
  return { update, rank, get job() { return job(); }, jobs: JOBS, state: S, save, reset() { S = { i: 0, base: {}, prog: {}, done: [] }; startJob(); save(); } };
}
