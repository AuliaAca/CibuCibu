"use client";
import { useCibu, selectMode } from "@/store/useCibu";
import { SelfBreakCard } from "./SelfBreakCard";
import { BreathCoach } from "./BreathCoach";
import { ColoringStudio } from "./ColoringStudio";

/** Break activities chosen after a completed session. */
export function BreakPanel() {
  const mode = useCibu(selectMode);
  const activity = useCibu((s) => s.breakActivity);
  if (mode !== "break") return null;
  if (activity === "self") return <SelfBreakCard />;
  if (activity === "breathe") return <BreathCoach />;
  return null;
}

export function BreakOverlay() {
  const mode = useCibu(selectMode);
  const activity = useCibu((s) => s.breakActivity);
  return mode === "break" && activity === "color" ? <ColoringStudio /> : null;
}
