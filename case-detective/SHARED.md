# Case Detective 2.2: the parts other games share

Every Latin game of the site can use the players of Case Detective: one list of players in the browser (name, grade, chapter, badge color), the device’s sound and music switches, the screens that choose and set up a player, the Inspector, and the music. A game loads these files from the `case-detective/` folder next to its own and keeps its own progress, by player id, under a key of its own.

## Differences from the draft API

The names of the draft of November 25 all work as written. What is different or new:

1. The shared list has one more field, `next`: the number of the next new id. An id is never given twice, so progress a game still keeps for a removed player can never pass to a new one. Leave it alone.
2. `onchange(fn)` calls `fn({ remote })`: `remote` is `true` when the change was made in another tab or window. `fn()` without the argument works as before.
3. `host.say(lines, mood, o)` gets a third argument, `o.moods`: one mood per line. A mood that starts with `!` (`"!wave"`) is a short gesture, after which he stands idle; `mood` is the mood of the first line without the `!`.
4. `host.picked(player, how)` can also get `how: "back"`: the player left the chapter step of `changeChapter` with Back, and nothing changed.
5. `host.icon(name, cls)` gets the class the icon should carry (`"ic"`, or `"ic ch-key"`); an SVG returned without a class gets it.
6. New, all optional, on `host`: `confirm(words, done)` (your own dialog for Remove), `tap()` (a tap sound), `text` (your own words on the screens), `lines` (the Inspector’s lines, in place of those of `CD_COURSES`).
7. `screens(host)` also returns `rename(id)` and `changeGrade(id)`, the steps of Manage players on their own.
8. New on `LatinPlayers`: `isNew()`, `badge(player, cls)` and `html(s)` (see below).
9. `grades()` gives each grade as `courses.js` has it: `{ grade, course, first, last, soon, months }`, and `start` only where a grade sets one.
10. `add()` does not make the new player the current one: call `choose(id)` for that. (The Add a player screen does it for you.)
11. `css/players.css` holds the screens as they look in Case Detective, with one exception: on a low, wide screen (a phone on its side, a small laptop window) Case Detective puts the buttons at the foot of a screen on the sill under the Inspector’s window. That layout is the game’s own; in `players.css` the buttons stay at the foot of the screen. The dialog and its scrim are `.lp-confirm` and `.lp-scrim`, and Case Detective’s desk, to put the screens on if you like, is `.lp-desk`.
12. `Detective.create()` returns the Inspector’s element itself (a `<span>`), with the methods on it: put it in the page where he should stand.
13. Without `host.text` and `host.lines` the screens speak as in Case Detective: the last button of Add a player says “Open my case files”, Remove speaks of “stars, ribbons and rank”, and the Inspector of detectives and case files. A game written for the draft passes at least `text.start` and `text.wiped` (as the example below does), and `lines` where his lines would not fit.
14. Case Detective itself no longer shows “Who’s on the case?” where the site’s home page is above it and the list can be stored: the players are chosen on the home page, and Case Detective opens for the current player (see “Where the players are chosen” below). Its own screens stay for other hosts and sandboxed frames. A save of 2.1 is no longer given to a new “Player 1” there: the first players who come are asked whether its stars are theirs.
15. A class that is still on an earlier chapter can go back. A player’s `chapter` may be any chapter from 1 to the grade’s `last`: 1 to 27 for an 8th grader, 1 to 8 for a 6th grader (as before). `inGrade(g, ch)` is true for all of them (the name stays), and `add()`, `update()` and the stored list keep such a chapter; a chapter above the grade’s last, 0, 2.5 or `"x"` is still refused. A new player and a change of grade still start on `monthChapter(g)`, one of the grade’s own chapters (`first` to `last`). New: `courseOf(ch)`, the entry of `grades()` whose chapters hold `ch`, also for a grade still to come (chapter 15: 7th grade, Latin IB), and `gradeLine(p, true)` names the course of the player’s chapter (“8th grade · Latin IB · Chapter 15”; `gradeLine(p)` stays “8th grade · Chapter 15”). The chapter step shows the grade’s own chapters first, as before; the earlier ones, grouped by course, are one press away under “Earlier chapters” (“For a class that is still on an earlier chapter.”), open when the player’s chapter is one of them (6th grade has none: its step is unchanged). What it means for a game: give a player on an earlier chapter the content of that chapter’s course, `courseOf(p.chapter)`, as Case Detective does (an 8th grader on chapter 5 gets the case files of Latin IA up to chapter 5, as a 6th grader on chapter 5 does), or the nearest content you have; never take `p.chapter >= gradeInfo(p.grade).first` for granted; and expect `filesIn(grade)` to be asked for every chapter from 1 to the grade’s last.
16. New on `LatinPlayers`: `met(id)`. The Inspector introduces himself once to a device’s first player: when `screens(host)` opened with `playersFirst` (his introduction, for a list with nobody in it) and that player was then added there, `met(id)` is `true` for that player once, in this page or the next one this tab opens (the mark is kept in `sessionStorage`, `latinGames.met`, and read only once). Case Detective uses it so that its welcome of a new player does not introduce him again (`CD_COURSES.lines.arrive.met`: “Welcome to the office, Sam! I am glad to have you on the case.”). A page that never calls it loses nothing.

## Files

All in `case-detective/`. Plain scripts (no modules, no build step), loaded with relative paths from any folder of the site, from a folder on disk (`file://`) or inside a frame. Nothing is ever asked from another site.

| File | Global | What it is |
|---|---|---|
| `js/courses.js` | `window.CD_COURSES` | Data only: the grades, their months and chapters, the chapter titles, the players’ colors, the Inspector’s lines. Load it before `players.js`. |
| `js/players.js` | `window.LatinPlayers` | The list of players and the two switches, the course helpers, and the screens: “Who’s on the case?”, Add a player, Manage players, the chapter step. Needs nothing but `courses.js` (without it, one grade: 6th grade, chapter 2). |
| `css/players.css` | | The styles of those screens, all under the root class `.lp`, with Case Detective’s fonts (from `fonts/`) and colors. |
| `js/detective.js` | `window.Detective` | The Inspector: an animated cartoon in inline SVG, with his violin. Needs nothing else. |
| `js/music.js` | `window.Music` | The background music, played by a small string band (Web Audio): each part on its own instrument, with recordings of a real violin, viola and cello (`js/sampler.js`, which `music.js` fetches itself if the page does not load it), or a synthesizer for each until they are in. Finds `music/` from its own address, so it plays from any folder. |
| `music/` | | The pieces (`list.js`: the calm list, slow Vivaldi and gentle pieces linked to the Holmes stories, and the show list, Paganini’s Caprices; one file a piece, such as `vivaldi-01.js`, `bach-14.js` and `paganini-124.js`) and the recordings (`violin/`, `viola/`, `cello/`), fetched by `music.js` itself, and the credits (`credits.html`, `README.md`). |
| `fonts/` | | The two fonts, Nunito and Alegreya (SIL Open Font License), for `players.css`. |

## Loading from a sibling folder

A game in `my-game/`, next to `case-detective/`:

```html
<link rel="stylesheet" href="../case-detective/css/players.css">
...
<script src="../case-detective/js/courses.js"></script>
<script src="../case-detective/js/players.js"></script>
<script src="../case-detective/js/detective.js"></script>   <!-- if the Inspector appears -->
<script src="../case-detective/js/music.js"></script>       <!-- if the music plays -->
```

- `players.css` brings its fonts from `../fonts/` beside it, and `music.js` fetches `../music/list.js` and the pieces beside it, whatever the address of your page.
- Every game of the site has one origin (on the site’s host, every folder and every project site of the same account), so the games share one `localStorage`. Two games on different origins cannot share players. Opened from a disk (`file://`), whether two games share the list depends on the browser: some give every `file://` page one storage, others do not.
- In a sandboxed frame without `allow-same-origin`, `localStorage` throws: `players.js` then keeps the list in memory for the visit, and the screens work as usual. (Fonts in such a frame come only if the host sends `Access-Control-Allow-Origin`, as the site’s host does for every file.)
- A screen can be taller than the window (a phone, three players). The element you show the screens in must be free to grow: with `.lp-desk` (a column flex item), make the page a column flex box with `min-height: 100%` on the body, not `height: 100%`, or the screen runs out of the desk (see the example).

## Storage

`localStorage`, one origin. The shared key, `latinGames.v1`:

```
{ v: 1,
  players: [ { id: "p1", name: "Sam", color: "#b4441c", grade: 6, chapter: 3 } ],
  last: "p1",      // the player who played last: shown first, "Continue as ..."
  sound: true,     // the sound effects of every game, on or off
  music: true,     // the background music of every game, on or off
  next: 2 }        // the number of the next new id
```

- `id`: `"p"` and a number, never given twice. `name`: 1 to 20 characters, no control characters, no `<` or `>`, and no invisible marks such as zero-width spaces or marks of writing direction (`cleanName` does that). `color`: from `CD_COURSES.playerColors`, the first one no other player has. `grade`: 6, 7, 8 or 9; a grade marked `soon` (7 and 9 for now) cannot be picked yet. `chapter`: a whole number from 1 to the grade’s `last`: one of the grade’s own chapters (`first` to `last`), or an earlier one, for a class that is still on an earlier chapter (see 15 above). A stored chapter outside that range becomes this month’s chapter when the list is read.
- Change the list only through `LatinPlayers`. Before every change it reads the key again and then writes it whole (fields it does not know are kept), so two tabs never undo each other.
- Names stay in the browser: nothing is sent anywhere. Keep your own progress free of names too.
- Each game keeps its progress under its own key, by player id (for example `climbToConsul.v1`). When an id is no longer on the shared list, the game drops its progress: at start and in `onchange`.
- Case Detective’s own key, `caseDetective.v1`: `{ v: 2, progress: { "p1": { stars, solo, seen } }, piece }` (`stars`: 0 to 3 for each case file, `solo`: the files solved without a clue, `seen`: the briefings already read, `piece`: the number of the calm piece the music was at). While the stars of a 2.1 save wait for their player (below) the key also has `old: { stars, solo, seen }` (those stars) and `asked: ["p2", ...]` (the players who said they are not theirs).
- A save of Case Detective 2.1 is one player without a name: `{ stars, solo, seen, sound, music, piece }` under `caseDetective.v1`. Its stars are never dropped before someone takes them.
  - Where the players are chosen on the home page (below), its stars wait in `old`. The Inspector asks each player once, before the casebook, with the number of stars: were these yours? “Yes, it was me”: they join that player’s progress (the better stars of each file, its ribbon, the briefings seen), and `old` and `asked` go. “No, it wasn’t me”: they stay for another player, and the player’s id goes into `asked`, so that player is not asked again. A player removed from the list leaves `asked` too.
  - Elsewhere (another host, a sandboxed frame), and when the address names a grade (`?grade=6&chapter=2`), the save becomes the player “Player 1” (or the next free “Player N”), 6th grade, chapter 2, with all its stars, ribbons and seen-flags, the first time Case Detective 2.2 opens; stars that wait in `old` do the same there.
  - Its sound and music switches become the device’s (only while no game has saved the list yet, where the stars wait for their player). A save with the sound off and nothing about music keeps the music off too. (A 2.1 key that holds nothing but the sound switch makes no player.) Only Case Detective reads its own key: another game has nothing to do for 2.1.

## window.LatinPlayers

```
KEY, NAME_MAX              "latinGames.v1", 20
list()                     copies of the players, the one who played last first, then in the order added
get(id)                    a copy, or null
current()                  the player who played last (a copy), or null
choose(id)                 makes that player the current one; the copy, or null
add({ name, grade, chapter })
                           a new player (id and color given), or null if the name is empty once cleaned;
                           a grade that cannot be played becomes the first grade, a chapter that is not
                           1 to the grade’s last (inGrade) becomes this month’s chapter
update(id, { name?, grade?, chapter? })
                           the changed copy, or null; an empty name, a grade that cannot be played or a
                           chapter that is not 1 to the grade’s last is ignored (a new grade given without
                           a chapter keeps the chapter only if it is one of the new grade’s own, first to
                           last; else it gets this month’s chapter)
remove(id)                 takes the player off the list (each game then drops its progress): true or false
settings()                 { sound, music }
set("sound" | "music", on) saves the switch for every game: true; false for any other name
onchange(fn)               fn({ remote }) after every change, in this page or in another tab or window (also
                           checked again when the page is shown); returns a function that stops it
cleanName(s)               the name as it would be saved ("" if nothing is left)

grades()                   [{ grade, course, first, last, soon, months, start? }] (copies)
gradeInfo(g)               one of them, or null
canPlay(g)                 the grade exists and is not "coming soon"
inGrade(g, ch)             a player of the grade may be on that chapter: a whole number from 1 to the grade’s
                           last (its own chapters, first to last, and the earlier ones, for a class that is
                           still on one of them)
courseOf(ch)               the grade whose chapters (first to last) hold ch, a copy as in grades(), also a
                           grade still to come (courseOf(15): 7th grade, Latin IB); null for no chapter
monthChapter(g, date?)     the chapter of that month on the school’s plan (June and July: the grade’s last),
                           always one of the grade’s own; the chapter a new player starts with
chapter(n)                 { title, short } (short may hold <i>); empty strings for an unknown chapter
gradeLine(player, withCourse?)
                           "6th grade · Chapter 3", or with the course of the player’s chapter:
                           "6th grade · Latin IA · Chapter 3", "8th grade · Latin IB · Chapter 15"

isNew()                    nothing has ever been saved under the shared key on this device
met(id)                    the screens have just introduced the Inspector to this new player (16 above): true
                           once, then false
badge(player, cls?)        the HTML of the player’s round badge (first letter on the player’s color)
html(s)                    a line with <b>, <i> and <u> as HTML, everything else escaped; <i> is Latin
```

## The screens

```
var ui = LatinPlayers.screens(host);
ui.players();             “Who’s on the case?”: a card for each player, Add a player, Continue as ..., Manage players
ui.add();                 Add a player: name, grade, chapter (three steps, each with Back)
ui.manage();              Manage players: Rename, Change grade, Remove (asks first)
ui.changeChapter(id);     the chapter step alone
ui.rename(id);  ui.changeGrade(id);   the steps of Manage players on their own (Save, or Back from the
                          first step, ends on Manage players: no picked())
```

The chapter step lists the grade’s own chapters (this month’s marked “this month”, those of `filesIn` with the files mark). Each chapter is a button (`aria-pressed`) named by its words in one line, its `aria-label`: “Ch. 3 Second declension: masculine, has case files”, “Ch. 21 Present passive: third and fourth conjugations, this month”. Below them, where the grade has earlier chapters (8th grade: 1 to 17), a dashed button “Earlier chapters”, with the line “For a class that is still on an earlier chapter.” under its name (`.ch-open`, `aria-expanded`, `aria-controls`; the name is its `aria-label`, the line its description, `aria-describedby`) opens and closes them in place: one group a course, under its heading (“Latin IA · chapters 1 to 8”, “Latin IB · chapters 9 to 17”). It is open when the player’s chapter is one of them; closed, it names an earlier chapter that is chosen: “Chapter 5 chosen” under its line, heard as “Earlier chapters, chapter 5 chosen”. Opening it keeps the focus on the button and, where the list opens below the screen or under the buttons at its foot, brings its first chapter into view.

Each screen is a new element with the class `lp` (`view v-players`, `view v-players v-manage`, `view v-setup st-name`, `st-grade`, `st-chapter`), handed to `host.show`. The screens handle their own taps. When another tab changes the list, “Who’s on the case?” and Manage players draw themselves again in place (the same element, without a new `host.show`; the focus stays on the same button). A step of Rename or Change grade for a player who was removed meanwhile goes back to Manage players, and the chapter step to “Who’s on the case?”.

The focus: the name step puts it in its field. When the player drives with the keyboard and the focus went away with the screen before (it was on one of its buttons), it goes to the heading of the new screen; a game that puts the focus somewhere itself in `show` keeps it there. A game’s own screens should do the same (the example does).

`host` is what your game gives:

```
show(el, kind)            required: put the screen in the page, where it belongs, before you return (kind:
                          "players", "manage" or "setup")
picked(player, how)       required: a player was chosen; open your game for them. how: "continue" (a card or
                          Continue as), "added" (Add a player is done), "chapter" (a new chapter was saved) or
                          "back" (Back on the chapter step: nothing changed). After continue, added and
                          chapter the player is the current one; back gives the step’s player, unchanged.
say(lines, mood, o)       the Inspector’s lines for the screen (HTML with <b> and <i> only; a name in them is
                          escaped), the mood of the first line, o.moods: one per line ("!wave": a gesture)
starsOf(player)           a number for the player’s card (your own stars); without it the cards show none
filesIn(grade)            { <chapter>: true } for the chapters where your game has something: marked on the
                          chapter step (for every chapter from 1 to the grade’s last, the earlier ones too)
sourcesHref               a link at the foot of “Who’s on the case?” (“For parents: where the material comes from”)
icon(name, cls)           your SVG for "next", "star" or "files" (players.js has its own)
confirm(words, done)      your own dialog for Remove: words { title, text, no, yes }, plain text (the name in
                          them is not escaped: set them with textContent); call done(true) to remove,
                          done(false) to keep. Without it players.js shows its own (.lp-confirm).
tap()                     called on every tap of a button of the screens (for a tap sound; mind the sound switch)
text                      your words: { title, start, files, wiped, sources }. Defaults: "Who’s on the case?",
                          "Open my case files" (the last button of Add a player), "case files" (what the chapter
                          step marks), "{name}’s stars, ribbons and rank will be wiped from this device. The other
                          players stay." (the dialog for Remove), and the link at the foot. Case Detective’s
                          words: pass your own where they would not fit (see 13 above).
lines                     the Inspector’s lines, by name, in place of CD_COURSES.lines (a name you leave out
                          keeps the line of CD_COURSES)
```

The Inspector’s lines are in `CD_COURSES.lines`: `playersFirst`, `playersBack`, `playersManage`, `askName`, `askGrade`, `askChapter`, `changeChapter`, `changeGrade` (`{name}` is filled in). Every button is 44 px tall or more, everything works with the keyboard alone (Enter in the name field goes on) and with a screen reader (labels, `aria-pressed` on the chapters, a name for each card), and nothing moves when the device asks for reduced motion. The dialog of `players.js` is an alert dialog: the focus starts on Keep, Tab stays inside, Escape or a tap beside it keeps the player, and the page behind it is inert until it closes.

## The look: css/players.css

- Every rule is under the root class `.lp`: the screens carry it, and so can your own elements to borrow the buttons (`.btn` with `primary`, `ghost`, `danger` or `sm`, `.tlink`, `.dock`) and the type. `.lp-desk` is Case Detective’s wooden desk, for the element you put the screens in.
- Colors and fonts are custom properties with Case Detective’s values: `--parch`, `--ink`, `--ink-2`, `--slate`, `--cream` (the text), `--cream-2`, `--brass` and `--brass-lt` (the main button), `--brass-ink`, `--red` and `--red-dk` (Remove), `--f-ui` (Nunito), `--f-serif` (Alegreya, for Latin), `--pad` (the side padding of the desk: 9, 12 or 22 px by screen width). Each badge has its player’s color in `--pc`. To use your own, set them in a rule for `.lp` after `players.css`, for example `.lp { --brass: #c98b2b; }`: every `.lp` element sets them again, so setting them on an outer element is not enough.
- The screens follow the screen size as in Case Detective (two columns of cards and larger buttons from 600 px wide, less space and lower buttons on short screens, never under 44 px) and keep still when reduced motion is asked for.

## The Inspector: js/detective.js

```
var d = Detective.create({ size: 160, variant: "full", mood: "idle" });   // or variant "bust"
place.appendChild(d);     // d is his element (a <span>), with the methods on it
d.setMood(m)              one of Detective.MOODS: idle, wave, think, search, point, cheer, oops, proud
d.play(m, ms)             a mood for a while, then back to the one before
d.talk(on)                his mouth moves while a line appears
d.lookAt(x, y)            he looks toward a point of the page (null: straight ahead)
d.setSize(px), d.setVariant(v), d.getMood()
d.destroy()               stops him (his timers); take his element out of the page yourself
d.violin(true)            he takes out his violin (0.8 s) and plays; d.violin(false) puts it away (0.5 s)
d.bow()                   one turn of the bow, for a note; with no bow() for 1.2 s he bows on his own
d.isPlaying()
```

His colors are custom properties on him or any element around him: `--dt-coat`, `--dt-coat-shade`, `--dt-hat`, `--dt-accent`, `--dt-skin`, `--dt-hair`, `--dt-line`, `--dt-lens`, and `--dt-accent-shade`, `--dt-accent-light`. With reduced motion he keeps still and simply holds the violin. Cheer and oops are for right and wrong answers only.

In Case Detective he plays his violin when a player has not touched the game for half a minute in a case: `d.violin(true)`, `Music.setMode("show")` and `Music.onnote = function () { d.bow(); }`; at the next touch, `d.violin(false)`, `Music.onnote = null` and `Music.setMode("calm")`.

## The music: js/music.js

```
Music.setEnabled(on)      follow the shared switch: Music.setEnabled(LatinPlayers.settings().music), and again in onchange
Music.isEnabled()
Music.setVolume(0..1), Music.getVolume()
Music.next(), Music.prev(), Music.start(n)     the next piece, the one before, or piece number n
Music.now()               { n, title, marking, note, playing, failed, mode }, or null (note: a few sentences on the piece)
Music.count()             how many pieces the list names (0 until the list is there: music.js fetches it once
                          the music is switched on)
Music.credit()            one line that says where the notes come from ("" until the list is there)
Music.setMode("calm" | "show"), Music.mode()   calm: slow passages, softer (the background); show: a fast
                          caprice at full tone, while he plays his violin. A switch fades over half a second.
Music.onchange = fn       fn(Music.now()) whenever the piece or the state changes
Music.onnote = fn         fn({ n, pitch, dur }) near the start of the notes, at most five times a second
```

- The music begins only at the first tap or key press after it is switched on (browsers allow sound only after one). No audio context exists before.
- It pauses while the page is hidden, never throws and never logs. A piece that cannot be fetched is skipped and asked for again later.
- The notes are under Creative Commons licenses that ask for credit: link to `../case-detective/music/credits.html` (as the example does), or show `Music.credit()` near the music switch once it is there (read it again in `Music.onchange`: it is empty until the list has come, and the list comes only once the music is on).
- The shared `sound` switch is for your own sound effects (Case Detective’s are its own, in `js/sfx.js`).

## Where the players are chosen

The site’s home page, `index.html` above the games’ folders, is where the players are chosen, once for every game. Case Detective follows it wherever that page is there and the list can be stored: on the games site (`*.github.io`), from a copy on disk (`file:`) and from a copy served on this computer (`localhost`, `127.0.0.1`, `[::1]`).

- It does not show its own “Who’s on the case?” there. It opens for `LatinPlayers.current()`. With nobody chosen it goes at once, with `location.replace`, to `../index.html?play=case-detective#players` (the page stays blank meanwhile).
- The home page sends the player back with `location.replace("case-detective/index.html#added")`: `#added` for a new player, `#chapter` when the chapter changed, `#picked` when a player was chosen (or the chapter step was left with Back); its “Back to Case Detective” comes back without a hash. The Inspector’s first line follows the hash (a welcome for a new player, “Chapter 3 it is”, “Welcome back”), and the game takes the hash off the address with `history.replaceState`, so a reload is a plain visit.
- The top bar: “All games”, the house at the far left, leads to `../index.html`. On the casebook the player chip (the player’s badge, and the name from 900 px wide) leads to `../index.html?play=case-detective#players`; a screen reader hears “Playing as Sam, 6th grade, Chapter 3. Change player or chapter”. “Switch player” in the casebook’s head leads there too, and “Change” (the chapter) to `#chapter`. The link for parents (the page that “Who’s on the case?” links elsewhere) is the casebook’s own “Sources for parents”, in the row at its foot.
- A class still on an earlier chapter (15 above): the home page’s chapter step must offer, and keep, any chapter from 1 to the grade’s last. With this folder’s `css/players.css`, `js/courses.js` and `js/players.js` in the place of its own players files it has the step of `players.js`, earlier chapters and all. A copy of the rules that knows only the grade’s own chapters loses them (`latin-common/js/players-fallback.js` was one until the site’s commit cb3114f, which gave it this rule and an “Earlier chapters” step of its own): it offers an 8th grader chapters 18 to 27 only, it reads a chapter before the grade’s first as this month’s chapter, and whenever it writes the list (a player chosen, added, changed or removed, the sound effects or the music switched on or off) it stores that for every such player, so the game opens on Latin II again. The home page’s `filesIn(8)` should also hold 2 and 3, the chapters with case files under “Earlier chapters” (it does since cb3114f).
- Another tab: when the player on the case is removed, or nobody is chosen any more, the game goes to the home page; when another player is chosen, it opens that player’s casebook.
- Just back from the home page with nobody chosen, the game waits a moment for the list (it reaches a new page through the browser’s storage). A browser can give a page opened from disk other storage than the page before it (Chromium now and then does): after 2.5 seconds the game plays with its own screens for that visit, rather than send the child back and forth.

Elsewhere, on another host (a preview that serves the game alone, a school server) and in a sandboxed frame, where `localStorage` throws, Case Detective keeps its own screens: it opens on “Who’s on the case?”, and the chip is a button that opens them. On another host “All games” goes to the games site in a new tab (there is no home page above the game).

## Linking to Case Detective

On the games site, `../case-detective/index.html` opens for the current player: to send a player on the case there, call `choose(id)` and link to it without parameters. With nobody chosen it goes on to the home page’s players (see above). Elsewhere it opens on “Who’s on the case?”, with the player who played last first (“Continue as ...”). `../case-detective/index.html?grade=6&chapter=3` works everywhere, for tests and for a link a class shares: it opens the case files of the first player of that grade, in the order they were added (or of a new one named “Player”), whoever played last: that player becomes the current one and moves to that chapter. The chapter may be any from 1 to the grade’s last (`?grade=8&chapter=5`: an 8th grader whose class is still on chapter 5, with the case files of Latin IA); a chapter above it is left out.

## A minimal working example

The page below is a whole game in `another-game/index.html`, next to `case-detective/`: “Who’s on the case?” and the steps with the Inspector’s lines, a game screen that wins stars under its own key (and resets them), the two switches of the device in its bar, and the music with a link to its credits. It drops the progress of removed players, keeps the focus where the keyboard needs it, and fits a phone. The tests of Case Detective play this very page.

A child may have the game open in two tabs at once, so it keeps its key the way Case Detective keeps its own (`persist` and `onProgress` in `js/game.js`):

- Every change reads the key again first, as another tab may have won stars since: each player keeps the more stars of the two. Then the change is made and the key is written whole, so a star won in one tab is never written over by the other.
- “Reset stars” writes that player alone, fresh (no stars); the other players stay as stored.
- It follows the storage events of its key: stars won or reset in another tab show at once, and a reset made there stays when this tab saves next.
- Each tab plays its own player: a player chosen in another tab does not move it. When its player is removed in another tab, it goes back to “Who’s on the case?”; a new name, grade or chapter shows at once.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Another Latin game</title>
<link rel="stylesheet" href="../case-detective/css/players.css">
<style>
  html { height: 100%; }
  body { display: flex; flex-direction: column; min-height: 100%; margin: 0; background: #070d1f; }
  .og-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 8px 12px; }
  .og-say { flex: 1 1 180px; min-width: 0; }
  .og-top [aria-pressed="false"] .og-on, .og-top [aria-pressed="true"] .og-off { display: none; }
  .og-main { width: 100%; max-width: 760px; margin: 0 auto; }
  .og-reset { margin: 10px 0 14px; }
  .og-foot { padding: 4px 12px 8px; text-align: center; }
</style>
</head>
<body>
<header class="lp og-top">
  <span id="insp"></span>
  <p class="og-say" id="say" aria-live="polite"></p>
  <button type="button" class="btn ghost sm" id="sound" aria-pressed="true"><span>Sound<span class="og-on" aria-hidden="true">: on</span><span class="og-off" aria-hidden="true">: off</span></span></button>
  <button type="button" class="btn ghost sm" id="music" aria-pressed="true"><span>Music<span class="og-on" aria-hidden="true">: on</span><span class="og-off" aria-hidden="true">: off</span></span></button>
</header>
<main class="lp lp-desk og-main" id="screen"></main>
<p class="lp og-foot"><a class="tlink" href="../case-detective/music/credits.html" target="_blank" rel="noopener">About the music</a></p>
<script src="../case-detective/js/courses.js"></script>
<script src="../case-detective/js/players.js"></script>
<script src="../case-detective/js/detective.js"></script>
<script src="../case-detective/js/music.js"></script>
<script>
(function () {
  "use strict";
  var LP = window.LatinPlayers, KEY = "anotherGame.v1";
  var screen = document.getElementById("screen"), sayEl = document.getElementById("say");
  var soundBtn = document.getElementById("sound"), musicBtn = document.getElementById("music");
  var insp = window.Detective.create({ size: 72, variant: "bust", mood: "idle" });
  document.getElementById("insp").appendChild(insp);
  var playing = null;   /* the player on the case, or null while the players' screens are on show */

  /* this game's own progress, by player id: { "p1": { stars: 2 } } */
  function stored() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var mine = stored();   /* as this page has it (kept for the visit if the browser will not store it) */
  function starsOf(p) { return (mine[p.id] && mine[p.id].stars) || 0; }
  /* Every change reads the key again first, as another tab may have won stars since: each player on the list
     keeps the more stars of the two (the progress of a player who is no longer on it goes). Then the change is
     made, and the key is written whole. */
  function change(fn) {
    var now = stored(), out = {};
    LP.list().forEach(function (p) {
      var n = Math.max(starsOf(p), (now[p.id] && now[p.id].stars) || 0);
      if (n > 0) { out[p.id] = { stars: n }; }
    });
    mine = out;
    if (fn) { fn(); }
    try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (e) { /* kept for the visit */ }
  }
  /* the progress of a player who is no longer on the list goes */
  function prune() {
    if (Object.keys(mine).some(function (id) { return !LP.get(id); })) { change(); }
  }

  var ui = LP.screens({
    show: function (el) { playing = null; screen.textContent = ""; screen.appendChild(el); },
    say: function (lines, mood) { sayEl.innerHTML = lines.join(" "); insp.play(mood, 2200); },
    picked: function (p) { play(p); },
    starsOf: starsOf,
    /* this game's own words where Case Detective's would not fit */
    text: { start: "Start playing", wiped: "{name}’s progress in every game will be wiped from this device. The other players stay." }
  });

  /* the game itself: here only stars to win, and to reset */
  function play(p) {
    /* the focus, if it was on the screen before: on the same button again, or else on the heading */
    var a = document.activeElement, was = !a || a === document.body || screen.contains(a), og = was && a && a.getAttribute ? a.getAttribute("data-og") : null;
    playing = p;
    var v = document.createElement("div");
    v.className = "view lp";
    v.innerHTML = '<h1 class="pl-h" tabindex="-1"></h1><p class="pl-meta"></p>' +
      '<div class="og-reset"><button type="button" class="btn ghost sm" data-og="reset">Reset stars</button></div><div class="dock">' +
      '<button type="button" class="btn primary" data-og="star">Win a star</button>' +
      '<button type="button" class="btn ghost" data-og="chapter">Change chapter</button>' +
      '<button type="button" class="btn ghost" data-og="players">Switch player</button></div>';
    v.querySelector("h1").textContent = "On the case: " + p.name;
    v.querySelector("p").textContent = LP.gradeLine(p, true) + " · " + starsOf(p) + (starsOf(p) === 1 ? " star" : " stars");
    screen.textContent = "";
    screen.appendChild(v);
    sayEl.textContent = "Good luck, " + p.name + "!";
    if (was) { (og && v.querySelector('[data-og="' + og + '"]') || v.querySelector("h1")).focus({ preventScroll: true }); }
  }
  screen.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-og]") : null;
    if (!b || !playing) { return; }
    var what = b.getAttribute("data-og"), id = playing.id;
    if (what === "star") { change(function () { mine[id] = { stars: starsOf(playing) + 1 }; }); play(playing); }
    else if (what === "reset") { change(function () { delete mine[id]; }); play(playing); }   /* that player alone, fresh */
    else if (what === "chapter") { ui.changeChapter(id); }
    else if (what === "players") { ui.players(); }
  });

  /* the two switches of the device, shared by every game */
  function sync() {
    var s = LP.settings();
    soundBtn.setAttribute("aria-pressed", String(s.sound));
    musicBtn.setAttribute("aria-pressed", String(s.music));
    window.Music.setEnabled(s.music);
  }
  soundBtn.addEventListener("click", function () { LP.set("sound", !LP.settings().sound); });
  musicBtn.addEventListener("click", function () { LP.set("music", !LP.settings().music); });

  /* a change of the list, here or in another tab: the switches follow, and the player on the case may be gone or
     changed (a player chosen in another tab does not move this one: each tab plays its own) */
  LP.onchange(function () {
    sync();
    prune();
    if (!playing) { return; }
    var p = LP.get(playing.id);
    if (!p) { ui.players(); }
    else if (JSON.stringify(p) !== JSON.stringify(playing)) { play(p); }
  });
  /* this game's own key written in another tab (stars won there, or reset): taken as it is stored, and shown */
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY && e.key !== null) { return; }
    mine = stored();
    if (playing) { play(playing); }
  });

  prune();
  sync();
  ui.players();
})();
</script>
</body>
</html>
```
