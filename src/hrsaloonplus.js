// ---------------- v76 saloon upgrade: a real bar mirror, a worn plank floor + rugs, wainscoting, warm flickering
// chandelier light, brass-capped bar stools, and a playable player piano (ragtime, synthesized) ----------------
import { mergeStatic } from './hrmerge.js?v=299';
import * as THREE from 'three';

// ---- planar mirror (the bar's back mirror): a reflected camera renders into a texture projected onto the glass ----
function makeMirror(w, h, tint, size) { const rt = new THREE.WebGLRenderTarget(size, Math.round(size * h / w), { samples: 2 }), tm = new THREE.Matrix4(), vcam = new THREE.PerspectiveCamera();
  const mat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: rt.texture }, textureMatrix: { value: tm }, tint: { value: new THREE.Color(tint) }, age: { value: 0 } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vP; void main(){ vUv = textureMatrix * vec4(position, 1.); vP = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tint; varying vec4 vUv; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 c = texture2DProj(tDiffuse, vUv).rgb * tint;
        float e = min(min(vP.x, 1. - vP.x) * 4., min(vP.y, 1. - vP.y) * 2.5); float silver = smoothstep(0., .35, e) * (.85 + .15 * h(floor(vP * vec2(160., 40.))));   // old mirror: darker, speckled edges
        c = mix(vec3(.05, .045, .035), c, silver); gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.renderOrder = 1;
  const plane = new THREE.Plane(), N = new THREE.Vector3(), RP = new THREE.Vector3(), CP = new THREE.Vector3(), RM = new THREE.Matrix4(), LA = new THREE.Vector3(), CL = new THREE.Vector4(), V = new THREE.Vector3(), TG = new THREE.Vector3(), Q = new THREE.Vector4();
  m.userData.live = false; let skip = 0;
  m.onBeforeRender = (renderer, scene, camera) => { if (!m.userData.live || renderer.getRenderTarget() !== null || (skip++ & 1)) return;
    RP.setFromMatrixPosition(m.matrixWorld); CP.setFromMatrixPosition(camera.matrixWorld); RM.extractRotation(m.matrixWorld); N.set(0, 0, 1).applyMatrix4(RM); V.subVectors(RP, CP); if (V.dot(N) > 0) return;
    V.reflect(N).negate().add(RP); RM.extractRotation(camera.matrixWorld); LA.set(0, 0, -1).applyMatrix4(RM).add(CP); TG.subVectors(RP, LA).reflect(N).negate().add(RP);
    vcam.position.copy(V); vcam.up.set(0, 1, 0).applyMatrix4(RM).reflect(N); vcam.lookAt(TG); vcam.far = camera.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(camera.projectionMatrix);
    tm.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse).multiply(m.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(N, RP).applyMatrix4(vcam.matrixWorldInverse); CL.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant); const P = vcam.projectionMatrix.elements;
    Q.x = (Math.sign(CL.x) + P[8]) / P[0]; Q.y = (Math.sign(CL.y) + P[9]) / P[5]; Q.z = -1; Q.w = (1 + P[10]) / P[14]; CL.multiplyScalar(2 / CL.dot(Q)); P[2] = CL.x; P[6] = CL.y; P[10] = CL.z + 1 - .003; P[14] = CL.w;
    m.visible = false; const cur = renderer.getRenderTarget(), sh = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(rt); renderer.state.buffers.depth.setMask(true); if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, vcam); renderer.shadowMap.autoUpdate = sh; renderer.setRenderTarget(cur); m.visible = true; };
  return m; }

function tex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

export function createSaloonPlus({ scene, H, P, T, mobile, msg, sfx }) { const s = T.town, F = s.F, root = new THREE.Group(); root.position.set(s.cx, s.y0, s.cz); root.rotation.y = s.rot; root.name = 'saloon upgrade v76'; scene.add(root);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); root.add(m); return m; };
  // ---- floor: long worn planks with nail heads, scuffs and a darker traffic lane; rugs under the tables ----
  const planks = tex(1024, 1024, (x, w, h) => { const r = rnd(9); for (let i = 0; i < 16; i++) { const y0 = i * 64, base = 70 + r() * 30; for (let k = 0; k < 3; k++) { const x0 = (k * 340 + i * 137) % 1024, L = 300 + r() * 200;
        const g = x.createLinearGradient(0, y0, 0, y0 + 64); const c1 = `rgb(${base + 40},${base + 18},${base - 12})`, c2 = `rgb(${base + 22},${base + 4},${base - 22})`; g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(x0, y0, L, 62); if (x0 + L > 1024) x.fillRect(0, y0, x0 + L - 1024, 62);
        x.strokeStyle = 'rgba(0,0,0,.18)'; for (let q = 0; q < 14; q++) { x.beginPath(); const yy = y0 + 4 + r() * 54; x.moveTo(x0, yy); x.bezierCurveTo(x0 + L * .3, yy + r() * 6 - 3, x0 + L * .6, yy + r() * 6 - 3, x0 + L, yy); x.lineWidth = .6 + r(); x.stroke(); }
        x.fillStyle = '#1e140d'; x.fillRect(x0 - 2, y0, 3, 62); x.fillStyle = '#2b2b2b'; for (const yy of [y0 + 14, y0 + 48]) { x.beginPath(); x.arc(x0 + 10, yy, 2.2, 0, 7); x.fill(); x.beginPath(); x.arc(x0 + L - 10, yy, 2.2, 0, 7); x.fill(); } }
      x.fillStyle = '#140d08'; x.fillRect(0, y0 + 62, w, 2); }
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,230,190'},${.03 + r() * .05})`; x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 40, 2 + r() * 8, r() * 3, 0, 7); x.fill(); } }, [4, 2.5]);
  const floorM = new THREE.MeshStandardMaterial({ map: planks, roughness: .78 }); add(new THREE.PlaneGeometry(16, 10), floorM, -9, F + .008, 5, -Math.PI / 2);
  const rug = (pal) => tex(512, 320, (x, w, h) => { x.fillStyle = pal[0]; x.fillRect(0, 0, w, h); x.strokeStyle = pal[1]; x.lineWidth = 14; x.strokeRect(14, 14, w - 28, h - 28); x.lineWidth = 4; x.strokeRect(34, 34, w - 68, h - 68);
    x.fillStyle = pal[2]; for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { const cx = 70 + i * 47, cy = 70 + j * 45; x.beginPath(); x.moveTo(cx, cy - 16); x.lineTo(cx + 16, cy); x.lineTo(cx, cy + 16); x.lineTo(cx - 16, cy); x.closePath(); x.fill(); }
    x.fillStyle = pal[1]; for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(70 + i * 47, 70 + j * 45, 4, 0, 7); x.fill(); } const r = rnd(4); for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(0,0,0,${r() * .08})`; x.fillRect(r() * w, r() * h, 2, 2); } });
  for (const [x, z, w, d, pal] of [[-4.2, 1.6, 3.6, 2.6, ['#5e1f1c', '#c79a4a', '#2f3c5a']], [-3, 7.2, 3, 2.4, ['#2e3a2a', '#b88a3e', '#6b2a22']], [-14.2, 6.2, 3.8, 3.8, ['#4a1d2a', '#d1a24f', '#22303f']], [-9, 2.6, 2.2, 1.8, ['#6a3a1c', '#e0b060', '#1f2a3a']]])
    add(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: rug(pal), roughness: .95 }), x, F + .014, z, -Math.PI / 2);
  // ---- wainscoting on the walls (dado rail + raised panels) ----
  const wain = new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: .55 }), rail = new THREE.MeshStandardMaterial({ color: 0x6b3d22, roughness: .45 }), panelM = new THREE.MeshStandardMaterial({ color: 0x3a2014, roughness: .6 });
  const wallRun = (x0, z0, x1, z1, nx, nz, skip) => { const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) - Math.PI / 2, n = Math.floor(L / .9);
    for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = x0 + (x1 - x0) * t + nx * .03, z = z0 + (z1 - z0) * t + nz * .03; if (skip && skip(x, z)) continue; add(new THREE.BoxGeometry(L / n - .08, .62, .03), panelM, x, F + .5, z, 0, ang, 0); }
    add(new THREE.BoxGeometry(L, .08, .07), rail, (x0 + x1) / 2 + nx * .04, F + .92, (z0 + z1) / 2 + nz * .04, 0, ang, 0); add(new THREE.BoxGeometry(L, .14, .05), wain, (x0 + x1) / 2 + nx * .03, F + .07, (z0 + z1) / 2 + nz * .03, 0, ang, 0); };
  wallRun(-16.95, .3, -16.95, 9.7, 1, 0, (x, z) => z < 3.4); wallRun(-1.05, .3, -1.05, 7.3, -1, 0); wallRun(-1, 9.95, -6, 9.95, 0, -1, (x, z) => x < -3.9 && x > -10.2);
  // ---- brass-capped bar stools along the counter ----
  const leg = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: .5 }), seatM = new THREE.MeshStandardMaterial({ color: 0x6a1e1e, roughness: .6 }), brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: .85, roughness: .3 });
  for (let i = 0; i < 6; i++) { const x = -9.4 + i * 1.0, z = 4.75; if (Math.abs(x + 7) < .4) continue; add(new THREE.CylinderGeometry(.05, .07, .72, 10), leg, x, F + .36, z); add(new THREE.CylinderGeometry(.19, .17, .08, 18), seatM, x, F + .76, z); add(new THREE.TorusGeometry(.15, .012, 6, 20), brass, x, F + .28, z, Math.PI / 2); add(new THREE.CylinderGeometry(.2, .2, .015, 18), brass, x, F + .73, z); add(new THREE.CylinderGeometry(.16, .2, .03, 16), leg, x, F + .015, z); }
  // ---- the mirror behind the bar (live reflection on desktop; on phones a dark antique glass) ----
  let mirror = null; if (!mobile) { mirror = makeMirror(4.7, 1.22, 0xd8cfb8, 768); mirror.position.set(-7, F + 1.95, 9.895); mirror.rotation.y = Math.PI; root.add(mirror); }
  else add(new THREE.PlaneGeometry(4.7, 1.22), new THREE.MeshStandardMaterial({ color: 0x8c8676, metalness: 1, roughness: .12 }), -7, F + 1.95, 9.895, 0, Math.PI, 0);
  { const fr = new THREE.MeshStandardMaterial({ color: 0x3a1f12, roughness: .4 }); for (const [w, h, x, y] of [[4.95, .12, -7, F + 2.62], [4.95, .12, -7, F + 1.28], [.12, 1.45, -9.42, F + 1.95], [.12, 1.45, -4.58, F + 1.95]]) add(new THREE.BoxGeometry(w, h, .06), fr, x, y, 9.88); for (const x of [-8.2, -5.8]) add(new THREE.BoxGeometry(.05, 1.22, .04), fr, x, F + 1.95, 9.88); }
  // ---- warm flickering light: two chandelier glows + bar lamps (lights reused, cheap on phones) ----
  const lights = []; if (!mobile) for (const [x, z, k] of [[-6.5, 4.5, 1], [-12, 4, 1], [-4, 8.8, .8]]) { /* v81: no extra point lights on phones - every light costs every pixel */ const L = new THREE.PointLight(0xffb36a, (mobile ? 3.5 : 6) * k, 10, 1.7); L.position.set(x, F + 3.1, z); root.add(L); lights.push([L, L.intensity, Math.random() * 9]); if (mobile && lights.length >= 2) break; }
  // ---- player piano: USE to play / stop; townsfolk tap along (dancers already dance) ----
  const PIANO = { on: false, t: 0, nextBeat: 0, beat: 0, node: null };
  const spot = { x: 0, y: 0, z: 0, kind: 'piano', label: 'Play the piano', r: 1.3 }; { const c = s.c, sn = s.s, lx = -2.85, lz = 8.6; spot.x = s.cx + lx * c + lz * sn; spot.z = s.cz - lx * sn + lz * c; spot.y = s.y0 + F; T.spots.push(spot); }
  const prevUse = T.onUse; T.onUse = o => { if (o && o.kind === 'piano') { PIANO.on ? stop() : start(); return true; } return prevUse ? prevUse(o) : false; };
  // ragtime in C: oom-pah left hand + a syncopated right-hand line over I - I7 - IV - #iv° - I/5 - VI7 - II7 - V7
  const N = n => 440 * Math.pow(2, (n - 69) / 12), PROG = [[48, [64, 67, 72]], [48, [64, 67, 70]], [53, [65, 69, 72]], [54, [63, 66, 69]], [43, [64, 67, 72]], [45, [61, 64, 67]], [50, [62, 66, 69]], [43, [62, 65, 71]]];
  const MEL = [[76, 0, .5], [77, .5, .25], [76, .75, .25], [79, 1, .75], [76, 2, .5], [72, 2.5, .5], [74, 3, .5], [76, 3.5, .5]];
  function pluck(c, out, f, t, d, v) { const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); o.type = 'triangle'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 1.003; lp.type = 'lowpass'; lp.frequency.value = Math.min(4800, f * 6);
    const g2 = c.createGain(); g2.gain.value = .12; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(out); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(v * .3, t + .12); g.gain.exponentialRampToValueAtTime(.0005, t + d + .25); o.start(t); o2.start(t); o.stop(t + d + .3); o2.stop(t + d + .3); }
  function start() { if (!sfx || !sfx.ctx) { sfx && sfx.init && sfx.init(); } const c = sfx && sfx.ctx; if (!c) { msg('Tap once to wake the sound, then try again', 2); return; } PIANO.on = true; PIANO.beat = 0; PIANO.next = c.currentTime + .1; PIANO.out = c.createGain(); PIANO.out.gain.value = .5; PIANO.out.connect(sfx.master || c.destination); spot.label = 'Stop the piano'; msg('🎹 Ragtime! The whole saloon is tapping along', 2.4); H.pianoOn = true; }
  function stop() { PIANO.on = false; spot.label = 'Play the piano'; H.pianoOn = false; if (PIANO.out) { const o = PIANO.out; o.gain.setTargetAtTime(0, sfx.ctx.currentTime, .1); setTimeout(() => o.disconnect(), 600); PIANO.out = null; } }
  function pianoTick() { if (!PIANO.on) return; const c = sfx.ctx, BEAT = 60 / 112; const near = Math.hypot(P.pos.x - spot.x, P.pos.z - spot.z); PIANO.out.gain.setTargetAtTime(Math.max(0, .55 - Math.max(0, near - 4) * .022), c.currentTime, .2); if (near > 40) { stop(); return; }
    while (PIANO.next < c.currentTime + .25) { const b = PIANO.beat, bar = Math.floor(b / 4) % PROG.length, k = b % 4, [bass, ch] = PROG[bar], t = PIANO.next;
      if (k === 0 || k === 2) pluck(c, PIANO.out, N(bass - (k === 2 ? 5 : 0)), t, .3, .22); else for (const n of ch) pluck(c, PIANO.out, N(n - 12), t, .18, .09);
      for (const [n, at, d] of MEL) if (Math.floor(at) === k) { const tr = bar % 2 ? (bar % 4 === 3 ? -3 : 2) : 0; pluck(c, PIANO.out, N(n + tr), t + (at - k) * BEAT, d * BEAT, .13); }
      PIANO.beat++; PIANO.next += BEAT; } }
  function update(dt, near) { const t = (H.t || 0); for (const [L, base, ph] of lights) L.intensity = near ? base * (.9 + Math.sin(t * 7.3 + ph) * .04 + Math.sin(t * 13.1 + ph * 2) * .03 + (Math.random() < .02 ? -.08 : 0)) : 0;
    if (mirror) { const d = Math.hypot(P.pos.x - s.cx, P.pos.z - s.cz); mirror.userData.live = near && d < 22; } pianoTick(); }
  try { mergeStatic(root); } catch (e) { console.warn('plus merge', e); } // v100
  return { update, stop, piano: PIANO, spot, mirror }; }
