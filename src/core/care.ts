/**
 * Cibu care system — deliberately gentle.
 * Stats live in 0..100 and never fall below FLOOR: Cibu can look hungry or
 * sleepy, but never gets sick. Decay is computed lazily from `updatedAt`.
 */
export interface Care {
  hunger: number; // 100 = full
  energy: number;
  mood: number;
  hygiene: number;
  updatedAt: number;
}

export const FLOOR = 15;
export const clampStat = (v: number) => Math.min(100, Math.max(FLOOR, v));

export const freshCare = (now: number): Care => ({ hunger: 80, energy: 85, mood: 70, hygiene: 90, updatedAt: now });

const PER_HOUR = {
  hunger: -2.5,
  hygiene: -1.5,
  energyRest: +4, // resting (not focusing) slowly restores energy
  energyBreak: +36, // during an actual break: +3 per 5-minute break
  moodDrift: 2, // mood drifts toward 60
};

export type Activity = "focus" | "break" | "idle";

export function decay(c: Care, now: number, activity: Activity): Care {
  const hours = Math.max(0, now - c.updatedAt) / 3_600_000;
  if (hours <= 0) return c;
  const energyRate = activity === "break" ? PER_HOUR.energyBreak : activity === "idle" ? PER_HOUR.energyRest : 0;
  const moodDelta = Math.sign(60 - c.mood) * Math.min(Math.abs(60 - c.mood), PER_HOUR.moodDrift * hours);
  return {
    hunger: clampStat(c.hunger + PER_HOUR.hunger * hours),
    hygiene: clampStat(c.hygiene + PER_HOUR.hygiene * hours),
    energy: clampStat(c.energy + energyRate * hours),
    mood: clampStat(c.mood + moodDelta),
    updatedAt: now,
  };
}

/** Cost of a finished focus block, proportional to minutes focused. */
export function afterFocus(c: Care, minutes: number, completed: boolean): Care {
  return {
    ...c,
    energy: clampStat(c.energy - minutes * 0.3),
    hunger: clampStat(c.hunger - minutes * 0.25),
    hygiene: clampStat(c.hygiene - minutes * 0.12),
    mood: clampStat(c.mood + (completed ? 8 : 2)),
  };
}

/** Healthy menu — always available (Cibu is never kept hungry on purpose). */
export type FoodId = "salad" | "carrot" | "strawberry";
export interface Food {
  id: FoodId;
  label: string;
  kind: "sayur" | "buah";
  hunger: number;
  energy: number;
  mood: number;
  /** texture key in the scene / image for the UI */
  sprite: string;
  img: string;
}
export const MENU: Food[] = [
  { id: "salad", label: "Salad Sayur", kind: "sayur", hunger: 38, energy: 4, mood: 6, sprite: "prop/snack", img: "/assets/cibu/prop/snack.webp" },
  { id: "carrot", label: "Wortel Manis", kind: "sayur", hunger: 26, energy: 8, mood: 6, sprite: "food/carrot", img: "/assets/food/carrot.svg" },
  { id: "strawberry", label: "Stroberi", kind: "buah", hunger: 22, energy: 6, mood: 10, sprite: "food/strawberry", img: "/assets/food/strawberry.svg" },
];
export const foodById = (id: FoodId) => MENU.find((f) => f.id === id)!;
export const FULL_AT = 92;

export const eat = (c: Care, f: Food): Care => ({
  ...c,
  hunger: clampStat(c.hunger + f.hunger),
  energy: clampStat(c.energy + f.energy),
  mood: clampStat(c.mood + f.mood),
});

/** Drinks are the reward treat: earned from completed focus sessions. */
export const DRINK = { hunger: 10, energy: 18, mood: 8, label: "Minuman", sprite: "prop/drink" };
export const drink = (c: Care): Care => ({
  ...c,
  hunger: clampStat(c.hunger + DRINK.hunger),
  energy: clampStat(c.energy + DRINK.energy),
  mood: clampStat(c.mood + DRINK.mood),
});

export const bathe = (c: Care): Care => ({ ...c, hygiene: 100, mood: clampStat(c.mood + 4) });
export const nap = (c: Care): Care => ({ ...c, energy: clampStat(c.energy + 25), mood: clampStat(c.mood + 3) });
export const pet = (c: Care): Care => ({ ...c, mood: clampStat(c.mood + 2) });

export const NAP_COOLDOWN_MS = 15 * 60_000;

export type Need = "hungry" | "sleepy" | "dirty" | null;
export function topNeed(c: Care): Need {
  if (c.hunger < 35) return "hungry";
  if (c.energy < 30) return "sleepy";
  if (c.hygiene < 30) return "dirty";
  return null;
}
