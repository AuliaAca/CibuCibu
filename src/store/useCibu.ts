"use client";
/**
 * Single source of truth, shared by React UI and the Phaser scene.
 * React reads through selectors; the scene uses `useCibu.subscribe`.
 * Persisted to localStorage (guest mode). Phase 6 syncs the same shape to Supabase.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type Session,
  idleSession,
  startSession,
  pauseSession,
  resumeSession,
  elapsedMs,
  progressOf,
  remainingMs,
  isFinished,
  CYCLE_LENGTH,
} from "@/core/pomodoro";
import { type Care, type FoodId, freshCare, decay, afterFocus, eat, drink, foodById, FULL_AT, bathe, nap, pet, NAP_COOLDOWN_MS } from "@/core/care";
import { type Progress, freshProgress, recordFocus, levelInfo, OUTFITS, newAchievements, xpFor } from "@/core/progression";
import type { Mode, ReactionKind, MotivationFreq } from "@/core/cibuBrain";
import { chime } from "@/lib/sound";
import type { Place } from "@/lib/sun";
import { blinkTitle } from "@/lib/attention";

export type BreakActivity = null | "breathe" | "color" | "self";
export type SheetId = null | "journal" | "wardrobe" | "settings" | "music";

export interface Reaction {
  id: number;
  kind: ReactionKind;
  at: number;
  meta?: {
    remainingMin?: number;
    food?: FoodId;
    /** guided breathing phase & timing */
    phase?: "intro" | "in" | "hold" | "out" | "rest" | "done";
    ms?: number;
    cycle?: number;
    total?: number;
    line?: string;
  };
}

export interface RewardSummary {
  minutes: number;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  pctBefore: number;
  pctAfter: number;
  items: { drink: number };
  unlocked: string[];
  achievements: string[];
}

export interface Toast {
  id: number;
  title: string;
  body?: string;
  sprite?: string;
}

export type StartSound = "kalimba" | "bowl" | "marimba" | "off";
export type Soundscape = "off" | "rain" | "brown" | "forest";

export interface Settings {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  sound: boolean;
  notify: boolean;
  motion: "system" | "reduced" | "full";
  /** signature sound played when a focus session starts */
  startSound: StartSound;
  /** built-in focus soundscape that plays during focus */
  soundscape: Soundscape;
  soundscapeVolume: number;
  soundscapePulse: boolean;
  /** where the user is, for real sunrise/sunset; null = estimate from time zone */
  place: Place | null;
  /** how often Cibu cheers you on during focus */
  motivation: MotivationFreq;
  /** Spotify embed source (playlist/album/track URL), null = none */
  spotify: string | null;
}

export interface Inventory {
  snack: number;
  drink: number;
  outfits: string[];
  equipped: string | null;
}

interface CibuState {
  session: Session;
  care: Care;
  progress: Progress;
  inventory: Inventory;
  settings: Settings;
  lastNapAt: number;

  // transient
  hydrated: boolean;
  now: number;
  reactions: Reaction[];
  sheet: SheetId;
  /** what we're doing during the current break (chosen after a completed session) */
  breakActivity: BreakActivity;
  /** Cibu is sitting on his stool, ready for the breathing guide (set by the scene) */
  seated: boolean;
  setBreakActivity: (a: BreakActivity) => void;
  reward: RewardSummary | null;
  toasts: Toast[];
  /** CSS px occupied by the HUD at the top / bottom / right, measured by React; the scene frames Cibu inside */
  insets: { top: number; bottom: number; right: number };
  setInsets: (i: { top: number; bottom: number; right: number }) => void;

  tick: (now?: number) => void;
  startFocus: (opts?: { fromBreak?: boolean }) => void;
  pause: () => void;
  resume: () => void;
  endEarly: () => void;
  skipFocus: () => void;
  startBreak: (activity?: BreakActivity) => void;
  skipBreak: () => void;
  dismissReward: () => void;
  feed: (id: FoodId) => void;
  giveDrink: () => void;
  bathe: () => void;
  takeNap: () => void;
  poke: () => void;
  tapClock: () => void;
  equip: (id: string | null) => void;
  openSheet: (s: SheetId) => void;
  react: (kind: ReactionKind, meta?: Reaction["meta"]) => void;
  updateSettings: (p: Partial<Settings>) => void;
  dismissToast: (id: number) => void;
  resetAll: () => void;
}

export function modeOf(s: Session): Mode {
  if (s.status === "idle") return "idle";
  if (s.kind === "focus") return s.status === "running" ? "focus" : s.status === "paused" ? "paused" : "complete";
  return s.status === "done" ? "breakOver" : "break";
}

let seq = 1;
const nextId = () => Date.now() * 10 + (seq++ % 10);

const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  sound: true,
  notify: false,
  motion: "system",
  startSound: "kalimba",
  soundscape: "off",
  soundscapeVolume: 0.5,
  soundscapePulse: false,
  motivation: "sedang",
  place: null,
  spotify: null,
};

function notify(title: string, body: string, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !document.hidden) return;
  blinkTitle(`🔔 ${title}`);
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/assets/cibu/complete/youdidit.webp" });
  } catch {
    /* some browsers only allow notifications from a service worker — the title blink still works */
  }
}

export const useCibu = create<CibuState>()(
  persist(
    (set, get) => {
      const pushReaction = (kind: ReactionKind, meta?: Reaction["meta"]) =>
        set((st) => ({ reactions: [...st.reactions.slice(-4), { id: nextId(), kind, at: Date.now(), meta }] }));
      const pushToast = (t: Omit<Toast, "id">) => set((st) => ({ toasts: [...st.toasts.slice(-2), { ...t, id: nextId() }] }));
      const checkAchievements = () => {
        const ach = newAchievements(get().progress, Date.now());
        if (!ach.length) return;
        set((s2) => ({ progress: { ...s2.progress, achievements: [...s2.progress.achievements, ...ach] } }));
        ach.forEach((id) => pushToast({ title: "Achievement", body: id, sprite: "complete/youdidit" }));
      };

      /** Credit minutes, update care/progress, return the reward summary. */
      const credit = (minutes: number, completed: boolean, now: number): RewardSummary => {
        const st = get();
        const before = levelInfo(st.progress.xp);
        let progress = recordFocus(st.progress, minutes, completed, now);
        const after = levelInfo(progress.xp);
        const unlocked = OUTFITS.filter((o) => o.level > before.level && o.level <= after.level && !st.inventory.outfits.includes(o.id)).map(
          (o) => o.id,
        );
        const ach = newAchievements(progress, now);
        progress = { ...progress, achievements: [...progress.achievements, ...ach] };
        const items = { drink: completed ? 1 : 0 };
        set({
          progress,
          care: afterFocus(st.care, minutes, completed),
          inventory: {
            ...st.inventory,
            drink: st.inventory.drink + items.drink,
            outfits: [...st.inventory.outfits, ...unlocked],
          },
        });
        return {
          minutes,
          xp: xpFor(minutes, completed),
          levelBefore: before.level,
          levelAfter: after.level,
          pctBefore: before.pct,
          pctAfter: after.pct,
          items,
          unlocked,
          achievements: ach,
        };
      };

      const announce = (r: RewardSummary) => {
        if (r.levelAfter > r.levelBefore) {
          setTimeout(() => pushReaction(r.unlocked.length ? "unlock" : "levelUp"), 3200);
        }
        r.achievements.forEach((id, i) =>
          setTimeout(() => pushToast({ title: "Achievement", body: id, sprite: "complete/proudofyou" }), 1800 + i * 900),
        );
      };

      return {
        session: idleSession(),
        care: freshCare(Date.now()),
        progress: freshProgress(),
        inventory: { snack: 2, drink: 1, outfits: [], equipped: null },
        settings: DEFAULT_SETTINGS,
        lastNapAt: 0,

        hydrated: false,
        now: Date.now(),
        reactions: [],
        sheet: null,
        breakActivity: null,
        seated: false,
        reward: null,
        toasts: [],
        insets: { top: 0, bottom: 0, right: 0 },

        tick: (now = Date.now()) => {
          const st = get();
          const mode = modeOf(st.session);
          const activity = mode === "focus" ? "focus" : mode === "break" ? "break" : "idle";
          const care = decay(st.care, now, activity);
          set({ now, care });
          if (!isFinished(st.session, now)) return;
          if (st.session.kind === "focus") {
            const minutes = Math.round(st.session.durationMs / 60_000);
            const cycle = st.session.cycle + 1;
            const reward = credit(minutes, true, now);
            set({ session: { ...st.session, status: "done", cycle }, reward, sheet: null });
            pushReaction("complete");
            announce(reward);
            if (st.settings.sound) chime("complete");
            notify("Sesi fokus selesai!", `+${reward.xp} XP · Cibu bangga sama kamu`, st.settings.notify);
          } else {
            set({ session: { ...st.session, status: "done" }, breakActivity: null });
            pushReaction("clock");
            if (st.settings.sound) chime("break");
            notify("Istirahat selesai", "Udah timer loh! Yuk lanjut fokus.", st.settings.notify);
          }
        },

        startFocus: (opts) => {
          const st = get();
          const now = Date.now();
          const cycle = st.session.cycle % CYCLE_LENGTH;
          set({ session: startSession("focus", st.settings.focusMin, now, cycle), reward: null, sheet: null, breakActivity: null, now });
          if (opts?.fromBreak) pushReaction("breakSkip");
          pushReaction("focusStart");
          if (st.settings.sound) chime("start", st.settings.startSound);
        },

        pause: () => {
          set((st) => ({ session: pauseSession(st.session, Date.now()) }));
          pushReaction("pause");
        },
        resume: () => {
          set((st) => ({ session: resumeSession(st.session, Date.now()) }));
          pushReaction("resume");
        },

        endEarly: () => {
          const st = get();
          const now = Date.now();
          const minutes = Math.floor(elapsedMs(st.session, now) / 60_000);
          if (minutes > 0) {
            const r = credit(minutes, false, now);
            pushToast({ title: `+${r.xp} XP`, body: `${minutes} menit fokus tetap dihitung`, sprite: "complete/proudofyou" });
            announce(r);
          }
          const remainingMin = Math.max(1, Math.ceil(remainingMs(st.session, now) / 60_000));
          set({ session: idleSession(st.session.cycle) });
          pushReaction("ended", { remainingMin });
        },

        skipFocus: () => {
          const st = get();
          const now = Date.now();
          const minutes = Math.floor(elapsedMs(st.session, now) / 60_000);
          if (minutes > 0) {
            const r = credit(minutes, false, now);
            pushToast({ title: `+${r.xp} XP`, body: `${minutes} menit fokus tetap dihitung`, sprite: "complete/proudofyou" });
          }
          pushReaction("skipped");
          set({ session: startSession("break", st.settings.breakMin, now, st.session.cycle) });
        },

        startBreak: (activity = null) => {
          const st = get();
          const now = Date.now();
          const long = st.session.cycle >= CYCLE_LENGTH;
          const cycle = long ? 0 : st.session.cycle;
          set({
            session: startSession("break", long ? st.settings.longBreakMin : st.settings.breakMin, now, cycle, long),
            reward: null,
            breakActivity: activity,
          });
          if (activity === "self") pushReaction("breakSelf");
          else if (!activity) pushReaction("breakStart");
        },

        skipBreak: () => get().startFocus({ fromBreak: true }),

        setBreakActivity: (a) => set({ breakActivity: a }),

        dismissReward: () => set((st) => ({ reward: null, session: idleSession(st.session.cycle % CYCLE_LENGTH) })),

        feed: (id) => {
          const st = get();
          if (st.care.hunger >= FULL_AT) return pushReaction("full");
          set({ care: eat(st.care, foodById(id)), progress: { ...st.progress, fed: st.progress.fed + 1 } });
          pushReaction("eat", { food: id });
          checkAchievements();
        },

        giveDrink: () => {
          const st = get();
          if (st.inventory.drink <= 0) return pushReaction("empty");
          set({ care: drink(st.care), inventory: { ...st.inventory, drink: st.inventory.drink - 1 } });
          pushReaction("drink");
        },

        setInsets: (i) => {
          const c = get().insets;
          if (Math.abs(c.top - i.top) + Math.abs(c.bottom - i.bottom) + Math.abs(c.right - i.right) > 1) set({ insets: i });
        },

        bathe: () => {
          set((st) => ({ care: bathe(st.care) }));
          pushReaction("bath");
        },

        takeNap: () => {
          const st = get();
          const now = Date.now();
          if (now - st.lastNapAt < NAP_COOLDOWN_MS) {
            const min = Math.ceil((NAP_COOLDOWN_MS - (now - st.lastNapAt)) / 60_000);
            pushToast({ title: "Cibu belum ngantuk", body: `Bisa tidur siang lagi ${min} menit lagi`, sprite: "complete/youdidit" });
            return;
          }
          set({ care: nap(st.care), lastNapAt: now });
          pushReaction("nap");
        },

        poke: () => {
          const st = get();
          const mode = modeOf(st.session);
          if (mode === "focus") return pushReaction("pokeFocus");
          set({ care: pet(st.care) });
          pushReaction("poke");
        },

        tapClock: () => {
          const st = get();
          const mode = modeOf(st.session);
          const running = mode === "focus" || mode === "paused" || mode === "break";
          pushReaction("clock", running ? { remainingMin: Math.max(1, Math.ceil(remainingMs(st.session, Date.now()) / 60_000)) } : undefined);
        },

        equip: (id) => {
          set((st) => ({ inventory: { ...st.inventory, equipped: id } }));
          pushReaction("outfit");
        },

        openSheet: (s) => {
          const st = get();
          // music is part of focusing; anything else during focus is a (gentle) distraction
          if (s && s !== "music" && modeOf(st.session) === "focus") pushReaction("distract");
          set({ sheet: s });
        },

        react: (kind, meta) => pushReaction(kind, meta),

        updateSettings: (p) => set((st) => ({ settings: { ...st.settings, ...p } })),

        dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),

        resetAll: () =>
          set({
            session: idleSession(),
            care: freshCare(Date.now()),
            progress: freshProgress(),
            inventory: { snack: 2, drink: 1, outfits: [], equipped: null },
            settings: DEFAULT_SETTINGS,
            lastNapAt: 0,
            reward: null,
            sheet: null,
          }),
      };
    },
    {
      name: "cibu-v1",
      version: 2,
      // keep new settings keys when older saves are loaded
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CibuState>;
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
      migrate: (persisted) => persisted as CibuState,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        session: s.session,
        care: s.care,
        progress: s.progress,
        inventory: s.inventory,
        settings: s.settings,
        lastNapAt: s.lastNapAt,
      }),
      onRehydrateStorage: () => () => {
        // runs inside create(), before `useCibu` is assigned when storage is synchronous
        queueMicrotask(() => useCibu.setState({ hydrated: true }));
      },
    },
  ),
);

/**
 * A finished focus session is persisted but its reward card is not. Reopening the app in that
 * state would leave "complete" with no dock and no card, so fall back to idle (XP is already credited).
 */
function unstickComplete() {
  const st = useCibu.getState();
  if (modeOf(st.session) === "complete" && !st.reward) useCibu.setState({ session: idleSession(st.session.cycle % CYCLE_LENGTH) });
}
if (useCibu.persist.hasHydrated()) unstickComplete();
else useCibu.persist.onFinishHydration(unstickComplete);

/** Derived values used by several components. */
export const selectMode = (s: CibuState) => modeOf(s.session);
export const selectRemaining = (s: CibuState) => remainingMs(s.session, s.now);
export const selectProgress = (s: CibuState) => progressOf(s.session, s.now);
