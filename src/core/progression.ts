/**
 * XP, levels, unlocks and achievements.
 * Rewards are proportional and predictable ("Nice, I made progress"),
 * never random.
 */
export interface Progress {
  xp: number;
  totalFocusMin: number;
  sessions: number;
  streak: number;
  lastFocusDay: string | null;
  daily: Record<string, number>; // yyyy-mm-dd -> minutes
  dailySessions: Record<string, number>;
  achievements: string[];
  fed: number;
}

export const freshProgress = (): Progress => ({
  xp: 0,
  totalFocusMin: 0,
  sessions: 0,
  streak: 0,
  lastFocusDay: null,
  daily: {},
  dailySessions: {},
  achievements: [],
  fed: 0,
});

/** XP needed to go from level n to n+1. */
export const xpToNext = (level: number) => 60 + (level - 1) * 30;

export function levelInfo(xp: number) {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, need: xpToNext(level), pct: rest / xpToNext(level) };
}

export const xpFor = (minutes: number, completed: boolean) => Math.round(minutes) + (completed ? 10 : 0);

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function recordFocus(p: Progress, minutes: number, completed: boolean, now: number): Progress {
  const today = dayKey(now);
  const yesterday = dayKey(now - 86_400_000);
  const streak = p.lastFocusDay === today ? p.streak : p.lastFocusDay === yesterday ? p.streak + 1 : 1;
  return {
    ...p,
    xp: p.xp + xpFor(minutes, completed),
    totalFocusMin: p.totalFocusMin + minutes,
    sessions: p.sessions + (completed ? 1 : 0),
    streak: minutes > 0 ? streak : p.streak,
    lastFocusDay: minutes > 0 ? today : p.lastFocusDay,
    daily: { ...p.daily, [today]: (p.daily[today] ?? 0) + minutes },
    dailySessions: { ...p.dailySessions, [today]: (p.dailySessions[today] ?? 0) + (completed ? 1 : 0) },
  };
}

export { OUTFITS } from "./wardrobe";

export const WORLDS = [
  { id: "greeny", label: "Greeny Garden", level: 1, ready: true },
  { id: "beach", label: "Sunny Beach", level: 6, ready: false },
  { id: "candy", label: "Candy Land", level: 10, ready: false },
  { id: "cloudy", label: "Cloudy Town", level: 15, ready: false },
  { id: "space", label: "Space Station", level: 20, ready: false },
];

export interface AchievementDef {
  id: string;
  label: string;
  desc: string;
  test: (p: Progress, today: string) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first", label: "Langkah Pertama", desc: "Selesaikan sesi fokus pertama", test: (p) => p.sessions >= 1 },
  { id: "cycle", label: "Satu Siklus", desc: "4 sesi fokus dalam sehari", test: (p, t) => (p.dailySessions[t] ?? 0) >= 4 },
  { id: "hour", label: "Satu Jam", desc: "Total 60 menit fokus", test: (p) => p.totalFocusMin >= 60 },
  { id: "streak3", label: "Tiga Hari", desc: "Fokus 3 hari berturut-turut", test: (p) => p.streak >= 3 },
  { id: "care", label: "Teman Baik", desc: "Kasih makan Cibu 5 kali", test: (p) => p.fed >= 5 },
  { id: "tenh", label: "Sepuluh Jam", desc: "Total 10 jam fokus", test: (p) => p.totalFocusMin >= 600 },
];

export function newAchievements(p: Progress, now: number): string[] {
  const t = dayKey(now);
  return ACHIEVEMENTS.filter((a) => !p.achievements.includes(a.id) && a.test(p, t)).map((a) => a.id);
}
