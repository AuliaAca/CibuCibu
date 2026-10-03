"use client";
/**
 * Mounts the Phaser world into a div that fills its parent.
 * Loaded only on the client via next/dynamic (see CibuApp).
 * Renders at devicePixelRatio (capped at 2) and uses Phaser's zoom to map
 * back to CSS pixels, so art stays crisp on retina screens.
 */
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";
import { useCibu } from "@/store/useCibu";

export default function PhaserGame() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => ({ w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) });
    const { w, h } = size();

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: el,
      backgroundColor: "#fbf4ec",
      scale: { mode: Phaser.Scale.NONE, width: w * dpr, height: h * dpr, zoom: 1 / dpr },
      render: { antialias: true, powerPreference: "high-performance", roundPixels: false },
      input: { activePointers: 2 },
      banner: false,
      audio: { noAudio: true },
      callbacks: { preBoot: (g) => g.registry.set("dpr", dpr) },
      scene: [BootScene, WorldScene],
    });

    if (process.env.NODE_ENV !== "production" || new URLSearchParams(location.search).has("debug"))
      Object.assign(window, { __cibu: game, __cibuStore: useCibu });

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const s = size();
        game.scale.resize(s.w * dpr, s.h * dpr);
      });
    });
    ro.observe(el);

    // pause rendering when the tab is hidden (timer is timestamp based, so nothing is lost)
    const vis = () => (document.hidden ? game.loop.sleep() : game.loop.wake());
    document.addEventListener("visibilitychange", vis);

    return () => {
      ro.disconnect();
      document.removeEventListener("visibilitychange", vis);
      cancelAnimationFrame(raf);
      game.destroy(true);
    };
  }, []);

  return <div ref={host} className="absolute inset-0 touch-none [&>canvas]:block" aria-hidden />;
}
