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
      clash: function () { if (!ready()) { return; } try { [0, 0.085].forEach(function (at, i) { burst(at, 0.07, 0.34, "bandpass", i ? 760 : 1050, null, 5); tone(at, 0.09, 0.16, "triangle", i ? 210 : 260, i ? 150 : 190); }); } catch (e) { /* silent */ } }
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
      btn = '<p class="rh-done">' + A.icon("ship") + "<span>Home harbor! Tonight’s voyage is done.</span></p>" +
        '<button type="button" class="btn wood block" data-a="again">' + A.icon("oar") + "<span>One more voyage<small>A new one, from where you are now</small></span></button>";
    } else if (at > 0) {
      btn = '<button type="button" class="btn primary block" data-a="sail" data-enter>' + A.icon("oar") + "<span>Row on<small>Leg " + (at + 1) + " of " + legs.length + "</small></span></button>";
    } else {
      btn = '<button type="button" class="btn primary block" data-a="sail" data-enter>' + A.icon("ship") + "<span>Set sail<small>About " + minutes(legs) + " minutes</small></span></button>";
    }
    return '<section class="card tabbed rh-night"><span class="card-tab">Tonight’s voyage</span><ol class="rh-legs">' + items + "</ol>" + btn + "</section>";
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
      '<div class="hb hb-from">' + A.quay() + "</div>" +
      '<div class="hb hb-to' + (toHome ? " home" : "") + '">' + (toHome ? A.lighthouse() : A.port()) + "</div>" +
      '<div class="wv wv-back"><div class="wv-in">' + A.waves(step, "back") + "</div></div>" +
      '<div class="track"><div class="runner"><div class="ship"><div class="bob">' + A.ship() + '</div><span class="spray"></span><span class="streak" hidden></span></div></div></div>' +
      '<div class="wv wv-front"><div class="wv-in">' + A.waves(step, "front") + "</div></div>" +
      "</div>" + '<span class="legtag"' + (legText() ? "" : " hidden") + ">" + legText() + "</span>";
  }
  /* the step and the drum, at the head of the oars panel */
  function deckHTML(step, beatName, called) {
    return '<span class="deck-step" title="' + (called ? "Called boxes" : esc(stepName(step))) + '">' + (called ? A.icon("bell") + '<span class="ds-t">Called boxes</span>' : A.stepIcon(step) + '<span class="ds-t">' + esc(stepName(step)) + "</span>") + "</span>" +
      (called ? "" : '<button type="button" class="hud-drum" data-a="drum" aria-label="The drum: ' + beatLabel(beatName) + '. Change the beat">' + A.icon("drum") + '<span class="hd-t">' + beatLabel(beatName) + "</span></button>");
  }
  function beatLabel(b) { return b === "off" ? "No drum" : b === "slow" ? "Slow" : "Steady"; }
  function setShip(p) {
    var r = q(".runner");
    if (r) { r.style.transform = "translateX(" + (Math.max(0, Math.min(1, p)) * 100).toFixed(2) + "%)"; }
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
    q('[data-a="drum"]').addEventListener("click", cycleDrum);
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
    if (G.leg && G.leg.why === "again") { lines.unshift("Once more: " + esc(chart.title) + "."); }
    if (G.beat !== "off") { lines.push("Row to the drum: one box a beat. Slow is fine too."); }
    shell.say(lines, ["point", "idle", "idle", "idle"]);
    startBeat();
    next(0);
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
    if (b.ck !== G.ck) {
      var changed = G.ck !== null;
      G.ck = b.ck;
      if (plan.mode === "tap") { renderBank(b.ck, changed); }
      if (changed) { shell.say(colLine(b), "point"); }
    }
    q(".rv-n").textContent = (i + 1) + " / " + plan.of;
    /* the column's own word: porta, laudō; quī, quae for the pronoun's gender columns */
    q(".rv-q").innerHTML = la(b.colKind === "gender" ? b.entry : b.who) + ' <span class="rv-dot">·</span> <span class="rv-nm">' + esc(b.short) + "</span>";
    /* for a screen reader: which box is next (and that the last one was right) */
    announce((G.wasRight ? "Right. " : "") + "Box " + (i + 1) + " of " + plan.of + ": " + b.who + ", " + b.name + ".");
    G.wasRight = false;
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

  function msg(html, kind) {
    var m = q(".rv-msg");
    if (!m) { return; }
    m.className = "rv-msg";
    m.innerHTML = html || "";
    if (kind) { m.classList.add(kind); }
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
      right(b, inp, /,/.test(res.answer) ? b.f : res.answer);
      if (res.slip) { msg("Mind the macrons: " + la(res.answer) + ".", "slip"); shell.say("Right! Mind the macrons: " + la(res.answer) + ".", "think"); }
    } else {
      inp.classList.add("no");
      wrong(b, inp, res);
    }
  }
  function shake(el) { if (!el || reduced()) { return; } el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

  function right(b, from, typed) {
    var ms = now() - G.t0, beat = L.beatMs(G.beat), inS = L.inStroke(ms, beat);
    G.got++; G.strokes++; G.wasRight = true;
    var t = td(b.key);
    fly(from, t, typed != null ? typed : b.e || "—");
    G.busy = true;
    later(function () { fill(b, typed, "done"); }, reduced() ? 0 : 200);
    Snd.splash();
    if (inS) {
      G.streak++; G.best = Math.max(G.best, G.streak);
      stroke(true);
      if (G.streak % 5 === 0) { S.sfx("star"); shell.say(Cap(numWord(G.streak)) + " in stroke!", "!cheer"); }
    } else {
      if (beat) { G.streak = 0; }
      stroke(false);
    }
    streakBadge();
    setShip((G.i + 1) / G.plan.of);
    if (typed == null) { msg(""); }
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
    shell.say(comeback ? [said, "We’ll row this chart once more at the end of tonight."] : said, "oops");
    later(function () { G.busy = false; next(G.i + 1); }, reduced() ? 900 : res ? 2100 : 1500);
  }

  /* ------------------------------------------------------------------ the drum */
  function startBeat() {
    stopBeat();
    if (!G) { return; }
    var ms = L.beatMs(G.beat);
    var hd = q(".hud-drum");
    if (hd) { hd.querySelector(".hd-t").textContent = beatLabel(G.beat); hd.setAttribute("aria-label", "The drum: " + beatLabel(G.beat) + ". Change the beat"); hd.classList.toggle("off", !ms); }
    var sh = q(".view.rv"); if (sh) { sh.style.setProperty("--beat", (ms || 1200) + "ms"); }
    if (!ms) { S.duck(false); return; }
    S.duck(true);
    G.beatT = setInterval(onBeat, ms);
  }
  function stopBeat() { if (G && G.beatT) { clearInterval(G.beatT); G.beatT = 0; } S.duck(false); }
  function onBeat() {
    if (!G || G.done || doc.hidden) { return; }
    var ms = L.beatMs(G.beat), since = now() - G.t0;
    G.waited++;
    if (G.waited <= 3) {
      Snd.drum(G.waited === 1);
      var dr = q(".ship .drum"), hd = q(".hud-drum");
      [dr, hd].forEach(function (x) { if (x && !reduced()) { x.classList.remove("hit"); void x.getBoundingClientRect(); x.classList.add("hit"); } });
    }
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
    G.t0 = now(); G.waited = 0;
    startBeat();
    streakBadge();
    shell.toast(G.beat === "off" ? "The drum rests." : "The drum beats " + G.beat + ".", { ms: 1300 });
  }

  /* --------------------------------------------------------------- end of a chart */
  function finishChart() {
    G.done = true;
    stopBeat();
    var chart = G.chart, step = G.step, got = G.got, of = G.plan.of, pass = L.passes(got, of);
    var before = L.rec(prog, chart.id), wasPassed = before.passed[step - 1];
    prog = L.record(prog, chart.id, step, got, of, S.today());
    if (V) {
      V.played = V.played || [];
      V.played[V.at] = { id: chart.id, step: step, got: got, of: of, missed: G.missed.slice(), mode: G.plan.mode, voc: G.voc };
      if (G.missed.length && V.kind === "night") { L.queueAgain(V.legs, V.at, chart.id, step); }
    }
    save();
    pips();
    setShip(1);
    qa(".tiles .tile, .ty-in, .ty-go, .mk-key").forEach(function (x) { x.disabled = true; });
    var newly = pass && !wasPassed;
    var misses = G.missed.map(function (k) { var b = G.plan.boxes.filter(function (x) { return x.key === k; })[0]; return b ? la(b.f) + " <small>(" + esc(b.name) + ")</small>" : ""; });
    var head = got + " of " + of + " boxes";
    var line = pass ? (newly ? stepName(step) + " passed! Pennant raised." : stepName(step) + " passed again.") : "Not passed yet: at most one missed box passes.";
    var next2 = "";
    if (newly && step < 3) { next2 = stepName(step + 1) + " is open on the quay."; }
    else if (newly) { next2 = "All three pennants fly for this chart!"; }
    if (!pass && V && V.kind === "night" && G.leg && G.leg.why !== "again") { next2 = "This chart comes back once more at the end of tonight."; }
    var buttons;
    if (V && V.kind === "night") {
      var more = V.legs[V.at + 1];
      buttons = '<button type="button" class="btn primary" data-a="on" data-enter>' + A.icon("oar") + "<span>Row on<small>" + (more ? (more.called ? "Called boxes" : esc((byId(more.id) || {}).title || "")) : "Home harbor") + "</small></span></button>";
    } else {
      buttons = (pass && step < 3 ? '<button type="button" class="btn primary" data-a="up" data-enter>' + A.stepIcon(step + 1) + "<span>" + esc(stepName(step + 1)) + "</span></button>" : '<button type="button" class="btn primary" data-a="redo" data-enter>Row it again</button>') +
        (pass && step < 3 ? '<button type="button" class="btn wood" data-a="redo">Again</button>' : "") +
        '<button type="button" class="btn ghost" data-a="quay">The quay</button>';
    }
    var side = q(".rv-side");
    side.innerHTML = '<div class="rv-res card" tabindex="-1">' +
      '<div class="rr-top"><span class="rr-pen' + (newly ? " up" : "") + '">' + A.pennant(pass ? "done" : "open") + "</span>" +
      '<span class="rr-t"><b class="rr-sc">' + head + "</b><span>" + esc(line) + "</span></span></div>" +
      (next2 ? '<p class="rr-m">' + esc(next2) + "</p>" : "") +
      (misses.length ? '<p class="rr-miss"><b>Missed:</b> ' + misses.join(", ") + "</p>" : "") +
      (G.best >= 3 ? '<p class="rr-m">Best run in stroke: ' + G.best + ".</p>" : "") +
      '<div class="dock">' + buttons + "</div></div>";
    var res = q(".rv-res");
    qa("[data-a]", side).forEach(function (bt) {
      bt.addEventListener("click", function () {
        var a = bt.getAttribute("data-a");
        S.sfx("tap");
        if (a === "on") { V.at++; save(); runLeg(); }
        else if (a === "up") { V.legs = [{ id: chart.id, step: step + 1, why: "free" }]; V.at = 0; runLeg(); }
        else if (a === "redo") { V.legs = [{ id: chart.id, step: step, why: "free" }]; V.at = 0; runLeg(); }
        else { home(); }
      });
    });
    if (pass) { S.sfx(newly ? "fanfare" : "correct"); } else { S.sfx("clue"); }
    keepInView(res);
    try { res.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    var say = [];
    if (pass) { say.push((got === of ? "Every box! " : "") + got + " of " + of + ". " + (newly ? "Pennant raised!" : "Well rowed!")); }
    else { say.push(got + " of " + of + ". The sea was rough!"); }
    if (next2) { say.push(next2); }
    shell.say(say, [pass ? "!cheer" : "think", "point"]);
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
    shell.desk.innerHTML = '<div class="view re">' +
      '<div class="re-scene">' + A.scene() + "</div>" +
      '<section class="card tabbed re-card"><span class="card-tab">Home harbor</span>' +
        '<div class="re-head"><div class="re-wreath">' + A.laurel("re-laurel") + '<span class="re-score"><b>' + got + "</b><small>of " + boxes + "</small></span></div>" +
        "<div><h2>Tonight’s voyage is done!</h2><p>" + got + " of " + boxes + " boxes" + (cs ? " and " + cs.got + " of " + cs.of + " called boxes" : "") + ".</p></div></div>" +
        '<ul class="re-legs">' + played.map(function (x) {
          var p = x.p, c = byId(p.id), pass = L.passes(p.got, p.of);
          var why = x.why === "again" ? " · once more" : x.why === "review" ? " · review" : "";
          return '<li><span class="re-pen">' + A.pennant(pass ? "done" : "open") + '</span><span class="re-t"><b>' + esc(c ? c.title : p.id) + "</b><small>" + esc(stepName(p.step) + why) + "</small></span><span class=\"re-sc\">" + p.got + "/" + p.of + "</span></li>";
        }).join("") +
        (cs ? '<li><span class="re-pen">' + A.icon("bell") + '</span><span class="re-t"><b>Called boxes</b><small>Out of order, like a quiz</small></span><span class="re-sc">' + cs.got + "/" + cs.of + "</span></li>" : "") + "</ul>" +
        '<div class="dock"><button type="button" class="btn primary" data-a="quay" data-enter>' + A.icon("ship") + "<span>Back to the quay</span></button></div>" +
      "</section></div>";
    q('[data-a="quay"]').addEventListener("click", function () { S.sfx("tap"); home(); });
    S.sfx("rankup");
    var n = played.length;
    shell.say(["Home harbor! Well rowed, <b>" + esc(P.name) + "</b>.", Cap(numWord(n)) + " chart" + (n === 1 ? "" : "s") + " tonight: " + got + " of " + boxes + " boxes" + (cs ? ", and " + cs.got + " of " + cs.of + " called boxes." : "."), "See you tomorrow night on the quay!"], ["!cheer", "proud", "wave"]);
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
    if (doc.hidden) { stopBeat(); } else { G.t0 = now(); G.waited = 0; startBeat(); }
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
      group("beat", "The drum", [["off", "Off"], ["slow", "Slow"], ["steady", "Steady"]], "One beat every 1.8 seconds (slow) or 1.2 seconds (steady). In the Storm it beats one notch slower. A slow answer is never wrong.") +
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
