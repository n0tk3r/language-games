# Row the Endings: notes

A chart game for Wheelock's Latin. The child rows a Roman bireme from harbor to harbor by filling a declension or conjugation chart one box at a time. The boxes go down each column, the way the chart is recited (porta, portae, portae, portam, portā, then the plural). The game uses the shared frame in `latin-common/`: the top bar, the player chip, the Inspector, the players store, sound and music. It plays from `file://` or from any static server, including a GitHub Pages sub-folder.

## Screens

- **Who's playing?** Since 2026-11-25 the players are picked on the site's front page (`../index.html`, "Who's playing?"), once for every game, as ilya asked. The game opens as the player chosen there; with nobody chosen it sends the child there and opens again after the pick. The chip's Switch player and Change chapter go there too and come back (see latin-common/README.md). The screens themselves are still `LatinPlayers.screens` (latin-common's `players-fallback.js`, or Case Detective 2.2's `players.js` later); they show in the game only when the browser cannot keep the choice (no localStorage).
- **The harbor (home).** A dusk harbor scene sits under the title "Portus", with a lighthouse, the moored ship and glints on the water. Below it are:
  - **Tonight's voyage card.** Before sailing it lists the legs with a minutes estimate and a "Set sail" button. Partway through it says "Row on". When the voyage is done it shows the scores and offers "One more voyage" (a new voyage, planned from the progress as it is now; it does not repeat tonight's legs).
  - **The quay.** It has one ship card for every chart in play, current chapter first. Each card carries three step pennants: done (red with a tick), next, open, or locked.
  - **The three steps.** On a laptop, when the quay has four charts or fewer (grade 6 today), a small card under it explains Calm water, Open sea and Storm and the pass rule, so the quay column is not an empty wood panel. It is hidden below 900 px and for longer quays.
  - **Footer.** It has the sources link for parents and Settings.
  - **Inspector lines.** The Inspector greets the player and points to the next thing to do. When the player's chapter is past the last chapter that has charts, he says so: "Chapter 5's charts are on their way; tonight we row chapters 1 to 3."
  - **Grade with no charts.** Grades 7 and 9 have no charts yet. For them a friendly card replaces the quay.
- **Step picker (sheet).** Tapping a ship card opens this sheet. It lists:
  - Calm water, Open sea and Storm, each with its best score. A locked step is disabled.
  - Called boxes: six single boxes from that chart.
- **The voyage screen** (one chart at one step):
  - **Where we are in tonight's voyage.** On laptops the leg pips sit in the middle of the top bar. Below 900 px the bar has no room for them (they used to draw over the title and the player chip), so a small "Leg 2 of 5" tag rides on the sea strip instead.
  - **Sea strip across the top.** The sky changes with the step: a calm evening, open-sea clouds, or a storm with rain and lightning. Two layers of waves move across it. The bireme rows from the left harbor to the right one, with two banks of oars, a red sail with a brass emblem, a painted eye and a drum on deck. The oars stroke on each beat. A right answer in time makes the ship surge and throw spray, and an "in stroke" streak badge rides on the ship.
  - **The chart on parchment, in Wheelock's layout.** Column heads give the dictionary entry and meaning, rows are labelled Nom. Gen. Dat. Acc. Abl. (Voc.), and blocks are labelled Singular / Plural. Verb charts use persons. The current box is highlighted. When a column is a gender or a tense rather than a word, its head says so above or beside the entry, as Wheelock prints it: "M. and F. quis", "N. quid", "M. quī", "F. quae", "N. quae"; "Perfect laudātus sum", "Pluperfect laudātus eram", "Future perfect laudātus erō".
  - **The Inspector's lines name the column the way the chart does.** "Tap its ending, down the porta column first"; "laudātus is in each box. Tap the word that goes with it, down the perfect column first"; for the pronoun "Tap each form from the tiles. Go down the masculine and feminine singular column first". When the boxes move on: "Now the magna column.", "Now the pluperfect: laudātus eram.", "Now the feminine plural: quae."
  - **The side panel.** It is on the right on laptops and docked at the bottom on phones and tablets. It shows:
    - the step and drum button, and the box count (n / N);
    - the question ("porta · dative singular"; for the pronoun the column's own word and its gender, "quae · genitive plural, F.");
    - the ending tiles. Each tile is a wooden block such as "-ae", "-ārum", or "—" for no ending. Pronoun charts use whole forms. At the Storm the player types instead, in a typing box with macron keys.
  - **Right answer.** The tile flies into the box with an oar stroke and a splash.
  - **Wrong answer.** The oars clash (a shake and a clash sound) and the right form drops into the box in dark red, with a callout naming it ("genitive plural").
    - On a wrong tile the Inspector says "Oars clashed! That box is portae.", and on laptops the note under the tiles adds the name.
    - On a typed form that belongs to another box, the Inspector names that box: "amīcus is the nominative singular. This box is amīcōrum."
    - The box counts as missed. On the first miss of a night leg the Inspector adds that the chart comes back once more at the end of tonight.
    - At the Storm, a slip in the macrons alone counts as right and shows "Mind the macrons", unless it makes another form (see "Typed forms" below).
    - A typed "laudātus, -a, -um sum" is right; the box then shows the chart's own form (laudātus sum), so it fits.
- **Result card.** It shows the score as the papers mark it ("22 of 24 boxes"), passed or not, and a pennant being raised. It lists the missed boxes with their names and the best run in stroke. In tonight's voyage the button is "Row on", with the next leg named under it. In free play:
  - after a pass below the Storm, the buttons are the next step (for example "Open sea"), "Again" and "The quay";
  - otherwise they are "Row it again" and "The quay".
- **Called boxes.** These are single boxes out of order, like a quiz ("porta: dative plural?"). The screen has the same layout as a voyage: the chart of the called box on its parchment, blank, with the called box marked "?", and the question with four whole-form tiles (or typing at Storm charts) in the oars panel, with a row of bells that counts the boxes (brass for right, red for missed). Each answered box fills in on the chart, so the chart fills up as the quiz goes on; a missed one drops in dark red with its name. One stroke each. Missed boxes come first. A box whose prompt would give its answer away ("porta: nominative singular?", "quis, quid: ... quis") is only asked when a chart has too few other forms. Tonight's called boxes are 8 when the voyage has more than one chart, and 6 otherwise. In free play the result shows in the oars panel, as after a chart.
- **End of tonight's voyage.** The arrival harbor with the lighthouse and a laurel wreath, the score ("81 of 84"), each leg with its step and score (marked "review" or "once more" as on the home card), the called boxes, and "Back to the quay".
- **Settings (sheet).** It has four groups:
  - the drum: off, slow or steady;
  - the vocative row: as the book does it, always, or never;
  - in the Storm: type the forms, or tap endings;
  - macrons when typing: light or strict.

Keyboard: the keys 1 to 9 and 0 pick tiles 1 to 10 (a bank never has more than 10 tiles). Enter presses the button marked for Enter when there is one ("Set sail", "Row on", "Open sea", "Next box"), so one press goes on; otherwise it shows the Inspector's next line. The typing box takes Enter: with a form in it, it rows; in an empty box it shows the Inspector's next line. Clicking the Inspector's arrow during typing leaves the focus in the typing box (and a phone keeps its keyboard up). When the tile bank changes at a new column, a keyboard player's focus moves to the first new tile. If the page is hidden in the middle of a leg the drum pauses. With reduced motion set, the animations stop (common.css) and the game still plays.

Screen readers: a polite live region in the oars panel says each new box ("Right. Box 4 of 24: porta, accusative singular."); the Inspector's lines go through the shell's live region. The page has a visually hidden h1.

## How the game decides

- **Charts in play.** These are the `LATIN_CHARTS.charts` in the player's grade with `ch <= min(player.chapter, last chapter with charts)`, current chapter first and then book order. At present that means grade 6 chapters 1 to 3 (5 charts) and grade 8 chapters 18 to 22 (10 charts: three in chapter 18, two in 19, one in 20, three in 21, one in 22).
- **Box order.** Boxes run down each column. When the blocks share their columns (singular then plural) a column runs through every block. Otherwise the game goes block by block (quis/quid). Vocative rows appear according to the setting ("as the book": the chart's `vocOn`).
- **Steps.**
  1. Calm water: each box shows `s`, or its whole form if `given`, and the child taps the ending.
  2. Open sea: one box in every run of three is prefilled. The prefilled boxes are spread over the chart and never include the first box. The child taps the endings of the rest.
  3. Storm: a blank chart where the child types each whole form. If the typing setting is off, the child taps endings instead.

  A step passes with at most one missed box, and a pass unlocks the next step.
- **Tile bank.** The distinct endings of the current column, shuffled once per chart. From step 2 there are 2 extra endings: from the chart's other columns first, then from the same kind of chart among the charts in play, then from the rest of the player's grade, and only if those have too few, from the other grade (so a 6th grader at chapter 2 gets 2nd-declension endings such as -ī or -us as wrong tiles, never -ēbus or -uum). An extra ending is never one of the column's own endings, never differs only by macrons, and never makes a right answer when put on the base of any box of the column. A bank has at most 10 tiles, one per number key, so a column of 9 endings (laudō and moneō in chapter 1) gets 1 extra ending instead of 2.
- **Typed forms, macrons "light".** A missing or extra macron is forgiven (shown as a slip) unless the macron is what tells this form from another form. The other forms are the chart's own boxes and every box of the charts that share a word with it (`RowLogic.kin`: the three agō, audiō, capiō charts; the three laudō, moneō charts of chapter 18 and chapter 1; magnus with porta, amīcus and nauta). So *porta* for *portā* is wrong, *fructus* for *frūctūs* is wrong, and *ageris* (the present, another chart) for the future *agēris* is wrong, and the other way round: the Inspector says "Only the macrons! ageris is the second person singular, present passive. This box is agēris." A form that is another box's form, even typed without macrons (*amicus* for *amīcōrum*), is named as that form. One chart's note is about the length of a vowel itself, with no other form at stake: c22 ("the e ... is long after a vowel (diēī) and short after a consonant (reī)"). There a slip on that e (*rēī*, *dieī*) is wrong under "light"; a slip on the final ī (*rei*, *diēi*) is still forgiven (`MACRON_POINT` in logic.js). "Strict" counts every macron.
- **Tonight's voyage.** It is made once a day, and again if the grade or chapter changes. Until its first leg is rowed it is made afresh each time the home is shown, so a chart rowed from the quay before sailing is planned at its next step. It holds:
  - the current chapter's first chart that is not fully passed, at its next step. If every chart is fully passed, the one played longest ago comes back at the Storm.
  - one review chart from an earlier chapter of the grade: the one played longest ago, at its highest passed step (or Calm water). If there is none, a second chart of the current chapter takes its place.
  - every chart with a miss tonight, once more, before the called boxes. These are queued once and never re-queued from an "again" leg.
  - the called boxes.

  That comes to about 5 to 10 minutes.
- **The drum.** Off has no drum, Slow beats every 1.8 s and Steady every 1.2 s. In the Storm it beats one notch slower, so the default Slow becomes Off there. An answer before the next beat (plus 250 ms grace) is in stroke and adds to the streak. A slow answer is never wrong: the oars wait. The music is ducked with `LatinShell.duck(true)` while the drum beats. The drum, splash and clash are synthesized with Web Audio and follow the sound setting. The drum button on the panel changes the beat for that leg. Below the Storm the change is saved as the setting.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page. The load order is as in SPEC: players.css (2.2), common.css, css/row.css; then courses.js, players.js, words.js, charts.js, players-fallback.js, detective.js, sfx.js, music.js, shell.js, js/logic.js, js/art.js, js/row.js |
| `js/logic.js` | `window.RowLogic`, also `module.exports`. It holds all the rules as pure functions: charts in play, boxes and their names, column kinds and labels, plan of a step (prefill, tile banks), judging tiles, the kin charts and the typed-form pool, typed forms and called-box choices, wrong forms, called boxes (and which prompts give their answer away), records, tonight's voyage, the again-queue and the beat. It has no DOM. In node it requires `../../latin-common/js/shell.js` for the Latin text helpers. |
| `js/art.js` | `window.RowArt`. It is the inline SVG art: the bireme (two oar banks, sail, eye, ram, drum, aplustre), the harbors, the lighthouse, the laurel, skies and waves per step, the home scene, pennants and icons, and the logo. This file is extra to SPEC's layout; it keeps row.js readable. |
| `js/row.js` | The screens and play: home, picker, voyage, called boxes, results, end and settings. It also holds the sounds, the drum and the keyboard handling. |
| `css/row.css` | The game's look on top of common.css: the harbor, quay cards, pennants, the sea strip and its animations (transform and opacity only), the chart sheet, tiles, panels, result and end cards, settings and print. It has layouts for phones (under 600), tablets (600 to 899) and laptops (900 and up). |
| `tools/check.js` | `node tools/check.js` loads words.js, charts.js, shell.js and logic.js in a `vm` context. It runs 120 seeds per chart and step and prints a summary. It exits 1 on any failure. |
| `tools/play.js` | `node tools/play.js [w h grade chapter]`, a Playwright run of tonight's voyage from `file://`, with wrong answers on purpose. It exits 1 on console errors, overflow or cut boxes, or if the voyage does not end. It also prints how far the play screens scroll (0 px at 390x844 and 1366x768). |
| `NOTES.md` | This file. |

## Storage

- **Players and the shared settings.** These live in `latinGames.v1`, which belongs to LatinPlayers and LatinShell. This game only reads them. It also writes `sound` and `music` through the shell buttons.
- **This game's progress.** It lives in `rowTheEndings.v1`, through `LatinShell.store`, which also drops the ids of removed players:

```js
{ v: 1, progress: { "<player id>": {
  charts: { "<chart id>": {
    best:   [ {got, of} | null, x3 ],   // best score at Calm water, Open sea, Storm
    passed: [ bool, x3 ],               // a pass sticks
    day:    "YYYY-MM-DD"                // last played (review picks the oldest)
  } },
  set: { beat: "off"|"slow"|"steady", voc: "book"|"always"|"never", typing: bool, macrons: "light"|"strict" },
  night: {                              // tonight's voyage, or null
    day, grade, chapter,                // made again when any of these changes
    legs: [ { id, step, why: "new"|"keep"|"review"|"again" } | { called: true, why: "called" } ],
    at: 0,                              // index of the leg being rowed
    played: [ { id, step, got, of, missed: ["b.r.c", ...], mode: "tap"|"type", voc: bool } ],
    called: { got, of } | null,
    done: bool
  }
} } }
```

A box key `"b.r.c"` is block.row.column in the chart. The defaults are `{ beat: "slow", voc: "book", typing: true, macrons: "light" }`. `RowLogic.settings()` cleans any stored value back to these.

## How to test

```sh
cd row-the-endings
node tools/check.js                  # rules: "All 2239634 checks passed." (about 40 s)
node tools/play.js 390 844 6 2       # phone, grade 6 chapter 2: a whole voyage with misses
node tools/play.js 1366 768 8 21     # laptop, grade 8 chapter 21
```

`tools/check.js` asserts:
- **Data:** every chart of grades 6 and 8 has `s + e = f`, and the right row and person order.
- **Boxes:** box order (down each column; quis/quid block by block) and box names. Sample names: "2nd sg. future passive"; *quārum*; *laudātī erāmus*.
- **Open sea:** the prefill covers a third of the chart, is spread, and never takes the first box.
- **Tile banks:** each bank holds the right ending exactly once and at most 10 tiles. Every wrong tile is checked on its own terms: base + wrong ending is not a right answer of any box of the column (not through the code under test). No extra is in the column or a macron twin. The wrong tiles come from the player's grade whenever the grade has enough.
- **Typed forms, in each strictness, with and without macrons,** judged against the chart and its kin charts, as in the game:
  - every form of the chart and of its kin charts typed for a box is wrong and named, also typed without macrons;
  - every form that differs from the box's only by macrons, in this chart or a kin chart, is wrong in light and strict and named (*agēris* / *ageris* both ways, *porta* / *portā*);
  - every missing macron and every extra macron on one vowel: a slip in light unless it makes another form or is the vowel a note is about; wrong in strict; the right spelling given is the box's form or one of its alternatives;
  - known cases: *porta* for *portā*, *portis* for *portīs*, *fructus* for *frūctūs* and *frūctus*, *amicus* for *amīcōrum*, *ageris* for *agēris* and back, *rēī* / *rei* for *reī*, *dieī* / *diēi* for *diēī*, *laudāta sum* and *laudatus, -a, -um sum*, *ager* `given`.
  - the kin charts are exactly the charts that share a column entry.
- **Called boxes:** the right form appears once among the choices; there are no duplicates, no wrong choice that is also right, no box asked twice per chart, and no prompt that gives its answer away (when the chart has enough other forms).
- **Records:** passes and best scores.
- **Tonight's voyage:** scenarios for grade 6 (chapters 2, 3 and 5), grade 7, and grade 8 (chapters 18 and 21).
- **The rest:** the again-queue and the beat.

By hand, or with Playwright, all of this was played at 390x844 and 1366x768, and checked at 320x640 and 768x1024:
- tonight's voyage with wrong tiles and wrong typed forms, results, the again-legs, called boxes (one wrong) and the end card;
- free play at every step, including locked steps and the button up to the next step;
- typing slips and named wrong forms;
- settings saved and applied (voc never, typing off, steady beat);
- the drum button;
- keyboard play;
- reduced motion;
- switching player mid-leg (the leg stops and the harbor rebuilds);
- another tab changing the chapter;
- a grade-7 player;
- `file://` and a local static server.

There were no console errors besides the 404s of Case Detective 2.2's three files. At 390x844 and 1366x768 the play screens and the called boxes fit without scrolling (measured on every chart at every step at 390x844, with the longest Inspector lines); at 768x1024 the porta chart and the called boxes fit too. No box is cut at 320x640 (the perfect passive with its long forms included).

After the QA review (fixes listed in "QA fixes" below) all of the above was replayed, plus: the Inspector's lines and column heads on quis, quid and the perfect passive; *ageris* typed for *agēris*; the arrow of the bubble during typing; Enter on result cards and on the home; a 10-tile bank; grade-6 wrong tiles; tonight's voyage after free play; reduced motion.

## What is left

- **Latin review.** A Latin teacher should look over the charts as the game shows them: the box names, the tile banks per chart, and which macron misses count as wrong under "light". The brief asks for an independent review of the chart data, and this game shows that data as it is.
- **Scrolling.**
  - The harbor home scrolls on phones and tablets (the quay is a list), and on a laptop for the 8th grader (10 charts on the quay). Only the play screens are fitted.
  - At 320x640 the play screen scrolls: the page is about 670 to 830 px tall, depending on the chart. Nothing overflows sideways and no box is cut. The panel stays docked at the bottom.
  - On tablets between 600 and 767 px wide and on short laptop windows (under 768 px high) a play screen can scroll a little (about 50 px at 600x900 and 900x700).
- **Extras beyond the spec's three settings (lead decision).** There is a fourth setting, "macrons when typing" (light / strict, default light), for the Storm. Its "light" is stricter than `LatinShell.check`'s light, which Climb to Consul uses: Row refuses a macron slip that makes another form of the chart or of a kin chart, or that misses the vowel a chart's note is about (above). Climb forgives every missing macron. That is deliberate: in a chart the macron often is the ending (portā, agēris). If the lead prefers exactly three settings, the `macrons` group can be removed from `openSettings` in row.js and the default (light) stays.
- **Music.** Case Detective's violin plays as it does in the other games and is ducked while the drum beats. The game has no music of its own.
- **Called boxes with typing.** From the quay a chart's called boxes are typed only when its Storm is passed. Before that they use tiles. Tonight's called boxes type for charts rowed at the Storm with typing on.
- **Missing charts.** Grades 7 and 9, and chapters past the last chart chapter, show a "charts are on their way" card or line. They will fill in when `charts.js` grows. No code change is needed, because the game reads `LATIN_CHARTS` as it is.
- **The lead's part.** The root `index.html` card and the README row are for the lead, as agreed.

## QA fixes (independent review)

- Major: "light" macrons compared forms within one chart only (*ageris* was accepted for *agēris*). Typed forms are now judged against the kin charts too, with tests both ways; c22's note vowel is checked as well.
- Major: the leg pips drew over the title and chip at 600 to 899 px. They show only from 900 px; below, a "Leg n of N" tag rides on the sea strip, and the top bar's middle clips anything that would not fit.
- Major: quis, quid and the perfect passive had no gender or tense labels, and the Inspector said "column: N.." and "the laudō column". Heads now carry M./F./N. and the tense; the Inspector names columns as the chart does; no full stop after an abbreviation.
- Major: the called-boxes screen was a small card on an empty panel. It now shows the chart of the called box with the box marked, the question and tiles in the oars panel, and a row of bells.
- Major: check.js could not catch those, and had a tautological tile check and an assertion that compared a value with itself. Both replaced; new tests listed under "How to test".
- Minor, all fixed: long typed alternatives cut off at 320 px (the box shows the chart's form; 3-column charts may shrink to 11 px); grade-8 wrong tiles for grade 6; called boxes that gave their answer away; tonight's voyage stale after free play; "Row tonight's voyage again" renamed "One more voyage"; the bubble arrow took the focus from the typing box; Enter paged through the Inspector before "Row on"; the 11th tile had no key (banks are capped at 10); "Bravō!" is now "Optimē!" and streaks are spelled out to ninety-nine; porta scrolled 15 to 23 px at 390x844 (now 0); prompts announced to screen readers, focus kept on the tiles, an h1; "once more" on the end card; the laptop home for grade 6 now has the three-steps card; NOTES said 11 charts for grade 8 (10).

## Requests for latin-common

- **README:** please note there that Row the Endings' "light" macron rule is stricter than `LatinShell.check`'s (see "Extras beyond the spec's three settings"), so the two games' behaviour is documented in one place. No code change is asked.
- **Top bar, optional:** between 600 and 700 px wide, with a long player chip, the logo button shrinks to 36 px wide. Row sets `.logo-btn { min-width: 44px }` for itself in row.css; the same line in common.css would cover every game.

Everything else this game needs was already there: `mount`, `compact`, `dialog`, `store`, `check`, `macronKeys`, `duck`, `live`, `rng` and `shuffle`. `duck` works with Case Detective's `Music.setVolume`/`getVolume`.
