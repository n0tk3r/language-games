# Climb to Consul: notes

A vocabulary game for Wheelock's Latin. Every word in the chapter list is a Roman citizen. The word climbs the offices of state (Citizen, Quaestor, Aedile, Praetor, Consul) by one office a night. Each office asks a harder question:

- **Quaestor:** pick the English.
- **Aedile:** pick the Latin.
- **Praetor:** fill in the dictionary entry with tiles.
- **Consul:** type the Latin word for the English, and a week later type the rest of the entry.

A wrong answer sends the word down one office.

The game runs in the shared frame in `latin-common/`: the top bar, the player chip and menu, the Inspector and his speech bubble, the players store, sound, music, dialogs and the macron keys. It plays from `file://` or from any static server, including a GitHub Pages sub-folder.

## Screens

- **Who's climbing?** Since 2026-11-25 the players are picked on the site's front page (`../index.html`, "Who's playing?"), once for every game, as the parent asked. The game opens as the player chosen there; with nobody chosen it sends the child there and opens again after the pick. The chip's Switch player and Change chapter go there too and come back (see latin-common/README.md). The screens themselves are `LatinPlayers.screens`, Case Detective's `players.js` in the site's own words (latin-common's `players-words.js`); they show in the game only when the browser cannot keep the choice (no localStorage).
- **The Forum (home).**
  - **The hill of offices.** A night scene: sky, moon, stars, the city, cypresses and five marble terraces. Each terrace has its emblem and name and a red banner with its count. The words stand on the terraces as wax tablets (gold ones on the Consul terrace), with torches, and a wreath and flags at the summit.
  - **The cards beside or below the hill:**
    - Tonight's assembly: the number of new words, how many to review, words from earlier chapters, about how many minutes, and "Begin the assembly". If the round was stopped partway, it says "You stopped at question N of M" and offers "Continue the assembly". When the round is done it says "The assembly has met".
    - On the eve of a quiz, an **Erase Away** card comes first.
    - A grid of four buttons: Erase Away, Trick verbs (only when the chapters in play have trick verbs), Senate roll and Settings.
  - **The Inspector** greets the player and points to the next thing to do. If the player's chapter is past the last ready chapter, he says that chapter's words are on their way.
  - **Grades with no ready chapters** (7 and 9 today) get a friendly "coming soon" card instead.
- **Tonight's assembly** (one round). On top: a progress bar with "N of M" and Stop. The round has:
  - **Meet-the-word cards** for new words (words never asked before), two at a time:
    - a NEW WORD stamp and the chapter;
    - the headword and the full entry;
    - the part of speech and the meaning (the first 2 or 3 senses);
    - "Think of" (English derivatives), when there are any;
    - a little ladder showing that the word starts as a Citizen;
    - a "Got it" button.

    A `repeats` entry (a new meaning of a word already met) says "You know X. Here is a new meaning!". Each new word is asked about 2 to 3 items after its card. A word that was met and missed stays a Citizen; the next night it is asked straight away as review, with no card, and it does not count as new.
  - **Quaestor question:** the Latin entry, then four English meanings to pick from. The English is the first 2 or 3 meanings, with the book's `;` groups kept whole (a group is cut only at that limit) and a group that repeats a meaning left out: *at* reads "but, mind you", never "but, but, mind you".
  - **Aedile question:** the English and its part-of-speech tag, then four Latin headwords to pick from. Wrong choices have the same part of speech and look alike where possible (same first letters, or a short edit distance). Related words are never offered as wrong choices: words in the same `same` list, words that share a sense, words whose senses match once the little words at the end are off ("snatch" / "snatch away", "free" / "be free from"), and the reviewed near pairs in `NEAR` in `logic.js` (rapiō / ēripiō, gēns / vulgus, līberō / careō, inquit / ait, littera / litterae; asked of the data owner below).
  - **The English shown when asking for the Latin** is the word's `ask`. Two `ask` texts in words.js read badly, so `logic.js` shows a better one while words.js still has the old text (`ASK_FIX`): *at* "but (mind you)" for "but, but", and *quī? quae? quod?* "what? which? what kind of?" for the 51-character text.
  - **Praetor question:** the entry with blanks, filled one row at a time from tiles. What the rows ask depends on the word:
    - nouns: the genitive, then the gender;
    - adjectives: the feminine and neuter forms, or the genitive;
    - verbs: the principal parts;
    - prepositions: the case they take;
    - other words: the part of speech.

    Wrong tiles are near misses from other declensions and conjugations, never a form printed in the entry, and never real Latin: `VARIANTS` in `logic.js` keeps out *dextera* and *dexterum* (the longer forms of *dextra*, *dextrum*, common in Vergil). The spec's example "dextra vs dextera" was wrong, so the -er look-alike is built only where it is not a real form (*aspra* for *aspera*, *sinistera* for *sinistra*, as the spec asks). A part-of-speech row never offers a part of speech the entry names ("adverb, preposition") or "pronoun" for an adjective (*quī? quae? quod?* is also the relative pronoun of chapter 17).
  - **Consul question:** the English (`ask`) and its tag; the child types the Latin headword. Right answers: the headword, its `alt` spellings, every headword the entry prints (*amīca* for *amīcus, amīcī (m.), and amīca, amīcae (f.)*; *quis*, *quid* and *quis quid*; *quī*, *quae*, *quod*), judged in the macron setting. There is no other typo tolerance. Typing a related word ("That's servō: close in meaning!") gives one more try.
  - **Consul review:** a week later, type the full entry. The gender is still picked from tiles.
  - **After each answer:** a feedback note with a ladder whose token climbs or slips. Then:
    - what the picked or typed wrong word means;
    - on a miss, the whole entry and its meaning;
    - "It comes back at the end of tonight's assembly" (a missed word is asked once more at the end; that second try never climbs or slips);
    - the Next button.

    Untouched choices are hidden, so Next stays on the screen. Keys: 1 to 4 pick, and Enter goes on.
  - **The end card:** the score, the words that climbed and slipped tonight, and the number of Consuls.
    - From 600 px up, the hill appears with tokens dropping onto the terraces.
    - On phones, a strip of the five office emblems with their counts takes the hill's place, because a short hill would cut off the Consul terrace. **This is a deviation from the spec (which asks for the hill); the lead should approve it or ask for a cropped hill.**
    - The "Back to the Forum" button is scrolled into view on short phones.
  - **On a laptop** (900 px wide and 620 px tall or more) the question stands in the middle of the desk, and from 740 px tall it is a size larger. Once a question is answered, the long-mark keys, the hint and the last row of tiles make room for the feedback (the filled entry shows every piece, a wrong one in red); on screens up to 820 px tall the question's ribbon goes too.
- **Erase Away** (on the eve of the quiz, or any time from home). A slate holds 5 to 7 entries from the current chapter: the words missed in the last Erase Away first, then the weakest offices, covering nouns, verbs and one other part of speech. The entries follow the printed entry: a paired noun keeps its second word (*amīcus, amīcī, m., and amīca, amīcae, f.*), a plural-only noun its "(pl.)" after the gender (*hostēs, hostium, m. (pl.)*: the gender piece is "m." and "(pl.)" stays on the slate, so an "m." chip is right for *hostēs*), *causā* reads "causā (after a gen.), f.", and *careō* keeps "+ abl. of separation" (erased with the cases). *quī? quae? quod?* has no forms piece, because its headword already prints *quae* and *quod*: only its meaning is erased. On a phone the slate always holds 5 entries.
  - **Round 0:** read the full entries aloud.
  - **Each later round:** a sponge wipes one more layer, in this order:
    1. the genitives and other forms;
    2. the genders and the cases;
    3. the principal parts;
    4. the meanings.

    Rounds with nothing new to erase are skipped.
  - **A blank gives nothing away** (since 2026-11-26; the parent: "the erase away game seems to give too much away with the length of the blurred areas"). Every unfilled blank has the same size, a Latin blank and an English one alike: 72 px wide from 600 px up, 52 px on phones, 46 px under 360 px, and 44 px tall (`--cc-blank` in `climb.css`). The erased piece is out of the layout until its blank is filled. While the sponge wipes, the piece fades inside its blank, where it stood (the child saw it in the round before). Each phone entry keeps to one line wherever it did before (measured for grade 6 chapters 2 and 3 and grade 8 chapters 19 and 21 at 320 to 390 px wide: no entry takes more lines than before, and several take fewer), and from round 1 every line is as tall as a line with a blank, so the lines stay evenly spaced.
  - **Only the first try counts**, as in Case Detective (also since 2026-11-26; the parent: "there's also no penalty for just guessing like in Case Detective"). The first open blank is selected: its smudge is brighter (gold) and a dashed ring pulses around it, never fading below 60% (with reduced motion it stays still), and "Fill: the genitive of amīcus" stands above the chalk pieces ("the neuter" for *mortālis, mortāle* and the other two-ending adjectives). The "Fill:" line shows on laptops and tablets, on phones from 760 px tall, and on phones 360 px wide or more up to 680 px tall (such as 375x667); it is hidden on phones 681 to 759 px tall (such as 360x740) and on phones under 360 px wide up to 680 px tall (such as 320x640), where there is no room: there the gold smudge and the ring show the blank, and the blank's label names it for a screen reader. The child may tap another blank to choose it. A chip always goes into the selected blank. The Inspector's first line in the first erasing round is "The genitives are gone. Only the first try counts!" (kept to the height of the old first line, so the bubble does not grow on a phone; later rounds start "The sponge took the genders." and say the rule in their second line), and the next line says "Each piece goes into the blinking blank. Tap a blank to choose it."
    - A right chip fills the blank.
    - A wrong chip shakes and stays in the tray. The selected blank is filled at once with its right piece in red chalk (`#ff8d93`, a lighter red of the #b3202a family, about 5:1 on the slate), the right piece's chip is used up with it, and the Inspector names it in one line: "That one is *amīcī*." A miss never changes a word's office.
    - Each round's pill counts the pieces that went in on the first try: "5 of 6 first try" (gold when every piece did).
  - **Decoys.** Each round's tray holds 1 piece that fits no blank, or 2 when the round has 6 blanks or more, so the last piece is never free. A decoy is a real piece of a kind the round's blanks have (the newly erased kind first), from another word in play of the same grade that is not on the slate: another word's genitive, other forms, gender, principal parts, case note or meaning. It never has the text of a piece on the slate (macrons ignored); a gender decoy names only genders that no entry on the slate has and no printed entry on the slate names (*vulgus, vulgī, n. (sometimes m.)* gets no "m." decoy); a case decoy names no case that a case piece on the slate names (*careō*'s "+ abl. of separation" will get no "+ abl." decoy once a word with "+ abl." is ready in grade 8); and it never comes from a word related to one on the slate (a shared sense or meaning word, a `same` or near pair), so *genus* "origin, kind" is never a decoy beside *quī? quae? quod?* "what kind of?". When the words in play have no such piece, the decoy comes from the grade's other ready chapters: grade 6, chapter 1 has one noun (*nihil*, n.), so its gender round's decoy is an "m." or "f." of chapter 2 or 3. A decoy tapped on a blank is a miss like any other. A genitive, other-forms or principal-parts decoy that starts like a first word on the slate (up to 3 letters, macrons ignored) is taken first, so it cannot be ruled out by its spelling alone: *poenae* beside *poēta*, *casae* beside *causa* (in a seeded test of 3,200 games, 39% of these decoys start with the same 2 or 3 letters as a first word on the slate, against 3.5% before). Decoys of the other kinds are picked at random. The decoys come from `eraseRounds` in `logic.js` (pure and seeded).
  - **Last step:** only the first words are left. On top: the stars and "19 of 22 pieces on the first try". The stars count every blank of every round: 3 when all went in on the first try, 2 from 75%, 1 from 50%, else 0 (Case Detective's `starRules`). An entry that had a miss has a red border and "say it once more". The Inspector gives the score, then "Say each whole entry aloud, then tap it to check.", then (after a miss) "The marked ones had a miss: say them once more." When every entry is open, the last line suits the stars: "You are ready for the quiz!" for 3 stars, "Say the marked ones once more!" for 1 or 2, "Play again for stars!" for 0. When the last step appears, the best stars of the chapter and the missed words are saved (`prog.erase`, see Storage); the next Erase Away puts those words first.
  - Opening an entry on the last step used to hide its first word (", mundī, m. — world, universe"); it now shows the whole entry.
  - **On phones** the round's title is left to the Inspector, so the round and its score keep to one line, and the (disabled) Next button is hidden while the blanks are filled; it appears when every blank is filled and is scrolled into view. To make room for the decoys and the "Fill:" line, a phone's lines are 44 px tall (46 before, except on short phones) and its chips a little smaller (17.5 px Latin and 14.5 px English, from 19 and 15; still 44 px tall). On the last step the count goes under the stars.
  - **On short phones** (up to 680 px tall) the chips sit in a two-row strip that scrolls sideways (each chip keeps 44 px and its own width: a short chip is not stretched to the width of the long one above or below it). Until 2026-11-26 this was only below 360 px wide; at 375x667 the chips now fit there too.
  - A filled blank is as tall as its text (an unfilled one is 44 px), so an entry that wraps keeps its second line close to its first; the line's own height keeps the slate's lines evenly spaced.
  - On a laptop, when every chip is used, the chalk tray keeps its place with "Every piece is back. Say each whole entry aloud."
- **Trick-verb ring.** A ring of up to six keys, one for each trick verb in play (verbs marked `trick` in words.js). The child fills each verb's principal parts with tiles. A key turns gold when every part was right on the first try. The end screen shows the ring and the list of keys. On short phones only the list is shown. "Next key" and "Back to the Forum" are scrolled into view.
- **Senate roll.** The words in play, chapter by chapter, each with its office badge. "Not drilled" marks words the game does not drill. A filter chooses this chapter, all in play, or the whole grade. Print (a printer icon) gives a clean list in two columns, with badges in brackets. A footer links to `latin-common/sources.html` (a 44 px tap target).
- **Settings** (a dialog sheet, per player):
  - Macrons: off / light / strict.
  - New words a night: 5 to 8.
  - Quiz day: none / weekly (pick the weekday) / a date.
  - "Start this player's climb over", with a confirm. It always goes back to home, also when the sheet was opened from the top bar during a round.

  The top bar's Settings gear is hidden on the players screens (on a first visit there is no player yet); if it is ever pressed with no player, it opens the players screen. On a tablet (600 to 899 px wide) the gear shows only its icon and the logo only its name, so the player chip has room.

The Inspector speaks a short line at each step. Sounds come from `sfx.js`, and music from `music.js` through the shell. Animations use transform and opacity only, and reduced motion is honoured.

## How the game decides

These rules are all in `js/logic.js`.

- **Offices:** 0 Citizen (not met), 1 Quaestor, 2 Aedile, 3 Praetor, 4 Consul. A word gets the question of the office it climbs to: a Citizen gets the Quaestor question, and so on (`kindFor`).
- **Right answer:** the word goes up one office, at most once a night (field `d`). A Consul that answers right stays Consul and is asked again in 7 days. Consul reviews alternate between the Consul question (type the Latin for the English) and the typed full entry (field `r`; the entry only for words that have rows to type).
- **Wrong answer:** the word goes down one office (a Citizen stays a Citizen) and is asked once more at the end of the round. That second try never climbs or slips (`apply(..., {again: true})`).
- **Due words** (`isDue`): words not asked today (field `s`), so a word that slipped tonight cannot climb back in a second assembly the same night: Quaestors to Praetors (not climbed today), Citizens that were already met (review, asked straight away with no card), and Consuls whose last answer is 7 or more days old. They are sorted oldest first, with at most 14 a night (`plan`). When the round is over, home says "The assembly has met" until tomorrow.
- **New words a night:** the setting (5 to 8, default 6), minus the words already met tonight. New words are Citizens never asked (`unmet`). The current chapter's come first. Each gets a meet card, two at a time, and is asked 2 to 3 items later (`interleave`). When that chapter is all met, never-asked Citizens from earlier chapters fill the room (`plan.early`). These are review, so they are asked straight away with no meet card, at random places among the due words.
- **The round** is saved in progress (`round`). It is dropped when the day or the play chapter changes.
- **Play chapter:** the player's chapter if it is ready (`isReady`: it has words, `ready` not false), otherwise the last ready chapter before it. "In play" means every countable word of the course up to the play chapter.
- **Earlier chapters.** A class can be behind, so a player may be on any chapter from 1 to the grade's last (the parent's ask of 2026-11-26; the rule is latin-common's `inGrade`). The words follow the course of the player's chapter (`courseGrade`): an 8th grader on chapter 2 climbs Latin IA's words up to chapter 2, exactly as a 6th grader on chapter 2 does (the same new words, choices, typed answers and Erase Away decoys); on chapter 5 up to chapter 3, with "Chapter 5's words are on their way"; on chapters 9 to 17 (Latin IB, no words yet) the Coming soon card names the chapter and offers Change chapter. The chapter step's check marks ("has games ready"; "Ready" in the fallback) (`filesIn` = `readyUpTo`) cover every chapter from 1 to the grade's last. Progress is kept per word, so a player who moves between an earlier chapter and their own keeps both courses' offices.
- **Macrons:**
  - off: macrons are ignored;
  - light: a missing macron is right, with a "Mind the long marks" note;
  - strict: a missing macron is wrong ("Only the macrons!");
  - typing a vowel followed by `-` or `=` makes it long.

  Judging is done by `LatinShell.check`.
- **Quiz:** `quizIn` gives the days left until the quiz. The day before is the eve, when Erase Away comes first on home.
- **Erase Away:** `eraseSet` picks the slate (missed words of the last game first, then the weakest offices; the kinds rule, 5 to 7 entries, 5 on a phone). `eraseRounds(set, seed, W, player)` builds the rounds, their blanks and their chalk chips with the decoys (`decoyPieces` gives the fair pieces, `eraseDecoys` picks them, Latin forms that start like a first word on the slate first: `decoyLook`). `chipFits` says whether a chip fits a blank (a decoy never does). `eraseScore` counts the first tries (a blank's first try only; a blank never tried counts as missed) and lists the entries with a miss in slate order; `eraseStars` gives the stars (`ERASE_STARS`, Case Detective's thresholds); `eraseDone` saves a finished game. A miss never changes a word's office.

## Files

```
climb-to-consul/
  index.html        the page; loads latin-common, Case Detective's sfx/music/detective, then art, logic, UI
  css/climb.css     the game's own look on top of latin-common/css/common.css (prefix cc-)
  js/art.js         window.ClimbArt: hand-built layered SVG (logo, office emblems, the hill, the ladder,
                    the slate sponge, the key ring)
  js/logic.js       window.ClimbLogic and module.exports: pure rules, question building, scheduling,
                    answer judging, Erase Away, the ring, the roll. No DOM. Runs in node.
  js/climb.js       the UI: screens, rounds, feedback, settings
  tools/check.js    node tools/check.js: the logic checks (see How to test)
  tools/blanks.js   node tools/blanks.js: Erase Away in Chromium (Playwright): blanks of one size, misses, stars
  NOTES.md          this file
```

`js/art.js` is an addition to the file list in the spec. It keeps the SVG drawing out of the UI file.

Script order in `index.html`:

1. `../case-detective/css/players.css` (the players screens' look), before `common.css`.
2. `../latin-common/js/words.js`; Case Detective's `js/courses.js` and `js/players.js` (the players and their screens); `../latin-common/js/players-fallback.js` (does nothing when players.js is there) and `players-words.js` (the site's words for the screens).
3. `../case-detective/js/detective.js`, `sfx.js`, `music.js`.
4. `../latin-common/js/shell.js`.
5. `js/art.js`, `js/logic.js`, `js/climb.js`.

`words.js` and `charts.js` are built data and are never edited here.

## Storage

All storage is in `localStorage`, through `LatinShell.store`. Progress for a deleted player is pruned by the shell.

- **`latinGames.v1`** belongs to latin-common / Case Detective: the players, the current player, sound and music. The game only reads it through `LatinPlayers`.
- **`climbToConsul.v1`** belongs to this game:

```js
{ v: 1, progress: { "<playerId>": {
  v: 1,
  words: { "<wordId>": { o: 0-4,          // office
                         d: "YYYY-MM-DD", // the day it last climbed (one climb a night)
                         s: "YYYY-MM-DD", // the day it was last asked
                         n: 7,            // times asked
                         m: 2,            // times missed
                         r: 1 } },        // Consul reviews answered right (odd: next review is the typed entry)
  set: { macrons: "off" | "light" | "strict", perNight: 5-8,
         quiz: { mode: "none" | "weekly" | "date", day: 0-6, date: "YYYY-MM-DD" | "" } },
  nights: { "YYYY-MM-DD": { met, early, asked, right, climbed, slipped } },   // last 60 nights kept
  ring:  { n: 3, last: "YYYY-MM-DD" },     // trick-verb rings played
  erase: { n: 1, last: "YYYY-MM-DD",       // Erase Away games played to the last step, and the last day
           best: { "21": 2 },               // the best stars (0-3) per play chapter
           miss: ["21-gens"] },             // the words with a miss in the last game: first on the next slate
  round: null | { day: "YYYY-MM-DD", chapter: 2, i: 0,   // i: the item on screen
                  items: [ { t: "meet" | "ask", id, fresh?, early?, again? } ],
                  counts: { due, meet, early },
                  log: [ { id, from, to, ok, again } ] }
} } }
```

`ClimbLogic.load(o)` makes any saved object safe: unknown fields are dropped, values are clamped, and missing parts get defaults. Saves from before 2026-11-26 have only `n` and `last` in `erase`; they load with `best: {}` and `miss: []` (`eraseSave`). A guest's progress is never saved.

## How to test

1. **Logic.** From `climb-to-consul/`, run `node tools/check.js`. It takes about 19 s. `SEEDS=60 node tools/check.js` runs more seeds; the default is 24.
   - It loads `latin-common/js/words.js` in a `vm`.
   - For every ready chapter of grades 6 and 8, plus one chapter past the last, and for every seed, it builds every question kind for every word in play.
   - It asserts that:
     - the right answer is there exactly once;
     - no wrong choice is right: same text, a shared sense, a `same` word, or a form that differs only in macrons;
     - **independently of the game's own sense rules**: no wrong choice shares a content word of its meaning with the target (the check tokenises the meanings itself), unless the pair is in the reviewed list `REVIEWED` in `check.js` (8 pairs, each with its reason, such as habeō / valeō: "have" is not "have power"); and every pair of the grade that could be offered against each other and shares a content word is either never offered or reviewed, unready chapters included;
     - there are no duplicates;
     - every tile row holds its answer; no wrong tile is real Latin (*dextera*, *dexterum*, contracted genitives such as *fīlī*, -iī perfects such as *audiī*); no part-of-speech tile the entry names, and never "pronoun" for an adjective;
     - typed answers are judged right with and without macrons in each strictness, and every headword printed in the entry is accepted (*amīca*, *quid*, *quae*, *quod*...);
     - the English the child reads (the Quaestor English and the `ask`) has no empty or repeated sense and is at most 40 characters, for every word in play (unready chapters are listed as notes for the data owner);
     - the scheduling rules hold: one climb a night, a miss slips one office, Consuls come back after 7 days, the again-try never moves a word, new words a night, the due rule (written out separately in the check), a word met before never gets a new-word card;
     - a miss cannot be undone the same night: *porta* at Praetor, missed, is left out of a second round that night and is back the next night; a word that slipped to Citizen is not asked again that night; and in the simulated 30 nights no word asked tonight comes back in a second round;
     - a simulated 30 nights behaves;
     - quiz eve dates are right;
     - Erase Away sets and their round order are right, and the words missed in the last game come first (every third seed has some; three missed Consuls are on the slate while Citizens are left out, with the kinds still covered);
     - every entry's pieces: a gender piece is a bare gender ("m.", or "m. and f."), and a plural-only noun keeps "(pl.)" as fixed text after it; no adjective's forms piece repeats what its headword prints (*quī? quae? quod?*);
     - every round's decoys: 1, or 2 from 6 blanks; of a kind the round's blanks have; never the text of a blank or of any piece on the slate (macrons ignored); a gender decoy names no gender the slate has or a printed entry on the slate names (*vulgus*, "n. (sometimes m.)": also a plain test of two vulgus slates over 300 seeds); a case decoy names no case a case piece on the slate names (a plain test with a made-up "prae + abl." word beside *careō*); no gender chip in a tray is another text for the same gender as a gender blank ("m. (pl.)" beside "m."); each is a real piece (`eraseEntry`) of a word of the grade that is not on the slate, from the words in play unless they have no fair piece of the round's kinds (24 of 1,486 decoys in the last run, all genders of grade 6, chapter 1); no two alike; a Latin-form decoy starts as much like a first word with a blank of its kind as the best fair piece in play does (the check measures the likeness itself; the summary line counts the decoys that start with the same 2 or 3 letters); and, independently of the game's sense rules, the decoy's word shares no content word of its meaning with a word on the slate (unless the pair is in `REVIEWED`);
     - the score of a game played with random first tries: each round's count, the game's count, the entries with a miss in slate order, and the stars against the thresholds written out separately in the check (3 at 100%, 2 from 75%, 1 from 50%), plus a table of cases (19 of 22 gives 2, 16 of 22 gives 1, 0 of 0 gives 0...);
     - the save after a game: one more game, the best stars kept, the missed words saved and put first in the next game, and no word's office moved;
     - old saves load: `erase` with only `n` and `last` gets `best: {}` and `miss: []`; broken values are made safe;
     - the ring holds only trick verbs.
   - Odd seeds use the phone's Erase Away set of 5 entries.
   - Last run (2026-11-26, after the review fixes): 1,802,961 checks, 0 failed, about 20 s. The command exits non-zero on any failure. Each fix of the QA review was also undone once on a copy to see that the checks catch it (the dextera tiles, the printed headwords, the same-night rule, the near pairs, the `ask` texts). For the Erase Away change, ten mistakes were put into `logic.js` one at a time (one decoy always, no gender rule, slate texts allowed, related words allowed, decoys of any kind, outside play first, 2 stars at 70%, no missed-first, an old save losing `n`, a finished game moving offices): the checks caught each one. For the review fixes, five more were put in one at a time ("(pl.)" back inside the gender piece, *quī*'s forms piece back, no *vulgus* rule, no case rule, decoys in random order again): each was caught.
2. **Erase Away in a browser.** Blanks of one size are a CSS matter, so `node tools/blanks.js` checks them in Chromium (it needs Playwright, as installed here; about 5 minutes). For a grade 6 chapter 2 and a grade 8 chapter 21 player, at 390x844 and 1366x768 (`SIZES="320x640,375x667"` for other sizes), it plays six games of Erase Away to the end: three seeds with one wrong chip in every round (2 stars), one with every chip right (3 stars), one with every second chip wrong (1 star) and one with every chip wrong (0 stars). It asserts that every unfilled `.cc-smudge` in every round has the same width and height within 1 px (while the sponge wipes, when the round starts and after two pieces), that an unfilled blank shows no text, that the tray holds the blanks' pieces plus the decoys, that "Fill: ..." names the blank, that the selected blank's ring never fades below 55%, that the Inspector says "Only the first try counts!" (first line of the first round, second line of later rounds), that a wrong chip shakes and stays while the blank is filled in red and its right chip is used up, that the pill counts first tries (gold only when every piece went in on the first try), and that the last step's stars, count, marks, Inspector lines (the score, then "Say each whole entry aloud...") and save are right, and that the closing line once every entry is opened suits the stars. Last run (after the review fixes): 4,121 checks, 0 failed (blanks 52 px on the phone, 72 px on the laptop). Putting back the old phone smudges, a wider English blank, or the erased text in the layout each made it fail; so did the old fading ring and the old closing line.
3. **In a browser.** Open `climb-to-consul/index.html` straight from disk, or run `python3 -m http.server` in `language-games/` and open `/climb-to-consul/`. The console should show no errors.
4. **Play through.** Add a player (grade 6 or 8), play tonight's assembly and miss a few on purpose. Check that:
   - each missed word comes back at the end;
   - the end card counts are right;
   - home then says the assembly has met.

   To test the higher offices without waiting days, make every word due in the console:
   ```js
   var k = "climbToConsul.v1", o = JSON.parse(localStorage[k]), id = LatinPlayers.current().id;
   Object.values(o.progress[id].words).forEach(function (e, i) { e.o = 1 + i % 4; e.d = e.s = "2026-01-01"; e.r = i % 2; });
   o.progress[id].round = null; o.progress[id].nights = {}; localStorage[k] = JSON.stringify(o); location.reload();
   ```
   Then visit Erase Away, Trick verbs, Senate roll (and Print preview) and Settings. Set a weekly quiz for tomorrow and check that home leads with Erase Away. Set macrons to strict and check that a typed answer without macrons is wrong.
5. **What was run for this build.** Playwright with Chromium, `deviceScaleFactor` 1, at 390x844, 1366x768 and 768x1024, from `file://`, with a grade 6 player and a grade 8 player. After the QA fixes the same flows were replayed at 1366x768 and 390x844 (first visit, two players, a round with misses, reload, a faked next night; the seeded night with every question kind, strict macrons, quiz eve, Erase Away, the ring, the roll and print), plus keyboard-only play, and at 320x640 a whole grade 8 round, Erase Away, Settings and the ring: no console errors but the three expected 404s, no horizontal overflow. The run made a player through the UI and played:
   - night 1 with misses;
   - a seeded night 2 with every question kind and typing without macrons;
   - stop and resume;
   - Erase Away;
   - the ring;
   - the roll with print emulation;
   - settings, quiz eve, strict macrons and the chip menu.

   Each screen was checked for horizontal overflow, small tap targets, the main button below the fold, and console errors: none at those three sizes. Also run:
   - a keyboard-only run with reduced motion (1 to 4 and Enter all the way through);
   - a check of the typed full entry and of the near miss ("close in meaning");
   - the same flow over `http.server`, which logged only the three expected 404s.

   At 375x667 and 320x640, see What is left.

   **The Erase Away change (2026-11-26)** was checked with:
   - `node tools/check.js` (1,797,671 checks, 0 failed) and `node tools/blanks.js` (1,530 checks, 0 failed; also at 320x640, 375x667 and 360x740: 2,109 checks, and at 768x1024 and 1280x720: 1,654 checks, 0 failed);
   - Erase Away played to the end with wrong taps in every round at 390x844, 320x640 and 1366x768 by a grade 6 chapter 2 and a grade 8 chapter 21 player, `deviceScaleFactor` 1, with screenshots of a round with blanks, the sponge wiping, a round after a miss (red chalk) and the last step with its stars (looked at, each one): no console errors;
   - an old save (`erase` with only `n` and `last`) played through: it loaded, counted the game and saved `best` and `miss`; a word missed there, then made a Consul by hand, was first on the next slate;
   - the fit table under What is left, measured with reduced motion against a copy of the previous build (`git archive HEAD`);
   - the site-wide browser checks that open every game with a player (the top bar at 320x640, 390x844, 768x1024 and 1366x768, and a first load with music on): Climb to Consul passes, with no console errors.

   **The review fixes (2026-11-26).** Two reviews of the Erase Away change (one on code and Latin, one playing it as a child would) found these, now fixed:
   - a plural-only noun's gender piece was "m. (pl.)", so the right "m." chip counted as a miss for *hostēs*, *coniūrātī* and *fīnēs* (now "m." with "(pl.)" fixed after it; no "(pl.)" chip is ever dealt);
   - *vulgus*, "n. (sometimes m.)", could get an "m." decoy (now the printed entry's genders count as used; a case decoy also never names a case on the slate);
   - *quī? quae? quod?* had a forms piece that its headword already prints (now only its meaning is erased);
   - "Fill: the other forms of mortālis" now says "the neuter" for the two-ending adjectives;
   - the selected blank's ring faded to nothing on every blink (now a gold smudge and a ring that pulses between 60% and 100%);
   - the first-try rule was only in a line the child sees after tapping the bubble on (now in the first line of the first round), and on the last step "Say each whole entry aloud, then tap it to check." is the second line (it was the third, after "Only the first words are left.", which is gone);
   - after a 0-star game the closing line said "You are ready for the quiz!" (now it suits the stars);
   - Latin-form decoys rarely started like a first word on the slate (now the most alike come first);
   - in the short-phone strip a short chip stretched to the width of the chip above or below it (now each keeps its width);
   - a filled blank kept 44 px of height, so a wrapped entry's second line sat a full line lower (now a filled blank is as tall as its text: at 320 to 390 px, 255 of 2,880 measured lines got shorter and none taller);
   - `blanks.js` now also plays 3-star, 1-star and 0-star games, and the notes on where "Fill: ..." shows were wrong (corrected above).

   They were checked with `node tools/check.js` (1,802,961 checks, 0 failed), `node tools/blanks.js` (4,121 checks, 0 failed), the site-wide browser checks, a replay of the review's *hostēs* game (tapping "m." for its gender now counts as right), line heights before and after (grade 8, chapters 18, 20 and 21, six seeds, at 320x640, 360x740, 375x667 and 390x844), the fit table below re-measured, and screenshots at 320x640, 375x667, 390x844 and 1366x768 (looked at).

## What is left

- **Short phones.** Below 720 px of height, a block of rules in `climb.css` tightens the cards and hides the question ribbon once a question is answered. Measured after the fixes (grade 8, chapter 21):
  - **375x667:** the feedback after a miss runs up to about 24 px over; Next is scrolled into view.
  - **320x640:** the feedback after a miss runs 46 to 117 px over (Next is scrolled into view). The end card fits. Settings fit (Done at 622 of 640). The ring's Next key and the ring's end button are scrolled into view. For Erase Away, see below.

  The questions themselves always fit. There is no horizontal overflow at any size.
- **Erase Away on small screens.** Measured on 2026-11-26 for the Erase Away change (blanks of one size, decoys, the "Fill:" line), against a copy of the build before it, with reduced motion and 32 games per size (grade 6 chapters 1, 2 and 3, grade 8 chapters 18 to 22, four seeds each: 119 rounds). Before → after:

  | Size | Rounds that run over as they start | Worst as a round starts | Worst once a round is filled | The last step |
  |---|---|---|---|---|
  | 390x844 | 8 → 0 | 74 → 0 px | 0 → 0 | 0 → 0 |
  | 375x667 | 32 → 0 | 146 → 0 px | 0 → 0 | 0 → 0 |
  | 360x740 | 78 → 45 | 274 → 132 px | 39 → 7 px | 0 → 0 |
  | 320x640 | 10 → 3 | 12 → 12 px | 63 → 63 px | 0 → 0 |
  | 768x1024 | 1 → 0 | 1 → 0 px | 0 → 0 | 0 → 0 |
  | 1366x768 | 4 → 0 | 58 → 0 px | 40 → 40 px | 0 → 0 |
  | 1280x720 | 26 → 8 | 106 → 45 px | 88 → 88 px | 0 → 0 |

  Round by round, no round that fitted before needs scrolling now, as it starts or once it is filled. Five rounds at 360x740 that already ran over (by 32 to 124 px) run 2 px further; every other round runs over by as much as before or less. On phones a round that runs over has its last row or two of chips below the screen while the blanks are filled (Next is hidden then); once the round is filled, Next is scrolled into view. The last step fits everywhere, also with every entry opened. What still runs over: at 360x740 (taller than the short-phone strip's 680 px), the principal-parts and meanings rounds; at 320x640, a few rounds of grade 8, chapter 19 as they start and the filled meanings round of long sets (24 to 63 px); on laptops, the filled later rounds of grade 8, chapter 20 and grade 6, chapter 1 at 1280x720, and one at 1366x768. A two-row strip for phones up to about 760 px tall would make 360x740 fit too, at the cost of more sideways scrolling: not done, as no one has asked.

  **After the review fixes** (measured the same way, the same 32 games a size, against a copy of the build just before the fixes). Before → after:

  | Size | Rounds that run over as they start | Worst as a round starts | Worst once a round is filled | The last step |
  |---|---|---|---|---|
  | 390x844 | 0 → 2 | 0 → 29 px | 0 → 0 | 0 → 0 |
  | 375x667 | 0 → 1 | 0 → 4 px | 0 → 0 | 0 → 0 |
  | 360x740 | 45 → 46 | 132 → 132 px | 7 → 0 px | 0 → 0 |
  | 320x640 | 4 → 3 | 12 → 12 px | 63 → 0 px | 0 → 0 |
  | 768x1024 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
  | 1366x768 | 0 → 0 | 0 → 0 | 40 → 0 px | 0 → 0 |
  | 1280x720 | 8 → 8 | 45 → 45 px | 88 → 8 px | 0 → 0 |

  Filled rounds are shorter now (a filled blank is as tall as its text), so almost every filled round fits. As a round starts, a few rounds of the sample now have one more row of chips: the decoys and the chips' shuffled order changed, and a look-alike principal-parts decoy can be long (*prōnūntiāre, prōnūntiāvī, prōnūntiātum* beside *prohibeō*). Those are two grade 8, chapter 20 rounds at 390x844 (22 and 29 px), two at 360x740 (34 px) and two at 1280x720 (12 and 24 px); seven rounds at 360x740 that already ran over run one chip row (49 px) further. The other way, two rounds at 1280x720, one at 360x740 and one at 320x640 that ran over now fit, and two at 360x740 run a row less: it is the luck of the shuffle. The 4 px at 375x667 did not come back when measured again. The 32-game sample hides how often this happens at 390x844, so a larger sample was played there (96 games, 358 rounds, reduced motion): 10 rounds run over as they start both before and after the fixes, worst 78 px in both, nearly all of them grade 8, chapter 20's principal-parts and meanings rounds. The first round's longer first line ("The genitives are gone. Only the first try counts!") keeps the bubble as tall as the old first line at 320 and 360 px wide; at 375 and 390 px it is one line taller (19 px) in the first round only, which has the fewest chips.
- **Erase Away: questions for the lead** (from the two reviews of the Erase Away change; each would change a decided rule, so none is done):
  - *A chip always goes into the selected blank.* A child who taps the chip of a piece they know, without first tapping its blank, is charged a miss on the blank that was selected. The selected blank is now hard to miss (a gold smudge and a ring that never fades out), the first round's first line says "Only the first try counts!", and "Fill: ..." names the blank where there is room; on 320x640 and 360x740 there is no room for "Fill: ..." without more scrolling. Dropping a chip onto whichever blank it fits would show which chips are real, so it is not done.
  - *Gender chips give the answer away by count.* There is one chip per blank, so when every gender blank on a slate has the same gender the tray shows that chip several times beside one decoy (about a quarter of the gender rounds with two or more gender blanks). One stamp chip per gender that is never used up would fix it, but the decision is one chip per blank, used up when the blank fills.
  - *Grade 6 gender decoys.* Chapters 1 to 3 have one neuter, *nihil*, so a slate with m. and f. nouns always gets "n." as its gender decoy (a decoy may only name a gender no blank uses).
  - *Spelling still helps.* Even with the look-alike decoys first, the right genitive, other-forms or principal-parts chip is the only one that starts like its first word for 87% of those blanks (89% before), because each round has only 1 or 2 decoys. Made-up near misses, like the Praetor's look-alike tiles, would be harder to rule out, but the decision is that a decoy is a real piece of another word.
- **The idle violin** from the brief (music when the child is idle) is not done. Music is only the shell's on/off track.
- **Look-alike wrong forms.** The -er look-alike stays for *asper* (*aspra*) and *sinister* (*sinistera*), as the spec asks. Syncopated forms such as *aspris* (Vergil) exist in poetry; the row asks for the dictionary form, so *aspra* is kept as a wrong tile. *dextera* and *dexterum* are never offered (`VARIANTS`).
- **Words of later chapters** (not ready yet, so not in play): *quīdam* prints "or quoddam (adj.)", and `check.js` will ask for a decision on whether *quoddam* is a right typed answer when chapter 26 is ready; the prefix *re-/ red-* (chapter 24) cannot be typed as "re-", because "e-" turns into *ē*; `(re)maneō` (chapter 5) prints two headwords.
- **Prepositions.** For a preposition that takes the ablative or accusative, the case row also offers "+ dative". No preposition in Wheelock takes the dative, so this is a fair wrong tile, but a teacher may prefer only ablative/accusative.
- **Grade 6, chapter 2** has no verbs, so its Erase Away covers nouns and one other kind only.
- **The Senate roll** prints the words in play from `words.js`. It says to check the printed chapter list before a graded test, because the words come from the sources noted in `latin-common/sources.html`.

## Requests for the data owner (latin-common/js/words.js)

`check.js` and `logic.js` work around these today; please fix them in the data and rebuild words.js. The game's stopgaps switch themselves off once the data changes.

1. **`same` lists.** Add each pair to the other's `same`: `21-rapio` / `22-eripio` (seize, snatch / snatch away), `21-gens` / `21-vulgus` (people), `19-libero` / `20-careo` (free / be free from), `22-inquit` / `25-ait` (he says), `07-littera` / `07-litterae` (a letter). They are in `NEAR` in `logic.js` until then.
2. **`ask` texts.** `19-at` is "but, but": suggest "but (mind you)". `19-qui-quae-quod` is 51 characters with two groups: suggest "what? which? what kind of?". Not ready yet but long: `05-ne` (60 characters) and `26-quam` (75 characters); `check.js` prints them as notes. `03-vir` asks "hero" while the meet card teaches "man, hero": consider "man, hero" (*homō* is in `vir`'s `same`, so it is never offered against it, and typing it is a near miss).
3. **ōdī.** words.js has "ōdī, ōdisse, ōsum"; Wheelock's 7th edition (chapter 20) prints "ōdī, ōdisse, ōsūrum". Please check the printed list before the 8th grader's quiz; the form shows in the Praetor and ring rows, the typed review and Erase Away.

## Requests for latin-common

1. **Compact bubble and the next arrow.** In `common.css`, `.ls-app.compact .bubble { padding: 12px 12px 8px; }` is more specific than `.bubble.has-next { padding-right: 40px; }`. In compact mode, a bubble with more lines therefore loses the room for its round "next" arrow, and the end of the text runs under the arrow. This game works around it in `climb.css` with `.ls-app.compact .bubble.has-next { padding-right: 42px; }`. Please add an equivalent rule to `common.css`, for example `.ls-app.compact .bubble.has-next { padding-right: 40px; }` (44px under the 480px media rule).
2. **`macronKeys` placement (small).** By default the key row goes in just before the input. When the input sits in a flex row with a button (a common layout), the keys become a flex item and squeeze the input to a few pixels. This game passes `{into: placeholder}`, which works. It might help to document `into` in the header comment, or to default to inserting before the input's nearest block parent.
