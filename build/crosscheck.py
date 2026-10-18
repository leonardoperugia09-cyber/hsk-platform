"""Cross-check HanziStroke vs MandarinBean HSK5; write compact dumps for review."""
import json, os, re, sys, collections

raw = sys.argv[1]
hs = json.load(open(os.path.join(raw, "hs5_raw.json"), encoding="utf-8"))
mb5 = json.load(open(os.path.join(raw, "mb5_raw.json"), encoding="utf-8"))
mb4 = json.load(open(os.path.join(raw, "mb4_raw.json"), encoding="utf-8"))


def fix_mb(e):
    rest = e["rest"]
    if len(rest) >= 3 and rest[-1].isdigit():
        rest = rest[:-1]
    e["pinyin"] = rest[0] if rest else ""
    e["english"] = " ".join(rest[1:]).strip()
    e["hanzi"] = e["hanzi"].strip()
    del e["rest"]


for e in mb5 + mb4:
    fix_mb(e)

hs_set = [e["hanzi"] for e in hs]
mb_set = [e["hanzi"] for e in mb5]
rep = []
rep.append(f"HanziStroke entries: {len(hs)} (unique {len(set(hs_set))})")
rep.append(f"MandarinBean HSK5 entries: {len(mb5)} (unique {len(set(mb_set))})")
rep.append(f"MandarinBean HSK4 entries: {len(mb4)} (unique {len(set(e['hanzi'] for e in mb4))})")
for name, lst in (("HanziStroke", hs_set), ("MandarinBean5", mb_set), ("MandarinBean4", [e["hanzi"] for e in mb4])):
    d = [k for k, v in collections.Counter(lst).items() if v > 1]
    rep.append(f"duplicates in {name}: {d}")
only_hs = [w for w in hs_set if w not in set(mb_set)]
only_mb = [w for w in mb_set if w not in set(hs_set)]
rep.append(f"only in HanziStroke ({len(only_hs)}): {only_hs}")
rep.append(f"only in MandarinBean ({len(only_mb)}): {only_mb}")
# pinyin disagreements
mbp = {e["hanzi"]: e["pinyin"] for e in mb5}
norm = lambda p: re.sub(r"[\s'’\-]", "", p).lower()
diff = [(e["hanzi"], e["pinyin_spaced"], mbp[e["hanzi"]]) for e in hs
        if e["hanzi"] in mbp and norm(e["pinyin_spaced"]) != norm(mbp[e["hanzi"]])]
rep.append(f"pinyin differences ({len(diff)}):")
rep += [f"  {h}: HanziStroke={a} | MandarinBean={b}" for h, a, b in diff]
h4 = set(e["hanzi"] for e in mb4)
rep.append(f"HSK5 words also in HSK4 list: {[w for w in hs_set if w in h4]}")
open(os.path.join(raw, "crosscheck.txt"), "w", encoding="utf-8").write("\n".join(rep))
print("\n".join(rep))

json.dump(mb5, open(os.path.join(raw, "mb5.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump(mb4, open(os.path.join(raw, "mb4.json"), "w", encoding="utf-8"), ensure_ascii=False)
with open(os.path.join(raw, "hs5_compact.txt"), "w", encoding="utf-8") as f:
    for i, e in enumerate(hs, 1):
        alt = "".join(f" ‖ also {a['pinyin']} {a['def_raw']}" for a in e["alt"])
        f.write(f"{i}\t{e['hanzi']}\t{e['pinyin_spaced']}\t{e['def_raw']}{alt}\n")
with open(os.path.join(raw, "mb4_compact.txt"), "w", encoding="utf-8") as f:
    for e in mb4:
        f.write(f"{e['no']}\t{e['hanzi']}\t{e['pinyin']}\t{e['english']}\n")
