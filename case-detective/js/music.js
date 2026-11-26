/*!
 * Music: background music for the game. Niccolò Paganini's Caprices for solo violin, Op. 1, played on the Web Audio
 * API with recordings of a real violin (js/sampler.js, when the page has it) or by a small violin synthesizer. No
 * dependencies, nothing loaded from another site.
 *
 *   Music.setEnabled(bool)   music on or off. It starts at the first tap or key press after it is switched on.
 *   Music.isEnabled()
 *   Music.setVolume(0..1)    Music.getVolume()
 *   Music.next()  Music.prev()   the next piece, or the one before, in the list of the mode in force
 *   Music.start(n)           begin with caprice number n (before the first note) or jump to it
 *   Music.now()              { n, title, marking, playing, failed, mode } of the piece or passage in hand, or null
 *                            (failed: not one piece could be fetched; it tries again when asked)
 *   Music.count()            how many caprices the list names (0 until the list is there)
 *   Music.credit()           one line that says where the notes come from (from music/list.js)
 *   Music.onchange = fn      called with Music.now() whenever the piece or the state changes
 *   Music.setMode(m)         "calm" (the background: slow passages, slower and softer than written, one after
 *                            another) or "show" (a fast caprice at full speed and full tone, while the Inspector
 *                            plays his violin). A switch fades the music in hand out within half a second and
 *                            the other list begins; back in "calm", the calm list goes on with its next passage.
 *                            With the music switched off the mode is only recorded, and nothing sounds.
 *   Music.mode()             "calm" or "show"
 *   Music.onnote = fn        called near the start of the notes that sound, never more than five times a
 *                            second, with { n, pitch, dur } (caprice number, MIDI pitch, seconds). What it
 *                            throws is its own business: the music goes on.
 *
 * The notes are not in this file. music/list.js names the pieces (a page can load it with a script tag of its
 * own, after this file; if it has not, the module fetches it), and each piece is one small script,
 * music/caprice-NN.js, fetched only when it is about to be played (plain script tags, so it also works from
 * a folder on disk). The page that uses the module remembers the setting; the module keeps nothing.
 *
 * The recorded violin: a page that loads js/sampler.js (window.ViolinSampler) before this file gets the notes played
 * from recordings of a real violin. Its recordings, music/violin/violin-01.js to violin-03.js (1.5 MB, the low
 * register first), are fetched one after the other with script tags once the instrument is built, that is after
 * the first tap with the music on; a file that could not be fetched is asked for again at a later tap (at most every
 * 15 seconds). Until a note's recording has come in, and for plucked notes, the synthesizer plays it.
 *
 * An entry of the list is { n, title, marking, file } for a whole piece played as written (in the background
 * list), or a passage: it adds from and to (seconds of the piece at its written tempo, at bar lines; without
 * them, from the start or to the end), rate (0.8: at eight tenths of the written tempo) and mode ("calm" or
 * "show"). A passage of the calm list is played softer and with a gentler tone (a darker sound, a slower bow
 * attack) and fades in and out over a second and a half where it is cut out of its piece; a show piece keeps the
 * full tone. Optional: fade (seconds), level (0..1), soft (0..1: how much gentler the tone).
 *
 * The audio context is only ever created inside a user gesture, the music pauses while the page is hidden,
 * and every failure is swallowed: this module never throws and never logs. A piece whose file cannot be
 * fetched is skipped, and asked for again a minute later, or as soon as the player asks for music again or the
 * connection is back.
 */
(function (root) {
  "use strict";

  var doc = root.document;
  var BASE = (function () {
    try { return (doc.currentScript && doc.currentScript.src ? doc.currentScript.src.replace(/[^\/]*$/, "") : "js/") + "../music/"; }
    catch (e) { return "music/"; }
  })();

  /* ------------------------------------------------------------------ the violin
     One note is a sawtooth (a bowed string moves in a sawtooth) with a bow attack, a vibrato that sets in late
     on long notes, and a breath of bow noise. All notes then pass through one fixed "body": nearly fifty narrow
     resonances laid out like those of a violin (the air inside near 280 Hz, the wood between 350 and 550 Hz,
     then a thicket of smaller ones up to 6 kHz). Because the resonances stay put while the notes move, every
     pitch gets its own color and a vibrato makes the tone shimmer, which is what makes it sound like a violin
     and not like an organ stop. A short synthetic room follows.
     It is built on any BaseAudioContext, so the same code plays live and renders offline for the sound checks. */
  function makeViolin(ctx, dest) {
    var sr = ctx.sampleRate, i, seed = 20231;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; }

    /* the body, as an impulse response: a sum of decaying sine waves, one per resonance. The five lowest are
       set by hand; the others are scattered up to 6.4 kHz by a fixed seed, which was picked (tools/body.js) so
       that no note of the violin's range comes out much louder or weaker than its neighbors. */
    var blen = Math.floor(sr * 0.1), bir = ctx.createBuffer(1, blen, sr), bd = bir.getChannelData(0), bseed = 48440;
    function brnd() { bseed = (bseed * 16807) % 2147483647; return bseed / 1073741823.5 - 1; }
    function buni() { return (brnd() + 1) / 2; }
    function mode(f, q, g, ph) {
      if (f > sr * 0.45) { return; }
      var a = Math.PI * f / q, w = 2 * Math.PI * f / sr, amp = g * 2 * a / sr, k = Math.exp(-a / sr);
      for (var m = 0; m < blen; m++) { bd[m] += amp * Math.sin(w * m + ph); amp *= k; }
    }
    /* frequency, sharpness, gain, phase: the air inside (278 Hz), then the wood */
    var LOW = [278, 9, 1, 0, 345, 13, 0.8, 3.1416, 408, 15, 0.85, 0, 466, 18, 0.82, 3.1416, 551, 22, 0.95, 0];
    /* the gain of the upper resonances follows this curve (frequency, gain, ...) */
    var ENV = [640, 0.5, 1000, 0.27, 1300, 0.34, 1700, 0.22, 2500, 0.17, 3300, 0.34, 4200, 0.26, 6400, 0.09];
    function env(f) {
      var j = 0;
      while (j < ENV.length - 4 && f > ENV[j + 2]) { j += 2; }
      var x = Math.min(1, Math.max(0, Math.log(f / ENV[j]) / Math.log(ENV[j + 2] / ENV[j])));
      return ENV[j + 1] * Math.pow(ENV[j + 3] / ENV[j + 1], x);
    }
    for (i = 0; i < LOW.length; i += 4) { mode(LOW[i], LOW[i + 1], LOW[i + 2], LOW[i + 3]); }
    for (var f = 630; f < 6400; f *= 1.035 + 0.045 * buni()) { mode(f, 13 + 12 * buni(), env(f) * (0.75 + 0.5 * buni()), brnd() * 3.1416); }
    bd[0] += 0.2;                                                    /* what gets through beside the resonances */
    for (i = 0; i < 400 && i < blen; i++) { bd[blen - 1 - i] *= i / 400; }
    var body = ctx.createGain(), wood = ctx.createConvolver(), chain = wood;
    wood.normalize = false; wood.buffer = bir;
    body.connect(wood);
    /* every note enters the body through a bus, so that the notes in hand can be taken back (see cut) */
    var bus = ctx.createGain();
    bus.connect(body);
    function bq(type, fr, q, g) {
      var b = ctx.createBiquadFilter();
      b.type = type; b.frequency.value = Math.min(fr, sr * 0.45); b.Q.value = q;
      if (g != null) { b.gain.value = g; }
      chain.connect(b); chain = b;
    }
    bq("highpass", 165, 0.7);
    bq("peaking", 2300, 0.9, -4);     /* a little less edge: this is music to think by */
    bq("lowpass", 5200, 0.7);
    bq("lowpass", 9000, 0.5);
    /* the gentle tone of the background (see tone): the same sound through a darker filter, blended in. The full
       tone goes straight on, so a show piece sounds exactly as the music always did. */
    var full = ctx.createGain(), dark = ctx.createBiquadFilter(), darkG = ctx.createGain(), toneOut = ctx.createGain();
    dark.type = "lowpass"; dark.frequency.value = Math.min(MELLOW, sr * 0.45); dark.Q.value = -3;   /* (dB: no peak) */
    full.gain.value = 1; darkG.gain.value = 0;
    chain.connect(full); full.connect(toneOut);
    chain.connect(dark); dark.connect(darkG); darkG.connect(toneOut);
    chain = toneOut;

    /* the room: a short tail of decaying noise, a little darker at the end than at the start */
    var len = Math.floor(sr * 1.4), ir = ctx.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch), lp = 0;
      for (i = 0; i < len; i++) {
        var x = i / sr, k = 0.22 + 0.5 * Math.exp(-x * 3);
        lp += (rnd() - lp) * k;
        d[i] = lp * Math.exp(-x * 4.9) * (x < 0.012 ? x / 0.012 : 1);
      }
    }
    var conv = ctx.createConvolver(), wet = ctx.createGain(), dry = ctx.createGain();
    conv.normalize = true; conv.buffer = ir;
    wet.gain.value = 0.4; dry.gain.value = 0.9;
    chain.connect(dry); dry.connect(dest);
    chain.connect(conv); conv.connect(wet); wet.connect(dest);

    /* vibrato: about six times a second, and never quite regular */
    var lfo = ctx.createOscillator(), drift = ctx.createOscillator(), driftAmt = ctx.createGain();
    lfo.frequency.value = 5.9; drift.frequency.value = 0.31; driftAmt.gain.value = 0.35;
    drift.connect(driftAmt); driftAmt.connect(lfo.frequency);
    lfo.start(); drift.start();

    /* bow noise: one loop of hiss, shared by all notes */
    var nlen = Math.floor(sr * 1.7), nb = ctx.createBuffer(1, nlen, sr), nd = nb.getChannelData(0);
    for (i = 0; i < nlen; i++) { nd[i] = rnd(); }
    var hiss = ctx.createBufferSource(), hissF = ctx.createBiquadFilter();
    hiss.buffer = nb; hiss.loop = true;
    hissF.type = "bandpass"; hissF.frequency.value = Math.min(3000, sr * 0.4); hissF.Q.value = 0.6;
    hiss.connect(hissF); hiss.start();

    /* a plucked string: the overtones fall away much faster than under the bow */
    var pluck = null;
    try {
      var re = new Float32Array(25), im = new Float32Array(25);
      for (i = 1; i < 25; i++) { im[i] = Math.sin(i * Math.PI * 0.16) / (i * i); }
      pluck = ctx.createPeriodicWave(re, im);
    } catch (e) { pluck = null; }

    /* how gentle the notes that are handed over now are: 0 the full tone, 1 the background's */
    var soft = 0;

    /* one note. t = start (context time), dur = written length in seconds, midi = pitch, vel = 1..127,
       kind: 0 = a bow stroke of its own; +1 = plucked; +2 = slurred on from the note before (same bow, no new
       attack); +4 = the next note is slurred on to this one (so it is held right up to it),
       cents = how far off true pitch (a player is never exactly on it). In the gentle tone a new bow stroke
       begins more slowly and with less noise, and lets go a little more slowly. */
    function note(t, dur, midi, vel, kind, cents) {
      var plucked = kind & 1, slur = kind & 2, into = kind & 4;
      var fr = 440 * Math.pow(2, (midi - 69) / 12);
      var loud = 0.2 + 0.8 * Math.pow(Math.min(127, Math.max(1, vel)) / 100, 1.3);
      var lev = GAIN * loud * Math.pow(440 / fr, 0.1);
      var o = ctx.createOscillator(), g = ctx.createGain(), end;
      if (plucked && pluck) { o.setPeriodicWave(pluck); } else { o.type = "sawtooth"; }
      o.frequency.setValueAtTime(fr, t);
      if (cents) { o.detune.setValueAtTime(cents, t); }
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t);
      if (plucked) {
        var ring = 0.06 + 26 / fr;                    /* low strings ring longer */
        g.gain.linearRampToValueAtTime(lev * 0.9, t + 0.004);
        g.gain.setTargetAtTime(0, t + 0.004, ring);
        end = t + 0.004 + ring * 6;
      } else {
        var fast = dur < 0.16;
        var a = slur ? 0.01 : fast ? (0.011 + dur * 0.06) * (1 + 0.5 * soft) : Math.min(0.06 + 0.07 * soft, (0.02 + dur * 0.08) * (1 + 1.2 * soft));
        var r = (into ? 0.03 : fast ? 0.05 : Math.min(0.13, 0.06 + dur * 0.1)) * (1 + 0.5 * soft);
        var hold = Math.max(a + 0.004, into ? dur + 0.006 : dur - (fast ? 0.004 : 0.02));
        g.gain.linearRampToValueAtTime(lev * (fast ? 1 : 0.86), t + a);
        if (!fast) { g.gain.setTargetAtTime(lev * (dur > 0.7 ? 1.06 : 0.96), t + a, Math.max(0.08, dur * 0.3)); }
        g.gain.setTargetAtTime(0, t + hold, r / 4.6);
        end = t + hold + r + 0.02;
      }
      o.connect(g); g.connect(bus);
      var vg = null, ng = null;
      if (!plucked && dur > 0.26) {
        var v0 = t + Math.min(0.14, dur * 0.3);
        vg = ctx.createGain();
        vg.gain.value = 0;
        vg.gain.setValueAtTime(0, v0);
        vg.gain.linearRampToValueAtTime(fr * VIB, v0 + Math.min(0.3, dur * 0.5));
        lfo.connect(vg); vg.connect(o.frequency);
      }
      if (!plucked && dur > 0.07) {
        var hush = 1 - 0.55 * soft;
        ng = ctx.createGain();
        ng.gain.value = 0;
        ng.gain.setValueAtTime(0, t);
        if (slur) { ng.gain.linearRampToValueAtTime(lev * 0.05 * hush, t + 0.012); }
        else { ng.gain.linearRampToValueAtTime(lev * 0.45 * hush, t + 0.008 + 0.012 * soft); ng.gain.setTargetAtTime(lev * 0.05 * hush, t + 0.008 + 0.012 * soft, 0.03); }
        ng.gain.setTargetAtTime(0, t + Math.max(0.03, dur - 0.02), 0.03);
        hissF.connect(ng); ng.connect(bus);
      }
      o.start(t); o.stop(end);
      o.onended = function () {
        try { o.disconnect(); g.disconnect(); if (vg) { lfo.disconnect(vg); vg.disconnect(); } if (ng) { hissF.disconnect(ng); ng.disconnect(); } } catch (e) { /* gone already */ }
      };
      return end;
    }
    /* take back every note that has been handed over, sounding or still to come: they fade out with their
       bus within `secs` (from now, or from the context time `at`), and a fresh bus takes the notes that follow.
       What has already sounded rings out in the room. */
    function cut(secs, at) {
      var old = bus, t = at == null ? ctx.currentTime : Math.max(ctx.currentTime, at);
      bus = ctx.createGain();
      bus.connect(body);
      try { old.gain.setValueAtTime(1, t); old.gain.linearRampToValueAtTime(0, t + Math.max(0.01, secs)); } catch (e) { /* ignore */ }
      if (at == null) {
        try { root.setTimeout(function () { try { old.disconnect(); } catch (e) { /* gone already */ } }, Math.max(0.01, secs) * 1000 + 150); } catch (e) { /* ignore */ }
      }
    }
    /* the tone of the notes handed over from now on: s = 0 the full tone, 1 the background's gentle one (the
       darker filter blends in from the context time `at`, or now) */
    function tone(s, at) {
      soft = Math.max(0, Math.min(1, +s || 0));
      var t = at == null ? ctx.currentTime : Math.max(ctx.currentTime, at);
      try {
        full.gain.cancelScheduledValues(t); darkG.gain.cancelScheduledValues(t);
        full.gain.setTargetAtTime(1 - soft, t, 0.03); darkG.gain.setTargetAtTime(soft, t, 0.03);
      } catch (e) { /* ignore */ }
    }
    return { note: note, cut: cut, tone: tone, input: body, soft: function () { return soft; } };
  }
  var GAIN = 0.3;          /* the level of one note going into the body */
  var VIB = 0.0085;        /* vibrato: how far the pitch swings, as a share of the frequency (about 15 cents) */
  var MELLOW = 2600;       /* the gentle tone: the corner of its darker filter (Hz) */
  var CALM = 0.62;         /* the calm list sits this much lower than a show piece */
  var FADE = 1.5;          /* seconds of fade where a calm passage is cut out of its piece (a show passage: 0.5) */

  /* ------------------------------------------------------------------ the notes
     A piece is { title, marking, unit, ppq, tempo: [tick, microseconds per quarter, ...], vel: [note index, velocity, ...],
     pizz: [first note index, last note index, ...] (optional: plucked notes), slur: 1 (optional: the file
     carries its articulation, see below), notes: "…" }.
     notes is a string of numbers written with 90 printable characters (a digit below 45 ends a number, a digit from
     45 up carries on): for every note the gap since the last note began and its length, both in units of `unit`
     ticks, then its pitch as one character (MIDI number minus 30). */
  function digit(c) { return c - 35 - (c > 92 ? 1 : 0); }
  function decode(p) {
    var s = p.notes, i = 0, n = s.length, tick = 0, on = [], len = [], pit = [];
    function chr() {
      var d = i < n ? digit(s.charCodeAt(i++)) : -1;
      if (!(d >= 0 && d < 90)) { throw new Error("the notes are damaged"); }
      return d;
    }
    function num() {
      var v = 0, m = 1, d;
      for (;;) { d = chr(); if (d < 45) { return v + d * m; } v += (d - 45) * m; m *= 45; }
    }
    if (!(p.unit > 0)) { throw new Error("the notes are damaged"); }
    while (i < n) { tick += num() * p.unit; on.push(tick); len.push(num() * p.unit); pit.push(chr() + 30); }
    /* ticks to seconds through the tempo map */
    var tm = p.tempo && p.tempo.length ? p.tempo : [0, 500000], q = p.ppq || 384, k0;
    for (k0 = 1; k0 < tm.length; k0 += 2) { if (!(tm[k0] >= 20000)) { throw new Error("the tempo is damaged"); } }
    function sec(tk) {
      var t = 0, last = 0, us = tm[1], k;
      for (k = 0; k < tm.length; k += 2) {
        if (tm[k] * p.unit >= tk) { break; }
        t += (tm[k] * p.unit - last) * us / q / 1e6; last = tm[k] * p.unit; us = tm[k + 1];
      }
      return t + (tk - last) * us / q / 1e6;
    }
    var N = on.length, T = new Float64Array(N), D = new Float64Array(N), V = new Uint8Array(N), K = new Uint8Array(N), W = new Float64Array(N), j, v = 80, vi = 0;
    for (j = 0; j < N; j++) {
      while (p.vel && vi < p.vel.length && p.vel[vi] <= j) { v = p.vel[vi + 1]; vi += 2; }
      T[j] = sec(on[j]); D[j] = sec(on[j] + len[j]) - T[j]; V[j] = v; W[j] = T[j];
      if (!(T[j] >= 0 && T[j] < 1e5 && D[j] >= 0 && D[j] < 1e4)) { throw new Error("the notes are damaged"); }
    }
    if (p.pizz) { for (j = 0; j < p.pizz.length; j += 2) { for (var x = p.pizz[j]; x <= p.pizz[j + 1] && x < N; x++) { K[x] = 1; } } }
    /* In a file that carries its articulation (slur: 1, found out when the piece file is made), separate
       notes stop a little short of the next one, so a note that begins exactly where another one ends was
       slurred on to it: same bow, no new attack. A file without articulation has every note touching the
       next, and tells nothing: there every note gets a bow stroke of its own. */
    if (p.slur) {
      var ends = {};
      for (j = 0; j < N; j++) {
        if (!(K[j] & 1) && ends[on[j]]) { K[ends[on[j]] - 1] |= 4; K[j] |= 2; }
        ends[on[j] + len[j]] = (K[j] & 1) ? 0 : j + 1;
      }
    }
    /* nobody plays like a clock or dead in tune: a few thousandths of a second and a few cents either way */
    var C = new Float32Array(N);
    function wob(a, salt) { var h = Math.sin((a + 1) * 12.9898 + salt * 78.233) * 43758.5453; return (h - Math.floor(h)) * 2 - 1; }
    for (j = 0; j < N; j++) { C[j] = wob(j, 1) * 3; T[j] = Math.max(0, T[j] + wob(on[j] / p.unit, 2) * 0.003); }
    /* chords of three and four notes are rolled the way a bow has to take them: the low strings a moment early
       and short, the top two notes on the beat and held */
    for (j = 0; j < N;) {
      var e = j + 1;
      while (e < N && on[e] === on[j]) { e++; }
      if (e - j >= 3 && !(K[j] & 1)) {
        var idx = [], c;
        for (c = j; c < e; c++) { idx.push(c); }
        idx.sort(function (a, b) { return pit[a] - pit[b]; });
        var lows = idx.length - 2, lead = Math.min(0.075, Math.max(0.03, D[idx[idx.length - 1]] * 0.3));
        for (c = 0; c < lows; c++) {
          var id = idx[c];
          T[id] = T[id] - lead * (1 - c / (lows + 1)) - 0.012;
          D[id] = Math.min(D[id], Math.max(0.12, lead + 0.09));
        }
      }
      j = e;
    }
    var early = 0;
    for (j = 0; j < N; j++) { if (T[j] < early) { early = T[j]; } }
    if (early < 0) { for (j = 0; j < N; j++) { T[j] -= early; W[j] -= early; } }
    /* the scheduler needs the notes in the order they sound */
    var order = [];
    for (j = 0; j < N; j++) { order.push(j); }
    order.sort(function (a, b) { return T[a] - T[b] || a - b; });
    /* w: when each note is written to begin (the same clock, without the human errors and the rolls), for
       cutting passages out at bar lines; shift: how much later than written the piece begins (a rolled chord at
       its very start), so that a bar line written at s seconds is at s + shift here */
    var out = { t: new Float64Array(N), d: new Float64Array(N), p: new Uint8Array(N), v: new Uint8Array(N), k: new Uint8Array(N), c: new Float32Array(N), w: new Float64Array(N), end: 0, shift: -early };
    for (j = 0; j < N; j++) {
      var o = order[j];
      out.t[j] = T[o]; out.d[j] = D[o]; out.p[j] = pit[o]; out.v[j] = V[o]; out.k[j] = K[o]; out.c[j] = C[o]; out.w[j] = W[o];
      if (T[o] + D[o] > out.end) { out.end = T[o] + D[o]; }
    }
    return out;
  }

  /* what an entry of the list plays: its notes (all of the piece, or those written to begin from `from` up to
     `to`), at its rate, starting at 0, with the level, tone and fades it is played with. A note that would
     ring on past the cut at the end is stopped there. */
  function clip(s, m) {
    var calm = m.mode === "calm", EPS = 0.02;
    var r = +m.rate > 0 ? Math.min(4, Math.max(0.25, +m.rate)) : 1;
    var from = Math.max(0, +m.from || 0), to = +m.to > from ? +m.to : Infinity;
    var N = s.t.length, sel = [], j;
    for (j = 0; j < N; j++) { if (s.w[j] >= from - EPS && s.w[j] < to - EPS) { sel.push(j); } }
    /* a chord rolled on the first beat begins a moment before its bar line */
    var base = from;
    for (j = 0; j < sel.length; j++) { if (s.t[sel[j]] < base) { base = s.t[sel[j]]; } }
    var K = sel.length, cutEnd = to < s.end - EPS, endT = cutEnd ? (to - base) / r : 0;
    var out = { t: new Float64Array(K), d: new Float64Array(K), p: new Uint8Array(K), v: new Uint8Array(K), k: new Uint8Array(K), c: new Float32Array(K), end: 0 };
    for (j = 0; j < K; j++) {
      var o = sel[j], tt = (s.t[o] - base) / r, dd = s.d[o] / r;
      if (cutEnd) { dd = Math.min(dd, Math.max(0.05, endT - tt)); }
      out.t[j] = tt; out.d[j] = dd; out.p[j] = s.p[o]; out.v[j] = s.v[o]; out.k[j] = s.k[o]; out.c[j] = s.c[o];
      if (tt + dd > out.end) { out.end = tt + dd; }
    }
    if (cutEnd && endT > out.end) { out.end = endT; }
    var fade = +m.fade >= 0 ? +m.fade : calm ? FADE : 0.5;
    out.rate = r; out.from = from; out.to = to;
    out.fadeIn = from > EPS ? Math.min(fade, out.end / 3) : 0;
    out.fadeOut = cutEnd ? Math.min(fade, out.end / 3) : 0;
    out.level = +m.level > 0 ? Math.min(1, +m.level) : calm ? CALM : 1;
    out.soft = +m.soft >= 0 ? Math.min(1, +m.soft) : calm ? 1 : 0;
    return out;
  }
  /* the level of a passage at context time t, for an envelope { s, t0, from, hold } (see envelope) */
  function envAt(e, t) {
    if (!e) { return 1; }
    if (t < e.from) { return e.hold; }
    var s = e.s, x = t - e.t0, v = s.level;
    if (s.fadeIn > 0 && x < s.fadeIn) { v = s.level * Math.max(0, x) / s.fadeIn; }
    if (s.fadeOut > 0 && x > s.end - s.fadeOut) { v = Math.min(v, s.level * Math.max(0, s.end - x) / s.fadeOut); }
    return v;
  }
  /* lay the level of passage s, which begins (its time 0) at context time T0 and is played from its time p on,
     on the gain of the rig: it holds where it stands until the passage sounds, then follows the passage's
     level and fades. Where the gain stands is worked out here, not read back from the audio thread. */
  function envelope(rig, s, T0, p, now) {
    var g = rig.shape.gain, v = envAt(rig.env, now), st = Math.max(now, T0 + p), pre = Math.max(now, st - 0.05);
    try {
      g.cancelScheduledValues(now);
      g.setValueAtTime(v, now);
      rig.env = { s: s, t0: T0, from: st, hold: v };
      /* (the last moment of the ring of the music before is not cut off with a click) */
      if (st > pre) { g.setValueAtTime(v, pre); g.linearRampToValueAtTime(envAt(rig.env, st), st); }
      else { g.setValueAtTime(envAt(rig.env, st), st); }
      if (s.fadeIn > 0 && T0 + s.fadeIn > st) { g.linearRampToValueAtTime(s.level, T0 + s.fadeIn); }
      if (s.fadeOut > 0) {
        var fb = T0 + s.end - s.fadeOut;
        if (fb > st) { g.setValueAtTime(envAt(rig.env, fb), fb); }
        g.linearRampToValueAtTime(0, T0 + s.end);
      }
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ the player */
  var LIST = [], CREDIT = "", listed = false, PIECES = {}, loading = {}, listTries = 0;
  var asked = {};          /* how often each file was asked for: a new try gets an address of its own */
  var ctx = null, out = null, violin = null, rig = null, unlocked = false;
  var noAudio = false;     /* this browser gives no sound: for good */
  var gaveUp = false, gaveUpAt = 0;   /* not one piece could be fetched: until the player asks again */
  var enabled = false, volume = 0.5, hidden = false;
  var cur = -1;            /* index in LIST of the piece in hand */
  var song = null;         /* its notes, as it plays them (see clip) */
  var t0 = 0, pos = 0, next = 0, running = false, timer = 0, startTimer = 0, wantN = 0;
  var handed = 0, haltedAt = -1;   /* at the last stop: the first note not yet handed over, and when that was */
  var LEVEL = 0.5;         /* the music sits well under the sound effects */
  var ramp = { v0: 0, t0: 0, v1: 0, t1: 0 };   /* the move of the output level that was asked for last */
  var mode = "calm";       /* the list in force: "calm" (the background) or "show" (while the Inspector plays) */
  var place = { calm: -1, show: -1 };   /* the entry each list has in hand, or played last */
  var calmNext = false;    /* a show piece took over from a calm passage: the calm list goes on with the next one */
  var switchAt = -1;       /* context time of the last switch of mode */
  var SWITCH = 0.35;       /* a switch: the music in hand fades out within this time, the other list begins just after */
  var told = 0, toldAt = -1;   /* onnote: the first note not yet told of, and when the last call was (context time) */
  var TELL = 0.21;         /* onnote: at least this long between two calls (so never more than five a second) */

  /* the violin, then a compressor that evens out loud chords and soft runs (so the sound is the same at every
     volume), then the level of the passage (its fades, and the calm list a little lower), then the volume control */
  function makeRig(c) {
    var pre = c.createGain(), comp = c.createDynamicsCompressor(), shape = c.createGain(), o = c.createGain();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.25;
    o.gain.value = 0; shape.gain.value = 1;
    pre.connect(comp); comp.connect(shape); shape.connect(o); o.connect(c.destination);
    var synth = makeViolin(c, pre), rec = recorded(c, pre, synth);
    return { out: o, shape: shape, env: null, violin: rec || synth, recorded: !!rec };
  }
  /* the recorded violin (js/sampler.js), when the page has it: the notes are played from recordings of a real
     violin, and the synthesizer plays what they cannot (plucked notes, and notes whose recording has not come in
     yet; the voice hands those over itself, and its cut() takes back the synthesizer's notes too). The recordings
     keep their own bow attack (a long note swells in over up to 0.3 s); the gentle tone of the background is the
     synthesizer's darker filter, blended in after them. Null when the page has no recorded violin. */
  function recorded(c, dest, synth) {
    var VS = root.ViolinSampler;
    if (!VS || typeof VS.make !== "function") { return null; }
    try {
      var into = c.createGain(), full = c.createGain(), dark = c.createBiquadFilter(), darkG = c.createGain();
      dark.type = "lowpass"; dark.frequency.value = Math.min(MELLOW, c.sampleRate * 0.45); dark.Q.value = -3;
      full.gain.value = 1; darkG.gain.value = 0;
      into.connect(full); full.connect(dest);
      into.connect(dark); dark.connect(darkG); darkG.connect(dest);
      var v = VS.make(c, into, { fallback: synth });
      if (!v || typeof v.note !== "function" || typeof v.cut !== "function") { return null; }
      return {
        note: v.note,
        cut: function (secs) { v.cut(secs); },
        /* the tone of the notes handed over from now on, for both voices (see makeViolin's tone) */
        tone: function (s, at) {
          synth.tone(s, at);
          var k = synth.soft(), t = at == null ? c.currentTime : Math.max(c.currentTime, at);
          try {
            full.gain.cancelScheduledValues(t); darkG.gain.cancelScheduledValues(t);
            full.gain.setTargetAtTime(1 - k, t, 0.03); darkG.gain.setTargetAtTime(k, t, 0.03);
          } catch (e) { /* ignore */ }
        },
        soft: synth.soft,
        input: v.input
      };
    } catch (e) { return null; }
  }

  /* the two lists. An entry without a mode is a whole piece of the background, as the lists always had them. A
     mode that has no entry of its own plays the other list. */
  function laneOf(m) { return m && m.mode === "show" ? "show" : "calm"; }
  function laneKey(md) {
    var want = md === "show" ? "show" : "calm", i;
    for (i = 0; i < LIST.length; i++) { if (laneOf(LIST[i]) === want) { return want; } }
    return want === "show" ? "calm" : "show";
  }
  function lane(md) { var k = laneKey(md), a = [], i; for (i = 0; i < LIST.length; i++) { if (laneOf(LIST[i]) === k) { a.push(i); } } return a; }
  function hasShow() { for (var i = 0; i < LIST.length; i++) { if (laneOf(LIST[i]) === "show") { return true; } } return false; }
  /* the entry s steps away from entry i in list md (from before its first one when i is not in it) */
  function stepIn(md, i, s) {
    var L = lane(md), k = L.indexOf(i);
    if (!L.length) { return -1; }
    if (k < 0) { k = s > 0 ? -1 : 0; }
    return L[(((k + s) % L.length) + L.length) % L.length];
  }
  function indexIn(md, n) { var L = lane(md); for (var j = 0; j < L.length; j++) { if (LIST[L[j]].n === n) { return L[j]; } } return -1; }
  /* the entry list md begins with when it is taken up */
  function entryFor(md) {
    var k = laneKey(md), L = lane(md);
    if (!L.length) { return -1; }
    if (k === "show") { return place.show >= 0 ? stepIn("show", place.show, 1) : L[0]; }
    if (calmNext && place.calm >= 0) { return stepIn("calm", place.calm, 1); }
    if (place.calm >= 0) { return place.calm; }
    var w = indexIn("calm", wantN);
    return w >= 0 ? w : L[0];
  }

  function info() {
    var m = cur >= 0 ? LIST[cur] : null;
    return m ? { n: m.n, title: m.title || "", marking: m.marking || "", playing: running, failed: gaveUp, mode: laneOf(m) } : null;
  }
  function changed() { try { if (typeof Music.onchange === "function") { Music.onchange(info()); } } catch (e) { /* the page's business */ } }
  /* the number of caprices the list names (a caprice with two passages counts once) */
  function caprices() { var seen = {}, c = 0; for (var i = 0; i < LIST.length; i++) { if (!seen[LIST[i].n]) { seen[LIST[i].n] = 1; c++; } } return c; }
  /* dead: its notes cannot be read. miss: when its file could not be fetched (that may pass: a miss is forgotten
     after a minute, and at once when the player asks for music again or the connection is back, see again) */
  function playable(m) { return !m.dead && !(m.miss && Date.now() - m.miss < 60000); }

  /* fetch one of the music files with a script tag, once. Everybody who asked for it hears how it went.
     A fetch that has not come back after 15 seconds counts as failed. A later try asks under an address of its
     own (?again=1): a browser would hang it on to the request that never came back otherwise. */
  function getFile(key, file, have, done) {
    if (have()) { done(true); return; }
    if (loading[key]) { loading[key].push(done); return; }
    loading[key] = [done];
    var over = false, watch = 0, s = null;
    function fin() {
      if (over) { return; }
      over = true;
      if (watch) { root.clearTimeout(watch); }
      try { if (s && s.parentNode) { s.parentNode.removeChild(s); } } catch (e) { /* ignore */ }
      var q = loading[key] || [], ok = have(), i;
      loading[key] = null;
      for (i = 0; i < q.length; i++) { try { q[i](ok); } catch (e) { /* carry on */ } }
    }
    try {
      s = doc.createElement("script");
      s.src = BASE + file + (asked[key] ? "?again=" + asked[key] : ""); asked[key] = (asked[key] || 0) + 1; s.async = true;
      s.onload = fin; s.onerror = fin;
      (doc.head || doc.documentElement).appendChild(s);
      watch = root.setTimeout(fin, 15000);
    } catch (e) { fin(); }
  }
  function haveList() { return listed; }
  function getList(done) {
    if (!haveList() && !loading.list) { if (listTries >= 3) { done(false); return; } listTries++; }
    getFile("list", "list.js", haveList, done);
  }
  /* a piece whose file cannot be fetched is set aside for a minute, or until the player asks for music again
     or the connection is back */
  function getPiece(m, done) {
    if (!playable(m)) { done(false); return; }
    getFile("p" + m.n, m.file, function () { return !!PIECES[m.n]; }, function (ok) { if (!ok) { m.miss = Date.now(); } done(ok); });
  }
  function again() {
    for (var i = 0; i < LIST.length; i++) { LIST[i].miss = 0; }
    gaveUp = false; listTries = 0;
  }
  /* the notes of an entry as it plays them: the piece is read once, each entry cuts its own passage out of it */
  function shaped(m) {
    var P = PIECES[m.n];
    if (!P) { return null; }
    var whole = P.song || (P.song = decode(P));
    if (!m.cut || m.cutOf !== whole) { m.cut = clip(whole, m); m.cutOf = whole; }
    return m.cut;
  }
  /* a piece fetched ahead of time is also read ahead of time, in a quiet moment: the tap that starts the
     music then has nothing to wait for */
  function ready(m) {
    return function (ok) {
      if (!ok) { return; }
      root.setTimeout(function () {
        try { shaped(m); } catch (e) { /* take() finds out and sets the piece aside */ }
      }, 60);
    };
  }

  /* the audio context is made (and woken) inside a tap or a key press, as browsers ask */
  function ensure() {
    if (noAudio) { return false; }
    try {
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) { noAudio = true; return false; }
        ctx = new AC();
      }
      if (ctx.state !== "running" && typeof ctx.resume === "function") {
        var p = ctx.resume();
        if (p && typeof p.catch === "function") { p.catch(function () { /* stays silent */ }); }
      }
      return true;
    } catch (e) { noAudio = true; ctx = null; return false; }
  }
  /* the instrument itself is built just before the first note, not in that tap: building it takes a moment. The
     recordings of the recorded violin are asked for then (low register first, one file after the other, with
     script tags): the first note does not wait for them, the synthesizer plays until they are in. */
  function rigUp() {
    if (violin) { return true; }
    try { rig = makeRig(ctx); out = rig.out; violin = rig.violin; } catch (e) { noAudio = true; return false; }
    if (rig.recorded) { try { root.ViolinSampler.load(BASE + "violin/"); } catch (e) { /* the synthesizer plays */ } }
    return true;
  }
  /* move the output level to `to` within `secs`. Where the level stands at this moment is worked out here,
     not read back from the audio thread: browsers disagree about what a gain reports while it is moving. */
  function fade(to, secs) {
    try {
      var t = ctx.currentTime, g = out.gain;
      var v = t >= ramp.t1 ? ramp.v1 : ramp.v0 + (ramp.v1 - ramp.v0) * (t - ramp.t0) / (ramp.t1 - ramp.t0);
      secs = Math.max(0.005, secs);
      g.cancelScheduledValues(t);
      g.setValueAtTime(v, t);
      g.linearRampToValueAtTime(to, t + secs);
      ramp = { v0: v, t0: t, v1: to, t1: t + secs };
    } catch (e) { /* ignore */ }
  }

  /* hand over every note that begins within the next third of a second (never more than a handful at a time).
     A note whose moment has come starts a moment later, never in the past: the clock is read again for each
     note, because it can move on in a jump while the notes before it are being built.
     Then tell onnote of the note that has just begun (the top one of a chord), at most once in TELL seconds. */
  function pump() {
    if (!running || !song || !ctx) { return; }
    try {
      var now = ctx.currentTime, horizon = now + 0.34, N = song.t.length, given = 0, j, t;
      if (ctx.state !== "running") { return; }
      while (next < N && t0 + song.t[next] < horizon && given < 24) {
        j = next++;                                   /* moved on first: a note that fails is not tried again */
        t = t0 + song.t[j];
        if (t > now - 0.05) { given++; violin.note(Math.max(t, ctx.currentTime + 0.02), song.d[j], song.p[j], song.v[j], song.k[j], song.c[j]); }
      }
      pos = now - t0;
      tell(now);
      if (next >= N && now > t0 + song.end + 1.6) { advance(1); }
    } catch (e) { /* skip a beat, never throw */ }
  }
  function tell(now) {
    var due = -1, s = song, k;
    while (told < next && t0 + s.t[told] <= now + 0.025) {
      k = told++;
      if (t0 + s.t[k] < now - 0.25) { continue; }                  /* long gone (a late timer): not news */
      if (due < 0 || s.t[k] > s.t[due] + 0.03 || s.p[k] > s.p[due]) { due = k; }
    }
    var fn = Music.onnote;
    if (due < 0 || typeof fn !== "function" || (toldAt >= 0 && now - toldAt < TELL)) { return; }
    toldAt = now;
    try { fn({ n: cur >= 0 ? LIST[cur].n : 0, pitch: s.p[due], dur: s.d[due] }); } catch (e) { /* its own business: the music goes on */ }
  }
  /* play the piece in hand from its time `from`, its first note `lead` seconds from now (a quarter of a second
     unless told) */
  function begin(from, lead) {
    if (!song || !ctx || !rigUp()) { return; }
    pos = from || 0;
    t0 = ctx.currentTime + (lead > 0 ? lead : 0.25) - pos;
    next = 0;
    while (next < song.t.length && song.t[next] < pos) { next++; }
    /* back on within a moment of a stop: the notes handed over before it were heard going down, so the music
       goes on after them and does not play them twice */
    if (pos > 0 && haltedAt >= 0 && ctx.currentTime - haltedAt < 0.6 && handed > next) { next = handed; }
    told = next;
    running = true;
    try { violin.tone(song.soft, t0 + pos - 0.12); envelope(rig, song, t0, pos, ctx.currentTime); } catch (e) { /* ignore */ }
    fade(volume * LEVEL, pos > 0 ? 0.5 : 0.05);
    if (!timer) { timer = root.setInterval(pump, 80); }
    pump();
    /* have the piece after this one at hand before it is needed, and the show piece that would come next */
    if (cur >= 0) {
      var nx = LIST[stepIn(laneOf(LIST[cur]), cur, 1)];
      if (nx && nx !== LIST[cur] && playable(nx)) { getPiece(nx, ready(nx)); }
      if (laneOf(LIST[cur]) === "calm" && hasShow()) { var sh = LIST[entryFor("show")]; if (sh && playable(sh)) { getPiece(sh, ready(sh)); } }
    }
    changed();
  }
  /* stop: the level goes down, and the notes already handed over are taken back, so that none of them is
     heard when the level comes up again */
  function halt(secs) {
    if (running && ctx) { pos = Math.max(0, ctx.currentTime - t0); handed = next; haltedAt = ctx.currentTime; }
    running = false;
    if (timer) { root.clearInterval(timer); timer = 0; }
    if (startTimer) { root.clearTimeout(startTimer); startTimer = 0; }
    secs = secs == null ? 0.35 : secs;
    if (ctx && out) { fade(0, secs); }
    if (ctx && violin) { try { violin.cut(secs); } catch (e) { /* ignore */ } }
  }
  /* a switch of mode: the notes handed over fade out with their bus within SWITCH; the output level stays up,
     for the other list follows at once */
  function letGo() {
    running = false;
    if (timer) { root.clearInterval(timer); timer = 0; }
    if (startTimer) { root.clearTimeout(startTimer); startTimer = 0; }
    haltedAt = -1;
    if (ctx && violin) { try { violin.cut(SWITCH); } catch (e) { /* ignore */ } }
  }
  /* take up entry number i of the list: fetch its notes if need be, then play it (from the top unless told).
     After a switch of mode (sw) the music in hand is let go and the new piece begins as soon as it can, just
     after the old one has faded. */
  function take(i, from, sw) {
    if (!LIST.length || i < 0) { return; }
    i = ((i % LIST.length) + LIST.length) % LIST.length;
    var m = LIST[i], md = laneOf(m);
    if (sw && ctx && violin) { letGo(); } else { halt(0.2); }
    cur = i; place[md] = i; song = null; pos = from || 0; handed = 0;
    if (md === "calm") { calmNext = false; }
    changed();
    getPiece(m, function (ok) {
      if (cur !== i || song) { return; }                            /* another piece by now, or answered already */
      if (ok) {
        try { song = shaped(m); } catch (e) { song = null; }
        if (!song || !song.t.length) { song = null; m.dead = true; }
      }
      if (!song) { advance(1); return; }
      if (!wanted()) { return; }
      if (sw && ctx && violin && switchAt >= 0) {
        begin(pos, Math.max(0.05, switchAt + SWITCH + 0.05 - ctx.currentTime));
      } else {
        /* not in this tap: the game answers the tap first, then the instrument is built and the music begins */
        startTimer = root.setTimeout(function () { startTimer = 0; if (cur === i && wanted() && !running) { begin(pos); } }, 260);
      }
    });
  }
  /* on to the next piece that can be played (step 1) or back to the one before (step -1), in the list in force */
  function advance(step) {
    var L = lane(mode), n = L.length, k, tries = 0;
    if (!n) { return; }
    k = L.indexOf(cur);
    if (k < 0) { k = Math.max(0, L.indexOf(entryFor(mode))) - step; }
    do { k = ((k + step) % n + n) % n; tries++; } while (!playable(LIST[L[k]]) && tries < n);
    if (!playable(LIST[L[k]])) {                                    /* not one piece could be fetched: quiet until asked again */
      halt(); gaveUp = true; gaveUpAt = Date.now(); changed(); return;
    }
    take(L[k]);
  }
  function wanted() { return enabled && unlocked && !hidden && !noAudio && !gaveUp; }
  /* the names and the first piece are fetched ahead of the first tap, so the music can begin at once */
  function ahead() {
    if (cur >= 0) { return; }
    var first = LIST[entryFor(mode)];
    if (first) { getPiece(first, ready(first)); }
  }
  /* bring what sounds in line with what is wanted */
  function sync() {
    try {
      if (listed && !LIST.length) { return; }                       /* a list with nothing on it: nothing to do */
      if (enabled && !noAudio && !gaveUp) {
        if (haveList()) { ahead(); } else { getList(function (ok) { if (ok) { sync(); } }); }
      }
      if (!wanted()) { if (running) { halt(); changed(); } return; }
      if (!ensure() || !haveList() || running) { return; }
      /* nothing in hand, or a piece of the other list (the mode was switched while all was quiet) */
      if (cur < 0 || laneOf(LIST[cur]) !== laneKey(mode)) { take(entryFor(mode)); return; }
      if (song) { if (!startTimer) { begin(pos); } }                /* (a start that is on its way is left alone) */
      else if (!loading["p" + LIST[cur].n]) { take(cur, pos); }
    } catch (e) { /* never throw */ }
  }

  function unlock() {
    unlocked = true;
    if (!enabled) { return; }
    /* recordings that could not be fetched are asked for again (the recorded violin does it at most every 15 s) */
    if (violin && rig && rig.recorded) { try { root.ViolinSampler.load(); } catch (e) { /* the synthesizer plays */ } }
    if (gaveUp && Date.now() - gaveUpAt > 20000) { again(); }       /* a new try now and then, while the game is played */
    sync();
  }
  try {
    ["pointerup", "touchend", "mouseup", "keydown", "click"].forEach(function (type) { root.addEventListener(type, unlock, true); });
    doc.addEventListener("visibilitychange", function () {
      hidden = doc.visibilityState === "hidden";
      if (hidden) {
        if (running) { halt(0.25); changed(); }
        root.setTimeout(function () {
          try {
            if (hidden && ctx && ctx.state === "running") { var p = ctx.suspend(); if (p && typeof p.catch === "function") { p.catch(function () { /* ignore */ }); } }
          } catch (e) { /* ignore */ }
        }, 400);
      } else { sync(); }
    });
    root.addEventListener("online", function () { var was = gaveUp; again(); if (was) { changed(); } sync(); });
  } catch (e) { /* no events, no music */ }

  /* switch the list in force. While the music sounds (or is about to), the piece in hand fades out and the
     other list begins: a show piece in turn, or the calm list with the passage after the one a show piece
     interrupted. Otherwise the mode is only recorded, and the music takes it up when it next starts. */
  function setMode(md) {
    if (md !== "calm" && md !== "show") { return; }
    if (md === mode) { return; }
    mode = md;
    var want = laneKey(md);
    /* the piece in hand belongs to the other list, and it sounds or is about to */
    var busy = cur >= 0 && laneOf(LIST[cur]) !== want && (running || !!startTimer || (!song && !!loading["p" + LIST[cur].n]));
    if (!wanted() || !busy) { sync(); changed(); return; }
    if (laneOf(LIST[cur]) === "calm") { calmNext = true; }
    switchAt = ctx ? ctx.currentTime : -1;
    take(entryFor(md), 0, true);
  }

  var Music = {
    /* called by music/list.js (the pieces, and one line that says where the notes come from) and by each music/caprice-NN.js */
    list: function (a, credit) {
      try { LIST = (a || []).filter(function (m) { return m && m.n && m.file; }); CREDIT = typeof credit === "string" ? credit : ""; listed = true; } catch (e) { /* ignore */ }
    },
    define: function (n, p) { try { if (p && typeof p.notes === "string") { PIECES[n] = p; } } catch (e) { /* ignore */ } },

    setEnabled: function (on) { enabled = !!on; if (enabled) { again(); } sync(); },
    isEnabled: function () { return enabled; },
    setVolume: function (v) { volume = Math.max(0, Math.min(1, +v || 0)); if (running && ctx && out) { fade(volume * LEVEL, 0.15); } },
    getVolume: function () { return volume; },
    start: function (n) {
      try { wantN = +n || 0; var i = indexIn(mode, wantN); if (i >= 0 && i !== cur && (cur >= 0 || wanted())) { take(i); } } catch (e) { /* ignore */ }
    },
    next: function () { try { again(); advance(1); } catch (e) { /* ignore */ } },
    prev: function () { try { again(); advance(-1); } catch (e) { /* ignore */ } },
    now: info,
    count: function () { return caprices(); },
    credit: function () { return CREDIT; },
    onchange: null,
    setMode: function (m) { try { setMode(m); } catch (e) { /* ignore */ } },
    mode: function () { return mode; },
    onnote: null,
    /* for the sound checks and the tests */
    _rig: makeRig, _decode: decode, _clip: clip, _envelope: envelope, _level: LEVEL, _calm: CALM, _fade: FADE, _switch: SWITCH, _tell: TELL, _base: BASE,
    _peek: function () {
      var s = song;
      return { cur: cur, n: cur >= 0 && LIST[cur] ? LIST[cur].n : 0, pos: running && ctx ? ctx.currentTime - t0 : pos, next: next, running: running,
        ctx: ctx ? ctx.state : "none", list: LIST.length, pieces: Object.keys(PIECES).length, enabled: enabled, unlocked: unlocked, hidden: hidden,
        broken: noAudio || gaveUp, noAudio: noAudio, gaveUp: gaveUp, starting: !!startTimer, gain: out ? out.gain.value : -1, level: ramp.v1,
        mode: mode, lane: cur >= 0 && LIST[cur] ? laneOf(LIST[cur]) : "", place: { calm: place.calm, show: place.show }, calmNext: calmNext,
        shape: rig ? rig.shape.gain.value : -1, soft: violin ? violin.soft() : -1, t0: t0, now: ctx ? ctx.currentTime : -1, told: told,
        voice: rig ? (rig.recorded ? "recorded" : "synth") : "",
        song: s ? { notes: s.t.length, end: s.end, rate: s.rate, from: s.from, to: s.to, fadeIn: s.fadeIn, fadeOut: s.fadeOut, level: s.level, soft: s.soft } : null };
    }
  };
  root.Music = Music;
})(window);
