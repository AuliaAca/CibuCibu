import Phaser from "phaser";

/**
 * Life around Cibu while you study: a few butterflies flutter on lazy loops
 * beside him (never across his face), and now and then a little flock of
 * birds glides across the sky. Daytime only — at night the fireflies take over.
 */
interface Butterfly {
  img: Phaser.GameObjects.Image;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  sp: number;
  ph: number;
  s: number;
}

interface Bird {
  img: Phaser.GameObjects.Image;
  x0: number;
  y0: number;
  vx: number;
  ph: number;
  flapMs: number;
}

export class Flyers {
  private on = false;
  private level = 0;
  private butterflies: Butterfly[] = [];
  private birds: Bird[] = [];
  private nextFlock = 0;

  constructor(
    private scene: Phaser.Scene,
    private far: Phaser.GameObjects.Container,
    stage: Phaser.GameObjects.Container,
    private cx: number,
    private feetY: number,
  ) {
    // loops sit to the sides of Cibu and one high above the bubble zone
    const spots = [
      { cx: cx - 330, cy: feetY - 210, rx: 110, ry: 55, tint: 0xffffff },
      { cx: cx + 330, cy: feetY - 250, rx: 120, ry: 60, tint: 0xffd6ea },
      { cx: cx - 120, cy: feetY - 470, rx: 240, ry: 40, tint: 0xd6ecff },
    ];
    for (const sp of spots) {
      const img = scene.add.image(sp.cx, sp.cy, "butterfly").setTint(sp.tint).setAlpha(0).setVisible(false);
      const s = 40 / img.height;
      img.setScale(s);
      stage.add(img);
      this.butterflies.push({ img, cx: sp.cx, cy: sp.cy, rx: sp.rx, ry: sp.ry, sp: Phaser.Math.FloatBetween(0.22, 0.32), ph: Math.random() * 6.28, s });
    }
  }

  setActive(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    if (on) this.nextFlock = this.scene.time.now + 2500;
  }

  private spawnFlock() {
    const fromLeft = Math.random() < 0.5;
    const n = Phaser.Math.Between(2, 4);
    const y = Phaser.Math.Between(90, 230);
    const speed = Phaser.Math.FloatBetween(110, 150) * (fromLeft ? 1 : -1);
    for (let i = 0; i < n; i++) {
      const img = this.scene.add.image(0, 0, "bird", "up");
      img.setScale(Phaser.Math.FloatBetween(0.42, 0.55)).setFlipX(!fromLeft);
      this.far.add(img);
      this.birds.push({
        img,
        // loose V: leader first, others trailing behind and a bit lower/higher
        x0: (fromLeft ? -120 : 1720) - i * 46 * Math.sign(speed),
        y0: y + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 16,
        vx: speed,
        ph: Math.random() * 6.28,
        flapMs: Phaser.Math.Between(130, 170),
      });
    }
  }

  update(time: number, dt: number, night: number) {
    const want = this.on && night < 0.55 ? 1 : 0;
    this.level += (want - this.level) * Math.min(1, dt * 1.5);
    const t = time / 1000;
    for (const b of this.butterflies) {
      const vis = this.level > 0.01;
      b.img.setVisible(vis);
      if (!vis) continue;
      const a = t * b.sp * Math.PI * 2 + b.ph;
      // figure-eight-ish wander + small hops, facing where it flies
      const x = b.cx + Math.sin(a) * b.rx;
      const y = b.cy + Math.sin(a * 2) * b.ry + Math.sin(t * 5 + b.ph) * 6;
      const dir = Math.cos(a) >= 0 ? 1 : -1;
      b.img.setPosition(x, y).setAlpha(this.level);
      // wing flap = quick scaleX pulse
      const flap = 0.45 + 0.55 * Math.abs(Math.sin(t * 14 + b.ph));
      b.img.setScale(b.s * flap * dir, b.s).setAngle(Math.sin(t * 3 + b.ph) * 10);
    }
    if (want && time >= this.nextFlock) {
      this.spawnFlock();
      this.nextFlock = time + Phaser.Math.Between(9000, 16000);
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.x0 += b.vx * dt;
      const x = b.x0;
      const y = b.y0 + Math.sin(t * 1.6 + b.ph) * 8;
      b.img.setPosition(x, y).setFrame(Math.floor(time / b.flapMs) % 2 ? "up" : "down").setAlpha(Math.min(1, this.level + 0.2));
      if (x < -200 || x > 1800) {
        b.img.destroy();
        this.birds.splice(i, 1);
      }
    }
  }
}
