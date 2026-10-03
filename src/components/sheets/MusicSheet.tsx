"use client";
import { useEffect, useState } from "react";
import { useCibu, selectMode, type Soundscape } from "@/store/useCibu";
import { soundscape as engine } from "@/lib/soundscape";
import { startRitual, type StartSoundId } from "@/lib/sound";
import { ExternalIcon, PlayIcon, PauseIcon } from "../ui/icons";

const SCAPES: { id: Soundscape; label: string; desc: string }[] = [
  { id: "off", label: "Hening", desc: "Tanpa suara latar" },
  { id: "rain", label: "Hujan", desc: "Rintik di dedaunan" },
  { id: "brown", label: "Brown noise", desc: "Dalam & rata" },
  { id: "forest", label: "Hutan", desc: "Angin & burung" },
];

const START_SOUNDS: { id: StartSoundId; label: string }[] = [
  { id: "kalimba", label: "Kalimba Cibu" },
  { id: "bowl", label: "Singing bowl" },
  { id: "marimba", label: "Tok-tok marimba" },
  { id: "off", label: "Tanpa suara" },
];

const SPOTIFY_PRESETS = [
  { label: "Brain.fm · Music for Focus", url: "https://open.spotify.com/album/0FcNAY1j3J7LLYL4j7YF5j" },
  { label: "Deep Focus", url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ" },
  { label: "Peaceful Piano", url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO" },
  { label: "lofi beats", url: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn" },
];

/** Accepts open.spotify.com links (any locale prefix) or spotify: URIs. */
export function spotifyEmbed(input: string): { embed: string; open: string } | null {
  const s = input.trim();
  const uri = s.match(/^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]{10,})$/);
  const url = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]{10,})/);
  const m = uri ?? url;
  if (!m) return null;
  return { embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=cibu`, open: `https://open.spotify.com/${m[1]}/${m[2]}` };
}

function Section({ title, children, note }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-[15px] font-black text-ink">{title}</h3>
        {note && <p className="text-[12px] font-bold leading-snug text-ink-soft">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3.5 py-2.5 text-[13px] font-extrabold text-ink transition hover:bg-white"
    >
      <span>{children}</span>
      <ExternalIcon width={15} height={15} className="shrink-0 text-ink-soft" />
    </a>
  );
}

export function MusicSheet() {
  const st = useCibu((s) => s.settings);
  const mode = useCibu(selectMode);
  const update = useCibu((s) => s.updateSettings);
  const [previewing, setPreviewing] = useState(false);
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const spotify = st.spotify ? spotifyEmbed(st.spotify) : null;
  const focusing = mode === "focus";

  // stop a preview when the session takes over or the scape changes
  useEffect(() => {
    if (focusing) setPreviewing(false);
  }, [focusing]);
  useEffect(() => {
    if (!previewing || focusing) return;
    if (st.soundscape === "off") {
      engine.stop();
      setPreviewing(false);
      return;
    }
    engine.play(st.soundscape, st.soundscapeVolume, st.soundscapePulse);
  }, [previewing, focusing, st.soundscape, st.soundscapeVolume, st.soundscapePulse]);
  // closing the sheet ends a preview (a running focus session keeps its sound)
  const open = useCibu((s) => s.sheet === "music");
  useEffect(() => {
    if (!open && previewing) {
      setPreviewing(false);
      if (!focusing) engine.stop(0.6);
    }
  }, [open, previewing, focusing]);

  return (
    <div className="space-y-7">
      <Section title="Suara latar Cibu" note="Tanpa lirik, dibuat langsung di perangkatmu. Otomatis diputar saat fokus dan memelan saat istirahat.">
        <div className="grid grid-cols-2 gap-2">
          {SCAPES.map((sc) => (
            <button
              key={sc.id}
              onClick={() => update({ soundscape: sc.id })}
              aria-pressed={st.soundscape === sc.id}
              className={`rounded-2xl p-3 text-left transition ${st.soundscape === sc.id ? "bg-white ring-2 ring-cibu" : "bg-white/60 hover:bg-white/80"}`}
            >
              <div className="text-[14px] font-black text-ink">{sc.label}</div>
              <div className="text-[11px] font-bold text-ink-soft">{sc.desc}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-3 py-2.5">
          <button
            onClick={() => {
              if (previewing) engine.stop(0.6);
              setPreviewing(!previewing);
            }}
            disabled={st.soundscape === "off" || focusing}
            aria-label={previewing ? "Hentikan contoh" : "Dengarkan contoh"}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-cibu text-white disabled:opacity-40"
          >
            {previewing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
          </button>
          <label htmlFor="scape-vol" className="sr-only">
            Volume
          </label>
          <input
            id="scape-vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={st.soundscapeVolume}
            onChange={(e) => {
              update({ soundscapeVolume: Number(e.target.value) });
              engine.setVolume(Number(e.target.value));
            }}
            className="w-full accent-[var(--color-cibu)]"
          />
        </div>
        <label className="flex items-start gap-3 rounded-2xl bg-white/60 px-3.5 py-3">
          <input
            id="scape-pulse"
            type="checkbox"
            checked={st.soundscapePulse}
            onChange={(e) => update({ soundscapePulse: e.target.checked })}
            className="mt-0.5 size-4 accent-[var(--color-cibu)]"
          />
          <span>
            <span className="block text-[13px] font-extrabold text-ink">Denyut fokus (eksperimental)</span>
            <span className="block text-[11px] font-bold leading-snug text-ink-soft">
              Modulasi volume halus ±14 Hz, terinspirasi pendekatan Brain.fm. Ini bukan teknologi Brain.fm dan efeknya belum diuji.
            </span>
          </span>
        </label>
      </Section>

      <Section title="Suara saat mulai fokus" note="Tarik napas, lalu motif pendek khas Cibu.">
        <div className="grid grid-cols-2 gap-2">
          {START_SOUNDS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                update({ startSound: s.id });
                startRitual(s.id);
              }}
              aria-pressed={st.startSound === s.id}
              className={`rounded-2xl px-3 py-2.5 text-left text-[13px] font-extrabold transition ${
                st.startSound === s.id ? "bg-white text-ink ring-2 ring-cibu" : "bg-white/60 text-ink hover:bg-white/80"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Brain.fm × Dr. Justin Sung"
        note="Justin Sung memakai musik Brain.fm di video study-with-me-nya. Brain.fm belum punya API publik, jadi dibuka di tab baru; timer Cibu tetap jalan di sini."
      >
        <div className="space-y-1.5">
          <LinkButton href="https://my.brain.fm">Buka Brain.fm</LinkButton>
          <LinkButton href="https://www.youtube.com/watch?v=74cOUSKXMz0">Study with me 3 jam · Pomodoro 50-10</LinkButton>
          <LinkButton href="https://www.youtube.com/watch?v=sdhh7AYzsTY">Study with me 1,5 jam · Pomodoro 42-6</LinkButton>
        </div>
        <div className="flex gap-2">
          {[
            { f: 50, b: 10 },
            { f: 42, b: 6 },
          ].map((r) => (
            <button
              key={r.f}
              onClick={() => update({ focusMin: r.f, breakMin: r.b })}
              className={`flex-1 rounded-full py-2 text-[12px] font-extrabold transition ${
                st.focusMin === r.f && st.breakMin === r.b ? "bg-ink text-cream" : "bg-white/70 text-ink hover:bg-white"
              }`}
            >
              Pakai ritme {r.f}/{r.b}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Spotify" note="Tanpa login Spotify di browser ini, pemutar hanya memutar cuplikan 30 detik.">
        <div className="flex flex-wrap gap-1.5">
          {SPOTIFY_PRESETS.map((p) => (
            <button
              key={p.url}
              onClick={() => update({ spotify: p.url })}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${
                st.spotify === p.url ? "bg-[#1db954] text-white" : "bg-white/70 text-ink hover:bg-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = spotifyEmbed(link);
            if (!r) return setErr("Tempel link playlist, album, atau lagu dari open.spotify.com");
            setErr("");
            update({ spotify: r.open });
            setLink("");
          }}
        >
          <label htmlFor="spotify-link" className="sr-only">
            Link Spotify
          </label>
          <input
            id="spotify-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Tempel link Spotify…"
            className="min-w-0 flex-1 rounded-full bg-white/80 px-4 py-2 text-[13px] font-bold text-ink outline-none ring-1 ring-ink/10 placeholder:text-ink-soft/70 focus:ring-2 focus:ring-cibu"
          />
          <button className="rounded-full bg-ink px-4 text-[13px] font-extrabold text-cream">Putar</button>
        </form>
        {err && <p className="text-[12px] font-bold text-[#c0492b]">{err}</p>}
        {spotify && (
          <div className="space-y-1.5">
            <iframe
              title="Pemutar Spotify"
              src={spotify.embed}
              width="100%"
              height="152"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="rounded-2xl border-0 bg-ink/5"
            />
            <div className="flex items-center justify-between px-1">
              <a href={spotify.open} target="_blank" rel="noopener noreferrer" className="text-[12px] font-extrabold text-[#1a8f47] underline-offset-2 hover:underline">
                Buka di Spotify
              </a>
              <button onClick={() => update({ spotify: null })} className="text-[12px] font-extrabold text-ink-soft hover:text-ink">
                Tutup pemutar
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
