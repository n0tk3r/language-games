/*!
 * LatinPlayers (fallback): the players of the Latin games, kept in this browser.
 *
 * Case Detective 2.2 ships the real one (../case-detective/js/players.js). Until it is there, this file
 * defines window.LatinPlayers with the same API and the same storage (localStorage "latinGames.v1"), so a
 * player made now is still there when 2.2 takes over. If LatinPlayers is already defined, this file does
 * nothing at all.
 *
 * Storage, exactly as Case Detective's draft:
 *   latinGames.v1 = { v: 1, players: [{ id: "p1", name, color, grade, chapter }], last, sound, music }
 *
 * API (see ../README.md for the details):
 *   KEY, NAME_MAX, list(), get(id), current(), choose(id), add({name, grade, chapter}), update(id, fields),
 *   remove(id), settings(), set("sound"|"music", bool), onchange(fn) -> unsubscribe, cleanName(s),
 *   grades(), gradeInfo(g), canPlay(g), inGrade(g, ch), monthChapter(g, date?), chapter(n), gradeLine(p, withCourse?),
 *   screens(host) -> { players(), add(), manage(), changeChapter(id) }
 *
 * Classic script, no dependencies. Uses window.CD_COURSES when it is there, its own course data otherwise,
 * and the chapter titles of window.LATIN_WORDS. Never throws on a missing or locked localStorage: the list
 * then lives in memory for the visit.
 */
(function (root) {
  "use strict";
  if (root.LatinPlayers) { return; }

  var KEY = "latinGames.v1";
  var NAME_MAX = 20;
  var doc = root.document;

  /* ------------------------------------------------------------ course data */
  /* months: index 0 = January ... 11 = December, the chapter of that month on Hillsdale's plan.
     start: the month (1-12) the school year starts. */
  var OWN = {
    grades: [
      { grade: 6, course: "Latin IA", first: 1, last: 8, soon: false, start: 8,
        months: [4, 5, 6, 7, 8, 8, 8, 1, 1, 1, 2, 3] },
      { grade: 7, course: "Latin IB", first: 9, last: 17, soon: true, start: 8, months: null },
      { grade: 8, course: "Latin II", first: 18, last: 27, soon: false, start: 8,
        months: [23, 24, 25, 26, 27, 27, 27, 18, 18, 19, 21, 22] },
      { grade: 9, course: "Latin III", first: 28, last: 40, soon: true, start: 8, months: null }
    ],
    /* warm, distinct, never purple; white text reads on each */
    playerColors: ["#b4441c", "#1f6a8a", "#2f7a4a", "#a8721e", "#8a2a32", "#36558f", "#7a5a2a", "#4d6b2a"],
    lines: {
      playersFirst: ["<b>Salvē!</b> I am Inspector Cāsus.", "Who is playing tonight? Add yourself and we can start."],
      playersBack: ["<b>Salvē!</b> Who is playing tonight?", "Tap your name to go on."],
      playersManage: ["Here you can rename a player, change a grade or a chapter, or remove a player."],
      askName: ["What is your name?", "A first name or a nickname is plenty."],
      askGrade: ["Nice to meet you, <b>{name}</b>!", "Which grade are you in?"],
      askChapter: ["Which chapter is your class on?", "I picked this month's chapter. Change it if your class is somewhere else."],
      changeChapter: ["Which chapter is your class on now, <b>{name}</b>?"],
      changeGrade: ["Which grade is <b>{name}</b> in now?"]
    }
  };

  function CDC() { var c = root.CD_COURSES; return c && typeof c === "object" ? c : null; }

  function toMonths(m) {
    var out, i, keys, names = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    if (!m) { return null; }
    if (Array.isArray(m) && m.length === 12) { out = m.map(function (x) { return +x || 0; }); return out.every(function (x) { return x > 0; }) ? out : null; }
    if (typeof m === "object") {
      out = []; keys = Object.keys(m);
      for (i = 0; i < 12; i++) {
        var v = m[i + 1] != null ? m[i + 1] : m[names[i]] != null ? m[names[i]] : null;
        if (v == null) { keys.forEach(function (k) { if (k.toLowerCase().slice(0, 3) === names[i]) { v = m[k]; } }); }
        out.push(+v || 0);
      }
      return out.every(function (x) { return x > 0; }) ? out : null;
    }
    return null;
  }
  function gradeTable() {
    var c = CDC(), list = null;
    try {
      if (c && c.grades) {
        var src = Array.isArray(c.grades) ? c.grades : Object.keys(c.grades).map(function (k) { var o = c.grades[k] || {}; return Object.assign({ grade: +k }, o); });
        list = src.map(function (o) {
          var g = +o.grade, own = OWN.grades.filter(function (x) { return x.grade === g; })[0] || {};
          return {
            grade: g,
            course: String(o.course || own.course || ""),
            first: +o.first || own.first || 1,
            last: +o.last || own.last || 1,
            soon: o.soon != null ? !!o.soon : !!own.soon,
            start: +o.start || own.start || 8,
            months: toMonths(o.months) || own.months || null
          };
        }).filter(function (o) { return o.grade > 0 && o.first <= o.last; });
        if (!list.length) { list = null; }
      }
    } catch (e) { list = null; }
    return list || OWN.grades;
  }
  function copyGrade(o) {
    return { grade: o.grade, course: o.course, first: o.first, last: o.last, soon: !!o.soon, months: o.months ? o.months.slice() : null, start: o.start };
  }
  function gradeInfo(g) {
    g = +g;
    var t = gradeTable();
    for (var i = 0; i < t.length; i++) { if (t[i].grade === g) { return copyGrade(t[i]); } }
    return null;
  }
  function grades() { return gradeTable().map(copyGrade); }
  function canPlay(g) { var i = gradeInfo(g); return !!(i && !i.soon); }
  function inGrade(g, ch) { var i = gradeInfo(g); ch = +ch; return !!(i && ch >= i.first && ch <= i.last && Math.floor(ch) === ch); }
  function monthChapter(g, date) {
    var i = gradeInfo(g);
    if (!i) { return 1; }
    var d = date instanceof Date ? date : date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) { d = new Date(); }
    var ch = i.months ? +i.months[d.getMonth()] : i.first;
    return ch >= i.first && ch <= i.last ? ch : i.first;
  }
  function chapter(n) {
    n = +n;
    var c = CDC(), t = "", s = "";
    try {
      var cc = c && c.chapters ? c.chapters[n] : null;
      if (cc) { t = typeof cc === "string" ? cc : String(cc.title || ""); s = typeof cc === "string" ? "" : String(cc.short || ""); }
    } catch (e) { /* ignore */ }
    if (!t) {
      try {
        var w = root.LATIN_WORDS && root.LATIN_WORDS.chapters ? root.LATIN_WORDS.chapters[n] : null;
        if (w && w.title) { t = String(w.title); }
      } catch (e2) { /* ignore */ }
    }
    if (!s && t) { s = t.split(";")[0].trim(); }
    return { title: t, short: s };
  }
  function ordinal(g) { g = +g; var s = g % 100 >= 11 && g % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][g % 10] || "th"; return g + s; }
  function gradeLine(p, withCourse) {
    if (!p) { return ""; }
    var i = gradeInfo(p.grade), parts = [ordinal(p.grade) + " grade"];
    if (withCourse && i && i.course) { parts.push(i.course); }
    parts.push("Chapter " + p.chapter);
    return parts.join(" · ");
  }
  function colors() {
    var c = CDC();
    try { if (c && Array.isArray(c.playerColors) && c.playerColors.length) { return c.playerColors.map(String); } } catch (e) { /* ignore */ }
    return OWN.playerColors;
  }
  function lines(name) {
    var c = CDC(), l = null;
    try { l = c && c.lines && c.lines[name] ? c.lines[name] : null; } catch (e) { l = null; }
    l = l || OWN.lines[name] || [];
    return (Array.isArray(l) ? l : [l]).map(String);
  }

  /* ------------------------------------------------------------- the store */
  function cleanName(s) {
    s = String(s == null ? "" : s).replace(/[<>\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "").replace(/\s+/g, " ").trim();
    var cps = Array.from ? Array.from(s) : s.split("");
    if (cps.length > NAME_MAX) { s = cps.slice(0, NAME_MAX).join("").trim(); }
    return s;
  }
  function blank() { return { v: 1, players: [], last: null, sound: true, music: true }; }

  var mem = null, useMem = false;
  function lsGet() {
    if (useMem) { return mem; }
    try { return root.localStorage.getItem(KEY); } catch (e) { useMem = true; return mem; }
  }
  function lsSet(text) {
    mem = text;
    if (useMem) { return; }
    try { root.localStorage.setItem(KEY, text); } catch (e) { useMem = true; }
  }

  /* A player as stored: the five fields in the draft's order, then anything a later version added. */
  function tidyPlayer(o) {
    if (!o || typeof o !== "object") { return null; }
    var id = String(o.id || ""), name = cleanName(o.name), g = +o.grade, ch = +o.chapter;
    if (!/^p\d+$/.test(id) || !name) { return null; }
    var p = { id: id, name: name, color: typeof o.color === "string" && o.color ? o.color : colors()[0], grade: g, chapter: ch };
    if (!gradeInfo(g)) { return null; }
    if (!inGrade(g, ch)) { p.chapter = monthChapter(g); }
    Object.keys(o).forEach(function (k) { if (!(k in p)) { p[k] = o[k]; } });
    return p;
  }
  function read() {
    var raw = lsGet(), o = null;
    try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; }
    if (!o || typeof o !== "object" || Array.isArray(o)) { return blank(); }
    var s = { v: 1, players: [], last: null, sound: o.sound !== false, music: o.music !== false }, seen = {};
    (Array.isArray(o.players) ? o.players : []).forEach(function (q) {
      var p = tidyPlayer(q);
      if (p && !seen[p.id]) { seen[p.id] = true; s.players.push(p); }
    });
    s.last = typeof o.last === "string" && seen[o.last] ? o.last : null;
    Object.keys(o).forEach(function (k) { if (!(k in s)) { s[k] = o[k]; } });
    return s;
  }
  function write(s) {
    var out = { v: 1, players: s.players, last: s.last && s.players.some(function (p) { return p.id === s.last; }) ? s.last : null, sound: s.sound !== false, music: s.music !== false };
    Object.keys(s).forEach(function (k) { if (!(k in out)) { out[k] = s[k]; } });
    lsSet(JSON.stringify(out));
    fire();
  }
  function copy(p) { return p ? JSON.parse(JSON.stringify(p)) : null; }
  function find(s, id) { for (var i = 0; i < s.players.length; i++) { if (s.players[i].id === String(id)) { return s.players[i]; } } return null; }

  var listeners = [];
  function fire() {
    listeners.slice().forEach(function (fn) { try { fn(); } catch (e) { /* one listener does not stop the others */ } });
  }
  try {
    root.addEventListener("storage", function (e) { if (!e || e.key === KEY || e.key === null) { fire(); } });
  } catch (e) { /* no other tabs to follow */ }

  function list() {
    var s = read(), out = s.players.slice();
    if (s.last) { out.sort(function (a, b) { return (a.id === s.last ? 0 : 1) - (b.id === s.last ? 0 : 1); }); }
    return out.map(copy);
  }
  function get(id) { return copy(find(read(), id)); }
  function current() { var s = read(); return s.last ? copy(find(s, s.last)) : null; }
  function choose(id) {
    var s = read(), p = find(s, id);
    if (!p) { return null; }
    s.last = p.id;
    write(s);
    return copy(p);
  }
  function add(o) {
    o = o || {};
    var name = cleanName(o.name);
    if (!name) { return null; }
    var s = read(), n = 0, used = {};
    s.players.forEach(function (p) { n = Math.max(n, +p.id.slice(1) || 0); used[String(p.color).toLowerCase()] = true; });
    var g = canPlay(o.grade) ? +o.grade : grades().filter(function (x) { return !x.soon; }).map(function (x) { return x.grade; })[0] || 6;
    var ch = inGrade(g, o.chapter) ? +o.chapter : monthChapter(g);
    var pal = colors(), color = pal.filter(function (c) { return !used[c.toLowerCase()]; })[0] || pal[s.players.length % pal.length];
    var p = { id: "p" + (n + 1), name: name, color: color, grade: g, chapter: ch };
    s.players.push(p);
    write(s);
    return copy(p);
  }
  function update(id, f) {
    f = f || {};
    var s = read(), p = find(s, id);
    if (!p) { return null; }
    if (f.name != null) { var nm = cleanName(f.name); if (nm) { p.name = nm; } }
    if (f.grade != null && gradeInfo(f.grade) && (canPlay(f.grade) || +f.grade === p.grade)) {
      p.grade = +f.grade;
      if (f.chapter == null && !inGrade(p.grade, p.chapter)) { p.chapter = monthChapter(p.grade); }
    }
    if (f.chapter != null && inGrade(p.grade, f.chapter)) { p.chapter = +f.chapter; }
    write(s);
    return copy(p);
  }
  function remove(id) {
    var s = read(), before = s.players.length;
    s.players = s.players.filter(function (p) { return p.id !== String(id); });
    if (s.players.length === before) { return false; }
    if (s.last === String(id)) { s.last = null; }
    write(s);
    return true;
  }
  function settings() { var s = read(); return { sound: s.sound !== false, music: s.music !== false }; }
  function set(k, v) {
    if (k !== "sound" && k !== "music") { return settings(); }
    var s = read();
    s[k] = !!v;
    write(s);
    return settings();
  }
  function onchange(fn) {
    if (typeof fn !== "function") { return function () {}; }
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  /* ------------------------------------------------------------ the screens */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var ICONS = {
    next: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M9 5.5l6.5 6.5L9 18.5"/></svg>',
    back: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M15 5.5L8.5 12l6.5 6.5"/></svg>',
    plus: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>',
    star: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f4b730" stroke="#7a4e10" stroke-width="1.3" stroke-linejoin="round" d="M12 2.2l2.95 6.1 6.65.9-4.85 4.65 1.2 6.65L12 17.3l-5.95 3.2 1.2-6.65L2.4 9.2l6.65-.9z"/></svg>',
    check: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M5.2 12.8l4.3 4.3L18.9 7.5"/></svg>'
  };

  function screens(host) {
    host = host || {};
    function icon(n) {
      var s = null;
      try { s = typeof host.icon === "function" ? host.icon(n) : null; } catch (e) { s = null; }
      return s || ICONS[n] || "";
    }
    function say(name, mood, who) {
      if (typeof host.say !== "function") { return; }
      var l = lines(name).map(function (x) { return x.replace(/\{name\}/g, esc(who || "")); });
      try { host.say(l, mood || "idle"); } catch (e) { /* ignore */ }
    }
    function show(el, kind) {
      if (typeof host.show === "function") { try { host.show(el, kind); } catch (e) { /* ignore */ } }
      setTimeout(function () {
        var f = el.querySelector("[data-focus]") || el.querySelector("h2");
        if (f && el.isConnected !== false) { try { f.focus({ preventScroll: false }); } catch (e) { /* ignore */ } }
      }, 30);
    }
    function picked(p, how) {
      var q = choose(p.id) || p;
      if (typeof host.picked === "function") { try { host.picked(q, how); } catch (e) { /* ignore */ } }
    }
    function make(html) { var d = doc.createElement("div"); d.innerHTML = html; return d.firstElementChild; }
    function on(el, sel, fn) { Array.prototype.forEach.call(el.querySelectorAll(sel), function (b) { b.addEventListener("click", fn); }); }
    function avatar(p) { return '<span class="lpf-av" style="--pc:' + esc(p.color) + '" aria-hidden="true">' + esc(Array.from ? Array.from(p.name)[0] : p.name.charAt(0)) + "</span>"; }
    function line(p) { return gradeLine(p, true).split(" · ").map(function (x) { return '<span class="nw">' + esc(x) + "</span>"; }).join(" · "); }
    function starsOf(p) {
      if (typeof host.starsOf !== "function") { return ""; }
      var n = null;
      try { n = host.starsOf(p); } catch (e) { n = null; }
      return n == null || n === "" ? "" : '<span class="lpf-stars">' + icon("star") + "<b>" + esc(n) + '</b><span class="sr"> stars</span></span>';
    }
    function foot(extra) {
      var h = host.sourcesHref ? '<a class="tlink" href="' + esc(host.sourcesHref) + '">For parents: where the words and charts come from</a>' : "";
      return extra || h ? '<div class="lpf-foot">' + (extra || "") + h + "</div>" : "";
    }

    /* Who's playing? */
    function players() {
      var ps = list();
      if (!ps.length) { addScreen(); return; }
      var cur = current();
      var html = '<div class="lpf lpf-players"><h2 class="lpf-h" tabindex="-1">Who’s playing?</h2><ul class="lpf-cards">';
      ps.forEach(function (p) {
        var last = cur && cur.id === p.id;
        html += '<li><button type="button" class="lpf-card' + (last ? " last" : "") + '" data-id="' + esc(p.id) + '"' + (last ? " data-focus" : "") + ">" + avatar(p) +
          '<span class="lpf-who"><b class="lpf-name">' + esc(p.name) + "</b><small>" + line(p) + "</small></span>" + starsOf(p) +
          '<span class="lpf-go">' + (last ? "Continue" : "Play") + icon("next") + "</span></button></li>";
      });
      html += '<li><button type="button" class="lpf-card lpf-new" data-act="add"><span class="lpf-av lpf-plus" aria-hidden="true">' + icon("plus") + '</span><span class="lpf-who"><b>Add a player</b><small>Name, grade and chapter</small></span></button></li></ul>';
      html += foot('<button type="button" class="tlink" data-act="manage">Manage players</button>') + "</div>";
      var el = make(html);
      on(el, "[data-id]", function () { var p = get(this.getAttribute("data-id")); if (p) { picked(p, "continue"); } });
      on(el, '[data-act="add"]', function () { addScreen(); });
      on(el, '[data-act="manage"]', function () { manage(); });
      show(el, "players");
      say(cur ? "playersBack" : "playersFirst", "wave");
    }

    /* the three steps of Add a player; also used to change a grade (from Manage) */
    function stepHead(n, total, title) {
      return '<div class="lpf-step"><span class="lpf-dots" aria-hidden="true">' +
        [1, 2, 3].slice(0, total).map(function (i) { return '<i class="' + (i === n ? "on" : i < n ? "done" : "") + '"></i>'; }).join("") +
        '</span><span class="lpf-stepn">Step ' + n + " of " + total + '</span></div><h2 class="lpf-h" tabindex="-1">' + title + "</h2>";
    }
    function nameStep(draft, back) {
      var el = make('<div class="lpf lpf-setup"><form class="card lpf-panel" novalidate>' + stepHead(1, 3, "Add a player") +
        '<label class="lpf-lab" for="lpfName">Your name</label>' +
        '<input class="lpf-input" id="lpfName" name="name" type="text" maxlength="' + NAME_MAX + '" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" data-focus>' +
        '<p class="lpf-hint">Only on this device. It is never sent anywhere.</p><p class="lpf-err" role="alert" hidden>Type a name first.</p>' +
        '<div class="lpf-row">' + (back ? '<button type="button" class="btn wood" data-act="back">' + icon("back") + "Back</button>" : "") +
        '<button type="submit" class="btn primary">Next' + icon("next") + "</button></div></form></div>");
      var inp = el.querySelector("input"), err = el.querySelector(".lpf-err");
      inp.value = draft.name || "";
      inp.addEventListener("input", function () { err.hidden = true; });
      el.querySelector("form").addEventListener("submit", function (e) {
        e.preventDefault();
        var n = cleanName(inp.value);
        if (!n) { err.hidden = false; inp.focus(); return; }
        draft.name = n;
        gradeStep(draft, function () { nameStep(draft, back); }, function () { chapterStep(draft); });
      });
      on(el, '[data-act="back"]', function () { if (back) { back(); } });
      show(el, "setup");
      say("askName", "wave");
    }
    function gradeStep(draft, back, next, opts) {
      opts = opts || {};
      var gs = grades(), cur = draft.grade;
      var html = '<div class="lpf lpf-setup"><div class="card lpf-panel">' + (opts.title ? '<h2 class="lpf-h" tabindex="-1">' + opts.title + "</h2>" : stepHead(2, 3, "Which grade?")) + '<div class="lpf-grades" role="group" aria-label="Grade">';
      gs.forEach(function (g) {
        var sel = cur === g.grade;
        html += '<button type="button" class="lpf-grade' + (g.soon ? " soon" : "") + '" data-g="' + g.grade + '"' + (g.soon ? ' disabled aria-disabled="true"' : "") +
          ' aria-pressed="' + (sel ? "true" : "false") + '"' + (sel || (!cur && !g.soon && !html.match(/data-focus/)) ? " data-focus" : "") + ">" +
          '<b>' + ordinal(g.grade) + " grade</b><small>" + esc(g.course) + " · chapters " + g.first + " to " + g.last + "</small>" +
          (g.soon ? '<span class="lpf-soon">Coming soon</span>' : "") + "</button>";
      });
      html += '</div><div class="lpf-row">' + (back ? '<button type="button" class="btn wood" data-act="back">' + icon("back") + "Back</button>" : "") + "</div></div></div>";
      var el = make(html);
      on(el, "[data-g]", function () {
        var g = +this.getAttribute("data-g");
        if (!canPlay(g)) { return; }
        if (draft.grade !== g) { draft.chapter = null; }
        draft.grade = g;
        next();
      });
      on(el, '[data-act="back"]', function () { if (back) { back(); } });
      show(el, "setup");
      say(opts.line || "askGrade", "think", draft.name);
    }
    function chapterStep(draft, opts) {
      opts = opts || {};
      var gi = gradeInfo(draft.grade);
      if (!gi) { return; }
      var month = monthChapter(draft.grade), sel = inGrade(draft.grade, draft.chapter) ? +draft.chapter : month, ready = null;
      if (typeof host.filesIn === "function") { try { ready = host.filesIn(draft.grade) || null; } catch (e) { ready = null; } }
      var html = '<div class="lpf lpf-setup"><div class="card lpf-panel">' + (opts.title ? '<h2 class="lpf-h" tabindex="-1">' + opts.title + "</h2>" : stepHead(3, 3, "Which chapter?")) +
        '<p class="lpf-sub">' + esc(ordinal(draft.grade) + " grade · " + gi.course) + '</p><div class="lpf-chs" role="radiogroup" aria-label="Chapter">';
      for (var c = gi.first; c <= gi.last; c++) {
        var info = chapter(c), tags = "";
        if (c === month) { tags += '<span class="lpf-tag month">This month</span>'; }
        if (ready) { tags += ready[c] ? '<span class="lpf-tag ready">' + icon("check") + "Ready</span>" : '<span class="lpf-tag later">On its way</span>'; }
        html += '<button type="button" class="lpf-ch" role="radio" data-ch="' + c + '" aria-checked="' + (c === sel ? "true" : "false") + '" tabindex="' + (c === sel ? "0" : "-1") + '"' + (c === sel ? " data-focus" : "") + ">" +
          '<span class="lpf-chn">Chapter ' + c + "</span>" + (info.short ? '<span class="lpf-cht">' + info.short.replace(/<(?!\/?i>)[^>]*>/g, "") + "</span>" : "") + (tags ? '<span class="lpf-tags">' + tags + "</span>" : "") + "</button>";
      }
      html += '</div><div class="lpf-row">' + (opts.back !== false ? '<button type="button" class="btn wood" data-act="back">' + icon("back") + "Back</button>" : "") +
        '<button type="button" class="btn primary" data-act="go">' + esc(opts.go || "Start playing") + icon("next") + "</button></div></div></div>";
      var el = make(html), btns = el.querySelectorAll("[data-ch]");
      function pick(b, focus) {
        Array.prototype.forEach.call(btns, function (x) { var on1 = x === b; x.setAttribute("aria-checked", on1 ? "true" : "false"); x.tabIndex = on1 ? 0 : -1; });
        sel = +b.getAttribute("data-ch");
        if (focus) { b.focus(); }
      }
      Array.prototype.forEach.call(btns, function (b, i) {
        b.addEventListener("click", function () { pick(b); });
        b.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
          if (d) { e.preventDefault(); pick(btns[(i + d + btns.length) % btns.length], true); }
        });
      });
      on(el, '[data-act="back"]', function () { if (opts.onBack) { opts.onBack(); } else { gradeStep(draft, function () { nameStep(draft, list().length ? players : null); }, function () { chapterStep(draft); }); } });
      on(el, '[data-act="go"]', function () { draft.chapter = sel; (opts.onGo || finishAdd)(draft); });
      show(el, "setup");
      if (opts.line) { say(opts.line, "think", draft.name); } else { say("askChapter", "point", draft.name); }
    }
    function finishAdd(draft) {
      var p = add({ name: draft.name, grade: draft.grade, chapter: draft.chapter });
      if (p) { picked(p, "added"); }
    }
    function addScreen() {
      var draft = { name: "", grade: null, chapter: null };
      nameStep(draft, list().length ? players : null);
    }

    /* Manage players */
    function manage() {
      var ps = list();
      if (!ps.length) { addScreen(); return; }
      var html = '<div class="lpf lpf-manage"><h2 class="lpf-h" tabindex="-1">Manage players</h2><ul class="lpf-mlist">';
      ps.forEach(function (p) {
        html += '<li class="card lpf-m" data-pid="' + esc(p.id) + '"><div class="lpf-mtop">' + avatar(p) + '<span class="lpf-who"><b class="lpf-name">' + esc(p.name) + "</b><small>" + line(p) + "</small></span></div>" +
          '<div class="lpf-mbtns"><button type="button" class="btn wood sm" data-act="rename">Rename</button><button type="button" class="btn wood sm" data-act="grade">Grade</button>' +
          '<button type="button" class="btn wood sm" data-act="chapter">Chapter</button><button type="button" class="btn danger sm" data-act="remove">Remove</button></div>' +
          '<form class="lpf-ren" hidden novalidate><label class="sr" for="lpfRen' + esc(p.id) + '">New name for ' + esc(p.name) + "</label>" +
          '<input class="lpf-input" id="lpfRen' + esc(p.id) + '" type="text" maxlength="' + NAME_MAX + '" autocomplete="off" spellcheck="false">' +
          '<button type="submit" class="btn primary sm">Save</button><button type="button" class="btn wood sm" data-act="cancel">Cancel</button></form></li>';
      });
      html += '</ul><div class="lpf-row"><button type="button" class="btn primary" data-act="done" data-focus>Done' + icon("next") + "</button></div>" + foot("") + "</div>";
      var el = make(html);
      Array.prototype.forEach.call(el.querySelectorAll("[data-pid]"), function (li) {
        var id = li.getAttribute("data-pid"), form = li.querySelector("form"), inp = form.querySelector("input"), btns = li.querySelector(".lpf-mbtns");
        li.querySelector('[data-act="rename"]').addEventListener("click", function () {
          var p = get(id); if (!p) { return; }
          btns.hidden = true; form.hidden = false; inp.value = p.name; inp.focus(); try { inp.select(); } catch (e) { /* ignore */ }
        });
        form.querySelector('[data-act="cancel"]').addEventListener("click", function () { form.hidden = true; btns.hidden = false; li.querySelector('[data-act="rename"]').focus(); });
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          if (!cleanName(inp.value)) { inp.focus(); return; }
          update(id, { name: inp.value });
          manage();
        });
        li.querySelector('[data-act="grade"]').addEventListener("click", function () {
          var p = get(id); if (!p) { return; }
          var draft = { name: p.name, grade: p.grade, chapter: p.chapter };
          gradeStep(draft, manage, function () {
            chapterStep(draft, { title: "Which chapter?", go: "Save", line: "askChapter", onBack: manage, onGo: function (d) { update(id, { grade: d.grade, chapter: d.chapter }); manage(); } });
          }, { title: "Change the grade", line: "changeGrade" });
        });
        li.querySelector('[data-act="chapter"]').addEventListener("click", function () {
          var p = get(id); if (!p) { return; }
          var draft = { name: p.name, grade: p.grade, chapter: p.chapter };
          chapterStep(draft, { title: "Change the chapter", go: "Save", line: "changeChapter", onBack: manage, onGo: function (d) { update(id, { chapter: d.chapter }); manage(); } });
        });
        li.querySelector('[data-act="remove"]').addEventListener("click", function () {
          var p = get(id), btn = this; if (!p) { return; }
          confirmBox("Remove " + p.name + "?", "Their progress in these games is wiped from this device. This cannot be undone.", "Remove " + p.name, "Keep", function (yes) {
            if (yes) { remove(id); if (list().length) { manage(); } else { addScreen(); } } else { try { btn.focus(); } catch (e) { /* ignore */ } }
          });
        });
      });
      on(el, '[data-act="done"]', function () { players(); });
      show(el, "manage");
      say("playersManage", "point");
    }

    /* the chapter step alone (from the top bar's player menu) */
    function changeChapter(id) {
      var p = id ? get(id) : current();
      if (!p) { players(); return; }
      var draft = { name: p.name, grade: p.grade, chapter: p.chapter };
      chapterStep(draft, {
        title: "Change the chapter", go: "Save", line: "changeChapter",
        onBack: function () { var q = get(p.id); if (q) { picked(q, "continue"); } else { players(); } },
        onGo: function (d) { var q = update(p.id, { chapter: d.chapter }); if (q) { picked(q, "chapter"); } }
      });
    }

    return { players: players, add: addScreen, manage: manage, changeChapter: changeChapter };
  }

  /* a small confirm box in the same look (styles: .dlg in latin-common/css/common.css) */
  function confirmBox(title, text, yes, no, done) {
    var back = doc.activeElement, scrim = doc.createElement("div"), box = doc.createElement("section");
    scrim.className = "scrim";
    box.className = "dlg open";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "lpfCfT");
    box.setAttribute("aria-describedby", "lpfCfP");
    box.innerHTML = '<h2 id="lpfCfT">' + esc(title) + '</h2><p id="lpfCfP">' + esc(text) + '</p><div class="dlg-row">' +
      '<button type="button" class="btn primary" data-v="0">' + esc(no) + '</button><button type="button" class="btn danger" data-v="1">' + esc(yes) + "</button></div>";
    function close(v) {
      doc.removeEventListener("keydown", key, true);
      if (scrim.parentNode) { scrim.parentNode.removeChild(scrim); }
      if (box.parentNode) { box.parentNode.removeChild(box); }
      if (!v && back && back.focus) { try { back.focus(); } catch (e) { /* ignore */ } }
      done(!!v);
    }
    function key(e) {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
      if (e.key === "Tab") {
        var b = box.querySelectorAll("button"), f = b[0], l = b[b.length - 1];
        if (e.shiftKey && doc.activeElement === f) { e.preventDefault(); l.focus(); } else if (!e.shiftKey && doc.activeElement === l) { e.preventDefault(); f.focus(); }
      }
    }
    Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { close(b.getAttribute("data-v") === "1"); }); });
    scrim.addEventListener("click", function () { close(false); });
    doc.addEventListener("keydown", key, true);
    doc.body.appendChild(scrim);
    doc.body.appendChild(box);
    box.querySelector("button").focus();
  }

  root.LatinPlayers = {
    KEY: KEY, NAME_MAX: NAME_MAX, fallback: true,
    list: list, get: get, current: current, choose: choose, add: add, update: update, remove: remove,
    settings: settings, set: set, onchange: onchange, cleanName: cleanName,
    grades: grades, gradeInfo: gradeInfo, canPlay: canPlay, inGrade: inGrade, monthChapter: monthChapter, chapter: chapter, gradeLine: gradeLine,
    screens: screens
  };
})(typeof window !== "undefined" ? window : this);
