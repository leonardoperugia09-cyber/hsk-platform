"""Compact per-level word dumps for authoring: build/raw2/dump{n}.txt (source order)."""
import json
for lv in (1, 2, 3, 4, 6):
    d = json.load(open(f"data/hsk{lv}.json", encoding="utf-8"))
    with open(f"build/raw2/dump{lv}.txt", "w", encoding="utf-8") as f:
        for w in sorted(d["words"], key=lambda w: w["src_no"][0] if w["src_no"] else 0):
            f.write(f"{w['hanzi']}\t{w['pinyin']}\t{w['pos']}\t{w['english']}\n")
print("ok")
