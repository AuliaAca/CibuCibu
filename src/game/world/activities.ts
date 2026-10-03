import Phaser from "phaser";
import type { CibuActor } from "../cibu/CibuActor";
import type { Fx } from "@/core/cibuBrain";

/**
 * Little things Cibu does on his own while you're not focusing:
 * a stroll, watering the plant, chasing a butterfly, reading, morning
 * stretches, stargazing. Chosen by time of day; cancelled instantly when a
 * session starts or the user interacts, so they never get in the way.
 */
export interface ActivityHost {
  scene: Phaser.Scene;
  stage: Phaser.GameObjects.Container;
  cibu: CibuActor;
  plant: Phaser.GameObjects.Image;
  feetY: number;
  playFx(f: Fx): void;
  burstAt(key: "sparkle" | "leafBurst", n: number, x: number, y: number): void;
  wiggle(o: Phaser.GameObjects.Image): void;
  /** design-space → screen-space for effects drawn in the sky */
  screen(): { w: number; h: number; dpr: number };
  timeOfDay(): "morning" | "day" | "evening" | "night";
}

class Cancelled extends Error {}

type Script = (t: number) => Promise<void>;

export class Activities {
  private token = 0;
  private cleanups: (() => void)[] = [];
  private running = false;
  private nextAt = 0;
  private last = "";
  private plantScale = 1;

  constructor(private h: ActivityHost) {}

  get busy() {
    return this.running;
  }

  /** Stop right away and tidy up props; Cibu walks back to his mat. */
  cancel() {
    if (!this.running) return;
    this.token++;
    this.cleanups.forEach((f) => f());
    this.cleanups = [];
    this.running = false;
    this.h.cibu.setScripted(false);
    this.h.cibu.settle();
    this.nextAt = Date.now() + 20_000;
  }

  update(allowed: boolean) {
    const now = Date.now();
    if (!allowed) {
      this.cancel();
      this.nextAt = Math.max(this.nextAt, now + 15_000);
      return;
    }
    if (this.running || this.h.cibu.isBusy) return;
    if (!this.nextAt) this.nextAt = now + Phaser.Math.Between(12_000, 18_000);
    if (now < this.nextAt) return;
    void this.start();
  }

  /** For testing: run a specific activity now. */
  runNow(name: string) {
    this.cancel();
    if (name in this.scripts()) void this.start(name);
  }

  private scripts(): Record<string, Script> {
    return {
      jalan: (t) => this.jalan(t),
      nyiram: (t) => this.nyiram(t),
      kupu: (t) => this.kupu(t),
      baca: (t) => this.baca(t),
      senam: (t) => this.senam(t),
      bintang: (t) => this.bintang(t),
    };
  }

  private choose(): string {
    const tod = this.h.timeOfDay();
    const byTime: Record<string, string[]> = {
      morning: ["nyiram", "senam", "jalan"],
      day: ["jalan", "kupu", "baca", "nyiram"],
      evening: ["nyiram", "baca", "kupu", "jalan"],
      night: ["bintang", "baca", "jalan"],
    };
    const options = byTime[tod].filter((n) => n !== this.last);
    return options[Math.floor(Math.random() * options.length)];
  }

  private async start(name = this.choose()) {
    this.running = true;
    this.last = name;
    const t = ++this.token;
    this.h.cibu.setScripted(true);
    try {
      await this.scripts()[name](t);
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    } finally {
      if (t === this.token) {
        this.cleanups.forEach((f) => f());
        this.cleanups = [];
        this.running = false;
        this.h.cibu.setScripted(false);
        this.nextAt = Date.now() + Phaser.Math.Between(22_000, 40_000);
      }
    }
  }

  // ---------------------------------------------------------------- helpers
  private check(t: number) {
    if (t !== this.token) throw new Cancelled();
  }

  /** Activity pacing is relaxed so every bubble can be read comfortably. */
  private wait(ms: number, t: number) {
    return new Promise<void>((res) => this.h.scene.time.delayedCall(ms * 1.45, res)).then(() => this.check(t));
  }

  private async walk(x: number, t: number) {
    await this.h.cibu.walkTo(x);
    this.check(t);
  }

  private say(t: number, sprite: string, line?: string, ms = 2200, fx: Fx = null, hop = false) {
    this.check(t);
    this.h.cibu.act({ sprite, line, ms, fx, hop });
  }

  private img(key: string, x: number, y: number, height: number) {
    const o = this.h.scene.add.image(x, y, key);
    o.setScale(height / o.height);
    this.h.stage.add(o);
    this.cleanups.push(() => {
      this.h.scene.tweens.killTweensOf(o);
      o.destroy();
    });
    return o;
  }

  // ---------------------------------------------------------------- scripts
  private async jalan(t: number) {
    this.say(t, "pose/walk", "Jalan-jalan dulu ah~", 1800);
    await this.walk(655, t);
    this.say(t, "expression/crosseyed", "Hmm, tanamannya lucu", 1800);
    await this.wait(1900, t);
    await this.walk(955, t);
    this.say(t, "complete/youdidit", "Lampunya cantik juga~", 1800, "hearts");
    await this.wait(1900, t);
    await this.walk(800, t);
    this.say(t, "complete/youdidit", "Seger habis jalan-jalan!", 1800, null, true);
    await this.wait(1800, t);
  }

  private async nyiram(t: number) {
    const { scene, plant } = this.h;
    const y = this.h.feetY;
    this.say(t, "pose/walk", "Waktunya nyiram tanaman!", 1800);
    await this.walk(705, t);
    const can = this.img("watering-can", 640, y - 120, 70).setFlipX(true).setAlpha(0).setAngle(0);
    scene.tweens.add({ targets: can, alpha: 1, y: y - 112, duration: 300, ease: "Back.Out" });
    await this.wait(350, t);
    scene.tweens.add({ targets: can, angle: -32, duration: 450, ease: "Sine.InOut" });
    this.say(t, "complete/proudofyou", "Tumbuh yang subur ya~", 2600);
    const water = scene.add.particles(0, 0, "dot", {
      x: can.x - 42,
      y: can.y - 2,
      speedX: { min: -70, max: -25 },
      speedY: { min: 10, max: 60 },
      gravityY: 520,
      lifespan: 650,
      scale: { min: 0.08, max: 0.16 },
      alpha: { start: 0.9, end: 0.2 },
      tint: [0x7fc8f0, 0xa9dcf5, 0xffffff],
      frequency: 28,
    });
    this.h.stage.add(water);
    this.cleanups.push(() => water.destroy());
    for (let i = 0; i < 3; i++) {
      await this.wait(750, t);
      this.h.wiggle(plant);
    }
    water.stop();
    scene.tweens.add({ targets: can, angle: 0, alpha: 0, duration: 350 });
    // the plant grows a little every time (this visit)
    this.plantScale = Math.min(1.28, this.plantScale + 0.05);
    const base = plant.getData("baseScale") ?? plant.scaleX;
    plant.setData("baseScale", base);
    scene.tweens.add({ targets: plant, scaleX: base * this.plantScale, scaleY: base * this.plantScale, duration: 600, ease: "Back.Out" });
    this.h.burstAt("sparkle", 10, plant.x, plant.y - 60);
    this.h.burstAt("leafBurst", 5, plant.x, plant.y - 80);
    await this.wait(700, t);
    this.say(t, "complete/youdidit", "Yeay, tanamannya makin tinggi!", 2000, null, true);
    await this.wait(1200, t);
    await this.walk(800, t);
    await this.wait(600, t);
  }

  private async kupu(t: number) {
    const { scene } = this.h;
    const y = this.h.feetY;
    const b = this.img("butterfly", 560, y - 250, 68);
    const flap = scene.tweens.add({ targets: b, scaleX: b.scaleX * 0.35, duration: 120, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.cleanups.push(() => flap.stop());
    const path = { p: 0 };
    this.cleanups.push(() => scene.tweens.killTweensOf(path));
    scene.tweens.add({
      targets: path,
      p: 1,
      duration: 7200,
      ease: "Sine.InOut",
      onUpdate: () => {
        b.x = 560 + path.p * 420;
        b.y = y - 250 + Math.sin(path.p * Math.PI * 4) * 40 - path.p * 30;
        b.angle = Math.sin(path.p * Math.PI * 8) * 12;
      },
    });
    this.say(t, "expression/omg", "Eh, ada kupu-kupu!", 1800, null, true);
    await this.wait(1600, t);
    await this.walk(880, t);
    this.say(t, "pose/jump", "Hap! Hihi, lucu banget~", 1800, "hearts", true);
    await this.wait(900, t);
    this.h.cibu.hop(30);
    await this.wait(1600, t);
    scene.tweens.add({ targets: b, x: 1250, y: y - 520, alpha: 0, duration: 1600, ease: "Sine.In" });
    this.say(t, "complete/youdidit", "Dadah kupu-kupu!", 1800);
    await this.wait(1600, t);
    await this.walk(800, t);
  }

  private async baca(t: number) {
    const y = this.h.feetY;
    const book = this.img("prop/book", this.h.cibu.x + 55, y + 8, 58).setAlpha(0);
    this.h.scene.tweens.add({ targets: book, alpha: 1, y: y + 2, duration: 350, ease: "Back.Out" });
    this.say(t, "expression/thinking", "Baca buku dulu ah~", 3400);
    await this.wait(3600, t);
    this.say(t, "expression/omg", "Ooh, ternyata gitu!", 2000, "sparkle");
    await this.wait(2200, t);
    this.say(t, "complete/proudofyou", "Belajar itu seru ya ^^", 2000);
    await this.wait(2000, t);
    this.h.scene.tweens.add({ targets: book, alpha: 0, duration: 300 });
    await this.wait(320, t);
  }

  private async senam(t: number) {
    this.say(t, "pose/jump", "Senam pagi! Satu…", 1000, null, true);
    await this.wait(1100, t);
    this.say(t, "pose/dance", "Dua…", 1000, null, true);
    await this.wait(1100, t);
    this.say(t, "pose/jump", "Tiga!", 1000, "sparkle", true);
    await this.wait(1200, t);
    this.say(t, "complete/youdidit", "Seger! Kamu ikutan stretching juga ya~", 2400);
    await this.wait(2400, t);
  }

  private async bintang(t: number) {
    const { scene } = this.h;
    const { w, h, dpr } = this.h.screen();
    this.say(t, "complete/youdidit", "Bintangnya banyak banget…", 2400);
    await this.wait(2200, t);
    const star = scene.add.image(w * 0.2, h * 0.12, "ray").setBlendMode(Phaser.BlendModes.ADD).setDepth(8);
    star.setDisplaySize(6 * dpr, 150 * dpr).setAngle(-62).setAlpha(0);
    this.cleanups.push(() => star.destroy());
    scene.tweens.add({ targets: star, alpha: 1, duration: 150 });
    scene.tweens.add({ targets: star, x: w * 0.62, y: h * 0.3, duration: 900, ease: "Quad.In" });
    scene.tweens.add({ targets: star, alpha: 0, delay: 650, duration: 300 });
    await this.wait(700, t);
    this.say(t, "expression/omg", "Bintang jatuh!", 1400, "sparkle", true);
    await this.wait(1400, t);
    this.say(t, "complete/proudofyou", "Aku wish kamu sukses selalu~", 2600, "hearts");
    await this.wait(2600, t);
  }
}
