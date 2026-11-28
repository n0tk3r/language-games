/* Case Detective: the courses (window.CD_COURSES).
 *
 * Data only, read by game.js: the Latin course of each grade, the chapter of each month, the chapters of
 * Wheelock's Latin, which chapters have case files, the colors of the jobs that units add, the colors of the
 * players' badges, and what the Inspector says while a player is set up.
 *
 * grades[]   { grade, course, first, last, soon, months, start }
 *            first..last: the chapters of the grade's course, its own. A player of the grade may also be on an
 *            earlier chapter (from chapter 1), for a class still on one of them: the casebook then follows the course
 *            whose chapters hold it (LatinPlayers.courseOf), which may be a grade still to come (chapter 15:
 *            Latin IB). New players and a new grade start on the grade's own chapter of the month.
 *            soon: shown on the grade step, not selectable yet.
 *            months: the chapter of each month on Hillsdale's year plan, January first (June and July hold
 *            the grade's last chapter). With no months, start is the chapter a new player begins on.
 * chapters   { "N": { title, short } }  title: Wheelock's own chapter title, as in the vocabulary file
 *            (curriculum/wheelock-vocabulary-by-grade.json). short: the game's short name of the chapter
 *            (may hold <i> for Latin).
 * units[]    { chapter, grade, src }  the chapters that have case files, in book order. src: the unit's data
 *            file, which sets window.CD_UNITS["<chapter>"] (see js/units/). No src: built in (CD_DATA, chapter 2).
 *            A casebook holds the units of the course of the player's chapter (by their chapter), up to it.
 *            The “Every noun” file is not listed here: the game adds one to every chapter of that course, from
 *            its first chapter up to the player's chapter (js/noundrill.js with the nouns of js/nouns.js), as
 *            the last file of a chapter that has case files and as the only file of a chapter that has none yet.
 * jobColors  { key: { color, ink, tint } }  the colors of the job keys that units add to the six cases and the
 *            verb. color: stripes, borders and chips; ink: text on parchment and on the tint; tint: pale fill
 *            behind a label. White text on color and on ink is 4.5:1 or better, and so is the ink on parchment
 *            and on the tint. A job key with no entry here takes jobFallback: the colors of the case its job
 *            belongs to ("of" in the unit), or, with no case, the sepia of jobFallback.none.
 * playerColors  the round badges of the players: clearly different from each other, no purple, a white
 *            letter on each 4.5:1 or better (tests/grades/colors-check.js checks these colors and jobColors).
 *            A new player gets the first color that no other player has.
 * ranksAbove [{ min, title }]  the ranks above the five of data.js (Rookie at 0 stars to Master Detective at
 *            12), ascending, each mark above the one before it. A rank counts every star the player has won in
 *            Case Detective, in any chapter or course, so a child never goes down a rank. The titles are police
 *            ranks of the 1890s, the Inspector's own among them. They show on home (the rank and "N more stars
 *            to ..."), in the gold box of a promotion (lines.rankUp) and in his line on a casebook with every
 *            file solved ("the rank of ...").
 * lines      what the Inspector says on the start screen and in the steps that set up a player
 *            ({name} is the player's name). home: his lines on a player's home when the casebook holds more
 *            than the four files of chapter 2, as every casebook does with the noun drill ({count}, {files}:
 *            “case files are”, or “case file is” for one file, and for a casebook of “Every noun” files alone,
 *            from a course with no case files yet, “‘Every noun’ files are” or “‘Every noun’ file is”;
 *            {theFirst}: “the first”, or “it” for a casebook of one file; {stars}, {max}, {nextCh}, {nextN},
 *            {nextTitle}, {rank}); a casebook of the four files of chapter 2 alone
 *            (the game without the drill) keeps the lines of data.js. home.failed: when no file of the
 *            casebook could be opened ({chapters}).
 *            arrive: his first line on the casebook when the player comes back from the games' home page,
 *            where the players are chosen (added: a new player; met: a new player he has just met on the
 *            home page, where he introduced himself already; chapter: the chapter changed; picked: a player
 *            chosen; {name}, {chapter}). claim: the stars of a save of version 2.1, which has no player: ask,
 *            and his answer to yes and to no ({name}, {stars}: “6 stars”, “1 star”). rankUp: the promotion
 *            ({a}: “a” or “an”, {rank}), in place of the line of data.js, which has “a” only.
 */
window.CD_COURSES = {
  version: 1,

  grades: [
    { grade: 6, course: "Latin IA", first: 1, last: 8, soon: false, months: [4, 5, 6, 7, 8, 8, 8, 1, 1, 1, 2, 3] },
    { grade: 7, course: "Latin IB", first: 9, last: 17, soon: true, months: [12, 13, 14, 15, 17, 17, 17, 9, 9, 9, 10, 11] },
    { grade: 8, course: "Latin II", first: 18, last: 27, soon: false, months: [23, 24, 25, 26, 27, 27, 27, 18, 18, 20, 21, 22] },
    { grade: 9, course: "Latin III", first: 28, last: 40, soon: true, months: null, start: 28 }
  ],

  chapters: {
    "1": { title: "Verbs; First and Second Conjugations; Adverbs; Reading and Translating", short: "Verbs: first and second conjugations" },
    "2": { title: "First Declension Nouns and Adjectives; Prepositions, Conjunctions, Interjections", short: "First declension: <i>porta</i>" },
    "3": { title: "Second Declension Masculine Nouns and Adjectives; Apposition; Word Order", short: "Second declension: masculine" },
    "4": { title: "Second Declension Neuters; Adjectives; Present of Sum; Predicate Nominatives; Substantives", short: "Second declension neuters; <i>sum</i>" },
    "5": { title: "First and Second Conjugations: Future and Imperfect; Adjectives in -er", short: "Future and imperfect" },
    "6": { title: "Sum and Possum; Complementary Infinitive", short: "<i>Sum</i> and <i>possum</i>" },
    "7": { title: "Third Declension Nouns", short: "Third declension nouns" },
    "8": { title: "Third Conjugation: Present System", short: "Third conjugation" },
    "9": { title: "Demonstratives Hic, Ille, Iste; Special -īus Adjectives", short: "<i>Hic</i>, <i>ille</i>, <i>iste</i>" },
    "10": { title: "Fourth Conjugation and -iō Verbs of the Third", short: "Fourth conjugation" },
    "11": { title: "Personal Pronouns Ego, Tū, and Is; Demonstratives Is and Īdem", short: "Personal pronouns" },
    "12": { title: "The Perfect Active System; Synopsis", short: "The perfect active" },
    "13": { title: "Reflexive Pronouns and Possessives; Intensive Pronoun", short: "Reflexives; <i>ipse</i>" },
    "14": { title: "I-Stem Nouns of the Third Declension; Ablatives of Means, Accompaniment, and Manner", short: "I-stems; ablatives of means, manner, accompaniment" },
    "15": { title: "Numerals; Genitive of the Whole; Ablative with Numerals and Ablative of Time", short: "Numerals; ablative of time" },
    "16": { title: "Third Declension Adjectives", short: "Third declension adjectives" },
    "17": { title: "The Relative Pronoun", short: "The relative pronoun" },
    "18": { title: "First and Second Conjugations: Present System Passive; Ablative of Agent", short: "Present passive; ablative of agent" },
    "19": { title: "Perfect Passive System; Interrogative Pronouns and Adjectives", short: "Perfect passive; interrogatives" },
    "20": { title: "Fourth Declension; Ablatives of Place from Which and Separation", short: "Fourth declension; ablatives of place from which and separation" },
    "21": { title: "Third and Fourth Conjugations: Present System Passive", short: "Present passive: third and fourth conjugations" },
    "22": { title: "Fifth Declension; Ablative of Place Where and Summary of Ablative Uses", short: "Fifth declension; ablative of place where" },
    "23": { title: "Participles", short: "Participles" },
    "24": { title: "Ablative Absolute; Passive Periphrastic; Dative of Agent", short: "Ablative absolute" },
    "25": { title: "Infinitives; Indirect Statement", short: "Infinitives; indirect statement" },
    "26": { title: "Comparison of Adjectives; Ablative of Comparison", short: "Comparison of adjectives" },
    "27": { title: "Irregular Comparison of Adjectives", short: "Irregular comparison" },
    "28": { title: "Subjunctive Mood; Present Subjunctive; Jussive and Purpose Clauses", short: "Present subjunctive; purpose clauses" },
    "29": { title: "Imperfect Subjunctive; Present and Imperfect Subjunctive of Sum and Possum; Result Clauses", short: "Imperfect subjunctive; result clauses" },
    "30": { title: "Perfect and Pluperfect Subjunctive; Indirect Questions; Sequence of Tenses", short: "Indirect questions" },
    "31": { title: "Cum Clauses; Ferō", short: "<i>Cum</i> clauses; <i>ferō</i>" },
    "32": { title: "Formation and Comparison of Adverbs; Volō, Mālō, Nōlō; Proviso Clauses", short: "Adverbs; <i>volō</i>, <i>mālō</i>, <i>nōlō</i>" },
    "33": { title: "Conditions", short: "Conditions" },
    "34": { title: "Deponent Verbs; Ablative with Special Deponents", short: "Deponent verbs" },
    "35": { title: "Dative with Adjectives, Special Verbs, and Compounds", short: "Dative with special verbs" },
    "36": { title: "Jussive Noun Clauses; Fīō", short: "Jussive noun clauses; <i>fīō</i>" },
    "37": { title: "Conjugation of Eō; Place and Time Constructions", short: "<i>Eō</i>; place and time" },
    "38": { title: "Relative Clauses of Characteristic; Dative of Reference; Supines", short: "Clauses of characteristic" },
    "39": { title: "Gerund and Gerundive", short: "Gerund and gerundive" },
    "40": { title: "-Ne, Num, and Nōnne in Direct Questions; Fear Clauses; Genitive and Ablative of Description", short: "Questions; fear clauses" }
  },

  units: [
    { chapter: 2, grade: 6 },
    { chapter: 3, grade: 6, src: "js/units/ch03.js" },
    { chapter: 18, grade: 8, src: "js/units/ch18.js" },
    { chapter: 20, grade: 8, src: "js/units/ch20.js" }
  ],

  jobColors: {
    app: { color: "#66700a", ink: "#525a08", tint: "#e0dbb6" },      /* olive */
    agent: { color: "#b5420f", ink: "#98370d", tint: "#eed3b7" },    /* rust */
    means: { color: "#2d7419", ink: "#266115", tint: "#d6dcb9" },    /* leaf green */
    manner: { color: "#6e5200", ink: "#6e5200", tint: "#e2d6b4" },   /* bronze */
    accomp: { color: "#485828", ink: "#485828", tint: "#dbd7bc" },   /* moss */
    time: { color: "#1e2f5c", ink: "#1e2f5c", tint: "#d3d0c5" },     /* midnight */
    from: { color: "#885040", ink: "#7d4a3b", tint: "#e6d6c0" },     /* clay */
    sep: { color: "#b04858", ink: "#8d3a46", tint: "#eed4c4" }       /* rose */
  },
  jobFallback: { ofCase: true, none: { color: "#5c4636", ink: "#5c4636", tint: "#e9dfcc" } },

  playerColors: ["#b4441c", "#8f5d00", "#5f6b14", "#2f6f45", "#1f5f8b", "#7a4b2a"],

  ranksAbove: [
    { min: 15, title: "Inspector" },
    { min: 24, title: "Chief Inspector" },
    { min: 33, title: "Superintendent" },
    { min: 45, title: "Commissioner" }
  ],

  lines: {
    playersFirst: [
      "Hello! I am <b>Inspector Cāsus</b>. My name is Latin for “case”, and cases are my specialty.",
      "Before I open a single file, I need my detectives. Who is on the case?"
    ],
    playersBack: ["Welcome back to the office. Who is on the case today?"],
    playersManage: ["A parent’s desk: rename a player, change a grade, or remove a player."],
    askName: ["A new detective! What should I call you? A first name or a nickname will do."],
    askGrade: ["Pleased to meet you, <b>{name}</b>! Which class are you in?"],
    askChapter: ["Which chapter is your class on? I marked this month’s chapter from the school’s plan."],
    changeChapter: ["Which chapter is your class on now? Your stars stay with you."],
    changeGrade: ["Which class is <b>{name}</b> in now? Stars already won are kept."],
    home: {
      first: [
        "Welcome, detective! I am <b>Inspector Cāsus</b>. My name is Latin for “case”, and cases are my specialty.",
        "Latin nouns hide their jobs behind their endings. {count} {files} waiting on my desk. Shall we open {theFirst}?"
      ],
      back: [
        "Welcome back, detective. You have {stars} of {max} stars so far.",
        "Chapter {nextCh}, file {nextN}, “{nextTitle}”, is waiting on my desk."
      ],
      done: [
        "Every file solved! You have earned the rank of <b>{rank}</b>.",
        "Replay any file to keep your skills sharp."
      ],
      failed: ["I cannot open these case files right now. Reload the page to try again."]
    },
    arrive: {
      added: ["Welcome to the office, <b>{name}</b>! I am <b>Inspector Cāsus</b>. My name is Latin for “case”, and cases are my specialty."],
      met: ["Welcome to the office, <b>{name}</b>! I am glad to have you on the case."],
      chapter: ["Chapter {chapter} it is, <b>{name}</b>. Your stars stay with you."],
      picked: ["Welcome back, <b>{name}</b>!"]
    },
    rankUp: ["Promotion! You are now {a} <b>{rank}</b>."],
    claim: {
      ask: ["Before players had names, someone on this device won {stars} in Case Detective. Was it you, <b>{name}</b>?"],
      yes: ["Splendid! I moved {stars} into your case files."],
      no: ["All right. I will keep {stars} safe for the right detective."]
    }
  }
};
