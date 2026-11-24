// v216+ EXTRAS: small world features added in the 200-batch run. One module, one update hook.
import * as THREE from 'three';
export function createExtra({ scene, H, P, hAt, msg, sfx, mobile }) {
  const X = { t: 0, parts: [] }, add = f => { try { const u = f(); if (u) X.parts.push(u); } catch (e) { console.warn('extra', e); } };
  const inTown = () => (H.saloon && H.saloon.inside && H.saloon.inside()) || (H.zombies && H.zombies.inSafeZone && H.zombies.inSafeZone(P.pos.x, P.pos.z) === 'town');
  const ppos = () => (H.mounted ? H.mounted.pos : P.pos);

  // v216 DUST DEVILS: on clear days a twisting column of dust wanders the range; ride through one and it shoves you and stings your eyes
  add(() => {
    const N = 2, geo = new THREE.CylinderGeometry(2.2, .5, 16, 14, 8, true); geo.translate(0, 8, 0);
    { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = y * .35, x = p.getX(i), z = p.getZ(i); p.setXZ(i, x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)); } }
    const mat = new THREE.MeshBasicMaterial({ color: 0xc9a979, transparent: true, opacity: .0, depthWrite: false, side: THREE.DoubleSide });
    const devs = Array.from({ length: N }, () => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.visible = false; scene.add(m); return { m, x: 0, z: 0, life: 0, vx: 0, vz: 0, cool: 20 + Math.random() * 40 }; });
    let shove = 0;
    return dt => { const n = H.night || 0, rain = H.wx ? (H.wx.rain || 0) : 0, ok = n < .35 && rain < .2 && !inTown(), pp = ppos();
      mat.opacity += ((ok ? .28 : 0) - mat.opacity) * Math.min(1, dt);
      for (const d of devs) { if (d.life <= 0) { d.m.visible = false; d.cool -= dt; if (d.cool <= 0 && ok) { const a = Math.random() * 6.28, r = 45 + Math.random() * 40; d.x = pp.x + Math.cos(a) * r; d.z = pp.z + Math.sin(a) * r; d.life = 25 + Math.random() * 20; d.cool = 30 + Math.random() * 60; d.vx = -Math.cos(a) * 2.2; d.vz = -Math.sin(a) * 2.2; } continue; }
        d.life -= dt; d.vx += (Math.random() - .5) * dt * 3; d.vz += (Math.random() - .5) * dt * 3; d.x += d.vx * dt; d.z += d.vz * dt; d.m.visible = mat.opacity > .02; d.m.position.set(d.x, hAt(d.x, d.z) - .3, d.z); d.m.rotation.y += dt * 6; const s = Math.min(1, d.life / 4, 1); d.m.scale.set(s, .6 + .4 * s, s);
        const dist = Math.hypot(pp.x - d.x, pp.z - d.z); if (dist < 3 && ok) { const k = dt * 6 * (1 - dist / 3); if (H.mounted) { H.mounted.pos.x += (pp.z - d.z) * k * .3; H.mounted.pos.z -= (pp.x - d.x) * k * .3; } else { P.pos.x += (pp.z - d.z) * k * .3; P.pos.z -= (pp.x - d.x) * k * .3; } H.shake = Math.max(H.shake || 0, .25); if ((shove -= dt) <= 0) { shove = 6; msg('🌪️ Dust devil!', 1.4); const st = H.stats || (H.stats = {}); st.devils = (st.devils || 0) + 1; if (sfx.nz && sfx.ctx) sfx.nz('bandpass', 600, .7, .25, 1.2); } } } };
  });

  // v217 WANTED POSTER: crack the store safe and your poster goes up on the saloon front; the reward climbs with every job
  add(() => { let shown = -1, mesh = null; const tex = document.createElement('canvas'); tex.width = 256; tex.height = 352; const ct = new THREE.CanvasTexture(tex); ct.colorSpace = THREE.SRGBColorSpace;
    function draw(n) { const x = tex.getContext('2d'); x.fillStyle = '#e8d6a8'; x.fillRect(0, 0, 256, 352); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(120,90,40,${Math.random() * .12})`; x.fillRect(Math.random() * 256, Math.random() * 352, 2 + Math.random() * 6, 2 + Math.random() * 6); }
      x.strokeStyle = '#3a2414'; x.lineWidth = 5; x.strokeRect(8, 8, 240, 336); x.fillStyle = '#3a2414'; x.textAlign = 'center'; x.font = 'bold 54px Georgia,serif'; x.fillText('WANTED', 128, 66); x.font = 'bold 18px Georgia,serif'; x.fillText('DEAD OR ALIVE', 128, 92);
      x.fillStyle = '#c9b48a'; x.fillRect(58, 106, 140, 124); x.fillStyle = '#3a2414'; x.beginPath(); x.arc(128, 150, 26, 0, 7); x.fill(); x.fillRect(84, 186, 88, 44); x.fillRect(80, 118, 96, 12); x.fillRect(100, 100, 56, 22);
      x.font = 'bold 20px Georgia,serif'; x.fillText('THE SAFECRACKER', 128, 258); x.font = '14px Georgia,serif'; x.fillText(`for ${n} job${n === 1 ? '' : 's'} on the General Store`, 128, 280); x.font = 'bold 34px Georgia,serif'; x.fillText('$' + (500 * n).toLocaleString(), 128, 322); ct.needsUpdate = true; }
    return () => { const n = (H.stats && H.stats.safes) || 0, T = H.town, s = T && T.town; if (!s || n === shown) return; shown = n; if (!n) return; draw(n);
      if (!mesh) { mesh = new THREE.Mesh(new THREE.PlaneGeometry(.62, .85), new THREE.MeshStandardMaterial({ map: ct, roughness: .95 })); const [wx, wz] = T.toW(s, -11.2, -.3); mesh.position.set(wx, s.y0 + 1.75, wz); mesh.rotation.set(0, s.rot + Math.PI, .04); mesh.name = 'wanted poster'; scene.add(mesh); H.cullAdd && H.cullAdd(mesh, 90, { x: wx, z: wz }); if (n > 0) msg('📜 Your WANTED poster just went up on the saloon front', 3); } }; });

  // v217 BUTTERFLIES: little fluttering pairs of wings drift over the grass around you on warm days (one instanced draw)
  add(() => { const N = mobile ? 14 : 28, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -.09, 0, .05, -.08, 0, -.06, 0, 0, 0, .09, 0, .05, .08, 0, -.06], 3)); g.computeVertexNormals();
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: false }), IM = new THREE.InstancedMesh(g, m, N); IM.frustumCulled = false; scene.add(IM);
    const COL = [0xffb43a, 0xffffff, 0x6ab8ff, 0xffe45a, 0xff7a4a], c = new THREE.Color(), b = Array.from({ length: N }, (_, i) => ({ x: 0, z: 0, y: 0, a: Math.random() * 6, ph: Math.random() * 6, h: .4 + Math.random() * 1.1, life: 0 }));
    b.forEach((o, i) => IM.setColorAt(i, c.set(COL[i % COL.length]))); const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1); let t = 0;
    return dt => { t += dt; const ok = (H.night || 0) < .3 && !(H.wx && H.wx.rain > .3) && !inTown(); IM.visible = ok; if (!ok) return; const pp = ppos();
      b.forEach((o, i) => { o.life -= dt; if (o.life <= 0 || Math.hypot(o.x - pp.x, o.z - pp.z) > 34) { const a = Math.random() * 6.28, r = 6 + Math.random() * 24; o.x = pp.x + Math.cos(a) * r; o.z = pp.z + Math.sin(a) * r; o.life = 10 + Math.random() * 15; }
        o.a += (Math.sin(t * .7 + o.ph) * 1.6) * dt; o.x += Math.sin(o.a) * .9 * dt; o.z += Math.cos(o.a) * .9 * dt; const d = Math.hypot(o.x - pp.x, o.z - pp.z); if (d < 2.5) { o.x += (o.x - pp.x) / d * 3 * dt; o.z += (o.z - pp.z) / d * 3 * dt; }
        o.y = hAt(o.x, o.z) + o.h + Math.sin(t * 2.3 + o.ph) * .25; const f = Math.sin(t * 22 + o.ph); E.set(0, o.a, 0); Q.setFromEuler(E); S.set(2 * (.35 + .65 * Math.abs(f)), 2, 2); M4.compose(V.set(o.x, o.y, o.z), Q, S); IM.setMatrixAt(i, M4); }); IM.instanceMatrix.needsUpdate = true; }; });

  // v218 PRAIRIE DOGS: colonies of mounds out on the flats; the critters pop up to look around and dive when you ride close
  add(() => { const N = mobile ? 10 : 18, IM = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.09, .2, 3, 6), new THREE.MeshStandardMaterial({ color: 0xa47a4c, roughness: 1 }), N), MD = new THREE.InstancedMesh(new THREE.ConeGeometry(.35, .18, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 1 }), N);
    IM.frustumCulled = MD.frustumCulled = false; scene.add(IM, MD); const d = Array.from({ length: N }, () => ({ x: 1e9, z: 0, up: 0, want: 0, tq: 0 })), M4 = new THREE.Matrix4(); let col = null, chirp = 0;
    return dt => { const pp = ppos(); if (inTown()) { IM.visible = MD.visible = false; return; } IM.visible = MD.visible = true;
      if (!col || Math.hypot(col[0] - pp.x, col[1] - pp.z) > 120) { const a = Math.random() * 6.28; col = [pp.x + Math.cos(a) * 60, pp.z + Math.sin(a) * 60]; d.forEach(o => { o.x = col[0] + (Math.random() - .5) * 26; o.z = col[1] + (Math.random() - .5) * 26; o.up = 0; }); }
      d.forEach((o, i) => { const dist = Math.hypot(o.x - pp.x, o.z - pp.z), scared = dist < (H.mounted ? 14 : 7) || (H.night || 0) > .5; o.tq -= dt; if (o.tq <= 0) { o.tq = 2 + Math.random() * 5; o.want = Math.random() < .6 ? 1 : 0; } const tgt = scared ? 0 : o.want;
        if (scared && o.up > .5 && (chirp -= dt) <= 0 && sfx.tone && sfx.ctx && dist < 25) { chirp = 1.5; sfx.tone('sine', 2400, 1800, .06, .04); } o.up += (tgt - o.up) * Math.min(1, dt * (scared ? 12 : 3)); const y = hAt(o.x, o.z);
        M4.makeTranslation(o.x, y + .05, o.z); MD.setMatrixAt(i, M4); M4.makeTranslation(o.x, y - .2 + o.up * .38, o.z); IM.setMatrixAt(i, M4); }); IM.instanceMatrix.needsUpdate = MD.instanceMatrix.needsUpdate = true; }; });

  // v219 RAINBOW: when a storm clears in daylight a rainbow arcs over the range for a minute
  add(() => { const g = new THREE.TorusGeometry(260, 9, 4, 64, Math.PI), cols = [], pos = g.attributes.position, c = new THREE.Color(); for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)), k = Math.max(0, Math.min(1, (r - 251) / 18)); c.setHSL(.78 * k, .9, .6); cols.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }), R = new THREE.Mesh(g, m); R.frustumCulled = false; R.visible = false; scene.add(R); let wasRain = 0, life = 0;
    return dt => { const rain = H.wx ? (H.wx.rain || 0) : 0, pp = ppos(); if (rain > .5) wasRain = 1; if (wasRain && rain < .05 && (H.night || 0) < .3) { wasRain = 0; life = 70; const yw = P.yaw || 0; R.userData.fx = -Math.sin(yw); R.userData.fz = -Math.cos(yw); msg('🌈 A rainbow over the range', 2.5); } if (life > 0) { life -= dt; R.visible = true; m.opacity = Math.min(.4, life / 10 * .4, (70 - life) / 4 * .4); R.position.set(pp.x + R.userData.fx * 360, hAt(pp.x, pp.z) - 30, pp.z + R.userData.fz * 360); R.lookAt(pp.x, R.position.y, pp.z); } else R.visible = false; }; });

  // v220 NIGHT CHORUS: crickets chirp in the grass after dark, and an owl hoots now and then (quiet in town and indoors)
  add(() => { let ct = 1, ot = 20; return dt => { const n = H.night || 0; if (n < .55 || !sfx.ctx || !sfx.tone || (H.saloon && H.saloon.inside && H.saloon.inside()) || (H.wx && H.wx.rain > .3)) return; ct -= dt; ot -= dt;
    if (ct <= 0) { ct = .6 + Math.random() * 1.6; const f = 4200 + Math.random() * 600; for (let k = 0; k < 3; k++) setTimeout(() => sfx.tone('sine', f, f * .98, .018, .03), k * 55); }
    if (ot <= 0) { ot = 25 + Math.random() * 40; const f = 380 + Math.random() * 40; sfx.tone('sine', f, f * .92, .07, .35); setTimeout(() => sfx.tone('sine', f * .95, f * .85, .06, .6), 420); } }; });

  // v220 DYNAMIC RESOLUTION: when the frame rate sags under ~40 fps for a few seconds the render resolution steps down
  // (never below 60% of your quality setting) and climbs back when there's headroom - smoother play in busy fights
  add(() => { const GX = window.__GX; if (!GX || !GX.renderer || !GX.setPR) return null; let base = GX.renderer.getPixelRatio(), cur = base, last = performance.now(), acc = 0, n = 0, coolT = 0, slow = 0, fast = 0;
    let off = false; try { off = localStorage.getItem('hr_dynres') === '0'; } catch (_) {}
    X.dynres = () => ({ base, cur, off }); X.dynresSet = on => { off = !on; if (off && Math.abs(cur - base) > .01) { cur = base; GX.setPR(base); } };
    return () => { const now = performance.now(), f = now - last; last = now; if (off || document.hidden || f > 400) return; acc += f; n++; if (acc < 1000) return; const ms = acc / n; acc = 0; n = 0; coolT--;
      const want = GX.renderer.getPixelRatio(); if (Math.abs(want - cur) > .01) { base = want; cur = want; } /* the player changed quality */
      if (ms > 25) { slow++; fast = 0; } else if (ms < 17) { fast++; slow = 0; } else { slow = fast = 0; }
      if (slow >= 3 && coolT <= 0 && cur > base * .62) { cur = Math.max(base * .6, cur - .1); GX.setPR(cur); coolT = 4; slow = 0; }
      else if (fast >= 6 && coolT <= 0 && cur < base - .01) { cur = Math.min(base, cur + .1); GX.setPR(cur); coolT = 6; fast = 0; } }; });

  // v227 PHOTO FILTERS: in photo mode press F to cycle Natural / Sepia / Silver / Golden hour / Moonlight / Vivid
  add(() => { const F = [['Natural', ''], ['Sepia', 'sepia(.85) contrast(1.08) brightness(1.03)'], ['Silver', 'grayscale(1) contrast(1.25)'], ['Golden hour', 'sepia(.35) saturate(1.4) hue-rotate(-12deg) brightness(1.06)'], ['Moonlight', 'saturate(.5) hue-rotate(185deg) brightness(.85) contrast(1.1)'], ['Vivid', 'saturate(1.6) contrast(1.12)']]; let k = 0;
    const cv = () => document.querySelector('canvas'), apply = () => { const c = cv(); if (c) c.style.filter = document.body.classList.contains('photo') ? F[k][1] : ''; document.body.dataset.pf = F[k][0]; };
    document.body.dataset.pf = F[0][0]; addEventListener('keydown', e => { if (e.code === 'KeyF' && document.body.classList.contains('photo')) { k = (k + 1) % F.length; apply(); e.stopPropagation(); } }, true);
    new MutationObserver(apply).observe(document.body, { attributes: true, attributeFilter: ['class'] }); return null; });

  // v249 NORTHERN LIGHTS: on some clear nights green-and-violet curtains ripple across the northern sky
  add(() => { const SEG = 48, strips = []; const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(900, 160, SEG, 2), col = [], p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -1) col.push(0, .03, .02); else if (y < 1) col.push(.08, .8, .42); else col.push(.22, .08, .45); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.visible = false; m.userData.base = Float32Array.from(p.array); m.userData.k = k; scene.add(m); strips.push(m); }
    let tonight = -1, on = false, t = 0;
    return dt => { t += dt; const n = H.night || 0, clear = !(H.wx && (H.wx.rain > .1 || H.wx.dust > .2)); const nightId = Math.floor(Date.now() / 6e5); if (n < .5) tonight = -1; else if (tonight !== nightId && tonight === -1) { tonight = nightId; on = ((nightId * 9301 + 49297) % 233280) / 233280 < .35; if (on && clear && n > .8) setTimeout(() => msg('🌌 Northern lights over the range tonight', 3), 4000); }
      const want = on && clear && n > .8 ? .4 : 0; mat.opacity += (want - mat.opacity) * Math.min(1, dt * .3); const vis = mat.opacity > .01; const pp = ppos();
      for (const m of strips) { m.visible = vis; if (!vis) continue; const k = m.userData.k, b = m.userData.base, p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.setZ(i, Math.sin(x * .008 + t * (.15 + k * .05) + k) * 60 + Math.sin(x * .021 - t * .3) * 18); } p.needsUpdate = true; m.position.set(pp.x + (k - 1) * 160, hAt(pp.x, pp.z) + 540 + k * 40, pp.z - 700 - k * 80); m.rotation.x = -.5; } }; });

  // v258 a handbill on the saloon front advertising Chinatown (dragon dance, night market, stage line)
  add(() => { let done = false; return () => { if (done) return; const T = H.town, s = T && T.town; if (!s || !H.chinatown || !H.chinatown.info) return; done = true;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 340; const x = cv.getContext('2d'); x.fillStyle = '#f0e2c0'; x.fillRect(0, 0, 256, 340); x.fillStyle = '#a3201a'; x.fillRect(10, 10, 236, 70); x.fillStyle = '#ffe8a0'; x.textAlign = 'center'; x.font = 'bold 30px Georgia,serif'; x.fillText('CHINATOWN', 128, 52); x.font = '15px Georgia,serif'; x.fillText('唐人街 · south of the pen', 128, 74);
    x.fillStyle = '#3a2414'; x.font = 'bold 17px Georgia,serif'; ['🐉 Dragon dance', 'every six minutes', '🏮 Night market & riddles', '🍵 Tea · noodles · herbs', '🎭 Opera nightly', '🐎 Stage from this', 'signpost: 40 pts'].forEach((l, i) => x.fillText(l, 128, 112 + i * 30)); const ct = new THREE.CanvasTexture(cv); ct.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.6, .8), new THREE.MeshStandardMaterial({ map: ct, roughness: .95 })), [wx, wz] = T.toW(s, -12.4, -.3); m.position.set(wx, s.y0 + 1.75, wz); m.rotation.set(0, s.rot + Math.PI, -.03); m.name = 'chinatown handbill'; scene.add(m); H.cullAdd && H.cullAdd(m, 90, { x: wx, z: wz }); }; });

  X.update = dt => { X.t += dt; for (const f of X.parts) f(dt); };
  return X;
}
