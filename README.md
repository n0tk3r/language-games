# language-games

Small browser games for practicing languages. Each game is a folder of static files, and `index.html` at the root links to them all.

| Game | Folder | What it practices |
| --- | --- | --- |
| Case Detective | [`case-detective/`](case-detective/) | Latin first declension noun cases (Wheelock's Latin, early chapters), with Inspector Cāsus as the guide |

## Publishing

The site is static files (HTML, CSS, JavaScript and fonts) with no build step and no outside requests. Serve it with GitHub Pages from the `main` branch at the root (`/`).

## Layout

- `index.html`: the landing page. It takes its fonts and the Inspector from `case-detective/`, so do not rename that folder.
- `case-detective/`: the game (`index.html`, `css/`, `js/`, `fonts/`).
- `case-detective/js/detective.js`: Inspector Cāsus, a self-contained animated guide that other games can reuse. `case-detective/detective-demo.html` shows his moods and sizes.
- `case-detective/fonts/`: Alegreya and Nunito, self-hosted under the SIL Open Font License 1.1 (licence files are in the folder).

## Adding a game

Put the game in a new folder with its own `index.html`, using relative paths only, then add a card for it to the root `index.html` and a row to the table above. File names are case-sensitive on GitHub Pages.
