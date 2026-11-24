// v53 WEATHER: rainstorms with lightning + thunder, and desert dust storms. Scheduled off the wall clock (15-minute windows,
// a hash picks clear / rain / dust), so everyone in a lobby gets the same sky. Rain and dust are GPU-animated particle boxes
// that follow the camera (one draw each); fog thickens so the dead are harder to spot. Toggle: Settings > Graphics.
import * as THREE from 'three';
const SEG = 900;
export function createWeather({ scene, H, camera, sfx, msg, mobile }) {
  const Q = new URLSearchParams(location.search).get('wx');
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const enabled = () => { try { return localStorage.getItem('hr_weather') !== '0'; } catch (_) { return true; } };
  function target() { if (Q) return Q === 'rain' ? [1, 0] : Q === 'dust' ? [0, 1] : [0, 0]; if (!enabled()) return [0, 0];
    const t = Date.now() / 1000, seg = Math.floor(t / SEG), p = (t % SEG) / SEG, h = hash(seg), k = p < .5 ? 0 : p < .56 ? (p - .5) / .06 : p < .88 ? 1 : p < .94 ? 1 - (p - .88) / .06 : 0;
    return h < .38 ? [k, 0] : h < .6 ? [0, k] : [0, 0]; }
  const W = H.wx = { rain: 0, dust: 0, flash: 0 };
  // ---- rain: streaks in a 64 m box around the camera, falling in the vertex shader ----
  const N = mobile ? 2200 : 4200, rp = new Float32Array(N * 2 * 3), rs = new Float32Array(N * 2 * 4);
  for (let i = 0; i < N; i++) { const a = Math.random(), b = Math.random(), c = Math.random(), d = Math.random(); for (let k = 0; k < 2; k++) { rs.set([a, b, c, k], (i * 2 + k) * 4); } }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('seed', new THREE.BufferAttribute(rs, 4));
  const RU = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uK: { value: 0 }, uW: { value: new THREE.Vector2(2.5, 1) } };
  const rm = new THREE.ShaderMaterial({ uniforms: RU, transparent: true, depthWrite: false, fog: false,
    vertexShader: `attribute vec4 seed; uniform float uT, uK; uniform vec3 uC; uniform vec2 uW; varying float vA;
      void main(){ float fall = mod(seed.z * 52. + uT * 30. * (.85 + seed.z * .3), 52.); vec3 p;
        p.x = uC.x - 32. + mod(seed.x * 64. + uW.x * fall * .05 - uC.x + 32., 64.); p.z = uC.z - 32. + mod(seed.y * 64. + uW.y * fall * .05 - uC.z + 32., 64.);
        p.y = uC.y + 26. - fall; p.xz -= uW * seed.w * .1; p.y -= seed.w * 1.6;
        vA = uK * (seed.x < uK ? 1. : 0.) * smoothstep(34., 8., length(p.xz - uC.xz)) * (.35 + .3 * seed.w);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `varying float vA; void main(){ if (vA < .01) discard; gl_FragColor = vec4(.82, .88, .98, min(1., vA * 1.1)); }` });
  const rain = new THREE.LineSegments(rg, rm); rain.frustumCulled = false; rain.renderOrder = 9; scene.add(rain);
  // ---- dust: big soft sprites tumbling sideways ----
  const DN = mobile ? 260 : 520, dp = new Float32Array(DN * 3), ds = new Float32Array(DN * 3); for (let i = 0; i < DN; i++) ds.set([Math.random(), Math.random(), Math.random()], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('seed', new THREE.BufferAttribute(ds, 3));
  const dtex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const DU = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uK: { value: 0 }, map: { value: dtex }, uPx: { value: 300 } };
  const dm = new THREE.ShaderMaterial({ uniforms: DU, transparent: true, depthWrite: false, fog: false,
    vertexShader: `attribute vec3 seed; uniform float uT, uK, uPx; uniform vec3 uC; varying float vA;
      void main(){ vec3 p; p.x = uC.x - 40. + mod(seed.x * 80. + uT * (9. + seed.z * 6.), 80.); p.z = uC.z - 40. + mod(seed.y * 80. + sin(uT * .3 + seed.x * 6.) * 6., 80.); p.y = uC.y - 2. + seed.z * 12. + sin(uT * 1.3 + seed.y * 9.) * .8;
        vec4 mv = viewMatrix * vec4(p, 1.); vA = uK * smoothstep(42., 6., length(p.xz - uC.xz)) * (.6 + .4 * seed.z); gl_PointSize = uPx * (2.5 + seed.y * 3.) / max(1., -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a * vA * .8; if (a < .01) discard; gl_FragColor = vec4(.78, .6, .4, a); }` });
  const dust = new THREE.Points(dg, dm); dust.frustumCulled = false; dust.renderOrder = 9; scene.add(dust);
  // ---- sound: rain hiss, wind howl, thunder ----
  let snd = null; function sound() { if (snd || !sfx || !sfx.ctx || !sfx.noise) return snd; const c = sfx.ctx; const mk = (type, f, q) => { const s = c.createBufferSource(); s.buffer = sfx.noise; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(sfx.master); s.start(); return g; };
    snd = { rain: mk('highpass', 900, .3), wind: mk('bandpass', 420, .9) }; return snd; }
  function thunder(delay) { const c = sfx && sfx.ctx; if (!c || !sfx.noise) return; setTimeout(() => { try { const s = c.createBufferSource(); s.buffer = sfx.noise; s.playbackRate.value = .35; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; const g = c.createGain(), t = c.currentTime;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9, t + .05); g.gain.exponentialRampToValueAtTime(.25, t + .6); g.gain.exponentialRampToValueAtTime(.001, t + 3.2); s.connect(f); f.connect(g); g.connect(sfx.master); s.start(); s.stop(t + 3.3); } catch (_) {} }, delay); }
  let boltT = 4, wasKind = '', t = 0;
  function update(dt) { t += dt; const [tr, td] = target(), under = (H.cave && H.cave.underP) || (H.temple && H.temple.underP) || (H.caveDark || 0) > .5;
    W.rain += (tr - W.rain) * Math.min(1, dt * .25); W.dust += (td - W.dust) * Math.min(1, dt * .25); if (W.rain < .002) W.rain = 0; if (W.dust < .002) W.dust = 0;
    const kind = tr > .5 ? 'rain' : td > .5 ? 'dust' : ''; if (kind !== wasKind) { if (kind === 'rain' && H.on) msg('🌧️ A storm rolls in — the dead are harder to see', 3); if (kind === 'dust' && H.on) msg('🌪️ Dust storm! Stay close to your horse', 3); wasKind = kind; }
    const vr = under ? 0 : W.rain, vd = under ? 0 : W.dust; RU.uT.value = DU.uT.value = t; RU.uC.value.copy(camera.position); DU.uC.value.copy(camera.position); RU.uK.value = vr; DU.uK.value = vd; DU.uPx.value = innerHeight * .9;
    rain.visible = vr > .01; dust.visible = vd > .01;
    W.flash = Math.max(0, W.flash - dt * 3.2); if (vr > .6) { boltT -= dt; if (boltT < 0) { boltT = 6 + Math.random() * 12; W.flash = 1; setTimeout(() => { W.flash = Math.max(W.flash, .7); }, 120); thunder(400 + Math.random() * 1800); if (Math.random() < .45) strike(); } }
    const s = sound(); if (s) { const c = sfx.ctx.currentTime; s.rain.gain.setTargetAtTime(vr * .16 * (under ? .3 : 1), c, .4); s.wind.gain.setTargetAtTime((vd * .22 + vr * .04) * (under ? .3 : 1), c, .4); } }
  // v162 lightning strikes: some bolts hit a zombie near you (it drops; no points), with a visible bolt
  const boltM = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), bolt = new THREE.Mesh(new THREE.CylinderGeometry(.12, .25, 120, 5, 8, true), boltM); bolt.frustumCulled = false; scene.add(bolt);
  { const p = bolt.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (Math.abs(y) < 59) { p.setX(i, p.getX(i) + Math.sin(y * .7) * 1.6); p.setZ(i, p.getZ(i) + Math.cos(y * .5) * 1.4); } } }
  let boltK = 0; function strike() { const Z = H.zombies, P0 = window.__P; if (!Z || !P0 || (Z.state.role && Z.state.role() === 'client')) return; const c = Z.list.filter(o => o.alive && o.kind !== 'outlaw' && o.kind !== 'boss' && Math.hypot(o.pos.x - P0.pos.x, o.pos.z - P0.pos.z) < 80); if (!c.length) return; const o = c[(Math.random() * c.length) | 0];
    bolt.position.set(o.pos.x, o.pos.y + 60, o.pos.z); boltK = 1; try { Z.damage(o, 9999, false, o.pos, null, 'bandit'); } catch (_) {} if (msg && Math.hypot(o.pos.x - P0.pos.x, o.pos.z - P0.pos.z) < 40) msg('⚡ Lightning took one of them!', 1.4); }
  const upd0 = update;
  return { update(dt) { upd0(dt); if (boltK > 0) { boltK -= dt * 5; boltM.opacity = Math.max(0, boltK); } }, get state() { return W; } };
}
