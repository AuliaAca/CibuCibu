"use client";
import { useEffect } from "react";
import { useCibu, modeOf } from "@/store/useCibu";
import { formatClock, remainingMs } from "@/core/pomodoro";
import { soundscape as soundscapeEngine } from "@/lib/soundscape";

/** Drives the store clock (4×/s) and mirrors remaining time into the tab title. */
export function useTicker() {
  useEffect(() => {
    const { tick } = useCibu.getState();
    tick();
    const id = window.setInterval(() => tick(), 250);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);

    let lastTitle = "";
    const unsub = useCibu.subscribe((s) => {
      const mode = modeOf(s.session);
      const t =
        mode === "focus"
          ? `${formatClock(remainingMs(s.session, s.now))} · Fokus — Cibu`
          : mode === "paused"
            ? `⏸ ${formatClock(remainingMs(s.session, s.now))} — Cibu`
            : mode === "break"
              ? `${formatClock(remainingMs(s.session, s.now))} · Istirahat — Cibu`
              : mode === "complete"
                ? "Sesi selesai! — Cibu"
                : "Cibu — Focus, with a little company";
      if (t !== lastTitle) document.title = lastTitle = t;
    });
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      unsub();
    };
  }, []);
}

/** Space = start / pause / resume, Esc = close sheet. */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      const s = useCibu.getState();
      if (e.key === "Escape" && s.sheet) {
        s.openSheet(null);
        return;
      }
      if (e.code !== "Space" || s.sheet) return;
      if (el?.tagName === "BUTTON") return; // let the focused button handle space
      e.preventDefault();
      const mode = modeOf(s.session);
      if (mode === "idle" || mode === "breakOver") s.startFocus();
      else if (mode === "focus") s.pause();
      else if (mode === "paused") s.resume();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Measures how much of the screen the HUD covers (elements tagged with
 * data-inset="top|bottom|right") so the world can frame Cibu in the free space.
 */
export function useHudInsets(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const measure = () => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      let top = 0;
      let bottom = 0;
      let right = 0;
      document.querySelectorAll<HTMLElement>("[data-inset]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const kind = el.dataset.inset;
        // measure the visible content inside wrappers, not the full-width wrapper box
        const kids = Array.from(el.children) as HTMLElement[];
        const box = kids.length
          ? kids.reduce(
              (acc, k) => {
                const b = k.getBoundingClientRect();
                if (b.height === 0) return acc;
                return { top: Math.min(acc.top, b.top), bottom: Math.max(acc.bottom, b.bottom), left: Math.min(acc.left, b.left) };
              },
              { top: Infinity, bottom: -Infinity, left: Infinity },
            )
          : { top: r.top, bottom: r.bottom, left: r.left };
        if (!Number.isFinite(box.top)) return;
        if (kind === "top") top = Math.max(top, box.bottom);
        if (kind === "bottom") bottom = Math.max(bottom, h - box.top);
        if (kind === "right") right = Math.max(right, w - box.left);
      });
      useCibu.getState().setInsets({ top, bottom, right });
    };
    measure();
    const id = window.setInterval(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [enabled]);
}

/** Plays the chosen soundscape while focusing; fades it out on pause, break and completion. */
export function useSoundscapeSync() {
  useEffect(() => {
    let prev = modeOf(useCibu.getState().session);
    let prevKey = "";
    return useCibu.subscribe((s) => {
      const mode = modeOf(s.session);
      const { soundscape: id, soundscapeVolume: vol, soundscapePulse: pulse } = s.settings;
      const key = `${mode}|${id}|${vol}|${pulse}`;
      if (key === prevKey) return;
      prevKey = key;
      if (mode === "focus" && id !== "off") soundscapeEngine.play(id, vol, pulse);
      else if (prev === "focus" || (mode === "focus" && id === "off")) soundscapeEngine.stop();
      prev = mode;
    });
  }, []);
}
