/* Row the Endings: a Playwright run of tonight's voyage, end to end, from file://.
 *   node tools/play.js [width height grade chapter]      (default 390 844 6 2)
 * Makes a player, rows every leg (a few wrong tiles or typed forms on purpose), answers the called boxes
 * (one wrong), checks for sideways overflow and cut boxes on each result card, goes back to the quay, and
 * exits non-zero on a console error (the 404s of Case Detective 2.2's files aside), on overflow, or if the
 * voyage does not end. Needs require("playwright") with Chromium installed. */
"use strict";
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

/* ROW_URL=http://localhost:8000/language-games/row-the-endings/ runs it from a static server (a sub-folder, as on GitHub Pages) */
const URL = process.env.ROW_URL || pathToFileURL(path.join(__dirname, "..", "index.html")).href;
const [w = 390, h = 844, grade = 6, chapter = 2] = process.argv.slice(2);

async function addPlayer(p, name, g, ch) {
  if (await p.locator(".lpf-new").count()) { await p.click(".lpf-new"); }
  await p.fill(".lpf-input", name);
  await p.click("form .btn.primary");
  await p.click(`.lpf-grade[data-g="${g}"]`);
  await p.waitForTimeout(150);
  if (ch) { await p.click(`.lpf-ch[data-ch="${ch}"]`); }
  await p.click('[data-act="go"]');
  await p.waitForTimeout(500);
}
/* the current box: its right ending and form */
function cur(p) {
  return p.evaluate(() => {
    const v = document.querySelector(".view.rv:not(.rc)"); if (!v) { return null; }
    const td = document.querySelector("td.box.cur"); if (!td) { return { none: true }; }
    const chart = LATIN_CHARTS.charts.find((c) => c.id === v.dataset.chart);
    const b = RowLogic.boxes(chart, { voc: true }).find((x) => x.key === td.dataset.k);
    return { f: b.f, e: b.e, mode: v.dataset.mode, n: +document.querySelector(".rv-n").textContent.split("/")[0] };
  });
}
function tileFor(p, e, right) {
  return p.evaluate(([e, right]) => {
    const want = e === "" ? "—" : e;
    return Array.from(document.querySelectorAll(".tiles .tile")).findIndex((t) => {
      const tx = t.querySelector(".t-t").textContent.replace(/^-/, "");
      return right ? tx === want : tx !== want;
    });
  }, [e, right]);
}
function overflow(p) {
  return p.evaluate(() => {
    const de = document.documentElement, out = [];
    if (de.scrollWidth > de.clientWidth + 1) { out.push("page scrolls sideways: " + de.scrollWidth + " > " + de.clientWidth); }
    document.querySelectorAll("td.box").forEach((td) => {
      if (td.scrollWidth > td.clientWidth + 1) { out.push("box cut " + td.dataset.k + " " + td.textContent); }
    });
    return out;
  });
}

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })).newPage();
  const errs = [], log = [], bad = [], maxOver = { px: 0, at: "" };
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FILE_NOT_FOUND|404/.test(m.text())) { errs.push(m.text()); } });
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  await p.goto(URL); await p.waitForTimeout(400);
  await addPlayer(p, "Tester", grade, chapter);
  await p.click('[data-a="sail"]'); await p.waitForTimeout(500);
  let leg = 0;
  for (let guard = 0; guard < 500; guard++) {
    if (await p.locator(".view.re").count()) { break; }
    if (await p.locator(".rv-res").count()) {
      log.push("leg " + (leg + 1) + ": " + await p.evaluate(() => document.querySelector(".rv-res").innerText.replace(/\s+/g, " ").slice(0, 140)));
      (await overflow(p)).forEach((o) => bad.push("leg " + (leg + 1) + ": " + o));
      leg++;
      await p.click('[data-a="on"]'); await p.waitForTimeout(500);
      continue;
    }
    if (await p.locator(".rc .rc-q").count()) {
      const q = await p.evaluate(() => {
        const qq = document.querySelector(".rc-q"), who = qq.querySelector("i").textContent, name = qq.querySelector("b").textContent;
        let ans = null;
        LATIN_CHARTS.charts.forEach((c) => RowLogic.boxes(c, { voc: true }).forEach((x) => { if (x.who === who && (x.name === name || x.short === name)) { ans = RowLogic.answers(x); } }));
        return { ans, tiles: Array.from(document.querySelectorAll(".rc-a .tile")).map((t) => t.querySelector(".t-t").textContent),
          typing: !!document.querySelector(".rc-a .ty-in"), n: +(document.querySelector(".rc .rv-n").textContent.match(/(\d+) \//) || [0, 0])[1] };
      });
      if (!q.ans) { bad.push("a called box with no answer"); break; }
      await p.waitForTimeout(450);                 /* the new tiles slide in (a transform) before the page is measured */
      const overC = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if (overC > maxOver.px) { maxOver.px = overC; maxOver.at = "called box " + q.n; }
      const wrong = q.n === 2;
      if (q.typing) { await p.fill(".ty-in", wrong ? "xxx" : q.ans[0]); await p.press(".ty-in", "Enter"); }
      else { await p.keyboard.press(String(q.tiles.findIndex((t) => (wrong ? !q.ans.includes(t) : q.ans.includes(t))) + 1)); }
      await p.waitForTimeout(wrong ? 400 : 1100);
      if (wrong) { await p.keyboard.press("Enter"); await p.waitForTimeout(400); }
      continue;
    }
    const c = await cur(p);
    if (!c || c.none) { await p.waitForTimeout(300); continue; }
    /* how far a play screen scrolls (it should fit at 390x844 and 1366x768) */
    const over = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (over > maxOver.px) { maxOver.px = over; maxOver.at = "leg " + (leg + 1) + " box " + c.n; }
    const wrong = (leg === 0 && (c.n === 3 || c.n === 9)) || (leg === 1 && c.n === 5);
    if (c.mode === "type") { await p.fill(".ty-in", wrong ? c.f + "x" : c.f); await p.press(".ty-in", "Enter"); }
    else {
      const i = await tileFor(p, c.e, !wrong);
      if (i < 9) { await p.keyboard.press(String(i + 1)); } else { await p.locator(".tiles .tile").nth(i).click(); }
    }
    await p.waitForTimeout(wrong ? 2300 : 330);
  }
  const ended = await p.locator(".view.re").count();
  if (!ended) { bad.push("the voyage did not end"); }
  else { log.push("end: " + await p.evaluate(() => document.querySelector(".re-card").innerText.replace(/\s+/g, " ").slice(0, 200))); }
  (await overflow(p)).forEach((o) => bad.push("end: " + o));
  if (ended) {
    await p.click('[data-a="quay"]'); await p.waitForTimeout(500);
    log.push("home: " + await p.evaluate(() => document.querySelector(".rh-night").innerText.replace(/\s+/g, " ")));
  }
  await b.close();
  log.push("play screens scroll at most " + maxOver.px + " px" + (maxOver.px ? " (" + maxOver.at + ")" : ""));
  console.log(log.join("\n"));
  errs.forEach((e) => bad.push("console: " + e));
  if (bad.length) { console.log("PROBLEMS:\n" + bad.join("\n")); process.exit(1); }
  console.log("Voyage rowed at " + w + "x" + h + " (grade " + grade + ", chapter " + chapter + "): no errors, no overflow.");
})().catch((e) => { console.error(e); process.exit(1); });
