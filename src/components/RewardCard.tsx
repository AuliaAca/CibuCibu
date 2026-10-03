"use client";
import { useEffect, useState } from "react";
import { useCibu, selectMode } from "@/store/useCibu";
import { OUTFITS, ACHIEVEMENTS } from "@/core/progression";
import { CYCLE_LENGTH } from "@/core/pomodoro";
import { Sprite } from "./ui/Sprite";
import { CibuDressed } from "./ui/CibuDressed";
import { CloseIcon } from "./ui/icons";

function useCountUp(target: number, run: boolean, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

/**
 * Appears after Cibu's celebration has had a moment in the world.
 * Summarises progress, then offers the natural next step: rest, or keep going.
 */
export function RewardCard() {
  const mode = useCibu(selectMode);
  const reward = useCibu((s) => s.reward);
  const cycle = useCibu((s) => s.session.cycle);
  const settings = useCibu((s) => s.settings);
  const [shown, setShown] = useState(false);
  const [step, setStep] = useState<"choose" | "cibu">("choose");
  const active = mode === "complete" && !!reward;

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    setStep("choose");
    // let Cibu's "YAYYY" be read first, then the card slides up
    const t = setTimeout(() => setShown(true), 2600);
    return () => clearTimeout(t);
  }, [active]);

  const xp = useCountUp(reward?.xp ?? 0, shown);
  const [bar, setBar] = useState(0);
  useEffect(() => {
    if (!shown || !reward) return;
    setBar(reward.levelAfter > reward.levelBefore ? 0 : reward.pctBefore);
    const t = setTimeout(() => setBar(reward.pctAfter), 250);
    return () => clearTimeout(t);
  }, [shown, reward]);

  if (!active || !reward) return null;
  const long = cycle >= CYCLE_LENGTH;
  const levelUp = reward.levelAfter > reward.levelBefore;
  const unlocked = OUTFITS.filter((o) => reward.unlocked.includes(o.id));
  const s = useCibu.getState;

  return (
    <div data-inset={shown ? "bottom" : undefined} className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-8">
      <div
        role="dialog"
        aria-label="Sesi selesai"
        className={`glass-strong pointer-events-auto w-full max-w-[420px] rounded-[30px] p-5 transition-all duration-700 ease-[cubic-bezier(.2,.9,.25,1.15)] ${
          shown ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
        }`}
      >
        <button onClick={() => s().dismissReward()} aria-label="Tutup" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-ink/50 hover:bg-ink/5 hover:text-ink">
          <CloseIcon width={18} height={18} />
        </button>
        <div className="pr-8 text-[20px] font-black leading-tight text-ink">YAYYY! Kamu sudah menyelesaikan sesi dengan baik</div>
        <div className="mt-2 flex items-end gap-3">
          <div className="text-[36px] font-black leading-none text-cibu tabular-nums">+{xp}</div>
          <div className="pb-0.5 text-[14px] font-extrabold text-ink">XP · {reward.minutes} menit fokus</div>
          <div className="ml-auto flex gap-2 pb-0.5">
            {reward.items.drink > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-white/70 py-0.5 pl-0.5 pr-2.5 text-[13px] font-black text-ink">
                <Sprite id="prop/drink" className="size-7 object-contain" alt="Minuman" />+{reward.items.drink}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[12px] font-extrabold text-ink-soft">
            <span>{levelUp ? `Level up! Lv ${reward.levelBefore} → ${reward.levelAfter}` : `Lv ${reward.levelAfter}`}</span>
            <span>{Math.round(bar * 100)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-gradient-to-r from-sun to-cibu transition-[width] duration-[1200ms] ease-out" style={{ width: `${bar * 100}%` }} />
          </div>
        </div>

        {unlocked.length > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/70 p-2 pr-3">
            <CibuDressed outfit={unlocked[0]} className="h-14" />
            <div className="flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-cibu">
                Outfit baru{unlocked.length > 1 ? ` (+${unlocked.length - 1} lagi)` : ""}
              </div>
              <div className="text-[15px] font-black text-ink">{unlocked[0].label}</div>
            </div>
            <button
              onClick={() => {
                s().equip(unlocked[0].id);
              }}
              className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-extrabold text-cream"
            >
              Pakai
            </button>
          </div>
        )}
        {reward.achievements.length > 0 && (
          <div className="mt-2 text-[13px] font-bold text-ink-soft">
            🏅 {reward.achievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.label).join(", ")}
          </div>
        )}

        <div className="mt-4 border-t border-ink/10 pt-3">
          {step === "choose" ? (
            <>
              <div className="mb-2 text-[14px] font-black text-ink">
                Istirahat {long ? settings.longBreakMin : settings.breakMin} menit dulu yuk. Mau stretching gimana?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton onClick={() => setStep("cibu")} sprite="pose/dance" title="Stretching bareng aku" desc="Napas bareng / mewarnai" primary />
                <ChoiceButton onClick={() => s().startBreak("self")} sprite="pose/walk" title="Stretching ala kamu" desc="Bebas, asal tanpa HP" />
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px] font-black text-ink">Mau ngapain bareng Cibu?</span>
                <button onClick={() => setStep("choose")} className="text-[12px] font-extrabold text-ink-soft hover:text-ink">
                  ← Kembali
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton onClick={() => s().startBreak("breathe")} sprite="expression/sleepy" title="Napas bareng" desc="Tarik & hembuskan pelan, ±1 menit" primary />
                <ChoiceButton onClick={() => s().startBreak("color")} img="palette" title="Mewarnai gemes" desc="Sambil belajar teori warna" />
              </div>
            </>
          )}
          <button onClick={() => s().startFocus()} className="mt-2 w-full py-1.5 text-center text-[12px] font-extrabold text-ink-soft hover:text-ink">
            Lewati istirahat, lanjut fokus →
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceButton({ onClick, sprite, img, title, desc, primary }: { onClick: () => void; sprite?: string; img?: "palette"; title: string; desc: string; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl px-2 pb-2.5 pt-2 text-center transition active:scale-[.98] ${
        primary ? "bg-cibu text-white shadow-[0_8px_20px_-8px_rgba(232,98,10,.8)]" : "bg-white/80 text-ink ring-1 ring-ink/10 hover:bg-white"
      }`}
    >
      {sprite ? (
        <Sprite id={sprite} className="h-12 w-auto object-contain" alt="" />
      ) : (
        <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden>
          <path d="M24 4C12 4 4 12 4 23c0 10 8 19 18 19 3 0 4-2 3-4-1-3 1-6 4-6h5c6 0 10-4 10-10C44 12 35 4 24 4Z" fill="#fff6ea" stroke="#3b2717" strokeWidth="2.5" />
          <circle cx="14" cy="22" r="3.5" fill="#E8453C" />
          <circle cx="20" cy="13" r="3.5" fill="#F7D84B" />
          <circle cx="30" cy="12" r="3.5" fill="#5DBB63" />
          <circle cx="37" cy="20" r="3.5" fill="#4A90D9" />
        </svg>
      )}
      <span className="text-[14px] font-black leading-tight">{title}</span>
      <span className={`text-[11px] font-bold leading-tight ${primary ? "text-white/85" : "text-ink-soft"}`}>{desc}</span>
    </button>
  );
}
