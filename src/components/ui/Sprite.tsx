import { spriteUrl, SPRITES } from "@/game/assets";

/** An official Cibu sprite as a plain <img> for React UI (thumbnails, icons). */
export function Sprite({ id, className, alt }: { id: string; className?: string; alt?: string }) {
  const info = SPRITES[id];
  if (!info) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={spriteUrl(id)} alt={alt ?? info.label} width={info.w} height={info.h} draggable={false} className={className} />;
}
