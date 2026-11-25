/*!
 * Case Detective: the game.
 * Plain script. Needs data.js (CD_DATA), detective.js (Detective) and sfx.js (Sfx) loaded first.
 * All Latin and all of the Inspector's lines come from CD_DATA; only short English labels live here.
 */
(function () {
  "use strict";

  var D = window.CD_DATA;
  if (!D || !window.Detective) { return; }
  var Sfx = window.Sfx || { play: function () {}, isMuted: function () { return true; }, setMuted: function () {} };
  var L = D.inspector.lines;
  var FILES = D.files;
  var CASE_KEYS = ["nom", "gen", "dat", "acc", "abl", "voc"];

  /* ------------------------------------------------------------ helpers */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (html !== undefined && html !== null) { n.innerHTML = html; }
    return n;
  }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* data text may carry <b>, <i> and <u>: everything else is escaped. <i> is always Latin. */
  function rich(s) {
    return keep(esc(s).replace(/&lt;(\/?)([biu])&gt;/g, function (m, slash, tag) {
      return "<" + slash + tag + (tag === "i" && !slash ? ' lang="la"' : "") + ">";
    }));
  }
  /* an ending such as -ae or -nt stays in one piece: a line never breaks after its hyphen */
  function keep(html) {
    return html.replace(/(^|[\s(>\u201c\u2018\/])(-[A-Za-z\u0100-\u017f]{1,5})(?![A-Za-z\u0100-\u017f])/g, '$1<span class="nw">$2</span>');
  }
  function txt(s) { return keep(esc(s)); }
  function plain(s) { return String(s || "").replace(/<\/?[biu]>/g, ""); }
  function fill(s, map) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; }); }
  function icon(name, cls) { return '<svg class="' + (cls || "ic") + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>'; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  var lastPick = {};
  function pickLine(list, key) {
    if (!list || !list.length) { return ""; }
    var i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && lastPick[key] === i) { i = (i + 1) % list.length; }
    lastPick[key] = i;
    return list[i];
  }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function mq(q) {
    try { return window.matchMedia ? window.matchMedia(q) : { matches: false }; } catch (e) { return { matches: false }; }
  }
  var mqReduce = mq("(prefers-reduced-motion: reduce)");
  function reduced() { return !!mqReduce.matches; }
  function fileById(id) { for (var i = 0; i < FILES.length; i++) { if (FILES[i].id === id) { return FILES[i]; } } return null; }
  function caseInfo(k) { return k === "verb" ? D.verb : D.cases[k]; }
  function selEsc(s) { return String(s).replace(/["\\]/g, "\\$&"); }

  /* ------------------------------------------------------------ storage */
  var save = { stars: {}, solo: {}, seen: {}, sound: true, music: true, piece: 1 };
  function loadSave() {
    try {
      var raw = window.localStorage.getItem(D.storageKey);
      if (!raw) { return; }
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") { return; }
      FILES.forEach(function (f) {
        var s = o.stars && typeof o.stars === "object" ? +o.stars[f.id] : 0;
        if (s >= 1 && s <= 3) { save.stars[f.id] = Math.floor(s); }
        if (o.solo && typeof o.solo === "object" && o.solo[f.id] === true && save.stars[f.id] === 3) { save.solo[f.id] = true; }
      });
      if (o.seen && typeof o.seen === "object") { for (var k in o.seen) { if (o.seen[k] === true) { save.seen[k] = true; } } }
      if (typeof o.sound === "boolean") { save.sound = o.sound; }
      if (typeof o.music === "boolean") { save.music = o.music; }
      else if (o.sound === false) { save.music = false; }          /* a save from before the music, with the sound off: stay quiet */
      if (typeof o.piece === "number" && o.piece >= 1 && o.piece <= 24) { save.piece = Math.floor(o.piece); }
    } catch (e) { /* no storage: the game still works, it just forgets */ }
  }
  function persist() {
    try { window.localStorage.setItem(D.storageKey, JSON.stringify(save)); } catch (e) { /* ignore */ }
  }
  function starsCopy() {
    var o = {};
    FILES.forEach(function (f) { if (save.stars[f.id]) { o[f.id] = save.stars[f.id]; } });
    return o;
  }
  function totalStars() { var t = 0; FILES.forEach(function (f) { t += save.stars[f.id] || 0; }); return t; }
  function maxStars() { return FILES.length * 3; }
  function rankFor(total) {
    var idx = 0;
    D.ranks.forEach(function (r, i) { if (total >= r.min) { idx = i; } });
    return { index: idx, title: D.ranks[idx].title, next: D.ranks[idx + 1] || null };
  }
  function starsFor(share) {
    var rules = D.starRules.slice().sort(function (a, b) { return b.min - a.min; });
    for (var i = 0; i < rules.length; i++) { if (share >= rules[i].min - 1e-9) { return rules[i].stars; } }
    return 0;
  }
  function hasProgress() {
    if (totalStars() > 0) { return true; }
    for (var k in save.seen) { if (save.seen[k]) { return true; } }
    return false;
  }
  /* the file the Inspector suggests next */
  function nextFile() {
    var i;
    for (i = 0; i < FILES.length; i++) { if (!save.stars[FILES[i].id]) { return FILES[i]; } }
    for (i = 0; i < FILES.length; i++) { if (save.stars[FILES[i].id] < 3) { return FILES[i]; } }
    for (i = 0; i < FILES.length; i++) { if (!save.solo[FILES[i].id]) { return FILES[i]; } }
    return FILES[FILES.length - 1];
  }
  function ribbonsLeft() { var n = 0; FILES.forEach(function (f) { if (!save.solo[f.id]) { n++; } }); return n; }


  /* ---------------------------------------------------------------- DOM */
  var app = $("app"), desk = $("desk"), stage = $("stage"), tbMid = $("tbMid");
  var homeBtn = $("homeBtn"), soundBtn = $("soundBtn"), musicBtn = $("musicBtn"), nbBtn = $("nbBtn"), streakEl = $("streak"), streakN = $("streakN");
  var inspFig = $("inspFig"), bubble = $("bubble"), bText = $("bText"), bName = $("bName"), bNext = $("bNext");
  var live = $("live"), fx = $("fx");
  var nb = $("notebook"), nbScrim = $("nbScrim"), nbClose = $("nbClose"), nbPages = $("nbPages");
  var cf = $("confirm"), cfScrim = $("cfScrim"), cfNo = $("cfNo"), cfYes = $("cfYes");
  var skA = document.querySelector(".sk-a"), skB = document.querySelector(".sk-b");
  bName.textContent = D.inspector.name;

  /* the case colors come from data.js; the stylesheet carries the same values as a fallback.
     The verb is not a case: its tag keeps the stylesheet's warm gray (the gray in data.js leans violet,
     and violet belongs to the accusative alone). */
  try {
    CASE_KEYS.forEach(function (k) { if (D.cases[k] && /^#[0-9a-f]{3,8}$/i.test(D.cases[k].color)) { document.documentElement.style.setProperty("--" + k, D.cases[k].color); } });
  } catch (e) { /* keep the fallback */ }

  var view = "home";
  var R = null;        /* the round being played */
  var B = null;        /* the briefing on screen */
  var T = null;        /* the training case on screen */
  var paused = null;   /* a round the player stepped away from */
  var seq = null;      /* a run of bubble lines the player pages through (home greeting) */
  var kb = false;      /* true while the player is driving with the keyboard */
  var greeted = false; /* he says hello once per visit to the page */
  var viewTimers = [];
  function later(fn, ms) {
    var t = setTimeout(function () { try { fn(); } catch (e) { /* a late timer must never break the game */ } }, ms);
    viewTimers.push(t);
    return t;
  }
  function clearViewTimers() { viewTimers.forEach(function (t) { clearTimeout(t); }); viewTimers = []; }

  /* screen readers get each full line once; the text is cleared again so it is not found twice */
  var liveSet = 0, liveClear = 0;
  function announce(text) {
    clearTimeout(liveSet);
    clearTimeout(liveClear);
    live.textContent = "";
    liveSet = setTimeout(function () { live.textContent = text; }, 40);
    liveClear = setTimeout(function () { live.textContent = ""; }, 7000);
  }

  /* How far the page runs past the bottom of the screen. Measured on the layout box of the page, not on
     the scrolling height: a piece that is still sliding into place must not count as overflow. */
  function pageOver() {
    return Math.max(0, Math.ceil(app.getBoundingClientRect().height - window.innerHeight - 0.05));
  }
  /* true while the Inspector stands in his own column beside the desk (laptops, phones on their side) */
  function wideLayout() {
    try { return getComputedStyle(inspFig.parentNode).position === "fixed"; } catch (e) { return false; }
  }

  /* ------------------------------------------------------- the Inspector */
  var insp = window.Detective.create({ size: 120, variant: "bust", mood: "idle" });
  inspFig.appendChild(insp);
  var inspVariant = "", inspSize = 0;
  var docked = null;   /* the slot in the case note he has hopped into (see fitAnswered) */
  /* Low and wide (a phone on its side, a zoomed-in laptop): his bubble hangs in his own column, above
     him, and a clue lies at the foot of that column. He takes the room between the two. When a clue
     leaves him too little he lets it cover his coat rather than hide his face behind the bubble. */
  var LOW_MIN = 72, LOW_MIN_FULL = 150, lowMax = 0, lowOn = false;
  function lowLayout() {
    try { return getComputedStyle(bubble.parentNode).position === "fixed"; } catch (e) { return false; }
  }
  function lowFit() {
    if (docked || !lowLayout()) {
      if (lowOn) { lowOn = false; app.style.removeProperty("--low-b"); app.style.removeProperty("--low-bub"); app.style.removeProperty("--insp"); app.classList.remove("low-side"); }
      return;
    }
    lowOn = true;
    /* measured in the plain state: on the sill (low-side) the button beside him is narrower and may wrap */
    app.style.removeProperty("--insp");
    app.classList.remove("low-side");
    var base = inspFig.clientHeight, br = bubble.getBoundingClientRect();
    var note = view === "play" ? desk.querySelector(".clue-note") : null;
    var bar = desk.querySelector(".dock.stick, .v-home .dock, .res-actions > .btn.primary, .play-dock .clue-btn");
    /* (layout heights, not drawn ones: the clue is still growing into place when this runs) */
    var nh = note ? note.offsetHeight : 0, sh = 0, side = false;
    if (bar && bar.getClientRects().length && getComputedStyle(bar).position === "fixed") { sh = Math.ceil(window.innerHeight - bar.getBoundingClientRect().top) + (bar.tagName === "BUTTON" ? 7 : 0); }
    /* From the foot of the screen up: the bar, the clue if there is one, then him, then his bubble, right
       over his hat. Where a clue leaves him no room to stand there, he sits down on the sill beside the
       button, under his clue. (While a clue is out only the question is in the bubble: what he says
       after the answer needs no room yet.) */
    var col = window.innerHeight - tbMid.parentNode.getBoundingClientRect().bottom - 18 - 6;
    /* the whole figure (small laptop windows) stands on the sill; the bust (phones) rises from behind it */
    var full = String(getComputedStyle(app).getPropertyValue("--insp-variant")).replace(/\s/g, "") === "full", min = full ? LOW_MIN_FULL : LOW_MIN;
    var b = (sh ? sh - (full ? 1 : 5) : 0) + (nh ? nh + 4 : 0), h = Math.min(base, col - Math.max(nh ? 0 : lowMax, br.height) - b);
    if (h < min) {
      if (nh && sh) { side = true; h = Math.min(base, sh - 2); b = 0; }
      /* his smallest size, for the whole screen; and only while a line is too tall for that does he
         sink a little behind the bar */
      else { h = Math.min(base, min); b = Math.max(0, Math.min(b, col - br.height - h)); }
    }
    if (side) { app.classList.add("low-side"); }
    if (h < base) { app.style.setProperty("--insp", Math.round(h) + "px"); }
    app.style.setProperty("--low-b", Math.round(b) + "px");
    app.style.setProperty("--low-bub", Math.round(side ? sh + nh + 9 : b + h + 4) + "px");
  }
  /* how far his bubble reaches up under the top bar there (the page itself cannot be too long before
     the answer: his column is pinned to the screen) */
  function lowOver() {
    if (!lowOn || docked) { return 0; }
    return Math.max(0, Math.ceil(tbMid.parentNode.getBoundingClientRect().bottom - bubble.getBoundingClientRect().top));
  }
  function fitInspector() {
    if (docked) { return; }
    lowFit();
    var v = "bust";
    try { v = String(getComputedStyle(app).getPropertyValue("--insp-variant")).replace(/\s/g, "") === "full" ? "full" : "bust"; } catch (e) { v = "bust"; }
    if (v !== inspVariant) { inspVariant = v; insp.setVariant(v); app.setAttribute("data-insp", v); }
    var h = Math.round(inspFig.clientHeight) || 120;
    if (h !== inspSize) { inspSize = h; insp.setSize(h); }
  }
  /* a piece that has just changed place appears to travel there from where it stood */
  function hopFrom(node, from) {
    if (reduced() || !from || !from.width) { return; }
    var to = node.getBoundingClientRect();
    if (!to.width) { return; }
    node.style.setProperty("--hx", (from.left - to.left).toFixed(1) + "px");
    node.style.setProperty("--hy", (from.top - to.top).toFixed(1) + "px");
    node.style.setProperty("--hs", (from.height / to.height).toFixed(3));
    node.classList.remove("hop");
    void node.offsetWidth;
    node.classList.add("hop");
  }
  /* On a small phone the scene folds away once the answer is in, and he hops down into the case note,
     beside his verdict. He is one and the same figure: only his place and his size change. */
  function dockInspector(slot, from) {
    if (!slot || docked === slot) { return; }
    docked = slot;
    slot.appendChild(insp);
    if (inspVariant !== "bust") { inspVariant = "bust"; insp.setVariant("bust"); }
    inspSize = Math.round(slot.clientHeight) || 64;
    insp.setSize(inspSize);
    hopFrom(slot, from);
  }
  function undockInspector() {
    if (!docked) { return; }
    docked = null;
    inspFig.appendChild(insp);
    inspVariant = ""; inspSize = 0;
    fitInspector();
  }
  function mood(m) { insp.setMood(m); }
  function act(m, ms) { insp.play(m, ms); }
  function talk(on) { insp.talk(on); }
  function lookAt(x, y) { if (x === null) { insp.lookAt(null); } else { insp.lookAt(x, y); } }

  var lookLock = 0, lookTimer = 0, ptrRaf = 0, ptrX = 0, ptrY = 0, ptrIdle = 0;
  function lookAtNode(node, ms) {
    if (!node || !node.getBoundingClientRect) { return; }
    var r = node.getBoundingClientRect();
    if (!r.width) { return; }
    lookAt(r.left + r.width / 2, r.top + r.height / 2);
    lookLock = now() + (ms || 1600);
    clearTimeout(lookTimer);
    lookTimer = setTimeout(function () { lookAt(null); }, ms || 1600);
  }
  var camNow = 0, parX = 0;
  function parallax() {
    if (!skA || !skB) { return; }
    var k = reduced() ? 0 : 1;
    skA.style.transform = "translate3d(" + ((camNow * -5 + parX * 5) * k).toFixed(1) + "px,0,0)";
    skB.style.transform = "translate3d(" + ((camNow * -11 + parX * 11) * k).toFixed(1) + "px,0,0)";
  }
  function onPointerFrame() {
    ptrRaf = 0;
    if (now() > lookLock) { lookAt(ptrX, ptrY); }
    parX = Math.max(-1, Math.min(1, (ptrX / Math.max(1, window.innerWidth)) * 2 - 1));
    parallax();
    clearTimeout(ptrIdle);
    ptrIdle = setTimeout(function () { if (now() > lookLock) { lookAt(null); } }, 2400);
  }
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") { return; }
    ptrX = e.clientX; ptrY = e.clientY;
    if (!ptrRaf && window.requestAnimationFrame) { ptrRaf = requestAnimationFrame(onPointerFrame); }
  }, { passive: true });

  /* ---------------------------------------------------- speech bubble */
  var speech = { id: 0, box: null, segs: [], total: 0, shown: 0, per: 20, t0: 0, raf: 0, safety: 0, tail: 0, done: true, onDone: null };

  function partsNode(parts, opts) {
    var frag = document.createDocumentFragment();
    parts.forEach(function (p) {
      if (!p || !p.html) { return; }
      var node = el("p", p.cls || "");
      var body = el("span", "b-body", rich(p.html));
      body.setAttribute("data-type", p.type === false ? "0" : "1");
      node.appendChild(body);
      frag.appendChild(node);
    });
    if (opts && opts.dots) {
      var d = el("div", "b-dots");
      for (var i = 0; i < opts.dots[1]; i++) { d.appendChild(el("i", i === opts.dots[0] ? "on" : "")); }
      frag.appendChild(d);
    }
    return frag;
  }
  /* The stage keeps the height of the tallest line still to come on this screen, so the desk below it
     does not jump from line to line or from question to question. A calm layout must never cost the
     player a control, though: where the screen is too short, the stage gives back what does not fit.
     Called again when the window changes size or the desk grows. */
  var reserve = null;
  function reserveStage(list, opts) {
    reserve = list && list.length ? { list: list, opts: opts || null } : null;
    applyReserve();
  }
  function applyReserve(whole) {
    stage.style.minHeight = "";
    var low = !docked && lowLayout();
    lowMax = 0;
    if (!reserve || docked) { if (low || lowOn) { fitInspector(); } return; }
    /* low and wide, the bubble is not part of the page's height: there the tallest line to come decides
       how much room he has under it (lowFit) */
    var box = low ? bubble : stage;
    var natural = box.offsetHeight, keep = document.createDocumentFragment(), max = natural;
    while (bText.firstChild) { keep.appendChild(bText.firstChild); }
    reserve.list.forEach(function (parts) {
      bText.textContent = "";
      bText.appendChild(partsNode(parts, reserve.opts));
      max = Math.max(max, box.offsetHeight);
    });
    bText.textContent = "";
    bText.appendChild(keep);
    if (low || lowOn) { lowMax = low ? max : 0; fitInspector(); if (low) { return; } }
    /* (also when the line on show is the tallest one: the lines after it are shorter, and must not let go) */
    stage.style.minHeight = max + "px";
    if (whole) { return; }
    var over = pageOver();
    if (over > 0) { stage.style.minHeight = Math.max(natural, max - over) + "px"; }
  }
  function collectText(node, out) {
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { out.push(c); } else if (c.nodeType === 1) { collectText(c, out); }
    }
  }
  /* each text node becomes a shown part and a hidden rest, so the bubble has its final size from the first letter */
  function splitText(root, segs) {
    var walker = [];
    collectText(root, walker);
    walker.forEach(function (tn) {
      var s = tn.nodeValue;
      if (!s) { return; }
      var tv = document.createTextNode(""), th = el("span", "th");
      th.textContent = s;
      tn.parentNode.insertBefore(tv, tn);
      tn.parentNode.insertBefore(th, tn);
      tn.parentNode.removeChild(tn);
      segs.push({ tv: tv, th: th.firstChild, s: s, n: s.length });
    });
  }
  function revealTo(count) {
    var left = count;
    for (var i = 0; i < speech.segs.length; i++) {
      var g = speech.segs[i], k = Math.max(0, Math.min(g.n, left));
      if (g.k !== k) { g.k = k; g.tv.nodeValue = g.s.slice(0, k); g.th.nodeValue = g.s.slice(k); }
      left -= g.n;
    }
    speech.shown = count;
  }
  function typeTick() {
    speech.raf = 0;
    if (speech.done) { return; }
    var want = Math.floor((now() - speech.t0) / speech.per) + 1;
    if (want >= speech.total) { finishTyping(true); return; }
    if (want > speech.shown) { revealTo(want); Sfx.play("blip"); }
    speech.raf = requestAnimationFrame(typeTick);
  }
  function stopTyping() {
    if (speech.raf) { cancelAnimationFrame(speech.raf); speech.raf = 0; }
    clearTimeout(speech.safety);
    clearTimeout(speech.tail);
    speech.done = true; speech.onDone = null;
    talk(false);
  }
  /* natural: the line reached its end by itself. The words land fast so nobody waits to read, but his
     mouth keeps going for about as long as the line takes to say. */
  function finishTyping(natural) {
    if (speech.done) { return; }
    var cb = speech.onDone;
    if (speech.raf) { cancelAnimationFrame(speech.raf); speech.raf = 0; }
    clearTimeout(speech.safety);
    clearTimeout(speech.tail);
    revealTo(speech.total);
    speech.done = true; speech.onDone = null;
    if (natural === true) { speech.tail = setTimeout(function () { talk(false); }, Math.max(350, Math.min(1500, speech.total * 22))); } else { talk(false); }
    if (cb) { cb(); }
  }
  /* parts: [{ html, cls, type }]. Only parts with type !== false are typed and read out.
     opts.into: another element to speak into (a clue note, the case note). The bubble is the default. */
  function say(parts, opts) {
    opts = opts || {};
    var box = opts.into || bText;
    if (!speech.done && speech.box !== box) { revealTo(speech.total); }
    stopTyping();
    speech.id++;
    speech.box = box;
    box.textContent = "";
    box.appendChild(partsNode(parts, opts));
    if (lowOn) { fitInspector(); }
    var segs = [], spoken = [];
    parts.forEach(function (p) { if (p && p.html && p.type !== false) { spoken.push(plain(p.html)); } });
    if (spoken.length && opts.live !== false) { announce(spoken.join(" ")); }
    var instant = opts.instant || reduced() || !window.requestAnimationFrame;
    if (!instant) {
      var bodies = box.querySelectorAll('.b-body[data-type="1"]');
      for (var i = 0; i < bodies.length; i++) { splitText(bodies[i], segs); }
    }
    speech.segs = segs; speech.total = 0; speech.shown = 0;
    segs.forEach(function (g) { g.k = -1; speech.total += g.n; });
    if (!speech.total) {
      speech.done = true;
      if (opts.onDone) { opts.onDone(); }
      return;
    }
    revealTo(0);
    speech.per = Math.max(3, Math.min(26, (opts.ms || 600) / speech.total));
    speech.t0 = now();
    speech.done = false;
    speech.onDone = opts.onDone || null;
    talk(true);
    speech.raf = requestAnimationFrame(typeTick);
    speech.safety = setTimeout(function () { finishTyping(true); }, speech.total * speech.per + 700);
  }
  function sayLine(html, opts) { say([{ html: html }], opts); }

  /* a tap anywhere that is not a control finishes the line at once */
  document.addEventListener("pointerdown", function (e) {
    kb = false;
    var t = e.target;
    if (e.pointerType && e.pointerType !== "mouse" && now() > lookLock) {
      lookAt(e.clientX, e.clientY);
      clearTimeout(ptrIdle);
      ptrIdle = setTimeout(function () { if (now() > lookLock) { lookAt(null); } }, 1500);
    }
    if (!(t && t.closest && t.closest("[data-word]"))) { hideGloss(); }
    if (speech.done) { return; }
    if (t && t.closest && t.closest("button, a, .nb, .confirm")) { return; }
    finishTyping();
  }, true);
  bubble.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("button")) { return; }
    if (!speech.done) { finishTyping(); return; }
    if (seq) { seq.next(); }
  });
  bNext.addEventListener("click", function () {
    Sfx.play("tap");
    if (!speech.done) { finishTyping(); return; }
    if (seq) { seq.next(); }
  });
  function runSequence(lines, moods, onShow) {
    var i = 0;
    function show() {
      var m = moods[i] || "idle";
      if (m.charAt(0) === "!") { act(m.slice(1), 2200); mood("idle"); } else { mood(m); }
      say([{ html: lines[i] }], { dots: lines.length > 1 ? [i, lines.length] : null });
      bNext.hidden = i >= lines.length - 1;
      if (onShow) { onShow(i); }
    }
    seq = { next: function () { if (i < lines.length - 1) { i++; show(); } } };
    show();
  }
  /* children poke the character first: a tap on him, while he has nothing to say, gets a little show.
     Never his cheer or his wince: those two mean right and wrong. */
  var POKES = ["wave", "search", "proud", "think"], pokeN = 0;
  $("insp").addEventListener("click", function () {
    if (!speech.done || docked) { return; }
    act(POKES[pokeN++ % POKES.length], 1300);
    Sfx.play("blip");
  });

  /* ---------------------------------------------------------- top bar */
  function setMid(html) { tbMid.innerHTML = html || ""; fitPips(); }
  /* Every pip of the round has its place between the buttons of the top bar. A small phone has no room
     for nine of them at full size once the streak counter is out as well: there they all get smaller
     together, rather than slide under their neighbors. */
  function fitPips() {
    var box = tbMid.querySelector(".pips");
    if (!box) { return; }
    box.style.removeProperty("--pip");
    var n = box.children.length, first = box.firstElementChild;
    if (!n || !first || !tbMid.clientWidth) { return; }
    var full = first.offsetWidth, gap = 0, used = 0;
    try { gap = parseFloat(getComputedStyle(box).columnGap) || 0; used = parseFloat(getComputedStyle(tbMid).columnGap) || 0; } catch (e) { gap = 4; used = 8; }
    var room = tbMid.clientWidth;
    for (var c = tbMid.firstElementChild; c; c = c.nextElementSibling) { if (c !== box && c.getClientRects().length) { room -= c.offsetWidth + used; } }
    /* (the pip of the question on show is drawn a little larger: 4 px of air for it) */
    var size = Math.floor((room - 4 - gap * (n - 1)) / n);
    if (size < full) { box.style.setProperty("--pip", Math.max(5, size) + "px"); }
  }
  function midFile(f, extra) { setMid('<span class="tb-file"><b>File ' + f.n + "</b>" + txt(extra || f.title) + "</span>"); }
  function setStreak(n) {
    streakN.textContent = n;
    var show = n >= 2;
    if (streakEl.hidden === show) { streakEl.hidden = !show; fitPips(); }
    if (show) { streakEl.classList.remove("bump"); void streakEl.offsetWidth; streakEl.classList.add("bump"); }
  }
  function syncSound() {
    soundBtn.setAttribute("aria-pressed", save.sound ? "true" : "false");
    soundBtn.setAttribute("aria-label", "Sound effects");
    soundBtn.setAttribute("title", save.sound ? "Sound effects are on" : "Sound effects are off");
  }
  /* the background music: js/music.js plays it, the game remembers whether it is on and which piece it was */
  /* (music/list.js names the pieces; while it names none, the game shows no music button and stays silent) */
  /* no pieces, or a browser that cannot make sound: no music button, no music block */
  var MUSIC = window.Music && typeof window.Music.count === "function" && window.Music.count() > 0 && (window.AudioContext || window.webkitAudioContext) ? window.Music : null;
  function musicLine(m) {
    if (!save.music) { return "The music is switched off."; }
    if (m && m.failed) { return "The music could not be loaded. Tap Next piece to try again."; }
    if (m && m.title && m.playing) { return "Now playing: " + m.title + (m.marking ? " (" + m.marking + ")" : ""); }
    if (m && m.title) { return "Coming up: " + m.title; }
    return "The music starts with your first tap.";
  }
  function syncMusic() {
    var m = null, line, t = $("muTitle"), b = $("muToggle"), nx = $("muNext");
    try { m = MUSIC ? MUSIC.now() : null; } catch (e) { m = null; }
    if (musicBtn) {
      musicBtn.hidden = !MUSIC;
      musicBtn.setAttribute("aria-pressed", save.music ? "true" : "false");
      musicBtn.setAttribute("title", save.music ? "Music is on" : "Music is off");
    }
    if (t) {
      line = musicLine(m);
      if (t.textContent !== line) { t.textContent = line; }
    }
    if (b) { b.setAttribute("aria-pressed", save.music ? "true" : "false"); b.textContent = save.music ? "Music: on" : "Music: off"; }
    if (nx) { nx.disabled = !save.music; }
  }

  /* ----------------------------------------------------------- views */
  var CAM = { home: 0, briefing: 1, training: 2, play: 2, results: 3 };
  function setView(name, node, opts) {
    clearViewTimers();
    stopTyping();
    hideGloss();
    dropLens();
    dropScene();
    dropLessonScene();
    undockInspector();
    seq = null;
    bNext.hidden = true;
    reserve = null;
    stage.style.minHeight = "";
    app.classList.remove("compact");
    app.classList.remove("terse");
    app.classList.remove("brief-small");
    app.style.removeProperty("--insp");
    nbBtn.classList.remove("point");
    lookAt(null);
    view = name;
    app.setAttribute("data-view", name);
    homeBtn.hidden = name === "home";
    desk.textContent = "";
    desk.appendChild(node);
    if (!(opts && opts.keepScroll)) { try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } }
    fitInspector();
    camNow = CAM[name] || 0;
    parallax();
    if (name !== "play") { setStreak(0); }
    if (kb) { try { desk.focus({ preventScroll: true }); } catch (e2) { /* ignore */ } }
  }
  function primaryBtn() {
    var list = document.querySelectorAll("[data-primary]");
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.disabled || !b.getClientRects().length) { continue; }
      if (getComputedStyle(b).visibility === "hidden") { continue; }
      return b;
    }
    return null;
  }
  /* On a single-column screen that is too short for everything, the Inspector gives up some of his
     height so that `last` (the bottom-most thing the player needs) stays on the screen. */
  var INSP_MIN = 84;
  function squeezeInspector(last, page, whole) {
    if (docked || wideLayout() || !last) { return; }
    var pinned = !!page || last.classList.contains("stick");
    for (var n = 0; n < 8; n++) {
      /* a bar that is pinned to the bottom of the screen is always "on screen": there the page itself must fit */
      var over = pinned ? pageOver() : Math.ceil(last.getBoundingClientRect().bottom + (window.pageYOffset || 0) - window.innerHeight);
      var h = Math.round(inspFig.clientHeight);
      if (over <= 0 || h <= INSP_MIN) { return; }
      app.style.setProperty("--insp", Math.max(INSP_MIN, h - Math.max(over, 8)) + "px");
      fitInspector();
      applyReserve(whole);
    }
  }

  /* ---------------------------------------------------- sparkle effects */
  var fxTimer = 0, PAPER = ["#f4b730", "#ffe39a", "#e2584f", "#fffaf0", "#b3202a", "#e2a93c", "#1e3a6e"];
  /* Confetti falls over the scene and the verdict, and has faded before it reaches the buttons under
     them: stopAt is the screen line where the last piece is gone. */
  function confetti(count, stopAt) {
    if (reduced()) { return; }
    var w = window.innerWidth, fall = Math.max(160, Math.min(window.innerHeight, stopAt || window.innerHeight));
    for (var i = 0; i < count; i++) {
      var c = el("i", "cf");
      c.style.left = (Math.random() * 100) + "%";
      c.style.background = PAPER[i % PAPER.length];
      c.style.setProperty("--dx", ((Math.random() - 0.5) * Math.min(260, w * 0.5)).toFixed(0) + "px");
      c.style.setProperty("--fall", (fall * (0.7 + Math.random() * 0.3)).toFixed(0) + "px");
      c.style.setProperty("--rot", (360 + Math.random() * 720).toFixed(0) + "deg");
      c.style.setProperty("--d", (1.05 + Math.random() * 0.55).toFixed(2) + "s");
      c.style.setProperty("--dl", (Math.random() * 0.22).toFixed(2) + "s");
      if (i % 3 === 0) { c.style.borderRadius = "50%"; c.style.height = "9px"; }
      fx.appendChild(c);
    }
    clearTimeout(fxTimer);
    fxTimer = setTimeout(function () { fx.textContent = ""; }, 2300);
  }
  function fxAt(cls, node, n, spread, up) {
    if (reduced() || !node) { return; }
    var r = node.getBoundingClientRect();
    if (!r.width) { return; }
    var made = [], w = window.innerWidth, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < n; i++) {
      var s = el("i", cls), a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = spread * (0.55 + Math.random() * 0.45);
      /* nothing that flies may leave the screen sideways */
      var dx = Math.max(8 - cx, Math.min(w - 8 - cx, Math.cos(a) * d)), dy = Math.sin(a) * d * 0.8 - up;
      s.style.left = cx + "px";
      s.style.top = cy + "px";
      s.style.setProperty("--dx", dx.toFixed(0) + "px");
      s.style.setProperty("--dy", dy.toFixed(0) + "px");
      if (cls === "bit") {
        s.style.background = PAPER[i % PAPER.length];
        s.style.setProperty("--rot", (180 + Math.random() * 540).toFixed(0) + "deg");
      }
      fx.appendChild(s);
      made.push(s);
    }
    setTimeout(function () { made.forEach(function (s) { if (s.parentNode) { s.parentNode.removeChild(s); } }); }, 1000);
  }
  /* a few brass sparks around a small thing, or a burst of paper from a big moment */
  function sparks(node, n) { if (node) { fxAt("spark", node, n, Math.min(46, node.getBoundingClientRect().width * 0.9), 0); } }
  function burst(node, n) { fxAt("bit", node, n, Math.min(150, window.innerWidth * 0.36), 34); }

  /* ---------------------------------------------- shared building blocks */
  function starsHtml(n, cls) {
    var h = '<span class="' + (cls || "stars") + '" role="img" aria-label="' + n + ' of 3 stars">';
    for (var i = 0; i < 3; i++) { h += '<svg viewBox="0 0 24 24"' + (i < n ? ' class="on"' : "") + ' aria-hidden="true" focusable="false"><use href="#i-star"></use></svg>'; }
    return h + "</span>";
  }
  function pic(id, cls) { return '<svg class="' + cls + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><use href="#' + id + '"></use></svg>'; }
  /* an answer is shown in its case color only when it names the case itself */
  function caseOfOption(o) {
    var c = D.cases[o.k];
    if (!c) { return null; }
    if (String(o.label).indexOf(c.name) === 0 || o.sub === c.name) { return o.k; }
    return null;
  }
  function optionChip(o, extra) {
    var ck = D.cases[o.k] ? o.k : null;
    return '<span class="chip' + (o.latin ? " latin" : "") + (ck && !o.latin ? " c-" + ck : "") + (extra ? " " + extra : "") + '"' + (o.latin ? ' lang="la"' : "") + ">" + esc(o.label) + "</span>";
  }
  /* the words that tie an answer to its case: printed beside the right answer in the verdict */
  function jobOf(o) {
    var cs = D.cases[o.k];
    if (o.sub) { return o.sub; }
    if (!cs) { return ""; }
    return String(o.label).indexOf(cs.name) === 0 ? cs.question : cs.name;
  }
  /* gap: the mystery word is the answer itself and must not be given away, so its place is only named */
  function sentenceString(words, gap) { return words.map(function (w) { return (gap && w.t ? "(missing word)" : w.w) + (w.after || ""); }).join(" "); }
  function sentenceText(words, markTarget) {
    return words.map(function (w) {
      var t = esc(w.w);
      if (markTarget && w.t) { t = "<mark>" + t + "</mark>"; }
      return t + (w.after ? esc(w.after) : "");
    }).join(" ");
  }
  function wordLabel(w) {
    if (!w.r) { return null; }
    var c = caseInfo(w.r);
    if (!c) { return null; }
    var tag = w.tag || c.tag, s = el("span", "w-lab");
    s.setAttribute("lang", "en");
    s.innerHTML = "<b>" + esc(c.name) + "</b>" + (tag && String(tag).toLowerCase() !== String(c.name).toLowerCase() ? "<span>" + esc(tag) + "</span>" : "");
    return s;
  }
  /* The sentence under investigation. Every word is a button (tap it for its meaning). The mystery
     word is boxed in gold and wears a "?" until its job is known. Each word's job label hangs under it.
     gap: the mystery word is the answer itself (file 2). Its place is an empty slot with the "?" in it,
     and the word is nowhere in the page (text, label, pop-up) until the answer is in: see fillGap. */
  var gloss = null, glossTimer = 0;
  function buildScroll(words, gap) {
    var wrap = el("div", "scroll-wrap"), sc = el("div", "scroll"), row = el("div", "s-row");
    sc.setAttribute("lang", "la");
    sc.setAttribute("role", "group");
    sc.setAttribute("aria-label", sentenceString(words, gap));
    var tag = el("span", "ev-tag", "Evidence");
    tag.setAttribute("aria-hidden", "true");
    wrap.appendChild(tag);
    words.forEach(function (w, i) {
      var hole = !!(gap && w.t);
      var u = el("span", "wu" + (w.r && caseInfo(w.r) ? " c-" + w.r : ""));
      u.style.setProperty("--i", i);
      var b = el("button", "w" + (w.t ? " t" : "") + (hole ? " gap" : ""), hole
        ? '<span class="w-t"> <span class="w-q" aria-hidden="true">?</span></span><span class="sr" lang="en">the missing word</span>' + (w.after ? esc(w.after) : "")
        : '<span class="w-t">' + esc(w.w) + "</span>" + (w.after ? esc(w.after) : "") +
          (w.t ? '<span class="sr" lang="en">, the highlighted word</span><span class="w-q" aria-hidden="true">?</span>' : ""));
      b.type = "button";
      b.setAttribute("data-word", i);
      u.appendChild(b);
      var lab = wordLabel(w);
      /* In a gap question no label is written before the answer, not even out of sight: one of them may
         name the missing word (the tag "describes rosās"). An empty holder keeps its place and its
         width (sizeGap); fillGap writes the labels when the answer is in. */
      if (lab && gap) { lab.textContent = ""; }
      if (lab) { u.appendChild(lab); }
      row.appendChild(u);
    });
    sc.appendChild(row);
    wrap.appendChild(sc);
    gloss = el("div", "gloss");
    gloss.setAttribute("role", "status");
    wrap.appendChild(gloss);
    return wrap;
  }
  /* Which words start a new row: as few rows as will hold the words, then the most even split. */
  function rowCuts(w, avail) {
    var n = w.length, i, k = 1, run = 0, best = [], bestScore = Infinity;
    for (i = 0; i < n; i++) {
      if (run && run + w[i] > avail) { k++; run = 0; }
      run += w[i];
    }
    if (k === 1) { return best; }
    function cut(start, rowsLeft, cuts, worst, over) {
      var sum = 0, e;
      if (rowsLeft === 1) {
        for (e = start; e < n; e++) { sum += w[e]; }
        var score = (over + Math.max(0, sum - avail)) * 1000 + Math.max(worst, sum);
        if (score < bestScore) { bestScore = score; best = cuts; }
        return;
      }
      for (e = start; e <= n - rowsLeft; e++) {
        sum += w[e];
        cut(e + 1, rowsLeft - 1, cuts.concat([e + 1]), Math.max(worst, sum), over + Math.max(0, sum - avail));
      }
    }
    cut(0, k, [], 0, 0);
    return best;
  }
  /* The rows are worked out from the width each word needs once its label hangs under it. So no word
     changes row when the labels appear, and no label ever has to wrap, squeeze or touch its neighbor. */
  /* The empty slot of a gap question is as wide as the widest of the forms that could go into it. So its
     width says nothing about the answer, and no word moves when the right form drops in. (Every answer
     is measured, never the right one alone; they are all on the cards anyway.) */
  function swapWord(text, form, by) {
    var low = String(text).toLowerCase(), f = String(form).toLowerCase(), out = "", from = 0, p;
    while (f && (p = low.indexOf(f, from)) >= 0) { out += text.slice(from, p) + by; from = p + f.length; }
    return out + text.slice(from);
  }
  function sizeGap(sc) {
    var b = sc.querySelector(".w.gap, .w.filled"), c = view === "play" && R ? R.cur : null;
    if (!b || !c || !c.q.words) { return; }
    var words = c.q.words, hole = words[+b.getAttribute("data-word")], slot = b.querySelector(".w-t"), max = 0;
    if (!slot || !hole) { return; }
    var first = String(hole.w).charAt(0), cap = first !== first.toLowerCase();
    var probe = el("span", "w-t");
    probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;min-width:0;white-space:nowrap";
    probe.setAttribute("aria-hidden", "true");
    b.appendChild(probe);
    c.opts.forEach(function (o) {
      var s = String(o.label);
      probe.textContent = cap ? s.charAt(0).toUpperCase() + s.slice(1) : s;
      max = Math.max(max, probe.getBoundingClientRect().width);
    });
    b.removeChild(probe);
    if (max > 0) { slot.style.minWidth = Math.ceil(max) + "px"; }
    /* The labels: each one's place is as wide as the label that will hang there, so the rows are right
       from the start. A label that names the missing word is measured with every form in its place. */
    var units = sc.querySelectorAll(".wu"), hidden = String(hole.w).toLowerCase();
    for (var i = 0; i < units.length; i++) {
      var wb = units[i].querySelector(".w"), hold = units[i].querySelector(".w-lab"), w = wb ? words[+wb.getAttribute("data-word")] : null;
      if (!hold || !w || !wordLabel(w)) { continue; }
      var tag = String(w.tag || ""), list = [w], wide = 0;
      if (tag.toLowerCase().indexOf(hidden) >= 0) { list = c.opts.map(function (o) { return { r: w.r, tag: swapWord(tag, hole.w, String(o.label)) }; }); }
      for (var n = 0; n < list.length; n++) {
        var lp = wordLabel(list[n]);
        lp.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;height:auto;min-width:0";
        lp.setAttribute("aria-hidden", "true");
        units[i].appendChild(lp);
        wide = Math.max(wide, lp.getBoundingClientRect().width);
        units[i].removeChild(lp);
      }
      if (wide > 0) { hold.style.minWidth = Math.ceil(wide) + "px"; }
    }
  }
  function layoutScroll() {
    var sc = desk.querySelector(".scroll");
    if (!sc || !sc.getClientRects().length) { return; }
    sizeGap(sc);
    var units = sc.querySelectorAll(".wu"), n = units.length, i, w = [];
    if (!n) { return; }
    var gap = parseFloat(getComputedStyle(units[0]).marginLeft) * 2 || 0;
    for (i = 0; i < n; i++) { w.push(Math.ceil(units[i].getBoundingClientRect().width + gap)); }
    var cs = getComputedStyle(sc);
    var avail = sc.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    var cuts = rowCuts(w, avail), key = "r" + cuts.join(",");
    if (sc.getAttribute("data-rows") === key) { return; }
    var a = document.activeElement, hadFocus = !!(a && sc.contains(a));
    sc.setAttribute("data-rows", key);
    var frag = document.createDocumentFragment(), row = null;
    for (i = 0; i < n; i++) {
      if (!row || cuts.indexOf(i) >= 0) { row = el("div", "s-row"); frag.appendChild(row); }
      row.appendChild(units[i]);
    }
    sc.textContent = "";
    sc.appendChild(frag);
    if (hadFocus) { try { a.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    placeLens();
  }
  function hideGloss() {
    clearTimeout(glossTimer);
    if (gloss) { gloss.classList.remove("on"); }
  }
  /* the meaning opens beside the word, on the side where it covers no other word of the sentence */
  function showGloss(btn, w) {
    if (!gloss || !btn || !w) { return; }
    var wrap = gloss.parentNode, row = btn.closest ? btn.closest(".s-row") : null;
    /* the empty slot of a gap question: what is missing in English, never a Latin form */
    if (btn.classList.contains("gap")) { gloss.innerHTML = "<b>?</b> Which form of “" + esc(String(w.g || "").split(",")[0]) + "” goes here?"; }
    else { gloss.innerHTML = '<b lang="la">' + esc(w.lemma) + ":</b> " + esc(w.g); }
    gloss.style.left = "0px"; gloss.style.top = "0px";
    var r = btn.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), gw = gloss.offsetWidth, gh = gloss.offsetHeight;
    var left = Math.max(0, Math.min(wr.width - gw, r.left + r.width / 2 - wr.left - gw / 2));
    var above = !!(row && row.nextElementSibling), top = above ? r.top - wr.top - gh - 2 : r.bottom - wr.top + 3;
    if (!above && lowLayout()) {
      /* The last row: under the word. But on a phone on its side the answers begin right there, and the
         meaning would lie on their names. There it opens under the answers, where the tip about tapping
         words stands (the clue button is in his column), or else above the word if that is clear of the
         top bar. */
      var ans = desk.querySelector(".answers:not(.ghost)"), ar = ans && ans.getClientRects().length ? ans.getBoundingClientRect() : null;
      if (ar && ar.top - r.bottom - 3 < gh && ar.top >= r.bottom - 1) {
        if (ar.bottom + 4 + gh <= window.innerHeight - 2) { top = ar.bottom - wr.top + 4; }
        else if (r.top - gh - 2 >= tbMid.parentNode.getBoundingClientRect().bottom + 2) { top = r.top - wr.top - gh - 2; }
      }
    }
    gloss.style.left = left + "px";
    gloss.style.top = top + "px";
    gloss.classList.add("on");
    clearTimeout(glossTimer);
    glossTimer = setTimeout(hideGloss, 4500);
    if (!save.seen.gloss) {
      save.seen.gloss = true;
      persist();
      var h = desk.querySelector(".gloss-hint");
      if (h) { h.classList.add("used"); }
    }
    lookAtNode(btn, 1200);
  }
  function revealWords(indexes) {
    var units = desk.querySelectorAll(".wu");
    for (var i = 0; i < units.length; i++) {
      if (!indexes || indexes.indexOf(i) >= 0) { units[i].classList.add("show"); }
    }
  }
  /* The answer is in: the right form drops into the empty slot, exactly as the sentence prints it (with
     its capital at the start of a sentence). Only ever the right form: a wrong pick does not go in. */
  function fillGap(v, q) {
    var b = v.querySelector(".scroll .w.gap");
    if (!b || !q.words) { return; }
    var w = q.words[+b.getAttribute("data-word")], slot = b.querySelector(".w-t"), sr = b.querySelector(".sr"), sc = v.querySelector(".scroll");
    if (!w || !slot) { return; }
    slot.textContent = w.w;
    slot.classList.add("drop");
    b.classList.remove("gap");
    b.classList.add("filled");
    if (sr) { sr.textContent = ", the highlighted word"; }
    if (sc) { sc.setAttribute("aria-label", sentenceString(q.words)); }
    /* and now the labels may be written (see buildScroll) */
    var units = v.querySelectorAll(".scroll .wu");
    for (var i = 0; i < units.length; i++) {
      var wb = units[i].querySelector(".w"), hold = units[i].querySelector(".w-lab"), real = wb && q.words[+wb.getAttribute("data-word")] ? wordLabel(q.words[+wb.getAttribute("data-word")]) : null;
      if (hold && real) { hold.innerHTML = real.innerHTML; }
    }
  }
  /* His magnifying glass. When a clue talks about words of the sentence, the glass leaves his hand and
     visits them in the order he names them. It settles on the end of each word, because the ending is
     where the evidence is, and each word it has visited keeps a ring. */
  var lens = null, lensAt = null, lensTimers = [];
  function dropLens() {
    lensTimers.forEach(function (t) { clearTimeout(t); });
    lensTimers = [];
    if (lens && lens.parentNode) { lens.parentNode.removeChild(lens); }
    lens = null; lensAt = null;
  }
  function placeLens(btn) {
    if (btn) { lensAt = btn; }
    if (!lens || !lensAt || !lens.parentNode) { return; }
    var r = lensAt.getBoundingClientRect(), wr = lens.parentNode.getBoundingClientRect();
    if (!r.width) { return; }
    lens.style.transform = "translate3d(" + (r.right - wr.left - 27).toFixed(1) + "px," + (r.top - wr.top + r.height * 0.5 - 22).toFixed(1) + "px,0)";
  }
  function ringWord(b) { b.classList.add("ev"); }
  function tourEvidence(btns, walk, done) {
    dropLens();
    if (!btns.length) { done(); return; }
    var wrap = btns[0].closest ? btns[0].closest(".scroll-wrap") : null;
    if (!walk || reduced() || !wrap) {
      btns.forEach(ringWord);
      if (walk) { btns.forEach(function (b) { scenePulse(+b.getAttribute("data-word")); }); }
      lookAtNode(btns[0], 1500);
      done();
      return;
    }
    var step = 900;
    lens = el("span", "lens", '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><use href="#i-lens"></use></svg>');
    lens.setAttribute("aria-hidden", "true");
    wrap.appendChild(lens);
    placeLens(btns[0]);
    var fr = inspFig.getBoundingClientRect(), lr = lens.getBoundingClientRect();
    lens.style.setProperty("--fx", (fr.left + fr.width * 0.3 - lr.left).toFixed(0) + "px");
    lens.style.setProperty("--fy", (fr.top + fr.height * 0.6 - lr.top).toFixed(0) + "px");
    lens.classList.add("fly");
    btns.forEach(function (b, i) {
      lensTimers.push(setTimeout(function () {
        if (i) { placeLens(b); }
        lookAtNode(b, step + 300);
      }, i * step));
      lensTimers.push(setTimeout(function () { scenePulse(+b.getAttribute("data-word")); }, i * step + 300));
      lensTimers.push(setTimeout(function () { ringWord(b); b.classList.add("seen"); }, i * step + 380));
    });
    lensTimers.push(setTimeout(function () {
      if (lens) { lens.classList.add("away"); }
      try { done(); } catch (e) { /* ignore */ }
    }, btns.length * step + 150));
    lensTimers.push(setTimeout(dropLens, btns.length * step + 650));
  }
  /* ------------------------------------------- pictures of the sentence (request 4)
     scenes.js draws a small animated picture of what a sentence says: who does it, what gets the
     action, who receives it, whose it is, who is spoken to. The game decides where it lies and when.
     - A question whose prompt already says the sentence in English (a choice question with Latin
       words: files 1 and 2) has its picture from the start, with a "?" on the mystery word's figure,
       and the picture is solved when the answer is in.
     - A sentence question (files 3 and 4) and the training case get it only after the answer: before,
       the picture would give the job away.
     Where it lies is the stylesheet's word (--scn on .app): "stack", a strip under the evidence (tall
     phones, tablets held upright), or "side", a place of its own at the right foot of the desk: beside
     the clue button, and after the answer beside the case note with the way on under it (laptops,
     tablets on their side). Anything else: this screen has no room for a picture.
     Its box is laid down first, in the picture's shape (Scenes.aspect), and the picture is drawn only
     when the screen has been seen to hold it, so nothing jumps. The picture never takes anything from
     the question: where the screen would have to give up a line, a label or the calm of its stage, the
     picture goes instead. Without scenes.js, or for words it cannot draw, none of this happens and the
     game is as it was. */
  var SC = null, SIDE_NOTE_MIN = 260, SCN_MIN = 326;
  function scenesOn() { var S = window.Scenes; return !!(S && typeof S.create === "function" && typeof S.canDraw === "function"); }
  function canScene(words, hints) {
    try { return scenesOn() && !!(words && words.length) && !!window.Scenes.canDraw(words, hints || null); } catch (e) { return false; }
  }
  function sceneLay() {
    var s = "";
    try { s = String(getComputedStyle(app).getPropertyValue("--scn")).replace(/[\s"']/g, ""); } catch (e) { s = ""; }
    return s === "stack" || s === "side" || s === "late" ? s : "";
  }
  function sceneRatio() { var a = scenesOn() ? +window.Scenes.aspect : 0; return a > 1 && a < 8 ? a : 3.2; }
  /* each size of a picture has its own layout of the labels: the box's width says which one is meant */
  function sceneSizeOf(box) { var w = box.clientWidth; return w >= 640 ? "l" : (w >= 480 ? "m" : "s"); }
  function sceneSrc(o) { return { words: o.words, hints: o.scene || null, gap: !!o.gap, alt: plain(o.translation || "") }; }
  function dropScene() {
    if (!SC) { return; }
    var s = SC, v = s.box.parentNode;
    SC = null;
    try { if (s.ctl) { s.ctl.destroy(); } } catch (e) { /* ignore */ }
    if (v) { v.removeChild(s.box); v.classList.remove("scn-side"); v.classList.remove("scn-stack"); }
  }
  /* the box of the picture, in its place and in its shape, still empty (lay: "stack" or "side") */
  function layScene(v, src, lay) {
    dropScene();
    if (!v || !lay || !canScene(src.words, src.hints)) { return false; }
    var box = el("div", "scn-box"), ev = v.querySelector(".scroll-wrap"), dock = v.querySelector(".dock");
    box.style.setProperty("--scn-ar", String(sceneRatio()));
    if (lay === "side" && dock) { v.insertBefore(box, dock); } else { v.insertBefore(box, ev ? ev.nextSibling : v.firstChild); }
    v.classList.add("scn-" + lay);
    SC = { box: box, ctl: null, src: src, lay: lay, tier: sceneLay(), size: "", mode: "" };
    /* the smallest picture is drawn for a width of 320: much narrower, and its labels get too small */
    if (box.clientWidth < SCN_MIN) { dropScene(); return false; }
    return true;
  }
  /* the picture itself, drawn into its box once the box has been seen to fit */
  function drawScene(mode) {
    if (!SC || SC.ctl) { return; }
    var s = SC, ctl = null;
    s.size = sceneSizeOf(s.box);
    try { ctl = window.Scenes.create(s.src.words, { cases: D.cases, hints: s.src.hints, mode: mode, gap: s.src.gap, size: s.size, alt: s.src.alt }); } catch (e) { ctl = null; }
    if (!ctl || !ctl.el) { dropScene(); return; }
    s.ctl = ctl;
    s.mode = mode;
    s.box.appendChild(ctl.el);
  }
  function sceneResize() {
    if (!SC || !SC.ctl) { return; }
    var size = sceneSizeOf(SC.box);
    if (size !== SC.size) { SC.size = size; try { SC.ctl.setSize(size); } catch (e) { /* ignore */ } }
  }
  /* the figure of word i beats once: the glass is on that word, or a finger */
  function scenePulse(i) { if (SC && SC.ctl && i >= 0) { try { SC.ctl.pulse(i); } catch (e) { /* ignore */ } } }
  /* A tablet's Inspector takes the room the desk leaves him (the stylesheet sizes him by the height of
     the screen). There he gives some of it back, to the picture or to a long case note, down to the
     size he has on the smallest tablet. (whole: the stage keeps its full height for the lines to come.) */
  function spareInspector(whole) {
    if (docked || wideLayout() || window.innerWidth < 600) { return; }
    var floor = inspVariant === "full" ? 190 : 120;
    for (var n = 0; n < 6; n++) {
      var over = pageOver(), h = Math.round(inspFig.clientHeight);
      if (over <= 0 || h <= floor) { return; }
      app.style.setProperty("--insp", Math.max(floor, h - over) + "px");
      fitInspector();
      applyReserve(whole);
    }
  }
  /* before the answer: a question that says its sentence in English may show it as a picture */
  function sceneAsk() {
    var c = R && R.cur, v = desk.querySelector(".v-play"), lay = sceneLay();
    if (view !== "play" || !c || c.answered || !v || !lay || lay === "late" || SC || !c.q.words || c.q.type === "sentence") { return; }
    /* a screen that had to make room for the question itself has none for a picture */
    if (v.classList.contains("snug") || v.classList.contains("tight") || v.classList.contains("no-ev") || app.classList.contains("terse") || app.style.getPropertyValue("--insp")) { return; }
    var wide = wideLayout();
    applyReserve(true);
    if (pageOver() <= 0 && layScene(v, sceneSrc(c.q), lay)) {
      applyReserve(true);
      if (pageOver() > 0) { spareInspector(true); }
      if (pageOver() > 0) { dropScene(); app.style.removeProperty("--insp"); fitInspector(); } else { drawScene("ask"); }
    }
    applyReserve(wide);
    fitKeys();
  }
  /* The answer is in. The picture that is on the desk stays where the answered screen has it; a
     sentence question gets its box now. (It is drawn, or solved, by sceneSettle when the screen has
     been fitted: the note, the Inspector's place and the spacing come first.) */
  function sceneAnswered(v, q) {
    var lay = sceneLay(), src = sceneSrc(q), keep = !!(SC && SC.tier === lay && SC.box.parentNode === v);
    if (!lay || lay === "late" || !canScene(src.words, src.hints)) { dropScene(); return; }
    if (!keep && !layScene(v, src, lay)) { return; }
    /* beside the case note only where the note keeps at least the width it has on a phone */
    if (lay === "side") {
      var sheet = v.querySelector(".sheet");
      if (sheet && sheet.getBoundingClientRect().width < SIDE_NOTE_MIN) { dropScene(); }
    }
  }
  /* A phone of middle height ("late") has no room for a picture beside the question. It gets one after
     the answer, as a strip under the sentence, where the answered screen (fitted without it) still has
     the room as it stands: after most right answers, seldom after a wrong one, whose note is longer. */
  function sceneLate(v, q) {
    if (sceneLay() !== "late" || !v) { return; }
    if (SC) { SC.box.hidden = false; } else if (!layScene(v, sceneSrc(q), "stack")) { return; }
    if (pageOver() > 0) { dropScene(); }
  }
  function sceneSettle() {
    if (!SC) { return; }
    if (!SC.ctl) { drawScene("solved"); return; }
    if (SC.mode === "ask") { SC.mode = "solved"; try { SC.ctl.solve(); } catch (e) { /* ignore */ } }
    sceneResize();
  }
  /* the answered screen cannot hold the picture: it goes, and the screen is fitted again without it */
  function sceneGiveAnswered() {
    dropScene();
    if (app.classList.contains("compact")) { app.classList.remove("compact"); undockInspector(); }
    app.style.removeProperty("--insp");
    fitInspector();
    sayReaction(true);
    fitAnswered(false);
    trimAnswered();
  }
  /* The training case: its picture comes when the suspect is found, as a strip under the sentence, and
     only where the screen holds it as it stands (trainFit takes it away again if a later step needs
     the room). */
  function sceneTrain() {
    var v = T && T.view, wide = wideLayout();
    if (!v || SC || !sceneLay() || pageOver() > 0) { return; }
    var was = app.style.getPropertyValue("--insp"), from = inspFig.getBoundingClientRect();
    if (!layScene(v, sceneSrc(T.tr), "stack")) { return; }
    applyReserve();
    trainHold(wide);
    /* (a tablet's Inspector gives some of his height, as he does for the picture of a question) */
    if (pageOver() > 0) { spareInspector(false); }
    if (pageOver() > 0) { dropScene(); inspBack(was); applyReserve(); trainHold(wide); return; }
    SC.inspWas = was;
    if (Math.abs(inspFig.getBoundingClientRect().height - from.height) > 3) { hopFrom(inspFig, from); }
    drawScene("solved");
  }
  /* his height as it was before he made room for a picture that has gone again */
  function inspBack(was) {
    if (app.style.getPropertyValue("--insp") === was) { return; }
    if (was) { app.style.setProperty("--insp", was); } else { app.style.removeProperty("--insp"); }
    fitInspector();
  }
  /* The lesson card of a briefing has the picture of its sentence too (mode "lesson": only the word of
     this lesson stands in the light). One sentence, one picture: the next lesson on the same sentence
     moves the light. */
  var LS = null;
  function dropLessonScene() {
    if (!LS) { return; }
    var s = LS;
    LS = null;
    try { s.ctl.destroy(); } catch (e) { /* ignore */ }
    if (s.ctl.el && s.ctl.el.parentNode) { s.ctl.el.parentNode.removeChild(s.ctl.el); }
  }
  function lessonScene(holder, ls, ti) {
    if (LS && !sameWords(LS.words, ls.words)) { dropLessonScene(); }
    if (!LS) {
      if (!canScene(ls.words, ls.scene)) { return; }
      var ctl = null;
      try { ctl = window.Scenes.create(ls.words, { cases: D.cases, hints: ls.scene || null, mode: "lesson", gap: false, size: "s", alt: plain(ls.translation || "") }); } catch (e) { ctl = null; }
      if (!ctl || !ctl.el) { return; }
      LS = { words: ls.words, ctl: ctl };
    } else { try { LS.ctl.setTarget(ti); } catch (e2) { /* ignore */ } }
    if (LS.ctl.el.parentNode !== holder) { holder.appendChild(LS.ctl.el); }
  }

  /* The three -ae suspects get a face: an owner holding a name tag (whose?), someone holding a gift
     (who receives?), and a pair (who does it? more than one). Only where the answers are those three. */
  function portraitFor(o) {
    var id = null;
    if (/singular|plural/i.test(String(o.label))) { id = o.k === "gen" ? "p-owner" : (o.k === "dat" ? "p-receiver" : (o.k === "nom" ? "p-pair" : null)); }
    return id ? pic(id, "o-pic") : "";
  }
  function buildAnswers(opts) {
    var box = el("div", "answers n" + opts.length + (opts[0] && opts[0].latin ? " latin" : ""));
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Answers");
    /* the faces belong to the three -ae suspects as a set, never to some cards of another set of answers
       (such as "Accusative plural" beside "Genitive plural") */
    var faces = opts.length === 3 && opts.every(function (o) { return !!portraitFor(o); });
    opts.forEach(function (o, i) {
      var ck = caseOfOption(o), p = faces ? portraitFor(o) : "";
      var b = el("button", "opt" + (o.latin ? " latin" : "") + (ck ? " colored c-" + ck : "") + (p ? " has-pic" : ""));
      b.type = "button";
      b.setAttribute("data-k", o.k);
      b.innerHTML = '<span class="o-key" aria-hidden="true">' + (i + 1) + "</span>" + p + '<span class="o-txt"><span class="o-lab"' + (o.latin ? ' lang="la"' : "") + ">" + esc(o.label) + "</span>" +
        (o.sub ? '<span class="o-sub">' + esc(o.sub) + "</span>" : "") + '<span class="o-stamp" aria-hidden="true">' + esc(L.eliminated) + '</span></span><span class="o-mark" aria-hidden="true"></span>';
      box.appendChild(b);
    });
    return box;
  }
  /* No answer may ever be cut off by its card. The stylesheet puts four Latin forms in one row only
     where the longest of them fits; this is the measured net under it, for the fonts, zoom levels and
     window sizes nobody planned for. A label that is wider than its box sends the four cards back to
     two columns (three cards in a row give up the air at their sides); if it still does not fit, the
     type of the labels steps down (never under 17 px), then the number keys give up their badges; and
     should even that fail, the word is allowed to break rather than to hide its ending.
     Run after the cards are built, and again when the window, the fonts or a card change. */
  var LAB_MIN = 17;
  /* true when the text of a label is wider than the room it has (less `spare` px of air) */
  function labOver(lab, spare) {
    var room = lab.getBoundingClientRect().width, need = lab.scrollWidth > lab.clientWidth ? lab.scrollWidth : 0, rg;
    if (!room) { return false; }
    try { rg = document.createRange(); rg.selectNodeContents(lab); need = Math.max(need, rg.getBoundingClientRect().width); } catch (e) { /* keep the box's own figure */ }
    return need + spare > room + 0.5;
  }
  function labelOver(box, spare) {
    var labs = box.querySelectorAll(".o-lab");
    for (var i = 0; i < labs.length; i++) { if (labOver(labs[i], spare)) { return true; } }
    return false;
  }
  /* The right or wrong mark of a card may never lie on its words, and where it stands in a row with the
     label it may not take the room a long word needs. (Asked while the box is in "probe": no word breaks.) */
  function markHits(box) {
    var list = box.querySelectorAll(".opt.right, .opt.wrong"), rg = null, i, j, k;
    try { rg = document.createRange(); } catch (e) { rg = null; }
    for (i = 0; i < list.length; i++) {
      var m = list[i].querySelector(".o-mark"), mr = m ? m.getBoundingClientRect() : null, lab = list[i].querySelector(".o-lab");
      if (!mr || !mr.width) { continue; }
      if (getComputedStyle(m).position !== "absolute") { if (lab && labOver(lab, 0)) { return true; } continue; }
      var texts = rg ? list[i].querySelectorAll(".o-lab, .o-sub") : [];
      for (j = 0; j < texts.length; j++) {
        rg.selectNodeContents(texts[j]);
        var rs = rg.getClientRects();
        for (k = 0; k < rs.length; k++) {
          if (rs[k].left < mr.right - 1 && mr.left < rs[k].right - 1 && rs[k].top < mr.bottom - 1 && mr.top < rs[k].bottom - 1) { return true; }
        }
      }
    }
    return false;
  }
  /* A number key may never lie on the words of its card (three cards in a row keep it in a corner,
     where a long label can reach it). Where one would, the keys of that question give up their badges;
     the keys themselves still work. Asked again after the play screen has closed its ranks. */
  function keyHits(box) {
    var keys = box.querySelectorAll(".o-key"), rg = null, i, j, k;
    try { rg = document.createRange(); } catch (e) { return false; }
    for (i = 0; i < keys.length; i++) {
      var kr = keys[i].getBoundingClientRect(), texts = kr.width ? keys[i].parentNode.querySelectorAll(".o-lab, .o-sub") : [];
      for (j = 0; j < texts.length; j++) {
        rg.selectNodeContents(texts[j]);
        var rs = rg.getClientRects();
        for (k = 0; k < rs.length; k++) {
          if (rs[k].left < kr.right - 0.5 && kr.left < rs[k].right - 0.5 && rs[k].top < kr.bottom - 0.5 && kr.top < rs[k].bottom - 0.5) { return true; }
        }
      }
    }
    return false;
  }
  function fitKeys() {
    var boxes = desk.querySelectorAll(".answers:not(.ghost):not(.nokey)");
    for (var n = 0; n < boxes.length; n++) { if (keyHits(boxes[n])) { boxes[n].classList.add("nokey"); } }
  }
  function fitAnswers(keep) {
    var boxes = desk.querySelectorAll(".answers:not(.ghost)");
    for (var n = 0; n < boxes.length; n++) {
      var box = boxes[n], cols = 0, marked = !!box.querySelector(".opt.right, .opt.wrong");
      /* keep: a card has changed in the middle of a question (a stamp has landed, the answer is in). Then
         the cards may only be given more room, never be put back, so nothing jumps under the player's finger. */
      if (!keep) {
        box.classList.remove("cols2"); box.classList.remove("slim"); box.classList.remove("fs"); box.classList.remove("nokey"); box.classList.remove("brk"); box.classList.remove("st-sm");
        box.style.removeProperty("--lab-fs");
      }
      /* while measuring, a long word may not break: it has to show up as too wide. The marks of an
         answered question stand out of the labels' way meanwhile; their place is decided last. */
      box.classList.add("probe");
      box.classList[marked ? "add" : "remove"]("mk-top");
      try { cols = String(getComputedStyle(box).gridTemplateColumns).split(/\s+/).length; } catch (e) { cols = 0; }
      if (box.classList.contains("n4") && cols > 2 && labelOver(box, 8)) { box.classList.add("cols2"); }
      if (labelOver(box, 0)) {
        /* three cards in a row first give up the air at their sides: that costs no type */
        if (box.classList.contains("n3")) { box.classList.add("slim"); }
        var lab = box.querySelector(".o-lab"), fs = lab ? Math.floor(parseFloat(getComputedStyle(lab).fontSize)) || 0 : 0;
        while (fs > LAB_MIN && labelOver(box, 0)) {
          fs--;
          box.style.setProperty("--lab-fs", fs + "px");
          box.classList.add("fs");
        }
        /* before a word may break, the number keys give up their badges (the keys still work) */
        if (labelOver(box, 0)) { box.classList.add("nokey"); }
        if (labelOver(box, 0)) { box.classList.add("brk"); }
      }
      /* the marks: where they are by the stylesheet, unless one would lie on a word or squeeze one; then
         every card of this question keeps a strip free at its top and the marks sit there ("mk-top") */
      if (marked) {
        box.classList.remove("mk-top");
        if (markHits(box)) { box.classList.add("mk-top"); }
      }
      /* and a "Ruled out" stamp that is wider than its card gets its small size (measured on the layout
         box: the stamp is still turning into place when this runs) */
      var stamps = box.querySelectorAll(".opt.out .o-stamp");
      for (var si = 0; si < stamps.length && !box.classList.contains("st-sm"); si++) {
        var card = stamps[si].offsetParent;
        if (card && stamps[si].offsetWidth && (stamps[si].offsetLeft < 0 || stamps[si].offsetLeft + stamps[si].offsetWidth + 1 > card.clientWidth)) { box.classList.add("st-sm"); }
      }
      box.classList.remove("probe");
      if (!box.classList.contains("nokey") && keyHits(box)) { box.classList.add("nokey"); }
    }
  }
  function optButton(k) { return desk.querySelector('.opt[data-k="' + selEsc(k) + '"]'); }
  /* what a clue or a training step rules out: one key in the data, or a list of them */
  function outKeys(x) { return x && x.eliminates ? [].concat(x.eliminates) : []; }
  /* stamp an answer "Ruled out". It stays on screen and can no longer be chosen. */
  function stampOut(k, loud, keepEnabled) {
    var b = optButton(k);
    if (!b || b.classList.contains("out")) { return; }
    b.classList.add("out");
    if (!keepEnabled) { b.disabled = true; }
    var st = b.querySelector(".o-stamp");
    if (st) { st.removeAttribute("aria-hidden"); }
    fitAnswers(true);
    if (loud) {
      b.classList.add("thud");
      later(function () { Sfx.play("ruleout"); }, 140);
      act("point", 1700);
      lookAtNode(b, 1700);
    }
  }
  /* When the play screen changes shape (a clue arrives, the answer is in), its pieces glide to their
     new place instead of jumping. mark() before the change, glide() after it. */
  function flipMark(v) {
    var out = [];
    if (reduced() || !v) { return out; }
    for (var n = v.firstElementChild; n; n = n.nextElementSibling) {
      if (/(^| )(sheet|dock|clue-note)( |$)/.test(n.className)) { continue; }
      out.push({ n: n, y: n.getBoundingClientRect().top });
    }
    return out;
  }
  function stageMarks() {
    var out = [], list = [inspFig.parentNode, bubble.parentNode];
    if (reduced() || docked) { return out; }
    list.forEach(function (n) { if (n && n.getClientRects().length) { out.push({ n: n, y: n.getBoundingClientRect().top }); } });
    return out;
  }
  function flipGlide(marks) {
    marks.forEach(function (m) {
      if (!m.n.parentNode || !m.n.getClientRects().length) { return; }
      var dy = m.y - m.n.getBoundingClientRect().top;
      if (Math.abs(dy) < 2) { return; }
      m.n.style.setProperty("--dy", dy.toFixed(1) + "px");
      m.n.classList.remove("glide");
      void m.n.offsetWidth;
      m.n.classList.add("glide");
    });
  }

  /* ------------------------------------------------------- the Notebook */
  var nbOpen = false, cfOpen = false, lastFocus = null;
  /* The declension chart: one build for the Notebook and for the briefing that opens with it (request 6).
     sneaky: mark the cells with the sneaky ending (the Notebook explains them; the first briefing does not). */
  function declTable(sneaky) {
    var dc = D.declension, n = 0, h = '<table class="decl"><thead><tr><th scope="col">Case</th><th scope="col">One</th><th scope="col">Many</th></tr></thead><tbody>';
    dc.rows.forEach(function (row) {
      var c = D.cases[row.k];
      if (!c) { return; }
      function cell(end) {
        var sn = sneaky && end === dc.sneaky;
        if (sn) { n++; }
        return "<td" + (sn ? ' class="sn"' : "") + ' lang="la">' + esc(dc.stem) + "<b>" + esc(end) + "</b>" + (sn ? '<span class="sr" lang="en"> (the sneaky ending)</span>' : "") + "</td>";
      }
      h += '<tr class="c-' + c.key + '"><td>' + esc(c.name) + "</td>" + cell(row.sg) + cell(row.pl) + "</tr>";
    });
    return { html: h + "</tbody></table>", sneaky: n };
  }
  function buildNotebook() {
    var dc = D.declension, h = "", sneakyCells = 0;
    h += '<section class="nb-sec"><h3>Every case has a job</h3><ul class="nb-cases">';
    dc.rows.forEach(function (row) {
      var c = D.cases[row.k];
      if (!c) { return; }
      h += '<li class="nb-case c-' + c.key + '">' + pic("c-" + c.key, "c-pic") + '<div class="nb-ct"><span class="chip c-' + c.key + '">' + esc(c.name) + '</span><b class="nb-q">' + esc(c.question) + "</b>" +
        '<span class="nb-job">Job: ' + esc(c.job) + '</span><span class="nb-hook">' + rich(c.hook) + "</span></div></li>";
    });
    h += "</ul></section>";
    var chart = declTable(true);
    sneakyCells = chart.sneaky;
    h += '<section class="nb-sec"><h3>The <i lang="la">' + esc(dc.word) + "</i> chart</h3><p>" + '<i lang="la">' + esc(dc.word) + "</i> means “" + esc(dc.meaning) + "”. The ending changes with the job.</p>" + chart.html;
    /* the chart marks every cell with the sneaky ending; he speaks of three suspects, because the fourth
       cell (the vocative plural) is the nominative's twin. The caption says so. */
    var twin = false;
    dc.rows.forEach(function (row) { if (row.k === "voc" && row.pl === dc.sneaky) { twin = true; } });
    h += '<p class="decl-key"><b lang="la">-' + esc(dc.sneaky) + "</b><span>The sneaky ending. It turns up " + sneakyCells + " times" +
      (twin && sneakyCells === 4 ? ": the three suspects, and the vocative plural, which always looks like the nominative." : ", so the rest of the sentence has to tell you which job it has.") + "</span></p></section>";
    h += '<section class="nb-sec"><h3>The detective method</h3><ol class="nb-method">';
    D.method.forEach(function (m) { h += "<li><b>" + txt(m.title) + "</b>" + txt(m.text) + "</li>"; });
    h += "</ol></section>";
    h += '<section class="nb-sec"><h3>Field notes</h3><p>' + esc(D.inspector.nameNote) + '</p><ul class="nb-tips"><li>' + esc(L.glossHint) + "</li><li>Clues never cost stars. Ask as often as you like.</li>" +
      '<li class="kb-tip">On a keyboard: <kbd>1</kbd> to <kbd>4</kbd> answer, <kbd>Enter</kbd> continues, <kbd>C</kbd> asks for a clue, <kbd>N</kbd> opens this Notebook and <kbd>M</kbd> turns the sound effects on or off.</li></ul></section>';
    if (MUSIC) {
      var muN = 0, muC = "";
      try { muN = MUSIC.count(); muC = typeof MUSIC.credit === "function" ? String(MUSIC.credit() || "") : ""; } catch (e) { muC = ""; }
      h += '<section class="nb-sec nb-music"><h3>The music</h3>' +
        "<p>That violin is playing " + (muN >= 24 ? "the" : muN === 1 ? "one of the" : muN + " of the") + " <b>24 Caprices</b> by Niccolò Paganini, who wrote them about 200 years ago. Nobody recorded it: the game makes every note itself.</p>" +
        '<p class="mu-now"><svg class="ic" aria-hidden="true"><use href="#i-music"></use></svg><span id="muTitle"></span></p>' +
        '<p class="mu-row"><button type="button" class="btn sm mu-btn" id="muToggle" data-action="music" aria-pressed="true">Music: on</button>' +
        '<button type="button" class="btn sm mu-btn" id="muNext" data-action="music-next">Next piece</button></p>' +
        '<p class="mu-credit">' + (muC ? esc(muC) + " " : "") + '<a href="music/credits.html#from-game" target="_blank" rel="noopener">More about the music</a></p></section>';
    }
    nbPages.innerHTML = h;
    nbPages.setAttribute("tabindex", "0");
    nbPages.setAttribute("aria-label", "Notebook pages");
  }
  function setInert(on) {
    try {
      if (on) { app.setAttribute("aria-hidden", "true"); app.inert = true; } else { app.removeAttribute("aria-hidden"); app.inert = false; }
    } catch (e) { /* ignore */ }
  }
  function openNotebook() {
    if (nbOpen || cfOpen) { return; }
    nbOpen = true;
    lastFocus = document.activeElement;
    hideGloss();
    nb.classList.add("open");
    nb.setAttribute("aria-hidden", "false");
    nbScrim.hidden = false;
    setInert(true);
    nbPages.scrollTop = 0;
    try { nbClose.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function closeNotebook() {
    if (!nbOpen) { return; }
    nbOpen = false;
    nb.classList.remove("open");
    nb.setAttribute("aria-hidden", "true");
    nbScrim.hidden = true;
    setInert(false);
    restoreFocus();
  }
  function restoreFocus() {
    var f = lastFocus;
    lastFocus = null;
    try { if (f && f.focus && document.body.contains(f)) { f.focus({ preventScroll: true }); } } catch (e) { /* ignore */ }
  }
  function openConfirm() {
    if (cfOpen || nbOpen) { return; }
    cfOpen = true;
    lastFocus = document.activeElement;
    cf.classList.add("open");
    cf.setAttribute("aria-hidden", "false");
    cfScrim.hidden = false;
    setInert(true);
    try { cfNo.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function closeConfirm() {
    if (!cfOpen) { return; }
    cfOpen = false;
    cf.classList.remove("open");
    cf.setAttribute("aria-hidden", "true");
    cfScrim.hidden = true;
    setInert(false);
    restoreFocus();
  }
  nbClose.addEventListener("click", function () { Sfx.play("tap"); closeNotebook(); });
  nbScrim.addEventListener("click", closeNotebook);
  cfScrim.addEventListener("click", closeConfirm);
  cfNo.addEventListener("click", function () { Sfx.play("tap"); closeConfirm(); });
  cfYes.addEventListener("click", function () {
    save.stars = {}; save.solo = {}; save.seen = {};
    persist();
    paused = null; R = null; greeted = false;
    closeConfirm();
    Sfx.play("ruleout");
    home();
  });
  /* keep Tab inside an open dialog */
  function trapTab(e, box) {
    var list = box.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]');
    if (!list.length) { e.preventDefault(); return; }
    var first = list[0], last = list[list.length - 1], a = document.activeElement;
    if (!box.contains(a)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }

  /* --------------------------------------------------------------- home */
  /* the way back to the other games exists only when this game sits in its folder on the games site */
  function siteHome() {
    try { return /(^|\/)case-detective\/(index\.html?)?$/i.test(decodeURIComponent(location.pathname)) ? "../index.html" : ""; } catch (e) { return ""; }
  }
  /* every star that can be won, grouped by the rank it leads to */
  function rankRowHtml(total) {
    var edges = D.ranks.map(function (r) { return r.min; }), max = maxStars(), h = '<div class="rank-row" aria-hidden="true"><span class="rk-g">';
    for (var i = 0; i < max; i++) {
      if (i && edges.indexOf(i) > 0) { h += '</span><span class="rk-g">'; }
      h += '<svg viewBox="0 0 24 24"' + (i < total ? ' class="on" style="--i:' + i + '"' : "") + ' focusable="false"><use href="#i-star"></use></svg>';
    }
    return h + "</span></div>";
  }
  function home() {
    B = null; T = null;
    var total = totalStars(), max = maxStars(), rank = rankFor(total), nf = nextFile(), done = total >= max;
    var first = !hasProgress(), left = ribbonsLeft();
    var v = el("div", "view v-home"), h = "";
    var toNext = rank.next ? rank.next.min - total : 0;
    h += '<h1 class="sr">Case Detective</h1><section class="rank" aria-label="Your rank">' + '<svg class="rank-badge" viewBox="0 0 48 52" aria-hidden="true" focusable="false"><use href="#i-badge"></use></svg>' +
      '<div class="rank-txt"><b class="rank-title">' + esc(rank.title) + '</b><span class="rank-next">' + (rank.next ? toNext + (toNext === 1 ? " more star" : " more stars") + " to " + esc(rank.next.title) : (left ? "Top rank. " + (left === 1 ? "One no-clue ribbon" : left + " no-clue ribbons") + " still to win." : "Top rank. Every file solved without a clue.")) + "</span></div>" +
      '<div class="rank-count" role="img" aria-label="' + total + " of " + max + ' stars"><b>' + total + "</b><span>/" + max + "</span></div>";
    h += rankRowHtml(total) + "</section>";
    h += '<h2 class="sr">Case files</h2><ul class="files">';
    FILES.forEach(function (f) {
      var s = save.stars[f.id] || 0, solo = !!save.solo[f.id];
      var isPaused = !!(paused && paused.file.id === f.id);
      var isNext = paused ? isPaused : (f === nf && (!done || left > 0));
      var closed = s >= 2;
      var go = isPaused ? "Resume" : (s ? "Replay" : "Open");
      var flag = isNext ? (isPaused ? "In progress" : (first ? "Start here" : (done ? "Win the ribbon" : "Next up"))) : "";
      var label = "File " + f.n + ": " + f.title + ". " + s + " of 3 stars." + (closed ? " Case closed." : "") + (solo ? " " + L.solo : "") + (isPaused ? " In progress." : (isNext ? " " + flag + "." : ""));
      h += '<li><button type="button" class="folder' + (isNext ? " next" : "") + (closed ? " closed" : "") + '" data-file="' + esc(f.id) + '" aria-label="' + esc(label) + '">' +
        '<span class="f-tab">File ' + f.n + '</span><span class="f-title">' + txt(f.title) + '</span><span class="f-blurb">' + txt(f.blurb) + "</span>" +
        '<span class="f-foot">' + starsHtml(s) + (closed && !isNext ? '<span class="f-stamp">' + esc(L.stamp.closed) + "</span>" : '<span class="f-go">' + go + "</span>") + "</span>" +
        (solo ? '<svg class="f-ribbon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-ribbon"></use></svg>' : "") +
        (flag ? '<span class="f-flag">' + flag + "</span>" : "") + "</button></li>";
    });
    h += "</ul>";
    var target = paused ? paused.file : nf;
    var verb = paused ? "Resume" : (first ? "Open" : (done ? "Replay" : "Continue:"));
    h += '<div class="dock"><button type="button" class="btn primary" data-primary data-open="' + esc(target.id) + '"><span>' + verb + " File " + target.n + "<small>" + txt(target.title) + "</small></span>" + icon("next") + "</button></div>";
    var site = siteHome();
    h += '<p class="home-foot">' + (site ? '<a class="tlink" href="' + site + '">More language games</a>' : "<span></span>") + '<button type="button" class="tlink" data-action="reset">Reset progress</button></p>';
    v.innerHTML = h;
    setView("home", v);
    setMid("");

    var lines, moods;
    var map = { stars: total, nextN: nf.n, nextTitle: nf.title, rank: rank.title };
    if (first) { lines = L.homeFirst.slice(); moods = ["!wave", "point"]; }
    else if (done) { lines = L.homeDone.map(function (s) { return fill(s, map); }); moods = ["!cheer", "proud"]; }
    else { lines = L.homeBack.map(function (s) { return fill(s, map); }); moods = ["!wave", "point"]; }
    /* he says hello once; on later visits to his desk he goes straight to what is next */
    if (greeted && lines.length > 1) { lines = lines.slice(-1); moods = moods.slice(-1); }
    greeted = true;
    var nextEl = v.querySelector(".folder.next");
    runSequence(lines, moods, function (n) { if (n === lines.length - 1 && nextEl) { lookAtNode(nextEl, 2000); } });
    reserveStage(lines.map(function (s) { return [{ html: s }]; }), lines.length > 1 ? { dots: [0, lines.length] } : null);
  }
  function goHome() {
    if (view === "play" && R && !R.done) { paused = R; }
    home();
  }
  function openFile(id) {
    var f = fileById(id);
    if (!f) { return; }
    if (paused && paused.file.id === id) { resumeRound(); return; }
    paused = null;
    briefing(f);
  }

  /* ----------------------------------------------------------- briefing */
  function recapHtml(file) {
    var rc = file.recap, h = "";
    if (!rc || !rc.items) { return ""; }
    if (rc.kind === "questions") {
      h += '<h2 class="rc-h">The detective questions</h2><ul class="rc-list">';
      rc.items.forEach(function (it) {
        var c = D.cases[it.k];
        h += '<li class="c-' + esc(it.k) + '">' + (c ? pic("c-" + c.key, "c-pic") : "") + '<span class="chip c-' + esc(it.k) + '">' + esc(c ? c.name : it.k) + "</span><span>" + txt(it.text) + "</span></li>";
      });
      h += "</ul>";
    } else if (rc.kind === "endings") {
      h += '<h2 class="rc-h">Two fingerprints</h2><div class="rc-ends">';
      rc.items.forEach(function (it) {
        var c = D.cases[it.k];
        h += '<div class="end-card c-' + esc(it.k) + '"><span class="end-big" lang="la">' + esc(it.ending) + '</span><span class="chip c-' + esc(it.k) + '">' + esc((c ? c.name : it.k) + " " + it.number) + "</span>" +
          '<span class="end-ex"><i lang="la">' + esc(it.example) + "</i>" + txt(it.meaning) + '</span><span class="end-hook">' + txt(it.hook) + "</span></div>";
      });
      h += "</div>";
    } else {
      h += '<h2 class="rc-h"><i lang="la">' + esc(D.declension.stem + D.declension.sneaky) + "</i>: three suspects</h2>" + '<div class="sus-row">';
      rc.items.forEach(function (it) {
        h += '<div class="sus c-' + esc(it.k) + '">' + portraitFor(it) + "<b>" + esc(it.label) + "</b><span>" + txt(it.meaning) + "</span><small>" + txt(it.text) + "</small></div>";
      });
      h += "</div>";
    }
    return h;
  }
  /* A briefing may teach with cards (file 1): the chart first (request 6), then one mini lesson per case,
     all of one build (request 5), and the recap at the end. The cards lie on one spot of the desk. */
  function chartCardHtml() {
    var dc = D.declension;
    return '<h2 class="rc-h">The <i lang="la">' + esc(dc.word) + "</i> chart<small>“" + esc(dc.meaning) + "”: one, and many</small></h2>" + declTable(false).html;
  }
  function sameWords(a, b) {
    if (!a || !b || a.length !== b.length) { return false; }
    for (var i = 0; i < a.length; i++) { if (a[i].w !== b[i].w || (a[i].after || "") !== (b[i].after || "")) { return false; } }
    return true;
  }
  /* The lesson of one case: the case and its question, one Latin example in which only that case's word
     wears its label, what it says, and the case's row of the chart. A lesson whose sentence is already
     on the card keeps the card and moves the label: one sentence, several jobs.
     .ls-scene is the place of the picture of the sentence. It is open only where the fitted briefing
     still holds the strip (lessonSceneFit), and the picture is drawn when the lesson is on show. */
  function setLesson(ls) {
    var box = B.lessonEl, c = D.cases[ls.k], dc = D.declension, keep = !!(B.lesson && sameWords(B.lesson.words, ls.words)), ti = -1, i;
    if (!box || !c || !ls.words) { return; }
    for (i = 0; i < ls.words.length; i++) { if (ls.words[i].t) { ti = i; } }
    if (!keep) {
      box.innerHTML = '<div class="ls-head"></div><div class="ls-strip"></div><p class="ls-tr"></p><div class="ls-scene" hidden></div><p class="ls-row"></p>';
      /* the strip is the game's own evidence scroll (a tap on a word shows its meaning); none of its words is a mystery */
      box.querySelector(".ls-strip").appendChild(buildScroll(ls.words.map(function (w) { var o = {}; for (var k in w) { if (k !== "t") { o[k] = w[k]; } } return o; }), false));
    }
    B.lesson = ls;
    box.className = "bf-card bf-lesson c-" + c.key + (box.classList.contains("wait") ? " wait" : "");
    box.querySelector(".ls-head").innerHTML = pic("c-" + c.key, "c-pic") + '<span class="chip c-' + c.key + '">' + esc(c.name) + '</span><b class="ls-q">' + esc(c.question) + '</b><span class="ls-job">Job: ' + esc(c.job) + "</span>";
    var units = box.querySelectorAll(".wu");
    for (i = 0; i < units.length; i++) {
      var b = units[i].querySelector(".w");
      units[i].classList[i === ti ? "add" : "remove"]("show");
      if (b) { b.classList[i === ti ? "add" : "remove"]("t"); }
    }
    box.querySelector(".ls-tr").innerHTML = ls.translation ? "“" + rich(ls.translation) + "”" : "";
    var holder = box.querySelector(".ls-scene");
    holder.hidden = !B.scnOn;
    holder.style.setProperty("--scn-ar", String(sceneRatio()));
    if (B.scnOn && B.lessonLive && !B.measuring) { lessonScene(holder, ls, ti); }
    var dr = null;
    dc.rows.forEach(function (r) { if (r.k === ls.k) { dr = r; } });
    box.querySelector(".ls-row").innerHTML = dr ? '<span class="ls-row-h">In the chart:</span><span class="ls-end" lang="la">' + esc(dc.stem) + "<b>" + esc(dr.sg) + '</b></span><small>one</small><span class="ls-end" lang="la">' + esc(dc.stem) + "<b>" + esc(dr.pl) + "</b></span><small>many</small>" : "";
    if (!keep) { layoutScroll(); }
  }
  /* which card lies on the desk: "chart", "lesson", "recap" or none; true when that changed */
  function showCard(which, look) {
    var changed = false, shown = null;
    [["chart", B.chart], ["lesson", B.lessonEl], ["recap", B.recap]].forEach(function (p) {
      if (!p[1]) { return; }
      var on = p[0] === which;
      if (p[1].classList.contains("wait") === on) { changed = true; p[1].classList[on ? "remove" : "add"]("wait"); }
      if (on) { shown = p[1]; }
    });
    B.view.classList[shown ? "add" : "remove"]("has-recap");
    if (changed && look && shown) { lookAtNode(shown, 1500); }
    return changed;
  }
  /* "that is where the chart lives": the Notebook button lights up for as long as a beat points at it */
  function pointAt(what) {
    var on = what === "notebook";
    nbBtn.classList[on ? "add" : "remove"]("point");
    if (on) { lookAtNode(nbBtn, 2400); }
  }
  /* All lessons are of one build, but a longer question wraps: the lesson card is as tall as the tallest
     of them, from the first beat on, so the spot of the cards never changes its height. */
  function sizeLessons() {
    var box = B.lessonEl, cur = B.lesson, first = null, max = 0;
    if (!box) { return; }
    box.style.minHeight = "";
    box.style.alignSelf = "start";
    B.measuring = true;
    B.lines.forEach(function (ln) {
      if (!ln.lesson) { return; }
      first = first || ln.lesson;
      setLesson(ln.lesson);
      max = Math.max(max, box.offsetHeight);
    });
    B.measuring = false;
    box.style.alignSelf = "";
    if (cur || first) { setLesson(cur || first); }
    if (max) { box.style.minHeight = max + "px"; }
  }
  /* A briefing with cards is fitted once, for his tallest line, so that nothing moves from beat to beat.
     What is given up, in this order: the cover folds to its title ("bf-tight"), the cover goes (the bar
     at the top has the title too: "bf-nocover"), the cards close ranks and the lesson lets go of its line
     from the chart ("bf-tight2"), he gets smaller, and on the smallest phones he and his type get smaller
     still and the lesson leaves its job line to him ("bf-tight3"). What was given up stays given up
     until the window changes (start). Should a later line still be too tall, the same steps are taken then. */
  var BF_STEPS = ["bf-tight", "bf-nocover", "bf-tight2", "bf-tight3"];
  function briefSmall(on) {
    if (app.classList.contains("brief-small") === on) { return; }
    app.classList[on ? "add" : "remove"]("brief-small");
    if (on) { app.style.removeProperty("--insp"); }
    fitInspector();
  }
  function briefFit(start) {
    if (!B || !B.view) { return; }
    var v = B.view, n, over, h;
    function step(cls) {
      if (pageOver() <= 0 || v.classList.contains(cls)) { return; }
      v.classList.add(cls);
      if (cls === "bf-tight3") { briefSmall(true); }
      sizeLessons();
      if (start) { applyReserve(true); }
    }
    if (!B.cards) {
      /* A briefing without cards looks as it always did. Only where its recap would still run under the
         screen after he has made himself small, the cover goes, and then he and his type get smaller. */
      if (start) { v.classList.remove("bf-nocover"); briefSmall(false); applyReserve(); }
      squeezeInspector(v.lastElementChild);
      if (pageOver() > 0 && !v.classList.contains("bf-nocover")) { v.classList.add("bf-nocover"); applyReserve(); }
      if (pageOver() > 0) { briefSmall(true); applyReserve(); }
      return;
    }
    if (start) {
      BF_STEPS.forEach(function (c) { v.classList.remove(c); });
      briefSmall(false);
      B.scnOn = false;
      sizeLessons();
      applyReserve(true);
    }
    /* (a line that turns out too tall later: the picture goes before any step is taken for it) */
    if (B.scnOn && pageOver() > 0) { B.scnOn = false; dropLessonScene(); sizeLessons(); applyReserve(); }
    step(BF_STEPS[0]); step(BF_STEPS[1]); step(BF_STEPS[2]);
    if (start && !wideLayout()) {
      for (n = 0; n < 8; n++) {
        over = pageOver(); h = Math.round(inspFig.clientHeight);
        if (over <= 0 || h <= INSP_MIN) { break; }
        app.style.setProperty("--insp", Math.max(INSP_MIN, h - Math.max(over, 8)) + "px");
        fitInspector();
        applyReserve(true);
      }
    }
    step(BF_STEPS[3]);
    applyReserve();
    if (start) { lessonSceneFit(); }
  }
  /* The picture in the lesson card: only where the briefing, fitted as it is, still holds the strip.
     No step of the fit is taken for it, and the stage keeps its full height: it takes nothing away.
     (Always the small size: the card has no lower format in this version.) */
  function lessonSceneFit() {
    var box = B.lessonEl, was = app.style.getPropertyValue("--insp");
    B.scnOn = false;
    if (!box || pageOver() > 0 || !B.lines.some(function (ln) { return !!ln.lesson && canScene(ln.lesson.words, ln.lesson.scene); })) { return; }
    applyReserve(true);
    if (pageOver() > 0) { applyReserve(); return; }
    B.scnOn = true;
    sizeLessons();
    applyReserve(true);
    /* (a tablet's Inspector has the room the desk leaves him: there he gives some of it back, as he
       does for the picture of a question) */
    if (pageOver() > 0) { spareInspector(true); }
    if (pageOver() > 0) { B.scnOn = false; dropLessonScene(); sizeLessons(); inspBack(was); }
    applyReserve();
  }
  function briefing(file, opts) {
    opts = opts || {};
    var seen = !!save.seen[file.id];
    T = null;
    B = { file: file, lines: file.briefing, i: 0, last: file.briefing.length - 1, talk: !seen || !!opts.hear, willTrain: !!(file.training && !save.seen[file.training.id]) };
    var s = save.stars[file.id] || 0, played = s > 0 || !!save.seen["round:" + file.id];
    var stamp = s >= 2 ? L.stamp.closed : (played ? L.stamp.open : "");
    /* (cards only while he talks: the short form of a briefing heard before is the recap alone, as ever) */
    var cards = B.talk && file.briefing.some(function (ln) { return ln.show === "chart" || !!ln.lesson; });
    var v = el("div", "view v-brief" + (cards ? " has-cards" : ""));
    v.innerHTML = '<header class="bf-cover"><span class="f-tab">File ' + file.n + " of " + FILES.length + '</span><h1 class="bf-title">' + txt(file.title) + '</h1><p class="bf-blurb">' + txt(file.blurb) + "</p>" +
      '<p class="bf-meta">' + (stamp ? '<span class="bf-stamp' + (s >= 2 ? "" : " still") + '">' + esc(stamp) + "</span>" : "<span>" + file.questions.length + " questions</span>") + starsHtml(s) + "</p></header>" +
      (cards ? '<div class="bf-cards"><section class="bf-card bf-chart wait">' + chartCardHtml() + '</section><section class="bf-card bf-lesson wait"></section>' : "") +
      '<section class="recap wait">' + recapHtml(file) + "</section>" + (cards ? "</div>" : "") +
      '<div class="bf-more" hidden><button type="button" class="btn ghost sm" data-action="hear">' + icon("replay") + "Hear the briefing</button>" +
      (file.training && !B.willTrain ? '<button type="button" class="btn ghost sm" data-action="retrain">' + icon("glass") + "Replay the training case</button>" : "") + "</div>" +
      '<div class="dock stick"><button type="button" class="btn ghost" data-action="skip">' + icon("skip") + '<span class="sk-t">Skip</span></button><button type="button" class="btn primary" data-primary><span class="p-lab">Next</span>' + icon("next") + "</button></div>";
    B.view = v;
    B.cards = v.querySelector(".bf-cards");
    B.chart = v.querySelector(".bf-chart");
    B.lessonEl = v.querySelector(".bf-lesson");
    B.lesson = null;
    B.recap = v.querySelector(".recap");
    B.more = v.querySelector(".bf-more");
    B.skip = v.querySelector('[data-action="skip"]');
    B.plab = v.querySelector(".p-lab");
    setView("briefing", v);
    midFile(file);
    if (B.talk) {
      briefLine(false);
      reserveStage(B.lines.map(function (ln) { return [{ html: ln.say }]; }), { dots: [0, B.lines.length] });
    } else { briefReady(); }
    briefFit(true);
    squeezeInspector(v.lastElementChild);
  }
  function startLabel() { return B.willTrain ? "Start the training case" : "Start the case"; }
  function showRecap(look) { return showCard("recap", look); }
  function briefLine(instant) {
    var ln = B.lines[B.i], atEnd = B.i >= B.last, which = "", lesson = null;
    mood(ln.mood);
    /* the card of this beat is the one the latest beat so far has asked for (the chart stays while he
       points at the Notebook; a file without cards has its recap alone, as ever) */
    for (var i = 0; i <= B.i; i++) {
      var bl = B.lines[i];
      if (bl.lesson && B.lessonEl) { which = "lesson"; lesson = bl.lesson; }
      else if (bl.show === "chart" && B.chart) { which = "chart"; }
      else if (bl.show === "recap") { which = "recap"; }
    }
    B.lessonLive = which === "lesson";
    if (which === "lesson") { setLesson(lesson); } else { dropLessonScene(); }
    var changed = showCard(which, !instant && !!(ln.show || ln.lesson));
    pointAt(ln.point);
    B.skip.hidden = atEnd;
    B.plab.textContent = atEnd ? startLabel() : "Next";
    say([{ html: ln.say }], { dots: [B.i, B.lines.length], instant: !!instant });
    if (changed || B.cards) { applyReserve(); briefFit(false); squeezeInspector(B.view.lastElementChild); }
  }
  function briefReady() {
    pointAt("");
    showRecap(false);
    B.more.hidden = false;
    B.skip.hidden = true;
    B.plab.textContent = startLabel();
    mood("point");
    sayLine(B.file.blurb);
    later(function () { mood("idle"); }, 4200);
  }
  function briefPrimary() {
    if (B.talk && B.i < B.last) {
      if (!speech.done) { finishTyping(); return; }
      B.i++;
      Sfx.play("tap");
      briefLine(false);
      return;
    }
    startCase();
  }
  function briefSkip() {
    if (!B.talk || B.i >= B.last) { return; }
    B.i = B.last;
    Sfx.play("tap");
    briefLine(true);
  }
  function startCase() {
    var f = B.file, train = B.willTrain;
    save.seen[f.id] = true;
    persist();
    Sfx.play("tap");
    if (train) { training(f); } else { startRound(f); }
  }

  /* ------------------------------------------------------ training case */
  /* One sentence worked through together. The sentence and the three suspects stay where they are for
     the whole case; what the player has to do next always sits in the bar at the bottom. */
  function methodHtml(cls) {
    var m = '<ol class="method' + (cls ? " " + cls : "") + '" aria-label="The detective method">';
    D.method.forEach(function (st, i) { m += "<li><b>" + (i + 1) + '</b><span class="m-t">' + txt(st.title) + '</span><span class="m-x">' + txt(st.text) + "</span></li>"; });
    return m + "</ol>";
  }
  function training(file) {
    var tr = file.training;
    B = null;
    T = { file: file, tr: tr, i: 0, phase: "ask", out: {}, outro: false };
    var v = el("div", "view v-play v-train is-sentence");
    var sw = buildScroll(tr.words);
    /* the meaning is written at the end of the case; its line waits under the sentence */
    if (tr.translation) { sw.appendChild(el("p", "s-tr wait", "“" + rich(tr.translation) + "”")); }
    v.appendChild(sw);
    v.appendChild(buildAnswers(tr.suspects));
    var dock = el("div", "dock stick train-dock", '<button type="button" class="btn ghost skip" data-action="skip">' + icon("skip") + '<span class="sk-t">Skip<span class="sk-x"> training</span></span></button><div class="act-slot"></div>');
    v.appendChild(dock);
    T.view = v;
    T.slot = dock.querySelector(".act-slot");
    T.skip = dock.querySelector('[data-action="skip"]');
    T.primary = el("button", "btn primary", '<span class="p-lab">Next</span>' + icon("next"));
    T.primary.type = "button";
    T.primary.setAttribute("data-primary", "");
    T.plab = T.primary.querySelector(".p-lab");
    T.lines = [[{ html: tr.outro.say }]];
    tr.steps.forEach(function (s) {
      T.lines.push([{ html: s.say }]);
      if (s.right) { T.lines.push([{ html: s.right }]); }
      if (s.wrong) { T.lines.push([{ html: s.wrong }]); }
    });
    setView("training", v);
    layoutScroll();
    fitAnswers();
    trainStep(0);
  }
  function trainPips() {
    var n = T.tr.steps.length, h = '<span class="tb-file tb-train">' + icon("glass") + '<b>Training</b></span><div class="pips" role="img" aria-label="Training case, step ' + Math.min(n, T.i + 1) + " of " + n + '">';
    for (var i = 0; i < n; i++) { h += '<i class="pip' + (T.outro || i < T.i || (i === T.i && T.phase === "done" && T.tr.steps[i].kind !== "say") ? " ok" : (i === T.i ? " cur" : "")) + '"></i>'; }
    setMid(h + "</div>");
  }
  function syncSuspects() {
    var s = T.tr.steps[T.i], open = !T.outro && s.kind === "answer" && T.phase === "ask";
    var list = desk.querySelectorAll(".opt");
    for (var i = 0; i < list.length; i++) {
      var b = list[i], k = b.getAttribute("data-k");
      if (T.out[k]) { stampOut(k, false, true); }
      /* asleep, not disabled: a tap on a sleeping card still gets an answer (see trainSuspect) */
      if (open && b.classList.contains("wait")) { b.classList.add("wake"); }
      b.classList.toggle("wait", !open);
      if (open) { b.removeAttribute("aria-disabled"); } else { b.setAttribute("aria-disabled", "true"); }
    }
  }
  /* the bar at the bottom: what to do now (a tip, or two choices), and Next once it is done */
  function trainSlot() {
    var s = T.tr.steps[T.i], ready = T.outro || T.phase === "done";
    T.slot.textContent = "";
    T.skip.hidden = T.outro;
    if (ready) {
      T.plab.textContent = T.outro ? "Start the case" : "Next";
      T.slot.appendChild(T.primary);
      return;
    }
    if (s.kind === "pick") {
      s.choices.forEach(function (c, n) {
        var b = el("button", "choice", esc(c.label));
        b.type = "button";
        b.setAttribute("data-choice", n);
        T.slot.appendChild(b);
      });
    } else {
      T.slot.innerHTML = '<span class="act-tip">' + icon("glass") + "<span>" + (s.kind === "tap" ? "Tap a word in the sentence" : "Tap the suspect still standing") + "</span></span>";
    }
  }
  /* On a phone the suspects and the bar keep their place at the bottom of the screen for the whole
     case, and the room above the desk is the Inspector's (the stylesheet lets the stage take it).
     If a line of his does not fit there, he gives up some of his own height, which widens the bubble.
     On tablets and beside the desk on wide screens, the stage keeps the height of his longest line. */
  /* Beside the Inspector, on a wide screen, the desk is only as tall as what lies on it. So that the bar
     with Next in it stays where it is for the whole case, the view keeps the height of its tallest
     state there: the sentence with the suspects, or the sentence with the method written out. */
  function trainHold(wide) {
    var v = T.view, box = v.querySelector(".answers");
    v.style.minHeight = "";
    if (!wide) { T.hold = 0; return; }
    if (box) {
      var a = v.offsetHeight, m = el("div", "", methodHtml("full")).firstChild;
      box.style.display = "none";
      v.insertBefore(m, box);
      T.hold = Math.max(a, v.offsetHeight);
      v.removeChild(m);
      box.style.display = "";
      T.holdW = window.innerWidth;
    } else if (T.holdW !== window.innerWidth) { T.hold = 0; }
    if (!T.hold) { return; }
    v.style.minHeight = T.hold + "px";
    var over = pageOver();
    if (over > 0) { v.style.minHeight = Math.max(0, T.hold - over) + "px"; }
  }
  function trainFit() {
    var wide = wideLayout(), v = T.view, anchored = false;
    /* what the stylesheet decided: on a phone the training desk does not grow, it sits on the bottom */
    try { anchored = !wide && getComputedStyle(desk).flexGrow === "0"; } catch (e) { anchored = false; }
    reserve = anchored ? null : { list: T.lines, opts: null };
    applyReserve();
    trainHold(wide);
    /* the picture of the solved case never costs the case anything */
    if (SC && pageOver() > 0) {
      var was = SC.inspWas, f0 = inspFig.getBoundingClientRect();
      if (typeof was === "string") { spareInspector(false); }
      if (pageOver() > 0) {
        dropScene();
        if (typeof was === "string") { inspBack(was); }
        applyReserve(); trainHold(wide);
      }
      if (Math.abs(inspFig.getBoundingClientRect().height - f0.height) > 3) { hopFrom(inspFig, f0); }
    }
    if (wide) {
      v.classList.remove("tight");
      /* (a phone on its side: the cards let go of the question under their names, for the rest of the case) */
      if (pageOver() > 0 && !v.classList.contains("bare")) { v.classList.add("bare"); applyReserve(); trainHold(wide); }
      fitKeys();
      return;
    }
    /* a short phone keeps the tighter spacing for the whole case, so nothing changes size half way */
    if (anchored && window.innerHeight < 700) { v.classList.add("tight"); }
    if (pageOver() > 0) { v.classList.add("tight"); }
    var from = inspFig.getBoundingClientRect();
    squeezeInspector(v.lastElementChild);
    /* The shortest phones: even at his smallest size the case does not fit. Then the cards keep their
       names and let go of their faces and of the questions under the names, and the written method at
       the end goes (he says it in his last line): for the rest of the case, so nothing comes and goes. */
    if (pageOver() > 0 && !v.classList.contains("bare")) {
      v.classList.add("bare");
      app.style.removeProperty("--insp");
      fitInspector();
      applyReserve();
      squeezeInspector(v.lastElementChild);
    }
    if (T.i > 0 && Math.abs(inspFig.getBoundingClientRect().height - from.height) > 3) { hopFrom(inspFig, from); }
    fitKeys();
  }
  function trainStep(i) {
    var s = T.tr.steps[i];
    T.i = i;
    T.phase = s.kind === "say" ? "done" : "ask";
    hideGloss();
    syncSuspects();
    trainSlot();
    var marks = desk.querySelectorAll(".w.no, .opt.nope");
    for (var m = 0; m < marks.length; m++) { marks[m].classList.remove("no"); marks[m].classList.remove("nope"); }
    trainPips();
    mood(s.mood);
    sayLine(s.say);
    trainFit();
    /* his eyes go to the thing this step is about */
    if (s.kind === "say") { lookAtNode(desk.querySelector(".w.t"), 1800); }
    else if (s.kind === "answer") { lookAtNode(desk.querySelector(".opt:not(.out)"), 1500); }
    else if (s.kind === "pick" && s.eliminates) { lookAtNode(optButton(outKeys(s)[0]), 1500); }
    else { lookAtNode(desk.querySelector(".scroll"), 1500); }
  }
  function trainRight(s, node) {
    T.phase = "done";
    var marks = flipMark(T.view).concat(stageMarks());
    if (node) {
      node.classList.remove("no"); node.classList.remove("nope");
      node.classList.add(s.kind === "answer" ? "winner" : "yes");
    }
    if (s.reveal) { revealWords(s.reveal); }
    Sfx.play("correct");
    act("cheer", 1300);
    syncSuspects();
    trainSlot();
    trainPips();
    if (s.kind === "answer") {
      sparks(node, 9);
      var trl = desk.querySelector(".scroll-wrap .s-tr");
      if (trl) { trl.classList.remove("wait"); }
      mood("proud");
    }
    /* the suspect is ruled out when he says so, not before: he turns to the card, then the stamp lands */
    say([{ html: s.right }], { onDone: function () { outKeys(s).forEach(function (key) { T.out[key] = true; stampOut(key, true, true); }); } });
    trainFit();
    if (s.kind === "answer") { sceneTrain(); }
    flipGlide(marks);
    if (kb) { try { T.primary.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function trainWrong(s, node) {
    var cls = node && node.classList.contains("opt") ? "nope" : "no";
    if (node) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
    if (s.kind === "pick" && node) { node.disabled = true; }
    Sfx.play("wrong");
    act("oops", 1500);
    sayLine(s.wrong);
    trainFit();
  }
  function trainWord(idx, btn) {
    var s = T.tr.steps[T.i];
    if (!T.outro && s.kind === "tap" && T.phase === "ask") {
      if (idx === s.target) { trainRight(s, btn); } else { trainWrong(s, btn); }
      return;
    }
    Sfx.play("tap");
    showGloss(btn, T.tr.words[idx]);
    scenePulse(idx);
  }
  function trainChoice(idx, btn) {
    var s = T.tr.steps[T.i];
    if (T.outro || s.kind !== "pick" || T.phase !== "ask" || !s.choices[idx]) { return; }
    if (s.choices[idx].correct) { trainRight(s, btn); } else { trainWrong(s, btn); }
  }
  function trainSuspect(k, btn) {
    var s = T.tr.steps[T.i];
    if (!T.outro && T.phase === "ask" && s.kind !== "answer") {
      /* not their turn yet: he points back at what this step wants, and the tip in the bar wiggles */
      var wanted = s.kind === "tap" ? desk.querySelector(".scroll") : T.slot;
      T.slot.classList.remove("wig"); void T.slot.offsetWidth; T.slot.classList.add("wig");
      Sfx.play("blip");
      act("point", 900);
      lookAtNode(wanted, 1300);
      return;
    }
    if (T.outro || s.kind !== "answer" || T.phase !== "ask") { return; }
    if (k === s.answer) { trainRight(s, btn); } else { trainWrong(s, btn); }
  }
  function trainPrimary() {
    if (T.outro) { finishTraining(); return; }
    if (T.phase !== "done") { return; }
    if (!speech.done) { finishTyping(); return; }
    Sfx.play("tap");
    if (T.i < T.tr.steps.length - 1) { trainStep(T.i + 1); return; }
    /* the case is closed: the suspects leave, and the method he just used is laid out in their place */
    T.outro = true;
    var box = T.view.querySelector(".answers");
    if (box) { box.insertAdjacentHTML("afterend", methodHtml("full")); T.view.removeChild(box); }
    T.view.classList.add("outro");
    T.view.classList.remove("tight");
    var stood = inspFig.getBoundingClientRect();
    app.style.removeProperty("--insp");
    fitInspector();
    trainSlot();
    trainPips();
    mood(T.tr.outro.mood);
    sayLine(T.tr.outro.say);
    trainFit();
    /* (he takes his new size from the one he had, not from the full one the fit started with) */
    if (Math.abs(inspFig.getBoundingClientRect().height - stood.height) > 3) { hopFrom(inspFig, stood); } else { inspFig.classList.remove("hop"); }
    lookAtNode(T.view.querySelector(".method"), 1800);
    if (kb) { try { T.primary.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function finishTraining() {
    var f = T.file;
    save.seen[T.tr.id] = true;
    persist();
    Sfx.play("tap");
    startRound(f);
  }
  function trainHint() {
    var s = T.tr.steps[T.i];
    if (T.outro || T.phase !== "ask") { return "[data-primary]"; }
    if (s.kind === "tap") { return '[data-word="' + s.target + '"]'; }
    if (s.kind === "pick") {
      for (var i = 0; i < s.choices.length; i++) { if (s.choices[i].correct) { return '[data-choice="' + i + '"]'; } }
    }
    if (s.kind === "answer") { return '[data-k="' + selEsc(s.answer) + '"]'; }
    return "[data-primary]";
  }

  /* --------------------------------------------------------------- play */
  function optByKey(opts, k) { for (var i = 0; i < opts.length; i++) { if (opts[i].k === k) { return opts[i]; } } return null; }
  /* the longest thing he can say about an answer */
  var LEAD_MAX = (L.correct || []).concat(L.wrong || []).reduce(function (a, s) { return plain(s).length > plain(a).length ? s : a; }, "");
  function startRound(file, only) {
    /* first visit: the author's order (it builds up on purpose). After that the questions are shuffled. */
    var played = !!save.seen["round:" + file.id];
    var qs = only ? shuffle(only) : (played ? shuffle(file.questions) : file.questions.slice());
    B = null; T = null; paused = null;
    R = {
      file: file, practice: !!only, order: qs, n: qs.length, pos: 0,
      queue: qs.map(function (q) { return { q: q, retry: false }; }),
      results: [], missed: [], fixed: {}, picks: {}, right: 0, streak: 0, best: 0, clues: 0, cur: null, done: false
    };
    setStreak(0);
    showQuestion(false);
  }
  function resumeRound() {
    R = paused; paused = null; B = null; T = null;
    if (R.cur && R.cur.answered) { R.pos++; R.cur = null; }
    if (R.pos >= R.queue.length) { finishRound(); return; }
    showQuestion(true);
    setStreak(R.streak);
  }
  function midPips() {
    var c = R.cur, done = R.results.length, fix = c.retry ? R.order.indexOf(c.q) : -1, h = "";
    var label = c.retry ? "Second look" : "Question " + Math.min(R.n, done + (c.answered ? 0 : 1)) + " of " + R.n;
    for (var i = 0; i < R.n; i++) {
      var cls = i < done ? (R.results[i] ? " ok" : " no") : (i === done && !c.retry && !c.answered ? " cur" : "");
      if (i === fix) { cls += " fix"; }
      h += '<i class="pip' + cls + '"></i>';
    }
    var tag = R.practice ? "Practice" : (c.retry ? "Second look" : "");
    setMid((tag ? '<span class="tb-file tb-tag' + (R.n > 3 ? " long" : "") + '"><b>' + tag + "</b></span>" : "") + '<div class="pips" role="img" aria-label="' + (R.practice ? "Practice round. " : "") + label + '">' + h + "</div>");
  }
  function clueDots(total, used) {
    var d = "";
    for (var i = 0; i < total; i++) { d += "<i" + (i < used ? ' class="used"' : "") + "></i>"; }
    return '<span class="cl-dots" aria-hidden="true">' + d + "</span>";
  }
  /* "Ask the Inspector" waits in the bar at the bottom, in reach of a thumb. One press, one clue; when
     both are out the button is spent and says so. */
  function syncClueBtn() {
    var c = R.cur, b = desk.querySelector('.play-dock [data-action="clue"]');
    if (!b) { return; }
    var total = c.q.clues ? c.q.clues.length : 0, had = document.activeElement === b;
    if (c.clues >= total) {
      b.disabled = true;
      b.className = "clue-btn spent";
      b.innerHTML = "<span>" + esc(L.noMoreClues) + "</span>";
      if (had) { var f = desk.querySelector(".answers .opt:not(:disabled)"); try { if (f) { f.focus({ preventScroll: true }); } } catch (e) { /* ignore */ } }
    } else {
      b.innerHTML = icon("glass") + "<span>" + esc(c.clues ? L.clueButtonMore : L.clueButton) + "</span>" + clueDots(total, c.clues);
    }
  }
  function showQuestion(keep) {
    var item = R.queue[R.pos], q = item.q, c;
    if (keep && R.cur && R.cur.q === q && !R.cur.answered) {
      c = R.cur;
    } else {
      c = R.cur = { q: q, retry: item.retry, opts: q.shuffle ? shuffle(q.options) : q.options.slice(), answered: false, ok: false, picked: null, clues: 0, clueAt: 0, out: {}, line: "", extra: "" };
    }
    /* Every question that has Latin words shows them as evidence and is laid out as a sentence question
       ("is-sentence"). The method strip belongs to the sentence type alone; a choice question with an
       example ("q-choice") has none, and its mystery word may be a gap ("q-gap"). */
    var hasWords = !!(q.words && q.words.length), sentence = hasWords && q.type === "sentence", gap = hasWords && !!q.gap;
    var v = el("div", "view v-play " + (hasWords ? "is-sentence" : "is-choice") + (hasWords && !sentence ? " q-choice" : "") + (gap ? " q-gap" : ""));
    if (hasWords) { v.appendChild(buildScroll(q.words, gap)); }
    if (sentence) { v.insertAdjacentHTML("beforeend", methodHtml("")); }
    v.appendChild(buildAnswers(c.opts));
    var dock = el("div", "dock play-dock");
    if (hasWords) { dock.appendChild(el("p", "gloss-hint" + (save.seen.gloss ? " used" : ""), esc(L.glossHint))); }
    if (q.clues && q.clues.length) {
      var cb = el("button", "clue-btn");
      cb.type = "button";
      cb.setAttribute("data-action", "clue");
      dock.appendChild(cb);
    }
    v.appendChild(dock);
    setView("play", v);
    layoutScroll();
    for (var k in c.out) { if (c.out[k]) { stampOut(k, false); } }
    fitAnswers();
    midPips();
    syncClueBtn();
    var parts = [];
    if (c.retry) { parts.push({ html: pickLine(L.secondChance, "sc"), cls: "b-lead" }); }
    parts.push({ html: q.prompt });
    if (c.clues) {
      mood("think");
      say(parts, { instant: true });
    } else {
      mood(c.retry ? "think" : "idle");
      act(c.retry ? "think" : "point", c.retry ? 900 : 1500);
      say(parts);
      if (hasWords) { lookAtNode(desk.querySelector(".w.t"), 1600); }
    }
    /* one stage height for the whole round: the tallest question still to come, with room for the
       line he says about the answer */
    reserveStage(R.queue.slice(R.pos).map(function (it) {
      return [{ html: it.retry ? L.secondChance[0] : LEAD_MAX, cls: "b-lead" }, { html: it.q.prompt }];
    }), null);
    if (c.clues) { showClue(c.clues, false); } else { fitPlay(); }
    sceneAsk();
    later(nudge, 14000);
  }
  /* Before the answer everything has to be on the screen at once: the Inspector, the question, the whole
     sentence, every answer and the clue button. Where a phone is too short for that, things make room
     in this order: the word tip (and a written-out method folds to its strip), the method strip, the
     Inspector's own height, the spacing. */
  function fitPlay() {
    var c = R && R.cur, v = desk.querySelector(".v-play");
    if (view !== "play" || !c || c.answered || !v) { return; }
    /* Beside the desk (wide screens) he cannot give up height, and the calm of one stage height for the
       whole round is worth more than the method strip: there the strip goes before the stage gives way. */
    var wide = wideLayout(), whole = wide;
    if (SC) {
      /* The picture is the first thing to make way. Only for a clue does the stage give back the room
         it keeps for later lines, and he some of his own height, before the picture goes: his glass is
         out on the words, and the picture shows where. */
      applyReserve(true);
      if (pageOver() > 0) { spareInspector(true); }
      if (pageOver() > 0 && v.classList.contains("has-clue")) {
        whole = false;
        applyReserve();
        if (!wide && pageOver() > 0) { squeezeInspector(v.lastElementChild); }
      }
      if (pageOver() > 0) { dropScene(); app.style.removeProperty("--insp"); fitInspector(); whole = wide; }
    }
    applyReserve(whole);
    /* (a tablet's Inspector has the room the desk leaves him: he gives some of it back before the
       method under the sentence, or anything else, makes way) */
    if (pageOver() > 0) { spareInspector(whole); }
    if (pageOver() > 0 && !v.classList.contains("snug")) { v.classList.add("snug"); applyReserve(whole); }
    if (pageOver() > 0 && !v.classList.contains("snug2")) { v.classList.add("snug2"); applyReserve(whole); }
    if (wide) { applyReserve(); }
    if (!wide && pageOver() > 0) { squeezeInspector(v.lastElementChild); applyReserve(); }
    if (pageOver() > 0 && !v.classList.contains("tight")) { v.classList.add("tight"); applyReserve(); }
    /* last of all, on a second look, the line about it having slipped away goes: the question stays */
    if (pageOver() > 0) { app.classList.add("terse"); applyReserve(); }
    /* On a phone that is still too short for a question with its clue, the button for the next clue
       moves up into the head of the clue note ("cb-up" in the stylesheet): nothing is lost by that, so
       it comes before anything is. (After such a step he takes the room that is left over, and gives the
       page what it still lacks.) */
    function lastStep(name) {
      if (wide || pageOver() <= 0 || !v.classList.contains("has-clue")) { return; }
      if (!v.classList.contains(name)) {
        v.classList.add(name);
        app.style.removeProperty("--insp");
        fitInspector();
        applyReserve();
      }
      squeezeInspector(v.lastElementChild, true);
    }
    lastStep("cb-up");
    /* A choice question can be answered from its prompt alone: its Latin example is the first thing
       that is worth less than the prompt and the answers. So where even all of the above is not enough,
       the evidence makes way (it is back, with its labels, once the answer is in). */
    if (pageOver() > 0 && v.classList.contains("q-choice")) { v.classList.add("no-ev"); hideGloss(); dropLens(); applyReserve(); }
    /* A phone on its side: with a clue at the foot of his column, the column can be too short for his
       bubble. There too the line about the second look goes first, and the question stays. */
    if (lowOn && !app.classList.contains("terse")) {
      fitInspector();
      if (lowOver() > 0) { app.classList.add("terse"); fitInspector(); applyReserve(); }
    }
    /* And last of all, with a clue on the desk: the cards keep their names and let go of their faces
       and of the questions under the names ("bare"). */
    lastStep("bare");
    fitKeys();
  }
  /* after a quiet while he gets thoughtful and the clue button glints */
  function nudge() {
    var c = R && R.cur;
    if (view !== "play" || !c || c.answered || c.clues > 0 || nbOpen || cfOpen) { return; }
    var b = desk.querySelector('.play-dock [data-action="clue"]:not([disabled])');
    if (!b) { return; }
    mood("think");
    b.classList.add("nudge");
  }

  /* clues: he lays a note on the desk, and his glass visits the words it talks about */
  function clearEvidence() {
    var list = desk.querySelectorAll(".w.ev");
    for (var i = 0; i < list.length; i++) { list[i].classList.remove("ev"); list[i].classList.remove("seen"); }
  }
  /* The words of the sentence a clue is about, in the order it speaks of them. A word counts when the
     clue names it in Latin, names its ending ("-am"), or names it in English ("the roses", "the verb").
     A clue that names nothing is about the mystery word itself, so no clue is left without a ring. */
  function evidenceButtons(clue) {
    var c = R && R.cur, hits = [];
    if (!c || !c.q.words) { return hits; }
    var text = " " + plain(clue.say).toLowerCase() + " ";
    var btns = desk.querySelectorAll(".scroll .w"), LET = /[a-z\u00c0-\u024f]/;
    function find(f, english) {
      var from = 0, p;
      while ((p = text.indexOf(f, from)) >= 0) {
        var rest = text.slice(p + f.length, p + f.length + 3);
        if (!LET.test(text.charAt(p - 1)) && (english ? /^(s|es|d|ed)?([^a-z\u00c0-\u024f]|$)/.test(rest) : !LET.test(rest.charAt(0)))) { return p; }
        from = p + 1;
      }
      return -1;
    }
    c.q.words.forEach(function (w, i) {
      /* the empty slot of a gap question is never visited: a ring there would say "this is the one" */
      if (c.q.gap && w.t) { return; }
      var f = String(w.w).toLowerCase(), at = find(f, false);
      text.replace(/[^a-z\u00c0-\u024f]-([a-z\u00c0-\u024f]+)/g, function (m0, s, pos) {
        if (f.length > s.length && f.slice(-s.length) === s && (at < 0 || pos < at)) { at = pos; }
        return m0;
      });
      if (at < 0) {
        var terms = String(w.g || "").toLowerCase().replace(/\([^)]*\)/g, " ").split(/[^a-z]+/);
        if (w.r === "verb") { terms.push("verb"); }
        terms.forEach(function (term) {
          if (term.length < 4) { return; }
          var p = find(term, true);
          if (p < 0 && /s$/.test(term)) { p = find(term.slice(0, -1), true); }
          if (p >= 0 && (at < 0 || p < at)) { at = p; }
        });
      }
      if (at >= 0 && btns[i]) { hits.push({ b: btns[i], at: at, i: i }); }
    });
    hits.sort(function (x, y) { return x.at - y.at || x.i - y.i; });
    var out = hits.slice(0, 3).map(function (h) { return h.b; });
    if (!out.length) { var tb = desk.querySelector(".scroll .w.t:not(.gap)"); if (tb) { out.push(tb); } }
    return out;
  }
  function showClue(n, fresh) {
    var c = R.cur, q = c.q, total = q.clues.length, clue = q.clues[n - 1];
    var v = desk.querySelector(".v-play");
    if (!clue || !v) { return; }
    var a = document.activeElement, i, k;
    var hadFocus = !!(a && a.getAttribute && (a.getAttribute("data-action") === "clue" || a.hasAttribute("data-clue-tab")));
    var wasTab = !!(a && a.hasAttribute && a.hasAttribute("data-clue-tab"));
    var marks = flipMark(v);
    var note = v.querySelector(".clue-note");
    if (!note) {
      note = el("section", "clue-note");
      note.setAttribute("aria-label", "The Inspector's clues");
      v.insertBefore(note, v.firstChild);
      v.classList.add("has-clue");
    }
    var h = '<div class="cn-head' + (c.clues < total ? " more" : "") + '"><span class="cn-tag">' + icon("glass") + "<span>Clue " + n + " of " + total + "</span></span>";
    if (c.clues > 1) {
      h += '<span class="cn-tabs">';
      for (i = 1; i <= c.clues; i++) { h += '<button type="button" class="cn-tab" data-clue-tab="' + i + '" aria-pressed="' + (i === n ? "true" : "false") + '" aria-label="Show clue ' + i + '">' + i + "</button>"; }
      h += "</span>";
    }
    note.innerHTML = h + '</div><div class="cn-text"></div>';
    dropLens();
    clearEvidence();
    if (!fresh) { for (k in c.out) { if (c.out[k]) { stampOut(k, false); } } }
    syncClueBtn();
    var btns = evidenceButtons(clue);
    say([{ html: clue.say, type: fresh }], {
      into: note.querySelector(".cn-text"), live: false,
      onDone: function () {
        if (c.answered || R.cur !== c) { return; }
        /* (where the evidence had to make way on a very short screen there is nothing to visit) */
        tourEvidence(v.classList.contains("no-ev") ? [] : btns, fresh, function () {
          if (!fresh || c.answered || R.cur !== c) { return; }
          mood("think");
          outKeys(clue).forEach(function (key) { stampOut(key, true); });
          /* (a stamp makes its card a little taller: the screen is fitted once more) */
          fitPlay();
        });
      }
    });
    announce("Clue " + n + " of " + total + ". " + plain(clue.say) + (n === total && fresh ? " " + plain(L.noMoreClues) : ""));
    fitPlay();
    flipGlide(marks);
    if (hadFocus) {
      var f = wasTab ? note.querySelector('.cn-tab[aria-pressed="true"]') : null;
      if (!f) { f = desk.querySelector('.play-dock [data-action="clue"]:not([disabled])') || desk.querySelector(".answers .opt:not(:disabled)"); }
      try { if (f) { f.focus({ preventScroll: true }); } } catch (e) { /* ignore */ }
    }
  }
  function askClue() {
    var c = R && R.cur;
    if (view !== "play" || !c || c.answered) { return; }
    var total = c.q.clues ? c.q.clues.length : 0, t = now(), k;
    if (c.clues >= total) { return; }
    /* one press, one clue: a double tap must not spend the second clue before the first can be read */
    if (c.clueAt && (t - c.clueAt < 450 || (!speech.done && speech.box !== bText))) { return; }
    for (k in c.out) { if (c.out[k]) { stampOut(k, false); } }
    var clue = c.q.clues[c.clues];
    c.clues++;
    c.clueAt = t;
    R.clues++;
    outKeys(clue).forEach(function (key) { c.out[key] = true; });
    hideGloss();
    Sfx.play("clue");
    mood("search");
    showClue(c.clues, true);
  }

  /* answering */
  /* ------------------------------------------- a wrong pick has an alibi (request 7)
     After a wrong pick the child is told why THAT card is not it, before the right answer and its
     reason. It is the Inspector who says it, right after his line ("Close, but that suspect has an
     alibi." "Why not Dative? ..."), and his words are where he is: in his bubble while he stands on
     the stage (there they take the place of the question he asked, so the case note keeps its size),
     and in the case note, first thing under his line, once he has hopped into it on a phone.
     The text is the data's (question.whyNot[key of the card]) and is never written here. A question
     that has none for the card gets the right answer and its reason only, as before. */
  function whyNot(q, k) {
    var t = q && q.whyNot && typeof q.whyNot === "object" && k !== q.answer && Object.prototype.hasOwnProperty.call(q.whyNot, k) ? q.whyNot[k] : "";
    return typeof t === "string" ? t : "";
  }
  function alibiOf(c) {
    if (!c || !c.answered || c.ok) { return null; }
    var o = optByKey(c.opts, c.picked), t = o ? whyNot(c.q, c.picked) : "";
    return t ? { o: o, text: t } : null;
  }
  /* "Why not Dative?" as data-style text: a Latin form is in italics, as everywhere */
  function alibiAsk(o) { return "Why not " + (o.latin ? "<i>" + plain(o.label) + "</i>" : plain(o.label)) + "?"; }
  function buildSheet(c, ok) {
    var q = c.q, right = optByKey(c.opts, q.answer), mine = optByKey(c.opts, c.picked), al = alibiOf(c);
    var s = el("section", "sheet " + (ok ? "good" : "bad") + (al ? " has-wn" : "")), h = "", job = right ? jobOf(right) : "";
    s.setAttribute("aria-label", "What the Inspector found");
    var jobHtml = job ? '<span class="sh-job">' + esc(job) + "</span>" : "";
    /* With an alibi the note has two faces, and the stylesheet shows one of them: "Not X / It is Y" beside
       the verdict mark while he explains the pick in his bubble; or, when he sits in the note, "Why not X?"
       beside him, the alibi under it, and then "The answer: Y". */
    h += '<div class="sh-head"><div class="sh-insp"></div><span class="sh-ic">' + icon(ok ? "check" : "x") + '</span><div class="sh-ttl"><div class="sh-say"></div>' +
      (ok ? '<p class="sh-line"><b>' + (c.retry ? "Got it this time" : "Correct") + "</b>" + optionChip(right, "pop") + jobHtml + "</p>"
        : '<p class="sh-line sh-not"><b>Not</b>' + optionChip(mine, "no") + '</p><p class="sh-line sh-is"><b>It is</b>' + optionChip(right, "pop") + jobHtml + "</p>" +
          (al ? '<p class="sh-line sh-ask"><b>Why not</b>' + optionChip(mine, "no") + "<b>?</b></p>" : "")) + "</div></div>";
    if (al) {
      h += '<p class="sh-wn">' + rich(al.text) + "</p>";
      h += '<p class="sh-line sh-ans"><span class="sh-ok">' + icon("check") + "</span><b>The answer:</b>" + optionChip(right, "") + jobHtml + "</p>";
    }
    h += '<p class="sh-q"><b>The question:</b> ' + rich(q.prompt) + "</p>";
    h += '<p class="sh-why">' + rich(q.why) + "</p>";
    if (!ok && !c.retry) { h += '<p class="sh-note">' + icon("replay") + "<span>" + esc(L.retryNote) + "</span></p>"; }
    s.innerHTML = h;
    return s;
  }
  /* the answers make way for the case note, but not before the tapped card has been seen to get its mark */
  function ghostAnswers(box, rect, v) {
    if (reduced() || !rect.width) { return; }
    var g = box.cloneNode(true), list = g.querySelectorAll("button"), vr = v.getBoundingClientRect(), sheet = v.querySelector(".sheet");
    for (var i = 0; i < list.length; i++) { list[i].removeAttribute("data-k"); list[i].setAttribute("tabindex", "-1"); list[i].disabled = true; }
    g.className += " ghost";
    g.setAttribute("aria-hidden", "true");
    g.removeAttribute("role");
    g.removeAttribute("aria-label");
    var top = sheet ? sheet.getBoundingClientRect().top - vr.top : rect.top - vr.top;
    g.style.left = (rect.left - vr.left) + "px";
    g.style.top = top + "px";
    g.style.width = rect.width + "px";
    g.style.height = rect.height + "px";
    g.style.setProperty("--dy", (rect.top - vr.top - top).toFixed(1) + "px");
    v.appendChild(g);
    setTimeout(function () { if (g.parentNode) { g.parentNode.removeChild(g); } }, 620);
  }
  /* what he says about the answer: in his bubble, above the question he asked, or (when the scene has
     folded away on a small phone) beside him in the case note */
  function reactionParts(inNote) {
    var c = R.cur, parts = [{ html: c.line, cls: "b-lead" }], al = inNote ? null : alibiOf(c);
    if (c.extra) { parts.push({ html: c.extra, cls: "b-lead" }); }
    if (inNote) { return parts; }
    /* on the stage: the alibi of a wrong pick, or else the question he asked */
    if (al) { parts.push({ html: "<b>" + alibiAsk(al.o) + "</b> " + al.text, cls: "b-wn" }); }
    else { parts.push({ html: c.q.prompt, cls: "b-q", type: false }); }
    return parts;
  }
  function sayReaction(instant) {
    var compact = app.classList.contains("compact"), into = desk.querySelector(".sh-say");
    if (compact && into) {
      say(reactionParts(true), { into: into, live: false, instant: instant });
      return;
    }
    if (into) { into.textContent = ""; }
    say(reactionParts(false), { live: false, instant: instant });
    applyReserve();
  }
  /* The answered screen has to show the whole lesson at once: the sentence with every job label, the
     verdict, the meaning, the whole explanation and the way on. On a single-column screen that cannot
     hold all of that under the big scene, the scene folds away and the Inspector hops into the note. */
  var hopRect = null;
  function fitAnswered(first) {
    var c = R && R.cur, v = desk.querySelector(".v-play.answered");
    if (view !== "play" || !c || !c.answered || !v) { return; }
    var compact = app.classList.contains("compact"), wide = wideLayout();
    if (compact && wide) {
      app.classList.remove("compact");
      undockInspector();
      sayReaction(true);
      return;
    }
    if (compact || wide) { return; }
    var low = v.classList.contains("is-sentence") && window.innerHeight < 700;
    /* on a tablet he first gives back some of his own height: the scene does not fold away for a few
       pixels, to leave half a desk bare */
    if (!low && pageOver() > 0) { spareInspector(false); }
    /* and there the picture of the sentence makes way before his scene does (a picture takes nothing
       away). If the screen is too long even without it, the scene folds as on a phone and the picture
       stays. */
    if (!low && SC && pageOver() > 0 && window.innerWidth >= 600) {
      var pb = SC.box;
      pb.hidden = true;
      app.style.removeProperty("--insp");
      fitInspector();
      applyReserve();
      if (pageOver() > 0) { spareInspector(false); }
      if (pageOver() > 0) { pb.hidden = false; } else { dropScene(); }
    }
    var need = low || pageOver() > 0;
    if (!need) { return; }
    var from = first ? inspFig.getBoundingClientRect() : null;
    hopRect = from;
    app.classList.add("compact");
    stage.style.minHeight = "";
    dockInspector(v.querySelector(".sh-insp"), from);
    if (!first) { sayReaction(true); }
  }
  /* if even the folded screen is too long, it closes ranks ("dense"), and then the reminder that the
     question will come back gives way: he says so again when it does. (On a wide screen the reminder is
     the one thing that can go.) */
  function trimAnswered(gentle) {
    var sheet = desk.querySelector(".sheet"), v = sheet ? sheet.parentNode : null;
    if (!sheet || !v) { return; }
    sheet.classList.remove("terse");
    v.classList.remove("dense");
    v.classList.remove("dense2");
    if (v.classList.contains("lean")) { v.classList.remove("lean"); layoutScroll(); }
    /* Beside the Inspector, on a tall laptop screen or a tablet on its side, the words of the sentence
       are large. There they first take the size they have on a lower laptop screen ("lean"), which
       brings a sentence of two rows back into one. (30 px: still far above the smallest size for Latin.) */
    if (pageOver() > 0 && v.classList.contains("is-sentence") && wideLayout()) { v.classList.add("lean"); layoutScroll(); }
    /* then the spacing closes up, which costs nothing; only then does the reminder go; and if a long
       alibi still needs a few pixels, the lines of the two texts stand closer (the type keeps its size).
       gentle: only what costs nothing. That is all a picture of the sentence may ask for: if the screen
       is still too long with it, the picture goes (sceneGiveAnswered) before the reminder does. */
    if (pageOver() > 0) { v.classList.add("dense"); }
    if (gentle) { return; }
    if (pageOver() > 0) { sheet.classList.add("terse"); }
    if (pageOver() > 0) { v.classList.add("dense2"); }
  }
  function answer(k) {
    var c = R && R.cur;
    if (view !== "play" || !c || c.answered) { return; }
    if (c.out[k]) { stampOut(k, false); return; }
    var q = c.q, ok = k === q.answer, i;
    c.answered = true;
    c.ok = ok;
    c.picked = k;
    if (!c.retry) {
      R.results.push(ok);
      if (ok) { R.right++; R.streak++; R.best = Math.max(R.best, R.streak); }
      else { R.streak = 0; R.missed.push(q); R.picks[q.id] = k; R.queue.push({ q: q, retry: true }); }
      setStreak(R.streak);
    } else if (ok) { R.fixed[q.id] = true; }
    clearViewTimers();
    hideGloss();
    dropLens();
    clearEvidence();
    var v = desk.querySelector(".v-play"), sentence = v.classList.contains("is-sentence");
    var dock = v.querySelector(".play-dock"), box = v.querySelector(".answers"), list = box.querySelectorAll(".opt");
    var marks = flipMark(v), boxRect = box.getBoundingClientRect();
    var note = v.querySelector(".clue-note");
    if (note) { v.removeChild(note); }
    v.classList.remove("has-clue"); v.classList.remove("snug"); v.classList.remove("snug2"); v.classList.remove("tight"); v.classList.remove("no-ev"); v.classList.remove("cb-up"); v.classList.remove("bare");
    app.classList.remove("terse");
    box.classList.add("locked");
    for (i = 0; i < list.length; i++) {
      var b = list[i], bk = b.getAttribute("data-k");
      b.disabled = true;
      if (bk === q.answer) { b.classList.add("right"); b.querySelector(".o-mark").innerHTML = icon("check"); }
      else if (bk === k) { b.classList.add("wrong"); b.querySelector(".o-mark").innerHTML = icon("x"); }
    }
    fitAnswers(true);
    fillGap(v, q);
    layoutScroll();
    revealWords(null);
    var wrap = v.querySelector(".scroll-wrap");
    if (wrap && q.translation) { wrap.appendChild(el("p", "s-tr", "“" + rich(q.translation) + "”")); }
    midPips();
    v.classList.add("answered");
    v.insertBefore(buildSheet(c, ok), dock);
    dock.className = "dock stick play-dock";
    dock.innerHTML = '<button type="button" class="btn primary" data-primary>' + (R.pos >= R.queue.length - 1 ? "See the verdict" : "Next") + icon("next") + "</button>";
    app.style.removeProperty("--insp");
    fitInspector();
    sceneAnswered(v, q);

    c.line = pickLine(ok ? L.correct : L.wrong, ok ? "ok" : "no");
    c.extra = ok && !c.retry && L.streak && L.streak[String(R.streak)] ? L.streak[String(R.streak)] : "";
    /* try the roomy layout first; fitAnswered folds the scene away if the lesson does not fit under it */
    say(reactionParts(false), { instant: true, live: false });
    applyReserve();
    fitAnswered(true);
    if (kb) {
      var p = dock.querySelector("[data-primary]");
      try { if (p) { p.focus({ preventScroll: true }); } } catch (e) { /* ignore */ }
    }
    /* He reacts, and then his eyes go to what the answer was about (the word and its new label, or the
       right card) while the player reads; he does not stand there with his eyes shut. */
    var about = sentence ? (v.querySelector(".wu .w.t") || wrap) : optButton(q.answer);
    if (ok) {
      act("cheer", c.extra ? 2200 : 1500);
      mood("proud");
      Sfx.play("correct");
      later(function () { sparks(desk.querySelector(".sheet .chip.pop"), 8); }, 300);
      if (c.extra) { later(function () { Sfx.play("star"); }, 380); }
      later(function () { mood("idle"); lookAtNode(about, 1700); }, c.extra ? 3000 : 2300);
    } else {
      mood("oops");
      Sfx.play("wrong");
      later(function () { mood("think"); lookAtNode(about, 1900); }, 1300);
      later(function () { mood("idle"); }, 4200);
    }
    sayReaction(false);
    trimAnswered(!!SC);
    if (SC && pageOver() > 0) { sceneGiveAnswered(); }
    sceneLate(v, q);
    sceneSettle();
    /* now the screen has its shape: what moved glides from where it was, and he hops from where he stood */
    if (docked && hopRect) { hopFrom(docked, hopRect); }
    hopRect = null;
    if (sentence) { ghostAnswers(box, boxRect, v); }
    flipGlide(marks);
    /* a screen reader hears it in the order of the screen: his line, the alibi of the pick, the right
       answer, the meaning of the sentence, the reason */
    var right = optByKey(c.opts, q.answer), al = alibiOf(c);
    announce(plain(c.line) + " " + (al ? plain(alibiAsk(al.o)) + " " + plain(al.text) + " " : "") + (ok ? "" : "The answer is " + (right ? plain(right.label) : "") + ". ") +
      (q.translation ? "“" + plain(q.translation) + "” " : "") + plain(q.why) + (!ok && !c.retry ? " " + L.retryNote : ""));
  }
  function nextQuestion() {
    if (!R || !R.cur || !R.cur.answered || view !== "play") { return; }
    Sfx.play("tap");
    R.pos++;
    if (R.pos >= R.queue.length) { finishRound(); } else { showQuestion(false); }
  }

  /* ------------------------------------------------------------ results */
  function finishRound() {
    var file = R.file, id = file.id, stars = starsFor(R.right / R.n);
    var res = { stars: stars, best: false, keep: 0, solo: false, rankUp: "", practice: R.practice };
    R.done = true;
    paused = null;
    if (!R.practice) {
      var before = rankFor(totalStars()), prev = save.stars[id] || 0;
      if (stars > prev) { save.stars[id] = stars; res.best = prev > 0; } else if (stars < prev) { res.keep = prev; }
      if (stars === 3 && R.clues === 0) { res.solo = true; save.solo[id] = true; }
      save.seen["round:" + id] = true;
      persist();
      var after = rankFor(totalStars());
      if (after.index > before.index) { res.rankUp = after.title; }
    }
    showResults(res);
  }
  /* a word of one or two letters right before the bold name stays with the word before it (the name
     starts a line of its own in the gold box: "now a" / "Junior Detective.") */
  function tieShort(html) { return String(html).replace(/ (\S{1,2}) (<b>)/, "\u00a0$1 $2"); }
  /* how far the main button of the results ends below the first screen */
  function mainOver(actions) {
    var b = actions ? actions.querySelector(".btn.primary") : null;
    if (!b || !b.getClientRects().length) { return 0; }
    return Math.max(0, Math.ceil(b.getBoundingClientRect().bottom + (window.pageYOffset || 0) - window.innerHeight));
  }
  /* ... and if it does, it is pinned to the foot of the screen (stylesheet: .res-actions.pin) */
  function resPin(actions) {
    if (!actions) { return; }
    actions.classList.remove("pin");
    if (mainOver(actions) > 0) { actions.classList.add("pin"); }
  }
  function showResults(res) {
    var file = R.file, n = R.n, missed = R.missed.slice(), stars = res.stars, i;
    var nextF = FILES[FILES.indexOf(file) + 1] || null;
    var v = el("div", "view v-results"), h = "";
    h += '<section class="verdict"><span class="chip-file">' + (res.practice ? "Practice round" : "File " + file.n) + '</span><h1 class="vd-title">' + txt(file.title) + "</h1>";
    if (res.practice) {
      h += '<div class="vd-big">' + icon(missed.length ? "glass" : "check", "") + "</div>";
    } else {
      h += '<div class="vd-stars" role="img" aria-label="' + stars + ' of 3 stars">';
      for (i = 0; i < 3; i++) { h += '<span class="vsw"><svg class="vs" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-star"></use></svg></span>'; }
      h += '</div><div class="stamp-row"><span class="stamp' + (stars >= 2 ? "" : " still") + '">' + esc(stars >= 2 ? L.stamp.closed : L.stamp.open) + "</span></div>";
    }
    h += '<ul class="vd-stats"><li><b>' + R.right + "/" + n + "</b><span>" + (res.practice ? "fixed" : "first try") + "</span></li><li><b>" + R.best + "</b><span>best streak</span></li><li><b>" + R.clues + "</b><span>" + (R.clues === 1 ? "clue used" : "clues used") + "</span></li></ul>";
    if (res.solo) { h += '<p class="vd-extra vd-solo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-ribbon"></use></svg><span>' + esc(L.solo) + "</span></p>"; }
    var rankLine = res.rankUp ? fill(L.rankUp, { rank: res.rankUp }) : "", sayRank = !!rankLine;
    if (res.rankUp) {
      h += '<div class="vd-extra vd-rank"><svg viewBox="0 0 48 52" aria-hidden="true" focusable="false"><use href="#i-badge"></use></svg><p>' + tieShort(rich(rankLine)) + "</p>" + rankRowHtml(totalStars()) + "</div>";
    }
    if (res.best) { h += '<p class="vd-best">New best</p>'; }
    else if (res.keep) { h += '<p class="vd-best keep">Your best here is still ' + res.keep + (res.keep === 1 ? " star" : " stars") + "</p>"; }
    h += "</section>";

    /* one main way on, and the others in a single row under it */
    var main = missed.length ? "practice" : (nextF ? "next" : "home");
    function btn(a, label, ic, small) {
      var p = a === main;
      return '<button type="button" class="btn ' + (p ? "primary" : "ghost") + '" data-action="' + a + '"' + (p ? " data-primary" : "") + ">" + (ic && !(p && a === "next") ? icon(ic) : "") +
        "<span>" + label + (p && small ? "<small>" + txt(small) + "</small>" : "") + "</span>" + (p && a === "next" ? icon("next") : "") + "</button>";
    }
    var acts = [];
    if (missed.length) { acts.push(["practice", res.practice ? "Practice them again" : "Practice my " + (missed.length === 1 ? "miss" : missed.length + " misses"), "glass", ""]); }
    if (nextF) { acts.push(["next", "Next file", "next", nextF.title]); }
    acts.push(["again", "Play again", "replay", ""]);
    acts.push(["home", "Case files", "files", ""]);
    var first = "", rest = "";
    acts.forEach(function (a) { if (a[0] === main) { first = btn(a[0], a[1], a[2], a[3]); } else { rest += btn(a[0], a[1], a[2], a[3]); } });
    h += '<div class="res-actions">' + first + '<div class="res-more">' + rest + "</div></div>";

    if (missed.length) {
      h += '<section class="misses"><h2>' + (res.practice ? "Still on the loose" : "Notes on the ones that got away") + "</h2>";
      missed.forEach(function (q) {
        var right = optByKey(q.options, q.answer), fixed = !!R.fixed[q.id];
        var pk = Object.prototype.hasOwnProperty.call(R.picks, q.id) ? R.picks[q.id] : null, mine = pk === null ? null : optByKey(q.options, pk), alibi = mine ? whyNot(q, pk) : "";
        /* A sentence question is asked in the same words every time, so its sentence says it all. Every
           other question needs its own words first; its Latin example, where it has one, comes with it. */
        var asked = q.type === "sentence" && q.words ? "" : '<p class="miss-p">' + rich(q.prompt) + "</p>";
        h += '<article class="miss">' + asked + (q.words ? '<p class="miss-q" lang="la">' + sentenceText(q.words, true) + "</p>" + (q.translation ? '<p class="miss-tr">“' + rich(q.translation) + "”</p>" : "") : "") +
          '<p class="miss-a"><span>Answer</span>' + (right ? optionChip(right) : "") + (fixed ? '<span class="miss-fixed">' + icon("check") + "Fixed on the second look</span>" : "") + '</p><p class="miss-why">' + rich(q.why) + "</p>" +
          (alibi ? '<p class="miss-wn"><span class="miss-ask">Why not' + optionChip(mine, "no") + "<b>?</b></span>" + rich(alibi) + "</p>" : "") + "</article>";
      });
      h += "</section>";
    }
    v.innerHTML = h;
    setView("results", v);
    midFile(file);

    var card = v.querySelector(".verdict"), starEls = v.querySelectorAll(".vs"), stamp = v.querySelector(".stamp");
    var stats = v.querySelector(".vd-stats"), extras = v.querySelectorAll(".vd-extra"), actions = v.querySelector(".res-actions");
    function starOn(idx) { starEls[idx].classList.add("on"); Sfx.play("star"); sparks(starEls[idx], 7); lookAtNode(starEls[idx], 600); }
    function stampOn() {
      if (!stamp) { return; }
      stamp.classList.add("in");
      card.classList.add("hit");
      Sfx.play("stamp");
      lookAtNode(stamp, 1200);
      if (stars >= 2) {
        /* the paper flies from the stamp as it lands; a perfect file also gets a shower that is gone
           before it reaches the buttons */
        later(function () { burst(stamp, stars === 3 ? 22 : 14); }, 150);
        later(function () { Sfx.play("fanfare"); }, 260);
        if (stars === 3) { confetti(30 + (res.rankUp ? 12 : 0), card.getBoundingClientRect().bottom); }
      }
    }
    function extraOn(idx) {
      extras[idx].classList.add("in");
      lookAtNode(extras[idx], 1200);
      if (extras[idx].classList.contains("vd-rank")) {
        /* a promotion is its own beat: the badge lands, paper flies from it, and he says it himself */
        Sfx.play("rankup");
        burst(extras[idx].querySelector("svg"), 18);
        act("cheer", 2400);
        if (sayRank) { say([{ html: line, type: false }, { html: rankLine, cls: "b-lead" }]); }
      } else { Sfx.play("star"); }
    }
    var line, t = 250;
    if (res.practice) {
      line = missed.length ? L.practiceDone.some : L.practiceDone.all;
      if (missed.length) { mood("point"); } else { act("cheer", 1800); mood("proud"); later(function () { burst(v.querySelector(".vd-big"), 16); }, 200); Sfx.play("fanfare"); }
      stats.classList.add("in");
    } else {
      line = L.results[String(stars)] || "";
      if (stars === 3) { act("cheer", 2400); mood("proud"); }
      else if (stars === 2) { act("cheer", 1500); mood("proud"); }
      else if (stars === 1) { mood("point"); }
      else { mood("think"); }
      if (reduced()) {
        for (i = 0; i < stars; i++) { starEls[i].classList.add("on"); }
        stamp.classList.add("in");
        stats.classList.add("in");
        for (i = 0; i < extras.length; i++) { extras[i].classList.add("in"); }
        Sfx.play("stamp");
      } else {
        for (i = 0; i < stars; i++) { later(starOn.bind(null, i), t + i * 250); }
        t += stars * 250 + (stars ? 100 : 150);
        later(stampOn, t);
        later(function () { stats.classList.add("in"); }, t + 250);
        for (i = 0; i < extras.length; i++) { later(extraOn.bind(null, i), t + 500 + i * 260); }
      }
    }
    /* The main way on has to be on the screen when the verdict is in. Where even his smallest size
       leaves the page too long for that (a promotion on a short phone, a low laptop window), he first
       leaves the promotion to the gold box, which says it in the same words, and then the main button
       is pinned to the foot of the screen. */
    var both = [{ html: line }, { html: rankLine, cls: "b-lead" }];
    function settle() {
      actions.classList.remove("pin");
      if (sayRank && (res.practice || reduced())) { say(both); } else { sayLine(line); }
      reserveStage(sayRank ? [both] : null, null);
      /* (with a promotion to come the stage keeps the room of both lines, also while he gives up
         height: the button must still be on the screen when he says the second one) */
      if (sayRank) { applyReserve(true); }
      squeezeInspector(actions, false, sayRank);
    }
    settle();
    if (sayRank && mainOver(actions) > 0) {
      sayRank = false;
      app.style.removeProperty("--insp");
      fitInspector();
      settle();
      announce(plain(line) + " " + plain(rankLine));
    }
    resPin(actions);
  }

  /* ------------------------------------------------------------ actions */
  function toggleSound() {
    save.sound = !save.sound;
    Sfx.setMuted(!save.sound);
    persist();
    syncSound();
    if (save.sound) { Sfx.play("tap"); }
  }
  function toggleMusic() {
    if (!MUSIC) { return; }
    save.music = !save.music;
    try { MUSIC.setEnabled(save.music); } catch (e) { /* the game works without music */ }
    persist();
    syncMusic();
  }
  function nextPiece() { if (MUSIC && save.music) { try { MUSIC.next(); } catch (e) { /* ignore */ } } }
  var ACT = {
    home: goHome,
    notebook: openNotebook,
    sound: toggleSound,
    music: toggleMusic,
    "music-next": nextPiece,
    clue: askClue,
    reset: openConfirm,
    skip: function () { if (view === "briefing" && B) { briefSkip(); } else if (view === "training" && T) { finishTraining(); } },
    practice: function () { if (view === "results" && R && R.missed.length) { startRound(R.file, R.missed.slice()); } },
    next: function () { var f = R ? FILES[FILES.indexOf(R.file) + 1] : null; if (view === "results" && f) { paused = null; briefing(f); } },
    again: function () { if (view === "results" && R) { startRound(R.file); } },
    hear: function () { if (view === "briefing" && B) { briefing(B.file, { hear: true }); } },
    retrain: function () { if (view === "briefing" && B && B.file.training) { training(B.file); } }
  };
  var QUIET = { clue: 1, sound: 1, skip: 1, reset: 1 };
  function primary(btn) {
    if (view === "home") { Sfx.play("tap"); openFile(btn.getAttribute("data-open")); }
    else if (view === "briefing" && B) { briefPrimary(); }
    else if (view === "training" && T) { trainPrimary(); }
    else if (view === "play") { nextQuestion(); }
  }
  /* The second tap of a double tap must not press a control that was not there for the first one: a
     double tap on an answer cannot press Next, and a double tap on Next cannot answer the next question
     or spend a clue. Only a true second tap is held back, and never a first one, however soon it comes
     after the screen changed and wherever it lands:
     - with a mouse the browser itself counts the clicks, and only its count (2 or more) is believed;
     - with a finger or a pen it is a touch on the same spot that began less than a quarter of a second
       after the last press, sooner than anyone could have seen what the press brought up.
     Either way it has to be the same spot and another control. The same button again, another spot and
     every key always go through, and so does anything after 0.8 s, so nothing slows a fast player. */
  var lastTap = { t: 0, x: 0, y: 0, el: null }, ptrAt = 0, ptrDown = 0, ptrKind = "";
  document.addEventListener("pointerdown", function (e) { ptrKind = e.pointerType || ""; ptrDown = now(); }, true);
  document.addEventListener("pointerup", function () { ptrAt = now(); }, true);
  function strayTap(e, t) {
    var tm = now(), byPointer = tm - ptrAt < 700;
    if (!(e.detail > 0 || byPointer)) { return false; }
    if (lastTap.el && lastTap.el !== t && Math.abs(e.clientX - lastTap.x) < 24 && Math.abs(e.clientY - lastTap.y) < 24) {
      var finger = byPointer && ptrKind !== "" && ptrKind !== "mouse";
      if (finger ? ptrDown - lastTap.t < 250 : (e.detail >= 2 && tm - lastTap.t < 800)) { return true; }
    }
    lastTap = { t: tm, x: e.clientX, y: e.clientY, el: t };
    return false;
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("button, a") : null;
    if (!t || t.disabled) { return; }
    if (strayTap(e, t)) { e.preventDefault(); return; }
    var a = t.getAttribute("data-action");
    if (a && ACT[a]) {
      if (!QUIET[a]) { Sfx.play("tap"); }
      ACT[a](t);
      return;
    }
    if (t.hasAttribute("data-clue-tab")) { Sfx.play("tap"); if (R && R.cur && !R.cur.answered) { showClue(+t.getAttribute("data-clue-tab"), false); } return; }
    if (t.hasAttribute("data-primary")) { primary(t); return; }
    if (t.hasAttribute("data-file")) { Sfx.play("tap"); openFile(t.getAttribute("data-file")); return; }
    if (t.hasAttribute("data-k")) {
      if (view === "training" && T) { trainSuspect(t.getAttribute("data-k"), t); } else { answer(t.getAttribute("data-k")); }
      return;
    }
    if (t.hasAttribute("data-word")) {
      var wi = +t.getAttribute("data-word");
      if (view === "training" && T) { trainWord(wi, t); }
      else if (view === "play" && R && R.cur && R.cur.q.words && R.cur.q.words[wi]) { Sfx.play("tap"); showGloss(t, R.cur.q.words[wi]); scenePulse(wi); }
      else if (view === "briefing" && B && B.lesson && B.lesson.words[wi]) {
        Sfx.play("tap");
        showGloss(t, B.lesson.words[wi]);
        if (LS) { try { LS.ctl.pulse(wi); } catch (e2) { /* ignore */ } }
      }
      return;
    }
    if (t.hasAttribute("data-choice") && view === "training" && T) { trainChoice(+t.getAttribute("data-choice"), t); }
  });

  /* ----------------------------------------------------------- keyboard */
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var k = e.key;
    if (k === "Tab" || k === "Enter" || k === " " || /^Arrow/.test(k) || /^[1-4]$/.test(k)) { kb = true; }
    /* a held key is one press: it must not run through a whole briefing */
    if (e.repeat && (k === "Enter" || k === " " || /^[1-9a-z]$/i.test(k))) { e.preventDefault(); return; }
    if (cfOpen) {
      if (k === "Escape") { e.preventDefault(); closeConfirm(); } else if (k === "Tab") { trapTab(e, cf); }
      return;
    }
    if (nbOpen) {
      if (k === "Escape" || k === "n" || k === "N") { e.preventDefault(); closeNotebook(); } else if (k === "Tab") { trapTab(e, nb); }
      return;
    }
    if (k === "Escape") { hideGloss(); return; }
    if (!speech.done && k.length === 1 && k !== " ") { finishTyping(); }
    var ae = document.activeElement;
    var onControl = !!(ae && ae !== document.body && ae.matches && ae.matches("button:not([disabled]), a[href], input, select, textarea"));
    var list, b;
    if (/^[1-4]$/.test(k)) {
      if (view === "play" && R && R.cur && !R.cur.answered) { list = desk.querySelectorAll(".answers .opt"); }
      else if (view === "training" && T && !T.outro && T.phase === "ask") {
        var s = T.tr.steps[T.i];
        list = s.kind === "pick" ? T.slot.querySelectorAll(".choice") : (s.kind === "answer" ? desk.querySelectorAll(".answers .opt") : null);
      }
      b = list ? list[+k - 1] : null;
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if (k === "Enter" || k === " ") {
      if (onControl) { return; }
      if (view === "play" && R && R.cur && R.cur.answered) { e.preventDefault(); nextQuestion(); return; }
      b = primaryBtn();
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (k === "c" || k === "C") {
      b = view === "play" ? desk.querySelector('[data-action="clue"]:not([disabled])') : null;
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (k === "m" || k === "M") { e.preventDefault(); toggleSound(); return; }
    if (k === "n" || k === "N") { e.preventDefault(); openNotebook(); }
  });

  /* when the window changes size (or the fonts arrive) every screen fits itself again */
  function refit() {
    hideGloss();
    var c = view === "play" && R ? R.cur : null, pv = c && !c.answered ? desk.querySelector(".v-play") : null;
    /* (the evidence may have made way for the old size: it has to be back before it is measured) */
    if (pv) { pv.classList.remove("no-ev"); }
    fitPips();
    layoutScroll();
    fitAnswers();
    if (c && c.answered) {
      var av = desk.querySelector(".v-play.answered"), tier = sceneLay(), late = tier === "late";
      if (SC && SC.tier !== tier) { dropScene(); }
      /* (late: the screen is fitted without the picture, which then stays only if it still has the room) */
      if (late) { if (SC) { SC.box.hidden = true; } } else if (!SC && av) { sceneAnswered(av, c.q); }
      if (!docked) { app.style.removeProperty("--insp"); fitInspector(); applyReserve(); }
      fitAnswered(false);
      hopRect = null;
      if (!docked) { fitInspector(); applyReserve(); }
      trimAnswered(!!SC && !late);
      if (SC && !late && pageOver() > 0) { sceneGiveAnswered(); }
      sceneLate(av, c.q);
      sceneSettle();
      return;
    }
    app.style.removeProperty("--insp");
    fitInspector();
    if (c) {
      var v = desk.querySelector(".v-play");
      if (v) { v.classList.remove("snug"); v.classList.remove("snug2"); v.classList.remove("tight"); v.classList.remove("cb-up"); v.classList.remove("bare"); }
      app.classList.remove("terse");
      if (SC && SC.tier !== sceneLay()) { dropScene(); }
      fitPlay();
      sceneAsk();
      sceneResize();
      placeLens();
      return;
    }
    applyReserve();
    if (view === "training" && T) { trainFit(); }
    else if (view === "briefing" && B) { briefFit(true); squeezeInspector(B.view.lastElementChild); applyReserve(); }
    else if (view === "results") { var ra = desk.querySelector(".res-actions"); if (ra) { ra.classList.remove("pin"); squeezeInspector(ra); resPin(ra); } }
  }
  var resizeRaf = 0;
  function onResize() { resizeRaf = 0; refit(); }
  window.addEventListener("resize", function () {
    if (resizeRaf) { return; }
    resizeRaf = window.requestAnimationFrame ? requestAnimationFrame(onResize) : setTimeout(onResize, 60);
  });

  /* ------------------------------------------------- test contract (SPEC 7.3) */
  window.CD_TEST = {
    state: function () {
      var c = view === "play" && R ? R.cur : null;
      var fileId = null;
      if (view === "briefing" && B) { fileId = B.file.id; }
      else if (view === "training" && T) { fileId = T.file.id; }
      else if ((view === "play" || view === "results") && R) { fileId = R.file.id; }
      return {
        view: view, fileId: fileId, questionId: c ? c.q.id : null, answered: !!(c && c.answered), retry: !!(c && c.retry),
        cluesShown: c ? c.clues : 0, stars: starsCopy()
      };
    },
    hint: function () {
      if (view === "play" && R && R.cur && !R.cur.answered) { return '[data-k="' + selEsc(R.cur.q.answer) + '"]'; }
      if (view === "training" && T) { return trainHint(); }
      return "[data-primary]";
    },
    wrong: function () {
      var c = view === "play" && R ? R.cur : null;
      if (!c || c.answered) { return null; }
      for (var i = 0; i < c.opts.length; i++) {
        if (c.opts[i].k !== c.q.answer && !c.out[c.opts[i].k]) { return '[data-k="' + selEsc(c.opts[i].k) + '"]'; }
      }
      return null;
    }
  };

  /* --------------------------------------------------------------- start */
  loadSave();
  try { Sfx.setMuted(!save.sound); } catch (e) { /* ignore */ }
  syncSound();
  buildNotebook();
  try {
    if (MUSIC) {
      MUSIC.onchange = function (m) { if (m && m.playing && m.n && m.n !== save.piece) { save.piece = m.n; persist(); } syncMusic(); };
      MUSIC.start(save.piece);
      MUSIC.setEnabled(save.music);
    }
  } catch (e) { /* the game works without music */ }
  syncMusic();
  home();
  /* Both fonts come in two files (plain letters, and the letters with a long mark). All four are asked
     for now, so that no line changes its height in the middle of a case, and every screen fits itself
     again whenever one arrives. */
  if (document.fonts) {
    try {
      if (document.fonts.load) { ["500 16px 'Nunito Variable'", "600 16px 'Alegreya Variable'"].forEach(function (f) { document.fonts.load(f, "a\u0101"); }); }
      if (document.fonts.addEventListener) { document.fonts.addEventListener("loadingdone", function () { refit(); }); }
      if (document.fonts.ready && document.fonts.ready.then) { document.fonts.ready.then(function () { refit(); }); }
    } catch (e) { /* ignore */ }
  }
})();
