// v102 CAMP KIT (General Store): pitch a tent and campfire wherever you are, with N or ⋯ → Camp.
// The camp is a small zombie-free zone (they mill around outside it). Health comes back fast by the fire,
// and when you go down you respawn at your camp instead of the horse pen. You get one camp at a time,
// so pitching again moves it. Saved per rider.
import * as THREE from 'three';
export function createCamp({ scene, H, P, hAt, msg, sfx, mobile }) {
  const LS = 'hr_camp', PRICE = 900, R = 5.5; let st = { owned: false, pos: null }; try { Object.assign(st, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (_) {} };
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const g = new THREE.Group(); g.visible = false; scene.add(g); let rect = null;
  { // tent: canvas A-frame with ridge pole, flaps, guy lines; fire ring of stones, crossed logs, flames; bedroll; a stool log
    const canvas = new THREE.MeshStandardMaterial({ color: 0xd8c9a4, roughness: .95, side: THREE.DoubleSide }), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: .9 }), stone = new THREE.MeshStandardMaterial({ color: 0x7a7670, roughness: .95 }), roll = new THREE.MeshStandardMaterial({ color: 0x7a2a22, roughness: .9 });
    const tent = new THREE.Group(); tent.position.set(-2.4, 0, -.6); tent.rotation.y = .5; g.add(tent); const L = 2.4, W = 1.1, Ht = 1.35;
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(L, Math.hypot(W, Ht)), canvas); p.position.set(0, Ht / 2, s * W / 2); p.rotation.set(s * (Math.PI / 2 - Math.atan2(Ht, W)), 0, 0); p.castShadow = true; tent.add(p); }
    const back = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-L / 2, 0, -W), new THREE.Vector3(-L / 2, 0, W), new THREE.Vector3(-L / 2, Ht, 0)]), canvas); back.geometry.computeVertexNormals(); tent.add(back);
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, L + .3, 6), wood); ridge.rotation.z = Math.PI / 2; ridge.position.y = Ht + .02; tent.add(ridge);
    for (const x of [-L / 2 - .1, L / 2 + .1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, Ht + .1, 6), wood); pole.position.set(x, (Ht + .1) / 2, 0); tent.add(pole); }
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .9, 12), roll); bed.rotation.z = Math.PI / 2; bed.position.set(.2, .2, 0); tent.add(bed);
    const fire = new THREE.Group(); g.add(fire);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, s = new THREE.Mesh(new THREE.DodecahedronGeometry(.16 + (i % 3) * .03, 0), stone); s.position.set(Math.cos(a) * .55, .08, Math.sin(a) * .55); s.rotation.set(i, i * 2, 0); s.castShadow = true; fire.add(s); }
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .8, 7), wood); l.rotation.set(Math.PI / 2 - .35, i * 2.1, 0); l.position.y = .18; fire.add(l); }
    const flameM = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
    const flames = []; for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.16 - i * .025, .6 - i * .08, 8, 1, true), flameM); f.position.set((i % 2 - .5) * .1, .45, ((i >> 1) - .5) * .1); fire.add(f); flames.push(f); }
    const gt = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,170,80,1)'); gr.addColorStop(.35, 'rgba(255,120,40,.45)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ map: gt, color: 0xffffff, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = .04; fire.add(glow);
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(.22, .24, .4, 10), wood); stool.position.set(1.2, .2, .5); g.add(stool);
    g.userData = { flames, glow }; }
  // v115 campfire cooking: every deer you hunt is a cut of venison; cook one at your fire for a full heal + "well fed" (25% less damage for 3 min)
  if (st.lastDeer == null) st.lastDeer = (H.stats && H.stats.deer) || 0; st.meat = st.meat || 0; let cookSpot = null;
  function cook() { if (!st.meat) { msg('🍖 No venison — hunt a deer out on the range first', 2.2); return; } st.meat--; save(); const Z = H.zombies; if (Z) Z.state.hp = 100; H.wellFed = 180; tone('sawtooth', 200, 120, .4, .05); msg(`🍖 Venison off the fire — full health and WELL FED for 3 min (${st.meat} left)`, 3); }
  const hookUse = () => { const T = H.town2; if (!T || T.cookHooked) return; T.cookHooked = true; const prev = T.onUse; T.onUse = o => (o && o.kind === 'cook') ? (cook(), true) : (prev ? prev(o) : false); if (T.TL) T.TL.cook = 'COOK<small>VENISON</small>'; };
  function place(x, z) { const y = hAt(x, z); g.position.set(x, y, z); g.visible = true; for (const c of g.children) if (c.isGroup && c !== g) { /* tent / fire sit on the slope */ c.position.y = hAt(x + c.position.x, z + c.position.z) - y; }
    if (rect) { const i = H.safeRects.indexOf(rect); if (i >= 0) H.safeRects.splice(i, 1); } rect = { x, z, hw: R, hd: R, name: 'YOUR CAMP', label: '🛡 NO ZOMBIES · YOUR CAMP', camp: true }; (H.safeRects || (H.safeRects = [])).push(rect); H.campPos = [x, z]; const T = H.town2; if (T && T.spots) { hookUse(); if (!cookSpot) { cookSpot = { kind: 'cook', label: 'Cook venison at the fire', r: 1.8 }; T.spots.push(cookSpot); } Object.assign(cookSpot, { x: x + .9, z: z + .9, y }); } }
  function make() { if (!st.owned) { msg('Buy a Camp kit at the General Store (900)', 2); return; } if (H.mounted || H.uiOpen || H.dead) { msg(H.mounted ? 'Get off your horse to make camp' : 'Not now', 1.5); return; }
    const z = H.zombies; if (z && z.inSafeZone && z.inSafeZone(P.pos.x, P.pos.z) && !(rect && Math.hypot(P.pos.x - rect.x, P.pos.z - rect.z) < R)) { msg('Pick open ground to make camp', 1.6); return; }
    if (z) for (const o of z.list) if (o.alive && o.kind !== 'outlaw' && Math.hypot(o.pos.x - P.pos.x, o.pos.z - P.pos.z) < 12) { msg('Too many dead nearby — clear them first', 1.8); return; }
    const f = { x: -Math.sin(P.yaw), z: -Math.cos(P.yaw) }, x = P.pos.x + f.x * 2.5, zz = P.pos.z + f.z * 2.5; place(x, zz); st.pos = [+x.toFixed(1), +zz.toFixed(1)]; save();
    msg('⛺ Camp made — no zombies inside, fast healing by the fire, and you respawn here', 3.5); tone('triangle', 330, 440, .3, .2); H.vib && H.vib(20); }
  function tick(dt) { if (H.wellFed > 0) { H.wellFed -= dt; if (H.wellFed <= 0) msg('No longer well fed', 1.5); } const dd = (H.stats && H.stats.deer) || 0; if (dd > st.lastDeer) { st.meat += dd - st.lastDeer; st.lastDeer = dd; save(); msg(`🍖 +1 venison (${st.meat}) — cook it at your camp fire`, 2.2); } if (!g.visible) return; const t = performance.now() / 1000, U = g.userData; const near = Math.hypot(P.pos.x - g.position.x, P.pos.z - g.position.z);
    if (near < 120) { U.flames.forEach((f, i) => { f.scale.set(1 + Math.sin(t * 9 + i) * .12, 1 + Math.sin(t * 13 + i * 2) * .2, 1 + Math.cos(t * 11 + i) * .12); f.rotation.y = t * (1 + i * .3); }); U.glow.material.opacity = (.05 + (H.night || 0) * .16) * (1 + Math.sin(t * 17) * .08); }
    const Z = H.zombies; if (Z && near < R && !H.dead && Z.state.hp < 100) Z.state.hp = Math.min(100, Z.state.hp + 14 * dt); /* warm by the fire */ }
  if (st.owned && st.pos) place(st.pos[0], st.pos[1]);
  addEventListener('keydown', e => { if (e.code === 'KeyN' && !e.repeat && H.on && !(e.target && /input|textarea/i.test(e.target.tagName))) make(); });
  const item = { state: { id: 'camp', name: '⛺ Camp kit · pitch a zombie-free camp anywhere (N / ⋯ → Camp): fast healing + your respawn point', price: PRICE, get owned() { return st.owned; }, maxed: false, get label() { return st.owned ? 'HOW TO' : ''; } },
    buy() { const gg = H.guns; if (gg.pts() < PRICE) { msg('Not enough points', 1.5); return; } gg.state.spent = (gg.state.spent || 0) + PRICE; gg.save(); st.owned = true; save(); msg('⛺ Camp kit bought — press N (or ⋯ → Camp) out on the range', 3.5); },
    toggle() { msg('Press N (or ⋯ → Camp) on open ground to pitch your camp', 2.5); } };
  return { make, tick, item, state: st, group: g };
}
