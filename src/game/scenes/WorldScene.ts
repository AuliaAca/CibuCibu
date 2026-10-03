import Phaser from "phaser";
import { useCibu, modeOf } from "@/store/useCibu";
import { resolveBase, reaction, motivation, showNotesLine, MOTIVATION_EVERY_MIN, FIRST_CHEER_MS, type Fx, type Mode } from "@/core/cibuBrain";
import { StudyDesk } from "../world/study";
import { Flyers } from "../world/flyers";
import { Seat } from "../world/seat";
import { progressOf, remainingMs } from "@/core/pomodoro";
import { foodById } from "@/core/care";
import { outfitById } from "@/core/wardrobe";
import { SPRITES, GREENY_ASSETS } from "../assets";
import { bridge } from "../bridge";
import { CibuActor } from "../cibu/CibuActor";
import { SpeechBubble } from "../cibu/SpeechBubble";
import { atmosAt, localHour, type Atmos } from "../world/atmosphere";
import { sunTimes, resolvePlace, type SunTimes } from "@/lib/sun";
import { Activities } from "../world/activities";
import { paintSky } from "../world/textures";
import { computeView, lerpView, CIBU_FEET, type View } from "../world/view";

interface Layer {
  c: Phaser.GameObjects.Container;
  /** depth factor: 0 = infinitely far, 0.5 = Cibu's plane, >0.5 = in front */
  f: number;
  /** anchor this layer to the bottom edge instead of the world origin */
  bottom?: boolean;
}

interface Sway {
  o: Phaser.GameObjects.Image;
  amp: number;
  spd: number;
  ph: number;
}

/** Per-mode "shot": camera + light. Motion is always functional: it orients and frames. */
const SHOTS: Record<Mode, { zoom: number; vig: number; glow: number; dur: number }> = {
  idle: { zoom: 1.0, vig: 0.22, glow: 0.22, dur: 1400 },
  focus: { zoom: 1.16, vig: 0.58, glow: 0.55, dur: 1600 },
  paused: { zoom: 1.07, vig: 0.4, glow: 0.3, dur: 1200 },
  complete: { zoom: 1.03, vig: 0.1, glow: 0.75, dur: 900 },
  break: { zoom: 0.97, vig: 0.12, glow: 0.2, dur: 1600 },
  breakOver: { zoom: 1.06, vig: 0.26, glow: 0.35, dur: 1000 },
};

const PALETTE = [0xff781d, 0xfdbf2e, 0x81ccd0, 0xfd919f, 0xb0ce6b, 0xd4bde2];

export class WorldScene extends Phaser.Scene {
  private dpr = 1;
  private view!: View;
  private viewTarget!: View;
  private insetKey = "";
  private layers: Layer[] = [];
  // focal point at Cibu's feet: zooming grows him upward, never down into the controls
  private cam = { zoom: 1.28, fx: CIBU_FEET.x, fy: CIBU_FEET.y, panY: 0 };
  private par = { x: 0, y: 0, tx: 0, ty: 0, dragging: false, sx: 0, sy: 0 };
  private light = { vig: 0.2, glow: 0.2 };
  private sways: Sway[] = [];
  private clouds: { o: Phaser.GameObjects.Image; v: number }[] = [];

  private sky!: Phaser.GameObjects.Image;
  private stars!: Phaser.GameObjects.Graphics;
  private sun!: Phaser.GameObjects.Container;
  private moon!: Phaser.GameObjects.Container;
  private rays: Phaser.GameObjects.Image[] = [];
  private tint!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
  private relight!: Phaser.GameObjects.Image;
  private lampGlow!: Phaser.GameObjects.Image;
  private cibuGlow!: Phaser.GameObjects.Image;
  private corners: { o: Phaser.GameObjects.Image; ax: number; ay: number }[] = [];

  private stage!: Phaser.GameObjects.Container;
  private cibu!: CibuActor;
  private bubble!: SpeechBubble;
  private thought!: SpeechBubble;
  private props: Record<string, Phaser.GameObjects.Image> = {};
  private desk!: StudyDesk;
  private flyers!: Flyers;
  private seat!: Seat;
  private seatOn = false;
  private farLayer!: Phaser.GameObjects.Container;
  private deskFallback?: Phaser.Time.TimerEvent;

  private pollen!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireflies!: Phaser.GameObjects.Particles.ParticleEmitter;
  private leaves!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fx: Partial<Record<NonNullable<Fx> | "leafBurst", Phaser.GameObjects.Particles.ParticleEmitter>> = {};

  private pollenZone = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private fireflyZone = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private atmos!: Atmos;
  private mode: Mode | null = null;
  private lastReaction = 0;
  private lastSync = 0;
  private lastAtmos = 0;
  private lampManual: boolean | null = null;
  activities!: Activities;
  private sunCache: { at: number; key: string; t: SunTimes } | null = null;
  private wasNight = false;
  private cheer = { session: 0 as number | null, last: 0, milestones: new Set<number>() };
  private reduced = false;

  constructor() {
    super("world");
  }

  create() {
    this.dpr = (this.registry.get("dpr") as number) ?? 1;
    this.view = this.viewTarget = computeView(this.scale.width, this.scale.height, this.insetsPx());
    this.input.setTopOnly(true);

    this.buildSky();
    this.buildWorld();
    this.buildOverlays();
    this.buildFx();

    this.bubble = new SpeechBubble(this, this.dpr);
    this.activities = new Activities({
      scene: this,
      stage: this.stage,
      cibu: this.cibu,
      plant: this.props["prop/plant"],
      feetY: CIBU_FEET.y,
      playFx: (f) => this.playFx(f),
      burstAt: (key, n, x, y) => this.fx[key]?.explode(n, x, y),
      wiggle: (o) => this.wiggle(o),
      screen: () => ({ w: this.view.w, h: this.view.h, dpr: this.dpr }),
      timeOfDay: () => {
        const h = localHour();
        const sun = this.sunNow();
        if (this.atmos.night > 0.5) return "night";
        if (h < sun.riseH + 3.5) return "morning";
        if (h > sun.setH - 2.5) return "evening";
        return "day";
      },
    });
    this.thought = new SpeechBubble(this, this.dpr);

    this.atmos = this.atmosNow();
    this.wasNight = this.atmos.night > 0.5;
    this.applyAtmos(true);
    this.layout();
    this.scale.on("resize", () => this.layout());
    this.bindInput();

    // ignore reactions that happened before the scene existed
    const st = useCibu.getState();
    this.lastReaction = st.reactions.at(-1)?.id ?? 0;
    this.syncStore(true);

    // establishing shot: fade in, dolly out to the mode's framing, then say hi
    this.cameras.main.fadeIn(900, 251, 244, 236);
    this.tweens.add({ targets: this.cam, zoom: this.shotZoom(this.mode ?? "idle"), duration: this.reduced ? 10 : 2200, ease: "Cubic.InOut" });
    if (this.mode === "idle")
      this.time.delayedCall(1300, () => {
        // only greet if the user hasn't already started something
        if (this.mode === "idle" && !this.cibu.isBusy) this.cibu.play(reaction("hello", { hour: Math.floor(localHour()) }));
      });
    bridge.emit("ready", undefined);
  }

  // ------------------------------------------------------------------ building
  private layer(f: number, depth: number, bottom = false) {
    const c = this.add.container(0, 0).setDepth(depth);
    this.layers.push({ c, f, bottom });
    return c;
  }

  private img(parent: Phaser.GameObjects.Container, key: string, x: number, y: number, ox = 0, oy = 0, s = 1) {
    // svg textures are rasterised at some scale; normalise back to design units
    const tex = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const asset = key.includes("/") ? null : this.designSize(key);
    const img = this.add.image(x, y, key).setOrigin(ox, oy);
    if (asset) img.setScale((asset.w / tex.width) * s);
    else img.setScale(s);
    parent.add(img);
    return img;
  }

  private designSize(key: string) {
    return GREENY_ASSETS.find((a) => a.key === key);
  }

  private sway(o: Phaser.GameObjects.Image, amp: number, spd = 1) {
    this.sways.push({ o, amp, spd: spd * Phaser.Math.FloatBetween(0.8, 1.2), ph: Math.random() * Math.PI * 2 });
  }

  private buildSky() {
    this.sky = this.add.image(0, 0, "sky").setOrigin(0).setDepth(0);
    this.stars = this.add.graphics().setDepth(1);
  }

  private buildWorld() {
    // far: sun, moon, clouds
    const far = this.layer(0.04, 5);
    this.farLayer = far;
    this.sun = this.add.container(1170, 210);
    this.sun.add([
      this.add.image(0, 0, "glow").setScale(2.6).setTint(0xfff0c0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8),
      this.add.circle(0, 0, 40, 0xfff6dc),
    ]);
    this.moon = this.add.container(1210, 190);
    this.moon.add([
      this.add.image(0, 0, "glow").setScale(1.8).setTint(0xb8c6ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5),
      this.add.circle(0, 0, 30, 0xf6f1dc),
      this.add.circle(-9, -6, 6, 0xe6e0c6),
      this.add.circle(8, 9, 4, 0xe6e0c6),
    ]);
    far.add([this.sun, this.moon]);
    [
      [120, 120, 0.9, 7],
      [620, 70, 0.6, 5],
      [980, 150, 0.75, 9],
      [1450, 95, 1.0, 6],
    ].forEach(([x, y, s, v]) => this.clouds.push({ o: this.img(far, "cloud", x, y, 0.5, 0.5, s), v }));

    const hillsFar = this.layer(0.1, 10);
    this.img(hillsFar, "hills-far", -300, 300);
    const hillsNear = this.layer(0.18, 12);
    this.img(hillsNear, "hills-near", -300, 392);
    const treesBack = this.layer(0.25, 14);
    this.img(treesBack, "trees-back", -400, 338);

    const ground = this.layer(0.4, 20);
    this.img(ground, "ground", -500, 540);

    const mid = this.layer(0.44, 22);
    const tl = this.img(mid, "tree-left", 300, 690, 0.5, 1, 0.92);
    this.sway(tl, 0.5, 0.35);
    const tr = this.img(mid, "tree-right", 1370, 640, 0.5, 1, 0.8);
    this.sway(tr, 0.6, 0.4);
    this.sway(this.img(mid, "bush", 545, 700, 0.5, 1, 0.72), 0.8, 0.5);
    this.sway(this.img(mid, "bush", 1245, 676, 0.5, 1, 0.62), 0.8, 0.5);
    const sign = this.img(mid, "sign", 1110, 676, 0.5, 1, 0.58);
    sign.setInteractive({ useHandCursor: true }).on("pointerdown", (_p: unknown, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.tweens.add({ targets: sign, angle: { from: -3, to: 3 }, duration: 110, yoyo: true, repeat: 1, onComplete: () => sign.setAngle(0) });
      this.cibu.play([{ sprite: "expression/proud", ms: 2400, line: "Greeny Garden, rumah kita!", hop: true }]);
      this.par.tx = 22;
      this.time.delayedCall(1600, () => (this.par.tx = 0));
    });
    this.leaves = this.add.particles(0, 0, "leaf", {
      x: { min: 150, max: 520 },
      y: { min: 160, max: 420 },
      lifespan: 7000,
      speedY: { min: 25, max: 55 },
      speedX: { min: 10, max: 45 },
      rotate: { start: 0, end: 540 },
      scale: { min: 0.45, max: 0.8 },
      alpha: { start: 0.95, end: 0 },
      tint: [0x8fcf62, 0x6fb24f, 0xfd919f],
      frequency: 2600,
    });
    mid.add(this.leaves);

    // stage: Cibu's plane
    this.stage = this.layer(0.5, 30);
    this.cibuGlow = this.add.image(CIBU_FEET.x, CIBU_FEET.y - 120, "glow").setScale(3.4, 2.6).setTint(0xffd79a).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(this.cibuGlow);
    this.img(this.stage, "mat", CIBU_FEET.x, CIBU_FEET.y + 4, 0.5, 0.55, 0.84);
    this.addProp("prop/plant", 612, CIBU_FEET.y + 10, 118, () => {
      this.wiggle(this.props["prop/plant"]);
      this.fx.leafBurst?.explode(6, 612, CIBU_FEET.y - 90);
    });
    this.addProp("prop/lamp", 992, CIBU_FEET.y + 6, 124, () => {
      this.wiggle(this.props["prop/lamp"]);
      this.lampManual = !this.lampOn();
    });
    this.addProp("prop/clock", 1060, CIBU_FEET.y + 20, 64, () => {
      this.wiggle(this.props["prop/clock"]);
      useCibu.getState().tapClock();
    });
    this.lampGlow = this.add.image(1010, CIBU_FEET.y - 80, "glow").setScale(1.7).setTint(0xffc46b).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.stage.add(this.lampGlow);

    this.cibu = new CibuActor(this, this.stage, CIBU_FEET.x, CIBU_FEET.y, {
      say: (t, ms) => this.bubble.say(t, ms),
      cue: (name) => {
        if (name === "desk" && (this.mode === "focus" || this.mode === "paused")) {
          this.deskFallback?.remove();
          this.desk.setActive(true, true);
        }
      },
      fx: (f) => this.playFx(f),
      think: (k) => (k ? this.thought.think(k) : this.thought.hide()),
      poke: () => useCibu.getState().poke(),
    });

    this.desk = new StudyDesk(this, this.stage, CIBU_FEET.x, CIBU_FEET.y, {
      cibu: this.cibu,
      say: (t, ms) => this.bubble.say(t, ms),
      fx: (f) => this.playFx(f),
    });
    this.seat = new Seat(this, this.stage, CIBU_FEET.x, CIBU_FEET.y, {
      cibu: this.cibu,
      say: (t, ms) => this.bubble.say(t, ms),
      fx: (f) => this.playFx(f),
      onSeated: (v) => useCibu.setState({ seated: v }),
    });
    this.flyers = new Flyers(this, this.farLayer, this.stage, CIBU_FEET.x, CIBU_FEET.y);

    // near flowers
    const near = this.layer(0.62, 40);
    [
      ["flower-a", 420, 790, 1.0],
      ["flower-c", 470, 800, 0.9],
      ["flower-b", 1175, 800, 1.0],
      ["flower-a", 1240, 780, 0.85],
      ["flower-c", 1330, 812, 1.1],
      ["flower-b", 300, 770, 0.8],
    ].forEach(([k, x, y, s]) => this.sway(this.img(near, k as string, x as number, y as number, 0.5, 1, s as number), 2.4, 0.9));

    // foreground grass, anchored to the bottom edge of the screen
    const fg = this.layer(0.85, 50, true);
    const xs = [-120, 20, 170, 330, 470, 1130, 1280, 1420, 1560, 1700];
    xs.forEach((x, i) => {
      const k = i % 3 === 0 ? "grass-b" : "grass-a";
      this.sway(this.img(fg, k, x, 912, 0.5, 1, Phaser.Math.FloatBetween(1.1, 1.6)), 3, 0.8);
    });
    this.sway(this.img(fg, "flower-a", 250, 918, 0.5, 1, 1.35), 3.2, 0.8);
    this.sway(this.img(fg, "flower-b", 1360, 918, 0.5, 1, 1.25), 3.2, 0.8);

    // depth-of-field leaves in the corners (screen space)
    const tlc = this.add.image(0, 0, "leaves-corner").setOrigin(0).setDepth(60).setAlpha(0.92);
    const brc = this.add.image(0, 0, "leaves-corner").setOrigin(0).setDepth(60).setAngle(180).setAlpha(0.9);
    this.corners = [
      { o: tlc, ax: 0, ay: 0 },
      { o: brc, ax: 1, ay: 1 },
    ];
  }

  private addProp(key: string, x: number, y: number, height: number, onTap: () => void) {
    const info = SPRITES[key];
    const img = this.add.image(x, y, key).setOrigin(0.5, info.anchor[1]);
    img.setScale(height / img.height);
    img.setInteractive({ pixelPerfect: true, alphaTolerance: 40, useHandCursor: true });
    img.on("pointerdown", (_p: unknown, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      onTap();
    });
    this.stage.add(img);
    this.props[key] = img;
    return img;
  }

  private addStatic(key: string, x: number, y: number, height: number) {
    const img = this.add.image(x, y, key).setOrigin(0.5, SPRITES[key]?.anchor[1] ?? 1);
    img.setScale(height / img.height);
    this.stage.add(img);
    return img;
  }

  private wiggle(o: Phaser.GameObjects.Image) {
    const s = o.scaleX;
    this.tweens.add({ targets: o, angle: { from: -7, to: 7 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => o.setAngle(0) });
    this.tweens.add({ targets: o, scaleX: s * 1.06, scaleY: s * 0.94, duration: 120, yoyo: true });
  }

  private buildOverlays() {
    this.rays = [0, 1, 2].map(() => this.add.image(0, 0, "ray").setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff1c4).setDepth(66));
    this.tint = this.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0).setDepth(70);
    this.relight = this.add.image(0, 0, "glow").setTint(0xffc98a).setBlendMode(Phaser.BlendModes.ADD).setDepth(72).setAlpha(0);
    this.vignette = this.add.image(0, 0, "vignette").setDepth(80);
  }

  private buildFx() {
    const d = this.dpr;
    this.pollen = this.add.particles(0, 0, "dot", {
      emitZone: { type: "random", source: this.pollenZone, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      lifespan: 9000,
      speedX: { min: -6 * d, max: 14 * d },
      speedY: { min: -16 * d, max: -4 * d },
      scale: { min: 0.06 * d, max: 0.16 * d },
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: unknown, t: number) => Math.sin(t * Math.PI) * 0.75 },
      tint: [0xfff6d8, 0xffffff, 0xfff0a8],
      blendMode: "ADD",
      frequency: 380,
    });
    this.fireflies = this.add.particles(0, 0, "dot", {
      emitZone: { type: "random", source: this.fireflyZone, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      lifespan: 7000,
      speedX: { min: -12 * d, max: 12 * d },
      speedY: { min: -10 * d, max: 6 * d },
      scale: { min: 0.14 * d, max: 0.3 * d },
      alpha: {
        onEmit: () => 0,
        onUpdate: (p: Phaser.GameObjects.Particles.Particle, _k: unknown, t: number) =>
          Math.sin(t * Math.PI) * (0.55 + 0.45 * Math.sin(t * 38 + (p.x + p.y) * 0.02)),
      },
      tint: [0xfff59a, 0xe8ff9a],
      blendMode: "ADD",
      frequency: 260,
      emitting: false,
    });
    this.pollen.setDepth(45);
    this.fireflies.setDepth(45);

    const s = this.stage;
    const add = (key: NonNullable<Fx> | "leafBurst", tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) => {
      const e = this.add.particles(0, 0, tex, { ...cfg, emitting: false });
      s.add(e);
      this.fx[key] = e;
    };
    add("confetti", "confetti", {
      speed: { min: 300, max: 620 },
      angle: { min: 205, max: 335 },
      gravityY: 720,
      lifespan: 2600,
      rotate: { start: 0, end: 720 },
      scaleX: { min: 0.8, max: 1.4 },
      scaleY: { min: 0.6, max: 1.1 },
      alpha: { start: 1, end: 0, ease: "Expo.In" },
      tint: PALETTE,
    });
    add("sparkle", "spark", {
      x: { min: -120, max: 120 },
      y: { min: -250, max: -40 },
      speed: { min: 10, max: 60 },
      lifespan: 1000,
      scale: { start: 0.55, end: 0 },
      rotate: { min: 0, max: 90 },
      tint: [0xfff6b0, 0xffffff, 0xffd46b],
      blendMode: "ADD",
    });
    add("hearts", "heart", {
      x: { min: -60, max: 60 },
      speedY: { min: -140, max: -70 },
      speedX: { min: -50, max: 50 },
      lifespan: 1500,
      scale: { start: 0.5, end: 0.25 },
      alpha: { start: 1, end: 0 },
      tint: [0xfd919f, 0xff6f8f],
    });
    add("bubbles", "bubble", {
      x: { min: -110, max: 110 },
      y: { min: -220, max: -20 },
      speedY: { min: -90, max: -30 },
      speedX: { min: -30, max: 30 },
      lifespan: 1900,
      scale: { min: 0.3, max: 0.85 },
      alpha: { start: 1, end: 0, ease: "Quad.In" },
    });
    add("zzz", "zz", {
      speedX: { min: 18, max: 36 },
      speedY: { min: -55, max: -35 },
      lifespan: 2600,
      scale: { start: 0.55, end: 1.1 },
      alpha: { start: 1, end: 0 },
      tint: 0x7fa7e8,
    });
    add("dust", "dot", {
      x: { min: -90, max: 90 },
      y: { min: -160, max: -10 },
      speed: { min: 6, max: 18 },
      lifespan: 1700,
      scale: { min: 0.08, max: 0.16 },
      alpha: { start: 0.55, end: 0 },
      tint: 0x8d7b62,
    });
    add("notes", "note", {
      speedX: { min: 15, max: 45 },
      speedY: { min: -80, max: -45 },
      lifespan: 2200,
      scale: { start: 0.6, end: 0.9 },
      alpha: { start: 1, end: 0 },
      tint: [0xfd919f, 0x81ccd0, 0xb79bd8],
    });
    add("puff", "dot", {
      speedX: { min: 40, max: 110 },
      speedY: { min: -30, max: 10 },
      lifespan: 1300,
      scale: { start: 0.25, end: 0.9 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xffffff,
    });
    add("leafBurst", "leaf", {
      speed: { min: 60, max: 160 },
      angle: { min: 200, max: 340 },
      gravityY: 160,
      lifespan: 1600,
      rotate: { start: 0, end: 360 },
      scale: { min: 0.5, max: 0.8 },
      alpha: { start: 1, end: 0 },
      tint: [0x8fcf62, 0x6fb24f],
    });
  }

  private playFx(f: Fx) {
    if (!f) return;
    const e = this.fx[f];
    if (!e) return;
    const x = this.cibu.root.x;
    const y = this.cibu.root.y;
    const n = this.reduced ? 0.35 : 1;
    switch (f) {
      case "confetti":
        e.explode(Math.round(90 * n), x, y - 140);
        this.time.delayedCall(260, () => e.explode(Math.round(50 * n), x, y - 160));
        this.fx.sparkle?.explode(Math.round(14 * n), x, y);
        break;
      case "sparkle":
        e.explode(Math.round(12 * n), x, y);
        break;
      case "hearts":
        e.explode(5, x, y - 210);
        break;
      case "bubbles":
        e.explode(Math.round(26 * n), x, y);
        break;
      case "zzz":
        e.explode(1, x + 70, y - 200);
        break;
      case "dust":
        e.explode(3, x, y);
        break;
      case "puff": {
        // a soft "fuuu" drifting from Cibu's mouth
        const mx = x + 40;
        const my = y - 120;
        e.explode(6, mx, my);
        this.time.delayedCall(350, () => e.explode(6, mx, my));
        this.time.delayedCall(750, () => e.explode(5, mx, my));
        break;
      }
      case "notes":
        e.explode(1, x + 80, y - 190);
        break;
    }
  }

  /** The chosen food hops from the care dock into Cibu's mouth. */
  private flyFood(key: string) {
    if (!this.textures.exists(key)) return;
    const d = this.dpr;
    const { w, h } = this.view;
    const head = this.cibu.faceScreen();
    const to = { x: head.x, y: head.y + 70 * d * this.view.k };
    const img = this.add.image(w - 90 * d, h * 0.5, key).setDepth(90);
    img.setScale((64 * d) / Math.max(img.width, img.height));
    const s0 = img.scaleX;
    const dur = this.reduced ? 200 : 650;
    this.tweens.add({ targets: img, x: to.x, duration: dur, ease: "Sine.InOut" });
    this.tweens.add({ targets: img, y: Math.min(img.y, to.y) - 90 * d, duration: dur * 0.45, ease: "Quad.Out", yoyo: false,
      onComplete: () => this.tweens.add({ targets: img, y: to.y, duration: dur * 0.55, ease: "Quad.In" }) });
    this.tweens.add({ targets: img, angle: 360, duration: dur, ease: "Sine.InOut" });
    this.tweens.add({
      targets: img,
      scale: s0 * 0.35,
      delay: dur * 0.75,
      duration: dur * 0.25,
      onComplete: () => {
        img.destroy();
        this.cibu.hop(14);
        this.playFx("sparkle");
      },
    });
  }

  // ------------------------------------------------------------------ input
  private bindInput() {
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.reduced) return;
      if (p.wasTouch) {
        if (!this.par.dragging) return;
        this.par.tx = Phaser.Math.Clamp((p.x - this.par.sx) / this.view.w, -0.5, 0.5) * -60;
        this.par.ty = Phaser.Math.Clamp((p.y - this.par.sy) / this.view.h, -0.5, 0.5) * -30;
      } else {
        this.par.tx = (p.x / this.view.w - 0.5) * 34;
        this.par.ty = (p.y / this.view.h - 0.5) * 16;
      }
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.par.dragging = true;
      this.par.sx = p.x;
      this.par.sy = p.y;
      const designX = (p.x - this.view.ox) / this.view.k;
      this.cibu.lookToward(designX);
    });
    const release = () => {
      this.par.dragging = false;
      if (this.input.activePointer.wasTouch) {
        this.par.tx = 0;
        this.par.ty = 0;
      }
    };
    this.input.on("pointerup", release);
    this.input.on("gameout", () => {
      this.par.tx = 0;
      this.par.ty = 0;
    });
  }

  // ------------------------------------------------------------------ layout & camera
  private insetsPx() {
    const i = useCibu.getState().insets;
    // room for a two-line speech bubble (+ tail) above his head
    return { top: i.top * this.dpr, bottom: i.bottom * this.dpr, right: i.right * this.dpr, bubble: 84 * this.dpr };
  }

  private layout() {
    this.viewTarget = computeView(this.scale.width, this.scale.height, this.insetsPx());
    // size changes apply at once; framing changes (insets) glide in update()
    if (this.view.w !== this.viewTarget.w || this.view.h !== this.viewTarget.h) this.view = this.viewTarget;
    const { w, h } = this.viewTarget;
    this.sky.setDisplaySize(w, h);
    this.tint.setSize(w, h);
    const vs = Math.max(w, h) * 1.7;
    this.vignette.setDisplaySize(vs, vs);
    this.stars.clear();
    const rnd = new Phaser.Math.RandomDataGenerator(["cibu-stars"]);
    for (let i = 0; i < 90; i++) {
      this.stars.fillStyle(0xffffff, rnd.realInRange(0.35, 1));
      this.stars.fillCircle(rnd.between(0, w), rnd.between(0, h * 0.5), rnd.realInRange(0.6, 1.8) * this.dpr);
    }
    this.rays.forEach((r, i) => {
      r.setPosition(w * (0.12 + i * 0.11), -h * 0.08).setAngle(-28 + i * 4);
      r.setDisplaySize(w * (0.08 + i * 0.03), h * 1.35);
    });
    this.pollenZone.setTo(0, h * 0.2, w, h * 0.8);
    this.fireflyZone.setTo(0, h * 0.42, w, h * 0.52);
    this.applyCamera();
  }

  private applyCamera() {
    const { k, ox, oy, h, w } = this.view;
    const cs = k * (this.view.portrait ? 0.75 : 1);
    this.corners.forEach((c) => c.o.setScale((640 / c.o.width) * cs));
    this.relight.setScale(k * 3.2);
    const z = this.cam.zoom;
    const Fx = ox + k * this.cam.fx;
    const Fy = oy + k * this.cam.fy;
    for (const L of this.layers) {
      const s = Math.pow(z, L.f / 0.5);
      const loy = L.bottom ? h - 905 * k : oy;
      L.c.setScale(k * s);
      L.c.x = Fx * (1 - s) + s * ox - this.par.x * L.f * k;
      L.c.y = Fy * (1 - s) + s * loy - this.par.y * L.f * k + this.cam.panY * k * (L.f / 0.5);
    }
    const sc = Math.pow(z, 2.2);
    for (const c of this.corners) {
      const pad = 30 * k;
      const px = c.ax ? w + pad : -pad;
      const py = c.ay ? h + pad : -pad;
      c.o.x = Fx + sc * (px - Fx) - this.par.x * 1.2 * k;
      c.o.y = Fy + sc * (py - Fy) - this.par.y * 1.2 * k + this.cam.panY * k * 2.2;
    }
    // things that follow Cibu in screen space
    const head = this.cibu.headScreen();
    const m = this.cibu.root.getWorldTransformMatrix();
    this.relight.setPosition(m.tx, m.ty - 110 * k * z);
    this.vignette.setPosition(m.tx, m.ty - 120 * k * z);
    const minTop = useCibu.getState().insets.top * this.dpr + 6 * this.dpr;
    this.bubble.follow(head.x, head.y, minTop, w);
    this.thought.follow(head.x, head.y, minTop, w);
    // never stack the two bubbles: a spoken line temporarily hides the thought
    this.thought.setVisible(!this.bubble.shown);
  }

  // ------------------------------------------------------------------ atmosphere
  private lampOn() {
    if (this.lampManual != null) return this.lampManual;
    return this.mode === "focus" || this.mode === "paused" || this.atmos.night > 0.5;
  }

  private applyAtmos(instant = false) {
    const a = this.atmos;
    paintSky(this, a.skyTop, a.skyMid, a.skyBottom);
    const hour = localHour();
    const sun = this.sunNow();
    const arc = Math.max(0, Math.sin(((hour - sun.riseH + 0.3) / (sun.setH - sun.riseH + 0.6)) * Math.PI));
    this.sun.setAlpha(a.sunA).setY(420 - arc * 260);
    this.moon.setAlpha(a.moonA);
    this.stars.setAlpha(a.night);
    this.clouds.forEach((c) => c.o.setTint(a.night > 0.5 ? 0x9aa3d6 : 0xffffff).setAlpha(a.night > 0.5 ? 0.35 : 0.95));
    this.tint.setFillStyle(a.tint, a.tintA);
    const ff = a.night > 0.45;
    this.fireflies.emitting = ff;
    this.pollen.emitting = !ff;
    void instant;
  }

  /** Portrait screens already frame Cibu large, so camera moves are halved there. */
  private shotZoom(mode: Mode) {
    const z = SHOTS[mode].zoom;
    return this.view.portrait ? 1 + (z - 1) * 0.5 : z;
  }

  /** Real sunrise/sunset for the user's place (GPS if allowed, else time zone), cached 10 min. */
  private sunNow(): SunTimes {
    const place = resolvePlace(useCibu.getState().settings.place);
    const key = `${place.lat},${place.lon}`;
    const now = Date.now();
    if (!this.sunCache || this.sunCache.key !== key || now - this.sunCache.at > 600_000)
      this.sunCache = { at: now, key, t: sunTimes(new Date(), place.lat, place.lon) };
    return this.sunCache.t;
  }

  private atmosNow() {
    const sun = this.sunNow();
    return atmosAt(localHour(), sun.riseH, sun.setH);
  }

  /** Cibu notices the sky change: sunrise → "Pagi!", nightfall → stars. */
  private greetSky() {
    const night = this.atmos.night > 0.5;
    if (night === this.wasNight) return;
    this.wasNight = night;
    const calm = this.mode === "idle" || this.mode === "break";
    if (!calm || this.cibu.isBusy) return;
    this.cibu.play(reaction(night ? "sunset" : "sunrise", { hour: Math.floor(localHour()) }));
  }

  private setShot(mode: Mode, prev: Mode | null) {
    const shot = SHOTS[mode];
    const d = this.reduced ? 10 : shot.dur;
    this.tweens.killTweensOf(this.light);
    this.tweens.add({ targets: this.light, vig: shot.vig, glow: shot.glow, duration: d, ease: "Sine.InOut" });
    const studying = mode === "focus" || mode === "paused";
    const wasStudying = prev === "focus" || prev === "paused";
    // after the happy start jumps & pep talk, the study corner slides in
    this.flyers.setActive(studying);
    if (studying !== wasStudying) {
      if (!studying) this.desk.setActive(false);
      // reload/resume: desk right away. New session: wait for the "desk" cue at the end of
      // the start sequence (jump → pep talk → "Mode belajar: ON!"), with a fallback.
      else if (prev === null) this.desk.setActive(true, false, progressOf(useCibu.getState().session, Date.now()));
      else {
        this.deskFallback?.remove();
        // a pause during the pep talk replaces the beats (and the cue), so the fallback covers it
        this.deskFallback = this.time.delayedCall(16_000, () => (this.mode === "focus" || this.mode === "paused") && this.desk.setActive(true, true));
      }
    }
    if (prev === null) return; // establishing shot handles the first framing
    this.tweens.killTweensOf(this.cam);
    if (mode === "complete" && !this.reduced) {
      // pull back with a gentle overshoot, like the camera exhaling
      this.tweens.chain({
        targets: this.cam,
        tweens: [
          { zoom: 0.98, duration: 700, ease: "Cubic.Out" },
          { zoom: this.shotZoom(mode), duration: 900, ease: "Sine.InOut" },
        ],
      });
    } else {
      this.tweens.add({ targets: this.cam, zoom: this.shotZoom(mode), duration: d, ease: "Sine.InOut" });
    }
    if (mode === "focus" && prev !== "paused") this.cibu.settle();
  }

  // ------------------------------------------------------------------ store sync
  private syncStore(first = false) {
    const st = useCibu.getState();
    const now = Date.now();
    const mode = modeOf(st.session);
    const ik = `${st.insets.top | 0}/${st.insets.bottom | 0}/${st.insets.right | 0}`;
    if (ik !== this.insetKey) {
      this.insetKey = ik;
      if (!first) this.layout();
    }
    const sysReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.reduced = st.settings.motion === "reduced" || (st.settings.motion === "system" && !!sysReduced);
    this.cibu.setReducedMotion(this.reduced);

    if (mode !== this.mode) {
      const prev = first ? null : this.mode;
      this.mode = mode;
      this.setShot(mode, prev);
      if (mode === "focus" || mode === "idle") this.lampManual = null;
    }

    this.cibu.setLayers(outfitById(st.inventory.equipped)?.layers ?? []);
    const breathing = mode === "break" && st.breakActivity === "breathe";
    if (breathing !== this.seatOn) {
      this.seatOn = breathing;
      if (breathing) {
        this.activities?.cancel();
        this.cibu.play([]);
        void this.seat.start();
      } else this.seat.leave();
    }
    const pausedForMs = st.session.status === "paused" && st.session.pausedAt ? now - st.session.pausedAt : 0;
    this.cibu.setPresentation(
      resolveBase({
        mode,
        progress: progressOf(st.session, now),
        care: st.care,
        outfit: outfitById(st.inventory.equipped)?.combo ?? null,
        studyTask: this.desk.task,
        pausedForMs,
        hour: Math.floor(localHour()),
      }),
    );

    this.maybeCheer(mode, st.session.startedAt, progressOf(st.session, now), st.settings.motivation, now);
    const calm = mode === "idle" || (mode === "break" && st.care.energy >= 50 && st.breakActivity !== "breathe" && st.breakActivity !== "color");
    this.activities?.update(calm && !this.reduced && st.sheet === null && !first);

    for (const r of st.reactions) {
      if (r.id <= this.lastReaction) continue;
      this.lastReaction = r.id;
      if (now - r.at > 8000) continue;
      this.activities?.cancel();
      const remainingMin = r.meta?.remainingMin ?? (mode === "focus" ? Math.ceil(remainingMs(st.session, now) / 60_000) : undefined);
      const food = r.meta?.food ? foodById(r.meta.food) : undefined;
      if (r.kind === "eat" && food) this.flyFood(food.sprite);
      if (r.kind === "drink") this.flyFood("prop/drink");
      this.cibu.play(
        reaction(r.kind, {
          hour: Math.floor(localHour()),
          remainingMin: r.kind === "clock" || r.kind === "ended" ? r.meta?.remainingMin : remainingMin,
          food: food ? { label: food.label, kind: food.kind } : undefined,
          phase: r.meta?.phase,
          ms: r.meta?.ms,
          cycle: r.meta?.cycle,
          total: r.meta?.total,
          line: r.meta?.line,
        }),
      );
    }
  }

  /** Cute encouragement every few minutes of focus, plus at ¼, ½ and ¾ — never while Cibu is mid-reaction. */
  private maybeCheer(mode: Mode, startedAt: number | null, progress: number, freq: keyof typeof MOTIVATION_EVERY_MIN, now: number) {
    if (mode !== "focus" || freq === "off" || !startedAt) return;
    const every = MOTIVATION_EVERY_MIN[freq] * 60_000;
    if (this.cheer.session !== startedAt) {
      // first encouragement ~75s after settling in, then on the regular rhythm
      this.cheer = { session: startedAt, last: now - every + FIRST_CHEER_MS, milestones: new Set() };
      return;
    }
    if (this.cibu.isBusy) return;
    const milestone = [0.25, 0.5, 0.75].find((m) => progress >= m && progress < m + 0.04 && !this.cheer.milestones.has(m));
    const due = now - this.cheer.last >= every;
    const milestoneOk = milestone != null && now - this.cheer.last >= 90_000;
    if (!due && !milestoneOk) return;
    if (milestone != null) this.cheer.milestones.add(milestone);
    this.cheer.last = now;
    this.cibu.play(motivation({ progress, hour: Math.floor(localHour()) }));
  }

  // ------------------------------------------------------------------ frame
  update(time: number, delta: number) {
    const dt = delta / 1000;
    if (time - this.lastSync > 200) {
      this.lastSync = time;
      this.syncStore();
    }
    if (time - this.lastAtmos > 20_000) {
      this.lastAtmos = time;
      this.atmos = this.atmosNow();
      this.greetSky();
      this.applyAtmos();
    }

    // parallax easing + idle camera drift (a slow "handheld" breath)
    const drift = this.reduced ? 0 : Math.sin(time / 5200) * 5;
    this.par.x += (this.par.tx + drift - this.par.x) * 0.06;
    this.par.y += (this.par.ty + Math.sin(time / 7300) * 2 - this.par.y) * 0.06;

    // wind: gusts modulate every sway
    const gust = 0.7 + 0.3 * Math.sin(time / 3100) * Math.sin(time / 1700);
    const t = time / 1000;
    const swayScale = this.reduced ? 0.2 : 1;
    for (const s of this.sways) s.o.setAngle(Math.sin(t * s.spd + s.ph) * s.amp * gust * swayScale);

    for (const c of this.clouds) {
      c.o.x += c.v * dt * (this.reduced ? 0.2 : 1);
      if (c.o.x > 1950) c.o.x = -350;
    }

    // light
    const lampTarget = this.lampOn() ? 0.55 + 0.05 * Math.sin(t * 3) : 0;
    this.lampGlow.setAlpha(this.lampGlow.alpha + (lampTarget - this.lampGlow.alpha) * 0.08);
    this.cibuGlow.setAlpha(this.light.glow * (0.8 + 0.2 * Math.sin(t * 0.8)));
    this.relight.setAlpha(this.atmos.night * 0.35 + this.light.glow * 0.18);
    this.vignette.setAlpha(this.light.vig + this.atmos.night * 0.15);
    const focusDim = this.mode === "focus" ? 0.5 : 1;
    this.rays.forEach((r, i) => r.setAlpha(this.atmos.rays * focusDim * (0.55 + 0.45 * Math.sin(t * 0.25 + i * 1.7))));
    if (this.atmos.night > 0.3) this.stars.setAlpha(this.atmos.night * (0.85 + 0.15 * Math.sin(t * 1.3)));

    if (this.view !== this.viewTarget) {
      const t = this.reduced ? 1 : Math.min(1, dt * 4);
      this.view = lerpView(this.view, this.viewTarget, t);
      if (Math.abs(this.view.k - this.viewTarget.k) < 1e-4 && Math.abs(this.view.oy - this.viewTarget.oy) < 0.3 && Math.abs(this.view.ox - this.viewTarget.ox) < 0.3)
        this.view = this.viewTarget;
    }
    const studying = this.mode === "focus" || this.mode === "paused";
    const desk = this.desk.update(time, this.cibu.isBusy, studying ? progressOf(useCibu.getState().session, Date.now()) : 0);
    this.flyers.update(time, dt, this.atmos.night);
    this.seat.update(time);
    if (desk?.showNotes) this.cibu.play(showNotesLine());
    this.cibu.update(time);
    this.applyCamera();
  }
}
