# language-games

Small browser games for practising languages. Each game is a self-contained static page in its own folder, and `index.html` at the root links to them all.

| Game | Folder | What it practises |
| --- | --- | --- |
| Case Detective | [`case-detective/`](case-detective/) | Latin first declension noun cases (Wheelock's Latin, early chapters) |

## Publishing

The site is plain HTML with no build step. Serve it with GitHub Pages from the `main` branch at the root (`/`).

## Adding a game

Put the game in a new folder with its own `index.html`, using relative paths only, then add a card for it to the root `index.html` and a row to the table above.
