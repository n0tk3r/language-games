/* Climb to Consul: the rules, without a page.
 * Which words are in play, tonight's assembly, the five offices, every kind of question with its wrong
 * choices, answer checking, Erase Away and the trick-verb ring, as pure functions (no DOM).
 * Browser: window.ClimbLogic (after latin-common/js/shell.js). Node: module.exports (tools/check.js).
 * Every function takes the word data (LATIN_WORDS) as its first argument where it needs it. */
(function (root) {
  "use strict";
  var S = root && root.LatinShell;
  if (!S && typeof require === "function") { try { S = require("../../latin-common/js/shell.js"); } catch (e) { S = null; } }
  if (!S) { throw new Error("Climb to Consul needs latin-common/js/shell.js"); }

  /* ------------------------------------------------------------- constants */
  var OFFICES = [
    { k: 0, key: "citizen", name: "Citizen", many: "Citizens", does: "not met yet" },
    { k: 1, key: "quaestor", name: "Quaestor", many: "Quaestors", does: "keeps the treasury" },
    { k: 2, key: "aedile", name: "Aedile", many: "Aediles", does: "looks after the buildings and markets" },
    { k: 3, key: "praetor", name: "Praetor", many: "Praetors", does: "judges in the courts" },
    { k: 4, key: "consul", name: "Consul", many: "Consuls", does: "leads the Republic" }
  ];
  /* the question a word gets is the one of the office it is climbing to */
  var KINDS = ["quaestor", "aedile", "praetor", "consul"];
  var MAX_DUE = 14;          /* due words in one assembly */
  var CONSUL_DAYS = 7;       /* a Consul comes back after a week */
  var NEW_MIN = 5, NEW_MAX = 8, NEW_DEFAULT = 6;
  var MACRONS = ["ignored", "light", "strict"];
  var FUNC = ["adverb", "conjunction", "preposition", "pronoun", "interjection"];
  var CASES = { abl: "+ ablative", acc: "+ accusative", gen: "+ genitive" };
  var CASE_SHORT = { abl: "+ abl.", acc: "+ acc.", gen: "+ gen." };
  var GENDERS = { m: "m.", f: "f.", n: "n." };
  var GENDER_NAME = { "m.": "masculine", "f.": "feminine", "n.": "neuter" };

  /* ---------------------------------------------------------------- helpers */
  function key(s) { return S.strip(String(s == null ? "" : s)).toLowerCase().replace(/\s+/g, " ").trim(); }
  function has(list, x) { return !!list && list.indexOf(x) >= 0; }
  function uniq(list) { var seen = {}, out = []; list.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } }); return out; }
  function clamp(n, a, b) { n = +n; if (!isFinite(n)) { n = a; } return Math.max(a, Math.min(b, Math.round(n))); }
  function rngOf(seed) { return typeof seed === "function" ? seed : S.rng(seed == null ? 1 : seed); }
  /* split on separators that are not inside parentheses */
  function splitTop(s, seps) {
    var out = [], cur = "", depth = 0, i, c;
    s = String(s || "");
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if (c === "(") { depth++; } else if (c === ")") { depth = Math.max(0, depth - 1); }
      if (depth === 0 && seps.indexOf(c) >= 0) { out.push(cur); cur = ""; } else { cur += c; }
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  /* Levenshtein distance, for look-alikes */
  function lev(a, b) {
    if (a === b) { return 0; }
    var m = a.length, n = b.length, i, j, prev = [], cur;
    for (j = 0; j <= n; j++) { prev[j] = j; }
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)); }
      prev = cur;
    }
    return prev[n];
  }
  function lookalike(a, b) {
    var x = key(a.hw).replace(/[^a-z ]/g, ""), y = key(b.hw).replace(/[^a-z ]/g, "");
    if (!x || !y) { return false; }
    return x.slice(0, 2) === y.slice(0, 2) || lev(x, y) <= 2;
  }
  /* the dictionary entry's part of speech, as the book lists it ("per source B" is a note for us, not for children) */
  function asText(w) { return String(w.as || w.pos || "").replace(/,?\s*per source [A-Z]/g, "").replace(/\(\s*\)/g, "").trim(); }
  function ordinal(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"); }

  /* ---------------------------------------------------------------- meanings */
  function senseList(w) { return splitTop(w.mean, ";,"); }
  function normSense(s) {
    s = String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[!?.…]/g, " ").replace(/\s+/g, " ").trim();
    s = s.replace(/^(the|a|an|to|be)\s+/, "").trim();
    return s;
  }
  function senses(w) {
    var out = [];
    senseList(w).forEach(function (x) { out.push(normSense(x)); splitTop(x, "?!").forEach(function (y) { out.push(normSense(y)); }); });
    return uniq(out.filter(Boolean));
  }
  /* The English for a Quaestor question: the first 2 or 3 meanings. The book's ";" groups are kept whole
     ("but, mind you" never loses its "but"); a group is cut only at the 2-3 sense limit, and a group that
     repeats a meaning already shown is left out (or, when it holds every meaning shown so far, replaces them:
     at = "but; but, mind you; but, you say" -> "but, mind you"). Groups are joined with "; " as printed. */
  function english(w) {
    var groups = splitTop(w.mean, ";").map(function (g) { return splitTop(g, ","); }).filter(function (g) { return g.length; });
    var out = [], shown = [], stop = false;
    function count() { return out.reduce(function (a, g) { return a + g.length; }, 0); }
    function text(list) { return list.map(function (g) { return g.join(", "); }).join("; "); }
    function fits(list, n) { var t = text(list).length; return (n <= 2 && t <= 40) || t <= 30; }
    groups.forEach(function (g, gi) {
      if (stop) { return; }
      var ns = g.map(normSense), i;
      if (gi === 0) {
        out.push([g[0]]); shown.push(ns[0]);
        for (i = 1; i < g.length && count() < 3; i++) {
          if (shown.indexOf(ns[i]) >= 0) { continue; }
          if (fits([out[0].concat(g[i])], count() + 1)) { out[0].push(g[i]); shown.push(ns[i]); } else { break; }
        }
        if (out[0].length < g.length) { stop = true; }
        return;
      }
      var repeats = ns.some(function (s) { return shown.indexOf(s) >= 0; });
      if (repeats) {
        var holdsAll = shown.every(function (s) { return ns.indexOf(s) >= 0; });
        if (out.length === 1 && holdsAll && g.length <= 3 && fits([g], g.length)) { out = [g.slice()]; shown = ns.slice(); }
        else { stop = true; }
        return;
      }
      var take = [];
      for (i = 0; i < g.length && count() + take.length < 3; i++) {
        if (fits(out.concat([take.concat(g[i])]), count() + take.length + 1)) { take.push(g[i]); } else { break; }
      }
      if (take.length) { out.push(take); shown = shown.concat(ns.slice(0, take.length)); }
      if (take.length < g.length) { stop = true; }
    });
    return text(out);
  }
  /* The English shown when asking for the Latin. A few `ask` texts in words.js read badly to a child; until the
     data is rebuilt these are shown instead (only while words.js still has the old text; see NOTES.md). */
  var ASK_FIX = {
    "19-at": ["but, but", "but (mind you)"],
    "19-qui-quae-quod": ["what? which? what kind of?, what (a)! what sort of!", "what? which? what kind of?"]
  };
  function ask(w) { var f = ASK_FIX[w.id]; return f && w.ask === f[0] ? f[1] : w.ask; }
  /* a sense without its little words at the end: "snatch away" -> "snatch", "be free from" -> "free" */
  var PARTICLE = /\s+(away|off|out|up|down|back|from|of|with|for|to|in|on|at|by|over|about|into|upon)$/;
  function senseBase(s) { var t = s, prev; do { prev = t; t = t.replace(PARTICLE, ""); } while (t !== prev); return t; }
  /* Pairs that are close in meaning but are not in each other's `same` list in words.js (asked of the data
     owner in NOTES.md): never offered against each other, and typing one for the other is a near miss. */
  var NEAR = [["21-rapio", "22-eripio"], ["21-gens", "21-vulgus"], ["19-libero", "20-careo"], ["22-inquit", "25-ait"], ["07-littera", "07-litterae"]];
  function near(a, b) { return NEAR.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); }); }
  /* two words that must never be offered against each other: the same word, a `same` word, a reviewed near
     pair, a shared sense, or a shared sense once the little words are off ("snatch" / "snatch away") */
  function related(a, b) {
    if (a.id === b.id) { return true; }
    if (has(a.same, b.id) || has(b.same, a.id) || near(a.id, b.id)) { return true; }
    var sa = senses(a), sb = senses(b), i;
    for (i = 0; i < sa.length; i++) { if (sb.indexOf(sa[i]) >= 0) { return true; } }
    var ba = sa.map(senseBase), bb = sb.map(senseBase);
    for (i = 0; i < ba.length; i++) { if (ba[i] && bb.indexOf(ba[i]) >= 0) { return true; } }
    return false;
  }

  /* ------------------------------------------------------------ the course */
  function gradeChapters(W, g) { var x = W && W.grades && W.grades[String(g)]; return x ? x.chapters.slice() : []; }
  function isReady(W, ch) { var c = W.chapters[String(ch)]; return !!(c && c.ready); }
  function readyChapters(W, g) { return gradeChapters(W, g).filter(function (c) { return isReady(W, c); }); }
  function lastReady(W, g) { var r = readyChapters(W, g); return r.length ? r[r.length - 1] : 0; }
  /* the chapter tonight's words come from: the player's chapter, or the last ready one before it */
  function playChapter(W, player) {
    var chs = gradeChapters(W, player && player.grade), ready = readyChapters(W, player && player.grade);
    if (!ready.length) { return 0; }
    var ch = +player.chapter || chs[0];
    if (ch < chs[0]) { ch = chs[0]; }
    return Math.min(ch, ready[ready.length - 1]);
  }
  function gradeWords(W, g) { var chs = gradeChapters(W, g); return W.words.filter(function (w) { return chs.indexOf(w.ch) >= 0; }); }
  function drilled(w) { return w.drill !== false; }
  function inPlay(W, player) {
    var pc = playChapter(W, player);
    if (!pc) { return []; }
    return gradeWords(W, player.grade).filter(function (w) { return drilled(w) && w.ch <= pc && isReady(W, w.ch); });
  }
  /* "repeats" entries teach a new meaning of a word already met: counted once */
  function countable(w) { return !w.repeats; }
  function canPlay(W, player) { return !!(player && playChapter(W, player)); }
  /* "Chapter 4's words are on their way" */
  function behind(W, player) { var pc = playChapter(W, player); return !!(player && pc && +player.chapter > pc); }

  /* ------------------------------------------------------------- progress */
  function fresh() {
    return { v: 1, words: {}, set: settings(null), nights: {}, ring: { n: 0, last: "" }, erase: { n: 0, last: "" }, round: null };
  }
  function settings(s) {
    s = s || {};
    var q = s.quiz || {};
    var mode = q.mode === "weekly" || q.mode === "date" ? q.mode : "none";
    return {
      macrons: MACRONS.indexOf(s.macrons) >= 0 ? s.macrons : "light",
      perNight: clamp(s.perNight == null ? NEW_DEFAULT : s.perNight, NEW_MIN, NEW_MAX),
      quiz: { mode: mode, day: clamp(q.day == null ? 5 : q.day, 0, 6), date: /^\d{4}-\d{2}-\d{2}$/.test(q.date || "") ? q.date : "" }
    };
  }
  /* a saved progress object, made safe to use */
  function load(o) {
    var p = fresh();
    if (!o || typeof o !== "object") { return p; }
    if (o.words && typeof o.words === "object") {
      Object.keys(o.words).forEach(function (id) {
        var e = o.words[id];
        if (!e || typeof e !== "object") { return; }
        p.words[id] = { o: clamp(e.o, 0, 4), d: e.d || "", s: e.s || "", n: +e.n || 0, m: +e.m || 0, r: +e.r || 0 };
      });
    }
    p.set = settings(o.set);
    if (o.nights && typeof o.nights === "object") { p.nights = o.nights; }
    if (o.ring && typeof o.ring === "object") { p.ring = { n: +o.ring.n || 0, last: o.ring.last || "" }; }
    if (o.erase && typeof o.erase === "object") { p.erase = { n: +o.erase.n || 0, last: o.erase.last || "" }; }
    if (o.round && typeof o.round === "object" && Array.isArray(o.round.items)) { p.round = o.round; }
    return p;
  }
  /* keep the last 60 nights */
  function trimNights(prog) {
    var ks = Object.keys(prog.nights || {}).sort();
    while (ks.length > 60) { delete prog.nights[ks.shift()]; }
  }
  function night(prog, today) {
    prog.nights = prog.nights || {};
    if (!prog.nights[today]) { prog.nights[today] = { met: 0, early: 0, asked: 0, right: 0, climbed: 0, slipped: 0 }; trimNights(prog); }
    return prog.nights[today];
  }
  function officeOf(prog, id) { var e = prog && prog.words && prog.words[id]; return e ? e.o : 0; }
  /* A word is due when it was not asked today (so a word that slipped tonight cannot climb back in a second
     assembly the same night): Quaestors to Praetors, Citizens already met (asked straight away, as review, with
     no "new word" card), and Consuls whose last answer is a week old or more. */
  function isDue(e, today) {
    if (!e || e.s === today) { return false; }
    if (e.o >= 1 && e.o <= 3) { return e.d !== today; }
    if (e.o === 0) { return (e.n || 0) > 0; }
    if (e.o === 4) { return !(S.days(e.s, today) < CONSUL_DAYS); }
    return false;
  }
  /* a Citizen never asked yet: a new word */
  function unmet(e) { return !e || (!(e.n > 0) && !e.s); }
  /* counts for the hill: [citizens, quaestors, aediles, praetors, consuls] */
  function hill(W, player, prog) {
    var c = [0, 0, 0, 0, 0];
    inPlay(W, player).forEach(function (w) { if (countable(w)) { c[officeOf(prog, w.id)]++; } });
    return c;
  }

  /* the kind of question a word gets now */
  function kindFor(w, e) {
    var o = e ? e.o : 0;
    if (o < 4) { return KINDS[o]; }
    /* Consuls: the typed English, then (a week later) the typed full entry: tiles first, typing later */
    return (e.r || 0) % 2 === 1 && typedRows(w) ? "praetorT" : "consul";
  }

  /* An answer. ok: right or wrong. o.again: the word's second try tonight (never climbs, never slips again).
     Right: up one office, at most once a night. Wrong: down one office (a Citizen stays a Citizen). */
  function apply(prog, w, ok, today, o) {
    o = o || {};
    prog.words = prog.words || {};
    var e = prog.words[w.id] || (prog.words[w.id] = { o: 0, d: "", s: "", n: 0, m: 0, r: 0 });
    var from = e.o, nt = night(prog, today);
    e.n = (e.n || 0) + 1;
    e.s = today;
    nt.asked++;
    if (o.fresh) { nt.met = (nt.met || 0) + 1; }
    if (o.early) { nt.early = (nt.early || 0) + 1; }
    if (ok) {
      nt.right++;
      if (from === 4) { e.r = (e.r || 0) + 1; }
      else if (!o.again && e.d !== today) { e.o = from + 1; e.d = today; if (e.o === 4) { e.r = 0; } }
    } else {
      e.m = (e.m || 0) + 1;
      if (!o.again) { e.o = Math.max(0, from - 1); }
    }
    if (e.o > from) { nt.climbed++; }
    if (e.o < from) { nt.slipped++; }
    return { id: w.id, from: from, to: e.o, climbed: e.o > from, slipped: e.o < from, again: !!o.again, ok: !!ok };
  }

  /* ------------------------------------------------------ tonight's assembly */
  /* the due words (oldest first) and the new ones, as the round's plan */
  function plan(W, player, prog, today) {
    var words = inPlay(W, player), pc = playChapter(W, player), set = settings(prog.set);
    var order = {};
    words.forEach(function (w, i) { order[w.id] = i; });
    var due = words.filter(function (w) { return isDue(prog.words[w.id], today); });
    due.sort(function (a, b) {
      var sa = (prog.words[a.id] || {}).s || "", sb = (prog.words[b.id] || {}).s || "";
      return sa < sb ? -1 : sa > sb ? 1 : order[a.id] - order[b.id];
    });
    due = due.slice(0, MAX_DUE);
    var nt = (prog.nights || {})[today], room = Math.max(0, set.perNight - (nt ? nt.met || 0 : 0) - (nt ? nt.early || 0 : 0));
    /* new words: Citizens never asked (a Citizen met before is review, among the due words) */
    var citizens = words.filter(function (w) { return officeOf(prog, w.id) === 0 && unmet(prog.words[w.id]); });
    var byOrder = function (a, b) { return order[a.id] - order[b.id]; };
    var cur = citizens.filter(function (w) { return w.ch === pc; }).sort(byOrder);
    var early = citizens.filter(function (w) { return w.ch < pc; }).sort(byOrder);
    var meet = cur.slice(0, room), straight = early.slice(0, Math.max(0, room - meet.length));
    return { due: due, meet: meet, early: straight, chapter: pc };
  }
  /* New words of the chapter are met on a card, then asked a little later; earlier chapters' Citizens
     and the due words are asked straight away. Two new words at a time, each asked after two others. */
  function interleave(meets, base) {
    var out = [], pend = [], m = meets.slice(), b = base.slice();
    while (m.length || b.length || pend.length) {
      if (pend.length && pend[0].wait <= 0) { out.push({ t: "ask", id: pend.shift().id, fresh: true }); continue; }
      if (m.length && !pend.length) {
        var two = m.splice(0, m.length === 3 ? 3 : 2);   /* never one left alone at the end */
        two.forEach(function (id) { out.push({ t: "meet", id: id }); });
        two.forEach(function (id, k) { pend.push({ id: id, wait: 2 + k }); });
        continue;
      }
      if (b.length) { out.push(b.shift()); pend.forEach(function (p) { p.wait--; }); continue; }
      if (pend.length) { out.push({ t: "ask", id: pend.shift().id, fresh: true }); continue; }
    }
    return out;
  }
  function buildRound(W, player, prog, today, seed) {
    var p = plan(W, player, prog, today), r = rngOf(seed);
    /* the due words in their order, the earlier Citizens spread among them */
    var base = p.due.map(function (w) { return { t: "ask", id: w.id }; });
    p.early.forEach(function (w) { base.splice(r.int(base.length + 1), 0, { t: "ask", id: w.id, early: true }); });
    return {
      day: today, i: 0, chapter: p.chapter,
      items: interleave(p.meet.map(function (w) { return w.id; }), base),
      counts: { due: p.due.length, meet: p.meet.length, early: p.early.length },
      log: []
    };
  }
  /* a missed word comes back once more at the end of tonight's round, at its new office's question */
  function requeue(round, id) {
    var i;
    for (i = round.i + 1; i < round.items.length; i++) { if (round.items[i].id === id && round.items[i].again) { return false; } }
    round.items.push({ t: "ask", id: id, again: true });
    return true;
  }

  /* --------------------------------------------------------- wrong choices */
  /* the words a choice question may use against w, best first */
  function choicePool(W, w, player) {
    var g = player ? player.grade : (W.chapters[String(w.ch)] || {}).grade;
    var pc = player ? playChapter(W, player) : w.ch;
    var all = gradeWords(W, g).filter(function (x) { return drilled(x) && x.id !== w.id && x.pos !== "form" && x.pos !== "phrase"; });
    var same = function (x) { return x.pos === w.pos; };
    var kin = function (x) { return x.pos !== w.pos && FUNC.indexOf(w.pos) >= 0 && FUNC.indexOf(x.pos) >= 0; };
    return [
      all.filter(function (x) { return same(x) && x.ch <= pc; }),
      all.filter(function (x) { return same(x) && x.ch > pc; }),
      all.filter(function (x) { return kin(x) && x.ch <= pc; }),
      all.filter(function (x) { return kin(x) && x.ch > pc; })
    ];
  }
  function choiceText(kind, w) { return kind === "quaestor" ? english(w) : w.hw; }
  function choiceKey(kind, text) { return kind === "quaestor" ? S.norm(text) : key(text); }
  function pickWords(W, w, player, kind, r, n) {
    var tiers = choicePool(W, w, player), out = [], keys = {};
    keys[choiceKey(kind, choiceText(kind, w))] = 1;
    tiers.forEach(function (tier) {
      if (out.length >= n) { return; }
      var ok = tier.filter(function (x) { return !related(w, x); });
      var look = S.shuffle(ok.filter(function (x) { return lookalike(w, x); }), r);
      var rest = S.shuffle(ok.filter(function (x) { return !lookalike(w, x); }), r);
      look.concat(rest).forEach(function (x) {
        if (out.length >= n) { return; }
        var k = choiceKey(kind, choiceText(kind, x));
        if (keys[k]) { return; }
        keys[k] = 1;
        out.push(x);
      });
    });
    return out;
  }
  /* Quaestor (Latin -> English) and Aedile (English -> Latin): four choices */
  function choiceQuestion(W, w, kind, player, seed) {
    var r = rngOf(seed), wrong = pickWords(W, w, player, kind, r, 3);
    var choices = S.shuffle([{ text: choiceText(kind, w), id: w.id, ok: true }].concat(wrong.map(function (x) { return { text: choiceText(kind, x), id: x.id, ok: false }; })), r);
    return { kind: kind, id: w.id, choices: choices };
  }

  /* ------------------------------------------------------ the Praetor tiles */
  /* Real Latin that the look-alike rules would build: never offered as a wrong tile. dextera, dexterum are the
     longer forms of dextra, dextrum (Vergil; Lewis & Short: dexter, -tera, -terum). Contracted genitives
     (fīlī, cōnsilī) and -iī perfects (audiī) are not built by the rules; check.js tests for them too. */
  var VARIANTS = ["dextera", "dexterum"];
  function pickForms(right, groups, n, r, avoid) {
    var keys = {}, out = [];
    keys[key(right)] = 1;
    (avoid || []).concat(VARIANTS).forEach(function (a) { keys[key(a)] = 1; });
    groups.forEach(function (gr) {
      S.shuffle(gr.filter(Boolean), r).forEach(function (c) {
        if (out.length >= n) { return; }
        var k = key(c);
        if (!k || keys[k]) { return; }
        keys[k] = 1;
        out.push(c);
      });
    });
    return out;
  }
  function tiles(right, wrongs, r, okToo) {
    var list = [{ text: right, ok: true }].concat(wrongs.map(function (x) { return { text: x, ok: has(okToo, x) }; }));
    return S.shuffle(list, r);
  }
  /* every Latin word printed in the entry: never offered as a wrong form (amīcae is right for amīca) */
  function entryTokens(w) {
    var t = String(w.lat || "").replace(/\([^)]*\)/g, " ").split(/[\s,;?]+/).filter(function (x) { return /[a-zāēīōū]/i.test(x) && x.length > 1; });
    return t.concat(w.pp || [], w.forms || [], w.gen ? [w.gen] : [], [w.hw]);
  }
  var SG_ENDS = ["ēī", "eī", "ae", "is", "ūs", "ī"];
  var PL_ENDS = ["ārum", "ōrum", "ium", "uum", "ērum", "um"];
  function cut(form, ends) {
    for (var i = 0; i < ends.length; i++) { if (form.length > ends[i].length && form.slice(-ends[i].length) === ends[i]) { return form.slice(0, -ends[i].length); } }
    return null;
  }
  /* wrong genitives: the base with the other declensions' genitive endings (portae / portī / portis / portūs) */
  function genCands(hw, gen, plural, decl) {
    var base = cut(gen, plural ? PL_ENDS : SG_ENDS), look = [], rest = [], late = [];
    var d = String(decl || "");
    if (base == null) { base = gen.slice(0, -1); }
    var add = function (list, ends) { ends.forEach(function (e) { if (base.length >= 2) { list.push(base + e); } }); };
    if (plural) { add(rest, ["ārum", "ōrum", "um", "ium", "uum", "ērum"]); }
    else { add(rest, ["ae", "ī", "is", "ūs"]); add(late, ["eī"]); }
    if (!plural && /^3/.test(d) && /[^sx]$/.test(hw) && key(hw + "is") !== key(gen)) { look.push(hw + "is"); }   /* flūmenis */
    if (!plural && /^2/.test(d) && /er$/.test(hw)) {
      if (gen === hw + "ī") { look.push(hw.slice(0, -2) + "rī"); }          /* puer, purī */
      else { look.push(hw + "ī"); }                                          /* ager, agerī */
    }
    if (!plural && /^5/.test(d)) { look.push(hw.replace(/s$/, "") + "ris", gen.replace(/ī$/, "") + "is"); }   /* rēris, reis */
    return { look: look, rest: rest, late: late };
  }
  function nounRows(w, r) {
    var rows = [], avoid = entryTokens(w);
    if (w.gen) {
      var right = w.gen, c;
      if (right.indexOf(" ") > 0) {
        /* rēs pūblica, reī pūblicae: one word wrong at a time */
        var g = right.split(" "), h = String(w.hw).split(" ");
        var a = genCands(h[0], g[0], w.plural, w.decl), b = genCands(h[1] || "", g[1], w.plural, "1");
        var b2 = cut(g[1], SG_ENDS) || g[1].slice(0, -1);
        c = {
          look: [h[0] + " " + g[1], g[0] + " " + (h[1] || "")],
          rest: a.look.concat(a.rest).map(function (x) { return x + " " + g[1]; }).concat(["ī", "is"].map(function (e) { return g[0] + " " + b2 + e; })),
          late: []
        };
        avoid = avoid.filter(function (x) { return x !== w.hw; }).concat([right]);
      } else {
        c = genCands(w.hw, right, w.plural, w.decl);
      }
      rows.push({ key: "gen", label: w.plural ? "Genitive plural" : "Genitive", sub: "the 2nd part", tiles: tiles(right, pickForms(right, [c.look, c.rest, c.late], 3, r, avoid.filter(function (x) { return x !== right; })), r) });
    }
    if (w.takes && !w.gen) {
      rows.push(caseRow(w, r));
      return rows;
    }
    if (w.g) {
      var oks = String(w.g).split(/\s+and\s+/).map(function (x) { return GENDERS[x.trim()]; }).filter(Boolean);
      var list = ["m.", "f.", "n."];
      rows.push({ key: "gender", label: "Gender", sub: "m., f. or n.", tiles: list.map(function (x) { return { text: x, ok: oks.indexOf(x) >= 0, sub: GENDER_NAME[x] }; }) });
    }
    return rows;
  }
  function caseRow(w, r) {
    var right = CASES[w.takes] || CASES.abl;
    var list = w.takes === "gen" ? [CASES.gen, CASES.abl, CASES.acc] : [CASES.abl, CASES.acc, "+ dative"];
    return { key: "case", label: "Case", sub: "used with which case?", tiles: S.shuffle(list, r).map(function (x) { return { text: x, ok: x === right }; }) };
  }
  /* Part of speech. Never a wrong tile the word can also be: one named in its entry ("adverb, preposition"),
     nor "pronoun" for an adjective (quī? quae? quod? is also the relative pronoun of chapter 17). */
  function posRow(w, r) {
    var as = asText(w).toLowerCase();
    var pool = FUNC.indexOf(w.pos) >= 0 ? FUNC.filter(function (x) { return x !== w.pos; })
      : w.pos === "adjective" ? ["adverb", "conjunction", "interjection"]
      : w.pos === "verb" ? ["adverb", "conjunction", "interjection"]
      : ["adverb", "conjunction", "pronoun", "interjection"].filter(function (x) { return x !== w.pos; });
    pool = pool.filter(function (x) { return as.indexOf(x) < 0; });
    var wrong = S.shuffle(pool, r).slice(0, 3);
    return { key: "pos", label: "Part of speech", sub: "what kind of word?", tiles: tiles(w.pos, wrong, r) };
  }
  function adjRows(w, r) {
    var avoid = entryTokens(w), rows = [];
    /* quī? quae? quod?: its other forms would be tiled against real forms of quī (quārum, quās), so it is asked
       its part of speech instead; Erase Away still erases quae and quod */
    if (w.forms && w.forms.length && w.type !== "interrogative") {
      var plural = /ī$/.test(w.hw) && /ae$/.test(w.forms[0]);
      w.forms.forEach(function (right, i) {
        var label = w.forms.length >= 2 ? (i === 0 ? "Feminine" : "Neuter") : "Neuter";
        var ends, base;
        if (/ae$/.test(right)) { base = right.slice(0, -2); ends = ["a", "ās", "ārum", "īs", "am"]; }
        else if (/a$/.test(right) && plural) { base = right.slice(0, -1); ends = ["um", "ōrum", "īs", "ōs"]; }
        else if (/a$/.test(right)) { base = right.slice(0, -1); ends = ["ae", "ī", "am", "ō"]; }
        else if (/um$/.test(right)) { base = right.slice(0, -2); ends = ["ī", "ō", "us"]; }
        else if (/e$/.test(right)) { base = right.slice(0, -1); ends = ["a", "um", "ī", "ia"]; }
        else { base = right; ends = ["a", "um", "ī"]; }
        var look = [];
        if (/er$/.test(w.hw)) {
          if (right.indexOf(w.hw) === 0) { look.push(w.hw.slice(0, -2) + "r" + right.slice(w.hw.length)); }   /* aspera / aspra */
          else { look.push(w.hw + right.slice(w.hw.length - 1)); }                                             /* dextra / dextera */
        }
        rows.push({ key: "form" + i, label: label, sub: i === 0 && w.forms.length >= 2 ? "the 2nd form" : "the " + (w.forms.length >= 2 ? "3rd" : "2nd") + " form",
          tiles: tiles(right, pickForms(right, [look, ends.map(function (e) { return base + e; }), ["am", "e"].map(function (e) { return base + e; })], 3, r, avoid.filter(function (x) { return x !== right; })), r) });
      });
      return rows;
    }
    if (w.gen) {
      var g = w.gen, b = cut(g, ["is"]) || g.slice(0, -1);
      rows.push({ key: "gen", label: "Genitive", sub: "one ending: the genitive", tiles: tiles(g, pickForms(g, [[w.hw + "is"], ["ī", "ae", "ūs", "eī"].map(function (e) { return b + e; })], 3, r, avoid.filter(function (x) { return x !== g; })), r) });
      return rows;
    }
    return [posRow(w, r)];
  }
  /* the principal parts' present base, by conjugation */
  function verbBase(w) {
    var p0 = w.pp[0], c = String(w.conj || "");
    if (/^1/.test(c)) { return p0.replace(/(ō|or)$/, ""); }
    if (/^2/.test(c)) { return p0.replace(/(eō|eor)$/, ""); }
    if (/^3 \(-iō\)/.test(c) || /^4/.test(c)) { return p0.replace(/(iō|ior)$/, ""); }
    if (/^3/.test(c)) { return p0.replace(/(ō|or)$/, ""); }
    return p0.replace(/(ō|ī|t)$/, "");
  }
  function partName(right, i, passive) {
    if (/ sum$/.test(right)) { return "perfect"; }
    if (/(re|isse)$/.test(right) || (i === 1 && passive && /ī$/.test(right))) { return "infinitive"; }
    if (/ī$/.test(right)) { return "perfect"; }
    return "participle";
  }
  /* wrong principal parts: the other conjugations' patterns (vidēre / vidāre / vidīre; vīdī / vidēvī / viduī; vīsum / vidētum / viditum) */
  function partCands(w, i) {
    var b = verbBase(w), right = w.pp[i], passive = /or$/.test(w.pp[0]), io = /iō$/.test(w.pp[0]) && /^(3 \(-iō\)|4)/.test(String(w.conj || ""));
    var map = function (ends) { return ends.map(function (e) { return b + e; }); };
    if (io) {
      /* capiō, sciō: the i stays in most patterns (rapiāre, sciēre) */
      var bi = b + "i";
      if (/re$/.test(right)) { return [bi + "āre", bi + "ēre", bi + "ere", b + "īre", b + "ere"]; }
      if (/um$/.test(right)) { return [bi + "ātum", bi + "ētum", b + "ītum", b + "itum"]; }
      if (/ī$/.test(right)) { return [bi + "āvī", bi + "ēvī", bi + "uī", b + "īvī", b + "ī"]; }
    }
    if (/ sum$/.test(right)) { return map(["ātus sum", "itus sum", "ītus sum", "ētus sum"]); }
    if (/ūrum$/.test(right)) { return map(["ātūrum", "itūrum", "ītūrum", "ētūrum"]); }
    if (/isse$/.test(right)) { return map(["āre", "ēre", "īre", "ere"]); }
    if (i === 1 && passive) { return map(["ārī", "ērī", "ī", "īrī"]); }
    if (/re$/.test(right)) { return map(["āre", "ēre", "ere", "īre"]).concat(io ? [b + "iere", b + "iāre"] : []); }
    if (/um$/.test(right)) { return map(["ātum", "itum", "ītum", "ētum"]); }
    if (/ī$/.test(right)) { return map(["āvī", "uī", "īvī", "ēvī", "ī"]); }
    return map(["āre", "ēre", "īre"]);
  }
  var PART_LABEL = ["1st part", "2nd part", "3rd part", "4th part"];
  function verbRows(w, r) {
    if (!w.pp || w.pp.length < 2) { return [posRow(w, r)]; }
    var avoid = entryTokens(w), passive = /or$/.test(w.pp[0]);
    return w.pp.slice(1).map(function (right, k) {
      var i = k + 1;
      return { key: "pp" + i, label: PART_LABEL[i] || ordinal(i + 1) + " part", sub: partName(right, i, passive),
        tiles: tiles(right, pickForms(right, [partCands(w, i)], 3, r, avoid.filter(function (x) { return x !== right; })), r) };
    });
  }
  function praetorRows(w, seed) {
    var r = rngOf(seed);
    if (w.pos === "noun") { var nr = nounRows(w, r); return nr.length ? nr : [posRow(w, r)]; }
    if (w.pos === "adjective") { return adjRows(w, r); }
    if (w.pos === "verb") { return verbRows(w, r); }
    if (w.takes) { return [caseRow(w, r)]; }
    return [posRow(w, r)];
  }
  /* how the entry is shown with its blanks: [{t: text} | {b: row index}] */
  function praetorShow(w, rows) {
    var out = [], first = w.pos === "verb" && w.pp ? w.pp[0] : w.hw;
    out.push({ t: first, la: true });
    rows.forEach(function (row, i) {
      if (row.key === "gen" && w.pos === "adjective") { out.push({ t: ", (gen.) " }); }
      else if (row.key === "case") { out.push({ t: " " }); }
      else if (row.key === "pos") { out.push({ t: " — " }); }
      else { out.push({ t: ", " }); }
      out.push({ b: i });
    });
    return out;
  }
  function praetorQuestion(w, seed) {
    var rows = praetorRows(w, seed);
    return { kind: "praetor", id: w.id, rows: rows, show: praetorShow(w, rows) };
  }

  /* --------------------------------------------------------- typed answers */
  /* the second entry of a paired noun: "amīcus, amīcī (m.), and amīca, amīcae (f.)" -> amīca, amīcae, f. */
  function pairEntry(w) {
    if (w.pos !== "noun") { return null; }
    var m = /(,\s*and\s+|;\s*)([^,;()]+?),\s*([^,;()]+?)\s*\((m|f|n)\.\)\s*$/.exec(String(w.lat || ""));
    if (!m) { return null; }
    var first = /\((m|f|n)\.\)/.exec(String(w.lat).slice(0, m.index));
    return { sep: /and/.test(m[1]) ? ", and " : "; ", hw: m[2].trim(), gen: m[3].trim(), g: m[4], g1: first ? first[1] : "" };
  }
  /* Every headword the entry prints is a right typed answer: the headword, its `alt` spellings, each piece of a
     "quis? quid?" headword (and both together), and the second word of a paired noun (amīca for amīcus). */
  function consulAnswers(w) {
    var out = [w.hw].concat(w.alt || []);
    var pieces = String(w.hw).split(/[?!]/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (pieces.length > 1) { out = out.concat(pieces); }
    var pe = pairEntry(w);
    if (pe) { out.push(pe.hw); }
    return uniq(out);
  }
  function consulQuestion(w) { return { kind: "consul", id: w.id, prompt: ask(w), tag: tagOf(w), answers: consulAnswers(w) }; }
  /* the typed full entry (a Consul's other weekly question): null when the word has nothing to type */
  function typedRows(w) {
    if (w.pos === "noun" && w.gen && w.gen.indexOf(" ") < 0) {
      var oks = String(w.g || "").split(/\s+and\s+/).map(function (x) { return GENDERS[x.trim()]; }).filter(Boolean);
      var rows = [{ key: "gen", label: w.plural ? "Genitive plural" : "Genitive", type: true, answers: [w.gen] }];
      if (oks.length) { rows.push({ key: "gender", label: "Gender", tiles: ["m.", "f.", "n."].map(function (x) { return { text: x, ok: oks.indexOf(x) >= 0, sub: GENDER_NAME[x] }; }) }); }
      return rows;
    }
    if (w.pos === "adjective" && w.forms && w.forms.length) {
      return w.forms.map(function (f, i) { return { key: "form" + i, label: w.forms.length >= 2 ? (i === 0 ? "Feminine" : "Neuter") : "Neuter", type: true, answers: [f] }; });
    }
    if (w.pos === "adjective" && w.gen) { return [{ key: "gen", label: "Genitive", type: true, answers: [w.gen] }]; }
    if (w.pos === "verb" && w.pp && w.pp.length >= 2) {
      var passive = /or$/.test(w.pp[0]);
      return w.pp.slice(1).map(function (p, k) { return { key: "pp" + (k + 1), label: PART_LABEL[k + 1], sub: partName(p, k + 1, passive), type: true, answers: [p] }; });
    }
    return null;
  }
  function typedPraetorQuestion(w, seed) {
    var rows = typedRows(w);
    if (!rows) { return consulQuestion(w); }
    var r = rngOf(seed);
    rows.forEach(function (row) { if (row.tiles) { row.tiles = S.shuffle(row.tiles, r); } });
    return { kind: "praetorT", id: w.id, rows: rows, show: praetorShow(w, rows) };
  }
  /* typed text against the right answers, in the player's macron mode (LatinShell.check: { ok, slip, answer }) */
  function judge(typed, answers, mode) { return S.check(S.longs(String(typed || "")), answers, MACRONS.indexOf(mode) >= 0 ? mode : "light"); }

  /* a typed answer that is another word of the grade (null if none): a near miss when the two share a meaning */
  function typedWord(W, w, typed, player) {
    var t = key(S.norm(S.longs(String(typed || ""))));
    if (!t) { return null; }
    var g = player ? player.grade : (W.chapters[String(w.ch)] || {}).grade, found = null;
    gradeWords(W, g).forEach(function (x) {
      if (found || x.id === w.id || !drilled(x)) { return; }
      if (key(S.norm(x.hw)) === t || (x.alt || []).some(function (a) { return key(S.norm(a)) === t; })) { found = x; }
    });
    return found ? { w: found, near: related(w, found) } : null;
  }
  function tagOf(w) { return w.pos === "noun" && w.plural ? "noun, plural" : w.pos; }

  /* the question for a word at its office */
  function question(W, w, kind, player, seed) {
    if (kind === "quaestor" || kind === "aedile") { var q = choiceQuestion(W, w, kind, player, seed); q.tag = tagOf(w); q.prompt = kind === "aedile" ? ask(w) : w.hw; return q; }
    if (kind === "praetor") { return praetorQuestion(w, seed); }
    if (kind === "praetorT") { return typedPraetorQuestion(w, seed); }
    return consulQuestion(w);
  }

  /* --------------------------------------------------------- the helper */
  function helper(w) {
    return { entry: w.lat, as: asText(w), mean: w.mean, der: w.der || "", hw: w.hw };
  }

  /* ------------------------------------------------------------ Erase Away */
  /* the quiz day: weekly (0 Sunday .. 6 Saturday), one date, or none */
  function weekday(day) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || "")); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1; }
  function quizIn(quiz, today) {
    quiz = settings({ quiz: quiz }).quiz;
    if (quiz.mode === "weekly") { return (quiz.day - weekday(today) + 7) % 7; }
    if (quiz.mode === "date") { var d = S.days(today, quiz.date); return d >= 0 ? d : null; }
    return null;
  }
  function quizEve(quiz, today) { return quizIn(quiz, today) === 1; }
  function quizToday(quiz, today) { return quizIn(quiz, today) === 0; }

  var ERASE_ORDER = [["gen", "forms"], ["gender", "case"], ["parts"], ["mean"]];
  var ERASE_NAMES = ["the genitives", "the genders", "the principal parts", "the meanings"];
  /* An entry as pieces: the first word stays, the others can be erased. The pieces follow the printed entry:
     a paired noun keeps its second word (amīcus, amīcī, m., and amīca, amīcae, f.), a plural-only noun its
     "(pl.)", causā its genitive before it, careō its "+ abl. of separation". */
  function eraseEntry(w) {
    var parts = [], k = 0, lat = String(w.lat || "");
    function add(kind, text, lead, la) { parts.push({ n: k++, k: kind, text: text, lead: lead, la: la !== false }); }
    var head = w.pos === "verb" && w.pp ? w.pp[0] : w.hw;
    if (w.pos === "noun") {
      var pe = pairEntry(w), pl = /\(pl\.\)/.test(lat) ? " (pl.)" : "";
      if (w.gen) { add("gen", w.gen, ", "); }
      if (w.takes && !w.gen) { add("case", w.takes === "gen" ? "(after a gen.)" : CASE_SHORT[w.takes], " ", false); }
      if (pe && pe.g1 && GENDERS[pe.g1] && GENDERS[pe.g]) {
        add("gender", GENDERS[pe.g1] + pl, ", ", false);
        add("forms", pe.hw + ", " + pe.gen, pe.sep);
        add("gender", GENDERS[pe.g], ", ", false);
      } else if (w.g) {
        add("gender", String(w.g).split(/\s+and\s+/).map(function (x) { return GENDERS[x.trim()]; }).join(" and ") + pl, ", ", false);
      }
    } else if (w.pos === "adjective") {
      if (w.forms && w.forms.length) { add("forms", w.forms.join(", "), ", "); }
      else if (w.gen) { add("gen", w.gen, ", (gen.) "); }
    } else if (w.pos === "verb") {
      if (w.pp && w.pp.length > 1) { add("parts", w.pp.slice(1).join(", "), ", "); }
      var note = /\(\s*\+\s*(abl|acc|gen|dat)\.([^)]*)\)/.exec(lat);
      if (note) { add("case", "+ " + note[1] + "." + note[2].replace(/\s+/g, " ").replace(/\s+$/, ""), " ", false); }
    } else if (w.takes) {
      add("case", CASE_SHORT[w.takes], " ", false);
    }
    add("mean", ask(w), "", false);
    return { id: w.id, head: head, pos: w.pos, plural: !!w.plural, parts: parts };
  }
  /* 5 to 7 entries of the chapter, weakest offices first, covering nouns, verbs and one other kind.
     max (5 to 7, optional): fewer entries for a small screen */
  function eraseSet(W, player, prog, seed, max) {
    var r = rngOf(seed), pc = playChapter(W, player);
    var words = inPlay(W, player).filter(function (w) { return w.ch === pc && countable(w) && w.pos !== "phrase"; });
    var order = {};
    words.forEach(function (w, i) { order[w.id] = i; });
    var sorted = S.shuffle(words, r).sort(function (a, b) { return officeOf(prog, a.id) - officeOf(prog, b.id); });
    var n = Math.min(sorted.length, sorted.length >= 12 ? 7 : 6, max ? clamp(max, 5, 7) : 7);
    if (n < 5) {
      /* a short chapter: borrow from the one before */
      var more = inPlay(W, player).filter(function (w) { return w.ch < pc && countable(w); });
      sorted = sorted.concat(S.shuffle(more, r).sort(function (a, b) { return officeOf(prog, a.id) - officeOf(prog, b.id); }));
      n = Math.min(5, sorted.length);
    }
    var pick = [];
    var want = [function (w) { return w.pos === "noun"; }, function (w) { return w.pos === "verb"; }, function (w) { return w.pos === "adjective"; }, function (w) { return w.pos !== "noun" && w.pos !== "verb"; }];
    want.forEach(function (f, i) {
      if (i === 3 && pick.some(function (w) { return w.pos === "adjective"; })) { return; }
      var w = sorted.filter(function (x) { return f(x) && pick.indexOf(x) < 0; })[0];
      if (w && pick.length < n) { pick.push(w); }
    });
    sorted.forEach(function (w) { if (pick.length < n && pick.indexOf(w) < 0) { pick.push(w); } });
    pick.sort(function (a, b) { return (order[a.id] == null ? -1 : order[a.id]) - (order[b.id] == null ? -1 : order[b.id]) || a.ch - b.ch; });
    return pick.map(eraseEntry);
  }
  /* the rounds: 0 the full entries, then one kind of piece more erased each round; rounds with nothing new are left out */
  function eraseRounds(entries, seed) {
    var r = rngOf(seed), rounds = [{ n: 0, erase: [], adds: [], blanks: [], chips: [] }], gone = [];
    ERASE_ORDER.forEach(function (kinds, i) {
      var adds = [];
      entries.forEach(function (e) { e.parts.forEach(function (p) { if (kinds.indexOf(p.k) >= 0) { adds.push({ id: e.id, n: p.n }); } }); });
      if (!adds.length) { return; }
      gone = gone.concat(kinds);
      var blanks = [];
      entries.forEach(function (e) { e.parts.forEach(function (p) { if (gone.indexOf(p.k) >= 0) { blanks.push({ id: e.id, n: p.n, k: p.k, text: p.text }); } }); });
      rounds.push({ n: rounds.length, step: i + 1, name: ERASE_NAMES[i], kinds: kinds.slice(), erase: gone.slice(), adds: adds, blanks: blanks,
        chips: S.shuffle(blanks.map(function (b, j) { return { j: j, text: b.text, k: b.k }; }), r) });
    });
    return rounds;
  }
  /* a chip fits a blank when its text is the blank's text (two "f." chips are the same chip) */
  function chipFits(blank, chip) { return !!blank && !!chip && blank.text === chip.text; }

  /* ------------------------------------------------------- the trick-verb ring */
  function trickVerbs(W, player) { return inPlay(W, player).filter(function (w) { return w.pos === "verb" && w.trick && w.pp && w.pp.length >= 2; }); }
  function ringSet(W, player, seed, n) {
    var r = rngOf(seed);
    return S.shuffle(trickVerbs(W, player), r).slice(0, n || 6).map(function (w) { return { id: w.id, rows: verbRows(w, r) }; });
  }

  /* --------------------------------------------------------- the Senate roll */
  /* filter: "chapter" (tonight's chapter), "play" (all in play), "grade" (the whole grade, unready chapters too) */
  function roll(W, player, prog, filter) {
    var g = player.grade, pc = playChapter(W, player);
    return gradeChapters(W, g).filter(function (ch) {
      if (filter === "chapter") { return ch === pc; }
      if (filter === "play") { return ch <= pc && isReady(W, ch); }
      return true;
    }).map(function (ch) {
      var c = W.chapters[String(ch)] || {};
      return {
        ch: ch, title: c.title || "", month: c.month || "", ready: !!c.ready, inPlay: ch <= pc && !!c.ready,
        words: W.words.filter(function (w) { return w.ch === ch && (filter === "grade" || drilled(w) || w.pos === "form" || w.pos === "phrase"); }).map(function (w) {
          return { w: w, office: drilled(w) && ch <= pc && c.ready ? officeOf(prog, w.id) : null, drilled: drilled(w) };
        })
      };
    });
  }

  var ClimbLogic = {
    OFFICES: OFFICES, KINDS: KINDS, MAX_DUE: MAX_DUE, CONSUL_DAYS: CONSUL_DAYS, NEW_MIN: NEW_MIN, NEW_MAX: NEW_MAX, NEW_DEFAULT: NEW_DEFAULT,
    MACRONS: MACRONS, CASES: CASES, ERASE_ORDER: ERASE_ORDER, ERASE_NAMES: ERASE_NAMES,
    key: key, lev: lev, lookalike: lookalike, asText: asText, ordinal: ordinal, splitTop: splitTop,
    senses: senses, normSense: normSense, english: english, related: related, ask: ask, senseBase: senseBase, NEAR: NEAR, VARIANTS: VARIANTS, pairEntry: pairEntry, unmet: unmet,
    gradeChapters: gradeChapters, readyChapters: readyChapters, lastReady: lastReady, playChapter: playChapter, isReady: isReady,
    gradeWords: gradeWords, inPlay: inPlay, countable: countable, canPlay: canPlay, behind: behind,
    fresh: fresh, settings: settings, load: load, night: night, officeOf: officeOf, isDue: isDue, hill: hill,
    kindFor: kindFor, apply: apply, plan: plan, interleave: interleave, buildRound: buildRound, requeue: requeue,
    choicePool: choicePool, choiceQuestion: choiceQuestion, praetorRows: praetorRows, praetorQuestion: praetorQuestion, praetorShow: praetorShow,
    verbRows: verbRows, entryTokens: entryTokens, consulAnswers: consulAnswers, consulQuestion: consulQuestion, typedRows: typedRows,
    typedPraetorQuestion: typedPraetorQuestion, judge: judge, typedWord: typedWord, tagOf: tagOf, question: question, helper: helper,
    weekday: weekday, quizIn: quizIn, quizEve: quizEve, quizToday: quizToday,
    eraseEntry: eraseEntry, eraseSet: eraseSet, eraseRounds: eraseRounds, chipFits: chipFits,
    trickVerbs: trickVerbs, ringSet: ringSet, roll: roll
  };
  if (root) { root.ClimbLogic = ClimbLogic; }
  if (typeof module !== "undefined" && module.exports) { module.exports = ClimbLogic; }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
