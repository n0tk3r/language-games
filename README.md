# language-games

Small browser games for practicing languages. Each game is a folder of static files, and `index.html` at the root links to them all.

| Game | Folder | What it practices |
| --- | --- | --- |
| Case Detective | [`case-detective/`](case-detective/) | Latin: the first declension and the jobs of the cases (Wheelock's Latin, chapter 2), with Inspector Cāsus as the guide |
| Climb to Consul | [`climb-to-consul/`](climb-to-consul/) | Latin vocabulary by chapter: each word climbs the Roman offices (Quaestor, Aedile, Praetor, Consul), with Erase Away before a quiz and a printable word list (6th grade chapters 1 to 3, 8th grade 18 to 22 so far) |
| Row the Endings | [`row-the-endings/`](row-the-endings/) | Latin charts in Wheelock's layout: noun declensions and verb conjugations, one oar stroke per box (same chapters) |

## Curriculum

The Latin games follow *Wheelock's Latin* (7th edition), one game for one chapter, so that a class can play the game of the chapter it is on.

**Case Detective is chapter 2**: the first declension and the jobs of the cases.

- The chart is the book's own: the model noun *porta*, with the adjective *magna*, and the cases in the book's order (nominative, genitive, dative, accusative, ablative, vocative). Four more nouns of the chapter can be put into the same chart.
- Every sentence uses only words from the vocabularies of chapters 1 and 2. The Notebook in the game lists each of them with its full dictionary entry.
- The ablative comes in the way chapter 2 brings it in: as the "by, with, from" case, and after the preposition *sine*. Its named uses belong to later chapters and are not asked here.
- There are four case files: the job each case does in a sentence, singular and plural endings, the three look-alike forms in *-ae* (told apart from the sentence), and a mixed final round.

## Music

Case Detective plays Niccolò Paganini's 24 Caprices for solo violin in the background, on a violin that the browser synthesizes from note lists (no recordings). Five of them are in so far: Nos. 1, 2, 3, 23 and 24, made from free editions of the Mutopia Project (CC BY-SA 3.0 and CC BY-SA 4.0). `case-detective/music/README.md` and the game's credits page say where each piece comes from. The music has its own button, apart from the sound effects, and starts only after the first tap.

## Publishing

The site is static files (HTML, CSS, JavaScript and fonts) with no build step and no outside requests. Serve it with GitHub Pages from the `main` branch at the root (`/`).

## Layout

- `index.html`: the landing page. It takes its fonts and the Inspector from `case-detective/`, so do not rename that folder.
- `case-detective/`: the game (`index.html`, `css/`, `js/`, `fonts/`, `music/`).
- `case-detective/js/data.js`: every text and question of the game, and nothing else. The Latin was checked line by line, so change wording there with care.
- `case-detective/js/detective.js`: Inspector Cāsus, a self-contained animated guide that other games can reuse. `case-detective/detective-demo.html` shows his moods and sizes.
- `case-detective/js/scenes.js`: the small pictures that show who does what in a sentence. `case-detective/scenes-demo.html` shows them all.
- `case-detective/js/music.js` and `case-detective/music/`: background music, played by a small violin synthesizer from note lists. `case-detective/music/README.md` says which pieces are in the game.
- `case-detective/fonts/`: Alegreya and Nunito, self-hosted under the SIL Open Font License 1.1 (licence files are in the folder).

## The shared Latin parts

- `latin-common/`: what Climb to Consul and Row the Endings share: the look (`css/common.css`), the top bar, the Inspector's bubble and the settings (`js/shell.js`), the player profiles (`js/players-fallback.js`, the same browser key `latinGames.v1` and the same API as Case Detective's players), the word list (`js/words.js`) and the charts (`js/charts.js`), and `sources.html`, the page for parents on where the words and charts come from.
- `js/words.js` and `js/charts.js` are built by `latin-common/tools/build_words.py` and `build_charts.py` from the curriculum files; change the scripts and build again rather than editing them. Each game has `tools/check.js` (run with node), which checks every question and chart against them.

## Adding a game

Put the game in a new folder with its own `index.html`, using relative paths only, then add a card for it to the root `index.html` and a row to the table above. File names are case-sensitive on GitHub Pages.
