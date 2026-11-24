// v114 ARM WRESTLING at the saloon's front table. Bet 50 points. Mash SPACE (or tap the big button) to push your
// arm over before the challenger does. Challengers get stronger each time you win (up to 5 tiers); they're
// called Slim, Big Earl, Ox Malone, Iron Annie and The Mountain. Win = double your bet; the streak is saved.
export function createArm({ H, msg, sfx }) {
  const FOES = [['Slim', 1.0], ['Big Earl', 1.35], ['Ox Malone', 1.7], ['Iron Annie', 2.05], ['The Mountain', 2.5]], BET = 50;
  let tier = 0; try { tier = Math.min(4, +localStorage.getItem('hr_arm') || 0); } catch (_) {}
  let el = null, G = null; const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  function ui() { if (el) return; el = document.createElement('div'); el.id = 'hrArm'; document.body.appendChild(el); const st = document.createElement('style');
    st.textContent = '#hrArm{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw);z-index:72;background:#21170e;border:2px solid #d9a656;border-radius:14px;color:#f3e2c0;font:700 14px system-ui,sans-serif;padding:14px;text-align:center;display:none;box-shadow:0 10px 40px #000a}#hrArm.on{display:block}#hrArm h3{margin:0 0 6px;font:900 17px Georgia,serif;color:#ffd27a}#hrArm .bar{position:relative;height:22px;border-radius:11px;background:linear-gradient(90deg,#7a2020,#3a2a1a 50%,#205a2a);margin:12px 0;overflow:hidden;border:1px solid #d9a65688}#hrArm .bar i{position:absolute;top:-4px;width:6px;height:30px;background:#fff;left:50%;transform:translateX(-50%);box-shadow:0 0 8px #fff}#hrArm button{font:900 16px system-ui;padding:12px 18px;border-radius:12px;border:0;background:#d9a656;color:#21170e;margin:4px;touch-action:manipulation}#hrArm .push{width:100%;padding:22px;font-size:20px}#hrArm .arm{font-size:42px;line-height:1}';
    document.head.appendChild(st); el.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return; e.preventDefault(); const k = b.dataset.k; if (k === 'push') push(); else if (k === 'go') start(); else if (k === 'x') close(); }); }
  function render() { const f = FOES[tier]; if (!G) { el.innerHTML = `<h3>💪 ARM WRESTLING</h3><div>Challenger: <b>${f[0]}</b> (${tier + 1}/5)</div><div style="opacity:.8;margin:6px 0">Bet ${BET} · win ${BET * 2}. Mash SPACE or the PUSH button.</div><button data-k="go">TAKE A SEAT · ${BET}</button><button data-k="x">LEAVE</button>`; return; }
    if (G.done) { el.innerHTML = `<h3>${G.win ? '🏆 YOU WIN' : '😖 PINNED'}</h3><div>${G.win ? `+${BET * 2} points` : `${FOES[G.t][0]} takes your ${BET}`}</div><button data-k="go">AGAIN · ${BET}</button><button data-k="x">LEAVE</button>`; return; }
    el.innerHTML = `<h3>💪 vs ${FOES[G.t][0]}</h3><div class="arm">${G.c < 3 ? '…' + (3 - (G.c | 0)) : '🤜🤛'}</div><div class="bar"><i style="left:${50 + G.p * 48}%"></i></div><button class="push" data-k="push">PUSH!</button>`; }
  function open() { ui(); el.classList.add('on'); G = null; render(); H.uiOpen = true; H.armOpen = true; if (document.pointerLockElement) document.exitPointerLock(); }
  function close() { if (!el) return; el.classList.remove('on'); G = null; if (H.armOpen) { H.armOpen = false; H.uiOpen = false; } }
  function start() { const g = H.guns; if (!g || g.pts() < BET) { msg('You need 50 points to sit down', 1.6); return; } g.state.spent = (g.state.spent || 0) + BET; g.save && g.save(); G = { t: tier, p: 0, c: 0, mine: 0, done: false }; render(); }
  function push() { if (!G || G.done || G.c < 3) return; G.mine += .11; tone('square', 140 + G.p * 60, 90, .04, .05); H.vib && H.vib(6); }
  let last = performance.now(); function tick() { const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now; if (!G || G.done || !el || !el.classList.contains('on')) return;
    if (G.c < 3) { const was = G.c | 0; G.c += dt * 1.6; if ((G.c | 0) !== was) tone('triangle', 660, 660, .08, .1); render(); return; }
    const foe = .35 * FOES[G.t][1] * (1 + .35 * Math.sin(now / 340)); G.p += G.mine - foe * dt; G.mine = 0; G.p = Math.max(-1, Math.min(1, G.p));
    if (Math.abs(G.p) >= 1) { G.done = true; G.win = G.p > 0; if (G.win) { const g = H.guns; g.state.score += BET * 2; g.save && g.save(); tier = Math.min(4, tier + 1); const s = H.stats || (H.stats = {}); s.armWins = (s.armWins || 0) + 1; tone('triangle', 523, 784, .4, .25); } else tone('sawtooth', 220, 110, .35, .2); try { localStorage.setItem('hr_arm', String(tier)); } catch (_) {} }
    const b = el.querySelector('.bar i'); if (b && !G.done) b.style.left = (50 + G.p * 48) + '%'; else render(); }
  setInterval(tick, 33);
  addEventListener('keydown', e => { if (!H.armOpen) return; if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) push(); } else if (e.code === 'Escape') close(); }, true);
  return { open, close };
}
