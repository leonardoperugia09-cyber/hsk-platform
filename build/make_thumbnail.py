"""Draw the app thumbnail (palette 27374D / 526D82 / 9DB2BF / DDE6ED) -> thumbnail.png + small icon PNGs.
usage: make_thumbnail.py <out_dir>"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
NAVY, SLATE, STEEL, MIST = (39, 55, 77), (82, 109, 130), (157, 178, 191), (221, 230, 237)
FONTS = "C:/Windows/Fonts/"
S = 4  # supersampling


def draw(size):
    W = size * S
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    # diagonal navy -> slate gradient, clipped to a rounded square
    grad = Image.new("RGB", (W, W))
    gp = grad.load()
    for y in range(W):
        for x in range(W):
            t = (x + y) / (2 * W - 2)
            gp[x, y] = tuple(round(NAVY[i] + (SLATE[i] - NAVY[i]) * t) for i in range(3))
    mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)

    # 米字格 practice square
    m = int(W * 0.17)
    box = [m, int(W * 0.11), W - m, W - m - int(W * 0.06)]
    x0, y0, x1, y1 = box
    lw = max(2, int(W * 0.008))
    d.rounded_rectangle(box, radius=int(W * 0.03), outline=STEEL, width=lw)

    def dashed(p, q, dash, gap, width, colour):
        import math
        (ax, ay), (bx, by) = p, q
        L = math.hypot(bx - ax, by - ay)
        n = 0.0
        while n < L:
            e = min(n + dash, L)
            d.line([(ax + (bx - ax) * n / L, ay + (by - ay) * n / L), (ax + (bx - ax) * e / L, ay + (by - ay) * e / L)],
                   fill=colour, width=width)
            n += dash + gap
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    dw, gw, th = W * 0.025, W * 0.018, max(1, int(W * 0.005))
    faint = (*STEEL, 150)
    for p, q in (((x0, cy), (x1, cy)), ((cx, y0), (cx, y1)), ((x0, y0), (x1, y1)), ((x1, y0), (x0, y1))):
        dashed(p, q, dw, gw, th, faint)

    # the character
    zh = ImageFont.truetype(FONTS + "msyhbd.ttc", int((y1 - y0) * 0.78))
    bb = d.textbbox((0, 0), "词", font=zh)
    d.text((cx - (bb[0] + bb[2]) / 2, cy - (bb[1] + bb[3]) / 2), "词", font=zh, fill=MIST)

    # HSK 5 label
    lab = ImageFont.truetype(FONTS + "segoeuib.ttf", int(W * 0.105))
    txt = "HSK 5"
    bb = d.textbbox((0, 0), txt, font=lab)
    ty = y1 + (W - y1) * 0.5 - (bb[1] + bb[3]) / 2 - W * 0.012
    d.text((W / 2 - (bb[0] + bb[2]) / 2, ty), txt, font=lab, fill=MIST)
    return img.resize((size, size), Image.LANCZOS)


big = draw(512)
big.save(os.path.join(OUT, "thumbnail.png"))
for s in (180, 64):
    draw(s).save(os.path.join(OUT, "build", f"icon{s}.png"))
print("ok")
