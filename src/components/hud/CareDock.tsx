"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCibu, selectMode } from "@/store/useCibu";
import { MENU, FULL_AT } from "@/core/care";
import { assetUrl } from "@/game/assets";
import { Sprite } from "../ui/Sprite";
import { BubblesIcon, MoonIcon } from "../ui/icons";

function CareButton({
  label,
  onClick,
  badge,
  children,
  dim,
  active,
}: {
  label: string;
  onClick: () => void;
  badge?: number;
  children: ReactNode;
  dim?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={badge != null ? `${label} (${badge})` : label}
      aria-expanded={active}
      className={`glass relative flex w-[58px] flex-col items-center justify-center rounded-2xl pb-1.5 pt-1 transition hover:-translate-y-0.5 active:scale-95 sm:w-[68px] ${
        dim ? "opacity-60" : ""
      } ${active ? "ring-2 ring-cibu" : ""}`}
    >
      <div className="grid size-9 place-items-center sm:size-10">{children}</div>
      <span className="text-[11px] font-extrabold leading-tight text-ink">{label}</span>
      {badge != null && (
        <span
          className={`absolute -left-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-black leading-5 ${
            badge > 0 ? "bg-cibu text-white" : "bg-ink/15 text-ink/60"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** Three healthy choices. Always available — feeding is care, not a currency. */
function FoodMenu({ onClose }: { onClose: () => void }) {
  const feed = useCibu((s) => s.feed);
  const hunger = useCibu((s) => Math.round(s.care.hunger));
  const full = hunger >= FULL_AT;
  return (
    <div
      role="menu"
      aria-label="Menu makan Cibu"
      className="glass-strong animate-toast-in absolute right-full top-0 mr-3 w-[248px] rounded-3xl p-3 sm:w-[270px]"
    >
      <div className="mb-2 flex items-baseline justify-between px-1">
        <span className="text-[15px] font-black text-ink">Mau makan apa?</span>
        <span className={`text-[11px] font-extrabold ${full ? "text-leaf" : "text-ink-soft"}`}>Kenyang {hunger}%</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {MENU.map((f) => (
          <button
            key={f.id}
            role="menuitem"
            onClick={() => {
              feed(f.id);
              onClose();
            }}
            className="flex items-center gap-3 rounded-2xl bg-white/70 p-1.5 pr-3 text-left transition hover:bg-white active:scale-[.98]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(f.img)} alt="" width={44} height={44} className="size-11 object-contain" />
            <span className="flex-1">
              <span className="block text-[14px] font-black leading-tight text-ink">{f.label}</span>
              <span className="text-[11px] font-bold text-ink-soft">+{f.hunger} kenyang</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                f.kind === "sayur" ? "bg-leaf/35 text-[#4d7a22]" : "bg-blush/35 text-[#b23a55]"
              }`}
            >
              {f.kind}
            </span>
          </button>
        ))}
      </div>
      {full && <p className="mt-2 px-1 text-[11px] font-bold text-ink-soft">Cibu masih kenyang, tapi boleh kok dicoba.</p>}
    </div>
  );
}

/** Care actions — a side rail so it never covers Cibu; hidden while focusing. */
export function CareDock() {
  const mode = useCibu(selectMode);
  const drinks = useCibu((s) => s.inventory.drink);
  const a = useCibu.getState;
  const visible = mode === "idle" || mode === "break" || mode === "breakOver";
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) setMenu(false);
  }, [visible]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [menu]);

  return (
    <nav
      data-inset={visible ? "right" : undefined}
      aria-label="Rawat Cibu"
      aria-hidden={!visible}
      className={`pointer-events-auto fixed right-3 top-1/2 z-20 -translate-y-1/2 transition-all duration-500 sm:right-5 ${
        visible ? "opacity-100" : "pointer-events-none translate-x-4 opacity-0"
      }`}
    >
      <div ref={wrap} className="relative flex flex-col gap-2">
        <CareButton label="Snack" active={menu} onClick={() => setMenu((m) => !m)}>
          <Sprite id="prop/snack" className="size-9 object-contain" alt="" />
        </CareButton>
        {menu && <FoodMenu onClose={() => setMenu(false)} />}
        <CareButton label="Minum" badge={drinks} dim={drinks === 0} onClick={() => a().giveDrink()}>
          <Sprite id="prop/drink" className="size-9 object-contain" alt="" />
        </CareButton>
        <CareButton label="Mandi" onClick={() => a().bathe()}>
          <BubblesIcon width={26} height={26} className="text-[#6aa9d8]" />
        </CareButton>
        <CareButton label="Tidur" onClick={() => a().takeNap()}>
          <MoonIcon width={24} height={24} className="text-[#8f9be0]" />
        </CareButton>
      </div>
    </nav>
  );
}
