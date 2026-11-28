/*!
 * Case Detective: the case files of Wheelock's chapter 18 (8th grade, Latin II), version 1.
 *
 * This file is DATA ONLY. It sets window.CD_UNITS["18"] and has no other effect. The game loads it when
 * an 8th grade casebook opens (js/courses.js lists it). The shapes are those of js/data.js (see its header)
 * and of the unit shape in the build brief.
 *
 * What it adds:
 *   jobs      five jobs of the ablative (of: "abl"), under Wheelock's names: personal agent (chapter 18),
 *             means, accompaniment and manner (chapter 14), time (chapter 15, "Ablative of Time" in the
 *             chapter's title: its full name here, "Ablative of time when or within which"; "Abl. time"
 *             is its short name, which the game takes where a screen is too small for the long one)
 *   method    the three steps of the detective method for this chapter's files
 *   charts    the declensions an 8th grader already knows, for the Notebook, in Wheelock's layout:
 *             d1 porta; d2 amīcus, puer, ager, dōnum (with magnus); d3 rēx, corpus; d3i cīvis, urbs, mare.
 *             chapter = the chapter where the book brings in the model nouns (the game does not read it yet)
 *   wordList  every Latin word of the files (and the chart nouns), with its full dictionary entry
 *   files     c18-agent "By Whom or by What?" (agent against means, passive verbs),
 *             c18-uses "Four Ablative Jobs" (means, accompaniment, manner, time),
 *             c18-mixed "The Ablative Line-Up" (all five)
 *
 * Words: only chapters 1 to 18 of the vocabulary file. Every passive verb is of the 1st or 2nd conjugation,
 * in the present, imperfect or future (chapter 18): the passive of the 3rd and 4th conjugations comes in
 * chapter 21, the perfect passive in chapter 19.
 *
 * Strings named say / prompt / translation / why / hook / note / intro / en, the texts in whyNot and the
 * clues may contain the inline tags <b>, <i> and <u> only. Everything else is plain text.
 * Word: { w, r, lemma, g, t?, after?, tag? } as in data.js; r may be a job key. A preposition has r: null.
 */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------- vocabulary */
  /* lemma (the headword of the vocabulary file) -> a short meaning; it never gives the job away */
  var LEX = {
    "ager": "field", "amīcus": "friend", "amor": "love", "animus": "mind, spirit", "annus": "year",
    "bonus": "good", "Caesar": "Caesar", "carmen": "song, poem", "Cicerō": "Cicero", "cīvis": "citizen",
    "cīvitās": "state", "cōnsul": "consul", "cūra": "care", "discipulus": "student", "dōnum": "gift",
    "fīlia": "daughter", "fīlius": "son", "frāter": "brother", "hōra": "hour", "hostēs": "the enemy",
    "īra": "anger", "is": "this, that; he, she, it", "laus": "praise", "liber": "book",
    "lībertās": "liberty, freedom", "litterae": "a letter (a message)", "lūdus": "school; game",
    "magister": "teacher", "magnus": "big, great", "māter": "mother", "noster": "our", "pater": "father",
    "paucī": "few, a few", "pecūnia": "money", "philosophia": "philosophy", "poēta": "poet", "prīmus": "first",
    "puella": "girl", "puer": "boy", "rēgīna": "queen", "rēx": "king", "sapientia": "wisdom",
    "studium": "eagerness, zeal", "tempus": "time", "tyrannus": "tyrant", "ūnus": "one", "urbs": "city",
    "verbum": "word", "virtūs": "courage, virtue"
  };

  function ext(o, extra) { if (extra) { for (var k in extra) { o[k] = extra[k]; } } return o; }
  /** noun, adjective or pronoun */
  function n(form, role, lemma, extra) { return ext({ w: form, r: role, lemma: lemma, g: LEX[lemma] }, extra); }
  /** verb, with the meaning of this exact form */
  function v(form, lemma, gloss, extra) { return ext({ w: form, r: "verb", lemma: lemma, g: gloss }, extra); }
  /** a passive verb: its label says so */
  function pv(form, lemma, gloss) { return v(form, lemma, gloss, { tag: "passive" }); }
  /** a little word with no job of its own: a preposition, nōn */
  function x(form, lemma, gloss) { return { w: form, r: null, lemma: lemma, g: gloss }; }
  function AB(form) { return x(form, "ā / ab", "from, away from; by"); }
  function CUM(form) { return x(form || "cum", "cum", "with"); }
  function AD() { return x("ad", "ad", "to, toward"); }
  function NON() { return x("nōn", "nōn", "not"); }
  /** the subject of a passive verb: it gets the action, so its label does not say “who does it” */
  function S(word) { word.tag = "subject"; return word; }
  /** an adjective: its label names the noun it goes with */
  function A(word, noun) { word.tag = "describes " + noun; return word; }
  /** mark the highlighted target word */
  function T(word) { word.t = true; return word; }
  /** punctuation printed right after the word */
  function P(word, punct) { word.after = punct; return word; }

  /* ------------------------------------------------------------------- jobs */
  var JOBS = {
    agent: { key: "agent", name: "Ablative of personal agent", abbr: "Abl. agent", question: "By whom?",
             job: "the person who does the action of a passive verb (ā or ab + the ablative)", tag: "by whom",
             hook: "A passive verb hides its doer in the ablative, after <b>ā</b> or <b>ab</b>: <i>ā poētā</i>, “by the poet”. Only a <b>person</b> gets the preposition.", of: "abl" },
    means: { key: "means", name: "Ablative of means", abbr: "Abl. means", question: "By what? With what?",
             job: "the thing used to do the action (no preposition)", tag: "by what",
             hook: "The <b>tool</b>: a thing, and never a preposition. <i>Pecūniā</i>, “with money”; <i>verbīs</i>, “by words”.", of: "abl" },
    manner: { key: "manner", name: "Ablative of manner", abbr: "Abl. manner", question: "How?",
              job: "how the action is done (cum + a word like care; with an adjective, cum may drop out)", tag: "how",
              hook: "<b>How</b> it is done: <i>cum cūrā</i>, “with care”. With an adjective, <i>cum</i> may drop out: <i>magnā cūrā</i> or <i>magnā cum cūrā</i>.", of: "abl" },
    accomp: { key: "accomp", name: "Ablative of accompaniment", abbr: "Abl. accomp.", question: "With whom?",
              job: "the person who goes along with someone (cum + the ablative)", tag: "with whom",
              hook: "A <b>companion</b>: <i>cum</i> + a person. <i>Cum amīcīs</i>, “with friends”.", of: "abl" },
    time: { key: "time", name: "Ablative of time when or within which", abbr: "Abl. time", question: "When? Within what time?",
            job: "when something happens, or within what time (no preposition)", tag: "when",
            hook: "A <b>time</b> word with no preposition: <i>eō tempore</i>, “at that time”; <i>ūnā hōrā</i>, “within one hour”.", of: "abl" }
  };

  /* ---------------------------------------------------------------- options */
  /* a case that is not the answer, as the confusion it stands for */
  var CASE_OPTS = {
    nom: { label: "Nominative", sub: "The subject" },
    acc: { label: "Accusative", sub: "The direct object" },
    dat: { label: "Dative", sub: "To or for whom?" }
  };
  function opts(keys) {
    return keys.map(function (k) { return JOBS[k] ? { k: k, label: JOBS[k].name, sub: JOBS[k].question } : { k: k, label: CASE_OPTS[k].label, sub: CASE_OPTS[k].sub }; });
  }
  var JOB_PROMPT = "What job does the highlighted word do?";

  /* ----------------------------------------------------------------- charts */
  var CHARTS = [
    { id: "d1", chapter: 2, title: "1st declension",
      note: "Review from chapter 2. The ablative singular is a long <b>-ā</b>: <i>portā</i>. The plural <b>-īs</b> is dative or ablative.",
      models: [
        { word: "porta", meaning: "gate", gender: "f",
          forms: { nom: ["port|a", "port|ae"], gen: ["port|ae", "port|ārum"], dat: ["port|ae", "port|īs"], acc: ["port|am", "port|ās"], abl: ["port|ā", "port|īs"], voc: ["port|a", "port|ae"] } }
      ] },
    { id: "d2", chapter: 3, title: "2nd declension",
      note: "Review from chapters 3 and 4. The ablative is <b>-ō</b> in the singular and <b>-īs</b> in the plural. <i>Dōnum</i> is neuter: its nominative and accusative are alike, and an adjective with it is neuter too: <i>magnum dōnum</i>.",
      models: [
        { word: "amīcus", meaning: "friend", gender: "m",
          forms: { nom: ["amīc|us", "amīc|ī"], gen: ["amīc|ī", "amīc|ōrum"], dat: ["amīc|ō", "amīc|īs"], acc: ["amīc|um", "amīc|ōs"], abl: ["amīc|ō", "amīc|īs"], voc: ["amīc|e", "amīc|ī"] } },
        { word: "puer", meaning: "boy", gender: "m",
          forms: { nom: ["puer|", "puer|ī"], gen: ["puer|ī", "puer|ōrum"], dat: ["puer|ō", "puer|īs"], acc: ["puer|um", "puer|ōs"], abl: ["puer|ō", "puer|īs"], voc: ["puer|", "puer|ī"] } },
        { word: "ager", meaning: "field", gender: "m",
          forms: { nom: ["ager|", "agr|ī"], gen: ["agr|ī", "agr|ōrum"], dat: ["agr|ō", "agr|īs"], acc: ["agr|um", "agr|ōs"], abl: ["agr|ō", "agr|īs"], voc: ["ager|", "agr|ī"] } },
        { word: "dōnum", meaning: "gift", gender: "n",
          forms: { nom: ["dōn|um", "dōn|a"], gen: ["dōn|ī", "dōn|ōrum"], dat: ["dōn|ō", "dōn|īs"], acc: ["dōn|um", "dōn|a"], abl: ["dōn|ō", "dōn|īs"], voc: ["dōn|um", "dōn|a"] } }
      ],
      adjective: { word: "magnus", meaning: "big, great", gender: "m",
        forms: { nom: ["magn|us", "magn|ī"], gen: ["magn|ī", "magn|ōrum"], dat: ["magn|ō", "magn|īs"], acc: ["magn|um", "magn|ōs"], abl: ["magn|ō", "magn|īs"], voc: ["magn|e", "magn|ī"] } } },
    { id: "d3", chapter: 7, title: "3rd declension",
      note: "Review from chapter 7. The ablative is <b>-e</b> in the singular and <b>-ibus</b> in the plural: <i>rēge</i>, <i>rēgibus</i>. A neuter like <i>corpus</i> has <b>-a</b> in the nominative and accusative plural.",
      models: [
        { word: "rēx", meaning: "king", gender: "m",
          forms: { nom: ["rēx|", "rēg|ēs"], gen: ["rēg|is", "rēg|um"], dat: ["rēg|ī", "rēg|ibus"], acc: ["rēg|em", "rēg|ēs"], abl: ["rēg|e", "rēg|ibus"], voc: ["rēx|", "rēg|ēs"] } },
        { word: "corpus", meaning: "body", gender: "n",
          forms: { nom: ["corpus|", "corpor|a"], gen: ["corpor|is", "corpor|um"], dat: ["corpor|ī", "corpor|ibus"], acc: ["corpus|", "corpor|a"], abl: ["corpor|e", "corpor|ibus"], voc: ["corpus|", "corpor|a"] } }
      ] },
    { id: "d3i", chapter: 14, title: "3rd declension i-stems",
      note: "Review from chapter 14. I-stems have <b>-ium</b> in the genitive plural. A neuter like <i>mare</i> also has <b>-ī</b> in the ablative singular and <b>-ia</b> in the nominative and accusative plural. <i>Cīvis</i> can be masculine or feminine.",
      models: [
        { word: "cīvis", meaning: "m./f., citizen",
          forms: { nom: ["cīv|is", "cīv|ēs"], gen: ["cīv|is", "cīv|ium"], dat: ["cīv|ī", "cīv|ibus"], acc: ["cīv|em", "cīv|ēs"], abl: ["cīv|e", "cīv|ibus"], voc: ["cīv|is", "cīv|ēs"] } },
        { word: "urbs", meaning: "city", gender: "f",
          forms: { nom: ["urbs|", "urb|ēs"], gen: ["urb|is", "urb|ium"], dat: ["urb|ī", "urb|ibus"], acc: ["urb|em", "urb|ēs"], abl: ["urb|e", "urb|ibus"], voc: ["urbs|", "urb|ēs"] } },
        { word: "mare", meaning: "sea", gender: "n",
          forms: { nom: ["mar|e", "mar|ia"], gen: ["mar|is", "mar|ium"], dat: ["mar|ī", "mar|ibus"], acc: ["mar|e", "mar|ia"], abl: ["mar|ī", "mar|ibus"], voc: ["mar|e", "mar|ia"] } }
      ] }
  ];

  /* -------------------------------------------------------------- word list */
  /* every Latin word of the sentences below and the nouns of the charts, with the dictionary entry of the
     vocabulary file (a noun with its genitive and gender, a verb with its principal parts) */
  var WORDS = {
    intro: "Every Latin word from the sentences in these case files, with its full dictionary entry. For a noun: the word, its genitive, its gender (m., f., n.) and its meaning. For a verb: its principal parts.",
    groups: [
      { title: "Nouns (first declension)", items: [
        { la: "cūra, cūrae", note: "f.", en: "care, attention, caution, anxiety" },
        { la: "fīlia, fīliae", note: "f.", en: "daughter" },
        { la: "hōra, hōrae", note: "f.", en: "hour, time" },
        { la: "īra, īrae", note: "f.", en: "ire, anger" },
        { la: "litterae, litterārum", note: "f. (pl.)", en: "a letter, epistle; literature" },
        { la: "pecūnia, pecūniae", note: "f.", en: "money" },
        { la: "philosophia, philosophiae", note: "f.", en: "philosophy" },
        { la: "poēta, poētae", note: "m.", en: "poet" },
        { la: "porta, portae", note: "f.", en: "gate, entrance, door" },
        { la: "puella, puellae", note: "f.", en: "girl" },
        { la: "rēgīna, rēgīnae", note: "f.", en: "queen" },
        { la: "sapientia, sapientiae", note: "f.", en: "wisdom" }
      ] },
      { title: "Nouns (second declension)", items: [
        { la: "ager, agrī", note: "m.", en: "field, farm" },
        { la: "amīcus, amīcī (m.), and amīca, amīcae (f.)", en: "friend" },
        { la: "animus, animī", note: "m.", en: "soul, spirit, mind" },
        { la: "annus, annī", note: "m.", en: "year" },
        { la: "discipulus, discipulī (m.); discipula, discipulae (f.)", en: "learner, pupil, student" },
        { la: "dōnum, dōnī", note: "n.", en: "gift, present" },
        { la: "fīlius, fīliī", note: "m.", en: "son" },
        { la: "liber, librī", note: "m.", en: "book" },
        { la: "lūdus, lūdī", note: "m.", en: "game, sport; school" },
        { la: "magister, magistrī (m.); magistra, magistrae (f.)", en: "schoolmaster, teacher, master (m.); schoolmistress, teacher, mistress (f.)" },
        { la: "puer, puerī", note: "m.", en: "boy; (pl.) boys, children" },
        { la: "studium, studiī", note: "n.", en: "eagerness, zeal, pursuit, study" },
        { la: "tyrannus, tyrannī", note: "m.", en: "absolute ruler, tyrant" },
        { la: "verbum, verbī", note: "n.", en: "word" }
      ] },
      { title: "Nouns (third declension)", items: [
        { la: "amor, amōris", note: "m.", en: "love" },
        { la: "Caesar, Caesaris", note: "m.", en: "Caesar" },
        { la: "carmen, carminis", note: "n.", en: "song, poem" },
        { la: "Cicerō, Cicerōnis", note: "m.", en: "Cicero" },
        { la: "cīvis, cīvis", note: "m./f.", en: "citizen" },
        { la: "cīvitās, cīvitātis", note: "f.", en: "state, citizenship" },
        { la: "cōnsul, cōnsulis", note: "m.", en: "consul" },
        { la: "corpus, corporis", note: "n.", en: "body" },
        { la: "frāter, frātris", note: "m.", en: "brother" },
        { la: "hostēs, hostium", note: "m. (pl.)", en: "the enemy" },
        { la: "laus, laudis", note: "f.", en: "praise, glory, fame" },
        { la: "lībertās, lībertātis", note: "f.", en: "liberty" },
        { la: "mare, maris", note: "n.", en: "sea" },
        { la: "māter, mātris", note: "f.", en: "mother" },
        { la: "pater, patris", note: "m.", en: "father" },
        { la: "rēx, rēgis", note: "m.", en: "king" },
        { la: "tempus, temporis", note: "n.", en: "time; occasion, opportunity" },
        { la: "urbs, urbis", note: "f.", en: "city" },
        { la: "virtūs, virtūtis", note: "f.", en: "manliness, courage; excellence, character, worth, virtue" }
      ] },
      { title: "Verbs (principal parts; <i>discō</i> has only three)", items: [
        { la: "alō, alere, aluī, altum", en: "to nourish, support, sustain, increase; to cherish" },
        { la: "amō, amāre, amāvī, amātum", en: "to love, to like" },
        { la: "audiō, audīre, audīvī, audītum", en: "to hear, to listen to" },
        { la: "cēnō, cēnāre, cēnāvī, cēnātum", en: "to dine" },
        { la: "discō, discere, didicī", en: "to learn" },
        { la: "iuvō, iuvāre, iūvī, iūtum", en: "to help, aid, assist; to please" },
        { la: "laudō, laudāre, laudāvī, laudātum", en: "to praise" },
        { la: "legō, legere, lēgī, lēctum", en: "to pick out, choose; to read" },
        { la: "moneō, monēre, monuī, monitum", en: "to remind, advise, warn" },
        { la: "recitō, recitāre, recitāvī, recitātum", en: "to read aloud, recite" },
        { la: "servō, servāre, servāvī, servātum", en: "to preserve, save, keep, guard" },
        { la: "sum, esse, fuī, futūrum", en: "to be, exist" },
        { la: "superō, superāre, superāvī, superātum", en: "to be above, surpass; to overcome, conquer" },
        { la: "terreō, terrēre, terruī, territum", en: "to frighten, terrify" },
        { la: "veniō, venīre, vēnī, ventum", en: "to come, arrive" },
        { la: "videō, vidēre, vīdī, vīsum", en: "to see; to observe, understand" },
        { la: "vocō, vocāre, vocāvī, vocātum", en: "to call, summon" }
      ] },
      { title: "Other words", items: [
        { la: "ā / ab (+abl.)", en: "from, away from; by" },
        { la: "ad", note: "preposition (takes the accusative)", en: "to, up to, near to" },
        { la: "bonus, bona, bonum", en: "good, kind" },
        { la: "cum", note: "preposition (takes the ablative)", en: "with" },
        { la: "is, ea, id", en: "this, that; he, she, it" },
        { la: "magnus, magna, magnum", en: "large, great; important" },
        { la: "nōn", en: "not" },
        { la: "noster, nostra, nostrum", en: "our, ours" },
        { la: "paucī, paucae, pauca", en: "(usually plural) few, a few" },
        { la: "prīmus, prīma, prīmum", en: "first" },
        { la: "ūnus, ūna, ūnum", en: "one, single, alone" }
      ] }
    ]
  };

  /* ----------------------------------------------------------------- method */
  var METHOD = [
    { title: "Find the verb", text: "Ends in -r, -ris, -tur, -mur, -minī or -ntur? It is passive: the subject gets the action." },
    { title: "Person or thing?", text: "ā or ab + a person, with a passive verb: the agent. A thing with no preposition: the means." },
    { title: "cum or a time?", text: "cum + a person: with whom. cum + care or anger: how. A time word alone: when." }
  ];

  /* ------------------------------------------------------------------ files */
  var FILES = [
    /* ============================ FILE 1 ============================ */
    {
      id: "c18-agent", n: 1, title: "By Whom or by What?",
      blurb: "A passive verb hides its doer. Is it a person or a tool?",
      briefing: [
        { mood: "wave", say: "Chapter 18, detective, and the verbs turn around. In the <b>passive</b>, the subject does not do the action: it <b>gets</b> it. <i>Puella laudātur</i>: “The girl is praised.”" },
        { mood: "point", say: "Spot the passive by its endings: <b>-r</b>, <b>-ris</b>, <b>-tur</b>, <b>-mur</b>, <b>-minī</b>, <b>-ntur</b>. <i>Laudātur</i>, “is praised”; <i>laudābātur</i>, “was being praised”; <i>laudābitur</i>, “will be praised”." },
        { mood: "think", say: "So who does the praising? If it is a <b>person</b>, Latin puts <b>ā</b> or <b>ab</b> in front of it, in the ablative. That is the <b>ablative of personal agent</b>: <i>ā poētā</i>, “by the poet”.",
          lesson: { k: "agent", words: [S(n("Puella", "nom", "puella")), AB("ā"), T(n("poētā", "agent", "poēta")), P(pv("laudātur", "laudō", "is praised"), ".")],
            translation: "The girl is praised <b>by the poet</b>." } },
        { mood: "point", say: "If it is a <b>thing</b>, a tool, there is no preposition at all. That is the <b>ablative of means</b>: <i>verbīs</i>, “with words”.",
          lesson: { k: "means", words: [S(n("Puella", "nom", "puella")), T(n("verbīs", "means", "verbum")), P(pv("laudātur", "laudō", "is praised"), ".")],
            translation: "The girl is praised <b>with words</b>." } },
        { mood: "wave", say: "Need an ablative ending? Your <b>Notebook</b> now holds the chart of every declension you know.", point: "notebook" },
        { mood: "search", say: "So ask two things every time: is it a <b>person</b> or a <b>thing</b>? And does <b>ā</b> or <b>ab</b> stand in front of it?", show: "recap" }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "agent", text: "By whom? ā or ab + a person, with a passive verb." },
          { k: "means", text: "By what? With what? A thing, with no preposition." }
        ]
      },
      questions: [
        { id: "c18-agent-1", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Puer", "nom", "puer")), AB("ā"), T(n("magistrō", "agent", "magister")), P(pv("laudātur", "laudō", "is praised"), ".")],
          translation: "The boy is praised <b>by the teacher</b>.",
          options: opts(["agent", "means", "accomp", "nom"]), answer: "agent",
          whyNot: {
            means: "Means is a <b>thing</b>, with no preposition. A teacher is a person, and <i>ā</i> stands before him.",
            accomp: "Accompaniment needs <i>cum</i>. There is no <i>cum</i>: the teacher is the one who praises.",
            nom: "The subject is <i>Puer</i>. <i>Magistrō</i> ends in <b>-ō</b> after <i>ā</i>: it is ablative."
          },
          clues: [
            { say: "<i>Laudātur</i> ends in <b>-tur</b>: it is passive. The boy, <i>Puer</i>, is the subject, and he gets the praise.", eliminates: "nom" },
            { say: "The little word in front is <b>ā</b>, not <i>cum</i>. Nobody is going along <b>with</b> the boy.", eliminates: "accomp" }
          ],
          why: "<i>Laudātur</i> is passive, and <b>ā</b> + a person says who praises: the teacher." },
        { id: "c18-agent-2", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Puer", "nom", "puer")), T(n("verbīs", "means", "verbum")), n("magistrī", "gen", "magister"), P(pv("terrētur", "terreō", "is frightened"), ".")],
          translation: "The boy is frightened <b>by the words</b> of the teacher.",
          options: opts(["means", "agent", "accomp", "dat"]), answer: "means",
          whyNot: {
            agent: "An agent is a <b>person</b> after <i>ā</i> or <i>ab</i>. <i>Magistrī</i> only says whose words: “of the teacher”.",
            accomp: "Accompaniment needs <i>cum</i> and a <b>person</b>. Words are not companions.",
            dat: "<b>-īs</b> can be dative, “to the words”, but nothing is given here. The words frighten the boy."
          },
          clues: [
            { say: "<i>Terrētur</i> means “is frightened”. Nothing is handed to anyone, so nobody receives anything.", eliminates: "dat" },
            { say: "No <b>ā</b> or <b>ab</b> stands in front of <i>verbīs</i>. And are words people or things?", eliminates: "agent" }
          ],
          why: "Words are a <b>thing</b>, with no preposition: the <b>ablative of means</b>. The teacher only owns them." },
        { id: "c18-agent-3", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Urbs", "nom", "urbs")), AB("ā"), T(n("cīvibus", "agent", "cīvis")), P(pv("servātur", "servō", "is saved"), ".")],
          translation: "The city is saved <b>by the citizens</b>.",
          options: opts(["agent", "means", "dat", "accomp"]), answer: "agent",
          whyNot: {
            means: "Means is a <b>thing</b>, with no preposition. Citizens are people, and <i>ā</i> stands before them.",
            dat: "<b>-ibus</b> can be dative, but a word right after <i>ā</i> is never dative.",
            accomp: "Accompaniment needs <i>cum</i>. Here the citizens are the ones who save the city."
          },
          clues: [
            { say: "<b>-ibus</b> can be dative or ablative plural. But a word right after <b>ā</b> is always ablative.", eliminates: "dat" },
            { say: "<i>Servātur</i> ends in <b>-tur</b>: the city <b>is saved</b>. Are the citizens a tool, or the ones who save it?", eliminates: "means" }
          ],
          why: "<i>Servātur</i> is passive, and <b>ā</b> + people says who saves the city." },
        { id: "c18-agent-4", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Cīvitās", "nom", "cīvitās")), T(n("sapientiā", "means", "sapientia")), P(pv("servābātur", "servō", "was being saved"), ".")],
          translation: "The state was being saved <b>by wisdom</b>.",
          options: opts(["means", "agent", "nom", "accomp"]), answer: "means",
          whyNot: {
            agent: "The agent is a <b>person</b> after <i>ā</i> or <i>ab</i>. Wisdom is a thing, with no preposition.",
            nom: "The subject is <i>Cīvitās</i>. <i>Sapientiā</i> ends in a long <b>-ā</b>: the ablative.",
            accomp: "Accompaniment needs <i>cum</i> and a person. Wisdom is not a companion."
          },
          clues: [
            { say: "Look at the end of <i>sapientiā</i>: a long <b>-ā</b>, the ablative. The subject is <i>Cīvitās</i>.", eliminates: "nom" },
            { say: "Is there a <b>cum</b> anywhere? No. So nobody goes along with anyone.", eliminates: "accomp" }
          ],
          why: "Wisdom is a <b>thing</b>, like a tool, and there is no preposition: the <b>ablative of means</b>." },
        { id: "c18-agent-5", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ā"), T(n("tyrannō", "agent", "tyrannus")), P(pv("terreor", "terreō", "I am frightened"), ".")],
          translation: "I am frightened <b>by the tyrant</b>.",
          options: opts(["agent", "dat", "means", "accomp"]), answer: "agent",
          whyNot: {
            dat: "<b>-ō</b> can be dative, but a word after <i>Ā</i> is never dative.",
            means: "Means is a <b>thing</b>, with no preposition. A tyrant is a person, after <i>Ā</i>.",
            accomp: "Accompaniment needs <i>cum</i>. The tyrant does not keep me company: he frightens me."
          },
          clues: [
            { say: "The first word is <b>Ā</b>. The word after it is ablative, never dative.", eliminates: "dat" },
            { say: "<i>Terreor</i> ends in <b>-r</b>: “I am frightened”. Is a tyrant a thing or a person?", eliminates: "means" }
          ],
          why: "<i>Terreor</i> is passive, and <b>ā</b> + a person says who frightens me." },
        { id: "c18-agent-6", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Lībertās", "nom", "lībertās")), A(n("nostra", "nom", "noster"), "Lībertās"), T(n("pecūniā", "means", "pecūnia")), NON(), P(pv("servātur", "servō", "is saved"), ".")],
          translation: "Our liberty is not saved <b>by money</b>.",
          options: opts(["means", "agent", "nom", "acc"]), answer: "means",
          whyNot: {
            agent: "The agent is a <b>person</b> after <i>ā</i> or <i>ab</i>. Money is a thing, and nothing stands in front of it.",
            nom: "The subject is <i>Lībertās</i>, the thing that gets saved. A nominative <i>pecūnia</i> would end in a plain -a. This one has a long <b>-ā</b>.",
            acc: "A passive verb has no direct object: what gets the action is the subject, <i>Lībertās</i>. And the accusative would be <i>pecūniam</i>."
          },
          clues: [
            { say: "<i>Servātur</i> is passive, so what gets the action is the subject, <i>Lībertās</i>. There is no direct object.", eliminates: "acc" },
            { say: "Nothing stands in front of <i>pecūniā</i>: no <b>ā</b>, no <b>ab</b>. And money is not a person.", eliminates: "agent" }
          ],
          why: "Money is a <b>thing</b>, a tool, and there is no preposition: the <b>ablative of means</b>. Our liberty is not saved <b>by money</b>." },
        { id: "c18-agent-7", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Carmina", "nom", "carmen")), AB("ā"), T(n("puellīs", "agent", "puella")), P(pv("amantur", "amō", "(they) are loved"), ".")],
          translation: "The poems are loved <b>by the girls</b>.",
          options: opts(["agent", "dat", "means", "accomp"]), answer: "agent",
          whyNot: {
            dat: "<b>-īs</b> can be dative, but a word after <i>ā</i> is always ablative.",
            means: "Means is a <b>thing</b>, with no preposition. Girls are people, and <i>ā</i> stands before them.",
            accomp: "Accompaniment needs <i>cum</i>. The girls do not go along with the poems: they love them."
          },
          clues: [
            { say: "<i>Amantur</i> ends in <b>-ntur</b>: the poems <b>are loved</b>. Who loves them: a tool, or people?", eliminates: "means" },
            { say: "The word before <i>puellīs</i> is <b>ā</b>, not <i>cum</i>. Nobody is keeping anyone company.", eliminates: "accomp" }
          ],
          why: "<i>Amantur</i> is passive, and <b>ā</b> + people says who loves the poems." },
        { id: "c18-agent-8", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Discipulī", "nom", "discipulus")), T(n("librīs", "means", "liber")), A(n("bonīs", "abl", "bonus"), "librīs"), P(pv("iuvantur", "iuvō", "(they) are helped"), ".")],
          translation: "Students are helped <b>by good books</b>.",
          options: opts(["means", "agent", "dat", "accomp"]), answer: "means",
          whyNot: {
            agent: "The agent is a <b>person</b> after <i>ā</i> or <i>ab</i>. Books are things, and no preposition stands in front of <i>librīs</i>.",
            dat: "<b>-īs</b> can be dative, “to the books”, but nothing is given to the books. They do the helping.",
            accomp: "Accompaniment needs <i>cum</i> and a person who goes along. Books are things, and there is no <i>cum</i>."
          },
          clues: [
            { say: "Is anything given <b>to</b> the books? No. They are what helps the students.", eliminates: "dat" },
            { say: "There is no <b>cum</b> in this sentence, so nobody goes along with anyone.", eliminates: "accomp" }
          ],
          why: "Books are <b>things</b>, and there is no preposition: the <b>ablative of means</b>. What helps the students? Good books." },
        { id: "c18-agent-9", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ab"), T(n("hostibus", "agent", "hostēs")), P(pv("superābimur", "superō", "we shall be overcome"), ".")],
          translation: "We shall be overcome <b>by the enemy</b>.",
          options: opts(["agent", "means", "accomp", "dat"]), answer: "agent",
          whyNot: {
            means: "Means is a <b>thing</b>, with no preposition. The enemy are people, after <i>Ab</i>.",
            accomp: "Accompaniment needs <i>cum</i>. The enemy would not keep us company: they would beat us.",
            dat: "<b>-ibus</b> can be dative, but a word after <i>ab</i> is always ablative."
          },
          clues: [
            { say: "<b>Ab</b> is the same word as <i>ā</i>: Latin uses <i>ab</i> before a vowel or <i>h</i>. The word after it is ablative.", eliminates: "dat" },
            { say: "<i>Superābimur</i> ends in <b>-bimur</b>: “we shall be overcome”. And there is no <i>cum</i>.", eliminates: "accomp" }
          ],
          why: "<i>Superābimur</i> is passive, and <b>ab</b> + people says who will overcome us." },
        { id: "c18-agent-10", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Hostēs", "nom", "hostēs")), T(n("virtūte", "means", "virtūs")), A(n("nostrā", "abl", "noster"), "virtūte"), P(pv("superābuntur", "superō", "(they) will be overcome"), ".")],
          translation: "The enemy will be overcome <b>by our courage</b>.",
          options: opts(["means", "agent", "nom", "accomp"]), answer: "means",
          whyNot: {
            agent: "The agent is a <b>person</b> after <i>ā</i> or <i>ab</i>. Courage is a thing, with no preposition.",
            nom: "The subject is <i>Hostēs</i>. <i>Virtūte</i> ends in <b>-e</b>: ablative singular.",
            accomp: "Accompaniment needs <i>cum</i> and a person. Courage is not a companion."
          },
          clues: [
            { say: "<i>Superābuntur</i> is plural, “they will be overcome”, and its subject is <i>Hostēs</i>, the enemy.", eliminates: "nom" },
            { say: "Nothing stands in front of <i>virtūte</i>: no <b>ā</b>, no <b>ab</b>.", eliminates: "agent" }
          ],
          why: "Courage is a <b>thing</b>, with no preposition: the <b>ablative of means</b>." }
      ]
    },
    /* ============================ FILE 2 ============================ */
    {
      id: "c18-uses", n: 2, title: "Four Ablative Jobs",
      blurb: "A tool, a friend, a way, a time: tell four ablatives apart.",
      briefing: [
        { mood: "think", say: "The ablative is the busiest case in Latin. In seventh grade you met four of its jobs, in chapters 14 and 15. Time to sort them out." },
        { mood: "point", say: "<b>By what? With what?</b> A <b>thing</b>, a tool, with no preposition: the <b>ablative of means</b>.",
          lesson: { k: "means", words: [n("Rēx", "nom", "rēx"), n("cīvēs", "acc", "cīvis"), T(n("pecūniā", "means", "pecūnia")), P(v("iuvat", "iuvō", "helps"), ".")],
            translation: "The king helps the citizens <b>with money</b>." } },
        { mood: "wave", say: "<b>With whom?</b> <i>Cum</i> + a <b>person</b> who goes along: the <b>ablative of accompaniment</b>.",
          lesson: { k: "accomp", words: [n("Poēta", "nom", "poēta"), CUM(), T(n("amīcīs", "accomp", "amīcus")), P(v("cēnat", "cēnō", "dines"), ".")],
            translation: "The poet dines <b>with friends</b>." } },
        { mood: "think", say: "<b>How?</b> <i>Cum</i> + a word like care, love or anger tells the <b>way</b> something is done: the <b>ablative of manner</b>. With an adjective, <i>cum</i> often drops out.",
          lesson: { k: "manner", words: [n("Discipulī", "nom", "discipulus"), n("librōs", "acc", "liber"), A(n("magnā", "abl", "magnus"), "cūrā"), T(n("cūrā", "manner", "cūra")), P(v("legunt", "legō", "(they) read"), ".")],
            translation: "The students read the books <b>with great care</b>." } },
        { mood: "point", say: "<b>When? Within what time?</b> A <b>time</b> word with no preposition: the <b>ablative of time when or within which</b>.",
          lesson: { k: "time", words: [A(n("Paucīs", "abl", "paucī"), "hōrīs"), T(n("hōrīs", "time", "hōra")), n("urbem", "acc", "urbs"), P(v("vidēbimus", "videō", "we shall see"), ".")],
            translation: "<b>Within a few hours</b> we shall see the city." } },
        { mood: "search", say: "Two of them use <i>cum</i>: is the word after it a <b>person</b> or a <b>way</b> of doing things? Two have no preposition: is the word a <b>tool</b> or a <b>time</b>?", show: "recap" }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "means", text: "By what? A thing, no preposition." },
          { k: "accomp", text: "With whom? cum + a person." },
          { k: "manner", text: "How? cum + care or anger." },
          { k: "time", text: "When? A time word, no preposition." }
        ]
      },
      questions: [
        { id: "c18-uses-1", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [CUM("Cum"), T(n("frātre", "accomp", "frāter")), AD(), n("lūdum", "acc", "lūdus", { tag: "after ad" }), P(v("veniō", "veniō", "I come"), ".")],
          translation: "I come to school <b>with my brother</b>.",
          options: opts(["accomp", "manner", "means", "time"]), answer: "accomp",
          whyNot: {
            manner: "Manner also uses <i>cum</i>, but with a <b>way</b> of doing things, like care. A brother is a person.",
            means: "Means is a <b>tool</b>, with no preposition. Here <i>Cum</i> stands in front.",
            time: "A brother is not a time word like <i>hōra</i>. He tells who comes along."
          },
          clues: [
            { say: "There is a preposition: <b>Cum</b>, “with”. Means never has one.", eliminates: "means" },
            { say: "Is <i>frātre</i> a time word, like hour or year? No, a brother is a person.", eliminates: "time" }
          ],
          why: "<i>Cum</i> + a <b>person</b>: with whom do I come? With my brother." },
        { id: "c18-uses-2", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Magister", "nom", "magister"), A(n("magnā", "abl", "magnus"), "cūrā"), CUM(), T(n("cūrā", "manner", "cūra")), P(v("recitat", "recitō", "recites"), ".")],
          translation: "The teacher recites <b>with great care</b>.",
          options: opts(["manner", "accomp", "means", "time"]), answer: "manner",
          whyNot: {
            accomp: "Accompaniment is <i>cum</i> + a <b>person</b>. Care is not a person: it tells <b>how</b>.",
            means: "Means never has a preposition, and here <i>cum</i> stands before <i>cūrā</i>.",
            time: "Care is not a time word. It tells <b>how</b> he recites, not when."
          },
          clues: [
            { say: "Is care a person who comes along? No. So this <i>cum</i> is not about company.", eliminates: "accomp" },
            { say: "There is a preposition, <b>cum</b>, so it cannot be means: means never has one.", eliminates: "means" }
          ],
          why: "<i>Magnā cum cūrā</i> tells <b>how</b>: the <b>ablative of manner</b>. Note the order: adjective, <i>cum</i>, noun." },
        { id: "c18-uses-3", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [A(n("Ūnā", "abl", "ūnus"), "hōrā"), T(n("hōrā", "time", "hōra")), n("urbem", "acc", "urbs"), P(v("vidēbimus", "videō", "we shall see"), ".")],
          translation: "<b>Within one hour</b> we shall see the city.",
          options: opts(["time", "means", "manner", "accomp"]), answer: "time",
          whyNot: {
            means: "Means is a <b>tool</b> you use. An hour is not a tool: it tells <b>within what time</b> we shall see the city.",
            manner: "Manner tells <b>how</b>, usually with <i>cum</i>, as in <i>cum cūrā</i>. An hour tells <b>when</b>.",
            accomp: "Accompaniment needs <i>cum</i> and a <b>person</b>. There is no <i>cum</i> here, and an hour is not a companion."
          },
          clues: [
            { say: "There is no <b>cum</b> in this sentence, so nobody comes along.", eliminates: "accomp" },
            { say: "<i>Hōra</i> means “hour”. Is an hour a tool, or a stretch of time?", eliminates: "means" }
          ],
          why: "<i>Hōrā</i> is a <b>time</b> word with no preposition: the <b>ablative of time within which</b>. Within one hour we shall see the city." },
        { id: "c18-uses-4", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Pater", "nom", "pater"), n("fīlium", "acc", "fīlius"), T(n("litterīs", "means", "litterae")), P(v("monet", "moneō", "warns"), ".")],
          translation: "The father warns his son <b>by letter</b>.",
          options: opts(["means", "manner", "accomp", "time"]), answer: "means",
          whyNot: {
            manner: "Manner tells <b>how</b>, with a word like care or anger. A letter is a <b>thing</b> the father uses: a tool.",
            accomp: "Accompaniment needs <i>cum</i> and a <b>person</b>. A letter is not a person, and there is no <i>cum</i>.",
            time: "A letter is not a time. It tells <b>with what</b> the father warns his son."
          },
          clues: [
            { say: "No <b>cum</b> anywhere: nobody goes along with anyone.", eliminates: "accomp" },
            { say: "<i>Litterae</i> in the plural means “a letter”, a message. Is a letter a time, like an hour or a year?", eliminates: "time" }
          ],
          why: "A letter is the <b>tool</b> the father warns with, and there is no preposition: the <b>ablative of means</b>. (<i>Litterīs</i> is plural, but it means one letter.)" },
        { id: "c18-uses-5", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Caesar", "nom", "Caesar"), CUM(), T(n("cīvibus", "accomp", "cīvis")), P(v("venit", "veniō", "comes"), ".")],
          translation: "Caesar comes <b>with the citizens</b>.",
          options: opts(["accomp", "manner", "means", "time"]), answer: "accomp",
          whyNot: {
            manner: "Manner is <i>cum</i> + a <b>way</b> of doing things, like care. Citizens are people.",
            means: "Means has <b>no</b> preposition, and here <i>cum</i> stands in front.",
            time: "Citizens are not a time. They tell <b>with whom</b> Caesar comes."
          },
          clues: [
            { say: "Means never has a preposition, and here is <b>cum</b>.", eliminates: "means" },
            { say: "After <i>cum</i> comes <i>cīvibus</i>: people, not a way of doing things like care or anger.", eliminates: "manner" }
          ],
          why: "<i>Cum</i> + people: with whom does Caesar come? With the citizens." },
        { id: "c18-uses-6", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Rēx", "nom", "rēx"), n("verba", "acc", "verbum"), n("cōnsulis", "gen", "cōnsul"), CUM(), T(n("īrā", "manner", "īra")), P(v("audit", "audiō", "hears"), ".")],
          translation: "The king hears the consul’s words <b>with anger</b>.",
          options: opts(["manner", "accomp", "means", "time"]), answer: "manner",
          whyNot: {
            accomp: "Accompaniment is <i>cum</i> + a <b>person</b>. Anger is a feeling, not a companion: it tells <b>how</b> the king listens.",
            means: "Means has <b>no</b> preposition, and here <i>cum</i> stands right before <i>īrā</i>. Anger is not the tool he hears with: he hears with his ears!",
            time: "Anger is not a time word. It tells <b>how</b> he hears, not when."
          },
          clues: [
            { say: "<i>Īra</i> means “anger”, a feeling. Is a feeling a person who comes along?", eliminates: "accomp" },
            { say: "No time word here: no hour, no year, no age.", eliminates: "time" }
          ],
          why: "<i>Cum</i> + a feeling, <i>īrā</i>, tells <b>how</b> the king hears the words: the <b>ablative of manner</b>." },
        { id: "c18-uses-7", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [A(n("Eō", "abl", "is"), "tempore"), T(n("tempore", "time", "tempus")), n("Cicerō", "nom", "Cicerō"), n("cōnsul", "nom", "cōnsul", { tag: "predicate nominative" }), P(v("erat", "sum", "was"), ".")],
          translation: "<b>At that time</b> Cicero was consul.",
          options: opts(["time", "means", "manner", "accomp"]), answer: "time",
          whyNot: {
            means: "Means is a <b>tool</b>. <i>Tempus</i> means “time”: it tells <b>when</b> Cicero was consul.",
            manner: "Manner tells <b>how</b> something is done, usually with <i>cum</i>. <i>Eō tempore</i> tells <b>when</b>.",
            accomp: "Accompaniment needs <i>cum</i> and a person. There is no <i>cum</i>, and a time is not a companion."
          },
          clues: [
            { say: "Is there a <b>cum</b>? No. So nobody comes along with Cicero.", eliminates: "accomp" },
            { say: "<i>Tempus, temporis</i> means “time”. Can a time be a tool?", eliminates: "means" }
          ],
          why: "<i>Tempore</i> is a <b>time</b> word in the ablative, with no preposition: the <b>ablative of time when</b>. At that time Cicero was consul." },
        { id: "c18-uses-8", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Animōs", "acc", "animus"), T(n("librīs", "means", "liber")), A(n("bonīs", "abl", "bonus"), "librīs"), P(v("alimus", "alō", "we nourish"), ".")],
          translation: "We nourish our minds <b>with good books</b>.",
          options: opts(["means", "manner", "accomp", "time"]), answer: "means",
          whyNot: {
            manner: "Manner is a <b>way</b> of doing things, like care. Books are <b>things</b> we use: tools.",
            accomp: "Accompaniment needs <i>cum</i> and a <b>person</b>. Books are not people.",
            time: "Books are not a time. They tell <b>with what</b> we nourish our minds."
          },
          clues: [
            { say: "No <b>cum</b> anywhere: nobody comes along.", eliminates: "accomp" },
            { say: "Is a book a time, like an hour or a year?", eliminates: "time" }
          ],
          why: "Books are the <b>tool</b> we feed our minds with, with no preposition: the <b>ablative of means</b>." },
        { id: "c18-uses-9", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [A(n("Prīmā", "abl", "prīmus"), "hōrā"), T(n("hōrā", "time", "hōra")), n("discipulī", "nom", "discipulus"), P(v("veniunt", "veniō", "(they) come"), ".")],
          translation: "<b>At the first hour</b> the students come.",
          options: opts(["time", "manner", "means", "accomp"]), answer: "time",
          whyNot: {
            manner: "Manner tells <b>how</b>: with care, with anger. <i>Prīmā hōrā</i> tells <b>when</b>.",
            means: "The first hour is not a <b>tool</b>: it tells when.",
            accomp: "Accompaniment needs <i>cum</i> and a person. There is no <i>cum</i> here."
          },
          clues: [
            { say: "An adjective and no <i>cum</i>: that could look like manner. But is an hour a way of doing things, like care?", eliminates: "manner" },
            { say: "Nobody comes along <b>with</b> the students: there is no <i>cum</i>.", eliminates: "accomp" }
          ],
          why: "<i>Prīmā hōrā</i> tells <b>when</b>: the <b>ablative of time when</b>. Roman hours began at sunrise." },
        { id: "c18-uses-10", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Discipulī", "nom", "discipulus"), A(n("magnō", "abl", "magnus"), "studiō"), T(n("studiō", "manner", "studium")), P(v("discunt", "discō", "(they) learn"), ".")],
          translation: "Students learn <b>with great eagerness</b>.",
          options: opts(["manner", "means", "accomp", "time"]), answer: "manner",
          whyNot: {
            means: "Eagerness is not a tool you hold: it tells <b>how</b> they learn. With <i>magnō</i>, <i>cum</i> can drop out.",
            accomp: "Accompaniment is <i>cum</i> + a <b>person</b>. Eagerness is a feeling, not a person.",
            time: "Eagerness is not a time. It tells <b>how</b> they learn, not when."
          },
          clues: [
            { say: "<i>Studium</i> means “eagerness, zeal”. Is that a time?", eliminates: "time" },
            { say: "Nobody comes along: eagerness is a feeling, not a person.", eliminates: "accomp" }
          ],
          why: "Eagerness tells <b>how</b> they learn: the <b>ablative of manner</b>. With an adjective, <i>cum</i> can drop out." }
      ]
    },
    /* ============================ FILE 3 ============================ */
    {
      id: "c18-mixed", n: 3, title: "The Ablative Line-Up",
      blurb: "All five jobs at once. Check the verb, then the little word in front.",
      briefing: [
        { mood: "wave", say: "Last file of chapter 18, detective. All five ablative jobs are on the loose: agent, means, accompaniment, manner and time." },
        { mood: "think", say: "Use the method. Find the verb first: is it passive? Then look in front of the ablative: <b>ā</b>, <b>ab</b>, <b>cum</b>, or nothing at all? Some sentences hide two ablatives!", show: "recap" },
        { mood: "proud", say: "Close these and chapter 18 is yours. Let’s go!" }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "agent", text: "By whom?" },
          { k: "means", text: "By what?" },
          { k: "accomp", text: "With whom?" },
          { k: "manner", text: "How?" },
          { k: "time", text: "When?" }
        ]
      },
      questions: [
        { id: "c18-mixed-1", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Puerī", "nom", "puer")), AB("ā"), T(n("mātre", "agent", "māter")), P(pv("vocantur", "vocō", "(they) are called"), ".")],
          translation: "The boys are called <b>by their mother</b>.",
          options: opts(["agent", "accomp", "means", "time"]), answer: "agent",
          whyNot: {
            accomp: "Accompaniment needs <i>cum</i>. The mother does not go along: she calls the boys.",
            means: "Means is a <b>thing</b>, with no preposition. A mother is a person, after <i>ā</i>.",
            time: "A mother is not a time. She tells <b>by whom</b> the boys are called."
          },
          clues: [
            { say: "<i>Vocantur</i> ends in <b>-ntur</b>: the boys <b>are called</b>. The little word before <i>mātre</i> is <b>ā</b>, not <i>cum</i>.", eliminates: "accomp" },
            { say: "A mother is a person, not a time like an hour or a year.", eliminates: "time" }
          ],
          why: "<i>Vocantur</i> is passive, and <b>ā</b> + a person says who calls them." },
        { id: "c18-mixed-2", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [CUM("Cum"), T(n("mātre", "accomp", "māter")), n("puerī", "nom", "puer"), P(v("veniunt", "veniō", "(they) come"), ".")],
          translation: "The boys come <b>with their mother</b>.",
          options: opts(["accomp", "agent", "manner", "means"]), answer: "accomp",
          whyNot: {
            agent: "The agent needs a <b>passive</b> verb and <i>ā</i> or <i>ab</i>. <i>Veniunt</i> is active.",
            manner: "Manner is <i>cum</i> + a <b>way</b> of doing things, like care. A mother is a person.",
            means: "Means has <b>no</b> preposition, and here <i>Cum</i> stands in front."
          },
          clues: [
            { say: "<i>Veniunt</i>, “they come”, is active: the boys do the coming. And there is no <i>ā</i> or <i>ab</i>.", eliminates: "agent" },
            { say: "Means never has a preposition, and this sentence starts with <b>Cum</b>.", eliminates: "means" }
          ],
          why: "<i>Cum</i> + a person: with whom do the boys come? With their mother." },
        { id: "c18-mixed-3", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Carmina", "nom", "carmen")), A(n("magnā", "abl", "magnus"), "laude"), CUM(), T(n("laude", "manner", "laus")), P(pv("recitantur", "recitō", "(they) are recited"), ".")],
          translation: "Poems are recited <b>with great praise</b>.",
          options: opts(["manner", "agent", "means", "accomp"]), answer: "manner",
          whyNot: {
            agent: "The verb is passive, but the agent is <i>ā</i> or <i>ab</i> + a person. Praise is not a person.",
            means: "Means has <b>no</b> preposition, and here <i>cum</i> stands right before <i>laude</i>.",
            accomp: "Accompaniment is <i>cum</i> + a <b>person</b>. Praise is not a person who comes along."
          },
          clues: [
            { say: "There is a <b>cum</b>, so it cannot be means: means never has one.", eliminates: "means" },
            { say: "<i>Laus</i> means “praise”. Is praise a person who could keep someone company?", eliminates: "accomp" }
          ],
          why: "<i>Magnā cum laude</i>, “with great praise”, tells <b>how</b>: the <b>ablative of manner</b>. Some diplomas still say it!" },
        { id: "c18-mixed-4", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [A(n("Paucīs", "abl", "paucī"), "annīs"), T(n("annīs", "time", "annus")), P(pv("laudāberis", "laudō", "you will be praised"), ".")],
          translation: "<b>In a few years</b> you will be praised.",
          options: opts(["time", "means", "agent", "manner"]), answer: "time",
          whyNot: {
            means: "Years are not a <b>tool</b>: they tell <b>within what time</b> it will happen.",
            agent: "The agent is <i>ā</i> or <i>ab</i> + a person. <i>Annīs</i> has no preposition, and years are not people.",
            manner: "Manner tells <b>how</b>, with a word like care. Years tell <b>when</b>."
          },
          clues: [
            { say: "There is no <b>ā</b> or <b>ab</b> here, and years are not people.", eliminates: "agent" },
            { say: "<i>Annus</i> means “year”. Is a year a tool?", eliminates: "means" }
          ],
          why: "<i>Paucīs annīs</i>, “within a few years”, is a <b>time</b> phrase with no preposition: <b>time within which</b>." },
        { id: "c18-mixed-5", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Rēgīna", "nom", "rēgīna"), n("cīvēs", "acc", "cīvis"), T(n("dōnīs", "means", "dōnum")), P(v("iuvat", "iuvō", "helps"), ".")],
          translation: "The queen helps the citizens <b>with gifts</b>.",
          options: opts(["means", "accomp", "agent", "time"]), answer: "means",
          whyNot: {
            accomp: "Accompaniment needs <i>cum</i> and a <b>person</b>. Gifts are things, and there is no <i>cum</i>.",
            agent: "The agent needs a <b>passive</b> verb and <i>ā</i> or <i>ab</i> + a person. <i>Iuvat</i> is active: the queen does the helping herself.",
            time: "Gifts are not a time. They tell <b>with what</b> the queen helps."
          },
          clues: [
            { say: "<i>Iuvat</i>, “helps”, is active, and the queen is its subject. No passive verb, no agent.", eliminates: "agent" },
            { say: "There is no <b>cum</b>, so nobody goes along with anyone.", eliminates: "accomp" }
          ],
          why: "Gifts are <b>things</b> the queen helps with, and there is no preposition: the <b>ablative of means</b>." },
        { id: "c18-mixed-6", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Māter", "nom", "māter"), CUM(), T(n("amōre", "manner", "amor")), n("fīliam", "acc", "fīlia"), P(v("monet", "moneō", "advises"), ".")],
          translation: "The mother advises her daughter <b>with love</b>.",
          options: opts(["manner", "accomp", "means", "agent"]), answer: "manner",
          whyNot: {
            accomp: "Accompaniment is <i>cum</i> + a <b>person</b>. Love is a feeling, not a companion: it tells <b>how</b> the mother advises.",
            means: "Means has <b>no</b> preposition, and here <i>cum</i> stands in front of <i>amōre</i>.",
            agent: "The agent needs a <b>passive</b> verb and <i>ā</i> or <i>ab</i>. <i>Monet</i> is active, and the word in front is <i>cum</i>."
          },
          clues: [
            { say: "<i>Monet</i>, “advises”, is active: the mother does it herself. No agent.", eliminates: "agent" },
            { say: "<i>Amor</i> means “love”, a feeling. Is a feeling a person who comes along?", eliminates: "accomp" }
          ],
          why: "<i>Cum</i> + a feeling, <i>amōre</i>, tells <b>how</b> the mother advises: the <b>ablative of manner</b>." },
        { id: "c18-mixed-7", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [S(n("Philosophia", "nom", "philosophia")), AB("ā"), T(n("Cicerōne", "agent", "Cicerō")), P(pv("amātur", "amō", "is loved"), ".")],
          translation: "Philosophy is loved <b>by Cicero</b>.",
          options: opts(["agent", "time", "means", "accomp"]), answer: "agent",
          whyNot: {
            time: "Cicero is a person, not a time. And <i>ā</i> stands before him.",
            means: "Means is a <b>thing</b>, with no preposition. Cicero is a person, after <i>ā</i>.",
            accomp: "Accompaniment needs <i>cum</i>. Cicero does not go along with philosophy: he loves it."
          },
          clues: [
            { say: "Is Cicero a time, like an hour or a year? No, he is a person.", eliminates: "time" },
            { say: "<i>Amātur</i> ends in <b>-tur</b>: passive. The word before <i>Cicerōne</i> is <b>ā</b>, not <i>cum</i>.", eliminates: "accomp" }
          ],
          why: "<i>Amātur</i> is passive, and <b>ā</b> + a person says who loves philosophy." },
        { id: "c18-mixed-8", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ab"), n("amīcīs", "agent", "amīcus"), T(n("pecūniā", "means", "pecūnia")), P(pv("iuvor", "iuvō", "I am helped"), ".")],
          translation: "I am helped by friends <b>with money</b>.",
          options: opts(["means", "agent", "manner", "time"]), answer: "means",
          whyNot: {
            agent: "The agent is <i>ab amīcīs</i>: <i>ab</i> + people. Money is a thing, with no preposition.",
            manner: "Manner tells <b>how</b>, with a word like care. Money is a <b>thing</b> my friends use.",
            time: "Money is not a time. It tells <b>with what</b> I am helped."
          },
          clues: [
            { say: "Who helps me? <i>Ab amīcīs</i>, “by friends”. That job is taken.", eliminates: "agent" },
            { say: "<i>Pecūnia</i> means “money”. Is money a time, like an hour or a year?", eliminates: "time" }
          ],
          why: "People get <i>ā</i> or <i>ab</i>; things do not. <i>Ab amīcīs</i> is the agent, and <b>pecūniā</b> is the <b>ablative of means</b>." }
      ]
    }
  ];

  /* ------------------------------------------------------------------ export */
  (root.CD_UNITS = root.CD_UNITS || {})["18"] = {
    chapter: 18, grade: 8,
    title: "Present passive; ablative of agent",
    bookTitle: "First and Second Conjugations: Present System Passive; Ablative of Agent",
    jobs: JOBS,
    method: METHOD,
    charts: CHARTS,
    wordList: WORDS,
    files: FILES
  };
})(typeof window !== "undefined" ? window : this);
