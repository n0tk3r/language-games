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
  eq(prog.set, { beat: "slow", voc: "book", typing: true, macrons: "light", race: "race" }, "records: default settings");
  eq(L.settings({ beat: "loud", voc: "x", typing: false, macrons: "strict", race: "fast" }), { beat: "slow", voc: "book", typing: false, macrons: "strict", race: "race" }, "records: settings are cleaned");
  eq(["race", "dare", "alone"].map(function (r) { return L.settings({ race: r }).race; }), ["race", "dare", "alone"], "records: the Corvus setting is kept");
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
  /* a class still on an earlier chapter: the charts follow the chapter's course */
  eq(L.courseGrade(pl(8, 21), W), 8, "earlier chapters: grade 8 on its own chapter keeps its course");
  eq(L.courseGrade(pl(8, 2), W), 6, "earlier chapters: grade 8 on chapter 2 rows Latin IA");
  eq(L.courseGrade(pl(8, 12), W), 7, "earlier chapters: grade 8 on chapter 12 follows Latin IB, which has no charts yet");
  eq(L.courseGrade(pl(6, 5), W), 6, "earlier chapters: grade 6 is always its own course");
  eq(L.courseGrade(pl(8, 0), W), 8, "earlier chapters: no chapter yet keeps the grade");
  eq(L.inPlay(C.charts, pl(8, 2), W).map(function (c) { return c.id; }), L.inPlay(C.charts, pl(6, 2), W).map(function (c) { return c.id; }), "earlier chapters: grade 8 on chapter 2 rows what grade 6 on chapter 2 rows");
  eq(L.playChapter(C.charts, pl(8, 5), W), 3, "earlier chapters: grade 8 on chapter 5 rows up to chapter 3");
  eq(L.inPlay(C.charts, pl(8, 12), W).length, 0, "earlier chapters: grade 8 on chapter 12 has nothing to row yet");
  eq(Object.keys(L.chartsUpTo(C.charts, 8, W)).map(Number).sort(function (a, b) { return a - b; }), [1, 2, 3, 18, 19, 20, 21, 22], "earlier chapters: the files marks for grade 8 hold 1 to 3 and 18 to 22");
  eq(Object.keys(L.chartsUpTo(C.charts, 6, W)).map(Number).sort(function (a, b) { return a - b; }), [1, 2, 3], "earlier chapters: the files marks for grade 6 stop at its last chapter");

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

/* ------------------------------------------------------------ the race with the Corvus */
(function () {
  var R = L.RACE, rnd = S.rng("race checks");
  function between(a, b) { return a + rnd() * (b - a); }
  function int(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  /* a whole race, box by box as row.js rows it. times: ms per box (one number or a list); o: { H, B, mode, dare,
     miss: [0-based boxes], slip: [typed forms judged right with a macron slip], turns: [boxes that start a column],
     comeback: the first miss of a night leg says "We'll row this chart once more", read: ms spent on each line said,
     quiet: no lines at a miss (so no free beats) }
     -> raceEnd + { st, behind (the Corvus's biggest lead at any moment), clear (the same, to test the mercy rule) } */
  function row(n, times, o) {
    o = o || {};
    var st = L.race(n, o.H || 0, o.B || 1800, o.mode || "tap", o.dare), lines = 0, first = true, behind = -Infinity;
    for (var i = 0; i < n; i++) {
      var t = typeof times === "number" ? times : times[i];
      var free = L.freeBeats((o.turns || []).indexOf(i) >= 0, lines);
      t += lines * (o.read || 0);
      var miss = (o.miss || []).indexOf(i) >= 0, slip = (o.slip || []).indexOf(i) >= 0;
      [0, 0.2, 0.5, 0.8, 1].forEach(function (f) { behind = Math.max(behind, -L.raceLead(st, L.raceLive(st, t * f, free).p)); });
      L.raceBox(st, t, !miss && !slip, free);
      behind = Math.max(behind, -L.raceLead(st));
      lines = miss && !o.quiet ? L.missNotes({ comeback: o.comeback && first }).length : 0;
      if (miss) { first = false; }
    }
    var end = L.raceEnd(st);
    end.st = st; end.behind = behind;
    return end;
  }
  var B = 1800, porta = { turns: [12] };
  function opts(x) { var o = { turns: porta.turns }; Object.keys(x || {}).forEach(function (k) { o[k] = x[k]; }); return o; }

  /* the race clock of one box */
  eq([L.boxCost(250, B, true, 0), L.boxCost(1000, B, true, 0), L.boxCost(9e9, B, true, 0), L.boxCost(3000, B, true, 1), L.boxCost(1500, B, true, 2), L.boxCost(100, B, false, 0)],
    [0, 750, 5400, 950, 0, 7200], "race: box cost (grace, think, cap, a free beat, the floor at 0, a miss)");
  for (var k = 0; k < 2000; k++) {
    var b = [1200, 1800][k % 2];
    ok(L.boxCost(between(0, 4000), b, false, int(0, 3)) > L.boxCost(between(0, 60000), b, true, int(0, 3)), "race: a miss always costs more than any right box");
  }
  eq([L.strokeMs(1800, "tap"), L.strokeMs(1800, "type"), L.strokeMs(1200, "tap"), L.strokeMs(1200, "type")], [1800, 3600, 1200, 2400], "race: a Corvus stroke doubles when typing");
  ok(!L.raceOn({ beat: "slow", race: "race" }, 3) && L.raceOn({ beat: "slow", race: "race" }, 1) && L.raceOn({ beat: "slow", race: "race" }, 2), "race: at Slow the Storm does not race, Calm and Open sea do");
  ok(!L.raceOn({ beat: "slow", race: "alone" }, 1) && !L.raceOn({ beat: "steady", race: "alone" }, 3) && !L.raceOn({ beat: "off", race: "race" }, 1), "race: Sail alone and drum Off never race");
  ok(L.raceOn({ beat: "steady", race: "race" }, 3) && L.raceOn({ beat: "slow", race: "dare" }, 1), "race: Steady races the Storm; a dare races");
  ok(L.raceOn({ beat: "slow", race: "race" }, 3, "slow") && !L.raceOn({ beat: "slow", race: "race" }, 1, "off"), "race: the panel drum of the leg decides");
  var sb = L.beatMs(L.beatFor("steady", 3));
  eq([sb, L.strokeMs(sb, "tap"), L.strokeMs(sb, "type")], [1800, 1800, 3600], "race: Steady in the Storm races at 1800 ms tapping and 3600 ms typing");
  eq([L.restMs(1800, 0), L.restMs(1800, 2), L.restMs(1200, 1)], [5650, 9250, 5050], "race: the drum rests after three beats (and the free ones)");

  /* the free beats after a miss are the lines said; reading them costs nothing */
  eq([L.missNotes({}), L.missNotes({ comeback: true }), L.missNotes({ comeback: true, rush: true }), L.missNotes({ rush: true })],
    [["clash"], ["clash", "comeback"], ["clash", "comeback", "rush"], ["clash", "rush"]], "race: the lines said at a miss");
  eq([L.freeBeats(false, 0), L.freeBeats(true, 0), L.freeBeats(false, 2), L.freeBeats(true, 3)], [0, 1, 2, 4], "race: free beats (a new column, the lines said)");
  for (k = 0; k < 2000; k++) {
    var bb = [1200, 1800][k % 2], ms = between(0, 9000), ln = int(1, 3);
    eq(L.boxCost(ms + ln * bb, bb, true, L.freeBeats(false, ln)), L.boxCost(ms, bb, true, 0), "race: a beat to read each line said at a miss is free");
    eq(L.restMs(bb, ln) - L.restMs(bb, 0), ln * bb, "race: the drum rests longer by the same beats");
  }
  var read = row(24, 2500, opts({ H: 9, miss: [2, 8], comeback: true, read: B })), noread = row(24, 2500, opts({ H: 9, miss: [2, 8], quiet: true }));
  ok(Math.abs(read.m - noread.m) < 1e-9, "race: reading the corrections does not lose the race (" + read.m.toFixed(2) + " / " + noread.m.toFixed(2) + ")");
  ok(L.rushed(300, "tap") && !L.rushed(800, "tap") && !L.rushed(300, "type"), "race: a rushed tile is a wrong tile under 0.7 s; typed forms never are");

  /* the cargo */
  [8, 12, 16, 20, 24, 30].forEach(function (n) {
    [1200, 1800].forEach(function (b) {
      ["tap", "type"].forEach(function (mode) {
        var Sm = L.strokeMs(b, mode), thr = (n - 1.5) / (n - 1) * Sm;
        [false, true].forEach(function (dare) {
          var last = -Infinity, mono = true;
          for (var u = 0; u <= 5 * b; u += 25) { var h = L.cargo(u, n, b, mode, dare); if (h < last) { mono = false; } last = h; ok(h >= (dare ? -Math.floor(n / 2) : 0), "race: cargo is never below -floor(n/2) with a dare, 0 without"); }
          ok(mono, "race: cargo grows with the usual " + n + " " + b + " " + mode + " " + dare);
        });
        if (thr < R.REST * b) {
          eq(L.cargo(thr - 1, n, b, mode, false), 0, "race: a level race below (n - 1.5)/(n - 1) of a stroke " + n + " " + b + " " + mode);
          ok(L.cargo(thr + 1, n, b, mode, false) >= 1, "race: cargo just above the level line " + n + " " + b + " " + mode);
        }
      });
    });
  });
  eq([L.cargo(1760, 24, 1800, "tap"), L.cargo(1766, 24, 1800, "tap"), L.cargo(1173, 24, 1200, "tap"), L.cargo(1178, 24, 1200, "tap")], [0, 1, 0, 1],
    "race: 24 boxes race level from about 2.0 s a box at Slow and 1.4 s at Steady");
  eq([L.amphorae(0, 24), L.amphorae(-4, 24), L.amphorae(4, 24), L.amphorae(5, 24), L.amphorae(14, 24), L.amphorae(15, 24)], [0, 0, 1, 2, 2, 3], "race: amphorae for the cargo");

  /* the level-race rule: every box right in stroke always wins by a stroke or more, and is never passed */
  for (k = 0; k < 2000; k++) {
    var n = int(6, 30), b2 = [1200, 1800][k % 2], mode = k % 3 ? "tap" : "type", t = [], turns = [];
    for (var i = 0; i < n; i++) { t.push(between(0, b2 + R.GRACE)); if (i && rnd() < 0.15) { turns.push(i); } }
    var e = row(n, t, { H: int(0, 40), B: b2, mode: mode, turns: turns });
    ok(e.r === "won" && e.m >= 1 - 1e-9, "race: every box in stroke wins by a stroke or more (" + e.r + " " + e.m.toFixed(2) + ")");
    ok(e.behind <= 1e-9, "race: every box in stroke is never passed (" + e.behind.toFixed(3) + ")");
  }
  /* the mercy rule: never more than two strokes clear, so never a loss by more than two */
  var losses = 0;
  for (k = 0; k < 2000; k++) {
    var n2 = int(6, 30), b3 = [1200, 1800][k % 2], mode2 = k % 3 ? "tap" : "type", t2 = [], miss = [], rate = between(0, 0.4);
    for (var j = 0; j < n2; j++) { t2.push(between(0, 15000)); if (rnd() < rate) { miss.push(j); } }
    var dare = k % 4 === 0, e2 = row(n2, t2, { H: int(dare ? -Math.floor(n2 / 2) : 0, 40), B: b3, mode: mode2, miss: miss, dare: dare, comeback: k % 2 === 0, turns: [Math.floor(n2 / 2)] });
    if (e2.r === "lost") { losses++; }
    ok(e2.r !== "lost" || -e2.m <= R.MERCY + 1e-9, "race: no loss is larger than two strokes (" + e2.m.toFixed(2) + ")");
    ok(e2.behind <= R.MERCY + 1e-9, "race: the Corvus is never more than two strokes clear (" + e2.behind.toFixed(2) + ")");
  }
  ok(losses > 100, "race: (the random rows include losses: " + losses + ")");

  /* the end of a race */
  function ended(n, c, dock) { var st = L.race(n, 0, B, "tap"); st.c = c; st.done = n; st.dock = dock; return L.raceEnd(st); }
  var e3 = [ended(24, 24 * (1 - 0.2 / 24), null), ended(24, 24 * (1 - 0.6 / 24), null), ended(24, 24 * (1 - 1.6 / 24), null), ended(24, 24, 23.9), ended(24, 24, 23.5), ended(24, 24, 22.2)];
  eq(e3.map(function (x) { return x.r + ":" + x.kind + ":" + x.by; }), ["heat:heat:1", "won:prow:1", "won:strokes:2", "heat:heat:1", "lost:prow:1", "lost:strokes:2"],
    "race: a dead heat under a quarter stroke, a prow under one, else strokes; the Corvus first by the boxes left");
  var st4 = L.race(24, 0, B, "tap"); st4.done = 21; st4.c = 21.5;
  ok(L.stretch(st4) && !L.stretch((function () { var s = L.race(24, 0, B, "tap"); s.done = 20; s.c = 20; return s; })()), "race: the final stretch is three boxes or fewer, within two strokes");
  eq([L.rivalX(12, 24, 0.5, 200, false), L.rivalX(12, 24, 0.5, 200, true), L.rivalX(12, 24, 13 / 24, 200, true), L.rivalX(12, 24, 11 / 24, 200, true), L.rivalX(12, 24, 0.1, 200, true), L.rivalX(1, 24, 0, 200, true), L.rivalX(1, 24, 0.3, 200, true)],
    [100, 100, 124, 52, 4, 0, 200 / 24 + 72], "race: on a phone the Corvus is drawn from our ship, 24 px for a stroke ahead, 48 px for a stroke behind and 24 px a stroke after it, at most 3 strokes, on its track");
  eq([L.rivalX(1, 24, 0, 200, true, { lo: 65 }), L.rivalX(12, 24, 0.1, 200, true, { lo: 65 }), L.rivalX(2, 24, 0, 200, true, { lo: 65 }), L.rivalX(22, 24, 1, 200, true, { hi: 30 }), L.rivalX(0, 24, 0, 200, false, { lo: 111, wait: true }), L.rivalX(0, 24, 0, 200, true, { lo: 65, wait: true }),
    L.rivalX(22, 24, 1, 200, false, { hi: 47, moored: true }), L.rivalX(22, 24, 1, 200, true, { hi: 30, moored: true })],
    [1 / 24 * 200 - 48, 4, 2 / 24 * 200 - 72, 230, -111, -65, 247, 230], "race: it may fall back over the quay (lo) and moor in the far harbor (hi); before the start it waits at the quay, behind us");
  for (k = 0; k < 2000; k++) {
    /* a phone (strip 300 to 560 px): a Corvus a stroke or more behind is drawn at least 48 px behind our ship (its
       raven sail clears ours), unless the quay stops it; one ahead is ahead; level is level */
    var nn = int(6, 30), dn = int(1, nn), tw0 = between(150, 400), pp = between(0, 1), lo0 = 65, xo = dn / nn * tw0, xr = L.rivalX(dn, nn, pp, tw0, true, { lo: lo0, hi: 30 }), ld = dn - pp * nn;
    ok(ld < 1 || xr <= xo - 48 + 1e-9 || xr === -lo0, "race: a stroke behind clears our sail on a phone (" + ld.toFixed(2) + ")");
    ok(ld >= 0 || xr >= xo - 1e-9, "race: a Corvus ahead is drawn ahead");
    ok(xr >= -lo0 - 1e-9 && xr <= tw0 + 30 + 1e-9, "race: the Corvus stays on its lane");
  }
  ok(L.rivalX(5, 24, 5 / 24, 300, true) === 5 / 24 * 300 && L.rivalX(5, 24, 5 / 24, 300, false) === 5 / 24 * 300, "race: level is level (prow to prow)");
  /* on a phone, near level: the mapping is steep. The first hundredth of a stroke behind is drawn 38 px back (its
     sail is 23 px wide and is out from behind ours past about 34 px), the first hundredth ahead 10 px forward (its
     sail is out past ours from about 3 px, 7 px when the ships pitch); a whole stroke is 48 px behind and 24 px
     ahead, as before, and beyond a stroke as before */
  var close6 = function (a, b2) { return Math.abs(a - b2) < 1e-6; };
  eq([L.leadPx(0), L.leadPx(L.NEAR), L.leadPx(-L.NEAR), L.leadPx(1), L.leadPx(2), L.leadPx(3), L.leadPx(9), L.leadPx(-1), L.leadPx(-2), L.leadPx(-3), L.leadPx(-9)],
    [0, L.LEAD_NEAR, -L.LEAD_FORE, L.LEAD_BACK, 72, 96, 96, -24, -48, -72, -72], "race: on a phone 38 px for the first hundredth of a stroke behind and 48 px for the first stroke, 10 px for the first hundredth ahead and 24 px for the first stroke, then 24 px a stroke; flat beyond 3 strokes");
  ok(close6(L.leadPx((1 + L.NEAR) / 2), (L.LEAD_NEAR + L.LEAD_BACK) / 2) && close6(L.leadPx(-(1 + L.NEAR) / 2), -(L.LEAD_FORE + L.LEAD_PX) / 2), "race: between the knee and a whole stroke the phone mapping is a straight line, either way");
  ok(L.LEAD_NEAR >= 36 && L.LEAD_NEAR < L.LEAD_BACK && L.LEAD_FORE >= 8 && L.LEAD_FORE < L.LEAD_PX && L.NEAR > 0 && L.NEAR <= 0.02 && L.LEAD_BACK === 48 && L.LEAD_PX === 24,
    "race: a Corvus a fiftieth of a stroke from level, either way, is drawn with its sail out from behind ours on a phone");
  ok(close6(L.rivalX(12, 24, (12 - L.NEAR) / 24, 200, true), 100 - L.LEAD_NEAR) && close6(L.rivalX(12, 24, (12 + L.NEAR) / 24, 200, true), 100 + L.LEAD_FORE) &&
    L.rivalX(12, 24, 11.7 / 24, 200, true) < 100 - L.LEAD_NEAR && L.rivalX(12, 24, 12.3 / 24, 200, true) > 100 + L.LEAD_FORE && L.rivalX(12, 24, 0.5, 200, true) === 100,
    "race: on a phone a hundredth of a stroke behind is 38 px behind our ship, a hundredth ahead 10 px ahead, level is level");
  /* where a slow child's race rests: three beats over a box, the Corvus three strokes on, a few hundredths of a
     stroke ahead of level. Its sail is out from behind ours there */
  [12, 14, 18, 21, 24, 30].forEach(function (n9) {
    var H9b = L.cargo(3 * B, n9, B, "tap", false), rest = 1 - 3 * n9 / (n9 + H9b);
    ok(rest < 0 && rest > -0.1 && L.leadPx(rest) <= -L.LEAD_FORE, "race: a Corvus resting after three beats (" + rest.toFixed(3) + " of a stroke ahead, " + n9 + " boxes) is drawn clear of our sail on a phone");
  });
  /* the phone's mapping, a property over many random leads: level is 0 exactly; it never decreases with the lead
     (strictly rising within 3 strokes); continuous (no step: two leads e apart are never drawn more than the
     steepest slope x e apart, down to e = 1e-9 and across every knee); clamped beyond 3 strokes either way */
  var steep = L.LEAD_NEAR / L.NEAR, knees = [-3, -1, -L.NEAR, 0, L.NEAR, 1, 3];
  ok(L.leadPx(0) === 0 && L.leadPx(-0) === 0 && L.leadPx(1e-12) > 0 && L.leadPx(-1e-12) < 0, "race: the phone mapping is 0 at level, and only there");
  for (k = 0; k < 6000; k++) {
    var la0 = k % 3 === 0 ? knees[int(0, knees.length - 1)] + between(-1e-6, 1e-6) : between(-4.5, 4.5);
    var gap = k % 2 ? Math.pow(10, -int(1, 9)) * between(0.1, 1) : between(0, 2), lb0 = la0 + gap, fa = L.leadPx(la0), fb = L.leadPx(lb0);
    ok(fb >= fa, "race: the phone mapping never decreases with the lead (" + la0 + ", " + lb0 + ")");
    ok(la0 <= -3 || lb0 >= 3 || fb > fa, "race: the phone mapping rises within 3 strokes (" + la0 + ", " + lb0 + ")");
    ok(fb - fa <= steep * gap * (1 + 1e-9) + 1e-9, "race: the phone mapping is continuous (" + la0 + ", " + lb0 + ": " + (fb - fa) + " px)");
    ok(fa >= -3 * L.LEAD_PX && fa <= L.LEAD_BACK + 2 * L.LEAD_PX && (la0 < 3 || fa === 96) && (la0 > -3 || fa === -72), "race: the phone mapping is clamped at 3 strokes either way (" + la0 + ")");
    ok((la0 > 0) === (fa > 0) && (la0 < 0) === (fa < 0), "race: on a phone a Corvus behind is drawn behind, one ahead ahead (" + la0 + ")");
    ok(la0 < L.NEAR || fa >= L.LEAD_NEAR - 1e-9, "race: a hundredth of a stroke behind or more is drawn at least 38 px behind (" + la0 + ")");
    ok(la0 > -L.NEAR || fa <= -L.LEAD_FORE + 1e-9, "race: a hundredth of a stroke ahead or more is drawn at least 10 px ahead (" + la0 + ")");
    /* and through rivalX: the farther the Corvus has rowed, the farther along it is drawn, with no step, on its lane */
    var n5 = int(6, 30), d5 = int(1, n5), tw5 = between(120, 400), p5 = between(0, 1), dp = gap / n5, o5 = { lo: 65, hi: 30 };
    var x1 = L.rivalX(d5, n5, p5, tw5, true, o5), x2 = L.rivalX(d5, n5, p5 + dp, tw5, true, o5);
    ok(x2 >= x1 && x2 - x1 <= steep * gap * (1 + 1e-9) + 1e-9, "race: on a phone the Corvus is drawn farther along as it rows, with no step (" + x1 + ", " + x2 + ")");
    ok(x1 >= -65 && x1 <= tw5 + 30, "race: the Corvus stays on its lane");
  }

  /* a macron slip costs a miss in the race only: the chart still judges it right */
  var pc = C.charts.find(function (x) { return x.id === "c02-porta-magna"; }), pool = L.typedPool(pc, C.charts, true), dat = pool.find(function (x) { return x.cid === pc.id && x.key === "1.2.0"; });
  var sl = L.judgeTyped(dat, "portis", "light", pool), rt = L.judgeTyped(dat, "portīs", "light", pool);
  ok(sl.ok && sl.slip && sl.answer === "portīs" && !L.judgeTyped(dat, "portis", "strict", pool).ok, "race: judgeTyped is unchanged (portis is a slip in light, wrong in strict)");
  ok(!L.raceRight(sl) && L.raceRight(rt) && L.boxCost(2000, B, L.raceRight(sl), 0) === R.MISS * B && L.boxCost(2000, B, L.raceRight(rt), 0) === 1750, "race: a slip costs a miss on the race clock");

  /* the usual pace, per chart and key */
  var rr0 = L.raceRec(null);
  eq([L.usual(rr0, "c02-porta-magna", "calm", 1800, "tap"), L.usual(rr0, "c22-res-dies", "type", 1800, "type")], [{ u: 4500, from: "first" }, { u: 5400, from: "first" }],
    "race: a first race ever at a step: 2.5 strokes, at most three beats");
  var rr1 = L.raceRec({ race: { usual: { "c01-present": { calm: [1600, 1700, 1650] }, "c03-puer-ager": { calm: [1500] } } } });
  eq(L.usual(rr1, "c02-porta-magna", "calm", 1800, "tap"), { u: 1.5 * (1650 + 1500) / 2, from: "key" }, "race: a chart's first race at a step: 1.5 x the other charts' usual");
  eq(L.usual(L.raceRec({ race: { usual: { a: { calm: [5000] } } } }), "b", "calm", 1200, "tap"), { u: 3600, from: "key" }, "race: ... at most three beats");
  eq(L.usual(rr1, "c01-present", "calm", 1800, "tap"), { u: 1650, from: "chart" }, "race: the chart's own usual: the mean of its last three");
  eq(L.usual(rr1, "c01-present", "open", 1800, "tap").from, "first", "race: the usual is kept per key");
  var pr = L.fresh(), base = { id: "c02-porta-magna", step: 1, key: "calm", pass: true, r: "won", m: 2, H: 9, B: 1800, dare: false };
  function rec(x) { var o = {}; Object.keys(base).forEach(function (k2) { o[k2] = base[k2]; }); Object.keys(x).forEach(function (k2) { o[k2] = x[k2]; }); return L.recordRace(pr, o); }
  rec({ cost: 3000, u: 2000, from: "chart" }); rec({ cost: 1000, u: 2000, from: "chart" }); rec({ cost: 5000, u: 2000, from: "key" }); rec({ cost: 2222, u: 4500, from: "first" });
  eq(pr.race.usual["c02-porta-magna"].calm, [1600, 5000, 2222], "race: an entry is clipped to within 20% of a usual from the chart's own races; the last three are kept");

  /* the records: laurels only on a passed chart */
  pr = L.fresh();
  var r1 = rec({ cost: 2400, u: 2446, from: "chart", pass: false, r: "won" });
  ok(!r1.rec && pr.race.won === 0 && pr.race.run === 0 && pr.race.best === null && pr.race.races === 1 && pr.race.usual["c02-porta-magna"].calm.length === 1, "race: a failed chart stores the cost but no result");
  var r2 = rec({ cost: 2400, u: 2446, from: "chart", r: "won", m: 2.4 });
  ok(r2.rec && pr.race.won === 1 && pr.race.run === 1 && pr.race.best.m === 2.4 && pr.race.best.id === "c02-porta-magna", "race: a passed win is recorded");
  rec({ cost: 2400, u: 2446, from: "chart", r: "heat", m: 0.1 });
  ok(pr.race.heat === 1 && pr.race.run === 1, "race: a dead heat keeps the run of wins");
  rec({ cost: 2400, u: 2446, from: "chart", r: "lost", m: -1.4 });
  ok(pr.race.lost === 1 && pr.race.run === 0 && pr.race.bestRun === 1 && pr.race.races === 4, "race: a loss ends the run");
  ok(!pr.race.dareOk && !rec({ cost: 900, u: 900, from: "chart", r: "won", m: 6, H: 0, B: 1800 }).dare, "race: a level win at Slow does not unlock Dare");
  ok(!rec({ cost: 900, u: 900, from: "chart", r: "won", m: 6, H: 0, B: 1200, pass: false }).dare && !pr.race.dareOk, "race: ... nor one on a failed chart");
  ok(!rec({ cost: 900, u: 900, from: "chart", r: "won", m: 6, H: 1, B: 1200 }).dare && !pr.race.dareOk, "race: ... nor one with cargo");
  ok(rec({ cost: 900, u: 900, from: "chart", r: "won", m: 6, H: 0, B: 1200 }).dare && pr.race.dareOk, "race: a passed level win at Steady unlocks Dare");
  ok(!rec({ cost: 900, u: 900, from: "chart", r: "won", m: 6, H: 0, B: 1200 }).dare, "race: ... once");
  ok(rec({ cost: 900, u: 4500, from: "first", r: "won" }).first, "race: the first race at a key is known");
  var before = JSON.stringify(pr.race);
  L.record(pr, "c02-porta-magna", 1, 24, 24, "2026-11-26");
  L.voyage(pr, L.inPlay(C.charts, { grade: 6, chapter: 2 }, W), 2, "2026-11-26");
  ok(JSON.stringify(pr.race) === before && pr.charts["c02-porta-magna"].passed[0], "race: L.record and L.voyage keep prog.race");
  ok(JSON.stringify(L.raceRec(pr)) === before, "race: raceRec keeps a clean record as it is");
  var junk = L.raceRec({ race: { usual: { a: { calm: [1200, "x", -5, 1e9, 1300, 1400, 1500], storm: "no" }, b: "str", c: [1, 2], d: { open: [] } }, races: -3, won: "7", heat: 2.7, lost: null,
    best: { m: "x", id: "a" }, run: 4, bestRun: 2, dareOk: "yes", told: { rush: "yesterday", port: "2026-11-25", first: 1, mercy: true } } });
  eq(junk, { usual: { a: { calm: [1300, 1400, 1500], open: [], storm: [], type: [] } }, races: 0, won: 7, heat: 2, lost: 0, best: null, run: 4, bestRun: 4, dareOk: false,
    told: { first: false, mercy: true, rush: null, port: "2026-11-25", rest: null, nudge: null, alone: false, type: false } }, "race: raceRec cleans odd and old values");
  eq(L.raceRec({ race: [1, 2] }), L.raceRec(null), "race: raceRec of junk is a fresh record");
  ok(L.fresh().race && L.fresh().race.races === 0, "race: a fresh progress has a race record");

  /* fixtures: 24 boxes, the column turns at box 13, the Slow drum */
  var H9 = L.cargo(2446, 24, 1800, "tap", false);
  eq(H9, 9, "race fixture: a settled usual of 2.45 s carries H 9");
  eq(L.amphorae(H9, 24), 2, "race fixture: two amphorae");
  var typ = row(24, 2500, opts({ H: H9, miss: [2, 8], comeback: true }));
  ok(typ.r === "won" && typ.m >= 1 && typ.m <= 3, "race fixture: typical 2.5 s with misses on boxes 3 and 9 is first in (" + typ.m.toFixed(2) + ")");
  ok(!L.passes(22, 24) && !rec({ cost: typ.cost, u: 2446, from: "chart", pass: L.passes(22, 24), r: typ.r, m: typ.m }).rec, "race fixture: ... on 22 of 24, practice: no laurels");
  var bad = row(24, 4500, opts({ H: H9, miss: [2, 8], comeback: true }));
  ok(bad.r === "lost" && -bad.m <= 2, "race fixture: a 4.5 s bad night against a settled 2.45 s usual loses by at most 2 (" + bad.m.toFixed(2) + ")");
  var good = row(24, 2500, opts({ H: H9, miss: [6], comeback: true }));
  ok(good.r === "won" && good.m >= 1.5 && good.m <= 3.5, "race fixture: the rematch at one miss is won by about 2.5 (" + good.m.toFixed(2) + ")");
  /* rēs and diēs typed at 5 s at Steady (the Storm drum beats slow, a Corvus stroke is 3.6 s), one miss */
  var rd = { B: 1800, mode: "type", turns: [10], miss: [3] }, rd0 = row(20, 5000, rd), Hrd = L.cargo(rd0.cost, 20, 1800, "type");
  rd.H = Hrd;
  var rde = row(20, 5000, rd);
  ok(Hrd >= 6 && Hrd <= 8 && rde.r === "won" && rde.m >= 1 && rde.m <= 2.5, "race fixture: rēs and diēs typed at 5 s at Steady wins by about 1.7 (H " + Hrd + ", " + rde.m.toFixed(2) + ")");
  var skip = [0, 1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 19], fast = [];
  for (k = 0; k < 20; k++) { fast.push(skip.indexOf(k) >= 0 ? 4500 : 5000); }
  var sk = row(20, fast, { B: 1800, mode: "type", turns: [10], miss: [3], slip: skip, H: Hrd });
  ok(sk.r === "lost", "race fixture: ... skipping the macrons loses (" + sk.m.toFixed(2) + ")");
  /* a fast child (1.1 s a box): level at Slow, won big; a dare at Steady is close */
  var uf = row(24, 1100, opts({})).cost, Hf = L.cargo(uf, 24, 1800, "tap");
  var fastLevel = row(24, 1100, opts({ H: Hf }));
  ok(Hf === 0 && fastLevel.r === "won" && fastLevel.m >= 10, "race fixture: a fast child races level at Slow and wins big (" + fastLevel.m.toFixed(2) + ")");
  var Hd = L.cargo(uf, 24, 1200, "tap", true), dareRace = row(24, 1100, opts({ H: Hd, B: 1200, dare: true })), dare1 = row(24, 1100, opts({ H: Hd, B: 1200, dare: true, miss: [7] }));
  ok(Hd < 0 && dareRace.r === "won" && dareRace.m <= 5 && Math.abs(dare1.m) <= 2.5, "race fixture: a dare at Steady is close (H " + Hd + ", " + dareRace.m.toFixed(2) + ", one miss " + dare1.m.toFixed(2) + ")");
  var first = row(24, 2500, opts({ H: L.cargo(L.usual(rr0, "c02-porta-magna", "calm", 1800, "tap").u, 24, 1800, "tap"), miss: [2, 8], comeback: true }));
  ok(first.r === "won", "race fixture: a first race ever is won (" + first.m.toFixed(2) + ")");
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
