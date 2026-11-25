/*!
 * Case Detective: canonical game content, version 2.
 *
 * This file is DATA ONLY. It sets window.CD_DATA and has no other effect.
 * The Latin here (forms, macrons, translations, explanations, clues) has been
 * checked by hand. Do not reword it in code. If you believe something is wrong,
 * report it instead of changing it.
 *
 * Strings named say / right / wrong / why / prompt / translation / hook may
 * contain the inline tags <b>, <i> and <u> only. Everything else is plain text.
 *
 * Shape (see SPEC.md, section "Canonical content", for the full description):
 *
 * CD_DATA = {
 *   version, storageKey,
 *   cases:   { nom|gen|dat|acc|abl|voc: { key, name, abbr, question, job, tag, color, hook } },
 *   verb:    { key:'verb', name, tag, color },
 *   declension: { word, stem, meaning, rows:[{ k, sg, pl }], sneaky:'ae' },
 *   method:  [{ title, text }],                     // the 3-step detective method
 *   ranks:   [{ min, title }],                      // by total stars, ascending
 *   starRules: [{ min, stars }],                    // share of first-try answers -> stars
 *   inspector: { name, shortName, nameNote, lines:{...} },
 *   files: [{
 *     id, n, title, blurb,
 *     briefing: [{ mood, say, show? }],             // dialogue beats, in order
 *     recap: { kind, items:[...] },                 // compact summary shown with the briefing
 *     training?: { ... },                           // guided walkthrough (file "ae" only)
 *     questions: [ Question ]
 *   }]
 * }
 *
 * Question (type 'choice'):
 *   { id, type:'choice', prompt, options:[{ k, label, sub?, latin? }], answer, shuffle, clues, why }
 * Question (type 'sentence'):
 *   { id, type:'sentence', prompt, words:[Word], translation, options:[...], answer, shuffle, clues, why }
 * Word:  { w, r, lemma, g, t?, after?, tag? }
 *   w = the form as printed, r = role key (a case key, 'verb', or null), lemma + g = dictionary
 *   form and English meaning (safe to show before answering: it never reveals the case),
 *   t = true on the highlighted target word, after = punctuation printed right after the word,
 *   tag = label to show after answering instead of the role's default tag.
 * Clue:  { say, eliminates? }   eliminates = key of one WRONG option this clue rules out.
 */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------------ cases */
  var CASES = {
    nom: { key: "nom", name: "Nominative", abbr: "Nom.", question: "Who does it?", job: "the subject", tag: "who does it", color: "#2563c9",
           hook: "It <b>names</b> the doer. From <i>nōmen</i>, “name”." },
    gen: { key: "gen", name: "Genitive", abbr: "Gen.", question: "Whose is it?", job: "possession, “of”", tag: "whose", color: "#d97a0b",
           hook: "The belonging case. Think <b>gen</b>es: whose family?" },
    dat: { key: "dat", name: "Dative", abbr: "Dat.", question: "Who receives it?", job: "the indirect object, “to” or “for”", tag: "who receives", color: "#17906a",
           hook: "The giving case. It comes from the same verb as <i>dat</i>, “gives”." },
    acc: { key: "acc", name: "Accusative", abbr: "Acc.", question: "What gets the action?", job: "the direct object", tag: "gets the action", color: "#7b3fc4",
           hook: "The verb points right at it, like an <b>acc</b>used suspect." },
    abl: { key: "abl", name: "Ablative", abbr: "Abl.", question: "By, with or from what?", job: "“by”, “with” or “from”", tag: "by / with / from", color: "#0f8aa0",
           hook: "You will investigate this one another day." },
    voc: { key: "voc", name: "Vocative", abbr: "Voc.", question: "Who is being talked to?", job: "direct address, talking straight to someone", tag: "talked to", color: "#b0399a",
           hook: "The calling case. From <i>vocō</i>, “I call”. In the chart it looks just like the nominative, so watch for <b>Ō</b> or a comma." }
  };
  var VERB = { key: "verb", name: "Verb", tag: "verb", color: "#6f667a" };

  /* ------------------------------------------------------------- vocabulary */
  var LEX = {
    "poēta": "poet", "puella": "girl", "nauta": "sailor", "rosa": "rose",
    "fāma": "fame, reputation", "patria": "country, fatherland", "vīta": "life",
    "pecūnia": "money", "magnus": "big, great"
  };

  function ext(o, extra) { if (extra) { for (var k in extra) { o[k] = extra[k]; } } return o; }
  /** noun or adjective */
  function n(form, role, lemma, extra) { return ext({ w: form, r: role, lemma: lemma, g: LEX[lemma] }, extra); }
  /** verb, with the meaning of this exact form */
  function v(form, lemma, gloss, extra) { return ext({ w: form, r: "verb", lemma: lemma, g: gloss }, extra); }
  /** mark the highlighted target word */
  function T(word) { word.t = true; return word; }
  /** punctuation printed right after the word */
  function P(word, punct) { word.after = punct; return word; }

  /* ---------------------------------------------------------------- options */
  function caseNames(keys) { return keys.map(function (k) { return { k: k, label: CASES[k].name }; }); }
  function caseJobs(keys) { return keys.map(function (k) { return { k: k, label: CASES[k].name, sub: CASES[k].question }; }); }
  function forms(list) { return list.map(function (f) { return { k: f, label: f, latin: true }; }); }
  function suspects() {
    return [
      { k: "gen", label: "Genitive singular", sub: "Whose is it?" },
      { k: "dat", label: "Dative singular", sub: "Who receives it?" },
      { k: "nom", label: "Nominative plural", sub: "Who does it? (more than one)" }
    ];
  }

  var AE_PROMPT = "What is the highlighted <b>-ae</b> word doing?";
  var CASE_PROMPT = "What case is the highlighted word?";

  /* ------------------------------------------------------------------ files */
  var FILES = [
    /* ============================ FILE 1 ============================ */
    {
      id: "jobs", n: 1, title: "Who Does What?",
      blurb: "Match each case to its job in the sentence.",
      briefing: [
        { mood: "point", say: "In a Latin sentence, every noun has a <b>job</b>. Its ending points to its <b>case</b>, and the case tells you which job." },
        { mood: "think", say: "So I question every noun like a suspect: <b>Who does it? What gets the action? Who receives it? Whose is it?</b>", show: "recap" },
        { mood: "wave", say: "And when someone is spoken to directly (<i>Ō puella!</i>), that is the vocative, the calling case." },
        { mood: "search", say: "Your first case: match each job to its case. If you get stuck, tap <b>Ask the Inspector</b>." }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "nom", text: "Who does it?" },
          { k: "acc", text: "What gets the action?" },
          { k: "dat", text: "Who receives it?" },
          { k: "gen", text: "Whose is it?" },
          { k: "voc", text: "Who is being talked to?" }
        ]
      },
      questions: [
        { id: "jobs-1", type: "choice", shuffle: true,
          prompt: "The word that tells you <b>whose</b> (“the rose <u>of the girl</u>”) is in the…",
          options: caseNames(["gen", "dat", "acc", "nom"]), answer: "gen",
          clues: [
            { say: "Listen for the detective question hiding in there: <b>whose</b> rose is it?" },
            { say: "Belonging runs in the family. Think of <b>gen</b>es: they show whose family you belong to." }
          ],
          why: "Genitive means possession. It answers <b>WHOSE?</b> English uses “of” or ’s." },
        { id: "jobs-2", type: "choice", shuffle: true,
          prompt: "The word that <b>gets the action</b> of the verb (“The poet loves <u>the girl</u>”) is in the…",
          options: caseNames(["acc", "dat", "gen", "nom"]), answer: "acc",
          clues: [
            { say: "Who does the loving? The poet. So the girl is not the doer. The love <b>lands on</b> her.", eliminates: "nom" },
            { say: "The verb points straight at her, like a detective pointing at the <b>acc</b>used." }
          ],
          why: "Accusative is the direct object: the action lands right on it. Its endings are <b>-am</b> and <b>-ās</b>." },
        { id: "jobs-3", type: "choice", shuffle: true,
          prompt: "The person you <b>talk straight to</b> (“<u>Girl</u>, come here!”) is in the…",
          options: caseNames(["voc", "nom", "dat", "acc"]), answer: "voc",
          clues: [
            { say: "The girl is not doing anything yet. She is just being <b>called</b>.", eliminates: "nom" },
            { say: "In Latin, “I call” is <i>vocō</i>. Which case name sounds like it?" }
          ],
          why: "Vocative is for direct address: talking straight to someone. You often see <b>Ō</b> with it: <i>Ō puella!</i>" },
        { id: "jobs-4", type: "choice", shuffle: true,
          prompt: "The person something is <b>given to</b> (“The poet gives roses <u>to the girl</u>”) is in the…",
          options: caseNames(["dat", "gen", "acc", "voc"]), answer: "dat",
          clues: [
            { say: "The roses are what gets given, so they get the action. The girl is the one who <b>receives</b> them.", eliminates: "acc" },
            { say: "In Latin, “he gives” is <i>dat</i>. Which case name starts with that word?" }
          ],
          why: "Dative is the indirect object. It answers <b>WHO RECEIVES IT?</b> It is the giving case: its name comes from the same verb as <i>dat</i>, “gives”." },
        { id: "jobs-5", type: "choice", shuffle: true,
          prompt: "The word that <b>does</b> the action (“<u>The sailor</u> sees the land”) is in the…",
          options: caseNames(["nom", "acc", "gen", "voc"]), answer: "nom",
          clues: [
            { say: "Ask the first detective question: <b>who does it?</b> Who is doing the seeing?" },
            { say: "In Latin, “name” is <i>nōmen</i>. Which case <b>names</b> the doer?" }
          ],
          why: "Nominative is the subject. It answers <b>WHO DOES IT?</b>" },
        { id: "jobs-6", type: "choice", shuffle: true,
          prompt: "Which question does the <b>genitive</b> answer?",
          options: [
            { k: "gen", label: "Whose is it?" },
            { k: "dat", label: "Who receives it?" },
            { k: "nom", label: "Who does it?" },
            { k: "acc", label: "What gets the action?" }
          ], answer: "gen",
          clues: [
            { say: "The genitive is the belonging case: the rose <b>of</b> the girl." },
            { say: "“Who receives it?” goes with the <b>dative</b>, the giving case. So it is not that one.", eliminates: "dat" }
          ],
          why: "Genitive: <b>whose is it?</b> “Who receives it?” is the dative’s question. Those two are easy to swap, so say them out loud." },
        { id: "jobs-7", type: "choice", shuffle: true,
          prompt: "Which question does the <b>dative</b> answer?",
          options: [
            { k: "gen", label: "Whose is it?" },
            { k: "dat", label: "Who receives it?" },
            { k: "nom", label: "Who does it?" },
            { k: "voc", label: "Who is being talked to?" }
          ], answer: "dat",
          clues: [
            { say: "Think of <i>dat</i>, “gives”. When something is given, the dative is the person on the other end." },
            { say: "“Whose is it?” belongs to the <b>genitive</b>, the belonging case. So it is not that one.", eliminates: "gen" }
          ],
          why: "Dative: <b>who receives it?</b> Look for it in sentences with a giving verb like <i>dat</i>. Being talked to is a different job: that is the vocative." },
        { id: "jobs-8", type: "choice", shuffle: true,
          prompt: "<i>Ō poēta!</i> What is <b>poēta</b> doing here?",
          options: [
            { k: "voc", label: "Being talked to", sub: "Vocative" },
            { k: "acc", label: "Getting the action", sub: "Accusative" },
            { k: "gen", label: "Owning something", sub: "Genitive" }
          ], answer: "voc",
          clues: [
            { say: "There is no verb at all here, so nothing can get the action. Just <b>Ō</b> and a noun.", eliminates: "acc" },
            { say: "<b>Ō</b> is what you say when you call out to someone." }
          ],
          why: "“O poet!” Somebody is speaking directly to the poet, so it is vocative." }
      ]
    },

    /* ============================ FILE 2 ============================ */
    {
      id: "endings", n: 2, title: "Ending Lab",
      blurb: "Pick the right form: puellārum or puellās?",
      briefing: [
        { mood: "search", say: "Welcome to the lab! Endings are a detective’s fingerprints: each one points to a case." },
        { mood: "point", say: "Two plural endings love to swap disguises. <b>-ārum</b> means “of the …s”: <i>puellārum</i>, of the girls. Long ending, lots of owners.", show: "recap" },
        { mood: "point", say: "<b>-ās</b> is the direct object, plural. One girl <i>puellam</i>, many girls <i>puellās</i>: the m of <b>-am</b> becomes an s." },
        { mood: "wave", say: "The whole chart is in your <b>Notebook</b> whenever you need it. Let’s test some fingerprints." }
      ],
      recap: {
        kind: "endings",
        items: [
          { ending: "-ārum", k: "gen", number: "plural", example: "puellārum", meaning: "of the girls", hook: "Long ending, lots of owners." },
          { ending: "-ās", k: "acc", number: "plural", example: "puellās", meaning: "the girls (direct object)", hook: "From m to s: puellam, puellās." }
        ]
      },
      questions: [
        { id: "end-1", type: "choice", shuffle: true,
          prompt: "How do you say “<b>of the girls</b>”?",
          options: forms(["puellārum", "puellās", "puellīs", "puellae"]), answer: "puellārum",
          clues: [
            { say: "“Of” means <b>whose</b>, and whose means genitive. And “girls” is plural." },
            { say: "<b>-ās</b> is the direct object’s ending, and nothing gets an action here. Look for the longest ending in the chart.", eliminates: "puellās" }
          ],
          why: "<b>puellārum</b> is genitive plural. “Of” means whose, and whose means genitive. “Girls” is plural, so the ending is <b>-ārum</b>." },
        { id: "end-2", type: "choice", shuffle: true,
          prompt: "“The poet loves <u>the girls</u>.” Which form is “the girls”?",
          options: forms(["puellās", "puellārum", "puellae", "puellam"]), answer: "puellās",
          clues: [
            { say: "Who does the loving? The poet. The girls <b>get</b> the love, so they are the direct object." },
            { say: "<i>Puellārum</i> means “of the girls”, and nobody owns anything here. One girl would be <i>puellam</i>. For many girls, the m becomes an s.", eliminates: "puellārum" }
          ],
          why: "The girls get the loving, so they are the direct object: accusative plural <b>puellās</b>." },
        { id: "end-3", type: "choice", shuffle: true,
          prompt: "“<u>The girls</u> love roses.” Which form is “the girls”?",
          options: forms(["puellae", "puellās", "puellārum", "puellīs"]), answer: "puellae",
          clues: [
            { say: "Who does the loving this time? The girls do. They are the subject." },
            { say: "<b>-ās</b> is for girls who <b>get</b> the action. These girls are <b>doing</b> it, so they need the nominative plural.", eliminates: "puellās" }
          ],
          why: "Here the girls DO the loving, so they are the subject: nominative plural <b>puellae</b>." },
        { id: "end-4", type: "choice", shuffle: true,
          prompt: "“The poet gives roses <u>to the girls</u>.” Which form?",
          options: forms(["puellīs", "puellās", "puellārum", "puellae"]), answer: "puellīs",
          clues: [
            { say: "The roses get given. The girls <b>receive</b> them. Which case is the receiver?" },
            { say: "The receiver is dative, and “girls” is plural. <b>-ās</b> would make the girls the thing being given!", eliminates: "puellās" }
          ],
          why: "The girls receive the roses, so it is dative plural: <b>puellīs</b>. Dative <i>puellae</i> would be just one girl." },
        { id: "end-5", type: "choice", shuffle: true,
          prompt: "How do you say “<b>of the sailors</b>”?",
          options: forms(["nautārum", "nautās", "nautīs", "nautam"]), answer: "nautārum",
          clues: [
            { say: "“Of” again! Whose? That is genitive, and “sailors” is plural." },
            { say: "<b>-am</b> is for just one sailor getting the action. You need the same long ending as <i>puellārum</i>.", eliminates: "nautam" }
          ],
          why: "“Of” means genitive, and the genitive plural is <b>-ārum</b>: <b>nautārum</b>." },
        { id: "end-6", type: "choice", shuffle: true,
          prompt: "“The sailors see <u>the roses</u>.” Which form is “the roses”?",
          options: forms(["rosās", "rosārum", "rosae", "rosam"]), answer: "rosās",
          clues: [
            { say: "The roses are not doing anything. They are what gets <b>seen</b>." },
            { say: "<i>Rosam</i> is just <b>one</b> rose getting the action. For many roses, the m becomes an s.", eliminates: "rosam" }
          ],
          why: "The roses are what gets seen: direct object, plural, so accusative <b>rosās</b>." },
        { id: "end-7", type: "choice", shuffle: true,
          prompt: "Which one is <b>accusative plural</b>?",
          options: forms(["patriās", "patriārum", "patriae", "patriam"]), answer: "patriās",
          clues: [
            { say: "<b>-ārum</b> is taken: that is the genitive plural, “of the …s”.", eliminates: "patriārum" },
            { say: "Accusative singular is <b>-am</b>. For the plural, the m becomes an s." }
          ],
          why: "<b>-ās</b> is accusative plural. (<i>-ārum</i> is genitive plural and <i>-am</i> is accusative singular.)" },
        { id: "end-8", type: "choice", shuffle: true,
          prompt: "Which one is <b>genitive plural</b>?",
          options: forms(["poētārum", "poētās", "poētīs", "poētae"]), answer: "poētārum",
          clues: [
            { say: "Genitive plural means “of the poets”. It has the longest ending in the chart." },
            { say: "<b>-ās</b> is taken: that is the accusative plural, the direct object.", eliminates: "poētās" }
          ],
          why: "<b>-ārum</b> is genitive plural: <b>poētārum</b>, “of the poets”." }
      ]
    },

    /* ============================ FILE 3 ============================ */
    {
      id: "ae", n: 3, title: "The -ae Mystery",
      blurb: "One ending, three suspects. Use the sentence to crack it.",
      briefing: [
        { mood: "think", say: "This is the big one, detective. The ending <b>-ae</b> is a master of disguise." },
        { mood: "point", say: "<i>Puellae</i> could be three different suspects: <b>genitive</b> (of the girl), <b>dative</b> (to the girl) or <b>nominative plural</b> (the girls).", show: "recap" },
        { mood: "search", say: "The ending alone cannot tell you. The <b>rest of the sentence</b> gives it away. Watch my method on a training case." }
      ],
      recap: {
        kind: "suspects",
        items: [
          { k: "gen", label: "Genitive singular", meaning: "of the girl", text: "Whose is it?" },
          { k: "dat", label: "Dative singular", meaning: "to the girl", text: "Who receives it?" },
          { k: "nom", label: "Nominative plural", meaning: "the girls", text: "Who does it?" }
        ]
      },
      training: {
        id: "ae-training",
        title: "Training case: the sneaky -ae",
        words: [
          n("Puella", "nom", "puella"),
          T(n("nautae", "dat", "nauta")),
          n("rosam", "acc", "rosa"),
          P(v("dat", "dō", "gives"), ".")
        ],
        translation: "The girl gives a rose <b>to the sailor</b>.",
        suspects: suspects(),
        steps: [
          { id: "meet", kind: "say", mood: "point",
            say: "Our mystery word is <b>nautae</b>. That -ae ending has three suspects: <b>genitive</b> (of the sailor), <b>dative</b> (to the sailor) or <b>nominative plural</b> (the sailors). Let’s find out which." },
          { id: "verb", kind: "tap", mood: "search", target: 3, reveal: [3],
            say: "Rule one: <b>find the verb first.</b> Tap the verb in the sentence.",
            right: "<b>dat</b>, “gives”. Good eye!",
            wrong: "That one is a noun. The verb is the action word, and in Latin it usually comes last." },
          { id: "number", kind: "pick", mood: "think", eliminates: "nom",
            say: "<i>Dat</i> ends in <b>-t</b>, not <b>-nt</b>. So how many people are giving?",
            choices: [{ label: "Just one", correct: true }, { label: "More than one" }],
            right: "Just one. So the doer is singular, and “the sailors” cannot be doing it. One suspect ruled out!",
            wrong: "<b>-nt</b> would mean many, like <i>dant</i>. Plain <b>-t</b> means just one." },
          { id: "doer", kind: "tap", mood: "point", target: 0, reveal: [0],
            say: "So who does it? Tap the one who gives.",
            right: "<b>Puella</b>, the girl. She is the doer: nominative.",
            wrong: "Look for the plain <b>-a</b> ending. That is the nominative singular." },
          { id: "object", kind: "tap", mood: "search", target: 2, reveal: [2],
            say: "What gets given? Tap it.",
            right: "<b>rosam</b>, a rose. The -am ending marks what gets the action: accusative.",
            wrong: "Look for the <b>-am</b> ending. That is what gets the action." },
          { id: "receiver", kind: "pick", mood: "think", eliminates: "gen",
            say: "Now the key question. Giving needs someone to <b>receive</b>. Is anyone besides <i>nautae</i> left to receive the rose?",
            choices: [{ label: "No, nobody else", correct: true }, { label: "Yes, someone else" }],
            right: "Exactly. If <i>nautae</i> only meant “the sailor’s”, nobody would get the rose. Another suspect ruled out!",
            wrong: "Check again: the girl gives, the rose is given, and <i>dat</i> is the verb. Every other word already has a job." },
          { id: "verdict", kind: "answer", mood: "proud", answer: "dat", reveal: [1],
            say: "Only one suspect is left. What is <b>nautae</b> doing?",
            right: "Case closed! <b>nautae</b> is dative: the girl gives a rose <b>to the sailor</b>.",
            wrong: "That suspect has been ruled out. Pick the one still standing." }
        ],
        outro: { mood: "proud", say: "That is my whole method: find the verb, look for a receiver, and if every job is taken, the -ae word tells you <b>whose</b>. Now you try. I am right here if you need a clue." }
      },
      questions: [
        { id: "ae-1", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [n("Poēta", "nom", "poēta"), T(n("puellae", "dat", "puella")), n("magnās", "acc", "magnus", { tag: "describes rosās" }), n("rosās", "acc", "rosa"), P(v("dat", "dō", "gives"), ".")],
          translation: "The poet gives big roses <b>to the girl</b>.",
          options: suspects(), answer: "dat",
          clues: [
            { say: "Start with the verb: <b>dat</b>. It ends in -t, not -nt, so only <b>one</b> person is giving. A plural subject is impossible.", eliminates: "nom" },
            { say: "<i>Dat</i> means “gives”, and giving needs a receiver. Is any other word left to receive the roses?" }
          ],
          why: "<i>Dat</i> is singular, so just one person gives: the poet, not “the girls”. Giving needs a receiver. If <b>puellae</b> meant “the girl’s”, nobody would get the roses. So it is dative." },
        { id: "ae-2", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [n("Puellae", "nom", "puella"), n("nautīs", "dat", "nauta"), n("rosās", "acc", "rosa"), T(n("poētae", "gen", "poēta")), P(v("dant", "dō", "(they) give"), ".")],
          translation: "The girls give <b>the poet’s</b> roses to the sailors.",
          options: suspects(), answer: "gen",
          clues: [
            { say: "The verb is <b>dant</b>, “they give”. Who gives? <i>Puellae</i>, at the front. So the doer’s job is already taken.", eliminates: "nom" },
            { say: "Who receives? <b>nautīs</b>, “to the sailors”. That job is taken too. What is left for <i>poētae</i>?" }
          ],
          why: "Who does it? <i>Puellae</i>, because <i>dant</i> is plural and the subject usually comes first. Who receives? <i>Nautīs</i>. Those jobs are taken, so <b>poētae</b> tells us WHOSE roses: genitive." },
        { id: "ae-3", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [T(n("Puellae", "nom", "puella")), n("nautīs", "dat", "nauta"), n("rosās", "acc", "rosa"), n("poētae", "gen", "poēta"), P(v("dant", "dō", "(they) give"), ".")],
          translation: "<b>The girls</b> give the poet’s roses to the sailors.",
          options: suspects(), answer: "nom",
          clues: [
            { say: "Look at the verb’s ending: da<b>nt</b>. That -nt means <b>more than one</b> person is giving." },
            { say: "A plural verb needs a plural subject, and the subject usually comes first. The receiver’s job already belongs to <i>nautīs</i>.", eliminates: "dat" }
          ],
          why: "<i>Dant</i> ends in -nt, so more than one person is giving. The subject usually comes first: <b>Puellae</b>, nominative plural. The receiver is <i>nautīs</i>." },
        { id: "ae-4", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [n("Fāma", "nom", "fāma"), T(n("puellae", "gen", "puella")), v("est", "est", "is"), P(n("magna", "nom", "magnus", { tag: "describes fāma" }), ".")],
          translation: "The fame <b>of the girl</b> is great.",
          options: suspects(), answer: "gen",
          clues: [
            { say: "The verb is <b>est</b>, “is”. It is singular, so there is no plural subject here.", eliminates: "nom" },
            { say: "Nobody is giving anything, so nobody receives. Ask instead: <b>whose</b> fame?" }
          ],
          why: "No giving, so no receiver. <i>Est</i> is singular, so no plural subject. The fame belongs to the girl: genitive." },
        { id: "ae-5", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [T(n("Nautae", "nom", "nauta")), n("patriam", "acc", "patria"), P(v("amant", "amō", "(they) love"), ".")],
          translation: "<b>The sailors</b> love their country.",
          options: suspects(), answer: "nom",
          clues: [
            { say: "Look at the verb’s ending: ama<b>nt</b>. More than one person is doing the loving." },
            { say: "<i>Patriam</i> ends in -am, so it gets the action. And loving is not giving, so nobody receives anything.", eliminates: "dat" }
          ],
          why: "<i>Amant</i> is plural (-nt), so look for a plural subject. <b>Nautae</b>, the sailors: nominative plural." },
        { id: "ae-6", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [n("Nauta", "nom", "nauta"), T(n("puellae", "dat", "puella")), n("rosam", "acc", "rosa"), P(v("dat", "dō", "gives"), ".")],
          translation: "The sailor gives a rose <b>to the girl</b>.",
          options: suspects(), answer: "dat",
          clues: [
            { say: "The verb is <b>dat</b>: one person gives, and that is <i>nauta</i>. So <i>puellae</i> cannot be the doer.", eliminates: "nom" },
            { say: "The rose, <i>rosam</i>, is what gets given. Giving needs a receiver. Who gets the rose?" }
          ],
          why: "Who gives? <i>Nauta</i>. What? <i>Rosam</i>. Who receives it? <b>Puellae</b>: dative. If it only meant “the girl’s”, nobody would get the rose." },
        { id: "ae-7", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [n("Poēta", "nom", "poēta"), n("vītam", "acc", "vīta"), T(n("puellae", "gen", "puella")), P(v("laudat", "laudō", "praises"), ".")],
          translation: "The poet praises the life <b>of the girl</b>.",
          options: suspects(), answer: "gen",
          clues: [
            { say: "The verb is <b>laudat</b>, “praises”. It is singular, and the poet is the one doing it.", eliminates: "nom" },
            { say: "Praising is not giving: nothing is handed to anyone, so there is no receiver. Ask: <b>whose</b> life?" }
          ],
          why: "Praising has no receiver, and <i>laudat</i> is singular. The life belongs to the girl, so <b>puellae</b> is WHOSE: genitive." },
        { id: "ae-8", type: "sentence", shuffle: false, prompt: AE_PROMPT,
          words: [T(n("Puellae", "nom", "puella")), n("poētam", "acc", "poēta"), P(v("laudant", "laudō", "(they) praise"), ".")],
          translation: "<b>The girls</b> praise the poet.",
          options: suspects(), answer: "nom",
          clues: [
            { say: "Look at the verb’s ending: lauda<b>nt</b>. More than one person is praising." },
            { say: "<i>Poētam</i> ends in -am: he gets the praise. Nothing is being given, so nobody receives. Who is left to do the praising?", eliminates: "dat" }
          ],
          why: "<i>Laudant</i> is plural, and <i>poētam</i> is the direct object (-am). So <b>puellae</b> must be doing it: nominative plural." }
      ]
    },

    /* ============================ FILE 4 ============================ */
    {
      id: "final", n: 4, title: "Final Case Files",
      blurb: "Any case can turn up. Read the whole sentence first.",
      briefing: [
        { mood: "wave", say: "Last file, detective. This time <b>any</b> case can turn up." },
        { mood: "think", say: "Use the whole method. Find the verb first, then ask the five detective questions about the highlighted word.", show: "recap" },
        { mood: "proud", say: "Solve this one and the case is closed for good. Let’s go!" }
      ],
      recap: {
        kind: "questions",
        items: [
          { k: "nom", text: "Who does it?" },
          { k: "acc", text: "What gets the action?" },
          { k: "dat", text: "Who receives it?" },
          { k: "gen", text: "Whose is it?" },
          { k: "voc", text: "Who is being talked to?" }
        ]
      },
      questions: [
        { id: "fin-1", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [{ w: "Ō", r: null, lemma: "ō", g: "O! (calling out to someone)" }, P(T(n("puella", "voc", "puella")), ","), n("patriam", "acc", "patria"), P(v("servā", "servō", "save! (an order)"), "!")],
          translation: "<b>O girl</b>, save your country!",
          options: caseJobs(["voc", "nom", "acc", "gen"]), answer: "voc",
          clues: [
            { say: "Spot the <b>Ō</b> and the comma. Someone is being called." },
            { say: "<i>Patriam</i> ends in -am, so the country is what gets saved. The girl is the one being told to save it.", eliminates: "acc" }
          ],
          why: "Someone is speaking straight to the girl, so <b>puella</b> is vocative. It looks just like the nominative, so the ending cannot tell you. <b>Ō</b> plus a comma is the big clue." },
        { id: "fin-2", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [n("Poēta", "nom", "poēta"), n("fāmam", "acc", "fāma"), T(n("puellārum", "gen", "puella")), P(v("laudat", "laudō", "praises"), ".")],
          translation: "The poet praises the fame <b>of the girls</b>.",
          options: caseJobs(["gen", "acc", "dat", "nom"]), answer: "gen",
          clues: [
            { say: "Look at the ending: <b>-ārum</b>. Only one case in the whole chart has that ending." },
            { say: "<b>-ārum</b> means “of the …s”. The word that gets the praise is <i>fāmam</i>, with its -am.", eliminates: "acc" }
          ],
          why: "<b>-ārum</b> is always genitive plural. Whose fame? The girls’." },
        { id: "fin-3", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [n("Nautae", "nom", "nauta"), T(n("puellās", "acc", "puella")), P(v("vident", "videō", "(they) see"), ".")],
          translation: "The sailors see <b>the girls</b>.",
          options: caseJobs(["acc", "gen", "nom", "dat"]), answer: "acc",
          clues: [
            { say: "The verb is <b>vident</b>, “they see”. The sailors, <i>nautae</i>, do the seeing, so the doer’s job is taken.", eliminates: "nom" },
            { say: "<b>-ās</b> is the plural of <b>-am</b>. Who gets seen?" }
          ],
          why: "<b>-ās</b> is accusative plural. The girls are what gets seen: direct object." },
        { id: "fin-4", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [n("Puella", "nom", "puella"), T(n("poētīs", "dat", "poēta")), n("rosās", "acc", "rosa"), P(v("dat", "dō", "gives"), ".")],
          translation: "The girl gives roses <b>to the poets</b>.",
          options: caseJobs(["dat", "acc", "gen", "nom"]), answer: "dat",
          clues: [
            { say: "<b>Dat</b> is a giving verb. The girl gives, so the doer’s job is taken. The roses, <i>rosās</i>, get given.", eliminates: "nom" },
            { say: "Giving needs a receiver. Who gets the roses?" }
          ],
          why: "The poets receive the roses, so <b>poētīs</b> is dative (plural)." },
        { id: "fin-5", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [n("Puella", "nom", "puella"), T(n("rosam", "acc", "rosa")), P(v("amat", "amō", "loves"), ".")],
          translation: "The girl loves <b>the rose</b>.",
          options: caseJobs(["acc", "nom", "gen", "dat"]), answer: "acc",
          clues: [
            { say: "Who does the loving? <i>Puella</i>, so the doer’s job is taken. What does the love land on?", eliminates: "nom" },
            { say: "<b>-am</b> is the sign of the word that gets the action." }
          ],
          why: "<b>-am</b> is accusative singular. The rose gets the action: direct object." },
        { id: "fin-6", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [n("Poētae", "nom", "poēta"), n("fāmam", "acc", "fāma"), T(n("patriae", "gen", "patria")), P(v("laudant", "laudō", "(they) praise"), ".")],
          translation: "The poets praise the fame <b>of their country</b>.",
          options: caseJobs(["gen", "dat", "nom", "acc"]), answer: "gen",
          clues: [
            { say: "The verb is <b>laudant</b>, “they praise”. The subject usually comes first, so the doers are <i>poētae</i>. And <i>fāmam</i> gets the praise.", eliminates: "nom" },
            { say: "Praising is not giving, so there is no receiver. Ask: <b>whose</b> fame?", eliminates: "dat" }
          ],
          why: "<i>Laudant</i> is plural, and the subject usually comes first: <i>Poētae</i>. Nothing is given, so no dative. <b>Patriae</b> tells whose fame: genitive." },
        { id: "fin-7", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [n("Nauta", "nom", "nauta"), T(n("poētae", "dat", "poēta")), n("pecūniam", "acc", "pecūnia"), P(v("dat", "dō", "gives"), ".")],
          translation: "The sailor gives money <b>to the poet</b>.",
          options: caseJobs(["dat", "gen", "nom", "acc"]), answer: "dat",
          clues: [
            { say: "The verb is <b>dat</b>: one person gives, and that is <i>nauta</i>. So <i>poētae</i> cannot be the doer.", eliminates: "nom" },
            { say: "The money, <i>pecūniam</i>, gets given. Giving needs a receiver. Who gets the money?" }
          ],
          why: "Giving needs a receiver. <i>Nauta</i> gives, <i>pecūniam</i> is given, and <b>poētae</b> receives it: dative." },
        { id: "fin-8", type: "sentence", shuffle: true, prompt: CASE_PROMPT,
          words: [T(n("Puellae", "nom", "puella")), n("poētīs", "dat", "poēta"), n("rosās", "acc", "rosa"), P(v("dant", "dō", "(they) give"), ".")],
          translation: "<b>The girls</b> give roses to the poets.",
          options: caseJobs(["nom", "gen", "dat", "voc"]), answer: "nom",
          clues: [
            { say: "Look at the verb’s ending: da<b>nt</b>. More than one person gives." },
            { say: "No <b>Ō</b> and no comma, so nobody is being called. A plural verb needs a plural subject, and only <i>Puellae</i> can be one here.", eliminates: "voc" }
          ],
          why: "<i>Dant</i> is plural, so we need a plural subject, and only <b>Puellae</b> can be one. The poets, <i>poētīs</i>, receive the roses." }
      ]
    }
  ];

  /* -------------------------------------------------------------- inspector */
  var INSPECTOR = {
    name: "Inspector Cāsus",
    shortName: "the Inspector",
    nameNote: "Cāsus (say “KAH-soos”) is the Latin word for a grammar “case”.",
    lines: {
      /* home screen; placeholders: {stars} {nextTitle} {nextN} {rank} */
      homeFirst: [
        "Welcome, detective! I am <b>Inspector Cāsus</b>. My name is Latin for “case”, and cases are my specialty.",
        "Latin nouns hide their jobs behind their endings. Four case files are waiting on my desk. Shall we open the first?"
      ],
      homeBack: [
        "Welcome back, detective. You have {stars} of 12 stars so far.",
        "File {nextN}, “{nextTitle}”, is waiting on my desk."
      ],
      homeDone: [
        "Every file solved! You have earned the rank of <b>{rank}</b>.",
        "Replay any file to keep your skills sharp."
      ],
      /* during play */
      correct: ["Case closed!", "Elementary, my dear detective!", "<i>Optimē!</i> Excellent!", "<i>Bene!</i> Well done!", "Sharp eyes, detective!", "<i>Rēctē!</i> Correct!", "A brilliant deduction!"],
      wrong: ["Not quite, detective.", "A false lead!", "Hmm, the clues point elsewhere.", "Close, but that suspect has an alibi."],
      retryNote: "This one will come back for a second look.",
      secondChance: ["This one slipped away earlier. Let’s catch it now.", "A second look at one that got away."],
      streak: { "3": "Three in a row! You are on the trail.", "5": "Five in a row! Nothing escapes you.", "8": "A perfect run! Remarkable." },
      clueButton: "Ask the Inspector",
      clueButtonMore: "Another clue",
      noMoreClues: "That is every clue I have. Trust your method!",
      eliminated: "Ruled out",
      glossHint: "Tap any word to see what it means.",
      /* results; keyed by stars */
      results: {
        "3": "A perfect investigation! Every answer right on the first try.",
        "2": "Case closed. Fine detective work!",
        "1": "We cracked part of it. One more look will close the case.",
        "0": "This case is still open. Read my notes below, then try again. Every detective needs a second look."
      },
      stamp: { closed: "CASE CLOSED", open: "CASE STILL OPEN" },
      solo: "Solved without a single clue!",
      rankUp: "Promotion! You are now a <b>{rank}</b>.",
      practiceDone: { all: "All fixed! Those answers are yours now.", some: "Getting closer. One more round will do it." }
    }
  };

  /* ------------------------------------------------------------------ export */
  root.CD_DATA = {
    version: 2,
    storageKey: "caseDetective.v1",
    cases: CASES,
    verb: VERB,
    declension: {
      word: "puella", stem: "puell", meaning: "girl", sneaky: "ae",
      rows: [
        { k: "nom", sg: "a", pl: "ae" },
        { k: "gen", sg: "ae", pl: "ārum" },
        { k: "dat", sg: "ae", pl: "īs" },
        { k: "acc", sg: "am", pl: "ās" },
        { k: "abl", sg: "ā", pl: "īs" },
        { k: "voc", sg: "a", pl: "ae" }
      ]
    },
    method: [
      { title: "Find the verb", text: "Ends in -t? One doer. Ends in -nt? Many doers, so look for a plural subject. It usually comes first." },
      { title: "Giving verb?", text: "If the verb is dat or dant, someone receives. That is the dative." },
      { title: "Jobs all taken?", text: "Then the -ae word tells you whose. That is the genitive." }
    ],
    ranks: [
      { min: 0, title: "Rookie" },
      { min: 3, title: "Junior Detective" },
      { min: 6, title: "Detective" },
      { min: 9, title: "Senior Detective" },
      { min: 12, title: "Master Detective" }
    ],
    starRules: [
      { min: 1, stars: 3 },
      { min: 0.75, stars: 2 },
      { min: 0.5, stars: 1 },
      { min: 0, stars: 0 }
    ],
    inspector: INSPECTOR,
    files: FILES
  };
})(typeof window !== "undefined" ? window : this);
