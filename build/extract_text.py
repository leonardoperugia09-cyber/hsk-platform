"""Dump the text layer of each PDF to build/raw/<name>.txt and report page counts."""
import sys, os
import fitz

out_dir = sys.argv[1]
os.makedirs(out_dir, exist_ok=True)
for path in sys.argv[2:]:
    doc = fitz.open(path)
    name = os.path.splitext(os.path.basename(path))[0]
    chars = 0
    with open(os.path.join(out_dir, name + ".txt"), "w", encoding="utf-8") as f:
        for i, page in enumerate(doc):
            t = page.get_text()
            chars += len(t.strip())
            f.write(f"\n=====PAGE {i+1}=====\n{t}")
    imgs = sum(len(p.get_images()) for p in doc)
    print(f"{name}: pages={len(doc)} text_chars={chars} images={imgs}")
