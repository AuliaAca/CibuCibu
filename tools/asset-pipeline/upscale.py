"""
Cibu asset pipeline — step 2: 4x super-resolution of the sliced sprites.

The reference sheet is a ~1100px screenshot, so each sprite is only ~70px.
This runs Real-ESRGAN's anime model (realesr-animevideov3, SRVGGNetCompact)
in pure NumPy — no torch needed — so the pipeline runs anywhere Python does.
It only sharpens the official artwork; it does not redraw or restyle Cibu.

When the original high-resolution / layered art is available, skip this step
and point slice_sheet.py at the high-res sheet instead (set "scale").

Output: ../../public/assets/cibu/<group>/<id>.webp  + manifest.json
"""
import io
import json
import pickle
import zipfile
from pathlib import Path

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image, ImageFilter

HERE = Path(__file__).parent
SLICES = HERE / "build" / "slices"
PUBLIC = HERE.parent.parent / "public" / "assets" / "cibu"
MODEL = HERE / "models" / "realesr-animevideov3.pth"
SCALE = 4


# ---------------------------------------------------------------- torch-free .pth loader
def load_pth(path: Path) -> dict:
    zf = zipfile.ZipFile(path)
    prefix = zf.namelist()[0].split("/")[0]

    def rebuild(storage, offset, size, stride, *args):
        arr = storage
        return np.lib.stride_tricks.as_strided(
            arr[offset:], shape=tuple(size), strides=tuple(s * arr.itemsize for s in stride)
        ).copy()

    class U(pickle.Unpickler):
        def find_class(self, mod, name):
            if name == "_rebuild_tensor_v2":
                return rebuild
            if mod == "collections" and name == "OrderedDict":
                import collections
                return collections.OrderedDict
            if mod == "torch" and name.endswith("Storage"):
                return {"FloatStorage": np.float32, "HalfStorage": np.float16,
                        "LongStorage": np.int64, "IntStorage": np.int32}[name]
            return super().find_class(mod, name)

        def persistent_load(self, pid):
            _, dtype, key, _loc, _n = pid
            return np.frombuffer(zf.read(f"{prefix}/data/{key}"), dtype=dtype)

    obj = U(io.BytesIO(zf.read(f"{prefix}/data.pkl"))).load()
    return obj.get("params", obj)


# ---------------------------------------------------------------- SRVGGNetCompact
def conv3(x: np.ndarray, w: np.ndarray, b: np.ndarray) -> np.ndarray:
    # x: (C,H,W)  w: (O,C,3,3)
    xp = np.pad(x, ((0, 0), (1, 1), (1, 1)), mode="constant")
    win = sliding_window_view(xp, (3, 3), axis=(1, 2))  # C,H,W,3,3
    C, H, W = x.shape
    cols = win.transpose(1, 2, 0, 3, 4).reshape(H * W, C * 9)
    out = cols @ w.reshape(w.shape[0], -1).T + b
    return out.T.reshape(w.shape[0], H, W)


def prelu(x, a):
    return np.where(x >= 0, x, x * a[:, None, None])


def sr(img: np.ndarray, p: dict) -> np.ndarray:
    """img: HxWx3 float32 in [0,1] -> (4H)x(4W)x3"""
    x = img.transpose(2, 0, 1).astype(np.float32)
    h = x
    idx = 0
    n_body = max(int(k.split(".")[1]) for k in p) + 1
    while idx < n_body:
        wk = f"body.{idx}.weight"
        w = p[wk]
        if w.ndim == 4:
            h = conv3(h, w, p[f"body.{idx}.bias"])
        else:
            h = prelu(h, w)
        idx += 1
    C, H, W = h.shape
    r = SCALE
    h = h.reshape(3, r, r, H, W).transpose(0, 3, 1, 4, 2).reshape(3, H * r, W * r)
    base = x.repeat(r, 1).repeat(r, 2)
    return np.clip((h + base).transpose(1, 2, 0), 0, 1)


def main() -> None:
    params = {k: np.asarray(v, dtype=np.float32) for k, v in load_pth(MODEL).items()}
    meta = json.loads((SLICES / "slices.json").read_text())
    manifest = {"version": 1, "scale": SCALE, "source": "official Cibu character reference sheet", "sprites": {}}
    for key, m in meta.items():
        src = np.asarray(Image.open(SLICES / f"{key}.src.png").convert("RGB"), dtype=np.float32) / 255
        al = np.asarray(Image.open(SLICES / f"{key}.alpha.png").convert("L"), dtype=np.float32) / 255
        rgb = sr(src, params)
        a3 = sr(np.repeat(al[..., None], 3, 2), params).mean(2)
        a3 = np.clip((a3 - 0.04) / 0.92, 0, 1)
        bg = np.array(m["bg"], dtype=np.float32) / 255
        a = np.clip(a3, 1e-3, 1)[..., None]
        col = np.clip((rgb - (1 - a) * bg) / a, 0, 1)
        out = Image.fromarray((np.dstack([col, a3]) * 255).round().astype(np.uint8), "RGBA")
        dest = PUBLIC / m["group"] / f"{m['id']}.webp"
        dest.parent.mkdir(parents=True, exist_ok=True)
        out.save(dest, "WEBP", quality=90, method=6)
        manifest["sprites"][key] = {
            "file": f"/assets/cibu/{m['group']}/{m['id']}.webp",
            "label": m["label"], "group": m["group"],
            "w": out.width, "h": out.height, "anchor": m["anchor"],
        }
        print(f"{key:28s} {out.width}x{out.height}")
    (PUBLIC / "manifest.json").write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
