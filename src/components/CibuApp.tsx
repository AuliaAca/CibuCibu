"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { bridge } from "@/game/bridge";
import { useTicker, useKeyboard, useHudInsets, useSoundscapeSync } from "@/hooks/useTicker";
import { TopBar } from "./hud/TopBar";
import { FocusHud } from "./hud/FocusHud";
import { ControlDock } from "./hud/ControlDock";
import { CareDock } from "./hud/CareDock";
import { RewardCard } from "./RewardCard";
import { Sheets } from "./sheets/Sheets";
import { Toasts } from "./Toasts";
import { Loader } from "./Loader";
import { BreakPanel, BreakOverlay } from "./break/BreakPanel";

// Phaser is heavy and browser-only: load it in its own chunk, after the UI.
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

export default function CibuApp() {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  useTicker();
  useKeyboard();
  useHudInsets(ready);
  useSoundscapeSync();

  useEffect(() => {
    setMounted(true);
    const a = bridge.on("ready", () => setReady(true));
    const b = bridge.on("progress", (p) => setProgress(p));
    return () => {
      a();
      b();
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-cream select-none">
      {mounted && <PhaserGame />}
      <Loader visible={!ready} progress={progress} />

      {mounted && (
        <div className={`pointer-events-none absolute inset-0 flex flex-col transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <div data-inset="top">
            <TopBar />
            <FocusHud />
          </div>
          <div className="flex-1" />
          <div data-inset="bottom" className="flex flex-col items-center gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-7">
            <BreakPanel />
            <ControlDock />
          </div>
          <CareDock />
        </div>
      )}
      {mounted && ready && (
        <>
          <RewardCard />
          <BreakOverlay />
          <Sheets />
          <Toasts />
        </>
      )}
    </main>
  );
}
