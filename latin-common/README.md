# latin-common: what the Latin games share

The shared parts of the Latin practice games (Climb to Consul, Row the Endings): the look, the top bar
with the player chip, Inspector Cāsus and his speech bubble, the players screens, storage, dates and the
Latin text helpers. Static files, classic scripts, no build step; works from `file://` and from GitHub Pages.

| File | What it is |
|---|---|
| `css/common.css` | Case Detective's tokens and fonts (from `../../case-detective/fonts/`), base, top bar, player chip, stage and bubble, desk, buttons, cards, sheets and dialogs, toasts, macron keys, players screens, focus ring, reduced motion, print base |
| `js/players-fallback.js` | `window.LatinPlayers` when Case Detective 2.2's `players.js` is not there: same API, same storage |
| `css/players.css` | The players screens' look on a page without `common.css` (the site's front page, where the players are picked): built by `tools/build_players_css.py` from `common.css`, every rule scoped to `.lp` (the screens' box) and `.lpf-cf` (the confirm box). Rebuild it after changing buttons, cards, dialogs or `.lpf-*` in `common.css` |
| `js/shell.js` | `window.LatinShell` (also `require("./shell.js")` in node for the text helpers) |
| `js/words.js`, `js/charts.js` | `LATIN_WORDS`, `LATIN_CHARTS` (built by `tools/`, do not edit) |
| `sources.html` | For parents: where the words and charts come from (printable) |
| `demo.html` | The shell on its own, with every button style, the bubble and the macron input. Open it to try things |

## Script order in a game's `index.html`

```html
<link rel="stylesheet" href="../case-detective/css/players.css">   <!-- 2.2: missing until it ships, harmless -->
<link rel="stylesheet" href="../latin-common/css/common.css">
<link rel="stylesheet" href="css/climb.css">
...
<script src="../case-detective/js/courses.js"></script>   <!-- 2.2 -->
<script src="../case-detective/js/players.js"></script>   <!-- 2.2 -->
<script src="../latin-common/js/words.js"></script>
<script src="../latin-common/js/charts.js"></script>      <!-- Row the Endings -->
<script src="../latin-common/js/players-fallback.js"></script>
<script src="../case-detective/js/detective.js"></script>
<script src="../case-detective/js/sfx.js"></script>
<script src="../case-detective/js/music.js"></script>
<script src="../latin-common/js/shell.js"></script>
<script src="js/logic.js"></script>
<script src="js/climb.js"></script>
```

The three 2.2 files 404 until Case Detective 2.2 is published (in Chromium from `file://`:
`Failed to load resource: net::ERR_FILE_NOT_FOUND`). Nothing else may 404 or throw. The body needs no markup
(a `<noscript>` line at most): `mount()` builds the page.

## A game in twenty lines

```js
(function () {
  "use strict";
  var S = window.LatinShell;
  var progress = S.store("climbToConsul.v1");          // { v: 1, progress: { "p1": {...} } }, pruned for you

  var shell = S.mount({
    id: "climb",
    title: "Climb to Consul",
    sub: "Wheelock’s Latin · words",
    logo: '<svg viewBox="0 0 32 32">...</svg>',         // your own inline SVG, drawn in brass
    onHome: function () { home(); },                    // the logo becomes a "home" button
    onSettings: function () { openSettings(); },        // shows the gear (in the chip menu on phones)
    filesIn: function (grade) { return { 1: true, 2: true, 3: true }; },  // chapters with content, marked "Ready"; asked for every chapter from 1 to the grade's last
    starsOf: function (p) { return null; },             // optional number on each player card
    onPlayer: function (player, how) {                  // how: "continue" | "added" | "chapter" | "update" | "none"
      state = progress.load(player.id) || fresh();
      home();
      shell.say(["Welcome back, <b>" + S.esc(player.name) + "</b>!", "Tonight: chapter " + player.chapter + "."], ["wave", "point"]);
    }
  });

  function home() { shell.desk.innerHTML = '<div class="view">...</div>'; /* your screen */ }
  function save() { progress.save(shell.player().id, state); }
})();
```

`onPlayer` is called after `mount()` returns (never inside it), once at the start and again whenever the
player or their grade or chapter changes. Rebuild your home screen there. `player` is a fresh copy: read
`player.grade` and `player.chapter` from it, not from a copy kept from earlier.

## `LatinShell.mount(opts)` → `shell`

Options: `id`, `title`, `sub`, `logo` (SVG string), `onPlayer(player, how, shell)`, `onSettings()`,
`onHome()`, `filesIn(grade)`, `starsOf(player)`, `folder` (this game's folder, for the way back from the front
page), `sourcesHref` (default: this folder's `sources.html`;
`false` hides the link), `gamesHref` (the "All games" link back to the site's front page; default
`../index.html`, `false` hides it), `hello` (a first line for the bubble), `root` (default `document.body`).

What it builds (`.ls-app`):

- **Top bar**: a house button "All games" at the far left on every screen (the words show from 900 px; accessible
  name "All games: the Language Games home page", the same as Case Detective's), the logo and title (a button if `onHome`), `shell.mid` (an empty middle slot for
  your progress pips or a round counter), then the player chip, music, sound and the optional settings gear.
  Chip text: "Playing as **{name}** · 6th grade · Chapter 2" on a laptop, "{name} · 6th grade · Chapter 2" on a
  tablet, the player's initial on a phone (below 480 px, where Settings moves into the chip menu too). The
  chip opens a menu: Switch player, Change chapter (and Settings on a phone).
- **Players are picked on the site's front page** (the parent, 2026-11-25: "The profiles should be loaded at the All
  games level"). The game opens as `LatinPlayers.current()`. With nobody chosen it goes, with `location.replace`,
  to `{gamesHref}?play={folder}#players`; Switch player and Change chapter (and `showPlayers()`, `addPlayer()`,
  `managePlayers()`, `changeChapter()`) open `{gamesHref}?play={folder}#players`, `#add`, `#manage` or `#chapter`.
  The front page draws the players screens there and, after the pick, opens `{folder}/index.html` again. When
  another tab chooses another player the game follows it; when the player is removed it goes to the front page.
  `folder` is the game's folder name (an option, or read from the page's address); the front page accepts only
  the site's own game folders. The players screens stay in the game only with `gamesHref: false`, or when this
  browser cannot write localStorage (so the choice could not be kept between the pages).
- **Stage**: Inspector Cāsus as a bust in a round brass frame, and his speech bubble. A tap on him while he
  is quiet makes him wave or think (like Case Detective).
- **Desk**: `shell.desk` is yours (a wooden desk, max width `--maxw`, default 860 px: set `.ls-app { --maxw: ... }`
  in your CSS if you need more). The players screens are shown in their own box next to it, and your desk is
  hidden (not emptied) meanwhile.

`shell` has:

| Member | What it does |
|---|---|
| `say(lines, mood, { onEnd })` | `lines`: one HTML string or a list (one idea a line). Several lines get a "next" arrow and dots; a tap on the bubble goes on too. `mood`: one mood for the first line, or a list with one per line; `"!cheer"` plays it once then back to idle. Only `b i u em strong br span small sub sup` survive (with `lang`, `class`), so escape names anyway with `LatinShell.esc`. Each line goes to an `aria-live` region. `onEnd` runs when the last line is shown |
| `more()`, `next()` | Is there another line? Show it (returns false at the end). Call `next()` from your Enter key handler when `more()` |
| `mood(m)`, `act(m, ms)` | `setMood`, `play` of the Inspector. Moods: idle wave think search point cheer oops proud |
| `detective` | The `Detective` element itself, or `null` if `detective.js` is missing. 2.2 adds `violin(on)`, `bow()`; check before calling |
| `player()` | A fresh copy of the player in play (`{ id, name, color, grade, chapter }`) or `null` |
| `showPlayers()`, `addPlayer()`, `managePlayers()`, `changeChapter(id?)` | Open those screens on the front page (see above), which comes back to the game; with `gamesHref: false`, in the game itself. Either way the game then calls your `onPlayer` |
| `view()` | `"game"` or `"players"` |
| `toast(html, { kind: "good" \| "bad", ms })` | A short note at the bottom (also read out) |
| `dialog({ title, text \| html \| el, buttons: [{ label, kind, value }], sheet, alert, close })` | A modal; `sheet: true` makes it rise from the bottom (settings). Returns a Promise of the button's `value`, or `null` (Esc, scrim, ×). Focus is trapped and given back |
| `live(text)` | Read a line out (polite) |
| `compact(on)` | Make the Inspector small (58 px) while a question needs the room |
| `setTitle(t, s)`, `setSub(s)` | Change the title or the line under it |
| `el`, `bar`, `mid`, `stage`, `bubble`, `screens` | The elements |
| `sfx(name)`, `settings()`, `set(k, v)` | Same as on `LatinShell` |

Sound and music follow the shared settings (`latinGames.v1.sound`, `.music`): the buttons write through
`LatinPlayers.set`, and every change (this page, the players screens, another tab) calls
`Sfx.setMuted(!sound)` and, after the first tap or key press, `Music.setEnabled(music)`. The music button
is hidden when `music.js` or Web Audio is missing.

## `LatinShell` (no mount needed)

| Function | What it does |
|---|---|
| `store(key)` → `{ key, load(pid), save(pid, data), remove(pid), prune() }` | Your game's own key, `{ v: 1, progress: { "p1": {...} } }`. `load` returns a copy or `null`. `prune()` drops ids no longer in the player list; it runs when the store is made and whenever a player is removed. Kept in memory for the visit when localStorage throws |
| `today(date?)` | `"2026-11-25"` (local time) |
| `days(a, b?)` | Whole days from `a` to `b` (default today); `days("2026-11-25", "2026-12-02") === 7`. Safe over clock changes |
| `strip(s)` | Macrons (and breves) off: `strip("fāma") === "fama"` |
| `norm(s)` | Lower case, trimmed, one space between words, `? . , ! …` dropped, curly quotes made straight, an initial `"to "` dropped. Use it to compare English too |
| `check(typed, answers, mode)` → `{ ok, slip, answer }` | `answers`: a string or a list (put `alt` spellings in it). `mode`: `"ignored"`, `"light"` (default) or `"strict"`. Same letters with a missing or extra macron: ignored → `ok: true`; light → `ok: true, slip: true` (show `answer`, the right spelling); strict → `ok: false, slip: true` ("only the macrons"). `answer` is the matched answer, or the first one Row the Endings uses a stricter "light" of its own for chart forms: a slip that makes another form of the chart (agēris / ageris) is wrong there. |
| `macronKeys(input, { into? })` → `{ row, input, put(ch), destroy() }` | Puts a row of ā ē ī ō ū keys before the input (or into `into`); the keys type at the caret and keep the phone keyboard up (Shift for capitals). Typing a vowel then `-` or `=` makes it long (`a-` → ā, `A=` → Ā, also ȳ). Sets `lang="la"`, `autocapitalize`, `autocomplete`, `autocorrect` off, `spellcheck="false"`, and class `la-input` |
| `longs(s)` | The same `a-` → ā rule on a whole string |
| `rng(seed)` → `r` | Seeded random numbers (mulberry32): `r()` in [0, 1), `r.int(n)`, `r.pick(list)`. A number or a string seed |
| `shuffle(list, r?)` | A shuffled copy (Fisher-Yates), with `r` or `Math.random` |
| `esc(s)`, `rich(html)` | Escape for HTML; the bubble's tag filter (a DocumentFragment) |
| `icon(name)` | Inline SVG: next back sound mute music music-off gear star check x plus caret files book user users home |
| `sfx(name)` | `Sfx.play(name)` if sound is on and `sfx.js` is there: tap correct wrong clue ruleout star stamp fanfare rankup blip |
| `duck(on)` | Music down to a whisper (`true`) and back (`false`), for Row the Endings' drum |
| `settings()`, `set("sound" \| "music", bool)` | The shared settings (in memory if there is no player list) |
| `base` | The URL of this folder |

In node: `const S = require("../latin-common/js/shell.js")` gives the same object; everything but `mount`,
`macronKeys` and `rich` works without a DOM. Or load it in a `vm` context like `words.js`.

## `window.LatinPlayers` (players-fallback.js, or Case Detective 2.2's players.js)

Storage, shared by every game on the site: localStorage `latinGames.v1` =

```
{ "v": 1, "players": [ { "id": "p1", "name": "Player 1", "color": "#b4441c", "grade": 6, "chapter": 2 } ],
  "last": "p1", "sound": true, "music": true }
```

(`last` is `null` when nobody has played yet. Fields a later version adds are kept.)

| Member | |
|---|---|
| `KEY`, `NAME_MAX` (20) | |
| `list()` | Copies of the players, the one who played last first |
| `get(id)`, `current()` | A copy or `null`; `current()` = the player in `last` |
| `choose(id)` | Makes them `last`, saves, fires change |
| `add({ name, grade, chapter })` | The new player (`id` "p" + next number, the first free colour); `null` if the name is empty after cleaning. Does not choose them. Grade 7 or 9 (not open yet) becomes 6; a chapter the grade may not be on (see `inGrade`) becomes the month's chapter |
| `update(id, { name?, grade?, chapter? })` | The updated copy. A chapter is kept if `inGrade` allows it. A new grade keeps the chapter only if it is one of the new grade's own (`first` to `last`), else it moves to that grade's month chapter; the same grade keeps any chapter it may be on |
| `remove(id)` | `true` if removed. Each game's `store().prune()` then drops its progress |
| `settings()`, `set("sound" \| "music", bool)` | |
| `onchange(fn)` → unsubscribe | `fn()` after any change here or in another tab |
| `cleanName(s)` | No `<`, `>` or control characters, spaces collapsed, at most 20 characters |
| `grades()` | `[{ grade, course, first, last, soon, months, start }]`: 6 Latin IA 1-8, 7 Latin IB 9-17 (soon), 8 Latin II 18-27, 9 Latin III 28-40 (soon). In the fallback `months` is 12 chapters, January first; `start` is the month the school year starts (8). Do not depend on these two |
| `gradeInfo(g)`, `canPlay(g)` | |
| `inGrade(g, ch)` | A chapter a player of the grade may be on: any whole chapter from 1 to the grade's `last`, so a class that is still on an earlier chapter can go back (1 to 27 for an 8th grader). Above the grade's last, 0, 2.5 or "x" is refused. Every write (a pick, add, update, a sound or music switch) keeps such a chapter |
| `courseOf(ch)` | The entry of `grades()` whose chapters hold `ch`, also a grade still to come (chapter 15: grade 7, Latin IB); `null` for none. A game gives a player on an earlier chapter the content of that chapter's course: never take `p.chapter >= gradeInfo(p.grade).first` for granted |
| `monthChapter(g, date?)` | Hillsdale's plan: grade 6 Aug-Oct 1, Nov 2, Dec 3, Jan 4, Feb 5, Mar 6, Apr 7, May-Jul 8; grade 8 Aug-Sep 18, Oct 19, Nov 21, Dec 22, Jan 23, Feb 24, Mar 25, Apr 26, May-Jul 27 |
| `chapter(n)` | `{ title, short }` (Wheelock's title from `LATIN_WORDS.chapters`; `short` is its first part) |
| `gradeLine(p, withCourse?)` | `"6th grade · Chapter 3"`, `"6th grade · Latin IA · Chapter 3"`; the course is that of the player's chapter: `"8th grade · Latin IB · Chapter 15"` |
| `screens(host)` | `{ players(), add(), manage(), changeChapter(id) }`. The shell is the host; you do not call this yourself. The chapter step shows the grade's own chapters (this month's marked), then a button "Earlier chapters" ("For a class that is still on an earlier chapter.", `aria-expanded`, `aria-controls`) over the chapters 1 to `first - 1`, grouped by course; the list is open when the chosen chapter is one of them. 6th grade has none, so its step has no button |

The fallback also has `fallback: true`; 2.2's file will not. Uses `window.CD_COURSES` (grades, months,
`playerColors`, `chapters`, `lines`) when it is there. It does not convert a Case Detective 2.1 save: 2.2
does that.

## CSS you can use

All from `common.css`, in Case Detective's look:

- Tokens: `--night-*`, `--wood-*`, `--parch*`, `--ink`, `--ink-2`, `--cream*`, `--brass*`, `--red`, `--red-lt`,
  `--red-dk`, `--red-tint`, `--stamp`, `--f-ui` (Nunito), `--f-serif` (Alegreya), `--pad`, `--maxw`, and the
  gradients `--brass-grad`, `--wood-grad`, `--red-grad`, `--parch-grad`. The case colours (`--nom` ... `--voc`)
  are Case Detective's code for the cases; `--acc` and `--voc` lean purple, so use them for cases only.
- Layout: `.view` (a screen in the desk, fades in), `.dock` (buttons at the bottom), `.desk-h`, `.desk-p`.
- Buttons (all at least 44 px): `.btn.primary` (brass, the one way on), `.btn.wood`, `.btn.ghost` (on wood; it
  takes ink on parchment), `.btn.danger` (red), plus `.sm`, `.block`, `.grow`; `.tlink` (a text link button).
- Parchment: `.card` (with `.card-tab` and `.card.tabbed` for a folder tab), `.sheet` (a note in the flow,
  brass top edge; `.sheet.bad` red), `.chip`, `.chip.latin`, `.chip.red`, `.stamp`.
- Modal: `.scrim`, `.dlg`, `.dlg.bottom` (made by `shell.dialog`). `.toast`, `.toast.good`, `.toast.bad`.
- Typing: `.mk-row`, `.mk-key`, `.la-input` (`.ok`, `.no`), `.shake`, `.pop`.
- `[lang="la"]` is set in Alegreya. `.sr` hides text for screen readers only. `.nw` no wrap.
- Print: a white page, black ink; the top bar, the stage, toasts, dialogs and every button are hidden. `.no-print`,
  `.print-only`.
- `prefers-reduced-motion` stops every animation and transition.

## Things to know

- Children's names live only in the browser. Never put one in code, a page, a test or a commit.
- Escape a player's name before it goes into HTML: `S.esc(player.name)`.
- Keep the Inspector's lines short, one idea a line; Latin always with its macrons, in `<i>`.
- The shell does not bind Enter or the number keys: your game does (and calls `shell.next()` when `shell.more()`).
- Music may only start after the first tap or key press; the shell handles that.
- Test with `demo.html` from `file://`; the three 2.2 files are the only errors in the console.
- Do not change anything inside `case-detective/`.
