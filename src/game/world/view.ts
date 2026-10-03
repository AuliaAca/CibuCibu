/**
 * The world is authored in a 1600×900 design space. This maps it to the
 * current canvas so the scene re-composes per viewport instead of just
 * shrinking — and frames Cibu inside the space the HUD leaves free, so the
 * timer, buttons and care rail never cover him.
 */
export const DESIGN_W = 1600;
export const DESIGN_H = 900;
export const CIBU_FEET = { x: 800, y: 712 };
/** Cibu's visual height incl. breathing + focus-zoom headroom and a hat, in design units. */
const CIBU_BOX_H = 250 * 1.22 + 46;
/** Half of Cibu's width incl. the mat props nearest to him, in design units. */
const CIBU_HALF_W = 170;

export interface View {
  w: number;
  h: number;
  k: number;
  ox: number;
  oy: number;
  portrait: boolean;
}

export interface Insets {
  top: number;
  bottom: number;
  right: number;
  /** screen px kept free above Cibu's head so his speech bubble never slides under the timer */
  bubble?: number;
}

export function computeView(w: number, h: number, insets: Insets = { top: 0, bottom: 0, right: 0 }): View {
  const portrait = h > w * 1.05;
  // 1) preferred scale: cover the frame (landscape) or fit the height (portrait)
  let k = portrait ? h / 1010 : Math.max(w / DESIGN_W, h / DESIGN_H);

  // 2) free area between the HUD bands
  const gap = 14 * (h / 900);
  const freeTop = insets.top + gap;
  const freeBottom = h - insets.bottom - gap;
  const freeRight = w - insets.right - gap;
  const freeH = Math.max(1, freeBottom - freeTop);
  const B = insets.bubble ?? 0;

  // shrink only when Cibu would not fit; never below what still covers the width (layers have ±300 overscan)
  const minK = w / (DESIGN_W + 560);
  const kPreferred = k;
  if (insets.bottom > 0 || insets.top > 0) k = Math.max(minK, Math.min(k, (freeH - B) / CIBU_BOX_H));
  // keep him (and the props beside him) clear of the right rail on narrow screens
  if (insets.right > 0) k = Math.max(minK, Math.min(k, (freeRight - gap) / (2 * CIBU_HALF_W)));
  const shrunk = k < kPreferred - 1e-6;

  // 3) feet sit on the bottom of the free area (but not lower than the natural composition)
  const natural = portrait ? h * 0.655 : CIBU_FEET.y * k + Math.min(0, Math.max(h - DESIGN_H * k, h * 0.77 - CIBU_FEET.y * k));
  // when we had to shrink, stand him right on top of the controls; otherwise keep the natural spot if it is free
  let feetY = insets.bottom > 0 ? (shrunk ? freeBottom : Math.min(natural, freeBottom)) : natural;
  // head + bubble must clear the timer: lower him (never below the controls) until they do
  const need = CIBU_BOX_H * k + B;
  if (feetY - need < freeTop) feetY = Math.min(insets.bottom > 0 ? freeBottom : h, freeTop + need);
  // Cibu is centred, nudged left only if the right rail would overlap him
  const cx = Math.min(w / 2, freeRight - CIBU_HALF_W * k);

  return { w, h, k, portrait, ox: cx - CIBU_FEET.x * k, oy: feetY - CIBU_FEET.y * k };
}

export function lerpView(a: View, b: View, t: number): View {
  const l = (x: number, y: number) => x + (y - x) * t;
  return { ...b, k: l(a.k, b.k), ox: l(a.ox, b.ox), oy: l(a.oy, b.oy) };
}
