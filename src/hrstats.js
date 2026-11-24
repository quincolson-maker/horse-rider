// v105 RIDER'S JOURNAL: your lifetime stats in one panel. Open it with J or ⋯ → Stats.
// It only reads data the game already keeps (H.stats, guns, bounty board, ranch); nothing new is saved.
export function createStats({ H, msg }) {
  let el = null;
  // ---- v106 DAILY CHALLENGE: one task a day (same for every rider, picked from the date), big payout ----
  const sum = pre => { const s = H.stats || {}; let n = 0; for (const k in s) if (k.startsWith(pre)) n += +s[k] || 0; return n; }, st = k => +((H.stats || {})[k]) || 0;
  const DAILY = [
    { t: 'Drop 60 zombies', n: 60, v: () => sum('zk_'), pay: 1500 }, { t: 'Land 20 headshot kills', n: 20, v: () => sum('zh_'), pay: 1500 },
    { t: 'Rope 6 zombies with the lasso', n: 6, v: () => st('lassos'), pay: 1200 }, { t: 'Drop 25 zombies with the coach gun', n: 25, v: () => st('k_shotgun'), pay: 1400 },
    { t: 'Burst 5 bloaters', n: 5, v: () => st('zk_bloater'), pay: 1200 }, { t: 'Put down 4 armored lawmen', n: 4, v: () => st('zk_lawman'), pay: 1300 },
    { t: 'Crush 10 crawlers', n: 10, v: () => st('zk_crawler'), pay: 1200 }, { t: 'Hunt 3 deer', n: 3, v: () => st('deer'), pay: 1000 }, { t: 'Catch 4 fish', n: 4, v: () => st('fish'), pay: 1000 },
    { t: 'Drop 30 zombies with the six-shooter', n: 30, v: () => st('k_revolver'), pay: 1300 }, { t: 'Repel a night raid', n: 1, v: () => st('raids'), pay: 2000 } ];
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const pickFor = day => { let h = 7; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return DAILY[h % DAILY.length]; };
  let D = (() => { try { return JSON.parse(localStorage.getItem('hr_daily') || 'null'); } catch (_) { return null; } })();
  const dsave = () => { try { localStorage.setItem('hr_daily', JSON.stringify(D)); } catch (_) {} };
  function daily() { const day = today(), c = pickFor(day); if (!D || D.day !== day) { D = { day, base: c.v(), done: false }; dsave(); setTimeout(() => msg(`📅 Today's challenge: ${c.t}  (+${c.pay})  — J for your journal`, 4), 6000); } return { c, have: Math.max(0, Math.min(c.n, c.v() - D.base)), done: D.done }; }
  // v116 daily ride bonus: come back on consecutive days for a growing bonus (200 x streak, up to 7 days = 1400)
  setTimeout(() => { try { const L = JSON.parse(localStorage.getItem('hr_login') || '{}'), day = today(), y = new Date(Date.now() - 864e5), yd = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate(); if (L.day === day || !H.guns) return;
    const streak = L.day === yd ? Math.min(7, (L.streak || 0) + 1) : 1, pay = 200 * streak; H.guns.state.score += pay; H.guns.save && H.guns.save(); localStorage.setItem('hr_login', JSON.stringify({ day, streak })); msg(`🌅 Day ${streak} ride bonus  +${pay}${streak < 7 ? ' — come back tomorrow for more' : ' (max streak!)'}`, 4.5); } catch (_) {} }, 9000);
  let dT = 0; function tick(dt) { if ((dT += dt) < 2) return; dT = 0; if (!H.guns) return; const d = daily(); if (!d.done && d.have >= d.c.n) { D.done = true; dsave(); const g = H.guns.state; g.score += d.c.pay; H.guns.save && H.guns.save(); H.lb && H.lb.add(d.c.pay, 'daily'); msg(`📅 DAILY CHALLENGE DONE — ${d.c.t}  +${d.c.pay}`, 5); H.vib && H.vib([30, 40, 60]); } }
  const KIND = { walker: 'Walkers', runner: 'Runners', brute: 'Brutes', crawler: 'Crawlers', bloater: 'Bloaters', lawman: 'Armored lawmen', coyote: 'Undead coyotes', boss: 'Hulking Dead', outlaw: 'Outlaws' };
  const GUN = { revolver: 'Six-shooter', rifle: 'Lever rifle', sniper: 'Buffalo rifle', tommy: 'Tommy gun', gold: 'Golden Buffalo', gatling: 'Gatling', m4: 'M4A1', mp5: 'MP5', shotgun: 'Coach gun', trample: 'Clydesdale trample', lasso: 'Lasso drag' };
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function html() { const s = H.stats || {}, g = H.guns && H.guns.state, B = H.bounty && H.bounty.state, n = v => (+v || 0).toLocaleString();
    const row = (k, v) => `<div class="r"><span>${k}</span><b>${v}</b></div>`;
    const kinds = Object.keys(KIND).filter(k => s['zk_' + k]).map(k => row(KIND[k], n(s['zk_' + k]) + (s['zh_' + k] ? ` <small>(${n(s['zh_' + k])} head)</small>` : ''))).join('');
    const guns = Object.keys(GUN).filter(k => s['k_' + k]).sort((a, b) => s['k_' + b] - s['k_' + a]).map(k => row(GUN[k], n(s['k_' + k]))).join('');
    const rank = H.bounty && H.bounty.rank ? H.bounty.rank() : '';
    const d = daily(); return `<button class="sx" data-x="1">✕</button><h3>📓 RIDER'S JOURNAL</h3>
      <div class="c"><h4>📅 Today's challenge</h4><div class="r" style="grid-column:1/-1"><span>${esc(d.c.t)} · +${d.c.pay}</span><b>${d.done ? '✅ DONE' : d.have + ' / ' + d.c.n}</b></div></div>
      <div class="c"><h4>The record</h4>${row('Points', n(g && g.score - (g.spent || 0)))}${row('Points earned (all time)', n(g && g.score))}${row('Zombies dropped', n(g && g.kills))}${row('Accuracy', g && g.shots ? Math.round(100 * g.hits / g.shots) + '%' : '—')}${row('Bounty jobs', B ? `${B.done.length}${rank ? ' · ' + esc(rank) : ''}` : '—')}${row('Distance ridden (bounty log)', B && B.prog && B.prog.ride ? n(Math.round(B.prog.ride)) + ' m' : '—')}</div>
      <div class="c"><h4>The dead, by kind</h4>${kinds || '<i>Nothing yet — go hunting</i>'}</div>
      <div class="c"><h4>Kills by weapon</h4>${guns || '<i>Nothing yet</i>'}</div>
      <div class="c"><h4>Frontier life</h4>${row('Night raids repelled', n(s.raids))}${row('Zombies roped', n(s.lassos))}${row('Mustangs tamed', n(s.tamed))}${row('Deer hunted', n(s.deer))}${row('Fish caught', n(s.fish))}${row('Derbies run', n(s.races))}${row('Train heists', n(s.heists))}${row('Revues staged', n(s.revues))}${row('Ghost Rider banished', n(s.ghost))}${row('Arm-wrestling wins', n(s.armWins))}${row('Gold pans that paid', n(s.panned))}</div>`; }
  function open() { if (!el) { el = document.createElement('div'); el.id = 'hrStats'; document.body.appendChild(el); const st = document.createElement('style');
      st.textContent = '#hrStats{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:84vh;overflow:auto;z-index:70;background:#21170e;border:2px solid #d9a656;border-radius:14px;color:#f3e2c0;font:600 13px system-ui,sans-serif;padding:12px 14px;display:none;box-shadow:0 10px 40px #000a}#hrStats.on{display:block}#hrStats h3{margin:0 0 8px;font:900 16px Georgia,serif;color:#ffd27a;letter-spacing:.06em}#hrStats h4{margin:8px 0 4px;font:800 11px system-ui;letter-spacing:.14em;color:#d9a656;text-transform:uppercase}#hrStats .c{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}#hrStats .c h4{grid-column:1/-1}#hrStats .r{display:flex;justify-content:space-between;border-bottom:1px solid #ffffff14;padding:2px 0}#hrStats b{color:#fff}#hrStats small{opacity:.7}#hrStats i{grid-column:1/-1;opacity:.6}#hrStats .sx{position:sticky;top:0;float:right;padding:0;font:900 16px system-ui;background:#d9a656;color:#21170e;border:0;border-radius:8px;width:34px;height:30px;z-index:2}@media (max-width:520px){#hrStats .c{grid-template-columns:1fr}}';
      document.head.appendChild(st); el.addEventListener('click', e => { if (e.target.dataset && e.target.dataset.x) close(); }); }
    el.innerHTML = html(); el.classList.add('on'); H.uiOpen = true; H.statsOpen = true; if (document.pointerLockElement) document.exitPointerLock(); }
  function close() { if (!el) return; el.classList.remove('on'); if (H.statsOpen) { H.statsOpen = false; H.uiOpen = false; } }
  const toggle = () => (el && el.classList.contains('on') ? close() : open());
  addEventListener('keydown', e => { if (e.target && /input|textarea/i.test(e.target.tagName)) return; if (e.code === 'KeyJ' && !e.repeat && H.on) toggle(); else if (e.code === 'Escape' && H.statsOpen) close(); });
  return { open, close, toggle, tick, daily };
}
