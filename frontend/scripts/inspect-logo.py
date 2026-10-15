from PIL import Image
from pathlib import Path
from collections import Counter

p = Path(r"C:\Users\user\Desktop\Project antigone\FITNESS UPLINK\frontend\public\brand\logo-uplink-fitness.png")
im = Image.open(p).convert("RGBA")
print("mode", im.mode, "size", im.size)
w, h = im.size
print("corners", im.getpixel((0, 0)), im.getpixel((w - 1, 0)), im.getpixel((0, h - 1)))
pix = list(im.getdata())
alphas = Counter(a for _, _, _, a in pix)
print("alpha 0", alphas.get(0, 0), "of", len(pix), round(100 * alphas.get(0, 0) / len(pix), 1), "%")
print("alpha 255", alphas.get(255, 0))
# unique low colors
low = Counter((r, g, b, a) for r, g, b, a in pix if max(r, g, b) < 40)
print("low colors sample", low.most_common(8))
print("max rgb of first pixel", max(im.getpixel((0, 0))[:3]))
