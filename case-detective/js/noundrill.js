/*!
 * Case Detective: the "Every noun" drill (window.CD_NOUN_DRILL).
 *
 * A plain script: it sets window.CD_NOUN_DRILL and has no other effect (no DOM, no storage, no requests), so it
 * works from file://, from a subfolder and in a sandboxed frame. It reads the noun table, window.CD_NOUNS
 * (js/nouns.js), each time it is called, so the two files may be loaded in either order.
 *
 * Each chapter's group of case files ends with an "Every noun" file. It drills the forms of the nouns of
 * chapter 1 up to that chapter, ten questions at a time, about half of them from the nouns new in that chapter.
 * Every text is built from the noun's own forms in nouns.js: the base is cut from the noun's own genitive, and
 * every ending named is the rest of one of the noun's own forms, never an ending from a general chart. The
 * irregular nouns (deus, vīs, nēmō, domus, iter, vesper) and the nouns with one special form (fīlia, dea,
 * locus) say so in their texts and point to their table in the Notebook.
 *
 * API (a noun is an item of CD_NOUNS.nouns, or its id; k is a case key, n is "sg" or "pl"):
 *   nouns(chapterMax)          the declinable nouns of chapters 1 to chapterMax, in book order
 *   cells(noun)                the cells a question may ask: [{ k: "gen", n: "pl" }, ...] (singular first)
 *   question(noun, k, n, chapter)  one Question of type 'choice' in the shape of CD_DATA (data.js), or null;
 *                              chapter: the chapter of the file it is for (default: the noun's own chapter)
 *   draw(chapter, count, rng)  count (default 10) questions for the "Every noun" file of that chapter
 *   file(chapter, grade, n)    that file in the shape of CD_DATA.files (questions: [], nounDrill), or null
 *   chart(noun)                the noun's table for the Notebook: { word, meaning, gender, forms, alt, loc, lines, ... }
 *   label(k, n)                the English name of a cell: "genitive plural"
 *   groups(chapterMax)         every noun up to that chapter for the Notebook list, by chapter, latest first
 *   base(noun)                 { sg, pl }: the base of each number (null where there is none)
 *
 * Texts follow the rules of data.js: inline tags <b>, <i>, <u> only; Latin in <i>, exactly as in nouns.js;
 * curly quotes and apostrophes; no em-dash. Recap items are plain text (the game escapes them).
 */
(function (root) {
  "use strict";

  var ORDER = ["nom", "gen", "dat", "acc", "abl", "voc"];
  var NUMS = ["sg", "pl"];
  var CASE = { nom: "nominative", gen: "genitive", dat: "dative", acc: "accusative", abl: "ablative", voc: "vocative" };
  var NUMBER = { sg: "singular", pl: "plural" };
  var COUNT = 10;

  /* The genitive ending is what names a declension (the book: "the genitive singular tells the declension").
     It is used only to cut a noun's own genitive into base and ending: a genitive that does not end so is
     not cut, and that noun gets no base from it. The plural row is for nouns that have no singular. */
  var GEN_END = {
    sg: { "1": ["ae"], "2": ["ī"], "3": ["is"], "3 (i-stem)": ["is"], "4": ["ūs"], "5": ["ēī", "eī"] },
    pl: { "1": ["ārum"], "2": ["ōrum"], "3": ["um"], "3 (i-stem)": ["ium"], "4": ["uum"], "5": ["ērum"] }
  };
  var DECL = {
    "1": "first-declension noun", "2": "second-declension noun", "3": "third-declension noun",
    "3 (i-stem)": "third-declension i-stem noun", "4": "fourth-declension noun", "5": "fifth-declension noun"
  };
  /* the book teaches the i-stems in chapter 14: the word "i-stem" is used only in the files from there on */
  var ISTEM_CHAPTER = 14;
  /* The meaning in the prompt is the first sense of the table's meaning. Where that sense is no help to a
     6th grader (a Roman word with no English one, or a rare English word first), the prompt shows this
     gloss instead. The noun table itself (its meaning, and chart() and groups() for the Notebook) is not
     changed. Plain text, curly apostrophes. */
  var GLOSS = {
    "ch02-ira": "anger",
    "ch08-ratio": "reason, judgment",
    "ch19-auctor": "author",
    "ch31-as": "an as, a small Roman coin",
    "ch40-vultus": "face, appearance"
  };
  /* nēmō takes its genitive and ablative from nūllus, so its genitive gives no base; its dative and
     accusative (nēminī, nēminem) share the base nēmin- */
  var BASE_SET = { "ch11-nemo": { sg: "nēmin", pl: null } };
  /* the book's model noun of each declension: the recap shows the genitive singular of each one met so far */
  var MODELS = [
    { id: "ch02-porta", name: "first declension" },
    { id: "ch03-amicus", name: "second declension" },
    { id: "ch07-rex", name: "third declension" },
    { id: "ch20-fructus", name: "fourth declension" },
    { id: "ch22-res", name: "fifth declension" }
  ];
  /* how often draw() asks each cell: [singular, plural], against 3 for an ordinary cell. The nominative of
     the dictionary entry stands in the prompt as the answer of its cell, so it is never asked (it is not a
     cell). The genitive of the entry stands there too: it is asked as a reminder of how to read an entry,
     at a quarter of an ordinary cell. A vocative that differs from the nominative (amīce, fīlī) comes at
     half, so that it turns up now and then. A plural-only noun, whose entry gives the plural, takes the
     singular weights for its plural (weight()). */
  var ORDINARY = 3;
  var WEIGHT = {
    nom: [0, ORDINARY / 2], gen: [ORDINARY / 4, ORDINARY], dat: [ORDINARY, ORDINARY], acc: [ORDINARY, ORDINARY],
    abl: [ORDINARY, ORDINARY], voc: [ORDINARY / 2, ORDINARY / 2]
  };
  var NUM_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  var GRADE_WORDS = { 6: "6th", 7: "7th", 8: "8th", 9: "9th" };

  /* ------------------------------------------------------------ helpers */
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function starts(s, p) { return typeof p === "string" && p.length > 0 && String(s).slice(0, p.length) === p; }
  function ends(s, p) { return typeof p === "string" && p.length > 0 && String(s).slice(-p.length) === p; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function numWord(x) { return NUM_WORDS[x] || String(x); }
  function la(s) { return "<i>" + s + "</i>"; }
  function end(e) { return "<b>-" + e + "</b>"; }
  /* plain text from the data with curly apostrophes and quotes */
  function curly(s) {
    return String(s === null || s === undefined ? "" : s).replace(/"([^"]*)"/g, "“$1”").replace(/'/g, "’");
  }
  function joinWords(list, conj) {
    if (list.length < 2) { return list[0] || ""; }
    return list.slice(0, -1).join(", ") + " " + conj + " " + list[list.length - 1];
  }

  /* ------------------------------------------------------------ the table */
  var cache = { table: null, base: {} };
  function table() {
    var N = root.CD_NOUNS, list = N && Array.isArray(N.nouns) ? N.nouns : [];
    if (cache.table !== list) { cache = { table: list, base: {} }; }
    return list;
  }
  function byId(id) {
    var list = table();
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function nounOf(x) { return typeof x === "string" ? byId(x) : (x && typeof x === "object" && x.forms ? x : null); }
  function at(noun, k, n) {
    var row = noun && noun.forms ? noun.forms[k] : null, f = row ? row[n === "pl" ? 1 : 0] : null;
    return typeof f === "string" ? f : null;
  }
  function declinable(noun) { return !!noun && !!noun.forms && noun.declension !== "indeclinable"; }
  function pluralOnly(noun) { return ORDER.every(function (k) { return at(noun, k, "sg") === null; }); }
  /* the number of the forms the dictionary entry (and the prompt) gives: the plural for a plural-only noun */
  function entryNumber(noun) { return pluralOnly(noun) ? "pl" : "sg"; }
  function twoWords(noun) { return String(noun.headword).indexOf(" ") > 0; }
  function maxChapter() { return table().reduce(function (m, x) { return Math.max(m, +x.chapter || 0); }, 0); }
  /* a chapter number of the table, or 0 */
  function chapterOf(c) {
    var x = +c;
    return x === Math.floor(x) && x >= 1 && x <= maxChapter() ? x : 0;
  }
  function other(n) { return n === "sg" ? "pl" : "sg"; }
  function label(k, n) { return own(CASE, k) && own(NUMBER, n) ? CASE[k] + " " + NUMBER[n] : ""; }

  /* the forms of the dictionary entry, without the parts in parentheses: "vesper, vesperis (or vesperī), m."
     gives ["vesper", "vesperis", "m."] */
  function entryParts(noun) { return String(noun.entry).replace(/\s*\([^)]*\)/g, "").split(/,\s*/); }

  /* -------------------------------------------------------------- bases
     { sg, pl, cut, two }: sg and pl are the bases the forms of each number are built on (null: none).
     cut = { n, gen, end, base }: where the base came from (the genitive singular, or the genitive plural of
     a noun that has no singular). two: for a noun of two words (rēs pūblica), one { base, end, gen } a word. */
  function baseInfo(noun) {
    table();
    if (own(cache.base, noun.id)) { return cache.base[noun.id]; }
    var info = { sg: null, pl: null, cut: null, two: null };
    cache.base[noun.id] = info;
    if (!declinable(noun)) { return info; }
    if (twoWords(noun)) { info.two = twoBases(noun); return info; }
    if (own(BASE_SET, noun.id)) { info.sg = BASE_SET[noun.id].sg; info.pl = BASE_SET[noun.id].pl; return info; }
    var g = at(noun, "gen", "sg"), c = g === null ? null : cutGen(g, GEN_END.sg[noun.declension]);
    if (c) { info.sg = info.pl = c.base; info.cut = { n: "sg", gen: g, end: c.end, base: c.base }; return info; }
    var gp = at(noun, "gen", "pl"), cp = gp === null ? null : cutGen(gp, GEN_END.pl[noun.declension]);
    if (cp) { info.pl = cp.base; info.cut = { n: "pl", gen: gp, end: cp.end, base: cp.base }; }
    return info;
  }
  function cutGen(g, list) {
    for (var i = 0; list && i < list.length; i++) {
      if (g.length > list[i].length && ends(g, list[i])) { return { base: g.slice(0, -list[i].length), end: list[i] }; }
    }
    return null;
  }
  /* each word's base is what all its forms share (both words change: rēs pūblica, reī pūblicae) */
  function twoBases(noun) {
    var g = at(noun, "gen", "sg"), gw = g === null ? [] : g.split(" "), size = String(noun.headword).split(" ").length, out = [];
    if (gw.length !== size) { return null; }
    for (var w = 0; w < size; w++) {
      var base = null;
      NUMS.forEach(function (n) {
        ORDER.forEach(function (k) {
          var f = at(noun, k, n);
          if (f === null || (n === "sg" && (k === "nom" || k === "voc"))) { return; }
          var x = f.split(" ")[w] || "";
          if (base === null) { base = x; return; }
          var i = 0;
          while (i < base.length && i < x.length && base.charAt(i) === x.charAt(i)) { i++; }
          base = base.slice(0, i);
        });
      });
      if (!base || !starts(gw[w], base) || gw[w].length <= base.length) { return null; }
      out.push({ base: base, end: gw[w].slice(base.length), gen: gw[w] });
    }
    return out;
  }
  function base(noun) {
    noun = nounOf(noun);
    if (!noun) { return { sg: null, pl: null }; }
    var b = baseInfo(noun), out = { sg: b.sg, pl: b.pl };
    if (b.two) { out.words = b.two.map(function (x) { return x.base; }); }
    return out;
  }

  /* ---------------------------------------------------------------- cells */
  function altForms(noun, k, n) {
    return (noun.alt || []).filter(function (a) { return a && a.case === k && a.number === n; }).map(function (a) { return a.form; });
  }
  /* every distinct main form, in book order (singular nominative to vocative, then plural) */
  function mainForms(noun) {
    var out = [];
    NUMS.forEach(function (n) { ORDER.forEach(function (k) { var f = at(noun, k, n); if (f !== null && out.indexOf(f) < 0) { out.push(f); } }); });
    return out;
  }
  /* the wrong options a question may use: other main forms that are not a form (main or alt) of the cell */
  function wrongPool(noun, k, n) {
    var right = at(noun, k, n), alts = altForms(noun, k, n);
    return mainForms(noun).filter(function (f) { return f !== right && alts.indexOf(f) < 0; });
  }
  /* A cell may be asked when it has one form, that form is not printed in the prompt as the answer of that
     very cell (the nominative of the entry is), it is not a vocative that is the nominative's twin, and
     the noun has at least two other forms to offer as wrong options (three where it has them). */
  function askable(noun, k, n) {
    if (!declinable(noun) || !own(CASE, k) || !own(NUMBER, n)) { return false; }
    var f = at(noun, k, n);
    if (f === null || altForms(noun, k, n).length) { return false; }
    if (k === "nom" && n === entryNumber(noun)) { return false; }
    if (k === "voc" && f === at(noun, "nom", n)) { return false; }
    return wrongPool(noun, k, n).length >= 2;
  }
  function cells(noun) {
    noun = nounOf(noun);
    var out = [];
    if (!declinable(noun)) { return out; }
    NUMS.forEach(function (n) { ORDER.forEach(function (k) { if (askable(noun, k, n)) { out.push({ k: k, n: n }); } }); });
    return out;
  }
  function nouns(chapterMax) {
    var c = chapterMax === undefined || chapterMax === null ? Infinity : +chapterMax;
    return table().filter(function (x) { return declinable(x) && x.chapter <= c; });
  }
  function drillable(chapterMax) { return nouns(chapterMax).filter(function (x) { return cells(x).length > 0; }); }

  /* ---------------------------------------------------- what a form is */
  function cellsWith(noun, f) {
    var out = [];
    NUMS.forEach(function (n) { ORDER.forEach(function (k) { if (at(noun, k, n) === f) { out.push({ k: k, n: n }); } }); });
    return out;
  }
  function altCellsWith(noun, f) {
    var out = [];
    NUMS.forEach(function (n) { ORDER.forEach(function (k) { if (altForms(noun, k, n).indexOf(f) >= 0) { out.push({ k: k, n: n }); } }); });
    return out;
  }
  /* a vocative that is the nominative's twin (same form, same number) is not named again */
  function noTwins(list) {
    return list.filter(function (c) { return !(c.k === "voc" && list.some(function (d) { return d.k === "nom" && d.n === c.n; })); });
  }
  function sameCell(a, b) { return a.k === b.k && a.n === b.n; }
  /* "the dative or ablative plural"; "the genitive singular, or the nominative plural";
     with "and": "the genitive and dative singular, and the nominative plural". det: "the", "its" or "" */
  function cellPhrase(list, conj, det) {
    var groups = [];
    NUMS.forEach(function (n) {
      var names = ORDER.filter(function (k) { return list.some(function (c) { return c.k === k && c.n === n; }); }).map(function (k) { return CASE[k]; });
      if (names.length) { groups.push({ text: (det ? det + " " : "") + joinWords(names, conj) + " " + NUMBER[n], size: names.length }); }
    });
    if (groups.length < 2) { return groups.length ? groups[0].text : ""; }
    if (conj === "or") { return groups[0].text + ", or " + groups[1].text; }
    return groups[0].text + (groups[0].size > 1 ? ", and " : " and ") + groups[1].text;
  }
  /* the sentence that says which case(s) and number(s) a form is (a whyNot) */
  function identity(noun, f) {
    var s = la(f) + " is " + cellPhrase(noTwins(cellsWith(noun, f)), "or", "the") + ".";
    var alt = noTwins(altCellsWith(noun, f));
    if (alt.length) { s += " It is also found as " + cellPhrase(alt, "and", "the") + "."; }
    return s;
  }

  /* How a cell is built. { f, entryGen, neuter, base+end | two | ius | tail }
     entryGen: the genitive that is the second form of the dictionary entry; neuter: an accusative or
     vocative of a neuter, the same as the nominative; base + end: the form is the base of its number plus a
     (non-empty) ending; two: the same, word by word; ius: a vocative in -ī of a noun in -ius (fīlī); tail: a
     form with no base (vīs: vim, vī), named by its last letter. (The nominative of the entry is never asked.) */
  function build(noun, k, n) {
    var f = at(noun, k, n), b = baseInfo(noun), parts = entryParts(noun), d = { f: f, k: k, n: n };
    d.entryGen = k === "gen" && n === entryNumber(noun) && f === noun.genitive && parts[1] === f;
    d.neuter = noun.gender === "n" && (k === "acc" || k === "voc") && f === at(noun, "nom", n);
    if (b.two) {
      var ws = f.split(" ");
      if (ws.length === b.two.length && ws.every(function (w, i) { return starts(w, b.two[i].base) && w.length > b.two[i].base.length; })) {
        d.two = ws.map(function (w, i) { return { base: b.two[i].base, end: w.slice(b.two[i].base.length) }; });
      }
    } else if (starts(f, b[n]) && f.length > b[n].length) {
      d.base = b[n];
      d.end = f.slice(b[n].length);
    }
    if (!d.base && !d.two && !d.entryGen && !d.neuter) {
      var nom = at(noun, "nom", "sg");
      if (k === "voc" && n === "sg" && nom !== null && ends(nom, "ius") && f === nom.slice(0, -3) + "ī") { d.ius = nom; } else { d.tail = f.slice(-1); }
    }
    return d;
  }
  /* the ending of a form on its own base (the form's first cell gives the number), or "" */
  function endingOf(noun, f) {
    var b = baseInfo(noun), c = cellsWith(noun, f)[0], w = f;
    if (!c) { return ""; }
    if (b.two) {
      var ws = f.split(" "), i = ws.length - 1;
      return b.two[i] && starts(ws[i], b.two[i].base) ? ws[i].slice(b.two[i].base.length) : "";
    }
    return starts(w, b[c.n]) ? w.slice(b[c.n].length) : "";
  }

  /* ------------------------------------------------------ special nouns
     Each returns the note of the first clue (claims taken from the noun's own table where it can). */
  function offBase(noun, n) {
    var b = baseInfo(noun)[n], groups = [];
    ORDER.forEach(function (k) {
      var f = at(noun, k, n), g = null;
      if (f === null || starts(f, b)) { return; }
      groups.forEach(function (x) { if (x.form === f) { g = x; } });
      if (!g) { g = { form: f, cells: [] }; groups.push(g); }
      g.cells.push({ k: k, n: n });
    });
    groups.forEach(function (g) { g.cells = noTwins(g.cells); });
    return groups;
  }
  function itsCells(list) { return cellPhrase(list, "and", "its"); }
  function verb(list) { return list.length > 1 ? " are " : " is "; }
  var SPECIAL = {
    "ch06-deus": function (x) {
      return la(x.headword) + " is irregular in the plural: " + offBase(x, "pl").map(function (g) { return itsCells(g.cells) + verb(g.cells) + la(g.form); }).join(", and ") + ".";
    },
    "ch14-vis": function (x) {
      var sg = [];
      ORDER.forEach(function (k) { var f = at(x, k, "sg"); if (f !== null && sg.indexOf(f) < 0) { sg.push(f); } });
      return la(x.headword) + " is irregular. Its singular forms are short: " + joinWords(sg.map(la), "and") + ". Its plural forms use the base " + la(baseInfo(x).pl + "-") + ".";
    },
    /* the forms from nūllus are not printed: one of them (nūllīus) is the answer of a question */
    "ch11-nemo": function (x) {
      var b = baseInfo(x).sg, on = ORDER.filter(function (k) { return starts(at(x, k, "sg"), b); }).map(function (k) { return { k: k, n: "sg" }; });
      var off = ORDER.filter(function (k) { return starts(at(x, k, "sg"), "nūll"); }).map(function (k) { return { k: k, n: "sg" }; });
      return la(x.headword) + " is irregular. " + cap(itsCells(off)) + " come from " + la("nūllus") + ". " +
        cap(itsCells(on)) + " use the base " + la(b + "-") + ".";
    },
    "ch37-domus": function (x) {
      return la(x.headword) + " is irregular: it mixes fourth-declension forms like " + la(at(x, "gen", "sg")) + " with second-declension forms like " + la(at(x, "abl", "sg")) + ".";
    },
    "ch37-iter": function (x) {
      return la(x.headword) + " is irregular: its base is " + la(baseInfo(x).sg + "-") + ", not " + la(x.headword + "-") + ".";
    },
    "ch28-vesper": function (x) {
      return la(x.headword) + " is irregular: it can follow the third or the second declension.";
    },
    "ch03-filia": specialPlural,
    "ch06-dea": specialPlural,
    "ch09-locus": function (x) {
      return la(x.headword) + " has a neuter plural, " + la(at(x, "nom", "pl")) + ".";
    }
  };
  /* fīlia, dea: the dative and ablative plural in -ābus (fīliābus), which keeps daughters apart from sons */
  function specialPlural(x) {
    var f = at(x, "dat", "pl");
    return la(x.headword) + " has a special " + cellPhrase(noTwins(cellsWith(x, f)), "and", "") + ", " + la(f) + ".";
  }
  function noteOf(noun) { return own(SPECIAL, noun.id) ? SPECIAL[noun.id](noun) : ""; }

  /* ---------------------------------------------------------------- texts */
  /* the first sense of the meaning: up to the first semicolon, at most two words or phrases */
  function sense(meaning) {
    var first = String(meaning || "").split(";")[0], parts = [], depth = 0, cur = "";
    for (var i = 0; i < first.length; i++) {
      var c = first.charAt(i);
      if (c === "(") { depth++; } else if (c === ")") { depth--; }
      if (c === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else { cur += c; }
    }
    parts.push(cur.trim());
    var s = parts.filter(function (p) { return p.length > 0; }).slice(0, 2).join(", ");
    s = s.replace(/^\(pl\.\)\s*/, "").replace(/\s*\((?:m|f)\.\)$/, "");
    if (/^A [A-Z]/.test(s)) { s = "a" + s.slice(1); }
    return curly(s);
  }
  function prompt(noun, k, n) {
    var meaning = own(GLOSS, noun.id) ? GLOSS[noun.id] : sense(noun.meaning);
    return "Which form is the <b>" + label(k, n) + "</b> of " + la(noun.headword + ", " + noun.genitive) + ", “" + meaning + "”?" +
      (pluralOnly(noun) ? " This noun is used only in the plural." : "");
  }
  /* true when the cell asked is the very genitive clue 1 cuts the base from: there clue 1 may not print that
     genitive (it is the answer), so it only says where to find it */
  function cutHere(noun, k, n) {
    var b = baseInfo(noun);
    if (k !== "gen") { return false; }
    if (b.two) { return n === "sg"; }
    if (!b.cut) { return false; }
    return b.cut.n === "sg" ? n === "sg" : pluralOnly(noun) && n === "pl";
  }
  /* where the player sees that genitive: the dictionary entry, or (when the entry does not give it, as for
     mēnsa secunda) the question, which always shows it after the headword */
  function genPlace(noun, g) { return entryParts(noun)[1] === g ? "the dictionary entry" : "the question"; }
  function clueBase(noun, k, n) {
    var b = baseInfo(noun), out = [], note = noteOf(noun), here = cutHere(noun, k, n);
    if (b.two) {
      out.push("Both words change.");
      if (here) { out.push("Find the genitive singular in " + genPlace(noun, at(noun, "gen", "sg")) + "."); }
      else {
        out.push("Start with the genitive singular, " + la(at(noun, "gen", "sg")) + ".",
          "Take off " + b.two.map(function (x) { return end(x.end); }).join(" and ") + " and you have the bases, " + joinWords(b.two.map(function (x) { return la(x.base + "-"); }), "and") + ".");
      }
    } else if (b.cut && b.cut.n === "sg") {
      if (here) { out.push("Find the genitive singular in " + genPlace(noun, b.cut.gen) + "."); }
      else { out.push("Start with the genitive singular, " + la(b.cut.gen) + ".", "Take off " + end(b.cut.end) + " and you have the base, " + la(b.cut.base + "-") + "."); }
    } else if (b.cut && pluralOnly(noun)) {
      if (here) { out.push("This noun has no singular, so find the genitive plural in " + genPlace(noun, b.cut.gen) + "."); }
      else { out.push("This noun has no singular, so start with the genitive plural, " + la(b.cut.gen) + ".", "Take off " + end(b.cut.end) + " and you have the base, " + la(b.cut.base + "-") + "."); }
    }
    if (note) { out.push(note, "Check its table in your Notebook."); }
    return out.join(" ");
  }
  /* "X is a third-declension noun." Before chapter 14 an i-stem noun is not called one: its sentence says
     plainly that its genitive plural ends in -ium (the noun's own form), except on the genitive plural
     itself, whose clue names that ending anyway. */
  function declSay(noun, d, chapter) {
    var H = la(noun.headword), gp = at(noun, "gen", "pl");
    if (noun.declension === "3 (i-stem)" && chapter < ISTEM_CHAPTER) {
      var ium = gp !== null && ends(gp, "ium") && !(d.k === "gen" && d.n === "pl");
      return H + " is a " + DECL["3"] + (ium ? ", and its genitive plural ends in " + end("ium") : "") + ".";
    }
    return H + " is a " + DECL[noun.declension] + ".";
  }
  /* the clue that names the ending of the cell, and the test an option must fail to be ruled out by it */
  function clueEnding(noun, d, chapter) {
    var H = la(noun.headword), lab = label(d.k, d.n), decl = declSay(noun, d, chapter);
    if (d.neuter) {
      return { say: H + " is neuter, so its " + lab + " is the same as its nominative " + NUMBER[d.n] + ".", out: function (x) { return x !== d.f; } };
    }
    if (d.two) {
      return {
        say: "In the " + lab + ", " + d.two.map(function (p) { return la(p.base + "-") + " adds " + end(p.end); }).join(" and ") + ".",
        out: function (x) { var ws = x.split(" "); return ws.length !== d.two.length || d.two.some(function (p, i) { return !ends(ws[i], p.end); }); }
      };
    }
    /* on the genitive clue 1 only points to, no base has been named: the clue gives the ending alone */
    if (d.base && cutHere(noun, d.k, d.n)) { return { say: decl + " Its " + lab + " ends in " + end(d.end) + ".", out: function (x) { return !ends(x, d.end); } }; }
    if (d.base) { return { say: decl + " Its " + lab + " adds " + end(d.end) + " to the base.", out: function (x) { return !ends(x, d.end); } }; }
    if (d.entryGen) { return { say: "The genitive singular is the second form in the dictionary entry.", out: function (x) { return x !== d.f; } }; }
    if (d.ius) {
      return { say: decl + " In its vocative singular, the " + end("ius") + " of " + la(d.ius) + " becomes " + end("ī") + ".", out: function (x) { return x !== d.f && !ends(x, "ī"); } };
    }
    return { say: decl + " Its " + lab + " ends in " + end(d.tail) + ".", out: function (x) { return !ends(x, d.tail); } };
  }
  /* a third-declension neuter's accusative or vocative singular is its nominative, which has no ending of
     the declension: its why gives the neuter rule only (mare is never "the base mar- plus -e") */
  function ruleOnly(noun, d) { return d.neuter && d.n === "sg" && String(noun.declension).charAt(0) === "3"; }
  function whyText(noun, d) {
    var s = la(d.f) + " is the <b>" + label(d.k, d.n) + "</b>", parts = [], stated = [{ k: d.k, n: d.n }];
    if (d.entryGen) { s += ", the second form in the dictionary entry"; }
    if (d.two) {
      s += ": " + d.two.map(function (p) { return la(p.base + "-") + " plus " + end(p.end); }).join(", and ");
    } else if (d.base && !ruleOnly(noun, d)) {
      s += ": the base " + la(d.base + "-") + " plus " + end(d.end);
    } else if (d.ius) {
      s += ": the " + end("ius") + " of " + la(d.ius) + " becomes " + end("ī");
    }
    parts.push(s + ".");
    if (d.tail) { parts.push("It ends in " + end(d.tail) + "."); }
    if (d.neuter) {
      parts.push(la(noun.headword) + " is neuter, so its " + label(d.k, d.n) + " is the same as its nominative " + NUMBER[d.n] + ".");
      stated.push({ k: "nom", n: d.n });
    }
    var also = noTwins(cellsWith(noun, d.f)).filter(function (c) { return !stated.some(function (x) { return sameCell(x, c); }); });
    if (also.length) { parts.push("It is also " + cellPhrase(also, "and", "the") + "."); }
    var alt = noTwins(altCellsWith(noun, d.f));
    if (alt.length) { parts.push("It is also found as " + cellPhrase(alt, "and", "the") + "."); }
    if (own(SPECIAL, noun.id)) { parts.push("Check the whole table of " + la(noun.headword) + " in your Notebook."); }
    return parts.join(" ");
  }

  /* ------------------------------------------------------- wrong options
     Prefer forms that look close: the same number, the same case in the other number, the same kind of
     ending. The forms in the prompt itself (the headword) count for less, except for a nominative or a
     vocative, where it is the very form to tell apart. Ties keep book order. */
  function score(noun, k, n, right, x) {
    var s = 0, er = endingOf(noun, right), ex = endingOf(noun, x);
    if (cellsWith(noun, x).some(function (c) { return c.n === n; })) { s += 2; }
    if (at(noun, k, other(n)) === x) { s += 2.5; }
    if (right.slice(-1) === x.slice(-1) || (er && ex && er.charAt(0) === ex.charAt(0))) { s += 1; }
    if (x === noun.headword && k !== "nom" && k !== "voc") { s -= 0.5; }
    return s;
  }
  function ranked(noun, k, n) {
    var right = at(noun, k, n), pool = wrongPool(noun, k, n), book = mainForms(noun);
    return pool.map(function (x) { return { f: x, s: score(noun, k, n, right, x), i: book.indexOf(x) }; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; }).map(function (x) { return x.f; });
  }

  /* -------------------------------------------------------------- questions
     Three wrong options, or two for a noun that has only three different forms (a question of three
     options). chapter: the chapter of the file the question is for; it decides only the wording (the word
     "i-stem" from chapter 14 on). Left out or not a chapter: the noun's own chapter, its first file. */
  function question(noun, k, n, chapter) {
    noun = nounOf(noun);
    if (!askable(noun, k, n)) { return null; }
    var ch = chapterOf(chapter) || +noun.chapter, list = ranked(noun, k, n), size = Math.min(3, list.length);
    var d = build(noun, k, n), clue = clueEnding(noun, d, ch), pick = list.slice(0, size), out = null;
    pick.forEach(function (x) { if (out === null && clue.out(x)) { out = x; } });
    if (out === null) {
      /* none of them is ruled out by the ending clue: the best one that is takes the last place */
      list.slice(size).forEach(function (x) { if (out === null && clue.out(x)) { out = x; } });
      if (out === null) { return null; }
      pick[size - 1] = out;
    }
    var whyNot = {};
    pick.forEach(function (x) { whyNot[x] = identity(noun, x); });
    return {
      id: "n-" + noun.id + "-" + k + "-" + n,
      type: "choice",
      shuffle: true,
      prompt: prompt(noun, k, n),
      options: [d.f].concat(pick).map(function (f) { return { k: f, label: f, latin: true }; }),
      answer: d.f,
      whyNot: whyNot,
      clues: [
        { say: clueBase(noun, k, n) },
        { say: clue.say + " That rules out " + la(out) + ".", eliminates: out }
      ],
      why: whyText(noun, d)
    };
  }

  /* ------------------------------------------------------------- the draw */
  function unit(rng) {
    var r = +rng();
    return r >= 0 && r < 1 ? r : (r >= 1 ? 1 - 1e-9 : 0);
  }
  function sample(list, m, rng) {
    var a = list.slice();
    for (var i = 0; i < m && i < a.length; i++) {
      var j = i + Math.floor(unit(rng) * (a.length - i)), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, Math.min(m, a.length));
  }
  /* the weight of a cell in draw(). The forms of a plural-only noun take the singular weights, as its entry
     gives the plural (its genitive plural is the entry's genitive). Every cell of cells() weighs above 0. */
  function weight(noun, c) {
    return WEIGHT[c.k][c.n === entryNumber(noun) ? 0 : 1];
  }
  function pickCell(noun, used, rng) {
    var cs = cells(noun), w = cs.map(function (c) { return weight(noun, c) * Math.pow(0.5, used[c.k + c.n] || 0); });
    var total = w.reduce(function (a, b) { return a + b; }, 0), r = unit(rng) * total;
    for (var i = 0; i < cs.length; i++) { r -= w[i]; if (r < 0) { return cs[i]; } }
    return cs[cs.length - 1];
  }
  /* how many questions come from the nouns new in the chapter and how many from earlier chapters */
  function split(C, count) {
    var pool = drillable(C), fresh = pool.filter(function (x) { return x.chapter === C; }).length, older = pool.length - fresh;
    count = Math.min(count, pool.length);
    var f = Math.min(fresh, Math.ceil(count / 2)), o = Math.min(older, count - f);
    f = Math.min(fresh, count - o);
    return { fresh: f, older: o, freshPool: fresh, olderPool: older };
  }
  function draw(chapter, count, rng) {
    var C = chapterOf(chapter);
    count = count === undefined || count === null ? COUNT : Math.floor(+count);
    if (!C || !(count > 0)) { return []; }
    rng = typeof rng === "function" ? rng : Math.random;
    var pool = drillable(C), plan = split(C, count);
    var fresh = sample(pool.filter(function (x) { return x.chapter === C; }), plan.fresh, rng);
    var older = sample(pool.filter(function (x) { return x.chapter < C; }), plan.older, rng);
    var chosen = sample(fresh.concat(older), plan.fresh + plan.older, rng), used = {};
    /* (with this table every cell of cells() gives a question, as the tests check; should a changed table
       ever leave a cell without one, that question is left out of the round, never handed on as null) */
    return chosen.map(function (noun) {
      var c = pickCell(noun, used, rng);
      used[c.k + c.n] = (used[c.k + c.n] || 0) + 1;
      return question(noun, c.k, c.n, C);
    }).filter(function (q) { return q !== null; });
  }

  /* -------------------------------------------------------------- the file */
  function file(chapter, grade, n) {
    var C = chapterOf(chapter);
    if (!C) { return null; }
    var pool = drillable(C);
    if (!pool.length) { return null; }
    var first = pool.reduce(function (m, x) { return Math.min(m, x.chapter); }, C), total = pool.length, plan = split(C, COUNT);
    var span = first === C ? "chapter " + C : (C === first + 1 ? "chapters " + first + " and " + C : "chapters " + first + " to " + C);
    var g = Math.floor(+grade), before = [];
    pool.forEach(function (x) { if (x.grade < g && own(GRADE_WORDS, x.grade) && before.indexOf(GRADE_WORDS[x.grade]) < 0) { before.push(GRADE_WORDS[x.grade]); } });
    var size = plan.fresh + plan.older, howMany;
    if (!plan.olderPool) { howMany = "."; }
    else if (plan.fresh >= Math.ceil(size / 2)) { howMany = ", about half of them new in chapter " + C + "."; }
    else if (plan.fresh === 1) { howMany = ", with the one new noun of chapter " + C + " every time."; }
    else if (plan.fresh === 2) { howMany = ", with both new nouns of chapter " + C + " every time."; }
    else if (plan.fresh > 2) { howMany = ", with all " + numWord(plan.fresh) + " new nouns of chapter " + C + " every time."; }
    else { howMany = ", all from earlier chapters."; }
    var items = MODELS.map(function (m) { return byId(m.id) ? { noun: byId(m.id), name: m.name } : null; }).filter(function (m) {
      return m && m.noun.chapter <= C && baseInfo(m.noun).cut && baseInfo(m.noun).cut.n === "sg";
    }).map(function (m) {
      var c = baseInfo(m.noun).cut;
      return { ending: "-" + c.end, k: "gen", number: "singular", example: c.gen, meaning: m.name, hook: "Drop it to find the base." };
    });
    var nn = Math.floor(+n);
    return {
      id: "c" + C + "-nouns",
      n: nn >= 1 ? nn : 1,
      title: "Every noun",
      blurb: "All " + total + " nouns of " + span + ", " + numWord(size) + " at a time.",
      briefing: [
        { mood: "search", say: "This is a lineup of <b>every noun</b> so far: all " + total + " of them, " + (first === C ? "in chapter " + C : C === first + 1 ? "in chapters " + first + " and " + C : "from chapter " + first + " to chapter " + C) + "." +
          (before.length ? " The nouns of " + joinWords(before, "and") + " grade are here too." : "") },
        { mood: "point", say: "Most nouns build their forms the same way. Drop the ending of the genitive to find the base. Then add the ending the case needs.", show: "recap" },
        { mood: "wave", say: cap(numWord(size)) + " nouns at a time" + howMany + " If one gets tricky, its whole table is in your <b>Notebook</b>.", point: "notebook" }
      ],
      recap: { kind: "endings", items: items },
      questions: [],
      nounDrill: { chapter: C, count: COUNT }
    };
  }

  /* ------------------------------------------------------------ the Notebook */
  function chart(noun) {
    noun = nounOf(noun);
    if (!noun) { return null; }
    var b = baseInfo(noun), forms = {};
    ORDER.forEach(function (k) {
      forms[k] = NUMS.map(function (n) {
        var f = at(noun, k, n), bn = b.two ? null : b[n];
        if (f === null) { return null; }
        return starts(f, bn) ? bn + "|" + f.slice(bn.length) : f;
      });
    });
    var loc = NUMS.map(function (n, i) {
      var f = noun.loc && typeof noun.loc[i] === "string" ? noun.loc[i] : null;
      return f ? { n: n, form: f, label: "locative " + NUMBER[n] } : null;
    }).filter(function (x) { return x !== null; });
    /* note: the table's own note on an alt form, written for teachers (plain text; its Latin is not marked) */
    var alt = (noun.alt || []).map(function (a) {
      return { k: a.case, n: a.number, form: a.form, label: a.case === "loc" ? "locative " + NUMBER[a.number] : label(a.case, a.number), note: curly(a.note) };
    });
    return {
      id: noun.id,
      word: noun.headword,
      entry: curly(noun.entry),
      entryHtml: entryHtml(noun.entry),
      meaning: curly(noun.meaning),
      gender: noun.gender,
      declension: noun.declension,
      forms: forms,
      alt: alt,
      loc: loc,
      lines: chartLines(alt, loc)
    };
  }
  /* the dictionary entry with its Latin in <i> and the rest (gender, "pl.", "or") plain:
     "vesper, vesperis (or vesperī), m." gives "<i>vesper, vesperis</i> (or <i>vesperī</i>), m." */
  var NOT_LATIN = { "m.": 1, "f.": 1, "n.": 1, "pl.": 1, "or": 1, "sometimes": 1 };
  function entryHtml(entry) {
    /* split() gives the text between words at even places and the words at odd places; a run of Latin
       words keeps the ", " or " " between them inside its <i> */
    var parts = String(entry === null || entry === undefined ? "" : entry).split(/([A-Za-zÀ-ɏ]+\.?)/), out = "", run = "";
    for (var i = 1; i < parts.length; i += 2) {
      var before = parts[i - 1], w = parts[i], latin = !own(NOT_LATIN, w);
      if (latin && run && (before === ", " || before === " ")) { run += before + w; continue; }
      if (run) { out += la(run); run = ""; }
      out += before;
      if (latin) { run = w; } else { out += w; }
    }
    if (run) { out += la(run); }
    return curly(out + parts[parts.length - 1]);
  }
  /* what a player reads under the table: "Locative: <i>Rōmae</i>." and, one line a form,
     "Also found: <i>deīs</i>, dative and ablative plural." */
  function chartLines(alt, loc) {
    var out = loc.map(function (l) { return "Locative: " + la(l.form) + "."; }), byForm = [];
    alt.forEach(function (a) {
      var g = null;
      byForm.forEach(function (x) { if (x.form === a.form) { g = x; } });
      if (!g) { g = { form: a.form, cells: [], loc: [] }; byForm.push(g); }
      if (a.k === "loc") { g.loc.push(a.label); } else { g.cells.push({ k: a.k, n: a.n }); }
    });
    byForm.forEach(function (g) {
      var names = (g.cells.length ? [cellPhrase(g.cells, "and", "")] : []).concat(g.loc);
      out.push("Also found: " + la(g.form) + ", " + names.join(" and ") + ".");
    });
    return out;
  }
  function groups(chapterMax) {
    var C = chapterMax === undefined || chapterMax === null ? Infinity : +chapterMax, out = [], byCh = {};
    table().forEach(function (x) {
      if (!(x.chapter <= C)) { return; }
      if (!own(byCh, x.chapter)) { byCh[x.chapter] = { chapter: x.chapter, nouns: [] }; out.push(byCh[x.chapter]); }
      byCh[x.chapter].nouns.push({ id: x.id, word: x.headword, genitive: x.genitive, gender: x.gender, entry: curly(x.entry), entryHtml: entryHtml(x.entry), meaning: curly(x.meaning) });
    });
    return out.sort(function (a, b) { return b.chapter - a.chapter; });
  }

  root.CD_NOUN_DRILL = {
    version: 3,   /* 3: the prompt's gloss of auctor is “author” (2: the lead's seven decisions on the review) */
    nouns: nouns,
    cells: cells,
    question: question,
    draw: draw,
    file: file,
    chart: chart,
    label: label,
    groups: groups,
    base: base,
    special: Object.keys(SPECIAL)
  };
})(typeof window !== "undefined" ? window : this);
