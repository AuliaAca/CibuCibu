import Phaser from "phaser";
import { SPRITES, SCENE_GROUPS, GREENY_ASSETS, assetUrl } from "../assets";
import { bridge } from "../bridge";
import { MENU } from "@/core/care";
import { EXTRAS } from "../wear";
import { makeFxTextures } from "../world/textures";
import { computeView } from "../world/view";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const dpr = (this.registry.get("dpr") as number) ?? 1;
    const v = computeView(this.scale.width, this.scale.height);
    // raster SVG layers at roughly on-screen resolution (capped for mobile GPUs)
    const rs = Phaser.Math.Clamp(v.k, 0.5, 2);
    for (const a of GREENY_ASSETS) {
      const scale = Math.min(rs * a.q, 4096 / Math.max(a.w, a.h));
      this.load.svg(a.key, assetUrl(a.file), { scale });
    }
    for (const [key, e] of Object.entries(EXTRAS)) this.load.svg(key, assetUrl(e.file), { scale: Math.min(2, Math.max(1, rs)) });
    for (const f of MENU) if (f.img.endsWith(".svg")) this.load.svg(f.sprite, assetUrl(f.img), { width: 160, height: 160 });
    for (const [key, s] of Object.entries(SPRITES)) {
      if (SCENE_GROUPS.includes(s.group)) this.load.image(key, assetUrl(s.file));
    }
    this.load.on("progress", (p: number) => bridge.emit("progress", p));
    void dpr;
  }

  async create() {
    try {
      await Promise.race([document.fonts.load("800 16px 'Nunito Variable'"), new Promise((r) => setTimeout(r, 1200))]);
    } catch {
      /* font API unavailable — fallback font is fine */
    }
    makeFxTextures(this);
    this.scene.start("world");
  }
}
