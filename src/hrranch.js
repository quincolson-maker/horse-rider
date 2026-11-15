// v57 YOUR RANCH: buy the Ranch Deed at the store (5,000) and a homestead goes up on a flat stretch of range outside town:
// a log cabin (bed inside heals you), smoking chimney, porch, your name on the gate sign, a post-and-rail corral where two of
// your horses graze (in your Coat Kit colours), a trough and hay. Zombie-free zone + compass pin. Saved per rider.
import * as THREE from 'three';
export function createRanch({ scene, H, P, T, hAt, msg, sfx, makeRealHorse, realAnim, PEN }) {
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } };
  let site = null; try { site = JSON.parse(ls('hr_ranch') || 'null'); } catch (_) {}
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  function pickSite() { const town = H.places && H.places.town; if (!town) return null; const avoid = [[PEN.x, PEN.z, 70], [town[0], town[1], 90]];
    const pl = H.places; for (const k of ['cave', 'temple']) if (pl[k]) avoid.push([pl[k].x, pl[k].z, 120]); if (H.raceStart) avoid.push([H.raceStart[0], H.raceStart[1], 40]); if (H.race) for (const g of H.race.gates) avoid.push([g.position.x, g.position.z, 22]);
    let best = null, bs = 1e9; for (let i = 0; i < 400; i++) { const a = i * 2.399, d = 150 + (i % 9) * 18, x = town[0] + Math.sin(a) * d, z = town[1] + Math.cos(a) * d; if (avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r)) continue;
      if (H.blockedAt && (H.blockedAt(x, z, 14) || H.blockedAt(x + 14, z, 3) || H.blockedAt(x - 14, z, 3))) continue; let lo = 1e9, hi = -1e9; for (let u = -18; u <= 18; u += 6) for (let v = -14; v <= 14; v += 7) { const h = hAt(x + u, z + v); lo = Math.min(lo, h); hi = Math.max(hi, h); }
      const sc = hi - lo + d * .004; if (sc < bs) { bs = sc; best = { x: +x.toFixed(1), z: +z.toFixed(1), rot: +Math.atan2(town[0] - x, town[1] - z).toFixed(3) }; } if (bs < 1.2) break; }
    return best; }
  const G = new THREE.Group(); scene.add(G); let built = false, horses = [], smoke = null, bed = null;
  function build() { if (built || !site) return; built = true; const { x, z, rot } = site, c = Math.cos(rot), s = Math.sin(rot), W = (u, v) => [x + u * c + v * s, z - u * s + v * c], y0 = hAt(x, z);
    G.position.set(x, y0, z); G.rotation.y = rot; const log = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: .9 }), logD = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: .9 }), roof = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: .85 }), stone = new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: .95 });
    const add = (geo, m, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
    const wall = (u0, v0, u1, v1) => { const [a, b] = W(u0, v0), [cc, d] = W(u1, v1); T.walls.push([a, b, cc, d, y0 - 1, y0 + 4]); };
    // cabin: 8 x 6, log courses (alternating tones), door gap on the front (+v), pitched roof, stone chimney
    const CW = 4, CD = 3, LR = .2, cab = (u, v) => [u, v - 8];
    for (let k = 0; k < 9; k++) { const yy = .2 + k * .36, m = k % 2 ? log : logD, cyl = new THREE.CylinderGeometry(LR, LR, 1, 7);
      for (const sv of [-1, 1]) { const [u, v] = cab(0, sv * CD); if (sv > 0 && yy < 2.3) { for (const su of [-1, 1]) add(cyl, m, u + su * 2.45, yy, v, 0, 0, Math.PI / 2).scale.y = 3.3; } else add(cyl, m, u, yy, v, 0, 0, Math.PI / 2).scale.y = CW * 2 + .6; }
      for (const su of [-1, 1]) { const [u, v] = cab(su * CW, 0); add(cyl, m, u, yy + .18, v, Math.PI / 2, 0, 0).scale.y = CD * 2 + .6; } }
    { const [u, v] = cab(0, 0), rg = new THREE.BoxGeometry(CW * 2 + 1.4, .18, CD + 1.1); for (const sv of [-1, 1]) add(rg, roof, u, 3.95, v + sv * (CD / 2 + .3), sv * .55, 0, 0);
      const gab = new THREE.CylinderGeometry(.01, CD + .2, 1.5, 3, 1); for (const su of [-1, 1]) add(gab, logD, u + su * CW, 3.85, v, 0, Math.PI / 2, Math.PI / 2).scale.set(1, CD > 0 ? .2 : 1, 1);
      add(new THREE.BoxGeometry(1, 5.2, 1), stone, u - CW - .55, 2.6, v); add(new THREE.BoxGeometry(CW * 2 + 2, .2, 2), logD, u, .1, v + CD + 1); // chimney, porch deck
      for (const su of [-1, 1]) add(new THREE.CylinderGeometry(.12, .12, 2.8, 6), logD, u + su * (CW + .2), 1.5, v + CD + 1.8); add(new THREE.BoxGeometry(CW * 2 + 1.4, .14, 1.6), roof, u, 2.95, v + CD + 1.2, -.25, 0, 0);
      const bedG = new THREE.Group(); bedG.position.set(u + CW - 1.4, 0, v - 1.4); G.add(bedG); const bb = new THREE.Mesh(new THREE.BoxGeometry(1.2, .45, 2.1), logD); bb.position.y = .3; bedG.add(bb); const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.15, .14, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a2a24 })); quilt.position.set(0, .58, .2); bedG.add(quilt);
      wall(-CW, -8 - CD, CW, -8 - CD); wall(-CW, -8 - CD, -CW, -8 + CD); wall(CW, -8 - CD, CW, -8 + CD); wall(-CW, -8 + CD, -1, -8 + CD); wall(1, -8 + CD, CW, -8 + CD);
      const [bx, bz] = W(u + CW - 1.4, v - 1.4); bed = { x: bx, z: bz, y: y0 + .4, kind: 'ranch-bed', label: 'Rest (heal up)', r: 1.8, ranch: true }; T.spots.push(bed);
      const [sx, sz] = W(u - CW - .55, v); smoke = { x: sx, y: y0 + 5.4, z: sz }; }
    // corral: 16 x 12 post-and-rail, gate gap toward the cabin's right
    const post = new THREE.CylinderGeometry(.11, .13, 1.7, 6), rail = new THREE.BoxGeometry(1, .1, .08), CU = 6, CV = 9, HW = 8, HD = 6;
    const edge = [[-HW, -HD, HW, -HD], [HW, -HD, HW, HD], [HW, HD, -HW, HD], [-HW, HD, -HW, -HD]];
    for (const [a, b, cc, d] of edge) { const L = Math.hypot(cc - a, d - b), n = Math.round(L / 2.4); for (let i = 0; i <= n; i++) { const t = i / n, u = CU + a + (cc - a) * t, v = CV + b + (d - b) * t; if (Math.abs(v - CV + HD) < .1 && Math.abs(u - CU) < 1.6) continue; add(post, logD, u, .85, v); }
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, u0 = CU + a + (cc - a) * t0, v0 = CV + b + (d - b) * t0, u1 = CU + a + (cc - a) * t1, v1 = CV + b + (d - b) * t1, mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
        if (Math.abs(mv - CV + HD) < .1 && Math.abs(mu - CU) < 1.4) continue; for (const yy of [.7, 1.35]) { const r = add(rail, log, mu, yy, mv, 0, -Math.atan2(v1 - v0, u1 - u0), 0); r.scale.x = Math.hypot(u1 - u0, v1 - v0) + .1; } wall(u0, v0, u1, v1); } }
    add(new THREE.BoxGeometry(2.4, .5, .7), logD, CU + 4, .3, CV + 3); add(new THREE.BoxGeometry(2.2, .06, .55), new THREE.MeshStandardMaterial({ color: 0x4a7a9a, roughness: .2, metalness: .1 }), CU + 4, .52, CV + 3);
    for (const [u, v] of [[CU - 5, CV + 4], [CU - 4, CV + 4.3], [-6, -2]]) add(new THREE.CylinderGeometry(.55, .55, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0xd8b860, roughness: 1 }), u, .55, v, Math.PI / 2, 0, 0);
    // gate sign with your name
    { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#5a3a20'; g.fillRect(0, 0, 512, 128); g.font = '900 54px Georgia, serif'; g.fillStyle = '#f0d49a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const nm = ((H.callsign ? H.callsign() : 'Rider') || 'Rider').toUpperCase().slice(0, 14); g.fillText(nm + "'S RANCH", 256, 66); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      for (const su of [-1, 1]) add(new THREE.CylinderGeometry(.16, .18, 4.4, 7), logD, su * 3, 2.2, 6); add(new THREE.BoxGeometry(7, .3, .3), logD, 0, 4.3, 6); const sg = add(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide }), 0, 3.5, 6.02); sg.castShadow = false; }
    // zombie-free yard + compass
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [u, v] of [[-14, -13], [16, -13], [16, 16], [-14, 16]]) { const [a, b] = W(u, v); x0 = Math.min(x0, a); x1 = Math.max(x1, a); z0 = Math.min(z0, b); z1 = Math.max(z1, b); }
    (H.safeRects || (H.safeRects = [])).push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, name: 'YOUR RANCH', label: '🛡 NO ZOMBIES · YOUR RANCH' });
    H.ranchPos = [x, z]; site.W = W; site.corral = [CU, CV]; }
  // smoke puffs
  const puffT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(220,220,220,.7)'); gr.addColorStop(1, 'rgba(220,220,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const PN = 14, pp = new Float32Array(PN * 3), pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); const puffs = new THREE.Points(pg, new THREE.PointsMaterial({ map: puffT, size: 2.4, transparent: true, depthWrite: false, opacity: .55 })); puffs.frustumCulled = false; scene.add(puffs); puffs.visible = false;
  // ranch horses (wait for the models)
  function stockCorral() { if (horses.length || !H.A || !makeRealHorse || !site || !site.W) return; const coat = H.myCoat ? H.myCoat() : -1; for (let i = 0; i < 2; i++) { const g = makeRealHorse(H.A, 0); if (H.applyCoat) { g.userData.kind = 'real'; }
      const [cu, cv] = site.corral, [hx, hz] = site.W(cu - 2 + i * 4, cv + (i ? 1.5 : -1.5)); g.position.set(hx, hAt(hx, hz), hz); g.rotation.y = site.rot + i * 2.2; scene.add(g); horses.push({ g, t: Math.random() * 9, ci: coat >= 0 ? coat : (i ? 3 : 0) });
      const ci = horses[i].ci; if (H.A.matN && H.A.matN[ci]) { g.userData.near.material = H.A.matN[ci]; g.userData.far.material = H.A.matF[ci]; } } }
  // store deed
  const deed = { state: { id: 'ranch-deed', get name() { return site ? '🏠 Ranch Deed · yours! (compass: RANCH)' : '🏠 Ranch Deed · your own homestead, cabin & corral'; }, price: 5000, get owned() { return !!site; }, get maxed() { return !!site; }, equipped: false, get label() { return site ? 'OWNED' : null; } },
    buy() { if (site) return; const g = H.guns; if (!g || g.pts() < 5000) { msg('Not enough points', 1.5); return; } const st = pickSite(); if (!st) { msg('No free land found — try again from town', 2); return; }
      g.state.spent += 5000; g.save && g.save(); site = st; ls('hr_ranch', JSON.stringify(site)); build(); msg('🏠 The deed is yours! Follow RANCH on the compass to your new homestead', 4); [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => tone('triangle', f, f, .18, .18), k * 110)); }, toggle() { this.buy(); } };
  if (T.registerStoreItem) T.registerStoreItem(deed);
  const prevUse = T.onUse; T.onUse = o => { if (!o || !o.ranch) return prevUse ? prevUse(o) : false; if (H.zombies && H.zombies.heal) H.zombies.heal(); msg('🛏️ You rest a spell — fully healed', 2.2); tone('sine', 392, 523, .4, .15); return true; };
  let t = 0;
  function update(dt) { if (site && !built && H.places) build(); if (!built) return; stockCorral(); t += dt; const near = Math.hypot(P.pos.x - site.x, P.pos.z - site.z) < 220; G.visible = near; puffs.visible = near;
    for (const h of horses) { h.g.visible = near; if (near) { h.t += dt; realAnim && realAnim(h.g, dt, 0, true, h.t); } }
    if (near && smoke) { for (let i = 0; i < PN; i++) { const k = ((t * .12 + i / PN) % 1); pp[i * 3] = smoke.x + Math.sin(i * 7.1 + t * .3) * k * 1.4 + k * 2; pp[i * 3 + 1] = smoke.y + k * 7; pp[i * 3 + 2] = smoke.z + Math.cos(i * 3.3) * k * 1.2; } pg.attributes.position.needsUpdate = true; } }
  if (site) setTimeout(() => { if (!built && H.places) build(); }, 0);
  return { update, get owned() { return !!site; }, get site() { return site; } };
}
