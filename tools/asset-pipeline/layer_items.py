"""
Cibu asset pipeline — step 4: make wearable layers from the official wear items.

On the reference sheet some hats are drawn *on* a bit of Cibu's head
(beanie, bucket, cap, headband). To layer them over any expression we remove
the orange head pixels and keep only the item itself (largest remaining part).
Output: public/assets/cibu/layer/<id>.webp, registered in manifest.json.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).parent
PUBLIC = HERE.parent.parent / "public" / "assets" / "cibu"
ITEMS = ["beanie", "bucket", "cap", "headband", "beret", "bow", "headphone_w", "frogband", "sunglasses", "scarf", "kerchief", "pleated", "skirt"]


def main():
    mf = PUBLIC / "manifest.json"
    m = json.loads(mf.read_text())
    (PUBLIC / "layer").mkdir(exist_ok=True)
    for it in ITEMS:
        im = np.asarray(Image.open(PUBLIC / "wear" / f"{it}.webp").convert("RGBA")).astype(np.int32)
        r, g, b, a = (im[..., i] for i in range(4))
        on_head = it in ("beanie", "bucket", "cap", "headband")
        # Cibu's orange by hue (≈24°): excludes the yellow bucket (≈40°) and red cap/beret (≈0–8°)
        mx = np.maximum(np.maximum(r, g), b).astype(float)
        mn = np.minimum(np.minimum(r, g), b).astype(float)
        sat = (mx - mn) / np.maximum(mx, 1)
        hue = np.where(mx == r, 60 * ((g - b) / np.maximum(mx - mn, 1)), 0) % 360
        lo, hi = {"bucket": (12, 31), "cap": (17, 37)}.get(it, (12, 37))
        orange = (hue > lo) & (hue < hi) & (sat > 0.42) & (mx > 110) & on_head
        if it == "bucket":  # shadowed forehead under the brim (hue close to the hat's yellow)
            H, W = r.shape
            yy, xx = np.mgrid[0:H, 0:W]
            under = (yy > 0.62 * H) & (xx > 0.22 * W) & (xx < 0.78 * W)
            orange |= under & (hue > 12) & (hue < 38) & (sat > 0.42)
        if it == "headband":  # also drop the yellow folder tab behind the head
            orange |= (r > 220) & (g > 170) & (b < 140)
        blush = (r > 200) & (g < 150) & (b > 90) & (b < 170) & (r - b > 60)
        keep = (a > 40) & ~ndi.binary_dilation(orange, iterations=2)
        if on_head:
            # the sheet's white sticker outline around the removed head
            # (thin white strokes only — thick white parts like the headband survive)
            whiteish = (np.minimum(np.minimum(r, g), b) > 205) & (a > 40)
            thin = whiteish & ~ndi.binary_opening(whiteish, iterations=4)
            keep &= ~(thin & ndi.binary_dilation(orange, iterations=10))
        if on_head:
            keep &= ~blush
        lab, n = ndi.label(keep)
        if n:
            sizes = ndi.sum(keep, lab, range(1, n + 1))
            big = int(np.argmax(sizes)) + 1
            # keep the main item plus any sizeable attached parts (e.g. headband tails)
            ok = [i + 1 for i, s in enumerate(sizes) if s >= 0.08 * sizes.max()]
            keep = np.isin(lab, ok) if it == "headband" else lab == big
        keep = ndi.binary_closing(keep, iterations=2)
        if it in ("bucket", "cap"):
            keep = ndi.binary_fill_holes(keep) & (a > 40)
        out = im.copy()
        out[..., 3] = np.where(keep, a, 0)
        ys, xs = np.nonzero(out[..., 3] > 10)
        crop = out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1].astype(np.uint8)
        img = Image.fromarray(crop, "RGBA")
        img.save(PUBLIC / "layer" / f"{it}.webp", "WEBP", quality=90, method=6)
        m["sprites"][f"layer/{it}"] = {
            "file": f"/assets/cibu/layer/{it}.webp",
            "label": m["sprites"][f"wear/{it}"]["label"],
            "group": "layer",
            "w": img.width,
            "h": img.height,
            "anchor": [0.5, 1],
        }
    mf.write_text(json.dumps(m, indent=1))
    print("layers:", ", ".join(ITEMS))


if __name__ == "__main__":
    main()
