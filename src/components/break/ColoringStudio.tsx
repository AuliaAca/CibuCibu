"use client";
import { useMemo, useRef, useState } from "react";
import { useCibu } from "@/store/useCibu";
import { formatClock, remainingMs } from "@/core/pomodoro";
import { PAGES } from "./coloringPages";
import { CloseIcon } from "../ui/icons";
import { Sprite } from "../ui/Sprite";
import { COLOR_PRAISE } from "@/core/cibuBrain";

/**
 * "Mewarnai gemes" — a calm break activity that doubles as a tiny color-theory
 * lesson: pick from a 12-hue color wheel, try tints & shades, and let the
 * harmony helper suggest complementary / analogous / triadic partners.
 */
const WHEEL = [
  { hex: "#E8453C", name: "Merah" },
  { hex: "#F2683A", name: "Merah-oranye" },
  { hex: "#F7923A", name: "Oranye" },
  { hex: "#F9B73F", name: "Kuning-oranye" },
  { hex: "#F7D84B", name: "Kuning" },
  { hex: "#B5D65A", name: "Kuning-hijau" },
  { hex: "#5DBB63", name: "Hijau" },
  { hex: "#3FB5A7", name: "Tosca" },
  { hex: "#4A90D9", name: "Biru" },
  { hex: "#6B6FD4", name: "Biru-ungu" },
  { hex: "#9B63C9", name: "Ungu" },
  { hex: "#D2569A", name: "Magenta" },
];
const NEUTRALS = [
  { hex: "#FFFFFF", name: "Putih" },
  { hex: "#FBF1E4", name: "Krem" },
  { hex: "#C9BBAA", name: "Abu hangat" },
  { hex: "#8A6A4E", name: "Cokelat" },
  { hex: "#3B2717", name: "Hitam cokelat" },
];

const mix = (hex: string, to: string, t: number) => {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

type Harmony = "komplementer" | "analog" | "triadik" | "split";
const HARMONY: Record<Harmony, { label: string; steps: number[]; tip: string }> = {
  komplementer: {
    label: "Komplementer",
    steps: [6],
    tip: "Warna yang berseberangan di roda warna. Kontrasnya kuat — pakai satu sebagai warna utama, satunya buat aksen kecil.",
  },
  analog: { label: "Analog", steps: [-1, 1], tip: "Warna yang bertetangga di roda warna. Hasilnya kalem & menyatu, cocok buat suasana lembut." },
  triadik: {
    label: "Triadik",
    steps: [4, 8],
    tip: "Tiga warna berjarak sama, membentuk segitiga. Ceria & seimbang — pilih satu yang dominan, dua lainnya pendamping.",
  },
  split: { label: "Split", steps: [5, 7], tip: "Warna utama + dua tetangga dari komplementernya. Tetap kontras, tapi lebih lembut dari komplementer." },
};

const warmth = (i: number) => (i <= 4 || i === 11 ? "hangat" : i === 5 ? "netral" : "dingin");

function Swatch({ hex, on, onClick, label, size = 30 }: { hex: string; on: boolean; onClick: () => void; label: string; size?: number }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded-full ring-offset-2 ring-offset-[#fff9f1] transition hover:scale-110 ${on ? "ring-2 ring-ink" : "ring-1 ring-ink/15"}`}
      style={{ width: size, height: size, background: hex }}
    />
  );
}

export function ColoringStudio() {
  const session = useCibu((s) => s.session);
  const now = useCibu((s) => s.now);
  const react = useCibu((s) => s.react);
  const [pageIdx, setPageIdx] = useState(0);
  const page = PAGES[pageIdx];
  const [fills, setFills] = useState<Record<string, Record<string, string>>>({});
  const [history, setHistory] = useState<{ page: string; id: string; prev?: string }[]>([]);
  const [hue, setHue] = useState(2);
  const [color, setColor] = useState({ hex: WHEEL[2].hex, name: WHEEL[2].name, fromHarmony: false });
  const [harmony, setHarmony] = useState<Harmony>("komplementer");
  const counter = useRef({ fills: 0, lastPraise: 0, harmonyCheered: false });
  // Cibu is behind this panel, so echo what he says right here
  const [cibuSays, setCibuSays] = useState<string | null>(null);
  const sayTimer = useRef<number | undefined>(undefined);
  const cheer = (kind: "colorPraise" | "colorHarmony", line: string) => {
    react(kind, { line });
    setCibuSays(line);
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => setCibuSays(null), 4200);
  };

  const pageFills = fills[page.id] ?? {};
  const suggestions = useMemo(() => HARMONY[harmony].steps.map((d) => WHEEL[(hue + d + 12) % 12]), [harmony, hue]);
  const base = WHEEL[hue];
  const tones = [
    { hex: mix(base.hex, "#ffffff", 0.55), name: `${base.name} pastel (tint)` },
    { hex: mix(base.hex, "#ffffff", 0.28), name: `${base.name} muda (tint)` },
    { hex: base.hex, name: base.name },
    { hex: mix(base.hex, "#1b0f08", 0.28), name: `${base.name} tua (shade)` },
  ];

  const paint = (id: string) => {
    setHistory((h) => [...h.slice(-60), { page: page.id, id, prev: pageFills[id] }]);
    setFills((f) => ({ ...f, [page.id]: { ...(f[page.id] ?? {}), [id]: color.hex } }));
    const c = counter.current;
    c.fills++;
    const t = Date.now();
    if (color.fromHarmony && !c.harmonyCheered) {
      c.harmonyCheered = true;
      c.lastPraise = t;
      cheer("colorHarmony", `Itu ${HARMONY[harmony].label.toLowerCase()}! Jadi makin serasi~`);
    } else if (c.fills % 5 === 0 && t - c.lastPraise > 14_000) {
      c.lastPraise = t;
      cheer("colorPraise", COLOR_PRAISE[Math.floor(Math.random() * COLOR_PRAISE.length)]);
    }
  };

  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setFills((f) => {
      const p = { ...(f[last.page] ?? {}) };
      if (last.prev) p[last.id] = last.prev;
      else delete p[last.id];
      return { ...f, [last.page]: p };
    });
  };

  const close = () => useCibu.getState().setBreakActivity(null);
  const inBreak = session.kind === "break" && session.status === "running";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#2a1a0e]/25 p-2 sm:items-center sm:p-4" role="dialog" aria-label="Mewarnai bareng Cibu">
      <div className="glass-strong animate-toast-in flex max-h-[96dvh] w-full max-w-[900px] flex-col overflow-hidden rounded-[30px]">
        <header className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-4 py-3">
          <div className="mr-auto flex items-center gap-2">
            <Sprite id={cibuSays ? "complete/youdidit" : "complete/bestie"} className={`h-11 w-auto transition-transform ${cibuSays ? "scale-110" : ""}`} alt="" />
            <div>
            <div className="text-[18px] font-black leading-tight text-ink">{cibuSays ? `"${cibuSays}"` : "Mewarnai bareng Cibu"}</div>
            <div className="text-[12px] font-bold text-ink-soft">
              {inBreak ? `Istirahat ${formatClock(remainingMs(session, now))} lagi` : "Santai aja, pelan-pelan~"}
            </div>
            </div>
          </div>
          <div className="flex gap-1 rounded-full bg-ink/5 p-1">
            {PAGES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setPageIdx(i)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold ${i === pageIdx ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
              >
                {p.title}
              </button>
            ))}
          </div>
          <button onClick={close} aria-label="Selesai mewarnai" className="grid size-9 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink">
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 400 400" className="aspect-square w-full max-w-[460px] touch-manipulation select-none" role="img" aria-label={page.title}>
              <defs>
                {page.regions.map((r) => (
                  <clipPath key={r.id} id={`clip-${page.id}-${r.id}`}>
                    <path d={r.d} />
                  </clipPath>
                ))}
              </defs>
              {page.regions.map((r) => (
                <path
                  key={r.id}
                  d={r.d}
                  fill={pageFills[r.id] ?? "#ffffff"}
                  stroke="#3b2717"
                  strokeWidth={4.5}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-[fill] duration-300 hover:brightness-95"
                  onClick={() => paint(r.id)}
                >
                  <title>{r.label}</title>
                </path>
              ))}
              {page.decor.map((d, i) => (
                <path
                  key={i}
                  d={d.d}
                  fill={d.fill ? "#3b2717" : "none"}
                  stroke="#3b2717"
                  strokeWidth={d.width ?? 4.5}
                  strokeLinecap="round"
                  clipPath={d.clip ? `url(#clip-${page.id}-${d.clip})` : undefined}
                  pointerEvents="none"
                />
              ))}
            </svg>
          </div>

          <aside className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3">
              <span className="size-11 shrink-0 rounded-full ring-2 ring-white" style={{ background: color.hex, boxShadow: "0 2px 8px rgba(0,0,0,.15)" }} />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-black text-ink">{color.name}</div>
                <div className="text-[12px] font-bold text-ink-soft">Warna {warmth(hue)} · tap bagian gambar untuk mewarnai</div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[13px] font-black text-ink">Roda warna</div>
              <div className="flex items-center gap-3">
                <svg viewBox="-60 -60 120 120" className="size-[120px] shrink-0" role="radiogroup" aria-label="Roda warna">
                  {WHEEL.map((w, i) => {
                    const a0 = ((i - 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
                    const a1 = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
                    const R = 56;
                    const r = 24;
                    const p = (a: number, rad: number) => `${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)}`;
                    const d = `M${p(a0, r)} L${p(a0, R)} A${R} ${R} 0 0 1 ${p(a1, R)} L${p(a1, r)} A${r} ${r} 0 0 0 ${p(a0, r)}Z`;
                    const partner = HARMONY[harmony].steps.some((s) => (hue + s + 12) % 12 === i);
                    return (
                      <path
                        key={w.hex}
                        d={d}
                        fill={w.hex}
                        stroke={i === hue ? "#3b2717" : partner ? "#ffffff" : "#fff9f1"}
                        strokeWidth={i === hue ? 3 : partner ? 3 : 1.5}
                        className="cursor-pointer"
                        role="radio"
                        aria-checked={i === hue}
                        aria-label={w.name}
                        onClick={() => {
                          setHue(i);
                          setColor({ hex: w.hex, name: w.name, fromHarmony: false });
                        }}
                      />
                    );
                  })}
                  <circle r="20" fill={color.hex} stroke="#fff" strokeWidth="3" />
                </svg>
                <div className="space-y-2">
                  <div className="text-[11px] font-extrabold text-ink-soft">Tint ← → Shade</div>
                  <div className="flex gap-1.5">
                    {tones.map((t) => (
                      <Swatch key={t.hex} hex={t.hex} label={t.name} on={color.hex === t.hex} onClick={() => setColor({ hex: t.hex, name: t.name, fromHarmony: false })} />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {NEUTRALS.map((n) => (
                      <Swatch key={n.hex} hex={n.hex} label={n.name} size={24} on={color.hex === n.hex} onClick={() => setColor({ hex: n.hex, name: n.name, fromHarmony: false })} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] font-bold leading-snug text-ink-soft">
                Tint = dicampur putih (lebih pastel). Shade = dicampur hitam (lebih dalam). Warna hangat terasa ceria & "maju", warna dingin terasa tenang & "mundur".
              </p>
            </div>

            <div className="rounded-2xl bg-white/70 p-3">
              <div className="mb-2 flex flex-wrap gap-1">
                {(Object.keys(HARMONY) as Harmony[]).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHarmony(h)}
                    className={`rounded-full px-2.5 py-1 text-[12px] font-extrabold ${harmony === h ? "bg-ink text-cream" : "bg-ink/5 text-ink/70"}`}
                  >
                    {HARMONY[h].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Swatch hex={base.hex} label={base.name} on={color.hex === base.hex} onClick={() => setColor({ hex: base.hex, name: base.name, fromHarmony: false })} />
                <span className="text-[16px] font-black text-ink/40">+</span>
                {suggestions.map((s) => (
                  <Swatch key={s.hex} hex={s.hex} label={`${s.name} (${HARMONY[harmony].label})`} on={color.hex === s.hex} onClick={() => setColor({ hex: s.hex, name: s.name, fromHarmony: true })} />
                ))}
              </div>
              <p className="mt-2 text-[12px] font-bold leading-snug text-ink-soft">{HARMONY[harmony].tip}</p>
            </div>

            <div className="flex gap-2">
              <button onClick={undo} disabled={!history.length} className="h-10 flex-1 rounded-full bg-white/80 text-[13px] font-extrabold text-ink ring-1 ring-ink/10 disabled:opacity-40">
                Undo
              </button>
              <button
                onClick={() => setFills((f) => ({ ...f, [page.id]: {} }))}
                className="h-10 flex-1 rounded-full bg-white/80 text-[13px] font-extrabold text-ink ring-1 ring-ink/10"
              >
                Hapus warna
              </button>
              <button onClick={close} className="h-10 flex-1 rounded-full bg-cibu text-[13px] font-black text-white">
                Selesai
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
