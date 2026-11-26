#!/usr/bin/env python3
"""Builds latin-common/js/words.js, the word list of Climb to Consul (and of any later Latin game).

Input: the curriculum file wheelock-vocabulary-by-grade.json (Wheelock's Latin, 7th edition, as the
Hillsdale K-12 schools split it into grades), kept in the project files. Run:

    python3 build_words.py path/to/wheelock-vocabulary-by-grade.json ../js/words.js

What it adds to the source entries:
- American spelling of the English (the source cards are Canadian: rumour, neighbour).
- ask: the English used when the game asks for the Latin. It is a meaning no other word of the grade has,
  so a question never has two right answers.
- same: other words of the grade that share a meaning, so they are never offered as each other's wrong choice.
- der: English derivatives, shown as a helper after a miss (only for the chapters marked ready).
- takes: the case a preposition (or causā) is used with.
- trick: principal parts that do not follow their conjugation's regular pattern.
- drill: false for entries the rounds leave out (category "form", entries added from general knowledge).
"""
import json, re, sys, unicodedata

SRC, OUT = sys.argv[1], sys.argv[2]
GRADES = (6, 8)
READY = {1, 2, 3, 18, 19, 20, 21, 22}

US = [("rumour", "rumor"), ("neighbour", "neighbor"), ("favour", "favor"), ("labour", "labor"),
      ("honour", "honor"), ("colour", "color"), ("valour", "valor"), ("humour", "humor"), ("vapour", "vapor"),
      ("behaviour", "behavior"), ("armour", "armor"), ("odour", "odor"), ("ardour", "ardor"),
      ("endeavour", "endeavor"), ("savour", "savor"), ("judgement", "judgment"), ("defence", "defense"),
      ("offence", "offense"), ("centre", "center"), ("theatre", "theater"), ("travelled", "traveled"),
      ("travelling", "traveling"), ("counsellor", "counselor")]

def us(s):
    for a, b in US:
        s = re.sub(a, b, s)
        s = re.sub(a.capitalize(), b.capitalize(), s)
    return s

# English derivatives (helpers after a miss). Chapters 1-3 and 18-22.
DER = {
    "mē": "", "quid": "quid pro quo", "nihil": "nihilism, annihilate", "saepe": "", "sī": "",
    "nōn": "nonsense, nonstop", "amō": "amateur, amiable", "dō": "data, date",
    "cōgitō": "cogitate", "laudō": "laud, laudable", "servō": "preserve, reservoir",
    "vocō": "vocation, invoke, provoke", "dēbeō": "debt, debit, due, duty",
    "moneō": "admonish, monitor, premonition", "salveō": "salvation, salvage",
    "videō": "video, vision, visible, evident", "terreō": "terrify, terror, deter",
    "valeō": "valid, value, valor, prevail, valedictorian", "errō": "err, error, erratic",
    "cōnservō": "conserve, conservation",
    "fāma": "fame, famous, infamous", "fōrma": "form, formal, uniform, reform",
    "fortūna": "fortune, fortunate", "īra": "ire, irate", "nauta": "nautical",
    "patria": "patriot, patriotic", "pecūnia": "pecuniary, impecunious",
    "philosophia": "philosophy, philosopher", "poena": "pain, penalty, penal, subpoena",
    "poēta": "poet, poetry", "porta": "portal, porch", "puella": "", "rosa": "rose, rosy",
    "sententia": "sentence, sentiment", "vīta": "vital, vitamin, revitalize",
    "antīquus": "antique, antiquity", "magnus": "magnify, magnitude, magnificent",
    "meus": "", "multus": "multitude, multiply", "tuus": "", "et": "et cetera (etc.)",
    "et... et": "", "est": "", "sine": "sinecure", "sed": "", "Ō": "",
    "ager": "agriculture, agrarian", "agricola": "agriculture", "amīcus": "amicable, amity",
    "fēmina": "feminine, female", "fīlia": "filial, affiliate", "fīlius": "filial, affiliate", "numerus": "number, numeral, numerous",
    "populus": "popular, population, people", "puer": "puerile", "sapientia": "sapient, Homo sapiens",
    "vir": "virtue, triumvirate", "avārus": "avarice", "paucī": "paucity", "Rōmānus": "Roman, romance",
    "dē": "", "in": "", "hodiē": "", "semper": "Semper Fidelis", "habeō": "habit, inhabit, exhibit",
    "satiō": "satiate, insatiable",
    "flūmen": "flume", "genus": "genus, gender, generation, general", "hostis": "hostile, hostility",
    "hostēs": "hostile, hostility", "lūdus": "ludicrous, interlude, prelude", "probitās": "probity",
    "scientia": "science, scientific", "clārus": "clarity, clarify, declare",
    "mortālis": "mortal, mortality", "cūr": "", "deinde": "", "fluō": "fluid, fluent, flux, influence",
    "legō": "legend, lecture, legible, elect, select", "misceō": "mix, mixture, miscellaneous",
    "moveō": "move, motion, motive, mobile", "videor": "video, vision",
    "argūmentum": "argument", "auctor": "author, authority", "beneficium": "benefit, beneficial",
    "familia": "family, familiar", "Graecia": "Greece, Grecian", "iūdex": "judge, judicial",
    "iūdicium": "judgment, prejudice", "scelus": "", "quis? quid?": "quid pro quo",
    "quī? quae? quod?": "", "certus": "certain, certify, ascertain",
    "gravis": "grave, gravity, aggravate, grief", "immortālis": "immortal, immortality",
    "at": "", "nisi": "", "contrā": "contrary, contrast, contradict", "iam": "",
    "dēlectō": "delectable, delight", "līberō": "liberate, liberation, liberty",
    "parō": "prepare, preparation, apparatus, repair",
    "coniūrātī": "conjure", "cornū": "cornucopia, unicorn, cornet", "frūctus": "fruit, fructose",
    "genū": "genuflect", "manus": "manual, manuscript, manufacture, manicure",
    "metus": "meticulous", "mōns": "mount, mountain, amount, surmount", "senātus": "senate, senator",
    "sēnsus": "sense, sensation, sensitive", "servitūs": "servitude",
    "spīritus": "spirit, inspire, respiration", "versus": "verse, version",
    "commūnis": "common, community, communicate", "dexter": "dexterity, ambidextrous",
    "sinister": "sinister", "careō": "caret", "dēfendō": "defend, defense, defendant",
    "discēdō": "", "ōdī": "odious, odium", "prohibeō": "prohibit, prohibition",
    "prōnūntiō": "pronounce, pronunciation, announce",
    "casa": "casino (Italian for 'little house')", "causa": "cause, because, accuse, excuse", "causā": "cause, because",
    "fenestra": "defenestrate", "fīnis": "final, finish, finite, infinite, define",
    "fīnēs": "confines", "gēns": "gentle, gentile, gentry", "mundus": "mundane",
    "nāvis": "naval, navy, navigate", "salūs": "salute, salutation", "Trōia": "Trojan",
    "vīcīnus": "vicinity", "vīcīna": "vicinity", "vulgus": "vulgar, Vulgate",
    "asper": "asperity, exasperate", "atque": "", "iterum": "reiterate",
    "contineō": "contain, content, continent, continue", "iubeō": "jussive",
    "labōrō": "labor, laboratory, laborious, collaborate", "rapiō": "rapid, rapture, rapacious",
    "relinquō": "relinquish, relic", "sciō": "science, conscience, omniscient",
    "tangō": "tangent, tangible, contact, intact",
    "diēs": "diary, dial, diurnal", "ferrum": "ferrous, farrier", "fidēs": "fidelity, confide, confidence",
    "ignis": "ignite, ignition, igneous", "modus": "mode, model, moderate, modify",
    "rēs": "real, reality", "rēs pūblica": "republic, republican", "spēs": "despair, desperate",
    "aequus": "equal, equator, equity", "fēlīx": "felicity", "incertus": "incertitude",
    "Latīnus": "Latin", "medius": "medium, median, intermediate, Mediterranean",
    "quondam": "quondam", "ultrā": "ultraviolet, ultrasound", "prōtinus": "",
    "cernō": "discern, concern, discreet", "ēripiō": "", "inquit": "", "tollō": "extol",
}

# The case each preposition takes (Wheelock lists it in the vocabulary), and causā with its genitive.
TAKES = {
    "sine": "abl", "dē": "abl", "in": "abl", "propter": "acc", "post": "acc", "ad": "acc", "ex": "abl",
    "contrā": "acc", "ultrā": "acc", "prae": "abl", "causā": "gen",
}
# sub takes both, with a different meaning for each; the two source cards split it.
SUB = {"sub (+abl., with verbs of rest)": "abl", "sub (+acc., with verbs of motion)": "acc"}

# English asked for when no single meaning of the word is its own (two words share every meaning).
ASK = {
    ("18", "hostis"): "an enemy (one person)",
    ("18", "hostēs"): "the enemy (as a group)",
    ("21", "vīcīnus"): "neighbor (a man)",
    ("21", "vīcīna"): "neighbor (a woman)",
    ("1", "nihil"): "nothing",
    ("4", "nihil"): "nothing",
    ("2", "tuus"): "your (of one person)",
    ("6", "vester"): "your (of more than one person)",
    ("3", "sapientia"): "wisdom",
    ("2", "et"): "and",
    ("19", "at"): "but, mind you",
    ("3", "vir"): "man, hero",
    ("3", "puer"): "boy",
    ("3", "paucī"): "few, a few",
    ("19", "quī? quae? quod?"): "what? which? what kind of?",
    ("19", "auctor"): "author, originator",
    ("22", "modus"): "measure, manner, method",
}
# Corrections to the source cards, from the independent Latin review of 2026-11-25 against Wheelock's
# 7th edition (the curriculum's own vocabulary notes flag vulgus and ōdī as well).
FIX = {
    ("21", "vulgus"): {"lat": "vulgus, vulgī, n. (sometimes m.)", "g": "n"},
    ("20", "ōdī"): {"lat": "ōdī, ōdisse, ōsūrum (defective verb)", "pp": ["ōdī", "ōdisse", "ōsūrum"], "trick": True},
    ("20", "frūctus"): {"mean": "fruit; profit, benefit, enjoyment"},
    ("2", "poena"): {"mean": "penalty, punishment; pay the penalty (poenās dare)"},
    ("1", "salveō"): {"mean": "be well, be in good health; hello, greetings (salvē / salvēte)"},
    ("1", "valeō"): {"mean": "be strong, have power; be well; good-bye, farewell (valē / valēte)"},
    ("1", "amō"): {"mean": "love, like; please (amābō tē)"},
    ("18", "hostis"): {"mean": "an enemy (of the state)"},
    ("2", "porta"): {"mean": "gate, entrance"},
    ("3", "in"): {"as": "preposition"},
    ("19", "contrā"): {"lat": "contrā (prep. + acc.)"},
}
# Other spellings a typed answer may use.
ALT = {"ex (or) ē": ["ex", "ē"], "atque (or ac)": ["atque", "ac"], "quis? quid?": ["quis"],
       "quī? quae? quod?": ["quī"]}
# Words that are one word in two entries: never each other's wrong choice.
SAME_EXTRA = [("hostis", "hostēs"), ("fīnis", "fīnēs"), ("causa", "causā"), ("vīcīnus", "vīcīna"),
              ("rapiō", "ēripiō"), ("gēns", "vulgus"), ("līberō", "careō"), ("inquit", "ait"), ("littera", "litterae"),
              ("et", "et... et")]

def strip_marks(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def slug(s):
    s = strip_marks(s).lower()
    s = re.sub(r"[^a-z]+", "-", s).strip("-")
    return s or "x"

def norm_sense(s):
    s = re.sub(r"\(.*?\)", "", s).strip().lower()
    s = re.sub(r"^(the|a|an|to|be) ", "", s)
    return s.strip(" .!?…")

def senses(meaning):
    return [x.strip() for x in re.split(r"[;,]", meaning) if x.strip()]

REGULAR = {
    "1": ("ō", ["āre", "āvī", "ātum"]),
    "2": ("eō", ["ēre", "uī", "itum"]),
    "4": ("iō", ["īre", "īvī", "ītum"]),
}

def is_trick(e):
    pp = e.get("principalParts") or []
    if len(pp) != 4:
        return False
    conj = e.get("conjugation", "")
    if conj in REGULAR:
        end1, rest = REGULAR[conj]
        if not pp[0].endswith(end1):
            return True
        base = pp[0][: -len(end1)]
        return [base + r for r in rest] != pp[1:]
    if conj.startswith("3"):
        return True   # third conjugation perfects and supines have to be learned one by one
    return True

def adj_forms(e):
    lat = re.sub(r"\(in-certus\)", "", e["latin"]).strip()
    if "(gen.)" in lat:
        g = lat.split("(gen.)")[1].strip()
        return {"gen": g}
    if "?" in lat:   # quī? quae? quod?
        return {"forms": [p.strip() for p in lat.split("?") if p.strip()][1:]}
    parts = [p.strip() for p in re.split(r",", lat) if p.strip()]
    return {"forms": parts[1:]}

def main():
    data = json.load(open(SRC, encoding="utf-8"))
    out = {"grades": {}, "chapters": {}, "words": []}
    for g in data["grades"]:
        if g["grade"] not in GRADES:
            continue
        out["grades"][str(g["grade"])] = {"course": g["course"], "chapters": g["chapters"]}
        gw = []
        for c in g["chapterDetail"]:
            out["chapters"][str(c["chapter"])] = {"grade": g["grade"], "title": c["title"],
                                                  "month": c.get("monthOnHillsdalePlan"),
                                                  "ready": c["chapter"] in READY}
            seen = set()
            for e in c["entries"]:
                hw = e["headword"]
                lat = e["latin"]
                key = lat if lat in SUB else hw
                ident = "%02d-%s" % (c["chapter"], slug(hw if lat not in SUB else lat))
                while ident in seen:
                    ident += "-2"
                seen.add(ident)
                flags = e.get("flags", [])
                w = {"id": ident, "ch": c["chapter"], "lat": us(lat), "hw": hw, "pos": e["category"],
                     "as": e["partOfSpeechAsListed"], "mean": us(e["meanings"])}
                drill = e["category"] != "form" and "addedFromGeneralKnowledge" not in flags
                if not drill:
                    w["drill"] = False
                if "pluralOnlyOrPluralMeaning" in flags:
                    w["plural"] = True
                rep = [f for f in flags if f.startswith("repeatsChapter")]
                if rep:
                    w["repeats"] = int(rep[0][len("repeatsChapter"):])
                if e["category"] == "noun":
                    w["g"] = e.get("gender", "")
                    if e.get("genitive"):
                        w["gen"] = e["genitive"]
                    w["decl"] = e.get("declension", "")
                if e["category"] == "verb":
                    w["pp"] = e.get("principalParts") or [hw]
                    w["conj"] = e.get("conjugation", "")
                    if is_trick(e):
                        w["trick"] = True
                if e["category"] == "adjective":
                    w.update(adj_forms(e))
                    w["type"] = e.get("adjectiveType", "")
                    if hw == "paucī":
                        w["type"] = "1st/2nd declension, plural"
                t = SUB.get(lat) or TAKES.get(hw)
                if t and (e["category"] == "preposition" or hw in ("ultrā", "causā")):
                    w["takes"] = t
                if lat in ALT:
                    w["alt"] = ALT[lat]
                if c["chapter"] in READY:
                    der = DER.get(hw)
                    if der is None:
                        print("no derivative entry for", c["chapter"], hw, file=sys.stderr)
                    elif der:
                        w["der"] = der
                w.update(FIX.get((str(c["chapter"]), hw), {}))
                gw.append(w)
        # meanings shared inside the grade
        sens = {w["id"]: {norm_sense(s) for s in senses(w["mean"])} - {""} for w in gw}
        byhw = {}
        for w in gw:
            byhw.setdefault(w["hw"], []).append(w["id"])
        extra = {}
        for a, b in SAME_EXTRA:
            for ia in byhw.get(a, []):
                for ib in byhw.get(b, []):
                    extra.setdefault(ia, set()).add(ib)
                    extra.setdefault(ib, set()).add(ia)
        for w in gw:
            same = {o["id"] for o in gw if o is not w and o["pos"] == w["pos"] and sens[w["id"]] & sens[o["id"]]}
            same |= extra.get(w["id"], set())
            same = sorted(same)
            if same:
                w["same"] = same
            others = set()
            for o in same:
                others |= sens[o]
            own = [s for s in senses(w["mean"]) if norm_sense(s) and norm_sense(s) not in others]
            ask = ASK.get((str(w["ch"]), w["hw"]))
            if not ask:
                ask = ", ".join(own[:2]) if own else None
            if not ask:
                ask = w["mean"]
                if w["ch"] in READY and w.get("drill", True):
                    print("NO OWN MEANING", w["ch"], w["hw"], w["mean"], same, file=sys.stderr)
            w["ask"] = us(ask)
            if w["ch"] in READY and w.get("drill", True) and same:
                print("same", w["ch"], w["hw"], "->", same, "| ask:", w["ask"], file=sys.stderr)
        out["words"].extend(gw)
    js = ("/* The words of Wheelock's Latin (7th edition) for the grades the games cover, as Hillsdale K-12\n"
          " * schools split them. Built by latin-common/tools/build_words.py from the project's\n"
          " * wheelock-vocabulary-by-grade.json. Do not edit by hand: change the script and build again. */\n"
          "window.LATIN_WORDS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    js = js.replace('},{"id"', '},\n{"id"')
    open(OUT, "w", encoding="utf-8").write(js)
    print("words:", len(out["words"]), "bytes:", len(js.encode()), file=sys.stderr)

main()
