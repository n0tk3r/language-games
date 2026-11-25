# language-games

Small browser games for practicing languages. Each game is a folder of static files, and `index.html` at the root links to them all.

| Game | Folder | What it practices |
| --- | --- | --- |
| Case Detective | [`case-detective/`](case-detective/) | Latin first declension noun cases (Wheelock's Latin, early chapters), with Inspector Cāsus as the guide |

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

## Adding a game

Put the game in a new folder with its own `index.html`, using relative paths only, then add a card for it to the root `index.html` and a row to the table above. File names are case-sensitive on GitHub Pages.
