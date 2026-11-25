// v49 GLOBAL WEEKLY LEADERBOARD: your points earned this week (kills, bosses, bounties; never dev/gift money) are posted to the
// lobby server every minute; the 🏆 panel shows the top riders. Works offline (just shows your own week until the server answers).
import { LOBBY_URL } from './lobby.js?v=378';
const isoWeek = (d = new Date()) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-W' + String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0'); };
export function createLeaderboard({ H }) {
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } };
  let id = ls('hr_rid'); if (!id || id.length < 8) { id = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); ls('hr_rid', id); }
  let W = { week: isoWeek(), pts: 0, k: 0, b: 0 }; try { const v = JSON.parse(ls('hr_week') || 'null'); if (v && v.week === W.week) W = Object.assign(W, v); } catch (_) {}
  let dirty = true, top = null, me = 0, online = null, sentT = 0;
  const save = () => ls('hr_week', JSON.stringify(W));
  const roll = () => { const w = isoWeek(); if (W.week !== w) { W = { week: w, pts: 0, k: 0, b: 0 }; save(); } };
  function add(pts, kind) { roll(); W.pts += Math.max(0, pts | 0); if (kind === 'kill') W.k++; if (kind === 'boss') { W.k++; W.b++; } dirty = true; save(); }
  async function post() { if (!LOBBY_URL) return; roll(); const name = (H.callsign ? H.callsign() : 'Rider').slice(0, 16), stars = H.bounty ? H.bounty.state.done.length : 0;
    try { const r = await fetch(LOBBY_URL + '/lb', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ id, week: W.week, name, pts: W.pts, k: W.k, b: W.b, s: stars, rank: H.bounty ? H.bounty.rank() : '' }) });
      if (r.ok) { const j = await r.json(); top = j.top || top; me = j.me || me; online = true; dirty = false; } else online = online || false; } catch (_) { online = false; } render(); }
  async function pull() { if (!LOBBY_URL) return; try { const r = await fetch(LOBBY_URL + '/lb?n=25'); if (r.ok) { const j = await r.json(); top = j.top; online = true; } else online = false; } catch (_) { online = false; } render(); }
  // ---- panel ----
  const st = document.createElement('style'); st.textContent = `#hrLBG{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}#hrLBG.on{display:flex}
#hrLBG .box{width:min(440px,92vw);max-height:84vh;overflow:auto;background:linear-gradient(180deg,#2a1c0c,#160e06);border:2px solid #e2b24a;border-radius:14px;color:#fff;font:600 13px/1.35 system-ui,sans-serif;padding:14px 14px 10px;box-shadow:0 10px 40px rgba(0,0,0,.6)}
#hrLBG h3{margin:0 0 2px;font:900 20px/1.1 system-ui,sans-serif;color:#ffd77a;letter-spacing:.04em}#hrLBG .sub{opacity:.7;font-size:11px;margin-bottom:8px}#hrLBG table{width:100%;border-collapse:collapse}
#hrLBG td,#hrLBG th{padding:5px 4px;text-align:right;white-space:nowrap}#hrLBG th{font-size:10px;letter-spacing:.1em;color:#e8c27a;border-bottom:1px solid rgba(226,178,74,.4)}#hrLBG td:nth-child(2),#hrLBG th:nth-child(2){text-align:left;white-space:normal}
#hrLBG tr.me td{background:rgba(255,210,58,.16)}#hrLBG tr:nth-child(2) td:first-child{color:#ffd23a}#hrLBG .x{float:right;display:inline-block;background:none;border:1px solid #e2b24a;color:#ffd77a;border-radius:8px;padding:2px 10px;font-weight:800;cursor:pointer}
#hrLBG .mine{margin-top:8px;padding:8px;border-radius:9px;background:rgba(255,255,255,.07);font-size:12px}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'hrLBG'; el.innerHTML = '<div class="box"><div class="x" role="button">✕</div><h3>🏆 Riders of the Week</h3><div class="sub"></div><table></table><div class="mine"></div></div>'; document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el || e.target.classList.contains('x')) close(); }); el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function render() { if (!el.classList.contains('on')) return; const myName = (H.callsign ? H.callsign() : 'Rider').slice(0, 16);
    el.querySelector('.sub').textContent = `Week ${W.week.split('-W')[1]} · resets Monday · points from kills, bosses & bounties` + (online === false ? ' · server offline, showing your week' : '');
    const rows = (top || []).map((r, i) => `<tr class="${r.name === myName && r.pts === W.pts ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}<div style="font-size:10px;opacity:.6">${esc(r.rank || '')}</div></td><td>${r.k}</td><td>${r.b}</td><td>★${r.s}</td><td><b>${r.pts.toLocaleString()}</b></td></tr>`).join('');
    el.querySelector('table').innerHTML = '<tr><th>#</th><th>RIDER</th><th>KILLS</th><th>BOSSES</th><th>★</th><th>PTS</th></tr>' + (rows || `<tr><td colspan="6" style="text-align:center;opacity:.7;padding:14px">${online === null ? 'Loading…' : online ? 'No riders yet this week — be the first!' : 'Leaderboard server not reachable yet.'}</td></tr>`);
    el.querySelector('.mine').innerHTML = `<b>You this week:</b> ${W.pts.toLocaleString()} pts · ${W.k} kills · ${W.b} bosses${me ? ` · <b>#${me}</b>` : ''}`; }
  function open() { el.classList.add('on'); render(); post().then(pull); }
  function close() { el.classList.remove('on'); }
  setInterval(() => { if (dirty && document.visibilityState !== 'hidden') post(); }, 60000);
  setTimeout(post, 8000);
  return { add, open, close, get week() { return W; } };
}
