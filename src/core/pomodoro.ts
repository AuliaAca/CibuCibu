/**
 * Pomodoro timer — pure, timestamp-based.
 * Never counts seconds by hand: remaining time is always derived from
 * `startedAt`, `pausedAt` and `pausedMs`, so it survives tab throttling,
 * sleep and reloads.
 */
export type SessionKind = "focus" | "break";
export type SessionStatus = "idle" | "running" | "paused" | "done";

export interface Session {
  kind: SessionKind;
  status: SessionStatus;
  durationMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  /** Completed focus sessions in the current cycle of 4 (0..3). */
  cycle: number;
  isLongBreak: boolean;
}

export const CYCLE_LENGTH = 4;

export const idleSession = (cycle = 0): Session => ({
  kind: "focus",
  status: "idle",
  durationMs: 0,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  cycle,
  isLongBreak: false,
});

export function startSession(kind: SessionKind, minutes: number, now: number, cycle: number, isLongBreak = false): Session {
  return {
    kind,
    status: "running",
    durationMs: Math.round(minutes * 60_000),
    startedAt: now,
    pausedAt: null,
    pausedMs: 0,
    cycle,
    isLongBreak,
  };
}

export function elapsedMs(s: Session, now: number): number {
  if (!s.startedAt) return 0;
  const end = s.pausedAt ?? now;
  return Math.min(Math.max(end - s.startedAt - s.pausedMs, 0), s.durationMs);
}

export const remainingMs = (s: Session, now: number) => Math.max(s.durationMs - elapsedMs(s, now), 0);
export const progressOf = (s: Session, now: number) => (s.durationMs ? elapsedMs(s, now) / s.durationMs : 0);
export const isFinished = (s: Session, now: number) => s.status === "running" && remainingMs(s, now) <= 0;

export function pauseSession(s: Session, now: number): Session {
  if (s.status !== "running") return s;
  return { ...s, status: "paused", pausedAt: now };
}

export function resumeSession(s: Session, now: number): Session {
  if (s.status !== "paused" || s.pausedAt == null) return s;
  return { ...s, status: "running", pausedMs: s.pausedMs + (now - s.pausedAt), pausedAt: null };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
