// v62 FISHING at Bandit Falls: a little dock on the plunge pool's shore. Walk up and press USE / PUSH to cast; when the bobber
// dips, hit it again fast to set the hook. Trout, bass, catfish, sturgeon — and a 3% shot at the legendary Golden Trout.
import * as THREE from 'three';
const FISH = [['🐟 Rainbow Trout', 30, .40], ['🐟 Smallmouth Bass', 45, .30], ['🐠 Channel Catfish', 70, .18], ['🐡 Lake Sturgeon', 150, .09], ['✨ GOLDEN TROUT', 600, .03]];
export function createFishing({ scene, H, P, T, hAt, msg, sfx }) {
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  let spot = null, built = false, S = null; // S = { st: 'wait' | 'bite', t, bx, bz }
  const bob = new THREE.Group(); { const r = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd82a1a })); r.position.y = .04; bob.add(r); const w = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8, 0, 6.3, 0, 1.4), new THREE.MeshStandardMaterial({ color: 0xffffff })); w.position.y = .06; bob.add(w); } bob.visible = false; scene.add(bob);
  const lineG = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), line = new THREE.Line(lineG, new THREE.LineBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: .7 })); line.frustumCulled = false; line.visible = false; scene.add(line);
  const ringM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), ring = new THREE.Mesh(new THREE.RingGeometry(.15, .22, 24), ringM); ring.rotation.x = -Math.PI / 2; scene.add(ring);
  function build() { const F = H.fallsPool; if (!F) return; built = true; const sh = F.shore, wood = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: .9 }), dark = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: .9 });
    const g = new THREE.Group(); g.position.set(sh.x, hAt(sh.x, sh.z), sh.z); g.rotation.y = F.rot; scene.add(g); const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(2.2, .14, 3.2), wood, 0, .28, -1.6); for (const [x, z] of [[-1, -.2], [1, -.2], [-1, -3], [1, -3]]) add(new THREE.CylinderGeometry(.09, .09, 1, 6), dark, x, -.15, z);
    add(new THREE.BoxGeometry(.5, .45, .5), dark, .6, .55, -.5); add(new THREE.CylinderGeometry(.04, .04, 1.8, 5), dark, -1.4, .9, .4);
    { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#6a4424'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#f0d49a'; x.font = '900 34px Georgia, serif'; x.textAlign = 'center'; x.fillText('GONE FISHIN\'', 128, 60); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const sg = add(new THREE.PlaneGeometry(1.4, .52), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, defines: { STY_SHARP: '' } }), -1.4, 1.75, .42); sg.castShadow = false; }
    const sp = new THREE.Vector3(0, 0, -2.4).applyAxisAngle(THREE.Object3D.DEFAULT_UP, F.rot).add(g.position);
    spot = { x: sp.x, z: sp.z, y: g.position.y + .35, kind: 'fish', label: 'Fish — cast your line', r: 2.2, fish: true }; T.spots.push(spot); H.fishSpot = [sp.x, sp.z];
    // v117 gold panning on the shore beside the dock: swirl the pan (3 s), 40% a flake/nugget, 3% a big one
    { const pp = new THREE.Vector3(2.6, 0, -.4).applyAxisAngle(THREE.Object3D.DEFAULT_UP, F.rot).add(g.position); const pan = new THREE.Mesh(new THREE.CylinderGeometry(.28, .2, .07, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x6a6a68, metalness: .7, roughness: .4, side: THREE.DoubleSide })); pan.position.set(pp.x, hAt(pp.x, pp.z) + .05, pp.z); scene.add(pan);
      const ps = { x: pp.x, z: pp.z, y: pan.position.y, kind: 'pan', label: 'Pan for gold', r: 1.8, pan: true }; T.spots.push(ps); if (T.TL) T.TL.pan = 'PAN<small>GOLD</small>'; let busy = 0;
      const prev2 = T.onUse; T.onUse = o => { if (!o || !o.pan) return prev2 ? prev2(o) : false; if (busy > Date.now()) return true; busy = Date.now() + 3200; msg('🥘 Swirling the pan…', 2.8); pan.userData.sw = 3;
        setTimeout(() => { const r = Math.random(), big = r < .03, hit = r < .4, pts = big ? 500 : hit ? 15 + ((Math.random() * 45) | 0) : 0; if (pts && H.guns) { H.guns.state.score += pts; H.guns.save && H.guns.save(); const st = H.stats || (H.stats = {}); st.panned = (st.panned || 0) + 1; }
          msg(big ? `✨ A BIG NUGGET!  +${pts}` : hit ? `A few gold flakes  +${pts}` : 'Just sand and pebbles — try again', 2.2); if (pts && sfx && sfx.ctx && sfx.tone) sfx.tone('triangle', 880, 1320, .2, .15); }, 3000); return true; };
      H.panTick = dt => { if (pan.userData.sw > 0) { pan.userData.sw -= dt; pan.rotation.y += dt * 6; pan.rotation.z = Math.sin(Date.now() / 120) * .15; } else pan.rotation.z = 0; }; } }
  function cast() { const F = H.fallsPool; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * .7, p = F.toW(Math.cos(a) * 7 * r, 4.4 + Math.sin(a) * 3 * r);
    S = { st: 'wait', t: 2 + Math.random() * 5, bx: p.x, bz: p.z, by: F.c.y + .02 }; bob.position.set(p.x, S.by, p.z); bob.visible = line.visible = true; tone('sine', 900, 300, .25, .1); spot.label = 'Wait for a bite… (tap to reel in)'; msg('🎣 You cast your line…', 1.4); }
  function reel(caught) { bob.visible = line.visible = false; spot.label = 'Fish — cast your line'; const was = S; S = null; if (!caught) return;
    let r = Math.random(), f = FISH[0]; for (const q of FISH) { if (r < q[2]) { f = q; break; } r -= q[2]; } const [name, pts] = f, lb = (pts / 30 * (1.2 + Math.random() * 2.5)).toFixed(1);
    const g = H.guns && H.guns.state; if (g) { g.score += pts; H.guns.save && H.guns.save(); } H.lb && H.lb.add(pts); const St = H.stats || (H.stats = {}); St.fish = (St.fish || 0) + 1; if (pts >= 600) St.golden = (St.golden || 0) + 1; try { localStorage.setItem('hr_stats', JSON.stringify(St)); } catch (_) {}
    const rk = 'fr_' + name.replace(/\W+/g, '_'), rec = +lb > (+St[rk] || 0); if (rec) { St[rk] = +lb; if (+lb > (+St.fishBest || 0)) { St.fishBest = +lb; St.fishBestN = name; } try { localStorage.setItem('hr_stats', JSON.stringify(St)); } catch (_) {} }
    msg(`${name}, ${lb} lb!  +${pts}${rec ? '  🏆 new personal record' : ''}`, pts >= 600 ? 5 : 2.5); (pts >= 600 ? [784, 988, 1175, 1568, 2093] : [660, 880]).forEach((fq, i) => setTimeout(() => tone('triangle', fq, fq, .14, .16), i * 90)); }
  const prev = T.onUse; T.onUse = o => { if (!o || !o.fish) return prev ? prev(o) : false; if (!S) cast(); else if (S.st === 'bite') reel(true); else { reel(false); msg('Reeled in too early — nothing on the hook', 1.6); } return true; };
  let t = 0;
  function update(dt) { if (!built) { build(); if (!built) return; } t += dt; if (!S) { ringM.opacity = 0; return; }
    if (Math.hypot(P.pos.x - spot.x, P.pos.z - spot.z) > 6 || H.mounted) { reel(false); return; }
    const hand = new THREE.Vector3(P.pos.x, P.pos.y + 1.5, P.pos.z), a = lineG.attributes.position; a.setXYZ(0, hand.x, hand.y, hand.z); a.setXYZ(1, bob.position.x, bob.position.y + .06, bob.position.z); a.needsUpdate = true;
    S.t -= dt; if (S.st === 'wait') { bob.position.y = S.by + Math.sin(t * 3) * .015; if (S.t <= 0) { S.st = 'bite'; S.t = 1.6; /* v74: 1.25 s was tight on phones */ spot.label = '🐟 BITE! TAP NOW!'; msg('🎣 BITE! Tap PUSH / E now!', 1.2); tone('square', 1200, 900, .08, .16); setTimeout(() => tone('square', 1200, 900, .08, .16), 120); } }
    else { bob.position.y = S.by - .08 + Math.sin(t * 22) * .04; ring.position.set(bob.position.x, S.by + .01, bob.position.z); ringM.opacity = .7 * (S.t / 1.25); ring.scale.setScalar(1 + (1.25 - S.t) * 3); if (S.t <= 0) { reel(false); msg('It got away…', 1.4); } } }
  return { update, get state() { return S; } };
}
