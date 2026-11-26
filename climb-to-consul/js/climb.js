/* Climb to Consul: the page. Home (the Forum at dusk), tonight's assembly (meet-the-word cards and the four
 * offices' questions), the end of the assembly, Erase Away, the trick-verb ring, the Senate roll and Settings.
 * The rules are in logic.js (ClimbLogic), the pictures in art.js (ClimbArt), the frame in latin-common (LatinShell). */
(function () {
  "use strict";
  var S = window.LatinShell, L = window.ClimbLogic, A = window.ClimbArt, W = window.LATIN_WORDS;
  if (!S || !L || !A || !W) {
    var p = document.createElement("p");
    p.className = "noscript";
    p.textContent = "Climb to Consul could not load all its files. Open it from the language-games folder.";
    document.body.appendChild(p);
    return;
  }
  var byId = {};
  W.words.forEach(function (w) { byId[w.id] = w; });
  var OFF = L.OFFICES;
  var store = S.store("climbToConsul.v1");
  var shell = null, me = null, prog = L.fresh(), view = "home", keys = null, busy = false, timers = [];

  /* ---------------------------------------------------------------- helpers */
  function esc(s) { return S.esc(s); }
  function la(s) { return '<span lang="la">' + esc(s) + "</span>"; }
  function li(s) { return '<i lang="la">' + esc(s) + "</i>"; }                    /* Latin in the bubble */
  function q(sel, root) { return (root || shell.desk).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || shell.desk).querySelectorAll(sel)); }
  function later(fn, ms) { var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); fn(); }, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function sfx(n) { S.sfx(n); }
  function today() { return S.today(); }
  function save() { if (me && me.id !== "guest") { store.save(me.id, prog); } }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function focus(el) { if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }
  /* bring a button (and what is just above it) onto a short screen */
  function reveal(el) { if (el) { try { el.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) { /* ignore */ } } }
  function render(html, cls) {
    clearTimers();
    busy = false;
    shell.desk.innerHTML = '<div class="view ' + (cls || "") + '">' + html + "</div>";
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
    return shell.desk.firstChild;
  }
  function on(el, ev, fn) { if (el) { el.addEventListener(ev, fn); } }
  function act(name, fn) { qa('[data-act="' + name + '"]').forEach(function (b) { on(b, "click", function (e) { fn(e, b); }); }); }
  function officeName(o) { return OFF[Math.max(0, Math.min(4, o))].name; }
  function chName(ch) { return "Chapter " + ch; }
  function stripHtml(s) { return String(s).replace(/<[^>]*>/g, ""); }

  /* the player in play (a guest when there is no player list at all) */
  function guest() {
    var ch = 2;
    try { ch = window.LatinPlayers ? window.LatinPlayers.monthChapter(6) : 2; } catch (e) { ch = 2; }
    return { id: "guest", name: "", grade: 6, chapter: ch };
  }
  function consulsOf(p) {
    var o = L.load(store.load(p.id)), n = 0;
    Object.keys(o.words).forEach(function (id) { if (o.words[id].o === 4) { n++; } });
    return n || null;
  }
  function filesIn(grade) {
    var out = {};
    L.readyChapters(W, grade).forEach(function (c) { out[c] = true; });
    return out;
  }

  /* ------------------------------------------------------------------- mount */
  shell = S.mount({
    id: "climb",
    title: "Climb to Consul",
    sub: "Wheelock’s Latin · words",
    logo: A.logo(),
    onHome: function () { home(); },
    onSettings: function () { openSettings(); },
    filesIn: filesIn,
    starsOf: consulsOf,
    hello: "Salvē! Who is climbing tonight?",
    onPlayer: function (p, how) {
      me = p ? { id: p.id, name: p.name, grade: p.grade, chapter: p.chapter } : guest();
      prog = L.load(me.id === "guest" ? null : store.load(me.id));
      if (prog.round && (prog.round.day !== today() || prog.round.chapter !== L.playChapter(W, me))) { prog.round = null; }
      home(how);
    }
  });

  /* keys: 1 to 4 pick, Enter goes on (or shows the Inspector's next line) */
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) { return; }
    if (document.querySelector(".scrim") || (shell.view && shell.view() !== "game")) { return; }
    var t = e.target, tag = t && t.tagName, typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable);
    if (e.key === "Enter") {
      if (typing || tag === "BUTTON" || tag === "A") { return; }
      if (shell.more()) { e.preventDefault(); shell.next(); return; }
      if (keys && keys.enter) { e.preventDefault(); keys.enter(); }
      return;
    }
    if (!typing && /^[1-9]$/.test(e.key) && keys && keys.num) { if (keys.num(+e.key)) { e.preventDefault(); } }
  });

  /* ----------------------------------------------------------------- home */
  function hillLabel(c) { return OFF.map(function (o, i) { return o.many + ": " + c[i]; }).join(", "); }
  function home(how) {
    view = "home";
    keys = null;
    shell.compact(false);
    var p = me, t = today();
    if (!p) { return; }
    if (!L.canPlay(W, p)) { return comingSoon(p); }
    var pc = L.playChapter(W, p), counts = L.hill(W, p, prog), plan = L.plan(W, p, prog, t), set = prog.set;
    var eve = L.quizEve(set.quiz, t), qday = L.quizToday(set.quiz, t);
    var r = prog.round, resume = r && r.day === t && r.i > 0 && r.i < r.items.length;
    var nNew = plan.meet.length + plan.early.length, nDue = plan.due.length, total = counts.reduce(function (a, b) { return a + b; }, 0);
    var tricks = L.trickVerbs(W, p).length;
    var ready = L.readyChapters(W, p.grade), first = ready[0];
    var met = Object.keys(prog.words).length > 0;

    var tonight;
    if (resume) {
      tonight = '<div class="card cc-tonight"><div class="cc-t-head">' + A.emblem(3, "cc-t-emb") + '<div><h2>Tonight’s assembly</h2><p>You stopped at question ' + (r.i + 1) + " of " + r.items.length + ".</p></div></div>" +
        '<button type="button" class="btn primary block" data-act="go">Continue the assembly</button></div>';
    } else if (nNew + nDue === 0) {
      tonight = '<div class="card cc-tonight done"><div class="cc-t-head">' + A.emblem(4, "cc-t-emb") + '<div><h2>The assembly has met</h2><p>Every word has had its turn tonight. Come back tomorrow!</p></div></div>' +
        (tricks ? '<button type="button" class="btn primary block" data-act="ring">Turn the trick-verb keys</button>' : "") + "</div>";
    } else {
      var bits = [];
      if (plan.meet.length) { bits.push('<span class="cc-pill new">' + plural(plan.meet.length, "new word", "new words") + "</span>"); }
      if (plan.early.length) { bits.push('<span class="cc-pill">' + plural(plan.early.length, "word", "words") + " from earlier chapters</span>"); }
      if (nDue) { bits.push('<span class="cc-pill">' + nDue + " to review</span>"); }
      var mins = Math.max(2, Math.round((plan.meet.length * 30 + (nNew + nDue) * 16) / 60));
      tonight = '<div class="card cc-tonight' + (eve ? " second" : "") + '"><div class="cc-t-head">' + A.emblem(1, "cc-t-emb") + '<div><h2>Tonight’s assembly</h2><p class="cc-pills">' + bits.join("") + '<span class="cc-mins">about ' + mins + " min</span></p></div></div>" +
        '<button type="button" class="btn ' + (eve ? "wood" : "primary") + ' block" data-act="go">' + (eve ? "Then the assembly" : "Begin the assembly") + "</button></div>";
    }
    var erase = eve
      ? '<div class="card cc-tonight cc-eve"><div class="cc-t-head">' + A.spongeIc() + '<div><h2>Quiz tomorrow!</h2><p>Erase Away: say the full entries until only the first words are left.</p></div></div><button type="button" class="btn primary block" data-act="erase">Play Erase Away</button></div>'
      : "";
    var more = '<div class="cc-more">' +
      (eve ? "" : '<button type="button" class="btn wood" data-act="erase">' + A.spongeIc() + "<span>Erase Away<small>before a quiz</small></span></button>") +
      '<button type="button" class="btn wood" data-act="ring"' + (tricks ? "" : " disabled") + ">" + A.keyRing() + "<span>Trick verbs<small>" + (tricks ? plural(tricks, "verb", "verbs") + " that surprise" : "none yet") + "</small></span></button>" +
      '<button type="button" class="btn wood" data-act="roll">' + A.scroll() + "<span>Senate roll<small>every word, printable</small></span></button>" +
      '<button type="button" class="btn wood" data-act="settings">' + S.icon("gear") + "<span>Settings<small>macrons, quiz day</small></span></button>" +
      "</div>";
    var stats = '<p class="cc-stats">' + chName(pc) + " · " + plural(total, "word", "words") + " in play · " + plural(counts[4], "Consul", "Consuls") + "</p>";
    render('<div class="cc-hillbox">' + A.hill(counts, { label: "The hill of offices. " + hillLabel(counts) }) +
      '<ul class="sr">' + OFF.map(function (o, i) { return "<li>" + o.many + ": " + counts[i] + "</li>"; }).join("") + "</ul></div>" +
      '<div class="cc-acts">' + erase + tonight + stats + more + "</div>", "cc-home");
    act("go", function () { sfx("tap"); startRound(); });
    act("erase", function () { sfx("tap"); eraseAway(); });
    act("ring", function () { sfx("tap"); trickRing(); });
    act("roll", function () { sfx("tap"); senateRoll("chapter"); });
    act("settings", function () { sfx("tap"); openSettings(); });
    keys = { enter: function () { var b = q('[data-act="erase"].primary') || q('[data-act="go"]') || q('[data-act="ring"]'); if (b && !b.disabled) { b.click(); } } };

    /* the Inspector */
    var name = esc(p.name || "");
    var lines = [], moods = [];
    if (how === "added" || !met) {
      lines.push(name ? "Salvē, <b>" + name + "</b>! Welcome to the Forum." : "Salvē! Welcome to the Forum.");
      lines.push("Every Latin word here is a citizen of Rome.");
      lines.push("Answer right, and it climbs one office a night: Quaestor, Aedile, Praetor, Consul!");
      moods = ["wave", "point", "proud"];
    } else {
      lines.push(name ? "Welcome back, <b>" + name + "</b>!" : "Welcome back!");
      moods.push("wave");
    }
    if (L.behind(W, p)) {
      lines.push("Chapter " + p.chapter + "’s words are on their way; tonight we practise chapters " + first + " to " + pc + ".");
      moods.push("think");
    }
    if (qday) { lines.push("Quiz today! You know these words. Good luck!"); moods.push("cheer"); }
    if (eve) { lines.push("Your quiz is tomorrow. Let’s play <b>Erase Away</b> first!"); moods.push("point"); }
    else if (resume) { lines.push("Shall we finish tonight’s assembly?"); moods.push("point"); }
    else if (nNew + nDue === 0) { lines.push("Every word has had its turn tonight. Bene!"); moods.push("proud"); }
    else {
      var parts = [];
      if (plan.meet.length) { parts.push(plural(plan.meet.length, "new word", "new words") + " from chapter " + pc); }
      if (plan.early.length) { parts.push(plural(plan.early.length, "word", "words") + " from earlier chapters"); }
      if (nDue) { parts.push(nDue + " to review"); }
      lines.push("Tonight: " + parts.join(", ") + ".");
      moods.push("point");
    }
    shell.say(lines, moods);
  }
  function comingSoon(p) {
    var info = null;
    try { info = window.LatinPlayers ? window.LatinPlayers.gradeInfo(p.grade) : null; } catch (e) { info = null; }
    render('<div class="card cc-soon"><h2>Coming soon</h2><p>The words of ' + esc(info && info.course ? info.course : "grade " + p.grade) + " are on their way.</p>" +
      '<p>For now, Climb to Consul has 6th grade (chapters 1 to 3) and 8th grade (chapters 18 to 22).</p>' +
      '<div class="dock"><button type="button" class="btn primary" data-act="chapter">Change grade or chapter</button></div></div>', "cc-soonv");
    act("chapter", function () { shell.managePlayers(); });
    shell.say(["The words for this grade are on their way.", "Ask a grown-up to pick 6th or 8th grade for now."], ["think", "point"]);
  }

  /* --------------------------------------------------------- the assembly */
  function startRound() {
    var t = today(), r = prog.round;
    if (!r || r.day !== t || r.i >= r.items.length) {
      prog.round = L.buildRound(W, me, prog, t, Date.now() >>> 0);
      if (!prog.round.items.length) { prog.round = null; home(); return; }
    }
    save();
    step();
  }
  function step() {
    var r = prog.round;
    if (!r) { return home(); }
    if (r.i >= r.items.length) { return endCard(); }
    var it = r.items[r.i], w = byId[it.id];
    if (!w) { r.i++; return step(); }
    if (it.t === "meet") { meetCard(w, it); } else { askCard(w, it); }
  }
  function advance() { if (prog.round) { prog.round.i++; save(); } step(); }
  function progressBar() {
    var r = prog.round, n = r.items.length, i = Math.min(r.i + 1, n);
    return '<div class="cc-top"><span class="cc-count">' + i + " <small>of</small> " + n + "</span>" +
      '<div class="cc-bar" role="progressbar" aria-label="Tonight’s assembly" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + (i - 1) + '"><i style="transform: scaleX(' + ((i - 1) / n).toFixed(3) + ')"></i></div>' +
      '<button type="button" class="tlink cc-stop" data-act="stop">Stop</button></div>';
  }
  function wireStop() {
    act("stop", function () { sfx("tap"); save(); home(); });
  }
  function ribbon(o, title, sub) {
    return '<div class="cc-ribbon">' + A.emblem(o) + '<div class="cc-rib-t"><b>' + title + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</div></div>";
  }

  /* meet the word */
  function meetCard(w, it) {
    view = "meet";
    shell.compact(true);
    var rep = w.repeats ? W.words.filter(function (x) { return x.id !== w.id && x.ch === w.repeats && L.key(x.hw) === L.key(w.hw); })[0] : null;
    render(progressBar() +
      '<div class="card cc-meet"><div class="cc-meet-top"><span class="stamp">New word</span><span class="cc-meet-ch">' + chName(w.ch) + "</span></div>" +
      '<div class="cc-hw" lang="la">' + esc(w.hw) + "</div>" +
      '<div class="cc-entry" lang="la">' + esc(w.lat) + "</div>" +
      '<div class="cc-as">' + esc(L.asText(w)) + "</div>" +
      '<div class="cc-mean">' + esc(w.mean) + "</div>" +
      (w.der ? '<div class="cc-der"><b>Think of:</b> ' + esc(w.der) + "</div>" : "") +
      '<div class="cc-meet-foot">' + A.ladder(0, 0) + "<p>It starts at the foot of the hill, as a <b>Citizen</b>. Soon it is asked: right answers climb, one office a night.</p></div>" +
      "</div>" +
      '<div class="dock"><button type="button" class="btn primary block" data-act="got">Got it ' + S.icon("next") + "</button></div>", "cc-q cc-meetv");
    wireStop();
    var got = q('[data-act="got"]');
    on(got, "click", function () { sfx("tap"); advance(); });
    keys = { enter: function () { got.click(); } };
    sfx("clue");
    var lines = ["A new citizen joins the assembly: " + li(w.hw) + "!"];
    if (rep) { lines = ["You know " + li(rep.hw) + ". Here is a new meaning!"]; }
    lines.push("Read the whole entry aloud: " + li(w.lat) + ".");
    shell.say(lines, ["point", "idle"]);
    later(function () { focus(got); }, 60);
  }

  /* a question */
  var KIND_TITLE = { quaestor: "Quaestor question", aedile: "Aedile question", praetor: "Praetor question", consul: "Consul question", praetorT: "Consul review" };
  var KIND_SUB = { quaestor: "The Latin: pick its English.", aedile: "The English: pick its Latin.", praetor: "Fill in the whole entry.", consul: "Type the Latin with its macrons.", praetorT: "Type the rest of the entry." };
  function askCard(w, it) {
    view = "ask";
    shell.compact(true);
    var e = prog.words[w.id], kind = L.kindFor(w, e), o = e ? e.o : 0;
    var target = o >= 4 ? 4 : o + 1;
    var qn = L.question(W, w, kind, me, (Date.now() ^ (prog.round.i * 7919)) >>> 0);
    var sub = KIND_SUB[kind];
    if (it.again) { sub = "Once more, before the night is over."; }
    var head = progressBar() + '<div class="card cc-qcard">' + ribbon(target, it.again ? "Second try" : KIND_TITLE[kind], sub);
    if (kind === "quaestor" || kind === "aedile") { return choiceView(w, it, qn, head, kind); }
    if (kind === "praetor") { return rowsView(w, it, qn, head, false); }
    if (kind === "praetorT") { return rowsView(w, it, qn, head, true); }
    return consulView(w, it, qn, head);
  }

  /* Quaestor and Aedile: four choices */
  function choiceView(w, it, qn, head, kind) {
    var latin = kind === "aedile";
    var prompt = kind === "quaestor"
      ? '<div class="cc-prompt"><div class="cc-hw" lang="la">' + esc(w.hw) + '</div><div class="cc-entry" lang="la">' + esc(w.lat) + "</div></div>"
      : '<div class="cc-prompt"><div class="cc-eng">' + esc(qn.prompt) + '</div><span class="cc-tag">' + esc(qn.tag) + "</span></div>";
    render(head + prompt + "</div>" +
      '<div class="cc-opts' + (latin ? " latin" : "") + '" role="group" aria-label="Choices">' + qn.choices.map(function (c, i) {
        return '<button type="button" class="cc-opt" data-i="' + i + '"><span class="cc-k" aria-hidden="true">' + (i + 1) + '</span><span class="cc-ot"' + (latin ? ' lang="la"' : "") + ">" + esc(c.text) + '</span><span class="cc-mark" aria-hidden="true"></span></button>';
      }).join("") + "</div>" + '<div class="cc-after"></div>', "cc-q");
    wireStop();
    shell.mood("think");
    shell.say(kind === "quaestor" ? "What does " + li(w.hw) + " mean?" : "Which Latin " + esc(qn.tag) + " means “" + esc(qn.prompt) + "”?", "think");
    var btns = qa(".cc-opt");
    function pick(i) {
      if (busy) { return; }
      busy = true;
      var c = qn.choices[i], b = btns[i];
      btns.forEach(function (x) { x.disabled = true; });
      b.classList.add(c.ok ? "right" : "wrong");
      b.querySelector(".cc-mark").innerHTML = S.icon(c.ok ? "check" : "x");
      if (!c.ok) {
        var ri = qn.choices.findIndex(function (x) { return x.ok; });
        btns[ri].classList.add("right", "shown");
        btns[ri].querySelector(".cc-mark").innerHTML = S.icon("check");
      }
      var other = !c.ok ? byId[c.id] : null;
      finish(w, it, c.ok, { picked: other });
    }
    btns.forEach(function (b, i) { on(b, "click", function () { pick(i); }); });
    keys = { num: function (n) { if (n >= 1 && n <= btns.length && !busy) { pick(n - 1); return true; } return false; } };
  }

  /* Praetor (tiles) and the Consul review (typed rows): one piece at a time */
  function rowsView(w, it, qn, head, typed) {
    var line = '<div class="cc-line" lang="la">' + qn.show.map(function (s) {
      if (s.b != null) { return '<span class="cc-blank" data-b="' + s.b + '"><span class="cc-bt">?</span></span>'; }
      return s.la ? '<span class="cc-first">' + esc(s.t) + "</span>" : '<span class="cc-sep">' + esc(s.t) + "</span>";
    }).join("") + "</div>";
    render(head + line + "</div>" + '<div class="cc-rowbox"></div><div class="cc-after"></div>', "cc-q");
    wireStop();
    var allOk = true, slips = [], k = 0;
    var first = w.pos === "verb" && w.pp ? w.pp[0] : w.hw;
    shell.say(typed ? "Type the rest of the entry of " + li(first) + "." : "Fill in the whole entry of " + li(first) + ".", "think");
    function blank(i) { return q('.cc-blank[data-b="' + i + '"]'); }
    function fill(i, text, good) {
      var b = blank(i);
      b.classList.remove("on");
      b.classList.add(good ? "ok" : "no");
      b.innerHTML = '<span class="cc-bt">' + esc(text) + "</span>";
    }
    function nextRow() {
      if (k >= qn.rows.length) { return finish(w, it, allOk, { slips: slips }); }
      var row = qn.rows[k], box = q(".cc-rowbox");
      qa(".cc-blank").forEach(function (b) { b.classList.remove("on"); });
      blank(k).classList.add("on");
      var head2 = '<div class="cc-rowlab"><b>' + esc(row.label) + "</b>" + (row.sub ? "<small>" + esc(row.sub) + "</small>" : "") + (qn.rows.length > 1 ? '<span class="cc-rown">' + (k + 1) + " of " + qn.rows.length + "</span>" : "") + "</div>";
      if (row.type) { return typedRow(row, box, head2); }
      box.innerHTML = head2 + '<div class="cc-tiles n' + row.tiles.length + '" role="group" aria-label="' + esc(row.label) + '">' + row.tiles.map(function (t, i) {
        var latin = /^(gen|form|pp)/.test(row.key) && row.key !== "gender";
        return '<button type="button" class="cc-tile' + (latin ? " latin" : "") + '" data-i="' + i + '"><span class="cc-k" aria-hidden="true">' + (i + 1) + "</span><span" + (latin ? ' lang="la"' : "") + ">" + esc(t.text) + "</span>" + (t.sub ? "<small>" + esc(t.sub) + "</small>" : "") + "</button>";
      }).join("") + "</div>";
      box.classList.remove("in");
      void box.offsetWidth;
      box.classList.add("in");
      var btns = qa(".cc-tile", box);
      var done = false;
      function pick(i) {
        if (done) { return; }
        done = true;
        var t = row.tiles[i];
        btns.forEach(function (b) { b.disabled = true; });
        btns[i].classList.add(t.ok ? "right" : "wrong");
        var right = row.tiles.filter(function (x) { return x.ok; });
        if (!t.ok) { allOk = false; btns.forEach(function (b, j) { if (row.tiles[j].ok) { b.classList.add("right", "shown"); } }); sfx("wrong"); shell.act("oops", 900); }
        else { sfx("blip"); }
        fill(k, t.ok ? t.text : right.map(function (x) { return x.text; }).join(" / "), t.ok);
        k++;
        later(nextRow, t.ok ? 520 : 1100);
      }
      btns.forEach(function (b, i) { on(b, "click", function () { pick(i); }); });
      keys = { num: function (n) { if (n >= 1 && n <= btns.length && !done) { pick(n - 1); return true; } return false; } };
      if (k > 0) { shell.say(rowLine(row), "think"); }
    }
    function rowLine(row) {
      return { gen: "And the genitive?", gender: "Its gender?", "case": "Used with which case?", pos: "What kind of word is it?", form0: "The feminine?", form1: "And the neuter?" }[row.key] || ("The " + row.label.toLowerCase() + "?");
    }
    function typedRow(row, box, head2) {
      var idn = "cc-in-" + k;
      box.innerHTML = head2 + '<form class="cc-typeform" autocomplete="off"><label class="sr" for="' + idn + '">' + esc(row.label) + '</label><div class="cc-mk"></div><div class="cc-typerow"><input id="' + idn + '" type="text" maxlength="40" placeholder="type it here"><button type="submit" class="btn primary">Check</button></div>' + hint() + "</form>";
      var input = q("#" + idn, box), form = q("form", box);
      S.macronKeys(input, { into: q(".cc-mk", form) });
      focus(input);
      keys = null;
      var done = false;
      on(form, "submit", function (e) {
        e.preventDefault();
        if (done) { return; }
        if (!input.value.trim()) { input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); return; }
        done = true;
        var r = L.judge(input.value, row.answers, prog.set.macrons);
        input.disabled = true;
        qa("button", form).forEach(function (b) { b.disabled = true; });
        input.classList.add(r.ok ? "ok" : "no");
        if (!r.ok) { allOk = false; sfx("wrong"); shell.act("oops", 900); } else { sfx("blip"); }
        if (r.slip) { slips.push(r.answer); }
        fill(k, r.answer, r.ok);
        k++;
        later(nextRow, r.ok && !r.slip ? 560 : 1300);
      });
    }
    nextRow();
  }
  function hint() {
    var m = prog.set.macrons;
    return '<p class="cc-hint">Long marks: tap <span lang="la">ā ē ī ō ū</span>, or type <b>a-</b> for <span lang="la">ā</span>.' +
      (m === "strict" ? " Macrons count tonight." : m === "ignored" ? " Macrons are not counted." : "") + "</p>";
  }

  /* Consul: type the Latin */
  function consulView(w, it, qn, head) {
    render(head + '<div class="cc-prompt"><div class="cc-eng">' + esc(qn.prompt) + '</div><span class="cc-tag">' + esc(qn.tag) + "</span></div></div>" +
      '<form class="cc-typeform cc-consul" autocomplete="off"><label class="sr" for="cc-in">The Latin word</label><div class="cc-mk"></div><div class="cc-typerow"><input id="cc-in" type="text" maxlength="40" placeholder="the Latin word"><button type="submit" class="btn primary">Check</button></div>' + hint() + "</form>" +
      '<div class="cc-after"></div>', "cc-q");
    wireStop();
    var input = q("#cc-in"), form = q(".cc-typeform"), tries = 0, done = false;
    S.macronKeys(input, { into: q(".cc-mk", form) });
    shell.say("Type the Latin " + esc(qn.tag) + " for “" + esc(qn.prompt) + "”.", "think");
    later(function () { focus(input); }, 60);
    keys = null;
    on(form, "submit", function (e) {
      e.preventDefault();
      if (done) { return; }
      var v = input.value;
      if (!v.trim()) { input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); return; }
      var r = L.judge(v, qn.answers, prog.set.macrons);
      if (!r.ok && !r.slip && tries === 0) {
        var other = L.typedWord(W, w, v, me);
        if (other && other.near) {
          tries++;
          sfx("blip");
          shell.say(["That’s " + li(other.w.hw) + ": close in meaning!", "Which word means exactly “" + esc(qn.prompt) + "”?"], ["think", "point"]);
          input.select();
          return;
        }
      }
      done = true;
      input.disabled = true;
      qa("button", form).forEach(function (b) { b.disabled = true; });
      input.classList.add(r.ok ? "ok" : "no");
      var typedOther = !r.ok ? L.typedWord(W, w, v, me) : null;
      finish(w, it, r.ok, { slip: r.slip, answer: r.answer, strictSlip: !r.ok && r.slip, typed: typedOther ? typedOther.w : null });
    });
  }

  /* after an answer: move the word, show the ladder and (after a miss) the helper */
  function finish(w, it, ok, info) {
    info = info || {};
    busy = true;
    var t = today(), res = L.apply(prog, w, ok, t, it), r = prog.round;
    if (!ok && !it.again && r) { L.requeue(r, w.id); }
    if (r) { r.log = r.log || []; r.log.push({ id: w.id, from: res.from, to: res.to, ok: !!ok, again: !!it.again }); }
    save();
    var head, good = ok;
    var name = li(w.hw);
    if (ok) {
      if (res.climbed) { head = res.to === 4 ? "<b>Consul!</b> " + name + " reaches the top of the hill." : "<b>Right!</b> " + name + " climbs to " + officeName(res.to) + "."; }
      else if (res.from === 4) { head = "<b>Right!</b> Consul " + name + " stays at the top. See it again in a week."; }
      else { head = "<b>Right!</b> Now you’ve got " + name + "."; }
    } else if (info.strictSlip) {
      head = "<b>Only the macrons!</b> It is " + li(info.answer) + ".";
    } else if (res.slipped) {
      head = "<b>Not quite.</b> " + name + " slips to " + officeName(res.to) + ".";
    } else if (it.again) {
      head = "<b>Not yet.</b> Look at it once more.";
    } else {
      head = "<b>Not quite.</b> " + name + " stays a Citizen for now.";
    }
    var notes = [];
    if (ok && info.slip) { notes.push('Mind the long marks: <span lang="la" class="cc-spell">' + esc(info.answer) + "</span>"); }
    if (ok && info.slips && info.slips.length) { notes.push('Mind the long marks: <span lang="la" class="cc-spell">' + info.slips.map(esc).join(", ") + "</span>"); }
    if (!ok && info.picked) { notes.push('<span lang="la">' + esc(info.picked.hw) + "</span> means “" + esc(L.english(info.picked)) + "”."); }
    if (!ok && info.typed) { notes.push('<span lang="la">' + esc(info.typed.hw) + "</span> means “" + esc(L.english(info.typed)) + "”."); }
    var help = "";
    if (!ok) {
      var h = L.helper(w);
      help = '<div class="cc-help"><p class="cc-help-l"><span class="cc-entry" lang="la">' + esc(h.entry) + '</span><span class="cc-mean">' + esc(h.mean) + "</span></p>" +
        (h.der ? '<div class="cc-der"><b>Think of:</b> ' + esc(h.der) + "</div>" : "") +
        (!it.again ? '<p class="cc-back">It comes back at the end of tonight’s assembly.</p>' : "") + "</div>";
    }
    var after = q(".cc-after");
    after.innerHTML = '<div class="cc-fb ' + (good ? "good" : "bad") + '" role="status">' +
      '<div class="cc-fb-row">' + A.ladder(res.from, res.to) + '<p class="cc-fb-t">' + head + "</p></div>" +
      (notes.length ? '<p class="cc-note">' + notes.join("<br>") + "</p>" : "") + help + "</div>" +
      '<div class="dock"><button type="button" class="btn primary block" data-act="next">' + (r && r.i + 1 >= r.items.length ? "See the hill" : "Next") + " " + S.icon("next") + "</button></div>";
    q(".cc-q").classList.add("answered");
    var tok = q(".cc-ltok", after);
    if (tok && res.from !== res.to) {
      later(function () { var p = tok.getAttribute("data-to").split(","); tok.style.transform = "translate(" + p[0] + "px," + p[1] + "px)"; }, reduced() ? 0 : 260);
    }
    if (ok) {
      sfx("correct");
      if (res.climbed) { later(function () { sfx(res.to === 4 ? "fanfare" : "rankup"); }, 380); }
      shell.act(res.to === 4 && res.climbed ? "proud" : "cheer", 1600);
      shell.say(stripLine(head), "cheer");
    } else {
      sfx("wrong");
      shell.act("oops", 1400);
      shell.say(w.der ? ["Here is the whole entry.", "Think of: " + esc(w.der) + "."] : "Here is the whole entry. Read it aloud once.", "oops");
    }
    var next = q('[data-act="next"]');
    on(next, "click", function () { sfx("tap"); advance(); });
    keys = { enter: function () { next.click(); } };
    later(function () { focus(next); try { after.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) { /* ignore */ } }, 120);
  }
  function stripLine(h) { return h.replace(/<\/?b>/g, "").replace(/^([^!.]+[!.])\s*/, "<b>$1</b> "); }

  /* the end of the assembly */
  function endCard() {
    view = "end";
    keys = null;
    shell.compact(false);
    var r = prog.round, log = (r && r.log) || [], firsts = {};
    log.forEach(function (x) { if (!x.again && !firsts[x.id]) { firsts[x.id] = x; } });
    var list = Object.keys(firsts).map(function (k) { return firsts[k]; });
    var up = list.filter(function (x) { return x.to > x.from; }), down = list.filter(function (x) { return x.to < x.from; });
    var right = list.filter(function (x) { return x.ok; }).length;
    var counts = L.hill(W, me, prog);
    prog.round = null;
    save();
    function wl(items) {
      var max = window.innerWidth >= 600 ? 12 : window.innerHeight < 720 ? 4 : 6, more = items.length - max;
      return '<ul class="cc-wl">' + items.slice(0, more > 0 ? max - 1 : max).map(function (x) { var w = byId[x.id]; return "<li>" + A.emblem(x.to) + '<span lang="la">' + esc(w.hw) + "</span><small>" + officeName(x.to) + "</small></li>"; }).join("") +
        (more > 0 ? '<li class="cc-more-n">and ' + (more + 1) + " more</li>" : "") + "</ul>";
    }
    /* phones get a strip of the five offices: the hill would be cut off at that height */
    var strip = '<ol class="cc-strip" aria-label="The hill of offices">' + counts.map(function (n, o) {
      return '<li data-o="' + o + '">' + A.emblem(o) + "<b>" + n + "</b><small>" + OFF[o].many + "</small></li>";
    }).join("") + "</ol>";
    render('<h2 class="desk-h">The assembly is over</h2><div class="cc-endgrid"><div class="cc-hillbox">' + A.hill(counts, { label: "The hill of offices. " + hillLabel(counts), cls: "end" }) + "</div>" + strip +
      '<div class="card cc-sum"><p class="cc-score"><b>' + right + "</b> right of " + list.length + "</p>" +
      (up.length ? "<h3>Climbed tonight</h3>" + wl(up) : "") +
      (down.length ? "<h3>Slipped</h3>" + wl(down) : "") +
      '<p class="cc-cons">' + A.emblem(4) + "<span>" + plural(counts[4], "Consul", "Consuls") + " on the hill</span></p></div></div>" +
      '<div class="dock"><button type="button" class="btn primary grow" data-act="home">Back to the Forum</button></div>', "cc-end");
    act("home", function () { sfx("tap"); home(); });
    keys = { enter: function () { q('[data-act="home"]').click(); } };
    sfx("fanfare");
    shell.act("proud", 2000);
    var lines = [];
    lines.push(up.length ? plural(up.length, "word", "words") + " climbed tonight!" : "Every word had its turn tonight.");
    if (down.length) { lines.push(plural(down.length, "word", "words") + " slipped. They will climb again tomorrow."); }
    lines.push(counts[4] ? plural(counts[4], "Consul", "Consuls") + " on the hill. Bene!" : "Come back tomorrow: one office a night, all the way to Consul.");
    shell.say(lines, ["cheer", "think", "proud"]);
    later(function () { var b = q('[data-act="home"]'); focus(b); reveal(b && b.parentNode); }, 80);
  }

  /* ------------------------------------------------------------ Erase Away */
  function eraseAway() {
    view = "erase";
    shell.compact(true);
    var seed = Date.now() >>> 0, set = L.eraseSet(W, me, prog, seed, window.innerWidth < 600 ? 5 : 0), rounds = L.eraseRounds(set, seed);   /* a phone gets 5 entries */
    var st = { r: 0, filled: {}, sel: -1 };
    function entryHtml(e, rd, fresh) {
      var h = '<span class="cc-chalk head" lang="la">' + esc(e.head) + "</span>";
      e.parts.forEach(function (p) {
        var lead = p.k === "mean" ? " — " : p.lead;
        var gone = rd && rd.erase.indexOf(p.k) >= 0;
        h += '<span class="cc-sep' + (p.k === "mean" ? " dash" : "") + '">' + esc(lead) + "</span>";
        if (!gone) { h += '<span class="cc-chalk' + (p.k === "mean" ? " en" : "") + '"' + (p.la ? ' lang="la"' : "") + ">" + esc(p.text) + "</span>"; return; }
        var j = rd.blanks.findIndex(function (b) { return b.id === e.id && b.n === p.n; });
        var isNew = fresh && rd.adds.some(function (a) { return a.id === e.id && a.n === p.n; });
        h += '<button type="button" class="cc-smudge' + (isNew ? " wiping" : "") + (p.k === "mean" ? " en" : "") + '" data-j="' + j + '" aria-label="Blank: ' + esc(nameOf(p.k)) + " of " + esc(e.head) + '"><span class="cc-was"' + (p.la ? ' lang="la"' : "") + ">" + esc(p.text) + "</span>" + (isNew ? A.sponge() : "") + "</button>";
      });
      return h;
    }
    function nameOf(k) { return { gen: "the genitive", forms: "the other forms", gender: "the gender", "case": "the case", parts: "the principal parts", mean: "the meaning" }[k] || k; }
    function draw(fresh) {
      var rd = rounds[st.r], last = st.r >= rounds.length;
      var top = '<div class="cc-etop"><span class="cc-pill">' + (last ? "Last step" : st.r === 0 ? "Read aloud" : "Round " + st.r + " of " + (rounds.length - 1)) + "</span><b>" +
        (last ? "Only the first words are left" : st.r === 0 ? "The full entries" : esc(cap(rd.name)) + " are erased") + '</b><button type="button" class="tlink cc-stop" data-act="stop">Stop</button></div>';
      var body;
      if (last) {
        body = '<ol class="cc-lines final">' + set.map(function (e, i) {
          return '<li><button type="button" class="cc-say" data-i="' + i + '" aria-expanded="false"><span class="cc-chalk head" lang="la">' + esc(e.head) + '</span><span class="cc-full">' + entryHtml(e, null, false) + "</span></button></li>";
        }).join("") + "</ol>";
      } else {
        body = '<ol class="cc-lines">' + set.map(function (e) { return '<li class="cc-eline"><span class="cc-eline-in">' + entryHtml(e, st.r ? rd : null, fresh) + "</span></li>"; }).join("") + "</ol>";
      }
      var chips = !last && st.r > 0 ? '<div class="cc-chips" role="group" aria-label="Chalk pieces">' + rd.chips.map(function (c, i) {
        return '<button type="button" class="cc-chip' + (c.k === "mean" ? " en" : "") + '" data-c="' + i + '"' + (c.k === "mean" || c.k === "gender" || c.k === "case" ? "" : ' lang="la"') + ">" + esc(c.text) + "</button>";
      }).join("") + "</div>" : "";
      var btn = last ? '<button type="button" class="btn primary grow" data-act="done" disabled>Done</button>'
        : st.r === 0 ? '<button type="button" class="btn primary grow" data-act="next">Start erasing ' + S.icon("next") + "</button>"
        : '<button type="button" class="btn primary grow" data-act="next" disabled>' + (st.r + 1 >= rounds.length ? "Last step" : "Next round") + " " + S.icon("next") + "</button>";
      render(top + '<div class="cc-slate"><div class="cc-slate-in">' + body + "</div></div>" + chips + '<div class="dock">' + btn + "</div>", "cc-erase" + (last ? " final" : st.r === 0 ? " zero" : " filling"));
      act("stop", function () { sfx("tap"); home(); });
      if (last) { return wireFinal(); }
      act("next", function (e, b) { if (b.disabled) { return; } sfx("tap"); st.r++; st.filled = {}; st.sel = -1; draw(true); });
      keys = { enter: function () { var b = q('[data-act="next"]'); if (b && !b.disabled) { b.click(); } } };
      if (st.r === 0) {
        shell.say(["<b>Erase Away!</b> Here are " + set.length + " full entries.", "Read each one aloud, twice.", "Then the sponge wipes a piece away, round by round."], ["point", "idle", "think"]);
        later(function () { focus(q('[data-act="next"]')); }, 60);
        return;
      }
      var smudges = qa(".cc-smudge");
      if (fresh) {
        sfx("ruleout");
        smudges.forEach(function (b) { if (b.classList.contains("wiping")) { b.disabled = true; } });
        later(function () { smudges.forEach(function (b) { b.classList.remove("wiping"); b.disabled = false; var sp = b.querySelector(".cc-sponge"); if (sp) { sp.parentNode.removeChild(sp); } }); select(firstOpen()); }, reduced() ? 0 : 1250);
      } else { select(firstOpen()); }
      smudges.forEach(function (b) { on(b, "click", function () { if (!st.filled[+b.getAttribute("data-j")]) { sfx("tap"); select(+b.getAttribute("data-j")); } }); });
      qa(".cc-chip").forEach(function (c) { on(c, "click", function () { chip(c); }); });
      shell.say(["The sponge took " + esc(rd.name) + ".", "Tap a blank, then the chalk piece that fits."], ["search", "point"]);
    }
    function firstOpen() { var rd = rounds[st.r]; for (var j = 0; j < rd.blanks.length; j++) { if (!st.filled[j]) { return j; } } return -1; }
    function select(j) {
      st.sel = j;
      qa(".cc-smudge").forEach(function (b) { b.classList.toggle("sel", +b.getAttribute("data-j") === j); b.setAttribute("aria-pressed", +b.getAttribute("data-j") === j ? "true" : "false"); });
    }
    function chip(c) {
      var rd = rounds[st.r], i = +c.getAttribute("data-c"), ch = rd.chips[i];
      if (st.sel < 0) { select(firstOpen()); }
      var j = st.sel, bl = rd.blanks[j];
      if (!bl || c.disabled) { return; }
      if (L.chipFits(bl, ch)) {
        st.filled[j] = true;
        sfx("stamp");
        var b = q('.cc-smudge[data-j="' + j + '"]');
        b.classList.add("filled");
        b.classList.remove("sel");
        b.disabled = true;
        c.disabled = true;
        c.classList.add("used");
        var nx = firstOpen();
        if (nx < 0) {
          select(-1);
          later(function () {
            var cs = q(".cc-chips");
            if (!cs) { return; }
            cs.classList.add("done");
            /* on a wide screen the chalk tray keeps its place, with a word from the Inspector's slate */
            cs.insertAdjacentHTML("beforeend", '<p class="cc-tray">' + A.spongeIc() + "<span><b>Every piece is back.</b> Say each whole entry aloud.</span></p>");
          }, reduced() ? 0 : 320);
          var nb = q('[data-act="next"]');
          nb.disabled = false;
          q(".cc-erase").classList.remove("filling");   /* a short phone shows the Next button only now */
          sfx("star");
          shell.act("cheer", 1400);
          shell.say(st.r + 1 >= rounds.length ? "All filled! Now the last step." : "All filled! Say them aloud, then on to the next round.", "cheer");
          later(function () { focus(nb); reveal(nb.parentNode); }, 60);
        } else { select(nx); }
      } else {
        sfx("wrong");
        c.classList.remove("shake");
        void c.offsetWidth;
        c.classList.add("shake");
      }
    }
    function wireFinal() {
      var seen = {};
      shell.say(["Only the first words are left.", "Say each whole entry aloud, then tap it to check."], ["point", "think"]);
      qa(".cc-say").forEach(function (b) {
        on(b, "click", function () {
          var i = +b.getAttribute("data-i");
          b.classList.add("open");
          b.setAttribute("aria-expanded", "true");
          sfx("blip");
          seen[i] = true;
          if (Object.keys(seen).length >= set.length) {
            var d = q('[data-act="done"]');
            d.disabled = false;
            sfx("fanfare");
            shell.act("proud", 1800);
            shell.say("Every entry, start to finish. You are ready for the quiz!", "proud");
            later(function () { focus(d); }, 60);
          }
        });
      });
      act("done", function () {
        prog.erase = { n: (prog.erase.n || 0) + 1, last: today() };
        save();
        sfx("tap");
        home();
      });
      keys = { enter: function () { var d = q('[data-act="done"]'); if (d && !d.disabled) { d.click(); } } };
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    draw(false);
  }

  /* ---------------------------------------------------- the trick-verb ring */
  function trickRing() {
    view = "ring";
    shell.compact(true);
    var set = L.ringSet(W, me, Date.now() >>> 0, 6);
    if (!set.length) { return home(); }
    var states = set.map(function () { return ""; }), i = 0;
    function drawVerb() {
      var it = set[i], w = byId[it.id];
      states[i] = states[i] || "on";
      var line = '<div class="cc-line" lang="la"><span class="cc-first">' + esc(w.pp[0]) + "</span>" + it.rows.map(function (r, k) { return '<span class="cc-sep">, </span><span class="cc-blank" data-b="' + k + '"><span class="cc-bt">?</span></span>'; }).join("") + "</div>";
      render('<div class="cc-top"><span class="cc-count">' + (i + 1) + " <small>of</small> " + set.length + '</span><b class="cc-ringt">The trick-verb ring</b><button type="button" class="tlink cc-stop" data-act="stop">Stop</button></div>' +
        '<div class="cc-ringart">' + A.ring(states) + "</div>" +
        '<div class="card cc-qcard">' + ribbon(3, "Trick verb", "Its principal parts surprise. Practice: no office changes.") + line + '<p class="cc-mean small">' + esc(L.english(w)) + "</p></div>" +
        '<div class="cc-rowbox"></div><div class="cc-after"></div>', "cc-q cc-ringv");
      act("stop", function () { sfx("tap"); home(); });
      shell.say(i === 0 ? ["A ring of trick keys: verbs whose parts surprise.", "Tap the next part of " + li(w.pp[0]) + "."] : "Next key: " + li(w.pp[0]) + ".", i === 0 ? ["point", "think"] : "think");
      var k = 0, allOk = true;
      function nextPart() {
        if (k >= it.rows.length) { return verbDone(allOk); }
        var row = it.rows[k], box = q(".cc-rowbox");
        qa(".cc-blank").forEach(function (b) { b.classList.remove("on"); });
        q('.cc-blank[data-b="' + k + '"]').classList.add("on");
        box.innerHTML = '<div class="cc-rowlab"><b>' + esc(row.label) + "</b><small>" + esc(row.sub) + '</small><span class="cc-rown">' + (k + 1) + " of " + it.rows.length + "</span></div>" +
          '<div class="cc-tiles n' + row.tiles.length + '">' + row.tiles.map(function (t, j) { return '<button type="button" class="cc-tile latin" data-i="' + j + '"><span class="cc-k" aria-hidden="true">' + (j + 1) + '</span><span lang="la">' + esc(t.text) + "</span></button>"; }).join("") + "</div>";
        box.classList.remove("in");
        void box.offsetWidth;
        box.classList.add("in");
        var btns = qa(".cc-tile", box), done = false;
        function pick(j) {
          if (done) { return; }
          done = true;
          var t = row.tiles[j], b = q('.cc-blank[data-b="' + k + '"]');
          btns.forEach(function (x) { x.disabled = true; });
          btns[j].classList.add(t.ok ? "right" : "wrong");
          var right = row.tiles.filter(function (x) { return x.ok; })[0];
          if (!t.ok) { allOk = false; btns.forEach(function (x, m) { if (row.tiles[m].ok) { x.classList.add("right", "shown"); } }); sfx("wrong"); shell.act("oops", 900); } else { sfx("blip"); }
          b.classList.remove("on");
          b.classList.add(t.ok ? "ok" : "no");
          b.innerHTML = '<span class="cc-bt">' + esc(right.text) + "</span>";
          k++;
          later(nextPart, t.ok ? 480 : 1200);
        }
        btns.forEach(function (b, j) { on(b, "click", function () { pick(j); }); });
        keys = { num: function (n) { if (n >= 1 && n <= btns.length && !done) { pick(n - 1); return true; } return false; } };
      }
      function verbDone(good) {
        states[i] = good ? "done" : "miss";
        q(".cc-rowbox").innerHTML = "";   /* the filled parts are in the line above */
        q(".cc-ringart").innerHTML = A.ring(states);
        var after = q(".cc-after");
        var last = i + 1 >= set.length;
        after.innerHTML = '<div class="cc-fb ' + (good ? "good" : "bad") + '" role="status"><p class="cc-fb-t">' + (good ? "<b>The key turns!</b> " : "<b>Almost.</b> Say it aloud: ") + '<span lang="la">' + esc(w.lat) + "</span></p></div>" +
          '<div class="dock"><button type="button" class="btn primary block" data-act="nextv">' + (last ? "Finish the ring" : "Next key") + " " + S.icon("next") + "</button></div>";
        if (good) { sfx("correct"); shell.act("cheer", 1300); } else { shell.act("oops", 1200); }
        shell.say(good ? "The key turns! " + li(w.lat) + "." : "Say all the parts aloud: " + li(w.lat) + ".", good ? "cheer" : "think");
        var nb = q('[data-act="nextv"]');
        on(nb, "click", function () { sfx("tap"); i++; if (i >= set.length) { ringEnd(); } else { drawVerb(); } });
        keys = { enter: function () { nb.click(); } };
        later(function () { focus(nb); reveal(nb.parentNode); }, 80);
      }
      nextPart();
    }
    function ringEnd() {
      var good = states.filter(function (s) { return s === "done"; }).length;
      prog.ring = { n: (prog.ring.n || 0) + 1, last: today() };
      save();
      render('<h2 class="desk-h">The ring is complete</h2><div class="cc-ringart big">' + A.ring(states) + "</div>" +
        '<div class="card cc-sum"><p class="cc-score"><b>' + good + "</b> of " + set.length + " keys turned on the first try</p>" +
        '<ul class="cc-wl">' + set.map(function (it, k) { var w = byId[it.id]; return '<li class="' + states[k] + '">' + A.key() + '<span lang="la">' + esc(w.lat) + "</span></li>"; }).join("") + "</ul></div>" +
        '<div class="dock"><button type="button" class="btn wood" data-act="again">Another ring</button><button type="button" class="btn primary grow" data-act="home">Back to the Forum</button></div>', "cc-ringend");
      act("again", function () { sfx("tap"); trickRing(); });
      act("home", function () { sfx("tap"); home(); });
      keys = { enter: function () { q('[data-act="home"]').click(); } };
      sfx(good === set.length ? "fanfare" : "star");
      shell.compact(false);
      shell.act("proud", 1600);
      shell.say(good === set.length ? "Every key turned! Those trick verbs are yours." : good + " of " + set.length + " keys turned. Try the ring again another night.", good === set.length ? "proud" : "cheer");
      later(function () { var b = q('[data-act="home"]'); focus(b); reveal(b && b.parentNode); }, 80);
    }
    drawVerb();
  }

  /* --------------------------------------------------------- the Senate roll */
  function senateRoll(filter) {
    view = "roll";
    keys = null;
    shell.compact(true);
    var groups = L.roll(W, me, prog, filter), pc = L.playChapter(W, me);
    var tabs = [["chapter", "This chapter"], ["play", "All in play"], ["grade", "Whole grade"]];
    var gl = "";
    try { gl = window.LatinPlayers ? window.LatinPlayers.gradeLine(me, true) : ""; } catch (e) { gl = ""; }
    var html = '<div class="cc-rolltop no-print"><div class="cc-seg" role="group" aria-label="Which words">' + tabs.map(function (t) {
      return '<button type="button" class="cc-segb" data-f="' + t[0] + '" aria-pressed="' + (t[0] === filter) + '">' + t[1] + "</button>";
    }).join("") + '</div><button type="button" class="btn sm wood" data-act="print">' + A.printer() + 'Print</button><button type="button" class="btn sm ghost" data-act="back">' + S.icon("back") + "Back</button></div>" +
      '<div class="cc-roll card"><div class="cc-roll-h"><h2>The Senate roll</h2><p>' + esc(gl || "") + " · Wheelock’s Latin, 7th edition</p></div>" +
      groups.map(function (g) {
        return '<section class="cc-rch"><h3><span>' + chName(g.ch) + "</span> " + esc(g.title) + (!g.ready ? ' <em class="cc-soonb">words on their way</em>' : !g.inPlay ? ' <em class="cc-soonb">later</em>' : "") + "</h3>" +
          '<ul class="cc-rl">' + g.words.map(function (x) {
            var w = x.w, badge;
            if (!x.drilled) { badge = '<span class="cc-badge form">a form, not drilled</span>'; }
            else if (x.office == null) { badge = '<span class="cc-badge none">not yet</span>'; }
            else { badge = '<span class="cc-badge o' + x.office + '">' + A.emblem(x.office) + "<span>" + officeName(x.office) + "</span></span>"; }
            return '<li><span class="cc-rw" lang="la">' + esc(w.lat) + '</span><span class="cc-rm">' + esc(w.mean) + "</span>" + badge + "</li>";
          }).join("") + "</ul></section>";
      }).join("") +
      '<p class="cc-roll-foot">Check the printed chapter list before a graded test. <a href="../latin-common/sources.html">Where the words come from</a></p></div>';
    render(html, "cc-rollv");
    qa(".cc-segb").forEach(function (b) { on(b, "click", function () { sfx("tap"); senateRoll(b.getAttribute("data-f")); }); });
    act("print", function () { sfx("tap"); try { window.print(); } catch (e) { /* ignore */ } });
    act("back", function () { sfx("tap"); home(); });
    var n = groups.reduce(function (a, g) { return a + g.words.length; }, 0);
    shell.say(filter === "chapter" ? ["The Senate roll of chapter " + pc + ": every word with its office.", "Print it for the fridge!"] : "The Senate roll: " + plural(n, "entry", "entries") + ".", ["point", "idle"]);
  }

  /* --------------------------------------------------------------- Settings */
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function openSettings() {
    if (!me) { shell.showPlayers(); return; }
    var set = prog.set, box = document.createElement("div");
    box.className = "cc-set";
    function seg(name, opts, val) {
      return '<div class="cc-seg" role="radiogroup" aria-label="' + esc(name) + '">' + opts.map(function (o) {
        return '<button type="button" role="radio" class="cc-segb" data-v="' + esc(o[0]) + '" aria-checked="' + (String(o[0]) === String(val)) + '">' + esc(o[1]) + "</button>";
      }).join("") + "</div>";
    }
    function draw() {
      var qz = set.quiz;
      box.innerHTML =
        '<section><h3>Long marks (macrons)</h3>' + seg("Macrons", [["ignored", "Ignored"], ["light", "Light"], ["strict", "Strict"]], set.macrons) +
        '<p class="cc-sethint">' + { ignored: "Typed answers are checked without the long marks.", light: "A missing long mark is accepted, and the right spelling is shown.", strict: "The long marks count: fama is wrong for fāma." }[set.macrons] + "</p></section>" +
        '<section><h3>New words a night</h3>' + seg("New words a night", [[5, "5"], [6, "6"], [7, "7"], [8, "8"]], set.perNight) + "</section>" +
        '<section><h3>Vocabulary quiz day</h3>' + seg("Quiz day", [["none", "None"], ["weekly", "Every week"], ["date", "One date"]], qz.mode) +
        (qz.mode === "weekly" ? '<div class="cc-days">' + seg("Weekday", DAYS.map(function (d, i) { return [i, d.slice(0, 3)]; }), qz.day) + "</div>" : "") +
        (qz.mode === "date" ? '<label class="cc-date"><span>Date</span><input type="date" value="' + esc(qz.date) + '"></label>' : "") +
        '<p class="cc-sethint">' + (qz.mode === "none" ? "Erase Away is always in the menu." : "The night before, Erase Away comes first.") + "</p></section>" +
        '<section class="cc-reset"><button type="button" class="tlink" data-x="reset">Start this player’s climb over</button></section>';
      Array.prototype.forEach.call(box.querySelectorAll(".cc-seg"), function (g) {
        var label = g.getAttribute("aria-label");
        Array.prototype.forEach.call(g.querySelectorAll(".cc-segb"), function (b) {
          b.addEventListener("click", function () {
            var v = b.getAttribute("data-v");
            if (label === "Macrons") { set.macrons = v; }
            else if (label === "New words a night") { set.perNight = +v; }
            else if (label === "Quiz day") { set.quiz.mode = v; if (v === "date" && !set.quiz.date) { set.quiz.date = tomorrow(); } }
            else if (label === "Weekday") { set.quiz.day = +v; }
            prog.set = L.settings(set);
            set = prog.set;
            save();
            sfx("tap");
            draw();
            var again = box.querySelector('.cc-seg[aria-label="' + label + '"] [aria-checked="true"]');
            focus(again);
          });
        });
      });
      var d = box.querySelector('input[type="date"]');
      on(d, "change", function () { set.quiz.date = d.value; prog.set = L.settings(set); set = prog.set; save(); });
      on(box.querySelector('[data-x="reset"]'), "click", function () {
        shell.dialog({ title: "Start the climb over?", text: "Every word goes back to Citizen for this player. The settings stay.", buttons: [{ label: "Keep the climb", kind: "wood", value: false }, { label: "Start over", kind: "danger", value: true }] }).then(function (yes) {
          if (yes) { var keep = prog.set; prog = L.fresh(); prog.set = keep; save(); shell.toast("Every word is a Citizen again.", { kind: "good" }); home(); }
        });
      });
    }
    function tomorrow() { var d = new Date(); d.setDate(d.getDate() + 1); return S.today(d); }
    draw();
    shell.dialog({ title: "Settings", el: box, sheet: true, buttons: [{ label: "Done", kind: "primary", value: true }] }).then(function () {
      if (view === "home") { home(); }
    });
  }
})();
