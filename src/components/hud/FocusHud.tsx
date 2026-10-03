"use client";
import { useCibu, selectMode } from "@/store/useCibu";
import { formatClock, remainingMs, progressOf, CYCLE_LENGTH } from "@/core/pomodoro";

import { localHour } from "@/game/world/atmosphere";

function greeting() {
  const h = localHour();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
}

/** The timer, presented as a quiet HUD floating over the world. */
export function FocusHud() {
  const mode = useCibu(selectMode);
  const session = useCibu((s) => s.session);
  const now = useCibu((s) => s.now);
  const focusMin = useCibu((s) => s.settings.focusMin);
  if (mode === "complete") return null;

  const running = mode === "focus" || mode === "paused" || mode === "break";
  const remaining = running ? remainingMs(session, now) : mode === "breakOver" ? 0 : focusMin * 60_000;
  const pct = running ? progressOf(session, now) : mode === "breakOver" ? 1 : 0;
  const isBreak = session.kind === "break";
  const done = session.cycle % CYCLE_LENGTH;
  const label =
    mode === "focus"
      ? "Fokus"
      : mode === "paused"
        ? "Dijeda"
        : mode === "break"
          ? session.isLongBreak
            ? "Istirahat panjang"
            : "Istirahat"
          : mode === "breakOver"
            ? "Istirahat selesai"
            : greeting();

  return (
    <section
      aria-live="polite"
      className={`pointer-events-auto mx-auto mt-3 flex flex-col [@media(max-height:640px)]:mt-1 items-center transition-all duration-700 ${mode === "focus" ? "sm:mt-4" : "sm:-mt-2"}`}
    >
      <div
        className={`glass flex min-w-[220px] flex-col items-center rounded-[28px] px-6 pb-3 pt-2.5 transition-all duration-700 [@media(max-height:640px)]:min-w-[190px] [@media(max-height:640px)]:pb-2 [@media(max-height:640px)]:pt-1.5 ${
          mode === "idle" ? "scale-95 opacity-90" : ""
        }`}
      >
        <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
          <span
            className={`inline-block size-2 rounded-full ${
              mode === "focus" ? "animate-pulse bg-cibu" : mode === "paused" ? "bg-sun" : isBreak && running ? "bg-teal" : "bg-ink/25"
            }`}
          />
          {label}
        </div>
        <div
          className={`font-black tabular-nums leading-none tracking-tight text-ink transition-all duration-500 ${
            mode === "idle" ? "text-[44px] text-ink/70 sm:text-[52px] [@media(max-height:640px)]:text-[36px]" : "text-[58px] sm:text-[76px] [@media(max-height:640px)]:text-[48px]"
          } ${mode === "paused" ? "opacity-60" : ""}`}
        >
          {formatClock(remaining)}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${isBreak ? "bg-teal" : "bg-gradient-to-r from-sun to-cibu"}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5" aria-label={`Sesi ${done + 1} dari ${CYCLE_LENGTH}`}>
          {Array.from({ length: CYCLE_LENGTH }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < done ? "w-1.5 bg-cibu" : i === done && mode === "focus" ? "w-4 bg-cibu/70" : "w-1.5 bg-ink/15"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
