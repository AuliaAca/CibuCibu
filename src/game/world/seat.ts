import Phaser from "phaser";
import type { CibuActor } from "../cibu/CibuActor";

/**
 * Breathing break: Cibu fetches a little stool from the edge of the mat, carries it
 * to the middle, sets it down and sits on it. The stool is drawn behind him so only
 * its legs show. `onSeated` fires when he is ready for the guide to begin.
 */
type Hooks = {
  cibu: CibuActor;
  say: (text: string, ms?: number) => void;
  fx: (name: "sparkle" | "puff") => void;
  onSeated: (seated: boolean) => void;
};

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const LIFT = 30;
const STOOL_H = 52;

export class Seat {
  private token = 0;
  private active = false;
  private carrying = false;
  private stool: Phaser.GameObjects.Image;

  constructor(
    private scene: Phaser.Scene,
    private stage: Phaser.GameObjects.Container,
    private x: number,
    private feetY: number,
    private hooks: Hooks,
  ) {
    this.stool = scene.add.image(x, feetY + 26, "stool").setOrigin(0.5, 1).setVisible(false).setAlpha(0);
    this.stool.setScale(STOOL_H / this.stool.height).setData("s", this.stool.scaleX);
    stage.add(this.stool);
  }

  private wait(ms: number, tok: number) {
    return new Promise<boolean>((r) => this.scene.time.delayedCall(ms, () => r(tok === this.token && this.active)));
  }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((r) => this.scene.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  /** In front of Cibu while carried, behind him once placed. */
  private layer(front: boolean) {
    const root = this.hooks.cibu.root as unknown as Phaser.GameObjects.Image;
    if (front) this.stage.moveAbove(this.stool, root);
    else this.stage.moveBelow(this.stool, root);
  }

  async start() {
    if (this.active) return;
    this.active = true;
    const tok = ++this.token;
    const { cibu, say } = this.hooks;
    cibu.setScripted(true);
    const supplyX = this.x - 190;
    this.scene.tweens.killTweensOf(this.stool);
    this.stool.setPosition(supplyX, this.feetY + 30).setScale(this.stool.getData("s")).setVisible(true).setAlpha(0);
    this.layer(false);
    this.scene.tweens.add({ targets: this.stool, alpha: 1, duration: 400 });
    say(pick(["Aku ambil bangku dulu ya~", "Bentar, cari tempat duduk dulu~"]), 3000);
    if (!(await this.wait(600, tok))) return;
    await cibu.walkTo(supplyX + 70, 80);
    if (!(await this.wait(400, tok))) return;
    // pick it up and carry it, held in front of him
    cibu.setSprite("complete/youdidit");
    this.carrying = true;
    this.layer(true);
    if (!(await this.wait(500, tok))) return;
    await cibu.walkTo(this.x, 70);
    this.carrying = false;
    if (tok !== this.token || !this.active) return;
    // set it down right where he stands, then step behind it
    say("Bangkunya taruh sini~", 2600);
    cibu.setSprite("complete/bestie");
    await this.tween({ targets: this.stool, x: this.x, y: this.feetY + 26, duration: 450, ease: "Bounce.Out" });
    this.layer(false);
    if (!(await this.wait(1100, tok))) return;
    // sit down
    cibu.setSprite("pose/sit");
    this.hooks.fx("puff");
    await this.tween({ targets: cibu.seat, v: LIFT, duration: 520, ease: "Sine.Out" });
    say(pick(["Nah, duduk yang nyaman~", "Siap! Yuk tarik napas bareng aku~"]), 2800);
    if (!(await this.wait(2600, tok))) return;
    this.hooks.onSeated(true);
  }

  /** Stand up, put the stool away. */
  leave() {
    if (!this.active) return;
    this.active = false;
    this.token++;
    this.carrying = false;
    this.hooks.onSeated(false);
    const { cibu } = this.hooks;
    this.scene.tweens.killTweensOf(cibu.seat);
    this.scene.tweens.add({ targets: cibu.seat, v: 0, duration: 380, ease: "Sine.InOut" });
    this.scene.tweens.add({ targets: this.stool, alpha: 0, duration: 450, delay: 250, onComplete: () => this.stool.setVisible(false) });
    cibu.setScripted(false);
  }

  update(time: number) {
    if (!this.carrying) return;
    const bob = Math.abs(Math.sin(time / 110)) * -4;
    this.stool.setPosition(this.hooks.cibu.x + 4, this.feetY + 8 + bob);
  }
}
