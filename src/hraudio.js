// v42 AUDIO — upgrades the synthesized SFX engine (src/fx.js) in place:
//   - master bus compressor/limiter (punch without clipping)
//   - every gun is a pre-rendered, layered shot (rendered once with an OfflineAudioContext, then played as a buffer with a
//     little pitch variance): supersonic crack + body + low thump + muzzle-blast tail, valley echoes panned left/right,
//     and the gun's own mechanics (revolver hammer, lever-action ka-chunk, bolt, the Golden Buffalo's ring)
//   - Gatling gun: per-round shot + a barrel-spin whir that rises with the spin + crank ratchet clicks
//   - hooves: gait-aware clip-clop (walk 4 even beats, trot 2, gallop the rolling 4-beat), surface-aware (grass thud,
//     hollow boardwalk, sharp rock/cave)
//   - ambience: wind bed, birdsong by day, the waterfall's roar near Bandit Falls, and inside the hideout: dripping
//     water, the campfire's crackle and the underground river
import { SFX } from './fx.js?v=43c';

const P = SFX.prototype, baseInit = P.init;
const rand = (a, b) => a + Math.random() * (b - a);

P.init = function () { const had = !!this.ctx; baseInit.call(this); if (had || !this.ctx) return; const c = this.ctx;
  try { const comp = c.createDynamicsCompressor(); comp.threshold.value = -15; comp.knee.value = 8; comp.ratio.value = 4.5; comp.attack.value = .002; comp.release.value = .18;
    this.master.disconnect(); this.master.connect(comp); comp.connect(c.destination); this.comp = comp; } catch (e) {}
  this.bufs = {}; renderGuns(this); };

// ---------------- offline-rendered gunshots ----------------
const GUNS = {
  //          crack  body(f,dec)   thump(f0,f1,dec,peak)  tail(lp,dec,peak)  echoes [t,gain,lp]                       mech [t,f,q,dec,peak]
  revolver: { crack: .9, body: [1300, .11, .95], thump: [150, 45, .13, .95], tail: [320, .5, .35], echoes: [[.34, .3, 1500], [.74, .17, 950], [1.2, .08, 700]], mech: [[.24, 3600, 7, .014, .22], [.3, 2400, 5, .02, .14]], dur: 1.9 },
  rifle:    { crack: 1, body: [1050, .14, 1], thump: [120, 40, .16, 1], tail: [280, .65, .45], echoes: [[.38, .32, 1400], [.82, .19, 900], [1.32, .1, 650]], mech: [[.42, 2200, 4, .03, .3], [.55, 1500, 4, .04, .32], [.62, 3000, 6, .015, .16]], dur: 2.1 },
  sniper:   { crack: 1.1, body: [850, .18, 1.1], thump: [95, 32, .22, 1.2], tail: [230, .95, .6], echoes: [[.46, .36, 1200], [1, .22, 800], [1.6, .12, 560], [2.2, .06, 450]], mech: [[.7, 2600, 5, .03, .25], [.86, 1800, 4, .04, .25]], dur: 2.8 },
  gold:     { crack: 1.15, body: [800, .2, 1.15], thump: [85, 30, .26, 1.3], tail: [210, 1.1, .7], echoes: [[.5, .38, 1100], [1.05, .24, 760], [1.7, .13, 540], [2.35, .07, 420]], mech: [[.75, 2600, 5, .03, .25]], ring: [2350, .9, .08], dur: 3 },
  gatling:  { crack: .75, body: [1550, .06, .8], thump: [170, 60, .07, .75], tail: [380, .2, .18], echoes: [[.3, .1, 1200]], mech: [], dur: .7 },
  tommy:    { crack: .7, body: [1800, .06, .75], thump: [180, 70, .07, .7], tail: [420, .22, .2], echoes: [[.3, .1, 1300]], mech: [], dur: .7 },
};
function renderGuns(sfx) { const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return; const sr = 44100;
  for (const [k, G] of Object.entries(GUNS)) { try {
    const oc = new OAC(2, Math.ceil(sr * G.dur), sr), N = oc.createBuffer(1, sr, sr), d = N.getChannelData(0); for (let i = 0; i < sr; i++) d[i] = Math.random() * 2 - 1;
    const out = oc.createGain(); out.gain.value = .85; out.connect(oc.destination);
    const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
    const noise = (t, type, f, q, peak, dec, pan = 0, a = .0015) => { const s = oc.createBufferSource(); s.buffer = N; const fl = oc.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = oc.createGain(); env(g, t, a, peak, dec);
      let n = g; if (pan && oc.createStereoPanner) { const p = oc.createStereoPanner(); p.pan.value = pan; g.connect(p); n = p; } s.connect(fl); fl.connect(g); n.connect(out); s.start(t, Math.random() * .5, a + dec + .05); };
    const tone = (t, type, f0, f1, peak, dec) => { const o = oc.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dec); const g = oc.createGain(); env(g, t, .002, peak, dec); o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + .05); };
    noise(0, 'highpass', 3200, .7, G.crack, .035, 0, .0008);               // supersonic crack
    noise(0, 'bandpass', G.body[0], .75, G.body[2], G.body[1]);            // body
    noise(.004, 'lowpass', 2400, .6, G.body[2] * .5, G.body[1] * 1.4);     // muzzle blast
    tone(0, 'sine', G.thump[0], G.thump[1], G.thump[3], G.thump[2]);       // low thump
    tone(0, 'triangle', G.thump[0] * 2.1, G.thump[1] * 1.5, G.thump[3] * .25, G.thump[2] * .6);
    noise(.01, 'lowpass', G.tail[0], .5, G.tail[2], G.tail[1], 0, .02);    // rolling tail
    G.echoes.forEach(([t, g, lp], i) => { noise(t, 'lowpass', lp, .6, g, .22 + t * .18, i % 2 ? .45 : -.45, .012); noise(t + .01, 'bandpass', lp * .6, .8, g * .6, .12, i % 2 ? .3 : -.3, .01); });
    for (const [t, f, q, dec, pk] of G.mech) noise(t, 'bandpass', f, q, pk, dec, .15, .001);
    if (G.ring) { const [f, dec, pk] = G.ring; tone(.02, 'sine', f, f * .92, pk, dec); tone(.02, 'sine', f * 1.5, f * 1.42, pk * .5, dec * .7); }
    oc.startRendering().then(b => { let m = 0; for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); } // normalise to -0.5 dBFS
      const kk = m > 0 ? .94 / m : 1; for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= kk; } sfx.bufs[k] = b; }).catch(() => {});
  } catch (e) {} } }

P.gun = function (kind, vol = 1) { if (!this.ctx || !this.bufs) return false; const b = this.bufs[kind]; if (!b) return false; if (!this.ok('gun' + kind, kind === 'gatling' || kind === 'tommy' ? .03 : .02)) return true;
  const c = this.ctx, s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rand(.95, 1.05); const g = c.createGain(); g.gain.value = vol; s.connect(g); const w = this.wet; this.wet = .18; this.route(g); this.wet = w; s.start(); return true; };

// ---------------- Gatling spin ----------------
P.spin = function (k, held) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
  if (!this.spinN) { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.value = 300; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 40;
    const og = c.createGain(); og.gain.value = .25; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); o.connect(og); og.connect(f); g.connect(this.master); s.start(); o.start(); this.spinN = { f, o, g, click: 0 }; }
  const N = this.spinN; N.g.gain.setTargetAtTime(k > .02 ? .05 + k * .14 : 0, t, .05); N.f.frequency.setTargetAtTime(220 + k * 900, t, .05); N.o.frequency.setTargetAtTime(30 + k * 120, t, .05);
  N.click += k * 22 * (1 / 60); if (N.click > 1 && k > .05) { N.click = 0; const w = this.wet; this.wet = 0; this.nz('bandpass', 2600 + Math.random() * 600, 6, .06 + k * .05, .012); this.wet = w; } };

// ---------------- hooves ----------------
// gait: 0 walk, 1 trot, 2 canter/gallop; surface: 'grass' | 'wood' | 'rock'
P.hoof = function (gait, surface = 'grass', vol = 1) { if (!this.ctx || !this.ok('hoof', .08)) return; const beats = gait >= 2 ? [0, .06, .13, .21] : gait === 1 ? [0, .09] : [0];
  const w = this.wet; this.wet = surface === 'rock' ? .35 : .05;
  for (const dt of beats) setTimeout(() => { if (!this.ctx) return; const v = vol * rand(.8, 1.1) * (gait >= 2 ? 1 : .8);
    if (surface === 'wood') { this.nz('bandpass', rand(500, 650), 3, .4 * v, .09); this.tone('triangle', rand(170, 200), 110, .35 * v, .12); this.nz('highpass', 2500, 1, .1 * v, .03); }
    else if (surface === 'rock') { this.nz('bandpass', rand(1800, 2300), 4, .35 * v, .05); this.tone('square', rand(700, 820), 400, .08 * v, .04); this.nz('lowpass', 500, 1, .2 * v, .06); }
    else { this.nz('lowpass', rand(260, 340), 1.2, .5 * v, .09); this.tone('sine', rand(95, 120), 55, .4 * v, .08); this.nz('bandpass', 1400, 1, .06 * v, .04); }
  }, dt * 1000); this.wet = w; };

// ---------------- ambience ----------------
// a = { outdoors, day (0..1), falls: distance to the waterfall (m), cave: 0..1 darkness inside the hideout, fire: distance to the
//       hideout campfire, river: distance to the underground river, saloon: inside the saloon }
P.amb = function (dt, a) { if (!this.ctx || this.ctx.state !== 'running') return; const c = this.ctx, t = c.currentTime;
  if (!this.ambN) { const loop = (type, f, q) => { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; s.playbackRate.value = rand(.8, 1.1); const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(); return { g, fl }; };
    this.ambN = { wind: loop('bandpass', 420, .45), water: loop('lowpass', 1100, .4), water2: loop('bandpass', 2600, .6), river: loop('lowpass', 520, .5), birdT: 2, dripT: 1, crackT: .3, gust: 0 }; }
  const N = this.ambN, out = a.outdoors && !a.saloon ? 1 - (a.cave || 0) : 0;
  N.gust += dt * .21; const wind = (.025 + .03 * (Math.sin(N.gust) * .5 + .5) ** 2) * out; N.wind.g.gain.setTargetAtTime(wind, t, .4); N.wind.fl.frequency.setTargetAtTime(340 + 260 * Math.sin(N.gust * 1.7) ** 2, t, .6);
  const fw = a.falls == null ? 0 : 1 / (1 + (a.falls / 22) ** 2), wv = Math.min(.32, fw * .32) * (1 - .6 * (a.cave || 0)); N.water.g.gain.setTargetAtTime(wv, t, .3); N.water2.g.gain.setTargetAtTime(wv * .35, t, .3);
  const rv = a.river == null ? 0 : (a.cave || 0) / (1 + (a.river / 14) ** 2) * .22; N.river.g.gain.setTargetAtTime(rv, t, .4);
  // birdsong by day, outdoors, away from the falls' roar
  if (out > .5 && (a.day ?? 1) > .3 && (N.birdT -= dt) <= 0) { N.birdT = rand(1.5, 5); const cam = this.cam, pos = cam ? { x: cam.x + rand(-30, 30), y: cam.y + rand(3, 10), z: cam.z + rand(-30, 30) } : null, sing = () => this.bird();
    if (pos && this.at) this.at(pos, sing, .25); else sing(); }
  // inside the hideout: drips with long echoes, the campfire's crackle
  if ((a.cave || 0) > .4 && (N.dripT -= dt) <= 0) { N.dripT = rand(.6, 2.4); const w = this.wet; this.wet = .9; this.tone('sine', rand(1400, 2400), rand(700, 1100), .08 * a.cave, .07); this.wet = w; }
  if (a.fire != null && a.fire < 16 && (N.crackT -= dt) <= 0) { N.crackT = rand(.05, .35); const v = .12 / (1 + (a.fire / 5) ** 2); const w = this.wet; this.wet = .3; this.nz('highpass', rand(2500, 5000), 1, v, rand(.01, .03)); if (Math.random() < .25) this.nz('bandpass', 700, 1, v * .8, .05); this.wet = w; } };
P.bird = function () { if (!this.ctx) return; const kind = Math.random(), n = kind < .5 ? 3 + (Math.random() * 3 | 0) : 2, base = rand(2200, 3600), w = this.wet; this.wet = .3;
  for (let i = 0; i < n; i++) setTimeout(() => { if (!this.ctx) return; if (kind < .5) this.tone('sine', base * rand(.95, 1.15), base * rand(1.2, 1.5), .05, .07); else this.tone('sine', base * 1.3, base * .7, .045, .18); }, i * (kind < .5 ? 95 : 230));
  this.wet = w; };
P.ui = function () { if (!this.ok('ui', .05)) return; const w = this.wet; this.wet = 0; this.tone('sine', 880, 1320, .16, .06); this.tone('triangle', 1760, 1600, .05, .05); this.wet = w; };
