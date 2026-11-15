// v55 ADAPTIVE SCORE: a spaghetti-western soundtrack synthesised live (WebAudio, no files). Four moods crossfade with the game:
//   RIDE  (day): plucked guitar arpeggios, a galloping bass when you're mounted, a whistled theme every other phrase
//   NIGHT: slow minor pad, sparse bells, distant harmonica
//   FIGHT (a boss is near, Max Chaos, or the outlaws are shooting): war drums + low ostinato + stabs
//   UNDER (cave / temple): a low drone with dripping bell tones
// Volume: Settings > Sound > 🎵 Music (Off / Low / Medium / High).
export function createMusic({ H, sfx }) {
  const LV = [0, .22, .4, .62]; let lv = 2; try { const v = localStorage.getItem('hr_music'); if (v != null) lv = Math.max(0, Math.min(3, +v)); } catch (_) {}
  let bus = null, L = null, step = 0, nextT = 0, bar = 0;
  const BPM = 100, S16 = 60 / BPM / 4;
  const A = 110, chords = [[A, A * 1.2, A * 1.5], [98, 98 * 1.26, 98 * 1.5], [87.31, 87.31 * 1.26, 87.31 * 1.5], [82.41, 82.41 * 1.26, 82.41 * 1.5]]; // Am G F E
  const theme = [[0, 12, 2], [4, 15, 2], [8, 17, 4], [12, 15, 2], [14, 12, 2], [16, 10, 4], [20, 12, 2], [24, 7, 6], [32, 5, 3], [35, 7, 1], [36, 8, 4], [40, 7, 2], [44, 5, 4], [48, 4, 8], [56, 7, 2], [58, 11, 6]]; // [16th, semitones over A3, length]
  function init() { const c = sfx && sfx.ctx; if (!c || !sfx.master) return false; bus = c.createGain(); bus.gain.value = 0; bus.connect(sfx.master);
    const mk = () => { const g = c.createGain(); g.gain.value = 0; g.connect(bus); return g; }; L = { ride: mk(), night: mk(), fight: mk(), under: mk() };
    const rv = c.createConvolver(), len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); } rv.buffer = ir; const rg = c.createGain(); rg.gain.value = .35; rv.connect(rg); rg.connect(bus); L.verb = rv;
    nextT = c.currentTime + .1; return true; }
  const send = (node, layer, wet = .3) => { node.connect(L[layer]); if (wet) { const g = sfx.ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(L.verb); } };
  function pluck(f, t, d, v, layer = 'ride') { const c = sfx.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.Q.value = 4; fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(500, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(fl); fl.connect(g); send(g, layer, .25); o.start(t); o.stop(t + d + .05); }
  function bass(f, t, v, layer = 'ride') { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + .28); o.connect(g); send(g, layer, 0); o.start(t); o.stop(t + .3); }
  function whistle(f, t, d, v) { const c = sfx.ctx, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; lfo.frequency.value = 5.5; lg.gain.value = f * .012; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .06); g.gain.setValueAtTime(v, t + d * .75); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g); send(g, 'ride', .5); o.start(t); lfo.start(t); o.stop(t + d + .05); lfo.stop(t + d + .05); }
  function pad(fs, t, d, v, layer) { const c = sfx.ctx, fl = c.createBiquadFilter(), g = c.createGain(); fl.type = 'lowpass'; fl.frequency.value = layer === 'under' ? 380 : 900; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * .35); g.gain.linearRampToValueAtTime(0, t + d); fl.connect(g); send(g, layer, .5);
    for (const f of fs) for (const dt of [-4, 4]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + d + .05); } }
  function bell(f, t, v, layer) { const c = sfx.ctx, o = c.createOscillator(), m = c.createOscillator(), mg = c.createGain(), g = c.createGain(); o.frequency.value = f; m.frequency.value = f * 2.76; mg.gain.value = f * 1.4; m.connect(mg); mg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(.0005, t + 2.2); o.connect(g); send(g, layer, .7); o.start(t); m.start(t); o.stop(t + 2.3); m.stop(t + 2.3); }
  function drum(t, v, low = 1) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140 * low, t); o.frequency.exponentialRampToValueAtTime(45 * low, t + .18); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + .35); o.connect(g); send(g, 'fight', .2); o.start(t); o.stop(t + .4);
    if (sfx.noise) { const s = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain(); s.buffer = sfx.noise; f.type = 'bandpass'; f.frequency.value = 900; ng.gain.setValueAtTime(v * .5, t); ng.gain.exponentialRampToValueAtTime(.0005, t + .12); s.connect(f); f.connect(ng); send(ng, 'fight', .2); s.start(t); s.stop(t + .15); } }
  const semi = n => 220 * Math.pow(2, n / 12);
  function schedule(t, s, mix) { const ch = chords[bar % 4], i = s % 16, ph = bar % 8;
    if (mix.ride > .01) { if (i % 2 === 0) pluck(ch[(i / 2) % 3] * 2 * (i % 8 === 6 ? 1.5 : 1), t, .45, .07); if (mix.gallop > .5 && (i === 0 || i === 3 || i === 4 || i === 8 || i === 11 || i === 12)) bass(ch[0] / (i % 4 === 0 ? 1 : 1), t, i % 4 === 0 ? .2 : .12);
      else if (i === 0 || i === 8) bass(ch[0], t, .14); if (ph >= 4) { const k = (ph - 4) * 16 + i; for (const [at, n, d] of theme) if (at === k) whistle(semi(n), t, d * S16 * 1.05, .08); } }
    if (mix.night > .01) { if (i === 0) pad([ch[0], ch[1] * 2, ch[2] * 2], t, S16 * 16, .045, 'night'); if (i === 6 && bar % 2) bell(ch[2] * 4, t, .05, 'night'); if (i === 12 && bar % 4 === 3) bell(ch[1] * 4, t, .04, 'night'); }
    if (mix.fight > .01) { if (i % 4 === 0) drum(t, .45); if (i === 6 || i === 14) drum(t, .25, 1.4); if (i % 2 === 0) bass(ch[0] * (i % 8 === 4 ? 1.5 : 1), t, .16, 'fight'); if (i === 0 && bar % 2 === 0) pluck(ch[0] * 4, t, .9, .1, 'fight'); }
    if (mix.under > .01) { if (i === 0 && bar % 2 === 0) pad([55, 82.4], t, S16 * 32, .06, 'under'); if (i === 10 && Math.random() < .5) bell(semi(12 + [0, 3, 7, 10][Math.floor(Math.random() * 4)]) * 2, t, .035, 'under'); } }
  const mix = { ride: 0, night: 0, fight: 0, under: 0, gallop: 0 };
  function mood() { const Z = H.zombies, fight = (Z && (Z.bossOn || Z.maxChaos)) || (H.cave && H.cave.state && H.cave.state.phase === 1 && H.cave.underP), under = (H.cave && H.cave.underP) || (H.temple && H.temple.underP);
    return fight ? 'fight' : under ? 'under' : (H.night || 0) > .5 ? 'night' : 'ride'; }
  let tick = 0;
  function update(dt) { if (!bus && !init()) return; const c = sfx.ctx; if (c.state !== 'running') return; const m = mood();
    mix.gallop = H.mounted && Math.abs(H.speed || 0) > 6 ? 1 : 0; const dance = H.saloon && H.saloon.dance; const tv = dance ? 0 : LV[lv];
    bus.gain.setTargetAtTime(tv, c.currentTime, .6); for (const k of ['ride', 'night', 'fight', 'under']) { const on = k === m ? 1 : 0; mix[k] += (on - mix[k]) * Math.min(1, dt * .5); L[k].gain.setTargetAtTime(mix[k] * (k === 'ride' && !H.mounted ? .7 : 1), c.currentTime, .3); }
    if (tv === 0) { nextT = c.currentTime + .1; return; } if (nextT < c.currentTime - .5) nextT = c.currentTime + .05;
    while (nextT < c.currentTime + .25) { schedule(nextT, step, mix); step++; if (step % 16 === 0) bar++; nextT += S16; } }
  return { update, get ready() { return !!bus && sfx.ctx.state; }, get level() { return lv; }, setLevel(v) { lv = Math.max(0, Math.min(3, v | 0)); try { localStorage.setItem('hr_music', String(lv)); } catch (_) {} }, get mood() { return mood(); } };
}
