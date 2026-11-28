#!/usr/bin/env python3
"""Builds latin-common/css/players.css: the look of the players screens (players-fallback.js) on a page
that does not load common.css, such as the site's front page, where the players are picked.

Every rule is copied from common.css, so the screens look the same as in the games, and scoped:
inside the container `.lp` (the screens) and `.lpf-cf` (the confirm box, which goes on <body>), so the
page's own `.btn`, `h2` or `.soon` and these rules cannot change each other. Rerun after changing the
buttons, parchment cards, dialogs or `.lpf-*` rules in common.css:

    python3 build_players_css.py ../css/common.css ../css/players.css
"""
import re, sys

src, out = sys.argv[1], sys.argv[2]
css = open(src, encoding="utf-8").read()
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

def blocks(text):
    """top-level items: (prelude, body) with nested braces kept in body"""
    i, n, items = 0, len(text), []
    while i < n:
        j = text.find("{", i)
        if j < 0:
            break
        pre = text[i:j].strip()
        depth, k = 1, j + 1
        while depth and k < n:
            if text[k] == "{":
                depth += 1
            elif text[k] == "}":
                depth -= 1
            k += 1
        items.append((pre, text[j + 1:k - 1]))
        i = k
    return items

WANT = re.compile(r"^\.(btn|tlink|card|lpf|sr\b|nw\b|dlg|scrim|ic\b)")
SKIP = re.compile(r"\.(sheet|card-tab|tabbed|bottom|chip)\b|\.dlg-x")
BOTH = re.compile(r"^\.(btn|tlink|sr\b|nw\b|ic\b)")

def scope(sel):
    parts = []
    for p in [x.strip() for x in sel.split(",")]:
        if not WANT.match(p) or SKIP.search(p):
            continue
        if p.startswith(".dlg") or p.startswith(".scrim"):
            head, _, rest = p.partition(" ")
            if head in (".dlg", ".scrim") or head.startswith(".dlg:") or head.startswith(".dlg."):
                parts.append(head + ".lpf-cf" + (" " + rest if rest else ""))
            else:
                parts.append(".lpf-cf " + p)
        else:
            parts.append(".lp " + p)
            if BOTH.match(p):
                parts.append(".lpf-cf " + p)
    return ", ".join(parts)

def rules(items):
    res = []
    for pre, body in items:
        if pre.startswith("@keyframes"):
            name = pre.split()[1]
            if name in ("fade-in", "dlg-in"):
                res.append("%s {%s}" % (pre, body))
            continue
        if pre.startswith("@"):
            inner = rules(blocks(body))
            if inner:
                res.append(pre + " {\n  " + "\n  ".join(inner) + "\n}")
            continue
        s = scope(pre)
        if s:
            res.append(s + " { " + " ".join(x.strip() for x in body.strip().splitlines()) + " }")
    return res

root = re.search(r":root\s*\{(.*?)\}", css, re.S).group(1)
tokens = " ".join(x.strip() for x in root.strip().splitlines())

head = """/* latin-common/css/players.css: the players screens on a page without common.css (the site's front page).
 * Built by tools/build_players_css.py from common.css, every rule scoped to .lp (the screens) or .lpf-cf
 * (the confirm box). Do not edit by hand: change common.css and rebuild. */

.lp, .lpf-cf { %s }
.lp, .lpf-cf { font: 500 16px/1.45 var(--f-ui); color: var(--cream); }
.lpf-cf { color: var(--ink); }
.lp *, .lp *::before, .lp *::after, .lpf-cf, .lpf-cf * { box-sizing: border-box; }
.lp h2, .lp h3, .lp p, .lpf-cf h2, .lpf-cf p { margin: 0; }
.lp button, .lp input, .lpf-cf button { margin: 0; font: inherit; color: inherit; }
.lp button, .lpf-cf button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.lp [hidden], .lpf-cf [hidden] { display: none !important; }
.lp svg, .lpf-cf svg { display: block; }
.lp b, .lpf-cf b { font-weight: 800; }
.lp i { font-family: var(--f-serif); font-style: italic; font-size: 1.08em; }
.lp :focus, .lpf-cf :focus { outline: none; }
.lp :focus-visible, .lpf-cf :focus-visible { outline: 3px solid #ffe08a; outline-offset: 2px; box-shadow: 0 0 0 7px rgba(7, 13, 31, .92); }
/* a page's own .btn may set a background, a shadow or a padding: start from none */
.lp .btn, .lpf-cf .btn { background: none; box-shadow: none; }
@media (prefers-reduced-motion: reduce) {
  .lp *, .lp *::before, .lp *::after, .lpf-cf, .lpf-cf * { animation-duration: .01ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition: none !important; }
}

""" % tokens

open(out, "w", encoding="utf-8").write(head + "\n".join(rules(blocks(css))) + "\n")
print("players.css:", len(rules(blocks(css))), "rules")
