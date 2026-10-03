/**
 * Lemari Cibu — outfits grouped for cewek & cowok, each with its own styles.
 *
 * Two kinds of outfit:
 *  - combo:  an official outfit illustration from the reference sheet
 *            (Cibu sits in it while relaxing)
 *  - layers: accessories layered on top of every expression
 *            (official wear items + a few new ones drawn in the sheet's style)
 *
 * Unlocks are predictable: each level opens one look for cewek and one for cowok.
 */
export type Gender = "cewek" | "cowok";
export type Style = "imut" | "cute" | "baddie" | "princess" | "clean" | "cool" | "keren" | "rumah";

export interface Outfit {
  id: string;
  label: string;
  gender: Gender;
  style: Style;
  level: number;
  /** official full-outfit sprite (e.g. "outfit/bow_pleat") */
  combo?: string;
  /** layered accessories, drawn back → front */
  layers?: string[];
}

export const STYLES: Record<Gender, { id: Style; label: string; desc: string }[]> = {
  cewek: [
    { id: "imut", label: "Imut", desc: "Manis & lucu" },
    { id: "cute", label: "Cute", desc: "Pastel, topi & beret" },
    { id: "baddie", label: "Baddie", desc: "Berani & percaya diri" },
    { id: "princess", label: "Princess", desc: "Selendang manis & jubah ratu" },
  ],
  cowok: [
    { id: "clean", label: "Clean", desc: "Rapi & kalem" },
    { id: "cool", label: "Cool", desc: "Santai tapi gaya" },
    { id: "keren", label: "Keren", desc: "Topi & streetwear" },
    { id: "rumah", label: "Baju Rumah", desc: "Nyaman buat di rumah" },
  ],
};

export const OUTFITS: Outfit[] = [
  // ---- cewek
  { id: "pita_pink", label: "Pita Pink", gender: "cewek", style: "imut", level: 1, layers: ["layer/bow"] },
  { id: "frog_scarf", label: "Bando Katak", gender: "cewek", style: "imut", level: 2, combo: "outfit/frog_scarf" },
  { id: "heart_baddie", label: "Gold Glam", gender: "cewek", style: "baddie", level: 3, layers: ["acc/spike-band", "acc/gold-chain"] },
  { id: "tiara", label: "Tiara Putri", gender: "cewek", style: "princess", level: 4, layers: ["acc/sash-pink", "acc/tiara"] },
  { id: "bucket_skirt", label: "Bucket Peach", gender: "cewek", style: "cute", level: 5, combo: "outfit/bucket_skirt" },
  { id: "bow_pleat", label: "Pita & Rok Plisket", gender: "cewek", style: "imut", level: 6, combo: "outfit/bow_pleat" },
  { id: "night_baddie", label: "Baddie Night", gender: "cewek", style: "baddie", level: 7, layers: ["acc/bandana", "acc/silver-chain"] },
  { id: "beret_love", label: "Beret Love", gender: "cewek", style: "cute", level: 8, combo: "outfit/beret_love" },
  { id: "ratu", label: "Ratu Kecil", gender: "cewek", style: "princess", level: 9, layers: ["acc/robe-royal", "acc/crown"] },
  { id: "star_clips", label: "Jepit Bintang", gender: "cewek", style: "cute", level: 10, layers: ["acc/star-clips"] },
  { id: "beret_red", label: "Beret Merah", gender: "cewek", style: "cute", level: 11, combo: "outfit/beret_red" },
  // ---- cowok (all layered: every piece follows Cibu's expressions and poses)
  { id: "rapi", label: "Rapi Kalem", gender: "cowok", style: "clean", level: 1, layers: ["acc/bowtie", "acc/round-glasses"] },
  { id: "sunnies_beret", label: "Cool Newsboy", gender: "cowok", style: "cool", level: 2, layers: ["acc/newsboy"] },
  { id: "topi_merah", label: "Topi Merah", gender: "cowok", style: "keren", level: 3, layers: ["acc/cap-red"] },
  { id: "piyama", label: "Piyama Tidur", gender: "cowok", style: "rumah", level: 4, layers: ["acc/pajama-blue", "acc/nightcap"] },
  { id: "sporty", label: "Sporty Clean", gender: "cowok", style: "clean", level: 5, layers: ["acc/sweatband"] },
  { id: "dj", label: "DJ Cibu", gender: "cowok", style: "cool", level: 6, layers: ["acc/headphones"] },
  { id: "cap_orange", label: "Topi Peach", gender: "cowok", style: "keren", level: 7, layers: ["acc/bucket-peach"] },
  { id: "beanie_sweater", label: "Sweater Cozy", gender: "cowok", style: "rumah", level: 8, layers: ["acc/sweater-cream", "acc/beanie-blue"] },
  { id: "cap_sling", label: "Streetwear", gender: "cowok", style: "cool", level: 9, layers: ["acc/sling-bag", "acc/cap-back"] },
  { id: "beanie_navy", label: "Beanie Navy", gender: "cowok", style: "keren", level: 10, layers: ["acc/beanie-navy"] },
  { id: "santai", label: "Santai Rumah", gender: "cowok", style: "rumah", level: 11, layers: ["acc/tee-stripe", "acc/beanie-sage"] },
];

export const outfitById = (id: string | null | undefined) => (id ? OUTFITS.find((o) => o.id === id) ?? null : null);
