/**
 * Time-of-day atmosphere, blended continuously from the user's local clock.
 * Keeps the world feeling alive across a day of study sessions.
 */
export interface Atmos {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  tint: number; // 0xRRGGBB overlay
  tintA: number;
  sunA: number;
  moonA: number;
  rays: number;
  night: number; // 0..1 (fireflies, stars, lamp)
}

type Key = { h: number } & { top: number[]; mid: number[]; bottom: number[]; tint: number[]; tintA: number; sunA: number; moonA: number; rays: number; night: number };

const hex = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const NIGHT = { top: hex("#18204a"), mid: hex("#2f3a78"), bottom: hex("#56609a"), tint: hex("#141c58"), tintA: 0.34, sunA: 0, moonA: 1, rays: 0, night: 1 };
const DAWN = { top: hex("#89b6ea"), mid: hex("#f5c9c0"), bottom: hex("#ffe2bd"), tint: hex("#ff9a60"), tintA: 0.07, sunA: 0.8, moonA: 0, rays: 0.25, night: 0.1 };
const DAY = { top: hex("#63b6ee"), mid: hex("#a8dcf5"), bottom: hex("#e4f5f0"), tint: hex("#ffffff"), tintA: 0, sunA: 1, moonA: 0, rays: 0.38, night: 0 };
const DUSK = { top: hex("#6a78cc"), mid: hex("#f39c86"), bottom: hex("#ffc98f"), tint: hex("#ff7440"), tintA: 0.12, sunA: 0.9, moonA: 0, rays: 0.28, night: 0.25 };

/** Keyframes follow the real sun: night → dawn around sunrise, dusk around sunset. */
function keysFor(rise: number, set: number): Key[] {
  return [
    { h: 0, ...NIGHT },
    { h: rise - 1.1, ...NIGHT },
    { h: rise + 0.25, ...DAWN },
    { h: rise + 2.2, ...DAY },
    { h: set - 2, ...DAY },
    { h: set - 0.05, ...DUSK },
    { h: set + 1.1, ...NIGHT },
    { h: 24, ...NIGHT },
  ];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const toHex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

export function atmosAt(hour: number, rise = 6, set = 18): Atmos {
  const h = ((hour % 24) + 24) % 24;
  const KEYS = keysFor(rise, set);
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  const e = t * t * (3 - 2 * t);
  const tint = mix(a.tint, b.tint, e);
  return {
    skyTop: toHex(mix(a.top, b.top, e)),
    skyMid: toHex(mix(a.mid, b.mid, e)),
    skyBottom: toHex(mix(a.bottom, b.bottom, e)),
    tint: (tint[0] << 16) | (tint[1] << 8) | tint[2],
    tintA: lerp(a.tintA, b.tintA, e),
    sunA: lerp(a.sunA, b.sunA, e),
    moonA: lerp(a.moonA, b.moonA, e),
    rays: lerp(a.rays, b.rays, e),
    night: lerp(a.night, b.night, e),
  };
}

/** Local hour as a float; `?hour=21.5` in the URL overrides it (handy for testing). */
export function localHour(): number {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("hour");
    if (q != null && !Number.isNaN(Number(q))) return Number(q);
  }
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
