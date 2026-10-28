"""Assemble index.html: shell + app.css + build/js/*.js + the six level databases + icons.
usage: build_app.py <build_dir> <data_dir> <out_html>"""
import base64, glob, json, logging, os, re, sys
import jieba

jieba.setLogLevel(logging.WARNING)
B, data_dir, out = sys.argv[1:4]
rd = lambda p: open(p, encoding="utf-8").read()
PUNCT = "，。！？；：、“”‘’（）—…,.!?;:\"' "


def chunks(zh, target):
    """Split an example sentence into 3-7 chunks for the sentence-ordering exercise (target word kept whole)."""
    body = zh.rstrip("。！？!?.")
    end = zh[len(body):]
    if any(p in body for p in "“”‘’\"'——…"):
        return None
    jieba.add_word(target)
    toks = [t for t in jieba.lcut(body, HMM=False) if t.strip()]
    ch = []
    for t in toks:
        if t in PUNCT and ch:
            ch[-1] += t
        else:
            ch.append(t)
    while len(ch) > 6:
        i = min(range(len(ch) - 1), key=lambda k: len(ch[k]) + len(ch[k + 1]) + (9 if target in (ch[k], ch[k + 1]) else 0))
        ch[i:i + 2] = [ch[i] + ch[i + 1]]
    if len(ch) < 3 or len(set(ch)) != len(ch):
        return None
    return {"c": ch, "end": end}


levels = {}
for n in range(1, 7):
    d = json.load(open(os.path.join(data_dir, f"hsk{n}.json"), encoding="utf-8"))
    ws = []
    for w in d["words"]:
        ex = w.get("example") or {}
        rec = {"i": w["rank"], "h": w["hanzi"], "p": w["pinyin"], "s": w["pinyin_spaced"], "pos": w["pos"] or "",
               "e": w["english"], "a": w["accepted"], "alt": [[a["pinyin"], a["meaning"]] for a in w["alt_readings"]],
               "ok": w["py_ok"], "z": ex.get("zh", ""), "zp": ex.get("py", ""), "ze": ex.get("en", "")}
        if w.get("tests_count"):
            rec["tc"] = w["tests_count"]
        if rec["z"]:
            ck = chunks(rec["z"], w["hanzi"])
            if ck:
                rec["zt"] = ck
        ws.append(rec)
    cs = [{"c": c["char"], "r": c["rank"], "p": c["pinyin"], "m": c["meaning"], "k": c["components"], "w": c["words"],
           "n": c["word_count"], "f": c["freq_rank"], "nw": 1 if c["new"] else 0} for c in d["chars"]]
    levels[n] = {"meta": d["meta"], "w": ws, "c": cs}

blob = json.dumps({"levels": levels}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
icon = lambda n: "data:image/png;base64," + base64.b64encode(open(os.path.join(B, f"icon{n}.png"), "rb").read()).decode()
font = lambda f: "data:font/woff2;base64," + base64.b64encode(open(os.path.join(B, "fonts", f), "rb").read()).decode()
fonts_css = (f"@font-face{{font-family:'Instrument Sans';font-style:normal;font-weight:400 600;font-display:swap;src:url({font('InstrumentSans-latin.woff2')}) format('woff2')}}\n"
             f"@font-face{{font-family:'Instrument Serif';font-style:normal;font-weight:400;font-display:swap;src:url({font('InstrumentSerif-latin.woff2')}) format('woff2')}}\n")
js = "\n".join(rd(p) for p in sorted(glob.glob(os.path.join(B, "js", "*.js"))))
assert "/*__DATA__*/null" in js
html = (rd(os.path.join(B, "app_template.html")).replace("/*__CSS__*/", fonts_css + rd(os.path.join(B, "app.css")))
        .replace("/*__JS__*/", js.replace("/*__DATA__*/null", blob))
        .replace("/*__ICON64__*/", icon(64)).replace("/*__ICON180__*/", icon(180)))
open(out, "w", encoding="utf-8").write(html)
print(out, os.path.getsize(out), "bytes;", {n: (len(l["w"]), len(l["c"]), sum(1 for w in l["w"] if "zt" in w)) for n, l in levels.items()})
