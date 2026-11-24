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
  // v150 lantern (600): a warm light that follows you at night (desktop gets a real light; phones a soft glow sprite)
  const THREE = window.__THREE; let lamp = null, glow = null;
  if (THREE) { if (!H.mobileLite && !(window.matchMedia && matchMedia('(pointer: coarse)').matches)) { lamp = new THREE.PointLight(0xffb060, 0, 16, 1.6); window.__GX && window.__GX.scene.add(lamp); }
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,190,110,.9)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(1.1); glow.visible = false; window.__GX && window.__GX.scene.add(glow); }
  function lampTick() { const on = !!st.lantern && st.lampOn !== false && (H.night || 0) > .45 && !(H.saloon && H.saloon.inside && H.saloon.inside()), P0 = window.__P; if (!P0) return; const p = H.mounted ? H.mounted.pos : P0.pos;
    if (lamp) { lamp.intensity += ((on ? 9 : 0) - lamp.intensity) * .1; lamp.position.set(p.x, p.y + (H.mounted ? 2.4 : 1.6), p.z); } if (glow) { glow.visible = on; if (on) glow.position.set(p.x + .3, p.y + (H.mounted ? 1.9 : 1.05), p.z); } }
  items.push({ state: { id: 'lantern', name: '🏮 Lantern · lights your way at night (on/off here)', price: 600, get owned() { return !!st.lantern; }, get equipped() { return st.lampOn !== false; }, maxed: false, get label() { return st.lantern ? (st.lampOn !== false ? 'TURN OFF' : 'TURN ON') : ''; } },
    buy() { if (!pay(600)) return; st.lantern = true; st.lampOn = true; save(); msg('🏮 Lantern lit — it glows whenever it is dark out', 2.5); }, toggle() { st.lampOn = st.lampOn === false; save(); msg(st.lampOn ? 'Lantern on' : 'Lantern off', 1.2); } });
  return { items, feed, state: st, lampTick };
}
