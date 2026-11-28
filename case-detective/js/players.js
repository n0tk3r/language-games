/*!
 * Latin games: the players of this browser (window.LatinPlayers).
 * Plain script with no other file needed but js/courses.js (CD_COURSES), loaded before it. Every game of the
 * site loads it: one list of players (name, grade, chapter, badge color) and the device's sound and music
 * switches, in localStorage under "latinGames.v1"; the course helpers; and the screens that choose and set up
 * a player ("Who’s on the case?", Add a player, Manage players, the chapter step). Each game keeps its own
 * progress, by player id, under its own key. The styles of the screens are css/players.css (root class .lp).
 * Names stay in this browser: nothing here is ever sent anywhere. See SHARED.md.
 */
(function () {
  "use strict";
  if (window.LatinPlayers) { return; }

  var KEY = "latinGames.v1", NAME_MAX = 20;
  var ID_RE = /^p[0-9]{1,6}$/, HEX_RE = /^#[0-9a-f]{6}$/i;

  /* the courses from courses.js; without that file there is one grade, as in Case Detective 2.1 */
  var C = coursesOf(window.CD_COURSES);
  function coursesOf(c) {
    if (c && c.grades && c.grades.length && c.units && c.units.length && c.chapters) { return c; }
    return {
      grades: [{ grade: 6, course: "Latin IA", first: 1, last: 8, months: [4, 5, 6, 7, 8, 8, 8, 1, 1, 1, 2, 3] }],
      chapters: {}, units: [{ chapter: 2, grade: 6 }], playerColors: ["#b4441c", "#8f5d00", "#5f6b14", "#2f6f45", "#1f5f8b", "#7a4b2a"],
      lines: { playersFirst: ["Who is on the case?"], playersBack: ["Who is on the case?"] }
    };
  }

  /* ------------------------------------------------------------ helpers */
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function arr(a) { return Array.isArray(a) ? a : []; }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) { n.className = cls; } return n; }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* an ending such as -ae or -nt stays in one piece: a line never breaks after its hyphen */
  function keep(html) {
    return html.replace(/(^|[\s(>\u201c\u2018\/])(-[A-Za-z\u0100-\u017f]{1,5})(?![A-Za-z\u0100-\u017f])/g, '$1<span class="nw">$2</span>');
  }
  /* a line of text that may carry <b>, <i> and <u>: everything else is escaped. <i> is always Latin. */
  function rich(s) {
    return keep(esc(s).replace(/&lt;(\/?)([biu])&gt;/g, function (m, slash, tag) {
      return "<" + slash + tag + (tag === "i" && !slash ? ' lang="la"' : "") + ">";
    }));
  }
  function fill(s, map) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; }); }
  function ordinal(n) { return n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] || "th")); }
  /* the possessive of a name: Sam’s */
  function whose(name) { return name + "\u2019s"; }
  function copyOf(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }

  /* a first name or a nickname: no control characters and no angle brackets, one space between words, 20 characters at most;
     the invisible marks are taken out (zero-width spaces, the marks and overrides of writing direction), so that a name
     never shows as nothing nor turns the rest of a line around (the joiners of emoji stay) */
  function cleanName(s) {
    var parts = String(s === undefined || s === null ? "" : s).replace(/[\u00ad\u061c\u180e\u200b\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g, "")
      .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029<>]/g, " ").replace(/\s+/g, " ").trim().match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) || [];
    return parts.slice(0, NAME_MAX).join("").trim();
  }

  /* ------------------------------------------------------------ the courses
     A grade's own chapters are its course's, first to last. A player of the grade may be on any chapter from
     the book's first (1) to the grade's last: a class that is still on an earlier course's chapter can choose it.
     A new player and a new grade start on the grade's own chapter of this month (monthChapter). The course of
     a chapter (courseOf) is the one whose chapters hold it, also for a grade still to come. */
  function gradeInfo(g) { for (var i = 0; i < C.grades.length; i++) { if (C.grades[i] && +C.grades[i].grade === +g) { return C.grades[i]; } } return null; }
  function canPlay(g) { var gi = gradeInfo(g); return !!gi && !gi.soon; }
  function firstGrade() { for (var i = 0; i < C.grades.length; i++) { if (!C.grades[i].soon) { return +C.grades[i].grade; } } return 6; }
  /* the first chapter of the book: the lowest first chapter of a course (1) */
  function bookFirst() {
    var lo = 0;
    C.grades.forEach(function (g) { var f = g ? +g.first : 0; if (f >= 1 && Math.floor(f) === f && (!lo || f < lo)) { lo = f; } });
    return lo || 1;
  }
  function isChapter(ch) { return typeof ch === "number" && Math.floor(ch) === ch; }
  /* a chapter the grade's players may be on: 1 to the grade's last (the name says "grade" for the API: it was
     the grade's own chapters before an earlier one could be chosen) */
  function inGrade(g, ch) { var gi = gradeInfo(g); return !!gi && isChapter(ch) && ch >= bookFirst() && ch <= +gi.last; }
  /* one of the grade's own chapters, first to last */
  function ownChapter(g, ch) { var gi = gradeInfo(g); return !!gi && isChapter(ch) && ch >= +gi.first && ch <= +gi.last; }
  /* the course that holds a chapter: its grade's entry of grades[] (null for a number that is no chapter) */
  function courseOf(ch) {
    if (!isChapter(ch)) { return null; }
    for (var i = 0; i < C.grades.length; i++) { var g = C.grades[i]; if (g && ch >= +g.first && ch <= +g.last) { return g; } }
    return null;
  }
  /* the courses before a grade's own, with the chapters of each that its players may go back to (book order) */
  function earlierCourses(g) {
    var gi = gradeInfo(g), out = [], n, cur = null;
    if (!gi) { return out; }
    for (n = bookFirst(); n < +gi.first; n++) {
      var co = courseOf(n);
      if (!cur || cur.co !== co) { cur = { co: co, first: n, last: n }; out.push(cur); } else { cur.last = n; }
    }
    return out;
  }
  /* the chapter of this month on the school's plan, one of the grade's own (June and July: the grade's last) */
  function monthChapter(g, date) {
    var gi = gradeInfo(g);
    if (!gi) { return 2; }
    var d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    var m = gi.months && gi.months.length === 12 ? +gi.months[d.getMonth()] : NaN;
    if (ownChapter(g, m)) { return m; }
    return ownChapter(g, +gi.start) ? +gi.start : gi.first;
  }
  function chapter(n) {
    var c = C.chapters && C.chapters[String(n)];
    return c && typeof c === "object" ? { title: String(c.title || ""), short: String(c.short || "") } : { title: "", short: "" };
  }
  /* "6th grade · Chapter 3", or with the course of the chapter: "6th grade · Latin IA · Chapter 3",
     "8th grade · Latin IB · Chapter 15" (a class still on an earlier chapter) */
  function gradeLine(p, withCourse) {
    if (!p) { return ""; }
    var co = withCourse ? courseOf(+p.chapter) || gradeInfo(p.grade) : null;
    return ordinal(p.grade) + " grade" + (co ? " · " + co.course : "") + " · Chapter " + p.chapter;
  }
  function initial(name) { var m = String(name).match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\S/); return m ? m[0].toUpperCase() : "?"; }
  /* the round badge of a player: the first letter of the name on the player's color */
  function badge(p, cls) { return '<span class="pl-badge' + (cls ? " " + cls : "") + '" style="--pc:' + esc(p.color) + '" aria-hidden="true">' + esc(initial(p.name)) + "</span>"; }

  /* ------------------------------------------------------------ storage
     latinGames.v1 = { v: 1, players: [{ id, name, color, grade, chapter }], last, sound, music, next }.
     next: the number of the next new id. An id is never given twice, so the progress a game still keeps for
     a player who was removed can never pass to a new player. The list is read again before every change and
     written whole (fields this file does not know are kept), so two tabs do not undo each other. Where
     localStorage cannot be used (a sandboxed frame, a full or blocked storage) the list lives in memory for
     the visit. */
  var mem = null, broken = false;
  function readRaw() {
    if (broken) { return mem; }
    try { return window.localStorage.getItem(KEY); } catch (e) { broken = true; return mem; }
  }
  function writeRaw(s) {
    mem = s;
    if (broken) { return; }
    try { window.localStorage.setItem(KEY, s); } catch (e) { broken = true; }
  }
  function parseObj(raw) {
    var o = null;
    if (typeof raw === "string" && raw) { try { o = JSON.parse(raw); } catch (e) { o = null; } }
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  }
  function colorFor(s, skip) {
    var list = arr(C.playerColors).filter(function (c) { return HEX_RE.test(c); }), used = {};
    if (!list.length) { list = ["#b4441c"]; }
    s.players.forEach(function (p) { if (p !== skip && p.color) { used[String(p.color).toLowerCase()] = true; } });
    for (var i = 0; i < list.length; i++) { if (!used[list[i].toLowerCase()]) { return list[i]; } }
    return list[s.players.length % list.length];
  }
  /* the stored list, cleaned: a bad or repeated id gets a new one, an empty name becomes "Player N", a grade
     that cannot be played becomes the first grade, a chapter that is not one of the grade's (1 to its last,
     inGrade) the chapter of this month */
  function parse(raw) {
    var o = parseObj(raw), s = { players: [], last: "", sound: true, music: true, next: 1 }, taken = {}, top = 0;
    arr(o.players).forEach(function (x, i) {
      if (!x || typeof x !== "object" || Array.isArray(x)) { return; }
      var id = typeof x.id === "string" && ID_RE.test(x.id) && !own(taken, x.id) ? x.id : "";
      var g = canPlay(+x.grade) ? +x.grade : firstGrade(), ch = +x.chapter;
      if (id) { taken[id] = true; top = Math.max(top, +id.slice(1)); }
      s.players.push({
        id: id, name: cleanName(x.name) || "Player " + (i + 1), color: typeof x.color === "string" && HEX_RE.test(x.color) ? x.color : "",
        grade: g, chapter: inGrade(g, ch) ? ch : monthChapter(g)
      });
    });
    var n = +o.next;
    s.next = Math.max(top + 1, n >= 1 && n <= 999999 ? Math.floor(n) : 1);
    s.players.forEach(function (p) { if (!p.id) { p.id = "p" + s.next; s.next++; } });
    s.players.forEach(function (p) { if (!p.color) { p.color = colorFor(s, p); } });
    s.last = typeof o.last === "string" && own(taken, o.last) ? o.last : "";
    if (typeof o.sound === "boolean") { s.sound = o.sound; }
    if (typeof o.music === "boolean") { s.music = o.music; }
    else if (o.sound === false) { s.music = false; }   /* a list from before the music, with the sound off: stay quiet */
    return s;
  }
  function save(s) {
    var o = parseObj(readRaw()), old = Object.create(null), k;
    arr(o.players).forEach(function (x) { if (x && typeof x === "object" && typeof x.id === "string" && !(x.id in old)) { old[x.id] = x; } });
    var out = {
      v: typeof o.v === "number" && o.v > 1 ? o.v : 1,
      players: s.players.map(function (p) {
        var x = { id: p.id, name: p.name, color: p.color, grade: p.grade, chapter: p.chapter }, src = old[p.id], j;
        if (src) { for (j in src) { if (own(src, j) && !own(x, j) && j !== "__proto__") { x[j] = src[j]; } } }
        return x;
      }),
      last: s.last, sound: s.sound, music: s.music, next: s.next
    };
    for (k in o) { if (own(o, k) && !own(out, k) && k !== "__proto__") { out[k] = o[k]; } }
    writeRaw(JSON.stringify(out));
  }
  var S = parse(readRaw());
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function find(s, id) { for (var i = 0; i < s.players.length; i++) { if (s.players[i].id === id) { return s.players[i]; } } return null; }
  function ordered(s) { var last = find(s, s.last); return (last ? [last] : []).concat(s.players.filter(function (p) { return p !== last; })); }
  function pub(p) { return p ? { id: p.id, name: p.name, color: p.color, grade: p.grade, chapter: p.chapter } : null; }
  /* every change: read the latest list, change it, write it, tell everyone who listens */
  function change(fn) {
    var s = parse(readRaw()), stale = !same(s, S), before = JSON.stringify(s), r = fn(s);
    S = s;
    if (JSON.stringify(s) !== before) { save(s); fire(false); }
    else if (stale) { fire(true); }
    return r;
  }

  /* ------------------------------------------------------------ changes
     onchange(fn): fn({ remote }) after every change, made in this page (remote: false) or in another tab or
     window of the site (remote: true, from the storage event; also checked again when the page is shown). */
  var subs = [], uis = [];
  function fire(remote) {
    var ev = { remote: !!remote };
    if (remote) { uis.forEach(function (u) { u.refresh(); }); }
    subs.slice().forEach(function (fn) {
      try { fn(ev); } catch (e) { setTimeout(function () { throw e; }, 0); }
    });
  }
  function sync() {
    var s = parse(readRaw());
    if (same(s, S)) { return; }
    S = s;
    fire(true);
  }
  window.addEventListener("storage", function (e) {
    if (broken || (e.key !== null && e.key !== KEY)) { return; }
    try { if (e.storageArea && e.storageArea !== window.localStorage) { return; } } catch (x) { return; }
    sync();
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) { sync(); } });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { sync(); } });

  /* ------------------------------------------------------------ the list */
  function list() { return ordered(S).map(pub); }
  function get(id) { return pub(find(S, id)); }
  function current() { return pub(find(S, S.last)); }
  function choose(id) {
    return change(function (s) { var p = find(s, id); if (p) { s.last = p.id; } return pub(p); });
  }
  function add(o) {
    var name = cleanName(o && o.name);
    if (!name) { return null; }
    return change(function (s) {
      var g = canPlay(+o.grade) ? +o.grade : firstGrade(), ch = +o.chapter;
      var p = { id: "p" + s.next, name: name, color: "", grade: g, chapter: inGrade(g, ch) ? ch : monthChapter(g) };
      s.next++;
      p.color = colorFor(s, p);
      s.players.push(p);
      return pub(p);
    });
  }
  /* a chapter given that is not one of the grade's is left out; a new grade without a chapter given keeps the
     chapter only if it is one of the new grade's own (a new grade starts on its chapter of this month, as a new
     player does) */
  function update(id, o) {
    o = o || {};
    return change(function (s) {
      var p = find(s, id);
      if (!p) { return null; }
      if (own(o, "name")) { var n = cleanName(o.name); if (n) { p.name = n; } }
      var g0 = p.grade;
      if (own(o, "grade") && canPlay(+o.grade)) { p.grade = +o.grade; }
      var ch = own(o, "chapter") ? +o.chapter : NaN;
      if (inGrade(p.grade, ch)) { p.chapter = ch; }
      else if (p.grade !== g0 ? !ownChapter(p.grade, p.chapter) : !inGrade(p.grade, p.chapter)) { p.chapter = monthChapter(p.grade); }
      return pub(p);
    });
  }
  function remove(id) {
    return change(function (s) {
      var p = find(s, id);
      if (!p) { return false; }
      s.players = s.players.filter(function (x) { return x !== p; });
      if (s.last === p.id) { s.last = ""; }
      return true;
    });
  }
  function settings() { return { sound: S.sound, music: S.music }; }
  function set(what, on) {
    if (what !== "sound" && what !== "music") { return false; }
    change(function (s) { s[what] = !!on; });
    return true;
  }
  function onchange(fn) {
    if (typeof fn !== "function") { return function () {}; }
    subs.push(fn);
    return function () { subs = subs.filter(function (f) { return f !== fn; }); };
  }

  /* ------------------------------------------------------------ met
     The Inspector introduces himself on “Who’s on the case?” to the first player of a device (playersFirst).
     The player added right after that is marked as met for the visit (in sessionStorage, which reaches the
     game's page from the home page; or on this page alone), so that the game does not introduce him a second
     time. met(id): true once, for that player only; the mark goes with the first question. */
  var MET_KEY = "latinGames.met", metMem = "";
  function setMet(id) {
    metMem = id;
    try { window.sessionStorage.setItem(MET_KEY, id); } catch (e) { /* this page alone */ }
  }
  function met(id) {
    var m = metMem;
    try { m = window.sessionStorage.getItem(MET_KEY) || m; window.sessionStorage.removeItem(MET_KEY); } catch (e) { /* ignore */ }
    metMem = "";
    return !!id && m === id;
  }

  /* ------------------------------------------------------------ the screens
     screens(host) draws the screens into elements of their own (root class "lp") and hands each one to
     host.show(el, kind); the game puts it where it wants. See SHARED.md for host. */
  var WORDS = {
    title: "Who\u2019s on the case?",
    start: "Open my case files",
    files: "case files",
    wiped: "{name}\u2019s stars, ribbons and rank will be wiped from this device. The other players stay.",
    sources: "For parents: where the material comes from"
  };
  /* the icons of the screens, as Case Detective draws them (a game can pass its own: host.icon) */
  var ICONS = {
    next: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M9 5.5l6.5 6.5L9 18.5"/>',
    star: '<path d="M12 2.2l2.95 6.1 6.65.9-4.85 4.65 1.2 6.65L12 17.3l-5.95 3.2 1.2-6.65L2.4 9.2l6.65-.9z"/>',
    files: '<path fill="currentColor" d="M2.5 8.2c0-1.1.9-2 2-2h3.7c.5 0 1 .2 1.3.6l1.2 1.4h8.8c1.1 0 2 .9 2 2V18c0 1.1-.9 2-2 2h-15c-1.1 0-2-.9-2-2z"/>' +
      '<path fill="currentColor" opacity=".55" d="M5 3.7h3.4c.5 0 1 .2 1.3.6l1 1.2H19c.8 0 1.5.5 1.8 1.2H11.4L10 5.2c-.4-.4-.9-.7-1.5-.7H3.6c.3-.5.8-.8 1.4-.8z"/>'
  };
  var cfN = 0;
  /* whether the player is driving with the keyboard (the screens move the focus for the keyboard only, as
     Case Detective does) */
  var keys = false;
  document.addEventListener("keydown", function (e) { if (e.key === "Tab" || e.key === "Enter" || e.key === " " || /^Arrow/.test(e.key)) { keys = true; } }, true);
  document.addEventListener("pointerdown", function () { keys = false; }, true);
  document.addEventListener("mousedown", function () { keys = false; }, true);
  function focusLost() { var a = document.activeElement; return !a || a === document.body || a === document.documentElement || a.isConnected === false; }

  /* the confirm dialog of the screens, for a game that has none of its own (host.confirm) */
  function confirmBox(o, done, tap) {
    var id = "lpCf" + (++cfN), prev = document.activeElement, others = [], closed = false;
    var scrim = el("div", "lp lp-scrim"), box = el("section", "lp lp-confirm");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", id + "t");
    box.setAttribute("aria-describedby", id + "x");
    box.innerHTML = '<h2 id="' + id + 't"></h2><p id="' + id + 'x"></p><div class="cf-row"><button type="button" class="btn primary" data-cf="no"></button><button type="button" class="btn danger" data-cf="yes"></button></div>';
    box.querySelector("h2").textContent = o.title;
    box.querySelector("p").textContent = o.text;
    var no = box.querySelector('[data-cf="no"]'), yes = box.querySelector('[data-cf="yes"]');
    no.textContent = o.no;
    yes.textContent = o.yes;
    Array.prototype.forEach.call(document.body.children, function (n) {
      if (n.tagName === "SCRIPT") { return; }
      others.push({ n: n, inert: !!n.inert, hidden: n.getAttribute("aria-hidden") });
      try { n.inert = true; } catch (e) { /* ignore */ }
      n.setAttribute("aria-hidden", "true");
    });
    document.body.appendChild(scrim);
    document.body.appendChild(box);
    void box.offsetWidth;
    box.classList.add("open");
    try { no.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    function close(answer) {
      if (closed) { return; }
      closed = true;
      document.removeEventListener("keydown", onKey, true);
      others.forEach(function (x) {
        try { x.n.inert = x.inert; } catch (e) { /* ignore */ }
        if (x.hidden === null) { x.n.removeAttribute("aria-hidden"); } else { x.n.setAttribute("aria-hidden", x.hidden); }
      });
      if (box.parentNode) { box.parentNode.removeChild(box); }
      if (scrim.parentNode) { scrim.parentNode.removeChild(scrim); }
      try { if (prev && prev.focus && document.body.contains(prev)) { prev.focus({ preventScroll: true }); } } catch (e) { /* ignore */ }
      done(answer);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); return; }
      if (e.key !== "Tab") { return; }
      var a = document.activeElement;
      if (!box.contains(a)) { e.preventDefault(); no.focus(); }
      else if (e.shiftKey && a === no) { e.preventDefault(); yes.focus(); }
      else if (!e.shiftKey && a === yes) { e.preventDefault(); no.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    no.addEventListener("click", function () { tap(); close(false); });
    yes.addEventListener("click", function () { tap(); close(true); });
    scrim.addEventListener("click", function () { close(false); });
  }

  function screens(host) {
    host = host || {};
    var T = {}, k;
    for (k in WORDS) { T[k] = host.text && typeof host.text[k] === "string" && host.text[k] ? host.text[k] : WORDS[k]; }
    /* root: the screen on show; spent: a player was picked there (the game is opening); st: the steps;
       met: he introduced himself on “Who’s on the case?” (playersFirst), for the player added next */
    var ui = { root: null, screen: "", spent: false, st: null, cf: 0, cfOpen: false, again: false, met: false, refresh: refresh };
    uis.push(ui);

    function lines(key) { var src = host.lines && own(host.lines, key) ? host.lines : (C.lines || {}); return arr(src[key]); }
    function icon(name, cls) {
      var s = null;
      cls = cls || "ic";
      if (typeof host.icon === "function") { try { s = host.icon(name, cls); } catch (e) { s = null; } }
      if (typeof s !== "string" || !s) { return ICONS[name] ? '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[name] + "</svg>" : ""; }
      return /^<svg[^>]*\sclass=/.test(s) ? s : s.replace(/^<svg/, '<svg class="' + cls + '"');
    }
    function tap() { if (typeof host.tap === "function") { try { host.tap(); } catch (e) { /* ignore */ } } }
    function starsOf(p) { var n = 0; try { n = +host.starsOf(p); } catch (e) { n = 0; } return n > 0 && isFinite(n) ? Math.floor(n) : 0; }
    function filesIn(g) { var o = null; try { o = typeof host.filesIn === "function" ? host.filesIn(g) : null; } catch (e) { o = null; } return o && typeof o === "object" ? o : null; }
    /* lines: the Inspector's lines, in order (HTML: <b> and <i> only; a name filled in is escaped); moods: one per
       line ("!wave": a short gesture, then idle) */
    function say(list, moods, map) {
      if (typeof host.say !== "function" || !list.length) { return; }
      var safe = {}, k;
      for (k in map || {}) { if (own(map, k)) { safe[k] = esc(map[k]); } }
      var out = list.map(function (s) { return fill(s, safe); });
      var ms = out.map(function (s, i) { return moods[i] || "idle"; });
      host.say(out, ms[0].replace(/^!/, ""), { moods: ms });
    }
    /* a step says the first of its lines */
    function stepSay(key, moodName, map) { say(lines(key).slice(0, 1), [moodName], map); }
    function show(v, kind, screen) {
      var had = !focusLost();
      ui.root = v; ui.screen = screen; ui.spent = false;
      ui.cf++; ui.cfOpen = false; ui.again = false;
      v.addEventListener("click", onClick);
      host.show(v, kind);
      /* with the keyboard, a focus that went away with the screen before comes to this screen's heading (the
         name step puts it in its field; a game that places the focus in show keeps it where it put it) */
      if (keys && had && screen !== "name" && focusLost()) {
        var h = v.querySelector(".pl-h, .st-h");
        if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
    }
    function picked(p, how) {
      ui.spent = true;
      if (typeof host.picked === "function") { host.picked(p, how); }
    }

    /* ---------------------------------------------- "Who’s on the case?" */
    function playersHtml(list) {
      var last = list[0] || null, withStars = typeof host.starsOf === "function";
      var href = typeof host.sourcesHref === "string" ? host.sourcesHref : "";
      var h = '<h1 class="pl-h">' + esc(T.title) + '</h1><ul class="pl-list">';
      list.forEach(function (p) {
        var s = withStars ? starsOf(p) : 0;
        h += '<li><button type="button" class="pl-card' + (p === last ? " last" : "") + '" data-player="' + esc(p.id) + '" aria-label="' + esc(p.name + ", " + ordinal(p.grade) + " grade, chapter " + p.chapter + (withStars ? ", " + s + (s === 1 ? " star" : " stars") : "")) + '">' + badge(p) +
          '<span class="pl-txt"><b class="pl-name">' + esc(p.name) + '</b><span class="pl-meta">' + esc(gradeLine(p)) + "</span></span>" + (withStars ? '<span class="pl-stars" aria-hidden="true">' + icon("star", "ic") + s + "</span>" : "") + "</button></li>";
      });
      h += '<li><button type="button" class="pl-card pl-add" data-action="add-player"><span class="pl-badge add" aria-hidden="true">+</span><span class="pl-txt"><b class="pl-name">Add a player</b><span class="pl-meta">Three quick questions</span></span></button></li></ul>';
      h += '<div class="dock">' + (last ? '<button type="button" class="btn primary" data-primary data-player="' + esc(last.id) + '"><span>Continue as ' + esc(last.name) + "</span>" + icon("next") + "</button>"
        : '<button type="button" class="btn primary" data-primary data-action="add-player"><span>Add a player</span>' + icon("next") + "</button>") + "</div>";
      h += '<p class="pl-foot">' + (list.length ? '<button type="button" class="tlink" data-action="manage">Manage players</button>' : "<span></span>") +
        (href ? '<a class="tlink" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(T.sources) + "</a>" : "") + "</p>";
      return h;
    }
    function players() {
      ui.st = null;
      var all = list(), v = el("div", "view v-players lp");
      v.innerHTML = playersHtml(all);
      show(v, "players", "players");
      say(lines(all.length ? "playersBack" : "playersFirst"), all.length ? ["!wave"] : ["!wave", "point"]);
      ui.met = !all.length && typeof host.say === "function" && lines("playersFirst").length > 0;
    }

    /* ---------------------------------------------- Manage players */
    function manageHtml(all) {
      var h = '<h1 class="pl-h">Manage players</h1><ul class="pl-list mg-list">';
      all.forEach(function (p) {
        var id = esc(p.id), nm = esc(p.name);
        h += '<li class="mg-row">' + badge(p) + '<span class="pl-txt"><b class="pl-name">' + nm + '</b><span class="pl-meta">' + esc(gradeLine(p)) + '</span></span><span class="mg-acts">' +
          '<button type="button" class="btn ghost sm" data-manage="rename" data-id="' + id + '">Rename<span class="sr"> ' + nm + "</span></button>" +
          '<button type="button" class="btn ghost sm" data-manage="grade" data-id="' + id + '">Change grade<span class="sr"> for ' + nm + "</span></button>" +
          '<button type="button" class="btn ghost sm" data-manage="remove" data-id="' + id + '">Remove<span class="sr"> ' + nm + "</span></button></span></li>";
      });
      return h + '</ul><div class="dock"><button type="button" class="btn primary" data-primary data-action="players"><span>Done</span>' + icon("next") + "</button></div>";
    }
    function manage() {
      var all = list();
      if (!all.length) { players(); return; }
      ui.st = null;
      var v = el("div", "view v-players v-manage lp");
      v.innerHTML = manageHtml(all);
      show(v, "manage", "manage");
      say(lines("playersManage"), ["idle"]);
    }
    function manageOne(what, id) {
      var p = get(id);
      if (!p) { manage(); return; }
      if (what === "remove") { askRemove(p); return; }
      if (what !== "rename" && what !== "grade") { return; }
      var st = { mode: what === "grade" ? "grade" : "rename", step: "", id: p.id, whoName: p.name, g0: p.grade, ch0: p.chapter, name: p.name, grade: p.grade, chapter: p.chapter };
      ui.st = st;
      if (st.mode === "rename") { stepName(); } else { stepGrade(); }
    }
    function askRemove(p) {
      var o = { title: "Remove " + p.name + "?", text: fill(T.wiped, { name: p.name }), no: "Keep " + p.name, yes: "Remove " + p.name };
      var token = ++ui.cf;
      ui.cfOpen = true;
      var answer = function (yes) {
        if (token !== ui.cf) { return; }
        ui.cf++;
        ui.cfOpen = false;
        if (yes) { remove(p.id); }
        if (yes || ui.again) { ui.again = false; if (S.players.length) { manage(); } else { players(); } }
      };
      if (typeof host.confirm === "function") { host.confirm(o, answer); } else { confirmBox(o, answer, tap); }
    }

    /* ---------------------------------------------- the three steps */
    function stepHead(n) { return ui.st.mode === "add" ? '<p class="st-step">New player · Step ' + n + " of 3</p>" : ""; }
    function stepName() {
      var st = ui.st, renaming = st.mode === "rename";
      st.step = "name";
      var v = el("div", "view v-setup st-name lp");
      v.innerHTML = stepHead(1) + '<h1 class="st-h"><label for="stName">' + (renaming ? "A new name for " + esc(st.whoName) : "What should I call you?") + "</label></h1>" +
        '<input class="st-input" id="stName" type="text" maxlength="' + NAME_MAX + '" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="' + (renaming ? "done" : "next") + '" aria-describedby="stNote">' +
        '<p class="st-note" id="stNote">A first name or a nickname, up to ' + NAME_MAX + " letters. It stays on this device and is never sent anywhere.</p>" +
        '<p class="st-err" id="stErr" role="alert"></p>' +
        '<div class="dock stick"><button type="button" class="btn ghost" data-action="st-back">Back</button><button type="button" class="btn primary" data-primary><span>' + (renaming ? "Save" : "Next") + "</span>" + icon("next") + "</button></div>";
      var inp = v.querySelector(".st-input");
      inp.value = st.name || "";
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); if (!ui.spent && ui.root === v) { stepPrimary(); } } });
      show(v, "setup", "name");
      if (!renaming) { stepSay("askName", "wave"); }
      try { inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    function stepGrade() {
      var st = ui.st;
      st.step = "grade";
      var v = el("div", "view v-setup st-grade lp"), h = stepHead(2) + '<h1 class="st-h" id="stGradeH">' + (st.mode === "grade" ? "Which class is " + esc(st.whoName) + " in?" : "Which class are you in?") + '</h1><ul class="gr-list" aria-labelledby="stGradeH">';
      C.grades.forEach(function (g, i) {
        var soon = !!g.soon, cur = st.mode === "grade" && st.g0 === +g.grade;
        h += '<li><button type="button" class="gr-card' + (soon ? " soon" : "") + (cur ? " cur" : "") + '" data-grade="' + (+g.grade) + '"' + (soon ? " disabled" : "") + (cur ? ' aria-current="true"' : "") + ">" +
          /* (the spaces between the parts are for a screen reader: the card is a grid, they take no room) */
          '<b class="gr-name">' + ordinal(+g.grade) + ' grade</b> <span class="gr-course">' + esc(g.course) + " · " + (i === 0 ? "Wheelock chapters " : "chapters ") + g.first + " to " + g.last + "</span>" +
          (soon ? ' <span class="gr-tag soon">Coming soon</span>' : (cur ? ' <span class="gr-tag">Now</span>' : "")) + "</button></li>";
      });
      h += '</ul><div class="dock stick"><button type="button" class="btn ghost" data-action="st-back">Back</button></div>';
      v.innerHTML = h;
      show(v, "setup", "grade");
      stepSay(st.mode === "grade" ? "changeGrade" : "askGrade", "point", { name: st.name });
    }
    /* the chapter step: the grade's own chapters, then (for a class that is still on an earlier chapter) the
       chapters of the courses before, a press away under "Earlier chapters" and open when one of them is the
       player's */
    /* a chapter's name: its words in one line, "Ch. 3 Second declension: masculine, has case files" (an
       aria-label, as the button "Earlier chapters" has: the title and the tags are boxes of their own, and the
       name a browser makes of the boxes would hold stray spaces, "masculine , has case files"; the tag "this
       month" in the case of its text, not in the capitals of its look) */
    function chipName(n, month, has) {
      var t = String(chapter(n).short || "").replace(/<\/?[biu]>/g, "");
      return "Ch. " + n + (t ? " " + t : "") + (n === month ? ", this month" : "") + (has ? ", has " + T.files : "");
    }
    function chipHtml(n, st, month, files) {
      var on = n === st.chapter, has = !!(files && files[n]);
      return '<button type="button" class="ch-chip' + (on ? " on" : "") + (has ? " has-files" : "") + (n === month ? " month" : "") + '" data-chapter="' + n + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + esc(chipName(n, month, has)) + '">' +
        '<b class="ch-n">Ch. ' + n + '</b><span class="ch-t">' + rich(chapter(n).short || "") + "</span>" +
        (n === month || has ? '<span class="ch-tags">' + (n === month ? '<span class="ch-month">this month</span>' : "") + (has ? '<span class="ch-files">' + icon("files") + '<span class="sr">, has ' + esc(T.files) + "</span></span>" : "") + "</span>" : "") + "</button>";
    }
    /* on the closed button: which earlier chapter is chosen (hidden by the styles while the list is open) */
    var EARLY = { name: "Earlier chapters", line: "For a class that is still on an earlier chapter." };
    function chosenHtml(n) { return '<span class="ch-open-on">Chapter ' + n + " chosen</span>"; }
    /* the button's name: its words, and the earlier chapter chosen while the list is closed (an aria-label:
       the tag is a box of its own, and the name a browser makes of the boxes would hold stray spaces). Its
       line is its description. */
    function earlyName(b, n, g) {
      var closed = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-label", EARLY.name + (closed && n < +g.first ? ", chapter " + n + " chosen" : ""));
    }
    function stepChapter() {
      var st = ui.st;
      st.step = "chapter";
      var g = gradeInfo(st.grade), month = monthChapter(st.grade), files = filesIn(st.grade), early = earlierCourses(st.grade), n;
      if (!inGrade(st.grade, st.chapter)) { st.chapter = month; }
      var onEarly = st.chapter < +g.first;
      var v = el("div", "view v-setup st-chapter lp"), h = stepHead(3) + '<h1 class="st-h" id="stChH">' + (st.mode === "grade" ? "Which chapter is " + esc(whose(st.whoName)) + " class on?" : "Which chapter is your class on?") + "</h1>" +
        '<p class="st-sub">' + esc(ordinal(+g.grade) + " grade · " + g.course) + '</p><div class="ch-list" role="group" aria-labelledby="stChH">';
      for (n = +g.first; n <= +g.last; n++) { h += chipHtml(n, st, month, files); }
      h += "</div>";
      if (early.length) {
        /* (open when the player's chapter is an earlier one: its tag "Chapter 5 chosen" shows after a close) */
        h += '<div class="ch-more"><button type="button" class="ch-open" data-action="ch-more" aria-expanded="' + (onEarly ? "true" : "false") + '" aria-controls="stChEarly" aria-label="' + esc(EARLY.name) + '" aria-describedby="stChEarlyQ">' +
          '<span class="ch-open-t"><b class="ch-open-b">' + esc(EARLY.name) + '</b> <span class="ch-open-q" id="stChEarlyQ">' + esc(EARLY.line) + "</span>" + (onEarly ? chosenHtml(st.chapter) : "") + "</span>" +
          icon("next", "ic ch-chev") + '</button><div class="ch-early" id="stChEarly"' + (onEarly ? "" : " hidden") + ">";
        early.forEach(function (c, i) {
          h += '<h2 class="ch-course" id="stChC' + i + '">' + esc(c.co ? c.co.course + " · chapters " : "Chapters ") + c.first + " to " + c.last + "</h2>" +
            '<div class="ch-list" role="group" aria-labelledby="stChC' + i + '">';
          for (n = c.first; n <= c.last; n++) { h += chipHtml(n, st, month, files); }
          h += "</div>";
        });
        h += "</div></div>";
      }
      h += '<p class="st-note">' + (files ? icon("files", "ic ch-key") + " marks a chapter with " + esc(T.files) + ". " : "") + "Schools differ, so the chapter can always be changed later.</p>" +
        '<div class="dock stick"><button type="button" class="btn ghost" data-action="st-back">Back</button><button type="button" class="btn primary" data-primary><span>' + (st.mode === "add" ? esc(T.start) : "Save") + "</span>" + icon("next") + "</button></div>";
      v.innerHTML = h;
      show(v, "setup", "chapter");
      stepSay(st.mode === "add" ? "askChapter" : "changeChapter", "point", { name: st.name });
    }
    /* "Earlier chapters": open or close the list (no new screen: the focus stays on the button). A list that
       opens under the dock or below the screen comes up just far enough to show its first chapter. */
    function toggleEarly(b) {
      var box = ui.root.querySelector(".ch-early");
      if (!box) { return; }
      var open = b.getAttribute("aria-expanded") !== "true", st = ui.st, g = st ? gradeInfo(st.grade) : null;
      b.setAttribute("aria-expanded", open ? "true" : "false");
      box.hidden = !open;
      if (st && g) { earlyName(b, st.chapter, g); }
      var first = open ? box.querySelector(".ch-chip") : null;
      if (!first) { return; }
      var r = first.getBoundingClientRect(), dock = ui.root.querySelector(".dock"), low = window.innerHeight || document.documentElement.clientHeight;
      if (dock) {
        var d = dock.getBoundingClientRect();
        if (d.left < r.right && d.right > r.left && d.top < low) { low = Math.max(0, d.top); }
      }
      var by = Math.min(r.bottom + 8 - low, b.getBoundingClientRect().top - 8);
      if (by > 0) { try { window.scrollBy(0, Math.round(by)); } catch (e) { /* ignore */ } }
    }
    function pickGrade(g) {
      var st = ui.st;
      if (!st || st.step !== "grade" || !canPlay(g)) { return; }
      st.chapter = st.mode === "grade" && st.g0 === g ? st.ch0 : monthChapter(g);
      st.grade = g;
      stepChapter();
    }
    function pickChapter(n) {
      var st = ui.st;
      if (!st || st.step !== "chapter" || !inGrade(st.grade, n)) { return; }
      st.chapter = n;
      var chips = ui.root.querySelectorAll(".ch-chip");
      for (var i = 0; i < chips.length; i++) {
        var on = +chips[i].getAttribute("data-chapter") === n;
        chips[i].setAttribute("aria-pressed", on ? "true" : "false");
        chips[i].classList[on ? "add" : "remove"]("on");
      }
      var b = ui.root.querySelector(".ch-open"), g = gradeInfo(st.grade);
      if (!b || !g) { return; }
      var tag = b.querySelector(".ch-open-on");
      if (tag) { tag.parentNode.removeChild(tag); }
      if (n < +g.first) { b.querySelector(".ch-open-t").insertAdjacentHTML("beforeend", chosenHtml(n)); }
      earlyName(b, n, g);
    }
    function stepPrimary() {
      var st = ui.st, p;
      if (!st) { return; }
      if (st.step === "name") {
        var inp = ui.root.querySelector(".st-input"), err = ui.root.querySelector(".st-err"), name = cleanName(inp ? inp.value : "");
        if (!name) {
          if (err) { err.textContent = "Type a name first: a first name or a nickname."; }
          try { if (inp) { inp.focus({ preventScroll: true }); } } catch (e) { /* ignore */ }
          return;
        }
        st.name = name;
        if (st.mode === "rename") { update(st.id, { name: name }); manage(); return; }
        stepGrade();
        return;
      }
      if (st.step !== "chapter") { return; }
      if (st.mode === "add") {
        p = add({ name: st.name, grade: st.grade, chapter: st.chapter });
        if (!p) { players(); return; }
        if (ui.met) { setMet(p.id); }
        ui.met = false;
        picked(choose(p.id) || p, "added");
      } else if (st.mode === "grade") {
        update(st.id, { grade: st.grade, chapter: st.chapter });
        manage();
      } else if (st.mode === "chapter") {
        p = update(st.id, { chapter: st.chapter });
        if (!p) { players(); return; }
        picked(choose(p.id) || p, "chapter");
      }
    }
    function stepBack() {
      var st = ui.st;
      if (!st) { return; }
      if (st.step === "name") { if (st.mode === "rename") { manage(); } else { players(); } }
      else if (st.step === "grade") { if (st.mode === "grade") { manage(); } else { stepName(); } }
      else if (st.step === "chapter") {
        if (st.mode !== "chapter") { stepGrade(); return; }
        var p = get(st.id);
        ui.st = null;
        if (p) { picked(p, "back"); } else { players(); }
      }
    }
    function addFlow() { ui.st = { mode: "add", step: "", id: "", whoName: "", g0: 0, ch0: 0, name: "", grade: 0, chapter: 0 }; stepName(); }
    function changeChapter(id) {
      var p = get(id);
      if (!p) { players(); return; }
      ui.st = { mode: "chapter", step: "chapter", id: p.id, whoName: p.name, g0: p.grade, ch0: p.chapter, name: p.name, grade: p.grade, chapter: p.chapter };
      stepChapter();
    }

    /* ---------------------------------------------- taps */
    function onClick(e) {
      if (e.defaultPrevented) { return; }   /* (a tap the page held back, such as the second tap of a double tap) */
      var t = e.target && e.target.closest ? e.target.closest("button, a") : null;
      if (!t || t.disabled || t.tagName === "A" || !this.contains(t)) { return; }
      tap();
      if (ui.spent || this !== ui.root) { return; }
      var a = t.getAttribute("data-action");
      if (a === "add-player") { addFlow(); return; }
      if (a === "manage") { manage(); return; }
      if (a === "players") { players(); return; }
      if (a === "st-back") { stepBack(); return; }
      if (a === "ch-more") { toggleEarly(t); return; }
      if (t.hasAttribute("data-player")) {
        var p = choose(t.getAttribute("data-player"));
        if (p) { picked(p, "continue"); } else { players(); }
        return;
      }
      if (t.hasAttribute("data-manage")) { manageOne(t.getAttribute("data-manage"), t.getAttribute("data-id")); return; }
      if (t.hasAttribute("data-grade")) { pickGrade(+t.getAttribute("data-grade")); return; }
      if (t.hasAttribute("data-chapter")) { pickChapter(+t.getAttribute("data-chapter")); return; }
      if (t.hasAttribute("data-primary")) { stepPrimary(); }
    }

    /* ---------------------------------------------- a change made in another tab */
    function keyOf(b) {
      var s = b.tagName;
      ["data-action", "data-player", "data-primary", "data-manage", "data-id"].forEach(function (a) { if (b.hasAttribute(a)) { s += "|" + a + "=" + b.getAttribute(a); } });
      return s;
    }
    function refresh() {
      var r = ui.root;
      if (!r || ui.spent || !(r.isConnected === undefined ? document.documentElement.contains(r) : r.isConnected)) { return; }
      if (ui.cfOpen) { ui.again = true; return; }
      if (ui.screen === "players" || ui.screen === "manage") {
        var all = list();
        if (ui.screen === "manage" && !all.length) { players(); return; }
        var a = document.activeElement, key = a && a !== r && r.contains(a) && a.closest ? keyOf(a.closest("button, a") || a) : "";
        r.innerHTML = ui.screen === "players" ? playersHtml(all) : manageHtml(all);
        if (key) {
          var c = r.querySelectorAll("button, a"), to = null;
          for (var i = 0; i < c.length && !to; i++) { if (keyOf(c[i]) === key) { to = c[i]; } }
          to = to || r.querySelector("[data-primary]");
          try { if (to) { to.focus({ preventScroll: true }); } } catch (e) { /* ignore */ }
        }
      } else if (ui.st && ui.st.id && !get(ui.st.id)) {
        /* a step for a player who was removed meanwhile: Rename and Change grade go back to Manage players, the
           chapter step (which the game opened) to “Who’s on the case?” */
        if (ui.st.mode === "rename" || ui.st.mode === "grade") { manage(); }
        else if (ui.st.mode === "chapter") { players(); }
      }
    }

    return { players: players, add: addFlow, manage: manage, changeChapter: changeChapter, rename: function (id) { manageOne("rename", id); }, changeGrade: function (id) { manageOne("grade", id); } };

  }

  window.LatinPlayers = {
    KEY: KEY,
    NAME_MAX: NAME_MAX,
    list: list,
    get: get,
    current: current,
    choose: choose,
    add: add,
    update: update,
    remove: remove,
    settings: settings,
    set: set,
    onchange: onchange,
    cleanName: cleanName,
    grades: function () { return C.grades.map(copyOf); },
    gradeInfo: function (g) { var gi = gradeInfo(g); return gi ? copyOf(gi) : null; },
    canPlay: canPlay,
    inGrade: inGrade,
    courseOf: function (ch) { var co = courseOf(ch); return co ? copyOf(co) : null; },
    monthChapter: monthChapter,
    chapter: chapter,
    gradeLine: gradeLine,
    screens: screens,
    /* extras (see SHARED.md) */
    isNew: function () { return readRaw() === null; },
    met: met,
    badge: badge,
    html: rich
  };
})();
