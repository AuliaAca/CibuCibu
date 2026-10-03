"use client";
import { useCibu, selectMode } from "@/store/useCibu";
import { PlayIcon, PauseIcon, StopIcon, SkipIcon } from "../ui/icons";
import type { ReactNode } from "react";

function Primary({ onClick, children, label }: { onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group relative flex h-14 items-center justify-center gap-2.5 rounded-full bg-cibu px-7 text-[17px] font-black text-white shadow-[0_10px_24px_-8px_rgba(232,98,10,.7),inset_0_-3px_0_rgba(0,0,0,.12),inset_0_2px_0_rgba(255,255,255,.35)] transition hover:brightness-105 active:translate-y-px active:scale-[.98]"
    >
      {children}
    </button>
  );
}

function Round({ onClick, label, children, tone = "glass" }: { onClick: () => void; label: string; children: ReactNode; tone?: "glass" | "primary" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        aria-label={label}
        className={`grid place-items-center rounded-full transition active:scale-95 ${
          tone === "primary"
            ? "size-16 bg-cibu text-white shadow-[0_10px_24px_-8px_rgba(232,98,10,.7),inset_0_-3px_0_rgba(0,0,0,.12)] hover:brightness-105"
            : "glass size-12 text-ink hover:scale-105"
        }`}
      >
        {children}
      </button>
      <span className="text-[11px] font-extrabold text-ink/70 [text-shadow:0_1px_0_rgba(255,255,255,.6)]">{label}</span>
    </div>
  );
}

/** 25/5 classic Pomodoro; 42/6 and 50/10 are the rhythms Dr. Justin Sung uses in his study-with-me sessions. */
const RHYTHMS = [
  { f: 25, b: 5, hint: "Pomodoro klasik" },
  { f: 42, b: 6, hint: "Ritme study-with-me Justin Sung (42-6)" },
  { f: 50, b: 10, hint: "Ritme study-with-me Justin Sung (50-10)" },
];

export function ControlDock() {
  const mode = useCibu(selectMode);
  const s = useCibu.getState;
  const focusMin = useCibu((st) => st.settings.focusMin);
  const breakMin = useCibu((st) => st.settings.breakMin);
  const custom = !RHYTHMS.some((r) => r.f === focusMin && r.b === breakMin);
  const update = useCibu((st) => st.updateSettings);
  const hasReward = useCibu((st) => st.reward !== null);

  if (mode === "complete")
    // normally the reward card covers this state; if it is gone, never leave the user without a button
    return hasReward ? null : (
      <div className="pointer-events-auto">
        <Primary onClick={() => s().dismissReward()}>
          <PlayIcon width={22} height={22} /> Lanjut
        </Primary>
      </div>
    );

  if (mode === "idle")
    return (
      <div className="pointer-events-auto flex w-full flex-col items-center gap-3 sm:w-auto [@media(max-height:640px)]:flex-row [@media(max-height:640px)]:gap-2">
        <div className="glass flex rounded-full p-1" role="radiogroup" aria-label="Ritme fokus">
          {RHYTHMS.map((r) => {
            const on = r.f === focusMin && r.b === breakMin;
            return (
              <button
                key={r.f}
                role="radio"
                aria-checked={on}
                title={r.hint}
                onClick={() => update({ focusMin: r.f, breakMin: r.b })}
                className={`flex flex-col items-center rounded-full px-3.5 py-1 leading-tight transition sm:px-4 ${on ? "bg-white text-ink shadow-sm" : "text-ink/60 hover:text-ink"}`}
              >
                <span className="text-[13px] font-black">{r.f} mnt</span>
                <span className="text-[10px] font-bold opacity-70">istirahat {r.b}</span>
              </button>
            );
          })}
          {!custom ? null : (
            <span className="flex flex-col items-center rounded-full bg-white px-3.5 py-1 leading-tight text-ink shadow-sm">
              <span className="text-[13px] font-black">{focusMin} mnt</span>
              <span className="text-[10px] font-bold opacity-70">istirahat {breakMin}</span>
            </span>
          )}
        </div>
        <Primary onClick={() => s().startFocus()}>
          <PlayIcon width={22} height={22} /> Mulai Fokus
        </Primary>
      </div>
    );

  if (mode === "focus" || mode === "paused")
    return (
      <div className="pointer-events-auto flex items-end gap-6">
        <Round label="Selesai" onClick={() => s().endEarly()}>
          <StopIcon />
        </Round>
        {mode === "focus" ? (
          <Round label="Jeda" tone="primary" onClick={() => s().pause()}>
            <PauseIcon width={26} height={26} />
          </Round>
        ) : (
          <Round label="Lanjut" tone="primary" onClick={() => s().resume()}>
            <PlayIcon width={26} height={26} />
          </Round>
        )}
        <Round label="Skip" onClick={() => s().skipFocus()}>
          <SkipIcon />
        </Round>
      </div>
    );

  if (mode === "break")
    return (
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <button onClick={() => s().skipBreak()} className="glass flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-extrabold text-ink transition hover:scale-[1.02] active:scale-95">
          <SkipIcon width={18} height={18} /> Lewati istirahat
        </button>
      </div>
    );

  // breakOver
  return (
    <div className="pointer-events-auto">
      <Primary onClick={() => s().startFocus()}>
        <PlayIcon width={22} height={22} /> Lanjut Fokus
      </Primary>
    </div>
  );
}
