"use client";
import { useState } from "react";
import { useCibu } from "@/store/useCibu";

const IDEAS = ["Minum air putih", "Lihat jauh ke luar jendela 20 detik", "Putar bahu & leher pelan", "Jalan sebentar", "Cuci muka biar seger"];

/**
 * "Stretching ala kamu": free break, with a friendly nudge away from doomscrolling.
 * Evidence: Kang & Kurtzberg (2019), Journal of Behavioral Addictions.
 */
export function SelfBreakCard() {
  const [open, setOpen] = useState(true);
  const [why, setWhy] = useState(false);
  const close = () => useCibu.getState().setBreakActivity(null);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="glass pointer-events-auto rounded-full px-4 py-2 text-[13px] font-extrabold text-ink">
        📵 Istirahat tanpa HP · lihat tips
      </button>
    );
  return (
    <div className="glass-strong animate-toast-in pointer-events-auto w-full max-w-[420px] rounded-[26px] p-4">
      <div className="text-[16px] font-black text-ink">Oke! Istirahat ala kamu 🙆</div>
      <p className="mt-1 text-[13px] font-bold leading-snug text-ink-soft">
        Boleh gerak bebas, tapi <span className="text-ink">jangan doomscrolling ya</span>. Scroll medsos bikin otak terus kebanjiran info baru, jadi istirahatnya nggak kerasa dan
        balik belajar malah makin capek.
      </p>
      <button onClick={() => setWhy((w) => !w)} className="mt-1 text-[12px] font-extrabold text-cibu-deep underline-offset-2 hover:underline">
        {why ? "Tutup penjelasan" : "Kok bisa?"}
      </button>
      {why && (
        <p className="mt-1 rounded-2xl bg-white/70 p-3 text-[12px] font-bold leading-snug text-ink-soft">
          Di satu studi (Rutgers, 2019), orang yang istirahat sambil main HP jadi paling capek secara mental. Setelah istirahat, mereka butuh waktu 19% lebih lama dan
          menyelesaikan 22% lebih sedikit soal dibanding yang istirahat tanpa HP.
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {IDEAS.map((i) => (
          <span key={i} className="rounded-full bg-leaf/30 px-2.5 py-1 text-[12px] font-extrabold text-[#4d7a22]">
            {i}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setOpen(false)} className="h-10 flex-1 rounded-full bg-cibu text-[14px] font-black text-white">
          Siap, tanpa HP!
        </button>
        <button onClick={close} className="h-10 rounded-full px-3 text-[12px] font-extrabold text-ink-soft hover:text-ink">
          Tutup
        </button>
      </div>
    </div>
  );
}
