"""
Cibu asset pipeline — step 3: find Cibu's body box in every character sprite.

Accessory layering (hats, glasses, bows, scarves…) is positioned relative to
this box, so one outfit definition fits every expression without redrawing.
Writes `body: [x0, y0, x1, y1]` (normalized) into public/assets/cibu/manifest.json.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).parent
PUBLIC = HERE.parent.parent / "public" / "assets" / "cibu"
GROUPS = {"expression", "focus_start", "focusing", "almost", "complete", "pose"}


def body_box(path: Path):
    im = np.asarray(Image.open(path).convert("RGBA")).astype(int)
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    orange = (a > 160) & (r > 185) & (g > 60) & (g < 175) & (b < 110) & (r - g > 55)
    orange = ndi.binary_opening(orange, iterations=2)
    lab, n = ndi.label(orange)
    if n == 0:
        return None
    sizes = ndi.sum(orange, lab, range(1, n + 1))
    main = lab == (int(np.argmax(sizes)) + 1)
    main = ndi.binary_fill_holes(ndi.binary_closing(main, iterations=6))
    ys, xs = np.nonzero(main)
    h, w = main.shape
    y0, y1 = ys.min(), ys.max() + 1
    # head centre: mean x of the top 40% of the body (arms don't reach up there)
    top = ys < y0 + 0.4 * (y1 - y0)
    head_cx = xs[top].mean()
    return [round(xs.min() / w, 4), round(y0 / h, 4), round((xs.max() + 1) / w, 4), round(y1 / h, 4), round(head_cx / w, 4)]


def main():
    mf = PUBLIC / "manifest.json"
    m = json.loads(mf.read_text())
    for key, s in m["sprites"].items():
        if s["group"] not in GROUPS:
            continue
        box = body_box(PUBLIC / s["group"] / (key.split("/")[1] + ".webp"))
        if box:
            s["body"] = box
    mf.write_text(json.dumps(m, indent=1))
    print("body boxes written")


if __name__ == "__main__":
    main()
