/**
 * Sunrise / sunset for the user's location (suncalc-style solar equations),
 * so Greeny Garden's night → dawn → day follows the real sky outside.
 *
 * Location comes from the browser (if the user allows it) or is estimated
 * from the device time zone — no network calls, nothing leaves the device.
 */
const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const E = RAD * 23.4397;

const toDays = (d: Date) => d.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * DAY_MS);
const meanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (M: number) =>
  M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
const declination = (L: number) => Math.asin(Math.sin(E) * Math.sin(L));
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const transitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  /** local clock hours (float) */
  riseH: number;
  setH: number;
}

export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = approxTransit(0, lw, n);
  const M = meanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const noon = transitJ(ds, M, L);
  const h0 = -0.833 * RAD;
  const cosW = (Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  // polar day / night: fall back to a sensible 06:00–18:00
  if (cosW <= -1 || cosW >= 1) {
    const a = new Date(date);
    a.setHours(6, 0, 0, 0);
    const b = new Date(date);
    b.setHours(18, 0, 0, 0);
    return { sunrise: a, sunset: b, riseH: 6, setH: 18 };
  }
  const w = Math.acos(cosW);
  const set = transitJ(approxTransit(w, lw, n), M, L);
  const rise = noon - (set - noon);
  const sunrise = fromJulian(rise);
  const sunset = fromJulian(set);
  const h = (t: Date) => t.getHours() + t.getMinutes() / 60;
  return { sunrise, sunset, riseH: h(sunrise), setH: h(sunset) };
}

export interface Place {
  lat: number;
  lon: number;
  label: string;
  source: "gps" | "tz";
}

/** Rough coordinates for common time zones (city the zone is named after). */
const ZONES: Record<string, [number, number, string]> = {
  "Asia/Jakarta": [-6.2, 106.85, "Jakarta"],
  "Asia/Pontianak": [-0.03, 109.33, "Pontianak"],
  "Asia/Makassar": [-5.14, 119.43, "Makassar"],
  "Asia/Jayapura": [-2.53, 140.72, "Jayapura"],
  "Asia/Singapore": [1.35, 103.82, "Singapura"],
  "Asia/Kuala_Lumpur": [3.14, 101.69, "Kuala Lumpur"],
  "Asia/Bangkok": [13.75, 100.5, "Bangkok"],
  "Asia/Ho_Chi_Minh": [10.82, 106.63, "Ho Chi Minh"],
  "Asia/Manila": [14.6, 120.98, "Manila"],
  "Asia/Tokyo": [35.68, 139.69, "Tokyo"],
  "Asia/Seoul": [37.57, 126.98, "Seoul"],
  "Asia/Shanghai": [31.23, 121.47, "Shanghai"],
  "Asia/Hong_Kong": [22.32, 114.17, "Hong Kong"],
  "Asia/Kolkata": [28.61, 77.2, "Delhi"],
  "Asia/Dubai": [25.2, 55.27, "Dubai"],
  "Australia/Sydney": [-33.87, 151.21, "Sydney"],
  "Australia/Perth": [-31.95, 115.86, "Perth"],
  "Europe/London": [51.51, -0.13, "London"],
  "Europe/Amsterdam": [52.37, 4.9, "Amsterdam"],
  "Europe/Berlin": [52.52, 13.4, "Berlin"],
  "Europe/Paris": [48.86, 2.35, "Paris"],
  "America/New_York": [40.71, -74.0, "New York"],
  "America/Chicago": [41.88, -87.63, "Chicago"],
  "America/Los_Angeles": [34.05, -118.24, "Los Angeles"],
};

export function placeFromTimezone(): Place {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* ignore */
  }
  const z = ZONES[tz];
  if (z) return { lat: z[0], lon: z[1], label: z[2], source: "tz" };
  const offsetH = -new Date().getTimezoneOffset() / 60;
  return { lat: 0, lon: offsetH * 15, label: tz || `UTC${offsetH >= 0 ? "+" : ""}${offsetH}`, source: "tz" };
}

export const resolvePlace = (p: Place | null | undefined): Place => p ?? placeFromTimezone();

export const fmtHour = (h: number) => {
  const m = Math.round((h % 1) * 60);
  const hh = Math.floor(h) + (m === 60 ? 1 : 0);
  return `${String(hh % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
