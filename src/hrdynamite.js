// v42 DYNAMITE — a quick-use throwable, sold at the General Store (25 sticks for 500 pts).
//  - G (desktop) or the 🧨 button (phone): press to light the fuse, hold to wind up (longer = farther, a dotted arc shows
//    where it lands), release to throw. A quick tap is a short lob. The draw is instant: no need to holster your gun.
//  - the stick: red paper with a printed band, a fuse that sparks and burns down; it tumbles in flight, bounces and rolls
//  - boom 2.2 s after lighting: fireball, shockwave ring, debris, smoke, camera shake, deep layered blast with echo
//  - damage: up to 420 to every zombie / outlaw within 7 m (falls off to a third at the edge); NEVER hurts you (or your horse)
import * as THREE from 'three';

export const DYN = { price: 500, pack: 25, fuse: 2.2, radius: 7, dmg: 420, minV: 7, maxV: 27, charge: .9, g: 20 };

export function createDynamite(c) {
  const { scene, H, P, camera, sfx, msg, mobile, fx, ground } = c;
  const S = { count: (() => { try { return +localStorage.getItem('hr_dyn') || 0; } catch (_) { return 0; } })(), holding: false, chargeT: 0, lit: 0, thrown: 0, kills: 0 };
  const save = () => { try { localStorage.setItem('hr_dyn', String(S.count)); } catch (_) {} };

  // ---- the stick (shared geometry) ----
  const label = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#c4231c'; x.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; x.fillRect(Math.random() * 256, Math.random() * 64, 3, 1); }
    x.fillStyle = '#f0e2c0'; x.fillRect(0, 22, 256, 20); x.fillStyle = '#2a1408'; x.font = 'bold 15px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (const cx of [64, 192]) x.fillText('DYNAMITE', cx, 33);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bodyG = new THREE.CylinderGeometry(.028, .028, .2, 14), capG = new THREE.CylinderGeometry(.029, .029, .012, 14), fuseG = new THREE.CylinderGeometry(.004, .004, .07, 5); fuseG.translate(0, .035, 0);
  const bodyM = new THREE.MeshStandardMaterial({ map: label, roughness: .7 }), capM = new THREE.MeshStandardMaterial({ color: 0x8a1712, roughness: .8 }), fuseM = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 1 });
  function stick() { const g = new THREE.Group(); g.add(new THREE.Mesh(bodyG, bodyM)); for (const y of [-.1, .1]) { const m = new THREE.Mesh(capG, capM); m.position.y = y; g.add(m); }
    const f = new THREE.Mesh(fuseG, fuseM); f.position.y = .106; f.rotation.z = .4; g.add(f); g.userData.fuse = f; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
  // fuse spark + fireball sprites (additive, no lights: lights would change the light count and recompile shaders)
  const glow = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(.3, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,90,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sparkM = new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const ringG = new THREE.RingGeometry(.9, 1, 48); ringG.rotateX(-Math.PI / 2);

  // held stick (first person: lower right of the view)
  const held = stick(); held.scale.setScalar(.55); held.visible = false; const heldSpark = new THREE.Sprite(sparkM); heldSpark.scale.setScalar(.06); held.add(heldSpark); heldSpark.position.set(.03, .14, 0); scene.add(held);
  // the throw preview arc
  const ARC = 28, arcG = new THREE.BufferGeometry(); arcG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC * 3), 3));
  const arcM = new THREE.PointsMaterial({ color: 0xffd060, size: .14, transparent: true, opacity: .85, depthWrite: false, fog: false }); const arc = new THREE.Points(arcG, arcM); arc.frustumCulled = false; arc.visible = false; scene.add(arc);
  const marker = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: .7, depthWrite: false, fog: false })); marker.visible = false; scene.add(marker);

  const live = [], booms = [], fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), tmp = new THREE.Vector3();
  const gAt = (x, z, y) => ground ? ground(x, z, y) : 0;
  function origin(out) { camera.getWorldDirection(fwd); right.crossVectors(fwd, camera.up).normalize(); up.crossVectors(right, fwd).normalize(); return out.copy(camera.position).addScaledVector(fwd, .5).addScaledVector(right, .24).addScaledVector(up, -.17); }
  function velocity(k, out) { camera.getWorldDirection(fwd); const sp = DYN.minV + (DYN.maxV - DYN.minV) * k; out.copy(fwd).multiplyScalar(sp); out.y += 3.2 + 2 * k; if (H.mounted) { out.x += (H.mounted.vel ? H.mounted.vel.x : 0); out.z += (H.mounted.vel ? H.mounted.vel.z : 0); } return out; }

  // ---- input ----
  function start() { if (!H.on || H.uiOpen || H.dead) return; if (S.holding) return; if (S.count <= 0) { msg('🧨 No dynamite — buy 25 sticks for ' + DYN.price + ' at the General Store', 2.5); return; }
    S.holding = true; S.chargeT = 0; S.lit = 0; held.visible = true; if (sfx.ctx) { sfx.nz('highpass', 3200, .8, .25, .12); sfx.tone('triangle', 900, 1600, .05, .06); } }
  function release() { if (!S.holding) return; S.holding = false; held.visible = false; arc.visible = marker.visible = false; const k = Math.min(1, S.chargeT / DYN.charge);
    S.count--; save(); S.thrown++; const g = stick(), sp = new THREE.Sprite(sparkM); sp.scale.setScalar(.12); sp.position.set(.03, .13, 0); g.add(sp); origin(g.position); scene.add(g);
    live.push({ g, sp, v: velocity(k, new THREE.Vector3()), w: new THREE.Vector3(8 + Math.random() * 6, Math.random() * 4, 4 + Math.random() * 4), t: S.lit, rest: false });
    if (sfx.ctx) sfx.nz('bandpass', 700, 1, .25, .12); c.send && c.send({ t: 'dyn', p: g.position.toArray().map(v => +v.toFixed(2)), v: live[live.length - 1].v.toArray().map(v => +v.toFixed(2)), f: +(DYN.fuse - S.lit).toFixed(2) }); }
  addEventListener('keydown', e => { if (e.code === 'KeyG' && !e.repeat) start(); });
  addEventListener('keyup', e => { if (e.code === 'KeyG') release(); });
  let btn = null; function ui() { if (!mobile || btn) return; btn = document.createElement('div'); btn.id = 'tDyn'; btn.innerHTML = '🧨<small></small>';
    btn.style.cssText = 'position:fixed;right:92px;bottom:calc(30% + 70px);width:50px;height:50px;box-sizing:border-box;border-radius:50%;border:2px solid #ffb35a;background:rgba(110,20,10,.62);color:#fff;font-size:24px;z-index:40;touch-action:none;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;cursor:pointer';
    const sm = btn.querySelector('small'); sm.style.cssText = 'position:absolute;right:-4px;bottom:-4px;background:#c4231c;border-radius:9px;padding:1px 5px;font:800 11px system-ui';
    btn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); start(); }, { passive: false }); btn.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); release(); }, { passive: false });
    btn.addEventListener('touchcancel', () => release()); btn.addEventListener('mousedown', e => { e.stopPropagation(); start(); }); btn.addEventListener('mouseup', e => { e.stopPropagation(); release(); }); document.body.appendChild(btn); }

  // ---- the blast ----
  function explode(p) { const Z = H.zombies; let hits = 0;
    if (Z) for (const o of [...Z.list]) { if (!o.alive) continue; const d = Math.hypot(o.pos.x - p.x, o.pos.y + .9 - p.y, o.pos.z - p.z); if (d > DYN.radius) continue; const mul = 1 - .67 * (d / DYN.radius);
      tmp.set(o.pos.x - p.x, .6, o.pos.z - p.z).normalize(); const r = Z.onHit(o, 'dyn', false, new THREE.Vector3(o.pos.x, o.pos.y + 1, o.pos.z), tmp, mul); hits++;
      if (r && r.killed && (!c.role || c.role() !== 'client') && H.guns) { H.guns.credit(false, o.kind); S.kills++; } }
    visual(p); return hits; }
  function visual(p) { const fb = new THREE.Sprite(sparkM); fb.position.copy(p); fb.position.y += .6; fb.scale.setScalar(.5); scene.add(fb);
    const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: .8, depthWrite: false, fog: false })); ring.position.copy(p); ring.position.y += .12; scene.add(ring);
    booms.push({ fb, ring, t: 0 });
    if (fx) { fx.debris && fx.debris(p.x - .5, p.y, p.z - .5, 0x6a4a2a, 16, 1.6); fx.debris && fx.debris(p.x - .5, p.y, p.z - .5, 0x3a3a3a, 8, 1.2); for (let i = 0; i < 4; i++) fx.muzzle && fx.muzzle(tmp.set(p.x + (Math.random() - .5) * 2, p.y + .5 + Math.random(), p.z + (Math.random() - .5) * 2), [1, .6, .2], 5); }
    const d = camera.position.distanceTo(p); H.shake = Math.max(H.shake || 0, Math.max(0, 1 - d / 40) * 1.1);
    const boom = () => { sfx.nz('lowpass', 600, .7, 1.3, 1.1, 1, 1.4); sfx.tone('sine', 85, 26, 1.1, .9); sfx.nz('bandpass', 1600, .8, .6, .25); setTimeout(() => sfx.ctx && sfx.nz('lowpass', 420, .6, .3, .9), 380); setTimeout(() => sfx.ctx && sfx.nz('lowpass', 320, .6, .15, 1.1), 950); };
    if (sfx.ctx) { if (sfx.at) sfx.at(p, boom, .55); else boom(); } }

  function update(dt) { ui(); if (btn) { btn.style.display = H.on ? '' : 'none'; const sm = btn.lastChild; if (sm.textContent !== String(S.count)) sm.textContent = S.count; btn.style.opacity = S.count > 0 ? 1 : .55; }
    if (S.holding) { S.chargeT += dt; S.lit += dt; origin(held.position); held.quaternion.copy(camera.quaternion); held.rotateZ(-.5); held.rotateX(.3);
      const k = Math.min(1, S.chargeT / DYN.charge); held.position.addScaledVector(fwd, -.12 * k).addScaledVector(up, .06 * k); heldSpark.scale.setScalar(.05 + Math.random() * .04);
      if (Math.random() < dt * 30 && sfx.ctx) sfx.nz('highpass', 4000 + Math.random() * 2000, 1, .03, .02);
      // preview arc
      const v = velocity(k, new THREE.Vector3()), p = origin(new THREE.Vector3()), a = arcG.attributes.position; let land = null;
      for (let i = 0; i < ARC; i++) { const t = i * .07; const x = p.x + v.x * t, y = p.y + v.y * t - .5 * DYN.g * t * t, z = p.z + v.z * t; a.setXYZ(i, x, y, z); if (!land && i > 1 && y <= gAt(x, z, y + 2)) land = [x, gAt(x, z, y + 2), z]; if (land) a.setXYZ(i, land[0], land[1], land[2]); }
      a.needsUpdate = true; arc.visible = true; if (land) { marker.visible = true; marker.position.set(land[0], land[1] + .06, land[2]); const s = DYN.radius * (.9 + .1 * Math.sin(S.lit * 10)); marker.scale.setScalar(s); } else marker.visible = false;
      if (S.lit >= DYN.fuse - .15) release(); } // never let it go off in your hand
    for (let i = live.length - 1; i >= 0; i--) { const L = live[i], g = L.g; L.t += dt;
      if (!L.rest) { L.v.y -= DYN.g * dt; g.position.addScaledVector(L.v, dt); g.rotation.x += L.w.x * dt; g.rotation.y += L.w.y * dt; g.rotation.z += L.w.z * dt;
        const gy = gAt(g.position.x, g.position.z, g.position.y + .5) + .03; if (g.position.y <= gy) { g.position.y = gy; if (Math.abs(L.v.y) > 2.2) { L.v.y = -L.v.y * .32; L.v.x *= .55; L.v.z *= .55; L.w.multiplyScalar(.5); if (sfx.ctx && sfx.at) sfx.at(g.position, () => sfx.nz('bandpass', 900, 2, .2, .05), .2); } else { L.v.set(L.v.x * .4, 0, L.v.z * .4); if (L.v.lengthSq() < .05) { L.rest = true; g.rotation.set(Math.PI / 2, g.rotation.y, 0); } } } }
      else { g.position.x += L.v.x * dt; g.position.z += L.v.z * dt; L.v.multiplyScalar(Math.max(0, 1 - dt * 4)); g.position.y = gAt(g.position.x, g.position.z, g.position.y + .5) + .03; }
      L.sp.scale.setScalar(.1 + Math.random() * .08);
      if (L.t >= DYN.fuse) { const p = g.position.clone(); if (L.remote) visual(p); else explode(p); scene.remove(g); live.splice(i, 1); } }
    for (let i = booms.length - 1; i >= 0; i--) { const B = booms[i]; B.t += dt; const k = B.t / .55; B.fb.scale.setScalar(.5 + 7 * Math.min(1, k * 2.2));  B.fb.position.y += dt * 1.5;
      B.ring.scale.setScalar(.5 + DYN.radius * 1.4 * Math.min(1, k * 1.4)); B.ring.material.opacity = Math.max(0, .8 * (1 - k));
      if (B.t > .32 && B.fb.parent) { B.fb.removeFromParent(); } if (B.t > .6) { B.ring.removeFromParent(); B.ring.material.dispose(); booms.splice(i, 1); } } }
  // another rider's stick (visual + sound only; their blast's damage reaches the host as normal checked hits)
  function remote(m) { if (!m || !Array.isArray(m.p) || !Array.isArray(m.v) || ![...m.p, ...m.v].every(Number.isFinite)) return; const g = stick(), sp = new THREE.Sprite(sparkM); sp.scale.setScalar(.12); sp.position.set(.03, .13, 0); g.add(sp);
    g.position.fromArray(m.p); scene.add(g); live.push({ g, sp, v: new THREE.Vector3().fromArray(m.v), w: new THREE.Vector3(10, 2, 5), t: DYN.fuse - Math.max(.3, Math.min(DYN.fuse, +m.f || DYN.fuse)), rest: false, remote: true }); }
  const storeItem = { state: { id: 'dynamite', get name() { return `🧨 Dynamite ×${DYN.pack} · you have ${S.count} (G / 🧨: hold to aim, release to throw)`; }, price: DYN.price, owned: false, equipped: false },
    buy() { const g = H.guns; if (!g || g.pts() < DYN.price) { msg('Not enough points', 1.5); return; } g.state.spent += DYN.price; g.save && g.save(); S.count += DYN.pack; save(); msg(`🧨 +${DYN.pack} dynamite (${S.count}) — hold G (or the 🧨 button) to aim, release to throw`, 3.5); },
    toggle() { this.buy(); } };
  return { state: S, update, remote, storeItem, start, release, explode, settings: DYN };
}
