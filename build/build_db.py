"""Assemble hsk5.json / hsk4.json from the parsed lists, the authored clean-up files and the OCR'd tests.

usage: build_db.py <build_dir> <out_dir>
"""
import json, os, re, sys, math, glob, collections, logging
import jieba
from pypinyin import lazy_pinyin, Style

jieba.setLogLevel(logging.WARNING)
B, OUT = sys.argv[1], sys.argv[2]
RAW, AUTH = os.path.join(B, "raw"), os.path.join(B, "authored")
load = lambda p: json.load(open(p, encoding="utf-8"))

hs = load(os.path.join(RAW, "hs5_raw.json"))
mb5 = load(os.path.join(RAW, "mb5.json"))
mb4 = load(os.path.join(RAW, "mb4.json"))

# ---------------------------------------------------------------- pinyin
VOWELS = "aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ"
PY_FIX = {  # spaced-pinyin corrections to the HanziStroke source
    "唉": "āi", "不见得": "bú jiàn dé", "动画片": "dòng huà piàn", "划": "huá", "欧洲": "ōu zhōu",
    "下载": "xià zài", "嗯": "ǹg", "脑袋": "nǎo dai", "佩服": "pèi fu", "委屈": "wěi qu",
    "苗条": "miáo tiao", "学问": "xué wen", "打交道": "dǎ jiāo dao",
}
PY_OK_EXTRA = {  # extra accepted readings (joined pinyin)
    "唉": ["ài"], "不见得": ["bújiànde"], "动画片": ["dònghuàpiān"], "下载": ["xiàzǎi"],
    "嗯": ["ńg", "ňg", "en", "èn", "ng"], "哎": ["ài"], "哈": ["hā"],
    "脑袋": ["nǎodài"], "佩服": ["pèifú"], "委屈": ["wěiqū"], "苗条": ["miáotiáo"],
    "学问": ["xuéwèn"], "打交道": ["dǎjiāodào"], "教训": ["jiàoxùn"], "老婆": ["lǎopó"],
    "力量": ["lìliàng"], "位置": ["wèizhì"], "周到": ["zhōudào"], "似的": ["shìde", "sìde"],
    "的确": ["díquè"], "结实": ["jiēshí"], "逻辑": ["luójí"], "模糊": ["móhú"], "糊涂": ["hútú"],
    "老实": ["lǎoshí"], "粮食": ["liángshí"], "合同": ["hétóng"], "胡同": ["hútong"],
    "大方": ["dàfāng"], "地道": ["dìdào"], "答应": ["dāyìng"], "称呼": ["chēnghū"],
    "打听": ["dǎtīng"], "耽误": ["dānwù"], "点心": ["diǎnxīn"], "规矩": ["guījǔ"],
    "讲究": ["jiǎngjiū"], "戒指": ["jièzhǐ"], "玻璃": ["bōlí"], "抽屉": ["chōutì"],
    "豆腐": ["dòufǔ"], "眉毛": ["méimáo"], "小气": ["xiǎoqì"], "孝顺": ["xiàoshùn"],
    "应付": ["yìngfù"], "运气": ["yùnqì"], "在乎": ["zàihū"], "尾巴": ["wěibā", "yǐba"],
    "舍不得": ["shěbudé"], "怪不得": ["guàibudé"], "打喷嚏": ["dǎpēnti"], "血": ["xuě"],
    "精神": ["jīngshen"], "成分": ["chéngfen"], "太太": ["tàitài"], "姑姑": ["gūgū"],
    "舅舅": ["jiùjiù"], "姥姥": ["lǎolǎo"], "姑娘": ["gūniáng"], "石头": ["shítóu"],
    "木头": ["mùtóu"], "骨头": ["gǔtóu"], "馒头": ["mántóu"],
}
ALT = {  # cleaned alternate readings
    "背": [("bēi", "to carry on one's back")],
    "冲": [("chòng", "towards; strong (smell); forceful")],
    "划": [("huà", "to delimit; to plan (as in 计划); stroke of a character")],
    "圈": [("juàn", "pen; fold (for animals)"), ("juān", "to pen in; to shut in")],
    "数": [("shù", "number; figure")],
    "吐": [("tǔ", "to spit; to say")],
    "系": [("jì", "to tie; to fasten (系领带)")],
    "血": [("xiě", "blood (colloquial reading)")],
    "涨": [("zhàng", "to swell; to be bloated")],
}


def join_py(spaced, hanzi=""):
    syl = spaced.split()
    if hanzi.endswith("儿") and len(syl) > 1 and syl[-1] in ("er", "r"):
        syl = syl[:-2] + [syl[-2] + "r"]
    out = syl[0] if syl else ""
    for s in syl[1:]:
        out += ("'" if s[0] in "aeoāáǎàēéěèōóǒò" else "") + s
    return out.lower()


# ---------------------------------------------------------------- authored clean-up
auth = {}
order_extra = []
for path in sorted(glob.glob(os.path.join(AUTH, "h5_*.txt"))):
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        line = line.rstrip("\n")
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) != 6:
            sys.exit(f"bad line {path}:{n}: {line}")
        h, pos, en, acc, zh, tr = [p.strip() for p in parts]
        if h in auth:
            sys.exit(f"duplicate authored entry {h}")
        auth[h] = dict(pos=pos, english=en, extra=[a.strip() for a in acc.split(";") if a.strip()], zh=zh, en=tr)

for line in open(os.path.join(AUTH, "sentence_fixes.txt"), encoding="utf-8"):
    if line.strip():
        h, zh, tr = [p.strip() for p in line.rstrip("\n").split("|")]
        auth[h]["zh"], auth[h]["en"] = zh, tr

missing = [e["hanzi"] for e in hs if e["hanzi"] not in auth]
if missing:
    sys.exit(f"authored entries missing for: {missing}")
# 方式 is in MandarinBean (and the official list) but absent from HanziStroke
EXTRA_WORDS = [{"hanzi": "方式", "pinyin_spaced": "fāng shì", "alt": [], "source": "MandarinBean"}]


def norm_answer(s):
    s = s.lower().strip()
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9' \-/]", " ", s)
    s = re.sub(r"^(to|a|an|the)\s+", "", s.strip())
    return re.sub(r"\s+", " ", s).strip()


def accepted_list(english, extra):
    out = []
    for part in re.split(r"[;/]", english):
        for cand in (part, re.sub(r"\([^)]*\)", "", part)):
            a = norm_answer(cand)
            if a and a not in out:
                out.append(a)
    for x in extra:
        a = norm_answer(x)
        if a and a not in out:
            out.append(a)
    return out


mbp = {e["hanzi"]: e["pinyin"] for e in mb5}
strip_tone = lambda s: "".join({"ā": "a", "á": "a", "ǎ": "a", "à": "a", "ē": "e", "é": "e", "ě": "e", "è": "e",
                                "ī": "i", "í": "i", "ǐ": "i", "ì": "i", "ō": "o", "ó": "o", "ǒ": "o", "ò": "o",
                                "ū": "u", "ú": "u", "ǔ": "u", "ù": "u", "ǖ": "ü", "ǘ": "ü", "ǚ": "ü", "ǜ": "ü",
                                "ń": "n", "ň": "n", "ǹ": "n"}.get(c, c) for c in s)

words = []
for e in hs + EXTRA_WORDS:
    h = e["hanzi"]
    spaced = PY_FIX.get(h, e["pinyin_spaced"]).lower()
    if h.endswith("儿") and spaced.split()[-1] == "er":
        sp = spaced.split()
        spaced = " ".join(sp[:-2] + [sp[-2] + "r"])
    joined = join_py(spaced, h)
    a = auth[h]
    ok = list(PY_OK_EXTRA.get(h, []))
    # sandhi vs citation tone for leading 一 / 不
    if h[0] == "一":
        ok += [v + joined[2:] for v in ("yī", "yí", "yì") if v + joined[2:] != joined]
    if h[0] == "不" or "不" in h[1:2]:
        ok += [joined.replace("bú", "bù"), joined.replace("bù", "bú"), joined.replace("bu", "bù")]
    # MandarinBean spelling, when it only differs in tone marking
    m = mbp.get(h, "").lower().replace("’", "'")
    if m and m != joined and strip_tone(m).replace("'", "") == strip_tone(joined).replace("'", ""):
        ok.append(m)
    ok = [x for i, x in enumerate(ok) if x != joined and x not in ok[:i]]
    words.append({
        "hanzi": h, "pinyin": joined, "pinyin_spaced": spaced, "pos": a["pos"], "english": a["english"],
        "accepted": accepted_list(a["english"], a["extra"]),
        "alt_readings": [{"pinyin": p, "meaning": m} for p, m in ALT.get(h, [])],
        "py_ok": ok,
        "example": {"zh": a["zh"], "en": a["en"]},
        "source": e.get("source", "HanziStroke"),
        "source_def": e.get("def_raw", ""),
    })
H5 = [w["hanzi"] for w in words]
H5set = set(H5)

# ---------------------------------------------------------------- HSK 4
en4 = {}
for line in open(os.path.join(AUTH, "hsk4_en.txt"), encoding="utf-8"):
    if "=" in line:
        k, v = line.rstrip("\n").split("=", 1)
        en4[k.strip()] = v.strip()
hsk4 = []
for e in mb4:
    raw_h = e["hanzi"].strip()
    if raw_h not in en4:
        sys.exit(f"hsk4 english missing: {raw_h}")
    h = re.sub(r"\s*[（(].*?[)）]", "", raw_h).strip()
    hsk4.append({"id": e["no"], "hanzi": h, "pinyin": e["pinyin"].strip().lower(), "english": en4[raw_h],
                 "source_english": e["english"]})
H4 = [w["hanzi"] for w in hsk4]
H4set = set(H4)

# ---------------------------------------------------------------- sentence validation
h123 = set(open(os.path.join(AUTH, "hsk123.txt"), encoding="utf-8").read().split()) - H5set
allowed_words = h123 | H4set
allowed_chars = set("".join(allowed_words))
NAMES = set("王李张刘小明丽华京海美")
issues = []
jieba.initialize()
gen_freq = {}
for w in H5 + H4:
    f = jieba.get_FREQ(w)
    if not f:
        parts = [jieba.get_FREQ(t) or 1 for t in jieba.lcut(w, HMM=False)]
        f = max(1, int(min(parts) * 0.05))
    gen_freq[w] = f
for w in list(H5set | allowed_words):
    if len(w) > 1:
        jieba.add_word(w)
jieba.add_word("不小心")
jieba.del_word("心切")
CJK = re.compile(r"[一-鿿]")
for w in words:
    zh, h = w["example"]["zh"], w["hanzi"]
    if zh.count(h) != 1:
        issues.append((h, "target missing", zh))
        continue
    rest = zh.replace(h, "□")
    # known false positives: 每个人 / 一个人 (not 个人), 存+在, 写+作业, 换成+人民币, 的人+才, 不+安静
    rest = re.sub(r"([每一这那两三])个人", r"\1个 人", rest)
    for a, b in (("存在银行", "存 在银行"), ("写作业", "写 作业"), ("的人才有", "的人 才有"), ("不安静", "不 安静")):
        rest = rest.replace(a, b)
    bad_c = sorted({c for c in rest if CJK.match(c) and c not in allowed_chars and c not in NAMES})
    toks = [t for t in jieba.lcut(rest, HMM=False) if CJK.search(t)]
    bad_w = sorted({t for t in toks if t in H5set and t != h and len(t) > 1})
    sub_w = sorted({x for x in H5set if len(x) > 1 and x != h and x in rest and x not in bad_w
                    and not any(x in a for a in allowed_words if a in rest and len(a) > len(x))})
    single = sorted({t for t in toks if t in H5set and len(t) == 1 and t not in allowed_chars})
    if bad_c or bad_w or sub_w or single:
        issues.append((h, f"chars={''.join(bad_c)} hsk5={bad_w + sub_w + single}", zh))
with open(os.path.join(RAW, "sentence_issues.txt"), "w", encoding="utf-8") as f:
    for i in issues:
        f.write("\t".join(i) + "\n")
print(f"sentence issues: {len(issues)}")

# ---------------------------------------------------------------- example pinyin
wpy = {w["hanzi"]: w["pinyin"] for w in words}
wpy.update({w["hanzi"]: w["pinyin"] for w in hsk4})
NEUTRAL = dict(re.findall(r"(\S+?)=(.+?)(?=\s+\S+=|\s*$)", """东西=dōngxi 妻子=qīzi 时候=shíhou 喜欢=xǐhuan 妈妈=māma 爸爸=bàba 爷爷=yéye
奶奶=nǎinai 哥哥=gēge 姐姐=jiějie 弟弟=dìdi 妹妹=mèimei 朋友=péngyou 先生=xiānsheng 学生=xuésheng 衣服=yīfu
事情=shìqing 漂亮=piàoliang 便宜=piányi 告诉=gàosu 觉得=juéde 认识=rènshi 休息=xiūxi 明白=míngbai 清楚=qīngchu
舒服=shūfu 地方=dìfang 意思=yìsi 头发=tóufa 眼睛=yǎnjing 耳朵=ěrduo 晚上=wǎnshang 早上=zǎoshang 关系=guānxi
聪明=cōngming 月亮=yuèliang 故事=gùshi 名字=míngzi 客气=kèqi 记得=jìde 叔叔=shūshu 行李=xíngli 星星=xīngxing
看看=kànkan 谈谈=tántan 试试=shìshi 走走=zǒuzou 坐坐=zuòzuo 一下=yíxià 一个=yí gè 一次=yí cì 一位=yí wèi 一定=yídìng
一样=yíyàng 一共=yígòng 一切=yíqiè 一会儿=yíhuìr 一块=yí kuài 一件=yí jiàn 一半=yíbàn 一遍=yí biàn 一份=yí fèn
一起=yìqǐ 一直=yìzhí 一些=yìxiē 一边=yìbiān 一般=yìbān 一点儿=yìdiǎnr 一家=yì jiā 一条=yì tiáo 一种=yì zhǒng
一张=yì zhāng 一名=yì míng 一本=yì běn 一天=yì tiān 一年=yì nián 一把=yì bǎ 一只=yì zhī 一场=yì chǎng
一台=yì tái 一瓶=yì píng 一篇=yì piān 一所=yì suǒ 一座=yí zuò 一辆=yí liàng 一部=yí bù 一句话=yí jù huà 一封=yì fēng
一生=yìshēng 一双=yì shuāng 一口=yì kǒu 一些人=yìxiē rén 不是=bú shì 不会=bú huì 不要=bú yào 不用=bú yòng
不对=bú duì 不够=bú gòu 不太=bú tài 不到=bú dào 不去=bú qù 不过=búguò 不但=búdàn 不错=búcuò 不在=bú zài
不愿意=bú yuànyì 不认识=bú rènshi 不看=bú kàn 不像=bú xiàng 不大=bú dà 不再=bú zài 不见=bú jiàn
还是=háishi 怎么=zěnme 那么=nàme 这么=zhème 多么=duōme 我们=wǒmen 你们=nǐmen 他们=tāmen 她们=tāmen
人们=rénmen 孩子们=háizimen 同学们=tóngxuémen 上面=shàngmian 里面=lǐmian 外面=wàimian 前面=qiánmian
后面=hòumian 下面=xiàmian 桌子上=zhuōzi shang 觉得=juéde 得到=dédào 长得=zhǎng de 教=jiāo 还=hái 只=zhǐ
种=zhǒng 为=wèi 干=gàn 重=zhòng 好=hǎo 着=zhe 了=le 行=xíng 当=dāng 少=shǎo 空=kōng 倒=dào 都=dōu 要=yào
最长=zuì cháng 长时间=cháng shíjiān 睡不着=shuì bu zháo 照片=zhàopiàn 变得=biànde 不小心=bù xiǎoxīn
中=zhōng 难=nán 发=fā 应=yīng 相=xiāng 乐=lè 得=de 地=de 长=cháng""".replace("\n", " ")))


def tok_py(t, prev, nxt):
    if t == "得" and (prev == "" or prev[-1] in "我你他她们，了才就还也都"):
        return "děi"
    if t == "长" and nxt[:1] in "得满着在了出大":
        return "zhǎng"
    if t == "种" and not (prev[-1:] in "一二两三四五六七八九十几这那各每多哪"):
        return "zhòng"
    if t == "只" and prev[-1:] in "一二两三四五六七八九十几这那每":
        return "zhī"
    if t == "为" and prev[-1:] in "他她称成作认以":
        return "wéi"
    if t == "干" and nxt[:1] in "了净燥" :
        return "gān"
    if t in NEUTRAL:
        return NEUTRAL[t]
    if t in wpy:
        return wpy[t]
    syl = lazy_pinyin(t, style=Style.TONE)
    if t.endswith("儿") and len(t) > 1:
        syl = syl[:-2] + [syl[-2] + "r"]
    p = syl[0]
    for s in syl[1:]:
        p += ("'" if s[0] in "aeoāáǎàēéěèōóǒò" else "") + s
    return p


tok_seen = collections.Counter()
for w in words:
    out = []
    zh, h = w["example"]["zh"], w["hanzi"]
    toks = []
    for i, piece in enumerate(zh.split(h)):          # keep the target word as its own token
        if i:
            toks.append(h)
        toks += jieba.lcut(piece, HMM=False)
    toks = [t for t in toks if t]
    for i, t in enumerate(toks):
        if not CJK.search(t):
            out.append(t)
            continue
        p = wpy[h] if t == h else tok_py(t, toks[i - 1] if i else "", toks[i + 1] if i + 1 < len(toks) else "")
        tok_seen[(t, p)] += 1
        out.append(p)
    s = " ".join(out)
    s = s.translate(str.maketrans("，。！？；：（）", ",.!?;:()")).replace("、", ",")
    s = re.sub(r"\s+([，。！？、；：,.!?”’）])", r"\1", s)
    s = re.sub(r"([“‘（])\s+", r"\1", s)
    w["example"]["py"] = s[:1].upper() + s[1:]
RISKY = "得地长种教为只干还行重倒当空好着了数背发便觉乐少相应要中转朝调难兴处藏弹差传假都量结系血几大会场称曲分看降角卷落没蒙片切散色似宿吐吓鲜校咽载扎占涨正挣作"
with open(os.path.join(RAW, "risky_tokens.txt"), "w", encoding="utf-8") as f:
    for (t, p), n in sorted(tok_seen.items()):
        if any(c in RISKY for c in t) and t not in wpy and t not in NEUTRAL:
            f.write(f"{t}={p} ")

# ---------------------------------------------------------------- practice-test counts
papers = sorted(glob.glob(os.path.join(RAW, "test*.txt")))
cnt5 = collections.Counter(); pap5 = collections.defaultdict(set)
cnt4 = collections.Counter(); pap4 = collections.defaultdict(set)
total_tokens = 0
for pi, p in enumerate(papers):
    text = open(p, encoding="utf-8").read()
    text = text.split("=====PAGE 2=====", 1)[-1]          # drop the cover page
    text = re.sub(r"=====PAGE \d+=====", "\n", text)
    BOILER = re.compile(r"^试卷[一二三四五]|^第[一二三]部分|^第\s*\d+.{0,8}题[：:，,]|大家好！欢迎参加|听力考试分|"
                        r"请大家注意|^[一二三]、(听力|阅读|书写)|听力考试现在结束|^例如|^（音乐")
    for line in text.split("\n"):
        if BOILER.search(line.strip()):
            continue
        for t in jieba.lcut(line, HMM=False):
            total_tokens += 1
            if t in H5set:
                cnt5[t] += 1; pap5[t].add(pi)
            elif t in H4set:
                cnt4[t] += 1; pap4[t].add(pi)
print("papers:", len(papers), "tokens:", total_tokens, "hsk5 words seen:", len(cnt5), "hsk4 words seen:", len(cnt4))

maxc = max(cnt5.values())
maxf = max(gen_freq[w] for w in H5)
for w in words:
    h = w["hanzi"]
    c, np_ = cnt5[h], len(pap5[h])
    T = 0.6 * math.log1p(c) / math.log1p(maxc) + 0.4 * np_ / len(papers)
    G = math.log1p(gen_freq[h]) / math.log1p(maxf)
    w["tests_count"], w["tests_papers"], w["freq"] = c, np_, gen_freq[h]
    w["priority"] = round(0.75 * T + 0.25 * G, 4)
words.sort(key=lambda w: (-w["priority"], -w["tests_count"], -w["freq"], w["hanzi"]))
PER_DAY = 100
ndays = len(words) // PER_DAY
for i, w in enumerate(words):
    w["id"] = i + 1
    w["rank"] = i + 1
    w["day"] = min(i // PER_DAY + 1, ndays)
key_order = ["id", "rank", "day", "hanzi", "pinyin", "pinyin_spaced", "pos", "english", "accepted", "alt_readings",
             "py_ok", "example", "tests_count", "tests_papers", "freq", "priority", "source", "source_def"]
words = [{k: w[k] for k in key_order} for w in words]

for w in hsk4:
    w["tests_count"], w["tests_papers"] = cnt4[w["hanzi"]], len(pap4[w["hanzi"]])
hsk4_tests = sorted([w for w in hsk4 if w["tests_count"]], key=lambda w: (-w["tests_count"], -w["tests_papers"], w["id"]))

os.makedirs(OUT, exist_ok=True)
json.dump(words, open(os.path.join(OUT, "hsk5.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(hsk4, open(os.path.join(OUT, "hsk4.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump([{k: w[k] for k in ("hanzi", "pinyin", "english", "tests_count", "tests_papers")} for w in hsk4_tests],
          open(os.path.join(OUT, "hsk4_in_tests.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fmt = lambda w: f"{w['rank']:>4}  {w['hanzi']:<5}\t{w['pinyin']:<14}\t×{w['tests_count']:<3} in {w['tests_papers']}/5\tfreq {w['freq']:<7}\t{w['priority']:.3f}\t{w['english']}"
rep = ["TOP 50"] + [fmt(w) for w in words[:50]] + ["", "BOTTOM 20"] + [fmt(w) for w in words[-20:]]
rep += ["", f"HSK5 words that appear in the tests: {sum(1 for w in words if w['tests_count'])} / {len(words)}",
        f"HSK4 words that appear in the tests: {len(hsk4_tests)} / {len(hsk4)}", "", "DAY BATCHES"]
for d in range(1, ndays + 1):
    ws = [w for w in words if w["day"] == d]
    rep.append(f"Day {d:>2}: {len(ws)} words, ranks {ws[0]['rank']}-{ws[-1]['rank']}, "
               f"{sum(1 for w in ws if w['tests_count'])} seen in tests | {' '.join(w['hanzi'] for w in ws[:8])} …")
rep += ["", "HSK4 words in tests (top 40): " + " ".join(f"{w['hanzi']}×{w['tests_count']}" for w in hsk4_tests[:40])]
open(os.path.join(OUT, "ranking_report.txt"), "w", encoding="utf-8").write("\n".join(rep))
print("\n".join(rep))
