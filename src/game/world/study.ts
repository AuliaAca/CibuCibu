import Phaser from "phaser";
import { SPRITES } from "../assets";
import type { StudyTask } from "@/core/cibuBrain";
import type { CibuActor } from "../cibu/CibuActor";

/**
 * Cibu's study corner while you focus, paced by the session itself:
 *
 *   setup   — right after "Mode belajar: ON!" he fetches his book + laptop from the
 *             edge of the mat, carries them back, puts the book down beside him and
 *             opens the laptop.
 *   typing  — first half of the session (laptop).
 *   reading — from ½ of the session: closes the laptop, puts it aside, opens the book.
 *   writing — last ~15%: closes the book and sums it up on his notes (shows them to you).
 *
 * Screens/pages face Cibu (we see the backs) and every prop stays below his chin.
 */
export const READ_AT = 0.5;
export const WRITE_AT = 0.85;

type Hooks = {
  cibu: CibuActor;
  say: (text: string, ms?: number) => void;
  fx: (name: "sparkle" | "puff") => void;
};

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export class StudyDesk {
  task: StudyTask = "typing";
  private active = false;
  private token = 0;
  private busy = false;
  private carrying = false;
  private lastGlyph = 0;
  private glyphSide = false;
  private showNotesAt = 0;
  private showing = false;

  private lid: Phaser.GameObjects.Image; // open laptop, back of the lid towards us
  private laptopClosed: Phaser.GameObjects.Image;
  private bookOpen: Phaser.GameObjects.Image;
  private bookClosed: Phaser.GameObjects.Image;
  private clipboard: Phaser.GameObjects.Image;
  private notesFront: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private glyphs: Phaser.GameObjects.Particles.ParticleEmitter;
  private scribble: Phaser.GameObjects.Particles.ParticleEmitter;

  // spots (design units, relative to Cibu's home / feet)
  private readonly FRONT_LAPTOP = { dx: -8, dy: 28 };
  private readonly FRONT_BOOK = { dx: 4, dy: 24 };
  private readonly SIDE = { dx: -138, dy: 34 };
  private readonly SUPPLY = { dx: -150, dy: 46 };

  constructor(
    private scene: Phaser.Scene,
    stage: Phaser.GameObjects.Container,
    private x: number,
    private feetY: number,
    private hooks: Hooks,
  ) {
    const add = (key: string, dx: number, dy: number, h: number, angle = 0) => {
      const img = scene.add.image(x + dx, feetY + dy, key).setOrigin(0.5, SPRITES[key]?.anchor[1] ?? 1);
      img.setScale(h / img.height).setAngle(angle).setAlpha(0).setVisible(false);
      img.setData("s", img.scaleX);
      stage.add(img);
      return img;
    };
    this.glow = scene.add.image(x - 8, feetY - 78, "glow").setTint(0xbfe6ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0);
    stage.add(this.glow);
    this.glyphs = scene.add.particles(0, 0, "glyphs", {
      frame: ["g0", "g1", "g2", "g3", "g4", "g5"],
      x: { min: -8, max: 8 },
      y: 0,
      speedY: { min: -80, max: -45 },
      speedX: { min: -45, max: 45 },
      lifespan: 950,
      scale: { start: 0.9, end: 1.25 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xfd919f, 0x81ccd0, 0xfdbf2e, 0xb79bd8, 0xb0ce6b],
      emitting: false,
    });
    this.scribble = scene.add.particles(0, 0, "dot", {
      x: { min: x + 55, max: x + 105 },
      y: { min: feetY - 30, max: feetY - 5 },
      speed: { min: 5, max: 20 },
      lifespan: 700,
      scale: { min: 0.05, max: 0.1 },
      alpha: { start: 0.7, end: 0 },
      tint: 0x5a4636,
      emitting: false,
    });
    this.lid = add("study/laptop-back", this.FRONT_LAPTOP.dx, this.FRONT_LAPTOP.dy, 94);
    this.bookOpen = add("study/book-back", this.FRONT_BOOK.dx, this.FRONT_BOOK.dy, 86);
    this.clipboard = add("study/clipboard-back", 80, 24, 100, -12);
    this.notesFront = add("prop/notes", 80, 24, 100, 8);
    // closed ones: laptop ≈ as wide as the open lid, book ≈ as wide as the open book
    this.laptopClosed = add("study/laptop-closed", this.SUPPLY.dx, this.SUPPLY.dy, 26);
    this.bookClosed = add("study/book-closed", this.SUPPLY.dx, this.SUPPLY.dy, 30);
    stage.add([this.glyphs, this.scribble]);
  }

  // ------------------------------------------------------------------ helpers
  private wait(ms: number, tok: number) {
    return new Promise<boolean>((r) => this.scene.time.delayedCall(ms, () => r(tok === this.token && this.active)));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((r) => this.scene.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  private place(img: Phaser.GameObjects.Image, dx: number, dy: number, visible = true) {
    this.scene.tweens.killTweensOf(img);
    img.setPosition(this.x + dx, this.feetY + dy).setScale(img.getData("s")).setAlpha(visible ? 1 : 0).setVisible(visible);
  }

  private moveTo(img: Phaser.GameObjects.Image, dx: number, dy: number, duration = 520) {
    return this.tween({ targets: img, x: this.x + dx, y: this.feetY + dy, duration, ease: "Sine.InOut" });
  }

  private fadeOut(img: Phaser.GameObjects.Image, duration = 300) {
    this.scene.tweens.killTweensOf(img);
    this.scene.tweens.add({ targets: img, alpha: 0, duration, onComplete: () => img.setVisible(false) });
  }

  private all() {
    return [this.lid, this.laptopClosed, this.bookOpen, this.bookClosed, this.clipboard, this.notesFront];
  }

  /** Lid of the laptop: 0 = shut, 1 = open (scales from its hinge at the bottom). */
  private setLid(open: boolean, duration = 420) {
    const s = this.lid.getData("s") as number;
    this.scene.tweens.killTweensOf(this.lid);
    if (open) {
      this.laptopClosed.setVisible(false);
      this.lid.setVisible(true).setAlpha(1).setScale(s, s * 0.08).setPosition(this.x + this.FRONT_LAPTOP.dx, this.feetY + this.FRONT_LAPTOP.dy);
      return this.tween({ targets: this.lid, scaleY: s, duration, ease: "Back.Out(1.4)" });
    }
    return this.tween({ targets: this.lid, scaleY: s * 0.08, duration, ease: "Sine.In" }).then(() => {
      this.lid.setVisible(false).setScale(s);
      this.place(this.laptopClosed, this.FRONT_LAPTOP.dx, this.FRONT_LAPTOP.dy);
    });
  }

  /** Book: open ↔ closed, in front of Cibu. */
  private setBook(open: boolean, duration = 380) {
    const s = this.bookOpen.getData("s") as number;
    this.scene.tweens.killTweensOf(this.bookOpen);
    if (open) {
      this.bookClosed.setVisible(false);
      this.bookOpen.setVisible(true).setAlpha(1).setScale(s * 0.25, s).setPosition(this.x + this.FRONT_BOOK.dx, this.feetY + this.FRONT_BOOK.dy);
      return this.tween({ targets: this.bookOpen, scaleX: s, duration, ease: "Back.Out(1.3)" });
    }
    return this.tween({ targets: this.bookOpen, scaleX: s * 0.25, duration, ease: "Sine.In" }).then(() => {
      this.bookOpen.setVisible(false).setScale(s);
      this.place(this.bookClosed, this.FRONT_BOOK.dx, this.FRONT_BOOK.dy + 2);
    });
  }

  // ------------------------------------------------------------------ public
  /**
   * `setup`: the full "fetch, carry, put down, open" ritual (new session).
   * otherwise: jump straight to the right state for `progress` (reload / resume).
   */
  setActive(on: boolean, setup = false, progress = 0) {
    if (on === this.active) return;
    this.active = on;
    const tok = ++this.token;
    if (!on) {
      this.carrying = false;
      if (this.busy) this.hooks.cibu.setScripted(false);
      this.busy = false;
      this.showing = false;
      this.all().forEach((p) => p.visible && this.fadeOut(p));
      this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 300 });
      return;
    }
    if (setup) void this.runSetup(tok);
    else this.snapTo(progress);
  }

  private snapTo(p: number) {
    this.all().forEach((i) => i.setVisible(false).setAlpha(0));
    this.task = p >= WRITE_AT ? "writing" : p >= READ_AT ? "reading" : "typing";
    if (this.task === "typing") {
      this.place(this.bookClosed, this.SIDE.dx, this.SIDE.dy);
      this.place(this.lid, this.FRONT_LAPTOP.dx, this.FRONT_LAPTOP.dy);
    } else if (this.task === "reading") {
      this.place(this.laptopClosed, this.SIDE.dx, this.SIDE.dy);
      this.place(this.bookOpen, this.FRONT_BOOK.dx, this.FRONT_BOOK.dy);
    } else {
      this.place(this.laptopClosed, this.SIDE.dx, this.SIDE.dy);
      this.place(this.bookClosed, this.SIDE.dx, this.SIDE.dy - 22);
      this.place(this.clipboard, 80, 24);
      this.showNotesAt = Date.now() + 12_000;
    }
  }

  private async runSetup(tok: number) {
    const { cibu, say } = this.hooks;
    this.busy = true;
    this.task = "typing";
    cibu.setScripted(true);
    // his things wait at the edge of the mat
    this.place(this.bookClosed, this.SUPPLY.dx, this.SUPPLY.dy);
    this.place(this.laptopClosed, this.SUPPLY.dx, this.SUPPLY.dy - 26);
    [this.bookClosed, this.laptopClosed].forEach((i) => {
      i.setAlpha(0);
      this.scene.tweens.add({ targets: i, alpha: 1, duration: 350 });
    });
    say(pick(["Siapin buku sama laptop dulu ya~", "Bentar, ambil buku & laptop dulu~", "Ambil perlengkapan belajar dulu yuk~"]), 3000);
    if (!(await this.wait(500, tok))) return;
    await cibu.walkTo(this.x + this.SUPPLY.dx + 62, 75);
    if (!(await this.wait(450, tok))) return;
    // pick them up and carry them back, held low in front of him
    cibu.setSprite("complete/youdidit");
    this.carrying = true;
    if (!(await this.wait(600, tok))) return;
    await cibu.walkTo(this.x, 70);
    this.carrying = false;
    if (tok !== this.token || !this.active) return;
    cibu.setSprite("complete/bestie");
    // book goes down beside him…
    say("Bukunya taruh sini dulu~", 3000);
    await Promise.all([this.moveTo(this.bookClosed, this.SIDE.dx, this.SIDE.dy, 700), this.moveTo(this.laptopClosed, this.FRONT_LAPTOP.dx, this.FRONT_LAPTOP.dy - 8, 700)]);
    if (!(await this.wait(2300, tok))) return;
    // …laptop in front, and open it
    await this.moveTo(this.laptopClosed, this.FRONT_LAPTOP.dx, this.FRONT_LAPTOP.dy, 220);
    if (!(await this.wait(300, tok))) return;
    say(pick(["Buka laptop… yuk mulai belajar!", "Laptop siap! Kita mulai ya~"]), 3000);
    this.hooks.fx("sparkle");
    await this.setLid(true, 650);
    if (!(await this.wait(2200, tok))) return;
    this.busy = false;
    cibu.setScripted(false);
  }

  private async toReading(tok: number) {
    const { cibu, say } = this.hooks;
    this.busy = true;
    cibu.setScripted(true);
    cibu.setSprite("complete/youdidit");
    say(pick(["Udah setengah jalan! Gantian baca buku yuk~", "Setengah jalan, keren! Sekarang baca buku ya~", "Laptopnya istirahat dulu, kita baca buku~"]), 2800);
    if (!(await this.wait(1200, tok))) return;
    await this.setLid(false, 450);
    this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 300 });
    if (!(await this.wait(300, tok))) return;
    // swap places: laptop to the side, book to the front
    await Promise.all([this.moveTo(this.laptopClosed, this.SIDE.dx, this.SIDE.dy + 2, 800), this.moveTo(this.bookClosed, this.FRONT_BOOK.dx, this.FRONT_BOOK.dy + 2, 800)]);
    if (!(await this.wait(250, tok))) return;
    await this.setBook(true, 480);
    this.task = "reading";
    if (!(await this.wait(1500, tok))) return;
    this.busy = false;
    cibu.setScripted(false);
  }

  private async toWriting(tok: number) {
    const { cibu, say } = this.hooks;
    this.busy = true;
    cibu.setScripted(true);
    cibu.setSprite("complete/bestie");
    say(pick(["Terakhir, aku rangkum di catatan ya~", "Sekarang aku catat poin pentingnya~"]), 2600);
    if (!(await this.wait(800, tok))) return;
    await this.setBook(false, 320);
    await this.moveTo(this.bookClosed, this.SIDE.dx, this.SIDE.dy - 22, 520);
    if (tok !== this.token || !this.active) return;
    const s = this.clipboard.getData("s") as number;
    this.place(this.clipboard, 80, 42);
    this.clipboard.setAlpha(0).setScale(s);
    await this.tween({ targets: this.clipboard, alpha: 1, y: this.feetY + 24, duration: 450, ease: "Back.Out" });
    this.task = "writing";
    this.showNotesAt = Date.now() + 12_000;
    this.busy = false;
    cibu.setScripted(false);
  }

  /** Flip the clipboard around: back (Cibu writing) ↔ front (showing the user). */
  private flip(toFront: boolean) {
    const from = toFront ? this.clipboard : this.notesFront;
    const to = toFront ? this.notesFront : this.clipboard;
    const sx = to.getData("s") as number;
    const fsx = from.getData("s") as number;
    this.scene.tweens.killTweensOf([from, to]);
    this.scene.tweens.add({
      targets: from,
      scaleX: 0,
      duration: 170,
      ease: "Sine.In",
      onComplete: () => {
        from.setVisible(false).setScale(fsx);
        to.setVisible(true).setAlpha(1).setScale(0, sx);
        this.scene.tweens.add({ targets: to, scaleX: sx, duration: 200, ease: "Back.Out" });
      },
    });
  }

  /** Returns what changed so the scene can let Cibu say something. */
  update(time: number, cibuBusy: boolean, progress: number): { showNotes?: boolean } | null {
    if (!this.active) return null;
    if (this.carrying) {
      // held in front of his tummy, bobbing along with his steps
      const cx = this.hooks.cibu.x;
      const bob = Math.abs(Math.sin(time / 110)) * -4;
      this.bookClosed.setPosition(cx + 6, this.feetY - 8 + bob);
      this.laptopClosed.setPosition(cx + 6, this.feetY - 34 + bob);
    }
    if (!this.busy && !cibuBusy) {
      if (this.task === "typing" && progress >= READ_AT) void this.toReading(this.token);
      else if (this.task === "reading" && progress >= WRITE_AT) void this.toWriting(this.token);
    }
    const now = Date.now();
    if (this.task === "writing" && !this.busy && !this.showing && now >= this.showNotesAt && !cibuBusy) {
      this.showing = true;
      this.flip(true);
      this.scene.time.delayedCall(3800, () => {
        if (!this.showing) return;
        this.showing = false;
        this.flip(false);
        this.showNotesAt = Date.now() + 25_000;
      });
      return { showNotes: true };
    }
    const t = time / 1000;
    const typing = this.task === "typing" && !this.busy && this.lid.visible;
    const typingBurst = typing && t % 2.2 < 1.4 && !cibuBusy;
    const target = typing ? 0.32 + (typingBurst ? 0.08 * Math.sin(t * 9) : 0) : 0;
    this.glow.setAlpha(this.glow.alpha + (target - this.glow.alpha) * 0.1);
    if (typingBurst && time - this.lastGlyph > 230) {
      this.lastGlyph = time;
      // keystrokes pop out from the sides of the laptop, away from Cibu's face
      this.glyphSide = !this.glyphSide;
      this.glyphs.explode(1, this.x + (this.glyphSide ? -70 : 56), this.feetY - 40);
    }
    if (this.task === "writing" && !this.busy && !cibuBusy && time - this.lastGlyph > 420) {
      this.lastGlyph = time;
      this.scribble.explode(2);
    }
    return null;
  }
}
