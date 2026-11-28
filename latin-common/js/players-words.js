/* The site's own words for the players screens (Case Detective's js/players.js, window.LatinPlayers.screens).
 *
 * Without them players.js speaks as in Case Detective ("Who’s on the case?", "Open my case files", "case files").
 * The home page (index.html) and the games' shell (latin-common/js/shell.js) pass these to screens(host) as
 * host.text, host.lines and host.icon("files"), so the screens speak for every game:
 *
 *   window.LatinPlayersWords = { text, lines, filesIcon }
 *
 * lines: the Inspector's lines (a step says only the first line of its list, so one line there; HTML: <b> and <i>
 * only, {name} is filled in and escaped). playersFirst introduces him: Case Detective then welcomes the player
 * added after it without a second introduction (LatinPlayers.met, which the pages here never call).
 * filesIcon: the chapter step's mark of a chapter with games ready, a check (players.js would draw a case file).
 *
 * Classic script, no dependencies. Load it before the page's own script.
 */
(function (root) {
  "use strict";
  root.LatinPlayersWords = {
    text: {
      title: "Who’s playing?",
      start: "Start playing",
      files: "games ready",
      wiped: "Their progress in these games is wiped from this device. This cannot be undone.",
      sources: "For parents: where the words and charts come from"
    },
    lines: {
      playersFirst: ["<b>Salvē!</b> I am Inspector Cāsus.", "Who is playing tonight? Add yourself and we can start."],
      playersBack: ["<b>Salvē!</b> Who is playing tonight?", "Tap your name to go on."],
      playersManage: ["Here you can rename a player, change a grade, or remove a player."],
      askName: ["What is your name? A first name or a nickname is plenty."],
      askGrade: ["Nice to meet you, <b>{name}</b>! Which grade are you in?"],
      askChapter: ["Which chapter is your class on? I picked this month’s chapter. Change it if your class is somewhere else."],
      changeChapter: ["Which chapter is your class on now, <b>{name}</b>?"],
      changeGrade: ["Which grade is <b>{name}</b> in now?"]
    },
    filesIcon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M5.2 12.8l4.3 4.3L18.9 7.5"/></svg>'
  };
})(window);
