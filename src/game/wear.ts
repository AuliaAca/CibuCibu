/**
 * Accessory layout shared by the Phaser scene and the React wardrobe preview:
 * where an item sits on a given Cibu sprite, in that sprite's texture pixels.
 */
import wardrobe from "@/core/wardrobe.json";
import { SPRITES, assetUrl } from "./assets";

export interface ItemDef {
  w: number;
  ax: number;
  ay: number;
  tx: number;
  ty: number;
  rot?: number;
  slot: "head" | "eyes" | "neck" | "waist";
  /** masked to Cibu's silhouette (sashes wrap the body instead of sticking out) */
  clip?: boolean;
}

export const ITEM_DEFS = wardrobe.items as Record<string, ItemDef>;
export const EXTRAS = wardrobe.extras as Record<string, { file: string; w: number; h: number }>;

export function itemSize(key: string) {
  const e = EXTRAS[key];
  if (e) return { w: e.w, h: e.h };
  const s = SPRITES[key];
  return { w: s?.w ?? 1, h: s?.h ?? 1 };
}

export const itemUrl = (key: string) => assetUrl(EXTRAS[key]?.file ?? SPRITES[key]?.file ?? "");

/** Sprites that can't wear layers (lying down, at a desk with its own headband) */
const NO_LAYERS = new Set(["pose/sleep", "focusing/serius", "focusing/study", "focusing/maximal", "focusing/okefine", "focusing/donotdisturb"]);
/** Sprites that already wear glasses */
const NO_EYES = new Set(["complete/gokil", "complete/bestie", "expression/cool", "expression/thinking"]);

export interface Placement {
  /** centre anchor point in sprite texture px */
  x: number;
  y: number;
  /** item width in sprite texture px */
  width: number;
  ax: number;
  ay: number;
  rot: number;
}

/**
 * Cibu's body box in normalized sprite coords, slightly padded. Clipped items are
 * limited to it so they never paint the note card or sparkles drawn beside him.
 */
export function bodyClip(spriteKey: string): [number, number, number, number] | null {
  const b = (SPRITES[spriteKey] as { body?: number[] } | undefined)?.body;
  if (!b) return null;
  const pad = 0.01;
  return [Math.max(0, b[0] - pad), Math.max(0, b[1] - pad), Math.min(1, b[2] + pad), Math.min(1, b[3] + pad)];
}

export function placeItem(spriteKey: string, itemKey: string): Placement | null {
  const s = SPRITES[spriteKey] as (typeof SPRITES)[string] & { body?: number[] };
  const def = ITEM_DEFS[itemKey];
  if (!s?.body || !def || NO_LAYERS.has(spriteKey)) return null;
  if (def.slot === "eyes" && NO_EYES.has(spriteKey)) return null;
  const [x0, y0, x1, y1, hc] = s.body;
  const bw = (x1 - x0) * s.w;
  const bh = (y1 - y0) * s.h;
  return {
    x: hc * s.w + def.tx * bw,
    y: y0 * s.h + def.ty * bh,
    width: def.w * bw,
    ax: def.ax,
    ay: def.ay,
    rot: def.rot ?? 0,
  };
}
