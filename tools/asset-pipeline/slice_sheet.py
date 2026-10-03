"""
Cibu asset pipeline — step 1: slice the official character reference sheet.

Reads sheet_map.json, snaps each named entry to the detected sprite on the
sheet, unions nearby decorations ("?", sparkles, zzz, speech bubble), and
cuts it out with a soft alpha matte. Nothing is redrawn: every pixel comes
from the official sheet.

Output: build/slices/<group>/<id>.png  (+ build/slices/slices.json)

Usage:  python3 slice_sheet.py
"""
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).parent
OUT = HERE / "build" / "slices"


def bg_like(rgb: np.ndarray) -> np.ndarray:
    mn = rgb.min(2)
    mx = rgb.max(2)
    return (mn > 222) & ((mx - mn) < 30)


def main() -> None:
    cfg = json.loads((HERE / "sheet_map.json").read_text())
    s = float(cfg.get("scale", 1))
    img = np.array(Image.open(HERE / cfg["sheet"]).convert("RGB")).astype(np.int32)
    H, W, _ = img.shape
    fg = ~bg_like(img)
    lab, n = ndi.label(ndi.binary_dilation(fg, iterations=int(round(2 * s))))
    boxes = ndi.find_objects(lab)
    comps = []
    for i, b in enumerate(boxes):
        y0, y1, x0, x1 = b[0].start, b[0].stop, b[1].start, b[1].stop
        comps.append(dict(id=i + 1, x0=x0, y0=y0, x1=x1, y1=y1, w=x1 - x0, h=y1 - y0))

    meta = {}
    for group, entries in cfg["groups"].items():
        (OUT / group).mkdir(parents=True, exist_ok=True)
        for sid, ex, ey, label in entries:
            ex, ey = ex * s, ey * s
            big = [c for c in comps if c["w"] > 25 * s and c["h"] > 25 * s]
            main_c = min(big, key=lambda c: abs(c["x0"] - ex) + abs(c["y0"] - ey))
            if abs(main_c["x0"] - ex) + abs(main_c["y0"] - ey) > 20 * s:
                # thin item (e.g. pencil): gather everything in a cell window
                win = [c for c in comps if c["x0"] >= ex - 8 * s and c["x1"] <= ex + 70 * s
                       and c["y0"] >= ey - 8 * s and c["y1"] <= ey + 64 * s and c["h"] > 6 * s]
                chosen = [c for c in win if not (c["h"] <= 13 * s)] or win
                m = dict(x0=min(c["x0"] for c in chosen), x1=max(c["x1"] for c in chosen),
                         y1=max(c["y1"] for c in chosen))
            else:
                m = main_c
                chosen = [m]
                for c in comps:
                    if c is m:
                        continue
                    inside = (c["x0"] >= m["x0"] - 16 * s and c["x1"] <= m["x1"] + 16 * s
                              and c["y0"] >= m["y0"] - 34 * s and c["y1"] <= m["y1"] + 3 * s)
                    header_text = c["h"] <= 16 * s and c["w"] >= 40 * s
                    patch = img[c["y0"]:c["y1"], c["x0"]:c["x1"]]
                    pm = fg[c["y0"]:c["y1"], c["x0"]:c["x1"]]
                    px = patch[pm] if pm.any() else patch.reshape(-1, 3)
                    sat = (px.max(1) - px.min(1)).mean()
                    label_text = c["h"] <= 13 * s and sat < 60
                    if inside and not header_text and not label_text and c["w"] >= 3 and c["h"] >= 3:
                        chosen.append(c)
            x0 = max(0, min(c["x0"] for c in chosen) - 3)
            y0 = max(0, min(c["y0"] for c in chosen) - 3)
            x1 = min(W, max(c["x1"] for c in chosen) + 3)
            y1 = min(H, max(c["y1"] for c in chosen) + 3)

            crop = img[y0:y1, x0:x1]
            sel = np.isin(lab[y0:y1, x0:x1], [c["id"] for c in chosen])
            core = fg[y0:y1, x0:x1] & sel
            # Trim a caption that dilation merged into the sprite: scan up from the
            # bottom through rows holding only dark, unsaturated (text) pixels.
            sat = crop.max(2) - crop.min(2)
            colored = core & (sat > 70)
            cut = None
            seen_text = False
            for r in range(core.shape[0] - 1, max(0, core.shape[0] - 22), -1):
                if colored[r].sum() > 1:
                    break
                if core[r].any():
                    seen_text = True
                elif seen_text:
                    cut = r
                    break
            if cut is not None:
                core[cut:] = False
                crop = crop[: cut + 2]
                core = core[: cut + 2]
                sel = sel[: cut + 2]
                y1 = y0 + cut + 2
            region = ndi.binary_fill_holes(ndi.binary_dilation(core, iterations=1))

            border = np.concatenate([crop[0], crop[-1], crop[:, 0], crop[:, -1]])
            bgc = np.median(border[bg_like(border[None])[0]], axis=0) if bg_like(border[None])[0].any() else np.array([253, 250, 247])
            dist = np.sqrt(((crop - bgc) ** 2).sum(2))
            soft = np.clip((dist - 5) / 45.0, 0, 1)
            interior = ndi.binary_erosion(region, iterations=2)
            alpha = np.where(interior, 1.0, np.where(region, soft, 0.0))
            alpha = ndi.gaussian_filter(alpha, 0.35) * region

            a = np.clip(alpha, 1e-3, 1)[..., None]
            rgb = np.clip((crop - (1 - a) * bgc) / a, 0, 255)
            rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
            Image.fromarray(rgba, "RGBA").save(OUT / group / f"{sid}.png")
            # composite-on-bg version for super resolution
            Image.fromarray(crop.astype(np.uint8)).save(OUT / group / f"{sid}.src.png")
            Image.fromarray((alpha * 255).astype(np.uint8)).save(OUT / group / f"{sid}.alpha.png")
            meta[f"{group}/{sid}"] = dict(group=group, id=sid, label=label, box=[int(x0), int(y0), int(x1), int(y1)],
                                          bg=[float(v) for v in bgc],
                                          anchor=[round(((m["x0"] + m["x1"]) / 2 - x0) / (x1 - x0), 4),
                                                  round((min(m["y1"], y1) - 2 - y0) / (y1 - y0), 4)])
    (OUT / "slices.json").write_text(json.dumps(meta, indent=1))
    print(f"sliced {len(meta)} sprites -> {OUT}")


if __name__ == "__main__":
    main()
