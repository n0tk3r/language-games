#!/usr/bin/env node
/* Climb to Consul: Erase Away in a real browser.  Run: node tools/blanks.js  (needs Playwright with Chromium)
 * A blank must tell nothing about the length of what was erased, and that is a CSS matter, so it is checked here
 * and not in check.js. For a grade 6 (chapter 2) and a grade 8 (chapter 21) player, a few seeds, at 390x844 and
 * 1366x768 (SIZES="320x640,1366x768" for others), it plays Erase Away to the end, with one wrong chip a round
 * (three seeds, 2 stars), every chip right (3 stars), every second chip wrong (1 star) and every chip wrong
 * (0 stars), and asserts that:
 *   - in every round, every unfilled blank (.cc-smudge) has the same width and height (within 1 px), while the
 *     sponge wipes too, and again after some blanks are filled;
 *   - an unfilled blank holds no text in the layout (its piece is display: none once the wipe is over);
 *   - the chalk tray holds the round's pieces plus 1 decoy (2 from 6 blanks), and "Fill: ..." names the blank;
 *   - the selected blank's ring never fades below 55% (it pulses), and the Inspector says "Only the first try
 *     counts!" (in the first line of the first round, in the second line of later rounds);
 *   - a wrong chip shakes and stays, the blank is filled in red chalk at once and its own chip is used up, and the
 *     round's pill counts only first tries;
 *   - the last step shows the stars and "N of M pieces on the first try", marks the entries with a miss, and
 *     saves the best stars and the missed words in prog.erase; a round with every piece right has a gold pill;
 *     the closing line when every entry is opened suits the stars.
 * Prints one line a game and exits non-zero on any failure. */
"use strict";
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "file://" + path.join(__dirname, "..", "..") + "/";
const SIZES = (process.env.SIZES || "390x844,1366x768").split(",").map((s) => s.split("x").map(Number));
const PLAYERS = [{ grade: 6, chapter: 2 }, { grade: 8, chapter: 21 }];
const SEEDS = (process.env.SEEDS || "1700000000,1700000777,1700012345").split(",").map(Number);
/* how each game is played: "one" misses the second piece of every round (2 stars here); "all" gets every piece right
   (3 stars); "half" misses every second piece (1 star); "none" gets every piece wrong (0 stars) */
const GAMES = SEEDS.map((seed) => ({ seed, mode: "one" })).concat([{ seed: 1700005555, mode: "all" }, { seed: 1700007777, mode: "half" }, { seed: 1700006666, mode: "none" }]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let checks = 0, fails = 0;
const failures = [];
function ok(cond, msg) { checks++; if (!cond) { fails++; if (failures.length < 40) { failures.push(msg); } } return cond; }

/* the size of every unfilled blank, and whether any of them shows its text */
function blanks(page) {
  return page.evaluate(() => [...document.querySelectorAll(".cc-smudge:not(.filled)")].map((b) => {
    const r = b.getBoundingClientRect(), was = b.querySelector(".cc-was");
    return { w: r.width, h: r.height, wiping: b.classList.contains("wiping"), shown: !!was && getComputedStyle(was).display !== "none" };
  }));
}
function same(list, tag) {
  if (!list.length) { return; }
  const ws = list.map((b) => b.w), hs = list.map((b) => b.h);
  ok(Math.max(...ws) - Math.min(...ws) <= 1, `${tag}: blank widths ${[...new Set(ws.map((x) => x.toFixed(1)))].join(", ")}`);
  ok(Math.max(...hs) - Math.min(...hs) <= 1, `${tag}: blank heights ${[...new Set(hs.map((x) => x.toFixed(1)))].join(", ")}`);
}

async function game(browser, [w, h], player, { seed, mode }) {
  const tag0 = `${w}x${h} grade ${player.grade} ch ${player.chapter} seed ${seed} (${mode})`;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") { errors.push(m.text()); } });
  await page.addInitScript((s) => { Date.now = () => s; }, seed);   /* the game seeds Erase Away with Date.now() */
  await page.goto(ROOT + "index.html");
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem("latinGames.v1", JSON.stringify({ v: 1, players: [{ id: "p1", name: "Tester", color: "#b4441c", grade: p.grade, chapter: p.chapter }], last: "p1", sound: false, music: false, next: 2 }));
  }, player);
  await page.goto(ROOT + "climb-to-consul/index.html");
  await page.waitForSelector('[data-act="erase"]');
  await page.click('[data-act="erase"]');
  await page.waitForSelector(".cc-erase.zero");
  await page.click('[data-act="next"]');
  let round = 0, widths = new Set(), pieces = 0, right = 0, missedOnce = 0;
  while (!(await page.$(".cc-erase.final"))) {
    round++;
    const tag = `${tag0} round ${round}`;
    await sleep(500);                                       /* the sponge is wiping */
    const mid = await blanks(page);
    same(mid, tag + " (while wiping)");
    await page.waitForFunction(() => !document.querySelector(".cc-smudge.wiping") && document.querySelector(".cc-smudge.sel"), null, { timeout: 5000 });
    const start = await blanks(page);
    ok(start.length > 0, `${tag}: no blanks`);
    same(start, tag);
    start.forEach((b) => widths.add(Math.round(b.w)));
    ok(start.every((b) => !b.shown), `${tag}: an unfilled blank shows its text`);
    const tray = await page.evaluate(() => ({ chips: document.querySelectorAll(".cc-chip").length, blanks: document.querySelectorAll(".cc-smudge").length, fill: document.querySelector(".cc-fill").textContent }));
    ok(tray.chips === tray.blanks + (tray.blanks >= 6 ? 2 : 1), `${tag}: ${tray.chips} chips for ${tray.blanks} blanks`);
    ok(/^Fill: the (genitive|other forms|neuter|gender|case|principal parts|meaning) of \S/.test(tray.fill), `${tag}: the label says "${tray.fill}"`);
    /* the rule: in the first line of the first round, in the second line of the later rounds */
    const say0 = await page.evaluate(() => document.querySelector(".b-text").textContent);
    if (round === 1) { ok(/^The [a-z ]+ are gone\. Only the first try counts!$/.test(say0), `${tag}: the Inspector's first line says "${say0}"`); }
    else {
      ok(/^The sponge took the [a-z ]+\.$/.test(say0), `${tag}: the Inspector's first line says "${say0}"`);
      await page.click(".b-next");
      const say1 = await page.evaluate(() => document.querySelector(".b-text").textContent);
      ok(/^Only the first try counts! /.test(say1), `${tag}: the Inspector's second line says "${say1}"`);
    }
    if (round === 1) {
      /* the selected blank's ring pulses but never fades out */
      const ops = [];
      for (let k = 0; k < 8; k++) { ops.push(await page.evaluate(() => +getComputedStyle(document.querySelector(".cc-smudge.sel"), "::after").opacity)); await sleep(90); }
      ok(Math.min(...ops) >= 0.55, `${tag}: the selected ring fades to ${Math.min(...ops)}`);
    }
    let n = 0, roundRight = 0;
    while (await page.$(".cc-smudge:not(.filled)")) {
      const st = await page.evaluate(() => {
        const s = document.querySelector(".cc-smudge.sel");
        const chips = [...document.querySelectorAll(".cc-chip:not(.used):not([disabled])")].map((c) => ({ t: c.textContent, i: c.getAttribute("data-c") }));
        return { j: s && s.getAttribute("data-j"), want: s && s.querySelector(".cc-was").textContent, chips };
      });
      if (!ok(st.j !== null, `${tag}: no blank selected`)) { break; }
      const wrong = mode === "none" || (mode === "one" && n === 1) || (mode === "half" && n % 2 === 1);
      const wrongChip = wrong ? st.chips.find((c) => c.t !== st.want) : null;
      const chip = wrongChip || st.chips.find((c) => c.t === st.want);
      if (!ok(!!chip, `${tag}: no chip for "${st.want}"`)) { break; }
      await page.click(`.cc-chip[data-c="${chip.i}"]`);
      n++;
      pieces++;
      if (wrongChip) {
        missedOnce++;
        const after = await page.evaluate(([j, i, want]) => {
          const b = document.querySelector(`.cc-smudge[data-j="${j}"]`), c = document.querySelector(`.cc-chip[data-c="${i}"]`);
          const usedRight = [...document.querySelectorAll(".cc-chip.used")].some((x) => x.textContent === want);
          return { filled: b.classList.contains("filled"), missed: b.classList.contains("missed"), text: b.textContent, color: getComputedStyle(b.querySelector(".cc-was")).color,
            stays: !c.disabled && !c.classList.contains("used"), shakes: c.classList.contains("shake"), usedRight, say: document.querySelector(".bubble") ? document.querySelector(".bubble").textContent : "" };
        }, [st.j, chip.i, st.want]);
        ok(after.filled && after.missed && after.text === st.want, `${tag}: a wrong chip did not fill the blank in red (${JSON.stringify(after)})`);
        ok(after.color === "rgb(255, 141, 147)", `${tag}: the red chalk is ${after.color}`);
        ok(after.stays && after.shakes, `${tag}: the wrong chip should shake and stay`);
        ok(after.usedRight, `${tag}: the right chip was not used up with the red fill`);
        ok(after.say.indexOf("That one is") >= 0, `${tag}: the Inspector does not name the piece ("${after.say}")`);
        await sleep(450);
      } else { right++; roundRight++; await sleep(60); }
      if (n === 2) { same(await blanks(page), tag + " (after two pieces)"); }
    }
    const pill = await page.evaluate(() => { const f = document.querySelector(".cc-ft"); return f ? { t: f.textContent, all: f.classList.contains("all") } : {}; });
    ok(pill.t === `${roundRight} of ${tray.blanks} first try`, `${tag}: the pill says "${pill.t}", want ${roundRight} of ${tray.blanks}`);
    ok(pill.all === (roundRight === tray.blanks), `${tag}: the pill is ${pill.all ? "" : "not "}gold for ${roundRight} of ${tray.blanks}`);
    const next = await page.waitForSelector('[data-act="next"]:not([disabled])', { timeout: 3000 }).catch(() => null);
    if (!ok(!!next, `${tag}: Next is not enabled`)) { break; }
    await next.click();
  }
  await sleep(400);
  const fin = await page.evaluate(() => {
    const o = JSON.parse(localStorage.getItem("climbToConsul.v1"));
    return { stars: document.querySelectorAll(".cc-star.on").length, all: document.querySelectorAll(".cc-star").length, count: (document.querySelector(".cc-ftall") || {}).textContent,
      marked: document.querySelectorAll(".cc-say.miss").length, entries: document.querySelectorAll(".cc-say").length, erase: o.progress.p1.erase };
  });
  /* the Inspector's first two lines on the last step (the second one after the bubble's next arrow) */
  fin.lines = [await page.evaluate(() => document.querySelector(".b-text").textContent)];
  if (await page.$(".b-next:not([hidden])")) { await page.click(".b-next"); await sleep(80); fin.lines.push(await page.evaluate(() => document.querySelector(".b-text").textContent)); }
  const share = pieces ? right / pieces : 0, stars = share === 1 ? 3 : share >= 0.75 ? 2 : share >= 0.5 ? 1 : 0;
  ok(fin.all === 3 && fin.stars === stars, `${tag0}: ${fin.stars} stars shown for ${right} of ${pieces}`);
  ok(fin.count === `${right} of ${pieces} pieces on the first try`, `${tag0}: the count says "${fin.count}"`);
  ok(fin.marked === fin.erase.miss.length && (mode === "all" ? fin.marked === 0 : fin.marked > 0), `${tag0}: ${fin.marked} entries marked, ${fin.erase.miss.length} missed words saved`);
  if (mode === "none") { ok(fin.marked === fin.entries, `${tag0}: every entry had a miss, ${fin.marked} of ${fin.entries} marked`); }
  const expect = { all: 3, half: 1, none: 0 }[mode];   /* "one": the stars follow the share (2 with these seeds) */
  ok(expect === undefined || stars === expect, `${tag0}: ${stars} stars for a game played "${mode}"`);
  ok(fin.erase.n === 1 && fin.erase.best[String(player.chapter)] === stars, `${tag0}: the save ${JSON.stringify(fin.erase)}`);
  const line0 = stars === 3 ? "Three stars! Every piece went in on the first try." : stars ? `${stars} ${stars === 1 ? "star" : "stars"}! ${right} of ${pieces} pieces on the first try.`
    : `${right} of ${pieces} pieces on the first try. Play again for stars!`;
  ok(fin.lines[0] === line0, `${tag0}: the last step's first line is "${fin.lines[0]}", want "${line0}"`);
  ok(/^Say each whole entry aloud, then tap it to check\.$/.test(fin.lines[1] || ""), `${tag0}: the last step's second line is "${fin.lines[1]}"`);
  /* open every entry: the Inspector's last word suits the stars */
  await page.evaluate(() => document.querySelectorAll(".cc-say").forEach((b) => b.click()));
  await sleep(150);
  const close = await page.evaluate(() => ({ say: document.querySelector(".b-text").textContent, done: !document.querySelector('[data-act="done"]').disabled }));
  const want = stars === 3 ? "You are ready for the quiz!" : stars ? "Say the marked ones once more!" : "Play again for stars!";
  ok(close.done && close.say === "Every entry, start to finish. " + want, `${tag0}: the closing line is "${close.say}"`);
  ok(!errors.length, `${tag0}: console errors ${errors.join(" | ")}`);
  console.log(`  ${tag0}: ${round} rounds, blank width ${[...widths].join("/")} px, ${right} of ${pieces} first try, ${fin.stars} ${fin.stars === 1 ? "star" : "stars"}, ${fin.marked} marked`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  console.log("Climb to Consul: Erase Away blanks");
  try {
    for (const size of SIZES) { for (const player of PLAYERS) { for (const g of GAMES) { await game(browser, size, player, g); } } }
  } finally { await browser.close(); }
  console.log(`  ${checks} checks, ${fails} failed`);
  if (fails) { failures.forEach((f) => console.log("  FAIL " + f)); process.exit(1); }
  console.log("  all passed");
})().catch((e) => { console.error(e); process.exit(1); });
