// v91 HORSE BREEDS + NAMING. Your breed rides on whichever horse you mount, the same way your coat does.
//  Mustang (free) · Quarter Horse · Appaloosa · Arabian · Clydesdale. Each breed changes speed, stamina, toughness and size.
//  A Clydesdale tramples the dead when it gallops into them.
// Name your horse at the General Store. The name shows while you ride and on your horse's map pin.
const BREEDS = [
  { id: 'mustang', n: 'Mustang', price: 0, spd: 1, drain: 1, armor: 1, s: 1, about: 'tough all-rounder' },
  { id: 'quarter', n: 'Quarter Horse', price: 2500, spd: 1.05, drain: .9, armor: .95, s: .98, about: '+5% speed, steady' },
  { id: 'appaloosa', n: 'Appaloosa', price: 3000, spd: 1.03, drain: .75, armor: .85, s: 1, about: 'stamina + hardy' },
  { id: 'arabian', n: 'Arabian', price: 4500, spd: 1.1, drain: .7, armor: 1.1, s: .96, about: '+10% speed, tireless, delicate' },
  { id: 'clyde', n: 'Clydesdale', price: 5000, spd: .9, drain: .8, armor: .55, s: 1.08, about: 'huge + armored, tramples zombies' },
];
export function createBreeds({ H, msg, sfx }) {
  const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (_) { return d; } }, sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const st = Object.assign({ owned: ['mustang'], on: 'mustang' }, ld('hr_breed', {})); let name = String(ld('hr_hname', '') || '');
  const cur = () => BREEDS.find(b => b.id === st.on) || BREEDS[0];
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  function onMount(h) { const b = cur(); if (h.baseS == null) h.baseS = h.g.scale.x; h.g.scale.setScalar(h.baseS * b.s); }
  function onDismount(h) { if (h && h.baseS != null) h.g.scale.setScalar(h.baseS); }
  const hit = new WeakMap();
  // v139 name tag above your horse when you're on foot nearby
  let tag = null, tagName = ''; function tagTick() { const h = H.lastHorse, P0 = window.__P; const show = !!(name && h && !H.mounted && P0 && Math.hypot(h.pos.x - P0.pos.x, h.pos.z - P0.pos.z) < 18);
    if (show && (!tag || tagName !== name)) { const THREE = window.__THREE; if (!THREE) return; if (tag) tag.removeFromParent(); const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = 'rgba(20,14,8,.7)'; x.beginPath(); x.roundRect ? x.roundRect(4, 8, 248, 48, 20) : x.rect(4, 8, 248, 48); x.fill(); x.fillStyle = '#ffd27a'; x.font = '800 30px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🐴 ' + name, 128, 33);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); tag.scale.set(1.6, .4, 1); tag.renderOrder = 9; tagName = name; }
    if (!tag) return; if (show) { if (tag.parent !== h.g.parent) h.g.parent && h.g.parent.add(tag); tag.position.set(h.pos.x, h.pos.y + 2.55, h.pos.z); tag.visible = true; } else tag.visible = false; }
  function tick(dt) { tagTick(); const h = H.mounted; if (!h || cur().id !== 'clyde' || (H.speed || 0) < 6) return; const Z = H.zombies; if (!Z) return; const fx = -Math.sin(h.yaw), fz = -Math.cos(h.yaw), now = performance.now();
    for (const o of Z.list) { if (!o.alive || o.kind === 'boss' || o.kind === 'outlaw') continue; const dx = o.pos.x - h.pos.x, dz = o.pos.z - h.pos.z, d = Math.hypot(dx, dz); if (d > 2.3 || (dx * fx + dz * fz) < 0) continue; if (now - (hit.get(o) || 0) < 900) continue; hit.set(o, now);
      o.push = [dx / d * 6 + fx * 4, dz / d * 6 + fz * 4]; o.flinch = 1; Z.onHit && Z.onHit(o, 'trample', false, o.pos.clone(), null, 70 / 50); tone('square', 110, 50, .12, .3); H.vib && H.vib(25); } }

  // ---- naming panel ----
  function rename() { if (typeof document === 'undefined') return; let el = document.getElementById('hrName');
    if (!el) { el = document.createElement('div'); el.id = 'hrName'; el.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:#0007';
      el.innerHTML = '<div style="background:#2a1d12;border:2px solid #d9a656;border-radius:12px;padding:16px 18px;color:#f3e2c0;font:600 15px system-ui,sans-serif;min-width:260px;text-align:center"><div style="font-weight:900;margin-bottom:8px">🐴 Name your horse</div><input maxlength="16" style="width:100%;box-sizing:border-box;font:700 18px system-ui;padding:8px;border-radius:8px;border:1px solid #d9a656;background:#120c08;color:#fff;text-align:center" placeholder="e.g. Thunder"><div style="margin-top:10px;display:flex;gap:8px;justify-content:center"><button data-k="ok" style="font:800 15px system-ui;padding:8px 18px;border-radius:8px;border:0;background:#d9a656;color:#2a1d12">SAVE</button><button data-k="x" style="font:800 15px system-ui;padding:8px 14px;border-radius:8px;border:1px solid #d9a656;background:none;color:#f3e2c0">Cancel</button></div></div>';
      document.body.appendChild(el); const inp = el.querySelector('input'), close = () => { el.style.display = 'none'; };
      const ok = () => { const v = inp.value.replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); name = v; sv('hr_hname', v); close(); msg(v ? `🐴 Your horse is now called ${v}` : 'Name cleared', 2.5); tone('triangle', 523, 784, .25, .2); };
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') ok(); if (e.key === 'Escape') close(); }); inp.addEventListener('keyup', e => e.stopPropagation());
      el.addEventListener('click', e => { const k = e.target.dataset && e.target.dataset.k; if (k === 'ok') ok(); else if (k === 'x' || e.target === el) close(); }); }
    el.style.display = 'flex'; const inp = el.querySelector('input'); inp.value = name; setTimeout(() => inp.focus(), 30); }

  const items = BREEDS.map(b => ({ state: { id: 'breed-' + b.id, name: `🐎 ${b.n} · ${b.about}`, price: b.price, get owned() { return st.owned.includes(b.id); }, get equipped() { return st.on === b.id; }, maxed: false, get label() { return st.owned.includes(b.id) ? (st.on === b.id ? 'RIDING' : 'RIDE THIS') : ''; } },
    buy() { const g = H.guns; if (g.pts() < b.price) { msg('Not enough points', 1.5); return; } g.state.spent = (g.state.spent || 0) + b.price; g.save(); st.owned.push(b.id); st.on = b.id; sv('hr_breed', st); if (H.mounted) onMount(H.mounted); msg(`🐎 You traded up to a ${b.n}! It's the horse you'll ride from now on`, 3.5); },
    toggle() { st.on = b.id; sv('hr_breed', st); if (H.mounted) onMount(H.mounted); msg(`Riding a ${b.n}`, 1.4); } }));
  items.push({ state: { id: 'hname', name: '📝 Name your horse' + (name ? '' : ''), price: 0, owned: true, maxed: false, get label() { return name ? 'RENAME' : 'NAME'; } }, buy() { rename(); }, toggle() { rename(); } });
  return { items, tick, onMount, onDismount, rename, list: BREEDS, state: st, get name() { return name; },
    spd: () => cur().spd, drain: () => cur().drain, armor: () => cur().armor, breed: cur,
    label: () => (name ? `“${name}” the ` : '') + cur().n };
}
