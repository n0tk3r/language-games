/* Row the Endings: a Playwright run of tonight's voyage, end to end, from file://.
 *   node tools/play.js [width height grade chapter]      (default 390 844 6 2)
 *   ROW_BEAT=off|slow|steady   the drum, set in Settings before sailing (default: the setting as it is, slow)
 *   ROW_THINK=ms               a pause before each answer (default 0: a quick child)
 * Makes a player, rows every leg (a few wrong tiles or typed forms on purpose; a deliberate wrong tile waits
 * 800 ms, so it is never a rushed one), answers the called boxes (one wrong), checks for sideways overflow and cut
 * boxes on each result card, goes back to the quay, and exits non-zero on a console error (the 404s of Case
 * Detective 2.2's files aside), on overflow, or if the voyage does not end.
 * The race with the Corvus: a Corvus on every leg whose drum beats (Calm water and Open sea at Slow; no Storm leg at
 * Slow), a race line on every raced result card and none without a drum, a raced result card never taller (below
 * 900 px, where the panel is docked) and never scrolling more than the card as it was before the race, the regatta
 * on the end card. Then a Storm leg from the quay, a leg with reduced motion, and a check at 320x640 that the race
 * chip and the "Leg 1 of 3" tag do not overlap. The sea strip of each raced leg: its height and mode (row.js fitSea:
 * tall, a leg that had room; snug, from 600 px wide with no room, the ships a little smaller in the strip as high as
 * it was; else normal; never tall or snug without a race), and at mid-race how much of the Corvus's sail our ship's
 * sail and hull cover, where it is and at the five leads of a close race (0.3, 0.5 and 1 stroke behind, 0.5 and 1
 * ahead), the most over the ships' bob: at least 60 % of its sail shows in every mode from 390 px wide (at 320 px it
 * is printed, not asserted), also right next to level (a hundredth to a fifth of a stroke either way; level itself
 * is printed on a phone's normal strip, where the prows are side by side behind our sail), and the prows are level
 * when the race is. The Inspector's race lines at the start of a leg never make the play screen taller than the
 * step's own lines do; on a result card the ribbon keeps off the Corvus's sail, the Inspector's pages scroll nothing
 * under a tall strip, and a resize leaves the leg tag away and the strip as it was. Needs require("playwright") with
 * Chromium installed. */
"use strict";
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

/* ROW_URL=http://localhost:8000/language-games/row-the-endings/ runs it from a static server (a sub-folder, as on GitHub Pages) */
const URL = process.env.ROW_URL || pathToFileURL(path.join(__dirname, "..", "index.html")).href;
const [w = 390, h = 844, grade = 6, chapter = 2] = process.argv.slice(2);
const BEAT = ["off", "slow", "steady"].indexOf(process.env.ROW_BEAT) >= 0 ? process.env.ROW_BEAT : "";
const THINK = Math.max(0, +process.env.ROW_THINK || 0);
const FITS = (+w === 390 && +h === 844) || (+w === 1366 && +h === 768);    /* the play screens must not scroll at these */

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
/* the drum, in Settings, before sailing */
async function setBeat(p, beat) {
  if (!beat) { return; }
  await p.click('.rh-foot [data-a="settings"]'); await p.waitForTimeout(400);
  await p.click(`.rs-b[data-k="beat"][data-v="${beat}"]`);
  await p.click('.dlg button:has-text("Done")'); await p.waitForTimeout(500);
}
/* the current box: its right ending and form, the leg's step */
function cur(p) {
  return p.evaluate(() => {
    const v = document.querySelector(".view.rv:not(.rc)"); if (!v) { return null; }
    const td = document.querySelector("td.box.cur"); if (!td) { return { none: true }; }
    const chart = LATIN_CHARTS.charts.find((c) => c.id === v.dataset.chart);
    const b = RowLogic.boxes(chart, { voc: true }).find((x) => x.key === td.dataset.k);
    const rn = document.querySelector(".rv-n").textContent.split("/");
    return { f: b.f, e: b.e, mode: v.dataset.mode, step: +v.dataset.step, id: chart.id, n: +rn[0], of: +rn[1] };
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
/* a raced result card against the card as it was before the race: no race line, the next-step line shown, and
   "Best run in stroke: N." when N is 3 or more. -> { h1, h0 (card heights), s1, s0 (page scroll) } */
function cardVsBefore(p) {
  return p.evaluate(() => {
    const res = document.querySelector(".rv-res"), de = document.documentElement, rr = res && res.querySelector(".rr-race");
    if (!rr) { return null; }
    const measure = () => ({ h: res.getBoundingClientRect().height, s: de.scrollHeight - innerHeight });
    const a = measure();
    const run = rr.querySelector(".rr-run"), best = run ? +(run.textContent.match(/\d+/) || [0])[0] : 0;
    rr.style.display = "none";
    res.classList.remove("raced");                 /* the next-step line as it was shown before the race */
    let old = null;
    if (best >= 3) { old = document.createElement("p"); old.className = "rr-m"; old.textContent = "Best run in stroke: " + best + "."; rr.parentNode.insertBefore(old, rr.nextSibling); }
    const b = measure();
    rr.style.display = ""; res.classList.add("raced"); if (old) { old.parentNode.removeChild(old); }
    return { h1: Math.round(a.h), h0: Math.round(b.h), s1: a.s, s0: b.s };
  });
}
/* two boxes on the page overlap */
function overlap(a, b) { return a && b && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5; }
function rect(p, sel) { return p.evaluate((sel) => { const e = document.querySelector(sel); if (!e || e.hidden || !e.offsetParent) { return null; } const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }, sel); }
/* the Inspector's lines, page by page (as a child taps his arrow): the most the page scrolls on any of them */
async function pageBubble(p, pages) {
  let most = 0;
  for (let k = 0; k < 10; k++) {
    const pg = await p.evaluate(() => {
      const bt = document.querySelector(".b-text"), cs = bt ? getComputedStyle(bt) : null, lh = cs ? parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.36 : 1;
      return { over: document.documentElement.scrollHeight - innerHeight, text: bt ? bt.textContent : "", lines: bt ? Math.round(bt.getBoundingClientRect().height / lh) : 0 };
    });
    if (pages) { pages.push(pg); }
    most = Math.max(most, pg.over);
    const nx = p.locator(".b-next:not([hidden])");
    if (!(await nx.count())) { break; }
    await nx.first().click(); await p.waitForTimeout(80);
  }
  return most;
}
/* the sea strip: its height and mode (row.js fitSea: tall on a raced leg when the page has room; snug from 600 px wide
   when it has none, the ships a little smaller; else normal) */
function strip(p) {
  return p.evaluate(() => {
    const s = document.querySelector(".sea"), ship = document.querySelector(".ship");
    if (!s) { return null; }
    const px = (k) => parseFloat(s.style.getPropertyValue(k)) || 0, was = s.style.getPropertyValue("--sw");
    /* our ship's width and the strip's height by the style sheet alone (what a leg with no race gets) */
    s.style.removeProperty("--sw");
    const sw0 = parseFloat(getComputedStyle(s).getPropertyValue("--sw")) || 0, sh0 = parseFloat(getComputedStyle(s).getPropertyValue("--sh")) || 0;
    if (was) { s.style.setProperty("--sw", was); }
    const tall = s.classList.contains("tall"), snug = s.classList.contains("snug");
    return { h: s.offsetHeight, sh0, mode: tall ? "tall" : snug ? "snug" : "normal", both: tall && snug, grow: px("--grow"), lift: px("--lift"), sw: ship ? ship.offsetWidth : 0, sw0 };
  });
}
function stripText(st) {
  return !st ? "no strip" : "strip " + st.h + " px, " + (st.mode === "tall" ? "tall +" + st.grow + " (the Corvus " + st.lift + " px higher)" :
    st.mode === "snug" ? "snug (our ship " + st.sw + " px for " + st.sw0 + ", the Corvus " + st.lift + " px higher)" : "normal");
}
/* the leads of a close race, in strokes (positive: the Corvus behind us): the five that must show its sail, and more
   places in between (from a stroke ahead to a stroke and a half behind), which the tall and snug strips clear too */
const FIVE = [0.3, 0.5, 1, -0.5, -1], MORE = [-0.25, 0, 0.25, 0.75, 1.5];
/* right next to level, where a close race rests (a child three beats over a box has the Corvus hold water a few
   hundredths of a stroke ahead): from a hundredth to a fifth of a stroke either way. On a phone's normal strip the
   Corvus is drawn wide of our sail from a hundredth of a stroke (RowLogic.leadPx); level itself is not in this list */
const NEARBY = [0.01, 0.02, 0.05, 0.1, 0.2, -0.01, -0.02, -0.05, -0.1, -0.2];
const leadText = (l) => (l > 0 ? l + " behind" : l < 0 ? -l + " ahead" : "level");
/* how much of the Corvus's sail (its sail's box) our ship's sail and hull boxes cover: where it is now, and (put there
   for a moment, as RowLogic.rivalX draws it, then put back) at the leads of a close race. At each place the most over
   the ships' bob, in step or out of it: each ship's endless animations (its bob, its sail) are put at 8 moments of
   their cycle (both ends of the bob among them), every moment of ours with every moment of the Corvus's, then put
   back; so the number does not depend on when it is taken. Our ship is measured at its place (its glide there ended
   for the measure). done: the boxes answered, n: the boxes of the leg.
   -> { now, five: [the cover at each of FIVE], most, at (over FIVE), mostAll, atAll (over FIVE and MORE), near, atNear
   (the most over NEARBY), level (the cover when the race is level), prow (px between the two prows when the race is
   level), bob (how many of the two ships' bobs were found) } or null */
function sailCover(p, done, n) {
  return p.evaluate(([done, n, FIVE, MORE, NEARBY]) => {
    const ship = document.querySelector(".ship"), runner = document.querySelector(".runner");
    const rs = document.querySelector(".rship"), sail = rs && rs.querySelector(".sail"), run = document.querySelector(".rrun"), lane = document.querySelector(".rtrack");
    const ours = [document.querySelector(".ship .sail"), document.querySelector(".ship .hull")];
    if (!ship || !runner || !sail || !run || !lane || rs.classList.contains("moored") || lane.classList.contains("gone") || ours.some((e) => !e)) { return null; }
    const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
    const cut = (a, b) => ({ left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) });
    const cover = () => {
      const r = sail.getBoundingClientRect(), s = ours[0].getBoundingClientRect(), h = ours[1].getBoundingClientRect(), all = area(r);
      return all ? (area(cut(r, s)) + area(cut(r, h)) - area(cut(cut(r, s), h))) / all : 0;
    };
    /* each ship's endless animations (its bob, its sail): [animation, its time now, a time a cycle starts, its
       period]. The Corvus's bob has a negative delay (it bobs out of step with ours): a cycle of it starts at that
       delay plus whole periods, and only a time from 0 on is in the animation */
    const bob = [ship, rs].map((e) => {
      const list = [];
      try {
        e.getAnimations({ subtree: true }).forEach((a) => {
          const t = a.effect && a.effect.getComputedTiming();
          if (!t || t.iterations !== Infinity || !(t.duration > 0) || a.playState !== "running" || a.currentTime == null) { return; }
          const delay = t.delay || 0;
          list.push([a, a.currentTime, delay + Math.ceil(Math.max(0, -delay) / t.duration) * t.duration, t.duration]);
        });
      } catch (x) { /* measured as it is */ }
      return list;
    });
    /* moment k of K of every cycle (0 and K / 2 are the two ends of a bob); k < 0 puts the time back */
    const K = 8, seek = (list, k) => list.forEach(([a, t, t0, d]) => { a.currentTime = k < 0 ? t : t0 + k / K * d; });
    const overBob = () => {
      if (!bob[0].length && !bob[1].length) { return cover(); }
      let m = 0;
      for (let i = 0; i < K; i++) { seek(bob[0], i); for (let j = 0; j < K; j++) { seek(bob[1], j); m = Math.max(m, cover()); } }
      seek(bob[0], -1); seek(bob[1], -1);
      return m;
    };
    const now = overBob(), t = run.style.transform, tr = run.style.transition, tr0 = runner.style.transition, phone = matchMedia("(max-width: 599.98px)").matches;
    const bobs = [ship.querySelector(".bob"), rs.querySelector(".rbob")].filter((e) => bob[0].concat(bob[1]).some((x) => x[0].effect.target === e)).length;
    const out = { now, five: [], most: 0, at: 0, mostAll: 0, atAll: 0, near: 0, atNear: 0, level: 0, prow: 0, bob: bobs };
    run.style.transition = "none"; runner.style.transition = "none";
    FIVE.concat(MORE, NEARBY).forEach((lead, i) => {
      const x = RowLogic.rivalX(done, n, (done - lead) / n, lane.clientWidth, phone, { lo: lane.offsetLeft, hi: rs.offsetWidth * 0.45 });
      run.style.transform = "translateX(" + x.toFixed(1) + "px)";
      const c = overBob();
      if (i < FIVE.length) { out.five.push(c); if (c > out.most) { out.most = c; out.at = lead; } }
      if (i < FIVE.length + MORE.length) { if (c > out.mostAll) { out.mostAll = c; out.atAll = lead; } }
      else if (c > out.near) { out.near = c; out.atNear = lead; }
      if (lead === 0) { out.level = c; out.prow = Math.abs(rs.getBoundingClientRect().right - ship.getBoundingClientRect().right); }
    });
    run.style.transform = t; void run.offsetWidth; run.style.transition = tr; runner.style.transition = tr0;
    return out;
  }, [done, n, FIVE, MORE, NEARBY]);
}
/* a result card of a raced leg: how much of the Corvus's sail the ribbon covers (the ships have docked or moored; the
   ribbon keeps off its sail, row.js chipPlace), whether the "Leg n of N" tag shows, the strip's mode and height */
function resultStrip(p) {
  return p.evaluate(() => {
    const chip = document.querySelector(".racechip"), sail = document.querySelector(".rship .sail"), tag = document.querySelector(".legtag"), sea = document.querySelector(".sea");
    const shown = (e) => !!(e && !e.hidden && e.offsetParent);
    let cover = 0;
    if (shown(chip) && sail && !document.querySelector(".rtrack.gone")) {
      const a = chip.getBoundingClientRect(), b = sail.getBoundingClientRect();
      const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      cover = b.width * b.height ? w * h / (b.width * b.height) : 0;
    }
    const cr = shown(chip) ? chip.getBoundingClientRect() : null, sr = sea.getBoundingClientRect();
    return { chip: shown(chip) ? chip.textContent : "", cover, chipIn: !cr || (cr.left >= sr.left - 0.5 && cr.right <= sr.right + 0.5),
      tag: shown(tag) && +getComputedStyle(tag).opacity > 0.05, seaH: sea.offsetHeight, seaCls: sea.className.replace(/\s+/g, " ").trim() };
  });
}
/* wait until both ships bob again: for half a second after an answer a surge (or a clash) takes the bob's place */
async function bobbing(p) {
  for (let k = 0; k < 20; k++) {
    const yes = await p.evaluate(() => [".ship .bob", ".rship .rbob"].every((sel) => {
      const e = document.querySelector(sel);
      return !e || e.getAnimations().some((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity && a.playState === "running");
    }));
    if (yes) { return; }
    await p.waitForTimeout(100);
  }
}
/* the cover at the five leads, in words */
function fiveText(cv) { return FIVE.map((l, i) => pc(cv.five[i]) + " at " + leadText(l)).join(", "); }
const pc = (x) => Math.round(x * 100) + " %";
/* the race should run on this leg: the drum beats at this step (RowLogic.raceOn, as the game decides) */
function raceExpected(p, step) { return p.evaluate(([beat, step]) => RowLogic.raceOn({ beat: beat || "slow", race: "race" }, step), [BEAT, step]); }

async function newPage(b, o) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 }, o || {}));
  const p = await ctx.newPage(), errs = [];
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FILE_NOT_FOUND|404/.test(m.text())) { errs.push(m.text()); } });
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.errs = errs;
  return p;
}

(async () => {
  const b = await chromium.launch();
  const p = await newPage(b);
  const log = [], bad = [], maxOver = { px: 0, at: "" };
  await p.goto(URL); await p.waitForTimeout(400);
  await addPlayer(p, "Tester", grade, chapter);
  await setBeat(p, BEAT);
  await p.click('[data-a="sail"]'); await p.waitForTimeout(500);
  let leg = 0, legStep = 0, raced = false, legStart = true, legStrip = null, midDone = false, legPages = false;
  /* the lines a leg starts with whether it races or not (row.js startChart): the step's own */
  const OWN = /^(Calm water\.|Open sea!|Storm!|Go down |Tap (each |its ending|the forms |the endings |the word )|Type each |The ā ē ī ō ū |Once more: )/;
  for (let guard = 0; guard < 700; guard++) {
    if (await p.locator(".view.re").count()) { break; }
    if (await p.locator(".rv-res").count()) {
      await p.waitForTimeout(150);
      const text = await p.evaluate(() => document.querySelector(".rv-res").innerText.replace(/\s+/g, " "));
      const race = await p.evaluate(() => { const r = document.querySelector(".rv-res .rr-race"); return r ? r.textContent.replace(/\s+/g, " ").trim() : null; });
      log.push("leg " + (leg + 1) + ": " + text.slice(0, 110) + (race ? "\n        race: " + race : ""));
      const extra = await p.evaluate(() => Array.from(document.querySelectorAll('.rv-res .dock [data-a]:not([data-a="on"])')).map((x) => x.textContent.trim()));
      if (extra.length) { log.push("        buttons: " + extra.join(" | ")); }
      (await overflow(p)).forEach((o) => bad.push("leg " + (leg + 1) + ": " + o));
      if (raced && !race) { bad.push("leg " + (leg + 1) + ": a raced result card with no race line"); }
      if (!raced && race) { bad.push("leg " + (leg + 1) + ": a race line with no race: " + race); }
      if (race) {
        const cv = await cardVsBefore(p);
        log.push("        card " + cv.h1 + " px (before the race: " + cv.h0 + "), page scroll " + cv.s1 + " (before: " + cv.s0 + ")");
        if (cv.s1 > cv.s0 + 1) { bad.push("leg " + (leg + 1) + ": the raced card scrolls more than before (" + cv.s1 + " > " + cv.s0 + ")"); }
        if (+w < 900 && cv.h1 > cv.h0 + 1) { bad.push("leg " + (leg + 1) + ": the raced card is taller than before (" + cv.h1 + " > " + cv.h0 + ")"); }
        /* the Inspector's lines about the race and the next step, page by page: at most two lines of his bubble on a
           phone from 390 px wide, and under a tall strip (which kept room for a card with two misses) no scroll */
        const pages = [], missed = await p.evaluate(() => document.querySelectorAll(".rv-res .rr-miss small").length);
        await pageBubble(p, pages);
        log.push("        the Inspector's " + pages.length + " pages scroll " + pages.map((x) => x.over).join(", ") + " px (" + pages.map((x) => x.lines).join(", ") + " lines; " + missed + " missed)");
        if (+w >= 390 && +w < 600 && pages.some((x) => x.lines > 2)) { bad.push("leg " + (leg + 1) + ": a result line of the Inspector's takes " + Math.max(...pages.map((x) => x.lines)) + " lines of his bubble: " + pages.find((x) => x.lines > 2).text); }
        if (legStrip && legStrip.mode === "tall" && missed <= 2 && pages.some((x) => x.over > 0)) { bad.push("leg " + (leg + 1) + ": the result card scrolls " + Math.max(...pages.map((x) => x.over)) + " px under a tall strip (" + pages.map((x) => x.over).join(", ") + ")"); }
        /* the strip under the card, once the ships have docked: the ribbon off the Corvus's sail; then a resize
           (a px wider, a px shorter, and back, as a window's edge or a phone's address bar does) leaves the leg
           tag away and the strip as it was */
        await p.waitForTimeout(800);
        const r0 = await resultStrip(p);
        await p.setViewportSize({ width: +w + 1, height: +h }); await p.waitForTimeout(300);
        await p.setViewportSize({ width: +w, height: +h - 1 }); await p.waitForTimeout(300);
        await p.setViewportSize({ width: +w, height: +h }); await p.waitForTimeout(350);
        const r1 = await resultStrip(p);
        log.push("        ribbon \"" + r0.chip + "\" over " + pc(r0.cover) + " of the Corvus's sail (" + pc(r1.cover) + " after a resize); the leg tag " + (r0.tag ? "shows" : "away") + (r1.tag ? ", back after a resize" : "") + "; strip " + r0.seaH + " px" + (r1.seaH !== r0.seaH ? ", " + r1.seaH + " px after a resize" : ""));
        if (!r0.chip) { bad.push("leg " + (leg + 1) + ": no ribbon on the strip of a raced result card"); }
        if (Math.max(r0.cover, r1.cover) > 0.25) { bad.push("leg " + (leg + 1) + ": the ribbon covers " + pc(Math.max(r0.cover, r1.cover)) + " of the Corvus's sail"); }
        if (!r0.chipIn || !r1.chipIn) { bad.push("leg " + (leg + 1) + ": the ribbon leaves the strip"); }
        if (r0.tag || r1.tag) { bad.push("leg " + (leg + 1) + ": the leg tag shows over the docked ships" + (r0.tag ? "" : " after a resize")); }
        if (r1.seaH !== r0.seaH || r1.seaCls !== r0.seaCls) { bad.push("leg " + (leg + 1) + ": a resize changed the strip under the result card (" + r0.seaCls + " " + r0.seaH + " px -> " + r1.seaCls + " " + r1.seaH + " px)"); }
      }
      leg++; legStart = true;
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
      if (await p.locator(".rship").count()) { bad.push("the Corvus on the called boxes"); }
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
    if (legStart) {
      /* a new leg: is the Corvus there when (and only when) the drum beats? */
      legStart = false; legStep = c.step; legPages = true;
      raced = await raceExpected(p, c.step);
      const rival = await p.locator(".rship").count();
      if (raced && !rival) { bad.push("leg " + (leg + 1) + " (step " + c.step + "): no Corvus with the drum on"); }
      if (!raced && rival) { bad.push("leg " + (leg + 1) + " (step " + c.step + "): a Corvus with no drum"); }
      const dl = await p.evaluate(() => document.querySelector(".hud-drum").getAttribute("aria-label"));
      if (raced !== /Corvus/.test(dl)) { bad.push("leg " + (leg + 1) + ": the drum's label: " + dl); }
      /* the strip: tall or snug only when the leg races; snug only from 600 px wide, as high as the strip was, with
         both ships a little smaller; never both */
      await p.waitForTimeout(60);                  /* fitSea runs on a 0 ms timer once the leg is drawn */
      legStrip = await strip(p); midDone = !raced;
      if (!raced) { log.push("leg " + (leg + 1) + " (step " + c.step + ", no race): " + stripText(legStrip)); }
      if (!raced && legStrip && legStrip.mode !== "normal") { bad.push("leg " + (leg + 1) + ": a " + legStrip.mode + " strip with no race"); }
      if (legStrip && legStrip.both) { bad.push("leg " + (leg + 1) + ": the strip is tall and snug at once"); }
      if (legStrip && legStrip.mode === "snug") {
        if (+w < 600) { bad.push("leg " + (leg + 1) + ": a snug strip under 600 px wide"); }
        if (legStrip.h !== legStrip.sh0) { bad.push("leg " + (leg + 1) + ": the snug strip changed its height (" + legStrip.h + " px, not " + legStrip.sh0 + ")"); }
        if (!(legStrip.sw < legStrip.sw0 && legStrip.sw >= 0.85 * legStrip.sw0)) { bad.push("leg " + (leg + 1) + ": the snug strip's ships are " + legStrip.sw + " px for " + legStrip.sw0 + " (a little smaller, at least 85 %)"); }
      } else if (legStrip && legStrip.sw !== legStrip.sw0) { bad.push("leg " + (leg + 1) + ": our ship is " + legStrip.sw + " px wide, not " + legStrip.sw0 + ", in a " + legStrip.mode + " strip"); }
    }
    /* mid-race: the Corvus's sail clear of ours. At the five leads of a close race, and right next to level, at
       least 60 % of it shows in every mode from 390 px wide (narrower: printed only); the tall and snug strips
       clear it at every place in between too; the prows are level when the race is. One case is printed, not
       asserted, here: a tall strip on a Storm leg of the voyage, where the two ships pitch out of step (no voyage
       of the runs in NOTES.md has one; the Storm leg rowed from the quay below is measured and asserted) */
    if (!midDone && c.n >= Math.ceil(c.of / 2)) {
      midDone = true;
      await bobbing(p);
      const cv = await sailCover(p, c.n - 1, c.of), pitch = c.step === 3 && legStrip.mode === "tall";
      log.push("leg " + (leg + 1) + " (step " + c.step + ", raced): " + stripText(legStrip) + "; at box " + c.n + " of " + c.of + " the Corvus's sail is " +
        (cv ? pc(cv.now) + " covered; in a close race " + fiveText(cv) + (legStrip.mode === "normal" ? "" : "; anywhere from 1 ahead to 1.5 behind at most " + pc(cv.mostAll) + " (" + leadText(cv.atAll) + ")") +
          (pitch ? " (the Storm's pitch: printed only)" : "") : "not out (moored or gone)"));
      if (cv && +w >= 390 && !pitch && cv.most > 0.4) {
        bad.push("leg " + (leg + 1) + ": the " + legStrip.mode + " strip shows only " + pc(1 - cv.most) + " of the Corvus's sail at " + leadText(cv.at) + " (at least 60 % at the five leads of a close race)");
      }
      if (cv && legStrip.mode !== "normal" && !pitch && (cv.now > 0.4 || cv.mostAll > 0.4)) {
        bad.push("leg " + (leg + 1) + ": the " + legStrip.mode + " strip shows only " + pc(1 - Math.max(cv.now, cv.mostAll)) + " of the Corvus's sail (at least 60 % anywhere in a close race)");
      }
      if (cv) { log.push("        next to level (0.01 to 0.2 of a stroke either way) at most " + pc(cv.near) + " (" + leadText(cv.atNear) + "); level " + pc(cv.level)); }
      if (cv && +w >= 390 && !pitch && cv.near > 0.4) {
        bad.push("leg " + (leg + 1) + ": the " + legStrip.mode + " strip shows only " + pc(1 - cv.near) + " of the Corvus's sail at " + leadText(cv.atNear) + " (at least 60 % from a hundredth of a stroke off level)");
      }
      if (cv && cv.prow > 1) { bad.push("leg " + (leg + 1) + ": the prows are " + cv.prow.toFixed(1) + " px apart when the race is level"); }
      if (cv && cv.bob !== 2) { bad.push("leg " + (leg + 1) + ": the bob of " + (2 - cv.bob) + " of the two ships was not found for the measure"); }
    }
    /* how far a play screen scrolls (it should fit at 390x844 and 1366x768), on every page of the Inspector's lines
       (at the start of a leg, after a miss, at a new column) */
    const pages = [], over = await pageBubble(p, pages);
    if (over > maxOver.px) { maxOver.px = over; maxOver.at = "leg " + (leg + 1) + " box " + c.n; }
    if (legPages) {
      /* the lines at the start of a leg: the race's (and the drum's) never scroll the page more than the step's own */
      legPages = false;
      const own = pages.filter((x) => OWN.test(x.text)), race = pages.filter((x) => !OWN.test(x.text));
      const o = Math.max(0, ...own.map((x) => x.over)), r = Math.max(0, ...race.map((x) => x.over));
      if (race.length) { log.push("leg " + (leg + 1) + " start: " + pages.length + " pages scroll " + pages.map((x) => x.over).join(", ") + " px (" + pages.map((x) => x.lines).join(", ") + " lines); the race's: " + race.map((x) => "\"" + x.text + "\"").join(" ")); }
      if (own.length && r > o + 1) { bad.push("leg " + (leg + 1) + ": a race line scrolls the play screen " + r + " px, the step's own lines " + o + " px: " + race.find((x) => x.over === r).text); }
      if (!own.length) { bad.push("leg " + (leg + 1) + ": none of the step's own lines at its start"); }
    }
    const wrong = (leg === 0 && (c.n === 3 || c.n === 9)) || (leg === 1 && c.n === 5);
    /* think first; a deliberate wrong tile waits 800 ms, so it is never a rushed one */
    const wait = Math.max(THINK, wrong ? 800 : 0);
    if (wait) { await p.waitForTimeout(wait); }
    if (c.mode === "type") { await p.fill(".ty-in", wrong ? c.f + "x" : c.f); await p.press(".ty-in", "Enter"); }
    else {
      const i = await tileFor(p, c.e, !wrong);
      if (i < 9) { await p.keyboard.press(String(i + 1)); } else { await p.locator(".tiles .tile").nth(i).click(); }
    }
    if (raced && c.n === 1) {
      await p.waitForTimeout(120);
      const chip = await p.evaluate(() => { const e = document.querySelector(".racechip"); return e && !e.hidden ? e.textContent : ""; });
      if (chip !== "Race on!") { bad.push("leg " + (leg + 1) + ": no \"Race on!\" at the first answer (" + chip + ")"); }
    }
    await p.waitForTimeout(wrong ? 2300 : 330);
  }
  const ended = await p.locator(".view.re").count();
  if (!ended) { bad.push("the voyage did not end"); }
  else {
    log.push("end: " + await p.evaluate(() => document.querySelector(".re-card").innerText.replace(/\s+/g, " ").slice(0, 240)));
    const rg = await p.evaluate(() => { const r = document.querySelector(".re-race"); return r ? r.textContent : ""; });
    const marks = await p.locator(".re-mk.won, .re-mk.lost, .re-mk.heat").count();
    log.push("regatta: " + (rg || "(none)") + " · " + marks + " leg marks");
    if (BEAT === "off" && (rg || marks)) { bad.push("a regatta with the drum off"); }
  }
  (await overflow(p)).forEach((o) => bad.push("end: " + o));
  if (ended) {
    await p.click('[data-a="quay"]'); await p.waitForTimeout(500);
    log.push("home: " + await p.evaluate(() => document.querySelector(".rh-night").innerText.replace(/\s+/g, " ")));

    /* an Open sea leg from the quay on the voyage's second chart (grade 6: laudō and moneō, whose bank of ten tiles
       makes the oars panel its tallest), with a miss at box 5: on a laptop the note under the tiles must not make
       the play screen scroll (the chart's own note steps aside while it shows, row.js msg) */
    const id2 = await p.evaluate(() => {
      const pid = JSON.parse(localStorage.getItem("latinGames.v1")).last, legs = JSON.parse(localStorage.getItem("rowTheEndings.v1")).progress[pid].night.legs.filter((l) => !l.called);
      return legs[1] ? legs[1].id : "";
    });
    if (id2 && await p.locator(`.qs[data-id="${id2}"]`).count()) {
      await p.click(`.qs[data-id="${id2}"]`); await p.waitForTimeout(400);
      if (await p.locator('.pk-b[data-v="2"]').isEnabled()) {
        await p.click('.pk-b[data-v="2"]'); await p.waitForTimeout(600);
        let most = 0, at = 0, note = "", tiles = 0;
        for (let g = 0; g < 60; g++) {
          const c = await cur(p);
          if (!c || c.none) { await p.waitForTimeout(200); continue; }
          if (c.n > 7) { break; }
          const o = await pageBubble(p);
          if (o > most) { most = o; at = c.n; }
          if (c.n === 6) { note = await p.evaluate(() => { const n = document.querySelector(".rv-note"); return !n ? "none" : n.hidden ? "aside" : getComputedStyle(n).display === "none" ? "not shown here" : "shown"; }); }
          tiles = Math.max(tiles, await p.locator(".tiles .tile").count());
          const wrong = c.n === 5;
          if (wrong) { await p.waitForTimeout(800); }
          if (c.mode === "type") { await p.fill(".ty-in", wrong ? c.f + "x" : c.f); await p.press(".ty-in", "Enter"); }
          else { const i = await tileFor(p, c.e, !wrong); await p.locator(".tiles .tile").nth(i).click(); }
          await p.waitForTimeout(wrong ? 2300 : 330);
        }
        log.push("open sea leg from the quay (" + tiles + " tiles, a miss at box 5): the play screen scrolls at most " + most + " px" + (most ? " (box " + at + ")" : "") + "; the chart's note after the miss: " + note);
        if (FITS && most > 0) { bad.push("the Open sea leg from the quay scrolls " + most + " px at " + w + "x" + h + " (box " + at + ")"); }
        (await overflow(p)).forEach((o) => bad.push("open sea leg: " + o));
      } else { log.push("open sea leg from the quay: Open sea is not open on the voyage's second chart"); }
      await p.reload(); await p.waitForTimeout(700);              /* back to the harbor: a leg left is not recorded */
    }

    /* a Storm leg from the quay (its first chart passed at Calm water and Open sea): at Slow its drum is off, so no Corvus */
    const id = await p.evaluate(() => document.querySelector(".qs").getAttribute("data-id"));
    await p.evaluate((id) => {
      const pid = JSON.parse(localStorage.getItem("latinGames.v1")).last, st = JSON.parse(localStorage.getItem("rowTheEndings.v1"));
      const c = st.progress[pid].charts[id] = st.progress[pid].charts[id] || { best: [null, null, null], passed: [false, false, false] };
      c.passed = [true, true, false];
      localStorage.setItem("rowTheEndings.v1", JSON.stringify(st));
    }, id);
    await p.reload(); await p.waitForTimeout(700);
    await p.click(`.qs[data-id="${id}"]`); await p.waitForTimeout(400);
    await p.click('.pk-b[data-v="3"]'); await p.waitForTimeout(600);
    const stormRace = await raceExpected(p, 3), stormRival = await p.locator(".rship").count();
    log.push("storm leg from the quay: " + (stormRival ? "the Corvus races" : "no Corvus") + " · " + await p.evaluate(() => document.querySelector(".b-text").textContent));
    if (stormRace !== !!stormRival) { bad.push("the Storm leg: " + (stormRival ? "a Corvus with no drum" : "no Corvus with the drum on")); }
    if (!stormRace && BEAT !== "off") {
      /* the panel drum before the first form: the Corvus races this leg */
      await p.click('[data-a="drum"]'); await p.waitForTimeout(400);
      if (!await p.locator(".rship").count()) { bad.push("the Storm leg: the drum tapped on, but no Corvus"); }
      else { log.push("storm leg, drum tapped on before the first form: the Corvus races"); }
    }
    /* that Storm leg rowed to mid-race: the ships pitch 4 px and 3.5 degrees there, each on its own wave, the
       Corvus by 2.8 px (the pitch at its size). How much of its sail our ship covers at the worst of a wave */
    if (await p.locator(".rship").count()) {
      const c0 = await cur(p), stS = await strip(p);
      for (let k = 0; k < Math.ceil(c0.of / 2); k++) {
        const c = await cur(p);
        if (!c || c.none) { await p.waitForTimeout(200); k--; continue; }
        if (c.mode === "type") { await p.fill(".ty-in", c.f); await p.press(".ty-in", "Enter"); }
        else { const i = await tileFor(p, c.e, true); await p.locator(".tiles .tile").nth(i).click(); }
        await p.waitForTimeout(330);
      }
      await p.waitForTimeout(500); await bobbing(p);
      const cvS = await sailCover(p, Math.ceil(c0.of / 2), c0.of);
      log.push("storm leg at mid-race: " + stripText(stS) + "; the Corvus's sail is covered " + (cvS ? fiveText(cvS) + "; anywhere from 1 ahead to 1.5 behind at most " + pc(cvS.mostAll) + " (" + leadText(cvS.atAll) + "); next to level at most " + pc(cvS.near) + " (" + leadText(cvS.atNear) + "), level " + pc(cvS.level) : "(not out)"));
      if (cvS && +w >= 390 && Math.max(cvS.most, cvS.near) > 0.4) { bad.push("the Storm leg: only " + pc(1 - Math.max(cvS.most, cvS.near)) + " of the Corvus's sail shows in a close race at the worst of the pitch (" + stripText(stS) + ")"); }
      if (cvS && cvS.prow > 1) { bad.push("the Storm leg: the prows are " + cvS.prow.toFixed(1) + " px apart when the race is level"); }
    }
    await p.click(".ls-app .logo-btn, .tb-home, [data-act=\"home\"]").catch(() => {});
  }
  p.errs.forEach((e) => bad.push("console: " + e));

  /* reduced motion: one leg, the race as before */
  {
    const r = await newPage(b, { reducedMotion: "reduce" });
    await r.goto(URL); await r.waitForTimeout(400);
    await addPlayer(r, "Still", grade, chapter);
    await setBeat(r, BEAT);
    await r.click('[data-a="sail"]'); await r.waitForTimeout(500);
    let rival = -1, n = 0;
    for (let guard = 0; guard < 200 && !(await r.locator(".rv-res").count()); guard++) {
      const c = await cur(r);
      if (!c || c.none) { await r.waitForTimeout(200); continue; }
      if (rival < 0) { rival = await r.locator(".rship").count(); raced = await raceExpected(r, c.step); }
      if (THINK) { await r.waitForTimeout(THINK); }
      if (c.mode === "type") { await r.fill(".ty-in", c.f); await r.press(".ty-in", "Enter"); }
      else { const i = await tileFor(r, c.e, true); await r.locator(".tiles .tile").nth(i).click(); }
      await r.waitForTimeout(160); n++;
    }
    const race = await r.evaluate(() => { const x = document.querySelector(".rv-res .rr-race"); return x ? x.textContent : ""; });
    const tr = await r.evaluate(() => { const x = document.querySelector(".rrun"); return x ? getComputedStyle(x).transitionDuration : "none"; });
    log.push("reduced motion: " + n + " boxes, " + (rival ? "the Corvus" : "no Corvus") + ", " + (race || "no race line") + " (the Corvus's transition: " + tr + ")");
    if (!(await r.locator(".rv-res").count())) { bad.push("reduced motion: the leg did not end"); }
    if (raced !== !!rival || raced !== !!race) { bad.push("reduced motion: the race " + (raced ? "is missing" : "should not be there")); }
    if (rival && !/^0s/.test(tr)) { bad.push("reduced motion: the Corvus still glides (" + tr + ")"); }
    r.errs.forEach((e) => bad.push("reduced motion console: " + e));
  }

  /* the drum turned on after the first answer (it was Off): no race this leg, since a race is rowed from box 1 */
  {
    const d = await newPage(b);
    await d.goto(URL); await d.waitForTimeout(400);
    await addPlayer(d, "Late", grade, chapter);
    await setBeat(d, "off");
    await d.click('[data-a="sail"]'); await d.waitForTimeout(500);
    let n = 0, tapped = false, toast = "", rivalAfter = -1;
    for (let guard = 0; guard < 200 && !(await d.locator(".rv-res").count()); guard++) {
      const c = await cur(d);
      if (!c || c.none) { await d.waitForTimeout(200); continue; }
      if (n === 2 && !tapped) {
        tapped = true;
        await d.click('[data-a="drum"]'); await d.waitForTimeout(350);
        rivalAfter = await d.locator(".rship").count();
        toast = await d.evaluate(() => { const t = document.querySelectorAll(".toasts .toast"); return t.length ? t[t.length - 1].textContent : ""; });
        continue;
      }
      if (c.mode === "type") { await d.fill(".ty-in", c.f); await d.press(".ty-in", "Enter"); }
      else { const i = await tileFor(d, c.e, true); await d.locator(".tiles .tile").nth(i).click(); }
      await d.waitForTimeout(330); n++;
    }
    const race = await d.evaluate(() => { const x = document.querySelector(".rv-res .rr-race"); return x ? x.textContent : ""; });
    const races = await d.evaluate(() => { const pid = JSON.parse(localStorage.getItem("latinGames.v1")).last; return JSON.parse(localStorage.getItem("rowTheEndings.v1")).progress[pid].race.races; });
    log.push("drum turned on after 2 boxes: " + (rivalAfter ? "a Corvus" : "no Corvus") + " · toast \"" + toast + "\" · " + (race || "no race line") + " · races " + races);
    if (rivalAfter !== 0) { bad.push("drum turned on after the first answer: the Corvus came out mid-leg"); }
    if (race || races) { bad.push("drum turned on after the first answer: a race was rowed (" + (race || races) + ")"); }
    if (!/No race this leg|races you next leg/.test(toast)) { bad.push("drum turned on after the first answer: the toast does not say there is no race (" + toast + ")"); }
    d.errs.forEach((e) => bad.push("late drum console: " + e));
  }

  /* 320x640: the race chip and the "Leg 1 of 3" tag never overlap, whatever the chip says */
  if (BEAT !== "off") {
    const s = await newPage(b, { viewport: { width: 320, height: 640 } });
    await s.goto(URL); await s.waitForTimeout(400);
    await addPlayer(s, "Small", grade, chapter);
    await setBeat(s, BEAT);
    await s.click('[data-a="sail"]'); await s.waitForTimeout(500);
    const c = await cur(s);
    const i = await tileFor(s, c.e, true);
    if (c.mode === "type") { await s.fill(".ty-in", c.f); await s.press(".ty-in", "Enter"); } else { await s.locator(".tiles .tile").nth(i).click(); }
    await s.waitForTimeout(450);
    const tag = await rect(s, ".legtag"), chip = await rect(s, ".racechip");
    if (!chip) { bad.push("320x640: no race chip at the first answer"); }
    if (!tag) { bad.push("320x640: no leg tag"); }
    const texts = ["Race on!", "Final stretch!", "First in by 12!", "First in by a prow!", "The Corvus by 2", "The Corvus by a prow", "Prow to prow!"];
    const hits = [];
    for (const t of texts) {
      for (const k of ["", "brass", "parch"]) {
        /* where the style sheet puts it, then where the game does (row.js chipPlace, which a resize calls again:
           clear of the sails with the ships where they are); its box at rest, with no pop-in */
        const at = await s.evaluate(([t, k]) => {
          const e = document.querySelector(".racechip"), box = () => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
          e.textContent = t; e.className = "racechip in" + (k ? " " + k : ""); e.hidden = false; e.style.left = ""; e.style.animation = "none";
          const out = [box()];
          window.dispatchEvent(new Event("resize"));
          out.push(box());
          e.style.animation = "";
          return out;
        }, [t, k]);
        const sea = await rect(s, ".sea");
        at.forEach((cr, placed) => {
          if (overlap(cr, tag)) { hits.push(t + (placed ? " (placed)" : "")); }
          if (sea && (cr.left < sea.left - 0.5 || cr.right > sea.right + 0.5)) { hits.push(t + " (past the strip" + (placed ? ", placed)" : ")")); }
        });
      }
    }
    if (hits.length) { bad.push("320x640: the race chip overlaps the leg tag or leaves the strip: " + Array.from(new Set(hits)).join(", ")); }
    (await overflow(s)).forEach((o) => bad.push("320x640: " + o));
    log.push("320x640: the chip " + (chip ? Math.round(chip.left) + "-" + Math.round(chip.right) : "-") + ", the leg tag " + (tag ? Math.round(tag.left) + "-" + Math.round(tag.right) : "-") + (hits.length ? ": OVERLAP" : ": clear"));
    /* the Corvus's sail in a close race on the narrowest phone: printed, not asserted */
    await bobbing(s);
    const st3 = await strip(s), cv3 = await sailCover(s, 1, c.of);
    log.push("320x640: " + stripText(st3) + "; in a close race the Corvus's sail is covered " + (cv3 ? fiveText(cv3) + "; next to level at most " + pc(cv3.near) + " (" + leadText(cv3.atNear) + "), level " + pc(cv3.level) : "(no Corvus)") + " (printed only)");
    if (cv3 && cv3.prow > 1) { bad.push("320x640: the prows are " + cv3.prow.toFixed(1) + " px apart when the race is level"); }
    s.errs.forEach((e) => bad.push("320x640 console: " + e));
  }

  await b.close();
  log.push("play screens scroll at most " + maxOver.px + " px" + (maxOver.px ? " (" + maxOver.at + ")" : ""));
  if (FITS && maxOver.px > 0) { bad.push("a play screen scrolls " + maxOver.px + " px at " + w + "x" + h + " (" + maxOver.at + ")"); }
  console.log(log.join("\n"));
  if (bad.length) { console.log("PROBLEMS:\n" + bad.join("\n")); process.exit(1); }
  console.log("Voyage rowed at " + w + "x" + h + " (grade " + grade + ", chapter " + chapter + (BEAT ? ", drum " + BEAT : "") + (THINK ? ", " + THINK + " ms a box" : "") + "): no errors, no overflow.");
})().catch((e) => { console.error(e); process.exit(1); });
