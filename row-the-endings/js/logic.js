/* Row the Endings: the rules, with no DOM. window.RowLogic in the browser, module.exports in node.
 *
 * A chart (LATIN_CHARTS) is filled box by box in Wheelock's order, down each column as a child recites it
 * (porta, portae, portae, portam, portā, then the plural, then the next column), in three steps:
 *   1 Calm water: every box shows its base (s); tap the ending (e).
 *   2 Open sea:   a third of the boxes are filled; the others are blank; tap the endings.
 *   3 Storm:      a blank chart; type each whole form (or tap endings when typing is off).
 * A step is passed with at most one missed box. Tonight's voyage, the called boxes, the drum and the records
 * are all here, so tools/check.js can test them in node. */
(function (root) {
  "use strict";

  var S = root && root.LatinShell;
  if (!S && typeof require === "function") { try { S = require("../../latin-common/js/shell.js"); } catch (e) { S = null; } }
  if (!S) { throw new Error("RowLogic needs LatinShell (latin-common/js/shell.js)"); }

  var STEPS = [
    { n: 1, key: "calm", name: "Calm water", short: "Calm" },
    { n: 2, key: "open", name: "Open sea", short: "Open sea" },
    { n: 3, key: "storm", name: "Storm", short: "Storm" }
  ];
  var RANGES = { 6: [1, 8], 7: [9, 17], 8: [18, 27], 9: [28, 40] };
  var BEATS = ["off", "slow", "steady"];
  var BEAT_MS = { off: 0, slow: 1800, steady: 1200 };
  var RACE_SET = ["race", "dare", "alone"];
  var DEFAULTS = { beat: "slow", voc: "book", typing: true, macrons: "light", race: "race" };
  var GENDER = { "M.": "masculine", "F.": "feminine", "N.": "neuter", "M. and F.": "masculine and feminine" };
  var MAX_TILES = 10;     /* the number keys 1 to 9 and 0 */
  /* boxes where one vowel's length is the very point of the chart's note: under "light" a slip on that vowel
     is wrong, even though it makes no other form. c22: "The e of the genitive and dative singular is long
     after a vowel (diēī) and short after a consonant (reī)." -> the index of that e in the form. */
  var MACRON_POINT = { "c22-res-dies": { "reī": 1, "diēī": 2 } };

  function nfc(s) { s = String(s == null ? "" : s); try { return s.normalize("NFC"); } catch (e) { return s; } }
  function lc(s) { return nfc(s).toLowerCase(); }

  /* ------------------------------------------------------------ charts in play */
  function range(grade, words) {
    var g = words && words.grades && words.grades[String(grade)];
    if (g && g.chapters && g.chapters.length) { return [Math.min.apply(null, g.chapters), Math.max.apply(null, g.chapters)]; }
    return RANGES[grade] || null;
  }
  function gradeCharts(charts, grade, words) {
    var r = range(+grade, words);
    if (!r) { return []; }
    return (charts || []).filter(function (c) { return c.ch >= r[0] && c.ch <= r[1]; });
  }
  /* the last chapter of the grade that has charts (0 if none) */
  function lastChartChapter(charts, grade, words) {
    return gradeCharts(charts, grade, words).reduce(function (m, c) { return Math.max(m, c.ch); }, 0);
  }
  /* the chapter we row tonight: the player's chapter, or the last one with charts if the player is past it */
  function playChapter(charts, player, words) {
    if (!player) { return 0; }
    var last = lastChartChapter(charts, player.grade, words);
    if (!last) { return 0; }
    var gc = gradeCharts(charts, player.grade, words), ch = Math.min(+player.chapter || 0, last);
    /* a chapter of the grade with no chart of its own (a gap): the nearest earlier chapter that has one */
    while (ch > 0 && !gc.some(function (c) { return c.ch === ch; })) { ch--; }
    return ch;
  }
  /* charts in play: the grade's charts up to the play chapter, the current chapter's first, then the rest in book order */
  function inPlay(charts, player, words) {
    var cur = playChapter(charts, player, words);
    if (!cur) { return []; }
    var gc = gradeCharts(charts, player.grade, words).filter(function (c) { return c.ch <= cur; });
    return gc.filter(function (c) { return c.ch === cur; }).concat(gc.filter(function (c) { return c.ch !== cur; }));
  }
  /* { 2: true, 3: true } for the players screens' "Ready" tags */
  function chaptersWithCharts(charts) {
    var o = {};
    (charts || []).forEach(function (c) { o[c.ch] = true; });
    return o;
  }

  /* ------------------------------------------------------------ the boxes */
  function hasVoc(chart) { return chart.blocks.some(function (b) { return b.rows.some(function (r) { return !!r.voc; }); }); }
  /* is the vocative row shown? setting: "book" (the chart's own vocOn: chapters 2 and 3), "always", "never" */
  function vocShown(chart, setting) {
    if (!hasVoc(chart)) { return false; }
    if (setting === "always") { return true; }
    if (setting === "never") { return false; }
    return !!chart.vocOn;
  }
  /* all blocks have the same columns (porta | magna above Singular and Plural): one column runs through every block */
  function sameCols(chart) {
    var b0 = chart.blocks[0];
    return chart.blocks.every(function (b) {
      return b.cols.length === b0.cols.length && b.cols.every(function (c, i) { return c.w === b0.cols[i].w && c.entry === b0.cols[i].entry; });
    });
  }
  function titleHead(chart) { return String(chart.title || "").split(":")[0].trim(); }
  function words(s) { return nfc(s).split(/[\s,]+/).filter(Boolean); }
  /* what kind of column: "lemma" (porta, laudō: a word of its entry), "gender" (M., F., N.: quis, quid),
     "tense" (perfect, pluperfect, future perfect: the perfect passive system) */
  function colKind(col) {
    if (GENDER[col.w]) { return "gender"; }
    return words(col.entry).indexOf(nfc(col.w)) >= 0 ? "lemma" : "tense";
  }
  /* the label a column head shows above its entry, when the entry does not say it: "M. and F.", "Pluperfect" */
  function colLabel(col) {
    var k = colKind(col);
    if (k === "gender") { return col.w; }
    if (k === "tense") { var w = nfc(col.w); return w.charAt(0).toUpperCase() + w.slice(1); }
    return "";
  }

  /* who a box belongs to and its name, for the prompts and the miss notes:
     porta / "dative plural"; laudō / "second person singular, future passive" ("2nd sg. future passive");
     laudō / "first person singular, perfect passive"; quis, quid / "genitive plural, feminine" */
  function naming(chart, block, row, col) {
    var bl = lc(block.label || ""), name = row.name, short = row.name, who;
    if (GENDER[col.w]) {
      who = titleHead(chart);
      name = row.name + ", " + GENDER[col.w];
      short = row.name + ", " + col.w;                 /* "genitive plural, F.", as the column head has it */
    } else if (words(col.entry).indexOf(col.w) >= 0) {
      who = col.w;
      if (bl && bl !== "singular" && bl !== "plural") {
        var last = bl.split(" ").pop();
        if (lc(row.name).indexOf(last) < 0) {
          name = row.name + ", " + bl;
          short = (row.label || row.name) + " " + bl;
        }
      }
    } else {
      /* columns that are tenses (perfect | pluperfect | future perfect) */
      who = titleHead(chart);
      var voice = bl.indexOf("passive") >= 0 ? " passive" : bl.indexOf("active") >= 0 ? " active" : "";
      name = row.name + ", " + col.w + voice;
      short = (row.label || row.name) + " " + col.w + voice;
    }
    return { who: who, name: name, short: short };
  }

  /* every box of the chart in the order it is filled; o.voc: show the vocative rows */
  function boxes(chart, o) {
    o = o || {};
    var voc = o.voc == null ? !!chart.vocOn : !!o.voc, same = sameCols(chart), out = [];
    function add(bi, ri, ci) {
      var block = chart.blocks[bi], row = block.rows[ri], col = block.cols[ci], cell = row.cells[ci], nm = naming(chart, block, row, col);
      out.push({
        key: bi + "." + ri + "." + ci, b: bi, r: ri, c: ci, ck: same ? "c" + ci : "b" + bi + "c" + ci, cid: chart.id,
        f: nfc(cell.f), s: nfc(cell.s || ""), e: nfc(cell.e || ""), given: !!cell.given, alts: (cell.alts || []).map(nfc),
        voc: !!row.voc, rowKey: row.k, label: row.label, who: nm.who, name: nm.name, short: nm.short, w: col.w,
        colKind: colKind(col), entry: nfc(col.entry), block: block.label
      });
    }
    function rowsOf(bi) { var r = []; chart.blocks[bi].rows.forEach(function (row, ri) { if (!row.voc || voc) { r.push(ri); } }); return r; }
    var bi, ci;
    if (same) {
      for (ci = 0; ci < chart.blocks[0].cols.length; ci++) {
        for (bi = 0; bi < chart.blocks.length; bi++) { rowsOf(bi).forEach(function (ri) { add(bi, ri, ci); }); }
      }
    } else {
      for (bi = 0; bi < chart.blocks.length; bi++) {
        for (ci = 0; ci < chart.blocks[bi].cols.length; ci++) { rowsOf(bi).forEach(function (ri) { add(bi, ri, ci); }); }
      }
    }
    out.forEach(function (x, i) { x.i = i; });
    return out;
  }
  function answers(box) { return [box.f].concat(box.alts || []); }
  /* an ending tile's text: "-ārum", "—" for no ending, whole words as they are (quis; sum after "laudātus ") */
  function hyphened(list) { return list.some(function (b) { return b.s !== "" && !/\s$/.test(b.s); }); }
  function tileText(e, hy) { return e === "" ? "—" : (hy ? "-" + e : e); }

  /* step 2: one box in each run of three is filled already (never the first box): a third, spread over the chart */
  function prefill(list, r) {
    var keys = {}, n = Math.floor(list.length / 3), g, pick;
    for (g = 0; g < n; g++) {
      pick = g === 0 ? 1 + r.int(2) : g * 3 + r.int(3);
      keys[list[pick].key] = true;
    }
    return keys;
  }

  /* endings of every chart of a kind, for the wrong tiles from step 2 on */
  function endingPool(charts, kind) {
    var seen = {}, out = [];
    (charts || []).forEach(function (c) {
      if (c.kind !== kind) { return; }
      c.blocks.forEach(function (b) { b.rows.forEach(function (row) { row.cells.forEach(function (cell) { var e = nfc(cell.e || ""); if (!seen[e]) { seen[e] = 1; out.push(e); } }); }); });
    });
    return out;
  }

  /* the tile bank of one column: its distinct endings (shuffled once), plus two wrong ones from step 2 on:
     from the chart's other columns first, then from the other charts of the kind, pool by pool (o.pools: the
     charts in play, then the rest of the grade, then the rest); never an ending of this column, never one
     that differs from one of them only by its macrons, never one that makes a right answer of a box of the
     column. At most MAX_TILES tiles, so every tile has a number key (a column of 9 endings gets 1 wrong one). */
  function bank(colBoxes, step, r, o) {
    o = o || {};
    var hy = hyphened(colBoxes), seen = {}, rights = [];
    colBoxes.forEach(function (b) { if (!seen[b.e]) { seen[b.e] = 1; rights.push(b.e); } });
    var tiles = rights.map(function (e) { return { e: e, t: tileText(e, hy), right: true }; });
    var room = Math.max(0, Math.min(2, MAX_TILES - rights.length));
    if (step >= 2 && room) {
      var stripped = {}, rightForms = {};
      rights.forEach(function (e) { stripped[S.strip(e)] = 1; });
      colBoxes.forEach(function (b) { answers(b).forEach(function (a) { rightForms[S.norm(a)] = 1; }); });
      var ok = function (e) {
        return !seen[e] && !stripped[S.strip(e)] && !colBoxes.some(function (b) { return rightForms[S.norm(b.s + e)]; });
      };
      var extra = [];
      [o.others || []].concat(o.pools || (o.pool ? [o.pool] : [])).forEach(function (list) {
        S.shuffle(list.filter(ok), r).forEach(function (e) { if (extra.length < room && extra.indexOf(e) < 0) { extra.push(e); } });
      });
      extra.forEach(function (e) { tiles.push({ e: e, t: tileText(e, hy), right: false }); });
    }
    return S.shuffle(tiles, r);
  }

  /* one leg: the chart at a step. o: { voc, typing, seed, charts (the charts in play: the wrong tiles come from
     them first), wider (more lists of charts to fall back on: the rest of the grade, then every chart) }
     -> { chart, step, mode "tap" | "type", boxes (each with .state "ask" | "pre" | "given"), ask, of, banks { ck: tiles }, hy { ck } } */
  function plan(chart, step, o) {
    o = o || {};
    var r = S.rng(o.seed == null ? chart.id + ":" + step : o.seed);
    var all = boxes(chart, { voc: o.voc });
    var mode = step === 3 && o.typing !== false ? "type" : "tap";
    var fillable = all.filter(function (b) { return !(b.given && mode === "tap"); });
    var pre = step === 2 ? prefill(fillable, r) : {};
    all.forEach(function (b) { b.state = b.given && mode === "tap" ? "given" : pre[b.key] ? "pre" : "ask"; });
    var ask = all.filter(function (b) { return b.state === "ask"; });
    var banks = {}, hy = {};
    if (mode === "tap") {
      var cks = [];
      fillable.forEach(function (b) { if (cks.indexOf(b.ck) < 0) { cks.push(b.ck); } });
      var pools = [o.charts || [chart]].concat(o.wider || []).map(function (cs) { return endingPool(cs, chart.kind); });
      cks.forEach(function (ck) {
        var col = fillable.filter(function (b) { return b.ck === ck; });
        var others = [];
        fillable.forEach(function (b) { if (b.ck !== ck && others.indexOf(b.e) < 0) { others.push(b.e); } });
        banks[ck] = bank(col, step, r, { others: others, pools: pools });
        hy[ck] = hyphened(col);
      });
    }
    return { chart: chart, id: chart.id, step: step, mode: mode, boxes: all, ask: ask, of: ask.length, banks: banks, hy: hy };
  }

  function judgeTile(box, tile) { return !!tile && tile.e === box.e; }

  /* the charts that share a word with this one (a column with the same dictionary entry): the agō, audiō,
     capiō charts; the laudō, moneō charts; magnus with porta, amīcus and nauta */
  function kin(chart, charts) {
    var mine = {};
    chart.blocks.forEach(function (b) { b.cols.forEach(function (c) { if (colKind(c) === "lemma") { mine[S.norm(c.entry)] = 1; } }); });
    return (charts || []).filter(function (c) {
      return c.id !== chart.id && c.blocks.some(function (b) { return b.cols.some(function (col) { return mine[S.norm(col.entry)]; }); });
    });
  }
  /* every box of the kin charts (vocative rows too): a typed form is checked against these as well as the chart's
     own boxes, so agēris (future) typed as ageris (the present, another chart) is not forgiven as a macron slip */
  function kinBoxes(chart, charts) {
    var out = [];
    kin(chart, charts).forEach(function (c) { out = out.concat(boxes(c, { voc: true })); });
    return out;
  }
  /* the boxes a typed form of this chart is judged against: the chart's own (as shown) and its kin's */
  function typedPool(chart, charts, voc) { return boxes(chart, { voc: voc }).concat(kinBoxes(chart, charts)); }

  /* the vowel that is the point of the chart's note (see MACRON_POINT): -1 when there is none */
  function pointAt(box) {
    var m = MACRON_POINT[box.cid];
    return m && m[box.f] != null ? m[box.f] : -1;
  }

  /* a typed whole form. mode "ignored" | "light" | "strict" (LatinShell.check).
     light forgives a missing or extra macron, except where a macron is what tells this box from another form:
     "porta" typed for the ablative portā, or "fructus" for the genitive frūctūs, is that other form (the
     nominative), and "ageris" typed for the future agēris is the present (another chart: pass the kin charts'
     boxes in all, see typedPool), so they are wrong; so is a slip on the vowel a chart's note is about (rēī for
     reī). Strict: any macron slip is wrong (slip: true = "only the macrons").
     -> { ok, slip, answer, other (the first box it reads as, or null), others (every such box), point } */
  function judgeTyped(box, typed, mode, all) {
    mode = mode === "ignored" || mode === "strict" ? mode : "light";
    var rights = answers(box), rn = rights.map(S.norm), res = S.check(typed, rights, mode), t = S.norm(typed), others = [], point = false;
    if (t && rn.indexOf(t) < 0) {
      var ts = S.strip(t);
      (all || []).forEach(function (b) {
        if (b === box || (b.key === box.key && b.cid === box.cid)) { return; }
        var hit = answers(b).some(function (a2) {
          var n2 = S.norm(a2);
          if (rn.indexOf(n2) >= 0) { return false; }            /* the same form (portae, portae): not another */
          if (n2 === t) { return true; }                         /* exactly the other form */
          if (S.strip(n2) !== ts) { return false; }
          /* the other form with a macron left out (amicus for amīcus), and nothing like this box's form */
          if (!rn.some(function (a) { return S.strip(a) === ts; })) { return true; }
          /* same letters as this box's form too: does the typed form side with the other one where the two differ? */
          return rn.some(function (a) {
            if (S.strip(a) !== ts || a.length !== n2.length || t.length !== a.length) { return false; }
            for (var i = 0; i < a.length; i++) { if (a.charAt(i) !== n2.charAt(i) && t.charAt(i) === n2.charAt(i)) { return true; } }
            return false;
          });
        });
        if (hit) { others.push(b); }
      });
    }
    /* this chart's boxes first, the same word's first of all: "portae" typed for portam is porta's genitive
       singular, not magna's; then the kin charts' */
    var rank = function (x) { return x.cid === box.cid ? (x.ck === box.ck ? 0 : 1) : 2; };
    others.sort(function (a, b) { return rank(a) - rank(b) || a.i - b.i; });
    if (others.length && res.ok && mode !== "ignored") { res = { ok: false, slip: true, answer: res.answer }; }
    /* the vowel the note is about */
    var at = pointAt(box);
    if (res.ok && res.slip && mode === "light" && at >= 0 && t.length === box.f.length && t.charAt(at) !== S.norm(box.f).charAt(at)) {
      res = { ok: false, slip: true, answer: box.f }; point = true;
    }
    return { ok: res.ok, slip: res.slip, answer: res.ok ? res.answer : box.f, other: others[0] || null, others: others, point: point };
  }

  /* -------------------------------------------------------------- called boxes */
  /* the wrong whole forms for one called box: from the same chart (the same column first), never the right form,
     never one that differs from a right answer only by macrons, never one that is also right for the box */
  function wrongForms(box, all, r, n) {
    var rights = answers(box), rn = rights.map(S.norm), rs = rights.map(function (a) { return S.strip(S.norm(a)); });
    var seen = {}, seenS = {}, out = [];
    function okForm(f) {
      var nf = S.norm(f);
      return rn.indexOf(nf) < 0 && rs.indexOf(S.strip(nf)) < 0;
    }
    var same = S.shuffle(all.filter(function (b) { return b.ck === box.ck && b.key !== box.key; }), r);
    var rest = S.shuffle(all.filter(function (b) { return b.ck !== box.ck; }), r);
    /* first pass: forms that differ from each other in more than macrons; second pass: any distinct form */
    [true, false].forEach(function (strict) {
      same.concat(rest).forEach(function (b) {
        if (out.length >= n) { return; }
        var f = b.f, nf = S.norm(f), sf = S.strip(nf);
        if (!okForm(f) || seen[nf] || (strict && seenS[sf])) { return; }
        seen[nf] = 1; seenS[sf] = 1; out.push(f);
      });
    });
    return out;
  }
  /* items: [{ chart, voc, typing (asked by typing), missed: [box keys] }] -> n questions, out of order:
     { id, key, who, name, short, answer, answers, typing, choices (4 whole forms, or null) } */
  /* a called box whose prompt word is its own answer ("porta: nominative singular?", "quis, quid: ... quis") */
  function giveaway(b) {
    var f = S.norm(b.f);
    return words(b.who).concat([b.w]).some(function (w) { return S.norm(w) === f; });
  }
  function called(items, o) {
    o = o || {};
    var r = S.rng(o.seed == null ? "called" : o.seed), n = o.n || (items.length > 1 ? 8 : 6);
    var per = items.map(function (it) {
      var all = boxes(it.chart, { voc: it.voc });
      var fair = function (b) { return !giveaway(b); };
      /* the boxes that give their answer away come last, only when a chart has too few other forms */
      var rest = S.shuffle(all.filter(fair), r).concat(S.shuffle(all.filter(giveaway), r));
      return { it: it, all: all, missed: S.shuffle(all.filter(function (b) { return fair(b) && (it.missed || []).indexOf(b.key) >= 0; }), r), rest: rest };
    });
    var picked = [], asked = {};
    function take(p, b) {
      var k = p.it.chart.id + "|" + S.norm(b.f);
      if (asked[k]) { return false; }
      asked[k] = 1; picked.push({ p: p, b: b }); return true;
    }
    /* the boxes missed tonight first (up to half), then round the charts in turn */
    var half = Math.ceil(n / 2), guard = 0;
    per.forEach(function (p) { p.missed.forEach(function (b) { if (picked.length < half) { take(p, b); } }); });
    while (picked.length < n && guard++ < 500) {
      var any = false;
      per.forEach(function (p) {
        if (picked.length >= n) { return; }
        while (p.rest.length) { var b = p.rest.shift(); if (take(p, b)) { any = true; break; } }
      });
      if (!any) { break; }
    }
    return S.shuffle(picked, r).map(function (x) {
      var b = x.b, typing = !!x.p.it.typing, choices = null;
      if (!typing) { choices = S.shuffle([b.f].concat(wrongForms(b, x.p.all, r, 3)), r); }
      return { id: x.p.it.chart.id, key: b.key, who: b.who, name: b.name, short: b.short, answer: b.f, answers: answers(b), typing: typing, choices: choices, box: b };
    });
  }
  function judgeChoice(q, text) { return q.answers.some(function (a) { return S.norm(a) === S.norm(text); }); }

  /* ------------------------------------------------------------------ records */
  function fresh() { return { charts: {}, set: settings(null), night: null, race: raceRec(null) }; }
  function settings(set) {
    set = set || {};
    return {
      beat: BEATS.indexOf(set.beat) >= 0 ? set.beat : DEFAULTS.beat,
      voc: ["book", "always", "never"].indexOf(set.voc) >= 0 ? set.voc : DEFAULTS.voc,
      typing: set.typing == null ? DEFAULTS.typing : !!set.typing,
      macrons: ["light", "strict"].indexOf(set.macrons) >= 0 ? set.macrons : DEFAULTS.macrons,
      race: RACE_SET.indexOf(set.race) >= 0 ? set.race : DEFAULTS.race       /* the Corvus: "race", "dare" (once unlocked), "alone" */
    };
  }
  function rec(prog, id) {
    var x = prog && prog.charts && prog.charts[id];
    return {
      best: [0, 1, 2].map(function (i) { return x && x.best && x.best[i] ? { got: +x.best[i].got || 0, of: +x.best[i].of || 0 } : null; }),
      passed: [0, 1, 2].map(function (i) { return !!(x && x.passed && x.passed[i]); }),
      day: x && x.day || null
    };
  }
  function passes(got, of) { return of > 0 && got <= of && of - got <= 1; }
  function better(a, b) { if (!a) { return b; } if (!b) { return a; } var ma = a.of - a.got, mb = b.of - b.got; return mb < ma || (mb === ma && b.of > a.of) ? b : a; }
  /* a leg was rowed: the best score of the step, passed or not, the day */
  function record(prog, id, step, got, of, day) {
    prog = prog || fresh();
    prog.charts = prog.charts || {};
    var x = rec(prog, id), i = step - 1;
    x.best[i] = better(x.best[i], { got: got, of: of });
    if (passes(got, of)) { x.passed[i] = true; }
    x.day = day;
    prog.charts[id] = x;
    return prog;
  }
  function unlocked(prog, id, step) { return step === 1 || rec(prog, id).passed[step - 2]; }
  function highestPassed(prog, id) { var p = rec(prog, id).passed; return p[2] ? 3 : p[1] ? 2 : p[0] ? 1 : 0; }
  function fullyPassed(prog, id) { return highestPassed(prog, id) === 3; }
  /* the next step to row: the first not passed (passing unlocks the next), or null when all three are */
  function nextStep(prog, id) { var p = rec(prog, id).passed; return !p[0] ? 1 : !p[1] ? 2 : !p[2] ? 3 : null; }

  /* --------------------------------------------------------- tonight's voyage */
  /* legs: the current chapter's first chart not fully passed, at its next step; one review chart of an earlier
     chapter (the one rowed longest ago; never rowed first, in book order) at its highest passed step; then the
     called boxes. Charts missed tonight come back once, before the called boxes (added as the night goes). */
  function voyage(prog, list, cur, day) {
    var legs = [], used = {};
    var mine = list.filter(function (c) { return c.ch === cur; });
    var first = null;
    mine.some(function (c) { if (!fullyPassed(prog, c.id)) { first = c; return true; } return false; });
    if (first) { legs.push({ id: first.id, step: nextStep(prog, first.id), why: "new" }); used[first.id] = 1; }
    else if (mine.length) {
      var old = oldest(prog, mine);
      legs.push({ id: old.id, step: 3, why: "keep" }); used[old.id] = 1;
    }
    var earlier = list.filter(function (c) { return c.ch < cur && !used[c.id]; });
    if (earlier.length) {
      var rv = oldest(prog, earlier);
      legs.push({ id: rv.id, step: Math.max(1, highestPassed(prog, rv.id)), why: "review" });
    } else {
      var second = null;
      mine.some(function (c) { if (!used[c.id] && !fullyPassed(prog, c.id)) { second = c; return true; } return false; });
      if (second) { legs.push({ id: second.id, step: nextStep(prog, second.id), why: "new" }); }
    }
    if (legs.length) { legs.push({ called: true, why: "called" }); }
    return legs;
  }
  /* the chart rowed longest ago (never rowed counts as longest ago; ties in book order) */
  function oldest(prog, list) {
    var best = null, bd = null;
    list.slice().sort(function (a, b) { return a.ch - b.ch; }).forEach(function (c) {
      var d = rec(prog, c.id).day || "";
      if (best === null || d < bd) { best = c; bd = d; }
    });
    return best;
  }
  /* a chart missed tonight comes back once, at the same step, before the called boxes */
  function queueAgain(legs, at, id, step) {
    var leg = legs[at];
    if (!leg || leg.why === "again") { return legs; }
    if (legs.some(function (l, i) { return i > at && l.id === id && l.why === "again"; })) { return legs; }
    var ci = -1;
    legs.forEach(function (l, i) { if (l.called) { ci = i; } });
    var item = { id: id, step: step, why: "again" };
    if (ci < 0) { legs.push(item); } else { legs.splice(ci, 0, item); }
    return legs;
  }

  /* -------------------------------------------------------------------- beat */
  /* the setting is the beat of Calm water and Open sea; in the Storm it is one notch slower (slow -> off) */
  function beatFor(setting, step) {
    var i = BEATS.indexOf(setting);
    if (i < 0) { i = 1; }
    if (step === 3) { i = Math.max(0, i - 1); }
    return BEATS[i];
  }
  function beatMs(name) { return BEAT_MS[name] || 0; }
  /* an answer within one beat (and a little grace) of the box being called is "in stroke" */
  function inStroke(ms, beat) { return beat > 0 && ms >= 0 && ms <= beat + 250; }

  /* -------------------------------------------------------- the race with the Corvus */
  /* A rival bireme (the Corvus, out of Ostia) rows one stroke on every drum beat while a box waits for its answer.
     The child moves one box a stroke, as always. All in ms of "race clock" and in strokes; nothing here touches the
     judging, the score, the pass, the pennants, the again-queue or tonight's legs.
       GRACE  the in-stroke grace before a box starts to cost      REST   the most a right box costs (beats)
       MISS   what a wrong box costs (beats), more than any think  BONUS  Corvus strokes of margin the cargo aims at
       FIRST  the usual (strokes) of a first race ever at a step   FIRST_CHART  x the other charts' usual: a chart's first race at a step
       CLIP   one race moves a chart's usual by at most 20%         MERCY  the Corvus is never more than 2 strokes clear
       HEAT   a dead heat under a quarter stroke; PROW  "by a prow" under one stroke
       RUSH   a wrong tile within 0.7 s of its box is rushed        KEEP   the last 3 races make the usual */
  var RACE = { GRACE: 250, REST: 3, MISS: 4, BONUS: 2, FIRST: 2.5, FIRST_CHART: 1.5, CLIP: 0.2, MERCY: 2, HEAT: 0.25, PROW: 1, RUSH: 700, KEEP: 3 };
  var RACE_KEYS = ["calm", "open", "storm", "type"];
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function mean(list) { return list.reduce(function (s, x) { return s + x; }, 0) / list.length; }

  /* the Corvus races when the leg's drum beats (beat: the leg's own beat name, if the panel drum changed it) and the
     player has not chosen "Sail alone" */
  function raceOn(set, step, beat) {
    set = set || {};
    return (beat || beatFor(set.beat, step)) !== "off" && set.race !== "alone";
  }
  /* one Corvus stroke: a beat when tapping; two when typing in the Storm (in heavy seas they bail every other beat) */
  function strokeMs(beatMs, mode) { return mode === "type" ? 2 * beatMs : beatMs; }
  /* the usual pace is kept per chart and per key */
  function raceKey(step, mode) { return step === 1 ? "calm" : step === 2 ? "open" : mode === "type" ? "type" : "storm"; }
  /* what one answered box costs on the race clock: a right one its think time after the grace and the free beats,
     at most REST beats; a wrong one MISS beats however fast */
  function boxCost(ms, beatMs, ok, free) {
    if (!ok) { return RACE.MISS * beatMs; }
    return clamp((+ms || 0) - RACE.GRACE - (free || 0) * beatMs, 0, RACE.REST * beatMs);
  }
  /* the drum beats while a box is younger than this; then both crews hold their oars up (all legs) */
  function restMs(beatMs, free) { return RACE.GRACE + (RACE.REST + (free || 0)) * beatMs; }
  /* the Inspector's lines at a miss, one beat of free reading each on the next box: the correction, "We'll row this
     chart once more at the end of tonight", the rushed-tile tip */
  function missNotes(o) {
    o = o || {};
    var out = ["clash"];
    if (o.comeback) { out.push("comeback"); }
    if (o.rush) { out.push("rush"); }
    return out;
  }
  /* the free beats of a box: one if it starts a new column, one per line said at the miss before it */
  function freeBeats(turn, lines) { return (turn ? 1 : 0) + Math.max(0, +lines || 0); }
  /* a wrong tile tapped too soon after its box appeared (typed forms are never rushed) */
  function rushed(ms, mode) { return mode === "tap" && ms >= 0 && ms < RACE.RUSH; }
  /* right in the race: as judged, except that a macron slip (judged right, "Mind the macrons") costs a miss */
  function raceRight(res) { return !!(res && res.ok && !res.slip); }

  /* the usual cost per counted box (ms) for this chart and key: the mean of its last KEEP races; with none yet,
     FIRST_CHART x the other charts' usuals at the key; with none at the key, FIRST strokes. At most REST beats
     in the last two. -> { u, from: "chart" | "key" | "first" } */
  function usualOf(list) { var l = (list || []).slice(-RACE.KEEP); return l.length ? mean(l) : null; }
  function usual(rr, id, key, beatMs, mode) {
    var all = rr && rr.usual || {}, own = usualOf(all[id] && all[id][key]), cap = RACE.REST * beatMs, others = [];
    if (own != null) { return { u: own, from: "chart" }; }
    Object.keys(all).forEach(function (cid) { var x = cid !== id && all[cid] ? usualOf(all[cid][key]) : null; if (x != null) { others.push(x); } });
    if (others.length) { return { u: Math.min(cap, RACE.FIRST_CHART * mean(others)), from: "key" }; }
    return { u: Math.min(cap, RACE.FIRST * strokeMs(beatMs, mode)), from: "first" };
  }
  /* the cargo H: the Corvus must row n + H strokes. A child rowing at their usual pace wins by about BONUS strokes;
     a child faster than the drum (u under (n - 1.5)/(n - 1) of a stroke) races level (H 0); a dare lets H go down to
     -floor(n/2) (the Corvus sails light) */
  function cargo(u, n, beatMs, mode, dare) {
    var S = strokeMs(beatMs, mode), h = Math.round(Math.min(u, RACE.REST * beatMs) * (n - 1) / S - n + RACE.BONUS);
    return dare ? Math.max(-Math.floor(n / 2), h) : Math.max(0, h);
  }
  /* the amphorae on its deck (H is never shown as a number) */
  function amphorae(H, n) { return H <= 0 ? 0 : H <= 0.2 * n ? 1 : H <= 0.6 * n ? 2 : 3; }

  /* one race: n boxes (plan.of), cargo H, the leg's beat (ms), the mode ("tap" | "type"), a dare.
     c: the Corvus's strokes rowed of need; done: the boxes the child has answered; dock: where the child was when
     the Corvus reached the far harbor (boxes, with the part of the box used), or null */
  function race(n, H, beatMs, mode, dare) {
    return { n: n, H: H, B: beatMs, S: strokeMs(beatMs, mode), mode: mode, dare: !!dare, need: n + H, c: 0, done: 0, clock: 0, costs: [], dock: null, held: 0 };
  }
  /* the mercy rule: while the child is on box `done`, the Corvus has rowed at most (done + MERCY) / n of the course */
  function raceCap(st) { return (st.done + RACE.MERCY) * st.need / st.n; }
  /* the child answers the box st.done (ms since it appeared, right or not, its free beats). The first answer starts
     the race and its box is free. Strokes held back by the mercy rule are not made up. */
  function raceBox(st, ms, ok, free) {
    var i = st.done, k = i === 0 ? 0 : boxCost(ms, st.B, ok, free);
    if (i > 0) { st.costs.push(k); st.clock += k; }
    if (st.dock === null && k > 0) {
      var gain = k / st.S, want = st.c + gain, cap = raceCap(st), nc = Math.min(want, cap);
      if (nc < want - 1e-9) { st.held++; }
      if (nc >= st.need - 1e-9) { st.dock = i + clamp((st.need - st.c) / gain, 0, 1); nc = st.need; }
      st.c = nc;
    }
    st.done = Math.min(st.n, i + 1);
    return st;
  }
  /* where the Corvus is while box st.done waits (ms since it appeared): its share of the course p, whether the
     mercy rule holds it, whether it has moored at the far harbor */
  function raceLive(st, ms, free) {
    if (st.dock !== null) { return { p: 1, held: false, moored: true }; }
    if (st.done === 0) { return { p: st.c / st.need, held: false, moored: false }; }
    var want = st.c + boxCost(ms, st.B, true, free) / st.S, cap = raceCap(st), c = Math.min(want, cap, st.need);
    return { p: c / st.need, held: want > cap + 1e-9, moored: c >= st.need - 1e-9 };
  }
  /* the child's lead in strokes (boxes): positive ahead, negative behind; p the Corvus's share (default: as committed) */
  function raceLead(st, p) { return st.done - (p == null ? st.c / st.need : p) * st.n; }
  /* "Final stretch!": three boxes or fewer to go and the race within two strokes */
  function stretch(st) { var left = st.n - st.done; return st.dock === null && left > 0 && left <= 3 && Math.abs(raceLead(st)) <= 2; }
  /* the end: the child first, by n x (1 - p); the Corvus first, by the boxes the child still had to row.
     -> { r: "won" | "heat" | "lost", m (signed: + the child), kind: "heat" | "prow" | "strokes", by (rounded), cost (mean per counted box) } */
  function raceEnd(st) {
    var m = st.dock !== null ? -(st.n - st.dock) : st.n * (1 - st.c / st.need), a = Math.abs(m);
    var r = a < RACE.HEAT ? "heat" : m > 0 ? "won" : "lost";
    return { r: r, m: m, kind: r === "heat" ? "heat" : a < RACE.PROW ? "prow" : "strokes", by: Math.max(1, Math.round(a)), cost: st.costs.length ? mean(st.costs) : null };
  }
  /* where to draw the Corvus on its track (px from the start of the track, tw px long). From 600 px up, where the
     race clock says; on a phone a box is a few px, so it is drawn from our ship, at most 3 strokes either way
     (leadPx). o: { lo: px it may go back past the start (over the quay), hi: px past the far end (its mooring in
     the harbor), wait: the race has not started (it waits at the quay, behind us, where it shows), moored: it docked
     first (it moors in the harbor, ahead of our prow) } */
  var LEAD_PX = 24, LEAD_BACK = 48, LEAD_NEAR = 38, LEAD_FORE = 10, NEAR = 0.01;
  /* on a phone: how many px behind our ship the Corvus is drawn (negative: ahead) for a lead in strokes (positive:
     we lead, it is behind). Our sail is 33 px wide and its sail 23 px, on masts 15 px apart when the prows are level:
     from about 3 px ahead of level (7 px when the ships pitch in the Storm) to about 34 px behind it, our sail
     covers more than two fifths of its sail. And a close race rests there: a child who takes three beats or more
     over a box has the Corvus row its three strokes and hold water within a few hundredths of a stroke of level
     (the cargo is set so). So the mapping is steep through there, on both sides of level: the first NEAR of a
     stroke behind is drawn LEAD_NEAR px back (its sail is out past our stern), the first NEAR of a stroke ahead
     LEAD_FORE px forward (its sail is out past our sail's leading edge). Then it is gentle: a whole stroke behind
     is LEAD_BACK px (so in the final stretch it stays near us), a whole stroke ahead LEAD_PX px, and LEAD_PX a
     stroke beyond a stroke either way. Level is 0 (the prows side by side); continuous, never decreasing, and flat
     beyond 3 strokes either way */
  function leadPx(lead) {
    lead = clamp(+lead || 0, -3, 3);
    return lead <= -1 ? lead * LEAD_PX :
      lead < -NEAR ? -LEAD_FORE + (lead + NEAR) / (1 - NEAR) * (LEAD_PX - LEAD_FORE) :
      lead <= 0 ? lead / NEAR * LEAD_FORE :
      lead <= NEAR ? lead / NEAR * LEAD_NEAR :
      lead <= 1 ? LEAD_NEAR + (lead - NEAR) / (1 - NEAR) * (LEAD_BACK - LEAD_NEAR) : LEAD_BACK + (lead - 1) * LEAD_PX;
  }
  function rivalX(done, n, p, tw, phone, o) {
    o = o || {};
    var lo = Math.max(0, +o.lo || 0), hi = Math.max(0, +o.hi || 0);
    if (o.wait) { return -lo; }
    if (o.moored) { return tw + hi; }
    if (!phone) { return clamp(p, 0, 1) * tw; }
    return clamp(done / n * tw - leadPx(done - p * n), -lo, tw + hi);
  }

  /* the race records of a player, cleaned (odd or old values dropped, as settings() does) */
  function emptyUsual() { return { calm: [], open: [], storm: [], type: [] }; }
  function count(x) { x = +x; return isFinite(x) && x >= 0 ? Math.floor(x) : 0; }
  function dayOf(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; }
  function raceRec(prog) {
    var x = prog && prog.race && typeof prog.race === "object" && !Array.isArray(prog.race) ? prog.race : {};
    var usualAll = {}, src = x.usual && typeof x.usual === "object" && !Array.isArray(x.usual) ? x.usual : {};
    Object.keys(src).forEach(function (id) {
      var per = src[id], o = emptyUsual(), any = false;
      if (!per || typeof per !== "object" || Array.isArray(per)) { return; }
      RACE_KEYS.forEach(function (k) {
        o[k] = (Array.isArray(per[k]) ? per[k] : []).filter(function (v) { return typeof v === "number" && isFinite(v) && v >= 0 && v <= 60000; }).slice(-RACE.KEEP);
        if (o[k].length) { any = true; }
      });
      if (any) { usualAll[id] = o; }
    });
    var b = x.best, t = x.told && typeof x.told === "object" ? x.told : {};
    var best = b && typeof b === "object" && typeof b.m === "number" && isFinite(b.m) && b.m > 0 && typeof b.id === "string" ?
      { m: b.m, id: b.id, step: [1, 2, 3].indexOf(b.step) >= 0 ? b.step : 1 } : null;
    return {
      usual: usualAll, races: count(x.races), won: count(x.won), heat: count(x.heat), lost: count(x.lost), best: best,
      run: count(x.run), bestRun: Math.max(count(x.bestRun), count(x.run)), dareOk: x.dareOk === true,
      told: { first: t.first === true, mercy: t.mercy === true, rush: dayOf(t.rush), port: dayOf(t.port), rest: dayOf(t.rest), nudge: dayOf(t.nudge), alone: t.alone === true }
    };
  }
  /* a race rowed to the end (never one called off). o: { id, step, key, cost, u, from, pass, r, m, H, B, dare }.
     The cost always goes into the chart's usual at the key (clipped to within CLIP of the usual it was raced against,
     when that came from this chart's own races); the result only on a passed chart: laurels come with a pass.
     -> { rec (the result was recorded), dare (Dare newly unlocked), first (the first race ever at this key) } */
  function recordRace(prog, o) {
    prog = prog || fresh();
    o = o || {};
    var rr = prog.race = raceRec(prog), cost = o.cost;
    if (typeof cost === "number" && isFinite(cost) && cost >= 0 && o.id && RACE_KEYS.indexOf(o.key) >= 0) {
      if (o.from === "chart" && o.u > 0) { cost = clamp(cost, o.u * (1 - RACE.CLIP), o.u * (1 + RACE.CLIP)); }
      var per = rr.usual[o.id] = rr.usual[o.id] || emptyUsual();
      per[o.key] = per[o.key].concat([Math.round(cost)]).slice(-RACE.KEEP);
    }
    rr.races++;
    var out = { rec: false, dare: false, first: o.from === "first" };
    if (o.pass && (o.r === "won" || o.r === "heat" || o.r === "lost")) {
      out.rec = true;
      rr[o.r]++;
      if (o.r === "won") {
        rr.run++;
        if (!rr.best || o.m > rr.best.m) { rr.best = { m: Math.round(o.m * 100) / 100, id: o.id, step: o.step }; }
        /* Dare unlocks at the first passed level race won at the steady drum */
        if (!rr.dareOk && o.H === 0 && !o.dare && o.B === BEAT_MS.steady) { rr.dareOk = true; out.dare = true; }
      } else if (o.r === "lost") { rr.run = 0; }      /* a dead heat keeps the run */
      rr.bestRun = Math.max(rr.bestRun, rr.run);
    }
    return out;
  }

  var RowLogic = {
    STEPS: STEPS, BEATS: BEATS, BEAT_MS: BEAT_MS, DEFAULTS: DEFAULTS,
    range: range, gradeCharts: gradeCharts, lastChartChapter: lastChartChapter, playChapter: playChapter, inPlay: inPlay, chaptersWithCharts: chaptersWithCharts,
    hasVoc: hasVoc, vocShown: vocShown, sameCols: sameCols, naming: naming, colKind: colKind, colLabel: colLabel, GENDER: GENDER,
    boxes: boxes, answers: answers, tileText: tileText, MAX_TILES: MAX_TILES, MACRON_POINT: MACRON_POINT,
    prefill: prefill, endingPool: endingPool, bank: bank, plan: plan, judgeTile: judgeTile,
    kin: kin, kinBoxes: kinBoxes, typedPool: typedPool, judgeTyped: judgeTyped,
    wrongForms: wrongForms, giveaway: giveaway, called: called, judgeChoice: judgeChoice,
    fresh: fresh, settings: settings, rec: rec, passes: passes, record: record, unlocked: unlocked, highestPassed: highestPassed,
    fullyPassed: fullyPassed, nextStep: nextStep, voyage: voyage, oldest: oldest, queueAgain: queueAgain,
    beatFor: beatFor, beatMs: beatMs, inStroke: inStroke,
    RACE: RACE, RACE_KEYS: RACE_KEYS, RACE_SET: RACE_SET, LEAD_PX: LEAD_PX, LEAD_BACK: LEAD_BACK, LEAD_NEAR: LEAD_NEAR, LEAD_FORE: LEAD_FORE, NEAR: NEAR,
    raceOn: raceOn, strokeMs: strokeMs, raceKey: raceKey, boxCost: boxCost, restMs: restMs, missNotes: missNotes, freeBeats: freeBeats,
    rushed: rushed, raceRight: raceRight, usual: usual, cargo: cargo, amphorae: amphorae, race: race, raceCap: raceCap, raceBox: raceBox,
    raceLive: raceLive, raceLead: raceLead, stretch: stretch, raceEnd: raceEnd, leadPx: leadPx, rivalX: rivalX, raceRec: raceRec, recordRace: recordRace
  };
  if (root) { root.RowLogic = RowLogic; }
  if (typeof module !== "undefined" && module.exports) { module.exports = RowLogic; }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
