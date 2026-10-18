"""OCR the scanned practice tests page by page -> build/raw/test<N>.txt"""
import sys, os
import numpy as np
import pymupdf
from rapidocr_onnxruntime import RapidOCR

out_dir = sys.argv[1]
ocr = RapidOCR()
for path in sys.argv[2:]:
    name = os.path.splitext(os.path.basename(path))[0]
    out = os.path.join(out_dir, f"test{name}.txt")
    if os.path.exists(out):
        continue
    doc = pymupdf.open(path)
    parts = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=200, colorspace=pymupdf.csRGB)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
        result, _ = ocr(img)
        lines = [r[1] for r in (result or [])]
        parts.append(f"\n=====PAGE {i+1}=====\n" + "\n".join(lines))
        print(f"{name} p{i+1}/{len(doc)} lines={len(lines)}", flush=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write("".join(parts))
