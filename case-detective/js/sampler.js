/*!
 * The recorded strings for js/music.js: voices that play recordings of real violin, viola and cello notes.
 *
 *   ViolinSampler, ViolaSampler, CelloSampler: one voice each, all alike.
 *   ViolinSampler.load(baseUrl, onready)   fetch the notes (violin-01.js, violin-02.js, ... in baseUrl, low register
 *                                          first) and decode them; onready(ok) once every file is in (ok: all of them).
 *                                          Call it after the first tap. Calling it again is harmless (baseUrl may then
 *                                          be left out), and tries again, at most every 15 seconds, what failed.
 *   ViolinSampler.ready()                  true once every note of the bank is decoded
 *   ViolinSampler.loadPart(k, baseUrl, done)   fetch one file of the bank alone (k: 0 for the lowest register), for a
 *                                          player that wants the registers in an order of its own (js/music.js asks
 *                                          for the files in the order its piece needs them): done(ok) once that
 *                                          file's notes are decoded, or cannot be had now. A file that failed is
 *                                          tried again as in load: at the next call once 15 seconds have passed.
 *   ViolinSampler.parts                    how many files the bank has
 *   ViolinSampler.partOf(midi)             which file (from 0) holds the recording that plays this pitch; -1 when it
 *                                          takes the whole bank (a pitch more than a semitone past the bank's ends)
 *   ViolinSampler.state(midi, vel)         would this note sound from a recording? 1: yes, now. 0: not yet, but its
 *                                          recording is still to come (its file is not asked for yet or on its way,
 *                                          or its notes are being decoded). -1: no, its file or its recording could
 *                                          not be had (a later load or loadPart tries again).
 *   ViolinSampler.make(ctx, dest, opts)    a voice on the audio context ctx (live or offline), into the node dest:
 *                                          { note(t, dur, midi, vel, kind, cents, gain), cut(secs), input }, as the
 *                                          synthesizer of js/music.js. gain (optional, 1 if left out) scales the
 *                                          note's level without changing its recording (the velocity picks that).
 *                                          opts (all optional): fallback (see below), room: false (no reverb),
 *                                          log: an array that gets one entry per note (for the tools).
 *     note() returns the time the note ends, or null when the voice leaves the note to the caller: a plucked note
 *     (kind & 1), or a note whose recording is not decoded yet. With opts.fallback (another voice, the synthesizer)
 *     the voice hands those notes to it itself, gain included, and cut() cuts both.
 *   ViolaSampler and CelloSampler do the same with viola-01.js, viola-02.js and cello-01.js to cello-03.js.
 *   StringSamplers = { violin, viola, cello, room: { wet, dry } }: the three, and the level of the voices' own room
 *   (for a player that puts the recordings through a room it shares with other voices, with room: false).
 *
 * The notes: TinySOL by Carmine-Emanuele Cella, Daniele Ghisi, Vincent Lostanlen, Fabien Lévy, Joshua Fineberg and
 * Yan Maresz (https://doi.org/10.5281/zenodo.3685367), drawn from Ircam's Studio On Line, shared under the Creative
 * Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/); trimmed, looped, level-matched and
 * re-encoded for these voices (see CREDITS.md in each bank's folder). A recording every third semitone, at two
 * dynamics, pp and mf: the violin's from G3 to E7, the viola's from C3 to F#5, the cello's from C2 to D#5. From a
 * semitone under a bank's lowest recording to a semitone over its highest (the violin F#3 to F7, the viola B2 to G5,
 * the cello B1 to E5) a note sounds from the nearest recording, never more than a semitone away. Once every file of
 * the bank is in, a note past those ends is played from the end recording, moved further.
 *
 * The bank files are plain scripts (base64 MP3 inside), so this works from a folder on disk, from a subfolder and in
 * a sandboxed frame; nothing is fetched with fetch(). Like music.js, this file never throws and never logs.
 */
(function (root) {
  "use strict";

  var doc = root.document;
  var FILES = ["violin-01.js", "violin-02.js", "violin-03.js"];
  /* the three banks: their files (low register first), the lowest and the highest recording of each file (spans:
     MIDI numbers, two a file; for partOf), the name their files hand their notes to, and the voice's */
  var BANKS = [
    { inst: "violin", files: FILES, spans: [55, 67, 70, 82, 85, 100], bank: "ViolinBank", api: "ViolinSampler" },
    { inst: "viola", files: ["viola-01.js", "viola-02.js"], spans: [48, 60, 63, 78], bank: "ViolaBank", api: "ViolaSampler" },
    { inst: "cello", files: ["cello-01.js", "cello-02.js", "cello-03.js"], spans: [36, 48, 51, 63, 66, 75], bank: "CelloBank", api: "CelloSampler" }
  ];

  /* the notes are decoded on an offline context of their own, at their own rate (no user gesture needed), shared by
     the three banks; the voice plays them on any context, the browser converts the rate as it plays. Without an
     offline context (old browsers), or for a note it would not take, the context of the voice does the decoding. */
  var decoder = null, tried = false;
  function getDecoder() {
    if (decoder || tried) { return decoder; }
    tried = true;
    try {
      var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
      if (OAC) { decoder = new OAC(1, 1, 32000); }
    } catch (e) { decoder = null; }
    return decoder;
  }
  function bytes(b64) {
    var bin = root.atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) { u[i] = bin.charCodeAt(i); }
    return u.buffer;
  }
  function clock() { return new Date().getTime(); }

  /* ------------------------------------------------------------------ the voice: the same for every bank */
  var SPLIT = 64;              /* velocities under this take the pp recordings, the others mf */
  var MASTER = 0.4;            /* the level of one note: as loud as makeViolin's notes (tools/calibrate.js) */
  var ROOM_WET = 0.22, ROOM_DRY = 0.95;   /* the recordings carry some room of their own: a lighter room than makeViolin's */
  var VIB = 0.0042;            /* added vibrato (share of the frequency), only where the recording has none */
  var MAX_POLY = 24;           /* notes sounding at once, at most (for each voice) */

  function Bank(cfg) {
    var FILES = cfg.files;
    /* where each file's recordings lie (see BANKS). A file whose notes lie elsewhere switches the table off: then
       every note counts as needing the whole bank */
    var SPANS = cfg.spans && cfg.spans.length === 2 * FILES.length ? cfg.spans : null;

    /* ---------------------------------------------------------------- the bank
       Each bank file calls <cfg.bank>.add({ part, of, attDb, samples: [...] }). A bank file that runs before this one
       leaves its notes in <cfg.bank>.q. */
    var SAMPLES = [];            /* every note of the bank, decoded or not, sorted by layer and pitch */
    var ATT_DB = [-30, -24, -18, -12, -9, -6, -4, -3, -2, -1];
    var STROKE_AT = [0.05, 0.08, 0.12, 0.18, 0.25, 0.35];   /* the lengths of recording (s) that strokeTune is for */
    var LEG_AT = [0.05, 0.1, 0.15, 0.2];   /* the lengths of recording (s) that each note's legTune gives the tuning for */
    var parts = [];              /* per file: 0 not asked, 1 on its way, 2 its notes are in, 3 failed */
    var asks = [];               /* per file: how often it was asked for (a new try gets an address of its own) */
    var failedAt = -1e9;         /* when a file or a note last failed: tried again on a later call of load, not at once */
    var pending = 0;             /* notes still being decoded */
    var waiting = [];            /* onready callbacks */
    var partWait = [];           /* per file: the callbacks of loadPart */
    var chain = false;           /* load's round through the files is under way */
    var base = "";
    var liveCtx = null;          /* the context of the last voice made: where the notes are decoded if need be */

    function add(p) {
      try {
        if (!p || !p.samples) { return; }
        if (p.attDb) { ATT_DB = p.attDb; }
        if (p.strokeTuneAt) { STROKE_AT = p.strokeTuneAt; }
        if (p.legTuneAt) { LEG_AT = p.legTuneAt; }
        var k = p.part ? p.part - 1 : -1;
        if (p.part) { parts[p.part - 1] = 2; }
        for (var i = 0; i < p.samples.length; i++) {
          var s = p.samples[i];
          if (!s || !s.mp3 || !(s.loopEnd > s.loopStart)) { continue; }
          s.lay = s.layer === "pp" ? 0 : 1;
          s.buf = null; s.bad = false;
          s.part = k;
          if (SPANS && !(k >= 0 && s.midi >= SPANS[2 * k] && s.midi <= SPANS[2 * k + 1])) { SPANS = null; }
          SAMPLES.push(s);
          decode(s);
        }
        SAMPLES.sort(function (a, b) { return a.lay - b.lay || a.midi - b.midi; });
      } catch (e) { /* a damaged file is left out */ }
    }
    var bank = root[cfg.bank];
    root[cfg.bank] = { add: add, q: [] };
    if (bank && bank.q) { for (var qi = 0; qi < bank.q.length; qi++) { add(bank.q[qi]); } }

    function decode(s, ctx) {
      var c = ctx || getDecoder() || liveCtx;
      if (!c || s.buf || s.busy || s.bad) { return; }      /* no context yet: make() decodes it */
      s.busy = true; pending++;
      var done = false;
      function fin(buf) {
        if (done) { return; }
        done = true; s.busy = false; pending--;
        if (buf && buf.length) { place(s, buf); s.mp3 = null; }
        else if (liveCtx && c !== liveCtx && !s.again) { s.again = true; decode(s, liveCtx); return; }
        else { s.bad = true; failedAt = clock(); }
        check();
      }
      try {
        var pr = c.decodeAudioData(bytes(s.mp3), fin, function () { fin(null); });
        if (pr && typeof pr.then === "function") { pr.then(fin, function () { fin(null); }); }
      } catch (e) { fin(null); }
    }
    /* MP3 leaves a short delay at the start, and browsers differ in how much of it they take away: the sync mark
       (a short pulse before the note) says where this browser put the start. The table's times are Chromium's. */
    function place(s, buf) {
      var d = buf.getChannelData(0), sr = buf.sampleRate, lim = Math.min(d.length - 1, Math.floor((s.onset + 0.03) * sr)), mi = 1, i;
      for (i = 1; i < lim; i++) { if (Math.abs(d[i]) > Math.abs(d[mi])) { mi = i; } }
      var a = Math.abs(d[mi - 1]), b = Math.abs(d[mi]), c = Math.abs(d[mi + 1]), den = a - 2 * b + c;
      var at = (mi + (den ? 0.5 * (a - c) / den : 0)) / sr, sh = at - s.mark;
      if (!(Math.abs(sh) < 0.06)) { sh = 0; }
      s.onset += sh; s.loopStart += sh; s.loopEnd += sh;
      for (i = 0; i < s.leg.length; i++) { s.leg[i] += sh; }
      s.loopEnd = Math.min(s.loopEnd, buf.duration);
      /* the loop and the slur points were cut at whole samples, the table's times are rounded to the microsecond: back
         on whole samples (a loop a fraction of a sample long makes Chromium take the wrong sample now and then as it
         comes round the loop, a tick; the independent check, CHECK.md). Only where the buffer has the table's rate. */
      if (sr === s.rate) {
        s.loopStart = Math.round(s.loopStart * sr) / sr;
        s.loopEnd = Math.min(Math.round(s.loopEnd * sr), d.length) / sr;
        for (i = 0; i < s.leg.length; i++) { s.leg[i] = Math.max(s.loopStart, Math.round(s.leg[i] * sr) / sr); }
      }
      s.buf = buf;
    }
    function allIn() {
      for (var i = 0; i < FILES.length; i++) { if (parts[i] === 1 || !parts[i]) { return false; } }
      return pending === 0;
    }
    function ready() {
      if (!SAMPLES.length || pending) { return false; }
      for (var i = 0; i < FILES.length; i++) { if (parts[i] !== 2) { return false; } }
      for (i = 0; i < SAMPLES.length; i++) { if (!SAMPLES[i].buf) { return false; } }
      return true;
    }
    /* the notes of one file: 0 some are being decoded, 1 they are all decoded, -1 not all of them are (a note could
       not be decoded, or there was no context yet to decode them on: make() sees to those), or the file holds none */
    function partState(k) {
      var n = 0, got = 0, busy = false, i, s;
      for (i = 0; i < SAMPLES.length; i++) {
        s = SAMPLES[i];
        if (s.part !== k) { continue; }
        n++;
        if (s.buf) { got++; } else if (s.busy) { busy = true; }
      }
      return busy ? 0 : n > 0 && got === n ? 1 : -1;
    }
    function check() {
      var i, j, q, ok;
      /* loadPart's callers: each hears of its own file as soon as that one is settled */
      for (i = 0; i < FILES.length; i++) {
        q = partWait[i];
        if (!q || !q.length || !parts[i] || parts[i] === 1) { continue; }
        ok = parts[i] === 2 ? partState(i) : -1;
        if (!ok) { continue; }
        partWait[i] = [];
        for (j = 0; j < q.length; j++) { try { q[j](ok > 0); } catch (e) { /* the caller's business */ } }
      }
      if (!allIn() || !waiting.length) { return; }
      q = waiting; ok = ready();
      waiting = [];
      for (i = 0; i < q.length; i++) { try { q[i](ok); } catch (e) { /* the caller's business */ } }
    }

    /* fetch one bank file with a plain script tag; then() once it has come or failed */
    function fetchFile(k, then) {
      parts[k] = 1;
      var over = false, s = null, watch = 0;
      function fin() {
        if (over) { return; }
        over = true;
        if (watch) { root.clearTimeout(watch); }
        try { if (s && s.parentNode) { s.parentNode.removeChild(s); } } catch (e) { /* ignore */ }
        if (parts[k] !== 2) { parts[k] = 3; failedAt = clock(); }
        if (then) { then(); }
        check();
      }
      try {
        s = doc.createElement("script");
        s.src = base + FILES[k] + (asks[k] ? "?again=" + asks[k] : "");
        asks[k] = (asks[k] || 0) + 1;
        s.async = true;
        s.onload = fin; s.onerror = fin;
        (doc.head || doc.documentElement).appendChild(s);
        watch = root.setTimeout(fin, 30000);
      } catch (e) { fin(); }
    }
    /* load's round: the bank files one after the other, low register first (a file that loadPart has asked for, or
       that is in or failed, is passed over: load decides when a failed one is tried again) */
    function fetchPart(k) {
      if (k >= FILES.length) {
        /* a file that load() put back in the queue while this round was further on */
        for (var j = 0; j < FILES.length; j++) { if (!parts[j]) { fetchPart(j); return; } }
        chain = false;
        check();
        return;
      }
      if (parts[k]) { fetchPart(k + 1); return; }
      fetchFile(k, function () { fetchPart(k + 1); });
    }
    /* take the address of the bank (if one is given); true when what failed may be tried again: from a new address at
       once, otherwise not more often than every 15 seconds (load and loadPart may be called on every tap) */
    function setBase(baseUrl) {
      var again = clock() - failedAt > 15000, b;
      if (baseUrl != null) {
        b = String(baseUrl);
        if (b && b.charAt(b.length - 1) !== "/") { b += "/"; }
        if (b !== base) { base = b; again = true; }
      }
      return again;
    }
    function load(baseUrl, onready) {
      try {
        if (typeof onready === "function") { waiting.push(onready); }
        var again = setBase(baseUrl), i, s;
        for (i = 0; i < FILES.length; i++) { if (parts[i] === 3 && again) { parts[i] = 0; } }
        for (i = 0; i < SAMPLES.length; i++) {
          s = SAMPLES[i];
          if (!s.buf && s.mp3 && !s.busy && (!s.bad || again)) { s.bad = false; decode(s); }
        }
        if (!chain) { chain = true; fetchPart(0); }
        if (allIn()) { root.setTimeout(check, 0); }
      } catch (e) { /* never throw */ }
    }
    /* one file alone, out of turn (see the top of this file) */
    function loadPart(k, baseUrl, done) {
      try {
        k = +k;
        if (!(k >= 0 && k < FILES.length && k === Math.floor(k))) {
          if (typeof done === "function") { root.setTimeout(function () { try { done(false); } catch (e) { /* the caller's business */ } }, 0); }
          return;
        }
        var again = setBase(baseUrl), i, s;
        if (typeof done === "function") { (partWait[k] = partWait[k] || []).push(done); }
        if (parts[k] === 3 && again) { parts[k] = 0; }
        for (i = 0; i < SAMPLES.length; i++) {
          s = SAMPLES[i];
          if (s.part === k && !s.buf && s.mp3 && !s.busy && (!s.bad || again)) { s.bad = false; decode(s); }
        }
        if (!parts[k]) { fetchFile(k, null); }
        else { root.setTimeout(check, 0); }
      } catch (e) { /* never throw */ }
    }

    /* the recording for a pitch and layer: the nearest one, if it is decoded. While bank files are still on their
       way (or one could not be fetched) the nearest recording in hand may not be the nearest of the bank: then it
       is taken only within a semitone (the recordings are three semitones apart), and the other notes are left to
       the fallback rather than played far from their pitch */
    function pick(midi, lay) {
      var best = null, bd = 1e9, j, s, dd;
      for (j = 0; j < SAMPLES.length; j++) {
        s = SAMPLES[j];
        if (s.lay !== lay) { continue; }
        dd = Math.abs(s.midi - midi);
        if (dd < bd) { bd = dd; best = s; }
      }
      if (!best || !best.buf) { return null; }
      if (bd > 1) { for (j = 0; j < FILES.length; j++) { if (parts[j] !== 2) { return null; } } }
      return best;
    }
    /* the file whose recordings lie nearest to a pitch (see the top of this file) */
    function partOf(midi) {
      var n = FILES.length, best = -1, bd = 1e9, k, d;
      midi = +midi;
      if (!SPANS || !(midi >= SPANS[0] - 1 && midi <= SPANS[2 * n - 1] + 1)) { return -1; }
      for (k = 0; k < n; k++) {
        d = midi < SPANS[2 * k] ? SPANS[2 * k] - midi : midi > SPANS[2 * k + 1] ? midi - SPANS[2 * k + 1] : 0;
        if (d < bd) { bd = d; best = k; }
      }
      return best;
    }
    /* would a note sound from a recording (see the top of this file) */
    function state(midi, vel) {
      try {
        var lay = (vel || 0) < SPLIT ? 0 : 1, k = partOf(midi), miss = false, best = null, bd = 1e9, j, s, dd;
        if (pick(midi, lay)) { return 1; }
        for (j = 0; j < FILES.length; j++) {
          if (k >= 0 && j !== k) { continue; }
          if (parts[j] === 3) { return -1; }
          if (parts[j] !== 2) { miss = true; }
        }
        if (miss) { return 0; }
        /* its file is in: its recording is being decoded (or waits for a context to be decoded on), or cannot be */
        for (j = 0; j < SAMPLES.length; j++) {
          s = SAMPLES[j];
          if (s.lay !== lay) { continue; }
          dd = Math.abs(s.midi - midi);
          if (dd < bd) { bd = dd; best = s; }
        }
        return best && !best.buf && !best.bad && best.mp3 ? 0 : -1;
      } catch (e) { return -1; }
    }

    function make(ctx, dest, opts) {
      opts = opts || {};
      var fallback = opts.fallback && typeof opts.fallback.note === "function" ? opts.fallback : null;
      var sr = ctx.sampleRate, i, seed = 20231, live = [], turn = 0, made = 0, freed = 0;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; }
      var IDX1 = ATT_DB.length - 1;
      for (i = 0; i < ATT_DB.length; i++) { if (ATT_DB[i] === -1) { IDX1 = i; } }
      /* notes that no offline context could take (or none was there) are decoded on this one, now and later */
      liveCtx = ctx;
      for (i = 0; i < SAMPLES.length; i++) {
        var s0 = SAMPLES[i];
        if (!s0.buf && s0.mp3 && !s0.busy && (s0.bad || !getDecoder())) { s0.bad = false; s0.again = true; decode(s0, ctx); }
      }

      /* every note enters through a bus, so that the notes in hand can be taken back (see cut) */
      var bus = ctx.createGain(), pre = ctx.createGain();
      bus.connect(pre);
      /* the room: the same short tail of decaying noise as makeViolin's (same seed), but less of it
         (opts.room === false: none, for the tests or for a page that has a room of its own) */
      var dry = ctx.createGain();
      dry.gain.value = opts.room === false ? 1 : ROOM_DRY;
      pre.connect(dry); dry.connect(dest);
      if (opts.room !== false) {
        try {
          var len = Math.floor(sr * 1.4), ir = ctx.createBuffer(2, len, sr);
          for (var ch = 0; ch < 2; ch++) {
            var d = ir.getChannelData(ch), lp = 0;
            for (i = 0; i < len; i++) {
              var x = i / sr, k = 0.22 + 0.5 * Math.exp(-x * 3);
              lp += (rnd() - lp) * k;
              d[i] = lp * Math.exp(-x * 4.9) * (x < 0.012 ? x / 0.012 : 1);
            }
          }
          var conv = ctx.createConvolver(), wet = ctx.createGain();
          conv.normalize = true; conv.buffer = ir;
          wet.gain.value = ROOM_WET;
          pre.connect(conv); conv.connect(wet); wet.connect(dest);
        } catch (e) { /* no room */ }
      }

      /* a vibrato for the notes whose recording has none (an open string, when it plays a note above or below it) */
      var lfo = null;
      function vibrato() {
        if (lfo) { return lfo; }
        try {
          lfo = ctx.createOscillator();
          var drift = ctx.createOscillator(), amt = ctx.createGain();
          lfo.frequency.value = 5.3; drift.frequency.value = 0.31; amt.gain.value = 0.3;
          drift.connect(amt); amt.connect(lfo.frequency);
          lfo.start(); drift.start();
        } catch (e) { lfo = null; }
        return lfo;
      }

      function free(n) {
        if (n.freed) { return; }
        n.freed = true; freed++;
        try { n.src.disconnect(); } catch (e) { /* gone already */ }
        try { n.g.disconnect(); } catch (e) { /* gone already */ }
        if (n.vg) { try { lfo.disconnect(n.vg); } catch (e) { /* gone already */ } try { n.vg.disconnect(); } catch (e) { /* gone already */ } }
        for (var j = 0; j < live.length; j++) { if (live[j] === n) { live.splice(j, 1); break; } }
      }
      /* notes whose end has passed are let go even if the browser never said so; and if a great many notes would
         sound at time t, the oldest of them makes way (a safety valve: the pieces never ask for more than ten) */
      function sweep(t) {
        var now = ctx.currentTime, j, n, first = null, count = 0;
        for (j = live.length - 1; j >= 0; j--) { if (live[j].end < now - 0.5) { free(live[j]); } }
        for (j = 0; j < live.length; j++) {
          n = live[j];
          if (n.start <= t && n.end > t) { count++; if (!first) { first = n; } }
        }
        if (count >= MAX_POLY && first) {
          try { first.g.gain.setTargetAtTime(0, t, 0.008); first.src.stop(t + 0.08); first.end = t + 0.08; } catch (e) { /* ignore */ }
        }
      }

      /* the tuning of a note that plays len seconds of the recording: row holds it for the lengths at (a new stroke:
         strokeTune at STROKE_AT; a slurred note: legTune of its leg point at LEG_AT), in between it is interpolated,
         outside them it is the nearest */
      function tuneFor(row, at, len, dflt) {
        var j, f;
        if (!row || !at || row.length !== at.length) { return dflt; }
        if (len <= at[0]) { return +row[0] || 0; }
        for (j = 1; j < at.length; j++) {
          if (len <= at[j]) { f = (len - at[j - 1]) / (at[j] - at[j - 1]); return (1 - f) * (+row[j - 1] || 0) + f * (+row[j] || 0); }
        }
        return +row[at.length - 1] || 0;
      }

      /* one note: t = start (context time), dur = written length in seconds, midi = pitch, vel = 1..127,
         kind: 0 = a bow stroke of its own; +1 = plucked (left to the caller); +2 = slurred on from the note before;
         +4 = the next note is slurred on to this one, cents = how far off true pitch, gain = a factor on its level
         (1 when left out: a player that sets a melody in front of its accompaniment) */
      function note(t, dur, midi, vel, kind, cents, gain) {
        try {
          kind = kind | 0;
          gain = gain == null ? 1 : +gain;
          if (!(gain >= 0 && gain <= 4)) { gain = 1; }
          var lay = (vel || 0) < SPLIT ? 0 : 1;
          var s = (kind & 1) ? null : pick(midi, lay);
          if (!s) { return fallback ? fallback.note(t, dur, midi, vel, kind, cents, gain) : null; }
          sweep(t);
          var slur = kind & 2, into = kind & 4, now = ctx.currentTime;
          dur = Math.max(0.02, +dur || 0);
          /* the recording's own tuning (cents) over the stretch that the note plays: a new bow stroke plays its early
             part, where the player is often a few cents off the pitch he settles on (strokeTune, for the note's length;
             a longer one starts with that of the longest, 0.35 s); a slurred note begins at a leg point, which the
             recording's vibrato puts at its own place in the swing (legTune, for the note's length); long notes end up
             in the loop (tuneLoop). A note glides from its own tuning to the loop's as it plays on (below). */
          var tuneA = +s.tune || 0, tuneL = s.tuneLoop != null ? +s.tuneLoop || 0 : tuneA, li = 0;
          var len = dur * Math.pow(2, (midi - s.midi) / 12);
          if (slur) {
            li = (turn + 1) % 9973 % s.leg.length;
            tuneA = tuneFor(s.legTune && s.legTune[li], LEG_AT, len, tuneL);
          } else { tuneA = tuneFor(s.strokeTune, STROKE_AT, len, tuneA); }
          var rate = Math.pow(2, (midi - s.midi) / 12 + ((+cents || 0) - tuneA) / 1200);
          var loud = 0.2 + 0.8 * Math.pow(Math.min(127, Math.max(1, vel)) / 100, 1.3);
          var lev = MASTER * loud * gain;
          var fast = dur < 0.16, start = Math.max(t, now), off, a;
          turn = (turn + 1) % 9973;
          if (slur) {
            /* no new attack: from the held part, faded in under the end of the note before (which is held a moment
               past this note's start, see rel below); 10 to 30 ms, shorter for quick notes */
            var xf = Math.min(0.03, Math.max(0.01, dur * 0.35));
            off = s.leg[li];
            start = Math.max(t - 0.4 * xf, now);
            a = Math.max(0.004, t + 0.6 * xf - start);
          } else {
            /* the recorded attack, but the recordings swell slowly into their notes (up to a second): a note begins
               as far into it as it takes to be up to strength (1 dB under the held level) within a fifth of its
               length, at most 0.3 s; where it begins inside the swell, it fades in over a few milliseconds */
            var allow = Math.min(0.3, Math.max(0.012, dur * 0.2)), skip = Math.max(0, s.att[IDX1] - allow * rate);
            skip += ((turn * 0.618034) % 1) * 0.006;     /* repeated notes are never quite the same */
            off = s.onset + skip;
            a = skip > 0.008 ? Math.min(0.015, Math.max(0.004, allow * 0.35)) : 0.004;
          }
          off = Math.min(off, s.loopEnd - 0.05);
          var rel = into ? Math.min(0.046, Math.max(0.03, dur * 0.4)) : fast ? 0.05 : Math.min(0.13, 0.06 + dur * 0.1);
          var hold = Math.max(a + 0.004, into ? dur + 0.006 : dur - (fast ? 0.004 : 0.02));
          var end = t + hold + 2 * rel + 0.02;      /* by then the release is 80 dB down: stopped sooner, a note ends in a tick */
          var src = ctx.createBufferSource(), g = ctx.createGain(), vg = null;
          src.buffer = s.buf;
          src.loop = true; src.loopStart = s.loopStart; src.loopEnd = s.loopEnd;
          src.playbackRate.value = rate;
          /* the rate in the loop; how long the note keeps its first rate, and how long it then takes to glide to it */
          var rateL = rate, keep = 0, glide = 0;
          if (tuneL !== tuneA) {
            rateL = rate * Math.pow(2, (tuneA - tuneL) / 1200);
            if (slur) {
              /* a slurred note keeps its own tuning for its first 0.2 s of the recording, then glides to the loop's by
                 0.5 s (still well inside the loop); a shorter note ends before it glides */
              keep = 0.2 / rate;
              glide = 0.3 / rate;
            } else if (off >= s.loopStart) { rate = rateL; src.playbackRate.value = rate; }    /* it starts in the loop */
            else {
              /* a stroke glides to the loop's tuning by the time it reaches the loop; a short one ends long before */
              glide = Math.max(0.02, (s.loopStart - off) / rate);
            }
            if (glide > 0) {
              src.playbackRate.setValueAtTime(rate, start + keep);
              src.playbackRate.linearRampToValueAtTime(rateL, start + keep + glide);
            }
          }
          g.gain.value = 0;
          g.gain.setValueAtTime(0, start);
          g.gain.linearRampToValueAtTime(lev, start + a);
          g.gain.setTargetAtTime(0, t + hold, rel / 4.6);
          if (!s.vib && midi !== s.midi && dur > 0.26 && vibrato()) {
            var v0 = t + Math.min(0.14, dur * 0.3);
            vg = ctx.createGain();
            vg.gain.value = 0;
            vg.gain.setValueAtTime(0, v0);
            vg.gain.linearRampToValueAtTime(rate * VIB, v0 + Math.min(0.3, dur * 0.5));
            lfo.connect(vg); vg.connect(src.playbackRate);
          }
          src.connect(g); g.connect(bus);
          src.start(start, off);
          src.stop(end);
          made++;
          /* for the tools: off and rate are given as if the note had played at the loop's rate from the start (after the
             glide that is where it is), so that start + (loopEnd - off) / rate is the time it first comes round the loop */
          if (opts.log) {
            opts.log.push({ t: t, start: start, off: off + (rate - rateL) * (keep + glide / 2), rate: rateL, off0: off, rate0: rate, keep: keep, glide: glide,
              loopStart: s.loopStart, loopEnd: s.loopEnd, midi: midi, sample: s.midi, layer: s.layer, slur: !!slur, a: a, end: end, gain: gain });
          }
          var n = { src: src, g: g, vg: vg, start: start, end: end, freed: false };
          live.push(n);
          src.onended = function () { free(n); };
          return end;
        } catch (e) { return null; }
      }
      /* take back every note that has been handed over, sounding or still to come: they fade out with their bus within
         secs, and a fresh bus takes the notes that follow. What has already sounded rings out in the room. */
      function cut(secs) {
        try {
          secs = Math.max(0.01, +secs || 0);
          var old = bus, t = ctx.currentTime;
          bus = ctx.createGain();
          bus.connect(pre);
          try { old.gain.setValueAtTime(1, t); old.gain.linearRampToValueAtTime(0, t + secs); } catch (e) { /* ignore */ }
          for (var j = 0; j < live.length; j++) { try { live[j].src.stop(t + secs + 0.01); live[j].end = Math.min(live[j].end, t + secs + 0.01); } catch (e) { /* ignore */ } }
          try { root.setTimeout(function () { try { old.disconnect(); } catch (e) { /* gone already */ } }, secs * 1000 + 150); } catch (e) { /* ignore */ }
        } catch (e) { /* never throw */ }
        if (fallback && typeof fallback.cut === "function") { try { fallback.cut(secs); } catch (e) { /* ignore */ } }
      }
      return {
        note: note, cut: cut, input: pre,
        /* for the tests: notes in hand, and how many were made and let go */
        _live: function () { return { live: live.length, made: made, freed: freed }; }
      };
    }

    return {
      load: load, loadPart: loadPart, ready: ready, state: state, partOf: partOf, parts: FILES.length, make: make, instrument: cfg.inst,
      /* for the tools and the tests */
      _samples: function () { return SAMPLES; }, _files: FILES, _split: SPLIT
    };
  }

  var all = { room: { wet: ROOM_WET, dry: ROOM_DRY } };
  for (var bi = 0; bi < BANKS.length; bi++) {
    try { all[BANKS[bi].inst] = root[BANKS[bi].api] = Bank(BANKS[bi]); } catch (e) { /* that voice is left out */ }
  }
  root.StringSamplers = all;
})(window);
