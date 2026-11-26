/* Climb to Consul: the pictures, hand-built inline SVG (no files, no outside requests).
 * window.ClimbArt: logo(), emblem(office), hill(counts, opts), ladder(from, to), tablet(), sponge(), ring(states), key()
 * Only flat fills inside emblems (gradients there would break where an SVG is hidden); the big scenes give their
 * gradients unique ids. Animation is done in CSS, on transform and opacity only. */
(function (root) {
  "use strict";
  var uid = 0;
  function id(p) { uid += 1; return "cc" + p + uid; }
  function n(x) { return Math.round(x * 100) / 100; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* laurel leaves along an arc (angles in degrees, 0 = right, 90 = down) */
  function leaves(cx, cy, r, a0, a1, count, len, wid, fill, vein) {
    var out = "", i, a, x, y, rot, side;
    out += '<path d="' + arcPath(cx, cy, r, a0, a1) + '" fill="none" stroke="' + (vein || "#7a5a10") + '" stroke-width="' + n(wid * 0.32) + '" stroke-linecap="round"/>';
    for (i = 0; i < count; i++) {
      a = a0 + (a1 - a0) * (i + 0.5) / count;
      side = i % 2 ? 1 : -1;
      var rr = r + side * wid * 0.55;
      x = cx + rr * Math.cos(a * Math.PI / 180);
      y = cy + rr * Math.sin(a * Math.PI / 180);
      rot = a + (a1 > a0 ? 90 : -90) + side * 24;
      out += '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(len / 2) + '" ry="' + n(wid / 2) + '" transform="rotate(' + n(rot) + " " + n(x) + " " + n(y) + ')" fill="' + fill + '"/>';
    }
    return out;
  }
  function arcPath(cx, cy, r, a0, a1) {
    var p0 = [cx + r * Math.cos(a0 * Math.PI / 180), cy + r * Math.sin(a0 * Math.PI / 180)];
    var p1 = [cx + r * Math.cos(a1 * Math.PI / 180), cy + r * Math.sin(a1 * Math.PI / 180)];
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
    return "M" + n(p0[0]) + " " + n(p0[1]) + "A" + r + " " + r + " 0 " + large + " " + sweep + " " + n(p1[0]) + " " + n(p1[1]);
  }
  /* a wreath open at the top, tied with a red ribbon at the bottom */
  function wreath(cx, cy, r, len, wid, fill, vein, ribbon) {
    var s = leaves(cx, cy, r, 104, 262, 9, len, wid, fill, vein) + leaves(cx, cy, r, 76, -82, 9, len, wid, fill, vein);
    if (ribbon !== false) {
      s += '<path d="M' + n(cx - 1) + " " + n(cy + r - 1) + "l" + n(-r * 0.32) + " " + n(r * 0.5) + "l" + n(r * 0.16) + " " + n(-r * 0.05) + "l" + n(r * 0.1) + " " + n(r * 0.16) + 'z" fill="#b3202a"/>' +
        '<path d="M' + n(cx + 1) + " " + n(cy + r - 1) + "l" + n(r * 0.32) + " " + n(r * 0.5) + "l" + n(-r * 0.16) + " " + n(-r * 0.05) + "l" + n(-r * 0.1) + " " + n(r * 0.16) + 'z" fill="#8f1820"/>' +
        '<circle cx="' + cx + '" cy="' + n(cy + r - 0.5) + '" r="' + n(Math.max(1.6, r * 0.13)) + '" fill="#b3202a"/>';
    }
    return s;
  }

  /* --------------------------------------------------------------- the logo */
  function logo() {
    return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      wreath(16, 15, 11.5, 5.4, 2.6, "#e2a93c", "#a8721e", true) +
      '<g fill="#ffe39a"><rect x="10" y="19" width="12" height="2.6" rx=".6"/><rect x="12" y="15.4" width="8" height="2.6" rx=".6"/><rect x="14" y="11.8" width="4" height="2.6" rx=".6"/></g>' +
      '<circle cx="16" cy="9" r="1.4" fill="#fff4c8"/></svg>';
  }

  /* ---------------------------------------------------------- the emblems */
  var EMB = [
    /* Citizen: a wax tablet and a stylus */
    '<rect x="8" y="8" width="26" height="33" rx="3" fill="#8a5a32" stroke="#3f2612" stroke-width="1.6"/>' +
    '<rect x="11.5" y="11.5" width="19" height="26" rx="1.5" fill="#3a2a1e"/>' +
    '<path d="M14.5 17h12M14.5 21.5h9.5M14.5 26h12M14.5 30.5h7" stroke="#e0c08e" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M30.5 42L40.5 13" stroke="#3f3a30" stroke-width="4.2" stroke-linecap="round"/><path d="M30.5 42L40.5 13" stroke="#d6cfbd" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M39.6 15.6l2.2-6.4" stroke="#3f3a30" stroke-width="4.6" stroke-linecap="round"/>',
    /* Quaestor: a coin purse and a bronze coin (the treasury) */
    '<path d="M14 18C7.5 24 7 36 12.5 41c5 4.4 17.5 4.4 22.5 0 5.5-5 5-17-1.5-23z" fill="#9a5b2e" stroke="#40240e" stroke-width="1.6"/>' +
    '<path d="M16.5 26.5c-2 4.5-1.8 9 1 12" fill="none" stroke="#c98a52" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M15 18.5c1.6-6 4.4-3.2 6.2-7.2 2 3.8 3.8.8 5.6 4 2-3 4.4-1.2 5.4 3.2z" fill="#b5703a" stroke="#40240e" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M13.4 19.6c6.6 2.6 14.6 2.6 21.2 0" fill="none" stroke="#b3202a" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M33.6 20.4l3.4 6.2M34.6 20.2l.4 7.2" stroke="#b3202a" stroke-width="1.7" stroke-linecap="round"/>' +
    '<circle cx="30.5" cy="35.5" r="9" fill="#c27a2c" stroke="#5a3210" stroke-width="1.6"/>' +
    '<circle cx="30.5" cy="35.5" r="6.6" fill="none" stroke="#7e4512" stroke-width="1" stroke-dasharray="1.3 1.3"/>' +
    '<text x="30.5" y="38.6" text-anchor="middle" font-family="Georgia, serif" font-size="8.4" font-weight="700" fill="#5e3008">SC</text>' +
    '<path d="M25.5 31a7 7 0 0 1 4-2.6" stroke="#f0b46a" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    /* Aedile: a temple front (buildings and markets) */
    '<path d="M5 17.5L24 6l19 11.5z" fill="#f1e6cc" stroke="#5e4c30" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M11.5 15.6L24 8.6l12.5 7z" fill="#d6c6a2"/>' +
    '<circle cx="24" cy="12.6" r="1.6" fill="#b3202a"/>' +
    '<rect x="5.5" y="17.5" width="37" height="4.2" fill="#e8dbbf" stroke="#5e4c30" stroke-width="1.3"/>' +
    '<rect x="21" y="25" width="6" height="11.5" fill="#4a3020"/>' +
    '<g fill="#f6eedb" stroke="#5e4c30" stroke-width="1.1"><rect x="8.6" y="21.7" width="4.4" height="14.8"/><rect x="16" y="21.7" width="4.4" height="14.8"/><rect x="27.6" y="21.7" width="4.4" height="14.8"/><rect x="35" y="21.7" width="4.4" height="14.8"/></g>' +
    '<g fill="#e8dbbf" stroke="#5e4c30" stroke-width="1.1"><rect x="4.5" y="36.5" width="39" height="3.6"/><rect x="2.5" y="40.1" width="43" height="3.6"/></g>',
    /* Praetor: a scroll with a red seal (the courts) */
    '<rect x="10" y="12" width="28" height="22" fill="#f6e7c1" stroke="#6a4c20" stroke-width="1.4"/>' +
    '<path d="M14 17.5h20M14 21.5h16.5M14 25.5h18.5M14 29.5h12" stroke="#a6884f" stroke-width="1.3" stroke-linecap="round"/>' +
    '<rect x="6.5" y="7.5" width="35" height="6.4" rx="3.2" fill="#e9d29c" stroke="#6a4c20" stroke-width="1.4"/>' +
    '<rect x="6.5" y="32" width="35" height="6.4" rx="3.2" fill="#e9d29c" stroke="#6a4c20" stroke-width="1.4"/>' +
    '<g fill="#7a4a24"><circle cx="5.6" cy="10.7" r="2.4"/><circle cx="42.4" cy="10.7" r="2.4"/><circle cx="5.6" cy="35.2" r="2.4"/><circle cx="42.4" cy="35.2" r="2.4"/></g>' +
    '<path d="M27 37l-3.4 9.4 3-1.6 2 2.6zM31 37l3.4 9.4-3-1.6-2 2.6z" fill="#7c121b"/>' +
    '<circle cx="29" cy="36.6" r="6.2" fill="#b3202a" stroke="#6c0f17" stroke-width="1.4"/>' +
    '<circle cx="29" cy="36.6" r="3.4" fill="none" stroke="#e2584f" stroke-width="1.1"/>',
    /* Consul: a golden laurel wreath over a curule chair */
    '<path d="M13 46c3-7 18-9 22-16M35 46c-3-7-18-9-22-16" fill="none" stroke="#5a3a12" stroke-width="4.6" stroke-linecap="round"/>' +
    '<path d="M13 46c3-7 18-9 22-16M35 46c-3-7-18-9-22-16" fill="none" stroke="#f3e6c4" stroke-width="2.6" stroke-linecap="round"/>' +
    '<rect x="9" y="27.5" width="30" height="4.4" rx="1.6" fill="#e2a93c" stroke="#6a4410" stroke-width="1.3"/>' +
    '<path d="M11 28.6h26" stroke="#ffe39a" stroke-width="1.1"/>' +
    '<g fill="#b3202a"><circle cx="13" cy="46" r="1.8"/><circle cx="35" cy="46" r="1.8"/></g>' +
    wreath(24, 13.5, 8.6, 4.4, 2.3, "#e2a93c", "#8a5c10", true)
  ];
  function emblemInner(o) { return EMB[Math.max(0, Math.min(4, o | 0))]; }
  function emblem(o, cls) {
    return '<svg class="cc-emb' + (cls ? " " + cls : "") + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + emblemInner(o) + "</svg>";
  }

  /* a word as a little wax tablet (gold-rimmed for a Consul) */
  function tabletG(x, y, w, gold) {
    var h = w * 1.24;
    /* a Consul's tablet is gold all over (a bright face, a dark outline so it reads on the marble, a glint) */
    return '<g transform="translate(' + n(x) + " " + n(y) + ')"><g class="cc-tk' + (gold ? " gold" : "") + '">' +
      (gold ? '<circle cx="0" cy="' + n(-h / 2) + '" r="' + n(w * 0.95) + '" fill="#ffe39a" opacity=".38"/>' : "") +
      '<rect x="' + n(-w / 2) + '" y="' + n(-h) + '" width="' + n(w) + '" height="' + n(h) + '" rx="' + n(w * 0.16) + '" fill="' + (gold ? "#f5c542" : "#8a5a32") + '" stroke="' + (gold ? "#5a3a08" : "#3f2612") + '" stroke-width="' + n(w * (gold ? 0.11 : 0.09)) + '"/>' +
      '<rect x="' + n(-w * 0.32) + '" y="' + n(-h * 0.86) + '" width="' + n(w * 0.64) + '" height="' + n(h * 0.72) + '" rx="' + n(w * 0.06) + '" fill="' + (gold ? "#ffe9a8" : "#2f2219") + '"/>' +
      '<path d="M' + n(-w * 0.2) + " " + n(-h * 0.64) + "h" + n(w * 0.4) + "M" + n(-w * 0.2) + " " + n(-h * 0.46) + "h" + n(w * 0.3) + "M" + n(-w * 0.2) + " " + n(-h * 0.28) + "h" + n(w * 0.36) + '" stroke="' + (gold ? "#a8721e" : "#e0c08e") + '" stroke-width="' + n(w * 0.08) + '" stroke-linecap="round"/>' +
      (gold ? '<path d="M' + n(w * 0.5) + " " + n(-h - w * 0.28) + "l" + n(w * 0.1) + " " + n(w * 0.2) + "l" + n(w * 0.2) + " " + n(w * 0.1) + "l" + n(-w * 0.2) + " " + n(w * 0.1) + "l" + n(-w * 0.1) + " " + n(w * 0.2) + "l" + n(-w * 0.1) + " " + n(-w * 0.2) + "l" + n(-w * 0.2) + " " + n(-w * 0.1) + "l" + n(w * 0.2) + " " + n(-w * 0.1) + 'z" fill="#fff6cf"/>' : "") +
      "</g></g>";
  }
  function tablet(gold) {
    return '<svg class="cc-tablet" viewBox="0 0 24 30" aria-hidden="true" focusable="false">' + tabletG(12, 29, 22, gold) + "</svg>";
  }

  /* ----------------------------------------------------- the hill (home) */
  var NAMES = ["Citizens", "Quaestors", "Aediles", "Praetors", "Consuls"];
  function hill(counts, o) {
    o = o || {};
    counts = counts || [0, 0, 0, 0, 0];
    var W = 480, H = 400, sky = id("sky"), glow = id("glow"), mar = id("mar"), grass = id("gr"), fl = id("fl");
    var baseY = 394, stepH = 50, faceH = 34, topH = 16;
    var s = '<svg class="cc-hill' + (o.cls ? " " + o.cls : "") + '" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMax slice" role="img" aria-label="' + esc(o.label || "") + '" focusable="false">';
    s += "<defs>" +
      '<linearGradient id="' + sky + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1430"/><stop offset=".42" stop-color="#16295a"/><stop offset=".64" stop-color="#2d4675"/><stop offset=".8" stop-color="#9a6a4c"/><stop offset=".92" stop-color="#e09a52"/><stop offset="1" stop-color="#f0b866"/></linearGradient>' +
      '<radialGradient id="' + glow + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe39a" stop-opacity=".75"/><stop offset="1" stop-color="#ffe39a" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + mar + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe4cb"/><stop offset="1" stop-color="#cdbd98"/></linearGradient>' +
      '<linearGradient id="' + grass + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4a2e"/><stop offset="1" stop-color="#1c2618"/></linearGradient>' +
      '<radialGradient id="' + fl + '" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#ffb43c"/><stop offset="1" stop-color="#e2502a"/></radialGradient>' +
      "</defs>";
    /* sky, moon, stars */
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#' + sky + ')"/>';
    s += '<g class="cc-stars" fill="#eef4ff">' + [[30, 30, 1.3], [82, 62, 0.9], [130, 22, 1.1], [196, 48, 0.8], [250, 18, 1.2], [300, 64, 0.8], [352, 30, 1], [424, 58, 1.3], [452, 20, 0.9], [60, 104, 0.8], [408, 112, 0.8], [160, 92, 0.7]].map(function (st, i) {
      return '<circle cx="' + st[0] + '" cy="' + st[1] + '" r="' + st[2] + '"' + (i % 3 === 0 ? ' class="tw' + (i % 2 ? " t2" : "") + '"' : "") + "/>";
    }).join("") + "</g>";
    s += '<g transform="translate(404 74)"><circle r="26" fill="#ffe9b0" opacity=".14"/><circle r="15" fill="#fff4d6"/><circle cx="7" cy="-5" r="13.5" fill="#16295a"/></g>';
    /* the city on the horizon: temples, an arch, columns, cypresses */
    s += '<g fill="#1a2648" opacity=".9">' +
      '<path d="M0 312V286h14v-8l18-10 18 10v8h10v26z"/>' +
      '<rect x="64" y="282" width="40" height="30"/><path d="M60 284l24-14 24 14z"/>' +
      '<path d="M372 312v-30h12v-12h40v12h12v30h-14v-14a12 12 0 0 0-24 0v14z"/>' +
      '<rect x="440" y="276" width="40" height="36"/><path d="M436 278l24-14 24 14z"/>' +
      '<path d="M120 312c2-22 5-34 7-40 2 6 5 18 7 40zM352 312c2-24 5-36 7-42 2 6 5 20 7 42zM28 312c2-18 4-28 6-34 2 6 4 16 6 34z"/>' +
      "</g>";
    s += '<g fill="#22305a" opacity=".85">' + [70, 78, 86, 94, 448, 456, 464, 472].map(function (x) { return '<rect x="' + x + '" y="288" width="3.4" height="24"/>'; }).join("") + "</g>";
    /* the hill */
    s += '<path d="M0 400V318C70 300 120 250 170 178 196 140 220 124 240 124s44 16 70 54c50 72 100 122 170 140v82z" fill="url(#' + grass + ')"/>';
    s += '<g fill="#162013">' +
      '<path d="M54 336c3-34 8-52 11-60 3 8 8 26 11 60z"/><path d="M84 330c2-26 6-40 8-46 2 6 6 20 8 46z"/>' +
      '<path d="M396 332c3-32 8-50 11-58 3 8 8 26 11 58z"/><path d="M426 340c2-26 6-40 8-46 2 6 6 20 8 46z"/>' +
      "</g>";
    /* the summit: a golden wreath in a glow, two red banners */
    var topY = baseY - 5 * stepH;
    s += '<circle class="cc-glow" cx="240" cy="' + (topY - 26) + '" r="40" fill="url(#' + glow + ')"/>';
    s += '<g class="cc-wreath" transform="translate(240 ' + (topY - 28) + ')">' + wreath(0, 0, 17, 9, 4.6, "#f0bb4c", "#8a5c10", true) + "</g>";
    [180, 300].forEach(function (x, k) {
      s += '<rect x="' + (x - 1.5) + '" y="' + (topY - 58) + '" width="3" height="58" fill="#5a3a12"/><circle cx="' + x + '" cy="' + (topY - 59) + '" r="3" fill="#e2a93c"/>';
      s += '<path class="cc-flag' + (k ? " f2" : "") + '" d="M' + (x + 1.5) + " " + (topY - 54) + "h24l-6 9 6 9h-24z" + '" fill="#b3202a"/>';
    });
    /* five terraces, from the top (farthest) down to the foot */
    var i, tokens = "";
    for (i = 4; i >= 0; i--) {
      var wi = 460 - i * 76, x0 = (W - wi) / 2, yb = baseY - i * stepH, yf = yb - faceH, yt = yf - topH;
      s += '<g class="cc-ter" data-o="' + i + '">';
      /* the top surface and the front face */
      s += '<path d="M' + n(x0 + 8) + " " + yt + "H" + n(x0 + wi - 8) + "L" + n(x0 + wi) + " " + yf + "H" + n(x0) + 'z" fill="#f6eedb" stroke="#8f7a52" stroke-width="1"/>';
      s += '<rect x="' + n(x0) + '" y="' + yf + '" width="' + wi + '" height="' + faceH + '" fill="url(#' + mar + ')" stroke="#7a6640" stroke-width="1.2"/>';
      s += '<rect x="' + n(x0) + '" y="' + yf + '" width="' + wi + '" height="4" fill="#fbf5e6"/>';
      s += '<rect x="' + n(x0) + '" y="' + (yb - 4) + '" width="' + wi + '" height="4" fill="#b8a57c"/>';
      /* pilasters */
      var k, cols = Math.max(2, Math.round(wi / 54));
      for (k = 1; k < cols; k++) { var px = x0 + wi * k / cols; s += '<rect x="' + n(px - 1.6) + '" y="' + (yf + 4) + '" width="3.2" height="' + (faceH - 8) + '" fill="#d9caa6" opacity=".9"/>'; }
      /* the emblem, the name and the count on a red banner */
      var lx = x0 + 10, bw = 34;
      s += '<rect x="' + n(lx - 2) + '" y="' + (yf + 5) + '" width="' + n(Math.min(wi - bw - 18, 26 + NAMES[i].length * 8.6 + 10)) + '" height="' + (faceH - 10) + '" rx="5" fill="#fbf5e6" opacity=".72"/>';
      s += '<g transform="translate(' + n(lx) + " " + (yf + 6) + ') scale(.46)">' + emblemInner(i) + "</g>";
      s += '<text x="' + n(lx + 26) + '" y="' + (yf + 23) + '" font-family="Alegreya Variable, Georgia, serif" font-weight="800" font-size="16" fill="#3a2614">' + NAMES[i] + "</text>";
      var bx = x0 + wi - bw - 8;
      s += '<path d="M' + n(bx) + " " + (yf - 2) + "h" + bw + "v" + (faceH + 4) + "l" + (-bw / 2) + " -7l" + (-bw / 2) + ' 7z" fill="#b3202a" stroke="#6c0f17" stroke-width="1.2"/>';
      s += '<rect x="' + n(bx - 3) + '" y="' + (yf - 4) + '" width="' + (bw + 6) + '" height="4" rx="2" fill="#e2a93c"/>';
      s += '<text class="cc-count" x="' + n(bx + bw / 2) + '" y="' + (yf + 21) + '" text-anchor="middle" font-family="Nunito Variable, system-ui, sans-serif" font-weight="900" font-size="' + (counts[i] > 99 ? 13 : 17) + '" fill="#fff">' + (counts[i] | 0) + "</text>";
      s += "</g>";
      /* the words standing on this terrace */
      var cnt = Math.min(counts[i] | 0, i === 0 ? 9 : 8), room = wi - 24, gap = Math.min(20, room / Math.max(1, cnt)), sx = 240 - (cnt - 1) * gap / 2, t = "";
      for (k = 0; k < cnt; k++) { t += tabletG(sx + k * gap, yf - 2 - (k % 2) * 2, i === 4 ? 13 : 11, i === 4); }
      tokens += '<g class="cc-toks" data-o="' + i + '">' + t + "</g>";
      /* torches at the ends of the lowest terrace */
      if (i === 0) {
        [x0 + 6, x0 + wi - 6].forEach(function (tx, q) {
          s += '<rect x="' + n(tx - 2) + '" y="' + (yt - 26) + '" width="4" height="26" fill="#3f2612"/><path d="M' + n(tx - 7) + " " + (yt - 28) + "h14l-3 5h-8z" + '" fill="#a8721e"/>';
          s += '<path class="cc-flame' + (q ? " f2" : "") + '" d="M' + n(tx) + " " + (yt - 48) + "c6 8 8 12 6 17-1 3-3 4-6 4s-5-1-6-4c-2-5 0-9 6-17z" + '" fill="url(#' + fl + ')"/>';
        });
      }
    }
    s += tokens;
    s += "</svg>";
    return s;
  }

  /* ---------------------------------------- the little ladder in the feedback */
  function ladder(from, to) {
    var s = '<svg class="cc-ladder" viewBox="0 0 330 104" aria-hidden="true" focusable="false">', i;
    for (i = 0; i < 5; i++) {
      var x = 6 + i * 64, h = 18 + i * 15, y = 100 - h;
      s += '<g class="cc-step' + (i === to ? " on" : "") + '">' +
        '<path d="M' + (x + 4) + " " + (y - 6) + "h" + 52 + "l4 6h-60z" + '" fill="#f6eedb" stroke="#8f7a52" stroke-width="1"/>' +
        '<rect x="' + x + '" y="' + y + '" width="60" height="' + h + '" fill="#e3d6b6" stroke="#7a6640" stroke-width="1.2"/>' +
        '<g transform="translate(' + (x + 17) + " " + (y + Math.max(0, h / 2 - 13)) + ') scale(.54)">' + emblemInner(i) + "</g></g>";
    }
    var pos = function (o) { return [36 + o * 64, 100 - (18 + o * 15) - 6]; };
    var a = pos(from), b = pos(to);
    s += '<g class="cc-ltok" style="transform: translate(' + a[0] + "px," + a[1] + 'px)" data-to="' + b[0] + "," + b[1] + '">' + tabletG(0, 0, 18, to === 4) + "</g>";
    return s + "</svg>";
  }

  /* --------------------------------------------------------------- Erase Away */
  function sponge() {
    return '<svg class="cc-sponge" viewBox="0 0 44 30" aria-hidden="true" focusable="false">' +
      '<rect x="2" y="4" width="40" height="22" rx="7" fill="#f2c94c" stroke="#8a6412" stroke-width="1.6"/>' +
      '<rect x="2" y="4" width="40" height="8" rx="5" fill="#3f8a5a" stroke="#1f5a34" stroke-width="1.4"/>' +
      '<g fill="#c99a22"><circle cx="11" cy="17" r="1.8"/><circle cx="19" cy="21" r="1.3"/><circle cx="27" cy="16.5" r="1.6"/><circle cx="34" cy="21" r="1.9"/><circle cx="15" cy="23" r="1"/><circle cx="30" cy="23.4" r="1"/></g></svg>';
  }

  /* --------------------------------------------------------- the key ring */
  function keyG(state, label) {
    var c = state === "done" ? "#f0bb4c" : state === "miss" ? "#8b8f97" : state === "on" ? "#ffe39a" : "#c08a3a";
    var d = state === "done" ? "#7a4e10" : state === "miss" ? "#4a4e56" : "#6a4410";
    return '<g class="cc-key ' + (state || "") + '">' +
      '<circle cx="0" cy="10" r="9" fill="' + c + '" stroke="' + d + '" stroke-width="2"/><circle cx="0" cy="10" r="3.6" fill="#13244a" stroke="' + d + '" stroke-width="1.4"/>' +
      '<rect x="-2.6" y="18" width="5.2" height="40" rx="1.5" fill="' + c + '" stroke="' + d + '" stroke-width="1.6"/>' +
      '<path d="M2.6 44h7v5h-4v4h4v5h-7z" fill="' + c + '" stroke="' + d + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      (label ? '<text x="0" y="78" text-anchor="middle" font-family="Alegreya Variable, Georgia, serif" font-weight="700" font-size="13" fill="#f8ecd0" transform="rotate(0)">' + esc(label) + "</text>" : "") +
      "</g>";
  }
  /* states: ["done" | "miss" | "on" | ""] one per verb */
  function ring(states) {
    var nk = states.length, s = '<svg class="cc-ring" viewBox="0 0 320 124" aria-hidden="true" focusable="false">';
    s += '<circle cx="160" cy="34" r="25" fill="none" stroke="#6a4410" stroke-width="8"/><circle cx="160" cy="34" r="25" fill="none" stroke="#e2a93c" stroke-width="4.6"/>';
    s += '<path d="M141 18a25 25 0 0 1 22-9" fill="none" stroke="#ffe39a" stroke-width="2" stroke-linecap="round"/>';
    states.forEach(function (st, i) {
      var spread = Math.min(42, 12 * (nk - 1)), a = nk === 1 ? 0 : -spread + 2 * spread * i / (nk - 1);
      s += '<g class="cc-keyw" style="transform: translate(160px, 34px) rotate(' + n(-a) + 'deg) translate(0px, 18px)">' + keyG(st) + "</g>";
    });
    return s + "</svg>";
  }
  function key() { return '<svg class="cc-key1" viewBox="-12 -2 24 64" aria-hidden="true" focusable="false">' + keyG("done") + "</svg>"; }

  /* ---------------------------------------------------- small icons for buttons */
  function scroll() {
    return '<svg class="cc-ic" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + EMB[3] + "</svg>";
  }
  function keyRing() {
    return '<svg class="cc-ic" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="13" r="9" fill="none" stroke="#6a4410" stroke-width="4.4"/><circle cx="24" cy="13" r="9" fill="none" stroke="#e2a93c" stroke-width="2.4"/>' +
      '<g transform="translate(24 18) rotate(28) scale(.5)">' + keyG("done") + '</g><g transform="translate(24 18) rotate(-24) scale(.5)">' + keyG("") + "</g></svg>";
  }
  /* a printer, for the Senate roll's Print button */
  function printer() {
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 3.5h8.6L18 5.9V8H7z" opacity=".55"/>' +
      '<path fill="currentColor" d="M5 8.6h14a2.5 2.5 0 0 1 2.5 2.5v5.4a1.5 1.5 0 0 1-1.5 1.5h-2V15H6v3H4a1.5 1.5 0 0 1-1.5-1.5v-5.4A2.5 2.5 0 0 1 5 8.6zm12.6 2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z"/>' +
      '<path fill="currentColor" d="M7 16h10v4.5H7z" opacity=".55"/><path fill="currentColor" d="M8.6 17.4h6.8v.9H8.6zm0 1.5h4.6v.8H8.6z"/></svg>';
  }
  function spongeIc() {
    return '<svg class="cc-ic" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="4" y="6" width="40" height="30" rx="4" fill="#2f3b36" stroke="#8a5a32" stroke-width="3"/><path d="M11 16h16M11 23h10" stroke="#f3efe6" stroke-width="2" stroke-linecap="round" opacity=".85"/>' +
      '<g transform="translate(20 26) rotate(-12)"><rect x="0" y="0" width="22" height="13" rx="4" fill="#f2c94c" stroke="#8a6412" stroke-width="1.4"/><rect x="0" y="0" width="22" height="5" rx="3" fill="#3f8a5a"/></g></svg>';
  }

  root.ClimbArt = {
    logo: logo, emblem: emblem, emblemInner: emblemInner, hill: hill, ladder: ladder, tablet: tablet, sponge: sponge,
    ring: ring, key: key, scroll: scroll, keyRing: keyRing, spongeIc: spongeIc, printer: printer, wreath: wreath, NAMES: NAMES
  };
})(typeof window !== "undefined" ? window : this);
