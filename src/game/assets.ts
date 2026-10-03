/**
 * Asset registry. Cibu sprites come from the official reference sheet via
 * tools/asset-pipeline (see manifest.json). World layers are SVGs that can be
 * swapped for painted WebP layers without touching scene code.
 */
import manifest from "../../public/assets/cibu/manifest.json";

export interface SpriteInfo {
  file: string;
  label: string;
  group: string;
  w: number;
  h: number;
  anchor: [number, number];
  /** Cibu's body box [x0, y0, x1, y1, headCentreX], normalized (character sprites only) */
  body?: number[];
  /** Cibu-only silhouette (no note card / sparkles), used to fit clothing */
  mask?: string;
}

export const SPRITES = manifest.sprites as unknown as Record<string, SpriteInfo>;
export type SpriteKey = keyof typeof manifest.sprites;

/** Body height (px) of a standing Cibu in the 4× upscaled sheet. All sprites share this scale. */
export const SHEET_BODY_PX = 268;

declare global {
  // Set by static preview builds that serve assets from a relative folder.
  var __CIBU_ASSET_BASE__: string | undefined;
}

export const assetUrl = (p: string) => (globalThis.__CIBU_ASSET_BASE__ ?? "") + p;
export const spriteUrl = (key: string) => assetUrl(SPRITES[key]?.file ?? "");

/** Groups needed by the world scene (wear/* is UI-only for now). */
export const SCENE_GROUPS = ["expression", "focus_start", "focusing", "almost", "complete", "pose", "outfit", "prop", "layer"];

export interface WorldLayerAsset {
  key: string;
  file: string;
  w: number;
  h: number;
  /** raster quality: background layers are soft and can rasterize lower */
  q: number;
}

const G = "/assets/world/greeny/";
export const GREENY_ASSETS: WorldLayerAsset[] = [
  { key: "hills-far", file: G + "hills-far.svg", w: 2200, h: 420, q: 0.6 },
  { key: "hills-near", file: G + "hills-near.svg", w: 2200, h: 460, q: 0.7 },
  { key: "trees-back", file: G + "trees-back.svg", w: 2400, h: 300, q: 0.7 },
  { key: "ground", file: G + "ground.svg", w: 2600, h: 760, q: 0.75 },
  { key: "tree-left", file: G + "tree-left.svg", w: 620, h: 820, q: 0.9 },
  { key: "tree-right", file: G + "tree-right.svg", w: 440, h: 600, q: 0.9 },
  { key: "bush", file: G + "bush.svg", w: 300, h: 170, q: 1 },
  { key: "sign", file: G + "sign.svg", w: 220, h: 200, q: 1 },
  { key: "mat", file: G + "mat.svg", w: 560, h: 170, q: 1 },
  { key: "grass-a", file: G + "grass-a.svg", w: 180, h: 130, q: 1 },
  { key: "grass-b", file: G + "grass-b.svg", w: 140, h: 110, q: 1 },
  { key: "flower-a", file: G + "flower-a.svg", w: 70, h: 130, q: 1 },
  { key: "flower-b", file: G + "flower-b.svg", w: 70, h: 120, q: 1 },
  { key: "flower-c", file: G + "flower-c.svg", w: 60, h: 110, q: 1 },
  { key: "leaves-corner", file: G + "leaves-corner.svg", w: 640, h: 520, q: 0.6 },
  { key: "cloud", file: G + "cloud.svg", w: 340, h: 140, q: 0.8 },
  { key: "watering-can", file: "/assets/world/props/watering-can.svg", w: 220, h: 170, q: 1 },
  { key: "stool", file: "/assets/world/props/stool.svg", w: 150, h: 64, q: 1 },
  { key: "butterfly", file: "/assets/world/props/butterfly.svg", w: 120, h: 100, q: 1 },
  // study props seen from Cibu's side: screen/pages face him, we see the backs
  { key: "study/laptop-back", file: "/assets/world/study/laptop-back.svg", w: 300, h: 230, q: 1 },
  { key: "study/book-back", file: "/assets/world/study/book-open-back.svg", w: 300, h: 230, q: 1 },
  { key: "study/clipboard-back", file: "/assets/world/study/clipboard-back.svg", w: 210, h: 270, q: 1 },
  { key: "study/laptop-closed", file: "/assets/world/study/laptop-closed.svg", w: 300, h: 64, q: 1 },
  { key: "study/book-closed", file: "/assets/world/study/book-closed.svg", w: 300, h: 84, q: 1 },
];
