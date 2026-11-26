/*!
 * LatinShell: what the Latin games share around their own screens.
 *
 *   var shell = LatinShell.mount({ id, title, sub, logo, onPlayer(player, how, shell), onSettings(), onHome(),
 *                                  starsOf(player), filesIn(grade), sourcesHref, gamesHref, folder })
 *     -> the top bar ("All games" house back to the site's front page, gamesHref, default ../index.html, false hides it;
 *        logo and title; player chip, music, sound, settings), the Inspector in a round brass
 *        frame with his speech bubble, the desk for the game (shell.desk) and the players screens.
 *   shell.say(lines, mood, opts)  shell.mood(m)  shell.act(m, ms)  shell.next()  shell.more()
 *   shell.showPlayers()  shell.addPlayer()  shell.managePlayers()  shell.changeChapter()  shell.player()
 *   shell.toast(html, opts)  shell.dialog(opts) -> Promise  shell.live(text)  shell.compact(on)  shell.setSub(text)
 *
 *   LatinShell.store(key) -> { load(pid), save(pid, data), remove(pid), prune() }
 *   LatinShell.today(), days(a, b), strip(s), norm(s), check(typed, answers, mode), macronKeys(input, opts),
 *   rng(seed), shuffle(list, rng), esc(s), rich(html), icon(name), sfx(name), duck(on), settings(), set(k, v)
 *
 * Classic script. Works without Detective, Sfx, Music, LatinPlayers or localStorage (each is checked at the
 * moment it is used, and every call to them is guarded). The text helpers also run in node:
 * require("./shell.js") returns the same object (no DOM needed for them). See ../README.md.
 */
(function (root) {
  "use strict";

  var doc = root.document || null;
  var BASE = (function () {
    try {
      var s = doc && doc.currentScript && doc.currentScript.src;
      return s ? s.replace(/[^\/]*$/, "").replace(/js\/$/, "") : "../latin-common/";
    } catch (e) { return "../latin-common/"; }
  })();

  /* ------------------------------------------------------------------ small things */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function P() { var p = root.LatinPlayers; return p && typeof p.list === "function" ? p : null; }
  function el(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }
  /* Lines for the bubble are HTML, from the game. Only these tags are kept (with lang and class), so a
     stray "<" or a pasted name can never become markup. */
  var KEEP = { B: 1, I: 1, U: 1, EM: 1, STRONG: 1, BR: 1, SPAN: 1, SMALL: 1, SUB: 1, SUP: 1 };
  function rich(html) {
    var t = doc.createElement("template"), out = doc.createDocumentFragment();
    t.innerHTML = String(html == null ? "" : html);
    (function copy(from, to) {
      Array.prototype.forEach.call(from.childNodes, function (n) {
        if (n.nodeType === 3) { to.appendChild(doc.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) { return; }
        if (KEEP[n.nodeName]) {
          var e = doc.createElement(n.nodeName.toLowerCase());
          if (n.getAttribute("lang")) { e.setAttribute("lang", n.getAttribute("lang")); }
          if (n.getAttribute("class")) { e.setAttribute("class", n.getAttribute("class")); }
          copy(n, e);
          to.appendChild(e);
        } else { copy(n, to); }
      });
    })(t.content, out);
    return out;
  }
  function plain(html) { var d = doc.createElement("div"); d.appendChild(rich(html)); return d.textContent.replace(/\s+/g, " ").trim(); }

  var ICONS = {
    next: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M9 5.5l6.5 6.5L9 18.5"/>',
    back: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M15 5.5L8.5 12l6.5 6.5"/>',
    sound: '<path fill="currentColor" d="M3 9.5c0-.6.4-1 1-1h3l4.3-3.7c.7-.5 1.7-.1 1.7.8v12.8c0 .9-1 1.3-1.7.8L7 15.5H4c-.6 0-1-.4-1-1z"/><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M15.8 9.2c.9.7 1.4 1.7 1.4 2.8s-.5 2.1-1.4 2.8M18.2 6.6c1.7 1.3 2.7 3.2 2.7 5.4s-1 4.1-2.7 5.4"/>',
    mute: '<path fill="currentColor" d="M3 9.5c0-.6.4-1 1-1h3l4.3-3.7c.7-.5 1.7-.1 1.7.8v12.8c0 .9-1 1.3-1.7.8L7 15.5H4c-.6 0-1-.4-1-1z"/><path fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" d="M16.3 9.3l5 5.4M21.3 9.3l-5 5.4"/>',
    music: '<path fill="currentColor" d="M8.6 5 20 2.7v3.7L8.6 8.7z"/><path fill="none" stroke="currentColor" stroke-width="1.9" d="M9.55 6.2v11M19.05 4v11"/><ellipse cx="6.9" cy="17.4" rx="3.2" ry="2.5" transform="rotate(-18 6.9 17.4)" fill="currentColor"/><ellipse cx="16.4" cy="15.3" rx="3.2" ry="2.5" transform="rotate(-18 16.4 15.3)" fill="currentColor"/>',
    "music-off": '<g opacity=".75"><path fill="currentColor" d="M8.6 5 20 2.7v3.7L8.6 8.7z"/><path fill="none" stroke="currentColor" stroke-width="1.9" d="M9.55 6.2v11M19.05 4v11"/><ellipse cx="6.9" cy="17.4" rx="3.2" ry="2.5" transform="rotate(-18 6.9 17.4)" fill="currentColor"/><ellipse cx="16.4" cy="15.3" rx="3.2" ry="2.5" transform="rotate(-18 16.4 15.3)" fill="currentColor"/></g><path fill="none" stroke="#0e1a38" stroke-width="5" stroke-linecap="round" d="M3.8 3.6 20.4 20.6"/><path fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" d="M3.8 3.6 20.4 20.6"/>',
    gear: '<path fill="currentColor" fill-rule="evenodd" d="M10.3 2.5h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.8c.1.6.1 1.3 0 1.9l2 1.8-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.8c-.1-.6-.1-1.3 0-1.9l-2-1.8 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" transform="translate(0 .5)"/>',
    star: '<path fill="#f4b730" stroke="#7a4e10" stroke-width="1.3" stroke-linejoin="round" d="M12 2.2l2.95 6.1 6.65.9-4.85 4.65 1.2 6.65L12 17.3l-5.95 3.2 1.2-6.65L2.4 9.2l6.65-.9z"/>',
    check: '<path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M5.2 12.8l4.3 4.3L18.9 7.5"/>',
    x: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    plus: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" d="M12 5v14M5 12h14"/>',
    caret: '<path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5 12 15l5.5-5.5"/>',
    files: '<path fill="currentColor" d="M2.5 8.2c0-1.1.9-2 2-2h3.7c.5 0 1 .2 1.3.6l1.2 1.4h8.8c1.1 0 2 .9 2 2V18c0 1.1-.9 2-2 2h-15c-1.1 0-2-.9-2-2z"/><path fill="currentColor" opacity=".55" d="M5 3.7h3.4c.5 0 1 .2 1.3.6l1 1.2H19c.8 0 1.5.5 1.8 1.2H11.4L10 5.2c-.4-.4-.9-.7-1.5-.7H3.6c.3-.5.8-.8 1.4-.8z"/>',
    book: '<path fill="currentColor" d="M6.5 2.5h11c1.1 0 2 .9 2 2v15c0 1.1-.9 2-2 2h-11c-1.1 0-2-.9-2-2v-1h1.6a.9.9 0 0 0 0-1.8H4.5v-2.9h1.6a.9.9 0 0 0 0-1.8H4.5v-2.9h1.6a.9.9 0 0 0 0-1.8H4.5V4.5c0-1.1.9-2 2-2zm3 4.3a.8.8 0 0 0 0 1.6h6a.8.8 0 0 0 0-1.6zm0 3.4a.8.8 0 0 0 0 1.6h6a.8.8 0 0 0 0-1.6zm0 3.4a.8.8 0 0 0 0 1.6h3.5a.8.8 0 0 0 0-1.6z"/>',
    user: '<circle cx="12" cy="8" r="4.2" fill="currentColor"/><path fill="currentColor" d="M4 20.5c0-4.4 3.6-7.3 8-7.3s8 2.9 8 7.3z"/>',
    users: '<circle cx="9" cy="8.5" r="3.6" fill="currentColor"/><path fill="currentColor" d="M2.5 20c0-3.8 2.9-6.3 6.5-6.3s6.5 2.5 6.5 6.3z"/><circle cx="16.5" cy="7.5" r="3" fill="currentColor" opacity=".7"/><path fill="currentColor" opacity=".7" d="M15.6 12.6c3.4-.4 6 1.8 6 5.4h-4.5c-.2-2.2-.7-3.8-1.5-5.4z"/>',
    home: '<path fill="currentColor" d="M12 3.2 2.8 11h2.7v9.3h5V15h3v5.3h5V11h2.7z"/>',
  };
  function icon(name, cls) {
    var p = ICONS[name];
    return p ? '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + p + "</svg>" : "";
  }

  /* ------------------------------------------------------------ settings and audio */
  var memSet = { sound: true, music: true }, gestured = false;
  function settings() {
    var p = P();
    if (p) { try { var s = p.settings(); return { sound: s.sound !== false, music: s.music !== false }; } catch (e) { /* fall through */ } }
    return { sound: memSet.sound, music: memSet.music };
  }
  function setSetting(k, v) {
    if (k !== "sound" && k !== "music") { return settings(); }
    var p = P();
    memSet[k] = !!v;
    if (p) { try { p.set(k, !!v); } catch (e) { /* ignore */ } }
    syncAudio();
    return settings();
  }
  function hasMusic() { return !!(root.Music && typeof root.Music.setEnabled === "function" && (root.AudioContext || root.webkitAudioContext)); }
  function syncAudio() {
    var s = settings();
    try { if (root.Sfx && typeof root.Sfx.setMuted === "function" && root.Sfx.isMuted() !== !s.sound) { root.Sfx.setMuted(!s.sound); } } catch (e) { /* ignore */ }
    if (gestured && hasMusic()) {
      try { if (root.Music.isEnabled() !== s.music) { root.Music.setEnabled(s.music); } } catch (e2) { /* ignore */ }
    }
  }
  function sfx(name) {
    try { if (settings().sound && root.Sfx && typeof root.Sfx.play === "function") { root.Sfx.play(name); } } catch (e) { /* ignore */ }
  }
  var duckWas = null;
  function duck(on) {
    if (!hasMusic() || typeof root.Music.setVolume !== "function") { return; }
    try {
      if (on && duckWas == null) { duckWas = root.Music.getVolume ? root.Music.getVolume() : 0.5; root.Music.setVolume(Math.min(duckWas, 0.12)); }
      if (!on && duckWas != null) { root.Music.setVolume(duckWas); duckWas = null; }
    } catch (e) { /* ignore */ }
  }
  if (doc) {
    (function () {
      function first() {
        if (gestured) { return; }
        gestured = true;
        ["pointerdown", "keydown", "touchend"].forEach(function (t) { try { root.removeEventListener(t, first, true); } catch (e) { /* ignore */ } });
        syncAudio();
      }
      ["pointerdown", "keydown", "touchend"].forEach(function (t) { try { root.addEventListener(t, first, true); } catch (e) { /* ignore */ } });
    })();
    try { syncAudio(); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------- storage */
  var stores = [];
  function store(key) {
    key = String(key);
    var mem = null, useMem = false;
    function read() {
      var raw = null, o = null;
      if (!useMem) { try { raw = root.localStorage.getItem(key); } catch (e) { useMem = true; } }
      if (useMem) { raw = mem; }
      try { o = raw ? JSON.parse(raw) : null; } catch (e2) { o = null; }
      if (!o || typeof o !== "object" || Array.isArray(o)) { o = { v: 1, progress: {} }; }
      if (!o.progress || typeof o.progress !== "object" || Array.isArray(o.progress)) { o.progress = {}; }
      if (o.v == null) { o.v = 1; }
      return o;
    }
    function write(o) {
      var text = JSON.stringify(o);
      mem = text;
      if (useMem) { return false; }
      try { root.localStorage.setItem(key, text); return true; } catch (e) { useMem = true; return false; }
    }
    var s = {
      key: key,
      load: function (pid) {
        var o = read(), d = o.progress[String(pid)];
        return d === undefined ? null : JSON.parse(JSON.stringify(d));
      },
      save: function (pid, data) {
        var o = read();
        o.progress[String(pid)] = data === undefined ? null : JSON.parse(JSON.stringify(data));
        return write(o);
      },
      remove: function (pid) {
        var o = read();
        if (!(String(pid) in o.progress)) { return false; }
        delete o.progress[String(pid)];
        write(o);
        return true;
      },
      /* drops the progress of every id that is no longer in the player list; returns the ids dropped */
      prune: function () {
        var p = P();
        if (!p) { return []; }
        var ids = {}, gone = [], o;
        try { p.list().forEach(function (q) { ids[q.id] = true; }); } catch (e) { return []; }
        o = read();
        Object.keys(o.progress).forEach(function (id) { if (!ids[id]) { gone.push(id); delete o.progress[id]; } });
        if (gone.length) { write(o); }
        return gone;
      }
    };
    stores.push(s);
    try { s.prune(); } catch (e) { /* ignore */ }
    return s;
  }
  function pruneAll() { stores.forEach(function (s) { try { s.prune(); } catch (e) { /* ignore */ } }); }

  /* --------------------------------------------------------------------- dates */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today(d) {
    d = d instanceof Date ? d : new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function dayNum(x) {
    if (x instanceof Date) { return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 864e5; }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(x || ""));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN;
  }
  /* whole days from a to b (b later = positive); NaN if either is not a date */
  function days(a, b) { return Math.round(dayNum(b == null ? today() : b) - dayNum(a)); }

  /* ---------------------------------------------------------------- Latin text */
  function nfc(s) { s = String(s == null ? "" : s); try { return s.normalize("NFC"); } catch (e) { return s; } }
  /* macrons (and breves) off: ā -> a, Ō -> O */
  function strip(s) {
    s = String(s == null ? "" : s);
    try { return s.normalize("NFD").replace(/[̄̆]/g, "").normalize("NFC"); } catch (e) {
      return s.replace(/[āăĀĂ]/g, function (c) { return /[ĀĂ]/.test(c) ? "A" : "a"; }).replace(/[ēĕĒĔ]/g, function (c) { return /[ĒĔ]/.test(c) ? "E" : "e"; })
        .replace(/[īĭĪĬ]/g, function (c) { return /[ĪĬ]/.test(c) ? "I" : "i"; }).replace(/[ōŏŌŎ]/g, function (c) { return /[ŌŎ]/.test(c) ? "O" : "o"; })
        .replace(/[ūŭŪŬ]/g, function (c) { return /[ŪŬ]/.test(c) ? "U" : "u"; }).replace(/[ȳȲ]/g, function (c) { return c === "Ȳ" ? "Y" : "y"; });
    }
  }
  /* lower case, trimmed, one space between words, no ? . , ! … , curly quotes made straight, no initial "to " */
  function norm(s) {
    s = nfc(s).toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
    s = s.replace(/[?.,!…¿¡]/g, " ").replace(/\s+/g, " ").trim();
    s = s.replace(/^to /, "");
    return s;
  }
  /* typed against one or more right answers; mode "ignored" | "light" (default) | "strict".
     -> { ok, slip, answer }: slip = only macrons differ (light: right, show the spelling; strict: wrong).
        answer = the right answer it was matched with (or the first one). */
  function check(typed, answers, mode) {
    var list = (Array.isArray(answers) ? answers : [answers]).filter(function (a) { return a != null && String(a).trim() !== ""; }).map(String);
    var t = norm(typed), first = list[0] || "";
    mode = mode === "ignored" || mode === "strict" ? mode : "light";
    if (!t || !list.length) { return { ok: false, slip: false, answer: first }; }
    var i, n;
    for (i = 0; i < list.length; i++) { if (norm(list[i]) === t) { return { ok: true, slip: false, answer: list[i] }; } }
    var ts = strip(t);
    for (i = 0; i < list.length; i++) {
      n = norm(list[i]);
      if (strip(n) === ts) {
        if (mode === "ignored") { return { ok: true, slip: false, answer: list[i] }; }
        if (mode === "light") { return { ok: true, slip: true, answer: list[i] }; }
        return { ok: false, slip: true, answer: list[i] };
      }
    }
    return { ok: false, slip: false, answer: first };
  }

  var LONG = { a: "ā", e: "ē", i: "ī", o: "ō", u: "ū", y: "ȳ", A: "Ā", E: "Ē", I: "Ī", O: "Ō", U: "Ū", Y: "Ȳ" };
  /* a- or a= anywhere in a string -> ā (for text that did not come through macronKeys) */
  function longs(s) { return nfc(s).replace(/([aeiouyAEIOUY])[-=]/g, function (m, v) { return LONG[v]; }); }
  /* A row of ā ē ī ō ū keys above a text input (or into opts.into), and vowel + "-" or "=" made long as you type. */
  function macronKeys(input, opts) {
    opts = opts || {};
    if (!input || !doc) { return null; }
    input.setAttribute("lang", "la");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    if (!input.classList.contains("la-input") && opts.style !== false) { input.classList.add("la-input"); }
    var row = el("div", "mk-row");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Long vowels");
    ["ā", "ē", "ī", "ō", "ū"].forEach(function (v) {
      var b = el("button", "mk-key");
      b.type = "button";
      b.textContent = v;
      b.setAttribute("lang", "la");
      b.setAttribute("aria-label", "Type " + v);
      b.addEventListener("pointerdown", function (e) { if (doc.activeElement === input) { e.preventDefault(); } }); /* the keyboard stays up */
      b.addEventListener("mousedown", function (e) { if (doc.activeElement === input) { e.preventDefault(); } });
      b.addEventListener("click", function (e) { put(e.shiftKey ? v.toUpperCase() : v); });
      row.appendChild(b);
    });
    function put(ch) {
      if (input.disabled || input.readOnly) { return; }
      var v = input.value, s = input.selectionStart, e = input.selectionEnd;
      if (s == null || e == null) { s = e = v.length; }
      var max = input.maxLength > 0 ? input.maxLength : Infinity;
      if (v.length - (e - s) + 1 > max) { return; }
      input.value = v.slice(0, s) + ch + v.slice(e);
      try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); }
      try { input.setSelectionRange(s + 1, s + 1); } catch (x2) { /* ignore */ }
      fireInput();
    }
    function fireInput() {
      var ev;
      try { ev = new root.Event("input", { bubbles: true }); } catch (x) { ev = doc.createEvent("Event"); ev.initEvent("input", true, false); }
      input.dispatchEvent(ev);
    }
    function onInput(e) {
      if (e && e.isComposing) { return; }
      var v = input.value, p = input.selectionStart;
      if (p == null) { p = v.length; }
      if (p >= 2 && (v.charAt(p - 1) === "-" || v.charAt(p - 1) === "=") && LONG[v.charAt(p - 2)]) {
        input.value = v.slice(0, p - 2) + LONG[v.charAt(p - 2)] + v.slice(p);
        try { input.setSelectionRange(p - 1, p - 1); } catch (x) { /* ignore */ }
      }
    }
    input.addEventListener("input", onInput, true);
    if (opts.into) { opts.into.appendChild(row); } else if (input.parentNode) { input.parentNode.insertBefore(row, input); }
    return {
      row: row, input: input, put: put,
      destroy: function () { input.removeEventListener("input", onInput, true); if (row.parentNode) { row.parentNode.removeChild(row); } }
    };
  }

  /* --------------------------------------------------------------- randomness */
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* a seeded random number generator (mulberry32): r() in [0, 1), r.int(n) in 0..n-1, r.pick(list) */
  function rng(seed) {
    var a = typeof seed === "number" && isFinite(seed) ? seed >>> 0 : hash(String(seed == null ? Date.now() + ":" + Math.random() : seed));
    function r() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    r.int = function (n) { return Math.floor(r() * n); };
    r.pick = function (list) { return list && list.length ? list[Math.floor(r() * list.length)] : undefined; };
    return r;
  }
  /* a shuffled copy (Fisher-Yates); rng is optional (Math.random) */
  function shuffle(list, r) {
    var a = Array.prototype.slice.call(list || []), f = typeof r === "function" ? r : Math.random, i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(f() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* --------------------------------------------------------------------- mount */
  function mount(opts) {
    opts = opts || {};
    if (!doc) { return null; }
    var hostEl = opts.root || doc.body;
    var app = el("div", "ls-app");
    app.setAttribute("data-view", "game");
    if (opts.id) { app.setAttribute("data-game", String(opts.id)); }

    var logoInner = '<span class="logo-ic" aria-hidden="true">' + (opts.logo || icon("book")) + '</span><span class="logo-t"><span class="logo-name">' + esc(opts.title || "") + '</span><small class="logo-sub">' + esc(opts.sub || "") + "</small></span>";
    var logoHtml = typeof opts.onHome === "function"
      ? '<button type="button" class="logo logo-btn" data-k="home" aria-label="' + esc((opts.title || "Home") + ": home") + '">' + logoInner + "</button>"
      : '<div class="logo">' + logoInner + "</div>";
    app.innerHTML =
      '<div class="wall" aria-hidden="true"></div>' +
      '<header class="topbar">' +
        /* back to the site's front page with every game, from every screen of every game */
        (opts.gamesHref === false ? "" : '<a class="tb-btn tb-games" href="' + esc(opts.gamesHref || "../index.html") + '" aria-label="All games: the Language Games home page">' + icon("home") + '<span class="tb-glab" aria-hidden="true">All games</span></a>') +
        logoHtml + '<div class="tb-mid"></div>' +
        '<button type="button" class="pchip" data-k="chip" aria-haspopup="menu" aria-expanded="false" hidden><span class="pc-av" aria-hidden="true"></span><span class="pc-t" aria-hidden="true"><span class="pc-as">Playing as </span><b class="pc-name"></b><span class="pc-line"></span></span>' + icon("caret", "pc-caret") + "</button>" +
        '<button type="button" class="tb-btn tb-sound tb-music" data-k="music" aria-pressed="true" aria-label="Music" hidden>' + icon("music", "ic-on") + icon("music-off", "ic-off") + "</button>" +
        '<button type="button" class="tb-btn tb-sound" data-k="sound" aria-pressed="true" aria-label="Sound effects">' + icon("sound", "ic-on") + icon("mute", "ic-off") + "</button>" +
        '<button type="button" class="tb-btn tb-set" data-k="settings" aria-label="Settings" hidden>' + icon("gear") + '<span class="tb-lab">Settings</span></button>' +
      "</header>" +
      '<div class="pmenu" role="menu" aria-label="Player" hidden></div>' +
      '<section class="ls-stage" aria-label="Inspector Cāsus">' +
        '<div class="ls-medal" aria-hidden="true"><div class="ls-medal-in"><svg class="ls-stars" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" focusable="false"><g fill="#eef4ff"><circle cx="14" cy="22" r="1"/><circle cx="30" cy="10" r=".7"/><circle cx="72" cy="14" r="1.1" class="tw"/><circle cx="86" cy="30" r=".7"/><circle cx="20" cy="40" r=".6"/><circle cx="56" cy="6" r=".8" class="tw t2"/><circle cx="90" cy="48" r=".9"/><circle cx="8" cy="56" r=".7" class="tw t3"/></g></svg><div class="ls-insp"></div></div></div>' +
        '<div class="bubble-wrap"><div class="bubble"><span class="b-name" aria-hidden="true">Inspector Cāsus</span><div class="b-text"></div><div class="b-dots" hidden></div>' +
          '<button type="button" class="b-next" aria-label="Next line" hidden>' + icon("next") + "</button></div></div>" +
      "</section>" +
      '<main class="ls-desk" tabindex="-1"><div class="ls-game"></div><div class="ls-screens" hidden></div></main>' +
      '<div class="toasts" aria-hidden="true"></div>' +
      '<div class="sr" aria-live="polite" aria-atomic="true"></div>';
    hostEl.appendChild(app);

    function q(sel) { return app.querySelector(sel); }
    var chip = q('[data-k="chip"]'), musicBtn = q('[data-k="music"]'), soundBtn = q('[data-k="sound"]'), setBtn = q('[data-k="settings"]');
    var menu = q(".pmenu"), stage = q(".ls-stage"), inspBox = q(".ls-insp"), bubble = q(".bubble"), bText = q(".b-text"), bDots = q(".b-dots"), bNext = q(".b-next");
    var desk = q(".ls-desk"), game = q(".ls-game"), scr = q(".ls-screens"), toasts = q(".toasts"), liveEl = q('[aria-live]');

    /* the Inspector */
    var d = null;
    try {
      if (root.Detective && typeof root.Detective.create === "function") {
        d = root.Detective.create({ size: 100, variant: "bust", mood: "idle" });
        inspBox.appendChild(d);
      }
    } catch (e) { d = null; }
    if (!d) {
      inspBox.innerHTML = '<svg class="ls-noinsp" viewBox="0 0 44 44" aria-hidden="true"><path fill="none" stroke="#3a2416" stroke-width="7.5" stroke-linecap="round" d="M28.5 28.5l10 10"/><circle cx="18" cy="18" r="13" fill="#c6ecfa" fill-opacity=".3" stroke="#e2a93c" stroke-width="4"/></svg>';
    }
    function fitInsp() {
      if (!d) { return; }
      var box = q(".ls-medal-in"), w = box ? box.clientWidth : 0;
      if (w > 0) { try { d.setSize(Math.round(w * 0.98)); } catch (e) { /* ignore */ } }
    }
    fitInsp();
    var rsT = 0;
    root.addEventListener("resize", function () { clearTimeout(rsT); rsT = setTimeout(function () { fitInsp(); placeMenu(); }, 80); });
    q(".ls-medal").addEventListener("click", function () {
      if (!d || talking) { return; }
      try { d.play(["wave", "search", "proud", "think"][pokeN++ % 4], 1300); } catch (e) { /* ignore */ }
      sfx("blip");
    });
    var pokeN = 0;
    function mood(m) { if (d && m) { try { d.setMood(m); } catch (e) { /* ignore */ } } }
    function act(m, ms) { if (d && m) { try { d.play(m, ms || 1600); } catch (e) { /* ignore */ } } }

    /* the speech bubble */
    var seq = { lines: [], moods: [], i: 0, onEnd: null }, talking = false, talkT = 0;
    function talk(ms) {
      clearTimeout(talkT);
      if (!d || reduced()) { return; }
      talking = true;
      try { d.talk(true); } catch (e) { /* ignore */ }
      talkT = setTimeout(function () { talking = false; try { d.talk(false); } catch (e) { /* ignore */ } }, ms);
    }
    function showLine() {
      var html = seq.lines[seq.i] || "", m = seq.moods[seq.i];
      bText.textContent = "";
      var p = el("p", "b-line");
      p.appendChild(rich(html));
      bText.appendChild(p);
      if (!reduced()) { bText.classList.remove("in"); void bText.offsetWidth; bText.classList.add("in"); }
      var n = seq.lines.length;
      bubble.classList.toggle("quiet", n < 2 && !String(html).trim());
      bDots.hidden = n < 2;
      bDots.innerHTML = n < 2 ? "" : seq.lines.map(function (x, i) { return '<i class="' + (i === seq.i ? "on" : "") + '"></i>'; }).join("");
      bNext.hidden = seq.i >= n - 1;
      bubble.classList.toggle("has-next", seq.i < n - 1);
      if (m) { if (m.charAt(0) === "!") { act(m.slice(1), 2000); } else { mood(m); } }
      var text = plain(html);
      live(text);
      talk(Math.max(500, Math.min(2600, text.length * 45)));
      if (seq.i >= n - 1 && seq.onEnd) { var f = seq.onEnd; seq.onEnd = null; try { f(); } catch (e) { /* ignore */ } }
    }
    /* lines: one HTML string or a list (one idea a line); mood: one mood, or one per line ("!cheer" plays it once) */
    function say(lines, m, o) {
      o = o || {};
      lines = (Array.isArray(lines) ? lines : [lines]).filter(function (x) { return x != null && String(x) !== ""; }).map(String);
      if (!lines.length) { lines = [""]; }
      var moods = Array.isArray(m) ? m : lines.map(function (x, i) { return i === 0 ? m : null; });
      seq = { lines: lines, moods: moods, i: 0, onEnd: typeof o.onEnd === "function" ? o.onEnd : null };
      showLine();
    }
    function more() { return seq.i < seq.lines.length - 1; }
    function next() { if (!more()) { return false; } seq.i++; showLine(); return true; }
    bNext.addEventListener("click", function () { sfx("tap"); next(); if (!more()) { try { bubble.focus(); } catch (e) { /* ignore */ } } });
    bubble.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("button")) { return; } if (more()) { sfx("tap"); next(); } });
    bubble.setAttribute("tabindex", "-1");

    function live(text) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = text; }, 30); }

    /* toasts */
    function toast(html, o) {
      o = typeof o === "number" ? { ms: o } : o || {};
      var t = el("div", "toast" + (o.kind ? " " + o.kind : ""));
      t.appendChild(rich(html));
      toasts.appendChild(t);
      live(plain(html));
      var ms = o.ms || 2600;
      setTimeout(function () {
        t.classList.add("out");
        setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, reduced() ? 0 : 260);
      }, ms);
      return t;
    }

    /* dialogs: { title, html | el, buttons: [{ label, kind, value }], sheet: bool, close: true } -> Promise(value | null) */
    var openDialogs = [];
    function closeDialogs() { openDialogs.slice().forEach(function (c) { try { c(null); } catch (e) { /* ignore */ } }); }
    function dialog(o) {
      o = o || {};
      return new Promise(function (resolve) {
        var back = doc.activeElement, scrim = el("div", "scrim"), box = el("section", "dlg open" + (o.sheet ? " bottom" : ""));
        var tid = "dlgT" + Math.floor(Math.random() * 1e9);
        box.setAttribute("role", o.alert ? "alertdialog" : "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-labelledby", tid);
        box.innerHTML = '<div class="dlg-head"><h2 id="' + tid + '">' + esc(o.title || "") + "</h2>" +
          (o.close !== false ? '<button type="button" class="dlg-x" aria-label="Close">' + icon("x") + "</button>" : "") + '</div><div class="dlg-body"></div><div class="dlg-row"></div>';
        var body = box.querySelector(".dlg-body"), row = box.querySelector(".dlg-row");
        if (o.el) { body.appendChild(o.el); } else if (o.html) { body.innerHTML = o.html; } else if (o.text) { body.appendChild(el("p", "", esc(o.text))); }
        (o.buttons || [{ label: "OK", kind: "primary", value: true }]).forEach(function (b) {
          var x = el("button", "btn " + (b.kind || "wood"), esc(b.label));
          x.type = "button";
          x.addEventListener("click", function () { close(b.value === undefined ? b.label : b.value); });
          row.appendChild(x);
        });
        if (!row.children.length) { row.hidden = true; }
        function focusables() { return Array.prototype.filter.call(box.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"), function (n) { return !n.disabled && n.offsetParent !== null; }); }
        function key(e) {
          if (e.key === "Escape" && o.close !== false) { e.preventDefault(); close(null); return; }
          if (e.key === "Tab") {
            var f = focusables(); if (!f.length) { return; }
            if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
            else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
          }
        }
        function close(v) {
          openDialogs = openDialogs.filter(function (c) { return c !== close; });
          doc.removeEventListener("keydown", key, true);
          if (scrim.parentNode) { scrim.parentNode.removeChild(scrim); }
          if (box.parentNode) { box.parentNode.removeChild(box); }
          if (back && back.focus) { try { back.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
          resolve(v);
        }
        openDialogs.push(close);
        if (o.close !== false) { scrim.addEventListener("click", function () { close(null); }); var xb = box.querySelector(".dlg-x"); if (xb) { xb.addEventListener("click", function () { close(null); }); } }
        doc.addEventListener("keydown", key, true);
        doc.body.appendChild(scrim);
        doc.body.appendChild(box);
        var f = box.querySelector("[autofocus]") || row.querySelector(".btn.primary") || focusables()[0];
        if (f) { try { f.focus(); } catch (e) { /* ignore */ } }
        if (typeof o.onOpen === "function") { try { o.onOpen(box, close); } catch (e) { /* ignore */ } }
      });
    }

    /* settings buttons */
    function syncButtons() {
      var s = settings();
      soundBtn.setAttribute("aria-pressed", s.sound ? "true" : "false");
      soundBtn.title = s.sound ? "Sound effects are on" : "Sound effects are off";
      musicBtn.hidden = !hasMusic();
      musicBtn.setAttribute("aria-pressed", s.music ? "true" : "false");
      musicBtn.title = s.music ? "Music is on" : "Music is off";
    }
    soundBtn.addEventListener("click", function () {
      var on = !settings().sound;
      setSetting("sound", on);
      syncButtons();
      if (on) { sfx("tap"); }
      toast(on ? "Sound effects on" : "Sound effects off", { ms: 1400 });
    });
    musicBtn.addEventListener("click", function () {
      gestured = true;
      var on = !settings().music;
      setSetting("music", on);
      syncButtons();
      toast(on ? "Music on" : "Music off", { ms: 1400 });
    });
    if (typeof opts.onSettings === "function") {
      setBtn.hidden = false;
      setBtn.addEventListener("click", function () { closeMenu(); try { opts.onSettings(); } catch (e) { /* ignore */ } });
    }
    var homeBtn = q('[data-k="home"]');
    if (homeBtn) { homeBtn.addEventListener("click", function () { closeMenu(); if (view === "game") { try { opts.onHome(); } catch (e) { /* ignore */ } } else { var p = player(); if (p) { toGame(p, "continue"); } } }); }

    /* the player: chip, menu, screens */
    var playing = null, view = "game", ui = null, shown = null;
    function player() { var p = P(); if (!p || !playing) { return null; } try { return p.get(playing); } catch (e) { return null; } }

    /* The players are picked on the site's front page, once for every game (the parent, 2026-11-25): a game opens as the
       player chosen there, and "Switch player", "Change chapter" (and a visit with nobody chosen) go to
       {gamesHref}?play=<this game's folder>#<screen>, which comes back here after the pick. The in-game players screens
       stay only for a page with gamesHref: false, or when this browser cannot keep the choice (no localStorage). */
    var folder = (function () {
      if (opts.folder && /^[a-z0-9-]+$/.test(opts.folder)) { return opts.folder; }
      try {
        var parts = String(root.location.pathname || "").split("/");
        if (!parts[parts.length - 1] || /\.html?$/i.test(parts[parts.length - 1])) { parts.pop(); }
        var f = parts.pop() || "";
        return /^[a-z0-9-]+$/.test(f) ? f : "";
      } catch (e) { return ""; }
    })();
    var atHome = opts.gamesHref !== false && (function () {
      try { var k = "latinGames.probe"; root.localStorage.setItem(k, "1"); root.localStorage.removeItem(k); return true; } catch (e) { return false; }
    })();
    function homeUrl(screen) {
      return (opts.gamesHref || "../index.html") + (folder ? "?play=" + folder : "") + "#" + (screen || "players");
    }
    /* replace, not push: the front page's "Back to <game>" and the pick come back here, so a round trip leaves one
       entry for the game in the history and one Back leaves it */
    function goHome(screen) {
      closeMenu();
      try { root.location.replace(homeUrl(screen)); } catch (e) { /* ignore */ }
    }
    /* back from the front page: #added, #chapter or #picked tells what was done there */
    var arrived = (function () {
      try {
        var m = /^#(added|chapter|picked)$/.exec(root.location.hash || "");
        if (!m) { return null; }
        root.history.replaceState(null, "", root.location.pathname + root.location.search);
        return m[1];
      } catch (e) { return null; }
    })();
    function syncChip() {
      var p = player(), pl = P();
      chip.hidden = !pl;
      if (!pl) { return; }
      var av = chip.querySelector(".pc-av");
      chip.classList.toggle("none", !p);
      if (!p) {
        av.style.removeProperty("--pc");
        av.innerHTML = icon("user");
        chip.querySelector(".pc-name").textContent = "Who’s playing?";
        chip.querySelector(".pc-line").textContent = "";
        chip.querySelector(".pc-as").hidden = true;
        chip.setAttribute("aria-label", "Choose a player");
        return;
      }
      av.style.setProperty("--pc", p.color || "#b3202a");
      av.textContent = Array.from ? Array.from(p.name)[0] : p.name.charAt(0);
      chip.querySelector(".pc-as").hidden = false;
      chip.querySelector(".pc-name").textContent = p.name;
      var line = "";
      try { line = pl.gradeLine(p); } catch (e) { line = ""; }
      chip.querySelector(".pc-line").textContent = line ? " · " + line : "";
      chip.setAttribute("aria-label", "Playing as " + p.name + (line ? ", " + line.replace(/ · /g, ", ") : "") + ". Switch player or change chapter");
    }

    var menuOpen = false;
    function placeMenu() {
      if (!menuOpen) { return; }
      var r = chip.getBoundingClientRect(), w = menu.offsetWidth, vw = doc.documentElement.clientWidth;
      var left = Math.max(8, Math.min(vw - w - 8, r.right - w));
      menu.style.left = left + "px";
      menu.style.top = Math.round(r.bottom + 6) + "px";
    }
    function openMenu() {
      var pl = P(); if (!pl) { return; }
      var p = player(), items = [];
      if (atHome) {
        items.push(["switch", "Switch player", "users"]);
        if (p) { items.push(["chapter", "Change chapter", "book"]); }
      } else {
        if (p) { items.push(["chapter", "Change chapter", "book"]); }
        items.push(["switch", p ? "Switch player" : "Choose a player", "users"], ["add", "Add a player", "plus"], ["manage", "Manage players", "user"]);
      }
      if (typeof opts.onSettings === "function") { items.push(["settings", "Settings", "gear"]); }
      var head = "";
      if (p) {
        var gl = ""; try { gl = pl.gradeLine(p, true); } catch (e) { gl = ""; }
        head = '<div class="pm-head"><span class="pc-av" style="--pc:' + esc(p.color) + '" aria-hidden="true">' + esc(Array.from ? Array.from(p.name)[0] : p.name.charAt(0)) + '</span><span><b>' + esc(p.name) + "</b><small>" + esc(gl) + "</small></span></div>";
      }
      menu.innerHTML = head + items.map(function (it) { return '<button type="button" class="pm-item' + (it[0] === "settings" ? " pm-set" : "") + '" role="menuitem" tabindex="-1" data-m="' + it[0] + '">' + icon(it[2]) + "<span>" + esc(it[1]) + "</span></button>"; }).join("");
      menu.hidden = false;
      menuOpen = true;
      chip.setAttribute("aria-expanded", "true");
      placeMenu();
      var first = Array.prototype.filter.call(menu.querySelectorAll(".pm-item"), function (x) { return x.offsetParent !== null; })[0];
      if (first) { first.focus(); }
      sfx("tap");
    }
    function closeMenu(refocus) {
      if (!menuOpen) { return; }
      menuOpen = false;
      menu.hidden = true;
      chip.setAttribute("aria-expanded", "false");
      if (refocus) { try { chip.focus(); } catch (e) { /* ignore */ } }
    }
    chip.addEventListener("click", function (e) { e.stopPropagation(); if (menuOpen) { closeMenu(); } else { openMenu(); } });
    menu.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-m]");
      if (!b) { return; }
      var m = b.getAttribute("data-m");
      closeMenu();
      sfx("tap");
      if (m === "settings") { try { opts.onSettings(); } catch (x) { /* ignore */ } }
      else if (m === "chapter") { changeChapter(); } else if (m === "switch") { showPlayers(); } else if (m === "add") { addPlayer(); } else if (m === "manage") { managePlayers(); }
    });
    menu.addEventListener("keydown", function (e) {
      var items = Array.prototype.filter.call(menu.querySelectorAll(".pm-item"), function (x) { return x.offsetParent !== null; }), i = items.indexOf(doc.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); var n = items.length; items[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n].focus(); }
      else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
      else if (e.key === "Tab") { closeMenu(); }
    });
    doc.addEventListener("pointerdown", function (e) { if (menuOpen && !menu.contains(e.target) && !chip.contains(e.target)) { closeMenu(); } }, true);

    var host = {
      show: function (node, kind) {
        closeMenu();
        view = "players";
        app.setAttribute("data-view", "players");
        game.hidden = true;
        scr.hidden = false;
        scr.setAttribute("data-kind", kind || "players");
        scr.textContent = "";
        scr.appendChild(node);
        try { root.scrollTo(0, 0); } catch (e) { /* ignore */ }
      },
      say: function (lines, m) { say(lines, m); },
      picked: function (p, how) { toGame(p, how || "continue"); },
      starsOf: typeof opts.starsOf === "function" ? function (p) { return opts.starsOf(p); } : undefined,
      filesIn: typeof opts.filesIn === "function" ? function (g) { return opts.filesIn(g); } : undefined,
      sourcesHref: opts.sourcesHref === false ? undefined : opts.sourcesHref || BASE + "sources.html",
      icon: function (n) { return icon(n); }
    };
    function screens() {
      if (ui) { return ui; }
      var pl = P();
      try { ui = pl && typeof pl.screens === "function" ? pl.screens(host) : null; } catch (e) { ui = null; }
      return ui;
    }
    function toGame(p, how) {
      closeMenu();
      playing = p ? p.id : null;
      shown = p ? JSON.stringify([p.grade, p.chapter, p.name]) : null;
      view = "game";
      app.setAttribute("data-view", "game");
      scr.hidden = true;
      scr.textContent = "";
      game.hidden = false;
      syncChip();
      pruneAll();
      try { root.scrollTo(0, 0); } catch (e) { /* ignore */ }
      if (typeof opts.onPlayer === "function") { try { opts.onPlayer(p ? (player() || p) : null, how, shell); } catch (e) { if (root.console) { root.console.error(e); } } }
    }
    function showPlayers() { if (atHome && P()) { goHome("players"); return; } var u = screens(); if (u) { u.players(); } }
    function addPlayer() { if (atHome && P()) { goHome("add"); return; } var u = screens(); if (u) { u.add(); } }
    function managePlayers() { if (atHome && P()) { goHome("manage"); return; } var u = screens(); if (u) { u.manage(); } }
    function changeChapter(id) {
      if (atHome && P()) { goHome(player() ? "chapter" : "players"); return; }
      var u = screens(), p = id ? { id: id } : player(); if (u) { if (p) { u.changeChapter(p.id); } else { u.players(); } }
    }

    /* changes from this page, the players screens or another tab */
    function onChange() {
      syncButtons();
      syncAudio();
      pruneAll();
      var pl = P();
      if (pl && atHome) {
        var c = null;
        try { c = pl.current(); } catch (e) { c = null; }
        if (!c) { closeDialogs(); syncChip(); goHome("players"); return; }
        if (c.id !== playing) { closeDialogs(); toGame(c, "continue"); return; }
      }
      if (!pl || !playing) { syncChip(); return; }
      var p = player();
      syncChip();
      if (!p) {
        playing = null;
        syncChip();
        if (view === "game") { showPlayers(); }
        return;
      }
      var now = JSON.stringify([p.grade, p.chapter, p.name]);
      if (now !== shown && view === "game") {
        shown = now;
        if (typeof opts.onPlayer === "function") { try { opts.onPlayer(p, "update", shell); } catch (e) { if (root.console) { root.console.error(e); } } }
      }
    }
    try { var pl0 = P(); if (pl0 && typeof pl0.onchange === "function") { pl0.onchange(onChange); } } catch (e) { /* ignore */ }

    var shell = {
      el: app, desk: game, bar: q(".topbar"), mid: q(".tb-mid"), stage: stage, bubble: bubble, screens: scr, detective: d,
      say: say, mood: mood, act: act, next: next, more: more, live: live, toast: toast, dialog: dialog,
      showPlayers: showPlayers, addPlayer: addPlayer, managePlayers: managePlayers, changeChapter: changeChapter,
      player: player, view: function () { return view; },
      compact: function (on) { app.classList.toggle("compact", !!on); setTimeout(fitInsp, 0); },
      setTitle: function (t, s) { if (t != null) { q(".logo-name").textContent = t; } if (s != null) { q(".logo-sub").textContent = s; } },
      setSub: function (s) { q(".logo-sub").textContent = s == null ? "" : s; },
      sfx: sfx, settings: settings, set: setSetting
    };

    syncButtons();
    syncChip();
    say(opts.hello || "", "idle");

    /* first screen: the game for the player who played last, or the players screen */
    setTimeout(function () {
      var pl = P(), cur = null;
      if (pl) { try { cur = pl.current(); } catch (e) { cur = null; } }
      /* came back from the front page and still nobody is chosen: this browser does not keep the choice, so the
         players screens stay here instead of sending the child back and forth */
      if (!cur && arrived) { atHome = false; }
      if (cur) { toGame(cur, arrived === "added" ? "added" : arrived === "chapter" ? "chapter" : "continue"); }
      else if (pl && atHome) { app.style.visibility = "hidden"; goHome("players"); }
      else if (pl && screens()) { showPlayers(); }
      else { toGame(null, "none"); }
    }, 0);
    /* back here with the Back button from the front page: the page comes from the cache, so read the players again */
    if (root.addEventListener) { root.addEventListener("pageshow", function (e) { if (e && e.persisted) { app.style.visibility = ""; onChange(); } }); }
    return shell;
  }

  var LatinShell = {
    base: BASE,
    mount: mount, store: store, today: today, days: days,
    strip: strip, norm: norm, check: check, longs: longs, macronKeys: macronKeys,
    rng: rng, shuffle: shuffle, esc: esc, rich: function (h) { return doc ? rich(h) : null; }, icon: icon,
    sfx: sfx, duck: duck, settings: settings, set: setSetting
  };
  root.LatinShell = LatinShell;
  if (typeof module !== "undefined" && module.exports) { module.exports = LatinShell; }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
