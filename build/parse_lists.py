"""Parse the three vocabulary PDFs' text dumps into raw JSON + cross-check report."""
import json, re, sys, os

raw = sys.argv[1]
CJK = re.compile(r"^[一-鿿（）()…/，,·\s]+$")
HAS_CJK = re.compile(r"[一-鿿]")


def parse_hanzistroke(path):
    lines = []
    for ln in open(path, encoding="utf-8"):
        s = ln.strip()
        if not s or s.startswith("=====PAGE") or s.startswith("HSK 2.0 Level 5 Vocabulary") \
           or re.match(r"^Page \d+ / \d+$", s) or s in ("Word", "Pinyin", "Definition") \
           or s.startswith("hanzistroke.com"):
            continue
        lines.append(s)
    # skip cover page
    start = next(i for i, s in enumerate(lines) if s == "哎")
    lines = lines[start:]
    entries, cur, i = [], None, 0
    while i < len(lines):
        s = lines[i]
        if HAS_CJK.search(s) and CJK.match(s) and i + 1 < len(lines) and not HAS_CJK.search(lines[i + 1]) \
                and not lines[i + 1].startswith("("):
            cur = {"hanzi": s, "pinyin_spaced": lines[i + 1], "def_raw": "", "alt": []}
            entries.append(cur)
            target = cur
            i += 2
            continue
        if s.startswith("also:"):
            target = {"pinyin": s[5:].strip(), "def_raw": ""}
            cur["alt"].append(target)
            i += 1
            continue
        target["def_raw"] = (target["def_raw"] + " " + s).strip()
        i += 1
    return entries


def parse_mandarinbean(path):
    lines = [ln.strip() for ln in open(path, encoding="utf-8")]
    lines = [s for s in lines if s and not s.startswith("=====PAGE")]
    start = lines.index("English") + 1
    lines = lines[start:]
    entries, i, expect = [], 0, 1
    while i < len(lines):
        s = lines[i]
        if s == str(expect) and i + 1 < len(lines) and HAS_CJK.search(lines[i + 1]):
            e = {"no": expect, "hanzi": lines[i + 1], "rest": []}
            entries.append(e)
            expect += 1
            i += 2
            continue
        if s in ("No.", "Chinese", "Pinyin", "English") or (s.isdigit() and not entries[-1]["rest"] is None and
                                                             s == str(len(entries) // 1) and False):
            i += 1
            continue
        entries[-1]["rest"].append(s)
        i += 1
    out = []
    for e in entries:
        rest = [r for r in e["rest"]]
        # drop stray page numbers (a lone number right before a header block)
        py = rest[0] if rest else ""
        en = " ".join(rest[1:])
        out.append({"no": e["no"], "hanzi": e["hanzi"], "pinyin": py, "english": en, "rest": rest})
    return out


hs = parse_hanzistroke(os.path.join(raw, "HSK5-Vocabulary-2.0.txt"))
mb5 = parse_mandarinbean(os.path.join(raw, "HSK-5-Vocabulary.txt"))
mb4 = parse_mandarinbean(os.path.join(raw, "HSK-4-Vocabulary.txt"))
print("hanzistroke", len(hs), "mb5", len(mb5), "mb4", len(mb4))
json.dump(hs, open(os.path.join(raw, "hs5_raw.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(mb5, open(os.path.join(raw, "mb5_raw.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(mb4, open(os.path.join(raw, "mb4_raw.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)

# sanity
for e in hs:
    if not e["def_raw"].startswith("(") or not e["pinyin_spaced"]:
        print("HS odd:", e)
for e in mb5 + mb4:
    if len(e["rest"]) != 2:
        print("MB odd:", e)
print("alt entries:", [(e["hanzi"], e["pinyin_spaced"], [a["pinyin"] for a in e["alt"]]) for e in hs if e["alt"]])
