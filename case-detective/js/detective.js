/*!
 * Inspector Casus: an original animated cartoon detective, drawn as inline SVG.
 * Self-contained: no dependency on the game, its data or its stylesheet.
 *
 *   var d = Detective.create({ size: 160, variant: 'full', mood: 'idle' });
 *   d.setMood('think'); d.play('cheer', 1600); d.talk(true); d.lookAt(x, y); d.setSize(200); d.destroy();
 *   also: d.setVariant('bust'), d.getMood()
 *
 * Colours are CSS custom properties (set them on the element or any ancestor):
 *   --dt-coat --dt-coat-shade --dt-hat --dt-accent --dt-skin --dt-hair --dt-line --dt-lens
 *   optional: --dt-accent-shade (folds and outline of the scarf and bow) and --dt-accent-light (their highlights)
 *
 * The rig: every joint is four nested groups
 *   <g translate(pivot)> <g .dt-j: the pose, a CSS transition> <g .dt-r: carry-over> <g .dt-a: loops and accents, CSS animations>
 * so each limb rotates around its own local origin in every browser, with no transform-origin needed.
 * When a mood changes, whatever offset a loop had at that instant is handed to the .dt-r group and eased away,
 * so stopping or swapping a loop never makes a limb jump. Only transform and opacity are ever animated.
 */
(function (root) {
  "use strict";

  var MOODS = ["idle", "wave", "think", "search", "point", "cheer", "oops", "proud"];
  /* the free hand of each mood, in the same order: a loose fist, open, pointing, thumb up */
  var HANDS = "rest wave point rest point open open thumb".split(" ");
  var VB = { full: [-13.5, -28, 227, 304], bust: [13, -12, 172, 172] };
  var SH = { A: [68, 150], B: [132, 150] };   /* shoulders. A = his right arm (holds the glass), B = the free arm */
  var UP = 38, FORE = 30, HAND = 7, LENS = 40; /* limb lengths; lens centre sits 40 beyond the wrist */
  var EYE = { L: [86, 98], R: [117, 98] };
  var uid = 0;

  /* ------------------------------------------------------------------ poses
   * Each arm is given as a target point: H = hand centre, L = lens centre, plus which way the elbow bends.
   * The joint angles are solved once (two-bone inverse kinematics) and written into the stylesheet.
   * The bust is a tight crop, so it has its own targets: everything he holds up stays inside the frame. */
  var GB = ["L", 50, 112, -1];
  var POSES = {
    full: {
      idle:   { A: ["A", 14, 146],     B: ["A", -12, 15],      glass: -8 },
      wave:   { A: ["A", 14, 146],     B: ["H", 169, 93, 1],   glass: -8, wr: 8 },
      think:  { A: ["A", 12, 136],     B: ["H", 114, 141, -1], glass: -6, wr: -14 },
      search: { A: ["L", 86, 98, -1],  B: ["H", 134, 206, -1], glass: 0 },
      point:  { A: ["A", 16, 142],     B: ["H", 186, 160, 1],  glass: -8, wr: 14 },
      cheer:  { A: ["H", 31, 99, -1],  B: ["H", 169, 95, 1],   glass: 6, wr: 0 },
      oops:   { A: ["A", 8, 150],      B: ["H", 166, 151, 1],  glass: -4, wr: 30 },
      proud:  { A: ["H", 66, 197, 1],  B: ["H", 167, 143, 1],  glass: 78, wr: -9 }
    },
    bust: {
      idle:   { A: GB, glass: -6 },
      wave:   { A: GB, B: ["H", 153, 105, 1], glass: -6, wr: 8 },
      think:  { A: GB, glass: -6 },
      search: { B: ["A", -12, 15] },
      point:  { A: GB, B: ["H", 150, 144, 1], glass: -6, wr: 58 },
      cheer:  { A: ["H", 42, 108, -1], B: ["H", 160, 104, 1] },
      oops:   { A: GB, B: ["H", 158, 141, 1], glass: -6, wr: 30 },
      proud:  { A: GB, B: ["H", 157, 136, 1], glass: -6, wr: -6 }
    }
  };

  function deg(r) { return r * 180 / Math.PI; }
  function into(a, lo) { while (a < lo) { a += 360; } while (a >= lo + 360) { a -= 360; } return a; }
  function solve(side, t) {
    if (t[0] === "A") { return { th: t[1], ph: t[2] }; }
    var s = SH[side], ext = t[0] === "L" ? LENS : HAND, l2 = FORE + ext;
    var dx = t[1] - s[0], dy = t[2] - s[1], d = Math.sqrt(dx * dx + dy * dy);
    d = Math.max(Math.abs(UP - l2) + 0.5, Math.min(UP + l2 - 0.5, d));
    var aw = Math.atan2(-dx, dy);
    var al = Math.acos((UP * UP + d * d - l2 * l2) / (2 * UP * d));
    var th = aw + t[3] * al;
    var ex = s[0] - UP * Math.sin(th), ey = s[1] + UP * Math.cos(th);
    var af = Math.atan2(-(t[1] - ex), t[2] - ey);
    /* keep every angle within half a turn of the idle pose, so limbs always swing the short way round */
    var thd = into(deg(th), side === "A" ? -90 : -270);
    return { th: +thd.toFixed(1), ph: +into(deg(af) - thd, side === "A" ? -34 : -165).toFixed(1) };
  }
  /* every pose, solved once: PZ[variant][mood] = the angles of shA, elA, shB, elB, glass, wrB */
  var PZ = {}, PJ = ["shA", "elA", "shB", "elB", "glass", "wrB"];
  ["full", "bust"].forEach(function (v) {
    PZ[v] = {};
    MOODS.forEach(function (m) {
      var p = {}, f = POSES.full[m], b = v === "bust" ? (POSES.bust[m] || {}) : {}, k;
      for (k in f) { p[k] = f[k]; }
      for (k in b) { p[k] = b[k]; }
      var a = solve("A", p.A), bb = solve("B", p.B);
      PZ[v][m] = [a.th, a.ph, bb.th, bb.ph, p.glass || 0, p.wr || 0];
    });
  });
  function poseCss() {
    var out = "", v, m;
    for (v in PZ) {
      for (m in PZ[v]) {
        out += PJ.map(function (j, i) { return '.dt-root[data-variant="' + v + '"][data-mood="' + m + '"] .dt-' + j + "{transform:rotate(" + PZ[v][m][i] + "deg)}"; }).join("");
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ styles */
  function css() {
    var R = ".dt-root", c = "";
    function rules(prop, m, o, v) {
      var p = R + (v ? '[data-variant="' + v + '"]' : "") + (m ? '[data-mood="' + m + '"]' : "") + " .dt-", k;
      for (k in o) { c += p + k + "{" + prop + ":" + o[k] + "}"; }
    }
    function pose(m, o, v) { rules("transform", m, o, v); }
    function anim(m, o, v) { rules("animation", m, o, v); }
    /* K("name", "0,100=none|50=rotate(3deg);ease-in") writes @keyframes dt-name. Every loop and accent starts at "none". */
    function K(name, frames) {
      c += "@keyframes dt-" + name + "{" + frames.split("|").map(function (f) {
        var p = f.split("="), q = p[1].split(";");
        return p[0].replace(/(\d+)/g, "$1%") + "{transform:" + q[0] + (q[1] ? ";animation-timing-function:" + q[1] : "") + "}";
      }).join("") + "}";
    }
    function show(m, list) { c += list.map(function (k) { return R + '[data-mood="' + m + '"] .dt-v-' + k; }).join(",") + "{opacity:1}"; }

    c += R + "{display:inline-block;position:relative;line-height:0;flex:none;vertical-align:bottom;-webkit-user-select:none;user-select:none;" +
      "--_coat:var(--dt-coat,#b9834a);--_shade:var(--dt-coat-shade,#7d5230);--_hat:var(--dt-hat,#c08a4d);--_accent:var(--dt-accent,#c1272d);--_accd:var(--dt-accent-shade,#7b181d);--_accl:var(--dt-accent-light,#ef6f5e);" +
      "--_skin:var(--dt-skin,#f5cda8);--_hair:var(--dt-hair,#70401f);--_line:var(--dt-line,#3a2416);--_lens:var(--dt-lens,#c6ecfa);--_sw:2.5px;--_e:1}";
    /* a page that sets only --dt-accent gets a matching fold colour and highlight where color-mix() exists;
       --_am and --_al are invalid while --dt-accent is unset, so the fixed reds above stay the default */
    c += "@supports (color:color-mix(in srgb,red,blue)){" + R + "{--_am:color-mix(in srgb,var(--dt-accent) 58%,#1a0406);--_al:color-mix(in srgb,var(--dt-accent) 58%,#fff);" +
      "--_accd:var(--dt-accent-shade,var(--_am,#7b181d));--_accl:var(--dt-accent-light,var(--_al,#ef6f5e))}}";
    c += R + ".dt-sm{--_sw:3px}" + R + ".dt-xs{--_sw:3.8px}";
    c += R + '[data-mood="idle"],' + R + '[data-mood="think"],' + R + '[data-mood="search"]{--_e:.55}';
    /* Everything he does fits inside his box. Should a hand still pass an edge for a moment (two changes of mood within
       a blink of each other), it is drawn there, not sliced off; only the bust is cut, and only along its bottom edge. */
    c += ".dt-svg{display:block;width:100%;height:100%;overflow:visible}" + R + '[data-variant="bust"] .dt-svg{-webkit-clip-path:inset(-60% -60% 0 -60%);clip-path:inset(-60% -60% 0 -60%)}';
    c += ".dt-ol{fill:none;stroke:var(--_line);stroke-width:var(--_sw);stroke-linejoin:round;stroke-linecap:round}";
    c += ".dt-il{fill:none;stroke:var(--_line);stroke-width:1.5px;stroke-linecap:round;stroke-linejoin:round;opacity:.5}";
    c += ".dt-so,.dt-sa{stroke:var(--_line);stroke-width:var(--_sw);stroke-linejoin:round;stroke-linecap:round}.dt-sa{stroke:var(--_accd)}.dt-s{stroke:var(--_line)}";
    c += ".dt-c-coat{fill:var(--_coat)}.dt-c-shade{fill:var(--_shade)}.dt-c-hat{fill:var(--_hat)}.dt-c-accent{fill:var(--_accent)}" +
      ".dt-c-accd{fill:var(--_accd)}.dt-c-skin{fill:var(--_skin)}.dt-c-hair{fill:var(--_hair)}.dt-c-line{fill:var(--_line)}.dt-c-lens{fill:var(--_lens)}";
    c += ".dt-hl{fill:none;stroke:var(--_accl);stroke-width:1.6px;stroke-linecap:round;opacity:.9}";
    c += ".dt-brow{fill:none;stroke:var(--_hair);stroke-width:4.1px;stroke-linecap:round}";
    c += ".dt-lid{fill:none;stroke:var(--_line);stroke-width:2.8px;stroke-linecap:round}";
    c += ".dt-ln{fill:none;stroke:var(--_line);stroke-width:2.8px;stroke-linecap:round;stroke-linejoin:round}";
    c += ".dt-xs .dt-fine,.dt-xs .dt-tw,.dt-sm .dt-tw{display:none}.dt-xs .dt-brow{stroke-width:5.4px}.dt-xs .dt-ln,.dt-xs .dt-lid{stroke-width:3.6px}";
    c += ".dt-shadow{fill:#22150c;opacity:.26}.dt-sp,.dt-drop{opacity:0}";

    /* ---- joints: how a pose is reached. Parts do not move in step: elbows lead, shoulders wind up and follow,
       hands, hat and cape drag behind and overshoot more. */
    c += ".dt-j{transition:transform .46s cubic-bezier(.3,1.4,.5,1)}" +
      /* the arm with the glass is always bent, so it swings as one piece and overshoots softly. (These curves never
         run backwards: a change that is taken back within its first moments would then jump.) */
      ".dt-shA,.dt-elA{transition:transform .5s cubic-bezier(.42,0,.3,1.3)}" +
      /* the free arm: shoulder and elbow share one curve, and the script says which of them waits (--_sd, --_ed):
         going up the forearm folds first, coming down the shoulder drops first, so the hand always travels close to the body */
      ".dt-shB,.dt-elB{transition:transform .48s cubic-bezier(.4,0,.3,1.2) var(--_sd,0s)}.dt-elB{transition-delay:var(--_ed,0s)}" +
      ".dt-wrB,.dt-glass{transition:transform .52s cubic-bezier(.3,1.8,.5,1) .08s}" +
      ".dt-head{transition:transform .5s cubic-bezier(.3,1.5,.5,1) .03s}" +
      ".dt-hat{transition:transform .56s cubic-bezier(.3,2.1,.5,1) .07s}" +
      ".dt-chest{transition:transform .6s cubic-bezier(.3,2.6,.5,1)}" +
      ".dt-capeL,.dt-capeR{transition:transform .6s cubic-bezier(.3,1.8,.5,1) .1s}" +
      ".dt-browL,.dt-browR{transition:transform .24s cubic-bezier(.3,1.9,.5,1)}" +
      ".dt-gazem{transition:transform .2s ease-out}";
    c += ".dt-r{transition:transform .34s cubic-bezier(.3,.7,.4,1)}.dt-snap *{transition:none!important}.dt-re .dt-a{animation:none!important}";
    c += ".dt-v{opacity:0;transition:opacity .1s linear}";
    /* which hand shows is set by the script (data-hand): a hand opens only once the arm is nearly up and closes at
       once when the arm comes down; the thought dots wait until the head has tilted */
    c += ["rest", "open", "point", "thumb"].map(function (h) { return R + '[data-hand="' + h + '"] .dt-v-h-' + h; }).join(",") + "," + R + '[data-hand="wave"] .dt-v-h-open,' +
      R + '[data-mood="wave"][data-hand="wave"] .dt-v-fx-wave{opacity:1}' + R + '[data-mood="think"] .dt-v-fx-think{transition-delay:.3s}';
    c += ".dt-blink{transition:transform .07s ease-in}.dt-blinking .dt-blink{transform:scaleY(.08)}.dt-shut{opacity:0;transition:opacity .05s linear}.dt-blinking .dt-shut{opacity:1}";
    /* eyes dart first, the face follows, the head turns last */
    c += ".dt-gaze{transition:transform .16s cubic-bezier(.3,1.4,.6,1)}.dt-face{transition:transform .3s cubic-bezier(.3,1.2,.5,1) .02s}" +
      ".dt-lean{transition:transform .5s cubic-bezier(.3,1.3,.5,1) .05s}.dt-nod,.dt-brows{transition:transform .1s ease-out}";

    /* ---- which pieces show in which mood */
    show("idle", ["m-smile", "e-open", "glint"]);
    show("wave", ["m-open", "e-open"]);
    show("think", ["m-hmm", "e-open", "fx-think"]);
    show("search", ["m-o", "e-open", "bigeye", "glint"]);
    show("point", ["m-open", "e-open"]);
    show("cheer", ["m-big", "e-happy", "fx-cheer"]);
    show("oops", ["m-kind", "e-open"]);
    /* oops opens with a quick wince: the script holds dt-wince for half a second, then the kind face comes back */
    c += R + ".dt-wince[data-mood] .dt-v-e-open," + R + ".dt-wince[data-mood] .dt-v-m-kind{opacity:0}" + R + ".dt-wince .dt-v-oopsA{opacity:1}";
    show("proud", ["m-proud", "e-content", "fx-proud"]);
    c += R + '[data-variant="bust"] .dt-spx{display:none}';
    /* talking: the script picks the mouth shape (data-say), the head and brows answer each syllable */
    c += R + ".dt-talk .dt-mouths,.dt-talkm>*{opacity:0}" + R + ".dt-talk:not([data-say]) .dt-t1";
    [0, 1, 2, 3, 4].forEach(function (i) { c += "," + R + '[data-say="' + i + '"] .dt-t' + i; });
    c += "{opacity:1}";
    c += R + '[data-say="2"] .dt-nod{transform:translateY(1px) rotate(.8deg)}' + R + '[data-say="3"] .dt-nod{transform:translateY(-.7px) rotate(-.6deg)}' +
      R + '[data-say="4"] .dt-nod{transform:translateY(.5px)}' + R + '[data-say="2"] .dt-brows,' + R + '[data-say="3"] .dt-brows{transform:translateY(-1.1px)}';

    /* ---- poses for body, head and face (arms come from poseCss) */
    pose("wave", { head: "rotate(4deg)", tilt: "rotate(-1.5deg)", capeR: "rotate(-6deg)", browL: "translateY(-3.5px) rotate(-4deg)", browR: "translateY(-3.5px) rotate(4deg)" });
    pose("think", { head: "rotate(-5deg)", gazem: "translate(2.6px,-4.2px)", browL: "translateY(-5px) rotate(-10deg)", browR: "translateY(1.5px) rotate(-9deg)" });
    pose("search", { tilt: "rotate(3deg)", head: "rotate(2deg)", capeL: "rotate(5deg)", browL: "translateY(-3px) rotate(-6deg)", browR: "translateY(1.5px) rotate(-12deg)" });
    pose("point", { tilt: "rotate(-2deg)", head: "rotate(4deg)", gazem: "translate(3.4px,1.4px)", capeR: "rotate(-4deg)", browL: "translateY(-2.5px) rotate(-3deg)", browR: "translateY(-3.5px) rotate(6deg)" });
    pose("cheer", { head: "rotate(-2deg) translateY(-1px)", hat: "translateY(-2px) rotate(-3deg)", capeL: "rotate(6deg)", capeR: "rotate(-6deg)", browL: "translateY(-6px) rotate(-8deg)", browR: "translateY(-6px) rotate(8deg)" });
    pose("oops", { tilt: "rotate(2deg)", head: "rotate(-5deg)", capeR: "rotate(-3deg)", browL: "translateY(-3px) rotate(-14deg)", browR: "translateY(-3px) rotate(14deg)" });
    pose("proud", { head: "rotate(-4deg) translateY(-2px)", chest: "scale(1.03,1.02)", capeR: "rotate(-3deg)", browL: "translateY(-3px) rotate(6deg)", browR: "translateY(-3px) rotate(-6deg)" });
    /* in the bust a lean from the ankles would slide the whole head sideways, so it leans far less */
    pose("wave", { tilt: "rotate(-.5deg)" }, "bust"); pose("search", { tilt: "rotate(1.2deg)" }, "bust");
    pose("point", { tilt: "rotate(-.8deg)" }, "bust"); pose("oops", { tilt: "rotate(.7deg)", head: "rotate(-4deg)" }, "bust");
    /* and there is little room above the hat, so nothing lifts it */
    pose("cheer", { hat: "rotate(-3deg)" }, "bust"); pose("proud", { head: "rotate(-4deg)", chest: "none" }, "bust");
    /* when he is told where to look, a mood's own glance lets go faster than the eyes travel, so the two never add up */
    c += R + ".dt-looking .dt-gazem{transform:none;transition-duration:.07s}";
    /* the eye behind the glass gives way to the big one only when the lens has reached it; it is back at once when the lens leaves */
    c += R + '[data-mood="search"] .dt-eyeLwrap,' + R + '[data-mood="search"] .dt-browL-a{opacity:0;transition:opacity .08s linear .38s}' + R + '[data-mood="search"] .dt-v-bigeye{transition-delay:.38s}';

    /* ---- life that runs in every mood */
    K("breathe", "0,100=none|50=translateY(-.6px) scale(1.012,1.02)");
    K("bob", "0,100=none|50=translateY(-1.2px) rotate(.8deg)");
    K("float", "0,100=none|50=rotate(1.8deg)");
    K("glint", "0,62=translateX(-34px)|80,100=translateX(34px)");
    c += ".dt-chest-a{animation:dt-breathe 3.6s ease-in-out infinite}.dt-head-a{animation:dt-bob 4.3s ease-in-out .5s infinite}" +
      ".dt-glint{animation:dt-glint 5.2s ease-in-out infinite}";
    /* follow-through: every change of mood sets the scarf tails, cape, bow and ear flaps swinging, each a beat late */
    K("kick", "0,100=none|16=rotate(var(--k))|40=rotate(calc(var(--k)*-.55))|62=rotate(calc(var(--k)*.3))|82=rotate(calc(var(--k)*-.12))");
    K("sway", "0,100=none|30=rotate(4deg)|75=rotate(-3deg)");
    K("lift", "0,100=none|55=rotate(var(--k))");
    c += ".dt-tails-a{--k:calc(12deg*var(--_e))}.dt-capeL-a{--k:calc(5deg*var(--_e))}.dt-capeR-a{--k:calc(-5deg*var(--_e))}" +
      ".dt-bow-a{--k:calc(-10deg*var(--_e))}.dt-flapL-a{--k:calc(3.5deg*var(--_e))}.dt-flapR-a{--k:calc(-3.5deg*var(--_e))}";
    /* the tuck: on the way from one pose to the next the forearm folds in by --_tk (the script sets it for each change);
       and before the free arm is raised it first swings back a little from the shoulder (--_tw), which is its wind-up */
    K("tuck", "0,100=none|50=rotate(var(--_tk,0deg))");
    K("windup", "0,100=none|38=rotate(var(--_tw,0deg))");
    var TK = "dt-tuck .56s ease-in-out", WU = "dt-windup .26s ease-in-out";
    c += R + "[data-mood] .dt-elB-a{animation:" + TK + "}" + R + "[data-mood] .dt-shB-a{animation:" + WU + "}.dt-elA-a{--_tk:var(--_ta,0deg)}" + R + "[data-mood] .dt-elA-a{animation:" + TK + ",dt-float 5.3s ease-in-out 1s infinite}";
    c += R + "[data-mood] .dt-tails-a{animation:dt-kick .95s ease-in-out .04s,dt-sway 3.1s ease-in-out 1s infinite}" +
      R + "[data-mood] .dt-capeL-a{animation:dt-kick .85s ease-in-out .07s}" + R + "[data-mood] .dt-capeR-a{animation:dt-kick .85s ease-in-out .1s}" +
      R + "[data-mood] .dt-bow-a{animation:dt-kick .7s ease-in-out .12s}" +
      R + "[data-mood] .dt-flapL-a," + R + "[data-mood] .dt-flapR-a{animation:dt-kick .7s ease-in-out .1s}";

    /* ---- idle: a slow shift of weight */
    K("shift", "0,100=none|22,46=rotate(.8deg) translateX(.5px)|70,86=rotate(-.6deg)");
    anim("idle", { "tilt-a": "dt-shift 9.5s ease-in-out 2.5s infinite" });
    /* ---- wave: a little hop, then the forearm swings and the hand trails it */
    K("hop", "0,100=none|22=scale(1.025,.97)|55=translateY(-4px) scale(.99,1.012)|82=scale(1.015,.982)");
    K("wave", "0=none;ease-out|25=rotate(-14deg)|75=rotate(16deg);ease-in|100=none");
    K("wave2", "0=none;ease-out|25=rotate(-10deg)|75=rotate(12deg);ease-in|100=none");
    K("rock", "0,100=none|25=rotate(-.7deg)|75=rotate(.7deg)");
    anim("wave", { "body-a": "dt-hop .5s ease-in-out", "elB-a": TK + ",dt-wave 1.04s ease-in-out .62s infinite", "wrB-a": "dt-wave2 1.04s ease-in-out .72s infinite", "tilt-a": "dt-rock 1.04s ease-in-out .62s infinite" });
    c += R + '[data-mood="wave"] .dt-fxw{animation:dt-flick .52s steps(1,end) infinite}@keyframes dt-flick{0%{opacity:.85}50%{opacity:.2}}';
    anim("wave", { "elB-a": TK + ",dt-waveb 1.04s ease-in-out .62s infinite" }, "bust");
    K("waveb", "0=none;ease-out|25=rotate(-9deg)|75=rotate(10deg);ease-in|100=none");
    /* ---- think: a small "hm", then a slow ponder and now and then a finger tap on the chin */
    K("hm", "0,100=none|35=rotate(2.5deg) translateY(1.6px)|70=rotate(-1deg) translateY(-.6px)");
    K("ponder", "0,100=none|50=rotate(3deg) translateY(-1px)");
    K("tap", "0,18,100=none|6=rotate(-11deg)|11=rotate(-2deg)|15=rotate(-8deg)");
    anim("think", { "head-a": "dt-hm .7s ease-in-out,dt-ponder 5.2s ease-in-out .7s infinite", "wrB-a": "dt-tap 2.9s ease-in-out 1.3s infinite" });
    c += R + '[data-mood="think"] .dt-dot1{animation:dt-dot 1.8s ease-in-out infinite}' + R + '[data-mood="think"] .dt-dot2{animation:dt-dot 1.8s ease-in-out .25s infinite}' +
      R + '[data-mood="think"] .dt-dot3{animation:dt-dot 1.8s ease-in-out .5s infinite}@keyframes dt-dot{0%,100%{opacity:.35;transform:scale(.72)}45%{opacity:1;transform:scale(1.05)}}';
    /* ---- search: lean in past the pose, settle, then scan with the glass */
    K("leanin", "0,100=none|40=rotate(2.2deg)|72=rotate(-.6deg)");
    K("leanl", "0,100=none|25=rotate(1deg)|75=rotate(-.8deg)");
    K("scan", "0,100=none|25=rotate(3deg)|75=rotate(-2.5deg)");
    K("peer", "0,100=none|25=translateX(3.2px)|75=translateX(-3px)");
    anim("search", { "tilt-a": "dt-leanin .6s ease-in-out,dt-leanl 3.8s ease-in-out .6s infinite", "shA-a": "dt-scan 3.8s ease-in-out .6s infinite", bigpupil: "dt-peer 3.8s ease-in-out .6s infinite" });
    anim("search", { "tilt-a": "dt-leanb 3.8s ease-in-out .6s infinite" }, "bust");
    K("leanb", "0,100=none|25=rotate(.4deg)|75=rotate(-.3deg)");
    /* ---- point: lunge towards the thing, then two quick wags of the finger and a rest */
    K("lunge", "0,100=none|30=rotate(2.6deg)|65=rotate(-.8deg)");
    K("jab", "0,30,100=none|7=rotate(-6deg)|14=rotate(2.5deg)|21=rotate(-4.5deg)");
    anim("point", { "tilt-a": "dt-lunge .55s ease-in-out", "shB-a": WU + ",dt-jab 2.3s ease-in-out .55s infinite" });
    anim("point", { "tilt-a": "dt-lungeb .55s ease-in-out", "shB-a": "none", "wrB-a": "dt-jabb 2.3s ease-in-out .55s infinite" }, "bust");
    K("lungeb", "0,100=none|30=rotate(.8deg)|65=rotate(-.3deg)");
    K("jabb", "0,30,100=none|7=rotate(-13deg)|14=rotate(5deg)|21=rotate(-9deg)");
    /* ---- cheer: crouch, jump, land with a squash; arms, hat, cape and scarf each lag a little more */
    K("jump", "0,100=none|14=scale(1.045,.95)|52=translateY(-9px) scale(.985,1.02)|84=scale(1.035,.965)");
    K("jumpb", "0,100=none|14=translateY(1.5px)|52=translateY(-3px)|84=translateY(.8px)");
    K("pumpA", "0,100=none|50=rotate(-7deg)");
    K("pumpB", "0,100=none|50=rotate(7deg)");
    K("hatpop", "0,100=none|50=translateY(-3px) rotate(-3deg)|85=translateY(1px)");
    K("hatpopb", "0,100=none|50=translateY(-1.5px) rotate(-2deg)|85=translateY(.6px)");
    anim("cheer", {
      "body-a": "dt-jump .64s cubic-bezier(.35,0,.45,1) infinite", "shA-a": "dt-pumpA .64s ease-in-out .05s infinite", "shB-a": WU + ",dt-pumpB .64s ease-in-out .69s infinite",
      "hat-a": "dt-hatpop .64s ease-in-out .08s infinite", "capeL-a": "dt-lift .64s ease-in-out .1s infinite", "capeR-a": "dt-lift .64s ease-in-out .13s infinite",
      "tails-a": "dt-lift .64s ease-in-out .09s infinite", "bow-a": "dt-lift .64s ease-in-out .15s infinite", "flapL-a": "dt-lift .64s ease-in-out .12s infinite", "flapR-a": "dt-lift .64s ease-in-out .12s infinite"
    });
    anim("cheer", { "body-a": "dt-jumpb .64s cubic-bezier(.35,0,.45,1) infinite", "hat-a": "dt-hatpopb .64s ease-in-out .08s infinite", "shA-a": "dt-pumpAb .64s ease-in-out .05s infinite" }, "bust");
    K("pumpAb", "0,100=none|50=rotate(-3deg)");
    K("shrink", "0,100=none|52=scale(.8)");
    anim("cheer", { "shadow-a": "dt-shrink .64s cubic-bezier(.35,0,.45,1) infinite" });
    c += R + '[data-mood="cheer"] .dt-sp{animation:dt-spark 1.1s ease-out infinite}' + R + '[data-mood="proud"] .dt-sp{animation:dt-spark 1.6s ease-out infinite}' +
      "@keyframes dt-spark{0%{transform:scale(0) rotate(-30deg);opacity:0}30%{transform:scale(1.15) rotate(0deg);opacity:1}100%{transform:scale(.2) rotate(40deg);opacity:0}}";
    /* ---- oops: a recoil with the wince, which settles into a kind smile */
    K("recoil", "0,100=none|16=translateY(-6px) scale(.985,1.02)|42=scale(1.025,.975)|68=translateY(-1px)");
    K("recoilb", "0,100=none|16=translateY(-3.5px)|42=translateY(.6px)|68=translateY(-.6px)");
    K("reel", "0,100=none|16=rotate(3deg)|44=rotate(1.5deg)|72=rotate(-.8deg)");
    K("reelb", "0,100=none|16=rotate(1deg)|44=rotate(.5deg)|72=rotate(-.3deg)");
    K("hathop", "0,100=none|20=translateY(-8px) rotate(7deg)|48=translateY(-1px) rotate(2deg)|66=translateY(-2.5px)");
    K("browup", "0,62,100=none|6,44=translateY(-6px)");
    K("sorry", "0,100=none|50=rotate(-2.5deg) translateY(.6px)");
    K("shrug", "0,100=none|20=rotate(-9deg)|50=rotate(4deg)|75=rotate(-2deg)");
    anim("oops", {
      "body-a": "dt-recoil 1s ease-in-out", "tilt-a": "dt-reel 1s ease-in-out", "hat-a": "dt-hathop 1s ease-out .03s", "browL-a": "dt-browup 1.05s ease-out", "browR-a": "dt-browup 1.05s ease-out",
      "head-a": "dt-sorry 3.4s ease-in-out 1.1s infinite", "elB-a": TK + ",dt-shrug .9s ease-in-out .6s"
    });
    anim("oops", { "body-a": "dt-recoilb 1s ease-in-out", "tilt-a": "dt-reelb 1s ease-in-out", "hat-a": "dt-hathopb 1s ease-out .03s" }, "bust");
    K("hathopb", "0,100=none|20=translateY(-5px) rotate(5deg)|48=translateY(-1px) rotate(2deg)|66=translateY(-2px)");
    c += R + '[data-mood="oops"] .dt-drop{animation:dt-drop 2.6s ease-in .1s infinite}@keyframes dt-drop{0%{transform:translateY(-4px);opacity:0}8%{opacity:1}34%{transform:translateY(8px);opacity:1}44%,100%{transform:translateY(11px);opacity:0}}';
    /* ---- proud: chest out, a slow sway, the thumb bobs */
    K("psway", "0,100=none|25=rotate(1.2deg)|75=rotate(-1.2deg)");
    K("thumb", "0,100=none|50=rotate(-5deg)");
    anim("proud", { "tilt-a": "dt-psway 4.8s ease-in-out .7s infinite", "elB-a": TK + ",dt-thumb 1.8s ease-in-out .7s infinite" });
    anim("proud", { "tilt-a": "dt-leanb 4.8s ease-in-out .7s infinite" }, "bust");

    /* ---- pause when off screen, stop for reduced motion (poses still change, nothing moves) */
    c += R + ".dt-off *{animation-play-state:paused!important}";
    c += "@media (prefers-reduced-motion:reduce){" + R + " *{animation:none!important;transition:none!important}.dt-sp{opacity:1}" + R + '[data-mood="oops"] .dt-drop{opacity:1}}';
    return c + poseCss();
  }
  function ensureStyle() {
    if (document.getElementById("dt-style")) { return; }
    var s = document.createElement("style");
    s.id = "dt-style";
    s.textContent = css();
    (document.head || document.documentElement).appendChild(s);
  }

  /* ------------------------------------------------------------------ drawing */
  var P = {
    head: "M55,92C55,64 74,46 100,46C126,46 145,64 145,92C145,117 128,136 100,136C72,136 55,117 55,92Z",
    crown: "M50,67C44,34 69,13 101,13C133,13 155,35 150,69C123,57 78,56 50,67Z",
    flapL: "M52,64C47,45 58,27 80,18C75,31 73,45 76,58C68,58 59,60 52,64Z",
    flapR: "M148,66C152,47 143,29 124,19C128,32 129,46 127,58C134,59 142,62 148,66Z",
    visor: "M66,62C83,54 124,52 150,62C161,65 168,70 166,75C157,82 137,84 115,81C95,78 78,72 66,62Z",
    backpeak: "M64,58C51,54 35,58 27,71C36,79 51,79 64,72Z",
    capeL: "M100,131C82,128 62,136 53,158C48,170 45,180 46,188C58,196 80,194 97,180C98,164 99,148 100,131Z",
    capeR: "M100,131C118,128 138,136 147,158C152,170 155,180 154,188C142,196 120,194 103,180C102,164 101,148 100,131Z",
    coat: "M70,152C68,184 64,216 60,240Q100,251 140,240C136,216 132,184 130,152Z",
    star: "M0,-8Q1.4,-1.4 8,0Q1.4,1.4 0,8Q-1.4,1.4 -8,0Q-1.4,-1.4 0,-8Z"
  };

  function J(cls, x, y, inner, local) {
    return '<g transform="translate(' + x + " " + y + ')"><g class="dt-j dt-' + cls + '"><g class="dt-r"><g class="dt-a dt-' + cls + '-a">' +
      (local ? inner : '<g transform="translate(' + (-x) + " " + (-y) + ')">' + inner + "</g>") + "</g></g></g></g>";
  }
  function hi(d, o) { return '<path d="' + d + '" fill="#fff3cc" opacity="' + o + '"/>'; }
  var SHD = "#42200c"; /* warm umber: every painted shadow */
  function sh(d, o) { return '<path d="' + d + '" fill="' + SHD + '" opacity="' + o + '"/>'; }

  function markup(n) {
    var id = function (k) { return "dt" + n + k; };
    var url = function (k) { return "url(#" + id(k) + ")"; };
    var s = "";
    s += '<svg class="dt-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" focusable="false" aria-hidden="true">';
    s += "<defs>" +
      '<pattern id="' + id("tw") + '" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">' +
      '<path class="dt-s" d="M0,1H8M0,5H8" stroke-opacity=".17" stroke-width="1.1"/><path d="M1,0V8M5,0V8" stroke="#fff0c2" stroke-opacity=".2" stroke-width="1.1"/></pattern>' +
      '<clipPath id="' + id("ch") + '"><path d="' + P.head + '"/></clipPath>' +
      '<clipPath id="' + id("cc") + '"><path d="' + P.crown + '"/></clipPath>' +
      '<clipPath id="' + id("pL") + '"><path d="' + P.capeL + '"/></clipPath>' +
      '<clipPath id="' + id("pR") + '"><path d="' + P.capeR + '"/></clipPath>' +
      '<clipPath id="' + id("ck") + '"><path d="' + P.coat + '"/></clipPath>' +
      '<clipPath id="' + id("cv") + '"><path d="' + P.visor + '"/></clipPath>' +
      '<clipPath id="' + id("el") + '"><ellipse rx="9.6" ry="10.8"/></clipPath>' +
      '<clipPath id="' + id("er") + '"><ellipse rx="8.7" ry="10.4"/></clipPath>' +
      '<clipPath id="' + id("ln") + '"><circle cy="33" r="14.2"/></clipPath>' +
      '<radialGradient id="' + id("lg") + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id("hl") + '"><stop offset="0" stop-color="#fff1c4" stop-opacity=".62"/><stop offset=".6" stop-color="#fff1c4" stop-opacity=".2"/><stop offset="1" stop-color="#fff1c4" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id("sd") + '"><stop offset="0" stop-color="' + SHD + '" stop-opacity=".36"/><stop offset=".6" stop-color="' + SHD + '" stop-opacity=".14"/><stop offset="1" stop-color="' + SHD + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id("ir") + '" cx=".5" cy=".62" r=".6"><stop offset="0" stop-color="#b9712e"/><stop offset=".7" stop-color="#7a431c"/><stop offset="1" stop-color="#4a2814"/></radialGradient>' +
      '<linearGradient id="' + id("br") + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset=".45" stop-color="#e2a93c"/><stop offset="1" stop-color="#a66f1c"/></linearGradient>' +
      "</defs>";

    s += J("shadow", 100, 272, '<ellipse class="dt-shadow" rx="50" ry="3.8"/>', true);

    /* ---------- legs lean with the body; the shoes stay flat on the floor */
    var legs = '<g class="dt-legs">' +
      '<path class="dt-c-shade dt-so" d="M81,234L82,263L97,263L97,236Z"/><path class="dt-c-shade dt-so" d="M103,236L103,263L118,263L119,234Z"/>' +
      '<path d="M81,234L82,263L97,263L97,236ZM103,236L103,263L118,263L119,234Z" fill="#1c0f06" opacity=".42"/></g>';
    var shoes = '<g class="dt-legs">' +
      '<path class="dt-so" fill="#2e1c12" d="M97.5,261L97.5,270Q97.5,274 93,274L74,274Q67,274 69.500,268Q73,260 85,259.500Z"/>' +
      '<path class="dt-so" fill="#2e1c12" d="M102.5,261L102.5,270Q102.5,274 107,274L126,274Q133,274 130.500,268Q127,260 115,259.500Z"/>' +
      '<path class="dt-fine" d="M73,267Q78,262.500 85,262.500" fill="none" stroke="#fff3cc" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path class="dt-fine" d="M127,267Q122,262.500 115,262.500" fill="none" stroke="#fff3cc" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>' +
      "</g>";

    /* ---------- upper body (pivot at the hips: breathing) */
    var up = "";
    var armUp = '<rect class="dt-c-shade dt-so" x="-8.500" y="-7" width="17" height="52" rx="8.500"/><rect x="-8.500" y="-7" width="8" height="52" rx="4" fill="' + SHD + '" opacity=".14"/>';
    up += J("shA", SH.A[0], SH.A[1], armUp, true) + J("shB", SH.B[0], SH.B[1], armUp, true);
    /* coat */
    up += '<path class="dt-c-shade" d="' + P.coat + '"/><g clip-path="' + url("ck") + '">' +
      sh("M56,150H84C80,190 78,220 74,252H56Z", ".2") + hi("M118,150H146V252H128C126,216 124,184 118,150Z", ".16") +
      sh("M56,228Q100,240 144,228V256H56Z", ".16") + "</g>" +
      '<path class="dt-ol" d="' + P.coat + '"/><path class="dt-il" d="M100,176V246"/>' +
      '<circle class="dt-fine dt-s" cx="105" cy="204" r="2.6" fill="' + url("br") + '" stroke-width="1"/>' +
      '<circle class="dt-fine dt-s" cx="105" cy="223" r="2.6" fill="' + url("br") + '" stroke-width="1"/>';
    /* scarf band behind the chin */
    up += '<path class="dt-c-accent dt-sa" d="M76,127Q100,146 124,127L126,139Q100,157 74,139Z"/>';
    /* cape: two wings that hang from the neck and can lift and flap on their own */
    var hem = sh("M40,180Q70,193 99,174L101,174Q130,193 160,180V202H40Z", ".16");
    function wing(k, extra, after) {
      return J("cape" + k, 100, 131, '<path class="dt-c-coat" d="' + P["cape" + k] + '"/><g clip-path="' + url("p" + k) + '">' +
        '<rect class="dt-tw" x="40" y="124" width="120" height="76" fill="' + url("tw") + '"/>' + extra + hem + "</g>" +
        '<path class="dt-ol" d="' + P["cape" + k] + '"/>' + after);
    }
    up += wing("L", '<ellipse cx="54" cy="170" rx="34" ry="44" fill="' + url("sd") + '"/>', "") +
      wing("R", '<ellipse cx="138" cy="150" rx="34" ry="36" fill="' + url("hl") + '"/>' +
        '<path class="dt-fine" d="M141,145C147,156 150.500,170 150.500,184" fill="none" stroke="#fff6d8" stroke-width="2.400" stroke-linecap="round" opacity=".6"/>',
        '<circle class="dt-fine dt-s" cx="107.500" cy="152" r="2.5" fill="' + url("br") + '" stroke-width="1"/>' +
        '<circle class="dt-fine dt-s" cx="106.500" cy="166" r="2.5" fill="' + url("br") + '" stroke-width="1"/>');
    /* scarf knot and tails */
    var tails = '<path class="dt-c-accent dt-sa" d="M-3,2C-8,12 -12,22 -13,33L-4,35C-2,25 1,15 4,5Z"/>' +
      '<path class="dt-c-accent dt-sa" d="M3,3C5,13 6,23 5,35L14,34C14,23 12,12 9,2Z"/>' +
      '<path class="dt-c-accd" d="M-3,2C-8,12 -12,22 -13,33L-9,34C-7,23 -4,12 0,3Z" opacity=".5"/>' +
      '<path class="dt-fine dt-hl" d="M-11,29L-5,30.500M6,30.500L13,30"/>';
    up += J("tails", 87, 143, tails, true) +
      '<path class="dt-c-accent dt-sa" d="M79,137C82,133 92,134 95,139C96,145 91,150 85,149C80,148 77,142 79,137Z"/>' +
      '<path class="dt-hl" d="M82,138C85,136 90,137 92,140"/>';

    /* ---------- head: skull, then the face (which slides a little inside it when he looks around), hat, brows */
    var skull = "";
    skull += '<path class="dt-c-hat dt-so" d="' + P.backpeak + '"/>' + sh(P.backpeak, ".3");
    skull += '<ellipse class="dt-c-skin dt-so" cx="55.500" cy="99" rx="6.500" ry="8.500"/><path class="dt-il" d="M54,95Q51,99 54.500,103"/>';
    skull += '<path class="dt-c-skin" d="' + P.head + '"/><g clip-path="' + url("ch") + '">' +
      '<ellipse cx="132" cy="94" rx="38" ry="46" fill="' + url("hl") + '"/>' +
      '<ellipse cx="58" cy="116" rx="36" ry="40" fill="' + url("sd") + '" opacity=".75"/>' +
      sh("M60,58C84,50 124,50 152,60V71C126,86 92,83 60,69Z", ".2") +
      '<path class="dt-fine" d="M141.500,84C144,98 140,113 131,124" fill="none" stroke="#fff6d8" stroke-width="2.400" stroke-linecap="round" opacity=".7"/>' +
      "</g>" + '<path class="dt-ol" d="' + P.head + '"/>';
    skull += '<path class="dt-c-hair dt-so" d="M55,74C51,88 54,101 59,108C64,101 66,87 68,74Z"/>' +
      '<path class="dt-c-hair dt-so" d="M145,77C147,88 145,98 141.500,104C139,97 139,87 140,77Z"/>' +
      '<path class="dt-c-hair dt-so" d="M66,64C70,76 82,80 92,72L86,62Z"/>';
    var face = '<ellipse cx="74.500" cy="114" rx="8" ry="5" fill="#e9705f" opacity=".42"/><ellipse cx="129" cy="114" rx="7" ry="4.800" fill="#e9705f" opacity=".42"/>';
    /* nose */
    face += '<path d="M104,104C110,105 113,111 108,115C105,117 101,116 100,113" fill="#e9a183" opacity=".55"/>' +
      '<path class="dt-ln" style="stroke-width:2.300px" d="M105,104C110,106 112,111 107.500,114.500"/>';
    /* eyes */
    function eye(k, cx, cy, rx, ry, pr, clip) {
      return '<g class="dt-eye' + k + 'wrap" transform="translate(' + cx + " " + cy + ')"><g class="dt-blink">' +
        '<ellipse class="dt-s" rx="' + rx + '" ry="' + ry + '" fill="#fffdf6" stroke-opacity=".55" stroke-width="1.500"/>' +
        '<g clip-path="' + url(clip) + '"><ellipse cy="' + (-ry) + '" rx="' + (rx + 2) + '" ry="4.500" fill="' + SHD + '" opacity=".1"/><g class="dt-gazem dt-j"><g class="dt-gaze">' +
        '<circle cx=".8" cy="2" r="' + pr + '" fill="' + url("ir") + '" stroke="#2a1810" stroke-width="1.300"/><circle cx=".8" cy="2" r="' + (pr * 0.52).toFixed(1) + '" fill="#1c110b"/>' +
        '<circle cx="-1.600" cy="-.800" r="2.400" fill="#fff"/><circle cx="3.600" cy="4.800" r="1" fill="#fff" opacity=".75"/>' +
        "</g></g></g>" +
        '<path class="dt-lid" d="M' + (-rx - 0.4) + ",-3Q" + (-rx * 0.5) + "," + (-ry - 2.2) + " 0," + (-ry - 0.4) + "Q" + (rx * 0.6) + "," + (-ry - 1.6) + " " + (rx + 0.4) + ',-3.500"/>' +
        '</g><path class="dt-lid dt-shut" d="M' + (1 - rx) + ",1Q0,6 " + (rx - 1) + ',1"/></g>';
    }
    face += '<g class="dt-v dt-v-e-open">' + eye("L", EYE.L[0], EYE.L[1], 9.6, 10.8, 7, "el") + eye("R", EYE.R[0], EYE.R[1], 8.7, 10.4, 6.5, "er") + "</g>";
    face += '<g class="dt-v dt-v-e-happy"><path class="dt-ln" style="stroke-width:3.200px" d="M77,101Q86,89.500 95,101"/><path class="dt-ln" style="stroke-width:3.200px" d="M109,101Q117,90 125,101"/></g>';
    face += '<g class="dt-v dt-v-e-content"><path class="dt-ln" style="stroke-width:3.200px" d="M77,96.500Q86,105.500 95,96.500"/><path class="dt-ln" style="stroke-width:3.200px" d="M109,96.500Q117,105 125,96.500"/></g>';
    face += '<g class="dt-v dt-v-oopsA"><path class="dt-ln" style="stroke-width:3.200px" d="M79,92L93,98.500L79,105"/><path class="dt-ln" style="stroke-width:3.200px" d="M124.500,92L111,98.500L124.500,105"/></g>';
    /* mouths */
    var dark = "#5c1a17";
    face += '<g class="dt-mouths">' +
      '<path class="dt-v dt-v-m-smile dt-ln" d="M92.500,120Q102,130.500 114,119"/>' +
      '<g class="dt-v dt-v-m-open"><path d="M92,118.500Q103,116 114.500,118.500Q114,132.500 103,132.500Q92.500,132.500 92,118.500Z" fill="' + dark + '" class="dt-so" style="stroke-width:2.300px"/>' +
      '<path d="M95,119.500Q103,117.800 111.500,119.500L111,122.500Q103,121 95.500,122.500Z" fill="#fffdf6"/><ellipse cx="103" cy="129.500" rx="5.500" ry="2.600" fill="#ee7b78"/></g>' +
      '<g class="dt-v dt-v-m-big"><path d="M88.500,116.500Q103,113 118,116.500Q117.500,135.500 103,135.500Q89,135.500 88.500,116.500Z" fill="' + dark + '" class="dt-so" style="stroke-width:2.300px"/>' +
      '<path d="M91.500,117.800Q103,115.200 115,117.800L114.500,121.500Q103,119.500 92,121.500Z" fill="#fffdf6"/><ellipse cx="103" cy="131.500" rx="7.500" ry="3.400" fill="#ee7b78"/></g>' +
      '<path class="dt-v dt-v-m-hmm dt-ln" d="M97,123.500Q104,119.500 111.500,122"/>' +
      '<ellipse class="dt-v dt-v-m-o dt-so" cx="104" cy="123.500" rx="4.200" ry="5" fill="' + dark + '" style="stroke-width:2.200px"/>' +
      '<path class="dt-v dt-v-m-kind dt-ln" d="M94,120.500Q103,128.500 112.500,120.500"/>' +
      '<g class="dt-v dt-v-m-proud"><path class="dt-ln" d="M90,118.500Q103,132 116.500,117"/><path class="dt-ln" style="stroke-width:2px" d="M88.500,116Q89,119 91.500,120.500M118,114.500Q118,118 115.500,119.500"/></g>' +
      '<g class="dt-v dt-v-oopsA"><rect x="92.500" y="116.500" width="21" height="10.500" rx="5" fill="#fffdf6" class="dt-so" style="stroke-width:2.200px"/><path class="dt-s" d="M92.500,121.800H113.500M98,117V126.500M103,117V126.500M108,117V126.500" fill="none" stroke-width="1.3"/></g>' +
      "</g>";
    /* talking mouths: closed, small, wide open, "ee", "oo" */
    face += '<g class="dt-talkm"><path class="dt-t0 dt-ln" d="M95,121Q103,126.500 111.500,121"/>' +
      '<ellipse class="dt-t1 dt-so" cx="103" cy="123" rx="5.400" ry="3.400" fill="' + dark + '" style="stroke-width:2.200px"/>' +
      '<g class="dt-t2"><ellipse class="dt-so" cx="103" cy="124" rx="6.400" ry="6.200" fill="' + dark + '" style="stroke-width:2.200px"/><ellipse cx="103" cy="127.500" rx="3.800" ry="2" fill="#ee7b78"/></g>' +
      '<g class="dt-t3"><path class="dt-so" d="M93.500,119.800Q103,117.600 112.500,119.800Q112,127 103,127Q94,127 93.500,119.800Z" fill="' + dark + '" style="stroke-width:2.200px"/>' +
      '<path d="M96,120.600Q103,119 110,120.600L109.600,122.800Q103,121.600 96.400,122.800Z" fill="#fffdf6"/></g>' +
      '<ellipse class="dt-t4 dt-so" cx="103.500" cy="123.500" rx="3.600" ry="4.400" fill="' + dark + '" style="stroke-width:2.200px"/></g>';
    /* hat */
    var hat = "";
    hat += '<path class="dt-c-hat" d="' + P.crown + '"/><g clip-path="' + url("cc") + '">' +
      '<rect class="dt-tw" x="40" y="8" width="120" height="66" fill="' + url("tw") + '"/>' +
      '<ellipse cx="130" cy="30" rx="40" ry="30" fill="' + url("hl") + '"/>' + '<ellipse cx="56" cy="56" rx="34" ry="38" fill="' + url("sd") + '"/>' +
      '<path class="dt-fine" d="M132,22.500C142,31 147.500,44 146.500,58" fill="none" stroke="#fff6d8" stroke-width="2.400" stroke-linecap="round" opacity=".65"/>' + "</g>" +
      '<path class="dt-ol" d="' + P.crown + '"/>';
    hat += '<path class="dt-il dt-fine" d="M101,15C100,30 100,44 101,57"/>';
    /* ear flaps, tied on top: each hangs from its top end */
    function flap(k, x, y, tone) {
      return J("flap" + k, x, y, '<path class="dt-c-hat dt-so" d="' + P["flap" + k] + '"/><path class="dt-tw" d="' + P["flap" + k] + '" fill="' + url("tw") + '"/>' + tone + '<path class="dt-ol" d="' + P["flap" + k] + '"/>');
    }
    hat += flap("L", 80, 18, sh(P.flapL, ".16")) + flap("R", 124, 19, hi(P.flapR, ".2"));
    /* bow that ties the ear flaps on top */
    hat += J("bow", 101, 14, '<path class="dt-c-accent dt-sa" d="M0,0C-6,-11 -19,-10 -18,-2C-17,5 -7,5 0,0Z"/><path class="dt-c-accent dt-sa" d="M0,0C6,-11 19,-10 18,-2C17,5 7,5 0,0Z"/>' +
      '<path class="dt-hl" d="M-14,-4Q-11,-7 -6,-5M6,-5Q11,-7 14,-4"/>' +
      '<path class="dt-c-accent dt-sa" d="M-2,2L-6,10L-1,9L0,4L1,9L6,10L2,2Z"/><circle class="dt-c-accent dt-sa" r="3.600"/>', true);
    hat += '<path class="dt-c-hat" d="' + P.visor + '"/><g clip-path="' + url("cv") + '"><rect class="dt-tw" x="60" y="50" width="112" height="38" fill="' + url("tw") + '"/>' +
      sh("M60,70C84,80 124,88 170,78V90H60Z", ".22") + '<ellipse cx="140" cy="60" rx="34" ry="14" fill="' + url("hl") + '"/>' +
      '<path class="dt-fine" d="M120,57.500C136,58 150,62.500 160,68.500" fill="none" stroke="#fff6d8" stroke-width="2.200" stroke-linecap="round" opacity=".6"/>' + "</g>" +
      '<path class="dt-ol" d="' + P.visor + '"/>';
    /* brows sit on top of the brim so they can act above it */
    var brows = '<g class="dt-brows">' + J("browL", 86, 84, '<path class="dt-brow" d="M-10,2Q-1,-5 10,-.500"/>', true) + J("browR", 118, 84, '<path class="dt-brow" d="M-9,-.500Q1,-5 8.500,2"/>', true) + "</g>";
    /* sweat drop for the oops wince, thought dots */
    var fx = '<g transform="translate(140 52)"><g class="dt-drop"><path d="M0,-7C3,-2 4.500,1 4.500,3.500A4.500,4.500 0 1 1 -4.500,3.500C-4.500,1 -3,-2 0,-7Z" fill="#a5dcf3" class="dt-so" style="stroke-width:1.800px"/></g></g>';
    fx += '<g class="dt-v dt-v-fx-think"><g transform="translate(151 44)"><circle class="dt-dot1 dt-so" r="3.200" fill="#fff8e6" style="stroke-width:1.800px"/></g>' +
      '<g transform="translate(161 32)"><circle class="dt-dot2 dt-so" r="4.400" fill="#fff8e6" style="stroke-width:1.800px"/></g>' +
      '<g transform="translate(173 17)"><circle class="dt-dot3 dt-so" r="6" fill="#fff8e6" style="stroke-width:1.800px"/></g></g>';
    var head = skull + '<g class="dt-face">' + face + "</g>" + J("hat", 100, 62, hat) + '<g class="dt-face">' + brows + "</g>" + fx;
    up += J("head", 100, 134, '<g class="dt-lean"><g class="dt-nod"><g transform="translate(-100 -134)">' + head + "</g></g></g>", true);

    /* ---------- forearms, hands and the magnifying glass (in front of everything) */
    var fore = '<rect class="dt-c-shade dt-so" x="-8" y="-8" width="16" height="36" rx="8"/><rect x="-8" y="-8" width="7" height="36" rx="3.500" fill="' + SHD + '" opacity=".14"/>' +
      '<rect class="dt-c-coat dt-so" x="-9" y="21.500" width="18" height="8" rx="3.500"/>';
    var glass = '<rect x="-3.200" y="6" width="6.400" height="14" rx="3" fill="#5b3423" class="dt-so"/><rect x="-3.800" y="14.500" width="7.600" height="5" rx="1.500" class="dt-s" fill="' + url("br") + '" stroke-width="1.200"/>' +
      '<circle cy="33" r="14.500" class="dt-c-lens" opacity=".5"/><circle cy="33" r="14.500" fill="' + url("lg") + '" opacity=".75"/>' +
      '<g class="dt-v dt-v-bigeye" clip-path="' + url("ln") + '"><circle cy="33" r="14.500" fill="#eaf8fd"/>' +
      '<g transform="translate(0 33.500)"><g class="dt-blink"><ellipse class="dt-s" rx="12.400" ry="13" fill="#fffdf6" stroke-width="1.800"/>' +
      '<g transform="translate(0 .5)"><g class="dt-gaze"><g class="dt-bigpupil"><circle r="8" fill="#3b2313"/><circle r="4.800" fill="#1c110b"/><circle cx="-2.800" cy="-3" r="3" fill="#fff"/><circle cx="3.400" cy="3.600" r="1.300" fill="#fff" opacity=".7"/></g></g></g>' +
      '<path class="dt-s" d="M-13.500,-6.500Q0,-20.500 13.500,-6.500" fill="none" stroke-width="3" stroke-linecap="round"/></g>' +
      '<path class="dt-lid dt-shut" d="M-11,1Q0,7 11,1"/></g></g>' +
      '<g clip-path="' + url("ln") + '"><g class="dt-v dt-v-glint"><g class="dt-glint"><path d="M-5,14L3,14L-4,52L-12,52Z" fill="#fff" opacity=".7"/></g></g>' +
      '<path d="M-9.500,26A12,12 0 0 1 -1,21.500" fill="none" stroke="#fff" stroke-width="2.400" stroke-linecap="round" opacity=".9"/></g>' +
      '<circle class="dt-s" cy="33" r="16" fill="none" stroke-width="6.800"/><circle cy="33" r="16" fill="none" stroke="' + url("br") + '" stroke-width="4.200"/>' +
      '<path d="M-11.500,22.500A16,16 0 0 1 3,17.200" fill="none" stroke="#fff6d0" stroke-width="1.500" stroke-linecap="round" opacity=".9"/>';
    var handA = J("glass", 0, 37, glass, true) + '<circle class="dt-c-skin dt-so" cy="37" r="8.200"/>' +
      '<path class="dt-il" d="M-5,35.500Q0,33.500 5,35.500M-5.500,39.500Q0,37.500 5.500,39.500"/><ellipse class="dt-c-skin dt-so" cx="5.500" cy="33.500" rx="3.600" ry="5" transform="rotate(-24 5.500 33.500)"/>';
    function finger(a, len) { return '<rect class="dt-c-skin dt-so" x="-2.900" y="5" width="5.800" height="' + len + '" rx="2.900" transform="translate(0 37) rotate(' + a + ')"/>'; }
    var handB = '<g class="dt-v dt-v-h-rest"><circle class="dt-c-skin dt-so" cy="37" r="8"/><ellipse class="dt-c-skin dt-so" cx="-6" cy="34.500" rx="3.400" ry="5" transform="rotate(22 -6 34.500)"/><path class="dt-il" d="M-3,41Q1,43 5,41"/></g>' +
      '<g class="dt-v dt-v-h-open">' + finger(-27, 13) + finger(-9, 15) + finger(9, 15) + finger(27, 13) + finger(-72, 11) +
      '<ellipse class="dt-c-skin dt-so" cy="37.500" rx="8.200" ry="8.600"/><path class="dt-il" d="M-4,40Q0,43 4.500,39.500"/></g>' +
      '<g class="dt-v dt-v-h-point"><rect class="dt-c-skin dt-so" x="-3" y="40" width="6" height="17.500" rx="3"/><circle class="dt-c-skin dt-so" cy="37" r="8"/>' +
      '<ellipse class="dt-c-skin dt-so" cx="6.200" cy="35" rx="3.300" ry="4.800" transform="rotate(-20 6.200 35)"/><path class="dt-il" d="M-5.500,38.500Q-2,41.500 2,40.500"/></g>' +
      '<g class="dt-v dt-v-h-thumb"><path class="dt-c-skin dt-so" d="M-2.500,42C-3,49 -2.500,53.500 -1,56.500C1,59.500 6,59 7,55.500C8,51 7.500,46 7,41Z"/>' +
      '<rect class="dt-c-skin dt-so" x="-9" y="29.500" width="18" height="15.500" rx="6.500"/>' +
      '<path class="dt-il" d="M-8.500,34.500H2.500M-8.500,38.500H2.500M-8,42H1"/><path class="dt-il" d="M3,31V44.500"/>' +
      '<g transform="translate(-14 58)" class="dt-v dt-v-fx-proud"><g class="dt-sp"><path d="' + P.star + '" fill="#ffe58a" stroke="#fff" stroke-width="1"/></g></g></g>' +
      '<g class="dt-v dt-v-fx-wave"><path class="dt-fxw" d="M-17,39Q-20,45 -17,51M17,39Q20,45 17,51" fill="none" stroke="#fff3cc" stroke-width="2.200" stroke-linecap="round"/></g>';
    up += J("shA", SH.A[0], SH.A[1], J("elA", 0, UP, fore + handA, true), true);
    up += J("shB", SH.B[0], SH.B[1], J("elB", 0, UP, fore + J("wrB", 0, 37, '<g transform="translate(0 -37)">' + handB + "</g>", true), true), true);

    s += J("body", 100, 272, J("tilt", 100, 272, legs + J("chest", 100, 238, up)) + shoes);

    /* celebration sparkles (the two widest are left out of the bust, where they would be cut by the frame) */
    var sp = [[28, 26, 1.2, 0], [170, 24, 1.05, .2], [152, 0, .8, .45], [48, 2, .9, .6], [190, 80, .85, .8, 1], [8, 80, .8, .35, 1]];
    s += '<g class="dt-v dt-v-fx-cheer">' + sp.map(function (q) {
      return '<g transform="translate(' + q[0] + " " + q[1] + ") scale(" + q[2] + ')"' + (q[4] ? ' class="dt-spx"' : "") + '><g class="dt-sp" style="animation-delay:' + q[3] + 's"><path d="' + P.star + '" fill="#ffe58a" stroke="#fff8dc" stroke-width="1"/></g></g>';
    }).join("") + "</g>";
    s += "</svg>";
    return s;
  }

  /* ------------------------------------------------------------------ instance */
  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  /* "matrix(a, b, c, d, e, f)" x "matrix(...)" as CSS text; "none" is the identity */
  function mat(t) { var m = /^matrix\(([^)]+)\)/.exec(t || ""); return m ? m[1].split(",").map(Number) : null; }
  function mul(p, q) {
    var a = mat(p), b = mat(q);
    if (!a || !b) { return a ? p : (b ? q : ""); }
    return "matrix(" + [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]].join(",") + ")";
  }
  function cs(e) { return root.getComputedStyle(e); }

  function create(opts) {
    opts = opts || {};
    ensureStyle();
    var n = ++uid;
    var el = document.createElement("span");
    el.className = "dt-root";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = markup(n);
    var svg = el.firstChild;
    var st = { variant: null, mood: "idle", shown: null, size: 160, one: null, blink: null, glance: null, say: null, talk: false, look: false, gx: 0, gy: 0, lastBlink: 0, dead: false, io: null, at: 0 };
    var loops = el.querySelectorAll(".dt-a");
    var parts = { gaze: el.querySelectorAll(".dt-gaze"), face: el.querySelectorAll(".dt-face"), lean: el.querySelectorAll(".dt-lean") };

    function quiet() { return st.dead || reduced() || el.classList.contains("dt-off") || document.hidden; }

    /* Change the mood without a jump. Every loop and accent is stopped and started afresh (dt-re), and whatever
       offset it had at that instant is handed to its .dt-r parent, which then eases back to rest. The poses
       themselves are untouched by this: each joint makes one clean transition from where it is to where it must go. */
    function restyle(change) {
      var live = !reduced() && document.documentElement.contains(el), was = [], i, c, t, dirty = [];
      if (live) {
        for (i = 0; i < loops.length; i++) { was.push(cs(loops[i]).transform); }
        el.classList.add("dt-re");
      }
      change();
      if (!live) { return; }
      for (i = 0; i < loops.length; i++) {
        c = loops[i].parentNode;
        t = cs(c).transform;                       /* reading it also makes the browser drop the old animations */
        if (was[i] !== "none") {
          t = mul(t, was[i]);                      /* what is left of an earlier hand-over, times the loop's offset */
          c.style.transition = "none";
          c.style.transform = t;
          dirty.push(c);
        }
      }
      el.classList.remove("dt-re");
      void el.offsetWidth;                         /* the new animations start here, from nothing */
      for (i = 0; i < dirty.length; i++) { dirty[i].style.transition = ""; dirty[i].style.transform = ""; }
    }
    function sv(k, v) { el.style.setProperty("--_" + k, v); }
    /* the angle a joint is at right now, read from its matrix and brought into the range the poses use */
    function ang(k, lo) {
      var m = mat(cs(el.querySelector(".dt-" + k)).transform), a = m ? Math.atan2(m[1], m[0]) * 180 / Math.PI : 0;
      return a < lo ? a + 360 : a >= lo + 360 ? a - 360 : a;
    }
    function show(m, again) {
      if (st.shown === m && !again) { return; }
      /* Plan the arms' way to the new pose from where they are at this moment (they may be half way through an
         earlier change). p0 and p1: which way the free forearm points now and at the end; -90 is straight out to the side. */
      var b = PZ[st.variant][m], bust = st.variant === "bust", live = !reduced() && document.documentElement.contains(el);
      var tA = live ? ang("shA", -90) : b[0], tB = live ? ang("shB", -270) : b[2], p0 = live ? tB + ang("elB", -165) : b[2] + b[3], p1 = b[2] + b[3];
      /* busy: an earlier change is still under way, so the arm may be anywhere. Then a forearm that sticks out sideways
         (down to 35 degrees above level) is folded in first as well, before the shoulder lifts it. */
      var now = Date.now(), busy = live && now - st.at < 550;
      var up = p1 < -90 && (p0 > -90 || (busy && p0 > -125)), down = p0 < -90 && p1 > -90, d = Math.abs(b[2] - tB);
      var ed = down ? Math.min(200, d * 4) : 0;
      /* coming down from a shoulder that is still raised, the forearm may swing out only once the upper arm is low enough */
      if (down && tB < -46) { ed = Math.max(ed, Math.min(200, 288 * Math.min(1, (-46 - tB) / Math.max(d, 1)) - 24)); }
      st.at = now;
      var tk = p0 > -90 && p1 > -90 ? 0 : Math.min(bust ? 110 : 80, d * (up || down ? 0.9 : bust ? 0.6 : 0.35));
      var hand = HANDS[MOODS.indexOf(m)];
      st.shown = m;
      /* a fist at once; any other hand only when the arm has had time to get clear of the body and of the frame */
      clearTimeout(st.hand);
      if (hand === "rest" || !live) { el.setAttribute("data-hand", hand); } else { st.hand = setTimeout(function () { el.setAttribute("data-hand", hand); }, 300); }
      clearTimeout(st.wince);
      if (m === "oops" && !reduced()) { st.wince = setTimeout(function () { el.classList.remove("dt-wince"); }, 480); }
      restyle(function () {
        el.classList.toggle("dt-wince", m === "oops" && !reduced());
        sv("sd", (up ? Math.min(120, d * 3) : 0).toFixed(0) + "ms"); sv("ed", ed.toFixed(0) + "ms"); sv("tk", -tk.toFixed(1) + "deg");
        sv("tw", (up ? Math.min(9, d * 0.1) : 0).toFixed(1) + "deg");
        sv("ta", Math.min(40, Math.abs(b[0] - tA) * 0.3).toFixed(1) + "deg");
        el.setAttribute("data-mood", m);
      });
    }
    function setVariant(v) {
      v = v === "bust" ? "bust" : "full";
      if (v === st.variant) { return; }
      st.variant = v;
      /* a new crop is a new picture: the pose is taken up at once, without a swing through the old frame */
      el.classList.add("dt-snap");
      el.setAttribute("data-variant", v);
      svg.setAttribute("viewBox", VB[v].join(" "));
      setSize(st.size);
      void el.offsetWidth;
      el.classList.remove("dt-snap");
    }
    function setSize(px) {
      px = Math.max(16, +px || 160);
      st.size = px;
      var vb = VB[st.variant];
      el.style.height = px + "px";
      el.style.width = (Math.round(px * vb[2] / vb[3] * 100) / 100) + "px";
      var scale = px / vb[3];
      el.classList.toggle("dt-xs", scale < 0.5);
      el.classList.toggle("dt-sm", scale >= 0.5 && scale < 0.8);
    }
    function put(list, t) { for (var i = 0; i < list.length; i++) { list[i].style.transform = t; } }
    /* x and y run from -1 to 1. The pupils go furthest, the face slides a little inside the head, the head turns least. */
    function setGaze(x, y) {
      var on = x || y;
      st.gx = x; st.gy = y;
      put(parts.gaze, on ? "translate(" + (x * 3.6).toFixed(2) + "px," + (y * 3).toFixed(2) + "px)" : "");
      put(parts.face, on ? "translate(" + (x * 1.8).toFixed(2) + "px," + (y * 1.2).toFixed(2) + "px)" : "");
      put(parts.lean, on ? "translate(" + (x * 0.9).toFixed(2) + "px," + (y * 0.6).toFixed(2) + "px) rotate(" + (x * 1.3).toFixed(2) + "deg)" : "");
    }
    function blink(ms) {
      if (quiet()) { return; }
      st.lastBlink = Date.now();
      el.classList.add("dt-blinking");
      setTimeout(function () { el.classList.remove("dt-blinking"); }, ms || 120);
    }
    function lookAt(x, y) {
      if (st.dead) { return; }
      if (x === null || x === undefined || typeof x !== "number" || typeof y !== "number") {
        st.look = false; el.classList.remove("dt-looking"); setGaze(0, 0); return;
      }
      var r = svg.getBoundingClientRect();
      if (!r.width || !r.height) { return; }
      var vb = VB[st.variant];
      var ex = r.left + ((EYE.L[0] + EYE.R[0]) / 2 - vb[0]) / vb[2] * r.width;
      var ey = r.top + (EYE.L[1] - vb[1]) / vb[3] * r.height;
      var dx = x - ex, dy = y - ey, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var k = Math.min(1, d / (r.height * 0.35));
      var gx = dx / d * k, gy = dy / d * k;
      /* a big swing of the eyes comes with a blink, as it does in life */
      if (Math.abs(gx - st.gx) + Math.abs(gy - st.gy) > 1.1 && Date.now() - st.lastBlink > 700) { blink(110); }
      st.look = true; el.classList.add("dt-looking");
      setGaze(gx, gy);
    }
    function clearOne() { if (st.one) { clearTimeout(st.one); st.one = null; } }

    /* blinking and the occasional idle glance are timed from here, so they never look mechanical */
    function scheduleBlink() {
      st.blink = setTimeout(function () {
        if (st.dead) { return; }
        blink(120);
        if (Math.random() < 0.22) { setTimeout(function () { blink(110); }, 260); }
        scheduleBlink();
      }, 2300 + Math.random() * 3400);
    }
    function scheduleGlance() {
      st.glance = setTimeout(function () {
        if (st.dead) { return; }
        if (!quiet() && !st.look && st.shown === "idle") {
          var side = Math.random() < 0.5 ? -1 : 1, hold = 700 + Math.random() * 500;
          setGaze(side * (0.65 + Math.random() * 0.3), Math.random() * 0.6 - 0.2);
          if (Math.random() < 0.3) { setTimeout(function () { if (!st.dead && !st.look) { setGaze(-side * 0.6, 0.1); } }, hold); hold += 600; }
          setTimeout(function () { if (!st.dead && !st.look) { setGaze(0, 0); } }, hold);
        }
        scheduleGlance();
      }, 4200 + Math.random() * 4200);
    }
    /* talking: an irregular run of mouth shapes with short closed beats between "words" */
    function say() {
      if (!st.talk || st.dead) { return; }
      /* off screen or in a hidden tab the mouth waits: nothing is changed, and it goes on when he is seen again */
      if (quiet()) { st.sayT = setTimeout(say, 400); return; }
      var r = Math.random(), next = st.say !== "0" && r < 0.17 ? 0 : 1 + Math.floor(Math.random() * 4);
      if (String(next) === st.say) { next = next % 4 + 1; }
      st.say = String(next);
      el.setAttribute("data-say", st.say);
      st.sayT = setTimeout(say, next ? 75 + Math.random() * 85 : 110 + Math.random() * 150);
    }

    el.setMood = function (m) {
      if (MOODS.indexOf(m) < 0) { return el; }
      st.mood = m;
      if (!st.one) { show(m); }
      return el;
    };
    el.play = function (m, ms) {
      if (MOODS.indexOf(m) < 0 || st.dead) { return el; }
      clearOne();
      show(m, true);
      st.one = setTimeout(function () { st.one = null; show(st.mood); }, ms > 0 ? ms : 1600);
      return el;
    };
    el.talk = function (on) {
      on = !!on;
      if (on === st.talk) { return el; }
      st.talk = on;
      el.classList.toggle("dt-talk", on);
      clearTimeout(st.sayT);
      st.say = null;
      el.removeAttribute("data-say");
      if (on && !st.dead && !reduced()) { say(); }
      return el;
    };
    el.lookAt = function (x, y) { lookAt(x, y); return el; };
    el.setSize = function (px) { setSize(px); return el; };
    el.setVariant = function (v) { setVariant(v); return el; };
    el.getMood = function () { return st.mood; };
    el.destroy = function () {
      st.dead = true; st.talk = false;
      clearOne(); clearTimeout(st.blink); clearTimeout(st.glance); clearTimeout(st.sayT); clearTimeout(st.wince); clearTimeout(st.hand);
      if (st.io) { try { st.io.disconnect(); } catch (e) { /* ignore */ } st.io = null; }
      el.classList.remove("dt-talk", "dt-blinking");
      el.removeAttribute("data-say");
    };

    st.size = +opts.size > 0 ? +opts.size : 160;
    setVariant(opts.variant);
    st.mood = MOODS.indexOf(opts.mood) >= 0 ? opts.mood : "idle";
    show(st.mood);
    scheduleBlink();
    scheduleGlance();
    if (typeof root.IntersectionObserver === "function") {
      try {
        st.io = new root.IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) { el.classList.toggle("dt-off", !entries[i].isIntersecting); }
        });
        st.io.observe(el);
      } catch (e) { st.io = null; }
    }
    return el;
  }

  root.Detective = { MOODS: MOODS.slice(), create: create };
})(typeof window !== "undefined" ? window : this);
