/**
 * Built-in focus soundscapes, generated live with Web Audio (no files, no
 * lyrics, no melody to follow): rain on leaves, deep brown noise, and a
 * quiet forest. Optional "focus pulse" adds a subtle ~14 Hz amplitude
 * modulation — inspired by, not equivalent to, Brain.fm's approach.
 */
import { audio } from "./sound";

export type SoundscapeId = "off" | "rain" | "brown" | "forest";

type Voice = { stop: (at: number) => void };

let master: GainNode | null = null;
let pulseGain: GainNode | null = null;
let pulseLfo: OscillatorNode | null = null;
let voices: Voice[] = [];
let timers: number[] = [];
let current: SoundscapeId = "off";
let targetVolume = 0.5;

function makeNoise(ac: AudioContext, kind: "white" | "pink" | "brown", seconds = 4) {
  const buf = ac.createBuffer(2, ac.sampleRate * seconds, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.5;
      else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
  }
  return buf;
}

function loop(ac: AudioContext, buf: AudioBuffer, dest: AudioNode, chain: (src: AudioNode) => AudioNode, gain: number): Voice {
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ac.createGain();
  g.gain.value = gain;
  chain(src).connect(g).connect(dest);
  src.start();
  return { stop: (at) => src.stop(at) };
}

function filt(ac: AudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Slow wobble on a gain param (wind gusts, waves). */
function wobble(ac: AudioContext, param: AudioParam, rate: number, depth: number): Voice {
  const lfo = ac.createOscillator();
  lfo.frequency.value = rate;
  const g = ac.createGain();
  g.gain.value = depth;
  lfo.connect(g).connect(param);
  lfo.start();
  return { stop: (at) => lfo.stop(at) };
}

function drip(ac: AudioContext, dest: AudioNode) {
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const f = 1400 + Math.random() * 2200;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.05);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.02 + Math.random() * 0.03, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  const pan = ac.createStereoPanner();
  pan.pan.value = Math.random() * 2 - 1;
  o.connect(g).connect(pan).connect(dest);
  o.start(t);
  o.stop(t + 0.1);
}

function chirp(ac: AudioContext, dest: AudioNode) {
  const t = ac.currentTime;
  const base = 2600 + Math.random() * 1600;
  const n = 2 + Math.floor(Math.random() * 3);
  const pan = ac.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  pan.connect(dest);
  for (let i = 0; i < n; i++) {
    const s = t + i * (0.09 + Math.random() * 0.05);
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(base, s);
    o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), s + 0.06);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.012, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.08);
    o.connect(g).connect(pan);
    o.start(s);
    o.stop(s + 0.1);
  }
}

function every(minMs: number, maxMs: number, fn: () => void) {
  const tick = () => {
    fn();
    timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
  };
  timers.push(window.setTimeout(tick, minMs));
}

function build(ac: AudioContext, id: SoundscapeId, dest: AudioNode) {
  if (id === "rain") {
    voices.push(loop(ac, makeNoise(ac, "pink"), dest, (s) => s.connect(filt(ac, "highpass", 450)).connect(filt(ac, "lowpass", 6500)), 0.55));
    voices.push(loop(ac, makeNoise(ac, "brown"), dest, (s) => s.connect(filt(ac, "lowpass", 220)), 0.35));
    every(60, 260, () => drip(ac, dest));
  } else if (id === "brown") {
    const g = ac.createGain();
    g.gain.value = 0.8;
    g.connect(dest);
    voices.push(loop(ac, makeNoise(ac, "brown", 6), g, (s) => s.connect(filt(ac, "lowpass", 900)), 0.9));
    voices.push(wobble(ac, g.gain, 0.07, 0.18));
  } else if (id === "forest") {
    const wind = ac.createGain();
    wind.gain.value = 0.35;
    wind.connect(dest);
    voices.push(loop(ac, makeNoise(ac, "pink"), wind, (s) => s.connect(filt(ac, "bandpass", 1800, 0.5)), 0.6));
    voices.push(wobble(ac, wind.gain, 0.09, 0.2));
    voices.push(loop(ac, makeNoise(ac, "brown"), dest, (s) => s.connect(filt(ac, "lowpass", 300)), 0.25));
    every(2500, 7000, () => chirp(ac, dest));
  }
}

function teardown(at: number) {
  voices.forEach((v) => {
    try {
      v.stop(at);
    } catch {
      /* already stopped */
    }
  });
  voices = [];
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

export const soundscape = {
  get playing() {
    return current !== "off";
  },
  get current() {
    return current;
  },

  play(id: SoundscapeId, volume = targetVolume, pulse = false) {
    const ac = audio();
    if (!ac || id === "off") return this.stop();
    targetVolume = volume;
    if (id === current && master) {
      master.gain.setTargetAtTime(volume * 0.6, ac.currentTime, 0.3);
      this.setPulse(pulse);
      return;
    }
    const now = ac.currentTime;
    if (master) {
      const old = master;
      old.gain.setTargetAtTime(0, now, 0.25);
      teardown(now + 1.2);
      setTimeout(() => old.disconnect(), 1400);
    }
    master = ac.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.setTargetAtTime(volume * 0.6, now, 0.8); // slow fade in
    pulseGain = ac.createGain();
    pulseGain.gain.value = 1;
    pulseGain.connect(master).connect(ac.destination);
    build(ac, id, pulseGain);
    current = id;
    this.setPulse(pulse);
  },

  setVolume(v: number) {
    targetVolume = v;
    const ac = audio();
    if (ac && master) master.gain.setTargetAtTime(v * 0.6, ac.currentTime, 0.1);
  },

  /** subtle ~14 Hz amplitude modulation (beta range), depth ±10% */
  setPulse(on: boolean) {
    const ac = audio();
    if (!ac || !pulseGain) return;
    if (on && !pulseLfo) {
      pulseLfo = ac.createOscillator();
      pulseLfo.frequency.value = 14;
      const depth = ac.createGain();
      depth.gain.value = 0.1;
      pulseLfo.connect(depth).connect(pulseGain.gain);
      pulseLfo.start();
    } else if (!on && pulseLfo) {
      pulseLfo.stop();
      pulseLfo = null;
    }
  },

  stop(fadeSec = 1.2) {
    const ac = audio();
    if (!ac || !master) {
      current = "off";
      return;
    }
    const m = master;
    m.gain.setTargetAtTime(0, ac.currentTime, fadeSec / 4);
    teardown(ac.currentTime + fadeSec + 0.3);
    if (pulseLfo) {
      pulseLfo.stop(ac.currentTime + fadeSec + 0.3);
      pulseLfo = null;
    }
    setTimeout(() => m.disconnect(), (fadeSec + 0.5) * 1000);
    master = null;
    pulseGain = null;
    current = "off";
  },
};
