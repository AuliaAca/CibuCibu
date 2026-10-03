"use client";
import { useEffect } from "react";
import { useCibu } from "@/store/useCibu";
import { ACHIEVEMENTS } from "@/core/progression";
import { Sprite } from "./ui/Sprite";

function ToastItem({ id, title, body, sprite }: { id: number; title: string; body?: string; sprite?: string }) {
  const dismiss = useCibu((s) => s.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(id), 3800);
    return () => clearTimeout(t);
  }, [id, dismiss]);
  const ach = title === "Achievement" ? ACHIEVEMENTS.find((a) => a.id === body) : null;
  return (
    <div className="glass-strong animate-toast-in pointer-events-auto flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
      {sprite && <Sprite id={sprite} className="size-10 object-contain" alt="" />}
      <div className="leading-tight">
        <div className="text-[14px] font-black text-ink">{ach ? `🏅 ${ach.label}` : title}</div>
        {(ach?.desc ?? body) && <div className="text-[12px] font-bold text-ink-soft">{ach?.desc ?? body}</div>}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useCibu((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(76px,calc(env(safe-area-inset-top)+68px))] z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
