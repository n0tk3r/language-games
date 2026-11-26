/* Row the Endings: the screens. The harbor (home) with Tonight's voyage and every chart in play on the quay,
 * the voyage (a sea strip with the bireme, the chart on parchment, the ending tiles or the typing box, the
 * hortator's drum), the called boxes, the end of the voyage, and the settings.
 * Rules and scheduling are in logic.js (RowLogic); the pictures in art.js (RowArt); the frame in latin-common. */
(function () {
  "use strict";
  var S = window.LatinShell, L = window.RowLogic, A = window.RowArt;
  if (!S || !L || !A) { return; }
  var CH = (window.LATIN_CHARTS && window.LATIN_CHARTS.charts) || [];
  var WD = window.LATIN_WORDS || null;
  var store = S.store("rowTheEndings.v1");
  var doc = document, esc = S.esc;

  doc.body.insertAdjacentHTML("afterbegin", A.DEFS);

  var P = null;          /* the player (a copy) */
  var prog = null;       /* the player's progress: { charts, set, night } */
  var set = L.settings(null);
  var V = null;          /* the voyage being rowed: tonight's (prog.night, kind "night") or one chart (kind "free") */
  var G = null;          /* the leg being rowed */

  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function la(s) { return '<i lang="la">' + esc(s) + "</i>"; }
  function byId(id) { for (var i = 0; i < CH.length; i++) { if (CH[i].id === id) { return CH[i]; } } return null; }
  function stepName(n) { return (L.STEPS[n - 1] || L.STEPS[0]).name; }
  function q(sel, root) { return (root || shell.desk).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || shell.desk).querySelectorAll(sel)); }
  function ord(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"); }
  /* numbers in words, up to ninety-nine ("Fifteen in stroke!") */
  var ONES = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function numWord(n) { return n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "") : String(n); }
  function Cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* how the Inspector names a column: "the porta column", "the perfect column", "the neuter plural column" */
  function colRef(b) {
    if (b.colKind === "gender") { return "the " + L.GENDER[b.w] + " " + esc(String(b.block || "").toLowerCase()) + " column"; }
    if (b.colKind === "tense") { return "the " + esc(b.w) + " column"; }
    return "the " + la(b.who) + " column";
  }
  /* the line when the boxes move on to a new column */
  function colLine(b) {
    if (b.colKind === "gender") { return "Now the " + L.GENDER[b.w] + " " + esc(String(b.block || "").toLowerCase()) + ": " + la(b.entry) + "."; }
    if (b.colKind === "tense") { return "Now the " + esc(b.w) + ": " + la(b.entry) + "."; }
    return "Now the " + la(b.who) + " column.";
  }
  /* what a box shows at Calm water, in words: "The base is in each box", "laudātus is in each box", or nothing (pronouns) */
  function calmWhat(b) {
    if (!b || !b.s) { return null; }
    return /\s$/.test(b.s) ? { line: la(b.s.trim()) + " is in each box.", tap: "Tap the word that goes with it" } : { line: "The base is in each box.", tap: "Tap its ending" };
  }

  /* ------------------------------------------------------------- sound: the drum, the oars */
  var Snd = (function () {
    var ctx = null, master = null, nbuf = null;
    function on() { try { return !!S.settings().sound; } catch (e) { return true; } }
    function ensure() {
      if (!on()) { return false; }
      try {
        if (!ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) { return false; }
          ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
        }
        if (ctx.state !== "running" && ctx.resume) { var p = ctx.resume(); if (p && p.catch) { p.catch(function () {}); } }
        return ctx.state === "running";
      } catch (e) { return false; }
    }
    ["pointerdown", "keydown", "touchend"].forEach(function (t) { window.addEventListener(t, function () { if (on()) { ensure(); } }, true); });
    function ready() { return on() && ctx && ctx.state === "running"; }
    function noise() {
      if (!nbuf) { var n = Math.floor(ctx.sampleRate * 0.6); nbuf = ctx.createBuffer(1, n, ctx.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < n; i++) { d[i] = Math.random() * 2 - 1; } }
      var s = ctx.createBufferSource(); s.buffer = nbuf; return s;
    }
    function burst(at, dur, vol, type, f0, f1, qv) {
      var t = ctx.currentTime + at, s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) { f.frequency.exponentialRampToValueAtTime(f1, t + dur); } f.Q.value = qv || 0.8;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
    }
    function tone(at, dur, vol, type, f0, f1) {
      var t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) { o.frequency.exponentialRampToValueAtTime(f1, t + dur); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    return {
      /* a soft, low thump: the hortator's drum */
      drum: function (accent) { if (!ready()) { return; } try { tone(0, 0.34, accent ? 0.55 : 0.42, "sine", 104, 46); burst(0, 0.09, accent ? 0.2 : 0.14, "lowpass", 420); } catch (e) { /* silent */ } },
      /* the oars dip: a little splash */
      splash: function () { if (!ready()) { return; } try { burst(0, 0.24, 0.13, "bandpass", 900, 2600, 0.9); burst(0.03, 0.14, 0.05, "highpass", 3200); } catch (e) { /* silent */ } },
      /* the oars clash: two wooden knocks */
      clash: function () { if (!ready()) { return; } try { [0, 0.085].forEach(function (at, i) { burst(at, 0.07, 0.34, "bandpass", i ? 760 : 1050, null, 5); tone(at, 0.09, 0.16, "triangle", i ? 210 : 260, i ? 150 : 190); }); } catch (e) { /* silent */ } },
      /* the Corvus's oars, farther out: a soft, low splash */
      far: function (vol) { if (!ready()) { return; } try { burst(0, 0.2, vol || 0.05, "bandpass", 620, 1500, 0.8); } catch (e) { /* silent */ } },
      /* a cornu (the Roman horn): two brassy notes, G then B, through a lowpass */
      horn: function () {
        if (!ready()) { return; }
        try {
          var f = ctx.createBiquadFilter(), t0 = ctx.currentTime;
          f.type = "lowpass"; f.frequency.value = 900; f.Q.value = 0.9; f.connect(master);
          [[0, 0.2, 196], [0.18, 0.32, 247]].forEach(function (n) {
            var o = ctx.createOscillator(), g = ctx.createGain(), t = t0 + n[0];
            o.type = "sawtooth"; o.frequency.setValueAtTime(n[2] * 0.985, t); o.frequency.exponentialRampToValueAtTime(n[2], t + 0.05);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.035); g.gain.setValueAtTime(0.12, t + n[1] - 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
            o.connect(g); g.connect(f); o.start(t); o.stop(t + n[1] + 0.05);
          });
        } catch (e) { /* silent */ }
      }
    };
  })();

  /* ------------------------------------------------------------------ the shell */
  var shell = S.mount({
    id: "row",
    folder: "row-the-endings",                       /* the front page sends the child back here after picking a player */
    title: "Row the Endings",
    sub: "Wheelock’s Latin · charts",
    logo: A.LOGO,
    hello: "",
    onHome: function () { leave(); home(); },
    onSettings: openSettings,
    filesIn: function (grade) { return L.chaptersWithCharts(L.gradeCharts(CH, grade, WD)); },
    starsOf: function (p) {
      var x = store.load(p.id), n = 0;
      if (x && x.charts) { Object.keys(x.charts).forEach(function (k) { (x.charts[k].passed || []).forEach(function (v) { if (v) { n++; } }); }); }
      return n || null;
    },
    onPlayer: function (p, how) {
      leave();
      P = p || { id: "guest", name: "Sailor", grade: 6, chapter: 2, color: "#b3202a" };
      prog = loadProg(P.id);
      set = L.settings(prog.set);
      home(how);
    }
  });

  function loadProg(id) {
    var x = store.load(id);
    if (!x || typeof x !== "object") { x = L.fresh(); }
    x.charts = x.charts && typeof x.charts === "object" ? x.charts : {};
    x.set = L.settings(x.set);
    x.race = L.raceRec(x);
    if (x.night && (typeof x.night !== "object" || !Array.isArray(x.night.legs))) { x.night = null; }
    return x;
  }
  function save() { if (P && prog) { prog.set = set; store.save(P.id, prog); } }

  function list() { return L.inPlay(CH, P, WD); }
  function cur() { return L.playChapter(CH, P, WD); }

  /* tonight's voyage: made once a day (and again if the grade or chapter changes). Until its first leg is rowed it
     is made afresh each time, so a chart rowed from the quay first is planned at its next step. */
  function tonight(again) {
    var day = S.today(), n = prog.night;
    var untouched = n && !n.done && !n.at && !n.called && !(n.played || []).some(Boolean);
    if (again || !n || untouched || n.day !== day || n.grade !== P.grade || n.chapter !== P.chapter || !n.legs.length ||
        n.legs.some(function (l) { return !l.called && !byId(l.id); })) {
      n = { day: day, grade: P.grade, chapter: P.chapter, legs: L.voyage(prog, list(), cur(), day), at: 0, played: [], called: null, done: false };
      prog.night = n;
      save();
    }
    return n;
  }

  /* ------------------------------------------------------------- top bar: tonight's legs */
  /* the pips sit in the top bar on laptops; below 900 px the bar has no room, so the sea strip says "Leg 2 of 4" */
  function legText() { return V && V.legs.length > 1 ? "Leg " + (Math.min(V.at, V.legs.length - 1) + 1) + " of " + V.legs.length : ""; }
  function pips() {
    var tag = q(".legtag");
    if (tag) { tag.textContent = legText(); tag.hidden = !legText(); }
    if (!V || V.legs.length < 2) { shell.mid.innerHTML = ""; return; }
    shell.mid.innerHTML = '<ol class="pips" aria-label="' + legText() + '">' + V.legs.map(function (l, i) {
      return '<li class="' + (i < V.at ? "done" : i === V.at ? "cur" : "") + (l.called ? " bell" : "") + '"></li>';
    }).join("") + "</ol>";
  }

  /* ----------------------------------------------------------------------- home */
  function stepLine(chart, step) { return "Chapter " + chart.ch + " · " + stepName(step); }
  function minutes(legs) {
    var sec = 0;
    legs.forEach(function (l) {
      if (l.called) { sec += 8 * 7; return; }
      var c = byId(l.id); if (!c) { return; }
      var n = L.boxes(c, { voc: L.vocShown(c, set.voc) }).length;
      sec += n * (l.step === 3 ? 7 : l.step === 2 ? 3.2 : 3.6) + 20;
    });
    return Math.max(3, Math.round(sec / 60));
  }
  function pennants(id, compact) {
    var r = L.rec(prog, id), nx = L.nextStep(prog, id);
    return [1, 2, 3].map(function (s) {
      var st = r.passed[s - 1] ? "done" : s === nx ? "next" : L.unlocked(prog, id, s) ? "open" : "lock";
      var b = r.best[s - 1];
      return '<span class="qp qp-' + st + '">' + A.pennant(st) + (compact ? "" : '<small class="qp-n">' + esc(L.STEPS[s - 1].short) + "</small>") +
        '<small class="qp-s">' + (b ? b.got + "/" + b.of : "&nbsp;") + "</small></span>";
    }).join("");
  }
  function cardLabel(c) {
    var r = L.rec(prog, c.id), parts = [c.title + ", chapter " + c.ch + "."];
    [1, 2, 3].forEach(function (s) {
      var b = r.best[s - 1];
      parts.push(stepName(s) + (r.passed[s - 1] ? ": passed" : L.unlocked(prog, c.id, s) ? ": open" : ": locked") + (b ? ", best " + b.got + " of " + b.of : "") + ".");
    });
    return parts.join(" ");
  }

  function home(how) {
    leave();
    V = null;
    shell.compact(false);
    pips();
    var lst = list(), c = cur(), p = P;
    var gi = null;
    try { gi = window.LatinPlayers && LatinPlayers.gradeInfo ? LatinPlayers.gradeInfo(p.grade) : null; } catch (e) { gi = null; }
    if (!lst.length) {
      shell.desk.innerHTML = '<div class="view rh rh-none"><div class="rh-scene">' + A.scene() + "</div>" +
        '<section class="card"><h2>The charts for the ' + ord(p.grade) + " grade are on their way.</h2>" +
        "<p>Row the Endings has Wheelock’s charts for the 6th grade (chapters 1 to 3) and the 8th grade (chapters 18 to 22) so far. Change the chapter or the player from the chip at the top.</p>" +
        '<div class="dock"><button type="button" class="btn primary" data-a="chapter" data-enter>Change chapter</button></div></section></div>';
      q('[data-a="chapter"]').addEventListener("click", function () { shell.changeChapter(); });
      shell.say(["Ahoy, <b>" + esc(p.name) + "</b>!", "The " + ord(p.grade) + " grade’s charts are still being drawn.", "They are on their way."], ["wave", "think", "idle"]);
      return;
    }
    var n = tonight(false);
    var firstCh = lst.reduce(function (m, x) { return Math.min(m, x.ch); }, 99);
    var html = '<div class="view rh">' +
      '<div class="rh-a">' +
        '<div class="rh-scene">' + A.scene() + '<span class="rh-tag">Portus · ' + esc(ord(p.grade)) + " grade · Chapter " + c + "</span></div>" +
        nightCard(n) +
      "</div>" +
      '<div class="rh-b">' +
        '<div class="rh-qh"><h2 class="desk-h">The quay</h2><p class="desk-p">Every chart in play. Tap a ship to row it at any step it has open.</p></div>' +
        '<ul class="rh-quay">' + lst.map(function (x) {
          var mine = x.ch === c;
          return '<li><button type="button" class="qs' + (mine ? " mine" : "") + '" data-id="' + esc(x.id) + '" aria-label="' + esc(cardLabel(x)) + '">' +
            '<span class="qs-ship">' + A.miniShip() + "</span>" +
            '<span class="qs-t"><b>' + esc(x.title) + "</b><small>" + (mine ? '<span class="qs-now">Chapter ' + x.ch + "</span> " : "Chapter " + x.ch + " · ") + esc(x.sub || "") + "</small></span>" +
            '<span class="qs-pens" aria-hidden="true">' + pennants(x.id) + "</span></button></li>";
        }).join("") + "</ul>" +
        /* a short quay leaves room on a laptop: how a chart is rowed, step by step (hidden on smaller screens) */
        (lst.length <= 4 ? '<section class="card tabbed rh-steps" aria-label="The three steps"><span class="card-tab">The three steps</span><ol>' +
          [["Calm water", "The base is in each box. Tap the ending."], ["Open sea", "A third of the boxes are filled. Tap the other endings."], ["Storm", set.typing ? "A blank chart. Type each whole form." : "A blank chart. Tap each ending."]].map(function (x, i) {
            return '<li><span class="lg-ic">' + A.stepIcon(i + 1) + '</span><span class="lg-t"><b>' + esc(x[0]) + "</b><small>" + esc(x[1]) + "</small></span></li>";
          }).join("") + '</ol><p class="rh-steps-p">' + A.pennant("done") + "<span>At most one missed box passes a step and raises its pennant.</span></p></section>" : "") +
        '<p class="rh-foot"><a class="tlink" href="../latin-common/sources.html">For parents: where the words and charts come from</a>' +
        '<button type="button" class="tlink" data-a="settings">Settings</button></p>' +
      "</div></div>";
    shell.desk.innerHTML = html;
    var go = q('[data-a="sail"]');
    if (go) { go.addEventListener("click", function () { sail(false); }); }
    var again = q('[data-a="again"]');
    if (again) { again.addEventListener("click", function () { sail(true); }); }
    q('[data-a="settings"]').addEventListener("click", openSettings);
    qa(".qs").forEach(function (b) { b.addEventListener("click", function () { pick(byId(b.getAttribute("data-id"))); }); });

    /* the Inspector */
    var lines = [], moods = [];
    var hi = how === "added" ? "Welcome aboard, <b>" + esc(p.name) + "</b>!" : how === "chapter" || how === "update" ? "Chapter " + esc(String(p.chapter)) + ", <b>" + esc(p.name) + "</b>. All aboard!" : "Ahoy, <b>" + esc(p.name) + "</b>!";
    lines.push(hi); moods.push("wave");
    if (p.chapter > c) {
      lines.push("Chapter " + p.chapter + "’s charts are on their way; tonight we row chapter" + (c > firstCh ? "s " + firstCh + " to " + c : " " + c) + ".");
      moods.push("think");
    }
    if (n.done) {
      lines.push("Tonight’s voyage is done. Well rowed!"); moods.push("proud");
      lines.push("Row any chart on the quay, or one more voyage."); moods.push("point");
    } else if (n.at > 0) {
      lines.push("We are at sea: leg " + (n.at + 1) + " of " + n.legs.length + "."); moods.push("point");
      lines.push("Tap <b>Row on</b> to pick up the oars."); moods.push("idle");
    } else {
      var l0 = n.legs[0], c0 = byId(l0.id);
      if (how !== "update" && !anyPlayed()) {
        lines.push("Our ship rows one stroke for every box of a chart you fill."); moods.push("point");
      }
      lines.push("Tonight: <b>" + esc(c0.title) + "</b>, in " + stepName(l0.step).toLowerCase() + "."); moods.push("point");
      lines.push("Tap <b>Set sail</b> when you are ready."); moods.push("idle");
    }
    if (how !== "settings") { shell.say(lines, moods); }
  }
  function anyPlayed() { return Object.keys(prog.charts || {}).length > 0; }

  function nightCard(n) {
    var legs = n.legs, at = n.at;
    var items = legs.map(function (l, i) {
      var cls = i < at || n.done ? "done" : i === at ? "cur" : "";
      if (l.called) {
        var cs = n.called;
        return '<li class="lg ' + cls + '"><span class="lg-ic">' + A.icon("bell") + '</span><span class="lg-t"><b>Called boxes</b><small>' +
          (cs ? cs.got + " of " + cs.of + " boxes" : "Single boxes out of order, like a quiz") + "</small></span>" + (cls === "done" ? '<span class="lg-ok">' + S.icon("check") + "</span>" : "") + "</li>";
      }
      var c = byId(l.id), pl = null;
      (n.played || []).forEach(function (x, j) { if (j === i) { pl = x; } });
      var why = l.why === "review" ? " · review" : l.why === "again" ? " · once more" : "";
      return '<li class="lg ' + cls + '"><span class="lg-ic">' + A.stepIcon(l.step) + '</span><span class="lg-t"><b>' + esc(c ? c.title : l.id) + "</b><small>" + esc(c ? stepLine(c, l.step) : "") + why +
        (pl ? " · " + pl.got + "/" + pl.of : "") + "</small></span>" + (cls === "done" ? '<span class="lg-ok">' + S.icon("check") + "</span>" : "") + "</li>";
    }).join("");
    var btn;
    if (n.done) {
      /* tonight's regatta: every race won, or one lost */
      /* a dead heat is shared laurels, never a loss */
      var rs = regatta(n.played), sub = "A new one, from where you are now";
      if (rs.n && !rs.lost) { sub = "Defend your laurels"; } else if (rs.lost === 1) { sub = "A rematch with the Corvus"; }
      btn = '<p class="rh-done">' + A.icon("ship") + "<span>Home harbor! Tonight’s voyage is done.</span></p>" +
        '<button type="button" class="btn wood block" data-a="again">' + A.icon("oar") + "<span>One more voyage<small>" + sub + "</small></span></button>";
    } else if (at > 0) {
      btn = '<button type="button" class="btn primary block" data-a="sail" data-enter>' + A.icon("oar") + "<span>Row on<small>Leg " + (at + 1) + " of " + legs.length + "</small></span></button>";
    } else {
      btn = '<button type="button" class="btn primary block" data-a="sail" data-enter>' + A.icon("ship") + "<span>Set sail<small>About " + minutes(legs) + " minutes</small></span></button>";
    }
    return '<section class="card tabbed rh-night"><span class="card-tab">Tonight’s voyage</span><ol class="rh-legs">' + items + "</ol>" + btn + "</section>";
  }
  /* the races of a voyage that count (recorded: on a passed chart) */
  function regatta(played) {
    var o = { n: 0, won: 0, heat: 0, lost: 0, list: [] };
    (played || []).forEach(function (p, i) {
      var r = p && p.race;
      if (!r || !r.rec || ["won", "heat", "lost"].indexOf(r.r) < 0) { return; }
      o.n++; o[r.r]++; o.list.push({ p: p, i: i, r: r });
    });
    return o;
  }

  /* a ship on the quay: pick its step */
  function pick(chart) {
    if (!chart) { return; }
    S.sfx("tap");
    var r = L.rec(prog, chart.id), el = doc.createElement("div");
    el.className = "pk";
    var b0 = L.boxes(chart)[0], cw = calmWhat(b0), whole = !b0 || !b0.s;
    var TXT = [whole ? "Tap each form from the tiles." : cw.line.replace(/\.$/, "") + ": " + cw.tap.toLowerCase() + ".",
      whole ? "A third of the boxes are filled: tap the other forms." : "A third of the boxes are filled: tap the other endings.",
      set.typing ? "A blank chart: type each whole form." : whole ? "A blank chart: tap each form." : "A blank chart: tap each ending."];
    el.innerHTML = '<p class="pk-sub">' + esc(chart.sub || "") + "</p>" + [1, 2, 3].map(function (s) {
      var open = L.unlocked(prog, chart.id, s), b = r.best[s - 1];
      return '<button type="button" class="pk-b' + (r.passed[s - 1] ? " passed" : "") + '" data-v="' + s + '"' + (open ? "" : " disabled") + ">" +
        '<span class="pk-pen">' + A.pennant(r.passed[s - 1] ? "done" : open ? "open" : "lock") + "</span>" +
        '<span class="pk-t"><b>' + A.stepIcon(s) + esc(stepName(s)) + "</b><small>" + (open ? TXT[s - 1] : "Pass" + stepName(s - 1) + " first (at most one missed box).") + "</small></span>" +
        '<span class="pk-best">' + (b ? "Best<br>" + b.got + "/" + b.of : open ? "" : A.icon("lock")) + "</span></button>";
    }).join("") +
      '<button type="button" class="pk-b pk-called" data-v="called"><span class="pk-pen">' + A.icon("bell") + '</span><span class="pk-t"><b>Called boxes</b><small>Six single boxes out of order, like a quiz.</small></span><span class="pk-best"></span></button>';
    shell.dialog({
      title: chart.title, el: el, sheet: true, buttons: [],
      onOpen: function (box, close) {
        qa(".pk-b", box).forEach(function (b) { b.addEventListener("click", function () { close(b.getAttribute("data-v")); }); });
        var f = box.querySelector(".pk-b:not([disabled])"); if (f) { f.focus(); }
      }
    }).then(function (v) {
      if (!v) { return; }
      V = { kind: "free", legs: [v === "called" ? { called: true, ids: [chart.id], why: "called" } : { id: chart.id, step: +v, why: "free" }], at: 0, played: [], called: null };
      runLeg();
    });
  }

  function sail(again) {
    V = tonight(again);
    V.kind = "night";
    if (V.done) { V = tonight(true); V.kind = "night"; }
    S.sfx("tap");
    runLeg();
  }

  /* ----------------------------------------------------------------- the voyage */
  function runLeg() {
    leave();
    if (!V) { home(); return; }
    var leg = V.legs[V.at];
    pips();
    if (!leg) { endVoyage(); return; }
    if (leg.called) { startCalled(leg); return; }
    var chart = byId(leg.id);
    if (!chart) { V.at++; save(); runLeg(); return; }
    startChart(chart, leg.step, leg);
  }

  var RAIN = (function () {
    var out = "", i;
    for (i = 0; i < 16; i++) { out += '<i style="left:' + ((i * 6.3 + (i % 3) * 2.1) % 100).toFixed(1) + "%;animation-delay:-" + ((i * 0.137) % 0.7).toFixed(2) + "s;animation-duration:" + (0.55 + (i % 4) * 0.07).toFixed(2) + 's"></i>'; }
    return out;
  })();
  /* the sea strip: sky, the harbor left behind, the next harbor (a port town, or the lighthouse at home), waves, the ship */
  function seaHTML(step, toHome) {
    return '<div class="sea s' + step + '" aria-hidden="true">' +
      '<div class="sky"></div>' + A.sky(step) + (step === 3 ? '<div class="rain">' + RAIN + '</div><div class="flash"></div>' : "") +
      '<div class="wv wv-far"><div class="wv-in">' + A.waves(step, "far") + "</div></div>" +
      '<div class="hb hb-from">' + A.quay() + "</div>" +
      '<div class="hb hb-to' + (toHome ? " home" : "") + '">' + (toHome ? A.lighthouse() : A.port()) + "</div>" +
      '<div class="wv wv-back"><div class="wv-in">' + A.waves(step, "back") + "</div></div>" +
      '<div class="track"><div class="runner"><div class="ship"><div class="bob">' + A.ship() + '</div><span class="spray"></span><span class="streak" hidden></span></div></div></div>' +
      '<div class="wv wv-front"><div class="wv-in">' + A.waves(step, "front") + "</div></div>" +
      "</div>" + '<span class="legtag"' + (legText() ? "" : " hidden") + ">" + legText() + "</span>" +
      '<span class="racechip" aria-hidden="true" hidden></span>';
  }
  /* the Corvus's lane: farther out than ours, on the far water (its own band of waves covers its waterline), so it
     shows above our rail even when the race is level. New class names, so q(".ship"), q(".runner"), ".ship .drum"
     and ".ship .streak" still find our own ship */
  function rivalHTML(R) {
    return '<div class="rtrack"><div class="rrun"><div class="rship wait"><div class="rbob">' + A.ship({ rival: true, cargo: L.amphorae(R.H, R.st.n), light: R.dare }) +
      '</div><span class="spray"></span></div></div></div>';
  }
  /* the step and the drum, at the head of the oars panel */
  function deckHTML(step, beatName, called) {
    return '<span class="deck-step" title="' + (called ? "Called boxes" : esc(stepName(step))) + '">' + (called ? A.icon("bell") + '<span class="ds-t">Called boxes</span>' : A.stepIcon(step) + '<span class="ds-t">' + esc(stepName(step)) + "</span>") + "</span>" +
      (called ? "" : '<button type="button" class="hud-drum" data-a="drum" aria-label="The drum: ' + beatLabel(beatName) + '. Change the beat">' + A.icon("drum") + '<span class="hd-t">' + beatLabel(beatName) + "</span></button>");
  }
  function beatLabel(b) { return b === "off" ? "No drum" : b === "slow" ? "Slow" : "Steady"; }
  function setShip(p) {
    var r = q(".runner");
    p = Math.max(0, Math.min(1, p));
    if (G) { G.shipP = p; }
    if (r) { r.style.transform = "translateX(" + (p * 100).toFixed(2) + "%)"; }
  }
  function shipFx(cls, ms) {
    var s = q(".ship");
    if (!s || reduced()) { return; }
    s.classList.remove(cls); void s.offsetWidth; s.classList.add(cls);
    setTimeout(function () { s.classList.remove(cls); }, ms || 600);
  }

  /* ------------------------------------------------------------- one chart, one step */
  function startChart(chart, step, leg) {
    var voc = L.vocShown(chart, set.voc);
    /* the wrong tiles come from the charts in play first, then the rest of the grade, and only then other grades */
    var plan = L.plan(chart, step, { voc: voc, typing: set.typing, seed: chart.id + ":" + step + ":" + Date.now(), charts: list(), wider: [L.gradeCharts(CH, P.grade, WD), CH] });
    G = {
      kind: "chart", chart: chart, step: step, leg: leg, plan: plan, voc: voc, i: -1, got: 0, missed: [], streak: 0, best: 0, strokes: 0,
      beat: L.beatFor(set.beat, step), t0: now(), busy: false, waited: 0, ck: null, typer: null, done: false, timers: [],
      /* a typed form is judged against this chart's boxes and the boxes of the charts that share its words (agēris / ageris) */
      pool: plan.boxes.concat(L.kinBoxes(chart, CH))
    };
    shell.compact(true);
    shell.el.classList.add("voyage");
    shell.desk.innerHTML = '<div class="view rv" data-chart="' + esc(chart.id) + '" data-step="' + step + '" data-mode="' + plan.mode + '">' +
      '<div class="sea-wrap">' + seaHTML(step, false) + "</div>" +
      '<div class="rv-main">' +
        '<section class="card rv-chart" aria-label="' + esc(chart.title + ", " + stepName(step)) + '">' +
          '<div class="rv-tbl">' + tableHTML(plan) + "</div>" +
        "</section>" +
        '<section class="rv-side" aria-label="Your oars">' +
          '<div class="rv-info"><h2 class="rv-title">' + esc(chart.title) + "</h2><p>" + esc(chart.sub || "") + "</p></div>" +
          '<div class="rv-ask">' + deckHTML(step, G.beat, false) + '<span class="rv-n"></span><span class="rv-q"></span></div>' +
          (plan.mode === "tap" ? '<div class="tiles" role="group" aria-label="Endings"></div>' : '<div class="typer"><div class="ty-keys"></div><div class="ty-row"><input type="text" class="la-input ty-in" aria-label="The whole form" placeholder="Type the form" maxlength="40"><button type="button" class="btn primary ty-go">Row</button></div></div>') +
          '<p class="rv-msg" aria-live="polite"></p><p class="sr rv-live" aria-live="polite" aria-atomic="true"></p>' +
          (chart.note ? '<p class="rv-note">' + esc(chart.note) + "</p>" : "") +
        "</section>" +
      "</div></div>";
    fitTable();
    setShip(0);
    var drum = q('[data-a="drum"]');
    drum.addEventListener("click", cycleDrum);
    drum.addEventListener("mousedown", function (e) {
      var inp = typingBox();
      G.keepTyping = !!(inp && doc.activeElement === inp);
      if (G.keepTyping) { e.preventDefault(); }
    });
    if (plan.mode === "tap") {
      q(".tiles").addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".tile"); if (b) { onTile(+b.getAttribute("data-i"), b); } });
    } else {
      var inp = q(".ty-in");
      G.typer = S.macronKeys(inp, { into: q(".ty-keys") });
      inp.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") { return; }
        e.preventDefault(); e.stopPropagation();
        /* Enter in an empty box reads the Inspector's next line; with a form in it, it rows */
        if (!inp.value.trim() && shell.more()) { shell.next(); return; }
        onTyped();
      });
      q(".ty-go").addEventListener("click", onTyped);
    }
    /* the Inspector leads */
    var first = plan.ask[0], cw = calmWhat(first);
    var lines, whole = !cw, from = first ? colRef(first) : "";
    if (step === 1) { lines = whole ? ["<b>Calm water.</b> Tap each form from the tiles.", "Go down " + from + " first."] : ["<b>Calm water.</b> " + cw.line, cw.tap + ", down " + from + " first."]; }
    else if (step === 2) { lines = ["<b>Open sea!</b> Some boxes are filled in.", (whole ? "Tap the forms of the empty ones" : "Tap the endings of the empty ones") + ", down " + from + " first."]; }
    else if (plan.mode === "type") { lines = ["<b>Storm!</b> The chart is blank.", "Type each whole form, down " + from + " first.", "The ā ē ī ō ū keys help with the macrons."]; }
    else { lines = ["<b>Storm!</b> The chart is blank.", (whole ? "Tap each form" : "Tap each ending") + ", down " + from + " first."]; }
    raceSetup();
    /* the race's lines go after the step's; on a player's very first race, if they have rowed before (and know the
       steps), they lead, so the Corvus is met before the first answer starts it */
    var firstRace = !!G.race && !prog.race.told.first && anyPlayed();
    var dl = drumLines(plan.mode);
    lines = firstRace ? dl.concat(lines) : lines.concat(dl);
    if (G.leg && G.leg.why === "again") {
      /* "Once more: porta with magna." as before the race, then "A rematch with the Corvus!" on a page of its own
         (together they took a third line of the bubble on a small phone) */
      lines = ["Once more: " + esc(chart.title) + "."].concat(G.race ? ["A rematch with the Corvus!"] : [], lines);
    }
    shell.say(lines, ["point", "idle", "idle", "idle", "idle", "idle"]);
    startBeat();
    next(0);
    /* the tall or snug strip, once the leg is drawn: after the shell has fitted the Inspector to the compact stage (its own
       timer, set by compact() above) */
    later(fitSea, 0);
  }
  /* the Inspector's lines about the drum and the race at the start of a leg (they also say what the drum is for).
     A race line is never longer than the lines a leg had before the race: about 48 letters, or about 50 when it is
     the last page (the bubble is 28 px wider with no arrow). That is two lines of the bubble on every phone down to
     320 px and one line from 600 px, so the race's lines never make a play screen taller than it was (tools/play.js
     pages through them; the step's own longest line, "Tap the endings of the empty ones, down the porta column
     first.", takes more) */
  var CARGO = ["smelly " + la("garum") + " fish sauce", "sacks of figs", "a marble Neptune", "a stubborn goat", "a senator’s luggage", "jars of olive oil"];
  function drumLines(mode) {
    var rr = prog.race, t = rr.told, day = S.today(), out = [];
    var raced = rr.races > 0 || t.first, typing = mode === "type";
    if (G.race) {
      if (!t.first) {
        /* the first race ever: the ship the child can see, what it rows to, and that thinking is safe */
        t.first = true; save();
        return ["<b>Race!</b> That raven sail is the Corvus, from Ostia.",
          typing ? "In the Storm it rows a stroke every two beats." : "It rows to the drum. Fill a box a beat to lead!",
          "Your first answer starts the race.", "Need time? After three beats the Corvus waits."];
      }
      /* a dare and a level race say so, even in the first three races (a child this quick needs the tip least) */
      if (G.race.dare) { return ["The Corvus sails light: you dared them!"]; }
      if (G.race.H <= 0) { return ["No cargo this time: a level race!"]; }
      if (rr.races < 3) {
        return (typing ? ["In the Storm the Corvus rows every other beat."] : []).concat(["Think, don’t guess: a wrong " + (typing ? "form" : "tile") + " costs four beats."]);
      }
      return ["The Corvus carries " + CARGO[rr.races % CARGO.length] + ". Race!"];
    }
    if (G.beat !== "off") {
      /* the drum with "Sail alone": the first time ever, what the drum is for */
      if (!t.alone) { t.alone = true; save(); return ["The drum sets the stroke: try for one box a beat."]; }
      return ["Row to the drum: one box a beat. Slow is fine too."];
    }
    if (set.race === "alone" || !raced) { return out; }
    if (G.step === 3 && set.beat !== "off" && t.port !== day) {
      t.port = day; save();
      out.push("No drum in this storm, so the Corvus waits in port.", "Tap the drum before your first " + (typing ? "form" : "box") + " for a race.");
    } else if (G.step < 3 && set.beat === "off" && t.rest !== day) {
      t.rest = day; save();
      out.push("The drum rests tonight, so the Corvus rests in port.");
    }
    return out;
  }

  /* ------------------------------------------------------------------ the race */
  /* The Corvus rows one stroke a beat while a box waits; the child one box an answer. Its cargo comes from the
     child's usual pace on this chart (RowLogic.usual and cargo), so a race stays close; the rules are in logic.js. */
  function raceSetup() {
    if (!G || G.kind !== "chart") { return; }
    var lane = q(".rtrack"), tag = q(".legtag");
    if (lane) { lane.parentNode.removeChild(lane); }
    if (tag) { tag.classList.remove("dim"); }
    G.race = null;
    if (!L.raceOn(set, G.step, G.beat)) { startBeatLabel(); return; }
    var B = L.beatMs(G.beat), mode = G.plan.mode, key = L.raceKey(G.step, mode), n = G.plan.of;
    var dare = set.race === "dare" && prog.race.dareOk, us = L.usual(prog.race, G.chart.id, key, B, mode), H = L.cargo(us.u, n, B, mode, dare);
    /* a dare is a dare only when the Corvus really sails light (H below 0). With a usual not yet known on this chart,
       or a stroke slower than the drum (typing in the Storm), the dare's cargo is the fair one: no pennant, no
       "sails light" line, no "Dare won" */
    dare = dare && H < 0;
    G.race = { st: L.race(n, H, B, mode, dare), key: key, H: H, u: us.u, from: us.from, dare: dare, started: false, off: false, stretch: false, moored: false, p: 0 };
    var wv = q(".sea .wv-far");
    if (wv) { wv.insertAdjacentHTML("beforebegin", rivalHTML(G.race)); }
    drawRival(0, true);
    startBeatLabel();
  }
  function racing() { return !!(G && G.race && !G.race.off); }
  /* the Corvus on its track: from 600 px up where the race clock says; on a phone it is drawn from our ship, wide of
     our sail as soon as the race is off level (38 px back in the first hundredth of a stroke behind, 10 px forward
     in the first hundredth ahead), 48 px back and 24 px forward at one stroke, then 24 px a stroke (RowLogic.rivalX,
     leadPx). Before the first answer it waits at the quay behind us, where it can be seen; when it docks first it
     moors in the harbor ahead of our prow */
  var phoneMQ = null, dockMQ = null;
  function phone() { try { phoneMQ = phoneMQ || window.matchMedia("(max-width: 599.98px)"); return phoneMQ.matches; } catch (e) { return false; } }
  /* the oars panel is docked at the bottom of the screen (phones and tablets) */
  function docked() { try { dockMQ = dockMQ || window.matchMedia("(max-width: 899.98px)"); return dockMQ.matches; } catch (e) { return false; } }
  function drawRival(p, instant) {
    var R = G && G.race, run = q(".rrun"), lane = q(".rtrack"), s = rival();
    if (!R || !run || !lane || !s) { return; }
    R.p = p;
    var tw = lane.clientWidth, x = L.rivalX(R.st.done, R.st.n, p, tw, phone(), { lo: lane.offsetLeft, hi: s.offsetWidth * 0.45, wait: !R.started, moored: R.moored });
    R.x = x;
    if (instant) { run.style.transition = "none"; }
    run.style.transform = "translateX(" + x.toFixed(1) + "px)";
    if (instant) { void run.offsetWidth; run.style.transition = ""; }
    tagClear(lane.offsetLeft + x, s.offsetWidth);
  }
  /* the "Leg 2 of 5" tag at the top right fades while the Corvus is under it (near the far harbor, or moored there),
     so the tag never hides the rival; it comes back with the next leg. Once our own ship has docked under it (the
     result card) it stays away, whatever is drawn again (a resize) */
  function tagClear(left, w) {
    var tag = q(".legtag"), sea = q(".sea");
    if (!tag || tag.hidden || !tag.offsetParent || !sea) { return; }
    var l = sea.offsetLeft + sea.clientLeft + left;
    tag.classList.toggle("dim", !!G.done || (!G.race.off && l < tag.offsetLeft + tag.offsetWidth && l + w > tag.offsetLeft));
  }
  /* on resize: the Corvus at once (and a chip that shows, clear of it); the strip once the shell has fitted the
     Inspector again (it waits 80 ms) */
  var fitT = 0;
  window.addEventListener("resize", function () {
    if (G && G.race) { drawRival(G.race.p); chipPlace(); }
    clearTimeout(fitT);
    fitT = setTimeout(function () { if (G && G.kind === "chart") { fitSea(); } }, 120);
  });
  /* the tall strip and the snug strip. In a close race the Corvus rows just behind our ship, and our sail hid it. So
     when a leg races the Corvus's lane rises (--lift, css/row.css): it rows higher up the strip, farther out at sea,
     its raven sail clear above our ship. Where it is drawn across the strip (RowLogic.rivalX) does not change.
     - Tall: when the page has room, the strip grows (--grow) and the far water rises with the lane. The strip takes
       the largest step that keeps the page from scrolling, measured once the leg is drawn (box 1, the Inspector's
       first page) and kept for the whole leg, so the room is kept for what the leg may show later (fitRoom): while
       rowing, a second line of the bubble where it is narrow and on a laptop the note under the tiles after a miss;
       at the end, the result card in the oars panel's place.
     - Snug: from 600 px wide, when no tall step fits. The strip keeps its height; both ships are drawn a little
       smaller (--sw) and the lane rises by the headroom that frees. Nothing on the page moves.
     - Else (a phone with no room; no race): the strip as it was. On a phone the Corvus is drawn from our ship
       (RowLogic.leadPx), wide enough near level that its sail is out from behind ours.
     It changes only when a leg is drawn (or its race set up again before the first answer) and when the window is
     resized; never animated. */
  var TALL = { wide: [40, 32, 24, 16, 12], mid: [34, 26, 18, 12], phone: [28, 22, 16, 12] }, SAFE = 4;
  /* the Corvus's masthead is MAST of our ship's width above the strip's bottom edge (before any lift) and stays HEAD
     px under its top edge. A lift under CLEAR of our ship's width is too little to clear our sail: a tall step that
     small is skipped. The snug strip shrinks the ships until the lift is SNUG of their width (with that, 60 % of the
     Corvus's sail stays in sight through the pitch of the Storm, tools/play.js), and never under SNUG_MIN of their
     size. In the Storm a tall step needs a lift of SNUG too (a laptop's +12 has less: the snug strip there) */
  var MAST = 0.592, HEAD = 8, CLEAR = 0.07, SNUG = 0.09, SNUG_MIN = 0.85;
  var wideMQ = null, midMQ = null;
  function fitSea() {
    var sea = q(".sea"), de = doc.documentElement;
    if (!sea || !G || G.kind !== "chart") { return; }
    var st = sea.style;
    /* o: { grow, lift } the tall strip; { sw, lift, rise } the snug strip (rise: how far the horizon rises, less than
       the lift, as the far band of waves is lower under smaller ships); nothing: the strip as it was */
    function size(o) {
      o = o || {};
      sea.classList.toggle("tall", o.grow > 0);
      sea.classList.toggle("snug", o.sw > 0);
      ["grow", "lift", "sw", "rise"].forEach(function (k) {
        if (o[k] != null) { st.setProperty("--" + k, o[k] + "px"); } else { st.removeProperty("--" + k); }
      });
    }
    size();
    if (racing()) {
      try { wideMQ = wideMQ || window.matchMedia("(min-width: 900px)"); midMQ = midMQ || window.matchMedia("(min-width: 600px)"); } catch (e) { /* none */ }
      var mid = !!(midMQ && midMQ.matches), steps = wideMQ && wideMQ.matches ? TALL.wide : mid ? TALL.mid : TALL.phone;
      var sw = parseFloat(getComputedStyle(sea).getPropertyValue("--sw")) || 100, base = sea.offsetHeight;
      /* the lift: up to a fifth of our ship's width (its waterline then near our sail's top), and the Corvus's
         masthead kept under the strip's top edge; a step whose lift would not clear our sail is skipped */
      var liftOf = function (g, w) { return Math.round(Math.min(w * 0.2, g + base - w * MAST - HEAD)); };
      var clear = G.step === 3 ? SNUG : CLEAR;
      steps = steps.filter(function (g) { return liftOf(g, sw) >= sw * clear; });
      /* with the result card in place (a resize, a phone's address bar): the end state alone, measured as it was
         when the leg was drawn, and never a taller strip than the leg was last fitted with while it was rowed
         (G.tall), so the strip stays as it is unless the page no longer fits, and a window made smaller and
         then as large again gets its strip back */
      if (G.done) { steps = steps.filter(function (g) { return g <= (G.tall || 0); }); }
      (G.done ? ["result"] : ["rowing", "result"]).forEach(function (state) {
        var undo = fitRoom(state), k;
        for (k = 0; k < steps.length; k++) {
          size({ grow: steps[k] + SAFE, lift: liftOf(steps[k], sw) });
          if (de.scrollHeight - window.innerHeight <= 0) { break; }
        }
        size();
        undo();
        steps = steps.slice(k);                  /* the next state tries only the steps this one left */
      });
      if (!G.done) { G.tall = steps.length ? steps[0] : 0; }
      if (steps.length) { size({ grow: steps[0], lift: liftOf(steps[0], sw) }); }
      else if (mid) {
        /* snug: the smallest shrink that works, the widest ships (whole px) whose lift in the strip as it is is
           SNUG of their width. The far band of waves is 0.288 of our ship's width high (css), so it is lower by
           that much of the shrink, and the horizon rises by the lift less that */
        for (var w = Math.floor(sw); w >= sw * SNUG_MIN; w--) {
          if (liftOf(0, w) >= w * SNUG) {
            size({ sw: w, lift: liftOf(0, w), rise: Math.max(0, Math.round((liftOf(0, w) - (sw - w) * 0.288) * 10) / 10) });
            break;
          }
        }
      }
    }
    if (G.race) { drawRival(G.race.p, true); chipPlace(); }
  }
  /* while fitSea measures: the room the leg may need later, held for a moment (no paint, nothing read aloud).
     state "rowing" or "result". -> undo() */
  function fitRoom(state) {
    var undo = [], bt = shell.el.querySelector(".b-text"), side = q(".rv-side"), m = q(".rv-msg"), v = q(".view"), anims = [];
    /* the screen slides in from 12 px lower (common.css view-in), which the page's scroll height counts while it
       runs: the measure is taken at its end */
    try { anims = v && v.getAnimations ? v.getAnimations() : []; } catch (e) { anims = []; }
    anims.forEach(function (a) {
      try {
        var t = a.currentTime, end = a.effect.getComputedTiming().endTime;
        if (a.playState !== "running" || t == null || !(end > t)) { return; }
        a.pause(); a.currentTime = end;
        undo.push(function () { a.currentTime = t; a.play(); });
      } catch (e) { /* measured as it is */ }
    });
    if (bt) {
      var cs = getComputedStyle(bt), fs = parseFloat(cs.fontSize) || 16, lh = parseFloat(cs.lineHeight) || fs * 1.36;
      if (state === "rowing" && bt.clientWidth < fs * 50 && bt.offsetHeight < 2 * lh - 1) {
        /* a bubble too narrow to say every line on one line (the longest take about 45 em): room for two, which no
           line ever needs more of on a 390 px phone */
        bt.style.minHeight = Math.ceil(2 * lh) + "px";
        undo.push(function () { bt.style.minHeight = ""; });
      } else if (state === "result") {
        /* the card comes with the score ("19 of 21. The sea was rough!") and the Inspector's lines about the race
           and the next step, which the child pages through: none is over 54 letters, two lines of a bubble narrower
           than 25 em (phones), one line of a wider one */
        var need = Math.ceil((bt.clientWidth < fs * 25 ? 2 : 1) * lh) + "px";
        bt.style.minHeight = need; bt.style.maxHeight = need; bt.style.overflow = "hidden";
        undo.push(function () { bt.style.minHeight = ""; bt.style.maxHeight = ""; bt.style.overflow = ""; });
      }
    }
    if (state === "rowing" && m && !m.textContent && G.plan) {
      /* the note after a miss (shown under the tiles on a laptop only; css hides it elsewhere): the chart's longest */
      var longest = "";
      G.plan.ask.forEach(function (b) {
        var line = G.plan.mode === "type" ? "Only the macrons! " + b.f + " is the " + b.name + " of " + b.who + ". This box is " + b.f + "." : "Oars clashed! " + b.f + " is the " + b.name + ".";
        if (line.length > longest.length) { longest = line; }
      });
      var probe = doc.createElement("p");
      probe.className = "rv-msg bad";
      probe.setAttribute("aria-hidden", "true");
      probe.textContent = longest;
      m.parentNode.insertBefore(probe, m.nextSibling);
      undo.push(function () { if (probe.parentNode) { probe.parentNode.removeChild(probe); } });
    }
    if (state === "result" && side && G.plan) {
      /* the result card takes the oars panel's place: a chart not passed (two misses, of the chart's middle length),
         the race line, the buttons. Drawn unseen in a copy of the panel to learn its height, which the panel then
         keeps for the measure */
      var plan = G.plan, night = V && V.kind === "night";
      var byLen = plan.ask.slice().sort(function (a, b) { return (a.f + a.name).length - (b.f + b.name).length; });
      var worst = byLen.slice(Math.max(0, (byLen.length >> 1) - 1), (byLen.length >> 1) + 1);
      var c = side.cloneNode(false), h0 = side.offsetHeight;
      var more = night ? " The rematch is tonight." : " Row it again!", n2 = night ? "This chart comes back once more at the end of tonight." : "";
      c.removeAttribute("aria-label");
      c.setAttribute("aria-hidden", "true");
      c.style.cssText = "position:absolute;left:0;top:0;right:auto;bottom:auto;height:auto;visibility:hidden;margin:0;width:" + side.offsetWidth + "px";
      c.innerHTML = cardHTML({
        RL: { cls: "parch", card: "Prow to prow! Pass the chart for the laurels." + more, cut: more, dup: night },
        newly: false, pass: false, head: plan.of + " of " + plan.of + " boxes", line: "Not passed yet: at most one missed box passes.", next2: n2,
        misses: worst.map(function (b) { return la(b.f) + " <small>(" + esc(b.name) + ")</small>"; }), best: plan.of, buttons: resButtons(false, G.step, "lost")
      });
      side.parentNode.appendChild(c);
      raceLineFit(c, n2, plan.of);
      var h = c.offsetHeight;
      side.parentNode.removeChild(c);
      if (h > h0) {
        side.style.minHeight = h + "px";
        undo.push(function () { side.style.minHeight = ""; });
      }
    }
    return function () { undo.forEach(function (f) { f(); }); };
  }
  function rival() { return q(".rship"); }
  function rivalPose(cls) {
    var s = rival();
    if (!s) { return; }
    if (cls === "row") {
      s.classList.remove("wait");
      if (!reduced()) { s.classList.remove("row"); void s.offsetWidth; s.classList.add("row"); }
    } else { s.classList.remove("row"); s.classList.add("wait"); }
  }
  function rivalFx(cls, ms) {
    var s = rival();
    if (!s || reduced()) { return; }
    s.classList.remove(cls); void s.offsetWidth; s.classList.add(cls);
    later(function () { s.classList.remove(cls); }, ms || 600);
  }
  /* it reached the far harbor first: it moors and furls its sail, quietly */
  function moor() {
    var R = G.race;
    if (!R || R.moored) { return; }
    R.moored = true;
    var s = rival();
    if (s) { s.classList.remove("row"); s.classList.add("wait", "moored"); }
    drawRival(1);
  }
  /* a chip at the top center of the strip: "Race on!", "Final stretch!", the result ribbon (ms 0: it stays). A new
     chip cancels the old one's fade, so the ribbon never goes with the "Final stretch!" before it */
  function chipStop() { if (G && G.chipT) { G.chipT.forEach(clearTimeout); } if (G) { G.chipT = []; } }
  /* a chip never lies over the Corvus's sail. Its place is the top center of the strip (css); when the Corvus's sail
     would be under it there (a Corvus beaten by a few strokes under the result ribbon, or two strokes behind in the
     final stretch on a phone), the chip is put at the nearest place along the top of the strip that is clear of
     both ships' sails, and of the whole Corvus where the strip has the room; never over the leg tag, never past
     the strip's ends. Where the ships are going, not where they are in mid glide. Placed when the chip is shown,
     and again on a resize or when the strip is fitted; it does not follow the ships while it shows */
  var SAIL = { l: 0.28, r: 0.67, t: 0.08, b: 0.53 };           /* a ship's sail and yard, as parts of its box (art.js) */
  function chipPlace() {
    var c = q(".racechip"), R = G && G.race;
    if (!c) { return; }
    c.style.left = "";
    var sea = q(".sea"), s = rival(), lane = q(".rtrack"), tr = q(".track"), ship = q(".ship"), tag = q(".legtag");
    if (c.hidden || !R || R.off || R.x == null || !sea || !s || !lane || !tr || !ship) { return; }
    var x0 = sea.offsetLeft + sea.clientLeft, y0 = sea.offsetTop + sea.clientTop, w = c.offsetWidth, m0 = c.offsetLeft;
    var top = c.offsetTop, bot = top + c.offsetHeight;
    var lo = x0 + 4 + w / 2, hi = (tag && !tag.hidden && tag.offsetParent ? tag.offsetLeft - 5 : x0 + sea.clientWidth - 4) - w / 2;
    if (hi < lo) { return; }
    /* what the chip should not cover: [left, right, how much it matters], only what is as high up the strip as the chip */
    var keep = [];
    function box(l, t, bw, bh, part, wt) {
      var a = part ? [l + part.l * bw - 3, l + part.r * bw + 3, t + part.t * bh, t + part.b * bh] : [l, l + bw, t + SAIL.t * bh, t + bh];
      if (a[2] < bot && a[3] > top) { keep.push([a[0], a[1], wt]); }
    }
    var cl = x0 + lane.offsetLeft + R.x, ct = y0 + lane.offsetTop;
    box(cl, ct, s.offsetWidth, lane.offsetHeight, SAIL, 100);
    box(x0 + tr.offsetLeft + (G.shipP || 0) * tr.clientWidth, y0 + tr.offsetTop, ship.offsetWidth, tr.offsetHeight, SAIL, 100);
    box(cl, ct, s.offsetWidth, lane.offsetHeight, null, 1);
    function cost(m) {
      return keep.reduce(function (sum, k) { return sum + k[2] * Math.max(0, Math.min(m + w / 2, k[1]) - Math.max(m - w / 2, k[0])); }, Math.abs(m - m0) * 0.02);
    }
    if (!(cost(m0) > 0)) { return; }                           /* clear where the style sheet puts it */
    var at = Math.max(lo, Math.min(hi, m0)), best = cost(at);
    keep.forEach(function (k) {
      [k[0] - w / 2 - 1, k[1] + w / 2 + 1, lo, hi].forEach(function (m) {
        m = Math.max(lo, Math.min(hi, m));
        var cm = cost(m);
        if (cm < best - 1e-6) { best = cm; at = m; }
      });
    });
    if (at !== m0) { c.style.left = at.toFixed(1) + "px"; }
  }
  function chip(text, ms, kind) {
    var c = q(".racechip");
    if (!c) { return; }
    chipStop();
    c.textContent = text;
    c.className = "racechip" + (kind ? " " + kind : "");
    c.hidden = false;
    chipPlace();
    if (!reduced()) { void c.offsetWidth; c.classList.add("in"); } else { c.classList.add("in"); }
    if (ms) {
      G.chipT.push(later(function () { c.classList.remove("in"); c.classList.add("out"); }, ms));
      G.chipT.push(later(function () { if (c.classList.contains("out")) { c.hidden = true; } }, ms + (reduced() ? 0 : 320)));
    }
  }
  /* the drum was changed after the race had started: the Corvus fades out, nothing is recorded */
  function callOff() {
    var R = G.race;
    if (!R || R.off) { return; }
    R.off = true;
    var lane = q(".rtrack");
    if (lane) { lane.classList.add("gone"); }
    chipStop();
    var c = q(".racechip"); if (c) { c.hidden = true; }
    var tag = q(".legtag"); if (tag) { tag.classList.remove("dim"); }
    startBeatLabel();
  }
  /* the child answered a box: the race clock counts it (ok: right in the race; a macron slip is not).
     Returns true when the box was charged (the race had started and was still on). */
  function raceStroke(ms, ok) {
    var R = G.race;
    if (!R || R.off) { return false; }
    var st = R.st, charged = st.done > 0 && st.dock === null;
    if (!R.started) {
      R.started = true;
      Snd.horn();
      chip("Race on!", 1600);
    }
    var wasDock = st.dock;
    L.raceBox(st, ms, ok, G.free);
    if (st.dock !== null && wasDock === null) { moor(); }
    else if (st.dock === null) {
      drawRival(st.c / st.need);
      if (charged && !ok) { rivalPose("row"); rivalFx("surge", 600); }       /* our clash: the Corvus surges with spray */
      else { rivalPose("wait"); }
    }
    if (!R.stretch && L.stretch(st)) { R.stretch = true; chip("Final stretch!", 2000); }
    return charged;
  }
  /* a drum beat while a box waits: the Corvus rows to where the race clock says, or holds water */
  function rivalBeat(rt, rests) {
    var R = G.race;
    if (!R || R.off || R.moored) { return; }
    if (!R.started || G.busy || rests) { rivalPose("wait"); return; }
    var lv = L.raceLive(R.st, rt, G.free);
    if (lv.moored) { drawRival(1); moor(); return; }
    /* typing in the Storm, one Corvus stroke takes two beats (RowLogic.strokeMs): its oars pull on every second beat
       that a box waits (the first, the third...), and on the beat between it holds them and glides. It is drawn
       where the race clock says on every beat, so one pull moves it one stroke */
    R.nb = (R.nb || 0) + 1;
    var pull = R.st.mode !== "type" || R.nb % 2 === 1;
    drawRival(lv.p);
    if (lv.held) {
      rivalPose("wait");
      /* the first time ever that the mercy rule holds it */
      var t = prog.race.told;
      if (!t.mercy && !shell.more()) { t.mercy = true; save(); shell.say(["Barbātus calls the Corvus’s stroke.", "He never lets them lead by more than two strokes."], "point"); }
      return;
    }
    if (!pull) { rivalPose("wait"); return; }
    rivalPose("row");
    Snd.far(Math.abs(L.raceLead(R.st, lv.p)) <= 2 ? 0.08 : 0.05);
    var dr = q(".rship .drum");
    if (dr && !reduced()) { dr.classList.remove("hit"); void dr.getBoundingClientRect(); dr.classList.add("hit"); }
  }

  function tableHTML(plan) {
    var chart = plan.chart, same = L.sameCols(chart), by = {}, html = "";
    plan.boxes.forEach(function (b) { by[b.key] = b; });
    function head(cols) {
      return '<colgroup><col class="c-rl">' + cols.map(function () { return "<col>"; }).join("") + "</colgroup>" +
        '<thead><tr><td class="rl"></td>' + cols.map(function (c) {
          /* a gender or tense column says so above its entry: "M. and F.", "Pluperfect" */
          var lab = L.colLabel(c), k = L.colKind(c);
          var labHtml = k === "gender" ? '<abbr title="' + esc(Cap(L.GENDER[c.w])) + '">' + esc(lab) + "</abbr>" : esc(lab);
          return '<th scope="col" class="chh">' + (lab ? '<span class="chh-w' + (k === "gender" ? " g" : "") + '">' + labHtml + "</span>" : "") +
            '<span class="chh-e" lang="la">' + esc(c.entry) + '</span><span class="chh-g">' + esc(c.gloss) + "</span></th>";
        }).join("") + "</tr></thead>";
    }
    chart.blocks.forEach(function (b, bi) {
      if (bi === 0 || !same) { html += (bi ? "</table>" : "") + '<table class="chart" data-cols="' + b.cols.length + '">' + head(b.cols); }
      html += '<tbody><tr class="blk"><th colspan="' + (b.cols.length + 1) + '" scope="rowgroup">' + esc(b.label) + "</th></tr>";
      b.rows.forEach(function (r, ri) {
        if (r.voc && !plan.boxes.some(function (x) { return x.b === bi && x.r === ri; })) { return; }
        html += '<tr><th scope="row" class="rl"><abbr title="' + esc(r.name) + '">' + esc(r.label) + "</abbr></th>" + r.cells.map(function (c, ci) { return boxTd(by[bi + "." + ri + "." + ci], plan.step); }).join("") + "</tr>";
      });
      html += "</tbody>";
    });
    return html + "</table>";
  }
  function boxTd(b, step) {
    if (!b) { return "<td></td>"; }
    var inner, cls = "box " + b.state;
    if (b.state === "given" || b.state === "pre") {
      inner = '<span class="bx-s">' + esc(b.f) + "</span>";
    } else {
      inner = '<span class="bx-s">' + (step === 1 ? esc(b.s) : "") + '</span><span class="bx-e"></span>';
    }
    return '<td class="' + cls + '" data-k="' + b.key + '"><span class="bx" lang="la">' + inner + '</span><span class="sr">' + esc(b.name) + (b.state === "ask" ? ": to fill" : ": " + esc(b.f)) + "</span></td>";
  }
  function td(key) { return q('td[data-k="' + key + '"]'); }

  /* the forms must fit their boxes: one font size per table, from the longest form */
  var measureCtx = null;
  function fitTable() {
    qa("table.chart").forEach(function (t) {
      var cols = +t.getAttribute("data-cols") || 2, rl = t.querySelector("th.rl, td.rl");
      var w = t.clientWidth - (rl ? rl.offsetWidth : 44) - cols * 6;
      var colW = w / cols - 14;
      var longest = 0;
      if (!measureCtx) { try { measureCtx = doc.createElement("canvas").getContext("2d"); } catch (e) { measureCtx = null; } }
      var forms = [];
      if (G && G.plan) { G.plan.boxes.forEach(function (b) { forms.push(b.f); }); }
      if (!measureCtx || !forms.length || colW <= 0) { return; }
      measureCtx.font = "700 20px 'Alegreya Variable', Georgia, serif";
      forms.forEach(function (f) { longest = Math.max(longest, measureCtx.measureText(f).width); });
      var size = Math.max(cols >= 3 ? 11 : 12.5, Math.min(21, 20 * colW / Math.max(1, longest)));
      t.style.setProperty("--bxf", size.toFixed(1) + "px");
    });
  }
  window.addEventListener("resize", function () { if (G && G.plan) { fitTable(); } });
  try { if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(function () { if (G && G.plan) { fitTable(); } }); } } catch (e) { /* ignore */ }

  /* the next box to fill */
  function next(i) {
    if (!G || G.done) { return; }
    var plan = G.plan, prev = plan.ask[G.i];
    if (prev) { var pt = td(prev.key); if (pt) { pt.classList.remove("cur"); pt.removeAttribute("aria-current"); } }
    G.i = i;
    if (i >= plan.ask.length) { finishChart(); return; }
    var b = plan.ask[i], t = td(b.key);
    if (t) { t.classList.add("cur"); t.setAttribute("aria-current", "true"); }
    var turn = false;
    if (b.ck !== G.ck) {
      var changed = G.ck !== null;
      G.ck = b.ck;
      turn = changed;
      if (plan.mode === "tap") { renderBank(b.ck, changed); }
      if (changed) { shell.say(colLine(b), "point"); }
    }
    q(".rv-n").textContent = (i + 1) + " / " + plan.of;
    /* the column's own word: porta, laudō; quī, quae for the pronoun's gender columns */
    q(".rv-q").innerHTML = la(b.colKind === "gender" ? b.entry : b.who) + ' <span class="rv-dot">·</span> <span class="rv-nm">' + esc(b.short) + "</span>";
    /* for a screen reader: which box is next (and that the last one was right) */
    announce((G.wasRight ? "Right. " : "") + "Box " + (i + 1) + " of " + plan.of + ": " + b.who + ", " + b.name + ".");
    G.wasRight = false;
    /* the beats this box does not count, on the race clock and for the drum's rest: a new column (the Inspector says
       so), and one per line he said at the miss before it */
    G.free = L.freeBeats(turn, G.notes); G.notes = 0; G.carry = 0;
    G.t0 = now(); G.waited = 0;
    var s = q(".ship"); if (s) { s.classList.remove("wait"); }
    keepInView(t);
    if (plan.mode === "type") {
      var inp = q(".ty-in");
      inp.value = ""; inp.classList.remove("ok", "no"); inp.disabled = false;
      inp.setAttribute("aria-label", "Type the " + b.name + " of " + b.who);
      try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
    }
  }
  function announce(text) {
    var el = q(".rv-live");
    if (!el) { return; }
    el.textContent = "";
    setTimeout(function () { el.textContent = text; }, 60);
  }
  function renderBank(ck, swap) {
    var tiles = G.plan.banks[ck] || [], box = q(".tiles");
    /* a keyboard player keeps the focus on the tiles when the bank changes */
    var had = doc.activeElement && box.contains(doc.activeElement);
    box.innerHTML = tiles.map(function (t, i) {
      var k = i < 9 ? String(i + 1) : i === 9 ? "0" : "";
      return '<button type="button" class="tile" data-i="' + i + '" aria-label="' + (t.e === "" ? "no ending" : esc(G.plan.hy[ck] ? "ending " + t.e : t.e)) + '">' +
        (k ? '<span class="t-k" aria-hidden="true">' + k + "</span>" : "") + '<span class="t-t" lang="la">' + esc(t.t) + "</span></button>";
    }).join("");
    if (swap && !reduced()) { box.classList.remove("swap"); void box.offsetWidth; box.classList.add("swap"); }
    if (had) { var f = box.querySelector(".tile"); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }
  }
  /* keep the box in sight (on a phone the oars panel sits over the bottom of the page) */
  function keepInView(t) {
    if (!t) { return; }
    var r = t.getBoundingClientRect(), side = q(".rv-side"), bottom = window.innerHeight, top = (shell.bar ? shell.bar.getBoundingClientRect().bottom : 56) + 6;
    if (side && getComputedStyle(side).position === "sticky") { bottom = Math.min(bottom, side.getBoundingClientRect().top); }
    var dy = 0;
    if (r.bottom > bottom - 8) { dy = r.bottom - bottom + 40; } else if (r.top < top) { dy = r.top - top - 30; }
    if (dy) { try { window.scrollBy({ top: dy, behavior: reduced() ? "auto" : "smooth" }); } catch (e) { window.scrollBy(0, dy); } }
  }

  function fill(b, text, how, quiet) {
    var t = td(b.key);
    if (!t) { return; }
    t.classList.remove("ask", "cur");
    t.classList.add(how);
    var bx = t.querySelector(".bx");
    if (how === "miss") {
      bx.innerHTML = '<span class="bx-f">' + esc(b.f) + "</span>";
    } else if (text != null) {
      bx.innerHTML = '<span class="bx-f">' + esc(text) + "</span>";
    } else {
      bx.innerHTML = '<span class="bx-s">' + esc(b.s) + '</span><span class="bx-e">' + esc(b.e) + "</span>";
    }
    t.querySelector(".sr").textContent = b.name + ": " + b.f + (how === "miss" ? " (missed)" : "");
    /* a longer right answer (laudāta sum for laudātus sum) shrinks to fit its box */
    var fs = parseFloat(getComputedStyle(t).fontSize) || 18;
    for (var k = 0; k < 12 && t.scrollWidth > t.clientWidth + 0.5 && fs > 9; k++) { fs -= 1; bx.style.fontSize = fs + "px"; }
    if (!reduced() && !quiet) { bx.classList.add(how === "miss" ? "drop" : "pop-in"); }
  }

  function fly(from, to, text) {
    if (reduced() || !from || !to) { return; }
    var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    var f = doc.createElement("span");
    f.className = "flyer"; f.setAttribute("lang", "la"); f.setAttribute("aria-hidden", "true"); f.textContent = text;
    f.style.left = (a.left + a.width / 2) + "px"; f.style.top = (a.top + a.height / 2) + "px";
    doc.body.appendChild(f);
    var dx = (b.left + b.width * 0.62) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    requestAnimationFrame(function () { requestAnimationFrame(function () { f.style.transform = "translate(-50%, -50%) translate(" + dx.toFixed(0) + "px, " + dy.toFixed(0) + "px) scale(.78)"; f.style.opacity = ".15"; }); });
    setTimeout(function () { if (f.parentNode) { f.parentNode.removeChild(f); } }, 380);
  }
  function callout(t, text) {
    var wrap = q(".rv-tbl");
    if (!wrap || !t) { return; }
    var c = doc.createElement("span");
    c.className = "callout"; c.textContent = text; c.setAttribute("aria-hidden", "true");
    wrap.appendChild(c);
    var wr = wrap.getBoundingClientRect(), tr = t.getBoundingClientRect();
    var left = tr.left - wr.left + tr.width / 2 - c.offsetWidth / 2;
    left = Math.max(2, Math.min(wrap.clientWidth - c.offsetWidth - 2, left));
    var top = tr.bottom - wr.top + 2;
    if (top + c.offsetHeight > wrap.clientHeight) { top = tr.top - wr.top - c.offsetHeight - 2; }
    c.style.left = left + "px"; c.style.top = top + "px";
    later(function () { c.classList.add("out"); }, 1900);
    later(function () { if (c.parentNode) { c.parentNode.removeChild(c); } }, 2300);
  }
  function later(fn, ms) { var g = G, id = setTimeout(function () { if (G === g) { fn(); } }, ms); if (G) { G.timers.push(id); } return id; }

  /* the note under the tiles (a laptop shows it; elsewhere the Inspector says it). The chart's own note sits under
     it: when a note here would make the page scroll (ten tiles and a two-line note at 1366x768), the chart's note
     steps aside until this one goes, so the play screen still fits */
  function msg(html, kind) {
    var m = q(".rv-msg"), n = q(".rv-note");
    if (!m) { return; }
    m.className = "rv-msg";
    m.innerHTML = html || "";
    if (kind) { m.classList.add(kind); }
    if (n) {
      n.hidden = false;
      var de = doc.documentElement, over = de.scrollHeight - window.innerHeight;
      if (html && over > 0) {
        n.hidden = true;
        if (de.scrollHeight - window.innerHeight >= over) { n.hidden = false; }     /* the panel was not what scrolled it */
      }
    }
  }

  /* a stroke: the oars pull, the ship moves one box on */
  function stroke(surge) {
    var s = q(".ship");
    if (s && !reduced()) {
      s.classList.remove("wait", "row"); void s.offsetWidth; s.classList.add("row");
      later(function () { s.classList.remove("row"); }, 700);
    }
    if (surge) { shipFx("surge", 600); }
  }
  function streakBadge() {
    var el = q(".ship .streak");
    if (!el) { return; }
    if (G.beat === "off" || G.streak < 2) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "<b>" + G.streak + "</b><small> in stroke</small>";
    el.title = G.streak + " in stroke";
    if (!reduced()) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
  function onTile(i, btn) {
    if (!G || G.kind !== "chart" || G.busy || G.done) { return; }
    var b = G.plan.ask[G.i], tiles = G.plan.banks[b.ck] || [], tile = tiles[i];
    if (!tile) { return; }
    if (L.judgeTile(b, tile)) { right(b, btn, null); } else { wrong(b, btn, null); }
  }
  function onTyped() {
    if (!G || G.kind !== "chart" || G.busy || G.done) { return; }
    var inp = q(".ty-in"), b = G.plan.ask[G.i], val = S.longs(inp.value || "").trim();
    if (!val) { shake(inp); inp.focus(); return; }
    var res = L.judgeTyped(b, val, set.macrons, G.pool);
    if (res.ok) {
      inp.classList.add("ok");
      /* the book's way of giving every gender ("laudātus, -a, -um sum") is right, but the box shows one form */
      right(b, inp, /,/.test(res.answer) ? b.f : res.answer, L.raceRight(res) ? null : res.answer);
    } else {
      inp.classList.add("no");
      wrong(b, inp, res);
    }
  }
  function shake(el) { if (!el || reduced()) { return; } el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

  /* a right answer; slip: the right spelling of a typed form that was right but for its macrons ("Mind the macrons"),
     which the race counts as a miss */
  function right(b, from, typed, slip) {
    var ms = now() - G.t0, beat = L.beatMs(G.beat), inS = L.inStroke(ms, beat);
    G.got++; G.strokes++; G.wasRight = true;
    var t = td(b.key);
    fly(from, t, typed != null ? typed : b.e || "—");
    G.busy = true;
    later(function () { fill(b, typed, "done"); }, reduced() ? 0 : 200);
    Snd.splash();
    var charged = raceStroke(ms + (G.carry || 0), !slip);
    if (inS) {
      G.streak++; G.best = Math.max(G.best, G.streak);
      stroke(true);
      if (G.streak % 5 === 0) {
        S.sfx("star");
        var ahead = racing() && G.race.st.dock === null && L.raceLead(G.race.st) >= 1;
        shell.say(Cap(numWord(G.streak)) + " in stroke!" + (ahead ? " The Corvus falls behind!" : ""), "!cheer");
      }
    } else {
      if (beat) { G.streak = 0; }
      stroke(false);
    }
    streakBadge();
    setShip((G.i + 1) / G.plan.of);
    if (G.race) { drawRival(G.race.moored ? 1 : G.race.st.c / G.race.st.need); }
    if (typed == null) { msg(""); }
    if (slip) {
      var told = "Mind the macrons: " + la(slip) + ".";
      msg(told, "slip");
      shell.say(["Right! " + told].concat(charged ? ["In a race macrons count: that slip cost four beats."] : []), "think");
    }
    later(function () { G.busy = false; next(G.i + 1); }, reduced() ? 80 : typed != null ? 420 : 260);
  }

  function wrong(b, from, res) {
    G.busy = true;
    G.missed.push(b.key);
    G.streak = 0; streakBadge();
    shake(from);
    Snd.clash(); S.sfx("wrong");
    shipFx("clash", 640);
    var t = td(b.key);
    later(function () { fill(b, null, "miss"); callout(t, b.name); }, reduced() ? 0 : 160);
    setShip((G.i + 1) / G.plan.of);
    var line, of = res && res.other ? (res.other.who !== b.who ? " of " + la(res.other.who) : "") : "";
    if (res && res.other && res.slip) {
      line = "Only the macrons! " + la(res.other.f) + " is the " + esc(res.other.name) + of + ". This box is " + la(b.f) + ".";
    } else if (res && res.other) {
      line = la(res.other.f) + " is the " + esc(res.other.name) + of + ". This box is " + la(b.f) + ".";
    } else if (res && res.point) {
      line = "Only the macrons, but here they are the point: " + la(b.f) + ".";
    } else if (res && res.slip) {
      line = "Only the macrons: " + la(b.f) + ".";
    } else {
      line = "Oars clashed! " + la(b.f) + " is the " + esc(b.name) + ".";
    }
    msg(line, "bad");
    var comeback = G.missed.length === 1 && V && V.kind === "night" && G.leg && G.leg.why !== "again";
    var said = res ? line : "Oars clashed! That box is " + la(b.f) + ".";
    /* a wrong tile tapped too soon: the first of the day gets a tip (the race was on, so it cost four beats) */
    var ms = now() - G.t0 + (G.carry || 0), tip = false;
    if (racing() && G.race.started && G.race.st.dock === null && L.rushed(ms, G.plan.mode) && prog.race.told.rush !== S.today()) {
      prog.race.told.rush = S.today(); tip = true; save();
    }
    raceStroke(ms, false);
    /* every line said here is a free beat of reading on the next box */
    var notes = L.missNotes({ comeback: comeback, rush: tip });
    var TEXT = { clash: said, comeback: "We’ll row this chart once more at the end of tonight.", rush: "Think, then tap: slow costs less than wrong." };
    G.notes = notes.length;
    /* the tip before the "once more" line, which stays the last page, as it was before the race (the last page of
       the bubble is wider) */
    shell.say(["clash", "rush", "comeback"].filter(function (k) { return notes.indexOf(k) >= 0; }).map(function (k) { return TEXT[k]; }), "oops");
    later(function () { G.busy = false; next(G.i + 1); }, reduced() ? 900 : res ? 2100 : 1500);
  }

  /* ------------------------------------------------------------------ the drum */
  function startBeat() {
    stopBeat();
    if (!G) { return; }
    var ms = L.beatMs(G.beat);
    startBeatLabel();
    var sh = q(".view.rv"); if (sh) { sh.style.setProperty("--beat", (ms || 1200) + "ms"); }
    if (!ms) { S.duck(false); return; }
    S.duck(true);
    G.beatT = setInterval(onBeat, ms);
  }
  /* the drum button: its beat, and (when racing) that the Corvus rows to it */
  function startBeatLabel() {
    var hd = q(".hud-drum");
    if (!hd || !G) { return; }
    hd.querySelector(".hd-t").textContent = beatLabel(G.beat);
    hd.setAttribute("aria-label", "The drum: " + beatLabel(G.beat) + "." + (racing() ? " The Corvus rows to it." : "") + " Change the beat");
    hd.classList.toggle("off", !L.beatMs(G.beat));
  }
  function stopBeat() { if (G && G.beatT) { clearInterval(G.beatT); G.beatT = 0; } S.duck(false); }
  function onBeat() {
    if (!G || G.done || doc.hidden) { return; }
    var ms = L.beatMs(G.beat), since = now() - G.t0, rt = since + (G.carry || 0);
    G.waited++;
    /* a timed rest: the drum beats while the box is younger than three beats (and its free beats, after the grace);
       then both crews hold their oars up and the child thinks as long as they like */
    var rests = rt > L.restMs(ms, G.free);
    if (!rests) {
      Snd.drum(G.waited === 1);
      var dr = q(".ship .drum"), hd = q(".hud-drum");
      [dr, hd].forEach(function (x) { if (x && !reduced()) { x.classList.remove("hit"); void x.getBoundingClientRect(); x.classList.add("hit"); } });
    }
    if (G.race) { rivalBeat(rt, rests); }
    var s = q(".ship");
    if (!s) { return; }
    if (since <= ms + 250 || G.busy) { if (!reduced()) { s.classList.remove("row"); void s.offsetWidth; s.classList.add("row"); } }
    else { s.classList.add("wait"); }
  }
  function cycleDrum() {
    if (!G) { return; }
    var order = L.BEATS, i = order.indexOf(G.beat);
    G.beat = order[(i + 1) % order.length];
    if (G.step < 3) { set.beat = G.beat; save(); }
    S.sfx("tap");
    G.t0 = now(); G.waited = 0; G.carry = 0;
    /* before the first answer the race is set up again at the new beat (or the Corvus goes home); after it there is
       no race this leg: a race on is called off, and a drum turned on starts none (a race is rowed from box 1) */
    var answered = G.got + G.missed.length > 0, later2 = "";
    if (racing() && G.race.started) { callOff(); later2 = afterLine(); }
    else if (!answered) { raceSetup(); fitSea(); }
    else if (!G.race && L.raceOn(set, G.step, G.beat)) { later2 = afterLine(); }
    startBeat();
    streakBadge();
    shell.toast((G.beat === "off" ? "The drum rests." : "The drum beats " + G.beat + ".") + later2, { ms: later2 ? 2400 : 1300 });
    /* a tap (not a key) during typing: the typing box keeps the focus, so a phone keeps its keyboard up */
    var inp = G.keepTyping && typingBox();
    G.keepTyping = false;
    if (inp) { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } }
  }
  /* the toast after a race was called off (or a drum turned on too late for one): only a promise that is true */
  function afterLine() {
    var nx = V && V.kind === "night" ? V.legs[V.at + 1] : null;
    return nx && !nx.called && L.raceOn(set, nx.step) ? " The Corvus races you next leg." : " No race this leg.";
  }

  /* --------------------------------------------------------------- end of a chart */
  function finishChart() {
    G.done = true;
    stopBeat();
    var chart = G.chart, step = G.step, got = G.got, of = G.plan.of, pass = L.passes(got, of);
    var before = L.rec(prog, chart.id), wasPassed = before.passed[step - 1];
    prog = L.record(prog, chart.id, step, got, of, S.today());
    /* the race: its cost always goes into the usual; its result only on a passed chart (laurels come with a pass) */
    var R = G.race, info = { r: "off" }, end = null, recd = null;
    if (R && R.started && !R.off) {
      end = L.raceEnd(R.st);
      recd = L.recordRace(prog, { id: chart.id, step: step, key: R.key, cost: end.cost, u: R.u, from: R.from, pass: pass, r: end.r, m: end.m, H: R.H, B: R.st.B, dare: R.dare });
      info = { r: end.r, m: Math.round(end.m * 100) / 100, H: R.H, B: R.st.B, dare: R.dare, rec: recd.rec };
    }
    if (V) {
      V.played = V.played || [];
      V.played[V.at] = { id: chart.id, step: step, got: got, of: of, missed: G.missed.slice(), mode: G.plan.mode, voc: G.voc, race: info };
      if (G.missed.length && V.kind === "night") { L.queueAgain(V.legs, V.at, chart.id, step); }
    }
    var again = !pass && V && V.kind === "night" && G.leg && G.leg.why !== "again";
    var RL = R ? raceResult(R, end, recd, again, V && V.kind === "free") : null;
    /* the steady nudge: a level race won by six or more at the slow drum (once a day) */
    var nudge = false;
    if (recd && recd.rec && end.r === "won" && R.H === 0 && !R.dare && R.st.B === L.BEAT_MS.slow && end.m >= 6 && !prog.race.dareOk && prog.race.told.nudge !== S.today()) {
      prog.race.told.nudge = S.today(); nudge = true;
    }
    save();
    pips();
    setShip(1);
    /* our ship is docked at the far harbor, under the "Leg 2 of 5" tag: the tag fades until the next leg */
    var lt = q(".legtag"); if (lt) { lt.classList.add("dim"); }
    qa(".tiles .tile, .ty-in, .ty-go, .mk-key").forEach(function (x) { x.disabled = true; });
    var newly = pass && !wasPassed;
    var misses = G.missed.map(function (k) { var b = G.plan.boxes.filter(function (x) { return x.key === k; })[0]; return b ? la(b.f) + " <small>(" + esc(b.name) + ")</small>" : ""; });
    var head = got + " of " + of + " boxes";
    var line = pass ? (newly ? stepName(step) + " passed! Pennant raised." : stepName(step) + " passed again.") : "Not passed yet: at most one missed box passes.";
    var next2 = "";
    if (newly && step < 3) { next2 = stepName(step + 1) + " is open on the quay."; }
    else if (newly) { next2 = "All three pennants fly for this chart!"; }
    if (again) { next2 = "This chart comes back once more at the end of tonight."; }
    var buttons = resButtons(pass, step, info.r);
    /* Dare unlocked: the first passed level race won at the steady drum */
    if (recd && recd.dare && set.race !== "dare") { buttons += '<button type="button" class="btn wood" data-a="dare">' + A.icon("raven") + "<span>Dare them: they sail light</span></button>"; }
    var side = q(".rv-side");
    side.innerHTML = cardHTML({ RL: RL, newly: newly, pass: pass, head: head, line: line, next2: next2, misses: misses, best: G.best, buttons: buttons });
    var res = q(".rv-res");
    raceLineFit(side, next2, G.best);
    qa("[data-a]", side).forEach(function (bt) {
      bt.addEventListener("click", function () {
        var a = bt.getAttribute("data-a");
        S.sfx("tap");
        if (a === "on") { V.at++; save(); runLeg(); }
        else if (a === "up") { V.legs = [{ id: chart.id, step: step + 1, why: "free" }]; V.at = 0; runLeg(); }
        else if (a === "redo") { V.legs = [{ id: chart.id, step: step, why: "free" }]; V.at = 0; runLeg(); }
        else if (a === "dare") {
          set.race = "dare"; set = L.settings(set); save();
          /* the focus goes to the card's first button before this one is disabled (a keyboard player keeps their place) */
          var go = q('.rv-res .dock [data-enter]');
          if (go) { try { go.focus({ preventScroll: true }); } catch (e) { go.focus(); } }
          bt.disabled = true;
          var dared = "Dared! On charts where you out-row the drum, the Corvus sails light.";
          shell.toast(dared, { ms: 3200 }); shell.live(dared);
        }
        else { home(); }
      });
    });
    /* a dead heat is drawn as one: the prows side by side under "Prow to prow!" (it is within a quarter stroke; on a
       phone, where the first twentieth of a stroke is drawn 38 px wide, it would sit at our stern) */
    if (end && end.r === "heat" && !R.moored) { drawRival(1); }
    if (RL && RL.ribbon) { chip(RL.ribbon, 0, RL.cls); }
    if (pass) { S.sfx(newly ? "fanfare" : "correct"); } else { S.sfx("clue"); }
    /* on a passed chart, the race's own sound after the chart's: a star for laurels, the Corvus's cornu */
    if (recd && recd.rec) { var g = G; setTimeout(function () { if (G !== g) { return; } if (end.r === "lost") { Snd.horn(); } else { S.sfx("star"); } }, 600); }
    keepInView(res);
    try { res.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    var say = [];
    if (pass) { say.push((got === of ? "Every box! " : "") + got + " of " + of + ". " + (newly ? "Pennant raised!" : "Well rowed!")); }
    else { say.push(got + " of " + of + ". The sea was rough!"); }
    if (RL) { say = say.concat(RL.say); }
    if (recd && recd.first) { say.push(end.r === "lost" ? "Next time, a fairer race." : "Now they know your stroke."); }
    if (recd && recd.dare && set.race !== "dare") { say.push("You beat the steady drum! Dare them to sail light?"); }
    if (nudge) { say.push("At the slow drum the Corvus can’t keep up with you.", "Tap the drum before your first box to race at steady!"); }
    if (next2) { say.push(next2); }
    shell.say(say, [pass ? "!cheer" : "think", "point", "point", "point", "point", "point", "point"]);
  }
  /* "by 3 strokes", "by 1 stroke", "by a prow" (digits on the card; words: "by three strokes") */
  /* the result card's buttons: in tonight's voyage "Row on" (the next leg named under it); in free play the next step
     or "Row it again" ("Rematch" after a loss or a dead heat), and "The quay" */
  function resButtons(pass, step, r) {
    if (V && V.kind === "night") {
      var more = V.legs[V.at + 1];
      return '<button type="button" class="btn primary" data-a="on" data-enter>' + A.icon("oar") + "<span>Row on<small>" + (more ? (more.called ? "Called boxes" : esc((byId(more.id) || {}).title || "")) : "Home harbor") + "</small></span></button>";
    }
    var redo = r === "lost" || r === "heat" ? "Rematch" : "Row it again";
    return (pass && step < 3 ? '<button type="button" class="btn primary" data-a="up" data-enter>' + A.stepIcon(step + 1) + "<span>" + esc(stepName(step + 1)) + "</span></button>" : '<button type="button" class="btn primary" data-a="redo" data-enter>' + redo + "</button>") +
      (pass && step < 3 ? '<button type="button" class="btn wood" data-a="redo">Again</button>' : "") +
      '<button type="button" class="btn ghost" data-a="quay">The quay</button>';
  }
  /* the result card (finishChart; fitSea draws one unseen to keep room for it). The race line takes the place of the
     best run in stroke, and carries it */
  function cardHTML(o) {
    return '<div class="rv-res card' + (o.RL ? " raced" : "") + '" tabindex="-1">' +
      '<div class="rr-top"><span class="rr-pen' + (o.newly ? " up" : "") + '">' + A.pennant(o.pass ? "done" : "open") + "</span>" +
      '<span class="rr-t"><b class="rr-sc">' + o.head + "</b><span>" + esc(o.line) + "</span></span></div>" +
      (o.next2 ? '<p class="rr-m rr-n2">' + esc(o.next2) + "</p>" : "") +
      (o.misses.length ? '<p class="rr-miss"><b>Missed:</b> ' + o.misses.join(", ") + "</p>" : "") +
      (o.RL ? '<p class="rr-race ' + o.RL.cls + '">' + A.icon("raven") + "<span>" + raceLine(o.RL) +
        (o.best >= 3 ? '<span class="rr-run">' + (/[.!?]$/.test(o.RL.card) ? " Best run " + o.best + "." : " · best run " + o.best) + "</span>" : "") + "</span></p>" :
        o.best >= 3 ? '<p class="rr-m">Best run in stroke: ' + o.best + ".</p>" : "") +
      '<div class="dock">' + o.buttons + "</div></div>";
  }
  /* the race line of the card: the part a docked card may leave out (RL.cut) in a span of its own. RL.dup: that part
     says what the card's next-step line says ("The rematch is tonight."), so a card that shows that line (from
     900 px) leaves it out (css) */
  function raceLine(RL) {
    var nb = function (t) { return esc(t).replace(/ (\d+) (strokes?)/, " $1&nbsp;$2"); }, i = RL.cut ? RL.card.indexOf(RL.cut) : -1;
    return i < 0 ? nb(RL.card) : nb(RL.card.slice(0, i)) + '<span class="rr-more' + (RL.dup ? " dup" : "") + '">' + nb(RL.cut) + "</span>" + nb(RL.card.slice(i + RL.cut.length));
  }
  /* a docked card (below 900 px: the oars panel at the bottom of the screen) keeps the race to one line and is never
     taller than the card was before the race: the next-step line is the Inspector's (css; a screen reader still
     finds it in the card); a race line that would wrap leaves its second half to screen readers (.short: "Level
     race won! Best run 13."), and if it still would, the best run too (.tight); with no line for the race line
     to take the place of (no next-step line, no best run) the whole line is for a screen reader only (.sr-line: the
     ribbon on the strip and the Inspector give the result). side: the panel the card is in (fitSea measures a
     copy) */
  function raceLineFit(side, next2, best) {
    var rrl = q(".rr-race", side), sp = rrl && rrl.querySelector("span");
    if (!rrl || !sp || !docked()) { return; }
    var lh = parseFloat(getComputedStyle(rrl).lineHeight) || 16;
    ["short", "tight"].forEach(function (c) { if (sp.getBoundingClientRect().height > lh * 1.5) { rrl.classList.add(c); } });
    if (!next2 && !(best >= 3)) { rrl.classList.add("sr-line"); }
  }
  function byText(end, words) {
    if (end.kind === "prow") { return "by a prow"; }
    return "by " + (words ? numWord(end.by) : end.by) + (end.by === 1 ? " stroke" : " strokes");
  }
  /* the race's lines at the end of a chart: { card, cut (the part of the card's line that a docked card, below
     900 px, leaves to screen readers when the line would wrap), cls ("brass" after a recorded win or dead heat,
     else "parch"), say (the Inspector's pages, in words: each fits in two lines of the bubble on a phone), ribbon
     (the chip on the strip) } */
  function raceResult(R, end, recd, again, free) {
    if (!end) { return { card: "No race this time: the drum changed.", cut: "", cls: "parch", say: [], ribbon: "" }; }
    var r = end.r, ribbon = r === "heat" ? "Prow to prow!" : r === "won" ? "First in " + byText(end).replace(/ strokes?$/, "") + "!" : "The Corvus " + byText(end).replace(/ strokes?$/, "");
    if (!recd.rec) {
      /* a chart not passed: the race was practice. The Inspector leaves "The rematch is tonight." to his next line
         ("This chart comes back once more at the end of tonight.") */
      var pr = r === "won" ? "First in! Pass the chart for the laurels." : r === "heat" ? "Prow to prow! Pass the chart for the laurels." : "The Corvus was first in.";
      var more = again ? " The rematch is tonight." : free ? " Row it again!" : "";
      return { card: pr + more, cut: more, dup: !!again, cls: "parch", say: [pr].concat(free && !again ? ["Row it again!"] : []), ribbon: ribbon };
    }
    if (r === "heat") { return { card: "Prow to prow with the Corvus: shared laurels", cut: " with the Corvus", cls: "brass", say: ["Prow to prow with the Corvus: shared laurels!"], ribbon: ribbon }; }
    if (r === "lost") {
      return { card: "The Corvus " + byText(end) + " · rematch next time", cut: " · rematch next time", cls: "parch", say: ["The Corvus " + byText(end, true) + ". Rematch next time!"], ribbon: ribbon };
    }
    if (R.dare) { return { card: "Dare won " + byText(end).replace(/ strokes?$/, "") + "!", cut: "", cls: "brass", say: ["Dare won " + byText(end, true) + "!"], ribbon: ribbon }; }
    if (R.H === 0) { return { card: "Level race won! You out-rowed the drum.", cut: " You out-rowed the drum.", cls: "brass", say: ["Level race won " + byText(end, true) + "!"], ribbon: ribbon }; }
    return { card: "Race won " + byText(end) + (end.kind === "prow" ? "!" : ""), cut: "", cls: "brass", say: ["And you beat the Corvus " + byText(end, true) + "!"], ribbon: ribbon };
  }

  /* ------------------------------------------------------------------ called boxes */
  /* One box at a time, out of order, like a quiz. The chart of the box is shown blank on its parchment with the
     box called out, so the child sees where the form goes; each answered box fills in. A row of bells counts them. */
  function startCalled(leg) {
    var items = [], seen = {};
    if (leg.ids) {
      leg.ids.forEach(function (id) { var c = byId(id); if (c) { items.push({ chart: c, voc: L.vocShown(c, set.voc), typing: set.typing && L.rec(prog, id).passed[2], missed: [] }); } });
    } else {
      (V.played || []).forEach(function (p) {
        if (!p) { return; }
        var c = byId(p.id); if (!c) { return; }
        if (seen[p.id]) { var it = seen[p.id]; it.typing = it.typing || p.mode === "type"; it.missed = it.missed.concat(p.missed || []); return; }
        seen[p.id] = { chart: c, voc: !!p.voc, typing: p.mode === "type", missed: (p.missed || []).slice() };
        items.push(seen[p.id]);
      });
    }
    if (!items.length) {
      /* nothing rowed tonight (a voyage resumed on another day): call from the first charts of the voyage */
      V.legs.forEach(function (l) { var c = l.id && byId(l.id); if (c && !seen[l.id]) { seen[l.id] = 1; items.push({ chart: c, voc: L.vocShown(c, set.voc), typing: false, missed: [] }); } });
    }
    if (!items.length) { V.at++; save(); runLeg(); return; }
    var qs = L.called(items, { seed: "called:" + Date.now(), n: leg.ids ? 6 : items.length > 1 ? 8 : 6 });
    var vocOf = {};
    items.forEach(function (it) { vocOf[it.chart.id] = it.voc; });
    G = { kind: "called", qs: qs, i: -1, got: 0, missed: [], marks: [], busy: false, done: false, timers: [], t0: now(), beat: "off", vocOf: vocOf, sheet: null, filled: {}, plan: null };
    shell.compact(true);
    shell.el.classList.add("voyage");
    var toHome = V.kind === "night";
    shell.desk.innerHTML = '<div class="view rv rc" data-step="1">' +
      '<div class="sea-wrap">' + seaHTML(1, toHome) + "</div>" +
      '<div class="rv-main">' +
        '<section class="card rv-chart rc-sheet" aria-label="The chart of the called box"><div class="rv-tbl"></div></section>' +
        '<section class="rv-side rc-side" aria-label="Called boxes">' +
          '<div class="rv-info"><h2 class="rv-title">Called boxes</h2><p class="rc-ct"></p></div>' +
          '<div class="rv-ask">' + deckHTML(1, "off", true) + '<span class="rv-n"></span><ol class="rc-bells" aria-hidden="true">' +
            qs.map(function () { return "<li></li>"; }).join("") + "</ol></div>" +
          '<p class="rc-q"></p>' +
          '<div class="rc-a"></div>' +
          '<p class="rv-msg" aria-live="polite"></p><p class="sr rv-live" aria-live="polite" aria-atomic="true"></p>' +
          '<div class="dock rc-dock" hidden><button type="button" class="btn primary" data-a="next" data-enter>Next box</button></div>' +
        "</section>" +
      "</div></div>";
    setShip(0);
    q('[data-a="next"]').addEventListener("click", function () { if (G && G.kind === "called") { calledNext(G.i + 1); } });
    shell.say(["<b>Called boxes!</b> One box at a time, out of order.", "Like the quizzes: which form goes in the box?"], ["point", "idle"]);
    calledNext(0);
  }
  /* the chart of the called box, blank, with the boxes answered so far filled in */
  function calledSheet(id) {
    if (G.sheet === id) { return; }
    var chart = byId(id), voc = G.vocOf[id];
    var all = L.boxes(chart, { voc: voc });
    all.forEach(function (b) { b.state = "ask"; });
    G.sheet = id;
    G.plan = { chart: chart, boxes: all, step: 3, mode: "called" };
    q(".rc-ct").textContent = chart.title + " · out of order, like a quiz";
    q(".rc-sheet").setAttribute("aria-label", chart.title);
    q(".rv-tbl").innerHTML = tableHTML(G.plan);
    fitTable();
    var done = G.filled[id] || {};
    all.forEach(function (b) { if (done[b.key]) { fill(b, done[b.key] === "miss" ? null : b.f, done[b.key], true); } });
  }
  function bells() {
    qa(".rc-bells li").forEach(function (li, k) {
      li.className = G.marks[k] === true ? "ok" : G.marks[k] === false ? "no" : k === G.i ? "cur" : "";
    });
  }
  function calledNext(i) {
    if (!G || G.kind !== "called") { return; }
    var prev = G.qs[G.i];
    if (prev) { var pt = td(prev.key); if (pt) { pt.classList.remove("cur"); pt.removeAttribute("aria-current"); } }
    G.i = i; G.busy = false;
    q(".rc-dock").hidden = true;
    if (i >= G.qs.length) { finishCalled(); return; }
    var x = G.qs[i];
    /* after a miss the Inspector's "It is …" belongs to the last box: move him on */
    if (i > 0 && G.marks[i - 1] === false) { shell.say("Box " + (i + 1) + ": which form goes in it?", "idle"); }
    calledSheet(x.id);
    var t = td(x.key);
    if (t) {
      t.classList.add("cur"); t.setAttribute("aria-current", "true");
      var bx = t.querySelector(".bx"); if (bx) { bx.innerHTML = '<span class="bx-q" aria-hidden="true">?</span>'; }
    }
    q(".rv-n").textContent = (i + 1) + " / " + G.qs.length;
    /* as the quizzes ask it: "porta: dative plural?", "moneō: 2nd sg. future passive?" (the full name for a screen reader) */
    var asked = x.box && x.box.colKind === "gender" ? x.name : x.short;
    q(".rc-q").innerHTML = la(x.who) + ': <b title="' + esc(x.name) + '">' + esc(asked) + "</b>?";
    bells();
    msg("");
    announce("Called box " + (i + 1) + " of " + G.qs.length + ": " + x.who + ", " + x.name + "?");
    var a = q(".rc-a");
    if (x.typing) {
      a.innerHTML = '<div class="typer"><div class="ty-keys"></div><div class="ty-row"><input type="text" class="la-input ty-in" placeholder="Type the form" maxlength="40" aria-label="Type the ' + esc(x.name) + " of " + esc(x.who) + '"><button type="button" class="btn primary ty-go">Row</button></div></div>';
      var inp = q(".ty-in");
      if (G.typer) { try { G.typer.destroy(); } catch (e) { /* ignore */ } }
      G.typer = S.macronKeys(inp, { into: q(".ty-keys") });
      inp.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") { return; }
        e.preventDefault(); e.stopPropagation();
        if (!inp.value.trim() && shell.more()) { shell.next(); return; }
        calledTyped();
      });
      q(".ty-go").addEventListener("click", calledTyped);
      try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
    } else {
      var had = doc.activeElement && a.contains(doc.activeElement);
      a.innerHTML = '<div class="tiles four" role="group" aria-label="Forms">' + x.choices.map(function (c, k) {
        return '<button type="button" class="tile wide" data-i="' + k + '"><span class="t-k" aria-hidden="true">' + (k + 1) + '</span><span class="t-t" lang="la">' + esc(c) + "</span></button>";
      }).join("") + "</div>";
      qa(".rc-a .tile").forEach(function (b) { b.addEventListener("click", function () { calledPick(+b.getAttribute("data-i"), b); }); });
      if (had || (doc.activeElement && doc.activeElement.getAttribute && doc.activeElement.getAttribute("data-a") === "next")) { var f = a.querySelector(".tile"); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }
      if (!reduced()) { var tl = q(".rc-a .tiles"); tl.classList.remove("swap"); void tl.offsetWidth; tl.classList.add("swap"); }
    }
    keepInView(t);
  }
  function calledPick(k, btn) {
    if (!G || G.busy) { return; }
    var x = G.qs[G.i], ok = L.judgeChoice(x, x.choices[k]);
    calledDone(ok, btn, null);
  }
  function calledTyped() {
    if (!G || G.busy) { return; }
    var x = G.qs[G.i], inp = q(".ty-in"), val = S.longs(inp.value || "").trim();
    if (!val) { shake(inp); return; }
    var res = L.judgeTyped(x.box, val, set.macrons, L.typedPool(byId(x.id), CH, true));
    inp.classList.add(res.ok ? "ok" : "no");
    inp.disabled = true;
    calledDone(res.ok, inp, res);
  }
  function calledDone(ok, from, res) {
    var x = G.qs[G.i], t = td(x.key);
    G.busy = true;
    G.marks[G.i] = !!ok;
    G.filled[x.id] = G.filled[x.id] || {};
    G.filled[x.id][x.key] = ok ? "done" : "miss";
    bells();
    if (ok) {
      G.got++;
      if (from && from.classList.contains("tile")) { from.classList.add("right"); }
      S.sfx("correct"); Snd.splash(); stroke(true);
      fly(from, t, x.answer);
      later(function () { fill(x.box, x.answer, "done"); }, reduced() ? 0 : 200);
      msg(res && res.slip ? "Right! Mind the macrons: " + la(res.answer) + "." : "Right: " + la(x.answer) + ".", res && res.slip ? "slip" : "good");
      if (res && res.slip) { shell.say("Right! Mind the macrons: " + la(res.answer) + ".", "think"); }
      announce("Right: " + x.answer + ".");
      setShip((G.i + 1) / G.qs.length);
      later(function () { calledNext(G.i + 1); }, reduced() ? 300 : res && res.slip ? 1500 : 1000);
    } else {
      G.missed.push(x);
      shake(from);
      if (from && from.classList.contains("tile")) { from.classList.add("no"); }
      qa(".rc-a .tile").forEach(function (b) { if (L.judgeChoice(x, b.querySelector(".t-t").textContent)) { b.classList.add("right"); } b.disabled = true; });
      Snd.clash(); S.sfx("wrong"); shipFx("clash", 640);
      later(function () { fill(x.box, null, "miss"); callout(t, x.name); }, reduced() ? 0 : 160);
      var of = res && res.other && res.other.who !== x.who ? " of " + la(res.other.who) : "";
      var line = res && res.other ? la(res.other.f) + " is the " + esc(res.other.name) + of + ". " : res && res.point ? "Only the macrons, but here they are the point. " : res && res.slip ? "Only the macrons! " : "";
      msg(line + "The " + esc(x.name) + " is " + la(x.answer) + ".", "bad");
      setShip((G.i + 1) / G.qs.length);
      shell.say(line ? [line.trim(), "This box is " + la(x.answer) + "."] : "Oars clashed! It is " + la(x.answer) + ".", "oops");
      q(".rc-dock").hidden = false;
      var nb = q('[data-a="next"]');
      try { nb.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  }
  function finishCalled() {
    G.done = true;
    var got = G.got, of = G.qs.length;
    if (V) { V.called = { got: got, of: of }; }
    save();
    if (V && V.kind === "night") { V.at++; save(); runLeg(); return; }
    /* free play: the result in the oars panel, as after a chart */
    setShip(1);
    var side = q(".rc-side");
    side.innerHTML = '<div class="rv-res card" tabindex="-1"><div class="rr-top"><span class="rr-pen up">' + A.icon("bell") + '</span><span class="rr-t"><b class="rr-sc">' + got + " of " + of + " boxes</b><span>" + (got === of ? "Every one!" : got >= of - 1 ? "Nearly every one!" : "Practice makes the rowing easy.") + "</span></span></div>" +
      (G.missed.length ? '<p class="rr-miss"><b>To look at again:</b> ' + G.missed.map(function (x) { return la(x.answer) + " <small>(" + esc(x.who) + ", " + esc(x.name) + ")</small>"; }).join(", ") + "</p>" : "") +
      '<div class="dock"><button type="button" class="btn primary" data-a="redo" data-enter>Call more boxes</button><button type="button" class="btn ghost" data-a="quay">The quay</button></div></div>';
    q('[data-a="redo"]').addEventListener("click", function () { S.sfx("tap"); V.at = 0; runLeg(); });
    q('[data-a="quay"]').addEventListener("click", function () { S.sfx("tap"); home(); });
    var res = q(".rv-res");
    keepInView(res);
    try { res.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    S.sfx(got >= of - 1 ? "fanfare" : "clue");
    shell.say(got + " of " + of + " called boxes. " + (got === of ? "Optimē!" : "Well rowed!"), got >= of - 1 ? "!cheer" : "proud");
  }

  /* -------------------------------------------------------------- home harbor */
  function endVoyage() {
    leave();
    V.done = true;
    save();
    pips();
    shell.compact(false);
    /* each leg rowed, with why it was rowed ("once more" for a chart that came back) */
    var played = [], boxes = 0, got = 0;
    (V.played || []).forEach(function (p, i) { if (p) { played.push({ p: p, why: V.legs[i] && V.legs[i].why }); boxes += p.of; got += p.got; } });
    var cs = V.called;
    /* tonight's regatta: the races of passed charts */
    var rg = regatta(V.played), rgLine = "", rgSay = null, rgWin = rg.won + rg.heat > 0;
    if (rg.n) {
      /* a dead heat is shared laurels, never a loss: it is named, not counted against the child */
      if (rg.n === 1 && rg.won) { rgLine = "You won tonight’s race!"; }
      else if (rg.n === 1 && rg.heat) { rgLine = "Tonight’s race: prow to prow, shared laurels!"; }
      else if (rg.won === rg.n) { rgLine = "You won all " + rg.n + " races!"; }
      else if (rg.heat && !rg.lost) { rgLine = rg.won ? "Regatta: " + rg.won + " won and " + rg.heat + " prow to prow!" : "Regatta: " + rg.heat + " races prow to prow, shared laurels!"; }
      else if (rg.heat) { rgLine = "Regatta: laurels in " + (rg.won + rg.heat) + " of " + rg.n + " races!"; }
      else if (rg.won) { rgLine = "Regatta: " + rg.won + " of " + rg.n + " races to you!"; }
      else {
        var close = rg.list.slice().sort(function (a, b) { return Math.abs(a.r.m) - Math.abs(b.r.m); })[0], cc = byId(close.p.id);
        var a = Math.abs(close.r.m), by = close.r.r === "heat" ? "prow to prow" : a < L.RACE.PROW ? "by a prow" : "by " + Math.round(a) + (Math.round(a) === 1 ? " stroke" : " strokes");
        /* "Closest" only when there was more than one; the Inspector says the two sentences on two pages */
        rgSay = [(rg.n === 1 ? "A close race: " : "Closest race: ") + (cc ? cc.title : close.p.id) + ", " + by + ".", "The Corvus will be back tomorrow."];
        rgLine = rgSay.join(" ");
      }
    }
    /* a mark after each leg's score: a laurel leaf (won), a raven (the Corvus), "=" (a dead heat) */
    /* when any leg has a mark, every row (the called boxes too) keeps the mark's place, so the scores line up */
    var marks = rg.n > 0, blank = marks ? '<span class="re-mk" aria-hidden="true"></span>' : "";
    function mark(p) {
      var r = p.race;
      if (!r || !r.rec) { return blank; }
      if (r.r === "won") { return '<span class="re-mk won" title="Race won">' + A.icon("leaf") + '<span class="sr">race won</span></span>'; }
      if (r.r === "lost") { return '<span class="re-mk lost" title="The Corvus was first">' + A.icon("raven") + '<span class="sr">the Corvus was first</span></span>'; }
      return '<span class="re-mk heat" title="Prow to prow"><b aria-hidden="true">=</b><span class="sr">prow to prow</span></span>';
    }
    shell.desk.innerHTML = '<div class="view re">' +
      '<div class="re-scene">' + A.scene() + "</div>" +
      '<section class="card tabbed re-card"><span class="card-tab">Home harbor</span>' +
        '<div class="re-head"><div class="re-wreath">' + A.laurel("re-laurel") + '<span class="re-score"><b>' + got + "</b><small>of " + boxes + "</small></span></div>" +
        "<div><h2>Tonight’s voyage is done!</h2><p>" + got + " of " + boxes + " boxes" + (cs ? " and " + cs.got + " of " + cs.of + " called boxes" : "") + ".</p>" +
        (rgLine ? '<p class="re-race' + (rgWin ? " won" : "") + '">' + A.icon(rgWin ? "leaf" : "raven") + "<span>" + esc(rgLine).replace(/ (\S+)$/, "&nbsp;$1") + "</span></p>" : "") + "</div></div>" +
        '<ul class="re-legs">' + played.map(function (x) {
          var p = x.p, c = byId(p.id), pass = L.passes(p.got, p.of);
          var why = x.why === "again" ? " · once more" : x.why === "review" ? " · review" : "";
          return '<li><span class="re-pen">' + A.pennant(pass ? "done" : "open") + '</span><span class="re-t"><b>' + esc(c ? c.title : p.id) + "</b><small>" + esc(stepName(p.step) + why) + "</small></span><span class=\"re-sc\">" + p.got + "/" + p.of + "</span>" + mark(p) + "</li>";
        }).join("") +
        (cs ? '<li><span class="re-pen">' + A.icon("bell") + '</span><span class="re-t"><b>Called boxes</b><small>Out of order, like a quiz</small></span><span class="re-sc">' + cs.got + "/" + cs.of + "</span>" + blank + "</li>" : "") + "</ul>" +
        '<div class="dock"><button type="button" class="btn primary" data-a="quay" data-enter>' + A.icon("ship") + "<span>Back to the quay</span></button></div>" +
      "</section></div>";
    q('[data-a="quay"]').addEventListener("click", function () { S.sfx("tap"); home(); });
    S.sfx("rankup");
    var n = played.length;
    var lines = ["Home harbor! Well rowed, <b>" + esc(P.name) + "</b>.", Cap(numWord(n)) + " chart" + (n === 1 ? "" : "s") + " tonight: " + got + " of " + boxes + " boxes" + (cs ? ", and " + cs.got + " of " + cs.of + " called boxes." : ".")];
    if (rgLine) { lines = lines.concat((rgSay || [rgLine]).map(esc)); }
    lines.push("See you tomorrow night on the quay!");
    shell.say(lines, ["!cheer", "proud", "proud", "proud"].slice(0, lines.length - 1).concat(["wave"]));
  }

  /* leave whatever leg is being rowed (nothing of an unfinished leg is kept) */
  function leave() {
    if (G) {
      G.done = true;
      stopBeat();
      (G.timers || []).forEach(function (t) { clearTimeout(t); });
      if (G.typer) { try { G.typer.destroy(); } catch (e) { /* ignore */ } }
      G = null;
    }
    S.duck(false);
    shell.el.classList.remove("voyage");
    qa(".flyer", doc.body).forEach(function (f) { f.parentNode.removeChild(f); });
  }
  doc.addEventListener("visibilitychange", function () {
    if (!G || G.kind !== "chart" || G.done) { return; }
    /* a hidden page never counts: the race clock keeps what the box had used before it was hidden */
    if (doc.hidden) { if (!G.busy) { G.carry = (G.carry || 0) + (now() - G.t0); } stopBeat(); } else { G.t0 = now(); G.waited = 0; startBeat(); }
  });

  /* ------------------------------------------------------------------ settings */
  function openSettings() {
    var el = doc.createElement("div");
    el.className = "rs";
    function group(k, title, opts, help) {
      return '<fieldset class="rs-g"><legend>' + esc(title) + '</legend><div class="rs-seg" role="group" aria-label="' + esc(title) + '">' + opts.map(function (o) {
        var on = String(set[k]) === o[0];
        return '<button type="button" class="rs-b" data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="' + on + '">' + esc(o[1]) + "</button>";
      }).join("") + "</div>" + (help ? '<p class="rs-h">' + help + "</p>" : "") + "</fieldset>";
    }
    el.innerHTML =
      group("beat", "The drum", [["off", "Off"], ["slow", "Slow"], ["steady", "Steady"]], "The beat to row to: every 1.8 seconds (slow) or 1.2 seconds (steady), one notch slower in the Storm. The Corvus rows to it: no drum, no race. A slow answer is never wrong.") +
      group("race", "The Corvus", [["race", "Race"]].concat(prog && prog.race && prog.race.dareOk ? [["dare", "Dare"]] : []).concat([["alone", "Sail alone"]]),
        "The Corvus races you, one stroke a beat (every other beat when you type in the Storm). Cargo slows it until you row as fast as the drum. Sail alone: no race, only the drum. A race never changes a score or a pass." +
        (prog && prog.race && prog.race.dareOk ? " Dare: on charts where you row faster than the drum, it sails light, for a closer race." : "")) +
      group("voc", "The vocative row", [["book", "As the book"], ["always", "Always"], ["never", "Never"]], "The book shows it in chapters 2 and 3.") +
      group("typing", "In the Storm", [["true", "Type the forms"], ["false", "Tap endings"]], "") +
      group("macrons", "Macrons when typing", [["light", "Light"], ["strict", "Strict"]], "Light: a missing macron is shown, not counted, unless it makes another form (" + la("porta") + " for " + la("portā") + ").");
    shell.dialog({
      title: "Settings", el: el, sheet: true, buttons: [{ label: "Done", kind: "primary", value: true }],
      onOpen: function (box) {
        qa(".rs-b", box).forEach(function (b) {
          b.addEventListener("click", function () {
            var k = b.getAttribute("data-k"), v = b.getAttribute("data-v");
            set[k] = v === "true" ? true : v === "false" ? false : v;
            set = L.settings(set);
            save();
            S.sfx("tap");
            qa('.rs-b[data-k="' + k + '"]', box).forEach(function (x) { x.setAttribute("aria-pressed", String(String(set[k]) === x.getAttribute("data-v"))); });
          });
        });
      }
    }).then(function () { if (!G && !V && P && shell.view() === "game") { home("settings"); } });
  }

  /* ------------------------------------------------------------------ keys */
  doc.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) { return; }
    if (doc.querySelector(".dlg") || shell.view() !== "game") { return; }
    var t = e.target, tag = t && t.tagName;
    var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    if (!typing && /^[0-9]$/.test(e.key)) {
      var i = e.key === "0" ? 9 : +e.key - 1, b = qa(".tiles .tile")[i];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if (e.key === "Enter" && !typing) {
      if (tag === "BUTTON" || tag === "A") { return; }
      /* the button marked for Enter goes first ("Row on", "Set sail"); with none, Enter reads the Inspector's next line */
      var go = q("[data-enter]:not([disabled])");
      if (go && go.offsetParent !== null) { e.preventDefault(); go.click(); return; }
      if (shell.more()) { e.preventDefault(); shell.next(); }
    }
  });

  /* the Inspector's arrow (or his bubble) while a form is being typed: the typing box keeps the focus (and a phone
     keeps its keyboard up) */
  function typingBox() {
    if (!G || G.done || G.busy) { return null; }
    var inp = q(".ty-in");
    return inp && !inp.disabled ? inp : null;
  }
  if (shell.bubble) {
    shell.bubble.addEventListener("mousedown", function (e) {
      if (typingBox() && doc.activeElement === typingBox() && e.target.closest && e.target.closest("button")) { e.preventDefault(); }
    });
    shell.bubble.addEventListener("click", function () {
      var inp = typingBox();
      if (inp) { setTimeout(function () { if (typingBox() === inp) { try { inp.focus({ preventScroll: true }); } catch (x) { inp.focus(); } } }, 0); }
    });
  }
})();
