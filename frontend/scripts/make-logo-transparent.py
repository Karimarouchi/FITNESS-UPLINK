from pathlib import Path
from PIL import Image
from shutil import copyfile

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
SRC = PROJECT / "image"
OUT = ROOT / "public" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    (SRC / "logo 1 uplink fitness.png", OUT / "logo-uplink-fitness.png"),
    (SRC / "icon uplink fitness.png", OUT / "icon-uplink-fitness.png"),
    (SRC / "wordmark uplink fitness.png", OUT / "wordmark-uplink-fitness.png"),
    (SRC / "icon uplink fitness.png", ROOT / "public" / "favicon.png"),
]


def knock_out_black(src: Path, dest: Path, square_crop: bool = False) -> None:
    copyfile(src, dest)
    img = Image.open(dest).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            luma = max(r, g, b)
            if luma <= 22:
                pixels[x, y] = (0, 0, 0, 0)
            elif luma < 55 and r < 55 and g < 55 and b < 55:
                pixels[x, y] = (r, g, b, int(a * (luma - 22) / 33))
    if square_crop:
        bbox = img.getbbox()
        if bbox:
            left, top, right, bottom = bbox
            content_w = right - left
            content_h = bottom - top
            side = max(content_w, content_h)
            pad = int(side * 0.06)
            side += pad * 2
            cx = (left + right) / 2
            cy = (top + bottom) / 2
            crop = (
                int(round(cx - side / 2)),
                int(round(cy - side / 2)),
                int(round(cx + side / 2)),
                int(round(cy + side / 2)),
            )
            canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            src_box = (
                max(crop[0], 0),
                max(crop[1], 0),
                min(crop[2], width),
                min(crop[3], height),
            )
            dest_xy = (src_box[0] - crop[0], src_box[1] - crop[1])
            canvas.paste(img.crop(src_box), dest_xy)
            img = canvas
    else:
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
    img.save(dest, "PNG")
    print(f"transparent: {dest.name} {img.size} mode={img.mode}")


if __name__ == "__main__":
    for src, dest in JOBS:
        icon = "icon" in dest.name.lower() or dest.name == "favicon.png"
        knock_out_black(src, dest, square_crop=icon)
