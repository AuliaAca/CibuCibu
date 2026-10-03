import Phaser from "phaser";

/** Procedural textures for particles & lighting (no image files needed). */
function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  if (!t) return;
  draw(t.getContext());
  t.refresh();
}

export function makeFxTextures(scene: Phaser.Scene) {
  canvasTex(scene, "dot", 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,.75)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  canvasTex(scene, "spark", 64, 64, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(32, 2);
    c.quadraticCurveTo(36, 28, 62, 32);
    c.quadraticCurveTo(36, 36, 32, 62);
    c.quadraticCurveTo(28, 36, 2, 32);
    c.quadraticCurveTo(28, 28, 32, 2);
    c.fill();
  });
  canvasTex(scene, "confetti", 20, 12, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.roundRect(0, 0, 20, 12, 4);
    c.fill();
  });
  canvasTex(scene, "heart", 64, 60, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(32, 58);
    c.bezierCurveTo(-8, 30, 6, -4, 32, 16);
    c.bezierCurveTo(58, -4, 72, 30, 32, 58);
    c.fill();
  });
  canvasTex(scene, "bubble", 64, 64, (c) => {
    const g = c.createRadialGradient(24, 22, 2, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(0.5, "rgba(210,240,255,.25)");
    g.addColorStop(0.92, "rgba(170,220,255,.55)");
    g.addColorStop(1, "rgba(170,220,255,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(32, 32, 30, 0, Math.PI * 2);
    c.fill();
  });
  canvasTex(scene, "zz", 48, 48, (c) => {
    c.fillStyle = "#fff";
    c.font = "900 40px 'Nunito Variable', Nunito, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("z", 24, 26);
  });
  canvasTex(scene, "note", 48, 56, (c) => {
    c.fillStyle = "#fff";
    c.font = "900 46px 'Nunito Variable', Nunito, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("♪", 24, 30);
  });
  canvasTex(scene, "leaf", 40, 24, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(2, 12);
    c.quadraticCurveTo(20, -6, 38, 12);
    c.quadraticCurveTo(20, 30, 2, 12);
    c.fill();
  });
  canvasTex(scene, "glow", 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
  canvasTex(scene, "vignette", 512, 512, (c) => {
    const g = c.createRadialGradient(256, 256, 60, 256, 256, 256);
    g.addColorStop(0, "rgba(30,18,10,0)");
    g.addColorStop(0.55, "rgba(30,18,10,.18)");
    g.addColorStop(1, "rgba(30,18,10,.9)");
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 512);
  });
  canvasTex(scene, "ray", 128, 1024, (c) => {
    const across = c.createLinearGradient(0, 0, 128, 0);
    across.addColorStop(0, "rgba(255,255,255,0)");
    across.addColorStop(0.5, "rgba(255,255,255,1)");
    across.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = across;
    c.fillRect(0, 0, 128, 1024);
    c.globalCompositeOperation = "destination-in";
    const along = c.createLinearGradient(0, 0, 0, 1024);
    along.addColorStop(0, "rgba(0,0,0,.9)");
    along.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = along;
    c.fillRect(0, 0, 128, 1024);
  });
  canvasTex(scene, "shadow", 128, 40, (c) => {
    const g = c.createRadialGradient(64, 20, 0, 64, 20, 64);
    g.addColorStop(0, "rgba(40,60,20,.55)");
    g.addColorStop(1, "rgba(40,60,20,0)");
    c.fillStyle = g;
    c.save();
    c.scale(1, 40 / 128);
    c.fillRect(0, 0, 128, 128);
    c.restore();
  });
  // keystroke glyphs for Cibu's typing (one canvas, six frames)
  const GLYPHS = ["a", "b", "1", "✓", "+", "♥"];
  if (!scene.textures.exists("glyphs")) {
    const t = scene.textures.createCanvas("glyphs", 32 * GLYPHS.length, 32);
    if (t) {
      const c = t.getContext();
      c.fillStyle = "#fff";
      c.font = "900 24px 'Nunito Variable', Nunito, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      GLYPHS.forEach((g, i) => {
        c.fillText(g, i * 32 + 16, 17);
        t.add(`g${i}`, 0, i * 32, 0, 32, 32);
      });
      t.refresh();
    }
  }
  // little bird, two wing frames (up / down) for flocks crossing the sky
  if (!scene.textures.exists("bird")) {
    const t = scene.textures.createCanvas("bird", 128, 48);
    if (t) {
      const c = t.getContext();
      const bird = (ox: number, up: boolean) => {
        c.save();
        c.translate(ox + 32, 26);
        c.lineJoin = "round";
        c.lineCap = "round";
        // wings
        c.fillStyle = "#5b6f96";
        c.strokeStyle = "#34425f";
        c.lineWidth = 2.5;
        for (const dir of [-1, 1]) {
          c.beginPath();
          c.moveTo(dir * 4, -2);
          if (up) c.quadraticCurveTo(dir * 14, -22, dir * 28, -16);
          else c.quadraticCurveTo(dir * 16, 12, dir * 28, 10);
          c.quadraticCurveTo(dir * 16, up ? -6 : 4, dir * 4, 3);
          c.closePath();
          c.fill();
          c.stroke();
        }
        // body + head
        c.fillStyle = "#6e84b0";
        c.beginPath();
        c.ellipse(0, 1, 10, 6.5, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.beginPath();
        c.arc(9, -3, 5.5, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        // beak + cheek
        c.fillStyle = "#ffb347";
        c.beginPath();
        c.moveTo(14, -4);
        c.lineTo(20, -2);
        c.lineTo(14, 0);
        c.closePath();
        c.fill();
        c.fillStyle = "#ffc2d1";
        c.beginPath();
        c.arc(9, 0, 1.8, 0, Math.PI * 2);
        c.fill();
        c.restore();
      };
      bird(0, true);
      bird(64, false);
      t.add("up", 0, 0, 0, 64, 48);
      t.add("down", 0, 64, 0, 64, 48);
      t.refresh();
    }
  }
  canvasTex(scene, "sky", 4, 256, () => {});
}

export function paintSky(scene: Phaser.Scene, top: string, mid: string, bottom: string) {
  const t = scene.textures.get("sky") as Phaser.Textures.CanvasTexture;
  const c = t.getContext();
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  c.clearRect(0, 0, 4, 256);
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 256);
  t.refresh();
}
