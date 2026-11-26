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
  var DEFAULTS = { beat: "slow", voc: "book", typing: true, macrons: "light" };
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
  function fresh() { return { charts: {}, set: settings(null), night: null }; }
  function settings(set) {
    set = set || {};
    return {
      beat: BEATS.indexOf(set.beat) >= 0 ? set.beat : DEFAULTS.beat,
      voc: ["book", "always", "never"].indexOf(set.voc) >= 0 ? set.voc : DEFAULTS.voc,
      typing: set.typing == null ? DEFAULTS.typing : !!set.typing,
      macrons: ["light", "strict"].indexOf(set.macrons) >= 0 ? set.macrons : DEFAULTS.macrons
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
    beatFor: beatFor, beatMs: beatMs, inStroke: inStroke
  };
  if (root) { root.RowLogic = RowLogic; }
  if (typeof module !== "undefined" && module.exports) { module.exports = RowLogic; }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
