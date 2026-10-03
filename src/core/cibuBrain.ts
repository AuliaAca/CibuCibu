/**
 * Cibu's brain: maps (session mode + care + transient events) to what Cibu
 * shows. Every sprite key points to the official reference sheet
 * (public/assets/cibu/manifest.json). Pure & deterministic apart from `pick`.
 *
 * Priority: transient reaction > session mode > care need > mood idle.
 *
 * Expression rule (product decision): Cibu is smiley, cute and warm by default.
 * The sheet's angry/annoyed faces are used ONLY when Cibu is being disturbed
 * (poked during focus, menus opened during focus). See EXPRESSION SETS below.
 */
import type { Care } from "./care";
import { topNeed } from "./care";

export type Mode = "idle" | "focus" | "paused" | "complete" | "break" | "breakOver";

export type Fx = "confetti" | "sparkle" | "hearts" | "bubbles" | "zzz" | "dust" | "notes" | "puff" | null;

export interface Motion {
  /** breathing amplitude (fraction of height) */
  breathAmp: number;
  /** breaths per second */
  breathHz: number;
  /** glance around / small tilts */
  look: boolean;
  /** chance to hop when glancing (0..1) */
  hop: number;
  /** may wander a few steps using the walk pose */
  walk: boolean;
  /** head droop (sleepy) in degrees */
  droop: number;
  /** gentle study nod, like reading along */
  nod?: boolean;
  /** typing bursts at the laptop */
  typing?: boolean;
  /** small writing wiggle */
  write?: boolean;
}

export interface Presentation {
  id: string;
  pool: string[];
  rotateMs: number;
  motion: Motion;
  fx?: Fx;
  fxEveryMs?: number;
  /** a prop sprite shown in a thought bubble (e.g. hungry → snack) */
  thought?: string;
  /** line said once when entering this presentation */
  enterLine?: string;
}

export interface Beat {
  sprite: string;
  ms: number;
  /** keep `ms` exactly (guided breathing); otherwise beats stretch to comfortable reading time */
  exact?: boolean;
  /** Cibu visibly breathes: inflate ("in") or deflate ("out") over the beat */
  breathe?: "in" | "hold" | "out";
  line?: string;
  fx?: Fx;
  /** fires a named cue when the beat starts (e.g. "desk" → study corner appears) */
  cue?: string;
  /** true = small hop, number = hop height (design units) */
  hop?: boolean | number;
}

export type ReactionKind =
  | "hello"
  | "focusStart"
  | "pause"
  | "resume"
  | "ended"
  | "skipped"
  | "complete"
  | "breakStart"
  | "breakSkip"
  | "eat"
  | "drink"
  | "full"
  | "bath"
  | "nap"
  | "poke"
  | "pokeFocus"
  | "distract"
  | "levelUp"
  | "unlock"
  | "outfit"
  | "empty"
  | "clock"
  | "sunrise"
  | "sunset"
  | "breakSelf"
  | "coach"
  | "colorPraise"
  | "colorHarmony";

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const COLOR_PRAISE = ["Wah, warnanya cantik!", "Gemes banget hasilnya >.<", "Kamu berbakat mewarnai!", "Aku suka kombinasi ini ^^"];

/** Comfortable reading time for a bubble: ~15 characters per second + a pause to notice it. */
export const readMs = (line?: string) => (line ? 1700 + line.length * 65 : 0);
/** How long a beat really lasts on screen. */
export const beatMs = (b: Beat) => (b.exact ? b.ms : Math.max(Math.round(b.ms * 1.35), readMs(b.line)));

// ------------------------------------------------------------------ EXPRESSION SETS
/** Open, smiling faces — the default personality. */
export const SMILE = [
  "complete/youdidit",
  "complete/proudofyou",
  "almost/semangatdikit",
  "almost/almostthere",
  "pose/dance",
  "pose/jump",
];
/** Soft, cute, non-smiling but never grumpy (curious, sleepy, touched…). */
export const CUTE = ["complete/youdidit", "pose/walk", "expression/crosseyed", "expression/touched", "expression/shocked", "expression/omg"];
/** Calm, cosy focus faces (no frowning brows). */
/** Happy study faces — studying is fun with Cibu, never stressful. Study props (laptop, books) appear beside him. */
export const FOCUS_FACES = ["complete/bestie", "complete/proudofyou", "complete/youdidit", "almost/semangatdikit", "complete/yeay"];
/** Angry / annoyed — reserved for being disturbed. */
export const DISTURBED = ["focusing/donotdisturb", "focus_start/nodistract", "focus_start/heh", "focus_start/fokuslah"];

const CALM: Motion = { breathAmp: 0.018, breathHz: 0.28, look: true, hop: 0.08, walk: false, droop: 0 };
const LIVELY: Motion = { breathAmp: 0.024, breathHz: 0.42, look: true, hop: 0.3, walk: true, droop: 0 };
const FOCUS: Motion = { breathAmp: 0.014, breathHz: 0.24, look: false, hop: 0, walk: false, droop: 0, nod: true };
const EAGER: Motion = { breathAmp: 0.02, breathHz: 0.5, look: false, hop: 0.1, walk: false, droop: 0 };
const SLEEPY: Motion = { breathAmp: 0.028, breathHz: 0.16, look: false, hop: 0, walk: false, droop: 3 };
const MEDITATE: Motion = { breathAmp: 0.045, breathHz: 0.12, look: false, hop: 0, walk: false, droop: 0 };
const PARTY: Motion = { breathAmp: 0.03, breathHz: 0.8, look: false, hop: 0.9, walk: false, droop: 0 };

export type StudyTask = "typing" | "writing" | "reading";

export interface BrainContext {
  mode: Mode;
  /** what Cibu is doing at his study corner while you focus */
  studyTask?: StudyTask;
  progress: number;
  care: Care;
  outfit: string | null;
  pausedForMs: number;
  hour: number;
}

export function resolveBase(ctx: BrainContext): Presentation {
  const { mode, progress, care, outfit } = ctx;
  // `outfit` is an official combo sprite (Cibu sits in it); layered outfits keep the normal faces
  const dressed = outfit ? [outfit] : null;
  // energy scales breathing speed everywhere (low energy → slower)
  const tempo = 0.7 + (care.energy / 100) * 0.5;
  const withTempo = (m: Motion): Motion => ({ ...m, breathHz: m.breathHz * tempo });

  switch (mode) {
    case "focus":
      if (progress >= 0.8)
        return {
          id: "almost",
          pool: ["almost/semangatdikit", "almost/almostthere", "complete/youdidit"],
          rotateMs: 40_000,
          motion: { ...EAGER, typing: ctx.studyTask === "typing", write: ctx.studyTask === "writing" },
          fx: "sparkle",
          fxEveryMs: 9000,
        };
      return studyPresentation(ctx.studyTask ?? "typing", withTempo(FOCUS));
    case "paused":
      return ctx.pausedForMs > 120_000
        ? { id: "pausedLong", pool: ["expression/sleepy", "pose/sit"], rotateMs: 30_000, motion: SLEEPY, fx: "zzz", fxEveryMs: 5000 }
        : { id: "paused", pool: ["expression/sleepy", "complete/youdidit"], rotateMs: 30_000, motion: MEDITATE };
    case "complete":
      return {
        id: "complete",
        pool: ["complete/yeay", "complete/proudofyou", "complete/gokil", "complete/bestie", "complete/youdidit"],
        rotateMs: 2600,
        motion: PARTY,
        fx: "sparkle",
        fxEveryMs: 2200,
      };
    case "break":
      if (care.energy < 50)
        return { id: "breakNap", pool: ["pose/sleep"], rotateMs: 60_000, motion: SLEEPY, fx: "zzz", fxEveryMs: 3500 };
      return {
        id: "break",
        pool: dressed ? [...dressed, ...dressed, "pose/dance"] : ["pose/dance", "complete/youdidit", "pose/jump", "almost/semangatdikit"],
        rotateMs: 12_000,
        motion: withTempo(CALM),
        fx: "notes",
        fxEveryMs: 7000,
      };
    case "breakOver":
      return { id: "breakOver", pool: ["focus_start/timer"], rotateMs: 60_000, motion: EAGER, enterLine: "Udah waktunya, yuk lanjut~" };
  }

  // idle: care needs first (still cute, never grumpy), then mood
  const need = topNeed(care);
  if (need === "hungry")
    return { id: "hungry", pool: ["expression/pout", "expression/sad"], rotateMs: 9000, motion: withTempo(CALM), thought: "prop/snack" };
  if (need === "sleepy")
    return { id: "sleepy", pool: ["expression/sleepy", "pose/sit"], rotateMs: 12_000, motion: SLEEPY, fx: "zzz", fxEveryMs: 4500 };
  if (need === "dirty")
    return { id: "dirty", pool: ["expression/crosseyed", "expression/pout"], rotateMs: 10_000, motion: CALM, fx: "dust", fxEveryMs: 1400 };
  if (dressed) return { id: "dressed", pool: dressed, rotateMs: 60_000, motion: withTempo(care.mood >= 70 ? LIVELY : CALM) };
  if (care.mood >= 60) return { id: "happy", pool: SMILE, rotateMs: 8000, motion: withTempo(LIVELY) };
  return { id: "neutral", pool: [...SMILE.slice(0, 3), ...CUTE.slice(0, 3)], rotateMs: 9000, motion: withTempo(CALM) };
}

/** Happy faces per study task — Cibu studies *with* you, never stressed. */
function studyPresentation(task: StudyTask, base: Motion): Presentation {
  if (task === "typing")
    return { id: "study-typing", pool: ["complete/youdidit", "complete/proudofyou", "complete/youdidit"], rotateMs: 25_000, motion: { ...base, nod: false, typing: true } };
  if (task === "writing") return { id: "study-writing", pool: ["complete/bestie"], rotateMs: 60_000, motion: { ...base, nod: false, write: true } };
  return { id: "study-reading", pool: ["complete/youdidit", "complete/proudofyou"], rotateMs: 20_000, motion: { ...base, nod: true } };
}

/** A tiny line when Cibu switches study task (shown only sometimes, to stay calm). */
export function studyLine(task: StudyTask): Beat[] {
  const lines: Record<StudyTask, string[]> = {
    typing: ["Ketik-ketik dulu~ tak tik tuk!", "Aku ngerjain tugas juga nih ^^", "Lanjut ngetik, semangat kita!"],
    writing: ["Nulis catatan dulu, biar gampang diingat ^^", "Catat poin pentingnya yuk~", "Sst, aku lagi nulis~"],
    reading: ["Baca-baca dulu biar makin paham~", "Ooh, bagian ini seru!", "Pelan-pelan bacanya, biar nempel ^^"],
  };
  const face = task === "writing" ? "complete/bestie" : task === "typing" ? "complete/youdidit" : "complete/youdidit";
  return [{ sprite: face, ms: 2400, line: pick(lines[task]) }];
}

/** Cibu turns his notes around to show you. */
export function showNotesLine(): Beat[] {
  return [
    {
      sprite: "complete/youdidit",
      ms: 2600,
      line: pick(["Nih, catatanku! Rapi kan? ^^", "Ta-da! Poin pentingnya udah aku catat~", "Lihat deh, aku nulis ini barusan hehe"]),
      hop: true,
      fx: "sparkle",
    },
  ];
}

export interface ReactionContext {
  hour: number;
  remainingMin?: number;
  phase?: "intro" | "in" | "hold" | "out" | "rest" | "done";
  ms?: number;
  cycle?: number;
  total?: number;
  /** a line chosen by the UI (so an in-panel echo matches what Cibu says) */
  line?: string;
  food?: { label: string; kind: "sayur" | "buah" };
}

export function reaction(kind: ReactionKind, ctx: ReactionContext): Beat[] {
  switch (kind) {
    case "hello": {
      const greet = ctx.hour < 4 ? "Masih begadang? Aku temenin ya" : ctx.hour < 11 ? "Pagi! Siap fokus?" : ctx.hour < 15 ? "Siang! Fokus bareng yuk" : ctx.hour < 19 ? "Sore! Satu sesi dulu?" : "Malem! Aku temenin ya";
      return [{ sprite: "complete/youdidit", ms: 2800, line: greet, hop: true }];
    }
    case "focusStart":
      // 1) super happy jump + confetti → 2) warm pep talk with a supportive face
      // → 3) cool & ready with glasses → 4) the study corner appears ("desk" cue)
      return [
        { sprite: "pose/jump", ms: 1400, line: "Yeay! Kita mulai belajar!", hop: 72, fx: "confetti" },
        {
          sprite: "almost/semangatdikit",
          ms: 2600,
          line: pick(["Pelan-pelan, pasti bisa!", "Pelan-pelan tapi pasti, kita pasti bisa!", "Aku yakin kamu bisa fokus sampai selesai~"]),
          fx: "hearts",
          hop: 18,
        },
        { sprite: "complete/bestie", ms: 2200, line: "Mode belajar: ON!", fx: "sparkle" },
        { sprite: "complete/bestie", ms: 900, exact: true, cue: "desk" },
      ];
    case "pause":
      // Cibu takes the deep breath himself — the user can breathe along
      // first a friendly heads-up, so the breathing cue doesn't come out of nowhere
      return [
        { sprite: "complete/youdidit", ms: 2000, line: pick(["Oke, kita jeda sebentar ya~", "Siap, istirahat bentar dulu ya~", "Jeda dulu? Boleh banget~"]), hop: 14 },
        { sprite: "complete/youdidit", ms: 2400, line: pick(["Selagi jeda, yuk rileksin badan. Ikutin aku ya!", "Biar pikiran seger lagi, kita napas pelan-pelan bareng yuk", "Lemesin bahu dulu… terus ikutin napasku ya"]) },
        { sprite: "expression/sleepy", ms: 2300, line: "Tarik napas bareng aku…", breathe: "in" },
        { sprite: "expression/sleepy", ms: 2600, line: "…hembuskan pelan, fuuu~", breathe: "out", fx: "puff" },
        { sprite: "complete/youdidit", ms: 2200, line: "Nah, lebih rileks kan?", hop: true },
      ];
    case "resume":
      return [{ sprite: "almost/almostthere", ms: 1800, line: "Lanjut yuk!", hop: true }];
    case "ended":
      // stopped before time: Cibu is sad, but never guilt-trips
      return [
        {
          sprite: "expression/crying",
          ms: 1800,
          line: ctx.remainingMin ? `Yah… udahan? Padahal tinggal ${ctx.remainingMin} menit lagi` : "Yah… udahan?",
        },
        { sprite: "expression/sad", ms: 2200, line: "Aku sedih dikit… tapi kamu udah berusaha kok" },
        { sprite: "expression/touched", ms: 2200, line: "Istirahat dulu ya, nanti kita coba lagi bareng~" },
      ];
    case "skipped":
      return [
        { sprite: "expression/pout", ms: 1500, line: "Gapapa, next time kita gas lagi" },
        { sprite: "almost/semangatdikit", ms: 1700, hop: true },
      ];
    case "complete":
      return [
        { sprite: "complete/yeay", ms: 2200, line: "YAYYY! Kamu udah nyelesaiin sesi dengan baik!", fx: "confetti", hop: 70 },
        { sprite: "complete/proudofyou", ms: 2200, line: "Aku bangga banget sama kamu ><", hop: true },
      ];
    case "breakStart":
      return [{ sprite: "pose/dance", ms: 2400, line: pick(["Istirahat dulu~", "Minum dulu gih", "Stretching bentar"]) }];
    case "breakSkip":
      return [{ sprite: "complete/youdidit", ms: 1800, line: "Semangat amat!", hop: true }];
    case "eat": {
      const f = ctx.food ?? { label: "ini", kind: "sayur" as const };
      return [
        { sprite: "complete/youdidit", ms: 1700, line: "Nyam! Makasih yaa ><", fx: "hearts", hop: true },
        { sprite: "complete/proudofyou", ms: 2800, line: `Aku suka banget ${f.kind} ini, badanku jadi sehat!`, fx: "sparkle" },
      ];
    }
    case "drink":
      return [{ sprite: "almost/almostthere", ms: 2000, line: "Seger! Makasih yaa", fx: "hearts", hop: true }];
    case "full":
      return [{ sprite: "complete/youdidit", ms: 2000, line: "Aku masih kenyang, nanti yaa~" }];
    case "bath":
      return [
        { sprite: "expression/crosseyed", ms: 1400, fx: "bubbles", line: "Byur~" },
        { sprite: "complete/youdidit", ms: 1800, fx: "sparkle", line: "Wangi & kinclong!" },
      ];
    case "nap":
      return [{ sprite: "pose/sleep", ms: 7000, fx: "zzz", line: "Zzz…" }, { sprite: "pose/jump", ms: 1600, line: "Seger lagi!", hop: true }];
    case "poke":
      return [{ sprite: pick([...SMILE, "expression/crosseyed", "expression/shocked", "complete/youdidit"]), ms: 1300, hop: true, fx: Math.random() < 0.5 ? "hearts" : null }];
    case "pokeFocus":
      // the only place Cibu looks annoyed: being disturbed while focusing
      return [{ sprite: pick(["focusing/donotdisturb", "focus_start/heh"]), ms: 1900, line: pick(["Sstt, jangan ganggu!", "Heh, fokus dong"]) }];
    case "distract":
      return [{ sprite: "focus_start/nodistract", ms: 1900, line: "Jangan distrack!" }];
    case "levelUp":
      return [{ sprite: "complete/yeay", ms: 2200, line: "Level up! Yeay!", fx: "sparkle", hop: true }];
    case "unlock":
      return [{ sprite: "expression/omg", ms: 2000, line: "Wah! Ada outfit baru!", fx: "sparkle", hop: true }];
    case "outfit":
      return [{ sprite: "almost/semangatdikit", ms: 1600, line: pick(["Cakep ga?", "Lucu kan?"]), fx: "sparkle" }];
    case "empty":
      return [{ sprite: "expression/pout", ms: 2000, line: "Minumannya abis… fokus dulu yuk" }];
    case "breakSelf":
      return [
        { sprite: "complete/youdidit", ms: 2000, line: "Oke, istirahat ala kamu ya!", hop: true },
        { sprite: "complete/youdidit", ms: 2600, line: "Tapi janji… jangan doomscrolling ya~" },
      ];
    case "coach": {
      // box breathing 4-4-4-4; Cibu sits on his stool and does every phase with you
      const ms = ctx.ms ?? 4000;
      const c = ctx.cycle && ctx.total ? ` (${ctx.cycle}/${ctx.total})` : "";
      const SIT = "pose/sit";
      if (ctx.phase === "intro") return [{ sprite: SIT, ms, exact: true, line: "Punggung lurus, bahu rileks. Ikutin aku ya~" }];
      if (ctx.phase === "in") return [{ sprite: SIT, ms, exact: true, breathe: "in", line: `Tarik napas pelan-pelan…${c}` }];
      if (ctx.phase === "hold") return [{ sprite: SIT, ms, exact: true, breathe: "hold", line: "Tahan… rasain perutku penuh~" }];
      if (ctx.phase === "out") return [{ sprite: SIT, ms, exact: true, breathe: "out", fx: "puff", line: "Hembuskan pelan… fuuu~" }];
      if (ctx.phase === "rest") return [{ sprite: SIT, ms, exact: true, line: "Tahan sebentar… kosong dulu~" }];
      return [
        { sprite: "complete/youdidit", ms: 2400, line: "Selesai! Badan lebih enteng kan? ^^", hop: true, fx: "hearts" },
        { sprite: "complete/proudofyou", ms: 2200, line: "Makasih udah napas bareng aku~" },
      ];
    }
    case "colorPraise":
      return [
        {
          sprite: pick(["complete/youdidit", "complete/youdidit", "complete/proudofyou", "almost/semangatdikit"]),
          ms: 2200,
          line: ctx.line ?? pick(COLOR_PRAISE),
          hop: true,
          fx: "hearts",
        },
      ];
    case "colorHarmony":
      return [{ sprite: "complete/bestie", ms: 2400, line: ctx.line ?? "Pakai harmoni warna ya? Pinter! Jadi makin serasi~", fx: "sparkle" }];
    case "sunrise":
      return [
        { sprite: "expression/omg", ms: 1600, line: "Eh, mataharinya muncul!", hop: true },
        { sprite: "complete/youdidit", ms: 2600, line: "Selamat pagi~ hari baru, semangat baru!", fx: "sparkle" },
      ];
    case "sunset":
      return [{ sprite: "complete/youdidit", ms: 2800, line: "Udah malam… bintangnya cantik ya", fx: "sparkle" }];
    case "clock":
      return [
        {
          sprite: "expression/thinking",
          ms: 2200,
          line: ctx.remainingMin != null ? `Sisa ${ctx.remainingMin} menit lagi` : `Sekarang jam ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`,
        },
      ];
  }
}

// ------------------------------------------------------------------ MOTIVATION
export type MotivationFreq = "off" | "jarang" | "sedang" | "sering";
export const MOTIVATION_EVERY_MIN: Record<MotivationFreq, number> = { off: Infinity, jarang: 8, sedang: 4, sering: 2 };
/** first encouragement comes soon after you settle in */
export const FIRST_CHEER_MS = 75_000;

const CHEER_FACES: { sprite: string; fx: Fx }[] = [
  { sprite: "almost/semangatdikit", fx: "sparkle" },
  { sprite: "complete/youdidit", fx: "hearts" },
  { sprite: "complete/youdidit", fx: "hearts" },
  { sprite: "complete/proudofyou", fx: "sparkle" },
  { sprite: "almost/almostthere", fx: "hearts" },
  { sprite: "pose/jump", fx: "sparkle" },
];

/** Cibu "thinking out loud" about why we study — friendly, hopeful, future-focused. */
const FUTURE = [
  "Aku semangat belajar, biar masa depanku tertata rapi~",
  "Belajar dikit-dikit, nanti masa depan kita rapi & cerah ^^",
  "Hari ini belajar, besok-besok kita yang senyum lebar!",
  "Aku mau masa depan yang rapi, jadi yuk belajar bareng :3",
  "Setiap menit fokus = satu bata buat masa depan kita!",
  "Future me pasti bilang makasih ke kita hari ini >.<",
];

const CHEERS = [
  "Kamu keren banget hari ini ^^",
  "Pelan-pelan aja, yang penting jalan terus~",
  "Otakmu lagi nyerap ilmu, aku bisa rasain! >.<",
  "Aku bangga banget sama kamu :3",
  "Fokusmu gemesin deh, lanjut yuk!",
  "Langkah kecil tetap progress loh!",
  "Kamu nggak sendirian, aku di sini~",
  "Bahu rileks, napas pelan… kamu hebat!",
  "Aku cheerleader-mu hari ini! Go go go!",
  "Susah dikit gapapa, itu tandanya kamu belajar ^^",
  "Jangan lupa minum air ya, biar seger!",
  "Semangat! Nanti kita istirahat bareng~",
];

/**
 * A short, cute encouragement for the middle of a focus block.
 * Picks lines by progress & time of day; faces are always the gemesin ones.
 */
export function motivation(ctx: { progress: number; hour: number; seed?: number }): Beat[] {
  const { progress, hour } = ctx;
  let line: string;
  if (progress >= 0.72 && progress < 0.8) line = "Tinggal dikit lagi, semangat!! ><";
  else if (progress >= 0.47 && progress < 0.55) line = pick(["Setengah jalan! Kamu luar biasa ^^", "Udah setengah! Aku makin bangga :3"]);
  else if (progress >= 0.22 && progress < 0.3) line = "Udah seperempat jalan, mantap!";
  else if (hour >= 22 || hour < 4) line = pick(["Belajar malam-malam, rajin banget kamu!", "Abis ini tidur cukup ya, janji? :3", ...CHEERS]);
  else if (hour < 10) line = pick(["Pagi-pagi udah fokus, keren!", ...CHEERS]);
  else line = Math.random() < 0.45 ? pick(FUTURE) : pick(CHEERS);
  const face = pick(CHEER_FACES);
  return [{ sprite: face.sprite, ms: 3600, line, fx: face.fx, hop: true }];
}
