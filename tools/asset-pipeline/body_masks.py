"""
Per-sprite body masks: only Cibu's orange body (holes such as eyes/mouth filled),
without the note card, sparkles or props drawn in the same sprite.
Clothing items marked `clip` are masked with these so they always sit *on* Cibu.

Output: public/assets/cibu/mask/<group>_<name>.png (white, alpha = body)
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter
from matplotlib.colors import rgb_to_hsv
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), "../..")
MAN = os.path.join(ROOT, "public/assets/cibu/manifest.json")
OUT = os.path.join(ROOT, "public/assets/cibu/mask")
os.makedirs(OUT, exist_ok=True)
man = json.load(open(MAN))
n = 0
for key, s in man["sprites"].items():
    if "body" not in s:
        continue
    im = np.asarray(Image.open(os.path.join(ROOT, "public" + s["file"])).convert("RGBA")).astype(np.float32) / 255
    a = im[..., 3]
    hsv = rgb_to_hsv(im[..., :3])
    h = hsv[..., 0] * 360
    orange = (a > 0.5) & (hsv[..., 1] > 0.35) & (hsv[..., 2] > 0.35) & ((h < 36) | (h > 335))
    orange = ndi.binary_opening(orange, iterations=1)
    lab, k = ndi.label(orange)
    if k == 0:
        continue
    # Cibu = the largest orange blob (sparkles/stars are small and separate)
    sizes = ndi.sum(orange, lab, range(1, k + 1))
    body = lab == (1 + int(np.argmax(sizes)))
    body = ndi.binary_closing(body, iterations=3)
    body = ndi.binary_fill_holes(body)
    body &= a > 0.5
    m = Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = Image.new("RGBA", m.size, (255, 255, 255, 0))
    rgba.putalpha(m)
    name = key.replace("/", "_") + ".png"
    rgba.save(os.path.join(OUT, name), optimize=True)
    s["mask"] = "/assets/cibu/mask/" + name
    n += 1
json.dump(man, open(MAN, "w"), indent=2)
print("masks:", n)
