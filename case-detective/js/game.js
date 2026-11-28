/*!
 * Case Detective: the game.
 * Plain script. Needs data.js (CD_DATA), detective.js (Detective) and sfx.js (Sfx) loaded first, and
 * courses.js (CD_COURSES: the grades, the chapters, which chapters have case files) and players.js
 * (LatinPlayers: the players of the site, and the screens that choose and set up a player).
 * The case files of chapter 2 are CD_DATA itself. Every other chapter is a data file in js/units/ that sets
 * CD_UNITS["<chapter>"]; it is loaded when a player's casebook opens that chapter.
 * All Latin and all of the Inspector's lines come from the data files; only short English labels live here.
 */
(function () {
  "use strict";

  var D = window.CD_DATA, LP = window.LatinPlayers;
  if (!D || !window.Detective || !LP) { return; }
  var Sfx = window.Sfx || { play: function () {}, isMuted: function () { return true; }, setMuted: function () {} };
  var L = D.inspector.lines;
  var C = coursesOf(window.CD_COURSES);
  var CL = C.lines || {};
  var FILES = D.files;     /* the files of the player's casebook, in book order (chapter, then file) */
  var CASE_KEYS = ["nom", "gen", "dat", "acc", "abl", "voc"];
  var ROW_KEYS = ["nom", "gen", "dat", "acc", "abl", "voc"];   /* a chart's rows: the book's order */

  /* the courses from courses.js; without that file the game is the one chapter it was in 2.1 */
  function coursesOf(c) {
    if (c && c.grades && c.grades.length && c.units && c.units.length && c.chapters) { return c; }
    return {
      grades: [{ grade: 6, course: "Latin IA", first: 1, last: 8, months: [4, 5, 6, 7, 8, 8, 8, 1, 1, 1, 2, 3] }],
      chapters: {}, units: [{ chapter: 2, grade: 6 }], jobColors: {}, playerColors: ["#b4441c", "#8f5d00", "#5f6b14", "#2f6f45", "#1f5f8b", "#7a4b2a"],
      lines: { playersFirst: [D.inspector.lines.homeFirst[0]], playersBack: ["Who is on the case?"] }
    };
  }

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
  function selEsc(s) { return String(s).replace(/["\\]/g, "\\$&"); }
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function arr(a) { return Array.isArray(a) ? a : []; }
  function ordinal(n) { return n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] || "th")); }
  /* (a count that starts his sentence is spelled out up to twenty: "Fifteen case files are waiting on my desk.") */
  var NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
  function countWord(n) { return NUMBER_WORDS[n] || String(n); }
  /* the possessive of a name: Sam’s */
  function whose(name) { return name + "\u2019s"; }

  /* ------------------------------------------------------- the key registry
     Every answer key, word role and lesson goes through one registry: the six cases (CD_DATA.cases), the
     verb, then the jobs the open units add (appositive, ablative of agent, ...), with their colors from
     courses.js. A job takes the class c-<key> like a case does; its colors are written into a small style
     sheet when the casebook opens (jobStyles). */
  var JOBS = {};
  var JOB_KEY_RE = /^[a-z][a-z0-9]{0,15}$/;
  var HEX_RE = /^#[0-9a-f]{6}$/i;
  function keyInfo(k) { return k === "verb" ? D.verb : (own(D.cases, k) ? D.cases[k] : (own(JOBS, k) ? JOBS[k] : null)); }
  /* a case or a job: a key with a color of its own (the verb keeps its tag gray) */
  function colorKey(k) { return own(D.cases, k) || own(JOBS, k) ? k : null; }
  /* the case a key stands for, or that a job belongs to (the ablative of agent is an ablative) */
  function caseOfKey(k) { return own(D.cases, k) ? k : (own(JOBS, k) && JOBS[k].of ? JOBS[k].of : null); }
  function jobColors(key, of) {
    var jc = C.jobColors || {}, fb = C.jobFallback || {}, c = own(jc, key) ? jc[key] : null;
    if (c && HEX_RE.test(c.color) && HEX_RE.test(c.ink) && HEX_RE.test(c.tint)) { return { c: c.color, ci: c.ink, ct: c.tint }; }
    if (of && fb.ofCase !== false) { return { c: "var(--" + of + ")", ci: "var(--" + of + "-i)", ct: "var(--" + of + "-t)" }; }
    var n = fb.none && HEX_RE.test(fb.none.color) && HEX_RE.test(fb.none.ink) && HEX_RE.test(fb.none.tint) ? fb.none : { color: "#5c4636", ink: "#5c4636", tint: "#e9dfcc" };
    return { c: n.color, ci: n.ink, ct: n.tint };
  }
  var jobSheet = null;
  function jobStyles() {
    var css = "";
    for (var k in JOBS) {
      if (!own(JOBS, k)) { continue; }
      var c = jobColors(k, JOBS[k].of);
      css += ".c-" + k + " { --c: " + c.c + "; --ci: " + c.ci + "; --ct: " + c.ct + "; }\n";
    }
    try {
      if (!jobSheet) { jobSheet = document.createElement("style"); jobSheet.id = "cdJobColors"; document.head.appendChild(jobSheet); }
      jobSheet.textContent = css;
    } catch (e) { /* the jobs keep the plain look */ }
  }

  /* ------------------------------------------------------------ storage
     The players belong to the site: js/players.js (LatinPlayers) keeps them for every game, with the sound
     and music switches of the device, in localStorage under "latinGames.v1". This game keeps the rest under
     its own key: caseDetective.v1 = { v: 2, progress: { <player id>: { stars, solo, seen } }, piece }.
     A player's stars, ribbons and seen-flags are kept for every file id, also for files that are not on show
     (another chapter, or a unit that is not loaded); the progress of an id that is no longer on the list of
     players is dropped. A save of version 2.1 (the flat shape: stars, solo, seen, sound, music, piece) has
     no player. Where the players are chosen on the games' home page, the Inspector asks each player once
     whether its stars are theirs (claim, below). Until someone takes them they stay under this key, as
     old: { stars, solo, seen }, with asked: [the ids of the players who said no]. Where the game keeps its
     own screens for the players, and with ?grade= in the address, the save becomes a player "Player 1",
     6th grade, chapter 2, as before. Names stay in this browser: nothing here is ever sent anywhere. */
  var player = null;   /* the player on the case, as the casebook was opened: { id, name, color, grade, chapter } */
  var prog = {};       /* player id -> { stars, solo, seen } */
  var stale = false;   /* the player's grade or chapter changed in another tab: the casebook opens again at home */
  /* the progress of the player on the case (that player's own objects), and the settings of the device */
  var save = { stars: {}, solo: {}, seen: {}, sound: true, music: true, piece: 1 };
  var ID_RE = /^[A-Za-z0-9_:.\-]{1,60}$/;
  function cleanProgress(o) {
    var p = { stars: {}, solo: {}, seen: {} }, k, s;
    if (!o || typeof o !== "object") { return p; }
    if (o.stars && typeof o.stars === "object") {
      for (k in o.stars) { if (own(o.stars, k) && ID_RE.test(k)) { s = +o.stars[k]; if (s >= 1 && s <= 3) { p.stars[k] = Math.floor(s); } } }
    }
    if (o.solo && typeof o.solo === "object") {
      for (k in o.solo) { if (own(o.solo, k) && ID_RE.test(k) && o.solo[k] === true && p.stars[k] === 3) { p.solo[k] = true; } }
    }
    if (o.seen && typeof o.seen === "object") {
      for (k in o.seen) { if (own(o.seen, k) && ID_RE.test(k) && o.seen[k] === true) { p.seen[k] = true; } }
    }
    return p;
  }
  var inGrade = LP.inGrade, canPlay = LP.canPlay, monthChapter = LP.monthChapter;
  function progressOf(id) { if (!own(prog, id)) { prog[id] = { stars: {}, solo: {}, seen: {} }; } return prog[id]; }
  function listedIds() { var ids = {}; LP.list().forEach(function (p) { ids[p.id] = true; }); return ids; }
  function readSave() {
    var o = null;
    try { var raw = window.localStorage.getItem(D.storageKey); if (raw) { o = JSON.parse(raw); } } catch (e) { o = null; }
    return o && typeof o === "object" && !Array.isArray(o) ? o : null;
  }
  function progressIn(o) { return o && o.v === 2 && o.progress && typeof o.progress === "object" && !Array.isArray(o.progress) ? o.progress : null; }
  function starsIn(pr) { var t = 0, k; if (pr) { for (k in pr.stars) { if (own(pr.stars, k)) { t += pr.stars[k]; } } } return t; }
  /* the stars of 2.1 that nobody took yet (kept in a save of version 2), and who said they are not theirs */
  var old = null, asked = [];
  function oldIn(o) { var p = progressIn(o) && o.old && typeof o.old === "object" ? cleanProgress(o.old) : null; return p && starsIn(p) ? p : null; }
  function askedIn(o) { return o && Array.isArray(o.asked) ? o.asked.filter(function (id) { return typeof id === "string" && ID_RE.test(id); }) : []; }
  function usePiece(n) { if (typeof n === "number" && n >= 1 && n <= 24) { save.piece = Math.floor(n); } }
  function loadSave() {
    var o = readSave(), pr = progressIn(o), ids = listedIds(), drop = false, k, was;
    if (pr) {
      for (k in pr) { if (own(pr, k)) { if (own(ids, k)) { prog[k] = cleanProgress(pr[k]); } else { drop = true; } } }
      usePiece(o.piece);
      was = oldIn(o);
      /* (stars of 2.1 that nobody took: asked about on the games site, a player "Player 1" elsewhere) */
      if (was && !askOld) { migrate(was); }
      else if (was) { old = was; asked = askedIn(o); }
      else if (own(o, "old") || own(o, "asked")) { drop = true; }
    } else if (o && o.v !== 2 && (own(o, "stars") || own(o, "solo") || own(o, "seen") || own(o, "music") || own(o, "piece"))) {
      if (askOld) { keepOld(o); } else { migrate(o); }
    } else if (o && o.v !== 2 && typeof o.sound === "boolean") {
      oldSwitch(o);
    }
    var st = LP.settings();
    save.sound = st.sound;
    save.music = st.music;
    if (drop) { persist(); }
  }
  /* A save of version 2.1 where the players are chosen on the games' home page: its stars wait under this key
     until a player says they are theirs (with none, there is nothing to ask about). Its switches become the
     device's only while no game has saved the list of players yet, as in oldSwitch. */
  function keepOld(o) {
    var was = cleanProgress(o);
    usePiece(o.piece);
    if (LP.isNew()) {
      if (typeof o.sound === "boolean") { LP.set("sound", o.sound); }
      if (typeof o.music === "boolean") { LP.set("music", o.music); }
      else if (o.sound === false) { LP.set("music", false); }
    }
    old = starsIn(was) ? was : null;
    asked = [];
    persist(old ? { old: old, asked: asked } : null);
  }
  /* a save of version 2.1: one player, who played chapter 2 ("Player 2" if another game already has a
     "Player 1"). Its sound and music switches become the device's. */
  function migrate(o) {
    var names = {}, n = 1;
    LP.list().forEach(function (p) { names[p.name] = true; });
    while (names["Player " + n]) { n++; }
    var p = LP.add({ name: "Player " + n, grade: 6, chapter: 2 });
    if (!p) { return; }
    prog[p.id] = cleanProgress(o);
    usePiece(o.piece);
    /* the settings of the old save come along, as they were the last ones chosen in this game */
    if (typeof o.sound === "boolean") { LP.set("sound", o.sound); }
    if (typeof o.music === "boolean") { LP.set("music", o.music); }
    else if (o.sound === false) { LP.set("music", false); }   /* a save from before the music, with the sound off: stay quiet */
    LP.choose(p.id);
    old = null;
    asked = [];
    persist(null);
  }
  /* A key with nothing but the sound switch in it: Sfx wrote it (it remembers its switch under this key, as in
     2.1) before any file was saved. There is no player in it to keep. Its switch is 2.1's choice only while no
     game has saved the shared list yet; after that the device's switch stands. */
  function oldSwitch(o) {
    if (LP.isNew()) {
      LP.set("sound", o.sound);
      if (o.sound === false) { LP.set("music", false); }   /* (as in migrate: the sound off, nothing about music) */
    }
    tidySave();
  }
  /* The sound switch belongs to the site now (LatinPlayers): what Sfx writes under this key is taken out again
     at once, so that the key holds only { v: 2, progress, piece }, and a key holding nothing but the switch
     never looks like a save of 2.1 at the next visit. */
  function tidySave() {
    var o = readSave();
    if (!o || !own(o, "sound")) { return; }
    try {
      if (o.v === 2) { delete o.sound; window.localStorage.setItem(D.storageKey, JSON.stringify(o)); }
      else if (Object.keys(o).length === 1) { window.localStorage.removeItem(D.storageKey); }
    } catch (e) { /* ignore */ }
  }
  /* what another page has of a player's progress, added to this page's own objects: progress only grows (the
     most stars of a file, its no-clue ribbon, what was seen), but for "Reset progress" */
  function addProgress(p, o) {
    var k;
    for (k in o.stars) { if (own(o.stars, k) && (p.stars[k] || 0) < o.stars[k]) { p.stars[k] = o.stars[k]; } }
    for (k in o.solo) { if (own(o.solo, k) && p.stars[k] === 3) { p.solo[k] = true; } }
    for (k in o.seen) { if (own(o.seen, k)) { p.seen[k] = true; } }
  }
  /* Written whole, for every player on the list: the player on the case as this page has it, with what the
     stored save has more of (on the games site every tab follows the player chosen last, so another tab may
     have won stars for the same player since: they stay), every other player as the stored save has it
     (another tab may have played them since), or else as this page has it. "Reset progress" writes the player
     on the case as this page has it alone (fresh). The stars of 2.1 that nobody took yet stay as stored
     (another tab may have given them away since), unless this page settles them: pending { old, asked }, or
     null once they are taken. */
  function persist(pending, fresh) {
    var cur = readSave(), out = { v: 2, progress: {}, piece: save.piece }, stored = progressIn(cur) || {}, ids = listedIds();
    LP.list().forEach(function (p) {
      var id = p.id;
      if (own(stored, id)) {
        if (!(player && player.id === id)) { prog[id] = cleanProgress(stored[id]); }
        else if (!fresh) { addProgress(progressOf(id), cleanProgress(stored[id])); }
      }
      if (own(prog, id)) { out.progress[id] = prog[id]; }
    });
    if (pending === undefined) {
      var was = progressIn(cur) ? oldIn(cur) : old;
      pending = was ? { old: was, asked: progressIn(cur) ? askedIn(cur) : asked } : null;
    }
    old = pending && pending.old ? pending.old : null;
    asked = old ? pending.asked.filter(function (id) { return own(ids, id); }) : [];
    if (old) { out.old = old; out.asked = asked; }
    try { window.localStorage.setItem(D.storageKey, JSON.stringify(out)); } catch (e) { /* ignore */ }
  }
  /* the progress of the players who are no longer on the list goes */
  function prune() {
    var ids = listedIds(), gone = false, k;
    for (k in prog) { if (own(prog, k) && !own(ids, k)) { delete prog[k]; gone = true; } }
    if (gone) { persist(); }
  }
  function usePlayer(p) {
    player = p || null;
    if (!p) { stale = false; }
    var pr = p ? progressOf(p.id) : null;
    save.stars = pr ? pr.stars : {};
    save.solo = pr ? pr.solo : {};
    save.seen = pr ? pr.seen : {};
  }
  function starsWon(id) { var pr = own(prog, id) ? prog[id] : null, t = 0; if (pr) { for (var k in pr.stars) { if (own(pr.stars, k)) { t += pr.stars[k]; } } } return t; }

  function starsCopy() {
    var o = {};
    FILES.forEach(function (f) { if (save.stars[f.id]) { o[f.id] = save.stars[f.id]; } });
    return o;
  }
  /* the stars of the casebook on show (its count on home: "5/15"), and the most it holds */
  function totalStars() { var t = 0; FILES.forEach(function (f) { t += save.stars[f.id] || 0; }); return t; }
  function maxStars() { return FILES.length * 3; }
  /* The rank counts every star the player has won in Case Detective: every file id, in any chapter or course
     (save.stars keeps them all, also those the casebook does not show now). Its marks are fixed: the five of
     data.js (0 to 12, written for the four files of chapter 2), then the ranks above them of courses.js
     (ranksAbove), so that a year's casebook still has promotions to earn. So a player never stands lower than
     before: not when the class moves on, nor on an earlier chapter, nor in another grade. */
  var RANKS = ranksOf();
  function ranksOf() {
    var out = arr(D.ranks).map(function (r) { return { min: r.min, title: r.title }; }), top = out.length ? out[out.length - 1].min : 0;
    arr(C.ranksAbove).forEach(function (r) {
      var min = r ? Math.floor(+r.min) : NaN;
      if (r && typeof r.title === "string" && r.title && min > top) { out.push({ min: min, title: r.title }); top = min; }
    });
    return out;
  }
  function allStars() { var t = 0, k; for (k in save.stars) { if (own(save.stars, k)) { t += save.stars[k] || 0; } } return t; }
  /* "a Detective", "an Inspector" */
  function aRank(title) { return /^[AEIOU]/.test(title) ? "an" : "a"; }
  function rankFor(total) {
    var idx = 0;
    RANKS.forEach(function (r, i) { if (total >= r.min) { idx = i; } });
    return { index: idx, title: RANKS[idx].title, next: RANKS[idx + 1] || null };
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

  /* ------------------------------------------------------- units and the casebook
     A unit is the case files of one chapter: chapter 2 is CD_DATA, every other one a data file
     (js/units/chNN.js) that courses.js names. A player's casebook follows the course of the class's chapter
     (LatinPlayers.courseOf), which is the grade's own course or, for a class still on an earlier chapter, an earlier one:
     every unit of that course whose chapter is at or below the class's chapter (or, if there is none, the
     course's first unit, ahead of the class); the course's units above it are listed at the end, locked. So
     an 8th grader on chapter 5 has the files of Latin IA up to chapter 5, as a 6th grader on chapter 5 has.
     A unit's file is loaded when a casebook opens it: a page never asks for files it does not show. */
  var UNITS = {};          /* chapter -> the unit as the game uses it */
  var FILE_CH = {};        /* file id -> the chapter of its unit */
  var CHARTS = [];         /* the charts of the casebook, merged by id (later chapters win) */
  var BOOK = { units: [], locked: [], ahead: 0, failed: [], nouns: 0, course: null };
  function chapterInfo(n) { var c = C.chapters && C.chapters[String(n)]; return c && typeof c === "object" ? c : { title: "", short: "" }; }
  /* the units of courses.js whose chapter is first to last, in book order */
  function unitsIn(first, last) {
    return arr(C.units).filter(function (u) { var c = u ? +u.chapter : 0; return c >= first && c <= last && Math.floor(c) === c; }).sort(function (a, b) { return a.chapter - b.chapter; });
  }
  /* an entry of grades[] as a span of chapters: { grade, course, first, last } (null: none) */
  function spanOf(gi) {
    return gi && +gi.first >= 1 && +gi.last >= +gi.first ? { grade: +gi.grade, course: String(gi.course || ""), first: +gi.first, last: +gi.last } : null;
  }
  function gradeChapters(g) {
    var gi = null;
    arr(C.grades).forEach(function (x) { if (x && +x.grade === +g) { gi = x; } });
    return spanOf(gi);
  }
  /* the course of the class's chapter (its grade's own when the chapter is in no course) */
  function courseOfClass(p) { return spanOf(typeof LP.courseOf === "function" ? LP.courseOf(+p.chapter) : null) || gradeChapters(p.grade); }
  function casebookPlan(p) {
    var co = courseOfClass(p), all = co ? unitsIn(co.first, co.last) : [], open = all.filter(function (u) { return u.chapter <= p.chapter; }), ahead = 0;
    if (!open.length && all.length) { open = [all[0]]; ahead = all[0].chapter; }
    return { open: open, locked: all.filter(function (u) { return open.indexOf(u) < 0; }), ahead: ahead, course: co };
  }
  function cleanText(s) { return typeof s === "string" ? s : ""; }
  function validForms(f) {
    if (!f || typeof f !== "object" || !f.nom) { return false; }
    return ROW_KEYS.every(function (k) { return !own(f, k) || (Array.isArray(f[k]) && f[k].length === 2 && typeof f[k][0] === "string" && typeof f[k][1] === "string"); });
  }
  function dotGender(g) { g = String(g || ""); return /^[mfn]$/.test(g) ? g + "." : g; }
  /* a chart of the general shape: { id, title, note, models: [{ word, meaning, gender, forms }], adjective? } */
  function chartFrom(c, chapter) {
    if (!c || typeof c.id !== "string" || !ID_RE.test(c.id) || !Array.isArray(c.models)) { return null; }
    var models = c.models.filter(function (m) { return m && typeof m.word === "string" && validForms(m.forms); }).map(function (m) {
      return { word: m.word, meaning: cleanText(m.meaning), gender: dotGender(m.gender), forms: m.forms };
    });
    if (!models.length) { return null; }
    var a = c.adjective && typeof c.adjective.word === "string" && validForms(c.adjective.forms) ? { word: c.adjective.word, meaning: cleanText(c.adjective.meaning), gender: dotGender(c.adjective.gender || models[0].gender), forms: c.adjective.forms, masc: "" } : null;
    /* (a chart may name the chapter where the book brings in its model nouns: a review chart of an older
       declension; without one it is the chapter of its unit) */
    var at = +c.chapter;
    return { id: c.id, chapter: at >= 1 && at <= 99 && Math.floor(at) === at ? at : chapter, title: cleanText(c.title) || "Chart", note: cleanText(c.note), models: models, adjective: a, sneaky: "", group: "" };
  }
  /* the chart of chapter 2 (CD_DATA.declension, the older shape), turned into the general one */
  function chartOfDeclension() {
    var dc = D.declension, rows = dc.rows;
    function formsOf(stem) { var f = {}; rows.forEach(function (r) { f[r.k] = [stem + "|" + r.sg, stem + "|" + r.pl]; }); return f; }
    var masc = dc.adjective.stem + "us";
    ((D.wordList && D.wordList.groups) || []).forEach(function (g) {
      (g.items || []).forEach(function (it) { var f = String(it.la).split(/,\s*/); if (f.length > 1 && f.indexOf(dc.adjective.word) > 0) { masc = f[0]; } });
    });
    return {
      id: "d1", chapter: 2, title: "The first declension", note: "", sneaky: dc.sneaky, group: "any noun of the first declension",
      models: dc.models.map(function (m) { return { word: m.word, meaning: m.meaning, gender: dotGender(m.gender), forms: formsOf(m.stem) }; }),
      adjective: { word: dc.adjective.word, meaning: dc.adjective.meaning, gender: dotGender(dc.models[0].gender), forms: formsOf(dc.adjective.stem), masc: masc }
    };
  }
  function cleanJob(key, j) {
    if (!JOB_KEY_RE.test(key) || own(D.cases, key) || key === "verb" || !j || typeof j.name !== "string" || !j.name) { return null; }
    return { key: key, name: j.name, abbr: cleanText(j.abbr), question: cleanText(j.question), job: cleanText(j.job), tag: cleanText(j.tag), hook: cleanText(j.hook), of: own(D.cases, j.of) ? j.of : null };
  }
  function cleanFile(f) {
    if (!f || typeof f.id !== "string" || !ID_RE.test(f.id) || !Array.isArray(f.questions) || !f.questions.length || !Array.isArray(f.briefing) || !f.briefing.length) { return false; }
    return f.questions.every(function (q) { return q && typeof q.id === "string" && Array.isArray(q.options) && q.options.length >= 2 && typeof q.answer === "string"; }) &&
      f.briefing.every(function (b) { return b && typeof b.say === "string"; });
  }
  /* the unit of a chapter as the game uses it (null: its data is missing or cannot be read) */
  function unitOf(entry) {
    var ch = +entry.chapter;
    if (UNITS[ch]) { return UNITS[ch]; }
    var u = null, k;
    if (ch === 2 && !entry.src) {
      u = { chapter: 2, grade: +entry.grade, title: chapterInfo(2).short || "", jobs: {}, method: D.method, charts: [chartOfDeclension()], wordList: D.wordList, files: D.files.slice(), builtIn: true };
    } else {
      var raw = window.CD_UNITS && own(window.CD_UNITS, String(ch)) ? window.CD_UNITS[String(ch)] : null;
      if (!raw || typeof raw !== "object" || !Array.isArray(raw.files)) { return null; }
      u = { chapter: ch, grade: +entry.grade, title: cleanText(raw.title) || chapterInfo(ch).short || "", jobs: {}, method: null, charts: [], wordList: null, files: [], builtIn: false };
      if (raw.jobs && typeof raw.jobs === "object") { for (k in raw.jobs) { if (own(raw.jobs, k)) { var j = cleanJob(k, raw.jobs[k]); if (j) { u.jobs[k] = j; } } } }
      if (Array.isArray(raw.method) && raw.method.length && raw.method.every(function (m) { return m && typeof m.title === "string" && typeof m.text === "string"; })) { u.method = raw.method; }
      arr(raw.charts).forEach(function (c) { var x = chartFrom(c, ch); if (x) { u.charts.push(x); } });
      if (raw.wordList && Array.isArray(raw.wordList.groups)) { u.wordList = raw.wordList; }
      u.files = raw.files.filter(cleanFile);
    }
    if (!u.files.length) { return null; }
    UNITS[ch] = u;
    return u;
  }
  /* unit files are loaded by script tags (that works from file:// as well); a file that fails is not asked for
     again until the page is loaded anew */
  var unitLoad = {};   /* src -> { state: "loading" | "done", waiting: [callbacks] } */
  function loadScript(src, cb) {
    var st = unitLoad[src];
    if (st && st.state === "done") { cb(); return; }
    if (st) { st.waiting.push(cb); return; }
    st = unitLoad[src] = { state: "loading", waiting: [cb] };
    var s = document.createElement("script"), safety = 0;
    function end() {
      if (st.state === "done") { return; }
      st.state = "done";
      clearTimeout(safety);
      var list = st.waiting;
      st.waiting = [];
      list.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
    }
    s.onload = end;
    s.onerror = end;
    safety = setTimeout(end, 20000);
    s.src = src;
    document.head.appendChild(s);
  }
  function loadUnits(entries, done) {
    var waiting = 1;
    function one() { waiting--; if (waiting === 0) { done(); } }
    entries.forEach(function (e) {
      if (!e.src || UNITS[+e.chapter] || (window.CD_UNITS && own(window.CD_UNITS, String(e.chapter)))) { return; }
      waiting++;
      loadScript(String(e.src), one);
    });
    one();
  }
  function fileUnit(f) { return f && own(FILE_CH, f.id) ? UNITS[FILE_CH[f.id]] || null : null; }
  function fileChapter(f) { return f && own(FILE_CH, f.id) ? FILE_CH[f.id] : 2; }
  /* "File 2", or "Ch. 3 · File 2" where the casebook holds more than one chapter */
  function fileName(f, always) { return (always || BOOK.units.length > 1 ? "Ch. " + fileChapter(f) + " · " : "") + "File " + f.n; }
  /* ------------------------------------------------------- the "Every noun" drill
     Every chapter of the casebook's course, from the course's first chapter to the class's own, ends with a
     file "Every noun": ten questions a round on the forms of the nouns of the book up to that chapter, drawn anew
     for every round (js/noundrill.js, CD_NOUN_DRILL, over the noun table js/nouns.js, CD_NOUNS). A chapter
     whose case files are not written yet has this file alone: a unit of its own, which is not kept in UNITS.
     The two scripts are asked for when a casebook opens, with the unit files. Without them the game is the
     one it was: the case files alone, and no list of nouns in the Notebook. */
  function drill() {
    var nd = window.CD_NOUN_DRILL;
    return nd && window.CD_NOUNS && typeof nd.file === "function" && typeof nd.draw === "function" ? nd : null;
  }
  function loadDrill(done) {
    var waiting = 2;
    function one() { waiting--; if (waiting === 0) { done(); } }
    loadScript("js/nouns.js", one);
    loadScript("js/noundrill.js", one);
  }
  /* a round of a drill file: ten questions, drawn anew (null: the drill has none to give) */
  function drillRound(file) {
    var nd = drill(), qs = null;
    if (!nd || !file || !file.nounDrill) { return null; }
    try { qs = nd.draw(file.nounDrill.chapter, file.nounDrill.count); } catch (e) { qs = null; }
    return Array.isArray(qs) && qs.length && cleanFile({ id: file.id, questions: qs, briefing: file.briefing }) ? qs : null;
  }
  /* the drill file of a chapter, with a first set of questions, so that it is a whole file like any other */
  function drillFile(nd, chapter, grade, n) {
    var f = null;
    try { f = nd.file(chapter, grade, n); } catch (e) { f = null; }
    if (!f || !f.nounDrill || typeof f.id !== "string") { return null; }
    f.questions = drillRound(f) || [];
    return cleanFile(f) ? f : null;
  }
  /* The units of a casebook with the drill files in them, for the chapters of its course (plan.course). A
     chapter whose case files could not be opened gets none: the home says that its files are missing.
     Returns the last chapter whose nouns are in (0: no drill), for the list of nouns in the Notebook. The
     files are those of the course's grade (an 8th grader on chapter 5 has the same file as a 6th grader:
     its briefing names the grades before the course's, never the player's). */
  function addDrill(units, plan, failed, p) {
    var nd = drill(), gc = plan.course || gradeChapters(p.grade);
    if (!nd || !gc) { return 0; }
    var last = Math.min(Math.max(+p.chapter || 0, plan.ahead || 0), gc.last), c, any = false;
    for (c = gc.first; c <= last; c++) {
      if (failed.indexOf(c) >= 0) { continue; }
      var u = null, i;
      for (i = 0; i < units.length; i++) { if (units[i].chapter === c) { u = units[i]; } }
      /* (a unit is built once and kept: its drill file is added once) */
      if (u && u.files.some(function (x) { return !!x.nounDrill; })) { any = true; continue; }
      var f = drillFile(nd, c, gc.grade, (u ? u.files.length : 0) + 1);
      if (!f) { continue; }   /* chapter 1 has no noun to drill */
      any = true;
      if (u) { u.files = u.files.concat([f]); }
      else { units.push({ chapter: c, grade: gc.grade, title: chapterInfo(c).short || "", jobs: {}, method: null, charts: [], wordList: null, files: [f], builtIn: false, drill: true }); }
    }
    units.sort(function (a, b) { return a.chapter - b.chapter; });
    return any ? last : 0;
  }
  /* the casebook of the player on the case: its files, its jobs, its charts, its Notebook */
  function useCasebook(units, plan, failed, nouns) {
    var ids = {};
    BOOK = { units: units, locked: plan.locked, ahead: plan.ahead, failed: failed, nouns: nouns || 0, course: plan.course || null };
    FILES = []; FILE_CH = {}; JOBS = {};
    units.forEach(function (u) {
      u.files.forEach(function (f) { if (!ids[f.id]) { ids[f.id] = true; FILES.push(f); FILE_CH[f.id] = u.chapter; } });
      for (var k in u.jobs) { if (own(u.jobs, k)) { JOBS[k] = u.jobs[k]; } }
    });
    jobStyles();
    var byId = {};
    CHARTS = [];
    units.forEach(function (u) { u.charts.forEach(function (c) { if (!own(byId, c.id)) { CHARTS.push(c.id); } byId[c.id] = c; }); });
    CHARTS = CHARTS.map(function (id) { return byId[id]; });
    LATIN = null;
    buildNotebook();
  }
  function openCasebook(p, done) {
    var plan = casebookPlan(p), waiting = 2;
    function ready() {
      waiting--;
      if (waiting) { return; }
      var units = [], failed = [];
      plan.open.forEach(function (e) { var u = unitOf(e); if (u) { units.push(u); } else { failed.push(+e.chapter); } });
      var nouns = addDrill(units, plan, failed, p);
      useCasebook(units, plan, failed, nouns);
      done();
    }
    loadUnits(plan.open, ready);
    loadDrill(ready);
  }


  /* ---------------------------------------------------------------- DOM */
  var app = $("app"), desk = $("desk"), stage = $("stage"), tbMid = $("tbMid");
  var homeBtn = $("homeBtn"), soundBtn = $("soundBtn"), musicBtn = $("musicBtn"), nbBtn = $("nbBtn"), streakEl = $("streak"), streakN = $("streakN");
  var gamesLink = $("gamesLink"), chip = $("playerChip");
  var inspFig = $("inspFig"), bubble = $("bubble"), bText = $("bText"), bName = $("bName"), bNext = $("bNext");
  var live = $("live"), fx = $("fx");
  var nb = $("notebook"), nbScrim = $("nbScrim"), nbClose = $("nbClose"), nbPages = $("nbPages");
  var cf = $("confirm"), cfScrim = $("cfScrim"), cfNo = $("cfNo"), cfYes = $("cfYes");
  var skA = document.querySelector(".sk-a"), skB = document.querySelector(".sk-b");
  var logoSub = document.querySelector("#logo small"), cfTitle = $("cfTitle"), cfText = $("cfText");
  bName.textContent = D.inspector.name;
  /* the confirm dialog says what Reset progress asks; removing a player borrows it with its own words */
  var CF_RESET = { title: cfTitle ? cfTitle.textContent : "", text: cfText ? cfText.textContent : "", no: cfNo.textContent, yes: cfYes.textContent };
  /* the line under the title: the player's grade and chapter (it must fit at 320 px beside the buttons) */
  function syncLogo() {
    /* (the two halves of the line are spans: on a narrow phone beside the way back to all the games they take a line each) */
    if (logoSub) { logoSub.innerHTML = player ? esc(ordinal(player.grade) + " grade") + '<span class="lg-dot"> · </span><span class="lg-ch">Chapter ' + esc(player.chapter) + "</span>" : "Wheelock\u2019s Latin"; }
    syncChip();
  }

  /* the case colors come from data.js; the stylesheet carries the same values as a fallback.
     The verb is not a case: its tag keeps the stylesheet's warm gray (the gray in data.js leans violet,
     and violet belongs to the accusative alone). */
  try {
    CASE_KEYS.forEach(function (k) { if (D.cases[k] && /^#[0-9a-f]{3,8}$/i.test(D.cases[k].color)) { document.documentElement.style.setProperty("--" + k, D.cases[k].color); } });
  } catch (e) { /* keep the fallback */ }

  var view = "players";
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
    var bar = desk.querySelector(".dock.stick, .v-home .dock, .v-players .dock, .res-actions > .btn.primary, .play-dock .clue-btn");
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
  /* (while he plays the violin, a new mood puts it away at once: see the violin, below) */
  function mood(m) { if (idle.on) { violinOff(true); } insp.setMood(m); }
  function act(m, ms) { if (idle.on) { violinOff(); } insp.play(m, ms); }
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
  /* The way back to all the games, "../index.html", finds the games' home page on the games site and in a
     copy on disk. A host that serves this game's folder alone (a preview) has nothing above it: there the
     link goes to the games site instead, in a new tab. */
  var GAMES_SITE = "https://n0tk3r.github.io/language-games/";
  /* "file", or the host name ("" when the page cannot tell) */
  function siteHost() {
    try { return location.protocol === "file:" ? "file" : String(location.hostname || "").toLowerCase(); } catch (e) { return ""; }
  }
  /* the hosts that have the games' home page above this folder: the games site, a copy on disk, a copy served
     on this computer (the players are chosen there: see "the games' home page" below) */
  function onGamesSite(h) { return h === "file" || h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || /(^|\.)github\.io$/.test(h); }
  function gamesHome() {
    var h = siteHost();
    if (!gamesLink || !h || onGamesSite(h)) { return; }
    gamesLink.setAttribute("href", GAMES_SITE);
    gamesLink.setAttribute("target", "_blank");
    gamesLink.setAttribute("rel", "noopener");
  }
  /* The player chip: on the casebook, the badge and the name of the player on the case (on a phone the badge
     alone), named for a screen reader with the grade and the chapter. On the games site it leads to the home
     page, where the players are chosen; where the game keeps its own screens for the players it is a button
     that opens them (made so at the start). */
  function syncChip() {
    if (!chip) { return; }
    var p = player, show = !!p && (view === "home" || view === "claim");
    if (chip.hidden === show) { chip.hidden = !show; app.classList.toggle("has-chip", show); }
    if (!p) { return; }
    var html = LP.badge(p, "sm") + '<span class="tb-cname">' + esc(p.name) + "</span>";
    if (chip.innerHTML !== html) { chip.innerHTML = html; }
    chip.setAttribute("aria-label", "Playing as " + p.name + ", " + LP.gradeLine(p).replace(/ · /g, ", ") + ". Change player or chapter");
  }
  function setMid(html) { tbMid.innerHTML = html || ""; fitPips(); }
  /* Every pip of the round has its place between the buttons of the top bar. A small phone has no room
     for nine of them at full size once the streak counter is out as well: there they all get smaller
     together, rather than slide under their neighbors. */
  function fitPips() {
    var box = tbMid.querySelector(".pips");
    if (!box) { return; }
    box.style.removeProperty("--pip");
    box.style.removeProperty("gap");
    var n = box.children.length, first = box.firstElementChild;
    if (!n || !first || !tbMid.clientWidth) { return; }
    var full = first.offsetWidth, gap = 0, used = 0;
    try { gap = parseFloat(getComputedStyle(box).columnGap) || 0; used = parseFloat(getComputedStyle(tbMid).columnGap) || 0; } catch (e) { gap = 4; used = 8; }
    var room = tbMid.clientWidth;
    for (var c = tbMid.firstElementChild; c; c = c.nextElementSibling) { if (c !== box && c.getClientRects().length) { room -= c.offsetWidth + used; } }
    /* (the pip of the question on show is drawn a little larger: 4 px of air for it) */
    var size = Math.floor((room - 4 - gap * (n - 1)) / n);
    /* still no room at the smallest size (ten pips, the streak and the music button on a 360 px phone):
       the gaps between the pips close up as well */
    if (size < 5 && gap > 2) { gap = 2; box.style.gap = "2px"; size = Math.floor((room - 4 - gap * (n - 1)) / n); }
    if (size < full) { box.style.setProperty("--pip", Math.max(5, size) + "px"); }
  }
  function midFile(f, extra) { setMid('<span class="tb-file"><b>File ' + f.n + "</b>" + txt(extra || f.title) + "</span>"); }
  function setStreak(n) {
    var wide = String(streakN.textContent).length !== String(n).length;
    streakN.textContent = n;
    var show = n >= 2;
    /* the counter takes room from the pips when it comes out, and again when it grows a digit (9 to 10) */
    if (streakEl.hidden === show) { streakEl.hidden = !show; fitPips(); }
    else if (show && wide) { fitPips(); }
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
    var m = null, line, t = $("muTitle"), b = $("muToggle"), nx = $("muNext"), ab = $("muAbout"), about;
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
    /* under the title, the note on the piece (music/list.js gives it, Music.now().note), while the music is on */
    if (ab) {
      about = save.music && m && !m.failed && m.note ? String(m.note) : "";
      if (ab.getAttribute("data-note") !== about) { ab.setAttribute("data-note", about); ab.innerHTML = about ? rich(about) : ""; }
      ab.hidden = !about;
    }
    if (b) { b.setAttribute("aria-pressed", save.music ? "true" : "false"); b.textContent = save.music ? "Music: on" : "Music: off"; }
    if (nx) { nx.disabled = !save.music; }
  }

  /* ----------------------------------------------------------- views */
  var CAM = { players: 0, setup: 0, home: 0, claim: 0, briefing: 1, training: 2, play: 2, results: 3 };
  /* (the question about the stars of 2.1 comes before the casebook, and has its look: its top bar, his size) */
  var LOOK = { claim: "home" };
  function setView(name, node, opts) {
    violinOff();
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
    app.setAttribute("data-view", LOOK[name] || name);
    homeBtn.hidden = name === "home" || name === "players" || name === "setup" || name === "claim";
    /* the way back to all the games stands where "Case files" is hidden: never two ways back at once */
    if (gamesLink) { gamesLink.hidden = !homeBtn.hidden; }
    nbBtn.hidden = !player || name === "players" || name === "setup";
    syncChip();
    desk.textContent = "";
    desk.appendChild(node);
    if (!(opts && opts.keepScroll)) { try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } }
    fitInspector();
    camNow = CAM[name] || 0;
    parallax();
    if (name !== "play") { setStreak(0); }
    if (kb) { try { desk.focus({ preventScroll: true }); } catch (e2) { /* ignore */ } }
    idleArm();
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
  /* an answer is shown in its case color (or its job's) only when it names the case (or the job) itself */
  function caseOfOption(o) {
    var k = colorKey(o.k), c = k ? keyInfo(k) : null;
    if (!c) { return null; }
    if (String(o.label).indexOf(c.name) === 0 || o.sub === c.name) { return k; }
    return null;
  }
  /* The short name of an answer's job ("Abl. agent"), where the answer carries the job's long name and
     that name has more than one word ("Ablative of personal agent"); "" otherwise. Such an answer is
     written with both names, and the stylesheet shows one of them: the long one, unless a phone is too
     short for the screen (fitPlay: "opt-ab" on the cards; trimAnswered: "ask-ab" in the case note). A
     screen reader always gets the long one. */
  function shortOf(o) {
    var ki = o && !o.latin ? keyInfo(o.k) : null;
    return ki && ki.abbr && ki.abbr !== ki.name && o.label === ki.name && /\s/.test(String(ki.name)) ? String(ki.abbr) : "";
  }
  function twoNames(o, ab) { return '<span class="ol-n">' + esc(o.label) + '</span><span class="ol-a" aria-hidden="true">' + esc(ab) + "</span>"; }
  /* both: the chip may carry the short name of its job too (the "Why not ...?" line of the case note) */
  function optionChip(o, extra, both) {
    var ck = colorKey(o.k), ab = both ? shortOf(o) : "";
    return '<span class="chip' + (o.latin ? " latin" : "") + (ck && !o.latin ? " c-" + ck : "") + (extra ? " " + extra : "") + '"' + (o.latin ? ' lang="la"' : "") + ">" + (ab ? twoNames(o, ab) : esc(o.label)) + "</span>";
  }
  /* the words that tie an answer to its case: printed beside the right answer in the verdict */
  function jobOf(o) {
    var k = colorKey(o.k), cs = k ? keyInfo(k) : null;
    if (o.sub) { return o.sub; }
    if (!cs) { return ""; }
    return String(o.label).indexOf(cs.name) === 0 ? (cs.question || cs.name) : cs.name;
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
    var c = keyInfo(w.r);
    if (!c) { return null; }
    var tag = w.tag || c.tag, s = el("span", "w-lab");
    s.setAttribute("lang", "en");
    /* A job with a long name ("Ablative of personal agent") has its short name ("Abl. agent") in the label
       too. It takes the long one's place where a screen is too short for the sentence (fitPlay,
       trimAnswered: "lab-ab"); a screen reader always gets the long one. */
    var two = !!c.abbr && c.abbr !== c.name && /\s/.test(String(c.name));
    s.innerHTML = "<b>" + (two ? '<span class="wl-n">' + esc(c.name) + '</span><span class="wl-a" aria-hidden="true">' + esc(c.abbr) + "</span>" : esc(c.name)) + "</b>" +
      (tag && String(tag).toLowerCase() !== String(c.name).toLowerCase() ? "<span>" + esc(tag) + "</span>" : "");
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
      var u = el("span", "wu" + (w.r && keyInfo(w.r) ? " c-" + w.r : ""));
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
  /* (No picture for a sentence with an ablative in it: scenes.js cannot show "without", "by", "with" or
     "from", and would draw the thing itself as if it were there. Hints from the data would lift that.) */
  /* The pictures know the words of chapter 2 only. A sentence with any other word, or with a job that is
     not one of the six cases, simply has no picture: no error, and no empty frame. */
  var SCENE_WORDS = null;
  function sceneKnows(words) {
    if (!SCENE_WORDS) {
      SCENE_WORDS = {};
      var add = function (list) { arr(list).forEach(function (w) { if (w && typeof w.lemma === "string") { SCENE_WORDS[w.lemma] = true; } }); };
      D.files.forEach(function (f) {
        arr(f.questions).forEach(function (q) { if (q) { add(q.words); } });
        arr(f.briefing).forEach(function (bl) { if (bl && bl.lesson) { add(bl.lesson.words); } });
        if (f.training) { add(f.training.words); }
      });
    }
    return words.every(function (w) { return !!w && (!w.r || w.r === "verb" || own(D.cases, w.r)) && typeof w.lemma === "string" && own(SCENE_WORDS, w.lemma); });
  }
  function canScene(words, hints) {
    try {
      if (!scenesOn() || !(words && words.length)) { return false; }
      if (!sceneKnows(words)) { return false; }
      if (!hints && words.some(function (w) { return !!w && w.r === "abl"; })) { return false; }
      return !!window.Scenes.canDraw(words, hints || null);
    } catch (e) { return false; }
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
  /* A question whose options are jobs asks what the picture would tell: its figures carry the jobs ("who
     does it", "gets the action") and the mystery word's figure shows its own (the ribbon of an owner, the
     hands of a receiver). Such a question gets its picture after the answer, like a sentence question.
     Options are jobs when not one of them is named after its case ("Possession", not "Genitive"). */
  function optsAreJobs(q) {
    var o = (q && q.options) || [];
    return o.length > 0 && o.every(function (x) { var c = x && D.cases[x.k]; return !!c && plain(String(x.label || "")).indexOf(c.name) < 0; });
  }
  /* before the answer: a question that says its sentence in English may show it as a picture */
  function sceneAsk() {
    var c = R && R.cur, v = desk.querySelector(".v-play"), lay = sceneLay();
    if (view !== "play" || !c || c.answered || !v || !lay || lay === "late" || SC || !c.q.words || c.q.type === "sentence" || optsAreJobs(c.q)) { return; }
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
  /* where the things to tap are: the suspects and the bar (Skip, Next). The picture comes when the
     child has just tapped a suspect and is about to tap Next: it must not move either. */
  function trainSpots() {
    var l = T.view.querySelectorAll(".answers .opt, .dock button"), out = [], i, r;
    for (i = 0; i < l.length; i++) { r = l[i].getBoundingClientRect(); out.push([Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(",")); }
    return out.join(" ");
  }
  function sceneTrain() {
    var v = T && T.view, wide = wideLayout();
    if (!v || SC || !sceneLay() || pageOver() > 0) { return; }
    var was = app.style.getPropertyValue("--insp"), from = inspFig.getBoundingClientRect(), spots = trainSpots();
    var stood = { stage: stage.style.minHeight, view: v.style.minHeight, hold: T.hold, holdW: T.holdW };
    if (!layScene(v, sceneSrc(T.tr), "stack")) { return; }
    applyReserve();
    trainHold(wide);
    /* (a tablet's Inspector gives some of his height, as he does for the picture of a question) */
    if (pageOver() > 0) { spareInspector(false); }
    /* where the strip would push the suspects or the bar (laptops, tablets), this layout has no picture
       in the training case */
    if (pageOver() > 0 || trainSpots() !== spots) {
      dropScene();
      inspBack(was);
      stage.style.minHeight = stood.stage; v.style.minHeight = stood.view; T.hold = stood.hold; T.holdW = stood.holdW;
      return;
    }
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
      /* A card that carries the long name of a job ("Ablative of personal agent") has the job's short name
         too ("Abl. agent"). The short one takes its place on a phone that is too short for the question
         (fitPlay: "opt-ab"); a screen reader always gets the long one. */
      var ab = shortOf(o);
      var b = el("button", "opt" + (o.latin ? " latin" : "") + (ck ? " colored c-" + ck : "") + (p ? " has-pic" : ""));
      b.type = "button";
      b.setAttribute("data-k", o.k);
      b.innerHTML = '<span class="o-key" aria-hidden="true">' + (i + 1) + "</span>" + p + '<span class="o-txt"><span class="o-lab"' + (o.latin ? ' lang="la"' : "") + ">" +
        (ab ? twoNames(o, ab) : esc(o.label)) + "</span>" +
        (o.sub ? '<span class="o-sub">' + esc(o.sub) + "</span>" : "") + '<span class="o-stamp" aria-hidden="true">' + esc(L.eliminated) + '</span></span><span class="o-mark" aria-hidden="true"></span>';
      box.appendChild(b);
    });
    return box;
  }
  /* No answer may ever be cut off by its card. The stylesheet puts four Latin forms in one row only
     where the longest of them fits; this is the measured net under it, for the fonts, zoom levels and
     window sizes nobody planned for. A label that is wider than its box sends the four cards back to
     two columns (three cards in a row give up the air at their sides); if it still does not fit, the
     type of the labels steps down (never under 17 px), then the number keys give up their badges. The
     name of a job in English ("Ablative of accompaniment" on the narrowest phone) is no Latin form to be
     read letter by letter: its four cards give up the air at their sides as well, and its type may go
     down to 14 px, the size the names on three cards in a row have there. And should even that fail,
     the word is allowed to break rather than to hide its ending.
     Run after the cards are built, and again when the window, the fonts or a card change. */
  var LAB_MIN = 17, LAB_LOW = 14;
  /* the part of a card's text that is on the screen: of a job's two names, the one that shows (buildAnswers) */
  function labShown(lab) {
    var a = lab.querySelector(".ol-a");
    return a ? (a.offsetWidth ? a : (lab.querySelector(".ol-n") || lab)) : lab;
  }
  /* true when the text of a label is wider than the room it has (less `spare` px of air) */
  function labOver(lab, spare) {
    var room = lab.getBoundingClientRect().width, need = lab.scrollWidth > lab.clientWidth ? lab.scrollWidth : 0, rg;
    if (!room) { return false; }
    try { rg = document.createRange(); rg.selectNodeContents(labShown(lab)); need = Math.max(need, rg.getBoundingClientRect().width); } catch (e) { /* keep the box's own figure */ }
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
        rg.selectNodeContents(labShown(texts[j]));
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
        rg.selectNodeContents(labShown(texts[j]));
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
        /* and names in English give up the air at the sides of their four cards, then some of their type */
        if (!box.classList.contains("latin") && labelOver(box, 0)) {
          box.classList.add("slim");
          while (fs > LAB_LOW && labelOver(box, 0)) {
            fs--;
            box.style.setProperty("--lab-fs", fs + "px");
            box.classList.add("fs");
          }
        }
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
  /* The charts: one build for the Notebook and for the briefing that opens with one (request 6). A chart
     is the book's own: its model nouns (the first one is the noun the book prints), and the book's
     adjective beside the noun where that is asked for. Every form is written "base|ending"; the ending is
     printed in bold. Chapter 2's chart (CD_DATA.declension) has been turned into this shape at load.
     o.model: the noun (default: the model noun); o.adj: noun and adjective in every cell; o.sneaky: mark
     the cells with the chart's sneaky ending (chapter 2: -ae; the Notebook explains them, the first
     briefing does not); o.helps: "(one)" and "(many)" beside the column heads; o.test: every form under a
     box that a press opens (an object: the cells that are open already, "gen.sg": true).
     A screen reader gets every form as one text ("porta magna"): the letters with the bold ending are
     for the eye only. */
  function splitForm(s) { s = String(s); var i = s.indexOf("|"); return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)]; }
  function formText(s) { return String(s).replace("|", ""); }
  function chartRows(chart) { var f = chart.models[0].forms; return ROW_KEYS.filter(function (k) { return own(f, k) && own(D.cases, k); }); }
  function declForm(parts) { return esc(parts[0]) + "<b>" + esc(parts[1]) + "</b>"; }
  function chartTable(chart, o) {
    o = o || {};
    var m = o.model || chart.models[0], adj = o.adj ? chart.adjective : null, n = 0;
    var h = '<table class="decl' + (adj ? " with-adj" : "") + (o.test ? " is-test" : "") + '"><thead><tr><th scope="col">Case</th><th scope="col">Singular' + (o.helps ? " <small>(one)</small>" : "") +
      '</th><th scope="col">Plural' + (o.helps ? " <small>(many)</small>" : "") + "</th></tr></thead><tbody>";
    chartRows(chart).forEach(function (k) {
      var c = D.cases[k];
      function cell(num) {
        var at = num === "sg" ? 0 : 1, f = splitForm(own(m.forms, k) ? m.forms[k][at] : ""), af = adj && own(adj.forms, k) ? splitForm(adj.forms[k][at]) : null;
        /* a form the noun does not have (a noun used only in the plural has no singular): the cell is
           empty, and a screen reader hears that there is none */
        if (!f[0] && !f[1]) { return '<td class="d-none"><span class="sr">no form</span></td>'; }
        var sn = !!o.sneaky && !!chart.sneaky && f[1] === chart.sneaky;
        if (sn) { n++; }
        var eye = '<span class="d-f" aria-hidden="true"><span class="d-n">' + declForm(f) + "</span>" + (af ? ' <span class="d-a">' + declForm(af) + "</span>" : "") + "</span>";
        var said = esc(f[0] + f[1] + (af ? " " + af[0] + af[1] : "")) + (sn ? '<span lang="en"> (the sneaky ending)</span>' : "");
        if (o.test) {
          /* Test yourself: the form is in its box, unseen, so the box has the form's own size. The box
             stays a button when it is open: the focus keeps its place, and what the button says changes
             from "covered" to the form. */
          var id = k + "." + num, open = o.test[id] === true, what = esc(c.name + " " + (num === "sg" ? "singular" : "plural"));
          return "<td" + (sn ? ' class="sn"' : "") + ' lang="la"><button type="button" class="d-box' + (open ? " open" : "") + '" data-box="' + id + '"' + (open ? ' aria-disabled="true"' : "") + ">" +
            '<span class="sr" lang="en"' + (open ? " hidden" : "") + ">" + what + ', covered. Show the form.</span><span class="d-q" aria-hidden="true">?</span>' + eye +
            '<span class="sr"' + (open ? "" : " hidden") + '><span lang="en">' + what + ": </span>" + said + "</span></button></td>";
        }
        return "<td" + (sn ? ' class="sn"' : "") + ' lang="la">' + eye + '<span class="sr">' + said + "</span></td>";
      }
      /* (o.abbr: the short name of the case is in the cell too, unseen until a table needs the room: All nouns) */
      h += '<tr class="c-' + c.key + '"><th scope="row">' + (o.abbr && c.abbr ? '<span class="d-cn">' + esc(c.name) + '</span><span class="d-ca" aria-hidden="true">' + esc(c.abbr) + "</span>" : esc(c.name)) + "</th>" + cell("sg") + cell("pl") + "</tr>";
    });
    return { html: h + "</tbody></table>", sneaky: n };
  }
  /* the ending of one cell of a chart's model noun (chapter 2: declRow(k).sg) */
  function chartEnd(chart, k, at) { var m = chart.models[0]; return own(m.forms, k) ? splitForm(m.forms[k][at])[1] : ""; }
  /* The chart in the Notebook can be asked things: another chart of the casebook (the tabs), another noun
     of the chart (the chips), the book's adjective beside the noun (a switch), and every form under a
     box, to say it from memory first ("Test yourself", a second switch). Nothing of it is saved: every
     time the Notebook opens it shows the chart of the class's chapter, its model noun alone, uncovered. */
  var nbDecl = { chart: 0, model: 0, adj: false, test: false, open: {}, shown: "", chips: "" };
  var DC_TEST = "Say each form out loud, then tap a box to check.";
  var DC_JOB = "The ending changes with the job.";
  var GENDER = { "m.": "masculine", "f.": "feminine", "n.": "neuter" };
  function capital(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function modelLine(chart) { return "The model noun in Wheelock’s Latin, chapter " + chart.chapter + "."; }
  /* the dictionary entry of a noun, in the form of the word list: porta, portae, f., gate */
  function declEntry(chart, m) {
    var g = own(m.forms, "gen") ? formText(m.forms.gen[0]) : "";
    return '<i lang="la">' + esc(m.word) + (g ? ", " + esc(g) : "") + "</i>" + (m.gender ? ", " + esc(m.gender) : "") + (m.meaning ? ", " + esc(m.meaning) : "");
  }
  function curChart() { return CHARTS[nbDecl.chart] || CHARTS[0] || null; }
  function declShow() {
    var box = $("dcTable"), chart = curChart(), i;
    if (!box || !chart) { return; }
    var m = chart.models[nbDecl.model] || chart.models[0], m0 = chart.models[0], adj = chart.adjective, agrees = !!adj && m.gender === adj.gender;
    var tabs = nbPages.querySelectorAll(".dc-tab");
    for (i = 0; i < tabs.length; i++) { tabs[i].setAttribute("aria-pressed", CHARTS[+tabs[i].getAttribute("data-chart")] === chart ? "true" : "false"); }
    var title = $("dcTitle");
    if (title && title.textContent !== chart.title) { title.textContent = chart.title; }
    /* the chips: one for each noun of this chart (a chart of one noun has none) */
    var chipBox = $("dcChips");
    if (chipBox && nbDecl.chips !== chart.id) {
      nbDecl.chips = chart.id;
      var ch = '<span class="dc-lab" id="dcChipsLab">Try another noun:</span>';
      chart.models.forEach(function (x, n) { ch += '<button type="button" class="dc-chip" data-noun="' + n + '" aria-pressed="false" lang="la">' + esc(x.word) + "</button>"; });
      chipBox.innerHTML = ch;
      chipBox.hidden = chart.models.length < 2;
      var sizer = $("dcAboutSize");
      if (sizer) { sizer.textContent = modelLine(chart) + " " + DC_JOB; }
    }
    /* (the entry line is read out when the noun changes, not every time the Notebook opens) */
    var key = chart.id + ":" + nbDecl.model;
    if (nbDecl.shown !== key) { $("dcEntry").innerHTML = declEntry(chart, m); nbDecl.shown = key; }
    $("dcAbout").textContent = (m === m0 ? modelLine(chart) + " " : "") + DC_JOB;
    var chips = nbPages.querySelectorAll(".dc-chip");
    for (i = 0; i < chips.length; i++) { chips[i].setAttribute("aria-pressed", chart.models[+chips[i].getAttribute("data-noun")] === m ? "true" : "false"); }
    /* the adjective agrees with the nouns of its own gender: a noun of another gender gets a line that
       says so in place of the switch */
    var sw = $("dcAdj"), masc = $("dcMasc"), other = !!adj && !agrees;
    sw.hidden = !agrees;
    sw.setAttribute("aria-pressed", nbDecl.adj ? "true" : "false");
    var aw = $("dcAdjWord");
    if (aw && adj && aw.textContent !== adj.word) { aw.textContent = adj.word; }
    masc.hidden = !other;
    if (other && adj.masc && m.gender === "m.") {
      masc.innerHTML = '<i lang="la">' + esc(capital(m.word)) + "</i> is masculine (" + esc(m.gender) + '), so it does not take <i lang="la">' + esc(adj.word) +
        '</i>. It takes <i lang="la">' + esc(adj.masc) + "</i>, and you learn those endings in chapter 3.";
    } else if (other) {
      /* (what the switch would put beside the noun are the adjective's forms of its own gender: "the
         masculine forms of magnus") */
      var ag = GENDER[adj.gender] || "";
      masc.innerHTML = '<i lang="la">' + esc(capital(m.word)) + "</i> is " + esc(GENDER[m.gender] || "of another gender") + (m.gender ? " (" + esc(m.gender) + ")" : "") + ", so it does not take the " + (ag ? esc(ag) + " " : "") +
        'forms of <i lang="la">' + esc(adj.word) + "</i>.";
    } else { masc.innerHTML = ""; }
    var tsw = $("dcTest"), say = $("dcSay");
    if (tsw) { tsw.setAttribute("aria-pressed", nbDecl.test ? "true" : "false"); }
    if (say) { say.hidden = !nbDecl.test; }
    box.classList[nbDecl.test ? "add" : "remove"]("test");
    box.innerHTML = chartTable(chart, { model: m, adj: nbDecl.adj && agrees, sneaky: true, helps: true, test: nbDecl.test ? nbDecl.open : null }).html;
    var gen = own(m.forms, "gen") ? splitForm(m.forms.gen[0]) : null;
    $("dcBase").innerHTML = gen && gen[1] ? "To decline " + (chart.group ? esc(chart.group) : 'a noun like <i lang="la">' + esc(m.word) + "</i>") + ', drop <b class="nw">-' + esc(gen[1]) + '</b> from its genitive: <i lang="la">' + esc(gen[0] + gen[1]) +
      '</i> gives the base <i lang="la" class="nw">' + esc(gen[0]) + "-</i>. Then add the endings." : "";
    var foot = $("dcFoot"), fk = chart.id;
    if (foot && foot.getAttribute("data-for") !== fk) { foot.setAttribute("data-for", fk); foot.innerHTML = chartFoot(chart); }
    declFit();
  }
  /* Under the chart: what its sneaky ending is (chapter 2), or the chart's own note. The chart marks every
     cell with the sneaky ending; he speaks of three suspects, because the fourth cell (the vocative
     plural) is the nominative's twin. The caption says so. */
  function chartFoot(chart) {
    if (chart.sneaky) {
      var cells = 0, twin = false;
      chartRows(chart).forEach(function (k) {
        if (chartEnd(chart, k, 0) === chart.sneaky) { cells++; }
        if (chartEnd(chart, k, 1) === chart.sneaky) { cells++; if (k === "voc") { twin = true; } }
      });
      return '<p class="decl-key"><b lang="la">-' + esc(chart.sneaky) + "</b><span>The sneaky ending. It turns up " + cells + " times" +
        (twin && cells === 4 ? ": the three suspects, and the vocative plural, which always looks like the nominative." : ", so the rest of the sentence has to tell you which job it has.") + "</span></p>";
    }
    return chart.note ? '<p class="dc-note">' + rich(chart.note) + "</p>" : "";
  }
  /* Noun and adjective stand side by side where every cell holds both on one line. Where one cell
     cannot, the adjective stands under its noun, in all cells alike. */
  function declFit() {
    var box = $("dcTable"), t = box ? box.firstChild : null, i;
    if (!t || !t.classList) { return; }
    box.classList.remove("stack");
    if (!t.classList.contains("with-adj")) { return; }
    var over = t.offsetWidth > box.clientWidth + 1, fs = t.querySelectorAll(".d-f");
    for (i = 0; i < fs.length && !over; i++) { if (fs[i].getClientRects().length > 1) { over = true; } }
    if (over) { box.classList.add("stack"); }
  }
  /* (another chart, another noun or a switch is a new test: every box is closed again) */
  function declChart(i) {
    if (!CHARTS[i] || i === nbDecl.chart) { return; }
    nbDecl.chart = i;
    nbDecl.model = 0;
    nbDecl.adj = false;
    nbDecl.open = {};
    declShow();
  }
  function declPick(i) {
    var chart = curChart();
    if (!chart || !chart.models[i] || i === nbDecl.model) { return; }
    nbDecl.model = i;
    nbDecl.open = {};
    declShow();
  }
  function declSwitch(what) {
    if (what === "adj") { nbDecl.adj = !nbDecl.adj; }
    if (what === "test") { nbDecl.test = !nbDecl.test; }
    nbDecl.open = {};
    declShow();
  }
  /* a box is pressed: its form shows. Only this one cell changes, so the focus stays on its button. */
  function declOpen(btn) {
    var id = btn.getAttribute("data-box"), sr = btn.querySelectorAll(".sr");
    if (!nbDecl.test || nbDecl.open[id] === true) { return; }
    nbDecl.open[id] = true;
    btn.classList.add("open");
    btn.setAttribute("aria-disabled", "true");
    if (sr.length === 2) { sr[0].hidden = true; sr[1].hidden = false; announce(sr[1].textContent); }
  }
  /* the chart the Notebook opens with: the one of the class's chapter (the last of the casebook) */
  function homeChart() { return Math.max(0, CHARTS.length - 1); }
  /* the method of a file: its unit's own, or the one of chapter 2 */
  function methodOf(f) { var u = fileUnit(f); return u && u.method ? u.method : D.method; }
  /* All nouns: every noun of the book up to the class's chapter (the nouns of the drill, js/noundrill.js),
     chapter by chapter, the latest first. A chapter's list opens and closes at its heading, a noun's whole
     table under its line; a table is built when it is first asked for, by the chart renderer above. Every
     time the Notebook opens, the class's chapter is open and every table is closed. In a round of the noun
     drill the chapter of the noun on the desk is the open one, and that noun is marked and in view (his
     clue may send the player here: "Check its table in your Notebook."). */
  var AN_SIZES = [18, 17, 16, 15, 14];
  function nounGroups() {
    var nd = drill(), out = [];
    if (!nd || !BOOK.nouns || typeof nd.groups !== "function" || typeof nd.chart !== "function") { return out; }
    try { out = arr(nd.groups(BOOK.nouns)).filter(function (g) { return g && Array.isArray(g.nouns) && g.nouns.length && +g.chapter >= 1; }); } catch (e) { out = []; }
    return out;
  }
  function nounsHtml() {
    var groups = nounGroups(), h = "";
    if (!groups.length) { return ""; }
    h += '<section class="nb-sec nb-nouns span"><h3>All nouns</h3><p>Every noun of Wheelock’s Latin up to chapter ' + BOOK.nouns + '. Tap a noun to see all its forms.</p><div class="an-chs">';
    groups.forEach(function (g) {
      var ch = +g.chapter, short = chapterInfo(ch).short, list = g.nouns.filter(function (x) { return x && typeof x.id === "string" && ID_RE.test(x.id); }), n = list.length, id = "anCh" + ch;
      h += '<div class="an-ch"><h4 class="an-chh"><button type="button" class="an-chb" data-anch="' + ch + '" aria-expanded="false" aria-controls="' + id + '"><b>Chapter ' + ch + "</b>" +
        (short ? '<span class="an-cht">' + rich(short) + "</span>" : "") + '<span class="an-n">' + n + (n === 1 ? " noun" : " nouns") + "</span>" + icon("next", "ic an-arrow") + '</button></h4><ul class="an-list" id="' + id + '" hidden>';
      list.forEach(function (x) {
        h += '<li class="an-item"><button type="button" class="an-noun" data-an="' + esc(x.id) + '" aria-expanded="false" aria-controls="anT-' + esc(x.id) + '"><span class="an-e">' + rich(x.entryHtml) + ", " + esc(x.meaning) + "</span>" +
          icon("next", "ic an-arrow") + '</button><div class="an-panel" id="anT-' + esc(x.id) + '" role="group" aria-label="The forms of ' + esc(x.word) + '" hidden></div></li>';
      });
      h += "</ul></div>";
    });
    return h + "</div></section>";
  }
  /* the table of one noun, with the lines the table has under it (a locative, a second form the book allows) */
  function nounTable(id) {
    var nd = drill(), c = null, forms = {}, empty = false;
    try { c = nd ? nd.chart(id) : null; } catch (e) { c = null; }
    if (!c || !c.forms || typeof c.forms !== "object") { return ""; }
    ROW_KEYS.forEach(function (k) {
      var row = Array.isArray(c.forms[k]) ? c.forms[k] : [];
      forms[k] = [0, 1].map(function (i) { if (typeof row[i] !== "string" || !row[i]) { empty = true; return ""; } return row[i]; });
    });
    var chart = { id: "n-" + id, chapter: 0, title: cleanText(c.entry), note: "", models: [{ word: cleanText(c.word), meaning: cleanText(c.meaning), gender: dotGender(c.gender), forms: forms }], adjective: null, sneaky: "", group: "" };
    return chartTable(chart, { abbr: true }).html + arr(c.lines).map(function (s) { return '<p class="an-line">' + rich(s) + "</p>"; }).join("") +
      (empty ? '<p class="an-line">An empty box means the book has no such form for this noun.</p>' : "");
  }
  /* a table is never wider than the Notebook: a long noun's table takes the short names of the cases
     ("Nom."; a screen reader keeps the full names), then its type steps down, and at the very last a word
     may break */
  function fitNounTable(panel) {
    var t = panel.querySelector("table"), i = 0;
    if (!t || panel.hidden) { return; }
    function wide() { return t.offsetWidth > panel.clientWidth + 1; }
    panel.style.removeProperty("--an-fs");
    panel.classList.remove("ab");
    panel.classList.remove("brk");
    if (wide()) { panel.classList.add("ab"); }
    while (wide() && i < AN_SIZES.length) { panel.style.setProperty("--an-fs", AN_SIZES[i++] + "px"); }
    if (wide()) { panel.classList.add("brk"); }
  }
  function fitNounTables() {
    var list = nbPages.querySelectorAll(".an-panel:not([hidden])");
    for (var i = 0; i < list.length; i++) { fitNounTable(list[i]); }
  }
  function nounChapter(btn, open) {
    var list = $(btn.getAttribute("aria-controls"));
    if (!list) { return; }
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    list.hidden = !open;
    if (open) { fitNounTables(); }
  }
  function nounOpen(btn, open) {
    var panel = $(btn.getAttribute("aria-controls"));
    if (!panel) { return; }
    if (open && !panel.firstChild) { panel.innerHTML = nounTable(btn.getAttribute("data-an")); }
    if (open && !panel.firstChild) { return; }
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    panel.hidden = !open;
    if (open) { fitNounTable(panel); }
  }
  /* the noun of the question on the desk, in a round of the noun drill (its questions are "n-<noun>-<case>-<number>") */
  function deskNoun() {
    var q = view === "play" && R && R.file && R.file.nounDrill && R.cur ? R.cur.q : null;
    var m = q ? /^n-(.+)-(?:nom|gen|dat|acc|abl|voc)-(?:sg|pl)$/.exec(String(q.id)) : null;
    return m ? m[1] : "";
  }
  /* as the Notebook opens: one chapter open, every table closed. Returns the line of the noun on the desk. */
  function nounsReset() {
    var sec = nbPages.querySelector(".nb-nouns"), i;
    if (!sec) { return null; }
    var chs = sec.querySelectorAll(".an-chb"), open = sec.querySelectorAll('.an-noun[aria-expanded="true"]'), was = sec.querySelectorAll(".an-item.now");
    for (i = 0; i < open.length; i++) { nounOpen(open[i], false); }
    for (i = 0; i < was.length; i++) {
      was[i].classList.remove("now");
      var tag = was[i].querySelector(".an-now");
      if (tag) { tag.parentNode.removeChild(tag); }
    }
    var id = deskNoun(), row = id ? sec.querySelector('.an-noun[data-an="' + selEsc(id) + '"]') : null;
    var first = row ? row.closest(".an-ch").querySelector(".an-chb") : chs[0];
    for (i = 0; i < chs.length; i++) { nounChapter(chs[i], chs[i] === first); }
    if (row) {
      row.parentNode.classList.add("now");
      row.querySelector(".an-e").insertAdjacentHTML("beforeend", ' <span class="an-now">On the desk now</span>');
    }
    return row;
  }
  function nbCard(c, ofCase) {
    var pk = ofCase || null;
    return '<li class="nb-case c-' + c.key + (pk ? "" : " no-pic") + '">' + (pk ? pic("c-" + pk, "c-pic") : "") + '<div class="nb-ct"><span class="chip c-' + c.key + '">' + esc(c.name) + "</span>" +
      (c.question ? '<b class="nb-q">' + esc(c.question) + "</b>" : "") + (c.job ? '<span class="nb-job">Job: ' + esc(c.job) + "</span>" : "") + (c.hook ? '<span class="nb-hook">' + rich(c.hook) + "</span>" : "") + "</div></li>";
  }
  function buildNotebook() {
    var h = "", k;
    h += '<section class="nb-sec"><h3>Every case has a job</h3><ul class="nb-cases">';
    ROW_KEYS.forEach(function (key) { if (own(D.cases, key)) { h += nbCard(D.cases[key], key); } });
    /* and a card for each job the open units add (the ablative of agent, the appositive, ...) */
    for (k in JOBS) { if (own(JOBS, k)) { h += nbCard(JOBS[k], JOBS[k].of); } }
    h += "</ul></section>";
    /* the charts of the casebook: what the one on show shows (which noun, with the adjective or without)
       is put in by declShow() */
    if (CHARTS.length) {
      var first = CHARTS[homeChart()];
      h += '<section class="nb-sec nb-decl"><h3 id="dcTitle">' + esc(first.title) + "</h3>";
      if (CHARTS.length > 1) {
        h += '<div class="dc-tabs" role="group" aria-label="Charts">';
        CHARTS.forEach(function (c, i) { h += '<button type="button" class="dc-tab" data-chart="' + i + '" aria-pressed="false"><small>Ch. ' + c.chapter + "</small> " + esc(c.title) + "</button>"; });
        h += "</div>";
      }
      h += '<p class="dc-entry" id="dcEntry" aria-live="polite"></p>' +
        '<div class="dc-about"><p aria-hidden="true" id="dcAboutSize">' + esc(modelLine(first) + " " + DC_JOB) + '</p><p id="dcAbout"></p></div>' +
        '<div class="dc-chips" id="dcChips" role="group" aria-labelledby="dcChipsLab"></div>' +
        '<div class="dc-opts"><button type="button" class="dc-switch" id="dcAdj" data-decl="adj" aria-pressed="false"><span class="dc-knob" aria-hidden="true"></span><span>with <i lang="la" id="dcAdjWord">' + esc(first.adjective ? first.adjective.word : "") + "</i></span></button>" +
        '<p class="dc-masc" id="dcMasc" hidden></p><button type="button" class="dc-switch" id="dcTest" data-decl="test" aria-pressed="false"><span class="dc-knob" aria-hidden="true"></span><span>Test yourself</span></button></div>' +
        '<p class="dc-say" id="dcSay" hidden>' + esc(DC_TEST) + '</p><div class="dc-table" id="dcTable"></div><p class="dc-base" id="dcBase"></p><div class="dc-foot" id="dcFoot"></div></section>';
    }
    h += '<section class="nb-sec nb-how"><h3>The detective method</h3><ol class="nb-method">';
    var meth = D.method;
    BOOK.units.forEach(function (u) { if (u.method) { meth = u.method; } });
    meth.forEach(function (m) { h += "<li><b>" + txt(m.title) + "</b>" + txt(m.text) + "</li>"; });
    h += "</ol></section>";
    /* the word list: every Latin word of the sentences with its full dictionary entry, one entry a line,
       in the form of the chart's own entry line; chapter by chapter, the class's own chapter first */
    var lists = BOOK.units.filter(function (u) { return u.wordList && arr(u.wordList.groups).length; }).reverse();
    if (lists.length) {
      h += '<section class="nb-sec nb-words"><h3>Word list</h3>' + (lists[0].wordList.intro ? "<p>" + rich(lists[0].wordList.intro) + "</p>" : "");
      lists.forEach(function (u) {
        var short = chapterInfo(u.chapter).short;
        h += '<div class="wl-ch"><h4 class="wl-chh">Chapter ' + u.chapter + (short ? '<span class="wl-cht">' + rich(short) + "</span>" : "") + '</h4><div class="wl-groups">';
        arr(u.wordList.groups).forEach(function (g) {
          if (!g) { return; }
          h += '<div class="wl-group"><h4>' + rich(g.title) + '</h4><ul class="wl">';
          arr(g.items).forEach(function (it) { if (it) { h += '<li><i lang="la">' + esc(it.la) + "</i>" + (it.note ? ", " + esc(it.note) : "") + ", " + rich(it.en) + "</li>"; } });
          h += "</ul></div>";
        });
        h += "</div></div>";
      });
      h += "</section>";
    }
    /* every noun of the book so far, each with its whole table (the nouns of the drill) */
    h += nounsHtml();
    h += '<section class="nb-sec nb-notes' + (MUSIC ? "" : " span") + '"><h3>Field notes</h3><p>' + esc(D.inspector.nameNote) + '</p><ul class="nb-tips"><li>' + esc(L.glossHint) + "</li><li>Clues never cost stars. Ask as often as you like.</li>" +
      '<li class="kb-tip">On a keyboard: <kbd>1</kbd> to <kbd>4</kbd> answer, <kbd>Enter</kbd> continues, <kbd>C</kbd> asks for a clue, <kbd>N</kbd> opens this Notebook and <kbd>M</kbd> turns the sound effects on or off.</li></ul></section>';
    if (MUSIC) {
      var muC = "";
      try { muC = typeof MUSIC.credit === "function" ? String(MUSIC.credit() || "") : ""; } catch (e) { muC = ""; }
      h += '<section class="nb-sec nb-music"><h3>The music</h3>' +
        "<p>In the background you hear slow music by <b>Antonio Vivaldi</b> (1678 to 1741), a priest in Venice who wrote about 500 concertos. In between come gentle pieces linked to the stories about <b>Sherlock Holmes</b>, the detective made up by Arthur Conan Doyle. Holmes plays the violin, and these pieces are played on a violin too.</p>" +
        "<p>When the Inspector takes out his own violin, he plays a fast Caprice by <b>Niccolò Paganini</b> (1782 to 1840), the Italian violin star. In “The Cardboard Box,” Holmes tells Watson story after story about Paganini.</p>" +
        "<p>The game plays each piece note by note, using recordings of a real violin, viola and cello. While a piece plays, you can read about it below. Tap <b>Next piece</b> to hear a different one.</p>" +
        '<p class="mu-now"><svg class="ic" aria-hidden="true"><use href="#i-music"></use></svg><span id="muTitle"></span></p>' +
        '<p class="mu-about" id="muAbout" hidden></p>' +
        '<p class="mu-row"><button type="button" class="btn sm mu-btn" id="muToggle" data-action="music" aria-pressed="true">Music: on</button>' +
        '<button type="button" class="btn sm mu-btn" id="muNext" data-action="music-next">Next piece</button></p>' +
        '<p class="mu-credit">' + (muC ? esc(muC) + " " : "") + '<a href="music/credits.html#from-game" target="_blank" rel="noopener">More about the music</a></p></section>';
    }
    /* last, after the music block: where the material comes from, for parents (its own tab) */
    h += '<section class="nb-sec nb-end span"><p class="nb-src"><a class="tlink" href="sources.html#from-game" target="_blank" rel="noopener">Sources for parents</a><span>The book and the school plan these files follow.</span></p></section>';
    nbPages.innerHTML = h;
    nbPages.setAttribute("tabindex", "0");
    nbPages.setAttribute("aria-label", "Notebook pages");
    nbDecl.chart = homeChart(); nbDecl.model = 0; nbDecl.shown = ""; nbDecl.chips = "";
    declShow();
    syncMusic();
  }
  function setInert(on) {
    try {
      if (on) { app.setAttribute("aria-hidden", "true"); app.inert = true; } else { app.removeAttribute("aria-hidden"); app.inert = false; }
    } catch (e) { /* ignore */ }
  }
  function openNotebook() {
    if (nbOpen || cfOpen || !player || nbBtn.hidden) { return; }
    nbOpen = true;
    violinOff();
    lastFocus = document.activeElement;
    hideGloss();
    nbDecl.chart = homeChart(); nbDecl.model = 0; nbDecl.adj = false; nbDecl.test = false; nbDecl.open = {};
    declShow();
    var noun = nounsReset();
    nb.classList.add("open");
    nb.setAttribute("aria-hidden", "false");
    nbScrim.hidden = false;
    setInert(true);
    nbPages.scrollTop = 0;
    /* in a round of the noun drill the Notebook opens at the noun on the desk (a keyboard starts there too) */
    if (noun) { nbPages.scrollTop = Math.max(0, Math.round(noun.getBoundingClientRect().top - nbPages.getBoundingClientRect().top) - 64); }
    try { (noun && kb ? noun : nbClose).focus({ preventScroll: true }); } catch (e) { /* ignore */ }
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
  /* kind "reset" (Reset progress on the home screen) or "remove" (a player, from Manage players: players.js
     gives the words and hears the answer, done(true) or done(false)) */
  var cfKind = "reset", cfDone = null;
  function openConfirm(kind, words, done) {
    if (cfOpen || nbOpen) { if (done) { done(false); } return; }
    cfKind = kind === "remove" && words ? "remove" : "reset";
    cfDone = cfKind === "remove" && done ? done : null;
    var w = cfKind === "remove" ? words : CF_RESET;
    if (cfTitle) { cfTitle.textContent = w.title; }
    if (cfText) { cfText.textContent = w.text; }
    cfNo.textContent = w.no;
    cfYes.textContent = w.yes;
    cfOpen = true;
    violinOff();
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
    var d = cfDone;
    cfDone = null;
    if (d) { d(false); }
  }
  nbClose.addEventListener("click", function () { Sfx.play("tap"); closeNotebook(); });
  nbScrim.addEventListener("click", closeNotebook);
  cfScrim.addEventListener("click", closeConfirm);
  cfNo.addEventListener("click", function () { Sfx.play("tap"); closeConfirm(); });
  cfYes.addEventListener("click", function () {
    if (cfKind === "remove") {
      var d = cfDone;
      cfDone = null;
      closeConfirm();
      Sfx.play("ruleout");
      if (d) { d(true); }
      return;
    }
    if (player) { prog[player.id] = { stars: {}, solo: {}, seen: {} }; usePlayer(player); }
    persist(undefined, true);
    paused = null; R = null; greeted = false;
    closeConfirm();
    Sfx.play("ruleout");
    home();
  });
  /* keep Tab inside an open dialog */
  function trapTab(e, box) {
    /* (a control that is not on show, like the switch a masculine noun has no use for, is no stop) */
    var list = Array.prototype.filter.call(box.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]'), function (n) { return n.getClientRects().length > 0; });
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
  /* The way to the next rank: the stars from the player's rank to the next one (3 to 12 of them), those
     already won lit. At the top rank, and in the gold box of a promotion (done), the stretch that led to the
     rank, all lit. (--n, the stars of the row: a row that does not wrap shares the width by them, so that on
     a narrow phone they all shrink alike instead of pushing the page wide.) */
  function rankWay(total, done) {
    var r = rankFor(total), from, to;
    if (done || !r.next) { to = RANKS[r.index].min; from = r.index ? RANKS[r.index - 1].min : to; return { n: to - from, lit: to - from }; }
    from = RANKS[r.index].min; to = r.next.min;
    return { n: to - from, lit: Math.max(0, Math.min(to - from, total - from)) };
  }
  function rankRowHtml(total, done) {
    var w = rankWay(total, done), h = '<div class="rank-row' + (w.n > 15 ? " many" : "") + '" aria-hidden="true"><span class="rk-g" style="--n:' + w.n + '">';
    for (var i = 0; i < w.n; i++) { h += '<svg viewBox="0 0 24 24"' + (i < w.lit ? ' class="on" style="--i:' + i + '"' : "") + ' focusable="false"><use href="#i-star"></use></svg>'; }
    return h + "</span></div>";
  }
  /* What he says on a player's home. A casebook of the four files of chapter 2 alone (the game without
     the noun drill) keeps the lines of data.js, word for word: they say "Four case files" and "of 12
     stars". Any other casebook has the lines of courses.js, which count its own files and stars. */
  function homeLines(kind, map) {
    var H = CL.home || {}, only2 = BOOK.units.length === 1 && BOOK.units[0].builtIn && FILES.length === D.files.length;
    var src = kind === "first" ? (only2 ? L.homeFirst : H.first || L.homeFirst) : kind === "done" ? (only2 ? L.homeDone : H.done || L.homeDone) : (only2 ? L.homeBack : H.back || L.homeBack);
    return src.map(function (s) { return fill(s, map); });
  }
  function chapterHead(u) {
    var here = u.chapter === player.chapter;
    /* (the heading is a flex row: the spaces between its parts are for a screen reader) */
    return '<h3 class="ch-h" id="ch-' + u.chapter + '"><b>Chapter ' + u.chapter + "</b>" + (u.title ? ' <span class="ch-t">' + rich(u.title) + "</span>" : "") + (here ? ' <em class="ch-here">Your class is here</em>' : "") + "</h3>";
  }
  function folderHtml(f, nf, first, done, left) {
    var s = save.stars[f.id] || 0, solo = !!save.solo[f.id];
    var isPaused = !!(paused && paused.file.id === f.id);
    var isNext = paused ? isPaused : (f === nf && (!done || left > 0));
    var closed = s >= 2;
    var go = isPaused ? "Resume" : (s ? "Replay" : "Open");
    var flag = isNext ? (isPaused ? "In progress" : (first ? "Start here" : (done ? "Win the ribbon" : "Next up"))) : "";
    var tab = fileName(f, true), label = tab + ": " + f.title + ". " + s + " of 3 stars." + (closed ? " Case closed." : "") + (solo ? " " + L.solo : "") + (isPaused ? " In progress." : (isNext ? " " + flag + "." : ""));
    return '<li><button type="button" class="folder' + (isNext ? " next" : "") + (closed ? " closed" : "") + '" data-file="' + esc(f.id) + '" aria-label="' + esc(label) + '">' +
      /* (the tab's chapter gives way to the bookmark ribbon on a narrow folder: the chapter's heading, or the
         class line of a casebook of one chapter, says it there) */
      '<span class="f-tab"><span class="f-ch">Ch. ' + fileChapter(f) + " · </span>File " + f.n + '</span><span class="f-title">' + txt(f.title) + '</span><span class="f-blurb">' + txt(f.blurb) + "</span>" +
      '<span class="f-foot">' + starsHtml(s) + (closed && !isNext ? '<span class="f-stamp">' + esc(L.stamp.closed) + "</span>" : '<span class="f-go">' + go + "</span>") + "</span>" +
      (solo ? '<svg class="f-ribbon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-ribbon"></use></svg>' : "") +
      (flag ? '<span class="f-flag">' + flag + "</span>" : "") + "</button></li>";
  }
  function home() {
    if (!player) { choosePlayers(); return; }
    /* (the grade or the chapter changed in another tab: the casebook opens again first) */
    if (stale && !busy) { var moved = LP.get(player.id); if (moved) { startPlayer(moved, true); return; } }
    B = null; T = null;
    syncLogo();
    var v = el("div", "view v-home"), h = "", any = FILES.length > 0;
    var total = totalStars(), max = maxStars(), won = allStars(), rank = rankFor(won), nf = any ? nextFile() : null, done = any && total >= max;
    var first = !hasProgress(), left = ribbonsLeft();
    var toNext = rank.next ? rank.next.min - won : 0, many = rankWay(won).n > 15;
    /* (the line under the rank: the stars to the next rank; with every star of the casebook won, the no-clue
       ribbons still to win come first, as they are what can be won now; with every ribbon won as well, the line
       says where the next stars come from: "9 more stars to Chief Inspector in the chapters to come"; at the top
       rank, the ribbons) */
    var ribbonsLine = left === 1 ? "One no-clue ribbon still to win." : left + " no-clue ribbons still to win.";
    var nextLine = rank.next ? (done && left ? ribbonsLine : toNext + (toNext === 1 ? " more star" : " more stars") + " to " + esc(rank.next.title) + (done ? " in the chapters to come" : "")) : (left ? "Top rank. " + ribbonsLine : "Top rank. Every file solved without a clue.");
    /* (on the games site "Switch player" and "Change" lead to the home page, where the players are chosen) */
    h += '<h1 class="sr">Case Detective</h1><div class="cb-head"><p class="cb-who">' + LP.badge(player, "sm") + '<span class="cb-name">' + esc(whose(player.name)) + " case files</span>" +
      (atHome ? '<a class="tlink cb-switch" href="' + esc(homeUrl("players")) + '" data-home="players">Switch player</a></p>' : '<button type="button" class="tlink cb-switch" data-action="players">Switch player</button></p>') +
      '<p class="cb-class"><span class="cb-line">' + esc(LP.gradeLine(player, true)) + "</span>" +
      (atHome ? '<a class="tlink cb-change" href="' + esc(homeUrl("chapter")) + '" data-home="chapter">' : '<button type="button" class="tlink cb-change" data-action="chapter">') +
      'Change<span class="sr"> your chapter</span>' + (atHome ? "</a>" : "</button>") + "</p></div>";
    if (BOOK.failed.length) {
      h += '<p class="cb-fail" role="status">The case files of ' + (BOOK.failed.length > 1 ? "chapters " : "chapter ") + BOOK.failed.join(" and ") + " could not be opened. Reload the page to try again.</p>";
    }
    if (any) {
      h += '<section class="rank' + (many ? " many" : "") + '" aria-label="Your rank">' + '<svg class="rank-badge" viewBox="0 0 48 52" aria-hidden="true" focusable="false"><use href="#i-badge"></use></svg>' +
        '<div class="rank-txt"><b class="rank-title">' + esc(rank.title) + '</b><span class="rank-next">' + nextLine + "</span></div>" +
        '<div class="rank-count" role="img" aria-label="' + total + " of " + max + ' stars"><b>' + total + "</b><span>/" + max + "</span></div>";
      h += rankRowHtml(won) + "</section>";
    }
    h += '<h2 class="sr">Case files</h2>';
    /* the files chapter by chapter: the class's own chapter first, then the earlier chapters of the course,
       the most recent first (chapter 5: 5, 4, 3, 2). Nothing is folded away, and the main button still opens
       the next file in book order. A casebook of the class's own chapter alone has one group: its heading
       is there for a screen reader, and the eye has the class line and the tabs ("Ch. 2 · File 1"). */
    var groups = BOOK.units.filter(function (u) { return FILES.some(function (f) { return fileChapter(f) === u.chapter; }); })
      .sort(function (a, b) { return (b.chapter === player.chapter) - (a.chapter === player.chapter) || b.chapter - a.chapter; });
    var classGroup = null;
    groups.forEach(function (u) { if (u.chapter === player.chapter) { classGroup = u; } });
    var classUnit = !!classGroup;
    var solo = groups.length === 1 && classUnit && !BOOK.ahead;
    /* The class's chapter has no case files yet: a note says so. With the noun drill the chapter still has
       its "Every noun" file, and the note names it. A course with no case files at all yet (a class still on
       an earlier chapter, one of Latin IB) has the drill files alone, and the note says that. (A chapter whose
       files could not be opened has files: the line above says so. So has a course whose unit files could not
       be opened: its "Every noun" files alone are no sign that it has no case files.) */
    var drillOnly = any && !FILES.some(function (f) { return !f.nounDrill; });
    if (!BOOK.ahead && any && BOOK.failed.indexOf(player.chapter) < 0) {
      if (drillOnly && !BOOK.failed.length && BOOK.course && BOOK.course.course) {
        h += '<p class="ch-note cb-none">' + esc(BOOK.course.course) + " has no case files yet. For now, each of its chapters has an “" + txt(FILES[0].title) + "” file.</p>";
      }
      else if (!classUnit) { h += '<p class="ch-note cb-none">Chapter ' + player.chapter + " has no case files yet. These are the chapters before it.</p>"; }
      else if (classGroup.drill) {
        h += '<p class="ch-note cb-none">Chapter ' + player.chapter + " has only its “" + txt(classGroup.files[0].title) + "” file so far." + (groups.length > 1 ? " The other files are from the chapters before it." : "") + "</p>";
      }
    }
    groups.forEach(function (u) {
      var list = FILES.filter(function (f) { return fileChapter(f) === u.chapter; });
      h += '<section class="cb-ch' + (u.chapter === player.chapter ? " here" : "") + (solo ? " solo" : "") + '" aria-labelledby="ch-' + u.chapter + '">' + chapterHead(u) +
        (BOOK.ahead === u.chapter ? '<p class="ch-note">Your class meets this in chapter ' + u.chapter + ".</p>" : "") + '<ul class="files' + (list.length === 5 ? " n5" : "") + '">';
      list.forEach(function (f) { h += folderHtml(f, nf, first, done, left); });
      h += "</ul></section>";
    });
    if (BOOK.locked.length) {
      h += '<section class="cb-locked" aria-labelledby="ch-later"><h3 class="ch-h" id="ch-later"><b>Later chapters</b></h3><ul class="lk-list">';
      BOOK.locked.forEach(function (e) {
        var short = chapterInfo(e.chapter).short;
        h += '<li class="lk">' + icon("files", "ic lk-ic") + "<b>Chapter " + e.chapter + "</b> · " + (short ? '<span class="lk-t">' + rich(short) + "</span> · " : "") + '<span class="lk-n">Opens at chapter ' + e.chapter + " (change your chapter at the top)</span></li>";
      });
      h += "</ul></section>";
    }
    if (any) {
      var target = paused ? paused.file : nf;
      var verb = paused ? "Resume" : (first ? "Open" : (done ? "Replay" : "Continue:"));
      h += '<div class="dock"><button type="button" class="btn primary" data-primary data-open="' + esc(target.id) + '"><span>' + verb + " " + esc(fileName(target)) + "<small>" + txt(target.title) + "</small></span>" + icon("next") + "</button></div>";
    }
    /* the foot: the way to the other games (on the games site only) and the reset, with the sources page
       between them in the same row. Where the players are chosen on the home page, this is the link for
       parents that "Who's on the case?" has elsewhere (the same page): in one row, the casebook still fits a
       laptop screen of 768 px. */
    var site = siteHome();
    h += '<div class="home-end"><p class="home-foot">' + (site ? '<a class="tlink" href="' + site + '">More language games</a>' : "<span></span>") +
      (any ? '<button type="button" class="tlink" data-action="reset">Reset progress</button>' : "<span></span>") + "</p>" +
      '<p class="home-src"><a class="tlink" href="sources.html#from-game" target="_blank" rel="noopener">Sources for parents</a></p></div>';
    v.innerHTML = h;
    setView("home", v);
    setMid("");

    var lines, moods;
    /* (a casebook of "Every noun" files alone counts them by their name: it has no case files, as its note says) */
    var kindOf = drillOnly ? "“" + esc(FILES[0].title) + "” file" : "case file";
    var map = { stars: total, max: max, count: countWord(FILES.length), files: FILES.length === 1 ? kindOf + " is" : kindOf + "s are", theFirst: FILES.length === 1 ? "it" : "the first", nextN: nf ? nf.n : "", nextCh: nf ? fileChapter(nf) : "", nextTitle: nf ? nf.title : "", rank: rank.title };
    if (!any) { var fl = CL.home && CL.home.failed; lines = [fill((Array.isArray(fl) ? fl[0] : fl) || "I cannot open these case files right now. Reload the page to try again.", { chapters: BOOK.failed.join(" and ") })]; moods = ["think"]; }
    else if (first) { lines = homeLines("first", map); moods = ["!wave", "point"]; }
    else if (done) { lines = homeLines("done", map); moods = ["!cheer", "proud"]; }
    else { lines = homeLines("back", map); moods = ["!wave", "point"]; }
    /* his first line may come from the way here (the home page, or the stars of 2.1): it takes the place of
       his hello, where the lines begin with one. Otherwise he says hello once, and on later visits to his desk
       he goes straight to what is next. */
    var said = lead ? leadLine(lead) : null;
    lead = "";
    if (said) {
      var hello = any && !done;
      lines = [said.line].concat(hello ? lines.slice(1) : lines);
      moods = [said.mood].concat(hello ? moods.slice(1) : moods);
    } else if (greeted && lines.length > 1) { lines = lines.slice(-1); moods = moods.slice(-1); }
    greeted = true;
    var nextEl = v.querySelector(".folder.next");
    runSequence(lines, moods, function (n) { if (n === lines.length - 1 && nextEl) { lookAtNode(nextEl, 2000); } });
    reserveStage(lines.map(function (s) { return [{ html: s }]; }), lines.length > 1 ? { dots: [0, lines.length] } : null);
  }
  /* His first line on the casebook by the way the player came: back from the games' home page (added: a new
     player; chapter: the chapter changed; picked: a player chosen), or from the question about the stars of
     2.1 (yes, no). The words are courses.js's (lines.arrive, lines.claim). A new player he has just met on
     “Who’s on the case?”, where he introduced himself (LatinPlayers.met), has the line “met”: he does not
     introduce himself twice in a row. */
  var claimedN = 0;
  function starsWord(n) { return n + (n === 1 ? " star" : " stars"); }
  function metNow(p) { return !!p && typeof LP.met === "function" && arr((CL.arrive || {}).met).length > 0 && LP.met(p.id); }
  function leadLine(kind) {
    if (kind === "added" && metNow(player)) { kind = "met"; }
    var A = CL.arrive || {}, C = CL.claim || {}, src = kind === "yes" || kind === "no" ? C[kind] : A[kind];
    var s = Array.isArray(src) ? src[0] : src;
    if (!s || !player) { return null; }
    return { line: fill(s, { name: esc(player.name), chapter: player.chapter, stars: starsWord(claimedN) }), mood: kind === "yes" ? "proud" : (kind === "no" ? "point" : "!wave") };
  }

  /* ------------------------------------------------------ the stars of 2.1
     A save of version 2.1 has stars but no player. Where the players are chosen on the games' home page,
     the Inspector asks each player once, before the casebook: were these stars yours? Yes: they join the
     player's progress (the better stars of each file, its ribbon, what was seen) and the old save is gone.
     No: they wait for another player, and this one is not asked again. They are never dropped before
     someone takes them (see persist). */
  function claimFor(p) {
    if (!askOld || !p) { return false; }
    var cur = readSave(), was = progressIn(cur) ? oldIn(cur) : old;
    if (progressIn(cur)) { old = was; asked = was ? askedIn(cur) : []; }
    return !!old && asked.indexOf(p.id) < 0;
  }
  function claim() {
    var n = starsIn(old), words = starsWord(n);
    var v = el("div", "view v-claim");
    v.innerHTML = '<h1 class="sr">Case Detective</h1><section class="claim" aria-labelledby="clH"><h2 class="cl-h" id="clH" tabindex="-1">Stars from before</h2>' +
      '<p class="cl-n" aria-hidden="true">' + icon("star", "ic") + "<b>" + n + "</b></p>" +
      '<p class="cl-t">Before players had names, someone on this device won ' + words + " in Case Detective. Was it you, " + esc(player.name) + "?</p>" +
      '<p class="cl-note">' + (n === 1 ? "If not, the star stays here for the right detective." : "If not, the stars stay here for the right detective.") + "</p>" +
      '<div class="cl-btns"><button type="button" class="btn primary" data-action="claim-yes">Yes, it was me</button><button type="button" class="btn cl-no" data-action="claim-no">No, it wasn\u2019t me</button></div></section>';
    setView("claim", v);
    setMid("");
    if (kb) { try { v.querySelector(".cl-h").focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    var A = leadLine(lead), C = CL.claim || {}, ask = Array.isArray(C.ask) ? C.ask[0] : C.ask;
    lead = "";
    var lines = (A ? [A.line] : []).concat([fill(ask || "Before players had names, someone on this device won {stars} in Case Detective. Was it you, <b>{name}</b>?", { name: esc(player.name), stars: words })]);
    var moods = (A ? [A.mood] : []).concat(["think"]);
    greeted = true;
    runSequence(lines, moods, null);
    reserveStage(lines.map(function (s) { return [{ html: s }]; }), lines.length > 1 ? { dots: [0, lines.length] } : null);
  }
  function claimYes() {
    var cur = readSave(), was = progressIn(cur) ? oldIn(cur) : old;
    if (!player || !was) { home(); return; }
    var mine = progressOf(player.id), k;
    for (k in was.stars) { if (own(was.stars, k) && (mine.stars[k] || 0) < was.stars[k]) { mine.stars[k] = was.stars[k]; } }
    for (k in was.solo) { if (own(was.solo, k) && mine.stars[k] === 3) { mine.solo[k] = true; } }
    for (k in was.seen) { if (own(was.seen, k)) { mine.seen[k] = true; } }
    claimedN = starsIn(was);
    usePlayer(player);
    persist(null);
    lead = "yes";
    home();
  }
  function claimNo() {
    var cur = readSave(), was = progressIn(cur) ? oldIn(cur) : old, who = progressIn(cur) ? askedIn(cur) : asked;
    claimedN = starsIn(was);
    if (player && was) { persist({ old: was, asked: who.indexOf(player.id) < 0 ? who.concat([player.id]) : who }); }
    /* (his line only while the stars are still here: another tab may have just given them away) */
    lead = was ? "no" : "";
    home();
  }

  function goHome() {
    if (!player) { choosePlayers(); return; }
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

  /* --------------------------------------------------- the games' home page
     On the games site (and on a copy of it, on disk or on this computer: the hosts of onGamesSite) the
     players are chosen on the site's home page, ../index.html, once for every game. There this game does not
     show "Who's on the case?": it opens for the player chosen there (LatinPlayers.current()); with nobody
     chosen it goes to the home page (?play=case-detective#players), which comes back here after the pick
     with #added, #chapter or #picked. The player chip, "Switch player" and "Change" lead there too.
     Where the list of players cannot be stored (a sandboxed frame, a preview: LatinPlayers keeps it in memory
     for the visit) or on another host, the game keeps its own screens for the players, as before. */
  var HOME_PAGE = "../index.html", FOLDER = "case-detective";
  function canStore() {
    try { var k = "latinGames.probe"; window.localStorage.setItem(k, "1"); window.localStorage.removeItem(k); return true; } catch (e) { return false; }
  }
  var atHome = onGamesSite(siteHost()) && canStore();
  function homeUrl(screen) { return HOME_PAGE + "?play=" + FOLDER + "#" + screen; }
  /* (replace, not push: the home page comes back here the same way, so a round trip leaves one entry for
     the game in the history) */
  function toHomePage(screen) {
    try { window.location.replace(homeUrl(screen || "players")); } catch (e) { atHome = false; app.style.visibility = ""; ui.players(); }
  }
  /* back from the home page: what was done there, for his first line (the hash goes at once: a reload is a
     plain visit) */
  var arrivedAt = now();
  var arrived = (function () {
    var m = null;
    try { m = /^#(added|chapter|picked)$/.exec(window.location.hash || ""); } catch (e) { m = null; }
    if (!m) { return ""; }
    try { window.history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e2) { /* ignore */ }
    return m[1];
  })();
  /* the players' screens of this game, or the home page */
  function choosePlayers() { if (atHome) { toHomePage("players"); } else { ui.players(); } }
  /* Back from the home page, where a player was just chosen, and nobody is chosen here: the list reaches a new
     page through the browser's storage, which can come a moment late after the page that wrote it. It is
     waited for (onPlayers). If it does not come (this page was given other storage than the home page, as a
     browser can do with pages on disk), the game plays with its own screens for this visit, rather than send
     the child back and forth. The stars of 2.1 still wait for the question (the list is stored here). */
  var waiting = 0;
  function waitForPick() {
    app.style.visibility = "hidden";
    waiting = setTimeout(function () {
      waiting = 0;
      atHome = false;
      ownChip();
      app.style.visibility = "";
      ui.players();
    }, 2500);
  }
  /* where the game keeps its own screens for the players, the chip is a button that opens them */
  function ownChip() {
    if (!chip || chip.tagName !== "A") { return; }
    var b = document.createElement("button");
    b.type = "button";
    b.className = chip.className;
    b.id = chip.id;
    b.title = chip.title;
    b.hidden = chip.hidden;
    b.setAttribute("data-action", "players");
    chip.parentNode.replaceChild(b, chip);
    chip = b;
  }

  /* ------------------------------------------------------------ players
     The screens that choose and set up a player are the site's (js/players.js): this game is their host
     where it keeps them (see above). It shows them on the desk, lets the Inspector say their lines, counts
     each player's stars, marks the chapters that have case files, and opens a player's casebook when a
     player is picked. */
  var busy = false;   /* a casebook is being opened (its unit files are loading) */
  var lead = "";      /* his first line on the casebook: how the player came (see leadLine) */
  function startPlayer(p, keepGreeting) {
    if (!p || busy) { return; }
    LP.choose(p.id);
    usePlayer(p);
    stale = false;
    persist();
    paused = null; R = null;
    if (!keepGreeting) { greeted = false; }
    app.style.visibility = "";
    syncLogo();
    busy = true;
    var b = desk.querySelector("[data-primary]");
    if (b) { b.disabled = true; }
    openCasebook(p, function () {
      busy = false;
      /* (another tab chose someone else meanwhile) */
      var cur = atHome ? LP.current() : null;
      if (atHome && cur && cur.id !== p.id) { startPlayer(cur); return; }
      if (claimFor(p)) { claim(); } else { home(); }
    });
  }
  /* his lines on those screens: courses.js (with the line of data.js where it has none) */
  function playerLines() {
    var o = {}, k;
    for (k in CL) { if (own(CL, k)) { o[k] = CL[k]; } }
    ["playersFirst", "playersBack"].forEach(function (key) { if (!arr(o[key]).length) { o[key] = [L.homeFirst[0]]; } });
    return o;
  }
  var ui = LP.screens({
    show: function (node, kind) {
      if (kind === "players") { usePlayer(null); paused = null; R = null; B = null; T = null; syncLogo(); }
      else if (kind === "manage") { usePlayer(null); syncLogo(); }
      setView(kind === "setup" ? "setup" : "players", node);
      setMid("");
    },
    say: function (lines, first, o) {
      runSequence(lines, o && o.moods ? o.moods : [first], null);
      reserveStage(lines.map(function (s) { return [{ html: s }]; }), lines.length > 1 ? { dots: [0, lines.length] } : null);
    },
    picked: function (p, how) {
      if (how === "back") { home(); return; }
      /* (the first player of the device: he introduced himself on “Who’s on the case?” a moment ago) */
      if (how === "added" && metNow(p)) { lead = "met"; }
      startPlayer(p, how === "chapter");
    },
    starsOf: function (p) { return starsWon(p.id); },
    /* (every chapter a player of the grade may choose that has case files: the grade's own, and those of the
       courses before it, for a class still on an earlier chapter) */
    filesIn: function (g) { var o = {}; arr(C.units).forEach(function (u) { if (u && inGrade(+g, +u.chapter)) { o[+u.chapter] = true; } }); return o; },
    sourcesHref: "sources.html#from-game",
    icon: function (name, cls) { return icon(name, cls); },
    confirm: function (words, done) { openConfirm("remove", words, done); },
    tap: function () { Sfx.play("tap"); },
    lines: playerLines()
  });
  /* A change to the list of players or to the switches of the device, made on this page or in another tab:
     the switches follow; the progress of a removed player goes; a player on the case who was removed
     elsewhere is gone from here too, and one whose grade or chapter changed gets the casebook again.
     Where the players are chosen on the home page, this page follows the choice made in another tab: with
     nobody chosen any more it goes to the home page; with someone else chosen it opens their casebook. */
  function onPlayers(ev) {
    var st = LP.settings();
    if (st.sound !== save.sound) { save.sound = st.sound; try { Sfx.setMuted(!save.sound); } catch (e) { /* ignore */ } tidySave(); syncSound(); }
    if (st.music !== save.music) { save.music = st.music; if (MUSIC) { try { MUSIC.setEnabled(save.music); } catch (e2) { /* ignore */ } } syncMusic(); }
    prune();
    if (atHome && waiting) {
      var picked = LP.current();
      if (picked) { clearTimeout(waiting); waiting = 0; lead = arrived; startPlayer(picked); }
      return;
    }
    if (atHome && ev && ev.remote && !busy) {
      var cur = LP.current();
      if (!cur || !player || cur.id !== player.id) {
        if (cfOpen) { closeConfirm(); }
        if (nbOpen) { closeNotebook(); }
        /* (just back from the home page, this page read the list a moment before the choice made there: the
           player chosen there gets the first line meant for them) */
        if (cur) { if (arrived && now() - arrivedAt < 4000) { lead = arrived; } startPlayer(cur); }
        else { app.style.visibility = "hidden"; toHomePage("players"); }
        return;
      }
    }
    if (!player) { return; }
    var p = LP.get(player.id);
    if (!p) {
      if (cfOpen) { closeConfirm(); }
      if (nbOpen) { closeNotebook(); }
      choosePlayers();
      return;
    }
    if (p.grade !== player.grade || p.chapter !== player.chapter) {
      stale = true;
      if (view === "home" && !busy) { startPlayer(p, true); }
      return;
    }
    if (p.name !== player.name || p.color !== player.color) {
      player.name = p.name;
      player.color = p.color;
      syncChip();
      if (view === "home" && !busy) { home(); }
    }
  }
  /* another tab wrote this game's progress: the other players' stars as it has them (the stars on their cards),
     and the player on the case as it is stored now. On the games site every tab follows the player chosen
     last, so another tab may play the same player: a star won there counts here too (and stays: see persist),
     and a "Reset progress" made there holds here as well. A casebook on show counts them again. */
  function progKey(p) {
    return ["stars", "solo", "seen"].map(function (n) { return Object.keys(p[n]).sort().map(function (k) { return k + "=" + p[n][k]; }).join(","); }).join("|");
  }
  function onProgress() {
    var o = readSave(), pr = progressIn(o);
    if (!pr) { return; }
    LP.list().forEach(function (p) { if (!(player && player.id === p.id) && own(pr, p.id)) { prog[p.id] = cleanProgress(pr[p.id]); } });
    if (player && view !== "claim" && own(pr, player.id)) {
      var had = progKey(progressOf(player.id));
      prog[player.id] = cleanProgress(pr[player.id]);
      usePlayer(player);
      if (progKey(prog[player.id]) !== had && view === "home" && !busy && !cfOpen && !nbOpen) { home(); }
    }
    /* the stars of 2.1 were settled in another tab while this one asks about them: the player's progress as it
       is stored now (with those stars, if this player took them there), and the casebook */
    if (view === "claim" && player && (!oldIn(o) || askedIn(o).indexOf(player.id) >= 0)) {
      if (own(pr, player.id)) { prog[player.id] = cleanProgress(pr[player.id]); usePlayer(player); }
      home();
    }
  }
  /* ?grade=G[&chapter=N] goes straight to a player's case files (tests, links): the first player of grade
     G (the chapter set to N, if given), or a new player "Player" of grade G when there is none. A grade
     that cannot be played yet, or a chapter that is not one of the grade's (1 to its last chapter:
     ?grade=8&chapter=5 is an 8th grader whose class is still on chapter 5), is left out. */
  function urlParams() {
    var out = {};
    String(location.search || "").replace(/^\?/, "").split("&").forEach(function (kv) {
      if (!kv) { return; }
      var i = kv.indexOf("="), k = i < 0 ? kv : kv.slice(0, i), val = i < 0 ? "" : kv.slice(i + 1);
      try { k = decodeURIComponent(k); val = decodeURIComponent(val.replace(/\+/g, " ")); } catch (e) { return; }
      if (k && !own(out, k)) { out[k] = val; }
    });
    return out;
  }
  var URLQ = urlParams();
  /* (a link that names a grade starts the game as before: the stars of 2.1 become "Player 1" there too) */
  var linked = own(URLQ, "grade") && canPlay(+URLQ.grade);
  var askOld = atHome && !linked;
  function playerFromUrl() {
    var g = +URLQ.grade, ch = +URLQ.chapter, p = null;
    if (!own(URLQ, "grade") || !canPlay(g)) { return null; }
    /* (the first one added: ids are numbered in that order) */
    LP.list().sort(function (a, b) { return +a.id.slice(1) - +b.id.slice(1); }).some(function (x) { if (x.grade === g) { p = x; return true; } return false; });
    if (!p) { return LP.add({ name: "Player", grade: g, chapter: inGrade(g, ch) ? ch : monthChapter(g) }); }
    if (own(URLQ, "chapter") && inGrade(g, ch) && p.chapter !== ch) { p = LP.update(p.id, { chapter: ch }) || p; }
    return p;
  }

  /* ----------------------------------------------------------- briefing */
  /* A plain line may name a Latin word of the word list ("Also after sine."): it is printed as Latin,
     like everywhere else. Only a whole word that is a headword of the list of the file's own chapter,
     letter for letter, and never one that is also a short English word ("in", "is"). */
  var LATIN = null, NOT_LATIN = { a: 1, an: 1, at: 1, "do": 1, "in": 1, is: 1, it: 1, me: 1, no: 1, us: 1 };
  function latinText(s, file) {
    var u = fileUnit(file), ch = u ? u.chapter : 0;
    if (!LATIN) { LATIN = {}; }
    if (!LATIN[ch]) {
      var map = LATIN[ch] = {}, wl = u ? u.wordList : D.wordList;
      arr(wl && wl.groups).forEach(function (g) {
        arr(g && g.items).forEach(function (it) {
          /* the headword, and the second form of an entry that has two ("ā / ab (+abl.)": ab too). A word of
             one letter counts only with its macron (ā, ē; never the English "a"). */
          String(it && it.la).split(/[,(]/)[0].split("/").forEach(function (alt) {
            var w = alt.replace(/^\s+/, "").split(/\s/)[0];
            if (w && (w.length > 1 || /[^\x00-\x7f]/.test(w)) && !own(NOT_LATIN, w.toLowerCase())) { map[w] = true; }
          });
        });
      });
    }
    var latin = LATIN[ch];
    /* (never the letters of an ending: "-ā") */
    return keep(String(s === undefined || s === null ? "" : s).split(/([A-Za-zÀ-ſ]+)/).map(function (part, i, all) {
      return i % 2 && latin[part] === true && !/-$/.test(all[i - 1]) ? '<i lang="la">' + esc(part) + "</i>" : esc(part);
    }).join(""));
  }
  /* the chart of a file: the one a beat names (show: "chart", chart: id), or its chapter's first chart */
  function chartOfFile(f, id) {
    var i, u = fileUnit(f), want = id || (u && u.charts.length ? u.charts[0].id : "");
    for (i = 0; i < CHARTS.length; i++) { if (CHARTS[i].id === want) { return CHARTS[i]; } }
    return CHARTS[0] || null;
  }
  /* The word the three suspects share (file 3) is the file's own: the Latin word of the beat that lays
     the recap on the desk. (The chart's noun is the book's model noun, which is another word.) */
  function suspectWord(file) {
    var w = "", ch = chartOfFile(file);
    (file.briefing || []).forEach(function (b) {
      var m = !w && b.show === "recap" ? /<i>([^<]+)<\/i>/.exec(String(b.say || "")) : null;
      if (m) { w = m[1]; }
    });
    if (!w && ch && ch.sneaky) { w = splitForm(ch.models[0].forms.nom[0])[0] + ch.sneaky; }
    return w.charAt(0).toLowerCase() + w.slice(1);
  }
  /* the round picture of a case: a case has its own, a job the one of the case it belongs to */
  function keyPic(k) { var pk = caseOfKey(k); return pk ? pic("c-" + pk, "c-pic") : ""; }
  function recapHtml(file) {
    var rc = file.recap, h = "";
    if (!rc || !rc.items) { return ""; }
    if (rc.kind === "questions") {
      /* (a name of more than one word, "Ablative of place from which", makes the list "long": every chip of it
         has the same width and its name may wrap) */
      var long = rc.items.some(function (it) { var c = keyInfo(it.k); return /\s/.test(String(c ? c.name : it.k)); });
      h += '<h2 class="rc-h">The detective questions</h2><ul class="rc-list' + (long ? " long" : "") + '">';
      rc.items.forEach(function (it) {
        var c = keyInfo(it.k);
        h += '<li class="c-' + esc(it.k) + '">' + (c ? keyPic(it.k) : "") + '<span class="chip c-' + esc(it.k) + '">' + esc(c ? c.name : it.k) + "</span><span>" + latinText(it.text, file) + "</span></li>";
      });
      h += "</ul>";
    } else if (rc.kind === "endings") {
      /* More than two fingerprints (the "Every noun" file has one for each declension met) lie in short rows,
         one under the other. What every row would say again is said once: the case and number beside the
         heading, the hook under the rows. */
      var first = rc.items[0], rows = rc.items.length > 2;
      var oneChip = rows && rc.items.every(function (it) { return it.k === first.k && it.number === first.number; });
      var oneHook = rows && !!first.hook && rc.items.every(function (it) { return it.hook === first.hook; });
      var chipOf = function (it) { var c = keyInfo(it.k); return '<span class="chip c-' + esc(it.k) + '">' + esc((c ? c.name : it.k) + " " + it.number) + "</span>"; };
      h += '<h2 class="rc-h' + (oneChip ? " rc-hc" : "") + '">' + countWord(rc.items.length) + (rc.items.length === 1 ? " fingerprint" : " fingerprints") + (oneChip ? " " + chipOf(first) : "") +
        '</h2><div class="rc-ends' + (rows ? " rows" : "") + '">';
      rc.items.forEach(function (it) {
        h += '<div class="end-card c-' + esc(it.k) + '"><span class="end-big" lang="la">' + esc(it.ending) + "</span>" + (oneChip ? "" : chipOf(it)) +
          '<span class="end-ex"><i lang="la">' + esc(it.example) + "</i>" + txt(it.meaning) + "</span>" + (oneHook ? "" : '<span class="end-hook">' + txt(it.hook) + "</span>") + "</div>";
      });
      h += "</div>" + (oneHook ? '<p class="rc-all">' + txt(first.hook) + "</p>" : "");
    } else {
      h += '<h2 class="rc-h"><i lang="la">' + esc(suspectWord(file)) + "</i>: " + countWord(rc.items.length).toLowerCase() + (rc.items.length === 1 ? " suspect" : " suspects") + "</h2>" + '<div class="sus-row">';
      rc.items.forEach(function (it) {
        h += '<div class="sus c-' + esc(it.k) + '">' + portraitFor(it) + "<b>" + esc(it.label) + "</b><span>" + txt(it.meaning) + "</span><small>" + txt(it.text) + "</small></div>";
      });
      h += "</div>";
    }
    return h;
  }
  /* A briefing may teach with cards (file 1): the chart first (request 6), then one mini lesson per case,
     all of one build (request 5), and the recap at the end. The cards lie on one spot of the desk. */
  function chartCardHtml(file, id) {
    var chart = chartOfFile(file, id);
    if (!chart) { return ""; }
    return '<h2 class="rc-h">' + esc(chart.title) + "<small>" + declEntry(chart, chart.models[0]) + "</small></h2>" + chartTable(chart, {}).html;
  }
  function sameWords(a, b) {
    if (!a || !b || a.length !== b.length) { return false; }
    for (var i = 0; i < a.length; i++) { if (a[i].w !== b[i].w || (a[i].after || "") !== (b[i].after || "")) { return false; } }
    return true;
  }
  /* a model noun whose every form has the base of its nominative (porta, amīcus; not ager, agrī) */
  function regularModel(m) {
    var base = splitForm(m.forms.nom[0])[0];
    return ROW_KEYS.every(function (k) { return !own(m.forms, k) || (splitForm(m.forms[k][0])[0] === base && splitForm(m.forms[k][1])[0] === base); });
  }
  /* The row k of a chart for the noun of a lesson: the noun itself where it is one of the chart's nouns,
     else its dictionary form with the ending of a regular model noun swapped. "like" is the first noun of
     the chart with the same endings in that row (the model noun, wherever it can be). */
  function lessonForms(chart, k, w) {
    var lemma = String((w && w.lemma) || ""), i, m, got = null;
    if (!chart || !lemma) { return null; }
    for (i = 0; i < chart.models.length && !got; i++) {
      m = chart.models[i];
      if (m.word === lemma && own(m.forms, k)) { got = { sg: splitForm(m.forms[k][0]), pl: splitForm(m.forms[k][1]) }; }
    }
    for (i = 0; i < chart.models.length && !got; i++) {
      m = chart.models[i];
      var nom = splitForm(m.forms.nom[0])[1];
      if (!own(m.forms, k) || !nom || !regularModel(m) || lemma.length <= nom.length || lemma.slice(-nom.length) !== nom) { continue; }
      var stem = lemma.slice(0, -nom.length);
      got = { sg: [stem, splitForm(m.forms[k][0])[1]], pl: [stem, splitForm(m.forms[k][1])[1]] };
    }
    if (!got) { return null; }
    for (i = 0; i < chart.models.length; i++) {
      m = chart.models[i];
      if (own(m.forms, k) && splitForm(m.forms[k][0])[1] === got.sg[1] && splitForm(m.forms[k][1])[1] === got.pl[1]) { got.like = m; break; }
    }
    return got.like ? got : null;
  }
  /* The lesson of one case (or job): the case and its question, one Latin example in which only that
     case's word wears its label, what it says, and the case's row of the chart. A lesson whose sentence
     is already on the card keeps the card and moves the label: one sentence, several jobs.
     .ls-scene is the place of the picture of the sentence. It is open only where the fitted briefing
     still holds the strip (lessonSceneFit), and the picture is drawn when the lesson is on show. */
  function setLesson(ls) {
    var box = B.lessonEl, ck = colorKey(ls.k), c = ck ? keyInfo(ck) : null, keep = !!(B.lesson && sameWords(B.lesson.words, ls.words)), ti = -1, i;
    if (!box || !c || !ls.words) { return; }
    for (i = 0; i < ls.words.length; i++) { if (ls.words[i].t) { ti = i; } }
    if (!keep) {
      box.innerHTML = '<div class="ls-head"></div><div class="ls-strip"></div><p class="ls-tr"></p><div class="ls-scene" hidden></div><p class="ls-row"></p>';
      /* the strip is the game's own evidence scroll (a tap on a word shows its meaning); none of its words is a mystery */
      box.querySelector(".ls-strip").appendChild(buildScroll(ls.words.map(function (w) { var o = {}; for (var k in w) { if (k !== "t") { o[k] = w[k]; } } return o; }), false));
    }
    B.lesson = ls;
    var face = keyPic(ck);
    box.className = "bf-card bf-lesson c-" + ck + (box.classList.contains("wait") ? " wait" : "");
    var head = box.querySelector(".ls-head");
    head.className = "ls-head" + (face ? "" : " no-pic");
    head.innerHTML = face + '<span class="chip c-' + ck + '">' + esc(c.name) + "</span>" + (c.question ? '<b class="ls-q">' + esc(c.question) + "</b>" : "") + (c.job ? '<span class="ls-job">Job: ' + esc(c.job) + "</span>" : "");
    var units = box.querySelectorAll(".wu");
    for (i = 0; i < units.length; i++) {
      var b = units[i].querySelector(".w");
      units[i].classList[i === ti ? "add" : "remove"]("show");
      if (b) { b.classList[i === ti ? "add" : "remove"]("t"); }
    }
    box.querySelector(".ls-tr").innerHTML = ls.translation ? "“" + rich(ls.translation) + "”" : "";
    var holder = box.querySelector(".ls-scene");
    holder.hidden = !B.scnOn || !canScene(ls.words, ls.scene);
    holder.style.setProperty("--scn-ar", String(sceneRatio()));
    if (B.scnOn && B.lessonLive && !B.measuring) { lessonScene(holder, ls, ti); }
    /* The row of the chart for this case, on the lesson's own noun, and the form of the model noun it
       goes like: "Like portam in the chart:". Where that label costs the row a line more than the short
       one would, the short one stands. */
    var rk = caseOfKey(ck), row = box.querySelector(".ls-row"), tw = ti >= 0 ? ls.words[ti] : null;
    var made = rk ? lessonForms(chartOfFile(B.file), rk, tw) : null;
    function lsForm(parts) { return '<span class="ls-end" lang="la"><span aria-hidden="true">' + declForm(parts) + '</span><span class="sr">' + esc(parts[0] + parts[1]) + "</span></span>"; }
    if (made) {
      var forms = ' <span class="ls-forms">' + lsForm(made.sg) + " <small>(singular),</small> " + lsForm(made.pl) + " <small>(plural)</small></span>";
      var rowShort = '<span class="ls-row-h">Same endings as <i lang="la">' + esc(made.like.word) + "</i>:</span>" + forms;
      row.innerHTML = rowShort;
      var hShort = row.offsetHeight;
      row.innerHTML = '<span class="ls-row-h">Like <i lang="la">' + esc(formText(made.like.forms[rk][0])) + "</i> in the chart:</span>" + forms;
      if (hShort > 0 && row.offsetHeight > hShort + 2) { row.innerHTML = rowShort; }
    } else { row.innerHTML = ""; }
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
    /* The recap is on show and the page is too long: before anything more is asked of the briefing, the
       recap closes ranks and gives up its pictograms, so that its lines have the width (six lines since
       the ablative has one, and the sixth is long). */
    function rcStep() {
      if (pageOver() <= 0 || v.classList.contains("bf-rc") || !B.recap || B.recap.classList.contains("wait")) { return; }
      v.classList.add("bf-rc");
      applyReserve();
    }
    if (!B.cards) {
      /* A briefing without cards looks as it always did. Only where its recap would still run under the
         screen after he has made himself small, the cover goes, and then he and his type get smaller. */
      if (start) { v.classList.remove("bf-nocover"); v.classList.remove("bf-rc"); briefSmall(false); applyReserve(); }
      squeezeInspector(v.lastElementChild);
      if (pageOver() > 0 && !v.classList.contains("bf-nocover")) { v.classList.add("bf-nocover"); applyReserve(); }
      rcStep();
      if (pageOver() > 0) { briefSmall(true); applyReserve(); }
      return;
    }
    if (start) {
      BF_STEPS.forEach(function (c) { v.classList.remove(c); });
      v.classList.remove("bf-rc");
      briefSmall(false);
      B.scnOn = false;
      sizeLessons();
      applyReserve(true);
    }
    /* (a line that turns out too tall later: the picture goes before any step is taken for it) */
    if (B.scnOn && pageOver() > 0) { B.scnOn = false; dropLessonScene(); sizeLessons(); applyReserve(); }
    rcStep();
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
    var inCh = FILES.filter(function (f) { return fileChapter(f) === fileChapter(file); }).length, chartId = "";
    file.briefing.forEach(function (ln) { if (!chartId && ln.show === "chart" && typeof ln.chart === "string") { chartId = ln.chart; } });
    v.innerHTML = '<header class="bf-cover"><span class="f-tab">' + esc(fileName(file, true)) + " of " + inCh + '</span><h1 class="bf-title">' + txt(file.title) + '</h1><p class="bf-blurb">' + txt(file.blurb) + "</p>" +
      '<p class="bf-meta">' + (stamp ? '<span class="bf-stamp' + (s >= 2 ? "" : " still") + '">' + esc(stamp) + "</span>" : "<span>" + file.questions.length + " questions</span>") + starsHtml(s) + "</p></header>" +
      (cards ? '<div class="bf-cards"><section class="bf-card bf-chart wait">' + chartCardHtml(file, chartId) + '</section><section class="bf-card bf-lesson wait"></section>' : "") +
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
  function methodHtml(cls, file) {
    var m = '<ol class="method' + (cls ? " " + cls : "") + '" aria-label="The detective method">';
    methodOf(file).forEach(function (st, i) { m += "<li><b>" + (i + 1) + '</b><span class="m-t">' + txt(st.title) + '</span><span class="m-x">' + txt(st.text) + "</span></li>"; });
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
      var a = v.offsetHeight, m = el("div", "", methodHtml("full", T.file)).firstChild;
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
    if (box) { box.insertAdjacentHTML("afterend", methodHtml("full", T.file)); T.view.removeChild(box); }
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
    /* a round of the noun drill has ten questions of its own, drawn now (a practice round keeps the
       questions that were missed) */
    if (file.nounDrill && !only) { var drawn = drillRound(file); if (drawn) { file.questions = drawn; } }
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
    if (sentence) { v.insertAdjacentHTML("beforeend", methodHtml("", R.file)); }
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
    /* The labels under the words are not seen before the answer, but each has its place already. Where he
       and the spacing have given what they can, the long names of the jobs ("Ablative of personal agent")
       give their places to the short ones ("Abl. agent") and the sentence closes up, before anything that
       is on the screen goes. (After the answer the case note still writes the long name out.) */
    if (pageOver() > 0 && !v.classList.contains("lab-ab") && v.querySelector(".scroll .wl-a")) { v.classList.add("lab-ab"); layoutScroll(); applyReserve(); }
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
    /* Then a card that carries the long name of a job takes the short one ("Abl. agent" for "Ablative of
       personal agent": see buildAnswers), with a clue on the desk or without. The question under the name
       stays, a screen reader still gets the long name, and the case note writes it out after the answer
       (the cards keep the short one then, so the ones that leave the desk are the ones that were tapped). */
    if (pageOver() > 0 && !v.classList.contains("opt-ab") && v.querySelector(".answers .ol-a")) {
      v.classList.add("opt-ab");
      fitAnswers();
      if (wide) { applyReserve(); } else { app.style.removeProperty("--insp"); fitInspector(); applyReserve(); squeezeInspector(v.lastElementChild, true); }
    }
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
      note.setAttribute("aria-label", "The Inspector\u2019s clues");
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
          (al ? '<p class="sh-line sh-ask"><b>Why not</b><span class="sh-x">' + optionChip(mine, "no", true) + "<b>?</b></span></p>" : "")) + "</div></div>";
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
    sheet.classList.remove("ask-ab");
    v.classList.remove("dense");
    v.classList.remove("dense2");
    if (v.classList.contains("dense3")) { v.classList.remove("dense3"); fitAnswers(true); }
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
    /* (then the long names of the jobs under the words give way to their short ones, if they have not
       already: see fitPlay) */
    if (pageOver() > 0 && !v.classList.contains("lab-ab") && v.querySelector(".scroll .wl-a")) { v.classList.add("lab-ab"); layoutScroll(); }
    /* (and so does the long name in "Why not ...?", where he asks it in the note) */
    var ask = sheet.querySelector(".sh-ask .ol-a");
    if (pageOver() > 0 && ask && sheet.querySelector(".sh-ask").getClientRects().length) { sheet.classList.add("ask-ab"); }
    if (pageOver() > 0) { sheet.classList.add("terse"); }
    if (pageOver() > 0) { v.classList.add("dense2"); }
    /* The very last step, for a question whose answer cards stay on the desk above the note: the cards
       close ranks too ("dense3"). The "Ruled out" stamps go (such a card is still struck through, dashed
       and pale), and each row of cards is as tall as its own words need. The marks are placed again. */
    if (pageOver() > 0 && v.classList.contains("is-choice") && v.querySelector(".answers:not(.ghost) .opt")) { v.classList.add("dense3"); fitAnswers(true); }
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
      var before = rankFor(allStars()), prev = save.stars[id] || 0;
      if (stars > prev) { save.stars[id] = stars; res.best = prev > 0; } else if (stars < prev) { res.keep = prev; }
      if (stars === 3 && R.clues === 0) { res.solo = true; save.solo[id] = true; }
      save.seen["round:" + id] = true;
      persist();
      var after = rankFor(allStars());
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
    h += '<section class="verdict"><span class="chip-file">' + (res.practice ? "Practice round" : esc(fileName(file))) + '</span><h1 class="vd-title">' + txt(file.title) + "</h1>";
    if (res.practice) {
      h += '<div class="vd-big">' + icon(missed.length ? "glass" : "check", "") + "</div>";
    } else {
      h += '<div class="vd-stars" role="img" aria-label="' + stars + ' of 3 stars">';
      for (i = 0; i < 3; i++) { h += '<span class="vsw"><svg class="vs" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-star"></use></svg></span>'; }
      h += '</div><div class="stamp-row"><span class="stamp' + (stars >= 2 ? "" : " still") + '">' + esc(stars >= 2 ? L.stamp.closed : L.stamp.open) + "</span></div>";
    }
    h += '<ul class="vd-stats"><li><b>' + R.right + "/" + n + "</b><span>" + (res.practice ? "fixed" : "first try") + "</span></li><li><b>" + R.best + "</b><span>best streak</span></li><li><b>" + R.clues + "</b><span>" + (R.clues === 1 ? "clue used" : "clues used") + "</span></li></ul>";
    if (res.solo) { h += '<p class="vd-extra vd-solo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-ribbon"></use></svg><span>' + esc(L.solo) + "</span></p>"; }
    /* (courses.js says "a" or "an" before the rank: "an Inspector"; data.js's line has "a" only) */
    var upLine = arr(CL.rankUp)[0] || (typeof CL.rankUp === "string" ? CL.rankUp : "") || L.rankUp;
    var rankLine = res.rankUp ? fill(upLine, { a: aRank(res.rankUp), rank: res.rankUp }) : "", sayRank = !!rankLine;
    if (res.rankUp) {
      h += '<div class="vd-extra vd-rank"><svg viewBox="0 0 48 52" aria-hidden="true" focusable="false"><use href="#i-badge"></use></svg><p>' + tieShort(rich(rankLine)) + "</p>" + rankRowHtml(allStars(), true) + "</div>";
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
    tidySave();
    LP.set("sound", save.sound);
    syncSound();
    if (save.sound) { Sfx.play("tap"); }
  }
  function toggleMusic() {
    if (!MUSIC) { return; }
    save.music = !save.music;
    try { MUSIC.setEnabled(save.music); } catch (e) { /* the game works without music */ }
    LP.set("music", save.music);
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
    reset: function () { openConfirm("reset"); },
    players: function () { if (!busy) { choosePlayers(); } },
    chapter: function () { if (!busy && view === "home" && player) { if (atHome) { toHomePage("chapter"); } else { ui.changeChapter(player.id); } } },
    "claim-yes": function () { if (view === "claim") { claimYes(); } },
    "claim-no": function () { if (view === "claim") { claimNo(); } },
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
      /* the All games link leaves the game, so a slow second tap of a double tap on "Case files" (the link
         appears under the finger) is held back a little longer there */
      if (finger ? ptrDown - lastTap.t < (t === gamesLink ? 600 : 250) : (e.detail >= 2 && tm - lastTap.t < 800)) { return true; }
    }
    lastTap = { t: tm, x: e.clientX, y: e.clientY, el: t };
    return false;
  }
  /* A press on Next brings the next question, and its clue button or an answer may now lie under the
     pointer; a press on "Ask the Inspector" opens the clue above the answers and pushes them down, so an
     answer card may now lie where the button was. A press at that same spot (24 px) soon after is meant for
     what was there: the second click of a slow double click, or a click for another clue. So for a moment
     it may not answer or spend a clue: 1 s after Next (no one has read a new question by then), 2 s after
     a clue (the clue is still being written out); and only at that spot, only by pointer: a mouse that has
     not moved more than 4 px since the press (once it has moved, it aims anew and the guard is off), a
     finger within 24 px. The clue button itself stays pressable after a clue: a click for another clue
     gets one. Keys always go through. */
  var shift = { t: 0, x: 0, y: 0, ms: 0, clue: false, near: 24 }, SHIFT_NEXT = 1000, SHIFT_CLUE = 2000;
  document.addEventListener("pointermove", function (e) {
    if (shift.ms && e.pointerType === "mouse" && (Math.abs(e.clientX - shift.x) > shift.near || Math.abs(e.clientY - shift.y) > shift.near)) { shift.ms = 0; }
  }, true);
  function shiftTap(e, t, byPointer) {
    if (!byPointer || !shift.ms || now() - shift.t > shift.ms) { return false; }
    if (Math.abs(e.clientX - shift.x) > shift.near || Math.abs(e.clientY - shift.y) > shift.near) { return false; }
    if (t.hasAttribute("data-k") || t.hasAttribute("data-choice")) { return true; }
    return !shift.clue && t.getAttribute("data-action") === "clue";
  }
  /* (the guard listens first, in the capture phase: a tap it holds back is defaultPrevented, and neither the
     screens of players.js nor the game below act on it) */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("button, a") : null;
    if (!t || t.disabled) { return; }
    if (strayTap(e, t)) { e.preventDefault(); return; }
    /* (a click made by a script is no pointer: it has no spot, and is never held back) */
    var byPointer = e.isTrusted !== false && (e.detail > 0 || now() - ptrAt < 700);
    if (shiftTap(e, t, byPointer)) { e.preventDefault(); return; }
    var isClue = t.getAttribute("data-action") === "clue" && view === "play" && !!(R && R.cur && !R.cur.answered);
    shift = byPointer && (t.hasAttribute("data-primary") || isClue) ? { t: now(), x: e.clientX, y: e.clientY, ms: isClue ? SHIFT_CLUE : SHIFT_NEXT, clue: isClue, near: ptrKind === "mouse" ? 4 : 24 } : { t: 0, x: 0, y: 0, ms: 0, clue: false, near: 24 };
  }, true);
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) { return; }
    var t = e.target && e.target.closest ? e.target.closest("button, a") : null;
    /* (the screens of players.js, root class lp, answer their own taps) */
    if (!t || t.disabled || t.closest(".lp")) { return; }
    /* on the games site the chip, "Switch player" and "Change" go to the home page in place of this page (a
       click with a key held, or by another button, is the browser's: a new tab or window) */
    if (t.tagName === "A" && t.hasAttribute("data-home")) {
      if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) { return; }
      e.preventDefault();
      if (busy) { return; }
      Sfx.play("tap");
      toHomePage(t.getAttribute("data-home"));
      return;
    }
    var a = t.getAttribute("data-action");
    if (a && ACT[a]) {
      if (!QUIET[a]) { Sfx.play("tap"); }
      ACT[a](t);
      return;
    }
    if (t.hasAttribute("data-chart")) { Sfx.play("tap"); declChart(+t.getAttribute("data-chart")); return; }
    if (t.hasAttribute("data-noun")) { Sfx.play("tap"); declPick(+t.getAttribute("data-noun")); return; }
    /* All nouns: a chapter's list, a noun's table (a second press closes it) */
    if (t.hasAttribute("data-anch")) { Sfx.play("tap"); nounChapter(t, t.getAttribute("aria-expanded") !== "true"); return; }
    if (t.hasAttribute("data-an")) { Sfx.play("tap"); nounOpen(t, t.getAttribute("aria-expanded") !== "true"); return; }
    if (t.hasAttribute("data-decl")) { Sfx.play("tap"); declSwitch(t.getAttribute("data-decl")); return; }
    if (t.hasAttribute("data-box")) { if (!t.classList.contains("open")) { Sfx.play("tap"); declOpen(t); } return; }
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
    var k = e.key, tgt = e.target;
    /* a text field (the name of a new player) takes its own keys: no shortcut works there */
    if (tgt && tgt.matches && tgt.matches("input:not([type=button]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable]")) {
      if (k === "Escape" && cfOpen) { e.preventDefault(); closeConfirm(); }
      return;
    }
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
    declFit();
    fitNounTables();
    var c = view === "play" && R ? R.cur : null, pv = c && !c.answered ? desk.querySelector(".v-play") : null;
    /* (the evidence may have made way for the old size: it has to be back before it is measured; and the
       short names of the jobs, under the words and on the cards, were for the old size too) */
    if (pv) { pv.classList.remove("no-ev"); pv.classList.remove("opt-ab"); }
    var lv = view === "play" ? desk.querySelector(".v-play.lab-ab") : null;
    if (lv) { lv.classList.remove("lab-ab"); }
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

  /* ------------------------------------------------------------ the violin
     A player who takes too long (30 seconds with no tap, click, key or scroll while a question waits for
     its answer, or a briefing or the training case waits for a tap; he is not talking, no dialog and no
     Notebook is open, the page is visible) sees the Inspector take out his violin and play: the music
     switches to a fast caprice and his bow follows its notes. Any input, another screen or a hidden page
     makes him put it away, and the 30 seconds start again. detective.js and music.js do the playing;
     the game only says when, and every call is guarded, so the game is the same with files that have no
     violin. (?idle=N sets the wait to N seconds, for tests.) */
  var IDLE_MS = 30000;
  if (own(URLQ, "idle") && +URLQ.idle >= 1 && +URLQ.idle <= 600) { IDLE_MS = Math.round(+URLQ.idle * 1000); }
  var idle = { t: 0, on: false };
  function idleView() { return view === "play" || view === "briefing" || view === "training"; }
  function idleWaits() {
    if (document.hidden || nbOpen || cfOpen || !speech.done || busy) { return false; }
    if (view === "play") { return !!(R && R.cur && !R.cur.answered); }
    return (view === "briefing" && !!B) || (view === "training" && !!T);
  }
  function idleArm() {
    clearTimeout(idle.t);
    idle.t = 0;
    if (idle.on || document.hidden || !idleView()) { return; }
    idle.t = setTimeout(idleCheck, IDLE_MS);
  }
  function idleCheck() {
    idle.t = 0;
    if (idle.on) { return; }
    if (idleWaits()) { violinOn(); return; }
    /* (he is still talking, or a dialog is open: he waits for the quiet, a second at a time) */
    if (idleView() && !document.hidden) { idle.t = setTimeout(idleCheck, 1000); }
  }
  function violinOn() {
    if (idle.on || typeof insp.violin !== "function") { return; }
    idle.on = true;
    try { insp.violin(true); } catch (e) { /* ignore */ }
    var M = window.Music;
    if (M && typeof M.setMode === "function") {
      try { M.setMode("show"); } catch (e2) { /* ignore */ }
      try { M.onnote = typeof insp.bow === "function" ? function () { try { insp.bow(); } catch (e4) { /* ignore */ } } : null; } catch (e3) { /* ignore */ }
    }
  }
  /* still: he is about to show a new mood, which puts the violin away by itself */
  function violinOff(still) {
    if (!idle.on) { return; }
    idle.on = false;
    if (!still) { try { if (typeof insp.violin === "function") { insp.violin(false); } } catch (e) { /* ignore */ } }
    var M = window.Music;
    if (M && typeof M.setMode === "function") {
      try { M.onnote = null; } catch (e3) { /* ignore */ }
      try { M.setMode("calm"); } catch (e2) { /* ignore */ }
    }
  }
  function onInput() { violinOff(); idleArm(); }
  ["pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach(function (t) { document.addEventListener(t, onInput, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { violinOff(); clearTimeout(idle.t); idle.t = 0; } else { idleArm(); }
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
    /* the question on the desk as the data has it (a copy), and how many questions its file holds: a round
       of the noun drill draws its questions when it starts, so a test cannot look them up in a data file */
    question: function () {
      var c = view === "play" && R ? R.cur : null, q = null;
      if (!c) { return null; }
      try { q = JSON.parse(JSON.stringify(c.q)); } catch (e) { q = null; }
      return q ? { q: q, of: R.file.questions.length, drill: !!R.file.nounDrill } : null;
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
  gamesHome();
  if (!atHome) { ownChip(); } else if (chip) { chip.setAttribute("data-home", "players"); }
  syncSound();
  buildNotebook();
  tidySave();
  try {
    if (MUSIC) {
      /* the piece is kept only from the background list: a fast piece he plays on his violin ("show") is not
         where the background music should begin again after a reload */
      MUSIC.onchange = function (m) { if (m && m.playing && m.n && m.mode !== "show" && m.n !== save.piece) { save.piece = m.n; persist(); } syncMusic(); };
      MUSIC.start(save.piece);
      MUSIC.setEnabled(save.music);
    }
  } catch (e) { /* the game works without music */ }
  syncMusic();
  LP.onchange(onPlayers);
  window.addEventListener("storage", function (e) { if (e.key === D.storageKey || e.key === null) { onProgress(); } });
  /* The address may name a grade (?grade=6&chapter=2): that player's case files. Otherwise, on the games site,
     the player chosen on the home page (with nobody chosen, the home page, at once: the page stays blank
     meanwhile); elsewhere every visit starts on "Who's on the case?". */
  var fromLink = playerFromUrl();
  if (fromLink) { startPlayer(fromLink); }
  else if (atHome && LP.current()) { lead = arrived; startPlayer(LP.current()); }
  else if (atHome && arrived) { waitForPick(); }
  else if (atHome) { app.style.visibility = "hidden"; toHomePage("players"); }
  else { ui.players(); }
  /* (a page brought back from the browser's cache: the choice may have changed meanwhile) */
  window.addEventListener("pageshow", function (e) { if (e.persisted && atHome) { app.style.visibility = ""; onPlayers({ remote: true }); } });
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
