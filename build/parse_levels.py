"""Parse the HSK 1, 2, 3, 6 word lists (MandarinBean) -> build/raw2/level{n}.json.
usage: parse_levels.py <raw2_dir>"""
import json, os, re, sys

RAW = sys.argv[1]
CJK = re.compile(r"[一-鿿]")
POS_TOK = re.compile(r"^[\s、,，/()（）]*(?:(?:noun|verb|adjective|adverb|auxiliary|classifier|measure word|preposition|conjunction|pronoun|numeral|number|"
                     r"interjection|particle|onomatopoeia|phrase|idiom|prefix|suffix|modal verb|proper noun|time|"
                     r"[名动形副量介连代数助叹拟声成语短前后缀词组]+)[\s、,，/()（）]*)+$", re.I)


def lines_of(name):
    out = []
    for ln in open(os.path.join(RAW, name + ".txt"), encoding="utf-8"):
        s = ln.strip()
        if not s or s.startswith("=====PAGE") or s in ("MandarinBean.com", ">>") or re.match(r"^Page \d+$", s) \
                or re.match(r"^Level \d$", s) or s.startswith("⇨"):
            continue
        out.append(s)
    return out


def parse_new(name, expected):
    ls = lines_of(name)
    i = ls.index("TRANSLATION") + 1
    ls = ls[i:]
    entries, cur, n = [], None, 1
    i = 0
    while i < len(ls):
        s = ls[i]
        if s == str(n) and i + 1 < len(ls) and CJK.search(ls[i + 1]):
            cur = {"no": n, "hanzi": ls[i + 1], "pinyin": ls[i + 2], "rest": []}
            entries.append(cur); n += 1; i += 3; continue
        cur["rest"].append(s); i += 1
    for e in entries:
        pos, tr = [], []
        for s in e.pop("rest"):
            (pos if not tr and POS_TOK.match(s) else tr).append(s)
        e["pos_raw"] = " ".join(pos)
        e["english"] = re.sub(r"\s+", " ", " ".join(tr)).strip()
    assert len(entries) == expected, (name, len(entries))
    return entries


def parse_l1():
    ls = lines_of("HSK-1-Vocabulary")
    ls = ls[ls.index("English") + 1:]
    entries, n, i, cat = [], 1, 0, ""
    while i < len(ls):
        s = ls[i]
        if s == str(n) and i + 1 < len(ls) and CJK.search(ls[i + 1]):
            entries.append({"no": n, "hanzi": ls[i + 1], "pinyin": ls[i + 2], "english": "", "pos_raw": cat}); n += 1; i += 3; continue
        if entries and not entries[-1]["english"] and not s.isdigit():
            entries[-1]["english"] = s
        elif not s.isdigit():
            cat = s                 # category headers ("Personal Pron.", "Verbs", ...)
            if entries and entries[-1]["english"] and not re.search(r"(Pron|Nouns?|Verbs?|Adj|Adv|Numerals?|Measure|Conj|Prep|Particles?|Interj|Auxiliary|Time|Other)", s, re.I):
                entries[-1]["english"] += " " + s; cat = entries[-1]["pos_raw"]
        i += 1
    assert len(entries) == 150, len(entries)
    return entries


out = {1: parse_l1(), 2: parse_new("New-HSK-Vocabulary-Level-2", 200), 3: parse_new("New-HSK-Vocabulary-Level-3", 500),
       6: parse_new("New-HSK-Vocabulary-L6", 1800)}
for lv, es in out.items():
    json.dump(es, open(os.path.join(RAW, f"level{lv}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    odd = [e for e in es if not e["english"] or CJK.search(e["pinyin"]) or not re.search(r"[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]", e["pinyin"].lower())]
    print(f"L{lv}: {len(es)} entries, odd={len(odd)}", odd[:5])
    print("   POS values:", sorted({e['pos_raw'] for e in es})[:40])
