// v50 NIGHT EVENTS
//  👻 THE GHOST RIDER: once per night a spectral horseman gallops the range near you. Six hits banish him (+1500).
//  🏮 LANTERN HUNT: eight lanterns light up around town at dusk; grab them before dawn (+60 each, +500 for all eight).
// Everything is local to each player (no net traffic); it all fades away at dawn.
import * as THREE from 'three';
export function createNight({ scene, H, P, hAt, sfx, msg, makeRealHorse, realAnim, riderPose, saveRest, cloneSkinned, meSeat, WALK }) {
  const cyc = () => Math.floor(Date.now() / 1200000);
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const ST = () => H.stats || (H.stats = {}); const bump = k => { const s = ST(); s[k] = (s[k] || 0) + 1; try { localStorage.setItem('hr_stats', JSON.stringify(s)); } catch (_) {} };
  const award = (p, kind) => { const g = H.guns && H.guns.state; if (g) { g.score += p; H.guns.save && H.guns.save(); } H.lb && H.lb.add(p, kind); };
  // ---------- ghost ----------
  const gmat = new THREE.MeshBasicMaterial({ color: 0x8fd4ff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  let G = null; const done = { cyc: -1 }; try { done.cyc = +(localStorage.getItem('hr_ghost') || -1); } catch (_) {}
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(200,235,255,1)'); gr.addColorStop(.35, 'rgba(120,190,255,.45)'); gr.addColorStop(1, 'rgba(80,140,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  function makeGhost() { if (!H.A || !makeRealHorse) return null; const g = makeRealHorse(H.A, 2); g.traverse(o => { if (o.isMesh) { o.material = gmat; o.castShadow = false; o.receiveShadow = false; } }); g.userData.far.visible = false;
    let rd = null; if (H.A.riderSrc && cloneSkinned) { rd = saveRest(cloneSkinned(H.A.riderSrc)); rd.userData.kind = 'real'; rd.traverse(o => { if (o.isMesh) { o.material = gmat; o.castShadow = false; o.frustumCulled = false; } }); g.userData.bones[1].add(rd); rd.position.copy(meSeat); }
    const trail = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3)), new THREE.PointsMaterial({ map: glowTex, size: 2.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55, fog: false }));
    trail.frustumCulled = false; scene.add(g); scene.add(trail); g.visible = trail.visible = false; return { g, rd, trail, ti: 0, hp: 6, pos: g.position, yaw: 0, tgt: null, on: false, fade: 0, t: 0 }; }
  function wanderTarget() { const a = Math.random() * Math.PI * 2, d = 55 + Math.random() * 70; let x = P.pos.x + Math.sin(a) * d, z = P.pos.z + Math.cos(a) * d; const L = (WALK || 1000) - 30; x = Math.max(-L, Math.min(L, x)); z = Math.max(-L, Math.min(L, z)); return [x, z]; }
  function summon() { if (!G) G = makeGhost(); if (!G) return; const a = Math.random() * Math.PI * 2; G.pos.set(P.pos.x + Math.sin(a) * 110, 0, P.pos.z + Math.cos(a) * 110); G.pos.y = hAt(G.pos.x, G.pos.z); G.hp = 6; G.on = true; G.fade = 0; G.tgt = wanderTarget(); G.g.visible = G.trail.visible = true;
    msg('👻 The Ghost Rider rides tonight — six hits will banish him', 4); tone('sine', 520, 180, 1.4, .2); setTimeout(() => tone('triangle', 900, 300, 1.1, .12), 300); }
  function banish(win) { if (!G || !G.on) return; G.on = false; if (win) { done.cyc = cyc(); try { localStorage.setItem('hr_ghost', String(done.cyc)); } catch (_) {} bump('ghost'); award(1500, 'boss'); msg('👻 The Ghost Rider is banished!  +1500', 3.5); [880, 660, 1320].forEach((f, i) => setTimeout(() => tone('sine', f, f * 1.5, .4, .16), i * 140)); } }
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  function shot(o, dir) { if (!G || !G.on || G.fade < .5 || !o || !dir) return; c.set(G.pos.x, G.pos.y + 1.6, G.pos.z); v.copy(c).sub(o); const t = v.dot(dir); if (t < 0 || t > 260) return; const d2 = v.lengthSq() - t * t; if (d2 > 1.7 * 1.7) return;
    G.hp--; H.hitX && H.hitX(false, G.hp <= 0); tone('triangle', 1400, 700, .12, .12); G.flash = .25; if (G.hp <= 0) banish(true); }
  function ghostTick(dt, N) { if (N > .6 && !(G && G.on) && done.cyc !== cyc() && (G ? G.cycSeen !== cyc() : true) && H.on) { summon(); if (G) G.cycSeen = cyc(); }
    if (!G) return; if (G.on && N < .4) banish(false); G.fade = Math.max(0, Math.min(1, G.fade + (G.on ? dt * .6 : -dt * .8))); const vis = G.fade > .01; G.g.visible = G.trail.visible = vis; H.ghostPos = G.on ? [G.pos.x, G.pos.z] : null; if (!vis) return;
    G.t += dt; gmat.opacity = (.32 + .18 * Math.sin(G.t * 3.1)) * G.fade + (G.flash > 0 ? .4 : 0); G.flash = Math.max(0, (G.flash || 0) - dt);
    if (G.on) { if (!G.tgt || Math.hypot(G.tgt[0] - G.pos.x, G.tgt[1] - G.pos.z) < 8) G.tgt = wanderTarget(); const want = Math.atan2(G.pos.x - G.tgt[0], G.pos.z - G.tgt[1]); let d = want - G.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); G.yaw += Math.max(-1.6 * dt, Math.min(1.6 * dt, d));
      G.pos.x -= Math.sin(G.yaw) * 13.5 * dt; G.pos.z -= Math.cos(G.yaw) * 13.5 * dt; }
    G.pos.y = hAt(G.pos.x, G.pos.z) + .25 + .15 * Math.sin(G.t * 2); G.g.rotation.y = G.yaw; realAnim(G.g, dt, G.on ? 13.5 : 4, false, G.t);
    if (G.rd && riderPose) { const ph = G.g.userData.phase || 0; riderPose(G.rd, { sit: 1, k: 1, ph, gal: 1, lean: .22, rein: 0 }); G.rd.position.copy(meSeat); }
    const a = G.trail.geometry.attributes.position; G.ti = (G.ti + 1) % 40; a.setXYZ(G.ti, G.pos.x + (Math.random() - .5) * .8, G.pos.y + .8 + Math.random() * 1.2, G.pos.z + (Math.random() - .5) * .8); a.needsUpdate = true; G.trail.material.opacity = .5 * G.fade; }
  // ---------- lanterns ----------
  const LN = 8; let L = null, lcyc = -1, got = 0;
  const lgeo = new THREE.CylinderGeometry(.16, .2, .42, 8), lmat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, emissive: 0xffa040, emissiveIntensity: 2.4, roughness: .6 });
  const lmesh = new THREE.InstancedMesh(lgeo, lmat, LN); lmesh.frustumCulled = false; lmesh.count = 0; scene.add(lmesh);
  const lglow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: glowTex, color: 0xffb060, size: 3.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); lglow.frustumCulled = false; scene.add(lglow);
  const m4 = new THREE.Matrix4();
  function layLanterns() { const town = H.places && H.places.town; if (!town) return; L = []; got = 0; lcyc = cyc(); let tries = 0;
    while (L.length < LN && tries++ < 600) { const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 200, x = town[0] + Math.sin(a) * d, z = town[1] + Math.cos(a) * d; if (H.blockedAt && H.blockedAt(x, z, .6)) continue; const h = hAt(x, z); if (Math.abs(hAt(x + 1.5, z) - h) > 1 || Math.abs(hAt(x, z + 1.5) - h) > 1) continue; if (L.some(q => Math.hypot(q.x - x, q.z - z) < 30)) continue; L.push({ x, z, y: h + .3 }); }
    lrefresh(); msg(`🏮 ${L.length} lanterns are lit around town — collect them before dawn`, 3.5); }
  function lrefresh() { const pos = []; let n = 0; if (L) for (const q of L) { if (q.got) continue; m4.makeTranslation(q.x, q.y, q.z); lmesh.setMatrixAt(n++, m4); pos.push(q.x, q.y + .2, q.z); } lmesh.count = n; lmesh.instanceMatrix.needsUpdate = true; lglow.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lglow.geometry.computeBoundingSphere(); }
  function lanternTick(dt, N) { if (N > .55 && lcyc !== cyc() && H.on) layLanterns(); if (N < .3 && L) { L = null; lrefresh(); }
    lglow.visible = lmesh.visible = !!L; if (!L) { H.lanternNear = null; return; } lglow.material.size = 3 + .5 * Math.sin(performance.now() / 300);
    const px = (H.mounted ? H.mounted.pos : P.pos).x, pz = (H.mounted ? H.mounted.pos : P.pos).z, R = H.mounted ? 2.8 : 2; let near = null, nd = 1e9;
    for (const q of L) { if (q.got) continue; const d = Math.hypot(q.x - px, q.z - pz); if (d < nd) { nd = d; near = q; } if (d < R) { q.got = true; got++; award(60); bump('lanterns'); lrefresh(); tone('sine', 1046, 1568, .2, .14);
      if (got >= L.length) { award(500); bump('lanternSets'); msg('🏮 Every lantern found!  +500', 3); [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => tone('triangle', f, f, .16, .16), i * 90)); } else msg(`🏮 Lantern ${got} / ${L.length}  +60`, 1.6); } }
    H.lanternNear = near ? [near.x, near.z] : null; }
  return { update(dt) { const N = H.night || 0; try { ghostTick(dt, N); lanternTick(dt, N); } catch (e) { console.warn('night', e); } }, shot, summon, get ghost() { return G; }, get lanterns() { return L; } };
}
