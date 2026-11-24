// v105 RIDER'S JOURNAL: your lifetime stats in one panel. Open it with J or ⋯ → Stats.
// It only reads data the game already keeps (H.stats, guns, bounty board, ranch); nothing new is saved.
export function createStats({ H, msg }) {
  let el = null;
  const KIND = { walker: 'Walkers', runner: 'Runners', brute: 'Brutes', crawler: 'Crawlers', bloater: 'Bloaters', lawman: 'Armored lawmen', boss: 'Hulking Dead', outlaw: 'Outlaws' };
  const GUN = { revolver: 'Six-shooter', rifle: 'Lever rifle', sniper: 'Buffalo rifle', tommy: 'Tommy gun', gold: 'Golden Buffalo', gatling: 'Gatling', m4: 'M4A1', mp5: 'MP5', shotgun: 'Coach gun', trample: 'Clydesdale trample', lasso: 'Lasso drag' };
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function html() { const s = H.stats || {}, g = H.guns && H.guns.state, B = H.bounty && H.bounty.state, n = v => (+v || 0).toLocaleString();
    const row = (k, v) => `<div class="r"><span>${k}</span><b>${v}</b></div>`;
    const kinds = Object.keys(KIND).filter(k => s['zk_' + k]).map(k => row(KIND[k], n(s['zk_' + k]) + (s['zh_' + k] ? ` <small>(${n(s['zh_' + k])} head)</small>` : ''))).join('');
    const guns = Object.keys(GUN).filter(k => s['k_' + k]).sort((a, b) => s['k_' + b] - s['k_' + a]).map(k => row(GUN[k], n(s['k_' + k]))).join('');
    const rank = H.bounty && H.bounty.rank ? H.bounty.rank() : '';
    return `<button class="sx" data-x="1">✕</button><h3>📓 RIDER'S JOURNAL</h3>
      <div class="c"><h4>The record</h4>${row('Points', n(g && g.score - (g.spent || 0)))}${row('Points earned (all time)', n(g && g.score))}${row('Zombies dropped', n(g && g.kills))}${row('Accuracy', g && g.shots ? Math.round(100 * g.hits / g.shots) + '%' : '—')}${row('Bounty jobs', B ? `${B.done.length}${rank ? ' · ' + esc(rank) : ''}` : '—')}${row('Distance ridden (bounty log)', B && B.prog && B.prog.ride ? n(Math.round(B.prog.ride)) + ' m' : '—')}</div>
      <div class="c"><h4>The dead, by kind</h4>${kinds || '<i>Nothing yet — go hunting</i>'}</div>
      <div class="c"><h4>Kills by weapon</h4>${guns || '<i>Nothing yet</i>'}</div>
      <div class="c"><h4>Frontier life</h4>${row('Night raids repelled', n(s.raids))}${row('Zombies roped', n(s.lassos))}${row('Mustangs tamed', n(s.tamed))}${row('Deer hunted', n(s.deer))}${row('Fish caught', n(s.fish))}${row('Derbies run', n(s.races))}${row('Train heists', n(s.heists))}${row('Revues staged', n(s.revues))}${row('Ghost Rider banished', n(s.ghost))}</div>`; }
  function open() { if (!el) { el = document.createElement('div'); el.id = 'hrStats'; document.body.appendChild(el); const st = document.createElement('style');
      st.textContent = '#hrStats{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:84vh;overflow:auto;z-index:70;background:#21170e;border:2px solid #d9a656;border-radius:14px;color:#f3e2c0;font:600 13px system-ui,sans-serif;padding:12px 14px;display:none;box-shadow:0 10px 40px #000a}#hrStats.on{display:block}#hrStats h3{margin:0 0 8px;font:900 16px Georgia,serif;color:#ffd27a;letter-spacing:.06em}#hrStats h4{margin:8px 0 4px;font:800 11px system-ui;letter-spacing:.14em;color:#d9a656;text-transform:uppercase}#hrStats .c{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}#hrStats .c h4{grid-column:1/-1}#hrStats .r{display:flex;justify-content:space-between;border-bottom:1px solid #ffffff14;padding:2px 0}#hrStats b{color:#fff}#hrStats small{opacity:.7}#hrStats i{grid-column:1/-1;opacity:.6}#hrStats .sx{position:sticky;top:0;float:right;padding:0;font:900 16px system-ui;background:#d9a656;color:#21170e;border:0;border-radius:8px;width:34px;height:30px;z-index:2}@media (max-width:520px){#hrStats .c{grid-template-columns:1fr}}';
      document.head.appendChild(st); el.addEventListener('click', e => { if (e.target.dataset && e.target.dataset.x) close(); }); }
    el.innerHTML = html(); el.classList.add('on'); H.uiOpen = true; H.statsOpen = true; if (document.pointerLockElement) document.exitPointerLock(); }
  function close() { if (!el) return; el.classList.remove('on'); if (H.statsOpen) { H.statsOpen = false; H.uiOpen = false; } }
  const toggle = () => (el && el.classList.contains('on') ? close() : open());
  addEventListener('keydown', e => { if (e.target && /input|textarea/i.test(e.target.tagName)) return; if (e.code === 'KeyJ' && !e.repeat && H.on) toggle(); else if (e.code === 'Escape' && H.statsOpen) close(); });
  return { open, close, toggle };
}
