import Phaser from "phaser";

export const UI_FONT = "'Nunito Variable', Nunito, ui-rounded, system-ui, sans-serif";

/**
 * Screen-space speech / thought bubble that follows a point (Cibu's head).
 * Lives outside the zooming layers so text stays crisp and readable.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private hideTimer?: Phaser.Time.TimerEvent;
  private dpr: number;
  shown = false;
  kind: "speech" | "thought" = "speech";

  constructor(scene: Phaser.Scene, dpr: number) {
    super(scene, 0, 0);
    this.dpr = dpr;
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, "", {
        fontFamily: UI_FONT,
        fontSize: `${15 * dpr}px`,
        fontStyle: "800",
        color: "#3b2717",
        align: "center",
        wordWrap: { width: 250 * dpr },
      })
      .setOrigin(0.5, 0.5);
    this.add([this.bg, this.label]);
    this.setAlpha(0).setScale(0.6).setDepth(95);
    scene.add.existing(this);
  }

  say(text: string, ms = 2200) {
    this.kind = "speech";
    this.icon?.setVisible(false);
    this.label.setVisible(true).setText(text);
    this.redraw(this.label.width + 30 * this.dpr, this.label.height + 18 * this.dpr, false);
    this.pop(ms);
  }

  think(textureKey: string) {
    if (this.shown && this.kind === "thought" && this.icon?.texture.key === textureKey) return;
    this.kind = "thought";
    this.label.setVisible(false);
    if (!this.icon) {
      this.icon = this.scene.add.image(0, 0, textureKey);
      this.add(this.icon);
    }
    this.icon.setTexture(textureKey).setVisible(true);
    const size = 40 * this.dpr;
    this.icon.setScale(size / Math.max(this.icon.width, this.icon.height));
    this.redraw(size + 22 * this.dpr, size + 16 * this.dpr, true);
    this.pop(0);
  }

  private redraw(w: number, h: number, thought: boolean) {
    const g = this.bg;
    const d = this.dpr;
    g.clear();
    g.fillStyle(0x3b2717, 0.12);
    g.fillRoundedRect(-w / 2, -h / 2 + 3 * d, w, h, Math.min(h / 2, 18 * d));
    g.fillStyle(0xfffaf3, 0.97);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, Math.min(h / 2, 18 * d));
    if (thought) {
      g.fillCircle(-w * 0.18, h / 2 + 8 * d, 6 * d);
      g.fillCircle(-w * 0.28, h / 2 + 18 * d, 3.5 * d);
    } else {
      g.fillTriangle(-8 * d, h / 2 - 1, 8 * d, h / 2 - 1, -2 * d, h / 2 + 11 * d);
    }
  }

  private pop(ms: number) {
    this.hideTimer?.remove();
    this.scene.tweens.killTweensOf(this);
    this.shown = true;
    this.setAlpha(0).setScale(0.7);
    this.scene.tweens.add({ targets: this, alpha: 1, scale: 1, duration: 420, ease: "Back.Out(1.2)" });
    if (ms > 0) this.hideTimer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  hide() {
    if (!this.shown) return;
    this.shown = false;
    this.hideTimer?.remove();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, alpha: 0, scale: 0.92, duration: 380, ease: "Sine.InOut" });
  }

  /**
   * Always sits above Cibu's head. The world framing keeps room for it below the
   * timer; if a long line still doesn't fit, it stops at the HUD edge (never slides under it).
   */
  follow(x: number, y: number, minTop = 0, screenW = Infinity) {
    const thought = this.kind === "thought";
    const d = this.dpr;
    const bh = thought ? 60 * d : this.label.height + 18 * d;
    const bw = thought ? 62 * d : this.label.width + 30 * d;
    let bx = x + (thought ? 34 * d : 0);
    const by = Math.max(minTop + bh / 2, y - bh / 2 - 14 * d);
    const m = 10 * d;
    bx = Math.min(Math.max(bx, m + bw / 2), screenW - m - bw / 2);
    this.setPosition(bx, by);
  }
}
