import { SPRITES, spriteUrl, assetUrl } from "@/game/assets";
import { placeItem, itemUrl, itemSize, ITEM_DEFS, bodyClip } from "@/game/wear";
import type { Outfit } from "@/core/wardrobe";

/**
 * Cibu wearing an outfit, for the wardrobe & reward previews.
 * Layered outfits use the exact same placement math as the game scene.
 */
export function CibuDressed({ outfit, base = "complete/youdidit", className = "", dim = false }: { outfit: Outfit | null; base?: string; className?: string; dim?: boolean }) {
  const key = outfit?.combo ?? base;
  const s = SPRITES[key];
  if (!s) return null;
  const layers = outfit?.layers ?? [];
  return (
    <div className={`relative ${dim ? "opacity-40 grayscale" : ""} ${className}`} style={{ aspectRatio: `${s.w} / ${s.h}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteUrl(key)} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
      {layers.map((k) => {
          const p = placeItem(key, k);
          if (!p) return null;
          const sz = itemSize(k);
          const h = p.width * (sz.h / sz.w);
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={k}
              src={itemUrl(k)}
              alt=""
              draggable={false}
              className="absolute max-w-none"
              style={{
                left: `${((p.x - p.ax * p.width) / s.w) * 100}%`,
                top: `${((p.y - p.ay * h) / s.h) * 100}%`,
                width: `${(p.width / s.w) * 100}%`,
                transformOrigin: `${p.ax * 100}% ${p.ay * 100}%`,
                transform: `rotate(${p.rot}deg)`,
              }}
            />
          );
          if (!ITEM_DEFS[k]?.clip) return img;
          // clipped to the body silhouette: the sprite itself is the mask
          const mask = `url(${s.mask ? assetUrl(s.mask) : spriteUrl(key)})`;
          const box = bodyClip(key) ?? [0, 0, 1, 1];
          const clipPath = `inset(${box[1] * 100}% ${(1 - box[2]) * 100}% ${(1 - box[3]) * 100}% ${box[0] * 100}%)`;
          return (
            <div key={k} className="absolute inset-0" style={{ clipPath, maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}>
              {img}
            </div>
          );
      })}
    </div>
  );
}
