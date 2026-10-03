/**
 * Cute coloring pages (400×400). `regions` are tappable fill areas drawn in
 * order; `decor` are ink details drawn on top (optionally clipped to a region).
 */
export interface Region {
  id: string;
  d: string;
  label: string;
}
export interface Decor {
  d: string;
  fill?: boolean;
  clip?: string;
  width?: number;
}
export interface Page {
  id: string;
  title: string;
  regions: Region[];
  decor: Decor[];
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}
function heart(cx: number, cy: number, s: number) {
  return `M${cx} ${cy + s * 0.9} C${cx - s * 1.4} ${cy} ${cx - s * 0.9} ${cy - s * 1.1} ${cx} ${cy - s * 0.35} C${cx + s * 0.9} ${cy - s * 1.1} ${cx + s * 1.4} ${cy} ${cx} ${cy + s * 0.9}Z`;
}
const capsule = (x: number, y: number, a: number) => {
  const dx = Math.cos(a) * 8;
  const dy = Math.sin(a) * 8;
  const nx = -Math.sin(a) * 3;
  const ny = Math.cos(a) * 3;
  return `M${x - dx + nx} ${y - dy + ny} L${x + dx + nx} ${y + dy + ny} L${x + dx - nx} ${y + dy - ny} L${x - dx - nx} ${y - dy - ny}Z`;
};
const face = (x: number, y: number, gap = 20) =>
  [
    { d: circle(x - gap, y, 5), fill: true },
    { d: circle(x + gap, y, 5), fill: true },
    { d: `M${x - 9} ${y + 12} Q${x} ${y + 22} ${x + 9} ${y + 12}` },
  ] as Decor[];

export const PAGES: Page[] = [
  {
    id: "eskrim",
    title: "Es Krim Senyum",
    regions: [
      { id: "bg", label: "Latar", d: circle(200, 205, 182) },
      { id: "star1", label: "Bintang", d: star(78, 96, 26) },
      { id: "star2", label: "Bintang kecil", d: star(326, 300, 18) },
      { id: "heart", label: "Hati", d: heart(322, 104, 20) },
      { id: "cone", label: "Cone", d: "M138 236 L262 236 L207 372 Q200 384 193 372 Z" },
      { id: "scoop1", label: "Es krim bawah", d: "M114 240 C102 192 146 160 200 164 C254 160 298 192 286 240 C272 254 252 240 236 252 C220 264 180 264 164 252 C148 240 128 254 114 240 Z" },
      { id: "scoop2", label: "Es krim atas", d: "M140 170 C128 118 164 90 200 92 C236 90 272 118 260 170 C240 184 160 184 140 170 Z" },
      {
        id: "sprinkles",
        label: "Meses",
        d: [capsule(168, 128, 0.6), capsule(206, 112, -0.4), capsule(236, 138, 1.1), capsule(184, 152, -1), capsule(222, 162, 0.2)].join(" "),
      },
      { id: "cherry", label: "Ceri", d: circle(206, 76, 17) },
      { id: "cheeks", label: "Pipi", d: `${ellipse(168, 222, 11, 7)} ${ellipse(232, 222, 11, 7)}` },
    ],
    decor: [
      { d: "M160 262 L222 352 M186 262 L238 334 M214 262 L252 312 M240 262 L178 352 M214 262 L162 334 M186 262 L148 312", clip: "cone", width: 3 },
      { d: "M206 60 Q212 40 230 34", width: 5 },
      ...face(200, 206),
    ],
  },
  {
    id: "jamur",
    title: "Rumah Jamur",
    regions: [
      { id: "bg", label: "Langit", d: circle(200, 205, 182) },
      { id: "grass", label: "Rumput", d: "M34 292 Q200 250 366 292 Q352 356 200 386 Q48 356 34 292 Z" },
      { id: "stem", label: "Dinding", d: "M142 196 L258 196 L270 318 Q200 334 130 318 Z" },
      { id: "door", label: "Pintu", d: "M182 322 L182 276 A18 18 0 0 1 218 276 L218 322 Z" },
      { id: "window", label: "Jendela", d: circle(240, 244, 16) },
      { id: "cap", label: "Atap jamur", d: "M66 206 C66 108 138 58 200 58 C262 58 334 108 334 206 C300 226 100 226 66 206 Z" },
      { id: "spots", label: "Totol", d: [circle(118, 152, 18), circle(204, 98, 20), circle(276, 150, 17), circle(248, 196, 11), circle(146, 198, 10)].join(" ") },
      { id: "petals", label: "Kelopak", d: [circle(76, 302, 11), circle(96, 294, 11), circle(102, 316, 11), circle(84, 326, 11), circle(66, 318, 11)].join(" ") },
      { id: "flowerc", label: "Tengah bunga", d: circle(85, 311, 7) },
      { id: "stones", label: "Batu jalan", d: `${ellipse(200, 344, 16, 7)} ${ellipse(212, 366, 13, 6)}` },
      { id: "sun", label: "Matahari", d: circle(330, 88, 24) },
    ],
    decor: [
      { d: "M240 228 L240 260 M224 244 L256 244", clip: "window", width: 3 },
      { d: circle(211, 300, 3), fill: true },
      ...face(200, 160, 24),
    ],
  },
  {
    id: "cupcake",
    title: "Cupcake Gemes",
    regions: [
      { id: "bg", label: "Latar", d: circle(200, 205, 182) },
      { id: "heart1", label: "Hati", d: heart(82, 110, 20) },
      { id: "star1", label: "Bintang", d: star(322, 96, 24) },
      { id: "wrapper", label: "Wadah", d: "M118 232 L282 232 L260 352 Q200 366 140 352 Z" },
      { id: "stripes", label: "Garis wadah", d: "M142 232 L162 232 L166 356 L150 354 Z M190 232 L210 232 L208 360 L192 360 Z M238 232 L258 232 L250 354 L234 356 Z" },
      { id: "frosting", label: "Krim", d: "M106 238 C84 232 88 198 116 196 C106 164 140 148 160 160 C166 124 234 124 240 160 C260 148 294 164 284 196 C312 198 316 232 294 238 Z" },
      { id: "sprinkles", label: "Taburan", d: [capsule(150, 200, 0.5), capsule(186, 176, -0.6), capsule(226, 190, 0.9), capsule(262, 214, -0.2), capsule(132, 224, 1.2), capsule(206, 220, 0.1)].join(" ") },
      { id: "cherry", label: "Ceri", d: circle(200, 122, 18) },
      { id: "cheeks", label: "Pipi", d: `${ellipse(164, 306, 11, 7)} ${ellipse(236, 306, 11, 7)}` },
    ],
    decor: [{ d: "M202 104 Q208 84 226 78", width: 5 }, ...face(200, 290)],
  },
];
