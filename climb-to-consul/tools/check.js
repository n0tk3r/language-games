#!/usr/bin/env node
/* Climb to Consul: checks before publishing.  Run: node tools/check.js  (from the climb-to-consul folder or anywhere)
 * Loads ../latin-common/js/words.js in a vm context and js/logic.js, then for every word of grades 6 and 8 in the
 * ready chapters, for every chapter a player can be in and for many random seeds, builds every kind of question
 * and asserts what SPEC.md asks; then the scheduling rules, Erase Away and the trick-verb ring.
 * Prints a summary and exits non-zero on any failure. */
"use strict";
const path = require("path");
const fs = require("fs");
const vm = require("vm");

const HERE = path.join(__dirname, "..");
const S = require(path.join(HERE, "..", "latin-common", "js", "shell.js"));
const L = require(path.join(HERE, "js", "logic.js"));
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(HERE, "..", "latin-common", "js", "words.js"), "utf8"), ctx, { filename: "words.js" });
const W = ctx.window.LATIN_WORDS;

const SEEDS = +(process.env.SEEDS || 24);
let checks = 0, fails = 0;
const failures = [];
const counts = { quaestor: 0, aedile: 0, praetor: 0, rows: 0, consul: 0, praetorT: 0, rounds: 0, erase: 0, ring: 0, three: 0 };
function ok(cond, msg) { checks++; if (!cond) { fails++; if (failures.length < 60) { failures.push(msg); } } return cond; }
const key = L.key;
const byId = {};
W.words.forEach((w) => { byId[w.id] = w; });
const notes = [];   /* things for the data owner: printed, not failures */

/* ---------------------------------------------------- independent content checks
   These do not use the game's own sense rules (L.senses, L.related): they tokenise the meanings their own way. */
const STOP = new Set(("the a an to be of from with for in on at by and or as into up out off away down back over upon about " +
  "one's oneself someone something it its he she they his her their this that is are not no m f pl usually").split(" "));
function contentWords(w) {
  return [...new Set(String(w.mean).toLowerCase().replace(/\([^)]*\)/g, " ").split(/[^a-z'-]+/).filter((x) => x && !STOP.has(x)))];
}
function overlap(a, b) { const cb = contentWords(b); return contentWords(a).filter((t) => cb.includes(t)); }
/* Pairs that share a content word but were reviewed and may be offered against each other (one is not a
   meaning of the other). Any other pair that shares a content word must never be offered: the test fails. */
const REVIEWED = {
  "01-valeo|03-habeo": "be strong, have power / have, hold: 'have power' is not 'have'",
  "01-valeo|05-supero": "have power / have the upper hand, surpass: different",
  "03-habeo|05-supero": "have, hold / have the upper hand: different",
  "03-habeo|06-possum": "have, hold / be able, have power: different",
  "05-supero|06-possum": "have the upper hand / have power: different",
  "21-iterum|23-umquam": "a second time / at any time: different",
  "21-scio|25-nescio": "know / not know: opposites, a fair contrast",
  "25-ait|25-nego": "he says / deny, say that ... not: different",
  "05-propter|06-quare": "because of (preposition) / because of which thing, therefore (adverb): different",
  "05-tum|08-dum": "then, at that time / while, at the same time that: different"
};
function pairKey(a, b) { return [a, b].sort().join("|"); }
/* attested Latin that must never be a wrong tile: the long forms of dexter, contracted genitives, -iī perfects */
const VARIANT_LIST = ["dextera", "dexterum"];
function variantsOf(w) {
  const v = VARIANT_LIST.slice();
  if (w.gen && /iī$/.test(w.gen)) { v.push(w.gen.slice(0, -2) + "ī"); }         /* fīliī -> fīlī */
  (w.pp || []).forEach((p) => { if (/īvī$/.test(p)) { v.push(p.slice(0, -3) + "iī"); } });   /* audīvī -> audiī */
  return v;
}
/* every headword printed in the entry: each "?" piece, each ";" or ", and" entry's first word, "(or X)" */
function printedHeads(w) {
  let lat = String(w.lat).replace(/\(\s*or\s*\)/g, ";").replace(/\(\s*or\s+([^)]*)\)/g, "; $1").replace(/\([^)]*\)/g, " ");
  const out = [];
  lat.split(/;|,\s*and\s+/).forEach((entry) => {
    const head = entry.replace(/^\s*or\s+/, "").split(",")[0];
    const pieces = head.split(/[?!]/).map((x) => x.trim()).filter((x) => /[a-zāēīōū]/i.test(x));
    pieces.forEach((x) => out.push(x));
    if (pieces.length > 1) { out.push(pieces.join(" ")); }
  });
  return out;
}
/* the English a child reads: no empty or repeated sense, not too long */
function lintEnglish(text, w, label, max) {
  const parts = String(text).split(/[;,]/).map((x) => x.trim().toLowerCase());
  ok(parts.every(Boolean), `${w.id} ${label}: an empty sense in "${text}"`);
  ok(new Set(parts).size === parts.length, `${w.id} ${label}: a sense repeated in "${text}"`);
  ok(String(text).length <= max, `${w.id} ${label}: "${text}" is longer than ${max}`);
}

/* the players to test: every ready chapter of grades 6 and 8, and one chapter past the last ready one */
const players = [];
[6, 8].forEach((g) => {
  const ready = L.readyChapters(W, g), chs = L.gradeChapters(W, g);
  ready.forEach((ch) => players.push({ id: "t" + g + "-" + ch, grade: g, chapter: ch }));
  const past = chs.filter((c) => c > ready[ready.length - 1])[0];
  if (past) { players.push({ id: "t" + g + "-" + past, grade: g, chapter: past }); }
});

/* ------------------------------------------------------------------ data */
players.forEach((p) => {
  const words = L.inPlay(W, p);
  ok(words.length > 0, `grade ${p.grade} ch ${p.chapter}: words in play`);
  words.forEach((w) => {
    ok(w.drill !== false, `${w.id}: not drilled but in play`);
    ok(w.ch <= L.playChapter(W, p), `${w.id}: past the player's chapter`);
    ok(L.isReady(W, w.ch), `${w.id}: chapter not ready`);
    ok(!!w.ask && !!w.mean && !!w.hw, `${w.id}: has ask, mean, hw`);
  });
});
/* what the child reads, for every word in play */
players.forEach((p) => {
  L.inPlay(W, p).forEach((w) => {
    lintEnglish(L.english(w), w, "Quaestor English", 40);
    lintEnglish(L.ask(w), w, "ask", 40);
    const mean = String(w.mean).split(/[;,]/).map((x) => x.trim());
    L.english(w).split(/[;,]\s*/).forEach((g) => ok(mean.includes(g.trim()), `${w.id}: "${g}" is not a meaning of "${w.mean}"`));
  });
});
ok(L.english(byId["19-at"]) === "but, mind you", `at: the English is "${L.english(byId["19-at"])}"`);
ok(!/but, but/.test(L.ask(byId["19-at"])), "at: the ask does not read \"but, but\"");
/* the same lint on the chapters that are not ready: notes for the data owner */
[6, 8].forEach((g) => L.gradeWords(W, g).filter((w) => w.drill !== false && !L.isReady(W, w.ch)).forEach((w) => {
  const t = L.ask(w), parts = t.split(/[;,]/).map((x) => x.trim().toLowerCase());
  if (t.length > 40 || new Set(parts).size !== parts.length) { notes.push(`${w.id} (chapter ${w.ch}, not ready): ask "${t}"`); }
}));
/* every pair a choice question could offer against each other: a shared content word must be reviewed or never offered */
const FUNCS = ["adverb", "conjunction", "preposition", "pronoun", "interjection"];
[6, 8].forEach((g) => {
  const ws = L.gradeWords(W, g).filter((w) => w.drill !== false && w.pos !== "form" && w.pos !== "phrase");
  for (let i = 0; i < ws.length; i++) {
    for (let j = i + 1; j < ws.length; j++) {
      const a = ws[i], b = ws[j];
      if (a.pos !== b.pos && !(FUNCS.includes(a.pos) && FUNCS.includes(b.pos))) { continue; }
      const sh = overlap(a, b);
      if (!sh.length) { continue; }
      ok(L.related(a, b) || REVIEWED[pairKey(a.id, b.id)], `grade ${g}: ${a.id} and ${b.id} share "${sh.join(", ")}" but may be offered against each other (add them to "same" in words.js, or review them)`);
    }
  }
});
/* the near pairs found in review are never offered, and typing one for the other is a near miss */
[["21-rapio", "22-eripio"], ["21-gens", "21-vulgus"], ["19-libero", "20-careo"]].forEach(([a, b]) => {
  ok(L.related(byId[a], byId[b]), `${a} and ${b} are never offered against each other`);
  const t = L.typedWord(W, byId[a], byId[b].hw, { grade: 8, chapter: 22 });
  ok(t && t.near && t.w.id === b, `typing ${byId[b].hw} for ${byId[a].hw} is a near miss (one more try)`);
});
ok(L.playChapter(W, { grade: 6, chapter: 5 }) === 3, "grade 6 chapter 5 plays up to chapter 3");
ok(L.behind(W, { grade: 6, chapter: 5 }) === true, "grade 6 chapter 5 is told the words are on their way");
ok(L.inPlay(W, { grade: 7, chapter: 9 }).length === 0, "grade 7 has nothing yet");
/* every ask is unique within its part of speech in the grade, so the typed Consul answer is one word */
[6, 8].forEach((g) => {
  const seen = {};
  L.gradeWords(W, g).filter((w) => w.drill !== false).forEach((w) => {
    const k = w.pos + "|" + S.norm(w.ask);
    ok(!seen[k] || (w.same || []).includes(seen[k]), `grade ${g}: "${w.ask}" asks for two ${w.pos}s (${seen[k]}, ${w.id})`);
    seen[k] = seen[k] || w.id;
  });
});

/* ------------------------------------------------------- choice questions */
function checkChoice(q, w, kind, p) {
  counts[kind]++;
  const pc = L.playChapter(W, p);
  ok(q.choices.length === 4, `${w.id} ${kind}: ${q.choices.length} choices`);
  const rights = q.choices.filter((c) => c.ok);
  ok(rights.length === 1, `${w.id} ${kind}: ${rights.length} right choices`);
  const want = kind === "quaestor" ? L.english(w) : w.hw;
  ok(rights[0] && rights[0].text === want && rights[0].id === w.id, `${w.id} ${kind}: the right choice is "${want}"`);
  const keys = q.choices.map((c) => (kind === "quaestor" ? S.norm(c.text) : key(c.text)));
  ok(new Set(keys).size === keys.length, `${w.id} ${kind}: duplicate choices ${keys.join(" / ")}`);
  const tier1 = [];
  q.choices.filter((c) => !c.ok).forEach((c) => {
    const x = byId[c.id];
    ok(!!x, `${w.id} ${kind}: unknown choice ${c.id}`);
    if (!x) { return; }
    ok(x.id !== w.id, `${w.id} ${kind}: the word against itself`);
    ok(W.chapters[x.ch].grade === p.grade, `${w.id} ${kind}: ${x.id} from another grade`);
    ok(x.drill !== false, `${w.id} ${kind}: ${x.id} is not drilled`);
    ok(!(w.same || []).includes(x.id) && !(x.same || []).includes(w.id), `${w.id} ${kind}: ${x.id} is in "same"`);
    const sw = L.senses(w), sx = L.senses(x);
    ok(!sw.some((s) => sx.includes(s)), `${w.id} ${kind}: ${x.id} shares a sense (${sw.filter((s) => sx.includes(s))})`);
    ok(key(x.hw) !== key(w.hw), `${w.id} ${kind}: ${x.id} differs only by macrons`);
    ok(S.norm(L.english(x)) !== S.norm(L.english(w)), `${w.id} ${kind}: ${x.id} same English`);
    const sh = overlap(w, x);
    ok(!sh.length || REVIEWED[pairKey(w.id, x.id)], `${w.id} ${kind}: ${x.id} shares "${sh.join(", ")}" (not a reviewed pair)`);
    const samePos = x.pos === w.pos;
    ok(samePos || ["adverb", "conjunction", "preposition", "pronoun", "interjection"].includes(w.pos), `${w.id} ${kind}: ${x.id} is a ${x.pos}`);
    if (samePos && x.ch <= pc) { tier1.push(x); }
  });
  /* later chapters (or another part of speech) only when the words in play have fewer than 3 valid ones */
  const valid = L.choicePool(W, w, p)[0].filter((x) => !L.related(w, x));
  const distinct = new Set(valid.map((x) => (kind === "quaestor" ? S.norm(L.english(x)) : key(x.hw))));
  distinct.delete(kind === "quaestor" ? S.norm(L.english(w)) : key(w.hw));
  ok(tier1.length === Math.min(3, distinct.size), `${w.id} ${kind}: ${tier1.length} wrong choices from the words in play, ${distinct.size} available`);
}

/* ------------------------------------------------------------- the Praetor */
const GN = { m: "m.", f: "f.", n: "n." };
function expectRows(w) {
  if (w.pos === "noun") {
    const r = [];
    if (w.gen) { r.push(["gen", [w.gen]]); }
    if (w.takes && !w.gen) { r.push(["case", [L.CASES[w.takes]]]); return r; }
    if (w.g) { r.push(["gender", String(w.g).split(/\s+and\s+/).map((x) => GN[x])]); }
    return r.length ? r : [["pos", [w.pos]]];
  }
  if (w.pos === "adjective") {
    if (w.forms && w.forms.length && w.type !== "interrogative") { return w.forms.map((f, i) => ["form" + i, [f]]); }
    if (w.gen) { return [["gen", [w.gen]]]; }
    return [["pos", [w.pos]]];
  }
  if (w.pos === "verb") { return w.pp && w.pp.length > 1 ? w.pp.slice(1).map((p, i) => ["pp" + (i + 1), [p]]) : [["pos", [w.pos]]]; }
  if (w.takes) { return [["case", [L.CASES[w.takes]]]]; }
  return [["pos", [w.pos]]];
}
function checkRows(rows, w, label, exp) {
  ok(rows.length === exp.length, `${w.id} ${label}: ${rows.length} rows, expected ${exp.length}`);
  const tokens = L.entryTokens(w).map(key);
  rows.forEach((row, i) => {
    counts.rows++;
    const e = exp[i] || ["?", []];
    ok(row.key === e[0], `${w.id} ${label}: row ${i} is ${row.key}, expected ${e[0]}`);
    ok(row.tiles.length >= 3 && row.tiles.length <= 4, `${w.id} ${label} ${row.key}: ${row.tiles.length} tiles`);
    if (row.tiles.length === 3) { counts.three++; }
    const rights = row.tiles.filter((t) => t.ok).map((t) => t.text).sort();
    ok(JSON.stringify(rights) === JSON.stringify(e[1].slice().sort()), `${w.id} ${label} ${row.key}: right tiles ${rights} vs ${e[1]}`);
    const keys = row.tiles.map((t) => key(t.text));
    ok(new Set(keys).size === keys.length, `${w.id} ${label} ${row.key}: duplicate tiles ${row.tiles.map((t) => t.text).join(" / ")}`);
    row.tiles.filter((t) => !t.ok).forEach((t) => {
      e[1].forEach((r) => ok(key(t.text) !== key(r), `${w.id} ${label} ${row.key}: "${t.text}" differs from "${r}" only by macrons`));
      if (/^(gen$|form|pp)/.test(row.key)) {
        ok(!tokens.includes(key(t.text)), `${w.id} ${label} ${row.key}: "${t.text}" is a form printed in the entry`);
        ok(/^[a-zāēīōūȳ ]+$/i.test(t.text), `${w.id} ${label} ${row.key}: odd tile "${t.text}"`);
      }
      if (w.pp) { w.pp.forEach((p) => ok(key(p) !== key(t.text), `${w.id} ${label}: wrong tile "${t.text}" is a principal part`)); }
      variantsOf(w).forEach((v) => ok(key(v) !== key(t.text), `${w.id} ${label} ${row.key}: wrong tile "${t.text}" is real Latin (a variant)`));
      if (row.key === "pos") {
        ok(String(w.as || "").toLowerCase().indexOf(t.text) < 0, `${w.id} ${label}: wrong tile "${t.text}" is named in its entry (${w.as})`);
        ok(!(w.pos === "adjective" && t.text === "pronoun"), `${w.id} ${label}: "pronoun" offered as wrong for an adjective`);
      }
    });
  });
}
function checkPraetor(q, w) {
  counts.praetor++;
  checkRows(q.rows, w, "praetor", expectRows(w));
  const blanks = q.show.filter((s) => s.b != null).map((s) => s.b);
  ok(JSON.stringify(blanks) === JSON.stringify(q.rows.map((r, i) => i)), `${w.id} praetor: one blank per row`);
}

/* -------------------------------------------------------- typed answers */
const MODES = ["ignored", "light", "strict"];
function checkTyped(answers, w, label) {
  answers.forEach((a) => {
    MODES.forEach((m) => {
      const r = L.judge(a, answers, m);
      ok(r.ok && !r.slip, `${w.id} ${label}: "${a}" typed right is wrong in ${m}`);
      ok(L.judge(" " + a.toUpperCase() + " ", answers, m).ok, `${w.id} ${label}: "${a}" in capitals with spaces is wrong in ${m}`);
    });
    const bare = S.strip(a);
    if (bare !== a) {
      const ig = L.judge(bare, answers, "ignored"), li = L.judge(bare, answers, "light"), st = L.judge(bare, answers, "strict");
      ok(ig.ok && !ig.slip, `${w.id} ${label}: "${bare}" (no macrons) in ignored`);
      ok(li.ok && li.slip && li.answer === a, `${w.id} ${label}: "${bare}" (no macrons) in light is right with a slip`);
      ok(!st.ok && st.slip, `${w.id} ${label}: "${bare}" (no macrons) in strict is wrong ("only the macrons")`);
      /* typing a- for ā */
      const dashed = a.replace(/[āēīōū]/g, (c) => S.strip(c) + "-");
      ok(L.judge(dashed, answers, "strict").ok, `${w.id} ${label}: "${dashed}" (a- for ā) in strict`);
    }
    /* an extra macron where there is none */
    const extra = a.replace(/a(?!.*a)/, "ā");
    if (extra !== a && !answers.some((x) => x === extra)) {
      ok(!L.judge(extra, answers, "strict").ok && L.judge(extra, answers, "light").slip, `${w.id} ${label}: "${extra}" (an extra macron)`);
    }
  });
  ok(!L.judge("", answers, "light").ok, `${w.id} ${label}: empty is wrong`);
  ok(!L.judge(answers[0] + "x", answers, "ignored").ok, `${w.id} ${label}: a wrong spelling is wrong`);
}
function checkConsul(q, w, p) {
  counts.consul++;
  ok(q.answers.includes(w.hw), `${w.id} consul: the headword is an answer`);
  (w.alt || []).forEach((a) => ok(q.answers.includes(a), `${w.id} consul: alt "${a}" is an answer`));
  printedHeads(w).forEach((h) => ok(L.judge(h, q.answers, "strict").ok, `${w.id} consul: "${h}", printed in the entry, is not accepted`));
  ok(q.prompt === L.ask(w), `${w.id} consul: the prompt is the ask`);
  checkTyped(q.answers, w, "consul");
  /* no other word of the grade with the same part of speech is accepted */
  L.gradeWords(W, p.grade).filter((x) => x.pos === w.pos && x.id !== w.id && x.drill !== false && !(w.same || []).includes(x.id)).forEach((x) => {
    if (key(x.hw) !== key(w.hw) && !(w.alt || []).some((a) => key(a) === key(x.hw))) {
      ok(!L.judge(x.hw, q.answers, "ignored").ok, `${w.id} consul: "${x.hw}" (${x.id}) accepted`);
    }
  });
}
function checkTypedPraetor(q, w) {
  counts.praetorT++;
  const rows = L.typedRows(w);
  if (!rows) { ok(q.kind === "consul", `${w.id} praetorT: no typed rows falls back to the Consul question`); return; }
  ok(q.kind === "praetorT", `${w.id} praetorT: kind`);
  q.rows.forEach((row) => {
    if (row.type) { checkTyped(row.answers, w, "praetorT " + row.key); }
    else { ok(row.tiles.filter((t) => t.ok).length >= 1 && row.tiles.length === 3, `${w.id} praetorT ${row.key}: tiles`); }
  });
}

players.forEach((p) => {
  L.inPlay(W, p).forEach((w) => {
    for (let s = 1; s <= SEEDS; s++) {
      checkChoice(L.question(W, w, "quaestor", p, s * 7919 + 1), w, "quaestor", p);
      checkChoice(L.question(W, w, "aedile", p, s * 7919 + 2), w, "aedile", p);
      checkPraetor(L.question(W, w, "praetor", p, s * 7919 + 3), w);
      if (s <= 2) {
        checkConsul(L.question(W, w, "consul", p, s), w, p);
        checkTypedPraetor(L.question(W, w, "praetorT", p, s), w);
      }
    }
  });
});

/* the printed headwords the review found rejected; and dexter's tiles */
(function () {
  const acc = (id, typed) => L.judge(typed, L.consulAnswers(byId[id]), "strict").ok;
  ok(acc("03-amicus", "amīca"), "friend: amīca is accepted");
  ok(acc("19-quis-quid", "quid") && acc("19-quis-quid", "quis") && acc("19-quis-quid", "quis quid"), "who? what?: quis, quid, quis quid are accepted");
  ok(["quī", "quae", "quod"].every((x) => acc("19-qui-quae-quod", x)), "which?: quī, quae, quod are accepted");
  ok(!acc("03-amicus", "amīcae") && !acc("03-amicus", "amīcī"), "friend: a genitive is not a headword");
  const dx = byId["20-dexter"];
  for (let s = 1; s <= 200; s++) {
    L.praetorRows(dx, s).forEach((row) => row.tiles.filter((t) => !t.ok).forEach((t) => ok(!["dextera", "dexterum"].includes(t.text), `dexter: "${t.text}" offered as wrong (seed ${s})`)));
  }
  const qq = L.praetorRows(byId["19-qui-quae-quod"], 3)[0];
  ok(qq.key === "pos" && !qq.tiles.some((t) => t.text === "pronoun"), "quī? quae? quod?: pronoun is not a wrong part of speech");
})();

/* ------------------------------------------------------------- scheduling */
const D = (n) => { const d = new Date(Date.UTC(2026, 10, 1 + n)); return d.toISOString().slice(0, 10); };
(function () {
  const w = byId["02-fama"], prog = L.fresh();
  let r = L.apply(prog, w, true, D(0));
  ok(r.from === 0 && r.to === 1 && r.climbed, "right: a Citizen climbs to Quaestor");
  r = L.apply(prog, w, true, D(0));
  ok(r.to === 1 && !r.climbed, "right again the same night: no second climb");
  ok(!L.isDue(prog.words[w.id], D(0)) && L.isDue(prog.words[w.id], D(1)), "climbed today: due tomorrow, not tonight");
  r = L.apply(prog, w, true, D(1));
  ok(r.to === 2, "right the next night: Aedile");
  r = L.apply(prog, w, false, D(2));
  ok(r.from === 2 && r.to === 1 && r.slipped, "wrong: down one office");
  r = L.apply(prog, w, true, D(2), { again: true });
  ok(r.to === 1 && !r.climbed, "the second try tonight never climbs");
  r = L.apply(prog, w, false, D(2), { again: true });
  ok(r.to === 1 && !r.slipped, "the second try tonight never slips again");
  const c = L.fresh();
  r = L.apply(c, w, false, D(0));
  ok(r.to === 0 && !r.slipped, "a Citizen stays a Citizen");
  /* to Consul and the week */
  const q = L.fresh();
  for (let n = 0; n < 4; n++) { L.apply(q, w, true, D(n)); }
  ok(q.words[w.id].o === 4, "four right nights: Consul");
  ok(L.kindFor(w, q.words[w.id]) === "consul", "a Consul's first review: the Consul question");
  for (let n = 4; n < 10; n++) { ok(!L.isDue(q.words[w.id], D(n)), `a Consul is not due after ${n - 3} days`); }
  ok(L.isDue(q.words[w.id], D(10)), "a Consul is due after 7 days");
  r = L.apply(q, w, true, D(10));
  ok(r.to === 4 && !L.isDue(q.words[w.id], D(11)) && L.isDue(q.words[w.id], D(17)), "a Consul answered right waits another week");
  ok(L.kindFor(w, q.words[w.id]) === "praetorT", "the next review alternates to the typed full entry");
  r = L.apply(q, w, true, D(17));
  ok(L.kindFor(w, q.words[w.id]) === "consul", "and back to the Consul question");
  r = L.apply(q, w, false, D(24));
  ok(r.from === 4 && r.to === 3 && L.kindFor(w, q.words[w.id]) === "consul", "a Consul answered wrong: down to Praetor, the Consul question again");
  ok(["quaestor", "aedile", "praetor", "consul"].every((k, o) => L.kindFor(w, { o: o }) === k), "the question of the office a word climbs to");
  const adv = byId["01-saepe"], cq = L.fresh();
  for (let n = 0; n < 5; n++) { L.apply(cq, adv, true, D(n * 8)); }
  ok(cq.words[adv.id].o === 4 && L.kindFor(adv, cq.words[adv.id]) === "consul", "a word with nothing to type keeps the Consul question");
})();

/* a miss cannot be undone the same night: porta at Praetor, missed -> Aedile; a second round tonight leaves it out */
(function () {
  const p = { grade: 6, chapter: 2 }, w = byId["02-porta"] || byId["02-fama"], prog = L.fresh();
  prog.words[w.id] = { o: 3, d: D(0), s: D(0), n: 3, m: 0, r: 0 };
  ok(L.isDue(prog.words[w.id], D(5)), "a Praetor is due on a later night");
  let r = L.apply(prog, w, false, D(5));
  ok(r.from === 3 && r.to === 2, "missed: Praetor -> Aedile");
  r = L.apply(prog, w, true, D(5), { again: true });
  ok(r.to === 2, "the again-try does not move it");
  const second = L.buildRound(W, p, prog, D(5), 7);
  ok(!second.items.some((it) => it.id === w.id), "a second round the same night leaves out a word that slipped tonight");
  ok(L.buildRound(W, p, prog, D(6), 7).items.some((it) => it.id === w.id), "it is back the next night");
  /* a word that slipped to Citizen tonight: no new-word card, no early review, tonight */
  const c = L.fresh();
  c.words[w.id] = { o: 1, d: D(0), s: D(0), n: 1, m: 0, r: 0 };
  L.apply(c, w, false, D(5));
  ok(c.words[w.id].o === 0, "missed: Quaestor -> Citizen");
  const pl = L.plan(W, p, c, D(5));
  ok(!pl.meet.concat(pl.early, pl.due).some((x) => x.id === w.id), "a word that slipped to Citizen tonight is not asked again tonight");
  const pl2 = L.plan(W, p, c, D(6));
  ok(pl2.due.some((x) => x.id === w.id) && !pl2.meet.some((x) => x.id === w.id), "the next night it is review (no new-word card)");
  /* a new word missed on its first night is not met as new again */
  const f = L.fresh(), nw = byId["02-fama"];
  L.apply(f, nw, false, D(5), { fresh: true });
  const pl3 = L.plan(W, p, f, D(6));
  ok(!pl3.meet.some((x) => x.id === nw.id) && pl3.due.some((x) => x.id === nw.id), "a new word missed on night 1 is asked as review on night 2, without a card");
})();

/* rounds: random progress, every player, many nights */
function randomProgress(words, r, today) {
  const prog = L.fresh();
  words.forEach((w) => {
    const o = r.int(5);
    if (o === 0 && r() < 0.5) { return; }
    prog.words[w.id] = { o: o, d: r() < 0.2 ? today : D(r.int(20)), s: r() < 0.1 ? today : D(r.int(25)), n: 1 + r.int(5), m: r.int(3), r: r.int(3) };
  });
  return prog;
}
players.forEach((p) => {
  const words = L.inPlay(W, p), pc = L.playChapter(W, p);
  for (let s = 1; s <= SEEDS; s++) {
    const r = S.rng("round" + p.id + s), today = D(26);
    const prog = randomProgress(words, r, today);
    prog.set.perNight = 5 + (s % 4);
    const round = L.buildRound(W, p, prog, today, s);
    counts.rounds++;
    const asks = round.items.filter((it) => it.t === "ask"), meets = round.items.filter((it) => it.t === "meet");
    ok(new Set(asks.map((a) => a.id)).size === asks.length, `${p.id} s${s}: a word asked twice in one plan`);
    ok(meets.length <= prog.set.perNight, `${p.id} s${s}: ${meets.length} new words, setting ${prog.set.perNight}`);
    const fresh = asks.filter((a) => a.fresh), early = asks.filter((a) => a.early);
    ok(fresh.length === meets.length, `${p.id} s${s}: every new word met is asked`);
    ok(meets.length + early.length <= prog.set.perNight, `${p.id} s${s}: new words within the setting`);
    meets.forEach((m) => {
      const w = byId[m.id];
      ok(w.ch === pc && L.officeOf(prog, w.id) === 0, `${p.id}: ${w.id} met but not a Citizen of the current chapter`);
      const im = round.items.indexOf(m), ia = round.items.findIndex((it) => it.t === "ask" && it.id === m.id);
      ok(ia > im + 1 || round.items.length === 2, `${p.id}: ${w.id} asked right after its card`);
    });
    early.forEach((a) => { const w = byId[a.id]; ok(w.ch < pc && L.officeOf(prog, w.id) === 0, `${p.id}: ${w.id} early but not an earlier Citizen`); });
    const due = asks.filter((a) => !a.fresh && !a.early);
    ok(due.length <= L.MAX_DUE, `${p.id} s${s}: ${due.length} due words`);
    due.forEach((a) => ok(L.isDue(prog.words[a.id], today), `${p.id}: ${a.id} asked but not due`));
    const allDue = words.filter((w) => L.isDue(prog.words[w.id], today));
    ok(due.length === Math.min(L.MAX_DUE, allDue.length), `${p.id} s${s}: ${due.length} of ${allDue.length} due words asked`);
    const maxS = due.reduce((m, a) => (prog.words[a.id].s > m ? prog.words[a.id].s : m), "");
    allDue.filter((w) => !due.some((a) => a.id === w.id)).forEach((w) => ok(prog.words[w.id].s >= maxS, `${p.id}: ${w.id} left out but older`));
    ok(round.items.every((it) => words.some((w) => w.id === it.id)), `${p.id}: a word not in play`);
    const total = 2 * prog.set.perNight + L.MAX_DUE;
    ok(round.items.length <= total, `${p.id}: ${round.items.length} steps`);
    const unmet = (w) => L.officeOf(prog, w.id) === 0 && !(prog.words[w.id] && prog.words[w.id].n > 0);
    if (pc && words.some((w) => w.ch === pc && unmet(w))) { ok(meets.length > 0 || prog.set.perNight === 0, `${p.id} s${s}: the chapter's Citizens are met`); }
    meets.concat(early).forEach((m) => ok(unmet(byId[m.id]), `${p.id} s${s}: ${m.id} was met before but gets a new-word card or counts as new`));
    /* due, by the rule written out here: not asked today; offices 1-3 not climbed today, met Citizens, Consuls after 7 days */
    words.forEach((w) => {
      const e = prog.words[w.id], want = !!e && e.s !== today && ((e.o >= 1 && e.o <= 3 && e.d !== today) || (e.o === 0 && e.n > 0) || (e.o === 4 && S.days(e.s, today) >= 7));
      ok(L.isDue(e, today) === want, `${p.id} s${s}: ${w.id} due is ${L.isDue(e, today)}`);
    });
  }
});

/* thirty nights of play: one climb a word a night at most, offices stay 0..4, misses come back once */
players.forEach((p) => {
  const prog = L.fresh(), r = S.rng("nights" + p.id), words = L.inPlay(W, p);
  for (let n = 0; n < 30; n++) {
    const today = D(n), before = {};
    words.forEach((w) => { before[w.id] = L.officeOf(prog, w.id); });
    const round = L.buildRound(W, p, prog, today, n);
    const missed = {};
    for (round.i = 0; round.i < round.items.length; round.i++) {
      const it = round.items[round.i];
      if (it.t !== "ask") { continue; }
      const w = byId[it.id], right = r() < 0.8;
      const res = L.apply(prog, w, right, today, it);
      if (!right && !it.again) { ok(L.requeue(round, w.id), `${p.id} night ${n}: ${w.id} requeued`); missed[w.id] = (missed[w.id] || 0) + 1; }
      if (it.again) { ok(res.from === res.to, `${p.id} night ${n}: ${w.id} moved on its second try`); }
    }
    words.forEach((w) => {
      const o = L.officeOf(prog, w.id);
      ok(o >= 0 && o <= 4, `${p.id}: office ${o}`);
      ok(o <= before[w.id] + 1, `${p.id} night ${n}: ${w.id} climbed ${o - before[w.id]} offices`);
    });
    const agains = round.items.filter((it) => it.again).map((it) => it.id);
    ok(new Set(agains).size === agains.length, `${p.id} night ${n}: a miss came back twice`);
    const nt = prog.nights[today] || { met: 0, early: 0 };
    ok(nt.met + nt.early <= prog.set.perNight, `${p.id} night ${n}: ${nt.met} new words`);
    /* a second round the same night meets no more new words than the setting allows */
    const again = L.buildRound(W, p, prog, today, n + 100);
    ok(again.items.filter((it) => it.t === "meet").length + nt.met + nt.early <= prog.set.perNight, `${p.id} night ${n}: a second round adds too many new words`);
    ok(again.items.filter((it) => it.t === "ask" && !it.fresh && !it.early).every((it) => prog.words[it.id].d !== today), `${p.id} night ${n}: a word climbed today is asked again`);
    again.items.forEach((it) => ok(!(prog.words[it.id] && prog.words[it.id].s === today), `${p.id} night ${n}: ${it.id}, asked tonight, comes back in a second round`));
  }
  const h = L.hill(W, p, prog);
  ok(h.reduce((a, b) => a + b, 0) === words.filter(L.countable).length, `${p.id}: the hill counts every word once`);
});

/* -------------------------------------------------------------- Erase Away */
(function () {
  ok(L.quizEve({ mode: "weekly", day: 5 }, "2026-11-26") === true, "weekly quiz on Friday: Thursday is quiz eve");
  ok(L.quizEve({ mode: "weekly", day: 5 }, "2026-11-27") === false, "weekly quiz on Friday: Friday is not the eve");
  ok(L.quizToday({ mode: "weekly", day: 5 }, "2026-11-27") === true, "weekly quiz on Friday: Friday is quiz day");
  ok(L.quizEve({ mode: "weekly", day: 1 }, "2026-11-29") === true, "weekly quiz on Monday: Sunday is quiz eve");
  ok(L.quizEve({ mode: "date", date: "2026-12-01" }, "2026-11-30") === true, "a quiz on a date: the day before");
  ok(L.quizEve({ mode: "date", date: "2026-12-01" }, "2026-12-02") === false, "a quiz on a date: after it");
  ok(L.quizEve({ mode: "none" }, "2026-11-26") === false, "no quiz day: never");
  ok(L.quizEve(null, "2026-11-26") === false, "no quiz settings: never");
})();
players.forEach((p) => {
  const pc = L.playChapter(W, p), words = L.inPlay(W, p), chWords = words.filter((w) => w.ch === pc && L.countable(w));
  for (let s = 1; s <= SEEDS; s++) {
    const r = S.rng("erase" + p.id + s), prog = randomProgress(words, r, D(26));
    const max = s % 2 ? 5 : undefined;   /* odd seeds: the phone's set of 5 */
    const set = L.eraseSet(W, p, prog, s, max), rounds = L.eraseRounds(set, s);
    counts.erase++;
    ok(set.length >= 5 && set.length <= (max || 7), `${p.id} erase: ${set.length} entries (max ${max || 7})`);
    ok(new Set(set.map((e) => e.id)).size === set.length, `${p.id} erase: an entry twice`);
    if (chWords.length >= 5) { ok(set.every((e) => byId[e.id].ch === pc), `${p.id} erase: an entry from another chapter`); }
    const kinds = set.map((e) => byId[e.id].pos);
    if (chWords.some((w) => w.pos === "noun")) { ok(kinds.includes("noun"), `${p.id} erase: no noun`); }
    if (chWords.some((w) => w.pos === "verb")) { ok(kinds.includes("verb"), `${p.id} erase: no verb`); }
    if (chWords.some((w) => w.pos !== "noun" && w.pos !== "verb")) { ok(kinds.some((k) => k !== "noun" && k !== "verb"), `${p.id} erase: no other kind`); }
    /* weakest first: a word left out is never weaker than every chosen word of its kind's group */
    const maxO = Math.max.apply(null, set.map((e) => L.officeOf(prog, e.id)));
    const weaker = chWords.filter((w) => !set.some((e) => e.id === w.id) && L.officeOf(prog, w.id) < maxO);
    const fill = set.filter((e) => L.officeOf(prog, e.id) === maxO);
    ok(!weaker.length || fill.length <= 3, `${p.id} erase: weaker words left out (${weaker.map((w) => w.id)})`);
    /* rounds: 0 shows all, then genitives, genders, principal parts, meanings, cumulative */
    ok(rounds[0].erase.length === 0, `${p.id} erase: round 0 erases nothing`);
    let prevStep = 0, prev = [];
    rounds.slice(1).forEach((rd) => {
      ok(rd.step > prevStep, `${p.id} erase: rounds out of order`);
      ok(prev.every((k) => rd.erase.includes(k)), `${p.id} erase: round ${rd.n} brings back a piece`);
      ok(JSON.stringify(rd.erase.slice(prev.length)) === JSON.stringify(L.ERASE_ORDER[rd.step - 1]), `${p.id} erase: round ${rd.n} erases ${rd.erase.slice(prev.length)}`);
      const want = [];
      set.forEach((e) => e.parts.forEach((pt) => { if (rd.erase.includes(pt.k)) { want.push(pt.text); } }));
      ok(JSON.stringify(rd.chips.map((c) => c.text).sort()) === JSON.stringify(want.sort()), `${p.id} erase: round ${rd.n} chips are its blanks`);
      ok(rd.blanks.every((b) => rd.chips.some((c) => L.chipFits(b, c))), `${p.id} erase: a blank with no chip`);
      prevStep = rd.step; prev = rd.erase;
    });
    const last = rounds[rounds.length - 1];
    ok(last.erase.includes("mean"), `${p.id} erase: the meanings are erased last`);
    ok(set.every((e) => e.parts.every((pt) => last.erase.includes(pt.k))), `${p.id} erase: only the first words are left at the end`);
  }
});
/* weakest first, plainly: Consuls stay out while Citizens are left */
(function () {
  const p = { grade: 6, chapter: 2 }, words = L.inPlay(W, p).filter((w) => w.ch === 2), prog = L.fresh();
  words.forEach((w, i) => { prog.words[w.id] = { o: i % 3 === 0 ? 4 : 0, d: "", s: "", n: 1, m: 0, r: 0 }; });
  const set = L.eraseSet(W, p, prog, 3);
  ok(set.every((e) => prog.words[e.id].o === 0), "Erase Away: the weakest words first");
})();

/* --------------------------------------------------------- the trick-verb ring */
players.forEach((p) => {
  const tv = L.trickVerbs(W, p);
  tv.forEach((w) => ok(w.trick && w.pos === "verb", `${p.id} ring: ${w.id} is not a trick verb`));
  for (let s = 1; s <= 4; s++) {
    const set = L.ringSet(W, p, s);
    counts.ring++;
    ok(set.length === Math.min(6, tv.length), `${p.id} ring: ${set.length} verbs`);
    set.forEach((it) => { const w = byId[it.id]; checkRows(it.rows, w, "ring", expectRows(w)); });
  }
});

/* ------------------------------------------------------------------ summary */
console.log("Climb to Consul checks");
console.log(`  players: ${players.map((p) => p.grade + "/" + p.chapter).join(", ")}; seeds: ${SEEDS}`);
console.log(`  questions: ${counts.quaestor} Quaestor, ${counts.aedile} Aedile, ${counts.praetor} Praetor (${counts.rows} tile rows, ${counts.three} with 3 tiles), ${counts.consul} Consul, ${counts.praetorT} typed Praetor`);
console.log(`  rounds: ${counts.rounds}; Erase Away sets: ${counts.erase}; trick-verb rings: ${counts.ring}`);
if (notes.length) { console.log("  notes for the data owner (chapters not ready yet):"); notes.forEach((n) => console.log("    " + n)); }
console.log(`  ${checks} checks, ${fails} failed`);
if (fails) {
  failures.forEach((f) => console.log("  FAIL " + f));
  if (fails > failures.length) { console.log(`  ... and ${fails - failures.length} more`); }
  process.exit(1);
}
console.log("  all passed");
