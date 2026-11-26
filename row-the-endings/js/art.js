/* Row the Endings: the pictures, as inline SVG strings (no files). window.RowArt.
 * A Roman bireme (red sail with a brass wreath, a painted eye on the prow, a bronze ram, two banks of oars,
 * the hortator's drum on deck), the harbors (a quay, a port town, the lighthouse with its laurel), the sea and
 * sky of each step, the pennants and small icons. Only transform and opacity are animated (in css/row.css). */
(function (root) {
  "use strict";

  /* gradients, defined once in an always-rendered (zero-size) svg so every picture can use them */
  var DEFS = '<svg class="rt-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>' +
    '<linearGradient id="rtSail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f1820"/><stop offset=".42" stop-color="#d23a42"/><stop offset=".7" stop-color="#c22e37"/><stop offset="1" stop-color="#8f1820"/></linearGradient>' +
    '<linearGradient id="rtHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5532"/><stop offset=".5" stop-color="#5e361f"/><stop offset="1" stop-color="#3a2015"/></linearGradient>' +
    '<linearGradient id="rtBrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe596"/><stop offset=".5" stop-color="#f0bb4c"/><stop offset="1" stop-color="#b07a1f"/></linearGradient>' +
    '<linearGradient id="rtBronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8b864"/><stop offset=".6" stop-color="#b9802e"/><stop offset="1" stop-color="#7a4e10"/></linearGradient>' +
    '<linearGradient id="rtStone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4e7c6"/><stop offset="1" stop-color="#cdb98c"/></linearGradient>' +
    '<linearGradient id="rtQuay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b7357"/><stop offset="1" stop-color="#4e3d2c"/></linearGradient>' +
    '<linearGradient id="rtDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1630"/><stop offset=".45" stop-color="#1e3a6e"/><stop offset=".78" stop-color="#8a5a6a"/><stop offset="1" stop-color="#e59a5a"/></linearGradient>' +
    '<linearGradient id="rtSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28508f"/><stop offset="1" stop-color="#0c1630"/></linearGradient>' +
    '<radialGradient id="rtGlow"><stop offset="0" stop-color="#fff2c4" stop-opacity=".95"/><stop offset=".35" stop-color="#ffc861" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="rtBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="rtBeamL" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".5"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="rtTile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e2b4"/><stop offset="1" stop-color="#d9b06a"/></linearGradient>' +
    "</defs></svg>";

  function range(a, b, step) { var out = []; for (var x = a; x <= b; x += step) { out.push(x); } return out; }

  /* the bireme, facing right (it rows from the left harbor to the right one). viewBox 0 0 220 130, waterline ~ y 102 */
  function ship(o) {
    o = o || {};
    var up = range(58, 178, 12), low = range(64, 172, 12);
    var shafts1 = up.map(function (x) { return "M" + x + " 81.5L" + (x - 17) + " 121"; }).join("");
    var blades1 = up.map(function (x) { return "M" + (x - 16) + " 119L" + (x - 20) + " 127"; }).join("");
    var shafts2 = low.map(function (x) { return "M" + x + " 91L" + (x - 11) + " 121"; }).join("");
    var blades2 = low.map(function (x) { return "M" + (x - 10.5) + " 119.5L" + (x - 13.5) + " 127"; }).join("");
    var ports1 = up.map(function (x) { return '<circle cx="' + x + '" cy="81.5" r="1.7"/>'; }).join("");
    var ports2 = low.map(function (x) { return '<circle cx="' + x + '" cy="91" r="1.6"/>'; }).join("");
    var posts = range(44, 184, 14).map(function (x) { return "M" + x + " 66.5V72"; }).join("");
    return '<svg class="ship-svg" viewBox="0 0 220 130" aria-hidden="true" focusable="false">' +
      /* the steering oar at the stern */
      '<path d="M44 77L27 116" stroke="#3a2015" stroke-width="3.2" stroke-linecap="round"/><path d="M27 115L22 127" stroke="#54301d" stroke-width="7" stroke-linecap="round"/>' +
      /* rigging, mast and yard */
      '<path d="M104 9L197 60M104 9L31 41" stroke="#2a160c" stroke-width=".9" fill="none" opacity=".75"/>' +
      '<path d="M104 8V73" stroke="#4a2a18" stroke-width="3.6" stroke-linecap="round"/>' +
      '<g class="sail">' +
        '<path d="M66.5 20.5Q104 14.5 141.5 20.5L138.5 60Q104 67.5 69.5 60Z" fill="url(#rtSail)" stroke="#5a0c12" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M85 17.6L86.3 63.4M104 16V65.6M123 17.6L121.7 63.4" stroke="#7c121b" stroke-width=".9" opacity=".55"/>' +
        '<path d="M69.5 60Q104 67.5 138.5 60" stroke="#e2a93c" stroke-width="1.6" fill="none"/>' +
        /* the brass emblem: a laurel wreath around a sun */
        '<g fill="none" stroke="#ffd77a" stroke-width="1.5" stroke-linecap="round"><path d="M100 48Q92 41 97 31"/><path d="M108 48Q116 41 111 31"/></g>' +
        '<g fill="#f0bb4c" stroke="#7a4e10" stroke-width=".5">' +
          '<ellipse cx="95.6" cy="35.5" rx="1.5" ry="2.8" transform="rotate(-25 95.6 35.5)"/><ellipse cx="95" cy="41" rx="1.5" ry="2.8" transform="rotate(-55 95 41)"/><ellipse cx="98.4" cy="45.6" rx="1.5" ry="2.8" transform="rotate(-80 98.4 45.6)"/>' +
          '<ellipse cx="112.4" cy="35.5" rx="1.5" ry="2.8" transform="rotate(25 112.4 35.5)"/><ellipse cx="113" cy="41" rx="1.5" ry="2.8" transform="rotate(55 113 41)"/><ellipse cx="109.6" cy="45.6" rx="1.5" ry="2.8" transform="rotate(80 109.6 45.6)"/>' +
          '<circle cx="104" cy="38.5" r="4.3"/></g>' +
        '<g stroke="#ffe39a" stroke-width="1" stroke-linecap="round"><path d="M104 31.6v1.8M104 43.6v1.8M97.1 38.5h1.8M109.1 38.5h1.8"/></g>' +
      "</g>" +
      '<path d="M65 18.5Q104 12 143 18.5" stroke="#4a2a18" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path class="flag" d="M104 8.2L121 11.2L104 14.4Z" fill="#e2584f" stroke="#7c121b" stroke-width=".7" stroke-linejoin="round"/>' +
      /* the rail and its posts */
      '<path d="' + posts + '" stroke="#93603a" stroke-width="1.6"/><path d="M40 66.6H186" stroke="#93603a" stroke-width="1.4"/>' +
      /* the hortator's drum on deck */
      '<g class="drum"><rect x="56" y="62.6" width="15" height="9.4" rx="1.6" fill="#b3202a" stroke="#2a160c" stroke-width=".9"/>' +
        '<path d="M56.4 65.2h14.2M56.4 69.4h14.2" stroke="#e2a93c" stroke-width="1.1"/><ellipse cx="63.5" cy="62.6" rx="7.5" ry="2.3" fill="#f6e7c1" stroke="#2a160c" stroke-width=".9"/>' +
        '<path d="M59 56.5l3.4 5M68.5 56l-3 5.6" stroke="#4a2a18" stroke-width="1.3" stroke-linecap="round"/><circle cx="58.8" cy="56.2" r="1.3" fill="#e2a93c"/><circle cx="68.8" cy="55.7" r="1.3" fill="#e2a93c"/></g>' +
      /* the hull */
      '<path d="M36 72L188 72Q197 70 199.5 59.5L205 60.5Q204 76 200 86L216 97L214 102.5L196 103.5Q130 114 56 106.5Q38 102.5 32 90Q28 80 36 72Z" fill="url(#rtHull)" stroke="#2a160c" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M37 72.6H188" stroke="#e2a93c" stroke-width="1.6"/>' +
      /* the red wale with a brass edge */
      '<path d="M37.5 77.6L197 77.6Q198.6 81.4 197.6 85.2L40 85.2Q37 81.4 37.5 77.6Z" fill="#b3202a" stroke="#5a0c12" stroke-width=".8"/>' +
      '<path d="M39.5 85.4L197.4 85.4" stroke="#e2a93c" stroke-width="1"/>' +
      '<g fill="#1a0d06">' + ports1 + ports2 + "</g>" +
      /* the stern post curling over (aplustre) */
      '<path d="M39 74Q23 69 21 53Q20 41 29 37Q37 35 36 43Q35 48 30 47" fill="none" stroke="#3a2015" stroke-width="5.4" stroke-linecap="round"/>' +
      '<path d="M39 73Q24.5 68 22.6 53Q21.8 42.5 29 39" fill="none" stroke="#93603a" stroke-width="1.6" stroke-linecap="round"/>' +
      /* the bronze ram and the painted eye */
      '<path d="M200 86L216 97L214 102.5L198.5 101.6Z" fill="url(#rtBronze)" stroke="#5a3a0a" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M203 92.6L213.5 99M201.6 96.6L212 100.6" stroke="#5a3a0a" stroke-width=".7"/>' +
      '<path d="M181.5 92.6Q188 87.4 194.5 92.6Q188 97.6 181.5 92.6Z" fill="#fffaf0" stroke="#2a160c" stroke-width="1"/>' +
      '<circle cx="189" cy="92.5" r="2.5" fill="#13244a"/><circle cx="189.8" cy="91.7" r=".8" fill="#fff"/>' +
      '<path d="M181 90.6Q188 85.4 195 90.6" fill="none" stroke="#b3202a" stroke-width="1.1"/>' +
      /* two banks of oars (each bank pivots at its oar ports) */
      '<g class="oars ob2"><path d="' + shafts2 + '" stroke="#b07a46" stroke-width="1.5" stroke-linecap="round"/><path d="' + blades2 + '" stroke="#8a5532" stroke-width="3.4" stroke-linecap="round"/></g>' +
      '<g class="oars ob1"><path d="' + shafts1 + '" stroke="#c99560" stroke-width="1.7" stroke-linecap="round"/><path d="' + blades1 + '" stroke="#93603a" stroke-width="3.8" stroke-linecap="round"/></g>' +
      "</svg>";
  }

  /* the harbor the ship leaves: a stone quay with a column and its brazier, a red banner, a bollard. viewBox 0 0 100 130 */
  function quay() {
    return '<svg viewBox="0 0 100 130" aria-hidden="true" focusable="false" preserveAspectRatio="xMinYMax meet">' +
      '<path d="M0 88H80L84 130H0Z" fill="url(#rtQuay)" stroke="#2a1d12" stroke-width="1.2"/>' +
      '<path d="M0 88H80" stroke="#c4a77c" stroke-width="2.4"/>' +
      '<path d="M0 100H82M0 113H83M24 88V100M54 88V100M10 100V113M40 100V113M68 100V113M24 113V130M56 113V130" stroke="#3a2b1d" stroke-width=".9" opacity=".7"/>' +
      /* column with a brazier */
      '<rect x="14" y="36" width="10" height="52" fill="url(#rtStone)" stroke="#6b5434" stroke-width=".9"/>' +
      '<path d="M16.5 38V86M19 38V86M21.5 38V86" stroke="#b39c6c" stroke-width=".6"/>' +
      '<rect x="11.5" y="32" width="15" height="4.5" rx="1" fill="#efe0b8" stroke="#6b5434" stroke-width=".9"/><rect x="11" y="84" width="16" height="4" fill="#efe0b8" stroke="#6b5434" stroke-width=".9"/>' +
      '<path d="M12 25H26L23.5 32H14.5Z" fill="url(#rtBrass)" stroke="#7a4e10" stroke-width=".8"/>' +
      '<circle class="glow" cx="19" cy="20" r="12" fill="url(#rtGlow)"/>' +
      '<path class="flame" d="M19 11Q24 18 22 24H16Q14 18 19 11Z" fill="#ffb347"/><path class="flame f2" d="M19 15Q22 20 21 24H17Q16 20 19 15Z" fill="#fff1b0"/>' +
      /* banner */
      '<path d="M44 46V88" stroke="#3a2015" stroke-width="2"/><circle cx="44" cy="45" r="2" fill="#e2a93c"/>' +
      '<path class="banner" d="M45 49H60V68L52.5 64L45 68Z" fill="#b3202a" stroke="#5a0c12" stroke-width=".8"/>' +
      '<circle cx="52.5" cy="56" r="3.2" fill="none" stroke="#e2a93c" stroke-width="1.2"/>' +
      /* bollard and rope */
      '<rect x="66" y="79" width="7" height="9" rx="2" fill="#3a2015"/><path d="M73 83Q86 92 98 100" stroke="#c9a46a" stroke-width="1.1" fill="none"/>' +
      "</svg>";
  }

  /* a port town on a hill (the next harbor): red roofs, a temple, warm windows. viewBox 0 0 120 130 */
  function port() {
    var house = function (x, y, w, h) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#ead9b2" stroke="#6b5434" stroke-width=".7"/>' +
        '<path d="M' + (x - 2) + " " + y + "L" + (x + w / 2) + " " + (y - h * 0.55) + "L" + (x + w + 2) + " " + y + 'Z" fill="#b3202a" stroke="#5a0c12" stroke-width=".7"/>' +
        '<rect class="win" x="' + (x + w / 2 - 1.6) + '" y="' + (y + h * 0.35) + '" width="3.2" height="4" fill="#ffcf6b"/>';
    };
    return '<svg viewBox="0 0 120 130" aria-hidden="true" focusable="false" preserveAspectRatio="xMaxYMax meet">' +
      '<path d="M0 100Q18 62 46 64Q70 66 82 46Q98 22 120 30V130H0Z" fill="#16294f" stroke="#0c1630" stroke-width="1"/>' +
      house(14, 80, 13, 11) + house(34, 72, 12, 10) + house(52, 64, 13, 11) +
      /* the temple on the top */
      '<g transform="translate(78 30)"><path d="M0 14L14 4L28 14Z" fill="#f3e6c4" stroke="#6b5434" stroke-width=".8"/><rect x="1" y="14" width="26" height="2.5" fill="#efe0b8" stroke="#6b5434" stroke-width=".6"/>' +
        '<path d="M4 16.5V28M10 16.5V28M18 16.5V28M24 16.5V28" stroke="#efe0b8" stroke-width="2.6"/><rect x="0" y="28" width="28" height="3" fill="#efe0b8" stroke="#6b5434" stroke-width=".6"/></g>' +
      house(86, 66, 12, 10) +
      '<path d="M18 98H120V130H14Z" fill="url(#rtQuay)" stroke="#2a1d12" stroke-width="1"/><path d="M18 98H120" stroke="#c4a77c" stroke-width="2"/>' +
      '<path d="M40 98V108M70 98V108M100 98V108M18 108H120M55 108V120M85 108V120" stroke="#3a2b1d" stroke-width=".8" opacity=".7"/>' +
      '<path d="M108 74V98" stroke="#3a2015" stroke-width="1.6"/><path class="banner" d="M108.8 76H120V88L114.4 85L108.8 88Z" fill="#b3202a"/>' +
      "</svg>";
  }

  /* the laurel wreath: green leaves on two branches, tied with a red ribbon. viewBox 0 0 120 120 */
  function laurel(cls) {
    /* the left branch, from the ribbon up to its tip, with a pair of leaves at each node (one out, one in);
       the right branch is its mirror image */
    var leaves = [], i, a, x, y, psi, k, r = 44, cx = 60, cy = 60;
    for (i = 0; i < 8; i++) {
      a = (246 - i * 17) * Math.PI / 180;
      x = cx + r * Math.cos(a); y = cy - r * Math.sin(a);
      psi = Math.atan2(Math.cos(a), Math.sin(a)) * 180 / Math.PI;      /* the way the branch runs, toward its tip */
      for (k = -1; k <= 1; k += 2) {
        var ox = x + k * 5.2 * Math.cos(a), oy = y - k * 5.2 * Math.sin(a), rot = psi - 90 - k * 34;
        leaves.push('<ellipse cx="' + ox.toFixed(1) + '" cy="' + oy.toFixed(1) + '" rx="3.6" ry="8.2" transform="rotate(' + rot.toFixed(0) + " " + ox.toFixed(1) + " " + oy.toFixed(1) + ')"/>');
      }
    }
    var tip = 246 - 8 * 17, tx = cx + r * Math.cos(tip * Math.PI / 180), ty = cy - r * Math.sin(tip * Math.PI / 180);
    leaves.push('<ellipse cx="' + tx.toFixed(1) + '" cy="' + (ty - 3).toFixed(1) + '" rx="3.4" ry="8" transform="rotate(' + (Math.atan2(Math.cos(tip * Math.PI / 180), Math.sin(tip * Math.PI / 180)) * 180 / Math.PI - 90).toFixed(0) + " " + tx.toFixed(1) + " " + (ty - 3).toFixed(1) + ')"/>');
    var branch = '<path d="M' + (cx + r * Math.cos(250 * Math.PI / 180)).toFixed(1) + " " + (cy - r * Math.sin(250 * Math.PI / 180)).toFixed(1) + "A" + r + " " + r + " 0 0 1 " + tx.toFixed(1) + " " + ty.toFixed(1) + '" fill="none" stroke="#4f6e26" stroke-width="2.4" stroke-linecap="round"/>';
    var half = branch + '<g fill="#6f9a3e" stroke="#3f5f1f" stroke-width=".9">' + leaves.join("") + "</g>";
    return '<svg class="' + (cls || "laurel") + '" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      "<g>" + half + '</g><g transform="translate(120 0) scale(-1 1)">' + half + "</g>" +
      '<path d="M48 100Q60 108 72 100L77 116L68 111L60 118L52 111L43 116Z" fill="#b3202a" stroke="#5a0c12" stroke-width="1" stroke-linejoin="round"/>' +
      '<circle cx="60" cy="103" r="4" fill="#e2a93c" stroke="#7a4e10" stroke-width="1"/>' +
      "</svg>";
  }

  /* the lighthouse of the home harbor, on its mole, with a laurel wreath. viewBox 0 0 120 150 */
  function lighthouse() {
    return '<svg viewBox="0 0 120 150" aria-hidden="true" focusable="false" preserveAspectRatio="xMaxYMax meet">' +
      '<g class="beam"><path d="M66 22L0 6V40Z" fill="url(#rtBeamL)"/><path d="M74 22L120 8V38Z" fill="url(#rtBeam)"/></g>' +
      '<path d="M20 150L28 122Q46 112 70 114Q100 112 112 124L120 150Z" fill="#2c3550" stroke="#151c30" stroke-width="1"/>' +
      '<path d="M34 126Q48 120 60 124M80 122Q96 120 106 128" stroke="#4a5677" stroke-width="1.4" fill="none"/>' +
      /* three tiers, as the Pharos */
      '<path d="M44 118L48 74H92L96 118Z" fill="url(#rtStone)" stroke="#6b5434" stroke-width="1"/>' +
      '<path d="M46 96H94M45 108H95M60 74V118M80 74V118" stroke="#b39c6c" stroke-width=".7"/>' +
      '<rect x="66" y="84" width="8" height="12" rx="4" fill="#3a2b1d"/><rect class="win" x="67.5" y="86" width="5" height="9" rx="2.5" fill="#ffcf6b"/>' +
      '<rect x="45" y="70" width="50" height="5" fill="#efe0b8" stroke="#6b5434" stroke-width=".9"/>' +
      '<path d="M53 70L56 42H84L87 70Z" fill="url(#rtStone)" stroke="#6b5434" stroke-width="1"/>' +
      '<path d="M54.5 56H85.5M70 42V70" stroke="#b39c6c" stroke-width=".7"/>' +
      '<rect x="54" y="38.5" width="32" height="4.5" fill="#efe0b8" stroke="#6b5434" stroke-width=".9"/>' +
      '<path d="M60 38.5L62 24H78L80 38.5Z" fill="url(#rtStone)" stroke="#6b5434" stroke-width="1"/>' +
      '<path d="M58 24H82L79 18H61Z" fill="url(#rtBrass)" stroke="#7a4e10" stroke-width=".9"/>' +
      '<circle class="glow" cx="70" cy="13" r="17" fill="url(#rtGlow)"/>' +
      '<path class="flame" d="M70 2Q78 10 75 18H65Q62 10 70 2Z" fill="#ffb347"/><path class="flame f2" d="M70 7Q74 12 73 18H67Q66 12 70 7Z" fill="#fff1b0"/>' +
      /* the laurel hung on the lowest tier */
      '<g transform="translate(57 96) scale(.22)">' + laurel("").replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "") + "</g>" +
      "</svg>";
  }

  /* the sky of each step: stars and a moon (calm), clouds (open sea, storm) */
  function sky(step) {
    var stars = '<g fill="#eef4ff">' + [[40, 14, 1.2], [90, 30, .8], [150, 10, 1], [210, 26, .7], [270, 12, 1.3, 1], [330, 34, .8], [390, 16, 1], [450, 28, .7, 2], [520, 12, 1.1], [580, 30, .8], [640, 18, 1.2, 3], [700, 8, .8], [760, 26, 1]].map(function (s) {
      return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '"' + (s[3] ? ' class="tw t' + s[3] + '"' : "") + "/>";
    }).join("") + "</g>";
    var cloud = function (x, y, s, fill) {
      return '<g class="cloud" transform="translate(' + x + " " + y + ") scale(" + s + ')"><path d="M0 20Q2 8 14 10Q18 0 32 4Q42 -2 50 8Q62 6 64 18Q66 26 56 26H6Q-2 26 0 20Z" fill="' + fill + '"/></g>';
    };
    if (step === 1) {
      return '<svg class="sky-art" viewBox="0 0 800 120" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">' + stars +
        '<circle cx="610" cy="26" r="13" fill="#fff4d6"/><circle cx="616" cy="22" r="12" fill="#2a3f73" opacity=".9"/></svg>';
    }
    if (step === 2) {
      return '<svg class="sky-art" viewBox="0 0 800 120" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">' + stars +
        '<g class="drift">' + cloud(120, 14, 1, "#3d5684") + cloud(470, 6, 1.3, "#344b77") + cloud(700, 22, .8, "#3d5684") + "</g></svg>";
    }
    return '<svg class="sky-art" viewBox="0 0 800 120" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">' +
      '<g class="drift fast">' + cloud(-20, -4, 1.8, "#2a3346") + cloud(180, 0, 1.5, "#313b52") + cloud(400, -6, 2, "#262e40") + cloud(640, 0, 1.6, "#313b52") + "</g>" +
      '<path class="bolt" d="M520 8L506 36H516L504 62L530 30H519L530 8Z" fill="#ffe39a"/></svg>';
  }

  /* a wave line as a path: amp, period (dividing 800 so the band loops), mid height, in a 1600 x 60 box */
  function wavePath(amp, period, mid, h) {
    var d = "M0 " + mid, x;
    for (x = 0; x < 1600; x += period) {
      d += "Q" + (x + period / 4) + " " + (mid - amp) + " " + (x + period / 2) + " " + mid + "Q" + (x + period * 3 / 4) + " " + (mid + amp) + " " + (x + period) + " " + mid;
    }
    return d + "V" + h + "H0Z";
  }
  var WAVES = { 1: [3, 160, 4], 2: [6, 160, 9], 3: [10, 200, 14] };
  function waves(step, layer) {
    var w = WAVES[step] || WAVES[1], back = layer === "back";
    var amp = back ? w[0] * 0.8 : w[0], mid = back ? 14 : 20;
    return '<svg viewBox="0 0 1600 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path d="' + wavePath(amp, back ? w[1] * 1.25 : w[1], mid, 60) + '" fill="' + (back ? "#24467f" : "#11234a") + '"/>' +
      '<path d="' + wavePath(amp, back ? w[1] * 1.25 : w[1], mid, 60).replace(/V60H0Z$/, "") + '" fill="none" stroke="' + (back ? "#5a80bf" : "#7fa3d8") + '" stroke-width="' + (back ? 1.4 : 1.8) + '" opacity="' + (back ? ".5" : ".65") + '"/>' +
      "</svg>";
  }

  /* the harbor home: dusk, the lighthouse, the quay and the ship at its mooring. viewBox 0 0 400 190 */
  function scene() {
    return '<svg class="scene-svg" viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<rect width="400" height="190" fill="url(#rtDusk)"/>' +
      '<g fill="#eef4ff"><circle cx="30" cy="18" r="1.1"/><circle cx="74" cy="34" r=".8" class="tw"/><circle cx="120" cy="12" r="1"/><circle cx="170" cy="28" r=".7"/><circle cx="214" cy="10" r="1.2" class="tw t2"/><circle cx="250" cy="40" r=".7"/><circle cx="20" cy="56" r=".8"/><circle cx="150" cy="52" r=".6" class="tw t3"/></g>' +
      '<circle cx="96" cy="44" r="12" fill="#fff4d6"/><circle cx="101" cy="40" r="11" fill="#1a3160" opacity=".92"/>' +
      '<path d="M0 124Q40 108 80 116Q130 100 180 114Q220 104 260 118L260 132H0Z" fill="#16294f"/>' +
      '<rect y="126" width="400" height="64" fill="url(#rtSea)"/>' +
      '<g class="glints" stroke="#ffd98a" stroke-linecap="round" opacity=".55"><path d="M318 150h20M326 160h14M312 170h22M322 180h12" stroke-width="1.6"/></g>' +
      '<svg x="280" y="20" width="120" height="150" viewBox="0 0 120 150">' + lighthouse().replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "") + "</svg>" +
      '<g class="moored"><svg x="96" y="74" width="190" height="112" viewBox="0 0 220 130">' + ship().replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "") + "</svg></g>" +
      '<g class="swell"><path d="M0 172Q25 166 50 172T100 172T150 172T200 172T250 172T300 172T350 172T400 172T450 172T500 172V190H0Z" fill="#11234a"/>' +
      '<path d="M0 172Q25 166 50 172T100 172T150 172T200 172T250 172T300 172T350 172T400 172T450 172T500 172" fill="none" stroke="#7fa3d8" stroke-width="1.4" opacity=".6"/></g>' +
      '<path d="M0 150H70L76 190H0Z" fill="url(#rtQuay)" stroke="#2a1d12" stroke-width="1"/><path d="M0 150H70" stroke="#c4a77c" stroke-width="2.4"/>' +
      '<path d="M0 162H72M0 176H74M24 150V162M50 150V162M12 162V176M38 162V176M60 162V176" stroke="#3a2b1d" stroke-width=".9" opacity=".7"/>' +
      '<path d="M30 104V150" stroke="#3a2015" stroke-width="2.2"/><circle cx="30" cy="103" r="2.2" fill="#e2a93c"/><path class="banner" d="M31 107H48V128L39.5 123.5L31 128Z" fill="#b3202a" stroke="#5a0c12" stroke-width=".8"/>' +
      '<circle cx="39.5" cy="114.5" r="3.4" fill="none" stroke="#e2a93c" stroke-width="1.2"/>' +
      '<rect x="56" y="142" width="7" height="8" rx="2" fill="#3a2015"/><path d="M63 146Q84 150 104 156" stroke="#c9a46a" stroke-width="1.1" fill="none"/>' +
      "</svg>";
  }

  /* a pennant for a step: state "done" (passed), "open" (unlocked), "next" (the step to row), "lock" */
  function pennant(state) {
    return '<svg class="pn pn-' + state + '" viewBox="0 0 26 32" aria-hidden="true" focusable="false">' +
      '<path d="M3.5 2V31" stroke="#3a2015" stroke-width="2.2" stroke-linecap="round"/><circle cx="3.5" cy="2.4" r="2" fill="#e2a93c"/>' +
      '<path class="pn-f" d="M4.6 4.5L24 10.5L4.6 16.5Z" stroke-linejoin="round"/>' +
      (state === "done" ? '<path d="M8.6 10.6l2.6 2.4 4.6-5" fill="none" stroke="#ffe39a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' : "") +
      "</svg>";
  }

  /* small icons, 24 x 24, currentColor */
  var ICONS = {
    calm: '<path d="M3 10q3-2.4 6 0t6 0 6 0M3 15.5q3-2.4 6 0t6 0 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    open: '<path d="M2.5 17q2.6-1.8 5 0t5 0 5 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 13Q6 4 14 4q5 0 6.5 4-3-1.6-5.2.4-2 2-.3 4.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    storm: '<path d="M6.5 14.5H17a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.7 1.2A3.4 3.4 0 0 0 6.5 14.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.6 13l-2.6 4.4h3.2L11 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    drum: '<ellipse cx="12" cy="10" rx="8" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.8v6.4M16 12.8v6.4" stroke="currentColor" stroke-width="1.5"/><path d="M6 2.5l4.5 6M18.5 2.5l-4.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    oar: '<path d="M4 20L17 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M15 3.6q4-1.6 5.4-.2t-.2 5.4L17.6 9.4 14.6 6.4Z" fill="currentColor"/>',
    ship: '<path d="M12 3v13" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 5q5.5-1.2 11 0l-1 7.5q-4.5 1.2-9 0Z" fill="currentColor" opacity=".85"/><path d="M2.5 16h19l-2.5 4.5H5Z" fill="currentColor"/>',
    bell: '<path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 14h10v7H7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
  };
  function icon(name, cls) { return '<svg class="ic ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>"; }
  function stepIcon(step) { return icon(["calm", "open", "storm"][step - 1] || "calm", "step-ic"); }

  /* the logo: a galley in brass with a red sail. viewBox 0 0 32 32 */
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 3.5V21" stroke="#e2a93c" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M8 6.2Q16 4.4 24 6.2L22.8 16.8Q16 18.6 9.2 16.8Z" fill="#b3202a" stroke="#ffe39a" stroke-width="1.1" stroke-linejoin="round"/><circle cx="16" cy="11.4" r="2.4" fill="none" stroke="#ffe39a" stroke-width="1.1"/>' +
    '<path d="M3 20.5H27.5Q29 20.5 29.6 19.4L31 21.6Q29.6 25.5 25 25.8H8.6Q4.6 25.6 3 20.5Z" fill="#e2a93c" stroke="#7a4e10" stroke-width=".8" stroke-linejoin="round"/>' +
    '<path d="M9 25.6L6.5 30M13 25.8L11 30M17 25.8L15.5 30M21 25.8L20 30" stroke="#e2a93c" stroke-width="1.4" stroke-linecap="round"/></svg>';

  /* a small galley for the ship cards on the quay. viewBox 0 0 64 44 */
  function miniShip(state) {
    return '<svg class="mini mini-' + (state || "") + '" viewBox="0 0 64 44" aria-hidden="true" focusable="false">' +
      '<path d="M31 4V30" stroke="#4a2a18" stroke-width="1.8"/>' +
      '<path d="M19.5 7.5Q31 5 42.5 7.5L41.4 21Q31 23.4 20.6 21Z" fill="url(#rtSail)" stroke="#5a0c12" stroke-width=".9"/>' +
      '<circle cx="31" cy="14" r="2.6" fill="none" stroke="#ffd77a" stroke-width="1"/>' +
      '<path d="M6 29H55Q58.5 28.5 59.5 25L61 25.5Q60.6 31 58.6 33.4L63 36.4L62.4 38L57 38.2Q38 42 16 39.4Q8 38 6 29Z" fill="url(#rtHull)" stroke="#2a160c" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M7.4 31.6H58" stroke="#b3202a" stroke-width="2.2"/><circle cx="55.5" cy="34.8" r="1.2" fill="#fffaf0"/>' +
      '<path d="M7 30Q2 27 3 21Q4 17 7.5 18.6" fill="none" stroke="#3a2015" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M16 34L12 43M24 35L20 43.6M32 35L28 43.6M40 35L36 43.6M48 34L44 43" stroke="#93603a" stroke-width="1.3" stroke-linecap="round"/>' +
      "</svg>";
  }

  root.RowArt = {
    DEFS: DEFS, ship: ship, quay: quay, port: port, lighthouse: lighthouse, laurel: laurel, sky: sky, waves: waves,
    scene: scene, pennant: pennant, icon: icon, stepIcon: stepIcon, LOGO: LOGO, miniShip: miniShip
  };
})(typeof window !== "undefined" ? window : this);
