# Climb to Consul: notes

A vocabulary game for Wheelock's Latin. Every word in the chapter list is a Roman citizen. The word climbs the offices of state (Citizen, Quaestor, Aedile, Praetor, Consul) by one office a night. Each office asks a harder question:

- **Quaestor:** pick the English.
- **Aedile:** pick the Latin.
- **Praetor:** fill in the dictionary entry with tiles.
- **Consul:** type the Latin word for the English, and a week later type the rest of the entry.

A wrong answer sends the word down one office.

The game runs in the shared frame in `latin-common/`: the top bar, the player chip and menu, the Inspector and his speech bubble, the players store, sound, music, dialogs and the macron keys. It plays from `file://` or from any static server, including a GitHub Pages sub-folder.

## Screens

- **Who's climbing?** This is `LatinPlayers.screens`. It comes from Case Detective 2.2's `players.js` when that file exists, and from latin-common's `players-fallback.js` otherwise. The player picks or adds a player and sets the grade and chapter. The chip menu offers Change chapter, Switch player, Add a player, Manage players and (on phones) Settings. With no player list at all, the game plays as a guest (grade 6, the month's chapter) and saves nothing.
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
- **Erase Away** (on the eve of the quiz, or any time from home). A slate holds 5 to 7 entries from the current chapter, the weakest offices first, covering nouns, verbs and one other part of speech. The entries follow the printed entry: a paired noun keeps its second word (*amīcus, amīcī, m., and amīca, amīcae, f.*), a plural-only noun its "(pl.)" (with the gender: "m. (pl.)"), *causā* reads "causā (after a gen.), f.", and *careō* keeps "+ abl. of separation" (erased with the cases). On a phone the slate always holds 5 entries, and a smudge no longer shows how long the erased piece is. That keeps each entry on one line. From round 1 every line is as tall as a line with a blank, so the lines stay evenly spaced.
  - On a laptop, when every chip is used, the chalk tray keeps its place with "Every piece is back. Say each whole entry aloud."
  - On short phones (up to 680 px tall) the chips sit in a two-row strip that scrolls sideways (each chip keeps 44 px), the round's title is left to the Inspector, and the (disabled) Next button is hidden until every blank is filled; then it appears and is scrolled into view.
  - **Round 0:** read the full entries aloud.
  - **Each later round:** a sponge wipes one more layer, in this order:
    1. the genitives and other forms;
    2. the genders and the cases;
    3. the principal parts;
    4. the meanings.

    The child taps a blank, then a chalk chip. A wrong chip shakes. Rounds with nothing new to erase are skipped.
  - **Last round:** only the first words are left. The child says each entry and taps it to check.
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
- **Play chapter:** the player's chapter if it is ready (`isReady`: it has words, `ready` not false), otherwise the last ready chapter before it. "In play" means every countable word of the grade up to the play chapter.
- **Macrons:**
  - off: macrons are ignored;
  - light: a missing macron is right, with a "Mind the long marks" note;
  - strict: a missing macron is wrong ("Only the macrons!");
  - typing a vowel followed by `-` or `=` makes it long.

  Judging is done by `LatinShell.check`.
- **Quiz:** `quizIn` gives the days left until the quiz. The day before is the eve, when Erase Away comes first on home.

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
  NOTES.md          this file
```

`js/art.js` is an addition to the file list in the spec. It keeps the SVG drawing out of the UI file.

Script order in `index.html`:

1. `../case-detective/js/courses.js`, `../case-detective/js/players.js` and `../case-detective/css/players.css`. These are Case Detective 2.2 files; until 2.2 ships they 404, which is expected.
2. `../latin-common/js/words.js`, `players-fallback.js`.
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
  erase: { n: 1, last: "YYYY-MM-DD" },     // Erase Away games played
  round: null | { day: "YYYY-MM-DD", chapter: 2, i: 0,   // i: the item on screen
                  items: [ { t: "meet" | "ask", id, fresh?, early?, again? } ],
                  counts: { due, meet, early },
                  log: [ { id, from, to, ok, again } ] }
} } }
```

`ClimbLogic.load(o)` makes any saved object safe: unknown fields are dropped, values are clamped, and missing parts get defaults. A guest's progress is never saved.

## How to test

1. **Logic.** From `climb-to-consul/`, run `node tools/check.js`. It takes about 14 s. `SEEDS=60 node tools/check.js` runs more seeds; the default is 24.
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
     - Erase Away sets and their round order are right;
     - the ring holds only trick verbs.
   - Odd seeds use the phone's Erase Away set of 5 entries.
   - Last run: 1,774,503 checks, 0 failed, about 14 s. The command exits non-zero on any failure. Each fix of the QA review was also undone once on a copy to see that the checks catch it (the dextera tiles, the printed headwords, the same-night rule, the near pairs, the `ask` texts).
2. **In a browser.** Open `climb-to-consul/index.html` straight from disk, or run `python3 -m http.server` in `language-games/` and open `/climb-to-consul/`. The console should show only the three expected 404s (Case Detective 2.2's `courses.js`, `players.js` and `players.css`).
3. **Play through.** Add a player (grade 6 or 8), play tonight's assembly and miss a few on purpose. Check that:
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
4. **What was run for this build.** Playwright with Chromium, `deviceScaleFactor` 1, at 390x844, 1366x768 and 768x1024, from `file://`, with a grade 6 player and a grade 8 player. After the QA fixes the same flows were replayed at 1366x768 and 390x844 (first visit, two players, a round with misses, reload, a faked next night; the seeded night with every question kind, strict macrons, quiz eve, Erase Away, the ring, the roll and print), plus keyboard-only play, and at 320x640 a whole grade 8 round, Erase Away, Settings and the ring: no console errors but the three expected 404s, no horizontal overflow. The run made a player through the UI and played:
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

## What is left

- **Short phones.** Below 720 px of height, a block of rules in `climb.css` tightens the cards and hides the question ribbon once a question is answered. Measured after the fixes (grade 8, chapter 21):
  - **375x667:** the feedback after a miss runs up to about 24 px over; Next is scrolled into view.
  - **320x640:** the feedback after a miss runs 46 to 117 px over (Next is scrolled into view). The end card fits. Erase Away rounds 1 to 4 fit while the blanks are filled (the chip strip scrolls sideways); once round 4 is filled, the full meanings make the slate about 70 px taller and Next is scrolled into view. Settings fit (Done at 622 of 640). The ring's Next key and the ring's end button are scrolled into view.
  - **390x844:** Erase Away round 4 runs 28 px over before it is filled (Next is disabled then) and about 73 px after (Next is scrolled into view).

  The questions themselves always fit. There is no horizontal overflow at any size.
- **The idle violin** from the brief (music when the child is idle) is not done. Music is only the shell's on/off track.
- **Case Detective 2.2.** With its `players.js` and `courses.js` present, the shell should hand the players screens over to it. That handover is untested here, because those files do not exist yet.
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
