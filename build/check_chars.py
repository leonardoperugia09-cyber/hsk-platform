"""Quick quality report on the per-level character data."""
import json
for lv in range(1, 7):
    d = json.load(open(f"data/hsk{lv}.json", encoding="utf-8"))
    cs = d["chars"]
    nomean = [c["char"] for c in cs if not c["meaning"]]
    nocomp = [c["char"] for c in cs if not c["components"]]
    print(f"HSK {lv}: {len(cs)} chars, no meaning {len(nomean)} {''.join(nomean[:15])}, no components {len(nocomp)}")
    print("   top 12:", " ".join(f"{c['char']}({c['word_count']},{c['freq_rank']})" for c in cs[:12]))
    print("   sample:", [(c["char"], c["pinyin"], c["meaning"][:40], c["components"]) for c in cs[20:24]])
