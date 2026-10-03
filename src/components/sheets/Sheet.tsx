"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "../ui/icons";

/** Bottom sheet on phones/tablets, side panel on desktop. The world stays visible behind it. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  return (
    <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-[#2a1a0e]/20 transition-opacity duration-300 lg:bg-transparent ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-label={title}
        className={`glass-strong absolute bottom-0 left-0 right-0 max-h-[82dvh] overflow-y-auto rounded-t-[30px] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 outline-none transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1)] lg:bottom-4 lg:left-auto lg:right-4 lg:top-4 lg:max-h-none lg:w-[400px] lg:rounded-[30px] lg:pt-5 ${
          open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-[110%] lg:translate-y-0"
        }`}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15 lg:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="grid size-9 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
