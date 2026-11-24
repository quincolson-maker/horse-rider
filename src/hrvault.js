// v136 THE GENERAL STORE SAFE (night only): crack the three-number dial in the back room for 1,500.
// Press SPACE or tap CRACK when the needle is in the gold notch. Cracking it (or fumbling twice) brings a posse of
// three deputies riding in for 90 s. Go down while they're on you and you drop half the loot. One job per night.
import * as THREE from 'three';
export function createVault({ scene, H, P, T, msg, sfx, hAt }) {
  const s = T.structs.find(q => q.kind === 'town'); if (!s) return null;
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a), cyc = () => Math.floor(Date.now() / 1200000);
  const [sx, sz] = T.toW(s, 9.1, 7.1), sy = s.y0 + s.F; let done = -1; try { done = +(localStorage.getItem('hr_vault') || -1); } catch (_) {}
  { const g = new THREE.Group(); g.position.set(sx, sy, sz); g.rotation.y = (s.rot || 0) + Math.PI; scene.add(g); const iron = new THREE.MeshStandardMaterial({ color: 0x2a2e30, metalness: .7, roughness: .45 }), gold = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: .9, roughness: .3 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.1, .8), iron); b.position.y = .55; b.castShadow = true; g.add(b); const d = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .05, 20), gold); d.rotation.x = Math.PI / 2; d.position.set(0, .7, .42); g.add(d); const h = new THREE.Mesh(new THREE.BoxGeometry(.3, .04, .04), gold); h.position.set(0, .45, .42); g.add(h); }
  const spot = { x: sx, z: sz, y: sy, kind: 'vault', label: 'Crack the safe (night)', r: 1.6 }; T.spots.push(spot); if (T.TL) T.TL.vault = 'CRACK<small>SAFE</small>';
  let el = null, G = null, W = null;
  function ui() { if (el) return; el = document.createElement('div'); el.id = 'hrVault'; document.body.appendChild(el); const st = document.createElement('style');
    st.textContent = '#hrVault{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:72;background:#15181a;border:2px solid #d9a656;border-radius:14px;color:#f3e2c0;font:800 14px system-ui,sans-serif;padding:14px;text-align:center;display:none;width:min(340px,90vw)}#hrVault.on{display:block}#hrVault .dial{position:relative;width:180px;height:180px;margin:10px auto;border-radius:50%;background:radial-gradient(circle,#2a2e30 55%,#3a3e40 56%);border:4px solid #d9a656}#hrVault .z{position:absolute;inset:0;border-radius:50%}#hrVault .n{position:absolute;left:50%;top:50%;width:4px;height:80px;margin-left:-2px;background:#fff;transform-origin:50% 0;box-shadow:0 0 6px #fff}#hrVault button{font:900 18px system-ui;padding:14px 26px;border-radius:12px;border:0;background:#d9a656;color:#21170e;touch-action:manipulation}';
    document.head.appendChild(st); el.addEventListener('pointerdown', e => { if (e.target.dataset && e.target.dataset.k) { e.preventDefault(); e.target.dataset.k === 'x' ? close() : crack(); } }); }
  function open() { if ((H.night || 0) < .5) { msg('The shopkeeper is right there — come back after dark', 2); return; } if (done === cyc()) { msg('The safe is already empty tonight', 1.6); return; } if (W) { msg('Lose the posse first!', 1.5); return; }
    ui(); G = { k: 0, a: 0, sp: 2.2, z: Math.random() * 6.28, fails: 0 }; el.classList.add('on'); H.uiOpen = true; H.vaultOpen = true; if (document.pointerLockElement) document.exitPointerLock(); render(); }
  function close() { if (el) el.classList.remove('on'); G = null; if (H.vaultOpen) { H.vaultOpen = false; H.uiOpen = false; } }
  function render() { const zd = G.z * 180 / Math.PI; el.innerHTML = `<div>🔐 SAFE · number ${G.k + 1} of 3</div><div class="dial"><div class="z" style="background:conic-gradient(from ${zd - 14}deg,#ffd34a 0 28deg,transparent 28deg)"></div><div class="n"></div></div><button data-k="c">CRACK</button> <button data-k="x" style="background:#444;color:#ddd">LEAVE</button>`; }
  function crack() { if (!G) return; let d = Math.abs(((G.a - G.z) % 6.283 + 9.42) % 6.283 - 3.14); if (d < .26) { G.k++; tone('square', 900 + G.k * 200, 900, .06, .2); if (G.k >= 3) return win(); G.z = Math.random() * 6.28; G.sp *= 1.35; render(); }
    else { G.fails++; tone('sawtooth', 160, 90, .2, .2); if (G.fails >= 2) { close(); msg('🔔 The alarm bell! Deputies are coming!', 3); posse(0); } } }
  function win() { close(); done = cyc(); try { localStorage.setItem('hr_vault', String(done)); } catch (_) {} const g = H.guns; if (g) { g.state.score += 1500; g.save && g.save(); } const st = H.stats || (H.stats = {}); st.safes = (st.safes || 0) + 1;
    msg('💰 The safe swings open — +1,500! A posse is riding in…', 4); tone('triangle', 523, 1046, .4, .25); posse(1500); }
  function posse(loot) { const Z = H.zombies; if (!Z || !Z.spawnOutlaw) return; W = { t: 90, loot, list: [] }; H.wanted = true;
    for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, x = P.pos.x + Math.cos(a) * 45, z = P.pos.z + Math.sin(a) * 45; try { const o = Z.spawnOutlaw(x, z, hAt(x, z), 0, 'posse'); o.hostile = true; o.posse = true; o.wantedName = null; W.list.push(o); } catch (e) { console.warn('posse', e); } } }
  function tick(dt) { if (G && el) { G.a += G.sp * dt; const n = el.querySelector('.n'); if (n) n.style.transform = `rotate(${G.a * 180 / Math.PI + 180}deg)`; }
    if (!W) return; W.t -= dt; for (const o of W.list) if (o.alive) { const a = (W.list.indexOf(o) / 3) * 6.28; o.post = [P.pos.x + Math.cos(a) * 6, P.pos.z + Math.sin(a) * 6]; }
    const alive = W.list.filter(o => o.alive).length;
    if (H.dead && W.loot) { const g = H.guns; if (g) { g.state.score -= Math.round(W.loot / 2); g.save && g.save(); } msg(`The deputies took back ${Math.round(W.loot / 2)}`, 3); end(); return; }
    if (!alive || W.t <= 0) { msg(alive ? '🐎 You shook the posse — the loot is yours' : '🤠 Posse down — the loot is yours', 3); end(); } }
  function end() { if (W) for (const o of W.list) if (o.alive && H.zombies.despawn) { try { H.zombies.despawn(o); } catch (_) {} } W = null; H.wanted = false; }
  const prev = T.onUse; T.onUse = o => (o === spot ? (open(), true) : (prev ? prev(o) : false));
  addEventListener('keydown', e => { if (!H.vaultOpen) return; if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) crack(); } else if (e.code === 'Escape') close(); }, true);
  return { tick, open };
}
