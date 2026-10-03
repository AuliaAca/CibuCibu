import Phaser from "phaser";
import { SPRITES, SHEET_BODY_PX, assetUrl } from "../assets";
import { placeItem, bodyClip, ITEM_DEFS, type Placement } from "../wear";
import { beatMs, type Beat, type Fx, type Motion, type Presentation } from "@/core/cibuBrain";

/** Cibu's standing body height in design units (world is 1600×900). */
export const CIBU_H = 250;

interface Callbacks {
  cue?: (name: string) => void;
  say: (text: string, ms: number) => void;
  fx: (fx: Fx) => void;
  think: (spriteKey: string | null) => void;
  poke: () => void;
}

const REST: Motion = { breathAmp: 0.018, breathHz: 0.28, look: true, hop: 0, walk: false, droop: 0 };

/**
 * Cibu as a living 2D character. The artwork is always an official sprite;
 * life comes from procedural motion layered on top:
 * breathing (volume-preserving squash), glances, tilts, hops, short walks,
 * crossfaded expression swaps with a little "pop", and reaction sequences.
 */
export class CibuActor {
  readonly root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Image;
  private a: Phaser.GameObjects.Image;
  private b: Phaser.GameObjects.Image;
  private active: Phaser.GameObjects.Image;
  private key = "";
  private base = CIBU_H / SHEET_BODY_PX;
  private pop = { v: 1 };
  private squash = { v: 1 };
  private hopY = { v: 0 };
  private deep = { v: 1 };
  /** sitting on a stool: lifts the body (px in design units) */
  readonly seat = { v: 0 };
  private motion: Motion = REST;
  private pres: Presentation | null = null;
  private beats: Beat[] = [];
  private beatTimer?: Phaser.Time.TimerEvent;
  private rotateTimer?: Phaser.Time.TimerEvent;
  private fxTimer?: Phaser.Time.TimerEvent;
  private nextLook = 0;
  private walking = false;
  private reduced = false;
  readonly home: { x: number; y: number };

  constructor(private scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, private cb: Callbacks) {
    this.home = { x, y };
    this.root = scene.add.container(x, y);
    this.shadow = scene.add.image(0, 4, "shadow").setScale(2.1, 1.3).setAlpha(0.8);
    this.body = scene.add.container(0, 0);
    this.a = scene.add.image(0, 0, "__DEFAULT");
    this.b = scene.add.image(0, 0, "__DEFAULT").setAlpha(0);
    this.active = this.a;
    this.body.add([this.b, this.a]);
    this.root.add([this.shadow, this.body]);
    parent.add(this.root);
    for (const img of [this.a, this.b]) {
      img.setInteractive({ pixelPerfect: true, alphaTolerance: 40, useHandCursor: true });
      img.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.cb.poke();
      });
    }
  }

  private layerKeys = "";
  private layers: { key: string; img: Phaser.GameObjects.Image }[] = [];

  /** Accessory layers (hats, glasses, bows…) that follow every expression. */
  setLayers(keys: string[]) {
    const sig = keys.join("|");
    if (sig === this.layerKeys) return;
    this.layerKeys = sig;
    this.layers.forEach((l) => l.img.destroy());
    this.layers = keys
      .filter((k) => this.scene.textures.exists(k))
      .map((key) => {
        const img = this.scene.add.image(0, 0, key);
        this.body.add(img);
        return { key, img };
      });
    if (this.layers.length) this.scene.tweens.add({ targets: this.layers.map((l) => l.img), alpha: { from: 0, to: 1 }, duration: 300 });
  }

  private placeLayers(sx: number, sy: number) {
    if (!this.layers.length) return;
    const info = SPRITES[this.key];
    const ax = info?.anchor[0] ?? 0.5;
    const ay = info?.anchor[1] ?? 1;
    const W = info?.w ?? 1;
    const H = info?.h ?? 1;
    for (const l of this.layers) {
      const p = this.key ? placeItem(this.key, l.key) : null;
      if (!p) {
        l.img.setVisible(false);
        continue;
      }
      if (ITEM_DEFS[l.key]?.clip) {
        // baked once per expression: the item drawn in sprite space, masked by Cibu's body
        const tex = this.clipTexture(this.key, l.key, p);
        if (!tex) {
          l.img.setVisible(false);
          continue;
        }
        l.img
          .setVisible(true)
          .setTexture(tex)
          .setOrigin(ax, ay)
          .setPosition(0, 0)
          .setScale(sx, sy)
          .setAngle(0);
        this.body.bringToTop(l.img);
        continue;
      }
      const s = ((sx + sy) / 2) * (p.width / l.img.width);
      l.img
        .setVisible(true)
        .setOrigin(p.ax, p.ay)
        .setPosition((p.x - ax * W) * sx, (p.y - ay * H) * sy)
        .setScale(s)
        .setAngle(p.rot);
      this.body.bringToTop(l.img);
    }
  }

  private maskLoading = new Set<string>();

  /** Body mask for a sprite, loaded on demand (only when clothing needs it). */
  private maskSource(spriteKey: string): CanvasImageSource | null {
    const info = SPRITES[spriteKey];
    const tm = this.scene.textures;
    if (!info?.mask) return tm.get(spriteKey).getSourceImage() as CanvasImageSource;
    const mk = `mask:${spriteKey}`;
    if (tm.exists(mk)) return tm.get(mk).getSourceImage() as CanvasImageSource;
    if (!this.maskLoading.has(mk)) {
      this.maskLoading.add(mk);
      this.scene.load.image(mk, assetUrl(info.mask));
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => this.maskLoading.delete(mk));
      this.scene.load.start();
    }
    return null;
  }

  private clipTexture(spriteKey: string, itemKey: string, p: Placement): string | null {
    const key = `clip:${spriteKey}:${itemKey}`;
    const tm = this.scene.textures;
    if (tm.exists(key)) return key;
    const info = SPRITES[spriteKey];
    const src = this.maskSource(spriteKey);
    if (!src) return null;
    const item = tm.get(itemKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
    const ct = tm.createCanvas(key, info.w, info.h);
    if (!ct) return null;
    const ctx = ct.context;
    const w = p.width;
    const h = w * (item.height / item.width);
    ctx.save();
    const box = bodyClip(spriteKey);
    if (box) {
      ctx.beginPath();
      ctx.rect(box[0] * info.w, box[1] * info.h, (box[2] - box[0]) * info.w, (box[3] - box[1]) * info.h);
      ctx.clip();
    }
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.drawImage(item, -p.ax * w, -p.ay * h, w, h);
    ctx.restore();
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(src, 0, 0, info.w, info.h);
    ctx.globalCompositeOperation = "source-over";
    ct.refresh();
    return key;
  }

  setReducedMotion(r: boolean) {
    this.reduced = r;
  }

  /** Top-centre of the visible sprite in screen space (for bubbles). */
  /** Top of Cibu's own head (without hats), screen space. */
  faceScreen(): { x: number; y: number } {
    const b = this.active.getBounds();
    return { x: b.centerX, y: b.top + b.height * 0.08 };
  }

  headScreen(): { x: number; y: number } {
    const b = this.active.getBounds();
    let top = b.top + b.height * 0.08;
    // hats count as part of the head, so the bubble sits above them
    for (const l of this.layers) {
      if (!l.img.visible || ITEM_DEFS[l.key]?.slot !== "head") continue;
      top = Math.min(top, l.img.getBounds().top + 4);
    }
    return { x: b.centerX, y: top };
  }

  private scripted = false;
  get isBusy() {
    return this.scripted || this.beats.length > 0 || !!this.beatTimer;
  }
  /** true while an activity script drives Cibu (no idle glances/rotation) */
  setScripted(on: boolean) {
    this.scripted = on;
    if (!on && !this.beatTimer) this.setSprite(this.pickFromPool());
  }
  get x() {
    return this.root.x;
  }

  /** Walk (with the official walk pose) to a design-space x. Resolves on arrival. */
  walkTo(x: number, speed = 120): Promise<void> {
    return new Promise((resolve) => {
      this.stopWalk();
      const dist = Math.abs(x - this.root.x);
      if (dist < 4) return resolve();
      this.walking = true;
      this.setSprite("pose/walk", false);
      this.scene.tweens.add({
        targets: this.root,
        x,
        duration: this.reduced ? 10 : (dist / speed) * 1000,
        ease: "Sine.InOut",
        onComplete: () => {
          this.walking = false;
          resolve();
        },
      });
    });
  }

  setSprite(key: string, withPop = true) {
    if (key === this.key || !this.scene.textures.exists(key)) return;
    const info = SPRITES[key];
    const next = this.active === this.a ? this.b : this.a;
    const prev = this.active;
    next.setTexture(key).setOrigin(info.anchor[0], info.anchor[1]).setAlpha(0);
    this.body.bringToTop(next);
    this.scene.tweens.killTweensOf([next, prev]);
    this.scene.tweens.add({ targets: next, alpha: 1, duration: 140, ease: "Sine.Out" });
    this.scene.tweens.add({ targets: prev, alpha: 0, duration: 180, ease: "Sine.In" });
    this.active = next;
    this.key = key;
    if (withPop && !this.reduced) {
      this.scene.tweens.killTweensOf(this.pop);
      this.pop.v = 0.93;
      this.scene.tweens.add({ targets: this.pop, v: 1, duration: 300, ease: "Back.Out" });
    }
  }

  setPresentation(p: Presentation) {
    if (this.pres?.id === p.id && this.pres.pool.join() === p.pool.join()) return;
    this.pres = p;
    this.motion = p.motion;
    this.rotateTimer?.remove();
    this.fxTimer?.remove();
    if (!this.isBusy) {
      this.setSprite(this.pickFromPool());
      if (p.enterLine) this.cb.say(p.enterLine, 2600);
    }
    this.cb.think(p.thought ?? null);
    this.rotateTimer = this.scene.time.addEvent({
      delay: p.rotateMs,
      loop: true,
      callback: () => {
        if (!this.isBusy && !this.walking) this.setSprite(this.pickFromPool());
      },
    });
    if (p.fx && p.fxEveryMs) {
      this.fxTimer = this.scene.time.addEvent({
        delay: p.fxEveryMs,
        loop: true,
        callback: () => !this.isBusy && this.cb.fx(p.fx!),
      });
    }
  }

  private pickFromPool(): string {
    const pool = this.pres?.pool ?? ["expression/smirk"];
    const options = pool.length > 1 ? pool.filter((k) => k !== this.key) : pool;
    return options[Math.floor(Math.random() * options.length)];
  }

  /** Speak a single beat without ending an activity script. */
  act(beat: Beat) {
    this.setSprite(beat.sprite);
    if (beat.line) this.cb.say(beat.line, beatMs(beat) + 300);
    if (beat.fx) this.cb.fx(beat.fx);
    if (beat.hop) this.hop(typeof beat.hop === "number" ? beat.hop : undefined);
  }

  play(beats: Beat[]) {
    this.beatTimer?.remove();
    this.beatTimer = undefined;
    this.beats = [...beats];
    this.stopWalk();
    this.nextBeat();
  }

  private nextBeat() {
    const beat = this.beats.shift();
    if (!beat) {
      this.beatTimer = undefined;
      this.setSprite(this.pickFromPool());
      return;
    }
    const ms = beatMs(beat);
    this.setSprite(beat.sprite);
    if (beat.cue) this.cb.cue?.(beat.cue);
    if (beat.line) this.cb.say(beat.line, ms + 300);
    if (beat.fx) this.cb.fx(beat.fx);
    if (beat.hop) this.hop(typeof beat.hop === "number" ? beat.hop : undefined);
    if (beat.breathe) {
      this.scene.tweens.killTweensOf(this.deep);
      this.scene.tweens.add({
        targets: this.deep,
        v: beat.breathe === "in" ? 1.12 : beat.breathe === "hold" ? this.deep.v : 1,
        duration: ms * (beat.breathe === "in" ? 0.95 : 0.9),
        ease: "Sine.InOut",
      });
    } else if (this.deep.v !== 1) this.scene.tweens.add({ targets: this.deep, v: 1, duration: 300 });
    this.beatTimer = this.scene.time.delayedCall(ms, () => this.nextBeat());
  }

  hop(height = 34) {
    if (this.reduced) return;
    this.scene.tweens.killTweensOf([this.hopY, this.squash]);
    this.squash.v = 1.06;
    const air = 150 + height * 2.2; // higher jumps hang in the air a little longer
    this.scene.tweens.chain({
      tweens: [
        { targets: this.hopY, v: -height, duration: air, ease: "Quad.Out" },
        { targets: this.hopY, v: 0, duration: air * 0.9, ease: "Quad.In" },
        { targets: this.squash, v: 0.88, duration: 70, ease: "Sine.Out" },
        { targets: this.squash, v: 1, duration: 260, ease: "Back.Out" },
      ],
    });
  }

  wiggle() {
    this.scene.tweens.add({ targets: this.body, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.body.setAngle(0) });
  }

  lookToward(designX: number) {
    if (this.isBusy || this.reduced) return;
    const dir = Math.sign(designX - this.root.x);
    this.scene.tweens.add({ targets: this.body, angle: dir * 5, x: dir * 8, duration: 420, ease: "Sine.InOut" });
    this.nextLook = this.scene.time.now + 2500;
  }

  private walk() {
    const dir = this.root.x > this.home.x ? -1 : this.root.x < this.home.x ? 1 : Math.random() < 0.5 ? -1 : 1;
    const target = Phaser.Math.Clamp(this.root.x + dir * Phaser.Math.Between(50, 90), this.home.x - 110, this.home.x + 110);
    this.walking = true;
    const resume = this.key;
    this.setSprite("pose/walk", false);
    this.scene.tweens.add({
      targets: this.root,
      x: target,
      duration: 1500,
      ease: "Sine.InOut",
      onComplete: () => {
        this.walking = false;
        if (!this.isBusy) this.setSprite(resume === "pose/walk" ? this.pickFromPool() : resume);
      },
    });
  }

  private stopWalk() {
    if (!this.walking) return;
    this.walking = false;
    this.scene.tweens.killTweensOf(this.root);
  }

  /** Go back to the mat centre (e.g. when focus starts). */
  settle() {
    this.stopWalk();
    this.scene.tweens.add({ targets: this.root, x: this.home.x, duration: 700, ease: "Sine.InOut" });
    this.scene.tweens.add({ targets: this.body, angle: 0, x: 0, duration: 500, ease: "Sine.InOut" });
  }

  update(time: number) {
    const m = this.motion;
    const t = time / 1000;
    const breath = Math.sin(t * Math.PI * 2 * m.breathHz) * m.breathAmp * (this.reduced ? 0.5 : 1);
    const walkBob = this.walking ? Math.abs(Math.sin(t * 9)) * -7 : 0;
    const sq = this.squash.v;
    const inflate = this.deep.v; // deep breath: grows in both directions, like filling up with air
    const sy = this.base * this.pop.v * (1 + breath) * sq * inflate;
    const sx = this.base * this.pop.v * (1 - breath * 0.5) * (2 - sq) * (1 + (inflate - 1) * 1.25);
    this.a.setScale(sx, sy);
    this.b.setScale(sx, sy);
    this.placeLayers(sx, sy);
    // typing: quick little bounces in bursts, like tapping keys
    const typeBob = m.typing && !this.isBusy && !this.reduced && t % 2.2 < 1.4 ? -Math.abs(Math.sin(t * 20)) * 3 : 0;
    this.body.y = this.hopY.v + walkBob + typeBob - (this.deep.v - 1) * 60 - this.seat.v;
    // shadow reacts to height
    const lift = Math.min(1, -this.hopY.v / 40);
    this.shadow.setScale(2.1 * (1 - lift * 0.3), 1.3 * (1 - lift * 0.3)).setAlpha(0.8 - lift * 0.35);

    if (m.droop && !this.isBusy) this.body.angle += (m.droop * Math.sin(t * 0.5) - this.body.angle) * 0.02;
    // studying: a soft, happy nod as if reading along
    if (m.nod && !this.isBusy && !this.reduced) this.body.angle += (Math.sin(t * 1.3) * 2.2 - this.body.angle) * 0.05;
    if (m.write && !this.isBusy && !this.reduced) this.body.angle += (Math.sin(t * 5.5) * 1.8 - this.body.angle) * 0.12;
    if (m.typing && !this.isBusy && !this.reduced) this.body.angle += (Math.sin(t * 0.7) * 1.2 - this.body.angle) * 0.05;

    if (!this.reduced && !this.isBusy && !this.walking && time > this.nextLook) {
      this.nextLook = time + Phaser.Math.Between(3200, 7000);
      if (m.walk && Math.random() < 0.28) this.walk();
      else if (m.look) {
        const ang = Phaser.Math.FloatBetween(-5, 5);
        this.scene.tweens.add({ targets: this.body, angle: ang, x: ang * 1.6, duration: 900, ease: "Sine.InOut" });
        if (Math.random() < m.hop) this.hop(Phaser.Math.Between(18, 34));
      } else if (Math.random() < m.hop) this.hop(26);
    }
  }
}
