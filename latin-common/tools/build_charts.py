#!/usr/bin/env python3
"""Builds latin-common/js/charts.js, the charts of Row the Endings, and checks every form.

Forms are not typed here: they are read from the tables of section 7 ("Paradigm charts in Wheelock's
layout") of the project's hillsdale-latin-curriculum.md, which were checked cell by cell against the
official Wheelock GrammarQuick card, the University of Victoria 7th-edition pages and Wiktionary.
Two charts have cells that section does not print as a word: nauta (declined like porta, the
porta endings on the base naut-) and the interrogative quis, quid (singular from the section's own
line on it, plural = the relative quī, quae, quod, as that line says). Those cells are marked "pattern"
and get an independent Latin review.

    python3 build_charts.py path/to/hillsdale-latin-curriculum.md ../js/charts.js
"""
import json, re, sys

SRC, OUT = sys.argv[1], sys.argv[2]
text = open(SRC, encoding="utf-8").read()
sec = text[text.index("## 7. Paradigm charts"):text.index("## 8. ")]

# ---------------------------------------------------------------- read the reference tables
tables = {}
title = None
lines = sec.split("\n")
i = 0
while i < len(lines):
    ln = lines[i]
    m = re.match(r"^\*\*(.+?)\*\*", ln)
    if m:
        title = m.group(1)
    if ln.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[-| ]+\|$", lines[i + 1]):
        head = [c.strip() for c in ln.strip("|").split("|")]
        rows = []
        j = i + 2
        block = ""
        while j < len(lines) and lines[j].startswith("|"):
            cells = [c.strip() for c in lines[j].strip("|").split("|")]
            if cells[0].startswith("*") and all(not c for c in cells[1:]):
                block = cells[0].strip("*")
            else:
                rows.append((block, cells[0], cells[1:]))
            j += 1
        key = title or ("table@%d" % i)
        n = 2
        while key in tables:
            key = "%s #%d" % (title, n)
            n += 1
        tables[key] = {"head": head[1:], "rows": rows}
        i = j
        continue
    i += 1

def T(prefix):
    hits = [k for k in tables if k.startswith(prefix)]
    if len(hits) != 1:
        raise SystemExit("table %r: %r" % (prefix, hits))
    return tables[hits[0]]

def col(t, colprefix, block=None, labels=None):
    """{(block, rowlabel): form} for the column whose header starts with colprefix"""
    idx = [k for k, h in enumerate(t["head"]) if h.startswith(colprefix)]
    if len(idx) != 1:
        raise SystemExit("column %r in %r" % (colprefix, t["head"]))
    k = idx[0]
    return {(b, r): cells[k] for b, r, cells in t["rows"]
            if (block is None or b == block) and (labels is None or r in labels)}

# ---------------------------------------------------------------- chart model
CASES = [("nom", "Nom.", "nominative"), ("gen", "Gen.", "genitive"), ("dat", "Dat.", "dative"),
         ("acc", "Acc.", "accusative"), ("abl", "Abl.", "ablative"), ("voc", "Voc.", "vocative")]
PERSONS = [("1s", "1st sg.", "first person singular", "Sg. 1"), ("2s", "2nd sg.", "second person singular", "Sg. 2"),
           ("3s", "3rd sg.", "third person singular", "Sg. 3"), ("1p", "1st pl.", "first person plural", "Pl. 1"),
           ("2p", "2nd pl.", "second person plural", "Pl. 2"), ("3p", "3rd pl.", "third person plural", "Pl. 3")]

def cell(form, src, stem=None, given=False, alts=None):
    """stem: the part shown at the first step; the rest is the ending the player gives"""
    c = {"f": form, "src": src}
    if stem is not None:
        if not form.startswith(stem):
            raise SystemExit("stem %r does not start %r" % (stem, form))
        c["s"] = stem
        c["e"] = form[len(stem):]
    if given:
        c["given"] = True
    if alts:
        c["alts"] = alts
    return c

def noun_chart(cid, ch, title, sub, words, vocab_default, note=None):
    """words: list of dicts {w, entry, gloss, forms: {(block,label): form}, base, src, given_labels}"""
    blocks = []
    for bname, blabel in (("Singular", "Singular"), ("Plural", "Plural")):
        rows = []
        for key, lab, name in CASES:
            cells = []
            have = True
            for wd in words:
                f = wd["forms"].get((bname, lab))
                if f is None:
                    have = False
                    break
                base = wd["base"]
                given = f and not f.startswith(base)
                cells.append(cell(f, wd["src"], stem=(f if given else base), given=given))
            if not have:
                continue
            row = {"k": key + ("s" if bname == "Singular" else "p"), "label": lab,
                   "name": name + (" singular" if bname == "Singular" else " plural"), "cells": cells}
            if key == "voc":
                row["voc"] = True
            rows.append(row)
        blocks.append({"label": blabel, "cols": [{"w": wd["w"], "entry": wd["entry"], "gloss": wd["gloss"]} for wd in words],
                       "rows": rows})
    c = {"id": cid, "ch": ch, "kind": "noun", "title": title, "sub": sub, "blocks": blocks, "vocOn": vocab_default}
    if note:
        c["note"] = note
    return c

def verb_rows(forms_by_col, labels, bases, src, keys=PERSONS):
    rows = []
    for key, lab, name, reflab in keys:
        cells = [cell(forms_by_col[k][reflab], src, stem=bases[k]) for k in range(len(bases))]
        rows.append({"k": key, "label": lab, "name": name, "cells": cells})
    return rows

REF = "ref"        # read from a section 7 table, printed as that word there
PAT = "pattern"    # built from a section 7 table's endings, or from its text: independent review

charts = []

# ---- chapter 1: laudō and moneō, present active, imperatives, infinitive
pres = T("Present (Ch. 1, 8, 10)")
imp = T("table@")  if False else None
ipi = [t for k, t in tables.items() if t["head"][:1] == ["1st: laudō"] and any(r[1].startswith("Imperative sg.") for r in t["rows"])][0]
def vcol(t, c):
    return {r: v for (b, r), v in col(t, c).items()}
L, M, A, AU, C = "1st: laudō", "2nd: moneō", "3rd: agō", "4th: audiō", "3rd -iō: capiō"
VCOLS = {"laudō": (L, "laud", "laudō, laudāre, laudāvī, laudātum", "praise"),
         "moneō": (M, "mon", "moneō, monēre, monuī, monitum", "remind, advise, warn"),
         "agō": (A, "ag", "agō, agere, ēgī, āctum", "drive, lead, do"),
         "audiō": (AU, "aud", "audiō, audīre, audīvī, audītum", "hear"),
         "capiō": (C, "cap", "capiō, capere, cēpī, captum", "take")}

def verb_chart(cid, ch, title, sub, verbs, blocks_spec, note=None):
    cols = [{"w": v, "entry": VCOLS[v][2], "gloss": VCOLS[v][3]} for v in verbs]
    blocks = []
    for blabel, table, keys in blocks_spec:
        rows = []
        for key, lab, name, reflab in keys:
            cells = []
            for v in verbs:
                f = vcol(table, VCOLS[v][0])[reflab]
                cells.append(cell(f, REF, stem=VCOLS[v][1]))
            rows.append({"k": key, "label": lab, "name": name, "cells": cells})
        blocks.append({"label": blabel, "cols": cols, "rows": rows})
    c = {"id": cid, "ch": ch, "kind": "verb", "title": title, "sub": sub, "blocks": blocks}
    if note:
        c["note"] = note
    return c

IMPV = [("imps", "Sg.", "imperative singular", "Imperative sg. (Ch. 1, 8, 10)"),
        ("impp", "Pl.", "imperative plural", "Imperative pl.")]
INFA = [("inf", "Inf.", "present active infinitive", "Present active infinitive")]
INFP = [("infp", "Inf.", "present passive infinitive", "Present passive infinitive (Ch. 18, 21)")]

charts.append(verb_chart("c01-present", 1, "laudō and moneō: the present", "Present active, with the imperative and the infinitive",
                         ["laudō", "moneō"],
                         [("Present active", pres, PERSONS), ("Imperative", ipi, IMPV), ("Infinitive", ipi, INFA)],
                         note="Personal endings: -ō, -s, -t, -mus, -tis, -nt. The present stem is the infinitive without -re: laudā-, monē-."))

# ---- chapter 2: porta with magna
t1 = T("First declension (Ch. 2)")
charts.append(noun_chart("c02-porta-magna", 2, "porta with magna", "First declension, with an adjective that agrees",
    [{"w": "porta", "entry": "porta, portae, f.", "gloss": "gate", "forms": col(t1, "porta"), "base": "port", "src": REF},
     {"w": "magna", "entry": "magnus, magna, magnum", "gloss": "large, great", "forms": col(t1, "magna"), "base": "magn", "src": REF}],
    True, note="The base is the genitive singular without its ending: portae, port-."))

# ---- chapter 3: amīcus magnus; puer, ager; nauta magnus
t2 = T("Second declension, masculine (Ch. 3)")
tadj = T("First and second declension adjective")
magnus_m = col(tadj, "Masculine")
charts.append(noun_chart("c03-amicus-magnus", 3, "amīcus magnus", "Second declension, with magnus",
    [{"w": "amīcus", "entry": "amīcus, amīcī, m.", "gloss": "friend", "forms": col(t2, "amīcus"), "base": "amīc", "src": REF},
     {"w": "magnus", "entry": "magnus, magna, magnum", "gloss": "large, great", "forms": magnus_m, "base": "magn", "src": REF}],
    True, note="Nouns and adjectives in -us have a vocative singular in -e: amīce magne."))
charts.append(noun_chart("c03-puer-ager", 3, "puer and ager", "Second declension nouns in -er",
    [{"w": "puer", "entry": "puer, puerī, m.", "gloss": "boy", "forms": col(t2, "puer"), "base": "puer", "src": REF},
     {"w": "ager", "entry": "ager, agrī, m.", "gloss": "field, farm", "forms": col(t2, "ager"), "base": "agr", "src": REF}],
    True, note="puer keeps its e (puerī), ager drops it (agrī). The genitive shows which."))
porta_end = col(t1, "endings")
nauta = {k: "naut" + v.lstrip("-") for k, v in porta_end.items()}
charts.append(noun_chart("c03-nauta-magnus", 3, "nauta magnus", "A first declension noun that is masculine",
    [{"w": "nauta", "entry": "nauta, nautae, m.", "gloss": "sailor", "forms": nauta, "base": "naut", "src": PAT},
     {"w": "magnus", "entry": "magnus, magna, magnum", "gloss": "large, great", "forms": magnus_m, "base": "magn", "src": REF}],
    True, note="An adjective agrees in gender, number and case, not in its ending: nauta is masculine, so magnus."))

# ---- chapter 18: laudō and moneō, present system passive
pp = T("Present passive (Ch. 18, 21)")
ip = T("Imperfect passive (Ch. 18, 21)")
fp = T("Future passive (Ch. 18, 21)")
charts.append(verb_chart("c18-present-passive", 18, "laudō and moneō: present passive", "Present passive, with the passive infinitive",
                         ["laudō", "moneō"], [("Present passive", pp, PERSONS), ("Infinitive", ipi, INFP)],
                         note="Passive endings: -r, -ris, -tur, -mur, -minī, -ntur."))
charts.append(verb_chart("c18-imperfect-passive", 18, "laudō and moneō: imperfect passive", "Imperfect passive: -bā- and the passive endings",
                         ["laudō", "moneō"], [("Imperfect passive", ip, PERSONS)]))
charts.append(verb_chart("c18-future-passive", 18, "laudō and moneō: future passive", "Future passive: -bō-, -bi-, -bu- and the passive endings",
                         ["laudō", "moneō"], [("Future passive", fp, PERSONS)],
                         note="Watch the second singular: laudāberis, monēberis."))

# ---- chapter 19: perfect passive system of laudō; quis, quid
tpp = T("table@") if False else [t for k, t in tables.items() if t["head"][:3] == ["Perfect passive", "Pluperfect passive", "Future perfect passive"]][0]
rows = []
for key, lab, name, reflab in PERSONS:
    cells = []
    for c_i, h in enumerate(["Perfect passive", "Pluperfect passive", "Future perfect passive"]):
        ref = vcol(tpp, h)[reflab]                     # "laudātus, -a, -um sum"
        m = re.match(r"^(laudāt(?:us|ī)), -(a|ae), -(um|a) (\w+)$", ref)
        if not m:
            raise SystemExit("perfect passive cell %r" % ref)
        part, aux = m.group(1), m.group(4)
        sg = part.endswith("us")
        fem, neu = ("laudāta", "laudātum") if sg else ("laudātae", "laudāta")
        f = part + " " + aux
        cells.append(cell(f, REF, stem=part + " ", alts=[fem + " " + aux, neu + " " + aux, ref]))
    rows.append({"k": key, "label": lab, "name": name, "cells": cells})
charts.append({"id": "c19-perfect-passive", "ch": 19, "kind": "verb", "title": "laudō: the perfect passive system",
               "sub": "The participle laudātus, -a, -um with sum, eram, erō",
               "blocks": [{"label": "Perfect passive system", "cols": [{"w": "perfect", "entry": "laudātus sum", "gloss": "I was praised, I have been praised"},
                                                                    {"w": "pluperfect", "entry": "laudātus eram", "gloss": "I had been praised"},
                                                                    {"w": "future perfect", "entry": "laudātus erō", "gloss": "I shall have been praised"}],
                           "rows": rows}],
               "note": "The participle agrees with the subject: laudātus (a man), laudāta (a woman), laudātum (a thing); plural laudātī, laudātae, laudāta. Any of them is right here."})

rel = T("Relative pronoun quī, quae, quod")
line = [l for l in sec.split("\n") if l.startswith("Interrogative pronoun (Ch. 19)")][0]
# "singular quis (m./f.), quid (n.), cuius, cui, quem / quid, quō"
assert "quis (m./f.), quid (n.), cuius, cui, quem / quid, quō" in line, line
qs_mf = {"nom": "quis", "gen": "cuius", "dat": "cui", "acc": "quem", "abl": "quō"}
qs_n = {"nom": "quid", "gen": "cuius", "dat": "cui", "acc": "quid", "abl": "quō"}
lab = {k: l for k, l, n in CASES}
def qrow(key, block, vals):
    name = dict((k, n) for k, l, n in CASES)[key] + (" singular" if block == "Singular" else " plural")
    return {"k": key + ("s" if block == "Singular" else "p"), "label": lab[key], "name": name,
            "cells": [cell(v, s, stem="") for v, s in vals]}
sg_rows = [qrow(k, "Singular", [(qs_mf[k], PAT), (qs_n[k], PAT)]) for k in ["nom", "gen", "dat", "acc", "abl"]]
relp = {g: col(rel, g, block="Plural") for g in ("Masculine", "Feminine", "Neuter")}
pl_rows = [qrow(k, "Plural", [(relp[g][("Plural", lab[k])], REF) for g in ("Masculine", "Feminine", "Neuter")])
           for k in ["nom", "gen", "dat", "acc", "abl"]]
charts.append({"id": "c19-quis-quid", "ch": 19, "kind": "pronoun", "title": "quis, quid", "sub": "The interrogative pronoun: who? what?",
               "blocks": [{"label": "Singular", "cols": [{"w": "M. and F.", "entry": "quis", "gloss": "who?"}, {"w": "N.", "entry": "quid", "gloss": "what?"}], "rows": sg_rows},
                          {"label": "Plural", "cols": [{"w": "M.", "entry": "quī", "gloss": "who?"}, {"w": "F.", "entry": "quae", "gloss": "who?"}, {"w": "N.", "entry": "quae", "gloss": "what?"}], "rows": pl_rows}],
               "note": "The plural is the same as the relative pronoun quī, quae, quod."})

# ---- chapter 20: frūctus, cornū
t4 = T("Fourth declension (Ch. 20)")
def add_voc(forms):
    f = dict(forms)
    f[("Singular", "Voc.")] = forms[("Singular", "Nom.")]
    f[("Plural", "Voc.")] = forms[("Plural", "Nom.")]
    return f
charts.append(noun_chart("c20-fructus-cornu", 20, "frūctus and cornū", "Fourth declension",
    [{"w": "frūctus", "entry": "frūctus, frūctūs, m.", "gloss": "fruit", "forms": add_voc(col(t4, "frūctus")), "base": "frūct", "src": REF},
     {"w": "cornū", "entry": "cornū, cornūs, n.", "gloss": "horn", "forms": add_voc(col(t4, "cornū")), "base": "corn", "src": REF}],
    False, note="Most fourth declension nouns are masculine like frūctus; the few neuters end in -ū like cornū."))

# ---- chapter 21: agō, audiō, capiō, present system passive
charts.append(verb_chart("c21-present-passive", 21, "agō, audiō, capiō: present passive", "Present passive, with the passive infinitive",
                         ["agō", "audiō", "capiō"], [("Present passive", pp, PERSONS), ("Infinitive", ipi, INFP)],
                         note="The third conjugation's passive infinitive drops the -er-: agī, capī; the fourth keeps -īrī: audīrī."))
charts.append(verb_chart("c21-imperfect-passive", 21, "agō, audiō, capiō: imperfect passive", "Imperfect passive",
                         ["agō", "audiō", "capiō"], [("Imperfect passive", ip, PERSONS)]))
charts.append(verb_chart("c21-future-passive", 21, "agō, audiō, capiō: future passive", "Future passive",
                         ["agō", "audiō", "capiō"], [("Future passive", fp, PERSONS)],
                         note="Second singular: agēris (future) against ageris (present); only the long ē tells them apart."))

# ---- chapter 22: rēs, diēs
t5 = T("Fifth declension (Ch. 22)")
charts.append(noun_chart("c22-res-dies", 22, "rēs and diēs", "Fifth declension",
    [{"w": "rēs", "entry": "rēs, reī, f.", "gloss": "thing, matter", "forms": add_voc(col(t5, "rēs")), "base": "r", "src": REF},
     {"w": "diēs", "entry": "diēs, diēī, m.", "gloss": "day", "forms": add_voc(col(t5, "diēs")), "base": "di", "src": REF}],
    False, note="The e of the genitive and dative singular is long after a vowel (diēī) and short after a consonant (reī)."))

# ---------------------------------------------------------------- checks
problems = 0
count = 0
for c in charts:
    for b in c["blocks"]:
        for r in b["rows"]:
            if len(r["cells"]) != len(b["cols"]):
                print("row width", c["id"], r["k"]); problems += 1
            for ce in r["cells"]:
                count += 1
                if not ce["f"] or "(" in ce["f"] or "-" in ce["f"]:
                    print("odd form", c["id"], r["k"], ce); problems += 1
                if "s" in ce and ce["s"] + ce["e"] != ce["f"]:
                    print("split", c["id"], ce); problems += 1
# vocative rule: equal to nominative except -us (voc -e) and -ius (voc -ī)
for c in charts:
    if c["kind"] != "noun":
        continue
    for b in c["blocks"]:
        rows = {r["k"][:-1]: r for r in b["rows"]}
        if "voc" in rows:
            for k, (n, v) in enumerate(zip(rows["nom"]["cells"], rows["voc"]["cells"])):
                nf, vf = n["f"], v["f"]
                second = b["cols"][k]["w"] in ("amīcus", "magnus")   # second declension in -us
                want = nf[:-2] + "e" if (b["label"] == "Singular" and second) else nf
                if vf != want:
                    print("vocative", c["id"], b["label"], nf, vf); problems += 1
print("charts:", len(charts), "cells:", count, "problems:", problems, file=sys.stderr)
if problems:
    sys.exit(1)

js = ("/* The charts of Row the Endings, in Wheelock's layout and order. Built by latin-common/tools/build_charts.py\n"
      " * from section 7 of the project's Hillsdale Latin curriculum reference (forms checked against the\n"
      " * Wheelock GrammarQuick card and the 7th-edition exercise pages). Do not edit by hand.\n"
      " * cell: f = the form, s + e = f (s shown at the first step, e is the ending to give), given = shown at\n"
      " * every step but the last, alts = other right answers, src = ref (read from the reference) or pattern. */\n"
      "window.LATIN_CHARTS = " + json.dumps({"charts": charts}, ensure_ascii=False, separators=(",", ":")) + ";\n")
js = js.replace('},{"id":"c', '},\n{"id":"c')
open(OUT, "w", encoding="utf-8").write(js)
