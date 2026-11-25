/*!
 * Scenes: a small animated picture of what a Latin sentence says: who does it, what gets the action,
 * who receives it, whose it is, who is spoken to. Inline SVG, drawn to stand next to Inspector Casus.
 * Self-contained: no dependency on the game, its data or its stylesheet. Styles are injected once (#scn-style).
 *
 *   var sc = Scenes.create(question.words, { cases: CD_DATA.cases, hints: question.scene || null,
 *                                            mode: "ask", gap: false, size: "s", alt: "The poet loves the girl." });
 *   box.appendChild(sc.el);   sc.solve();   sc.replay();   sc.pulse(1);   sc.setSize("l");   sc.destroy();
 *   mode "lesson": one figure is in the spotlight and shows its job and case, the others are quiet;
 *   sc.setTarget(2) moves the spotlight to the figure of word 2 without rebuilding the picture.
 *   Scenes.canDraw(words, hints)   Scenes.aspect (width / height of every scene)   Scenes.version
 *
 * The card's colours are CSS custom properties: --scn-paper, --scn-ground, --scn-edge, --scn-ink.
 * An ancestor with the class "scn-still" holds every scene still, exactly as prefers-reduced-motion does.
 *
 * Everything that moves is a CSS keyframe animation (or a transition) of transform or opacity. A part that turns,
 * hops or grows is wrapped the way detective.js wraps a joint, <g transform="translate(pivot)"><g class="scn-...">,
 * so it moves around its own origin in every browser and needs no transform-origin. An arc is two nested groups,
 * one moving in x and one in y. No @keyframes rule contains var(): a flight whose distances depend on the layout
 * gets keyframes of its own, with plain numbers, in a <style> inside the picture (own() in compose()).
 */
(function (root) {
"use strict";

var doc = root.document, uid = 0;

/* ------------------------------------------------------------------ sizes
 * One layout per size, in the units of its own viewBox (one unit is about one CSS pixel at the intended width).
 * W, H: the box. k: figure units to box units (a person is 100 figure units tall). gy: the ground.
 * fw, fb, fv: font sizes of a Latin word, of a badge and of the verb. bh, vh: heights of a badge and of the
 * verb's label. wy: baseline of the words. by: top of the badges. vy: top of the verb's label. */
var ASPECT = 3.2;
var SZ = {
  s: { W: 320, H: 100, k: 0.6, gy: 69, fw: 12.6, fb: 10.8, fv: 12.2, bh: 12.9, vh: 14.6, wy: 82.4, by: 86.4, vy: 2.6, pad: 3.5, gap: 4 },
  m: { W: 480, H: 150, k: 0.92, gy: 105, fw: 16.4, fb: 12.6, fv: 15.6, bh: 16.5, vh: 19, wy: 124.6, by: 129.6, vy: 4.5, pad: 6, gap: 7 },
  l: { W: 640, H: 200, k: 1.24, gy: 143, fw: 20, fb: 14.6, fv: 19, bh: 20, vh: 23.5, wy: 167, by: 173.6, vy: 6.5, pad: 8, gap: 10 }
};

var LINE = "#3a2416", INK = "#2b1d14", INK2 = "#5c4636", SHD = "#42200c", SKIN = "#f5cda8", RED = "#c1272d", REDD = "#7b181d",
  NAVY = "#1e3a6e", CREAM = "#fffaf0", BRASS = "#e2a93c", BRASSD = "#a8721e", GOLD = "#ffd75e", LEAF = "#7fa650", STEM = "#4f7d35",
  WOOD = "#93603a", PAPER = "#fbf3dc", NEUT = "#b99a5b", NEUT2 = "#d3bf8f";
var SERIF = '"Alegreya Variable",Alegreya,Georgia,"Times New Roman",serif';
var SANS = '"Nunito Variable",Nunito,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

/* ------------------------------------------------------------------ small helpers */
function n(v) { return Math.round(v * 100) / 100; }
function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function norm(t) {
  t = String(t == null ? "" : t).toLowerCase();
  try { t = t.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) { /* keep it as it is */ }
  return t;
}
function tr(t, inner) { return '<g transform="' + t + '">' + inner + "</g>"; }
/* an outlined shape of the cast: kind "a" is outlined in dark red, "l" with a thinner line */
function P(fill, d, kind) { return '<path class="scn-o' + (kind || "") + '" fill="' + fill + '" d="' + d + '"/>'; }
function svgOpen(S) { return '<svg class="scn-svg" viewBox="0 0 ' + S.W + " " + S.H + '" focusable="false" aria-hidden="true">'; }
/* a pivot: the inner group turns and scales around the point (x, y) */
function pv(x, y, cls, inner, more) { return '<g transform="translate(' + n(x) + " " + n(y) + ')"><g class="' + cls + '"' + (more || "") + ">" + inner + "</g></g>"; }

/* colours: the case colours arrive in opts.cases; what is derived from them is derived here */
function rgb(c) {
  var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).replace(/\s/g, "")), h;
  if (!m) { return null; }
  h = m[1];
  if (h.length === 3) { h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2); }
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function hex(c) { return "#" + c.map(function (v) { v = Math.round(v).toString(16); return v.length < 2 ? "0" + v : v; }).join(""); }
var toneCache = {};
/* c: the case colour as given. fill and on: a badge and the text on it (4.5 to 1 or better).
   ink: the same colour, darkened until it can be read as text on the paper. */
function tones(color) {
  var o = toneCache[color], c, f, t, white = [255, 255, 255], ink = rgb(INK), paper = rgb(PAPER);
  if (o) { return o; }
  o = { c: color, fill: color, on: "#fff", ink: color };
  c = rgb(color);
  if (c) {
    if (ratio(c, white) < 4.5) {
      if (ratio(c, ink) >= 4.5) { o.on = INK; } else {
        f = c; t = 0;
        while (ratio(f, white) < 4.5 && t < 1) { t += 0.02; f = mix(c, [0, 0, 0], t); }
        o.fill = hex(f);
      }
    }
    f = c; t = 0;
    while (ratio(f, paper) < 4.6 && t < 1) { t += 0.03; f = mix(c, ink, t); }
    o.ink = hex(f);
  }
  toneCache[color] = o;
  return o;
}

/* the width of a text, measured on a canvas in the page's own fonts (an estimate where there is no canvas) */
var mctx = null, wcache = {};
function tw(text, px, serif) {
  var key = (serif ? "s" : "u") + text, w = wcache[key];
  if (w == null) {
    w = 0;
    try {
      if (mctx === null) { mctx = doc.createElement("canvas").getContext("2d") || 0; }
      if (mctx) { mctx.font = (serif ? "700 100px " + SERIF : "800 100px " + SANS); w = mctx.measureText(text).width / 100; }
    } catch (e) { mctx = 0; }
    if (!w) { w = String(text).length * (serif ? 0.5 : 0.57); }
    wcache[key] = w;
  }
  return w * px * 1.02 + 0.6;
}
function reduced() {
  try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
}

/* ------------------------------------------------------------------ styles */
/* kf("scn-name", "0,100=none|50=scale(1.1);o.5;eease-in") writes @keyframes scn-name: per step a transform
   ("-" for none), then ";o" an opacity and ";e" a timing function */
function kf(name, frames) {
  return "@keyframes " + name + "{" + frames.split("|").map(function (f) {
    var p = f.split("="), q = p[1].split(";"), b = [], j;
    if (q[0] !== "-") { b.push("transform:" + q[0]); }
    for (j = 1; j < q.length; j++) { b.push((q[j].charAt(0) === "o" ? "opacity:" : "animation-timing-function:") + q[j].slice(1)); }
    return p[0].replace(/([\d.]+)/g, "$1%") + "{" + b.join(";") + "}";
  }).join("") + "}";
}
function css() {
  var c = "", G = ".scn-go ";
  function K(name, frames) { c += kf("scn-" + name, frames); }
  /* A(".scn-x", "name"): the part plays scn-name once while the scene has the class scn-go */
  function A(sel, name, ease, delay) { c += G + sel + "{animation:scn-" + name + " var(--scn-d) " + (ease || "ease-in-out") + (delay ? " " + delay : "") + " both}"; }

  c += ".scn{display:block;position:relative;width:100%;line-height:0;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;--scn-d:3s}" +
    ".scn-svg{display:block;width:100%;height:auto;overflow:hidden}" +
    ".scn-bg{fill:var(--scn-paper,#fbf3dc)}.scn-gr{fill:var(--scn-ground,#f3e6c2)}.scn-fr{fill:none;stroke:var(--scn-edge,#d9c08a)}" +
    ".scn-s{--scn-sw:2.3px}.scn-m{--scn-sw:1.9px}.scn-l{--scn-sw:1.7px}.scn-s .scn-por{--scn-sw:3.8px}.scn-m .scn-por{--scn-sw:3.3px}.scn-l .scn-por{--scn-sw:3px}" +
    ".scn-o,.scn-oa,.scn-ol{stroke:" + LINE + ";stroke-width:var(--scn-sw);stroke-linejoin:round;stroke-linecap:round}.scn-oa{stroke:" + REDD + "}.scn-ol{stroke-width:calc(var(--scn-sw)*.66)}" +
    ".scn-n{fill:none;stroke-linecap:round}.scn-i{fill:none;stroke:" + LINE + ";stroke-width:1.4px;stroke-linecap:round;opacity:.5}" +
    ".scn-w{font-family:" + SERIF + ";font-weight:700;fill:var(--scn-ink," + INK + ")}.scn-t{font-family:" + SANS + ";font-weight:800}" +
    ".scn-vm{fill:" + INK2 + "}.scn-vr{fill:" + CREAM + ";stroke:#b89a5e}.scn-ln{fill:none;stroke:" + LINE + ";stroke-linecap:round;opacity:.5}.scn-ah{fill:" + LINE + ";opacity:.62}" +
    ".scn-dot{fill:" + LINE + ";opacity:.75}.scn-hl{fill:none;stroke:" + BRASS + ";opacity:0}.scn-p .scn-hl{opacity:1}.scn-pp,.scn-sp{opacity:0}" +
    ".scn-eye{transition:transform .07s ease-in}.scn-bk .scn-eye{transform:scaleY(.1)}" +
    /* a word stands in the middle of its label until its case name appears beside it; then it slides aside */
    ".scn-wd{transition:transform .45s ease-out}.scn-pre .scn-wd,.scn-lesson .scn-lz:not(.scn-on) .scn-wd{transform:translateX(var(--dx,0))}" +
    /* lesson: whatever names a case (badge, case name, and the colour of marks, ribbons and frames: .scn-c)
       shows only in the spotlight (.scn-on); the other figures are pale */
    ".scn-lesson .scn-pop,.scn-lesson g[data-c],.scn-lesson .scn-c,.scn-lesson .scn-ab,.scn-lesson .scn-bd{transition:opacity .4s ease-out}" +
    ".scn-lesson .scn-pop,.scn-lesson g[data-c]{opacity:.5}.scn-lesson .scn-c,.scn-lesson .scn-ab,.scn-lesson .scn-bd{opacity:0}" +
    ".scn-lesson g.scn-on,.scn-lesson .scn-on.scn-c,.scn-lesson .scn-on .scn-c,.scn-lesson .scn-on .scn-ab,.scn-lesson .scn-on .scn-bd{opacity:1}" +
    /* the words outside the spotlight are a shade lighter; a spotlight on the verb rings its label */
    ".scn-lesson .scn-lz:not(.scn-on) .scn-w{fill:" + INK2 + "}.scn-lesson .scn-vp.scn-on>:first-child{stroke:" + BRASS + ";stroke-width:2.2px}";

  /* ---- life that runs all the time: breathing, the bob of what is in the water, the flag, the "?" */
  K("br", "0,100=none|50=scale(1.008,1.02)");
  K("bob", "0,100=none|50=translateY(2.6px)");
  K("fl", "0,100=none|50=scaleX(.86) skewY(-5deg)");
  K("q", "0,100=none|50=scale(1.3)");
  /* the beat of pulse() is wider than tall: a hat stays under the top edge, a badge above the bottom edge */
  K("pulse", "0,100=none|22=scale(1.12,1.02)|48=scale(.97)|72=scale(1.06,1.02)");
  c += ".scn-br{animation:scn-br 3.8s ease-in-out infinite}.scn-bob{animation:scn-bob 2.6s ease-in-out infinite}.scn-flag{animation:scn-fl 2.4s ease-in-out infinite}" +
    ".scn-q{animation:scn-q 2.2s ease-in-out infinite}.scn-p{animation:scn-pulse .9s ease-in-out}";

  /* ---- giving and saving: something travels from one hand to the other side. It waits half-way (the still
     picture), jumps to the giver while it is invisible, flies over in an arc, stays, and comes back.
     The flight itself has its own keyframes: travel() in compose(). */
  K("to", "0=-;o1|5,8=-;o0|14,79=-;o1|85,88=-;o0|100=-;o1");
  K("push", "0,22,50,100=none|30=rotate(-16deg)|40=rotate(6deg)");
  K("joy", "0,56,86,100=none|62=translateY(-8px) scale(.98,1.03)|68=scale(1.04,.96)|74=translateY(-4px)|80=none");
  K("pp", "0,57=scale(.2);o0|65=scale(1.3);o1|71,83=none;o1|92,100=none;o0");
  K("rise", "0,56,90,100=none|64,84=translateY(-9px)");
  K("wv", "0,44,100=none|7=rotate(13deg)|15=rotate(-11deg)|23=rotate(13deg)|31=rotate(-11deg)|39=rotate(8deg)");
  A(".scn-to", "to", "linear");
  A(".scn-r-give .scn-armR", "push"); A(".scn-r-take .scn-hop", "joy"); A(".scn-pp", "pp", "ease-out");
  A(".scn-r-saved .scn-hop", "rise"); A(".scn-r-saved .scn-armL", "wv"); A(".scn-r-saved .scn-armR", "wv");

  /* ---- loving: hearts drift from the one who loves to the loved one (their way across: run() in compose()) */
  K("hy", "0,6,54,100=none|18=translateY(-5px)|30=translateY(3px)|42=translateY(-4px)");
  K("ho", "0=none;o1|4,6=scale(.3);o0|13=scale(1.2);o1|18,48=none;o1|55,65=none;o0|80,100=none;o1");
  K("lean", "0,100=none|18,62=rotate(4deg)");
  K("bump", "0,50,86,100=none|56=scale(1.05,.96)|61=none|66=scale(1.05,.96)|71=none|76=scale(1.05,.96)|81=none");
  A(".scn-hy", "hy"); A(".scn-ho", "ho", "ease-out");
  A(".scn-r-love .scn-hop", "lean"); A(".scn-r-loved .scn-hop", "bump"); A(".scn-r-hit .scn-hop", "bump");

  /* ---- praising: the praiser cheers, stars pop around what is praised */
  K("cheer", "0,60,100=none|10=scale(1.03,.96)|22=translateY(-9px)|34=scale(1.03,.96)|46=translateY(-7px)|56=scale(1.02,.98)");
  K("pumpR", "0,60,100=none|22=rotate(-14deg)|34=rotate(6deg)|46=rotate(-12deg)");
  K("pumpL", "0,60,100=none|22=rotate(14deg)|34=rotate(-6deg)|46=rotate(12deg)");
  K("st", "0=none;o1|5,18=scale(.1) rotate(-40deg);o0|32=scale(1.4) rotate(10deg);o1|44=scale(.9)|56,100=none;o1");
  K("proud", "0,34,74,100=none|44=translateY(-5px) scale(.98,1.03)|54=scale(1.04,.96)|64=translateY(-2px)");
  A(".scn-r-praise .scn-hop", "cheer"); A(".scn-r-praise .scn-armR", "pumpR"); A(".scn-r-praise .scn-armL", "pumpL");
  A(".scn-st", "st", "ease-out"); A(".scn-r-praised .scn-hop", "proud"); A(".scn-r-own .scn-hop", "proud");

  /* ---- seeing: the dots of the sight line run out from the glass, then what is seen lights up */
  K("peer", "0,100=none|14,72=rotate(3deg)");
  K("dot", "0=-;o.75|4,12=-;o0|16,100=-;o.75");
  K("glow", "0=none;o1|4,40=scale(.5);o0|54=scale(1.18);o1|66,100=none;o1");
  K("seen", "0,42,70,100=none|52=scale(1.07)|62=scale(.98)");
  A(".scn-r-see .scn-hop", "peer"); A(".scn-dot", "dot", "linear"); A(".scn-glow", "glow", "ease-out"); A(".scn-r-seen .scn-hop", "seen");

  /* ---- is great: the thing grows and shines */
  K("grow", "0,74,100=none|8,22=scale(.62)|48=scale(1.12)|62=scale(.97)");
  K("rays", "0=none;o1|6,30=scale(.5);o0|52=scale(1.25) rotate(26deg);o1|70=rotate(52deg)|100=rotate(72deg);o1");
  A(".scn-r-big .scn-hop", "grow"); A(".scn-r-big .scn-rays", "rays", "ease-out");

  /* ---- calling, hello and goodbye: the bubble pops, the call travels, the one who is spoken to reacts */
  K("bub", "0=none;o1|4,7=scale(.3);o0|17=scale(1.1);o1|24,100=none;o1");
  K("arc", "0=-;o.7|5,22=-;o0|30,100=-;o.7");
  K("react", "0,38,72,100=none|46=translateY(-9px) scale(.98,1.03)|54=scale(1.04,.96)|62=translateY(-4px)");
  K("ex", "0=none;o1|5,36=scale(.2);o0|46=scale(1.35);o1|54,100=none;o1");
  K("flag", "0,36,78,100=none|44=scaleX(.72) skewY(-9deg)|52=scaleX(1.06)|60=scaleX(.76) skewY(7deg)|68=scaleX(1.03)");
  K("wv2", "0,40,84,100=none|47=rotate(13deg)|55=rotate(-11deg)|63=rotate(13deg)|71=rotate(-11deg)|79=rotate(8deg)");
  K("walk", "0,100=none|8=translate(2px,-3px)|16=translate(4px,0)|24=translate(6px,-3px)|32=translate(8px,0)|40=translate(10px,-3px)|48,76=translate(12px,0)");
  A(".scn-bub", "bub", "ease-out"); A(".scn-arc", "arc", "linear"); A(".scn-ex", "ex", "ease-out");
  A(".scn-r-call .scn-armR", "wv"); A(".scn-r-greet .scn-armR", "wv"); A(".scn-r-greet .scn-hop", "cheer");
  A(".scn-r-bye .scn-armL", "wv"); A(".scn-r-bye .scn-hop", "walk");
  A(".scn-r-called .scn-hop", "react"); A(".scn-r-called .scn-flag", "flag"); A(".scn-r-waves .scn-armR", "wv2"); A(".scn-r-waves .scn-hop", "react");

  /* ---- whose: the name tag swings on its ribbon */
  K("wob", "0,74,100=none|12=rotate(-11deg)|28=rotate(9deg)|44=rotate(-6deg)|60=rotate(3deg)");
  A(".scn-r-own~g .scn-wob", "wob");

  /* ---- solve(): the badge pops in, the word drops into its slot, the case names fade in.
     In a lesson the badge pops in the same way when the spotlight arrives. */
  K("in", "0=scale(.2);o0|60=scale(1.2);o1|100=none;o1");
  K("fade", "0=-;o0|100=-;o1");
  K("drop", "0=translateY(-9px) scale(1.15);o0|55=translateY(1.5px);o1|100=none;o1");
  K("sp", "0=scale(.1);o0|30=scale(1.2);o1|100=scale(.4) rotate(40deg);o0");
  c += ".scn-rev .scn-tb{animation:scn-in .6s cubic-bezier(.2,1.4,.4,1) .15s both}.scn-rev .scn-ab,.scn-rev .scn-tm{animation:scn-fade .5s ease-out .2s both}" +
    ".scn-lesson .scn-on .scn-bd{animation:scn-in .6s cubic-bezier(.2,1.4,.4,1) both}.scn-rev .scn-tw{animation:scn-drop .55s cubic-bezier(.2,1.3,.4,1) both}.scn-rev .scn-sp{animation:scn-sp .9s ease-out .25s both}";

  /* ---- off screen everything waits; reduced motion and destroy() stop it */
  c += ".scn-off *{animation-play-state:paused!important}.scn-dead *,.scn-still .scn *,.scn.scn-still *{animation:none!important;transition:none!important}" +
    "@media (prefers-reduced-motion:reduce){.scn *{animation:none!important;transition:none!important}}";
  return c;
}
function ensureStyle() {
  if (doc.getElementById("scn-style")) { return; }
  var s = doc.createElement("style");
  s.id = "scn-style";
  s.textContent = css();
  (doc.head || doc.documentElement).appendChild(s);
}

/* ------------------------------------------------------------------ the cast: people
 * Figure units, feet at (0, 0), about 100 tall, drawn facing right (a figure that looks left is mirrored).
 * The rules of the hand, taken from detective.js: outline #3a2416 with round joins, flat colours, one warm
 * umber shadow, big head, eyes with a brown iris and a white glint, rosy cheeks.
 * Hair is one shape that covers the whole skull under a cap or a wreath and shows below it from the fringe
 * round the temples to the ears: no bare skin between a hat and the hair, no tuft that stands alone. */
var GH = "#573019", PH = "#8f5d2c", NH = "#c07a35", TAN = "#edbd92", TOGA = "#fbf1d8", PW = "#d7b684", PWL = "#e8cc9c", PWD = "#c0965c";
function ears(sk) { return '<ellipse class="scn-o" cx="-24" cy="-67.5" rx="3.6" ry="5" fill="' + sk + '"/><ellipse class="scn-o" cx="24" cy="-67.5" rx="3.6" ry="5" fill="' + sk + '"/>'; }
function leaf(x, y, a) { return '<path class="scn-ol" fill="' + LEAF + '" transform="translate(' + x + " " + y + ") rotate(" + a + ')" d="M-8,0Q0,-6 8,0Q0,6 -8,0Z"/>'; }
var WHO = {
  /* the girl: two buns with red ties, a red dress with a brass belt */
  puella: {
    h: 101, hair: GH, sk: SKIN, sl: RED,
    back: P(GH, "M-26.5,-66C-29,-95 29,-95 26.5,-66C26.5,-54 23,-47.5 19,-45.5H-19C-23,-47.5 -26.5,-54 -26.5,-66Z") +
      '<circle class="scn-o" fill="' + GH + '" cx="-20.5" cy="-91" r="9.5"/><circle class="scn-o" fill="' + GH + '" cx="20.5" cy="-91" r="9.5"/>',
    front: P(GH, "M-24.2,-69C-26.5,-88 -12,-94 0,-94C12,-94 26.5,-88 24.2,-69C21.5,-77.5 16,-82.5 7,-83.5C2,-79 -7,-77 -14,-78C-18.5,-77 -22,-74 -24.2,-69Z") +
      '<path class="scn-n" d="M-13,-89.5Q-4,-92.8 6,-90.8" stroke="#8a5a36" stroke-width="2.2" opacity=".8"/>' +
      '<ellipse class="scn-oa" fill="' + RED + '" cx="-15.3" cy="-85.8" rx="4.2" ry="2.7" transform="rotate(-42 -15.3 -85.8)"/><ellipse class="scn-oa" fill="' + RED + '" cx="15.3" cy="-85.8" rx="4.2" ry="2.7" transform="rotate(42 15.3 -85.8)"/>',
    legs: '<rect class="scn-o" fill="' + SKIN + '" x="-9.6" y="-14" width="6.6" height="12" rx="2.5"/><rect class="scn-o" fill="' + SKIN + '" x="3" y="-14" width="6.6" height="12" rx="2.5"/>' +
      '<ellipse class="scn-o" fill="' + REDD + '" cx="-7" cy="-2.3" rx="6.6" ry="3.4"/><ellipse class="scn-o" fill="' + REDD + '" cx="7" cy="-2.3" rx="6.6" ry="3.4"/>',
    body: P(RED, "M-12,-49.5C-15,-37 -20,-25 -23,-12.5Q0,-5.5 23,-12.5C20,-25 15,-37 12,-49.5Q0,-45.5 -12,-49.5Z") +
      '<path d="M-12,-49.5C-15,-37 -20,-25 -23,-12.5Q-16,-10 -9.5,-9.2C-9.5,-22 -8.5,-36 -7.5,-48Z" fill="' + SHD + '" opacity=".17"/>' +
      '<path class="scn-n" d="M-8.5,-48.8Q0,-41.5 8.5,-48.8" stroke="' + CREAM + '" stroke-width="3.2"/>' +
      '<path class="scn-n" d="M-16.8,-30.5Q0,-26.5 16.8,-30.5" stroke="' + BRASS + '" stroke-width="2.6"/>'
  },
  /* the poet: a laurel wreath on curly hair, a pale toga with a brass hem, a scroll in his hand */
  poeta: {
    h: 101, hair: PH, sk: SKIN, sl: TOGA, ears: 1,
    back: P(PH, "M-25,-64C-30,-72 -28,-84 -21,-88C-18,-95 -8,-98 0,-94.5C8,-98 18,-95 21,-88C28,-84 30,-72 25,-64C25,-58 22,-55 20,-54H-20C-22,-55 -25,-58 -25,-64Z"),
    front: P(PH, "M-23.5,-72C-23.5,-84 -13,-92 0,-92C13,-92 23.5,-84 23.5,-72C21,-77.5 17,-79.5 13,-77C10,-81.5 4,-82 1,-78C-3,-82.5 -9,-82 -12,-77.5C-16,-80 -21,-77.5 -23.5,-72Z") +
      leaf(-26, -80, -66) + leaf(-21.5, -90, -40) + leaf(-12, -96.5, -14) + leaf(26, -80, 66) + leaf(21.5, -90, 40) + leaf(12, -96.5, 14) +
      '<circle class="scn-ol" cx="0" cy="-97.5" r="2.8" fill="' + GOLD + '"/>',
    legs: '<ellipse class="scn-o" fill="' + SKIN + '" cx="-7.5" cy="-2.4" rx="6.4" ry="3.2"/><ellipse class="scn-o" fill="' + SKIN + '" cx="7.5" cy="-2.4" rx="6.4" ry="3.2"/>' +
      '<path class="scn-n" d="M-10.5,-3.8Q-7.5,-6 -4.5,-3.8M4.5,-3.8Q7.5,-6 10.5,-3.8" stroke="#7a4a26" stroke-width="1.7"/>',
    body: P(TOGA, "M-13,-49.5C-16,-34 -18.5,-18 -19,-5.5Q0,-.5 19,-5.5C18.5,-18 16,-34 13,-49.5Q0,-45.5 -13,-49.5Z") +
      '<path d="M-13,-49.5C-16,-34 -18.5,-18 -19,-5.5Q-13,-3.6 -8,-3.2C-8,-18 -8,-34 -7.5,-48Z" fill="' + SHD + '" opacity=".12"/>' +
      P("#f0dfb4", "M-12.5,-48.5C-6,-37 6,-28.5 17,-24.5L18.3,-14.5C5,-18.5 -9,-28.5 -15.6,-40.5Z") +
      '<path class="scn-n" d="M-15.6,-40.5C-9,-28.5 5,-18.5 18.3,-14.5" stroke="' + BRASS + '" stroke-width="2.6"/>' +
      '<path class="scn-i" d="M-5,-6.5V-18M6,-5V-11"/>',
    held: '<g transform="translate(0 29) rotate(16)"><rect class="scn-o" x="-3.8" y="-12.5" width="7.6" height="25" rx="3.4" fill="#f1e2bb"/><path d="M-3.8,-1.5H3.8" stroke="' + RED + '" stroke-width="2.6"/></g>'
  },
  /* the sailor: a white cap with a red pompom on ginger hair, a striped shirt, a red neckerchief */
  nauta: {
    h: 110, hair: NH, sk: TAN, sl: CREAM, ears: 1,
    slx: '<path d="M-4.8,5.5H4.8" stroke="' + NAVY + '" stroke-width="2.7"/>',
    back: "",
    front: P(NH, "M-24.6,-70C-27,-74 -27,-79 -24.5,-82.5C-22,-90 -12,-93 0,-93C12,-93 22,-90 24.5,-82.5C27,-79 27,-74 24.6,-70C22.6,-70.6 20.6,-72.5 20.3,-76C17.5,-80 7,-81 2.5,-78.2C-2,-81 -12.5,-80.8 -16.5,-77.6C-18,-78.5 -19.5,-77.5 -20.3,-76C-20.6,-72.5 -22.6,-70.6 -24.6,-70Z") +
      P(CREAM, "M-24,-86.5C-33,-99 -15,-104 0,-104C15,-104 33,-99 24,-86.5C12,-91 -12,-91 -24,-86.5Z") +
      P(NAVY, "M-25.5,-81C-26.5,-84.5 -25.5,-87.5 -24.5,-88.5C-12,-92.8 12,-92.8 24.5,-88.5C25.5,-87.5 26.5,-84.5 25.5,-81C12,-85.3 -12,-85.3 -25.5,-81Z") +
      '<circle class="scn-oa" fill="' + RED + '" cx="0" cy="-105" r="4.8"/>',
    legs: '<ellipse class="scn-o" fill="#2e1c12" cx="-9.5" cy="-2.6" rx="7.6" ry="3.4"/><ellipse class="scn-o" fill="#2e1c12" cx="9.5" cy="-2.6" rx="7.6" ry="3.4"/>' +
      P(NAVY, "M-15.5,-24L-17,-4.5H-2.5L0,-14L2.5,-4.5H17L15.5,-24Z"),
    body: P(CREAM, "M-13,-49.5C-15,-40 -16,-31 -16,-22.5Q0,-19.5 16,-22.5C16,-31 15,-40 13,-49.5Q0,-45.5 -13,-49.5Z") +
      '<path d="M-13.6,-41.5Q0,-38.5 13.6,-41.5M-14.9,-35.5Q0,-32.5 14.9,-35.5M-15.6,-29.5Q0,-26.5 15.6,-29.5" fill="none" stroke="' + NAVY + '" stroke-width="2.7"/>' +
      P(RED, "M-8,-48.6Q0,-45 8,-48.6L0,-38Z", "a")
  },
  /* a wooden game piece with painted hair: the neutral "we" or "I" that is inside a verb, and a speaker nobody named */
  pawn: {
    h: 94, hair: LINE, sk: PWL, sl: PW, pawn: 1, back: "", legs: "",
    front: P(PWD, "M-22.9,-72C-24.5,-85 -13,-93.5 0,-93.5C13,-93.5 24.5,-85 22.9,-72C21.5,-78 15,-83.5 6.5,-87C-2,-83 -16,-82 -22.9,-72Z"),
    body: '<ellipse class="scn-o" fill="' + PWD + '" cx="0" cy="-4" rx="22.5" ry="4.8"/>' +
      P(PW, "M-11.5,-48C-13,-32 -18,-17 -20.5,-6Q0,-.5 20.5,-6C18,-17 13,-32 11.5,-48Q0,-44.5 -11.5,-48Z") +
      '<path d="M-11.5,-48C-13,-32 -18,-17 -20.5,-6Q-14,-4 -8,-3.6C-8,-18 -7.5,-34 -6.5,-47Z" fill="' + SHD + '" opacity=".14"/>' +
      '<ellipse class="scn-o" fill="' + PWD + '" cx="0" cy="-47.5" rx="13.5" ry="3.8"/>'
  }
};
/* both arms of each pose, in degrees from hanging down: [the arm on the far side, the arm on the side he faces] */
var POSE = { idle: [8, -8], offer: [8, -75], take: [8, -80], love: [24, -102], cheer: [140, -140], spy: [8, -139], call: [8, -150], back: [150, -8], help: [148, -148], alert: [34, -34], point: [8, -88] };
var ARM = 27.5; /* shoulder to the middle of the hand */

function arm(side, a, C, extra) {
  return '<g transform="translate(' + (side === "L" ? -13 : 13) + " -44) rotate(" + a + ')"><g class="scn-arm' + side + '">' +
    '<rect class="scn-o" x="-4.8" y="-4.8" width="9.6" height="30" rx="4.8" fill="' + C.sk + '"/>' +
    '<path class="scn-o" d="M-4.8,12V0a4.8,4.8 0 0 1 9.6,0V12Z" fill="' + C.sl + '"/>' + (C.slx || "") +
    '<circle class="scn-o" cy="' + ARM + '" r="5.4" fill="' + C.sk + '"/>' + (extra || "") + "</g></g>";
}
function eye(x, pawn) {
  return pv(x, -69, "scn-eye", pawn ? '<ellipse rx="3.3" ry="4.7" fill="' + LINE + '"/><circle cx="-.9" cy="-1.6" r="1.3" fill="#fff"/>' :
    '<ellipse rx="5.6" ry="6.6" fill="#fffdf6" stroke="' + LINE + '" stroke-width="1.1" stroke-opacity=".55"/>' +
    '<circle cx=".9" cy=".9" r="4.3" fill="#7a431c"/><circle cx=".9" cy=".9" r="2.5" fill="#1c110b"/><circle cx="-.7" cy="-1" r="1.6" fill="#fff"/>' +
    '<path class="scn-n" d="M-5.9,-2.4Q-3,-7.7 0,-7.2Q3.4,-7.5 5.9,-2.8" stroke="' + LINE + '" stroke-width="2"/>');
}
/* f: { eyes: "happy", mouth: "open" | "o", brows: "worry", blush: 1 } */
function face(C, f) {
  var s = "", ln = '" fill="none" stroke="' + LINE + '" stroke-linecap="round" stroke-width="', o = f.blush ? ".72" : ".42";
  s += '<ellipse cx="-14.5" cy="-60.5" rx="5" ry="3.3" fill="#e9705f" opacity="' + o + '"/><ellipse cx="18" cy="-60.5" rx="4.4" ry="3.3" fill="#e9705f" opacity="' + o + '"/>';
  if (!C.pawn) { s += '<path class="scn-n" d="M3.2,-64.5q2.8,1.9 -.3,3.8" stroke="#c98d6c" stroke-width="1.8"/>'; }
  if (f.eyes === "happy") { s += '<path d="M-13,-67.5q5.5,-6.8 11,0M6,-67.5q5.5,-6.8 11,0' + ln + '2.5"/>'; } else { s += eye(-7.5, C.pawn) + eye(11.5, C.pawn); }
  if (!C.pawn) {
    s += '<path d="' + (f.brows === "worry" ? "M-13,-78.5q5,-3.8 10,-3.6M7.5,-82.1q5,-.2 10,3.6" : "M-13,-80q5,-3 10,-.8M7.5,-80.8q5,-2.2 10,.8") +
      '" fill="none" stroke="' + C.hair + '" stroke-linecap="round" stroke-width="2.6"/>';
  }
  if (f.mouth === "open") {
    s += '<path class="scn-o" style="stroke-width:1.6px" fill="#5c1a17" d="M-4.5,-58.5Q2.5,-60 9.5,-58.5Q9,-50 2.5,-50Q-4,-50 -4.5,-58.5Z"/><ellipse cx="2.5" cy="-52.4" rx="3.4" ry="1.7" fill="#ee7b78"/>';
  } else if (f.mouth === "o") {
    s += '<ellipse class="scn-o" style="stroke-width:1.6px" cx="2.5" cy="-55.5" rx="3.3" ry="4.1" fill="#5c1a17"/>';
  } else { s += '<path d="M-3,-57.5Q2.5,-52.3 8.5,-57.8' + ln + '2.2"/>'; }
  return s;
}
var SPY = '<g transform="translate(17 -68.5)"><rect class="scn-o" x="0" y="-3.4" width="16" height="6.8" rx="1.5" fill="' + BRASSD + '"/>' +
  '<rect class="scn-o" x="13" y="-5" width="18" height="10" rx="2" fill="' + BRASS + '"/><rect class="scn-o" x="29" y="-6.2" width="5" height="12.4" rx="2" fill="' + BRASSD + '"/>' +
  '<ellipse cx="34.5" cy="0" rx="1.6" ry="4.6" fill="#c6ecfa"/></g>';
/* second: the one who stands behind in a pair (he leaves the spyglass to the one in front).
   low: a figure with a tall hat has no room over its head to hop. Its hop works in a space ten times smaller, which
   shrinks the way it travels and leaves its turns and squashes as they are (he who walks off, "back", keeps his way). */
function person(who, pose, f, second) {
  var C = WHO[who] || WHO.pawn, p = POSE[pose] || POSE.idle, spy = pose === "spy", aR = arm("R", p[1], C, ""), low = C.h > 104 && pose !== "back";
  f = f || {};
  return (low ? '<g transform="scale(.1)">' : "") + '<g class="scn-hop">' + (low ? '<g transform="scale(10)">' : "") + C.legs + C.body + arm("L", p[0], C, C.held) + (spy ? "" : aR) +
    pv(0, -48, "scn-hd", tr("translate(0 48)", C.back + (C.ears ? ears(C.sk) : "") +
      (C.pawn ? '<circle class="scn-o" cy="-70" r="23" fill="' + C.sk + '"/>' : '<ellipse class="scn-o" cx="0" cy="-70" rx="24" ry="22" fill="' + C.sk + '"/>') + face(C, f) + C.front)) +
    (spy ? aR + (second ? "" : SPY) : "") + (low ? "</g></g>" : "") + "</g>";
}

/* ------------------------------------------------------------------ the cast: things
 * Each returns { s: markup, hw: half width, h: height, ax, ay: where a ribbon is tied, hold: how far above
 * the ground a hand takes it }. many: the drawing is already a bunch of three. */
function star5(cx, cy, R, r) {
  var d = "", i, a, q;
  for (i = 0; i < 10; i++) { a = (-90 + i * 36) * Math.PI / 180; q = i % 2 ? r : R; d += (i ? "L" : "M") + n(cx + q * Math.cos(a)) + "," + n(cy + q * Math.sin(a)); }
  return d + "Z";
}
function stroke2(d, col, w) { return '<path class="scn-n" d="' + d + '" stroke="' + LINE + '" stroke-width="' + (w + 2.4) + '" stroke-linejoin="round"/><path class="scn-n" d="' + d + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"/>'; }
function bloom(x, y, s) {
  return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')">' + P("#d8363f", "M-11,0C-11,-9 -5.5,-12.5 0,-12.5C5.5,-12.5 11,-9 11,0C11,6.5 6,10 0,10C-6,10 -11,6.5 -11,0Z", "a") +
    '<path class="scn-n" d="M-6,-4C-2,-8.5 5.5,-7.5 6.5,-2C6.5,2.5 0,4.5 -2.5,.5C-3.5,-2.5 .5,-4 2.5,-2" stroke="#7c121b" stroke-width="1.7"/>' +
    '<path class="scn-n" d="M-8.3,-2.5C-8,-7 -4,-10 0,-10" stroke="#ff9d8f" stroke-width="1.8"/></g>';
}
var THING = {
  rosa: function (many) {
    if (many) {
      return {
        many: 1, hw: 23, h: 62, ax: 0, ay: -14, hold: 14,
        s: stroke2("M-12.5,-33L-1.5,-14L-5.5,0M12.5,-33L1.5,-14L5.5,0M0,-40V0", STEM, 2.6) +
          P(LEAF, "M-6,-22C-14,-21 -18.5,-25 -19.5,-30C-14,-31.5 -8.5,-28 -6,-22ZM6,-22C14,-21 18.5,-25 19.5,-30C14,-31.5 8.5,-28 6,-22Z", "l") +
          bloom(-12.5, -41, 0.86) + bloom(12.5, -41, 0.86) + bloom(0, -50.5, 0.95) + '<rect class="scn-ol" x="-5" y="-17" width="10" height="5.6" rx="2.2" fill="' + CREAM + '"/>'
      };
    }
    return {
      hw: 14, h: 56, ax: 0, ay: -17, hold: 16,
      s: stroke2("M0,0C-2.5,-12 2.5,-22 0,-34", STEM, 2.8) +
        P(LEAF, "M-.8,-12C-9,-12 -13.5,-17 -14,-22C-8.5,-23 -3,-19 -.8,-12ZM.8,-20C8,-19.5 12.5,-23.5 13.5,-28.5C8,-29.5 3,-26 .8,-20Z", "l") +
        P(STEM, "M-6,-34.5L0,-29L6,-34.5Q0,-37 -6,-34.5Z", "l") + bloom(0, -43, 1)
    };
  },
  /* money: a pouch with a red cord and gold coins */
  pecunia: function () {
    var coin = '" fill="' + GOLD + '" stroke="' + BRASSD + '" stroke-width="1.6"/>';
    return {
      hw: 30, h: 40, ax: 0, ay: -29, hold: 15,
      s: '<circle cx="-22.5" cy="-7" r="6.8' + coin + '<circle cx="-22.5" cy="-7" r="3.4" fill="none" stroke="' + BRASSD + '" stroke-width="1.1"/>' +
        '<ellipse cx="22.5" cy="-3.4" rx="7.6" ry="3.3' + coin + '<ellipse cx="22.5" cy="-7.6" rx="7.6" ry="3.3' + coin + '<ellipse cx="22.5" cy="-11.8" rx="7.6" ry="3.3' + coin +
        P("#b9834a", "M-15,0C-22.5,-9 -18.5,-24 -8,-29C-9.5,-31.5 -10,-34.5 -9,-37Q0,-39.5 9,-37C10,-34.5 9.5,-31.5 8,-29C18.5,-24 22.5,-9 15,0Q0,2.5 -15,0Z") +
        '<path d="M-15,0C-22.5,-9 -18.5,-24 -8,-29L-5.5,-28C-12,-21 -13,-9 -8,.8Z" fill="' + SHD + '" opacity=".2"/>' +
        '<path class="scn-n" d="M-8.5,-29Q0,-26 8.5,-29" stroke="' + REDD + '" stroke-width="2.8"/>' +
        '<circle cx="0" cy="-13" r="6.8' + coin + '<circle cx="0" cy="-13" r="3.5" fill="none" stroke="' + BRASSD + '" stroke-width="1.2"/>'
    };
  },
  /* the country: a small homeland, a hill with a temple and a flag */
  patria: function () {
    var cols = "", x;
    for (x = -12.5; x < 10; x += 7) { cols += '<rect class="scn-ol" x="' + x + '" y="-47" width="4" height="13" fill="' + CREAM + '"/>'; }
    return {
      hw: 42, h: 63, ax: 28, ay: -22, hold: 10,
      s: P("#a9c47a", "M-41,0C-35,-20 -18,-28 0,-28C18,-28 35,-20 41,0Q0,3.5 -41,0Z") +
        '<path d="M-41,0C-35,-20 -18,-28 0,-28C-14,-22 -22,-10 -24,1.6Q-33,1 -41,0Z" fill="' + SHD + '" opacity=".1"/>' +
        '<path class="scn-n" d="M3,-1C-2,-8 9,-13 4,-21" stroke="#f1e2bb" stroke-width="3"/>' +
        '<circle class="scn-ol" cx="-25" cy="-15" r="6" fill="' + LEAF + '"/><circle class="scn-ol" cx="-17.5" cy="-10" r="4.6" fill="' + LEAF + '"/>' +
        '<rect class="scn-ol" x="-15.5" y="-34" width="31" height="5.5" rx="1" fill="' + CREAM + '"/>' + cols +
        '<rect class="scn-ol" x="-15.5" y="-50.5" width="31" height="4" fill="' + CREAM + '"/>' + P("#c8553d", "M-18,-50.5L0,-62L18,-50.5Z", "l") +
        '<path d="M28,-17V-50" stroke="' + LINE + '" stroke-width="2.4" stroke-linecap="round"/>' + pv(28, -49.5, "scn-flag", P(RED, "M0,0L14,4.5L0,9.5Z", "a"))
    };
  },
  /* fame: a gold star on a stand, with rays */
  fama: function () {
    var rays = "", i, a;
    for (i = 0; i < 5; i++) { a = (-54 + i * 72) * Math.PI / 180; rays += "M" + n(18.5 * Math.cos(a)) + "," + n(18.5 * Math.sin(a)) + "L" + n(25 * Math.cos(a)) + "," + n(25 * Math.sin(a)); }
    return {
      hw: 22, h: 58, ax: 0, ay: -11.5, hold: 12,
      s: pv(0, -34, "scn-rays", '<path class="scn-n" d="' + rays + '" stroke="' + BRASS + '" stroke-width="2.8"/>') +
        P(WOOD, "M-12,0L-10,-7.5H10L12,0Z") + '<rect class="scn-o" x="-3" y="-16.5" width="6" height="9.5" fill="' + BRASS + '"/>' +
        '<path class="scn-o" fill="' + GOLD + '" d="' + star5(0, -34, 19.5, 8.6) + '"/>' +
        '<path class="scn-n" d="M-6.5,-36.5Q-5.5,-41.5 -1.5,-43.5" stroke="#fff" stroke-width="2.2" opacity=".85"/>'
    };
  },
  /* life: a heart with a heartbeat line, as in a game's life meter */
  vita: function () {
    return {
      hw: 28, h: 58, ax: 19, ay: -46, hold: 10,
      s: '<ellipse cx="0" cy="-1.5" rx="15" ry="3" fill="' + SHD + '" opacity=".18"/>' +
        P("#e2584f", "M0,-9C-31.2,-28.5 -26.7,-55.8 -11.7,-55.8C-5.2,-55.8 -1.3,-51.9 0,-46.7C1.3,-51.9 5.2,-55.8 11.7,-55.8C26.7,-55.8 31.2,-28.5 0,-9Z", "a") +
        '<path class="scn-n" d="M-18.2,-41.5C-18.8,-47.3 -16.2,-50.6 -12.3,-51.9" stroke="#ffb3a6" stroke-width="2.8"/>' +
        '<path class="scn-n" d="M-18.9,-33.7H-10.4L-5.9,-43.4L0,-23.3L4.6,-36.9L7.2,-33.7H18.9" stroke="' + CREAM + '" stroke-width="3.2" stroke-linejoin="round"/>'
    };
  },
  /* the penalty: a ball and chain */
  poena: function () {
    return {
      hw: 29, h: 52, ax: 27, ay: -35, hold: 12,
      s: '<path d="M-1,-24.5L15,-38" stroke="' + LINE + '" stroke-width="5.4" stroke-linecap="round" stroke-dasharray=".1 6.9"/>' +
        '<path class="scn-n" d="M14.5,-42.5a8,8 0 1 1 7.5,9.5" stroke="' + LINE + '" stroke-width="6.8"/><path class="scn-n" d="M14.5,-42.5a8,8 0 1 1 7.5,9.5" stroke="#8b96b3" stroke-width="3.2"/>' +
        '<circle class="scn-o" cx="-12" cy="-14.5" r="14.5" fill="#414c66"/><path class="scn-n" d="M-21.5,-19.5A11,11 0 0 1 -13.5,-26" stroke="#9aa6c4" stroke-width="2.8"/>'
    };
  },
  /* anger: a red-faced storm cloud */
  ira: function () {
    return {
      hw: 31, h: 58, ax: 0, ay: -21, hold: 10,
      s: P(GOLD, "M2,-19L-5,-7.5H0L-2.5,-.5L7.5,-12H2L5.5,-19Z", "l") +
        '<path class="scn-n" d="M-27,-48q-4.5,-3.5 -1,-8.5M27,-48q4.5,-3.5 1,-8.5" stroke="' + REDD + '" stroke-width="2.4"/>' +
        P("#e2584f", "M-21,-20.5C-30,-20.5 -32,-33.5 -23,-36.5C-25,-46.5 -11,-51.5 -5,-44C1,-53.5 17,-51.5 17.5,-40.5C27,-41.5 31,-27.5 22,-22C19,-19 -15,-19 -21,-20.5Z", "a") +
        '<path d="M-13.5,-40L-4,-36M13.5,-40L4,-36" stroke="' + LINE + '" stroke-width="2.9" stroke-linecap="round"/><circle cx="-7.5" cy="-32.5" r="2.5" fill="' + LINE + '"/><circle cx="7.5" cy="-32.5" r="2.5" fill="' + LINE + '"/>' +
        '<path class="scn-n" d="M-5.5,-24.5Q0,-29.5 5.5,-24.5" stroke="' + LINE + '" stroke-width="2.4"/>'
    };
  }
};
/* a noun nobody has drawn yet: a blank plaque on a post (its word stands under it, as under every figure) */
function token() {
  return {
    hw: 21, h: 46, ax: 0, ay: -16, hold: 12,
    s: '<rect class="scn-o" x="-2.6" y="-18" width="5.2" height="18" fill="' + WOOD + '"/><rect class="scn-o" x="-20" y="-45" width="40" height="28" rx="4.5" fill="#f1e2bb"/><path class="scn-i" d="M-13,-37H9M-13,-31H13M-13,-25H3"/>'
  };
}
function trio(u) {
  var d = n(u.hw * 0.95);
  return { hw: u.hw * 1.75, h: u.h, ax: u.ax, ay: u.ay, hold: u.hold, s: tr("translate(" + (-d) + " -3) scale(.8)", u.s) + tr("translate(" + d + " -3) scale(.8)", u.s) + u.s };
}
/* one noun as a drawing: a person, a pair of people, a thing or a bunch of three */
function unit(E, pose, f) {
  var u, h;
  if (E.who) {
    h = (WHO[E.who] || WHO.pawn).h;
    if (E.plural) { return { who: 1, hw: 38.5, h: h, fx: 13, ax: 13, ay: -34, s: tr("translate(-15 -2) scale(.93)", person(E.who, pose, f, true)) + tr("translate(13 0)", person(E.who, pose, f)) }; }
    return { who: 1, hw: 25, h: h, fx: 0, ax: 0, ay: -34, s: person(E.who, pose, f) };
  }
  u = (THING[E.thing] || token)(E.plural);
  if (E.plural && !u.many) { u = trio(u); }
  u.s = '<g class="scn-hop">' + u.s + "</g>";
  return u;
}
var HEART = "M0,5.5C-9.5,-.5 -8,-7 -3.6,-7C-1.6,-7 -.4,-5.8 0,-4.4C.4,-5.8 1.6,-7 3.6,-7C8,-7 9.5,-.5 0,5.5Z";
var SPARK = "M0,-8Q1.4,-1.4 8,0Q1.4,1.4 0,8Q-1.4,1.4 -8,0Q-1.4,-1.4 0,-8Z";
var WAVES = P("#a9d3ea", "M-38,1.5V-17q4.75,-6 9.5,0t9.5,0t9.5,0t9.5,0t9.5,0t9.5,0t9.5,0t9.5,0V1.5Z", "l") +
  P("#d3eaf6", "M-38,1.5V-8q4.75,-5 9.5,0t9.5,0t9.5,0t9.5,0t9.5,0t9.5,0t9.5,0t9.5,0V1.5Z", "l");
var BUOY = '<circle r="9.4" fill="none" stroke="' + CREAM + '" stroke-width="7.4"/><circle r="9.4" fill="none" stroke="' + RED + '" stroke-width="7.4" stroke-dasharray="7.38 7.38" transform="rotate(22.5)"/>' +
  '<circle class="scn-o" r="13.1" fill="none"/><circle class="scn-o" r="5.7" fill="none"/>';

/* ------------------------------------------------------------------ reading the sentence */
var CAST = { puella: { p: "puella" }, poeta: { p: "poeta" }, nauta: { p: "nauta" }, ego: { ego: 1 }, me: { ego: 1 }, rosa: { t: "rosa" }, pecunia: { t: "pecunia" }, patria: { t: "patria" },
  fama: { t: "fama" }, vita: { t: "vita" }, poena: { t: "poena" }, ira: { t: "ira" }, magnus: { adj: 1, big: 1 }, o: { say: 1 } };
var VERB = { "do": "give", amo: "love", laudo: "praise", video: "see", servo: "save", est: "be", sum: "be", salveo: "greet", valeo: "bye" };
var ROLES = { nom: 1, gen: 1, dat: 1, acc: 1, abl: 1, voc: 1 };
/* first declension: -ās, -ārum and -īs are plural, and -ae when it is the doer, the one spoken to or the head of a phrase */
function many(w, r) { w = w.toLowerCase(); return /(ās|ārum|īs)$/.test(w) || (/ae$/.test(w) && (r === "nom" || r === "voc" || !r)); }

function parse(words, hints) {
  var ws = [], M = { map: Object.create(null) }, verb = null, ents = [], mods = [], says = [], advs = [], main, sp, i, w, vw, kind, nom, voc, acc, dat, address;
  for (i = 0; i < words.length; i++) {
    w = words[i] || {};
    w = { i: i, w: String(w.w == null ? "" : w.w), r: w.r === "verb" ? "verb" : (ROLES[w.r] ? w.r : null), lem: norm(w.lemma || w.w), g: w.g == null ? "" : String(w.g), t: !!w.t, after: w.after ? String(w.after) : "", tag: w.tag };
    ws.push(w);
    if (w.r === "verb" && !verb) { verb = w; }
  }
  function ent(w, c) { return { i: w.i, w: w, r: w.r, t: w.t, who: c && c.p, thing: c && c.t, ego: !!(c && c.ego), plural: many(w.w, w.r), words: [w], tags: [], big: false }; }
  ws.forEach(function (w) {
    var c = CAST[w.lem];
    if (w === verb) { return; }
    if (w.r === "verb") { advs.push(w); } else if (c && c.say) { says.push(w); } else if (c && c.adj) { mods.push(w); } else if (!c && !w.r && verb) { advs.push(w); } else { ents.push(ent(w, c)); }
  });
  /* a word nobody knows that carries its own label ("describes ...") and shares its case with a noun describes that noun */
  ents = ents.filter(function (E) {
    if (E.who || E.thing || E.ego || !E.w.tag || !E.r) { return true; }
    if (ents.some(function (F) { return F !== E && F.r === E.r && !F.w.tag; })) { mods.push(E.w); return false; }
    return true;
  });
  kind = verb ? (VERB[verb.lem] || "act") : "show";
  mods.forEach(function (m) {
    var best = null, c = CAST[m.lem];
    ents.forEach(function (E) { if (E.r === m.r && (!best || Math.abs(E.i - m.i) < Math.abs(best.i - m.i))) { best = E; } });
    if (!best) { ents.push(ent(m, null)); return; }
    if (!c || c.big) { best.big = !!(c && c.big); }
    if (kind === "be" && Math.abs(best.i - m.i) > 1) { M.pred = m; } else { best.words.push(m); }
  });
  ents.sort(function (a, b) { return a.i - b.i; });
  sp = hints && hints.speaker ? CAST[norm(hints.speaker)] : null;
  sp = sp && sp.p ? sp.p : "";
  ents.forEach(function (E) {
    if (E.ego) { E.who = sp || "pawn"; E.plural = false; }
    E.words.sort(function (a, b) { return a.i - b.i; });
    E.words.forEach(function (x) { M.map[x.i] = E.i; });
  });
  /* the owner hangs on the nearest noun before it; if there is none, on the nearest after it */
  ents.forEach(function (G) {
    var before = null, after = null;
    if (G.r !== "gen") { return; }
    ents.forEach(function (E) { if (E.r === "gen") { return; } if (E.i < G.i) { before = E; } else if (!after) { after = E; } });
    if (before || after) { (before || after).tags.push(G); G.of = before || after; }
  });
  main = ents.filter(function (E) { return !E.of; });
  function first(r) { for (var j = 0; j < main.length; j++) { if (main[j].r === r) { return main[j]; } } return null; }
  nom = first("nom"); voc = first("voc"); acc = first("acc"); dat = first("dat");
  address = !!voc && !nom;
  if (address) {
    /* somebody is spoken to: a call, a hello, a goodbye, or an order (then the one spoken to is the doer) */
    if (!verb || kind === "greet" || kind === "bye" || !(acc || dat)) { M.call = kind === "greet" || kind === "bye" ? kind : "call"; kind = "call"; }
  } else if (kind === "greet" || kind === "bye") { kind = "act"; }
  if (kind === "be" && !nom) { kind = "act"; }
  if (kind === "give" && !(acc && dat)) { kind = "act"; }
  if (kind === "show" && !main.length) { kind = "none"; }
  M.doer = address ? voc : nom;
  /* no noun does it: the doer is inside the verb (-ō I, -mus we), shown as neutral game pieces */
  if (!M.doer && verb && kind !== "be") { M.implied = true; M.we = /(mus|tis|nt)$/.test(verb.w.toLowerCase()); }
  M.obj = kind === "give" ? acc : kind === "call" || kind === "show" || kind === "be" ? null : (acc || dat || first("abl"));
  M.recv = kind === "give" ? dat : null;
  vw = (verb ? [verb] : []).concat(address ? says : []).concat(advs);
  if (M.pred) { vw.push(M.pred); }
  vw.sort(function (a, b) { return a.i - b.i; });
  vw.forEach(function (x) { M.map[x.i] = "v"; });
  if (address) {
    /* the bubble: a sentence that is nothing but a call is said whole, name included ("Ō poēta!"); an order
       shows its verb ("Servā!"). Under it stands the meaning of the call word: the verb's, or that of the "Ō". */
    M.say = { ws: kind === "call" ? ws : vw, mean: (verb || says[0] || { g: "" }).g };
    M.speaker = sp;
    M.ego = ents.filter(function (E) { return E.ego; })[0] || null;
  } else if (vw.length) {
    M.vl = { latin: vw.map(function (x) { return x.w; }).join(" "), mean: vw.map(function (x) { return x.g; }).filter(Boolean).join(" ") };
  }
  M.kind = kind; M.main = main; M.addr = address; M.n = ws.length;
  return M;
}

/* ------------------------------------------------------------------ the picture */
function compose(M, S, st, C, id) {
  var W = S.W, H = S.H, k = S.k, gy = S.gy, e = k / 0.6, ask = st.mode === "ask", lesson = st.mode === "lesson", kind = M.kind;
  var acts = [], sBack = "", sMark = "", sLine = "", sFig = "", sFx = "", sTop = "", sLab = "", defs = "", sty = "", cn = 0, ms = 3000, more = 0;
  var vy2 = S.vy + S.vh + 1.5 * e, D = null, O = null, R = null, SPK = null, doerE, hA, hB, x1, x2, yL, P, v, mood, j, t, b, tip, me;

  function tone(E) { var c = E.r && C[E.r]; return c && c.color && !(ask && E.t) ? tones(String(c.color)) : null; }

  /* ---- the label of a figure: its words, then (when solved) the case, and the badge with its job */
  function label(E) {
    var c = E.r && C[E.r], q = ask && E.t, L = { i: E.i, q: q, t: E.t, tone: tone(E), badge: c && c.tag ? String(c.tag) : "", abbr: c && c.abbr ? String(c.abbr) : "", now: [], nw: 0, ww: 0 };
    E.words.forEach(function (x, j) {
      var sp = j < E.words.length - 1 ? S.fw * 0.28 : 0, w = tw(x.w, S.fw, 1), hide = q && st.gap && x.i === E.i, w2 = hide ? S.fw * 3.5 : w;
      L.now.push({ x: L.nw, w: w2, text: hide ? null : x.w, main: x.i === E.i });
      L.nw += w2 + sp; L.ww += w + sp;
    });
    L.aw = L.abbr ? tw(L.abbr, S.fb) : 0;
    L.bw = L.badge ? tw(L.badge, S.fb) + S.bh * 0.86 : 0;
    L.ga = S.fb * 0.36;
    L.w = Math.max(L.ww + (L.aw ? L.ga + L.aw : 0), L.nw, L.bw);
    return L;
  }
  function actor(E, x, o) {
    o = o || {};
    var u = unit(E, o.pose, o.face || {}), ks = k * (o.sc || 1) * (E.big ? 1.3 : 1);
    var A = { E: E, x: x, u: u, ks: ks, flip: !!o.flip, role: o.role || "", fixed: !!o.fixed, follow: o.follow, tilt: o.tilt || 0, hw: u.hw * ks, h: u.h * ks, sink: o.sink || 0, late: o.late || 0, lab: E.i >= 0 ? label(E) : null, tags: [] };
    if (A.lab) { A.lab.cx = x; }
    acts.push(A);
    (E.tags || []).forEach(function (G) {
      var kt = k * (o.far ? 1.9 : 1.25), wide = !!(G.plural || !G.who), hw = (wide ? 25 : 16) * kt, prev = A.tags[A.tags.length - 1];
      var T = { E: G, isTag: true, of: A, kt: kt, wide: wide, hw: hw, h: 41 * kt, far: !!o.far, lab: label(G), tags: [] };
      T.x = (prev ? prev.x + prev.hw : A.x + A.hw) + hw + (o.far ? 0.2 * W : 5 * e);
      T.lab.cx = T.x;
      A.tags.push(T); acts.push(T);
    });
    return A;
  }
  /* whoever has no place in the action still stands in the picture */
  function extras() {
    var used = acts.map(function (A) { return A.E; }), j = 0;
    M.main.forEach(function (E) { if (used.indexOf(E) < 0) { actor(E, W * (0.42 + 0.15 * j++), {}); } });
  }
  /* labels may not overlap or leave the picture: push them apart, then let the things follow their labels */
  function settle() {
    var Ls = [], lo = S.pad, hi = W - S.pad, g = S.gap, tot = 0, i, f, over;
    acts.forEach(function (A) { if (A.lab) { Ls.push(A.lab); } });
    Ls.sort(function (a, b) { return a.cx - b.cx; });
    for (i = 0; i < Ls.length; i++) { tot += Ls[i].w; }
    if (tot + g * (Ls.length - 1) > hi - lo) {
      g = Math.max(1.5, (hi - lo - tot) / Math.max(1, Ls.length - 1));
      if (tot + g * (Ls.length - 1) > hi - lo) { f = (hi - lo - g * (Ls.length - 1)) / tot; for (i = 0; i < Ls.length; i++) { Ls[i].sq = f; Ls[i].w *= f; } }
    }
    for (i = 0; i < Ls.length; i++) { Ls[i].cx = Math.max(Ls[i].cx, (i ? Ls[i - 1].cx + Ls[i - 1].w / 2 + g : lo) + Ls[i].w / 2); }
    for (i = Ls.length - 1; i >= 0; i--) { Ls[i].cx = Math.min(Ls[i].cx, (i < Ls.length - 1 ? Ls[i + 1].cx - Ls[i + 1].w / 2 - g : hi) - Ls[i].w / 2); }
    acts.forEach(function (A) {
      var from;
      if (A.isTag) { return; }
      if (A.lab && !A.fixed) { A.x += (A.lab.cx - A.x) * (A.follow == null ? 1 : A.follow); }
      from = A.x + A.hw;
      A.tags.forEach(function (T) {
        var near = from + T.hw + 3 * e;
        T.x = Math.max(near, Math.min(T.lab.cx, near + (T.far ? 0.24 * W : 14 * e)));
        from = T.x + T.hw;
      });
      over = from - (W - S.pad);
      if (over > 0) { A.x -= over; A.tags.forEach(function (T) { T.x -= over; }); }
    });
  }
  /* where the hand of the arm he acts with is, in the picture */
  function hand(A, deg) {
    var r = deg * Math.PI / 180, dir = A.flip ? -1 : 1;
    if (!A.u.who) { return [A.x + dir * A.hw, gy - A.h * 0.5]; }
    return [A.x + dir * ((A.u.fx || 0) + 13 - ARM * Math.sin(r)) * A.ks, gy + (-44 + ARM * Math.cos(r)) * A.ks];
  }

  /* ---- drawing */
  function figure(A) {
    var inner = A.u.s, cid;
    if (A.tilt) { inner = tr("rotate(" + A.tilt + ")", inner); }
    if (A.sink) {
      cid = id + "c" + (cn++);
      defs += '<clipPath id="' + cid + '"><rect x="-80" y="-160" width="160" height="160.5"/></clipPath>';
      inner = '<g clip-path="url(#' + cid + ')"><g class="scn-bob"><g transform="translate(0 ' + A.sink + ')">' + inner + "</g></g></g>" + tr("scale(" + n(Math.max(1, A.u.hw / 30)) + " 1)", WAVES);
    }
    return '<g class="scn-pop' + (A.role ? " scn-r-" + A.role : "") + '"' + (A.E.i >= 0 ? ' data-i="' + A.E.i + '"' : "") + '><g transform="scale(' + n(A.flip ? -A.ks : A.ks) + " " + n(A.ks) + ')">' +
      '<g class="scn-br"' + (A.late ? ' style="animation-delay:-' + A.late + 's"' : "") + ">" + inner + "</g></g></g>";
  }
  /* the name tag of an owner: a portrait in a frame of the genitive's colour */
  function tagArt(T) {
    var G = T.E, tn = tone(G), col = tn ? tn.c : NEUT, hw = T.wide ? 25 : 16, cid = id + "c" + (cn++), por, u, sc;
    defs += '<clipPath id="' + cid + '"><rect x="' + (-hw + 2.5) + '" y="-38.5" width="' + (2 * hw - 5) + '" height="30" rx="3.5"/></clipPath>';
    if (G.who) {
      por = T.wide ? tr("translate(-9.5 10.5) scale(.44)", person(G.who, "idle", {})) + tr("translate(9.5 12) scale(.46)", person(G.who, "idle", {})) : tr("translate(0 12) scale(.47)", person(G.who, "idle", {}));
    } else {
      u = unit(G, "idle", {}); sc = Math.min((2 * hw - 8) / (2 * u.hw), 28 / u.h);
      por = tr("translate(0 -9.5) scale(" + n(sc) + ")", u.s);
    }
    return '<rect class="scn-o" x="' + (-hw) + '" y="-41" width="' + (2 * hw) + '" height="40" rx="6" fill="' + CREAM + '"/>' +
      '<g clip-path="url(#' + cid + ')"><rect x="' + (-hw) + '" y="-41" width="' + (2 * hw) + '" height="40" fill="#f6ead0"/><g class="scn-por">' + por + "</g></g>" +
      '<rect class="scn-c' + (G.t ? " scn-tm" : "") + '" x="' + (-hw + 2.2) + '" y="-38.8" width="' + (2 * hw - 4.4) + '" height="35.6" rx="4" fill="none" stroke="' + col + '" stroke-width="3.4"/>' +
      '<circle class="scn-o" cx="0" cy="-41" r="3.2" fill="' + BRASS + '"/>';
  }
  /* a thing with what is tied to it, around the point where it stands */
  function bundle(A) {
    var s = figure(A), dir = A.flip ? -1 : 1, ax = A.u.ax * A.ks * dir, ay = (A.u.ay + A.sink * 0.5) * A.ks;
    A.tags.forEach(function (T) {
      var tn = tone(T.E), col = tn ? tn.c : NEUT, rx = T.x - A.x, ex = rx - 3.57 * T.kt, ey = -40.84 * T.kt, dx = ex - ax, sag = Math.abs(dx) * 0.22 + 5 * e;
      var d = "M" + n(ax) + "," + n(ay) + "C" + n(ax + dx * 0.3) + "," + n(Math.max(ay, ey) + sag) + " " + n(ex - dx * 0.3) + "," + n(ey - sag * 0.7) + " " + n(ex) + "," + n(ey);
      s += '<g data-c="' + T.E.i + '"' + (T.E.t ? ' class="scn-tm"' : "") + '><path class="scn-n" d="' + d + '" stroke="' + LINE + '" stroke-width="' + n(3.9 * e) + '"/><path class="scn-c" d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + n(2.4 * e) + '" stroke-linecap="round"/>' +
        '<g class="scn-c" transform="translate(' + n(ax) + " " + n(ay) + ") scale(" + n(e) + ')"><path fill="' + col + '" stroke="' + LINE + '" stroke-width="1.1" stroke-linejoin="round" d="M0,0C-3,-6.5 -9.5,-6 -9,-1.5C-8.5,2.8 -3,2.2 0,0ZM0,0C3,-6.5 9.5,-6 9,-1.5C8.5,2.8 3,2.2 0,0Z"/><circle r="2.1" fill="' + col + '" stroke="' + LINE + '" stroke-width="1"/></g></g>' +
        '<g transform="translate(' + n(rx) + ' 0)"><g class="scn-pop" data-i="' + T.E.i + '"><g transform="scale(' + n(T.kt) + ') rotate(-5)">' + pv(0, -41, "scn-wob", tr("translate(0 41)", tagArt(T))) + "</g></g></g>";
    });
    return s;
  }
  function stand(A) { A.done = true; sFig += tr("translate(" + n(A.x) + " " + gy + ")", bundle(A)); }
  /* the mark on the ground under a figure, at (x, y), in its case colour (a plain shadow where there is no case) */
  function mark(A, x, y) {
    var c = A.E.r && C[A.E.r], tn = tone(A.E), at = ' cx="' + n(x) + '" cy="' + n(y + e) + '" rx="' + n(Math.max(14 * e, A.hw * 0.95)) + '" ry="' + n(3 * e) + '" fill="', pale = at + SHD + '" opacity=".15"/>';
    if (A.E.i < 0 && !A.u.who) { return ""; }
    return c ? (lesson ? "<ellipse" + pale : "") + '<ellipse class="scn-c' + (A.E.t ? " scn-tm" : "") + '" data-c="' + A.E.i + '"' + at + (tn ? tn.c : NEUT2) + '"/>' : "<ellipse" + pale;
  }
  function arrow(ax, ay, bx, by, bend) {
    var mx = (ax + bx) / 2, cy = (ay + by) / 2 - bend * 2, a = Math.atan2(by - cy, bx - mx) * 180 / Math.PI;
    return '<path class="scn-ln" stroke-width="' + n(1.25 * e) + '" stroke-dasharray="' + n(3.6 * e) + " " + n(3.2 * e) + '" d="M' + n(ax) + "," + n(ay) + "Q" + n(mx) + "," + n(cy) + " " + n(bx) + "," + n(by) + '"/>' +
      '<path class="scn-ah" transform="translate(' + n(bx) + " " + n(by) + ") rotate(" + n(a) + ") scale(" + n(e) + ')" d="M2,0L-5,-3.6L-3.4,0L-5,3.6Z"/>';
  }
  /* an animation with numbers of its own: its keyframes go into the picture's own <style>, so that no @keyframes
     rule needs var() (which older Safari does not resolve reliably there). Returns the class that plays it. */
  function own(frames) {
    var nm = id + "k" + (cn++);
    sty += kf(nm, frames) + ".scn-go ." + nm + "{animation:" + nm + " var(--scn-d) linear both}";
    return nm;
  }
  function tX(v) { return "translateX(" + n(v) + "px)"; }
  function tY(v) { return "translateY(" + n(v) + "px)"; }
  /* a straight run from a to b (a heart, the plain arrow); before and after it rests where it was drawn */
  function run(a, b) { return own("0,5=none;estep-end|6=" + tX(a) + ";elinear|54,64=" + tX(b) + ";estep-end|65,100=none"); }
  /* something that travels: it rests at (x, y); v gives the way there and back.
     A: the figure that travels; its ground mark goes along on the ground, under it. */
  function travel(x, y, v, inner, A) {
    var at = '<g transform="translate(' + n(x) + " " + n(y) + ')"><g class="' + own("0,6=none;estep-end|7,24=" + tX(v.x0) + ";ecubic-bezier(.45,0,.55,1)|58,85=" + tX(v.x1) + ";estep-end|86,100=none") + '">';
    if (A) { A.fly = true; sMark += at + '<g class="scn-to">' + mark(A, 0, 0) + "</g></g></g>"; }
    return at + '<g class="' + own("0,6=none;estep-end|7,24=" + tY(v.y0) + ";ecubic-bezier(.3,.6,.6,1)|41=" + tY(v.yh) + ";ecubic-bezier(.4,0,.7,.4)|58,85=" + tY(v.y1) + ";estep-end|86,100=none") + '"><g class="scn-to">' + inner + "</g></g></g></g>";
  }
  function spark(x, y, s, cls, delay) {
    return pv(x, y, cls, '<path d="' + SPARK + '" transform="scale(' + n(s * e) + ')" fill="' + GOLD + '" stroke="' + BRASSD + '" stroke-width="1.2" stroke-linejoin="round"/>', delay ? ' style="animation-delay:' + delay + 's"' : "");
  }
  function heart(x, y, s, cls, more2) {
    return pv(x, y, cls, '<path d="' + HEART + '" transform="scale(' + n(s * e) + ')" fill="#e2584f" stroke="' + REDD + '" stroke-width="1.3" stroke-linejoin="round"/>', more2);
  }
  /* the verb on the action: "dat: gives". It keeps clear of the heads between lo and hi. */
  function pill(cx, lo, hi) {
    var V = M.vl, a, wl, wm, w, x;
    if (!V) { return; }
    a = V.latin + (V.mean ? ":" : ""); wl = tw(a, S.fv, 1); wm = V.mean ? tw(V.mean, S.fb) : 0; w = wl + (wm ? S.fb * 0.4 + wm : 0) + S.vh * 0.9;
    x = Math.max(lo + w / 2, Math.min(hi - w / 2, cx));
    x = Math.max(S.pad + w / 2, Math.min(W - S.pad - w / 2, x));
    sTop += pv(x, S.vy + S.vh / 2, "scn-vp", '<rect class="scn-vr" x="' + n(-w / 2) + '" y="' + n(-S.vh / 2) + '" width="' + n(w) + '" height="' + n(S.vh) + '" rx="' + n(S.vh / 2) + '" stroke-width="' + n(e) + '"/>' +
      '<text y="' + n(S.fv * 0.31) + '" text-anchor="middle" font-size="' + S.fv + '"><tspan class="scn-w">' + esc(a) + "</tspan>" + (wm ? '<tspan class="scn-t scn-vm" dx="' + n(S.fb * 0.4) + '" font-size="' + S.fb + '">' + esc(V.mean) + "</tspan>" : "") + "</text>", ' data-i="v"');
  }
  /* what somebody says, in a bubble whose tail points at (tx, ty); the bubble lies to the right of bx */
  function bubble(tx, ty, bx, maxx) {
    var Y = M.say, lat = (Y.ws.filter(function (x) { return !(ask && st.gap && x.t); }).map(function (x) { return x.w + x.after; }).join(" ").replace(/[\s,;:]+$/, "") + "!").replace(/([!?.])!$/, "$1");
    var w1 = tw(lat, S.fv * 1.08, 1), w2 = Y.mean ? tw(Y.mean, S.fb) : 0, pd = S.fv * 0.62, w = Math.max(w1, w2) + pd * 2, h = (Y.mean ? S.fv * 1.12 + S.fb * 1.22 : S.fv * 1.3) + pd * 0.8;
    var x = Math.max(S.pad, Math.min(bx, (maxx || W - S.pad) - w)), y = S.vy, r = 5 * e, X, Yt, b1, b2;
    ty = Math.max(ty, y + h + 4 * e);
    X = x - tx; Yt = y - ty;
    b1 = Math.max(X + r + 1, Math.min(X + w - r - 9 * e, 4 * e)); b2 = b1 + 8 * e;
    sTop += pv(tx, ty, "scn-bub", '<g class="scn-vp" data-i="v"><path d="M' + n(X + r) + "," + n(Yt) + "H" + n(X + w - r) + "Q" + n(X + w) + "," + n(Yt) + " " + n(X + w) + "," + n(Yt + r) + "V" + n(Yt + h - r) + "Q" + n(X + w) + "," + n(Yt + h) + " " + n(X + w - r) + "," + n(Yt + h) +
      "H" + n(b2) + "L0,0L" + n(b1) + "," + n(Yt + h) + "H" + n(X + r) + "Q" + n(X) + "," + n(Yt + h) + " " + n(X) + "," + n(Yt + h - r) + "V" + n(Yt + r) + "Q" + n(X) + "," + n(Yt) + " " + n(X + r) + "," + n(Yt) + 'Z" fill="#fffdf6" stroke="' + LINE + '" stroke-width="' + n(1.3 * e) + '" stroke-linejoin="round"/>' +
      '<text class="scn-w" x="' + n(X + w / 2) + '" y="' + n(Yt + pd * 0.4 + S.fv * 0.92) + '" text-anchor="middle" font-size="' + n(S.fv * 1.08) + '">' + esc(lat) + "</text>" +
      (Y.mean ? '<text class="scn-t scn-vm" x="' + n(X + w / 2) + '" y="' + n(Yt + pd * 0.4 + S.fv * 1.12 + S.fb * 0.98) + '" text-anchor="middle" font-size="' + S.fb + '">' + esc(Y.mean) + "</text>" : "") + "</g>");
    return { x: x, w: w, h: h };
  }
  function drawLabel(L) {
    var wy = S.wy - S.by, hasA = L.abbr && !ask, cur = L.nw, tot = cur + (hasA ? L.ga + L.aw : 0), x0 = -tot / 2, tn = L.tone, s = "", ws = "", bw, top = wy - S.fw * 0.82;
    L.now.forEach(function (p) {
      var px = p.x;
      if (p.text == null) {
        ws += '<rect class="scn-sl" x="' + n(x0 + px) + '" y="' + n(top) + '" width="' + n(p.w) + '" height="' + n(S.fw * 1.06) + '" rx="' + n(3 * e) + '" fill="#fff3c9" stroke="' + BRASSD + '" stroke-width="' + n(1.1 * e) + '" stroke-dasharray="' + n(3 * e) + " " + n(2.2 * e) + '"/>';
      } else {
        ws += '<text class="scn-w' + (L.t && p.main && !ask ? " scn-tw" : "") + '" x="' + n(x0 + px) + '" y="' + n(wy) + '" font-size="' + S.fw + '">' + esc(p.text) + "</text>";
      }
    });
    s += '<rect class="scn-hl" x="' + n(-L.w / 2 - 2.5 * e) + '" y="' + n(top - 1.5 * e) + '" width="' + n(L.w + 5 * e) + '" height="' + n((L.badge ? S.bh : 0) - top + 3 * e) + '" rx="' + n(4 * e) + '" stroke-width="' + n(1.6 * e) + '"/>';
    s += '<g class="scn-wd"' + (hasA ? ' style="--dx:' + n((L.ga + L.aw) / 2) + 'px"' : "") + ">" + ws + "</g>";
    if (hasA) { s += '<text class="scn-t scn-ab" x="' + n(x0 + cur + L.ga) + '" y="' + n(wy) + '" font-size="' + S.fb + '" fill="' + (tn ? tn.ink : INK2) + '">' + esc(L.abbr) + "</text>"; }
    if (L.q) {
      bw = S.bh * 1.9;
      s += pv(0, S.bh / 2, "scn-bd", '<rect x="' + n(-bw / 2) + '" y="' + n(-S.bh / 2) + '" width="' + n(bw) + '" height="' + S.bh + '" rx="' + n(S.bh / 2) + '" fill="#f6c84c" stroke="' + BRASSD + '" stroke-width="' + n(1.1 * e) + '"/>' +
        '<g class="scn-q"><text class="scn-t" y="' + n(S.fb * 0.37) + '" text-anchor="middle" font-size="' + n(S.fb * 1.08) + '" fill="' + INK + '">?</text></g>');
    } else if (L.badge) {
      bw = L.bw;
      s += pv(0, S.bh / 2, "scn-bd" + (L.t ? " scn-tb" : ""), '<rect x="' + n(-bw / 2) + '" y="' + n(-S.bh / 2) + '" width="' + n(bw) + '" height="' + S.bh + '" rx="' + n(S.bh / 2) + '" fill="' + (tn ? tn.fill : INK2) + '"/>' +
        '<text class="scn-t" y="' + n(S.fb * 0.32) + '" text-anchor="middle" font-size="' + S.fb + '" fill="' + (tn ? tn.on : "#fff") + '">' + esc(L.badge) + "</text>");
      if (L.t && st.mode === "solved") { s += spark(-bw / 2 - 5 * e, 0, 0.6, "scn-sp") + spark(bw / 2 + 5 * e, S.bh * 0.3, 0.7, "scn-sp", 0.1) + spark(-bw * 0.2, wy - S.fw * 1.1, 0.55, "scn-sp", 0.18) + spark(bw * 0.32, wy - S.fw, 0.5, "scn-sp", 0.05); }
    }
    sLab += '<g class="scn-lab">' + pv(L.cx, S.by, "scn-lz", L.sq ? tr("scale(" + n(L.sq) + " 1)", s) : s, ' data-i="' + L.i + '"') + "</g>";
  }

  /* ---- who stands where, and what happens */
  doerE = M.doer || (M.implied ? { i: -1, who: "pawn", plural: M.we, words: [], tags: [] } : null);
  if (kind === "give") {
    D = actor(doerE, 0.125 * W, { pose: "offer", role: "give", fixed: true });
    O = actor(M.obj, 0.5 * W, { follow: 0.75 });
    R = actor(M.recv, 0.875 * W, { pose: "take", role: "take", flip: true, fixed: true, face: { mouth: "open" }, late: 1.3 });
    extras(); settle();
    hA = hand(D, -75); hB = hand(R, -80);
    t = O.tags.length ? O.tags[O.tags.length - 1] : null;
    b = (O.u.hold || 12) * O.ks;
    v = { x0: hA[0] + 2 * e - O.x, x1: hB[0] - (t ? t.x + t.hw - O.x - 4 * e : O.hw * 0.4) - O.x, y0: Math.min(-2 * e, hA[1] + b - gy), y1: Math.min(-2 * e, hB[1] + b - gy) };
    v.yh = Math.max(vy2 + O.h - gy, Math.min(v.y0, v.y1) - 8 * e);
    v.y0 = Math.max(v.y0, v.yh); v.y1 = Math.max(v.y1, v.yh);
    O.done = true;
    sFx += travel(O.x, gy, v, bundle(O), O);
    sLine += arrow(hA[0] + 5 * e, hA[1] - 3 * e, hB[0] - 5 * e, hB[1] - 3 * e, (hA[1] + hB[1]) / 2 - 3 * e - (vy2 + 3 * e));
    sFx += heart(R.x - R.hw - 5 * e, gy - R.h * 0.78, 0.8, "scn-pp") + heart(R.x - R.hw - 13 * e, gy - R.h * 0.6, 0.55, "scn-pp", ' style="animation-delay:.12s"');
    pill((hA[0] + hB[0]) / 2, D.x + D.hw * 1.3, R.x - R.hw * 1.3);
    ms = 3600; more = 150;
  } else if (kind === "love" || kind === "praise" || kind === "see" || kind === "save" || kind === "act") {
    P = { love: ["love", { eyes: "happy", blush: 1 }, "loved", { blush: 1 }], praise: ["cheer", { mouth: "open" }, "praised", { eyes: "happy" }], see: ["spy", {}, "seen", {}],
      save: ["offer", {}, "saved", { brows: "worry", mouth: "open" }], act: ["point", {}, "hit", {}] }[kind];
    if (M.addr && M.speaker && !M.ego) { SPK = actor({ i: -1, who: M.speaker, words: [], tags: [] }, 0.09 * W, { pose: "call", role: "call", face: { mouth: "open" }, fixed: true }); }
    me = M.addr && M.ego && M.obj === M.ego; /* "save me!": the one in need is the one who calls */
    if (doerE) { D = actor(doerE, (M.implied ? 0.1 : SPK ? 0.4 : M.addr && !me ? 0.3 : 0.16) * W, { pose: P[0], face: P[1], role: kind === "save" ? "give" : kind, fixed: true }); }
    if (M.obj) {
      O = actor(M.obj, (me ? 0.6 : M.obj.tags.length ? 0.68 : 0.8) * W, { flip: !!M.obj.who, role: P[2], face: P[3], pose: kind === "save" ? "help" : "idle", sink: kind === "save" ? (M.obj.who ? 30 : 6) : 0, fixed: !!M.obj.who && !M.obj.tags.length, late: 1.3 });
    }
    extras(); settle();
    x1 = D ? D.x + D.hw + 5 * e : S.pad + 8 * e;
    x2 = O ? O.x - O.hw - 5 * e : W - S.pad - 10 * e;
    yL = gy - 35 * k;
    if (kind === "love") {
      sLine += arrow(x1 + 4 * e, yL, x2, yL, 0);
      for (j = 0; j < 3; j++) {
        t = x1 + (x2 - x1) * [0.2, 0.5, 0.8][j];
        sFx += '<g transform="translate(' + n(t) + " " + n(yL - (13 + [3, -1, 4][j]) * e) + ')"><g class="' + run(x1 - 6 * e - t, x2 + 8 * e - t) + '" style="animation-delay:' + n(j * 0.3) + 's"><g class="scn-hy" style="animation-delay:' + n(j * 0.3) + 's">' +
          '<g class="scn-ho" style="animation-delay:' + n(j * 0.3) + 's"><path d="' + HEART + '" transform="scale(' + n([0.85, 1.05, 1.3][j] * e) + ')" fill="#e2584f" stroke="' + REDD + '" stroke-width="1.2" stroke-linejoin="round"/></g></g></g></g>';
      }
      ms = 3400; more = 700;
    } else if (kind === "praise") {
      sLine += arrow(x1, yL, x2, yL, 0);
      if (O) {
        [[-O.hw - 5 * e, -0.9], [O.hw + 5 * e, -0.96], [-O.hw - 8 * e, -0.5], [O.hw + 8 * e, -0.52], [0, -1.16]].forEach(function (q, j) {
          var y = gy + q[1] * O.h;
          if (y > vy2 + 5 * e && O.x + q[0] < W - S.pad - 5 * e) { sFx += spark(O.x + q[0], y, [0.85, 0.7, 0.6, 0.8, 0.65][j], "scn-st", n(j * 0.13)); }
        });
      }
      if (D) { sFx += '<path class="scn-arc scn-ln" stroke-width="' + n(1.3 * e) + '" transform="translate(' + n(D.x + ((D.u.fx || 0) + 22) * k) + " " + n(gy - 58 * k) + ") scale(" + n(e) + ')" d="M0,0l5,-2.6M1.5,3.6l5.6,0M0,7.2l5,2.6"/>'; }
      ms = 3200; more = 600;
    } else if (kind === "see") {
      hA = D ? [D.x + ((D.u.fx || 0) + 54) * D.ks, gy - 68.5 * D.ks] : [x1, gy - 50 * k];
      hB = O ? [O.x - O.hw - 4 * e, gy - Math.min(O.h * 0.55, 62 * k)] : [x2, hA[1]];
      t = Math.max(2, Math.round(Math.sqrt(Math.pow(hB[0] - hA[0], 2) + Math.pow(hB[1] - hA[1], 2)) / (6.4 * e)));
      for (j = 1; j < t; j++) { sFx += '<circle class="scn-dot" style="animation-delay:' + n(j * 0.9 / t) + 's" cx="' + n(hA[0] + (hB[0] - hA[0]) * j / t) + '" cy="' + n(hA[1] + (hB[1] - hA[1]) * j / t) + '" r="' + n(1.25 * e) + '"/>'; }
      sFx += '<path class="scn-ah" transform="translate(' + n(hB[0]) + " " + n(hB[1]) + ") rotate(" + n(Math.atan2(hB[1] - hA[1], hB[0] - hA[0]) * 180 / Math.PI) + ") scale(" + n(e) + ')" d="M2,0L-5,-3.6L-3.4,0L-5,3.6Z"/>';
      if (O) {
        defs += '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="#ffe58a" stop-opacity=".95"/><stop offset=".6" stop-color="#ffe58a" stop-opacity=".5"/><stop offset="1" stop-color="#ffe58a" stop-opacity="0"/></radialGradient>';
        sBack += pv(O.x, gy - O.h * 0.5, "scn-glow", '<circle r="' + n(Math.max(O.hw, O.h * 0.5) * 1.2 + 5 * e) + '" fill="url(#' + id + 'g)"/>');
      }
      ms = 3200; more = 950;
    } else if (kind === "save") {
      hA = D ? hand(D, -75) : [x1, yL];
      hB = O ? [O.x, gy - (O.u.who ? 27 : 20) * O.ks] : [x2, yL];
      t = [(hA[0] + hB[0]) / 2, vy2 + 15 * e];
      sLine += arrow(hA[0] + 5 * e, hA[1] - 4 * e, hB[0] - 13 * e, hB[1] - 9 * e, (hA[1] + hB[1]) / 2 - 6.5 * e - t[1]);
      sFx += travel(t[0], t[1], { x0: hA[0] + 6 * e - t[0], x1: hB[0] - t[0], y0: hA[1] - 4 * e - t[1], y1: hB[1] - t[1], yh: -2 * e }, tr("scale(" + n(k) + ")", BUOY));
      if (O) { sFx += spark(O.x - O.hw * 0.7, gy - O.h * 0.75, 0.7, "scn-pp") + spark(O.x + O.hw * 0.75, gy - O.h * 0.9, 0.6, "scn-pp", 0.12); }
      ms = 3800; more = 150;
    } else {
      sLine += '<path class="scn-ln" stroke-width="' + n(1.25 * e) + '" stroke-dasharray="' + n(3.6 * e) + " " + n(3.2 * e) + '" d="M' + n(x1) + "," + n(yL) + "H" + n(x2) + '"/>';
      sFx += '<g transform="translate(' + n(x2) + " " + n(yL) + ')"><g class="' + run(x1 - x2, 0) + '"><g class="scn-ho"><path class="scn-ah" style="opacity:.8" transform="scale(' + n(1.5 * e) + ')" d="M2,0L-5,-3.6L-3.4,0L-5,3.6Z"/></g></g></g>';
      ms = 2800;
    }
    if (M.addr) {
      tip = SPK ? [SPK.x + 13 * k, gy - 57 * k] : me ? [O.x + 14 * k, gy - (62 - O.sink) * k] : [S.pad + 1, gy - 50 * k];
      bubble(tip[0], tip[1], SPK ? SPK.x + SPK.hw * 1.3 : me ? O.x + O.hw * 1.3 : S.pad + 5 * e);
      if (D) { sFx += pv(D.x + (SPK ? 1 : -1) * (D.hw + 2 * e), gy - D.h * 0.86, "scn-ex", bang()); }
    } else {
      pill((x1 + x2) / 2, D && D.u.who ? D.x + D.hw * 1.3 : S.pad, O && O.u.who ? O.x - O.hw * 1.3 : W - S.pad);
    }
  } else if (kind === "be") {
    O = actor(M.doer, (M.doer.tags.length ? 0.4 : 0.5) * W, { role: "big" });
    extras(); settle();
    pill(W / 2, S.pad, W - S.pad);
    ms = 3200;
  } else if (kind === "call") {
    mood = M.call;
    if (M.speaker) {
      SPK = actor({ i: -1, who: M.speaker, words: [], tags: [] }, 0.1 * W, mood === "bye" ? { pose: "back", role: "bye", flip: true, tilt: 5, face: { mouth: "open" }, fixed: true } :
        { pose: "call", role: mood, face: { mouth: "open" }, fixed: true });
    }
    O = actor(M.doer, (M.doer.tags.length ? 0.66 : 0.82) * W, M.doer.who ? { flip: true, fixed: !M.doer.tags.length, late: 1.3, pose: mood === "call" ? "alert" : "call", role: mood === "call" ? "called" : "waves", face: { mouth: mood === "call" ? "o" : "open" } } : { role: "called" });
    extras(); settle();
    tip = SPK ? [SPK.x + 13 * k, gy - 57 * k] : [S.pad + 1, gy - 50 * k];
    b = bubble(tip[0], tip[1], SPK ? SPK.x + SPK.hw * 1.3 : S.pad + 5 * e, O.x - O.hw - 4 * e);
    x1 = Math.max(SPK ? SPK.x + SPK.hw + 6 * e : S.pad + 12 * e, b.x + b.w * 0.25); x2 = O.x - O.hw - 6 * e;
    yL = Math.max(gy - 42 * k, S.vy + b.h + 9 * e);
    for (j = 0; j < 3; j++) {
      t = x1 + (x2 - x1) * (0.3 + j * 0.2);
      sFx += '<path class="scn-arc scn-ln" stroke-width="' + n(1.5 * e) + '" style="animation-delay:' + n(j * 0.14) + 's" d="M' + n(t) + "," + n(yL - (4 + j * 2.4) * e) + "q" + n((3 + j * 1.6) * e) + "," + n((4 + j * 2.4) * e) + " 0," + n((8 + j * 4.8) * e) + '"/>';
    }
    if (mood === "call") { sFx += pv(O.x - O.hw - 1 * e, gy - O.h * 0.88, "scn-ex", bang()); }
    if (mood === "bye" && SPK) { sFx += '<path class="scn-arc scn-ln" stroke-width="' + n(1.5 * e) + '" d="M' + n(SPK.x + SPK.hw + 3 * e) + "," + n(gy - 12 * k) + "h" + n(9 * e) + "m" + n(-12 * e) + "," + n(-9 * k) + "h" + n(8 * e) + '"/>'; }
    ms = 3200;
  } else {
    M.main.forEach(function (E, j) {
      var solo = M.main.length === 1;
      actor(E, W * (solo ? (E.tags.length ? 0.34 : 0.5) : (j + 0.5) / M.main.length), { sc: solo ? 1.4 : 1, far: solo, role: "own" });
    });
    settle();
    ms = 2800;
  }
  function bang() { return '<g transform="scale(' + n(e) + ')"><path d="M-2,-13.5h4l-1,9.5h-2Z" fill="' + RED + '" stroke="' + REDD + '" stroke-width="1" stroke-linejoin="round"/><circle cy="-.5" r="2.1" fill="' + RED + '" stroke="' + REDD + '" stroke-width="1"/></g>'; }

  acts.forEach(function (A) { if (!A.isTag) { if (!A.fly) { sMark += mark(A, A.x, gy); } if (!A.done) { stand(A); } } });
  acts.forEach(function (A) { if (A.lab) { drawLabel(A.lab); } });

  return {
    ms: ms + more, d: ms,
    svg: svgOpen(S) + (sty ? "<style>" + sty + "</style>" : "") + (defs ? "<defs>" + defs + "</defs>" : "") +
      '<rect class="scn-bg" width="' + W + '" height="' + H + '" rx="' + n(7 * e) + '"/>' +
      '<path class="scn-gr" d="M0,' + n(gy - 5 * e) + "Q" + W / 2 + "," + n(gy - 8.5 * e) + " " + W + "," + n(gy - 5 * e) + "V" + n(gy + 4.4 * e) + "H0Z" + '"/>' +
      sBack + sMark + sLine + sFig + sFx + sTop + sLab +
      '<rect class="scn-fr" x="' + n(0.6 * e) + '" y="' + n(0.6 * e) + '" width="' + n(W - 1.2 * e) + '" height="' + n(H - 1.2 * e) + '" rx="' + n(6.4 * e) + '" stroke-width="' + n(1.2 * e) + '"/></svg>'
  };
}

/* ------------------------------------------------------------------ the public face */
function canDraw(words) {
  var i, w, ok = false;
  if (!words || typeof words.length !== "number" || !words.length) { return false; }
  for (i = 0; i < words.length; i++) {
    w = words[i];
    if (!w || typeof w.w !== "string" || !w.w) { return false; }
    if (w.r !== "verb") { ok = true; }
  }
  return ok;
}

function create(words, opts) {
  opts = opts || {};
  ensureStyle();
  var el = doc.createElement("div"), C = opts.cases || {}, st = { mode: opts.mode === "solved" || opts.mode === "lesson" ? opts.mode : "ask", gap: !!opts.gap, size: SZ[opts.size] ? opts.size : "m", tg: -1 };
  var M = null, timers = [], dead = false, off = false, left = 3, made = { ms: 3000, d: 3000 }, io = null, id = "scn-" + (++uid), turn = 0, i;

  function still() { var q = false; try { q = !!el.closest(".scn-still"); } catch (e) { q = false; } return q || reduced(); }
  function later(fn, ms) {
    var t = root.setTimeout(function () { var j = timers.indexOf(t); if (j >= 0) { timers.splice(j, 1); } if (!dead) { fn(); } }, ms);
    timers.push(t);
    return t;
  }
  function clearAll() { while (timers.length) { root.clearTimeout(timers.pop()); } }
  function render() {
    var out = null;
    el.className = "scn scn-" + st.size + " scn-" + st.mode + (M ? " scn-k-" + M.kind : "") + (off ? " scn-off" : "");
    try { if (M && M.kind !== "none") { out = compose(M, SZ[st.size], st, C, id + "r" + (++turn)); } } catch (e) { out = null; }
    if (!out) { out = { ms: 0, d: 0, svg: svgOpen(SZ[st.size]) + '<rect class="scn-bg" width="' + SZ[st.size].W + '" height="' + SZ[st.size].H + '" rx="8"/></svg>' }; }
    made = out;
    el.style.setProperty("--scn-d", (out.d / 1000) + "s");
    el.innerHTML = out.svg;
    spot();
  }
  /* lesson: the spotlight is the class scn-on on everything that belongs to the figure of the word st.tg */
  function spot() {
    var l = el.querySelectorAll("[data-i],[data-c]"), key = lessonKey(), j;
    for (j = 0; j < l.length; j++) { l[j].classList.toggle("scn-on", key !== "" && (l[j].getAttribute("data-i") || l[j].getAttribute("data-c")) === key); }
  }
  function lessonKey() { return st.mode === "lesson" && M && M.map[st.tg] != null ? String(M.map[st.tg]) : ""; }
  /* one play of the action; after an automatic one the next follows a few seconds later, a few times */
  function play(auto) {
    if (dead || !made.ms || still() || doc.hidden) { return; }
    clearAll();
    el.classList.remove("scn-go", "scn-bk");
    void el.offsetWidth;
    el.classList.add("scn-go");
    later(function () {
      el.classList.remove("scn-go");
      if (auto) { left--; }
      rest(2600);
    }, made.ms + 60);
  }
  function blink() {
    later(function () {
      el.classList.add("scn-bk");
      later(function () { el.classList.remove("scn-bk"); blink(); }, 130);
    }, 2400 + Math.random() * 3200);
  }
  /* the quiet state between plays: only blinking; the next automatic play is booked if any is left */
  function rest(wait) {
    clearAll();
    el.classList.remove("scn-go", "scn-bk");
    if (dead || off || doc.hidden || still()) { return; }
    if (left > 0 && made.ms) { later(function () { play(true); }, wait); } else { calmQ(); }
    blink();
  }
  /* The "?" on the mystery word's figure beats while plays are left. With the last one it comes to rest:
     its beat ends where it began, so it does not jump (where getAnimations is missing, it simply stops). */
  function calmQ() {
    var l = el.querySelectorAll(".scn-q"), j;
    for (j = 0; j < l.length; j++) {
      var an = null;
      try { an = l[j].getAnimations ? l[j].getAnimations() : null; } catch (e) { an = null; }
      if (!an) { l[j].style.animation = "none"; continue; }
      an.forEach(function (x) {
        try {
          var tm = x.effect.getComputedTiming();
          if (tm.iterations === Infinity) { x.effect.updateTiming({ iterations: Math.floor(tm.currentIteration || 0) + 1 }); }
        } catch (e) { /* ignore */ }
      });
    }
  }
  function onVis() { rest(700); }
  function onTap() { api.replay(); }

  var api = {
    el: el,
    solve: function () {
      if (dead || st.mode !== "ask") { return; }
      st.mode = "solved";
      render();
      if (still()) { return; }
      el.classList.add("scn-pre"); /* the words start in the middle, where they stood, and slide aside */
      void el.offsetWidth;
      el.classList.remove("scn-pre");
      el.classList.add("scn-rev");
      left = Math.max(left, 1);
      rest(1250);
      later(function () { el.classList.remove("scn-rev"); }, 1200);
    },
    replay: function () { if (!dead) { el.classList.remove("scn-rev"); play(false); } },
    pulse: function (i) {
      var key, list, j;
      if (dead || !M) { return; }
      key = M.map[i];
      if (key == null) { return; }
      list = el.querySelectorAll('[data-i="' + key + '"]');
      for (j = 0; j < list.length; j++) { list[j].classList.remove("scn-p"); }
      void el.offsetWidth;
      for (j = 0; j < list.length; j++) { list[j].classList.add("scn-p"); }
      root.clearTimeout(api._p);
      api._p = root.setTimeout(function () { api._p = 0; var l = el.querySelectorAll(".scn-p"), q; for (q = 0; q < l.length; q++) { l[q].classList.remove("scn-p"); } }, 950);
    },
    setTarget: function (i) {
      if (dead || st.mode !== "lesson" || !M || M.map[i] == null || i === st.tg) { return; }
      st.tg = i;
      spot();
      left = Math.max(left, 1);
      rest(700);
    },
    setSize: function (size) {
      if (dead || !SZ[size] || size === st.size) { return; }
      st.size = size;
      render();
      rest(500);
    },
    destroy: function () {
      if (dead) { return; }
      dead = true;
      clearAll();
      root.clearTimeout(api._p); api._p = 0;
      doc.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("click", onTap);
      if (io) { try { io.disconnect(); } catch (e) { /* ignore */ } io = null; }
      el.classList.remove("scn-go", "scn-bk", "scn-rev");
      el.classList.add("scn-dead");
    },
    _p: 0
  };

  el.setAttribute("role", "img");
  el.setAttribute("aria-label", String(opts.alt == null ? "" : opts.alt).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").replace(/^ | $/g, "") || "Picture of the sentence");
  try {
    if (canDraw(words)) {
      M = parse(words, opts.hints || null);
      for (i = words.length - 1; i >= 0; i--) { if (words[i].t) { st.tg = i; } }
    }
  } catch (e) { M = null; }
  render();
  el.addEventListener("click", onTap);
  doc.addEventListener("visibilitychange", onVis);
  if (typeof root.IntersectionObserver === "function") {
    try {
      io = new root.IntersectionObserver(function (entries) {
        var now = !entries[entries.length - 1].isIntersecting;
        if (now === off || dead) { return; }
        off = now;
        el.classList.toggle("scn-off", off);
        rest(500);
      });
      io.observe(el);
    } catch (e) { io = null; }
  }
  /* the widths were measured in the fonts that were ready; when the page's own fonts arrive, lay out once more */
  try {
    if (doc.fonts && doc.fonts.load && !(doc.fonts.check("700 12px " + SERIF) && doc.fonts.check("800 12px " + SANS))) {
      root.Promise.all([doc.fonts.load("700 12px " + SERIF), doc.fonts.load("800 12px " + SANS)]).then(function () { if (!dead) { wcache = {}; render(); rest(500); } }, function () { /* keep the first layout */ });
    }
  } catch (e) { /* keep the first layout */ }
  rest(500);
  return api;
}

root.Scenes = { version: "1", aspect: ASPECT, canDraw: canDraw, create: create };
})(typeof window !== "undefined" ? window : this);
