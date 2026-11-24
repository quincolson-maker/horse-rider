// v125 TRAIL GEAR at the General Store (passive perks, game points):
//  🥤 Canteen (700): health comes back 60% faster.
//  ⭐ Silver spurs (900): +10% speed on foot and +4% at a gallop.
//  🍎 Apples (40 each, stack up to 10): press Y next to your horse, or when mounted, to feed it. Heals it fully and refills its stamina.
export function createGear({ H, msg, sfx }) {
  const LS = 'hr_gear'; let st = { canteen: false, spurs: false, apples: 0 }; try { Object.assign(st, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (_) {} };
  const pay = p => { const g = H.guns; if (!g || g.pts() < p) { msg('Not enough points', 1.5); return false; } g.state.spent = (g.state.spent || 0) + p; g.save && g.save(); return true; };
  const apply = () => { H.regenMul = st.canteen ? 1.6 : 1; H.spurMul = st.spurs ? 1.1 : 1; H.gallopMul = st.spurs ? 1.04 : 1; }; apply();
  function feed() { const h = H.mounted || (H.lastHorse && Math.hypot(H.lastHorse.pos.x - (window.__P ? window.__P.pos.x : 0), H.lastHorse.pos.z - (window.__P ? window.__P.pos.z : 0)) < 4 ? H.lastHorse : null);
    if (!st.apples) { msg('🍎 No apples — buy some at the General Store', 1.8); return; } if (!h) { msg('Get close to your horse to feed it', 1.6); return; }
    st.apples--; save(); h.hp = 16; h.panic = 0; H.stam = 100; H.winded = 0; msg(`🍎 Crunch! Your horse is fresh as a daisy (${st.apples} apples left)`, 2.4); if (sfx && sfx.ctx && sfx.tone) sfx.tone('triangle', 330, 520, .2, .12); H.vib && H.vib(15); }
  addEventListener('keydown', e => { if (e.code === 'KeyY' && !e.repeat && H.on && !H.uiOpen && !(e.target && /input|textarea/i.test(e.target.tagName))) feed(); });
  const perk = (id, name, price) => ({ state: { id, name, price, get owned() { return !!st[id]; }, maxed: false, get label() { return st[id] ? 'OWNED' : ''; } }, buy() { if (!pay(price)) return; st[id] = true; save(); apply(); msg(name.split(' · ')[0] + ' — yours', 2); }, toggle() { msg('Already yours — it works all the time', 1.5); } });
  const items = [perk('canteen', '🥤 Canteen · health comes back 60% faster', 700), perk('spurs', '⭐ Silver spurs · +10% on foot, +4% at a gallop', 900),
    { state: { id: 'apples', name: '🍎 Apple for your horse · Y to feed: full health + stamina', price: 40, get owned() { return false; }, maxed: false, get label() { return st.apples >= 10 ? 'FULL (10)' : `BUY · ${st.apples}/10`; } },
      buy() { if (st.apples >= 10) { msg('Your saddlebag holds 10 apples', 1.4); return; } if (!pay(40)) return; st.apples++; save(); msg(`🍎 ${st.apples} apple${st.apples > 1 ? 's' : ''} in the saddlebag — Y to feed your horse`, 2); }, toggle() {} }];
  return { items, feed, state: st };
}
