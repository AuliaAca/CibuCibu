"use client";
import { useEffect, useRef, useState } from "react";
import { useCibu } from "@/store/useCibu";

/**
 * Box breathing (4·4·4·4) with a frosted-glass guide. Cibu sits on his stool and does
 * every phase with you: swells while you inhale, holds, deflates while you exhale, rests.
 * The dot walks the square clockwise from the top-left corner.
 */
const SEC = 4000;
const CYCLES = 4;

type Phase = "intro" | "in" | "hold" | "out" | "rest" | "done";
const COPY: Record<Phase, string> = {
  intro: "Cibu lagi siap-siap duduk…",
  in: "Tarik napas lewat hidung",
  hold: "Tahan napasmu",
  out: "Hembuskan lewat mulut",
  rest: "Tahan, paru-paru kosong",
  done: "Selesai!",
};
// corners of the square in a 100×100 box (inset so the stroke isn't clipped)
const A = 12;
const B = 88;
const EDGES: Record<"in" | "hold" | "out" | "rest", [[number, number], [number, number]]> = {
  in: [[A, A], [B, A]], // top: left → right
  hold: [[B, A], [B, B]], // right: top → bottom
  out: [[B, B], [A, B]], // bottom: right → left
  rest: [[A, B], [A, A]], // left: bottom → top
};

export function BreathCoach() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [cycle, setCycle] = useState(0);
  const [count, setCount] = useState(0);
  const [p, setP] = useState(0);
  const seated = useCibu((s) => s.seated);
  const cur = useRef<{ phase: Phase; t0: number; ms: number }>({ phase: "intro", t0: 0, ms: 1 });
  const timers = useRef<number[]>([]);
  const started = useRef(false);

  // the guide starts when Cibu is sitting (fallback: 40 s, e.g. reduced scenes)
  useEffect(() => {
    const fallback = window.setTimeout(() => begin(), 40_000);
    if (seated) begin();
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seated]);

  function begin() {
    if (started.current) return;
    started.current = true;
    const react = useCibu.getState().react;
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const go = (ph: Phase, ms: number, c = 0) => {
      cur.current = { phase: ph, t0: performance.now(), ms };
      setPhase(ph);
      setCycle(c);
      setCount(Math.round(ms / 1000));
      // +350 ms so Cibu's beat never ends before the next phase arrives
      react("coach", { phase: ph, ms: ms + 350, cycle: c, total: CYCLES });
    };
    let t = 0;
    at(t, () => go("intro", 3200));
    t += 3200;
    for (let c = 1; c <= CYCLES; c++) {
      for (const ph of ["in", "hold", "out", "rest"] as const) {
        at(t, () => go(ph, SEC, c));
        t += SEC;
      }
    }
    at(t, () => go("done", 2400));
  }

  useEffect(() => {
    const list = timers.current;
    let raf = 0;
    const step = () => {
      const { t0, ms } = cur.current;
      const k = Math.min(1, (performance.now() - t0) / ms);
      setP(k);
      setCount(Math.max(1, Math.ceil((ms * (1 - k)) / 1000)));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      list.forEach(clearTimeout);
    };
  }, []);

  const close = () => useCibu.getState().setBreakActivity(null);
  const active = phase === "in" || phase === "hold" || phase === "out" || phase === "rest" ? phase : null;
  const dot = active
    ? (() => {
        const [[x0, y0], [x1, y1]] = EDGES[active];
        return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p, x0, y0 };
      })()
    : { x: A, y: A, x0: A, y0: A };
  const lab = (on: boolean) => `text-[11.5px] font-black tracking-wide transition-colors duration-300 ${on ? "text-cibu" : "text-ink/45"}`;

  return (
    <div className="animate-toast-in pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-[26px] border border-white/60 bg-white/45 p-3 shadow-[0_20px_50px_-20px_rgba(120,60,10,.45)] backdrop-blur-2xl" aria-live="polite">
      <div className="grid w-fit shrink-0 grid-cols-[30px_auto_30px] items-center gap-x-1 gap-y-0.5">
        <span />
        <span className={`text-center ${lab(phase === "in")}`}>Inhale</span>
        <span />
        <span className={`text-right ${lab(phase === "rest")}`}>Hold</span>
        <div className="relative aspect-square w-[clamp(92px,15vh,124px)]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
            <rect x={A} y={A} width={B - A} height={B - A} rx="9" fill="none" stroke="#E8620A" strokeOpacity=".22" strokeWidth="5" />
            {active && <line x1={dot.x0} y1={dot.y0} x2={dot.x} y2={dot.y} stroke="#E8620A" strokeWidth="5.5" strokeLinecap="round" />}
            <circle cx={dot.x} cy={dot.y} r="6.5" fill="#FF8A3D" stroke="#fff" strokeWidth="2" />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[clamp(28px,5vh,40px)] font-black leading-none text-ink tabular-nums">{phase === "done" ? "✓" : phase === "intro" ? "…" : count}</span>
        </div>
        <span className={lab(phase === "hold")}>Hold</span>
        <span />
        <span className={`text-center ${lab(phase === "out")}`}>Exhale</span>
        <span />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[.12em] text-ink-soft">
          {phase === "intro" || phase === "done" ? "Napas bareng Cibu" : `Putaran ${cycle} dari ${CYCLES}`}
        </div>
        <div className="mt-0.5 text-[15px] font-black leading-tight text-ink">{COPY[phase]}</div>
        <div className="mt-0.5 text-[11px] font-bold leading-snug text-ink-soft">
          {phase === "done" ? "Badan lebih rileks? Istirahatnya lanjut ya~" : "Ikuti Cibu: mengembang saat tarik, mengempis saat hembus."}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {phase === "done" ? (
            <>
              <button onClick={() => useCibu.getState().setBreakActivity("color")} className="rounded-full bg-cibu px-3 py-1 text-[12px] font-black text-white">
                Lanjut mewarnai
              </button>
              <button onClick={close} className="rounded-full px-2.5 py-1 text-[12px] font-extrabold text-ink-soft hover:text-ink">
                Tutup
              </button>
            </>
          ) : (
            <button onClick={close} className="rounded-full bg-ink/5 px-3 py-1 text-[12px] font-extrabold text-ink hover:bg-ink/10">
              Berhenti
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
