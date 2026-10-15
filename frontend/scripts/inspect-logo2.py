from PIL import Image
from pathlib import Path
from collections import Counter

p = Path(r"C:\Users\user\Desktop\Project antigone\FITNESS UPLINK\frontend\public\brand\logo-uplink-fitness.png")
im = Image.open(p).convert("RGBA")
pix = list(im.getdata())
kept = [(r, g, b, a) for r, g, b, a in pix if a > 0]
print("kept", len(kept))
print("alpha buckets")
c = Counter(a // 16 for _, _, _, a in kept)
print(sorted(c.items()))
print("sample high", kept[len(kept)//2], kept[10000] if len(kept) > 10000 else kept[0])
blues = sum(1 for r, g, b, a in kept if b > r and b > 80)
oranges = sum(1 for r, g, b, a in kept if r > 150 and g < 120)
print("blues", blues, "oranges", oranges)
print("avg rgb of opaque-ish", 
      tuple(sum(x[i] for x in kept if x[3] > 200)/max(1,sum(1 for x in kept if x[3]>200)) for i in range(3)))
