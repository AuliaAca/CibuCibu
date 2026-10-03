"use client";
import { useCibu, selectMode } from "@/store/useCibu";
import { levelInfo } from "@/core/progression";
import { BookIcon, HangerIcon, GearIcon, BowlIcon, BoltIcon, HeartIcon, DropIcon, HeadphonesIcon } from "../ui/icons";
import type { ReactNode } from "react";

function Ring({ pct, size = 44, stroke = 4, color = "var(--color-cibu)", children }: { pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(59,39,23,.1)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

function LevelBadge() {
  const xp = useCibu((s) => s.progress.xp);
  const lv = levelInfo(xp);
  return (
    <div className="glass flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4">
      <Ring pct={lv.pct}>
        <span className="text-[15px] font-black leading-none text-ink">{lv.level}</span>
      </Ring>
      <div className="leading-tight">
        <div className="text-[13px] font-extrabold text-ink">Cibu · Lv {lv.level}</div>
        <div className="text-[11px] font-bold text-ink-soft tabular-nums">
          {lv.into}/{lv.need} XP
        </div>
      </div>
    </div>
  );
}

const METERS = [
  { key: "hunger", label: "Kenyang", Icon: BowlIcon, color: "#f59e2b" },
  { key: "energy", label: "Energi", Icon: BoltIcon, color: "#4fb5bb" },
  { key: "mood", label: "Mood", Icon: HeartIcon, color: "#f17990" },
  { key: "hygiene", label: "Bersih", Icon: DropIcon, color: "#8f9be0" },
] as const;

export function CareMeters({ compact = false }: { compact?: boolean }) {
  const care = useCibu((s) => s.care);
  return (
    <div className={`glass flex items-center rounded-full ${compact ? "gap-1 p-1" : "gap-1.5 p-1.5"}`} role="group" aria-label="Kondisi Cibu">
      {METERS.map(({ key, label, Icon, color }) => {
        const v = Math.round(care[key]);
        const low = v < 35;
        return (
          <div key={key} className="group relative" title={`${label} ${v}%`}>
            <Ring pct={v / 100} size={compact ? 32 : 36} stroke={3.5} color={color}>
              <Icon width={compact ? 13 : 15} height={compact ? 13 : 15} style={{ color }} className={low ? "animate-pulse" : ""} />
            </Ring>
            <span className="sr-only">
              {label} {v} persen
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-cream opacity-0 transition-opacity group-hover:opacity-100">
              {label} {v}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NavButton({ label, onClick, children, live }: { label: string; onClick: () => void; children: ReactNode; live?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="glass relative grid size-10 place-items-center rounded-full text-ink transition hover:scale-105 active:scale-95 sm:size-11"
    >
      {children}
      {live && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 items-end gap-[2px] rounded-full bg-cibu px-[3px] pb-[3px]" aria-hidden>
          <span className="w-[2px] animate-[eq_0.9s_ease-in-out_infinite] rounded bg-white" style={{ height: 6 }} />
          <span className="w-[2px] animate-[eq_0.7s_ease-in-out_infinite_0.2s] rounded bg-white" style={{ height: 8 }} />
          <span className="w-[2px] animate-[eq_1s_ease-in-out_infinite_0.1s] rounded bg-white" style={{ height: 5 }} />
        </span>
      )}
    </button>
  );
}

export function TopBar() {
  const mode = useCibu(selectMode);
  const open = useCibu((s) => s.openSheet);
  const focusing = mode === "focus" || mode === "paused";
  const musicOn = useCibu((s) => (s.settings.soundscape !== "off" && mode === "focus") || !!s.settings.spotify);
  return (
    <header
      className={`pointer-events-auto flex items-start justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] transition-opacity duration-700 sm:px-6 sm:pt-5 ${
        focusing ? "opacity-40 hover:opacity-100 focus-within:opacity-100" : "opacity-100"
      }`}
    >
      <LevelBadge />
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className={`hidden md:block transition-all duration-500 ${focusing ? "pointer-events-none -translate-y-2 opacity-0" : ""}`}>
          <CareMeters />
        </div>
        <NavButton label="Musik fokus" live={musicOn} onClick={() => open("music")}>
          <HeadphonesIcon />
        </NavButton>
        <NavButton label="Jurnal" onClick={() => open("journal")}>
          <BookIcon />
        </NavButton>
        <NavButton label="Lemari" onClick={() => open("wardrobe")}>
          <HangerIcon />
        </NavButton>
        <NavButton label="Pengaturan" onClick={() => open("settings")}>
          <GearIcon />
        </NavButton>
      </div>
    </header>
  );
}
