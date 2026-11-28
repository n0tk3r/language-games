/*!
 * Case Detective: the case files of Wheelock's chapter 20 (8th grade, Latin II), version 1.
 *
 * This file is DATA ONLY. It sets window.CD_UNITS["20"] and has no other effect. The game loads it when
 * an 8th grade casebook opens (js/courses.js lists it). The shapes are those of js/data.js (see its header)
 * and of the unit shape in the build brief.
 *
 * What it adds:
 *   jobs      two more jobs of the ablative (of: "abl"), under Wheelock's names: place from which and
 *             separation. The files also use the five jobs of chapter 18 (js/units/ch18.js: agent, means,
 *             manner, accomp, time); a casebook that holds chapter 20 always holds chapter 18 as well.
 *   method    the three steps of the detective method for this chapter's files
 *   charts    d4: frūctus and cornū, in Wheelock's layout (chapter = where the book brings them in)
 *   wordList  every Latin word of the files (and the chart nouns), with its full dictionary entry
 *   files     c20-fourth "Fourth Declension Lab" (the endings -us, -ūs, -ū, -uum, -ibus; manus is feminine),
 *             c20-from "From Where? From What?" (place from which, separation and agent: ā/ab can be all three),
 *             c20-final "Final Ablative Files" (all seven ablative jobs)
 *
 * Words: only chapters 1 to 20 of the vocabulary file. Passive verbs are 1st and 2nd conjugation verbs in
 * the present system (chapter 18) or perfect passives (chapter 19, any conjugation): the present-system
 * passive of the 3rd and 4th conjugations comes in chapter 21.
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
    "ager": "field", "agricola": "farmer", "annus": "year", "bonus": "good", "Caesar": "Caesar",
    "cīvis": "citizen", "cōnsul": "consul", "cōpia": "supply, abundance", "culpa": "blame, fault",
    "cūra": "care", "dexter": "right, right-hand", "dulcis": "sweet", "fāma": "fame, reputation",
    "frūctus": "fruit", "Graecia": "Greece", "homō": "human being, person", "hōra": "hour",
    "hostēs": "the enemy", "is": "this, that; he, she, it", "Italia": "Italy", "magnus": "big, great",
    "manus": "hand", "metus": "fear", "mōns": "mountain", "mors": "death", "patria": "fatherland, country",
    "paucī": "few, a few", "poēta": "poet", "populus": "people, nation", "porta": "gate", "puer": "boy",
    "senātus": "senate", "senex": "old man", "servitūs": "slavery", "soror": "sister", "tyrannus": "tyrant",
    "urbs": "city", "verbum": "word", "versus": "line of verse"
  };

  function ext(o, extra) { if (extra) { for (var k in extra) { o[k] = extra[k]; } } return o; }
  /** noun, adjective or pronoun */
  function n(form, role, lemma, extra) { return ext({ w: form, r: role, lemma: lemma, g: LEX[lemma] }, extra); }
  /** verb, with the meaning of this exact form */
  function v(form, lemma, gloss, extra) { return ext({ w: form, r: "verb", lemma: lemma, g: gloss }, extra); }
  /** a passive verb: its label says so */
  function pv(form, lemma, gloss) { return v(form, lemma, gloss, { tag: "passive" }); }
  /** a little word with no job of its own: a preposition */
  function x(form, lemma, gloss) { return { w: form, r: null, lemma: lemma, g: gloss }; }
  function AB(form) { return x(form, "ā / ab", "from, away from; by"); }
  function CUM(form) { return x(form || "cum", "cum", "with"); }
  function EX(form) { return x(form, "ex", "out of, from"); }
  function DE(form) { return x(form, "dē", "down from, from; about"); }
  function IN() { return x("in", "in", "into, to"); }
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
    from: { key: "from", name: "Ablative of place from which", abbr: "Abl. place from", question: "From where?",
            job: "the place something moves away from (ā/ab, dē or ex + the ablative)", tag: "from where",
            hook: "Motion <b>away</b> from a <b>place</b>, after <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i>: <i>ex urbe</i>, “out of the city”; <i>dē monte</i>, “down from the mountain”.", of: "abl" },
    sep: { key: "sep", name: "Ablative of separation", abbr: "Abl. sep.", question: "From what? From whom?",
           job: "what someone is freed from, kept from or lacks (a thing: no preposition; a person: often ā/ab)", tag: "from what",
           hook: "Freeing, keeping away, lacking: <i>līberō</i>, <i>prohibeō</i>, <i>careō</i>. A <b>thing</b> takes no preposition: <i>metū līberāre</i>, “to free from fear”. A <b>person</b> usually takes <i>ā</i> or <i>ab</i>.", of: "abl" }
  };
  /* the jobs of chapter 18 (js/units/ch18.js), named exactly as there, for the options */
  var EARLIER = {
    agent: { name: "Ablative of personal agent", question: "By whom?" },
    means: { name: "Ablative of means", question: "By what? With what?" },
    manner: { name: "Ablative of manner", question: "How?" },
    accomp: { name: "Ablative of accompaniment", question: "With whom?" },
    time: { name: "Ablative of time when or within which", question: "When? Within what time?" }
  };

  /* ---------------------------------------------------------------- options */
  function opts(keys) {
    return keys.map(function (k) { var j = JOBS[k] || EARLIER[k]; return { k: k, label: j.name, sub: j.question }; });
  }
  function forms(list) { return list.map(function (f) { return { k: f, label: f, latin: true }; }); }
  /** the three suspects of the ending -ūs (frūctūs) */
  function usSuspects() {
    return [
      { k: "gen", label: "Genitive singular", sub: "of the fruit" },
      { k: "nom", label: "Nominative plural", sub: "the fruits (subject)" },
      { k: "acc", label: "Accusative plural", sub: "the fruits (direct object)" }
    ];
  }
  var JOB_PROMPT = "What job does the highlighted word do?";
  var US_PROMPT = "Which case and number is the highlighted <b>-ūs</b> word?";

  /* ----------------------------------------------------------------- charts */
  var CHARTS = [
    { id: "d4", chapter: 20, title: "4th declension",
      note: "New in chapter 20. Almost every ending has a <b>u</b>. Most nouns in <b>-us</b> are masculine, but <i>manus</i>, “hand”, is feminine. The few neuters end in <b>-ū</b>, like <i>cornū</i>. Watch <b>-ūs</b>: genitive singular, or nominative and accusative plural.",
      models: [
        { word: "frūctus", meaning: "fruit", gender: "m",
          forms: { nom: ["frūct|us", "frūct|ūs"], gen: ["frūct|ūs", "frūct|uum"], dat: ["frūct|uī", "frūct|ibus"], acc: ["frūct|um", "frūct|ūs"], abl: ["frūct|ū", "frūct|ibus"], voc: ["frūct|us", "frūct|ūs"] } },
        { word: "cornū", meaning: "horn", gender: "n",
          forms: { nom: ["corn|ū", "corn|ua"], gen: ["corn|ūs", "corn|uum"], dat: ["corn|ū", "corn|ibus"], acc: ["corn|ū", "corn|ua"], abl: ["corn|ū", "corn|ibus"], voc: ["corn|ū", "corn|ua"] } }
      ] }
  ];

  /* -------------------------------------------------------------- word list */
  /* every Latin word of the sentences below and the nouns of the chart, with the dictionary entry of the
     vocabulary file (a noun with its genitive and gender, a verb with its principal parts) */
  var WORDS = {
    intro: "Every Latin word from the sentences in these case files, with its full dictionary entry. For a noun: the word, its genitive, its gender (m., f., n.) and its meaning. For a verb: its principal parts.",
    groups: [
      { title: "Nouns (fourth declension)", items: [
        { la: "cornū, cornūs", note: "n.", en: "horn" },
        { la: "frūctus, frūctūs", note: "m.", en: "fruit" },
        { la: "manus, manūs", note: "f.", en: "hand; handwriting; band (<i>manus</i> is feminine)" },
        { la: "metus, metūs", note: "m.", en: "fear, dread, anxiety" },
        { la: "senātus, senātūs", note: "m.", en: "senate" },
        { la: "versus, versūs", note: "m.", en: "line of verse" }
      ] },
      { title: "Other nouns", items: [
        { la: "ager, agrī", note: "m.", en: "field, farm" },
        { la: "agricola, agricolae", note: "m.", en: "farmer" },
        { la: "annus, annī", note: "m.", en: "year" },
        { la: "Caesar, Caesaris", note: "m.", en: "Caesar" },
        { la: "cīvis, cīvis", note: "m./f.", en: "citizen" },
        { la: "cōnsul, cōnsulis", note: "m.", en: "consul" },
        { la: "cōpia, cōpiae", note: "f.", en: "abundance, supply" },
        { la: "culpa, culpae", note: "f.", en: "blame, fault" },
        { la: "cūra, cūrae", note: "f.", en: "care, attention, caution, anxiety" },
        { la: "fāma, fāmae", note: "f.", en: "rumor, report; fame, reputation" },
        { la: "Graecia, Graeciae", note: "f.", en: "Greece" },
        { la: "homō, hominis", note: "m.", en: "human being, man" },
        { la: "hōra, hōrae", note: "f.", en: "hour, time" },
        { la: "hostēs, hostium", note: "m. (pl.)", en: "the enemy" },
        { la: "Italia, Italiae", note: "f.", en: "Italy" },
        { la: "mōns, montis", note: "m.", en: "mountain" },
        { la: "mors, mortis", note: "f.", en: "death" },
        { la: "patria, patriae", note: "f.", en: "fatherland, native land, (one’s) country" },
        { la: "poēta, poētae", note: "m.", en: "poet" },
        { la: "populus, populī", note: "m.", en: "the people, a people, a nation" },
        { la: "porta, portae", note: "f.", en: "gate, entrance, door" },
        { la: "puer, puerī", note: "m.", en: "boy; (pl.) boys, children" },
        { la: "senex, senis", note: "m.", en: "old, aged; old man" },
        { la: "servitūs, servitūtis", note: "f.", en: "servitude, slavery" },
        { la: "soror, sorōris", note: "f.", en: "sister" },
        { la: "tyrannus, tyrannī", note: "m.", en: "absolute ruler, tyrant" },
        { la: "urbs, urbis", note: "f.", en: "city" },
        { la: "verbum, verbī", note: "n.", en: "word" }
      ] },
      { title: "Verbs (principal parts; <i>careō</i> takes the ablative of separation)", items: [
        { la: "capiō, capere, cēpī, captum", en: "to take, capture, seize, get" },
        { la: "careō, carēre, caruī, caritūrum (+abl. of separation)", en: "to be without, be deprived of, want, lack; to be free from" },
        { la: "currō, currere, cucurrī, cursum", en: "to run, rush, move quickly" },
        { la: "discēdō, discēdere, discessī, discessum", en: "to go away, depart" },
        { la: "dō, dare, dedī, datum", en: "to give, offer" },
        { la: "fugiō, fugere, fūgī, fugitūrum", en: "to flee, hurry away; to escape; to avoid, shun" },
        { la: "laudō, laudāre, laudāvī, laudātum", en: "to praise" },
        { la: "līberō, līberāre, līberāvī, līberātum", en: "to free, liberate" },
        { la: "moneō, monēre, monuī, monitum", en: "to remind, advise, warn" },
        { la: "nāvigō, nāvigāre, nāvigāvī, nāvigātum", en: "to sail, navigate" },
        { la: "prohibeō, prohibēre, prohibuī, prohibitum", en: "to keep (back), prevent, hinder, restrain, prohibit" },
        { la: "recitō, recitāre, recitāvī, recitātum", en: "to read aloud, recite" },
        { la: "satiō, satiāre, satiāvī, satiātum", en: "to satisfy, sate" },
        { la: "scrībō, scrībere, scrīpsī, scrīptum", en: "to write, compose" },
        { la: "sum, esse, fuī, futūrum", en: "to be, exist" },
        { la: "veniō, venīre, vēnī, ventum", en: "to come, arrive" }
      ] },
      { title: "Other words", items: [
        { la: "ā / ab (+abl.)", en: "from, away from; by" },
        { la: "bonus, bona, bonum", en: "good, kind" },
        { la: "cum", note: "preposition (takes the ablative)", en: "with" },
        { la: "dē", note: "preposition (takes the ablative)", en: "down from, from; concerning, about" },
        { la: "dexter, dextra, dextrum", en: "right, right-hand" },
        { la: "dulcis, dulce", en: "sweet; pleasant, agreeable" },
        { la: "ex (or) ē", note: "preposition (takes the ablative)", en: "out of, from, from within; by reason of, on account of" },
        { la: "in", note: "preposition", en: "in, on (with the ablative); into, toward, against (with the accusative)" },
        { la: "is, ea, id", en: "this, that; he, she, it" },
        { la: "magnus, magna, magnum", en: "large, great; important" },
        { la: "paucī, paucae, pauca", en: "(usually plural) few, a few" }
      ] }
    ]
  };

  /* ----------------------------------------------------------------- method */
  var METHOD = [
    { title: "Find the verb", text: "Passive, like laudātur or capta est? Then ā or ab + a person is the agent." },
    { title: "Moving away?", text: "Going, running, sailing away: ā/ab, dē or ex + a place tells from where." },
    { title: "Freed or lacking?", text: "līberō, careō, prohibeō: from what? A thing has no preposition; a person often has ā/ab." }
  ];

  /* ------------------------------------------------------------------ files */
  var FILES = [
    /* ============================ FILE 1 ============================ */
    {
      id: "c20-fourth", n: 1, title: "Fourth Declension Lab",
      blurb: "Crack the endings with a u: frūctus, frūctūs, frūctū.",
      briefing: [
        { mood: "search", say: "New declension, new fingerprints! The <b>fourth declension</b> is the <b>u</b> declension: almost every ending has a u in it. Here is the chart from your book.", show: "chart" },
        { mood: "point", say: "Most of its nouns end in <b>-us</b> and are masculine, like <i>frūctus</i>, “fruit”. Two surprises: <i>manus</i>, “hand”, is <b>feminine</b>, and the few neuters end in <b>-ū</b>, like <i>cornū</i>, “horn”." },
        { mood: "think", say: "The sneakiest ending is <b>-ūs</b>, with a long u. <i>Frūctūs</i> can mean “of the fruit”, or “the fruits” as subject or as direct object. Only the sentence can tell you which.", show: "recap" },
        { mood: "point", say: "Two more fingerprints, back in the chart: <b>-ū</b> alone is the ablative singular of <i>frūctus</i>, and <b>-ibus</b> is the dative or ablative plural, just as in the third declension.", show: "chart" },
        { mood: "wave", say: "The whole chart is in your <b>Notebook</b> whenever you need it. Let’s test some fingerprints.", point: "notebook" }
      ],
      recap: {
        kind: "endings",
        items: [
          { ending: "-ūs", k: "gen", number: "singular", example: "frūctūs", meaning: "of the fruit", hook: "A long ū: one fruit, and it owns something." },
          { ending: "-ūs", k: "nom", number: "plural", example: "frūctūs", meaning: "the fruits (subject)", hook: "The same -ūs! It is the accusative plural too." }
        ]
      },
      questions: [
        { id: "c20-fourth-1", type: "choice", shuffle: true, gap: true,
          prompt: "How do you say “the fame <b>of the senate</b>”?",
          words: [n("fāma", null, "fāma"), T(n("senātūs", "gen", "senātus"))],
          translation: "the fame <b>of the senate</b>",
          options: forms(["senātūs", "senātus", "senātū", "senātuum"]), answer: "senātūs",
          whyNot: {
            "senātus": "<i>Senātus</i> with a short u is the nominative singular: the senate as <b>subject</b>. “Of the senate” needs a long <b>-ūs</b>.",
            "senātū": "<i>Senātū</i> is ablative singular: “by” or “with the senate”. You need “<b>of</b> the senate”.",
            "senātuum": "<i>Senātuum</i> is genitive, but plural: “of the <b>senates</b>”. Rome had just one senate."
          },
          clues: [
            { say: "“Of” means <b>whose</b>: the genitive. A lone <b>-ū</b> is the ablative singular, “by” or “with the senate”.", eliminates: "senātū" },
            { say: "<b>-uum</b> is the genitive <b>plural</b>, “of the senates”. One senate needs the long <b>-ūs</b>.", eliminates: "senātuum" }
          ],
          why: "<b>senātūs</b> is genitive singular, with a long <b>-ūs</b>: “of the senate”. The short <i>senātus</i> is the subject form." },
        { id: "c20-fourth-2", type: "choice", shuffle: true,
          prompt: "Which case and number is <i>frūctuum</i>?",
          options: [
            { k: "gen", label: "Genitive plural", sub: "of the fruits" },
            { k: "acc", label: "Accusative singular", sub: "the fruit (direct object)" },
            { k: "nom", label: "Nominative plural", sub: "the fruits (subject)" },
            { k: "dat", label: "Dative plural", sub: "to the fruits" }
          ], answer: "gen",
          whyNot: {
            acc: "The accusative singular <i>frūctum</i> ends in <b>-um</b>. <i>Frūctuum</i> ends in <b>-uum</b>.",
            nom: "The nominative plural is <i>frūctūs</i>, with a long <b>-ūs</b>.",
            dat: "The dative plural is <i>frūctibus</i>, with <b>-ibus</b>, as in the third declension."
          },
          clues: [
            { say: "The ending has two u’s, then an m. <i>Frūctum</i> ends in just <b>-um</b>.", eliminates: "acc" },
            { say: "The dative plural ends in <b>-ibus</b>, just as in the third declension: <i>frūctibus</i>, like <i>rēgibus</i>.", eliminates: "dat" }
          ],
          why: "<b>-uum</b> is the genitive plural: <i>frūctuum</i>, “of the fruits”." },
        { id: "c20-fourth-3", type: "choice", shuffle: false, prompt: US_PROMPT,
          words: [T(n("Frūctūs", "nom", "frūctus")), v("sunt", "sum", "are"), P(A(n("dulcēs", "nom", "dulcis"), "Frūctūs"), ".")],
          translation: "<b>The fruits</b> are sweet.",
          options: usSuspects(), answer: "nom",
          whyNot: {
            gen: "If <i>Frūctūs</i> meant “of the fruit”, nothing would be left to be sweet. <i>Sunt</i> needs a plural subject.",
            acc: "<i>Sunt</i>, “are”, takes no direct object: nothing gets an action here. The fruits are what the sentence is about."
          },
          clues: [
            { say: "The verb is <b>sunt</b>, “are”. It is plural, so look for a plural subject." },
            { say: "<i>Sunt</i> is not an action that lands on anything, so there is no direct object.", eliminates: "acc" }
          ],
          why: "<i>Sunt</i> is plural and needs a plural subject: <b>Frūctūs</b>, “the fruits”, nominative plural. <i>Dulcēs</i> agrees with it." },
        { id: "c20-fourth-4", type: "choice", shuffle: true, gap: true,
          prompt: "“The boy writes with his right <u>hand</u>.” Which form is “hand”?",
          words: [n("Puer", "nom", "puer"), A(n("dextrā", "abl", "dexter"), "manū"), T(n("manū", "means", "manus")), P(v("scrībit", "scrībō", "writes"), ".")],
          translation: "The boy writes <b>with his right hand</b>.",
          options: forms(["manū", "manum", "manūs", "manibus"]), answer: "manū",
          whyNot: {
            manum: "<i>Manum</i> is accusative, a direct object. The boy does not write a hand: he writes <b>with</b> it.",
            "manūs": "<i>Manūs</i> is “of the hand”, or “hands”. <i>Dextrā</i> is ablative singular, and so is its noun.",
            manibus: "<i>Manibus</i> is plural: “with the hands”. <i>Dextrā</i> is singular: one right hand."
          },
          clues: [
            { say: "<i>Dextrā</i> ends in a long <b>-ā</b>: feminine, ablative, <b>singular</b>. One right hand, so not a plural form.", eliminates: "manibus" },
            { say: "The boy does not write a hand. The hand is what he writes <b>with</b>, so it is not a direct object.", eliminates: "manum" }
          ],
          why: "He writes <b>with</b> his hand: ablative singular, <b>manū</b>. <i>Dextrā</i> is feminine because <i>manus</i> is." },
        { id: "c20-fourth-5", type: "choice", shuffle: false, prompt: US_PROMPT,
          words: [n("Agricola", "nom", "agricola"), T(n("frūctūs", "acc", "frūctus")), n("cīvibus", "dat", "cīvis"), P(v("dat", "dō", "gives"), ".")],
          translation: "The farmer gives <b>fruits</b> to the citizens.",
          options: usSuspects(), answer: "acc",
          whyNot: {
            gen: "If <i>frūctūs</i> meant “of the fruit”, the farmer would have nothing to give. <i>Dat</i> needs something that gets given.",
            nom: "<i>Dat</i> ends in <b>-t</b>: only one giver, and that is <i>Agricola</i>. So <i>frūctūs</i> is not the subject."
          },
          clues: [
            { say: "The verb is <b>dat</b>, “gives”, with one giver: <i>Agricola</i>. So the fruits are not the subject.", eliminates: "nom" },
            { say: "The receivers are <i>cīvibus</i>, “to the citizens”. A giving verb also needs something that gets given." }
          ],
          why: "The farmer gives, the citizens receive, and the fruits are what gets given: accusative plural <b>frūctūs</b>." },
        { id: "c20-fourth-6", type: "choice", shuffle: true,
          prompt: "Which one is <b>ablative singular</b>?",
          options: forms(["frūctū", "frūctūs", "frūctum", "frūctuī"]), answer: "frūctū",
          whyNot: {
            "frūctūs": "<i>Frūctūs</i> is genitive singular, or nominative or accusative plural. It is never ablative.",
            "frūctum": "<i>Frūctum</i> is accusative singular: the fruit as <b>direct object</b>.",
            "frūctuī": "<i>Frūctuī</i> is dative singular: “<b>to</b> the fruit”."
          },
          clues: [
            { say: "<b>-um</b> is the direct object’s ending, just as in <i>amīcum</i>.", eliminates: "frūctum" },
            { say: "<i>Frūctuī</i> is the dative singular, “<b>to</b> the fruit”, like <i>rēgī</i>, “to the king”.", eliminates: "frūctuī" }
          ],
          why: "<b>-ū</b>, a single long u, is the ablative singular: <b>frūctū</b>, “by” or “with the fruit”." },
        { id: "c20-fourth-7", type: "choice", shuffle: false, prompt: US_PROMPT,
          words: [n("Cōpia", "nom", "cōpia"), T(n("frūctūs", "gen", "frūctus")), A(n("magna", "nom", "magnus"), "Cōpia"), P(v("est", "sum", "is"), ".")],
          translation: "The supply <b>of fruit</b> is large.",
          options: usSuspects(), answer: "gen",
          whyNot: {
            nom: "<i>Est</i> is singular, so its subject is singular: <i>Cōpia</i>. “The fruits” as subject would need <i>sunt</i>.",
            acc: "<i>Est</i>, “is”, takes no direct object. Nothing gets an action here."
          },
          clues: [
            { say: "The verb is <b>est</b>, “is”: singular. Its subject is <i>Cōpia</i>, “the supply”.", eliminates: "nom" },
            { say: "<i>Est</i> is not an action that lands on anything. So ask: a supply <b>of</b> what?" }
          ],
          why: "<i>Est</i> is singular, and its subject is <i>Cōpia</i>. <i>Est</i> has no object. So <b>frūctūs</b> tells what the supply is <b>of</b>: genitive singular." },
        { id: "c20-fourth-8", type: "choice", shuffle: true, gap: true,
          prompt: "“The poet recites <u>lines of verse</u>.” Which form is “lines of verse”?",
          words: [n("Poēta", "nom", "poēta"), T(n("versūs", "acc", "versus")), P(v("recitat", "recitō", "recites"), ".")],
          translation: "The poet recites <b>lines of verse</b>.",
          options: forms(["versūs", "versum", "versuum", "versibus"]), answer: "versūs",
          whyNot: {
            versum: "<i>Versum</i> is the right case, but only <b>one</b> line. “Lines” is plural.",
            versuum: "<i>Versuum</i> means “<b>of</b> the lines”. Nothing belongs to the lines here: they are what the poet recites.",
            versibus: "<i>Versibus</i> means “to” or “with the lines”. The lines are not receivers or tools: they <b>get the action</b>."
          },
          clues: [
            { say: "The lines <b>get the action</b>: the poet recites them. Nobody gives them anything, and they are not a tool.", eliminates: "versibus" },
            { say: "<i>Versum</i> is just <b>one</b> line. For many, the fourth declension uses the long <b>-ūs</b>.", eliminates: "versum" }
          ],
          why: "The lines get the action, and there are many: accusative plural <b>versūs</b>. Yes, the same <b>-ūs</b> as the genitive singular!" },
        { id: "c20-fourth-9", type: "choice", shuffle: true,
          prompt: "Which one is the <b>nominative plural</b> of <i>cornū</i>, “horn”?",
          options: forms(["cornua", "cornūs", "cornū", "cornuum"]), answer: "cornua",
          whyNot: {
            "cornūs": "<i>Cornūs</i> is only genitive singular, “of the horn”. A neuter plural never ends in -ūs.",
            "cornū": "<i>Cornū</i> is singular: just <b>one</b> horn. It is almost every singular form.",
            cornuum: "<i>Cornuum</i> is genitive plural: “<b>of</b> the horns”."
          },
          clues: [
            { say: "<i>Cornū</i> with nothing added is <b>singular</b>: one horn. You need many horns.", eliminates: "cornū" },
            { say: "<b>-uum</b> means “of the …s”, just like <i>frūctuum</i>.", eliminates: "cornuum" }
          ],
          why: "<i>Cornū</i> is neuter, and a neuter ends in <b>-a</b> in the nominative and accusative plural: <b>cornua</b>, “horns”." },
        { id: "c20-fourth-10", type: "choice", shuffle: true,
          prompt: "Which case and number is the highlighted <b>-ibus</b> word?",
          words: [S(n("Puerī", "nom", "puer")), T(n("frūctibus", "means", "frūctus")), P(pv("satiantur", "satiō", "(they) are satisfied"), ".")],
          translation: "The boys are satisfied <b>with fruits</b>.",
          options: [
            { k: "abl", label: "Ablative plural", sub: "with the fruits" },
            { k: "dat", label: "Dative plural", sub: "to or for the fruits" },
            { k: "acc", label: "Accusative plural", sub: "the fruits (direct object)" }
          ], answer: "abl",
          whyNot: {
            dat: "<b>-ibus</b> can be dative, “to the fruits”, but nothing is given to the fruits. They are what fills the boys up.",
            acc: "The accusative plural of <i>frūctus</i> is <i>frūctūs</i>, not <i>frūctibus</i>. And a passive verb like <i>satiantur</i> has no direct object."
          },
          clues: [
            { say: "The accusative plural is <i>frūctūs</i>. <b>-ibus</b> is only dative or ablative.", eliminates: "acc" },
            { say: "<i>Satiantur</i> is passive: the boys <b>are satisfied</b>. With what? Is anything handed <b>to</b> the fruits?" }
          ],
          why: "<b>-ibus</b> is dative or ablative plural. Nothing is given to the fruits: they are what satisfies the boys, the means. So <b>frūctibus</b> is ablative plural, “with fruits”." }
      ]
    },
    /* ============================ FILE 2 ============================ */
    {
      id: "c20-from", n: 2, title: "From Where? From What?",
      blurb: "Three jobs for ā and ab. Find the right one in each sentence.",
      briefing: [
        { mood: "think", say: "Chapter 20 adds two more ablative jobs, and both answer a <b>from</b> question. Careful, detective: they love to hide behind the same little words." },
        { mood: "point", say: "<b>From where?</b> A <b>place</b> someone moves away from, after <b>ā</b>/<b>ab</b>, <b>dē</b> or <b>ex</b>: the <b>ablative of place from which</b>.",
          lesson: { k: "from", words: [n("Cīvēs", "nom", "cīvis"), EX("ex"), T(n("urbe", "from", "urbs")), P(v("fugiunt", "fugiō", "(they) flee"), ".")],
            translation: "The citizens flee <b>out of the city</b>." } },
        { mood: "think", say: "<b>From what?</b> Verbs of freeing, keeping away and lacking take the <b>ablative of separation</b>. A <b>thing</b> needs no preposition: <i>metū</i>, “from fear”.",
          lesson: { k: "sep", words: [n("Caesar", "nom", "Caesar"), n("cīvēs", "acc", "cīvis"), T(n("metū", "sep", "metus")), P(v("līberat", "līberō", "frees"), ".")],
            translation: "Caesar frees the citizens <b>from fear</b>." } },
        { mood: "point", say: "A <b>person</b> usually keeps the <b>ab</b>: <i>ab hostibus</i>, “from the enemy”. Nobody goes anywhere here: the city is set free.",
          lesson: { k: "sep", words: [n("Cōnsul", "nom", "cōnsul"), n("urbem", "acc", "urbs"), AB("ab"), T(n("hostibus", "sep", "hostēs", { tag: "from whom" })), P(v("līberat", "līberō", "frees"), ".")],
            translation: "The consul frees the city <b>from the enemy</b>." } },
        { mood: "search", say: "And remember chapter 18: with a <b>passive</b> verb, <b>ā</b> or <b>ab</b> + a person is the <b>agent</b>. So when you see <i>ab</i>, check two things: the <b>verb</b> and the <b>noun</b>.", show: "recap" }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "from", text: "From where? A place you leave." },
          { k: "sep", text: "From what? Freeing or lacking." },
          { k: "agent", text: "By whom? A person, passive verb." }
        ]
      },
      questions: [
        { id: "c20-from-1", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ab"), T(n("urbe", "from", "urbs")), n("cīvēs", "nom", "cīvis"), P(v("discēdunt", "discēdō", "(they) go away"), ".")],
          translation: "The citizens go away <b>from the city</b>.",
          options: opts(["from", "sep", "agent", "means"]), answer: "from",
          whyNot: {
            sep: "Separation goes with freeing or lacking. The citizens simply <b>go away</b> from a place.",
            agent: "An agent needs a <b>passive</b> verb and a person. <i>Discēdunt</i> is active, and a city is a place.",
            means: "Means is a tool, with <b>no</b> preposition. Here <i>Ab</i> stands in front of a place."
          },
          clues: [
            { say: "<i>Discēdunt</i>, “they go away”, is active: the citizens do it themselves. No passive verb, no agent.", eliminates: "agent" },
            { say: "A preposition, <b>Ab</b>, stands in front of <i>urbe</i>. Means never has one.", eliminates: "means" }
          ],
          why: "The citizens <b>move away</b> from a <b>place</b>: <i>ab urbe</i>, “from the city”." },
        { id: "c20-from-2", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Caesar", "nom", "Caesar"), n("cīvēs", "acc", "cīvis"), AB("ā"), T(n("tyrannō", "sep", "tyrannus", { tag: "from whom" })), P(v("līberāvit", "līberō", "freed"), ".")],
          translation: "Caesar freed the citizens <b>from the tyrant</b>.",
          options: opts(["sep", "agent", "from", "means"]), answer: "sep",
          whyNot: {
            agent: "An agent needs a <b>passive</b> verb. <i>Līberāvit</i> is active: Caesar did the freeing himself.",
            from: "Place from which is a <b>place</b> someone leaves. A tyrant is a person, and nobody moves here.",
            means: "Means is a <b>thing</b>, with no preposition. A tyrant is a person, after <i>ā</i>."
          },
          clues: [
            { say: "Who did the freeing? <i>Caesar</i>: <i>līberāvit</i> is active. So nobody did it “by” anyone else.", eliminates: "agent" },
            { say: "Is <i>tyrannō</i> a place? No, a tyrant is a person. And nobody is going anywhere.", eliminates: "from" }
          ],
          why: "<i>Līberāvit</i> is a verb of <b>freeing</b>, and <b>ā</b> + a person says from whom." },
        { id: "c20-from-3", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ab"), T(n("hostibus", "agent", "hostēs")), S(n("urbs", "nom", "urbs")), v("capta", "capiō", "taken", { tag: "passive" }), P(v("est", "sum", "is (with capta: was taken)", { tag: "passive" }), ".")],
          translation: "The city was taken <b>by the enemy</b>.",
          options: opts(["agent", "sep", "from", "means"]), answer: "agent",
          whyNot: {
            sep: "Separation goes with freeing or lacking. Here the city <b>was taken</b>, and the enemy did it.",
            from: "Place from which is a <b>place</b> someone leaves. The enemy are people: they took the city.",
            means: "Means is a <b>thing</b>, with no preposition. The enemy are people, after <i>Ab</i>."
          },
          clues: [
            { say: "<i>Capta est</i>, “was taken”, is <b>passive</b> (chapter 19). Is taking a city a way of setting it free?", eliminates: "sep" },
            { say: "The enemy are <b>people</b>, not a place, and nobody moves away from them.", eliminates: "from" }
          ],
          why: "<i>Capta est</i> is passive, and <b>ab</b> + people says who took the city." },
        { id: "c20-from-4", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Hominēs", "nom", "homō"), A(n("bonī", "nom", "bonus"), "Hominēs"), T(n("culpā", "sep", "culpa")), P(v("carent", "careō", "(they) lack, are free from"), ".")],
          translation: "Good people are free <b>from blame</b>.",
          options: opts(["sep", "means", "from", "agent"]), answer: "sep",
          whyNot: {
            means: "Blame is not a tool here: good people <b>lack</b> it. <i>Careō</i> takes separation.",
            from: "Place from which needs a <b>place</b> and a preposition. Blame is not a place, and nobody moves.",
            agent: "An agent needs a passive verb and <i>ā</i> or <i>ab</i>. <i>Carent</i> is active, with no preposition."
          },
          clues: [
            { say: "No preposition at all, and no passive verb. So there is no agent here.", eliminates: "agent" },
            { say: "<i>Careō</i> means “lack, be free from”. Is blame a place someone walks away from?", eliminates: "from" }
          ],
          why: "<i>Careō</i>, “be free from”, takes separation. Blame is a <b>thing</b>: no preposition." },
        { id: "c20-from-5", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [T(n("Verbīs", "means", "verbum")), n("puerum", "acc", "puer"), n("metū", "sep", "metus"), P(v("līberat", "līberō", "(he) frees"), ".")],
          translation: "<b>With words</b> he frees the boy from fear.",
          options: opts(["means", "sep", "from", "agent"]), answer: "means",
          whyNot: {
            sep: "The boy is freed from <i>metū</i>, fear. <i>Verbīs</i> is what he frees him <b>with</b>.",
            from: "Place from which needs a <b>place</b> and a preposition. Words are not a place.",
            agent: "An agent needs a <b>passive</b> verb and <i>ā</i> or <i>ab</i>. <i>Līberat</i> is active."
          },
          clues: [
            { say: "<i>Līberat</i>, “he frees”, is active. No passive verb, no agent.", eliminates: "agent" },
            { say: "The boy is freed from <i>metū</i>, fear: that word answers “from what?” So what does <i>Verbīs</i> do?", eliminates: "sep" }
          ],
          why: "Two ablatives! <i>Metū</i> tells <b>from what</b>. <b>Verbīs</b> tells <b>with what</b>: his words are his tool." },
        { id: "c20-from-6", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Verbīs", "means", "verbum"), n("puerum", "acc", "puer"), T(n("metū", "sep", "metus")), P(v("līberat", "līberō", "(he) frees"), ".")],
          translation: "With words he frees the boy <b>from fear</b>.",
          options: opts(["sep", "means", "from", "agent"]), answer: "sep",
          whyNot: {
            means: "His tool is <i>Verbīs</i>, his words. Fear is what the boy is freed <b>from</b>.",
            from: "Place from which needs a <b>place</b> and a preposition. Fear is not a place.",
            agent: "An agent needs a passive verb and a person. <i>Līberat</i> is active, and fear is not a person."
          },
          clues: [
            { say: "Fear is not a place, and no <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i> stands in front of it.", eliminates: "from" },
            { say: "<i>Līberat</i> is a verb of <b>freeing</b>. Freed with what? With <i>Verbīs</i>. Then freed from what?", eliminates: "means" }
          ],
          why: "A verb of freeing: from what? From fear, <b>metū</b>, a thing, so no preposition." },
        { id: "c20-from-7", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [DE("Dē"), T(n("monte", "from", "mōns")), n("puerī", "nom", "puer"), P(v("currunt", "currō", "(they) run"), ".")],
          translation: "The boys run down <b>from the mountain</b>.",
          options: opts(["from", "sep", "means", "agent"]), answer: "from",
          whyNot: {
            sep: "Separation goes with freeing or lacking. Running down a mountain is <b>motion</b> from a place.",
            means: "Means is a tool, with no preposition. Here <i>Dē</i> stands in front of a place.",
            agent: "An agent needs a passive verb and a person. <i>Currunt</i> is active, and a mountain is a place."
          },
          clues: [
            { say: "<i>Currunt</i>, “they run”, is active, and a mountain is not a person.", eliminates: "agent" },
            { say: "<b>Dē</b> is a preposition, “down from”. Means never has one.", eliminates: "means" }
          ],
          why: "The boys <b>move</b> away from a <b>place</b>. <i>Dē</i> means “down from”." },
        { id: "c20-from-8", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ā"), T(n("cīvibus", "agent", "cīvis")), S(n("Caesar", "nom", "Caesar")), P(pv("laudātur", "laudō", "is praised"), ".")],
          translation: "Caesar is praised <b>by the citizens</b>.",
          options: opts(["agent", "from", "sep", "means"]), answer: "agent",
          whyNot: {
            from: "Place from which is a <b>place</b> someone leaves. Citizens are people: they praise Caesar.",
            sep: "Separation goes with freeing or lacking. <i>Laudātur</i>, “is praised”, is neither.",
            means: "Means is a <b>thing</b>, with no preposition. Citizens are people, after <i>Ā</i>."
          },
          clues: [
            { say: "<b>Ā</b> stands in front of <i>cīvibus</i>, and citizens are people. Means is a thing, with no preposition.", eliminates: "means" },
            { say: "Citizens are <b>people</b>, not a place, and nobody moves away from them.", eliminates: "from" }
          ],
          why: "<i>Laudātur</i> is passive, and <b>ā</b> + people says who praises Caesar." },
        { id: "c20-from-9", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [EX("Ex"), T(n("Graeciā", "from", "Graecia")), IN(), n("Italiam", "acc", "Italia", { tag: "after in" }), P(v("nāvigāvit", "nāvigō", "(he) sailed"), ".")],
          translation: "He sailed <b>from Greece</b> to Italy.",
          options: opts(["from", "sep", "agent", "means"]), answer: "from",
          whyNot: {
            sep: "Separation goes with freeing, keeping away or lacking. Sailing away is <b>motion</b> away from a place.",
            agent: "An agent needs a passive verb and a person. <i>Nāvigāvit</i> is active, and Greece is a place.",
            means: "Means is a tool, with no preposition. A ship might be his tool, but Greece is the place he sails away from."
          },
          clues: [
            { say: "<i>Nāvigāvit</i>, “he sailed”, is active: no agent.", eliminates: "agent" },
            { say: "<b>Ex</b> stands in front of <i>Graeciā</i>. Means never has a preposition.", eliminates: "means" }
          ],
          why: "He <b>moves</b> out of a <b>place</b>: <i>ex Graeciā</i>, the <b>ablative of place from which</b>." },
        { id: "c20-from-10", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Patriam", "acc", "patria"), T(n("servitūte", "sep", "servitūs")), P(v("līberāvērunt", "līberō", "(they) freed"), ".")],
          translation: "They freed the fatherland <b>from slavery</b>.",
          options: opts(["sep", "means", "from", "agent"]), answer: "sep",
          whyNot: {
            means: "Means is a tool used to do something. Slavery is not their tool: it is what the fatherland is freed <b>from</b>.",
            from: "Place from which needs a <b>place</b> and a preposition. Slavery is not a place, and nobody moves away.",
            agent: "An agent needs a passive verb and <i>ā</i> or <i>ab</i> + a person. <i>Līberāvērunt</i> is active."
          },
          clues: [
            { say: "<i>Līberāvērunt</i>, “they freed”, is active, and there is no <i>ā</i> or <i>ab</i>.", eliminates: "agent" },
            { say: "<i>Servitūs</i> means “slavery”. Is it a place to walk away from?", eliminates: "from" }
          ],
          why: "<i>Līberō</i> is a verb of <b>freeing</b>. From what? From slavery, a <b>thing</b>, so there is no preposition: the <b>ablative of separation</b>." }
      ]
    },
    /* ============================ FILE 3 ============================ */
    {
      id: "c20-final", n: 3, title: "Final Ablative Files",
      blurb: "All seven ablative jobs. Read the whole sentence first.",
      briefing: [
        { mood: "wave", say: "Last file, detective. Seven ablative jobs, and any of them can turn up." },
        { mood: "think", say: "Find the verb first: is it passive? Is someone moving, or being set free? Then look in front of the ablative: <b>ā</b>, <b>ab</b>, <b>dē</b>, <b>ex</b>, <b>cum</b>, or nothing at all?", show: "recap" },
        { mood: "proud", say: "Solve these and all seven ablative jobs are yours. Let’s go!" }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "agent", text: "By whom?" },
          { k: "means", text: "By what?" },
          { k: "accomp", text: "With whom?" },
          { k: "manner", text: "How?" },
          { k: "time", text: "When?" },
          { k: "from", text: "From where?" },
          { k: "sep", text: "From what?" }
        ]
      },
      questions: [
        { id: "c20-final-1", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ā"), T(n("cīvibus", "sep", "cīvis", { tag: "from whom" })), n("hostēs", "acc", "hostēs"), P(v("prohibet", "prohibeō", "(he) keeps away"), ".")],
          translation: "He keeps the enemy <b>from the citizens</b>.",
          options: opts(["sep", "agent", "from", "accomp"]), answer: "sep",
          whyNot: {
            agent: "An agent needs a <b>passive</b> verb. <i>Prohibet</i> is active: he does the keeping away.",
            from: "Place from which is a <b>place</b> someone leaves. Citizens are people, and nobody moves.",
            accomp: "Accompaniment needs <i>cum</i>. Here the word is <i>Ā</i>: the enemy are kept <b>away</b>."
          },
          clues: [
            { say: "<i>Prohibet</i>, “keeps away”, is active. No passive verb, no agent.", eliminates: "agent" },
            { say: "The little word is <b>Ā</b>, not <i>cum</i>. Nobody is keeping the citizens company.", eliminates: "accomp" }
          ],
          why: "<i>Prohibeō</i>, “keep away”, takes separation, and a <b>person</b> keeps the <b>ā</b>." },
        { id: "c20-final-2", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Poēta", "nom", "poēta"), n("versūs", "acc", "versus"), CUM(), T(n("cūrā", "manner", "cūra")), P(v("scrīpsit", "scrībō", "wrote"), ".")],
          translation: "The poet wrote verses <b>with care</b>.",
          options: opts(["manner", "means", "accomp", "sep"]), answer: "manner",
          whyNot: {
            means: "Means has <b>no</b> preposition, and here <i>cum</i> stands before <i>cūrā</i>.",
            accomp: "Accompaniment is <i>cum</i> + a <b>person</b>. Care is not a person: it tells <b>how</b>.",
            sep: "Separation goes with freeing or lacking. He did not lack care: he wrote <b>with</b> it."
          },
          clues: [
            { say: "There is a <b>cum</b>, so it cannot be means: means never has one.", eliminates: "means" },
            { say: "<i>Scrīpsit</i>, “wrote”, is not a verb of freeing or lacking.", eliminates: "sep" }
          ],
          why: "<i>Cum cūrā</i> tells <b>how</b> the poet wrote: the <b>ablative of manner</b>." },
        { id: "c20-final-3", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ā"), T(n("senātū", "agent", "senātus")), S(n("populus", "nom", "populus")), P(pv("monētur", "moneō", "is warned"), ".")],
          translation: "The people are warned <b>by the senate</b>.",
          options: opts(["agent", "from", "sep", "means"]), answer: "agent",
          whyNot: {
            from: "The senate here is a group of <b>people</b>, not a place. And nobody moves away from it.",
            sep: "Separation goes with freeing or lacking. <i>Monētur</i>, “is warned”, is neither.",
            means: "Means is a <b>thing</b>, with no preposition. The senate is a group of people, after <i>Ā</i>."
          },
          clues: [
            { say: "<i>Monētur</i> ends in <b>-tur</b>: passive, “is warned”. Is warning a way of setting someone free?", eliminates: "sep" },
            { say: "<i>Senātū</i>, a fourth-declension ablative in <b>-ū</b>, comes right after <b>Ā</b>. Means never has a preposition.", eliminates: "means" }
          ],
          why: "<i>Monētur</i> is passive, and <b>ā</b> + the senate, a body of people, says who warns." },
        { id: "c20-final-4", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [EX("Ex"), T(n("agrīs", "from", "ager")), n("agricolae", "nom", "agricola"), P(v("vēnērunt", "veniō", "(they) came"), ".")],
          translation: "The farmers came <b>from the fields</b>.",
          options: opts(["from", "sep", "agent", "means"]), answer: "from",
          whyNot: {
            sep: "Separation goes with freeing or lacking. The farmers simply <b>come</b> from a place.",
            agent: "An agent needs a passive verb and a person. <i>Vēnērunt</i> is active, and fields are a place.",
            means: "Means is a tool, with no preposition. Here <i>Ex</i> stands in front of a place."
          },
          clues: [
            { say: "<i>Vēnērunt</i>, “they came”, is active. No passive verb, no agent.", eliminates: "agent" },
            { say: "<b>Ex</b> stands in front of <i>agrīs</i>. Means never has a preposition.", eliminates: "means" }
          ],
          why: "The farmers <b>move</b> out of a <b>place</b>: <i>ex agrīs</i>, “from the fields”." },
        { id: "c20-final-5", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [A(n("Paucīs", "abl", "paucī"), "hōrīs"), T(n("hōrīs", "time", "hōra")), S(n("urbs", "nom", "urbs")), v("capta", "capiō", "taken", { tag: "passive" }), P(v("est", "sum", "is (with capta: was taken)", { tag: "passive" }), ".")],
          translation: "<b>In a few hours</b> the city was taken.",
          options: opts(["time", "means", "manner", "agent"]), answer: "time",
          whyNot: {
            means: "Means is a <b>tool</b>. Hours are not a tool: they tell <b>within what time</b>.",
            manner: "An adjective and no <i>cum</i>, but manner is a <b>way</b>, like care. Hours tell <b>when</b>.",
            agent: "The agent is <i>ā</i> or <i>ab</i> + a person. <i>Hōrīs</i> has no preposition, and hours are not people."
          },
          clues: [
            { say: "There is no <b>ā</b> or <b>ab</b> here, and hours are not people.", eliminates: "agent" },
            { say: "<i>Hōra</i> means “hour”. Is an hour a tool?", eliminates: "means" }
          ],
          why: "<i>Paucīs hōrīs</i>, “within a few hours”, is a <b>time</b> phrase with no preposition." },
        { id: "c20-final-6", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Frūctum", "acc", "frūctus"), A(n("dextrā", "abl", "dexter"), "manū"), T(n("manū", "means", "manus")), P(v("capit", "capiō", "(he) takes"), ".")],
          translation: "He takes fruit <b>with his right hand</b>.",
          options: opts(["means", "manner", "sep", "from"]), answer: "means",
          whyNot: {
            manner: "An adjective and no <i>cum</i>, but a hand is not a way like care. It is a <b>tool</b>.",
            sep: "Separation goes with freeing or lacking. He does not lack a hand: he takes <b>with</b> it.",
            from: "Place from which needs a <b>place</b> and a preposition like <i>ex</i>. A hand is neither."
          },
          clues: [
            { say: "No <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i>, and a hand is not a place.", eliminates: "from" },
            { say: "<i>Capit</i>, “takes”, is not a verb of freeing or lacking.", eliminates: "sep" }
          ],
          why: "The hand is his <b>tool</b>, with no preposition. <i>Dextrā</i> is feminine, like <i>manus</i>." },
        { id: "c20-final-7", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [n("Senex", "nom", "senex"), T(n("metū", "sep", "metus")), n("mortis", "gen", "mors"), P(v("caret", "careō", "is free from, lacks"), ".")],
          translation: "The old man is free <b>from the fear</b> of death.",
          options: opts(["sep", "means", "manner", "from"]), answer: "sep",
          whyNot: {
            means: "Fear is not his tool: he is free <b>from</b> it. <i>Careō</i> takes separation.",
            manner: "Manner tells <b>how</b> someone does something, often with <i>cum</i>. He lacks fear.",
            from: "Place from which needs a <b>place</b> and a preposition like <i>ex</i>. Fear is not a place."
          },
          clues: [
            { say: "No <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i>, and fear is not a place.", eliminates: "from" },
            { say: "There is no <i>cum</i>, and no adjective goes with <i>metū</i>: it is not a way of doing something.", eliminates: "manner" }
          ],
          why: "<i>Caret</i>, “is free from”: from what? From fear, a <b>thing</b>, so no preposition." },
        { id: "c20-final-8", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [CUM("Cum"), T(n("sorōre", "accomp", "soror")), IN(), n("Italiam", "acc", "Italia", { tag: "after in" }), P(v("nāvigāvī", "nāvigō", "I sailed"), ".")],
          translation: "I sailed to Italy <b>with my sister</b>.",
          options: opts(["accomp", "agent", "manner", "from"]), answer: "accomp",
          whyNot: {
            agent: "An agent needs a <b>passive</b> verb and <i>ā</i> or <i>ab</i>. <i>Nāvigāvī</i> is active.",
            manner: "Manner is <i>cum</i> + a <b>way</b>, like care. A sister is a person who comes along.",
            from: "Place from which needs <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i> and a <b>place</b>. A sister is a person."
          },
          clues: [
            { say: "<i>Nāvigāvī</i>, “I sailed”, is active. No passive verb, no agent.", eliminates: "agent" },
            { say: "The little word is <b>Cum</b>, not <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i>. And a sister is not a place.", eliminates: "from" }
          ],
          why: "<i>Cum</i> + a person: with whom did I sail? With my sister." },
        { id: "c20-final-9", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [A(n("Eō", "abl", "is"), "annō"), T(n("annō", "time", "annus")), n("cīvēs", "nom", "cīvis"), P(v("fūgērunt", "fugiō", "(they) fled"), ".")],
          translation: "<b>In that year</b> the citizens fled.",
          options: opts(["time", "means", "from", "sep"]), answer: "time",
          whyNot: {
            means: "Means is a <b>tool</b>. A year is not a tool: it tells <b>when</b> they fled.",
            from: "Place from which needs a <b>place</b> and <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i>. A year is not a place.",
            sep: "Separation goes with freeing or lacking. Nobody is freed from a year here."
          },
          clues: [
            { say: "Is a year a place to run away from? And no <i>ā</i>/<i>ab</i>, <i>dē</i> or <i>ex</i> stands before it.", eliminates: "from" },
            { say: "<i>Annus</i> means “year”. Is a year a tool?", eliminates: "means" }
          ],
          why: "<i>Eō annō</i>, “in that year”, tells <b>when</b>, with no preposition: the <b>ablative of time when</b>." },
        { id: "c20-final-10", type: "sentence", shuffle: true, prompt: JOB_PROMPT,
          words: [AB("Ā"), T(n("portā", "from", "porta")), n("puer", "nom", "puer"), P(v("cucurrit", "currō", "(he) ran"), ".")],
          translation: "The boy ran <b>from the gate</b>.",
          options: opts(["from", "agent", "sep", "time"]), answer: "from",
          whyNot: {
            agent: "An agent needs a <b>passive</b> verb and a person. <i>Cucurrit</i> is active, and a gate is a place.",
            sep: "Separation goes with freeing or lacking. Running from a gate is <b>motion</b> from a place.",
            time: "A gate is not a time word like <i>hōra</i>. It is a place, after <i>Ā</i>."
          },
          clues: [
            { say: "<i>Cucurrit</i>, “he ran”, is active. No passive verb, no agent.", eliminates: "agent" },
            { say: "Is a gate a time, like an hour or a year?", eliminates: "time" }
          ],
          why: "The boy <b>moves</b> away from a <b>place</b>: <i>ā portā</i>, “from the gate”." }
      ]
    }
  ];

  /* ------------------------------------------------------------------ export */
  (root.CD_UNITS = root.CD_UNITS || {})["20"] = {
    chapter: 20, grade: 8,
    title: "Fourth declension; ablatives of place from which and separation",
    bookTitle: "Fourth Declension; Ablatives of Place from Which and Separation",
    jobs: JOBS,
    method: METHOD,
    charts: CHARTS,
    wordList: WORDS,
    files: FILES
  };
})(typeof window !== "undefined" ? window : this);
