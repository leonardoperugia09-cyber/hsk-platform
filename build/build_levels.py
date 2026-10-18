"""Build the six independent level databases -> data/hsk{1..6}.json (+ data/levels_report.txt).

Inputs: build/raw2/level{1,2,3,6}.json (parsed MandarinBean lists), hsk4.json and hsk5.json (earlier build),
authored example sentences in build/authored/ex{n}.txt (hanzi|zh|en), CC-CEDICT + Jun Da frequencies via hanzipy.
usage: build_levels.py <project_dir>
"""
import json, logging, math, os, re, sys, collections
logging.disable(logging.CRITICAL)
import jieba
from pypinyin import lazy_pinyin, Style
from pypinyin.pinyin_dict import pinyin_dict
from hanzipy.dictionary import HanziDictionary
from hanzipy.decomposer import HanziDecomposer

P = sys.argv[1]
B = os.path.join(P, "build")
OUT = os.path.join(P, "data")
os.makedirs(OUT, exist_ok=True)
jieba.setLogLevel(logging.WARNING)
CJK = re.compile(r"[一-鿿]")
TONES = {"ā": "a", "á": "a", "ǎ": "a", "à": "a", "ē": "e", "é": "e", "ě": "e", "è": "e", "ī": "i", "í": "i", "ǐ": "i", "ì": "i",
         "ō": "o", "ó": "o", "ǒ": "o", "ò": "o", "ū": "u", "ú": "u", "ǔ": "u", "ù": "u", "ǖ": "ü", "ǘ": "ü", "ǚ": "ü", "ǜ": "ü",
         "ń": "n", "ň": "n", "ǹ": "n"}
strip = lambda s: "".join(TONES.get(c, c) for c in s)
SYL = set()
for v in pinyin_dict.values():
    for p in v.split(","):
        SYL.add(strip(p))
SYL |= {"r", "er", "ng", "n", "m", "hm"}


def syllabify(py, n_hanzi):
    """Split joined tone-marked pinyin into syllables (apostrophes/spaces/hyphens are hard breaks)."""
    chunks = [c for c in re.split(r"[\s'’\-]+", py.strip().lower()) if c]
    out = []
    for ch in chunks:
        base = strip(ch)
        best = {0: []}
        for i in range(1, len(base) + 1):            # DP: fewest syllables, prefer splits keeping a vowel in each
            cands = [best[j] + [(j, i)] for j in range(max(0, i - 6), i) if j in best and base[j:i] in SYL]
            if cands:
                best[i] = min(cands, key=len)
        if len(base) not in best:
            return None
        segs = best[len(base)]
        # erhua: a trailing 'r' glued to the previous syllable
        out += [ch[a:b] for a, b in segs]
    merged = []
    for s in out:
        if s == "r" and merged:
            merged[-1] += "r"
        else:
            merged.append(s)
    return merged


def join_syl(syl):
    o = ""
    for i, s in enumerate(syl):
        o += ("'" if i and strip(s)[0] in "aeo" else "") + s
    return o


POS_EN = {"noun": "n.", "verb": "v.", "adjective": "adj.", "adverb": "adv.", "auxiliary": "part.", "classifier": "mw.", "preposition": "prep.",
          "conjunction": "conj.", "pronoun": "pron.", "number": "num.", "numeral": "num.", "interjection": "interj.", "particle": "part.",
          "suffix": "suffix", "prefix": "prefix", "名": "n.", "动": "v.", "形": "adj.", "副": "adv.", "量": "mw.", "介": "prep.", "连": "conj.",
          "代": "pron.", "数": "num.", "助": "part.", "叹": "interj.", "拟声": "onom.", "后缀": "suffix",
          "personal pron.": "pron.", "demonstrative pron.": "pron.", "interrogative pron.": "pron."}


def norm_pos(raw, hanzi):
    if not raw.strip():
        return "phr." if len(hanzi) >= 3 else "v." if hanzi.startswith(("不", "只", "常")) else "adj."
    r = raw.lower().replace("（", "(").replace("）", ")")
    main = re.sub(r"\([^)]*\)", "", r)
    toks = re.findall(r"personal pron\.|demonstrative pron\.|interrogative pron\.|[a-z]+|拟声|后缀|[名动形副量介连代数助叹]", main) or \
        re.findall(r"[a-z]+|拟声|后缀|[名动形副量介连代数助叹]", r)
    seen = []
    for t in toks:
        p = POS_EN.get(t)
        if p and p not in seen:
            seen.append(p)
    return "/".join(seen) or "phr."


def norm_answer(s):
    s = s.lower().strip()
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9' \-/]", " ", s)
    s = re.sub(r"^(to|a|an|the)\s+", "", s.strip())
    return re.sub(r"\s+", " ", s).strip()


def accepted(english, extra=()):
    out = []
    for part in list(re.split(r"[;,/]", english)) + list(extra):
        for cand in (part, re.sub(r"\([^)]*\)", "", part)):
            a = norm_answer(cand)
            if a and a not in out and len(a) < 60:
                out.append(a)
    if not out:                                   # gloss is entirely in brackets, e.g. "(question particle)"
        a = norm_answer(english.replace("(", " ").replace(")", " "))
        if a:
            out.append(a)
    return out


# ------------------------------------------------------------------ manual fixes to the source lists
FIX = {
    (1, "的"): {"english": "of; 's (possessive / descriptive particle)"},
    (1, "了"): {"english": "(particle for a completed action or a change)"},
    (1, "吗"): {"english": "(question particle for yes/no questions)"},
    (1, "这 (这儿)"): {"hanzi": "这", "pinyin": "zhè", "english": "this; (这儿 zhèr) here"},
    (1, "那 (那儿)"): {"hanzi": "那", "pinyin": "nà", "english": "that; (那儿 nàr) there"},
    (1, "里"): {"pinyin": "lǐ"},
    (3, "子"): {"english": "(noun suffix)"},
    (3, "半天"): {"english": "half a day; a long time"},
    (6, "方方面面"): {"pinyin": "fāngfāngmiànmiàn", "pos_raw": "名"},
    (6, "时光"): {"pos_raw": "名", "english": "time; days; years"},
}


def load_new(lv):
    es = json.load(open(os.path.join(B, "raw2", f"level{lv}.json"), encoding="utf-8"))
    out = []
    for e in es:
        e = dict(e)
        e.update(FIX.get((lv, e["hanzi"]), {}))
        if e["pinyin"].endswith("-"):                       # pinyin wrapped into the translation column
            first, rest = e["english"].split(" ", 1)
            e["pinyin"] += first; e["english"] = rest
        e["hanzi"] = re.sub(r"\d+$", "", e["hanzi"]).strip()   # homograph numbering 局1 / 局2
        out.append(e)
    merged = collections.OrderedDict()
    for e in out:                                               # merge homograph senses into one entry
        if e["hanzi"] in merged:
            m = merged[e["hanzi"]]
            m["english"] += "; " + e["english"]; m["pos_raw"] += "、" + e["pos_raw"]; m["src_no"].append(e["no"])
        else:
            e["src_no"] = [e["no"]]; merged[e["hanzi"]] = e
    return list(merged.values())


def load_fixes(lv):
    """build/authored/fix{lv}.txt: hanzi|pos|english|pinyin  (empty field = keep source value)."""
    path = os.path.join(B, "authored", f"fix{lv}.txt")
    out = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8-sig"):
            if line.strip():
                p = [x.strip() for x in line.rstrip("\n").split("|")] + ["", "", ""]
                out[p[0]] = {"pos": p[1], "english": p[2], "pinyin": p[3]}
    return out


report = []
LEVELS = {}
for lv in (1, 2, 3, 6):
    es, words, fx = load_new(lv), [], load_fixes(lv)
    unused = set(fx) - {e["hanzi"] for e in es}
    if unused:
        report.append(f"L{lv} fixes for unknown words: {sorted(unused)}")
    for e in es:
        f = fx.get(e["hanzi"], {})
        if f.get("english"):
            e["english"] = f["english"]
        if f.get("pinyin"):
            e["pinyin"] = f["pinyin"]
        py = e["pinyin"].strip().replace("’", "'")
        h = e["hanzi"]
        nh = len(h) - (1 if h.endswith("儿") and len(h) > 1 and strip(py).replace(" ", "").endswith("r") and not strip(py).endswith("er") else 0)
        syl = syllabify(py, nh)
        if syl and h.endswith("儿") and len(syl) == len(h) - 1:
            nh = len(syl)
        if not syl or len(syl) != nh:
            report.append(f"L{lv} pinyin check failed: {h} {py} -> {syl}")
            syl = lazy_pinyin(h, style=Style.TONE)
        joined = join_syl(syl)
        ok = []
        auto = lazy_pinyin(h, style=Style.TONE)
        if len(auto) == len(syl) and [strip(a) for a in auto] == [strip(s) for s in syl] and auto != syl:
            ok.append(join_syl(auto))                      # citation-tone variant (e.g. neutral tones)
        words.append({"hanzi": h, "pinyin": joined, "pinyin_spaced": " ".join(syl), "pos": f.get("pos") or norm_pos(e.get("pos_raw", ""), h),
                      "english": e["english"].strip().rstrip(","), "accepted": accepted(e["english"]), "alt_readings": [],
                      "py_ok": ok, "example": None, "src_no": e["src_no"], "source_def": e["english"]})
    LEVELS[lv] = words

h4 = json.load(open(os.path.join(P, "hsk4.json"), encoding="utf-8"))
LEVELS[4] = []
for e in h4:
    syl = syllabify(e["pinyin"], len(e["hanzi"]))
    if not syl or len(syl) != len(e["hanzi"]):
        report.append(f"L4 pinyin check failed: {e['hanzi']} {e['pinyin']} -> {syl}")
        syl = lazy_pinyin(e["hanzi"], style=Style.TONE)
    auto = lazy_pinyin(e["hanzi"], style=Style.TONE)
    ok = [join_syl(auto)] if len(auto) == len(syl) and [strip(a) for a in auto] == [strip(s) for s in syl] and auto != syl else []
    LEVELS[4].append({"hanzi": e["hanzi"], "pinyin": join_syl(syl), "pinyin_spaced": " ".join(syl), "pos": "", "english": e["english"],
                      "accepted": accepted(e["english"]), "alt_readings": [], "py_ok": ok, "example": None, "src_no": [e["id"]],
                      "source_def": e["source_english"]})
h5 = json.load(open(os.path.join(P, "hsk5.json"), encoding="utf-8"))

# ------------------------------------------------------------------ authored part-of-speech for HSK 4 + example sentences
pos4_path = os.path.join(B, "authored", "pos4.txt")
if os.path.exists(pos4_path):
    p4 = dict(l.rstrip("\n").split("|", 1) for l in open(pos4_path, encoding="utf-8") if "|" in l)
    for w in LEVELS[4]:
        w["pos"] = p4.get(w["hanzi"], w["pos"])
for lv in (1, 2, 3, 4, 6):
    path = os.path.join(B, "authored", f"ex{lv}.txt")
    if not os.path.exists(path):
        continue
    ex = {}
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        if line.strip():
            parts = [p.strip() for p in line.rstrip("\n").split("|")]
            if len(parts) != 3:
                sys.exit(f"bad line ex{lv}.txt:{n}: {line}")
            ex[parts[0]] = {"zh": parts[1], "en": parts[2]}
    for w in LEVELS[lv]:
        if w["hanzi"] in ex:
            w["example"] = ex[w["hanzi"]]
    missing = [w["hanzi"] for w in LEVELS[lv] if not w["example"]]
    report.append(f"L{lv}: example sentences {len(LEVELS[lv]) - len(missing)}/{len(LEVELS[lv])}" + (f" missing {missing[:20]}" if missing else ""))

# ------------------------------------------------------------------ sentence validation (only words from this level or below)
jieba.initialize()
allwords = {lv: {w["hanzi"] for w in LEVELS[lv]} for lv in (1, 2, 3, 4, 6)}
allwords[5] = {w["hanzi"] for w in h5}
FUNC = set("的了吗呢吧啊们个是在有不没和也都很就还要会能想说去来到给对从为把被让比跟着过得地么这那哪谁什怎几多少一二三四五六七八九十百千万两上下里外前后中大小好") | set("儿子头") | set("王李张刘陈")
# The New HSK 2/3 lists assume their own level 1, which was not supplied (HSK 1 here is the 150-word HSK 2.0 list),
# so from level 2 up, the core HSK 2.0 level 1-3 words are treated as known.
BASIC = set(open(os.path.join(B, "authored", "hsk123.txt"), encoding="utf-8").read().split())
PAIRED = {"越", "一边", "又", "既", "一面", "有的", "要么"}       # patterns that need the word twice (越…越…, 一边…一边…)
for lv in (1, 2, 3, 4, 6):
    below = set().union(*[allwords[k] for k in range(1, lv + 1)]) | (BASIC if lv >= 2 else set())
    higher = set().union(*[allwords[k] for k in range(lv + 1, 7)]) - below
    chars_ok = set("".join(below)) | FUNC
    for w in below | higher:
        if len(w) > 1:
            jieba.add_word(w)
    bad = []
    for w in LEVELS[lv]:
        if not w["example"]:
            continue
        zh, h = w["example"]["zh"], w["hanzi"]
        if zh.count(h) != 1 and not (h in PAIRED and zh.count(h) == 2):
            bad.append(f"{h}\ttarget count {zh.count(h)}\t{zh}"); continue
        rest = zh.replace(h, "□")
        rest = re.sub(r"([每一这那两三四五六七八九十几])个人", r"\1个 人", rest).replace("说的话", "说的 话")
        bc = sorted({c for c in rest if CJK.match(c) and c not in chars_ok})
        bw = sorted({t for t in jieba.lcut(rest, HMM=False) if t in higher and len(t) > 1})
        if bc or bw:
            bad.append(f"{h}\tchars={''.join(bc)} higher={bw}\t{zh}")
    open(os.path.join(B, "raw2", f"sentence_issues_{lv}.txt"), "w", encoding="utf-8").write("\n".join(bad))
    report.append(f"L{lv}: sentence issues {len(bad)}")

# ------------------------------------------------------------------ sentence pinyin (same heuristics as the HSK 5 build)
sys.path.insert(0, B)
from sentence_pinyin import sentence_pinyin  # noqa: E402

# ------------------------------------------------------------------ ranking (general frequency; HSK 5 keeps its test-based rank)
def gen_freq(w):
    f = jieba.get_FREQ(w)
    if not f:
        parts = [jieba.get_FREQ(t) or 1 for t in jieba.lcut(w, HMM=False)]
        f = max(1, int(min(parts) * 0.05))
    return f


HD, DEC = HanziDictionary(), HanziDecomposer()
WPY = {}
for lv in (1, 2, 3, 4, 6):
    for w in LEVELS[lv]:
        WPY.setdefault(w["hanzi"], w["pinyin"])
for w in h5:
    WPY.setdefault(w["hanzi"], w["pinyin"])

final = {}
for lv in (1, 2, 3, 4, 6):
    ws = LEVELS[lv]
    for w in ws:
        w["freq"] = gen_freq(w["hanzi"])
    mx = max(w["freq"] for w in ws)
    for w in ws:
        w["priority"] = round(math.log1p(w["freq"]) / math.log1p(mx), 4)
        w["tests_count"] = None
        if w["example"]:
            w["example"]["py"] = sentence_pinyin(w["example"]["zh"], w["hanzi"], w["pinyin"], WPY)
    ws.sort(key=lambda w: (-w["priority"], w["hanzi"]))
    for i, w in enumerate(ws):
        w["id"] = w["rank"] = i + 1
    final[lv] = ws
final[5] = [{**{k: w[k] for k in ("id", "rank", "hanzi", "pinyin", "pinyin_spaced", "pos", "english", "accepted", "alt_readings", "py_ok",
                                   "example", "tests_count", "freq", "priority", "source_def")}, "src_no": []} for w in h5]

# ------------------------------------------------------------------ characters per level
TONE_NUM = {}
for base, marks in (("a", "āáǎà"), ("e", "ēéěè"), ("i", "īíǐì"), ("o", "ōóǒò"), ("u", "ūúǔù"), ("ü", "ǖǘǚǜ")):
    for t, m in enumerate(marks, 1):
        TONE_NUM[m] = (base, t)


def to_num(py):
    """'zhèng' -> 'zheng4', 'de' -> 'de5'"""
    t, out = 5, ""
    for ch in py.lower():
        if ch in TONE_NUM:
            b, t = TONE_NUM[ch]; out += b
        else:
            out += ch
    return out.rstrip("r") + str(t) if out.endswith("r") and len(out) > 2 and not out.endswith("er") else out + str(t)


BAD_SENSE = re.compile(r"^(surname|old variant|variant of|archaic|Japanese|CL:|used in|abbr\. for|see |\(Cantonese|\(dialect|\(old\)|\(literary\)|"
                       r"\d+(st|nd|rd|th) (earthly branch|heavenly stem)|.*(earthly branch|heavenly stem))", re.I)
STOPW = {"to", "the", "a", "an", "of", "and", "or", "in", "on", "for", "be", "sth", "sb", "one's", "with"}


def cedict(c, readings, glosses):
    ents = HD.definition_lookup(c) or []
    want = {to_num(r) for r in readings}
    gl = {t for g in glosses for t in re.findall(r"[a-z]+", g.lower()) if t not in STOPW}
    best, best_score = "", None
    for idx, e in enumerate(ents):
        senses = [s.strip() for s in e["definition"].split("/") if s.strip()]
        good = [s for s in senses if not BAD_SENSE.match(s)]
        if not good:
            continue
        p = e["pinyin"].lower().replace("u:", "ü")
        toks = {t for s in good for t in re.findall(r"[a-z]+", s.lower()) if t not in STOPW}
        score = (p in want, len(toks & gl), not e["pinyin"][0].isupper(), len(good), -idx)
        if best_score is None or score > best_score:
            best_score, best = score, "; ".join(good[:3])[:90]
    return best


cumulative = set()
for lv in range(1, 7):
    ws = final[lv]
    cnt, readings, inwords = collections.Counter(), collections.defaultdict(collections.Counter), collections.defaultdict(list)
    for w in ws:
        syl = w["pinyin_spaced"].split()
        chars = [c for c in w["hanzi"] if CJK.match(c)]
        if w["hanzi"].endswith("儿") and len(syl) == len(chars) - 1:
            chars = chars[:-1]
        for c in set(w["hanzi"]):
            if CJK.match(c):
                cnt[c] += 1; inwords[c].append(w["hanzi"])
        if len(syl) == len(chars):
            for c, s in zip(chars, syl):
                readings[c][s.rstrip("r") if s.endswith("r") and not strip(s).endswith("er") else s] += 1
    rows = []
    for c, n in cnt.items():
        try:
            fr = HD.get_character_frequency(c)
        except Exception:
            fr = None
        try:
            jrank = int(fr["number"]) if isinstance(fr, dict) else 9999
        except Exception:
            jrank = 9999
        rd = [r for r, _ in readings[c].most_common()] or [lazy_pinyin(c, style=Style.TONE)[0]]
        CITATION = {"一": "yī", "不": "bù"}                     # words show tone-sandhi forms (yí / yì / bú)
        if c in CITATION:
            rd = [CITATION[c]] + [r for r in rd if r != CITATION[c]]
        toned = {strip(r) for r in rd if r != strip(r)}
        rd = [r for r in rd if r != strip(r) or strip(r) not in toned] or rd   # drop neutral-tone duplicates (ren vs rén)
        try:
            dec = DEC.decompose(c, 2)
            comps = [x for x in dec.get("components", []) if x != "No glyph available"]
        except Exception:
            comps = []
        try:
            rad = DEC.decompose(c, 3).get("components", [])
        except Exception:
            rad = []
        glosses = [w["english"] for w in ws if c in w["hanzi"]]
        rows.append({"char": c, "pinyin": rd[:3], "meaning": cedict(c, rd[:1], glosses),"components": comps, "words": sorted(inwords[c], key=lambda h: next(w["rank"] for w in ws if w["hanzi"] == h))[:12],
                     "word_count": n, "freq_rank": jrank, "new": c not in cumulative})
    mxc = max(r["word_count"] for r in rows)
    for r in rows:
        r["score"] = round(0.6 * math.log1p(r["word_count"]) / math.log1p(mxc) + 0.4 * (1 - math.log(min(r["freq_rank"], 9999)) / math.log(9999)), 4)
    rows.sort(key=lambda r: (-r["score"], r["freq_rank"]))
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    cumulative |= set(cnt)
    meta = {"level": lv,
            "syllabus": "HSK 2.0 (2010)" if lv in (1, 4, 5) else "New HSK list (MandarinBean)",
            "source": {1: "HSK-1-Vocabulary.pdf (MandarinBean)", 2: "New-HSK-Vocabulary-Level-2.pdf (MandarinBean)", 3: "New-HSK-Vocabulary-Level-3.pdf (MandarinBean)",
                       4: "HSK-4-Vocabulary.pdf (MandarinBean)", 5: "HSK 2.0 Level 5 Vocabulary List (HanziStroke) + MandarinBean cross-check", 6: "New-HSK-Vocabulary-L6.pdf (MandarinBean)"}[lv],
            "ranking": "practice-test occurrences (75%) + general frequency (25%)" if lv == 5 else "general word frequency (jieba dictionary)",
            "word_count": len(ws), "char_count": len(rows), "new_char_count": sum(r["new"] for r in rows),
            "examples": sum(1 for w in ws if w["example"])}
    json.dump({"meta": meta, "words": ws, "chars": rows}, open(os.path.join(OUT, f"hsk{lv}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    report.append(f"HSK {lv}: {meta['word_count']} words, {meta['char_count']} characters ({meta['new_char_count']} not in lower levels), {meta['examples']} examples — {meta['syllabus']}")

# ------------------------------------------------------------------ overlap report
sets = {lv: {w["hanzi"] for w in final[lv]} for lv in range(1, 7)}
report.append("\nWords that appear in more than one level file:")
for a in range(1, 7):
    for b in range(a + 1, 7):
        o = sets[a] & sets[b]
        if o:
            report.append(f"  HSK {a} ∩ HSK {b}: {len(o)}  e.g. {' '.join(sorted(o)[:12])}")
open(os.path.join(OUT, "levels_report.txt"), "w", encoding="utf-8").write("\n".join(report))
print("\n".join(report))
