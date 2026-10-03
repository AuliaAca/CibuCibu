/**
 * Cibu's sounds — synthesized with Web Audio, no files to ship.
 *
 * The focus-start sound is a small ritual rather than a generic "ding":
 * a soft breath-in (filtered noise swell) followed by one of three signature
 * motifs. The kalimba motif ends with a little upward "boop" glide — Cibu's
 * voice, so the app sounds like itself.
 */
export type StartSoundId = "kalimba" | "bowl" | "marimba" | "off";

let ctx: AudioContext | null = null;

export function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx ??= new AC();
  } catch {
    return null;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

let noiseBuf: AudioBuffer | null = null;
function noise(ac: AudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

let room: { ac: AudioContext; input: GainNode } | null = null;
/** One shared, gentle room (short low-passed echo) that every sound feeds. */
function out(ac: AudioContext, gain: number) {
  if (!room || room.ac !== ac) {
    const input = ac.createGain();
    const d = ac.createDelay();
    d.delayTime.value = 0.13;
    const fb = ac.createGain();
    fb.gain.value = 0.28;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    input.connect(ac.destination);
    input.connect(d).connect(lp).connect(fb).connect(d);
    lp.connect(ac.destination);
    room = { ac, input };
  }
  const g = ac.createGain();
  g.gain.value = gain;
  g.connect(room.input);
  return g;
}

/** Soft "breath in": band-passed noise that swells and rises. */
function breath(ac: AudioContext, at: number, dur = 0.85, level = 0.07) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.9;
  const t = ac.currentTime + at;
  bp.frequency.setValueAtTime(500, t);
  bp.frequency.exponentialRampToValueAtTime(1700, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** Additive tone: partials [ratio, amp, decay] with an optional pitch glide. */
function tone(
  ac: AudioContext,
  dest: AudioNode,
  f: number,
  at: number,
  partials: [number, number, number][],
  opts: { glideTo?: number; glideAt?: number; attack?: number } = {},
) {
  const t = ac.currentTime + at;
  for (const [ratio, amp, decay] of partials) {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f * ratio, t);
    if (opts.glideTo) o.frequency.exponentialRampToValueAtTime(opts.glideTo * ratio, t + (opts.glideAt ?? 0.12));
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + (opts.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
}

const KALIMBA: [number, number, number][] = [
  [1, 1, 1.4],
  [5.4, 0.22, 0.25],
  [10.9, 0.06, 0.1],
];
const MARIMBA: [number, number, number][] = [
  [1, 1, 0.9],
  [4, 0.35, 0.3],
  [10, 0.08, 0.08],
];
const BOWL: [number, number, number][] = [
  [1, 1, 6],
  [1.006, 0.6, 5.5],
  [2.76, 0.45, 4],
  [2.772, 0.3, 3.6],
  [5.4, 0.18, 2.4],
  [8.93, 0.06, 1.4],
];

function knock(ac: AudioContext, dest: AudioNode, at: number) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 950;
  bp.Q.value = 6;
  const g = ac.createGain();
  const t = ac.currentTime + at;
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  src.connect(bp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + 0.1);
}

export function startRitual(id: StartSoundId) {
  if (id === "off") return;
  const ac = audio();
  if (!ac) return;
  breath(ac, 0);
  if (id === "kalimba") {
    const o = out(ac, 0.07);
    // D5 · A5 · F#5 … then Cibu's "boop" glide up to B5
    tone(ac, o, 587.33, 0.78, KALIMBA);
    tone(ac, o, 880, 0.94, KALIMBA);
    tone(ac, o, 739.99, 1.1, KALIMBA);
    tone(ac, o, 739.99, 1.36, KALIMBA, { glideTo: 987.77, glideAt: 0.14 });
  } else if (id === "marimba") {
    const o = out(ac, 0.08);
    knock(ac, o, 0.72);
    knock(ac, o, 0.84);
    tone(ac, o, 392, 1.02, MARIMBA);
    tone(ac, o, 587.33, 1.14, MARIMBA);
    tone(ac, o, 493.88, 1.2, MARIMBA);
    tone(ac, o, 783.99, 1.34, MARIMBA);
  } else if (id === "bowl") {
    const o = out(ac, 0.045);
    knock(ac, o, 0.76);
    tone(ac, o, 261.63, 0.78, BOWL, { attack: 0.01 });
  }
}

export function chime(kind: "start" | "complete" | "break" | "tap", startId: StartSoundId = "kalimba") {
  if (kind === "start") return startRitual(startId);
  const ac = audio();
  if (!ac) return;
  const o = out(ac, 0.06);
  if (kind === "complete") {
    [587.33, 739.99, 880, 1174.66].forEach((f, i) => tone(ac, o, f, i * 0.1, KALIMBA));
    tone(ac, o, 1174.66, 0.46, KALIMBA, { glideTo: 1318.5, glideAt: 0.12 });
  } else if (kind === "break") {
    tone(ac, o, 880, 0, KALIMBA);
    tone(ac, o, 659.25, 0.18, KALIMBA);
    tone(ac, o, 587.33, 0.36, KALIMBA, { glideTo: 783.99, glideAt: 0.14 });
  } else {
    tone(ac, o, 1318.5, 0, KALIMBA);
  }
}
