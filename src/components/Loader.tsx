import { spriteUrl } from "@/game/assets";

/** First paint: server-rendered, so the user sees Cibu immediately while the world loads. */
export function Loader({ visible, progress }: { visible: boolean; progress: number }) {
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 z-20 grid place-items-center bg-cream transition-opacity duration-700 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spriteUrl("pose/walk")} alt="Cibu" width={132} height={132} className="animate-cibu-walk h-[132px] w-auto" />
        <div className="mt-2 h-3 w-24 rounded-[50%] bg-[#6b4a2b]/10 blur-[2px]" />
        <div className="mt-5 text-[15px] font-extrabold text-ink-soft">Menyiapkan Greeny Garden…</div>
        <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-cibu transition-[width] duration-300" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
