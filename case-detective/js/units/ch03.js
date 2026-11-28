/*!
 * Case Detective: the case files of Wheelock's chapter 3 (6th grade, Latin IA), unit "3".
 *
 * This file is DATA ONLY. It sets window.CD_UNITS["3"] and has no other effect. The game loads it when a
 * player's casebook opens chapter 3 (see the list of units in js/courses.js).
 *
 * Strings named say / right / wrong / why / prompt / translation / hook / note (of a chart) / en (of the
 * word list) / title (of the unit and of a word-list group), and the texts in whyNot, may contain the inline
 * tags <b>, <i> and <u> only. Everything else is plain text: file titles and blurbs, the method, recap items,
 * option labels and subs, choices, a word's g and tag, a chart's title, a word-list note.
 *
 * Shape: the unit shape of the brief (section "Units"). Everything not listed there is as in CD_DATA (see
 * the header of js/data.js):
 *
 * CD_UNITS["3"] = {
 *   chapter: 3, grade: 6, title, bookTitle,      // bookTitle: Wheelock's own chapter title
 *   jobs:     { app: { key, name, abbr, question, job, tag, hook, of: null } },   // the appositive
 *   method:   [{ title, text }] x3,              // the detective method of these files
 *   charts:   [{ id: "d2", title, note, models: [amīcus, puer, ager], adjective: magnus }],
 *   wordList: { intro, groups: [{ title, items: [{ la, note?, en }] }] },
 *   files: [
 *     c3-endings  1  the new endings: from a form to its case and number (like CD_DATA's "endings")
 *     c3-looks    2  the look-alikes -ī, -ō and -īs, decided by the rest of the sentence, with a training
 *                    case (like CD_DATA's "ae")
 *     c3-calling  3  calling (the vocative: amīce, fīlī, puer) and renaming (the appositive, job "app")
 *     c3-final    4  every job, with nouns of both declensions
 *   ]
 * }
 *
 * Words: chapters 1 to 3 of the vocabulary file only (curriculum/wheelock-vocabulary-by-grade.json). Every
 * lemma is a headword of that file letter for letter, and every word-list entry is its full dictionary
 * entry. The ablative is asked only as "by, with, from", after in, dē and sine. Verbs: the present tense of
 * the verbs of chapters 1 to 3, and the greetings salvē, salvēte and valē.
 * A word's tag: "describes X" (a describing word and its noun X), "renames X" (an appositive and the noun X
 * it renames), "after in" / "after dē" / "after sine" (an ablative after its preposition).
 */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------- vocabulary */
  /* the meaning of each noun and describing word: shown when a word is tapped, so it never tells the case */
  var LEX = {
    "ager": "field, farm", "agricola": "farmer", "amīcus": "friend", "fēmina": "woman", "fīlia": "daughter",
    "fīlius": "son", "populus": "people, nation", "puer": "boy", "sapientia": "wisdom", "vir": "man",
    "īra": "anger", "nauta": "sailor", "patria": "country, fatherland", "pecūnia": "money", "poēta": "poet",
    "rosa": "rose", "vīta": "life",
    "avārus": "greedy", "magnus": "great, big", "meus": "my", "multus": "much, many", "paucī": "few, a few",
    "Rōmānus": "Roman"
  };

  function ext(o, extra) { if (extra) { for (var k in extra) { o[k] = extra[k]; } } return o; }
  /** noun or describing word */
  function n(form, role, lemma, extra) { return ext({ w: form, r: role, lemma: lemma, g: LEX[lemma] }, extra); }
  /** verb, with the meaning of this exact form */
  function v(form, lemma, gloss, extra) { return ext({ w: form, r: "verb", lemma: lemma, g: gloss }, extra); }
  /** a word without a case of its own to find (an adverb, "not") */
  function x(form, lemma, gloss) { return { w: form, r: null, lemma: lemma, g: gloss }; }
  /** mark the highlighted target word */
  function T(word) { word.t = true; return word; }
  /** punctuation printed right after the word */
  function P(word, punct) { word.after = punct; return word; }
  /* the prepositions of chapters 2 and 3: the noun after them is in the ablative */
  function IN(capital) { return { w: capital ? "In" : "in", r: null, lemma: "in", g: "in, on" }; }
  function DE(capital) { return { w: capital ? "Dē" : "dē", r: null, lemma: "dē", g: "about; down from" }; }
  function SINE(capital) { return { w: capital ? "Sine" : "sine", r: null, lemma: "sine", g: "without" }; }
  /** "what?", the thing that gets the action in a question */
  function QUID() { return { w: "Quid", r: "acc", lemma: "quid", g: "what" }; }

  /* ---------------------------------------------------------------- options */
  var CASE_NAME = { nom: "Nominative", gen: "Genitive", dat: "Dative", acc: "Accusative", abl: "Ablative", voc: "Vocative" };
  /* the jobs under the names the class uses; the case is the second line (the appositive has its noun's case) */
  var JOB_NAME = { nom: "Subject", gen: "Possession", dat: "Indirect object", acc: "Direct object", abl: "By, with, from", voc: "Direct address", app: "Appositive" };
  function jobs(keys) { return keys.map(function (k) { return { k: k, label: JOB_NAME[k], sub: k === "app" ? "Same case as its noun" : CASE_NAME[k] }; }); }
  function forms(list) { return list.map(function (f) { return { k: f, label: f, latin: true }; }); }
  /* the look-alikes: the readings an ending can have, and the case it is mistaken for */
  function lookI() {
    return [
      { k: "gen", label: "Genitive singular", sub: "Whose is it?" },
      { k: "nom", label: "Nominative plural", sub: "Who does it? (more than one)" },
      { k: "voc", label: "Vocative plural", sub: "Who is being talked to?" },
      { k: "acc", label: "Accusative plural", sub: "What gets the action?" }
    ];
  }
  function lookO() {
    return [
      { k: "dat", label: "Dative singular", sub: "Who receives it?" },
      { k: "abl", label: "Ablative singular", sub: "By, with or from what?" },
      { k: "acc", label: "Accusative singular", sub: "What gets the action?" },
      { k: "gen", label: "Genitive singular", sub: "Whose is it?" }
    ];
  }
  function lookIS() {
    return [
      { k: "dat", label: "Dative plural", sub: "Who receives it? (more than one)" },
      { k: "abl", label: "Ablative plural", sub: "By, with or from what?" },
      { k: "acc", label: "Accusative plural", sub: "What gets the action?" },
      { k: "gen", label: "Genitive plural", sub: "Whose is it?" }
    ];
  }
  function lookPrompt(ending) { return "What is the highlighted <b>" + ending + "</b> word doing?"; }
  var JOB_PROMPT = "What job does the highlighted word do?";

  /* ------------------------------------------------------------------ files */
  var FILES = [
    /* ============================ FILE 1 ============================ */
    {
      id: "c3-endings", n: 1, title: "New Fingerprints",
      blurb: "Pick the right form: amīcōrum or amīcōs?",
      briefing: [
        { mood: "wave", show: "chart", chart: "d2",
          say: "New chapter, new suspects! This is <i>amīcus</i>, “friend”, the model noun of the <b>second declension</b>. Its nouns in this chapter are masculine, and most end in <b>-us</b> or <b>-er</b>." },
        { mood: "point", point: "notebook",
          say: "Same six cases, same six jobs, new endings. This chart is in your <b>Notebook</b> now, with <i>puer</i>, <i>ager</i> and the describing word <i>magnus</i>. See the book button light up?" },
        { mood: "point", show: "recap",
          say: "Two plural endings love to swap disguises. <b>-ōrum</b> means “of the …s”: <i>amīcōrum</i>, of the friends. Long ending, lots of owners, just like -ārum." },
        { mood: "point",
          say: "<b>-ōs</b> is the direct object, plural. One friend <i>amīcum</i>, many friends <i>amīcōs</i>: <b>-um</b> turns into <b>-ōs</b>, as <i>puellam</i> turns into <i>puellās</i>." },
        { mood: "think",
          say: "Watch the nouns in -er. <i>Puer</i> keeps its e: <i>puerī</i>, <i>puerō</i>. <i>Ager</i> drops it: <i>agrī</i>, <i>agrō</i>. The genitive in the word list tells you which. Let’s test some fingerprints!" }
      ],
      recap: {
        kind: "endings",
        items: [
          { ending: "-ōrum", k: "gen", number: "plural", example: "amīcōrum", meaning: "of the friends", hook: "Long ending, lots of owners, like -ārum." },
          { ending: "-ōs", k: "acc", number: "plural", example: "amīcōs", meaning: "the friends (direct object)", hook: "From -um to -ōs: amīcum, amīcōs." }
        ]
      },
      questions: [
        { id: "c3-end-1", type: "choice", shuffle: true, gap: true,
          prompt: "“The farmer loves <u>the fields</u>.” Which form is “the fields”?",
          words: [n("Agricola", "nom", "agricola"), T(n("agrōs", "acc", "ager")), P(v("amat", "amō", "loves"), ".")],
          translation: "The farmer loves <b>the fields</b>.",
          options: forms(["agrōs", "agrī", "agrōrum", "agrum"]), answer: "agrōs",
          whyNot: {
            "agrī": "<i>Agrī</i> as “the fields” is the <b>subject</b> form: fields that do something. Here the farmer does the loving, and the fields get the love.",
            "agrōrum": "<i>Agrōrum</i> means “<b>of</b> the fields”. Nobody owns anything in this sentence. The fields are what the farmer loves.",
            agrum: "<i>Agrum</i> is the right case but the wrong number: it is <b>one</b> field. For many fields, <b>-um</b> turns into <b>-ōs</b>."
          },
          clues: [
            { say: "Who does the loving? The farmer, <i>agricola</i>. The fields <b>get</b> the love, so they cannot be the subject form, <i>agrī</i>.", eliminates: "agrī" },
            { say: "<i>Agrōrum</i> means “of the fields”, and nobody owns anything here. One field would be <i>agrum</i>. For many, <b>-um</b> turns into <b>-ōs</b>.", eliminates: "agrōrum" }
          ],
          why: "The fields get the loving, so they are the direct object: accusative plural <b>agrōs</b>. <i>Ager</i> drops its e: <i>agrum</i>, <i>agrōs</i>." },
        { id: "c3-end-2", type: "choice", shuffle: true, gap: true,
          prompt: "How do you say “the money <b>of the boys</b>”?",
          words: [n("pecūnia", null, "pecūnia"), T(n("puerōrum", "gen", "puer"))],
          translation: "the money <b>of the boys</b>",
          options: forms(["puerōrum", "puerōs", "puerīs", "puerī"]), answer: "puerōrum",
          whyNot: {
            "puerōs": "<i>Puerōs</i> is accusative plural: boys who <b>get the action</b> of a verb. There is no action here. The money belongs to the boys.",
            "puerīs": "<i>Puerīs</i> means “<b>to</b> the boys”. Nothing is given here. You need “<b>of</b> the boys”.",
            "puerī": "<i>Puerī</i> can mean “of the boy”, just <b>one</b> boy, or “the boys” as subject. For “of the boys” the ending grows to <b>-ōrum</b>."
          },
          clues: [
            { say: "<i>Puerīs</i> means “to the boys”, and nothing is given here. You need “<b>of</b>”: whose money is it?", eliminates: "puerīs" },
            { say: "<b>-ōs</b> is the direct object’s ending, and nothing gets an action here. Look for the longest ending in the chart.", eliminates: "puerōs" }
          ],
          why: "<b>puerōrum</b> is genitive plural. “Of” means whose, and whose means genitive. “Boys” is plural, so the ending is <b>-ōrum</b>, the twin of <b>-ārum</b>." },
        { id: "c3-end-3", type: "choice", shuffle: true, gap: true,
          prompt: "“<u>The boys</u> praise the farmer.” Which form is “the boys”?",
          words: [T(n("Puerī", "nom", "puer")), n("agricolam", "acc", "agricola"), P(v("laudant", "laudō", "(they) praise"), ".")],
          translation: "<b>The boys</b> praise the farmer.",
          options: forms(["puerī", "puerōs", "puerōrum", "puer"]), answer: "puerī",
          whyNot: {
            "puerōs": "<i>Puerōs</i> is for boys who <b>get</b> the action. These boys <b>do</b> the praising, and the farmer, <i>agricolam</i>, is the one who gets praised.",
            "puerōrum": "<i>Puerōrum</i> means “<b>of</b> the boys”. Then nobody would be left to do the praising, and <i>laudant</i> needs its doers.",
            puer: "<i>Puer</i> is the subject form, but only <b>one</b> boy. <i>Laudant</i> ends in -nt: more than one is praising."
          },
          clues: [
            { say: "Look at the verb: lauda<b>nt</b>. More than one is praising, so one boy, <i>puer</i>, is not enough.", eliminates: "puer" },
            { say: "<b>-ōs</b> is for boys who <b>get</b> the action. These boys are <b>doing</b> it, so they need the nominative plural.", eliminates: "puerōs" }
          ],
          why: "Here the boys DO the praising, so they are the subject: nominative plural <b>puerī</b>. The farmer, <i>agricolam</i>, gets the praise." },
        { id: "c3-end-4", type: "choice", shuffle: true, gap: true,
          prompt: "“The poet gives a rose <u>to the friend</u>.” Which form?",
          words: [n("Poēta", "nom", "poēta"), T(n("amīcō", "dat", "amīcus")), n("rosam", "acc", "rosa"), P(v("dat", "dō", "gives"), ".")],
          translation: "The poet gives a rose <b>to the friend</b>.",
          options: forms(["amīcō", "amīcum", "amīcī", "amīcīs"]), answer: "amīcō",
          whyNot: {
            "amīcum": "<i>Amīcum</i> would make the friend the thing that <b>gets given</b>! What gets given here is the rose, <i>rosam</i>. The friend receives it.",
            "amīcī": "<i>Amīcī</i> means “of the friend”, or “the friends” as subject. A giving verb needs a receiver, and the friend is the one who gets the rose.",
            "amīcīs": "<i>Amīcīs</i> can be dative, but then it means “to the friends”: <b>more than one</b>. For one friend the ending is <b>-ō</b>."
          },
          clues: [
            { say: "The rose gets given: <i>rosam</i>. <b>-um</b> would make the friend the thing being given!", eliminates: "amīcum" },
            { say: "The friend <b>receives</b> the rose, so you need the dative. Just one friend, so not <b>-īs</b>.", eliminates: "amīcīs" }
          ],
          why: "The friend receives the rose, so it is dative singular: <b>amīcō</b>. (<i>Amīcō</i> is also the ablative singular: one form, two cases.)" },
        { id: "c3-end-5", type: "choice", shuffle: true, gap: true,
          prompt: "“The farmer has a big <u>field</u>.” Which form is “field”?",
          words: [n("Agricola", "nom", "agricola"), n("magnum", "acc", "magnus", { tag: "describes agrum" }), T(n("agrum", "acc", "ager")), P(v("habet", "habeō", "has"), ".")],
          translation: "The farmer has a big <b>field</b>.",
          options: forms(["agrum", "agrōs", "agrī", "ager"]), answer: "agrum",
          whyNot: {
            "agrōs": "<i>Agrōs</i> is the right case but <b>more than one</b> field. The farmer has one big field, and <i>magnum</i> needs a partner in <b>-um</b>.",
            "agrī": "<i>Agrī</i> is “of the field”, or “the fields” as subject. The field is what the farmer <b>has</b>: it gets the action.",
            ager: "<i>Ager</i> is the subject form, the dictionary word. The subject here is the farmer, <i>agricola</i>. The field is what he has."
          },
          clues: [
            { say: "<i>Ager</i> is the dictionary form, the subject form. The one who has the field is the farmer, <i>agricola</i>.", eliminates: "ager" },
            { say: "“Field” is singular: just one. And its describing word, <i>magnum</i>, ends in <b>-um</b>.", eliminates: "agrōs" }
          ],
          why: "The field is what the farmer has: direct object, singular, so accusative <b>agrum</b>. <i>Ager</i> drops its e, and <i>magnum</i> wears the same ending." },
        { id: "c3-end-6", type: "choice", shuffle: true, gap: true,
          prompt: "“The poet praises the <u>great</u> farmers.” Which form is “great”?",
          words: [n("Poēta", "nom", "poēta"), T(n("magnōs", "acc", "magnus", { tag: "describes agricolās" })), n("agricolās", "acc", "agricola"), P(v("laudat", "laudō", "praises"), ".")],
          translation: "The poet praises the <b>great</b> farmers.",
          options: forms(["magnōs", "magnās", "magnī", "magnōrum"]), answer: "magnōs",
          whyNot: {
            "magnās": "<i>Magnās</i> is feminine. A farmer is a man, so the describing word takes the masculine <b>-ōs</b>.",
            "magnī": "<i>Magnī</i> would go with farmers who <b>do</b> something. These farmers get the praise.",
            "magnōrum": "<i>Magnōrum</i> means “of the great …s”. Nobody owns anything here. The farmers get the praise."
          },
          clues: [
            { say: "The farmers <b>get</b> the praise, so the describing word must be accusative too. <b>-ī</b> is not an accusative ending.", eliminates: "magnī" },
            { say: "<i>Agricola</i> goes like <i>porta</i>, but a farmer is a man: <b>masculine</b>. A masculine describing word does not end in <b>-ās</b>.", eliminates: "magnās" }
          ],
          why: "A describing word takes the gender, case and number of its noun, but not always the same ending. <i>Agricolās</i> is masculine, accusative and plural, so it takes <b>magnōs</b>: <i>magnōs agricolās</i>." },
        { id: "c3-end-7", type: "choice", shuffle: true,
          prompt: "Which one is <b>genitive plural</b>?",
          options: forms(["virōrum", "virōs", "virī", "virīs"]), answer: "virōrum",
          whyNot: {
            "virōs": "<i>Virōs</i> is accusative plural: men who <b>get the action</b>. “Of the men” needs the long ending.",
            "virī": "<i>Virī</i> can be genitive, but then it is singular: “of the man”, just <b>one</b>. “Of the men” has the long ending.",
            "virīs": "<i>Virīs</i> means “<b>to</b> the men”, or “by, with, from the men”. The genitive plural says “<b>of</b> the men”."
          },
          clues: [
            { say: "<b>-ōs</b> is taken: that is the accusative plural, the direct object.", eliminates: "virōs" },
            { say: "<b>-īs</b> means “to the men” or “by, with, from the men”. Look for the longest ending in the chart.", eliminates: "virīs" }
          ],
          why: "<b>-ōrum</b> is genitive plural: <b>virōrum</b>, “of the men”. Long ending, lots of owners, like <i>puellārum</i>." },
        { id: "c3-end-8", type: "choice", shuffle: true,
          prompt: "Which one is <b>accusative plural</b>?",
          options: forms(["fīliōs", "fīliōrum", "fīliī", "fīlium"]), answer: "fīliōs",
          whyNot: {
            "fīliōrum": "<i>Fīliōrum</i> is genitive plural: “<b>of</b> the sons”. The long ending <b>-ōrum</b> is never accusative.",
            "fīliī": "<i>Fīliī</i> can be “of the son” or “the sons” as subject. An ending in <b>-ī</b> is never accusative.",
            "fīlium": "<i>Fīlium</i> is accusative, but singular: <b>one</b> son. For the plural, <b>-um</b> turns into <b>-ōs</b>."
          },
          clues: [
            { say: "<b>-ōrum</b> is taken: that is the genitive plural, “of the …s”.", eliminates: "fīliōrum" },
            { say: "Accusative singular is <b>-um</b>, and <i>fīlium</i> is just one son. For the plural, <b>-um</b> turns into <b>-ōs</b>.", eliminates: "fīlium" }
          ],
          why: "<b>-ōs</b> is the accusative plural ending: <i>fīliōs</i>, “sons” as a direct object." },
        { id: "c3-end-9", type: "choice", shuffle: true,
          prompt: "Which case and number is <i>amīcōs</i>?",
          options: [
            { k: "acc", label: "Accusative plural", sub: "the friends (direct object)" },
            { k: "gen", label: "Genitive plural", sub: "of the friends" },
            { k: "nom", label: "Nominative plural", sub: "the friends (subject)" },
            { k: "dat", label: "Dative plural", sub: "to the friends" }
          ], answer: "acc",
          whyNot: {
            gen: "The genitive plural is <i>amīcōrum</i>, with the long ending. <i>Amīcōs</i> ends in <b>-ōs</b>.",
            nom: "The nominative plural is <i>amīcī</i>: friends who do something. <b>-ōs</b> is for friends who get the action.",
            dat: "The dative plural is <i>amīcīs</i>, “to the friends”. <b>-ōs</b> is for friends who get the action."
          },
          clues: [
            { say: "The long ending <b>-ōrum</b> is the genitive plural, “of the friends”. This ending is short.", eliminates: "gen" },
            { say: "Friends who do something are <i>amīcī</i>, with <b>-ī</b>. One friend getting the action is <i>amīcum</i>. For many, <b>-um</b> turns into <b>-ōs</b>.", eliminates: "nom" }
          ],
          why: "<b>-ōs</b> is accusative plural: <i>amīcōs</i>, the friends as direct object. It is the twin of <b>-ās</b> in <i>porta</i>’s chart." },
        { id: "c3-end-10", type: "choice", shuffle: true,
          prompt: "Which case and number is <i>puerum</i>?",
          options: [
            { k: "acc", label: "Accusative singular", sub: "the boy (direct object)" },
            { k: "gen", label: "Genitive plural", sub: "of the boys" },
            { k: "nom", label: "Nominative singular", sub: "the boy (subject)" },
            { k: "dat", label: "Dative singular", sub: "to the boy" }
          ], answer: "acc",
          whyNot: {
            gen: "The genitive plural is <i>puerōrum</i>, with the long <b>-ōrum</b>. <i>Puerum</i> has just <b>-um</b>.",
            nom: "The nominative singular is <i>puer</i> itself, the dictionary form. <b>-um</b> is for the boy who gets the action.",
            dat: "The dative singular is <i>puerō</i>, “to the boy”. <b>-um</b> is for the boy who gets the action."
          },
          clues: [
            { say: "Count the letters of the ending: <b>-um</b> is short. The genitive plural has the long one, <b>-ōrum</b>.", eliminates: "gen" },
            { say: "“To the boy” would end in <b>-ō</b>. Think of <i>puellam</i>: the m marks the one who gets the action.", eliminates: "dat" }
          ],
          why: "<b>-um</b> is accusative singular: <i>puerum</i>, the boy as direct object. <b>-am</b> does the same job in <i>puellam</i>." }
      ]
    },

    /* ============================ FILE 2 ============================ */
    {
      id: "c3-looks", n: 2, title: "Look-Alike Endings",
      blurb: "-ī, -ō and -īs wear more than one disguise. Let the sentence decide.",
      briefing: [
        { mood: "think", say: "This chapter has its own masters of disguise, detective. Three endings, and each one can hide <b>more than one</b> suspect." },
        { mood: "point", show: "recap",
          say: "<b>-ī</b> is genitive singular (of the friend) or nominative plural (the friends). The vocative plural, “O friends!”, wears it too." },
        { mood: "point", say: "<b>-ō</b> is dative or ablative singular. <b>-īs</b> is dative or ablative plural, just as in <i>porta</i>’s chart." },
        { mood: "search", say: "The ending alone cannot tell you. The <b>rest of the sentence</b> gives it away: the verb, a giving verb, or a little word like <i>in</i>, <i>dē</i> or <i>sine</i>. Watch my method on a training case." }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "gen", text: "-ī, one owner: whose is it?" },
          { k: "nom", text: "-ī, more than one: who does it?" },
          { k: "voc", text: "-ī when someone is called: who is being talked to?" },
          { k: "dat", text: "-ō or -īs with a giving verb: who receives it?" },
          { k: "abl", text: "-ō or -īs after in, dē or sine: by, with or from what?" }
        ]
      },
      training: {
        id: "c3-looks-training",
        title: "Training case: the two-faced -ī",
        words: [
          n("Agricola", "nom", "agricola"),
          n("agrum", "acc", "ager"),
          T(n("amīcī", "gen", "amīcus")),
          P(v("videt", "videō", "sees"), ".")
        ],
        translation: "The farmer sees the field <b>of the friend</b>.",
        suspects: lookI().slice(0, 3),
        steps: [
          { id: "meet", kind: "say", mood: "point",
            say: "Our mystery word is <b>amīcī</b>. That -ī ending has three suspects: <b>genitive singular</b> (of the friend), <b>nominative plural</b> (the friends) or <b>vocative plural</b> (O friends!). Let’s find out which." },
          { id: "verb", kind: "tap", mood: "search", target: 3, reveal: [3],
            say: "Rule one: <b>find the verb first.</b> Tap the verb in the sentence.",
            right: "<b>videt</b>, “sees”. Good eye!",
            wrong: "That one is a noun. The verb is the action word, and in Latin it usually comes last." },
          { id: "number", kind: "pick", mood: "think", eliminates: "nom",
            say: "<i>Videt</i> ends in <b>-t</b>, not <b>-nt</b>. So how many people are seeing?",
            choices: [{ label: "Just one", correct: true }, { label: "More than one" }],
            right: "Just one. So the doer is singular, and “the friends” cannot be doing it. One suspect ruled out!",
            wrong: "<b>-nt</b> would mean many, like <i>vident</i>. Plain <b>-t</b> means just one." },
          { id: "doer", kind: "tap", mood: "point", target: 0, reveal: [0],
            say: "So who does the seeing? Tap the one who sees.",
            right: "<b>Agricola</b>, the farmer. He is the doer: nominative.",
            wrong: "Look for the plain <b>-a</b> ending. That is the nominative singular." },
          { id: "object", kind: "tap", mood: "search", target: 1, reveal: [1],
            say: "What gets seen? Tap it.",
            right: "<b>agrum</b>, a field. The -um ending marks what gets the action: accusative.",
            wrong: "Look for the <b>-um</b> ending. That is what gets the action." },
          { id: "calling", kind: "pick", mood: "think", eliminates: "voc",
            say: "Is anyone being <b>called</b>? Look for <i>Ō</i> or a comma.",
            choices: [{ label: "No, nobody", correct: true }, { label: "Yes, someone" }],
            right: "Right: no <i>Ō</i> and no comma. Nobody is being called, so another suspect is ruled out!",
            wrong: "Look again: there is no <i>Ō</i> and no comma. The sentence tells what the farmer does. Nobody is being called." },
          { id: "verdict", kind: "answer", mood: "proud", answer: "gen", reveal: [2],
            say: "Only one suspect is left. What is <b>amīcī</b> doing?",
            right: "Case closed! <b>amīcī</b> is genitive: the farmer sees the field <b>of the friend</b>.",
            wrong: "That suspect has been ruled out. Pick the one still standing." }
        ],
        outro: { mood: "proud", say: "That is my method: find the verb, find the doer and the object, check for <i>Ō</i> or a comma, and an -ī word left over tells you <b>whose</b>. For -ō and -īs, look for a giving verb, or for <i>in</i>, <i>dē</i> or <i>sine</i>. Now you try!" }
      },
      questions: [
        { id: "c3-look-1", type: "sentence", shuffle: false, prompt: lookPrompt("-ī"),
          words: [T(n("Amīcī", "nom", "amīcus")), n("puerum", "acc", "puer"), P(v("vocant", "vocō", "(they) call"), ".")],
          translation: "<b>The friends</b> call the boy.",
          options: lookI(), answer: "nom",
          whyNot: {
            gen: "If <i>Amīcī</i> meant “of the friend”, nobody would be left to do the calling. <i>Vocant</i> ends in -nt: it needs <b>more than one</b> doer.",
            voc: "Nobody is calling the friends: there is no <i>Ō</i> and no comma. The friends are the ones who call.",
            acc: "The one who gets called is the boy, <i>puerum</i>, with its <b>-um</b>. Friends who get the action would be <i>amīcōs</i>."
          },
          clues: [
            { say: "The verb is voca<b>nt</b>: more than one calls. If <i>Amīcī</i> meant “of the friend”, who would call?", eliminates: "gen" },
            { say: "No <i>Ō</i> and no comma: nobody is talked to. The friends do something.", eliminates: "voc" }
          ],
          why: "<i>Vocant</i> is plural, so look for a plural subject: <b>Amīcī</b>, the friends, at the front. Nominative plural. The boy, <i>puerum</i>, gets called." },
        { id: "c3-look-2", type: "sentence", shuffle: false, prompt: lookPrompt("-ō"),
          words: [n("Fēmina", "nom", "fēmina"), T(n("puerō", "dat", "puer")), n("rosam", "acc", "rosa"), P(v("dat", "dō", "gives"), ".")],
          translation: "The woman gives a rose <b>to the boy</b>.",
          options: lookO(), answer: "dat",
          whyNot: {
            abl: "<b>-ō</b> can be ablative too: same ending. But there is no <i>in</i>, <i>dē</i> or <i>sine</i> here, and a giving verb needs a receiver. The boy gets the rose.",
            acc: "What gets given is the rose, <i>rosam</i>. A boy who gets the action would be <i>puerum</i>, with <b>-um</b>.",
            gen: "“Of the boy” would be <i>puerī</i>, with <b>-ī</b>. And then the rose would have no receiver."
          },
          clues: [
            { say: "<b>Dat</b> is a giving verb, and giving needs a receiver. There is no <i>in</i>, <i>dē</i> or <i>sine</i> in front of <i>puerō</i>.", eliminates: "abl" },
            { say: "The rose, <i>rosam</i>, gets given. A boy who gets the action ends in <b>-um</b>.", eliminates: "acc" }
          ],
          why: "<i>Dat</i> means “gives”, and giving needs a receiver. The woman gives, the rose is given, and <b>puerō</b> receives it: dative." },
        { id: "c3-look-3", type: "sentence", shuffle: false, prompt: lookPrompt("-īs"),
          words: [n("Poēta", "nom", "poēta"), T(n("virīs", "dat", "vir")), n("Rōmānīs", "dat", "Rōmānus", { tag: "describes virīs" }), n("rosās", "acc", "rosa"), P(v("dat", "dō", "gives"), ".")],
          translation: "The poet gives roses <b>to the Roman men</b>.",
          options: lookIS(), answer: "dat",
          whyNot: {
            abl: "<b>-īs</b> is the ablative plural too: same ending. But no <i>in</i>, <i>dē</i> or <i>sine</i> comes before it, and <i>dat</i> needs a receiver: the men get the roses.",
            acc: "What gets given is the roses, <i>rosās</i>. Men who get the action would be <i>virōs</i>, with <b>-ōs</b>.",
            gen: "“Of the men” would be <i>virōrum</i>, with the long ending <b>-ōrum</b>. <b>-īs</b> is never genitive."
          },
          clues: [
            { say: "No <i>in</i>, <i>dē</i> or <i>sine</i> here, and <b>dat</b> is a giving verb. Giving needs a receiver.", eliminates: "abl" },
            { say: "“Of the men” has the longest ending in the chart, <b>-ōrum</b>. This one is short.", eliminates: "gen" }
          ],
          why: "The poet gives, the roses are given, and <b>virīs</b> receives them: dative plural. <i>Rōmānīs</i> describes the men with the same ending." },
        { id: "c3-look-4", type: "sentence", shuffle: false, prompt: lookPrompt("-ī"),
          words: [n("Īra", "nom", "īra"), T(n("virī", "gen", "vir")), n("puerōs", "acc", "puer"), P(v("terret", "terreō", "frightens"), ".")],
          translation: "The anger <b>of the man</b> frightens the boys.",
          options: lookI(), answer: "gen",
          whyNot: {
            nom: "“The men” as subject would need a verb in <b>-nt</b>. <i>Terret</i> has one doer, and that is <i>Īra</i>, the anger.",
            voc: "Nobody is calling the men: there is no <i>Ō</i> and no comma. <i>Virī</i> tells whose anger it is.",
            acc: "The ones who get frightened are the boys, <i>puerōs</i>, with <b>-ōs</b>. Men who get the action would be <i>virōs</i>."
          },
          clues: [
            { say: "The verb is <b>terret</b>: it ends in -t, so only <b>one</b> thing frightens. That is <i>Īra</i>, at the front.", eliminates: "nom" },
            { say: "The boys, <i>puerōs</i>, are the direct object. <b>-ī</b> is never accusative.", eliminates: "acc" }
          ],
          why: "<i>Terret</i> is singular, so there is one doer: <i>Īra</i>. The boys get frightened. So <b>virī</b> tells WHOSE anger: genitive, “of the man”." },
        { id: "c3-look-5", type: "sentence", shuffle: false, prompt: lookPrompt("-ō"),
          words: [n("Vir", "nom", "vir"), IN(), T(n("agrō", "abl", "ager", { tag: "after in" })), n("rosās", "acc", "rosa"), P(v("videt", "videō", "sees"), ".")],
          translation: "The man sees roses in <b>the field</b>.",
          options: lookO(), answer: "abl",
          whyNot: {
            dat: "<b>-ō</b> can be dative too: same ending. But seeing is not giving, so nobody receives, and <i>in</i> comes right before <i>agrō</i>.",
            acc: "What the man sees is the roses, <i>rosās</i>. A field that gets the action would be <i>agrum</i>, with <b>-um</b>.",
            gen: "“Of the field” would be <i>agrī</i>, with <b>-ī</b>. And <i>agrō</i> follows <i>in</i>."
          },
          clues: [
            { say: "The verb is <b>videt</b>, “sees”. Seeing is not giving, so nobody receives anything.", eliminates: "dat" },
            { say: "The roses, <i>rosās</i>, get seen. Now look at the little word before <i>agrō</i>: <b>in</b>.", eliminates: "acc" }
          ],
          why: "<i>In</i>, “in” or “on”, takes the ablative: <b>agrō</b>. Where does the man see the roses? In the field." },
        { id: "c3-look-6", type: "sentence", shuffle: false, prompt: lookPrompt("-īs"),
          words: [n("Vir", "nom", "vir"), n("avārus", "nom", "avārus", { tag: "describes vir" }), SINE(), T(n("amīcīs", "abl", "amīcus", { tag: "after sine" })), P(v("errat", "errō", "wanders"), ".")],
          translation: "The greedy man wanders without <b>friends</b>.",
          options: lookIS(), answer: "abl",
          whyNot: {
            dat: "<b>-īs</b> can be dative too. But wandering is not giving, so nobody receives, and <i>sine</i> comes right before <i>amīcīs</i>.",
            acc: "Wandering does not land on anything, so there is no direct object. And friends who get the action would be <i>amīcōs</i>.",
            gen: "“Of the friends” would be <i>amīcōrum</i>, with the long ending. <i>Amīcīs</i> follows <i>sine</i>, “without”."
          },
          clues: [
            { say: "The verb is <b>errat</b>, “wanders”. Nothing is given, so nobody receives.", eliminates: "dat" },
            { say: "The genitive plural has the long ending, <b>-ōrum</b>. And look at the word before <i>amīcīs</i>: <b>sine</b>.", eliminates: "gen" }
          ],
          why: "<i>Sine</i>, “without”, always takes the ablative: <b>amīcīs</b>, ablative plural. Without whom does the greedy man wander? Without friends." },
        { id: "c3-look-7", type: "sentence", shuffle: false, prompt: lookPrompt("-ī"),
          words: [n("Vītam", "acc", "vīta"), T(n("puerī", "gen", "puer")), P(v("servāmus", "servō", "we save"), ".")],
          translation: "We save the life <b>of the boy</b>.",
          options: lookI(), answer: "gen",
          whyNot: {
            nom: "The doers are “we”: the ending <b>-mus</b> of <i>servāmus</i> says so. So no noun in this sentence is the subject.",
            voc: "Nobody is calling the boys: there is no <i>Ō</i> and no comma. <i>Puerī</i> tells whose life it is.",
            acc: "What we save is the life, <i>vītam</i>, with its -am. A boy who gets the action would be <i>puerum</i>."
          },
          clues: [
            { say: "The verb is <b>servāmus</b>, “we save”. The ending -mus means <b>we</b> do it, so no noun here is the doer.", eliminates: "nom" },
            { say: "We save the life, <i>vītam</i>. <b>-ī</b> is never accusative. The life <b>of</b> whom?", eliminates: "acc" }
          ],
          why: "<i>Servāmus</i> means “we save”, so “we” are the doers. <i>Vītam</i> gets the action. <b>Puerī</b> tells whose life: genitive, “of the boy”." },
        { id: "c3-look-8", type: "sentence", shuffle: false, prompt: lookPrompt("-ō"),
          words: [n("Poēta", "nom", "poēta"), DE(), T(n("populō", "abl", "populus", { tag: "after dē" })), n("Rōmānō", "abl", "Rōmānus", { tag: "describes populō" }), P(v("cōgitat", "cōgitō", "thinks"), ".")],
          translation: "The poet thinks about <b>the Roman people</b>.",
          options: lookO(), answer: "abl",
          whyNot: {
            dat: "<b>-ō</b> can be dative too. But thinking is not giving, so nobody receives, and <i>dē</i>, “about”, comes right before <i>populō</i>.",
            acc: "A people that gets the action would be <i>populum</i>, with <b>-um</b>. <i>Populō</i> follows <i>dē</i>.",
            gen: "“Of the people” would be <i>populī</i>, with <b>-ī</b>. <i>Populō</i> follows <i>dē</i>, “about”."
          },
          clues: [
            { say: "The verb is <b>cōgitat</b>, “thinks”. Thinking is not giving, so nobody receives.", eliminates: "dat" },
            { say: "“Of the people” would end in <b>-ī</b>. Look at the little word in front: <b>dē</b>, “about”.", eliminates: "gen" }
          ],
          why: "<i>Dē</i>, “about”, takes the ablative: <b>populō</b>, with <i>Rōmānō</i> describing it. What does the poet think about? The Roman people." },
        { id: "c3-look-9", type: "sentence", shuffle: false, prompt: lookPrompt("-īs"),
          words: [n("Agricola", "nom", "agricola"), T(n("nautīs", "dat", "nauta")), n("pecūniam", "acc", "pecūnia"), P(v("dat", "dō", "gives"), ".")],
          translation: "The farmer gives money <b>to the sailors</b>.",
          options: lookIS(), answer: "dat",
          whyNot: {
            abl: "<b>-īs</b> is the ablative plural too. But no <i>in</i>, <i>dē</i> or <i>sine</i> comes before it, and <i>dat</i> needs a receiver: the sailors get the money.",
            acc: "What gets given is the money, <i>pecūniam</i>. Sailors who get the action would be <i>nautās</i>.",
            gen: "“Of the sailors” would be <i>nautārum</i>, with the long ending. <b>-īs</b> is never genitive."
          },
          clues: [
            { say: "<b>Dat</b> is a giving verb, and giving needs a receiver. No <i>in</i>, <i>dē</i> or <i>sine</i> here.", eliminates: "abl" },
            { say: "The money, <i>pecūniam</i>, gets given. Sailors who get the action end in <b>-ās</b>.", eliminates: "acc" }
          ],
          why: "The farmer gives, the money is given, and <b>nautīs</b> receives it: dative plural. <b>-īs</b> is the same in both declensions: <i>nautīs</i>, <i>amīcīs</i>." },
        { id: "c3-look-10", type: "sentence", shuffle: false, prompt: lookPrompt("-ī"),
          words: [n("Paucī", "nom", "paucī", { tag: "describes virī" }), T(n("virī", "nom", "vir")), n("sapientiam", "acc", "sapientia"), P(v("habent", "habeō", "(they) have"), ".")],
          translation: "Few <b>men</b> have wisdom.",
          options: lookI(), answer: "nom",
          whyNot: {
            gen: "If <i>virī</i> meant “of the man”, nobody would be left to do the having. <i>Habent</i> ends in -nt: it needs <b>more than one</b> doer.",
            voc: "Nobody is calling the men: there is no <i>Ō</i> and no comma. The sentence tells what they have.",
            acc: "What the men have is wisdom, <i>sapientiam</i>, with its -am. Men who get the action would be <i>virōs</i>."
          },
          clues: [
            { say: "The verb is habe<b>nt</b>: more than one has. If <i>virī</i> meant “of the man”, who would that be?", eliminates: "gen" },
            { say: "No <i>Ō</i> and no comma, so nobody is being called.", eliminates: "voc" }
          ],
          why: "<i>Habent</i> is plural, so look for a plural subject: <b>virī</b>, the men, with <i>Paucī</i>, “few”, describing them. Wisdom, <i>sapientiam</i>, is what they have." }
      ]
    },

    /* ============================ FILE 3 ============================ */
    {
      id: "c3-calling", n: 3, title: "Calling and Renaming",
      blurb: "Call a friend the Latin way, and catch a noun that renames another.",
      briefing: [
        { mood: "wave", say: "Two new tricks today, detective: how to <b>call</b> someone, and how to <b>rename</b> someone." },
        { mood: "point",
          say: "<b>Who is being talked to?</b> That is <b>direct address</b>, in the <b>vocative</b>. In chapter 2 it looked just like the nominative. Now a noun in <b>-us</b> changes: <i>amīcus</i> becomes <i>amīce</i>.",
          lesson: { k: "voc", words: [P(v("Valē", "valeō", "goodbye! (be well)"), ","), P(T(n("amīce", "voc", "amīcus")), "!")], translation: "Goodbye, <b>friend</b>!" } },
        { mood: "think",
          say: "<i>Puer</i>, <i>ager</i> and <i>vir</i> have no -us to change, so they call just as they are: <i>Salvē, puer!</i> And a noun in <b>-ius</b> calls with one long <b>-ī</b>: <i>fīlius</i>, <i>fīlī</i>!",
          lesson: { k: "voc", words: [P(v("Salvē", "salveō", "hello! (a greeting)"), ","), P(T(n("puer", "voc", "puer")), "!")], translation: "Hello, <b>boy</b>!" } },
        { mood: "point",
          say: "Now renaming. In <i>Amīcum meum, poētam, laudō</i>, my friend and the poet are the <b>same man</b>. <i>Poētam</i> renames <i>amīcum</i>: it is an <b>appositive</b>.",
          lesson: { k: "app", words: [n("Amīcum", "acc", "amīcus"), P(n("meum", "acc", "meus", { tag: "describes amīcum" }), ","), P(T(n("poētam", "app", "poēta", { tag: "renames amīcum" })), ","), P(v("laudō", "laudō", "I praise"), ".")],
            translation: "I praise my friend, <b>the poet</b>." } },
        { mood: "think", show: "recap",
          say: "An appositive stands beside its noun, often between commas, and it wears the <b>same case</b>. Not always the same ending: <i>amīcum</i> and <i>poētam</i> are both accusative." },
        { mood: "search", say: "Call them right and catch the renamers. If you get stuck, tap <b>Ask the Inspector</b>." }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "voc", text: "Who is being talked to? -us calls with -e, -ius with -ī." },
          { k: "app", text: "Who is it, in other words? Same case as the noun it renames." }
        ]
      },
      questions: [
        { id: "c3-call-1", type: "choice", shuffle: true, gap: true,
          prompt: "“Hello, <u>friend</u>!” Which form is “friend”?",
          words: [P(v("Salvē", "salveō", "hello! (a greeting)"), ","), P(T(n("amīce", "voc", "amīcus")), "!")],
          translation: "Hello, <b>friend</b>!",
          options: forms(["amīce", "amīcus", "amīcī", "amīcum"]), answer: "amīce",
          whyNot: {
            "amīcus": "<i>Amīcus</i> is the subject form, the dictionary word. In chapter 2 the vocative looked just like it, but a noun in <b>-us</b> changes when you call it: <b>-e</b>.",
            "amīcī": "<i>Amīcī</i> would call <b>more than one</b> friend: “Hello, friends!” Here you greet just one.",
            "amīcum": "<i>Amīcum</i> is for a friend who <b>gets the action</b> of a verb. <i>Salvē</i> is only a greeting, so nothing gets an action."
          },
          clues: [
            { say: "<i>Salvē</i> just means “hello”. Nothing gets an action, so not the <b>-um</b> form.", eliminates: "amīcum" },
            { say: "You greet just <b>one</b> friend: <i>Salvē</i>, not <i>Salvēte</i>.", eliminates: "amīcī" }
          ],
          why: "You are talking straight to your friend: vocative. A noun in <b>-us</b> calls with <b>-e</b>: <b>amīce</b>!" },
        { id: "c3-call-2", type: "choice", shuffle: true, gap: true,
          prompt: "“Goodbye, <u>son</u>!” Which form is “son”?",
          words: [P(v("Valē", "valeō", "goodbye! (be well)"), ","), P(T(n("fīlī", "voc", "fīlius")), "!")],
          translation: "Goodbye, <b>son</b>!",
          options: forms(["fīlī", "fīlius", "fīliī", "fīlium"]), answer: "fīlī",
          whyNot: {
            "fīlius": "<i>Fīlius</i> is the subject form, the dictionary word. When you call a noun in <b>-ius</b>, it ends in one long <b>-ī</b>: <i>fīlī</i>.",
            "fīliī": "<i>Fīliī</i> ends in two i’s: it is “of the son” or “the sons”. Calling one son ends in just <b>one</b> long ī: <i>fīlī</i>.",
            "fīlium": "<i>Fīlium</i> is for a son who <b>gets the action</b> of a verb. <i>Valē</i> is only a goodbye, so nothing gets an action."
          },
          clues: [
            { say: "<i>Valē</i> just means “goodbye”. Nothing gets an action, so not the <b>-um</b> form.", eliminates: "fīlium" },
            { say: "Look at the end of each word. <i>Fīliī</i> ends in two i’s: “of the son” or “the sons”. Calling one son ends in just one.", eliminates: "fīliī" }
          ],
          why: "You are talking straight to your son: vocative. A noun in <b>-ius</b> does not call with -e. It ends in one long <b>-ī</b>: <b>fīlī</b>!" },
        { id: "c3-call-3", type: "choice", shuffle: true, gap: true,
          prompt: "“What do you see, <u>boy</u>?” Which form is “boy”?",
          words: [QUID(), P(v("vidēs", "videō", "you see"), ","), P(T(n("puer", "voc", "puer")), "?")],
          translation: "What do you see, <b>boy</b>?",
          options: forms(["puer", "puerī", "puerum", "puerō"]), answer: "puer",
          whyNot: {
            "puerī": "<i>Puerī</i> would call <b>more than one</b> boy: “boys”. <i>Vidēs</i> ends in -s: “you”, just one person.",
            "puerum": "<i>Puerum</i> is for a boy who <b>gets the action</b>. What gets seen here is <i>quid</i>, “what”. The boy is the one being asked.",
            "puerō": "<i>Puerō</i> means “to the boy”, or “by, with, from the boy”. Nobody gives the boy anything. He is the one being asked."
          },
          clues: [
            { say: "<i>Vidēs</i> ends in -s: “you”, just <b>one</b> person. So you are asking one boy.", eliminates: "puerī" },
            { say: "What gets seen? <i>Quid</i>, “what”. So the boy does not get the action.", eliminates: "puerum" }
          ],
          why: "You are asking the boy straight out: vocative. <i>Puer</i> has no -us to change, so it calls just as it is: <b>puer</b>!" },
        { id: "c3-call-4", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [P(n("Agricolam", "acc", "agricola"), ","), T(n("amīcum", "app", "amīcus", { tag: "renames agricolam" })), P(n("meum", "acc", "meus", { tag: "describes amīcum" }), ","), P(v("videō", "videō", "I see"), ".")],
          translation: "I see the farmer, <b>my friend</b>.",
          options: jobs(["app", "acc", "nom", "gen"]), answer: "app",
          whyNot: {
            acc: "The direct object is <i>agricolam</i>: I see the farmer. <i>Amīcum</i> gets no second action. It renames <i>agricolam</i>, in the same case.",
            nom: "The doer is “I”: the ending <b>-ō</b> of <i>videō</i> says so. And a subject would be <i>amīcus</i>, not <i>amīcum</i>.",
            gen: "“Of my friend” would be <i>amīcī meī</i>. <i>Amīcum</i> does not tell whose. It tells who the farmer is."
          },
          clues: [
            { say: "The verb is <b>videō</b>, “I see”. The ending -ō means <b>I</b> do it, so no noun here is the subject.", eliminates: "nom" },
            { say: "The farmer and my friend are the <b>same man</b>. <i>Amīcum</i> does not tell whose. It tells who he is, in other words.", eliminates: "gen" }
          ],
          why: "The farmer and my friend are the same man. <b>Amīcum</b>, between commas, renames <i>agricolam</i> in the same case, the accusative: an <b>appositive</b>." },
        { id: "c3-call-5", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [P(T(n("Agricolam", "acc", "agricola")), ","), n("amīcum", "app", "amīcus", { tag: "renames agricolam" }), P(n("meum", "acc", "meus", { tag: "describes amīcum" }), ","), P(v("videō", "videō", "I see"), ".")],
          translation: "I see <b>the farmer</b>, my friend.",
          options: jobs(["acc", "app", "nom", "dat"]), answer: "acc",
          whyNot: {
            app: "The appositive is <i>amīcum meum</i>, between the commas. <i>Agricolam</i> is the noun it renames: the farmer is the one I see.",
            nom: "The doer is “I”: the ending <b>-ō</b> of <i>videō</i> says so. A farmer who does something would be <i>agricola</i>.",
            dat: "“To the farmer” would be <i>agricolae</i>, and seeing is not giving, so nobody receives. <b>-am</b> gets the action."
          },
          clues: [
            { say: "The verb is <b>videō</b>, “I see”. The ending -ō means <b>I</b> do it, so no noun here is the doer.", eliminates: "nom" },
            { say: "Seeing is not giving, so nobody receives. What do I see? Look for <b>-am</b>.", eliminates: "dat" }
          ],
          why: "I see the farmer: <b>Agricolam</b>, with <b>-am</b>, is the direct object. <i>Amīcum meum</i>, between the commas, renames it in the same case." },
        { id: "c3-call-6", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [P(v("Salvēte", "salveō", "hello! (to more than one)"), ","), P(T(n("puerī", "voc", "puer")), "!")],
          translation: "Hello, <b>boys</b>!",
          options: jobs(["voc", "nom", "gen", "acc"]), answer: "voc",
          whyNot: {
            nom: "A subject <b>does</b> the action of a verb. The boys do nothing here: they are being greeted. (The vocative plural looks just like the nominative plural.)",
            gen: "Possession would make <i>puerī</i> “of the boy”: one boy who <b>owns</b> something. There is nothing here to own: just a greeting and the boys.",
            acc: "A direct object <b>gets the action</b> of a verb, and boys who did would be <i>puerōs</i>. <i>Salvēte</i> is only a greeting."
          },
          clues: [
            { say: "<i>Salvēte</i> just means “hello” to more than one. Nothing gets an action, and boys who did would be <i>puerōs</i>.", eliminates: "acc" },
            { say: "There is nothing here for the boys to own: just a hello and the boys.", eliminates: "gen" }
          ],
          why: "Someone greets the boys: <b>direct address</b>, the vocative. The vocative plural always looks like the nominative plural: <b>puerī</b>. The comma is the clue." },
        { id: "c3-call-7", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [P(n("Poētam", "acc", "poēta"), ","), T(n("virum", "app", "vir", { tag: "renames poētam" })), P(n("magnum", "acc", "magnus", { tag: "describes virum" }), ","), P(v("laudāmus", "laudō", "we praise"), ".")],
          translation: "We praise the poet, <b>a great man</b>.",
          options: jobs(["app", "acc", "nom", "dat"]), answer: "app",
          whyNot: {
            acc: "What we praise is the poet, <i>poētam</i>: that is the direct object. <i>Virum</i> is the same man named again, so it renames <i>poētam</i> in the same case.",
            nom: "The doers are “we”: the ending <b>-mus</b> of <i>laudāmus</i> says so. And a subject would be <i>vir</i>, not <i>virum</i>.",
            dat: "“To the man” would be <i>virō</i>, and praising is not giving, so nobody receives."
          },
          clues: [
            { say: "The verb is <b>laudāmus</b>, “we praise”. The ending -mus means <b>we</b> do it, so no noun here is the doer.", eliminates: "nom" },
            { say: "Praising is not giving, so nobody receives. The poet and the great man are the <b>same</b> person.", eliminates: "dat" }
          ],
          why: "The poet and the great man are the same person. <b>Virum magnum</b>, between commas, renames <i>poētam</i> in the same case, the accusative: an <b>appositive</b>." },
        { id: "c3-call-8", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [QUID(), P(v("habēs", "habeō", "you have"), ","), P(T(n("fīlī", "voc", "fīlius")), "?")],
          translation: "What do you have, <b>son</b>?",
          options: jobs(["voc", "gen", "nom", "acc"]), answer: "voc",
          whyNot: {
            gen: "“Of the son” would be <i>fīliī</i>, ending in two i’s. <i>Fīlī</i>, ending in one long ī, is how you call a son.",
            nom: "The subject is hidden in the verb: the <b>-s</b> of <i>habēs</i> means “you”. A son named as the subject would be <i>fīlius</i>. <i>Fīlī</i> is the one being asked.",
            acc: "What gets had is <i>quid</i>, “what”. A son who gets the action would be <i>fīlium</i>."
          },
          clues: [
            { say: "<i>Habēs</i> ends in -s, so its subject is “you”, already in the verb. And a subject would be <i>fīlius</i>, with -us.", eliminates: "nom" },
            { say: "“Of the son” ends in two i’s: <i>fīliī</i>. How many i’s does this word end in?", eliminates: "gen" }
          ],
          why: "Someone asks the son a question: <b>direct address</b>, the vocative. A noun in <b>-ius</b> calls with one long <b>-ī</b>: <b>fīlī</b>." },
        { id: "c3-call-9", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [P(n("Amīcus", "nom", "amīcus"), ","), T(n("vir", "app", "vir", { tag: "renames amīcus" })), P(n("magnus", "nom", "magnus", { tag: "describes vir" }), ","), P(v("cōgitat", "cōgitō", "thinks"), ".")],
          translation: "The friend, <b>a great man</b>, is thinking.",
          options: jobs(["app", "nom", "voc", "gen"]), answer: "app",
          whyNot: {
            nom: "The subject is <i>amīcus</i>, the friend: he does the thinking. <i>Vir magnus</i> is the same man named again, in the same case.",
            voc: "Nobody is being talked to: there is no <i>Ō</i>, and a call would say <i>vir magne</i>, not <i>vir magnus</i>. The commas here set off a renamer.",
            gen: "“Of the man” would be <i>virī</i>. <i>Vir</i> does not tell whose. It tells who the friend is."
          },
          clues: [
            { say: "Is anyone being called? A call would say <i>vir magne</i>, with <b>-e</b>. Here it is <i>magnus</i>.", eliminates: "voc" },
            { say: "“Of the man” would be <i>virī</i>. <i>Vir</i> tells <b>who</b> the friend is, in other words.", eliminates: "gen" }
          ],
          why: "The friend and the great man are the same person. <b>Vir magnus</b>, between commas, renames <i>amīcus</i> in the same case, the nominative: an <b>appositive</b>." },
        { id: "c3-call-10", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [P(n("Fēminam", "acc", "fēmina"), ","), T(n("fīliam", "app", "fīlia", { tag: "renames fēminam" })), P(n("agricolae", "gen", "agricola"), ","), x("hodiē", "hodiē", "today"), P(v("videō", "videō", "I see"), ".")],
          translation: "Today I see the woman, <b>the farmer’s daughter</b>.",
          options: jobs(["app", "acc", "gen", "nom"]), answer: "app",
          whyNot: {
            acc: "What I see is the woman, <i>fēminam</i>: the direct object. <i>Fīliam</i> is the same woman named again, in the same case.",
            gen: "The word that tells whose is <i>agricolae</i>, “of the farmer”. <i>Fīliam</i> tells who the woman is.",
            nom: "The doer is “I”: the ending <b>-ō</b> of <i>videō</i> says so. A daughter who does something would be <i>fīlia</i>."
          },
          clues: [
            { say: "The verb is <b>videō</b>, “I see”. The ending -ō means <b>I</b> do it, so no noun here is the subject.", eliminates: "nom" },
            { say: "<i>Agricolae</i> is the word that tells whose: the farmer’s. <i>Fīliam</i> ends in <b>-am</b>, like <i>fēminam</i>.", eliminates: "gen" }
          ],
          why: "The woman and the farmer’s daughter are the same person. <b>Fīliam</b>, between commas, renames <i>fēminam</i> in the same case, the accusative: an <b>appositive</b>." }
      ]
    },

    /* ============================ FILE 4 ============================ */
    {
      id: "c3-final", n: 4, title: "Final Round: Every Job",
      blurb: "Both declensions, every job. Read the whole sentence first.",
      briefing: [
        { mood: "wave", say: "Last file of the chapter, detective. Nouns of <b>both</b> declensions, and any job can turn up." },
        { mood: "think",
          say: "A Latin sentence often starts with its subject and ends with its verb. But the <b>ending</b> is the boss, not the place. In <i>Puerum vir laudat</i>, the man does the praising.",
          lesson: { k: "acc", words: [T(n("Puerum", "acc", "puer")), n("vir", "nom", "vir"), P(v("laudat", "laudō", "praises"), ".")], translation: "The man praises <b>the boy</b>." } },
        { mood: "point", show: "recap", say: "Use the whole method. Find the verb first, then ask the detective questions about the highlighted word. Watch for renamers too." },
        { mood: "proud", say: "Solve this one and chapter 3 is closed. Let’s go!" }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "nom", text: "Subject: who does it?" },
          { k: "acc", text: "Direct object: what gets the action?" },
          { k: "dat", text: "Indirect object: who receives it?" },
          { k: "gen", text: "Possession: whose is it?" },
          { k: "abl", text: "By, with or from what? Also after in, dē and sine." },
          { k: "voc", text: "Direct address: who is being talked to?" },
          { k: "app", text: "Appositive: who is it, in other words?" }
        ]
      },
      questions: [
        { id: "c3-fin-1", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [T(n("Rosās", "acc", "rosa")), n("fēmina", "nom", "fēmina"), P(v("amat", "amō", "loves"), ".")],
          translation: "The woman loves <b>roses</b>.",
          options: jobs(["acc", "nom", "gen", "dat"]), answer: "acc",
          whyNot: {
            nom: "The doer is <i>fēmina</i>: she does the loving. Roses that do something would be <i>rosae</i>. <b>-ās</b> gets the action, even at the front.",
            gen: "“Of the roses” would be <i>rosārum</i>, with the long ending. Nothing belongs to the roses here.",
            dat: "“To the roses” would be <i>rosīs</i>, and loving is not giving, so nobody receives."
          },
          clues: [
            { say: "Who does the loving? <i>Fēmina</i>, with its plain -a. The doer’s job is taken, even though she stands second.", eliminates: "nom" },
            { say: "Loving is not giving, so nobody receives. <b>-ās</b> is the plural of <b>-am</b>.", eliminates: "dat" }
          ],
          why: "<b>Rosās</b> ends in <b>-ās</b>: accusative plural, the direct object. It stands first, but the <b>ending</b> is the boss, not the place: the woman loves roses." },
        { id: "c3-fin-2", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [T(n("Virī", "nom", "vir")), n("Rōmānī", "nom", "Rōmānus", { tag: "describes virī" }), n("patriam", "acc", "patria"), P(v("amant", "amō", "(they) love"), ".")],
          translation: "Roman <b>men</b> love their country.",
          options: jobs(["nom", "gen", "voc", "acc"]), answer: "nom",
          whyNot: {
            gen: "If <i>Virī</i> meant “of the man”, nobody would be left to do the loving. <i>Amant</i> ends in -nt: it needs <b>more than one</b> doer.",
            voc: "Nobody is calling the men: there is no <i>Ō</i> and no comma. The sentence tells what they do.",
            acc: "What the men love is their country, <i>patriam</i>, with its -am. Men who get the action would be <i>virōs</i>."
          },
          clues: [
            { say: "Look at the verb’s ending: ama<b>nt</b>. More than one person loves. If <i>Virī</i> meant “of the man”, who would do it?", eliminates: "gen" },
            { say: "No <i>Ō</i> and no comma, so nobody is being called.", eliminates: "voc" }
          ],
          why: "<i>Amant</i> is plural, so look for a plural subject: <b>Virī</b>, the men, at the front, with <i>Rōmānī</i> describing them. Their country, <i>patriam</i>, gets the love." },
        { id: "c3-fin-3", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Agricola", "nom", "agricola"), T(n("amīcō", "dat", "amīcus")), n("meō", "dat", "meus", { tag: "describes amīcō" }), n("agrum", "acc", "ager"), P(v("dat", "dō", "gives"), ".")],
          translation: "The farmer gives a field <b>to my friend</b>.",
          options: jobs(["dat", "abl", "acc", "nom"]), answer: "dat",
          whyNot: {
            abl: "<b>-ō</b> can be ablative too: same ending. But there is no <i>in</i>, <i>dē</i> or <i>sine</i> here, and a giving verb needs a receiver: my friend gets the field.",
            acc: "What gets given is the field, <i>agrum</i>, with its <b>-um</b>. A friend who gets the action would be <i>amīcum</i>.",
            nom: "The giver is the farmer, <i>agricola</i>: <i>dat</i> has one doer. A friend who does something would be <i>amīcus</i>."
          },
          clues: [
            { say: "<b>Dat</b> is a giving verb, and there is no <i>in</i>, <i>dē</i> or <i>sine</i> in front of <i>amīcō</i>.", eliminates: "abl" },
            { say: "The field, <i>agrum</i>, gets given: <b>-um</b>. Who gets the field?", eliminates: "acc" }
          ],
          why: "The farmer gives, the field is given, and <b>amīcō</b> receives it: dative, the indirect object. <i>Meō</i> describes it with the same ending." },
        { id: "c3-fin-4", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [QUID(), P(v("cōgitās", "cōgitō", "you think"), ","), P(T(n("amīce", "voc", "amīcus")), "?")],
          translation: "What are you thinking, <b>friend</b>?",
          options: jobs(["voc", "nom", "acc", "gen"]), answer: "voc",
          whyNot: {
            nom: "The subject is hidden in the verb: the <b>-s</b> of <i>cōgitās</i> means “you”. A friend named as the subject would be <i>amīcus</i>.",
            acc: "What gets thought is <i>quid</i>, “what”. A friend who gets the action would be <i>amīcum</i>.",
            gen: "“Of the friend” would be <i>amīcī</i>. The ending <b>-e</b> turns up in only one row of the chart: the vocative."
          },
          clues: [
            { say: "<i>Cōgitās</i> ends in -s, so its subject is “you”, already in the verb. A subject would be <i>amīcus</i>, with -us.", eliminates: "nom" },
            { say: "The ending <b>-e</b> turns up in only one row of the chart. Check your <b>Notebook</b>.", eliminates: "gen" }
          ],
          why: "Someone asks a friend a question: <b>direct address</b>, the vocative. A noun in <b>-us</b> calls with <b>-e</b>: <b>amīce</b>!" },
        { id: "c3-fin-5", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Fēmina", "nom", "fēmina"), n("fīliam", "acc", "fīlia"), T(n("agricolae", "gen", "agricola")), P(v("laudat", "laudō", "praises"), ".")],
          translation: "The woman praises <b>the farmer’s</b> daughter.",
          options: jobs(["gen", "nom", "dat", "voc"]), answer: "gen",
          whyNot: {
            nom: "“The farmers” as subject would need a verb in <b>-nt</b>. <i>Laudat</i> has one doer, and that is <i>Fēmina</i>.",
            dat: "A dative <b>receives</b> something that is given. Praising is not giving, so nobody receives. <i>Agricolae</i> tells whose daughter.",
            voc: "Nobody is calling the farmers: there is no <i>Ō</i> and no comma. <i>Agricolae</i> tells whose daughter she is."
          },
          clues: [
            { say: "The verb is <b>laudat</b>: one doer, and that is <i>Fēmina</i>, at the front.", eliminates: "nom" },
            { say: "Praising is not giving, so nobody receives. Ask instead: <b>whose</b> daughter?", eliminates: "dat" }
          ],
          why: "An old suspect: the sneaky <b>-ae</b> of chapter 2! <i>Laudat</i> has one doer, <i>Fēmina</i>. Praising has no receiver. So <b>agricolae</b> tells whose daughter: genitive." },
        { id: "c3-fin-6", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [DE(true), T(n("sapientiā", "abl", "sapientia", { tag: "after dē" })), x("hodiē", "hodiē", "today"), P(v("cōgitāmus", "cōgitō", "we think"), ".")],
          translation: "Today we think about <b>wisdom</b>.",
          options: jobs(["abl", "dat", "gen", "acc"]), answer: "abl",
          whyNot: {
            dat: "“To wisdom” would be <i>sapientiae</i>, and thinking is not giving, so nobody receives.",
            gen: "“Of wisdom” would be <i>sapientiae</i>, with <b>-ae</b>. This word ends in a long <b>-ā</b> and follows <i>dē</i>.",
            acc: "A direct object would end in <b>-am</b>: <i>sapientiam</i>. This word follows <i>dē</i> and ends in a long -ā."
          },
          clues: [
            { say: "Look at the ending: a long <b>-ā</b>, with the line on top. A direct object would end in -am.", eliminates: "acc" },
            { say: "Thinking is not giving, so nobody receives. Now look at the little word in front: <b>Dē</b>, “about”.", eliminates: "dat" }
          ],
          why: "<i>Dē</i>, “about”, takes the ablative: <b>sapientiā</b>, with a long -ā. What do we think about today? Wisdom." },
        { id: "c3-fin-7", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [P(n("Puerum", "acc", "puer"), ","), T(n("fīlium", "app", "fīlius", { tag: "renames puerum" })), P(n("poētae", "gen", "poēta"), ","), P(v("vocāmus", "vocō", "we call"), ".")],
          translation: "We call the boy, <b>the poet’s son</b>.",
          options: jobs(["app", "acc", "gen", "nom"]), answer: "app",
          whyNot: {
            acc: "What we call is the boy, <i>puerum</i>: that is the direct object. <i>Fīlium</i> is the same boy named again, so it takes the same case.",
            gen: "The word that tells whose is <i>poētae</i>, “of the poet”. <i>Fīlium</i> tells who the boy is.",
            nom: "The doers are “we”: the ending <b>-mus</b> of <i>vocāmus</i> says so. A son who does something would be <i>fīlius</i>."
          },
          clues: [
            { say: "The verb is <b>vocāmus</b>, “we call”. The ending -mus means <b>we</b> do it, so no noun here is the subject.", eliminates: "nom" },
            { say: "<i>Poētae</i> tells whose: the poet’s. The boy and the poet’s son are the <b>same</b> person.", eliminates: "gen" }
          ],
          why: "The boy and the poet’s son are the same person. <b>Fīlium</b>, between commas, renames <i>puerum</i> in the same case, the accusative: an <b>appositive</b>." },
        { id: "c3-fin-8", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Pecūnia", "nom", "pecūnia"), T(n("virum", "acc", "vir")), n("avārum", "acc", "avārus", { tag: "describes virum" }), x("nōn", "nōn", "not"), P(v("satiat", "satiō", "satisfies"), ".")],
          translation: "Money does not satisfy <b>a greedy man</b>.",
          options: jobs(["acc", "nom", "dat", "app"]), answer: "acc",
          whyNot: {
            nom: "The doer is <i>Pecūnia</i>, money: <i>satiat</i> has one doer. A man who does something would be <i>vir</i>.",
            dat: "“To the man” would be <i>virō</i>, and satisfying is not giving, so nobody receives.",
            app: "An appositive renames another noun, often between commas. Here <i>virum</i> renames no other noun."
          },
          clues: [
            { say: "The verb is <b>satiat</b>: one doer, and that is <i>Pecūnia</i>, money.", eliminates: "nom" },
            { say: "No commas, and no other noun here is the same person as the man. So nothing is renamed.", eliminates: "app" }
          ],
          why: "Money does the satisfying, or rather it does not! The greedy man is the one it fails to satisfy: <b>virum</b>, with <b>-um</b>, gets the action. Direct object, accusative." },
        { id: "c3-fin-9", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [IN(true), T(n("agrīs", "abl", "ager", { tag: "after in" })), n("multās", "acc", "multus", { tag: "describes rosās" }), n("rosās", "acc", "rosa"), P(v("vidēmus", "videō", "we see"), ".")],
          translation: "In <b>the fields</b> we see many roses.",
          options: jobs(["abl", "dat", "acc", "gen"]), answer: "abl",
          whyNot: {
            dat: "<b>-īs</b> can be dative too: same ending. But seeing is not giving, so nobody receives, and <i>In</i> comes right before <i>agrīs</i>.",
            acc: "What we see is the roses, <i>rosās</i>. Fields that get the action would be <i>agrōs</i>.",
            gen: "“Of the fields” would be <i>agrōrum</i>, with the long ending."
          },
          clues: [
            { say: "The verb is <b>vidēmus</b>, “we see”. Seeing is not giving, so nobody receives.", eliminates: "dat" },
            { say: "What do we see? <i>Rosās</i>, with <b>-ās</b>. So the fields do not get the action. Look at the little word in front of <i>agrīs</i>.", eliminates: "acc" }
          ],
          why: "<i>In</i>, “in” or “on”, takes the ablative: <b>agrīs</b>, ablative plural. Where do we see many roses? In the fields." },
        { id: "c3-fin-10", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Fīlia", "nom", "fīlia"), T(n("virī", "gen", "vir")), n("rosās", "acc", "rosa"), P(v("amat", "amō", "loves"), ".")],
          translation: "The daughter <b>of the man</b> loves roses.",
          options: jobs(["gen", "nom", "dat", "acc"]), answer: "gen",
          whyNot: {
            nom: "“The men” as subject would need a verb in <b>-nt</b>. <i>Amat</i> has one doer, and that is <i>Fīlia</i>, the daughter.",
            dat: "A dative <b>receives</b> something that is given. Loving is not giving, so nobody receives. <i>Virī</i> tells whose daughter.",
            acc: "What the daughter loves is the roses, <i>rosās</i>. A man who gets the action would be <i>virum</i>. <b>-ī</b> is never accusative."
          },
          clues: [
            { say: "The verb is <b>amat</b>: one doer, and that is <i>Fīlia</i>, at the front.", eliminates: "nom" },
            { say: "The roses, <i>rosās</i>, get the love: <b>-ās</b>. <b>-ī</b> is never accusative.", eliminates: "acc" }
          ],
          why: "<i>Amat</i> is singular: one doer, <i>Fīlia</i>. The roses get the love. So <b>virī</b> tells WHOSE daughter: genitive, “of the man”." }
      ]
    }
  ];

  /* ------------------------------------------------------------------ export */
  (root.CD_UNITS = root.CD_UNITS || {})["3"] = {
    chapter: 3,
    grade: 6,
    title: "Second declension: <i>amīcus</i>, <i>puer</i>, <i>ager</i>",
    bookTitle: "Second Declension Masculine Nouns and Adjectives; Apposition; Word Order",
    jobs: {
      app: { key: "app", name: "Appositive", abbr: "Appos.", question: "Who is it, in other words?",
             job: "renames the noun beside it, in the same case", tag: "renames",
             hook: "Its name means “put beside”. It stands beside its noun, often between commas, and always wears the same case.",
             of: null }
    },
    method: [
      { title: "Find the verb", text: "Ends in -t? One doer. Ends in -nt? Many, so look for a plural subject in -ī or -ae. Ends in -ō, -s or -mus? The doer is I, you or we." },
      { title: "Giving verb?", text: "If the verb is dat or dant, someone receives: the dative (-ae, -ō, -īs). A word after in, dē or sine is ablative." },
      { title: "Jobs all taken?", text: "No Ō and no comma, so nobody is called? Then an -ī or -ae word tells you whose. That is the genitive." }
    ],
    /* the chart of the book's chapter 3: amīcus is the model noun; puer keeps its e, ager drops it */
    charts: [
      { id: "d2", title: "2nd declension (masculine)",
        note: "Look-alikes: <b>-ī</b> is genitive singular or nominative plural, <b>-ō</b> is dative or ablative singular, and <b>-īs</b> is dative or ablative plural. <i>Vir</i>, “man”, goes like <i>puer</i>. A noun in <b>-ius</b> calls with one long <b>-ī</b>: <i>fīlius</i>, <i>fīlī</i>!",
        models: [
          { word: "amīcus", meaning: "friend", gender: "m",
            forms: { nom: ["amīc|us", "amīc|ī"], gen: ["amīc|ī", "amīc|ōrum"], dat: ["amīc|ō", "amīc|īs"], acc: ["amīc|um", "amīc|ōs"], abl: ["amīc|ō", "amīc|īs"], voc: ["amīc|e", "amīc|ī"] } },
          { word: "puer", meaning: "boy", gender: "m",
            forms: { nom: ["puer", "puer|ī"], gen: ["puer|ī", "puer|ōrum"], dat: ["puer|ō", "puer|īs"], acc: ["puer|um", "puer|ōs"], abl: ["puer|ō", "puer|īs"], voc: ["puer", "puer|ī"] } },
          { word: "ager", meaning: "field", gender: "m",
            forms: { nom: ["ager", "agr|ī"], gen: ["agr|ī", "agr|ōrum"], dat: ["agr|ō", "agr|īs"], acc: ["agr|um", "agr|ōs"], abl: ["agr|ō", "agr|īs"], voc: ["ager", "agr|ī"] } }
        ],
        adjective: { word: "magnus", meaning: "great, big", gender: "m",
          forms: { nom: ["magn|us", "magn|ī"], gen: ["magn|ī", "magn|ōrum"], dat: ["magn|ō", "magn|īs"], acc: ["magn|um", "magn|ōs"], abl: ["magn|ō", "magn|īs"], voc: ["magn|e", "magn|ī"] } } }
    ],
    /* the Notebook's word list: every word of the Latin sentences with its full dictionary entry */
    wordList: {
      intro: "Every Latin word from the sentences of the case files, chapter by chapter, with its full dictionary entry. For a noun: the word, its genitive, its gender (m. = masculine, f. = feminine) and its meaning. A word from an earlier chapter is listed again under each chapter whose files use it.",
      groups: [
        { title: "Nouns (second declension)", items: [
          { la: "ager, agrī", note: "m.", en: "field, farm" },
          { la: "amīcus, amīcī (m.), and amīca, amīcae (f.)", en: "friend" },
          { la: "fīlius, fīliī", note: "m.", en: "son" },
          { la: "populus, populī", note: "m.", en: "the people, a people, a nation" },
          { la: "puer, puerī", note: "m.", en: "boy; (pl.) boys, children" },
          { la: "vir, virī", note: "m.", en: "man, hero" }
        ] },
        { title: "Nouns (first declension)", items: [
          { la: "agricola, agricolae", note: "m.", en: "farmer" },
          { la: "fēmina, fēminae", note: "f.", en: "woman" },
          { la: "fīlia, fīliae", note: "f.", en: "daughter" },
          { la: "īra, īrae", note: "f.", en: "anger" },
          { la: "nauta, nautae", note: "m.", en: "sailor" },
          { la: "patria, patriae", note: "f.", en: "country, fatherland" },
          { la: "pecūnia, pecūniae", note: "f.", en: "money" },
          { la: "poēta, poētae", note: "m.", en: "poet" },
          { la: "rosa, rosae", note: "f.", en: "rose" },
          { la: "sapientia, sapientiae", note: "f.", en: "wisdom" },
          { la: "vīta, vītae", note: "f.", en: "life" }
        ] },
        { title: "Describing words (adjectives)", items: [
          { la: "avārus, avāra, avārum", en: "greedy, avaricious" },
          { la: "magnus, magna, magnum", en: "great, big" },
          { la: "meus, mea, meum", en: "my" },
          { la: "multus, multa, multum", en: "much, many" },
          { la: "paucī, paucae, pauca", en: "few, a few (usually plural)" },
          { la: "Rōmānus, Rōmāna, Rōmānum", en: "Roman" }
        ] },
        { title: "Verbs (principal parts; <i>salveō</i> has only two)", items: [
          { la: "amō, amāre, amāvī, amātum", en: "to love" },
          { la: "cōgitō, cōgitāre, cōgitāvī, cōgitātum", en: "to think, to ponder, to plan" },
          { la: "dō, dare, dedī, datum", en: "to give" },
          { la: "errō, errāre, errāvī, errātum", en: "to wander, to go astray" },
          { la: "habeō, habēre, habuī, habitum", en: "to have, to hold; to consider" },
          { la: "laudō, laudāre, laudāvī, laudātum", en: "to praise" },
          { la: "salveō, salvēre", en: "to be well (<i>salvē</i>, <i>salvēte</i>: hello)" },
          { la: "satiō, satiāre, satiāvī, satiātum", en: "to satisfy" },
          { la: "servō, servāre, servāvī, servātum", en: "to save, to keep" },
          { la: "terreō, terrēre, terruī, territum", en: "to frighten, to terrify" },
          { la: "valeō, valēre, valuī, valitūrum", en: "to be strong, to be well (<i>valē</i>: goodbye)" },
          { la: "videō, vidēre, vīdī, vīsum", en: "to see" },
          { la: "vocō, vocāre, vocāvī, vocātum", en: "to call, to summon" }
        ] },
        { title: "Other words", items: [
          { la: "dē", note: "preposition (takes the ablative)", en: "down from, from; about, concerning" },
          { la: "hodiē", en: "today" },
          { la: "in", note: "preposition (takes the ablative)", en: "in, on" },
          { la: "nōn", en: "not" },
          { la: "quid", en: "what" },
          { la: "sine", note: "preposition (takes the ablative)", en: "without" }
        ] }
      ]
    },
    files: FILES
  };
})(typeof window !== "undefined" ? window : this);
