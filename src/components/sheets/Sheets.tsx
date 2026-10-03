"use client";
import { useEffect, useState } from "react";
import { useCibu } from "@/store/useCibu";
import { ACHIEVEMENTS, OUTFITS, WORLDS, dayKey, levelInfo } from "@/core/progression";
import { STYLES, outfitById, type Gender, type Outfit } from "@/core/wardrobe";
import { CibuDressed } from "../ui/CibuDressed";
import { Sheet } from "./Sheet";
import { Sprite } from "../ui/Sprite";
import { FlameIcon, LockIcon } from "../ui/icons";
import { CareMeters } from "../hud/TopBar";
import { MusicSheet } from "./MusicSheet";
import { sunTimes, resolvePlace, fmtHour } from "@/lib/sun";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <div className="text-[26px] font-black leading-none text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-[12px] font-bold text-ink-soft">{label}</div>
    </div>
  );
}

function Journal() {
  const p = useCibu((s) => s.progress);
  const now = useCibu((s) => s.now);
  const lv = levelInfo(p.xp);
  const today = dayKey(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * 86_400_000;
    const k = dayKey(t);
    return { k, min: p.daily[k] ?? 0, label: new Date(t).toLocaleDateString("id-ID", { weekday: "narrow" }) };
  });
  const max = Math.max(25, ...days.map((d) => d.min));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Stat value={p.daily[today] ?? 0} label="menit hari ini" />
        <Stat value={p.dailySessions[today] ?? 0} label="sesi hari ini" />
        <div className="rounded-2xl bg-white/70 p-3">
          <div className="flex items-center gap-1 text-[26px] font-black leading-none text-ink">
            <FlameIcon width={20} height={20} className="text-cibu" />
            {p.streak}
          </div>
          <div className="mt-1 text-[12px] font-bold text-ink-soft">hari beruntun</div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="mb-2 text-[13px] font-extrabold text-ink-soft">Kondisi Cibu</div>
        <CareMeters />
      </div>

      <div>
        <div className="mb-2 flex justify-between text-[13px] font-extrabold text-ink-soft">
          <span>7 hari terakhir</span>
          <span>
            Total {Math.floor(p.totalFocusMin / 60)}j {p.totalFocusMin % 60}m · Lv {lv.level}
          </span>
        </div>
        <div className="flex h-28 items-end gap-2 rounded-2xl bg-white/70 p-3">
          {days.map((d) => (
            <div key={d.k} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  title={`${d.min} menit`}
                  className={`w-full rounded-md transition-all duration-700 ${d.k === today ? "bg-cibu" : "bg-sun/80"}`}
                  style={{ height: `${Math.max(4, (d.min / max) * 100)}%`, opacity: d.min ? 1 : 0.25 }}
                />
              </div>
              <span className={`text-[11px] font-extrabold ${d.k === today ? "text-cibu" : "text-ink-soft"}`}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-extrabold text-ink-soft">Achievements</div>
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const got = p.achievements.includes(a.id);
            return (
              <div key={a.id} className={`rounded-2xl p-3 ${got ? "bg-white/80" : "bg-white/35"}`}>
                <div className={`text-[14px] font-black ${got ? "text-ink" : "text-ink/45"}`}>
                  {got ? "🏅 " : ""}
                  {a.label}
                </div>
                <div className="text-[12px] font-bold text-ink-soft">{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-extrabold text-ink-soft">Dunia Cibu</div>
        <div className="space-y-2">
          {WORLDS.map((w) => {
            const open = w.ready && lv.level >= w.level;
            return (
              <div key={w.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${open ? "bg-leaf/40" : "bg-white/40"}`}>
                <span className={`text-[15px] font-black ${open ? "text-ink" : "text-ink/50"}`}>{w.label}</span>
                <span className="flex items-center gap-1 text-[12px] font-extrabold text-ink-soft">
                  {open ? "Kamu di sini" : (
                    <>
                      <LockIcon width={14} height={14} /> Lv {w.level}
                      {!w.ready && " · segera"}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Wardrobe() {
  const inv = useCibu((s) => s.inventory);
  const xp = useCibu((s) => s.progress.xp);
  const equip = useCibu((s) => s.equip);
  const lv = levelInfo(xp).level;
  const current = outfitById(inv.equipped);
  const [tab, setTab] = useState<Gender>(current?.gender ?? "cewek");
  const owned = (o: Outfit) => inv.outfits.includes(o.id) || lv >= o.level;
  const count = (g: Gender) => OUTFITS.filter((o) => o.gender === g && owned(o)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-3xl bg-white/70 p-3">
        <CibuDressed outfit={current} className="w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">Dipakai sekarang</div>
          <div className="truncate text-[17px] font-black text-ink">{current?.label ?? "Tanpa outfit"}</div>
          <div className="text-[12px] font-bold text-ink-soft">1 outfit cewek + 1 outfit cowok terbuka tiap naik level</div>
        </div>
        {current && (
          <button onClick={() => equip(null)} className="shrink-0 rounded-full bg-ink/5 px-3 py-1.5 text-[12px] font-extrabold text-ink hover:bg-ink/10">
            Lepas
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-ink/5 p-1" role="tablist" aria-label="Kategori baju">
        {(["cewek", "cowok"] as const).map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={tab === g}
            onClick={() => setTab(g)}
            className={`rounded-full py-2 text-[14px] font-black capitalize transition ${tab === g ? (g === "cewek" ? "bg-blush text-white shadow-sm" : "bg-teal text-white shadow-sm") : "text-ink/60"}`}
          >
            {g === "cewek" ? "Baju Cewek" : "Baju Cowok"} <span className="text-[11px] opacity-80">{count(g)}/{OUTFITS.filter((o) => o.gender === g).length}</span>
          </button>
        ))}
      </div>

      {STYLES[tab].map((st) => {
        const items = OUTFITS.filter((o) => o.gender === tab && o.style === st.id);
        if (!items.length) return null;
        return (
          <section key={st.id}>
            <div className="mb-2 flex items-baseline gap-2">
              <h3 className="text-[16px] font-black text-ink">{st.label}</h3>
              <span className="text-[12px] font-bold text-ink-soft">{st.desc}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items.map((o) => {
                const has = owned(o);
                const on = inv.equipped === o.id;
                return (
                  <button
                    key={o.id}
                    disabled={!has}
                    onClick={() => equip(o.id)}
                    aria-pressed={on}
                    className={`relative flex flex-col items-center rounded-2xl px-1.5 pb-2 pt-1.5 transition ${
                      on ? "bg-white ring-2 ring-cibu" : has ? "bg-white/60 hover:bg-white/85" : "bg-white/30"
                    }`}
                  >
                    <CibuDressed outfit={o} dim={!has} className="h-24" />
                    <span className={`mt-1 text-center text-[12px] font-extrabold leading-tight ${has ? "text-ink" : "text-ink/45"}`}>{o.label}</span>
                    {!has && (
                      <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-black text-ink/60">
                        <LockIcon width={11} height={11} /> Lv {o.level}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Range({ label, value, min, max, step = 5, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[14px] font-extrabold text-ink">
        <span>{label}</span>
        <span className="tabular-nums">{value} menit</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-cibu)]" />
    </label>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white/60 px-4 py-3 text-left">
      <span>
        <span className="block text-[14px] font-extrabold text-ink">{label}</span>
        {desc && <span className="block text-[12px] font-bold text-ink-soft">{desc}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-cibu" : "bg-ink/20"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

type Perm = "granted" | "denied" | "default" | "unsupported";
const readPerm = (): Perm => (typeof Notification === "undefined" ? "unsupported" : (Notification.permission as Perm));

/**
 * The switch always responds: it stores the preference immediately, then asks
 * the browser. If the browser blocks system notifications (common in embedded
 * previews), Cibu falls back to a blinking tab title + chime.
 */
function NotifyToggle() {
  const on = useCibu((s) => s.settings.notify);
  const update = useCibu((s) => s.updateSettings);
  const [perm, setPerm] = useState<Perm>("default");
  useEffect(() => setPerm(readPerm()), []);
  const status =
    !on
      ? "Kabari saat sesi selesai walau kamu di tab lain"
      : perm === "granted"
        ? "Aktif · notifikasi sistem + judul tab berkedip"
        : perm === "default"
          ? "Menunggu izin browser… (judul tab tetap berkedip)"
          : "Browser memblokir notifikasi sistem · Cibu pakai judul tab berkedip + suara";
  return (
    <Toggle
      label="Notifikasi"
      desc={status}
      checked={on}
      onChange={(v) => {
        update({ notify: v });
        if (!v || typeof Notification === "undefined" || Notification.permission !== "default") {
          setPerm(readPerm());
          return;
        }
        try {
          const req = Notification.requestPermission();
          const done = (p: NotificationPermission) => setPerm(p as Perm);
          if (req && typeof req.then === "function") req.then(done, () => setPerm("denied"));
          else Notification.requestPermission(done);
        } catch {
          setPerm("denied");
        }
      }}
    />
  );
}

/** Greeny Garden's sky follows the real sunrise/sunset where the user is. */
function SkyPlace() {
  const place = useCibu((s) => s.settings.place);
  const update = useCibu((s) => s.updateSettings);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const p = resolvePlace(place);
  const t = sunTimes(new Date(), p.lat, p.lon);
  return (
    <div className="rounded-2xl bg-white/60 px-4 py-3">
      <div className="text-[14px] font-extrabold text-ink">Langit ikut lokasimu</div>
      <div className="text-[12px] font-bold text-ink-soft">
        {p.source === "gps" ? "Lokasi perangkat" : `${p.label} · perkiraan dari zona waktu`}
      </div>
      <div className="mt-2 flex gap-2 text-[13px] font-black text-ink tabular-nums">
        <span className="rounded-full bg-sun/30 px-3 py-1">Terbit {fmtHour(t.riseH)}</span>
        <span className="rounded-full bg-lilac/50 px-3 py-1">Terbenam {fmtHour(t.setH)}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {p.source === "gps" ? (
          <button onClick={() => update({ place: null })} className="text-[12px] font-extrabold text-ink-soft underline-offset-2 hover:underline">
            Pakai zona waktu saja
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => {
              if (!navigator.geolocation) return setErr("Browser ini tidak mendukung lokasi.");
              setBusy(true);
              setErr("");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setBusy(false);
                  update({
                    place: { lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2), label: "Lokasimu", source: "gps" },
                  });
                },
                () => {
                  setBusy(false);
                  setErr("Izin lokasi ditolak. Langit tetap pakai perkiraan zona waktu.");
                },
                { timeout: 8000, maximumAge: 3_600_000 },
              );
            }}
            className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-extrabold text-cream disabled:opacity-50"
          >
            {busy ? "Mencari…" : "Pakai lokasi tepat"}
          </button>
        )}
        <span className="text-[11px] font-bold text-ink-soft">Disimpan di perangkat ini saja</span>
      </div>
      {err && <p className="mt-1.5 text-[12px] font-bold text-[#c0492b]">{err}</p>}
    </div>
  );
}

function Settings() {
  const st = useCibu((s) => s.settings);
  const update = useCibu((s) => s.updateSettings);
  const reset = useCibu((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl bg-white/60 p-4">
        <Range label="Fokus" value={st.focusMin} min={5} max={90} onChange={(v) => update({ focusMin: v })} />
        <Range label="Istirahat" value={st.breakMin} min={1} max={20} step={1} onChange={(v) => update({ breakMin: v })} />
        <Range label="Istirahat panjang (tiap 4 sesi)" value={st.longBreakMin} min={5} max={40} onChange={(v) => update({ longBreakMin: v })} />
      </div>
      <div className="space-y-2">
        <Toggle label="Suara" desc="Chime lembut saat mulai & selesai" checked={st.sound} onChange={(v) => update({ sound: v })} />
        <NotifyToggle />
        <div className="rounded-2xl bg-white/60 px-4 py-3">
          <div className="text-[14px] font-extrabold text-ink">Semangat dari Cibu</div>
          <div className="mb-2 text-[12px] font-bold text-ink-soft">Kata-kata manis di sela fokus, tanpa suara</div>
          <div className="grid grid-cols-4 gap-1 rounded-full bg-ink/5 p-1">
            {(["off", "jarang", "sedang", "sering"] as const).map((m) => (
              <button
                key={m}
                onClick={() => update({ motivation: m })}
                className={`rounded-full py-1.5 text-[12px] font-extrabold capitalize ${st.motivation === m ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
              >
                {m === "off" ? "Mati" : m}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => useCibu.getState().openSheet("music")}
          className="flex w-full items-center justify-between rounded-2xl bg-white/60 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-[14px] font-extrabold text-ink">Musik & suara mulai</span>
            <span className="block text-[12px] font-bold text-ink-soft">Suara latar, Brain.fm, Spotify</span>
          </span>
          <span className="text-[18px] font-black text-ink-soft">›</span>
        </button>
        <SkyPlace />
        <div className="rounded-2xl bg-white/60 px-4 py-3">
          <div className="mb-2 text-[14px] font-extrabold text-ink">Gerakan</div>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-ink/5 p-1">
            {(["system", "full", "reduced"] as const).map((m) => (
              <button
                key={m}
                onClick={() => update({ motion: m })}
                className={`rounded-full py-1.5 text-[12px] font-extrabold ${st.motion === m ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
              >
                {m === "system" ? "Ikuti sistem" : m === "full" ? "Penuh" : "Dikurangi"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          if (confirmReset) {
            reset();
            setConfirmReset(false);
          } else setConfirmReset(true);
        }}
        onBlur={() => setConfirmReset(false)}
        className={`w-full rounded-full py-3 text-[13px] font-extrabold transition ${confirmReset ? "bg-[#c0492b] text-white" : "text-[#c0492b] hover:bg-[#c0492b]/5"}`}
      >
        {confirmReset ? "Yakin? Ketuk lagi untuk menghapus semua progress" : "Reset data lokal"}
      </button>
      <p className="text-center text-[11px] font-bold text-ink-soft">Tersimpan di perangkat ini · Tekan Spasi untuk mulai/jeda</p>
    </div>
  );
}

export function Sheets() {
  const sheet = useCibu((s) => s.sheet);
  const close = () => useCibu.getState().openSheet(null);
  return (
    <>
      <Sheet open={sheet === "journal"} title="Jurnal" onClose={close}>
        <Journal />
      </Sheet>
      <Sheet open={sheet === "wardrobe"} title="Lemari Cibu" onClose={close}>
        <Wardrobe />
      </Sheet>
      <Sheet open={sheet === "music"} title="Musik Fokus" onClose={close}>
        <MusicSheet />
      </Sheet>
      <Sheet open={sheet === "settings"} title="Pengaturan" onClose={close}>
        <Settings />
      </Sheet>
    </>
  );
}
