#!/usr/bin/env node
/* Row the Endings: checks before publishing. Run: node tools/check.js (from row-the-endings/ or anywhere).
 *
 * Loads latin-common/js/words.js, charts.js and shell.js and this game's js/logic.js in a vm context, then for
 * every chart of grades 6 and 8 in the ready chapters, every step, both vocative settings and many seeds:
 *   - the boxes: base + ending = the form, Wheelock's order down each column, one name per box;
 *   - step 2 fills a third of the boxes, spread out, never the first; given boxes are shown at the tap steps;
 *   - every tile bank holds the right ending of each of its boxes exactly once, no duplicate tiles, and the
 *     wrong tiles (from step 2 on) are never right for any box of the column nor differ only by macrons;
 *   - typed forms: right, alternatives, case and spaces, missing macrons in each strictness, another box's form;
 *   - called boxes: the right form among 4 choices exactly once, no wrong choice that is right, equal, or
 *     differs only by macrons, no duplicates, the boxes missed tonight first;
 *   - the records and tonight's voyage: passing (at most one missed box), unlocking, the next step, the review
 *     chart, the charts missed tonight coming back once, the drum's beat at each step.
 * Prints a summary and exits with 1 on any failure. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var HERE = path.resolve(__dirname, ".."), COMMON = path.resolve(HERE, "../latin-common/js");
var ctx = { console: console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
["words.js", "charts.js", "shell.js"].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(COMMON, f), "utf8"), ctx, { filename: f }); });
vm.runInContext(fs.readFileSync(path.join(HERE, "js/logic.js"), "utf8"), ctx, { filename: "logic.js" });

var W = ctx.LATIN_WORDS, C = ctx.LATIN_CHARTS, S = ctx.LatinShell, L = ctx.RowLogic;
var fails = [], counts = {};
function ok(cond, what) { counts[what.split(":")[0]] = (counts[what.split(":")[0]] || 0) + 1; if (!cond) { fails.push(what); } return cond; }
function eq(a, b, what) { return ok(JSON.stringify(a) === JSON.stringify(b), what + " (got " + JSON.stringify(a) + ", want " + JSON.stringify(b) + ")"); }
function nfc(s) { return String(s).normalize("NFC"); }
var SEEDS = 120;

/* ------------------------------------------------------------------ the charts in play */
var ready = Object.keys(W.chapters).filter(function (k) { return W.chapters[k].ready; }).map(Number);
var charts = C.charts.filter(function (c) { return (c.ch <= 8 || (c.ch >= 18 && c.ch <= 27)) && ready.indexOf(c.ch) >= 0; });
ok(charts.length === C.charts.length, "data: every chart is in a ready chapter of grade 6 or 8");
ok(charts.length >= 10, "data: at least ten charts");
var ids = {};
charts.forEach(function (c) { ok(!ids[c.id], "data: chart id unique " + c.id); ids[c.id] = 1; });

var CASES = ["Nom.", "Gen.", "Dat.", "Acc.", "Abl.", "Voc."], PERS = ["1s", "2s", "3s", "1p", "2p", "3p"];

function gradeOf(chart) { return chart.ch <= 8 ? 6 : 8; }
function uniq(list) { return list.filter(function (x, i) { return list.indexOf(x) === i; }); }

charts.forEach(function (chart) {
  var id = chart.id;
  /* the charts of a player at this chart's chapter: in play, the rest of the grade, all */
  var gc = L.gradeCharts(C.charts, gradeOf(chart), W), inPlayHere = gc.filter(function (c) { return c.ch <= chart.ch; });
  var gradeEndings = L.endingPool(gc, chart.kind);
  /* Wheelock's order of the rows */
  chart.blocks.forEach(function (b) {
    var labs = b.rows.map(function (r) { return r.label; }).filter(function (l) { return CASES.indexOf(l) >= 0; });
    var idx = labs.map(function (l) { return CASES.indexOf(l); });
    ok(idx.every(function (v, i) { return i === 0 || v > idx[i - 1]; }), "order: cases in Wheelock's order in " + id + " " + b.label);
    var ks = b.rows.map(function (r) { return r.k; }).filter(function (k) { return PERS.indexOf(k) >= 0; }).map(function (k) { return PERS.indexOf(k); });
    ok(ks.every(function (v, i) { return i === 0 || v > ks[i - 1]; }), "order: persons in Wheelock's order in " + id + " " + b.label);
    var vr = b.rows.filter(function (r) { return r.voc; });
    ok(vr.every(function (r) { return r.label === "Voc."; }), "order: vocative rows are labelled Voc. in " + id);
    if (vr.length) { ok(b.rows[b.rows.length - 1].voc, "order: the vocative row is last in " + id + " " + b.label); }
  });

  [true, false].forEach(function (voc) {
    var bx = L.boxes(chart, { voc: voc });
    var visible = 0;
    chart.blocks.forEach(function (b) { b.rows.forEach(function (r) { if (!r.voc || voc) { visible += b.cols.length; } }); });
    eq(bx.length, visible, "boxes: one box per visible cell " + id + " voc " + voc);
    bx.forEach(function (b) {
      ok(nfc(b.s + b.e) === nfc(b.f), "boxes: base + ending = form " + id + " " + b.key + " " + b.f);
      ok(!!b.who && !!b.name && !!b.short, "boxes: every box has a name " + id + " " + b.key);
      if (!voc) { ok(!b.voc, "boxes: no vocative when it is off " + id); }
    });
    /* down each column: a column's boxes are together, in block then row order */
    var seenCk = {}, last = null;
    bx.forEach(function (b) {
      if (b.ck !== last) { ok(!seenCk[b.ck], "order: column " + b.ck + " is filled in one run " + id); seenCk[b.ck] = 1; last = b.ck; }
    });
    Object.keys(seenCk).forEach(function (ck) {
      var col = bx.filter(function (b) { return b.ck === ck; });
      ok(col.every(function (b, i) { return i === 0 || b.b > col[i - 1].b || (b.b === col[i - 1].b && b.r > col[i - 1].r); }), "order: down the column " + ck + " " + id);
      ok(col.every(function (b) { return b.c === col[0].c; }), "order: one column at a time " + ck + " " + id);
    });
    if (L.sameCols(chart)) {
      ok(bx[0].b === 0 && bx[0].r === 0 && bx[0].c === 0, "order: starts at the first box " + id);
      var firstCol = bx.filter(function (b) { return b.c === 0; });
      ok(firstCol.length === bx.filter(function (b, i) { return i < firstCol.length; }).length && bx.slice(0, firstCol.length).every(function (b) { return b.c === 0; }), "order: the whole first column (every block) comes first " + id);
    }
    /* names: who + name tells every box apart, except boxes with the same form */
    var byName = {};
    bx.forEach(function (b) { var k = b.who + "|" + b.name; ok(!byName[k], "names: one box per prompt " + id + " " + k); byName[k] = 1; });

    for (var step = 1; step <= 3; step++) {
      [true, false].forEach(function (typing) {
        for (var seed = 0; seed < SEEDS; seed++) {
          var p = L.plan(chart, step, { voc: voc, typing: typing, seed: seed, charts: inPlayHere, wider: [gc, C.charts] });
          var mode = step === 3 && typing ? "type" : "tap";
          eq(p.mode, mode, "plan: mode " + id + " step " + step);
          var fillable = p.boxes.filter(function (b) { return !(b.given && mode === "tap"); });
          p.boxes.forEach(function (b) {
            if (b.given && mode === "tap") { ok(b.state === "given", "plan: a given box is shown at the tap steps " + id + " " + b.key); }
            if (mode === "type") { ok(b.state === "ask", "plan: every box is asked when typing " + id + " " + b.key); }
            if (step === 1 && !b.given) { ok(b.state === "ask", "plan: step 1 asks every box " + id); }
          });
          if (step === 2) {
            var pre = fillable.filter(function (b) { return b.state === "pre"; });
            eq(pre.length, Math.floor(fillable.length / 3), "plan: step 2 fills a third " + id + " seed " + seed);
            ok(fillable[0].state !== "pre", "plan: step 2 never fills the first box " + id + " seed " + seed);
            for (var g = 0; g * 3 + 2 < fillable.length; g++) {
              eq(fillable.slice(g * 3, g * 3 + 3).filter(function (b) { return b.state === "pre"; }).length, 1, "plan: step 2 is spread, one in each run of three " + id + " seed " + seed);
            }
          } else {
            ok(!p.boxes.some(function (b) { return b.state === "pre"; }), "plan: only step 2 fills boxes " + id);
          }
          eq(p.of, p.ask.length, "plan: of = boxes asked " + id);
          if (mode === "type") { ok(Object.keys(p.banks).length === 0, "plan: no tiles when typing " + id); continue; }
          Object.keys(p.banks).forEach(function (ck) {
            var tiles = p.banks[ck], col = fillable.filter(function (b) { return b.ck === ck; });
            var es = tiles.map(function (t) { return t.e; });
            ok(es.length === new Set(es).size, "tiles: no duplicate tile " + id + " " + ck);
            ok(tiles.every(function (t) { return t.t && t.t.length; }), "tiles: every tile has a text " + id);
            col.forEach(function (b) {
              eq(tiles.filter(function (t) { return t.e === b.e; }).length, 1, "tiles: the right ending once " + id + " " + b.key + " step " + step);
              ok(tiles.filter(function (t) { return L.judgeTile(b, t); }).length === 1, "tiles: exactly one tile is right for the box " + id + " " + b.key);
            });
            var colE = col.map(function (b) { return b.e; }), colS = colE.map(S.strip);
            var extra = tiles.filter(function (t) { return colE.indexOf(t.e) < 0; });
            var nRight = uniq(colE).length, room = Math.max(0, Math.min(2, 10 - nRight));
            ok(tiles.length <= 10, "tiles: at most ten tiles, one per number key " + id + " " + ck + " (" + tiles.length + ")");
            eq(extra.length, step >= 2 ? room : 0, "tiles: two wrong tiles from step 2 on (one when the column has nine endings) " + id + " " + ck + " step " + step);
            /* a wrong ending, put on the base of any box of the column, must not make a right answer of that box */
            var wrongFor = function (e) { return !col.some(function (b) { return L.answers(b).map(S.norm).indexOf(S.norm(b.s + e)) >= 0; }); };
            extra.forEach(function (t) {
              ok(!t.right, "tiles: a wrong tile is marked wrong " + id);
              ok(colS.indexOf(S.strip(t.e)) < 0, "tiles: no wrong tile differs only by macrons " + id + " " + t.e);
              ok(wrongFor(t.e), "tiles: a wrong tile makes no right form of any box of the column " + id + " " + t.e);
            });
            /* the wrong tiles come from the player's grade (this chart's other columns or the grade's charts of the kind),
               unless the grade has too few */
            if (step >= 2) {
              var others = fillable.filter(function (b) { return b.ck !== ck; }).map(function (b) { return b.e; });
              var fromGrade = uniq(others.concat(gradeEndings)).filter(function (e) { return colE.indexOf(e) < 0 && colS.indexOf(S.strip(e)) < 0 && wrongFor(e); });
              if (fromGrade.length >= room) {
                extra.forEach(function (t) { ok(fromGrade.indexOf(t.e) >= 0, "tiles: a wrong ending comes from the player's grade " + id + " " + t.e); });
              }
            }
            tiles.forEach(function (t) { if (t.e === "") { ok(t.t === "—", "tiles: no ending shows as a dash " + id); } });
          });
        }
      });
    }

    /* typed forms: judged against the chart's own boxes and the boxes of the charts that share a word with it
       (the game passes the same pool), so a macron slip that makes a form of another chart is caught too */
    var pool = bx.concat(L.kinBoxes(chart, C.charts));
    var kinIds = L.kin(chart, C.charts).map(function (c) { return c.id; });
    /* independent: the kin charts are the ones with a column of the same dictionary entry */
    var entries = {};
    chart.blocks.forEach(function (b) { b.cols.forEach(function (c) { entries[c.entry] = 1; }); });
    C.charts.forEach(function (c) {
      if (c.id === id) { return; }
      var shares = c.blocks.some(function (b) { return b.cols.some(function (col) { return entries[col.entry] && col.entry.indexOf(col.w) >= 0; }); });
      eq(kinIds.indexOf(c.id) >= 0, shares, "typed: " + c.id + " is kin of " + id + " when it shares a word");
    });
    bx.forEach(function (b) {
      ["ignored", "light", "strict"].forEach(function (m) {
        var r = L.judgeTyped(b, b.f, m, pool);
        ok(r.ok && !r.slip, "typed: the form itself is right " + id + " " + b.f + " " + m);
        r = L.judgeTyped(b, "  " + b.f.toUpperCase() + " ", m, pool);
        ok(r.ok, "typed: capitals and spaces do not matter " + id + " " + b.f + " " + m);
        (b.alts || []).forEach(function (a) { ok(L.judgeTyped(b, a, m, pool).ok, "typed: an alternative is right " + id + " " + a + " " + m); });
        ok(!L.judgeTyped(b, "", m, pool).ok, "typed: nothing typed is wrong " + id);
        /* another box's form that is not this one (this chart's or a kin chart's) */
        pool.forEach(function (o) {
          if (L.answers(b).some(function (a) { return S.norm(a) === S.norm(o.f); })) { return; }
          if (S.strip(S.norm(o.f)) === S.strip(S.norm(b.f))) {
            /* the same letters, other macrons: agēris (future) typed as ageris (present), and back; porta for portā */
            var rm = L.judgeTyped(b, o.f, m, pool);
            if (m === "ignored") { ok(rm.ok, "macrons: ignored accepts another form with the same letters " + id + " " + o.f + " for " + b.f); }
            else {
              ok(!rm.ok, "macrons: " + m + " refuses another form that differs only by macrons " + id + " " + o.f + " (" + o.cid + ") for " + b.f);
              ok(!!rm.other && L.answers(rm.other).some(function (a) { return S.norm(a) === S.norm(o.f); }), "macrons: and names that form " + id + " " + o.f + " for " + b.f);
            }
            return;
          }
          var r2 = L.judgeTyped(b, o.f, m, pool);
          ok(!r2.ok, "typed: another box's form is wrong " + id + " " + o.f + " for " + b.f + " " + m);
          ok(!!r2.other, "typed: another box's form is named " + id + " " + o.f + " for " + b.f);
          /* the other form typed without its macrons is still that form */
          var r3 = L.judgeTyped(b, S.strip(o.f), m, pool);
          ok(!r3.ok, "typed: another form without macrons is wrong " + id + " " + S.strip(o.f) + " for " + b.f + " " + m);
          ok(!!r3.other && L.answers(r3.other).some(function (a) { return S.strip(S.norm(a)) === S.strip(S.norm(o.f)); }), "typed: another form without macrons is named " + id + " " + S.strip(o.f) + " for " + b.f);
        });
      });
      /* an extra macron on one short vowel: a slip in light, unless it makes another form (then wrong and named) */
      var VOW = { a: "ā", e: "ē", i: "ī", o: "ō", u: "ū" };
      Array.from(b.f).forEach(function (ch, i) {
        if (!VOW[ch]) { return; }
        var typed = b.f.slice(0, i) + VOW[ch] + b.f.slice(i + 1);
        if (L.answers(b).some(function (a) { return S.norm(a) === S.norm(typed); })) { return; }
        var isOther = pool.some(function (o) { return L.answers(o).some(function (a) { return S.norm(a) === S.norm(typed); }); });
        var isPoint = L.MACRON_POINT[id] && L.MACRON_POINT[id][b.f] === i;
        var rx = L.judgeTyped(b, typed, "light", pool);
        if (isOther) { ok(!rx.ok && !!rx.other, "macrons: an extra macron that makes another form is wrong " + id + " " + typed + " for " + b.f); }
        else if (isPoint) { ok(!rx.ok && rx.slip && rx.point, "macrons: an extra macron on the vowel the note is about is wrong " + id + " " + typed + " for " + b.f); }
        else {
          ok(rx.ok && rx.slip, "macrons: light accepts an extra macron and shows it " + id + " " + typed + " for " + b.f);
          ok(rx.answer === b.f || (b.alts || []).indexOf(rx.answer) >= 0, "macrons: the right spelling is given (extra) " + id + " " + b.f);
        }
        ok(!L.judgeTyped(b, typed, "strict", pool).ok, "macrons: strict refuses an extra macron " + id + " " + typed);
      });
      /* missing macrons */
      var bare = S.strip(b.f);
      if (bare !== b.f) {
        /* expected: a conflict when another form (this chart or a kin chart) has the same letters and a short vowel where this one is long */
        var conflict = pool.some(function (o) {
          if (L.answers(b).some(function (a) { return S.norm(a) === S.norm(o.f); })) { return false; }
          var a = S.norm(b.f), n2 = S.norm(o.f);
          if (S.strip(n2) !== S.strip(a) || n2.length !== a.length) { return false; }
          for (var i = 0; i < a.length; i++) { if (a[i] !== n2[i] && n2[i] === S.strip(a[i])) { return true; } }
          return false;
        });
        /* expected: the vowel a chart's note is about (diēī typed diei) */
        var pt = L.MACRON_POINT[id] && L.MACRON_POINT[id][b.f];
        var pointMiss = pt != null && bare.charAt(pt) !== b.f.charAt(pt);
        var ri = L.judgeTyped(b, bare, "ignored", pool), rl = L.judgeTyped(b, bare, "light", pool), rs = L.judgeTyped(b, bare, "strict", pool);
        ok(ri.ok, "macrons: ignored accepts a form without macrons " + id + " " + b.f);
        if (conflict) { ok(!rl.ok && rl.slip && !!rl.other, "macrons: light refuses a missing macron that makes it another form " + id + " " + bare + " for " + b.f); }
        else if (pointMiss) { ok(!rl.ok && rl.slip && rl.point, "macrons: light refuses a missing macron on the vowel the note is about " + id + " " + bare + " for " + b.f); }
        else { ok(rl.ok && rl.slip, "macrons: light accepts a missing macron and shows it " + id + " " + bare + " for " + b.f); }
        ok(!rs.ok && rs.slip, "macrons: strict refuses a missing macron (only the macrons) " + id + " " + bare + " for " + b.f);
        if (rl.ok) { ok(rl.answer === b.f || (b.alts || []).indexOf(rl.answer) >= 0, "macrons: the right spelling is given " + id + " " + b.f + " (got " + rl.answer + ")"); }
        else { eq(rl.answer, b.f, "macrons: a refused form shows this box's form " + id); }
      }
    });

    /* called boxes, one chart */
    for (var cs = 0; cs < SEEDS; cs++) {
      var miss = cs % 3 === 0 ? bx.filter(function (b, i) { return i % 7 === 2; }).map(function (b) { return b.key; }) : [];
      [false, true].forEach(function (typing) {
        var qs = L.called([{ chart: chart, voc: voc, typing: typing, missed: miss }], { seed: cs, n: 6 });
        var distinct = new Set(bx.map(function (b) { return S.norm(b.f); })).size;
        eq(qs.length, Math.min(6, distinct), "called: six boxes from one chart " + id);
        /* independent: a prompt word that is its own answer ("porta: nominative singular?") */
        var gives = function (b) { return b.who.split(/[\s,]+/).concat([b.w]).some(function (w) { return S.norm(w) === S.norm(b.f); }); };
        var fairForms = new Set(bx.filter(function (b) { return !gives(b); }).map(function (b) { return S.norm(b.f); })).size;
        var asked = {};
        qs.forEach(function (q) {
          if (fairForms >= 6) { ok(!gives(q.box), "called: no prompt gives its answer away " + id + " " + q.who + ": " + q.name + " = " + q.answer); }
          ok(!asked[S.norm(q.answer)], "called: no form asked twice " + id + " " + q.answer); asked[S.norm(q.answer)] = 1;
          ok(q.typing === typing, "called: typed at the storm, tiles before " + id);
          if (typing) { ok(q.choices === null, "called: no choices when typing " + id); return; }
          eq(q.choices.length, 4, "called: four choices " + id + " " + q.answer);
          eq(q.choices.filter(function (c) { return S.norm(c) === S.norm(q.answer); }).length, 1, "called: the right form once " + id + " " + q.answer);
          ok(new Set(q.choices.map(S.norm)).size === 4, "called: no duplicate choices " + id + " " + q.choices.join("/"));
          q.choices.forEach(function (c) {
            if (S.norm(c) === S.norm(q.answer)) { ok(L.judgeChoice(q, c), "called: the right choice is judged right " + id); return; }
            ok(!L.judgeChoice(q, c), "called: a wrong choice is judged wrong " + id + " " + c);
            ok(!q.answers.some(function (a) { return S.norm(a) === S.norm(c); }), "called: no wrong choice is right for the box " + id + " " + c);
            ok(!q.answers.some(function (a) { return S.strip(S.norm(a)) === S.strip(S.norm(c)); }), "called: no wrong choice differs only by macrons " + id + " " + c + " / " + q.answer);
            ok(bx.some(function (b) { return b.f === c; }), "called: wrong choices come from the same chart " + id + " " + c);
          });
        });
        if (miss.length) {
          var want = Math.min(3, miss.length);
          var got = qs.filter(function (q) { return miss.indexOf(q.key) >= 0; }).length;
          ok(got >= Math.min(want, new Set(bx.filter(function (b) { return miss.indexOf(b.key) >= 0 && !gives(b); }).map(function (b) { return S.norm(b.f); })).size), "called: the boxes missed tonight come first (not the ones that give their answer away) " + id);
        }
      });
    }
  });
});

/* known cases, by hand */
(function () {
  function box(id, key, voc) { var c = C.charts.find(function (x) { return x.id === id; }); var bx = L.boxes(c, { voc: voc !== false }); return { b: bx.find(function (x) { return x.key === key; }), bx: bx }; }
  var abl = box("c02-porta-magna", "0.4.0");
  eq(abl.b.f, "portā", "known: porta abl. sg.");
  ok(!L.judgeTyped(abl.b, "porta", "light", abl.bx).ok, "known: porta typed for portā is the nominative (light)");
  eq(L.judgeTyped(abl.b, "porta", "light", abl.bx).other.name, "nominative singular", "known: and it says so");
  ok(L.judgeTyped(abl.b, "porta", "ignored", abl.bx).ok, "known: macrons ignored: porta is fine");
  var dat = box("c02-porta-magna", "1.2.0");
  eq(dat.b.f, "portīs", "known: porta dat. pl.");
  var r = L.judgeTyped(dat.b, "portis", "light", dat.bx);
  ok(r.ok && r.slip && r.answer === "portīs", "known: portis typed for portīs is a slip in light, shown as portīs");
  ok(!L.judgeTyped(dat.b, "portis", "strict", dat.bx).ok, "known: portis is wrong in strict");
  var gen = box("c20-fructus-cornu", "0.1.0");
  eq(gen.b.f, "frūctūs", "known: frūctūs gen. sg.");
  ok(!L.judgeTyped(gen.b, "fructus", "light", gen.bx).ok, "known: fructus for frūctūs reads as the nominative");
  var nom = box("c20-fructus-cornu", "0.0.0");
  ok(L.judgeTyped(nom.b, "fructus", "light", nom.bx).ok, "known: fructus for frūctus is only a missing macron");
  var am = box("c03-amicus-magnus", "1.1.0");
  eq(am.b.f, "amīcōrum", "known: amīcōrum gen. pl.");
  var ra = L.judgeTyped(am.b, "amicus", "light", am.bx);
  ok(!ra.ok && ra.other && ra.other.name === "nominative singular", "known: amicus typed for amīcōrum is the nominative singular");
  /* across charts: the future agēris and the present ageris differ only by the ē (the c21 note) */
  function poolOf(id) { var c = C.charts.find(function (x) { return x.id === id; }); return L.typedPool(c, C.charts, true); }
  var fp = poolOf("c21-future-passive"), fb = fp.find(function (x) { return x.cid === "c21-future-passive" && x.f === "agēris"; });
  var rf = L.judgeTyped(fb, "ageris", "light", fp);
  ok(fb && !rf.ok && rf.other && rf.other.cid === "c21-present-passive" && rf.other.name === "second person singular, present passive", "known: ageris typed for the future agēris is the present (light)");
  ok(!L.judgeTyped(fb, "ageris", "light", L.boxes(C.charts.find(function (x) { return x.id === "c21-future-passive"; }))).other, "known: (the chart alone does not know ageris)");
  var pp0 = poolOf("c21-present-passive"), pb = pp0.find(function (x) { return x.cid === "c21-present-passive" && x.f === "ageris"; });
  var rp = L.judgeTyped(pb, "agēris", "light", pp0);
  ok(pb && !rp.ok && rp.other && rp.other.cid === "c21-future-passive", "known: agēris typed for the present ageris is the future (light)");
  ok(L.judgeTyped(fb, "ageris", "ignored", fp).ok, "known: macrons ignored: ageris is fine for agēris");
  var rd = poolOf("c22-res-dies"), rb = rd.find(function (x) { return x.f === "reī"; }), db = rd.find(function (x) { return x.f === "diēī"; });
  ok(!L.judgeTyped(rb, "rēī", "light", rd).ok, "known: rēī for reī is wrong (light): the c22 note is about that e");
  ok(L.judgeTyped(rb, "rei", "light", rd).ok, "known: rei for reī is a slip (light): the e is right");
  ok(!L.judgeTyped(db, "dieī", "light", rd).ok && L.judgeTyped(db, "diēi", "light", rd).ok, "known: dieī for diēī is wrong, diēi a slip (light)");
  var pq = box("c02-porta-magna", "0.0.0");
  ok(L.giveaway(pq.b) && !L.giveaway(abl.b), "known: porta: nominative singular? gives its answer away; portā does not");
  var pp = box("c19-perfect-passive", "0.0.0");
  ok(L.judgeTyped(pp.b, "laudāta sum", "strict", pp.bx).ok, "known: laudāta sum is right for the perfect 1st sg.");
  ok(L.judgeTyped(pp.b, "laudatus, -a, -um sum", "light", pp.bx).ok, "known: laudatus, -a, -um sum is right (light)");
  var ager = box("c03-puer-ager", "0.0.1");
  ok(ager.b.given, "known: ager nom. sg. is given");
  var p1 = L.plan(C.charts.find(function (x) { return x.id === "c03-puer-ager"; }), 1, { voc: true, seed: 1 });
  ok(p1.boxes.find(function (x) { return x.key === "0.0.1"; }).state === "given", "known: ager is shown filled in calm water");
  var p3 = L.plan(C.charts.find(function (x) { return x.id === "c03-puer-ager"; }), 3, { voc: true, typing: true, seed: 1 });
  ok(p3.boxes.find(function (x) { return x.key === "0.0.1"; }).state === "ask", "known: ager is asked in the storm");
  var n1 = L.naming(C.charts.find(function (x) { return x.id === "c18-future-passive"; }), C.charts.find(function (x) { return x.id === "c18-future-passive"; }).blocks[0], C.charts.find(function (x) { return x.id === "c18-future-passive"; }).blocks[0].rows[1], C.charts.find(function (x) { return x.id === "c18-future-passive"; }).blocks[0].cols[1]);
  eq([n1.who, n1.short], ["moneō", "2nd sg. future passive"], "known: moneō: 2nd sg. future passive");
  var qq = C.charts.find(function (x) { return x.id === "c19-quis-quid"; });
  var n2 = L.naming(qq, qq.blocks[1], qq.blocks[1].rows[1], qq.blocks[1].cols[1]);
  eq([n2.who, n2.name], ["quis, quid", "genitive plural, feminine"], "known: quārum is the feminine genitive plural");
  var ppc = C.charts.find(function (x) { return x.id === "c19-perfect-passive"; });
  var n3 = L.naming(ppc, ppc.blocks[0], ppc.blocks[0].rows[3], ppc.blocks[0].cols[1]);
  eq([n3.who, n3.name], ["laudō", "first person plural, pluperfect passive"], "known: laudātī erāmus");
  var c1 = C.charts.find(function (x) { return x.id === "c01-present"; });
  eq(L.boxes(c1).slice(0, 9).map(function (b) { return b.f; }), ["laudō", "laudās", "laudat", "laudāmus", "laudātis", "laudant", "laudā", "laudāte", "laudāre"], "known: the laudō column is recited first, with its imperative and infinitive");
  var c2 = C.charts.find(function (x) { return x.id === "c02-porta-magna"; });
  eq(L.boxes(c2, { voc: false }).slice(0, 10).map(function (b) { return b.f; }), ["porta", "portae", "portae", "portam", "portā", "portae", "portārum", "portīs", "portās", "portīs"], "known: porta is recited singular then plural");
  eq(L.boxes(qq).slice(0, 5).map(function (b) { return b.f; }), ["quis", "cuius", "cui", "quem", "quō"], "known: quis first");
})();

/* called boxes over two or three charts */
(function () {
  var sets = [["c02-porta-magna", "c01-present"], ["c21-present-passive", "c18-present-passive", "c19-quis-quid"], ["c22-res-dies", "c20-fructus-cornu"]];
  sets.forEach(function (set) {
    for (var seed = 0; seed < SEEDS; seed++) {
      var items = set.map(function (id, i) { return { chart: C.charts.find(function (c) { return c.id === id; }), voc: true, typing: i === 1 && seed % 2 === 0, missed: [] }; });
      var qs = L.called(items, { seed: seed });
      eq(qs.length, 8, "called: eight boxes from two or more charts " + set.join("+"));
      set.forEach(function (id) { ok(qs.some(function (q) { return q.id === id; }), "called: every chart of tonight is called " + id); });
      qs.forEach(function (q) {
        var it = items.find(function (x) { return x.chart.id === q.id; });
        ok(q.typing === !!it.typing, "called: typed only for a storm chart");
        if (q.choices) { eq(q.choices.filter(function (c) { return S.norm(c) === S.norm(q.answer); }).length, 1, "called: the right form once (mixed)"); }
      });
    }
  });
})();

/* ------------------------------------------------------------ records and the voyage */
(function () {
  ok(L.passes(24, 24) && L.passes(23, 24) && !L.passes(22, 24) && !L.passes(0, 0), "records: passed with at most one missed box");
  var prog = L.fresh();
  eq(prog.set, { beat: "slow", voc: "book", typing: true, macrons: "light" }, "records: default settings");
  eq(L.settings({ beat: "loud", voc: "x", typing: false, macrons: "strict" }), { beat: "slow", voc: "book", typing: false, macrons: "strict" }, "records: settings are cleaned");
  var id = "c02-porta-magna";
  ok(L.unlocked(prog, id, 1) && !L.unlocked(prog, id, 2) && !L.unlocked(prog, id, 3), "records: only calm water at first");
  eq(L.nextStep(prog, id), 1, "records: next step 1");
  L.record(prog, id, 1, 20, 24, "2026-11-20");
  ok(!L.unlocked(prog, id, 2), "records: 20 of 24 does not unlock open sea");
  eq(L.rec(prog, id).best[0], { got: 20, of: 24 }, "records: best kept");
  L.record(prog, id, 1, 23, 24, "2026-11-21");
  ok(L.unlocked(prog, id, 2) && !L.unlocked(prog, id, 3), "records: 23 of 24 unlocks open sea");
  L.record(prog, id, 1, 18, 24, "2026-11-22");
  eq(L.rec(prog, id).best[0], { got: 23, of: 24 }, "records: a worse score does not replace the best");
  ok(L.rec(prog, id).passed[0], "records: a pass stays passed");
  eq(L.rec(prog, id).day, "2026-11-22", "records: the day last rowed");
  eq(L.nextStep(prog, id), 2, "records: next step 2");
  L.record(prog, id, 2, 16, 16, "2026-11-22");
  L.record(prog, id, 3, 24, 24, "2026-11-23");
  ok(L.fullyPassed(prog, id) && L.nextStep(prog, id) === null, "records: fully passed");

  function pl(grade, chapter) { return { id: "p1", name: "T", grade: grade, chapter: chapter }; }
  var g6 = L.inPlay(C.charts, pl(6, 2), W);
  eq(g6.map(function (c) { return c.id; }), ["c02-porta-magna", "c01-present"], "voyage: grade 6 chapter 2 rows porta first, then chapter 1");
  eq(L.playChapter(C.charts, pl(6, 5), W), 3, "voyage: chapter 5 has no charts yet, so chapter 3");
  ok(L.inPlay(C.charts, pl(6, 5), W).every(function (c) { return c.ch <= 3; }), "voyage: nothing past chapter 3");
  eq(L.inPlay(C.charts, pl(6, 3), W)[0].ch, 3, "voyage: the current chapter's charts first");
  eq(L.inPlay(C.charts, pl(7, 10), W).length, 0, "voyage: grade 7 has no charts yet");
  eq(L.inPlay(C.charts, pl(8, 21), W).map(function (c) { return c.ch; }).filter(function (ch) { return ch > 21; }).length, 0, "voyage: grade 8 chapter 21 rows nothing past 21");
  ok(L.inPlay(C.charts, pl(8, 21), W).every(function (c) { return c.ch >= 18; }), "voyage: grade 8 never rows grade 6 charts");

  var fresh = L.fresh();
  var v = L.voyage(fresh, g6, 2, "2026-11-25");
  eq(v.map(function (l) { return l.called ? "called" : l.id + "@" + l.step + ":" + l.why; }), ["c02-porta-magna@1:new", "c01-present@1:review", "called"], "voyage: a first night");
  var p2 = L.fresh();
  L.record(p2, "c02-porta-magna", 1, 24, 24, "2026-11-24");
  L.record(p2, "c01-present", 1, 20, 20, "2026-11-24");
  L.record(p2, "c01-present", 2, 13, 13, "2026-11-24");
  v = L.voyage(p2, g6, 2, "2026-11-25");
  eq(v.map(function (l) { return l.called ? "called" : l.id + "@" + l.step; }), ["c02-porta-magna@2", "c01-present@2", "called"], "voyage: the next step, and the review at its highest passed step");
  L.record(p2, "c02-porta-magna", 2, 16, 16, "2026-11-24");
  L.record(p2, "c02-porta-magna", 3, 24, 24, "2026-11-24");
  v = L.voyage(p2, g6, 2, "2026-11-25");
  eq(v[0].id + "@" + v[0].step + ":" + v[0].why, "c02-porta-magna@3:keep", "voyage: all passed: keep the storm");
  var g63 = L.inPlay(C.charts, pl(6, 3), W);
  var p3 = L.fresh();
  L.record(p3, "c01-present", 1, 20, 20, "2026-11-20");
  L.record(p3, "c02-porta-magna", 1, 20, 24, "2026-11-22");
  v = L.voyage(p3, g63, 3, "2026-11-25");
  eq(v[0].id, "c03-amicus-magnus", "voyage: chapter 3's first chart");
  eq(v[1].id + "@" + v[1].step, "c01-present@1", "voyage: the review is the chart rowed longest ago");
  L.record(p3, "c01-present", 1, 20, 20, "2026-11-23");
  v = L.voyage(p3, g63, 3, "2026-11-25");
  eq(v[1].id + "@" + v[1].step, "c02-porta-magna@1", "voyage: review at step 1 when no step is passed");
  L.record(p3, "c03-amicus-magnus", 1, 24, 24, "2026-11-25");
  L.record(p3, "c03-amicus-magnus", 2, 16, 16, "2026-11-25");
  L.record(p3, "c03-amicus-magnus", 3, 24, 24, "2026-11-25");
  v = L.voyage(p3, g63, 3, "2026-11-26");
  eq(v[0].id + "@" + v[0].step, "c03-puer-ager@1", "voyage: the next chart of the chapter once the first is fully passed");

  var g8 = L.inPlay(C.charts, pl(8, 21), W);
  v = L.voyage(L.fresh(), g8, 21, "2026-11-25");
  eq(v.map(function (l) { return l.called ? "called" : l.id + "@" + l.step; }), ["c21-present-passive@1", "c18-present-passive@1", "called"], "voyage: grade 8 chapter 21");
  var g818 = L.inPlay(C.charts, pl(8, 18), W);
  v = L.voyage(L.fresh(), g818, 18, "2026-11-25");
  eq(v.map(function (l) { return l.called ? "called" : l.id + "@" + l.step; }), ["c18-present-passive@1", "c18-imperfect-passive@1", "called"], "voyage: no earlier chapter: a second chart of the chapter");
  eq(L.voyage(L.fresh(), [], 0, "2026-11-25").length, 0, "voyage: nothing in play, no voyage");

  var legs = L.voyage(L.fresh(), g6, 2, "2026-11-25");
  L.queueAgain(legs, 0, "c02-porta-magna", 1);
  eq(legs.map(function (l) { return l.called ? "called" : l.id + ":" + l.why; }), ["c02-porta-magna:new", "c01-present:review", "c02-porta-magna:again", "called"], "voyage: a missed chart comes back before the called boxes");
  L.queueAgain(legs, 0, "c02-porta-magna", 1);
  eq(legs.length, 4, "voyage: it comes back only once");
  L.queueAgain(legs, 2, "c02-porta-magna", 1);
  eq(legs.length, 4, "voyage: a chart that came back does not come back again");
  L.queueAgain(legs, 1, "c01-present", 1);
  eq(legs.map(function (l) { return l.called ? "called" : l.id + ":" + l.why; }), ["c02-porta-magna:new", "c01-present:review", "c02-porta-magna:again", "c01-present:again", "called"], "voyage: both come back, in order");

  eq(["off", "slow", "steady"].map(function (b) { return [1, 2, 3].map(function (s) { return L.beatFor(b, s); }).join(","); }), ["off,off,off", "slow,slow,off", "steady,steady,slow"], "beat: one notch slower in the storm");
  eq([L.beatMs("off"), L.beatMs("slow"), L.beatMs("steady")], [0, 1800, 1200], "beat: off, 1.8 s, 1.2 s");
  ok(L.inStroke(900, 1800) && L.inStroke(1900, 1800) && !L.inStroke(2600, 1800) && !L.inStroke(100, 0), "beat: in stroke within a beat");
})();

/* ------------------------------------------------------------------ summary */
var total = Object.keys(counts).reduce(function (s, k) { return s + counts[k]; }, 0);
console.log("Row the Endings checks: " + charts.length + " charts, " + SEEDS + " seeds each");
Object.keys(counts).sort().forEach(function (k) { console.log("  " + (k + ":                ").slice(0, 16) + counts[k]); });
if (fails.length) {
  var uniq = Array.from(new Set(fails));
  console.log("\nFAILED " + fails.length + " of " + total + " checks (" + uniq.length + " different):");
  uniq.slice(0, 60).forEach(function (f) { console.log("  - " + f); });
  process.exit(1);
}
console.log("All " + total + " checks passed.");
