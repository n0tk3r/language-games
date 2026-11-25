/*!
 * Sfx: tiny synthesized sound effects with the Web Audio API. No files, no dependencies.
 *
 *   Sfx.play(name)     'tap' 'correct' 'wrong' 'clue' 'ruleout' 'star' 'stamp' 'fanfare' 'rankup' 'blip'
 *   Sfx.isMuted()
 *   Sfx.setMuted(bool) remembered between visits when storage allows it
 *
 * The mute lives in the game's own save: the field "sound" of the one JSON object under CD_DATA.storageKey.
 * No second storage key is made. Used on a page without the game data, the module just does not remember.
 *
 * The audio context is only ever created inside a user gesture, and every failure is swallowed:
 * this module never throws and never logs.
 */
(function (root) {
  "use strict";

  var ctx = null, master = null, noiseBuf = null;
  var muted = false, broken = false, unlocked = false;
  var lastBlip = 0, starStep = 0, lastStar = 0;

  function saveKey() {
    try { return root.CD_DATA && root.CD_DATA.storageKey ? String(root.CD_DATA.storageKey) : ""; } catch (e) { return ""; }
  }
  function readSave() {
    try {
      var k = saveKey();
      if (!k) { return null; }
      var o = JSON.parse(root.localStorage.getItem(k));
      return o && typeof o === "object" && !Array.isArray(o) ? o : null;
    } catch (e) { return null; }
  }
  (function () { var o = readSave(); muted = !!(o && o.sound === false); })();

  function now() { return ctx ? ctx.currentTime : 0; }

  /* create or resume the context. Only ever reached from inside a user gesture. */
  function ensure() {
    if (muted || broken) { return; }
    try {
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) { broken = true; return; }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      }
      if (ctx.state !== "running" && typeof ctx.resume === "function") {
        var p = ctx.resume();
        if (p && typeof p.catch === "function") { p.catch(function () { /* stays silent */ }); }
      }
    } catch (e) { broken = true; ctx = null; }
  }
  function unlock() { unlocked = true; ensure(); }
  try {
    ["pointerup", "touchend", "mouseup", "keydown", "click"].forEach(function (type) {
      root.addEventListener(type, unlock, true);
    });
  } catch (e) { /* no events, no sound */ }

  function ready() { return !muted && !broken && unlocked && ctx && master && ctx.state === "running"; }

  /* one oscillator note with a soft attack and an exponential tail */
  function tone(type, f0, f1, at, dur, vol, attack) {
    var t = now() + at;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) { o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + (attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  /* a short burst of filtered noise: paper, thumps, stamps */
  function noise(at, dur, vol, freq, q) {
    if (!noiseBuf) {
      var len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; }
    }
    var t = now() + at;
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = "lowpass"; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 0.7;
    g.gain.setValueAtTime(Math.max(0.0002, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.03);
  }
  function bell(f, at, dur, vol) {
    tone("sine", f, f, at, dur, vol, 0.004);
    tone("sine", f * 2.01, f * 2.01, at, dur * 0.6, vol * 0.28, 0.004);
    tone("triangle", f * 3.02, f * 3.02, at, dur * 0.3, vol * 0.1, 0.004);
  }

  var SOUNDS = {
    tap: function () { tone("triangle", 720, 430, 0, 0.06, 0.16, 0.003); noise(0, 0.03, 0.05, 2400); },
    blip: function () {
      var t = Date.now();
      if (t - lastBlip < 62) { return; }
      lastBlip = t;
      var f = 430 + Math.random() * 190;
      tone("triangle", f, f * 0.94, 0, 0.045, 0.05, 0.004);
    },
    correct: function () { bell(1046.5, 0, 0.26, 0.2); bell(1318.5, 0.09, 0.3, 0.2); bell(1568, 0.18, 0.5, 0.22); },
    wrong: function () { tone("sine", 311, 233, 0, 0.2, 0.2, 0.012); tone("sine", 233, 174, 0.14, 0.3, 0.18, 0.012); },
    clue: function () { bell(784, 0, 0.22, 0.13); bell(1174.7, 0.1, 0.24, 0.12); bell(987.8, 0.2, 0.4, 0.13); },
    ruleout: function () { noise(0, 0.11, 0.42, 520); tone("sine", 150, 62, 0, 0.17, 0.4, 0.004); noise(0.03, 0.05, 0.1, 3000); },
    star: function () {
      var t = Date.now();
      starStep = t - lastStar < 1600 ? Math.min(starStep + 1, 4) : 0;
      lastStar = t;
      var f = [1174.7, 1396.9, 1760, 2093, 2349.3][starStep];
      bell(f, 0, 0.42, 0.2); tone("sine", f * 1.5, f * 1.5, 0.05, 0.3, 0.06, 0.004);
    },
    stamp: function () { noise(0, 0.16, 0.6, 300); tone("sine", 118, 44, 0, 0.26, 0.6, 0.004); noise(0.01, 0.04, 0.16, 4000); },
    fanfare: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone("triangle", f, f, i * 0.1, i === 3 ? 0.6 : 0.16, 0.2, 0.01);
        tone("sine", f * 2, f * 2, i * 0.1, i === 3 ? 0.5 : 0.12, 0.05, 0.01);
      });
      tone("triangle", 783.99, 783.99, 0.3, 0.6, 0.12, 0.01);
    },
    rankup: function () {
      [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
        tone("triangle", f, f, i * 0.085, i === 5 ? 0.8 : 0.15, 0.2, 0.01);
      });
      [2093, 2637, 3136, 2637, 3520].forEach(function (f, i) { tone("sine", f, f, 0.5 + i * 0.07, 0.2, 0.05, 0.004); });
    }
  };

  var Sfx = {
    play: function (name) {
      try {
        if (!Object.prototype.hasOwnProperty.call(SOUNDS, name) || !ready()) { return; }
        SOUNDS[name]();
      } catch (e) { /* never throw */ }
    },
    isMuted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      try {
        var k = saveKey(), o = k ? readSave() : null;
        /* only the "sound" field is touched; a first visit with the sound on writes nothing */
        if (k && (o || muted) && (!o || o.sound !== !muted)) {
          o = o || {};
          o.sound = !muted;
          root.localStorage.setItem(k, JSON.stringify(o));
        }
      } catch (e) { /* not remembered, still works */ }
      try {
        if (muted && ctx && ctx.state === "running" && typeof ctx.suspend === "function") {
          var p = ctx.suspend(); if (p && typeof p.catch === "function") { p.catch(function () {}); }
        } else if (!muted && unlocked) {
          ensure(); /* the toggle itself is a tap, so this is still inside a gesture */
        }
      } catch (e2) { /* ignore */ }
    }
  };

  root.Sfx = Sfx;
})(typeof window !== "undefined" ? window : this);
