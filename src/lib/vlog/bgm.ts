/**
 * Procedural vlog BGM — Web Audio only, no sample files / no third-party music.
 * Add a preset here, then set `film.bgm = "autumn"` (or `{ preset, volume }`).
 */

export type VlogBgmPreset = "autumn" | "winter" | "calm" | "sea";

export type VlogBgmConfig = {
  preset: VlogBgmPreset;
  /** Master level 0–1. Default ~0.18 so TTS stays clear. */
  volume?: number;
};

type PresetSpec = {
  /** Root MIDI-ish freqs for soft pad chords (Hz). */
  chords: number[][];
  chordSeconds: number;
  /** Soft high noise bed (leaves / air). */
  air: number;
  /** Occasional quiet pluck arpeggio. */
  pluck: boolean;
};

const PRESETS: Record<VlogBgmPreset, PresetSpec> = {
  autumn: {
    chords: [
      [196, 247, 294, 392], // G minor-ish soft
      [175, 220, 262, 349], // F
      [165, 208, 262, 330], // E♭ / feel
      [147, 196, 247, 294], // D
    ],
    chordSeconds: 6.5,
    air: 0.04,
    pluck: true,
  },
  winter: {
    chords: [
      [174.6, 220, 261.6, 349.2], // F open
      [146.8, 196, 233.1, 293.7], // D minor soft
      [130.8, 164.8, 196, 261.6], // C
      [155.6, 196, 233.1, 311.1], // E♭
    ],
    chordSeconds: 7.5,
    air: 0.035,
    pluck: false,
  },
  calm: {
    chords: [
      [220, 277, 330, 440],
      [196, 247, 294, 392],
      [175, 220, 262, 349],
      [165, 208, 247, 330],
    ],
    chordSeconds: 7.2,
    air: 0.02,
    pluck: false,
  },
  sea: {
    chords: [
      [147, 185, 220, 294],
      [131, 165, 196, 262],
      [165, 196, 247, 330],
      [110, 147, 185, 220],
    ],
    chordSeconds: 8,
    air: 0.05,
    pluck: false,
  },
};

function holdGain(param: AudioParam, now: number) {
  if (typeof param.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(now);
  } else {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
  }
}

/** Soft pad chord into `out`. */
function playChord(ctx: AudioContext, out: AudioNode, freqs: number[], when: number, seconds: number) {
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const detune = ctx.createOscillator();
    detune.type = "sine";
    detune.frequency.value = freq * 1.003;
    const mix = ctx.createGain();
    mix.gain.value = 0.045 / freqs.length;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(1, when + 1.4);
    env.gain.setValueAtTime(1, when + seconds - 1.6);
    env.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1200;
    osc.connect(mix);
    detune.connect(mix);
    mix.connect(env).connect(lp).connect(out);
    osc.start(when);
    detune.start(when);
    osc.stop(when + seconds + 0.05);
    detune.stop(when + seconds + 0.05);
  }
}

function playPluck(ctx: AudioContext, out: AudioNode, freq: number, when: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(0.035, when + 0.03);
  env.gain.exponentialRampToValueAtTime(0.0001, when + 1.4);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1800;
  osc.connect(env).connect(lp).connect(out);
  osc.start(when);
  osc.stop(when + 1.5);
}

function pinkNoiseBuffer(ctx: AudioContext, seconds = 2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.99 * b2 + white * 1.0526913;
    data[i] = b0 + b1 + b2 + white * 0.1848;
  }
  return buffer;
}

export class VlogBgm {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private air: AudioBufferSourceNode | null = null;
  private timer: number | null = null;
  private chordIndex = 0;
  private config: VlogBgmConfig;
  private wanted = false;
  private muted = false;

  constructor(config: VlogBgmConfig) {
    this.config = config;
  }

  get preset() {
    return this.config.preset;
  }

  async ensure() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const bus = ctx.createGain();
    bus.gain.value = 1;
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.42;
    const echoGain = ctx.createGain();
    echoGain.gain.value = 0.22;
    bus.connect(master);
    bus.connect(echo).connect(echoGain).connect(master);
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.bus = bus;

    const spec = PRESETS[this.config.preset];
    if (spec.air > 0) {
      const src = ctx.createBufferSource();
      src.buffer = pinkNoiseBuffer(ctx, 3);
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value =
        this.config.preset === "sea" ? 420 : this.config.preset === "winter" ? 900 : 2400;
      bp.Q.value = 0.7;
      const airGain = ctx.createGain();
      airGain.gain.value = spec.air;
      src.connect(bp).connect(airGain).connect(bus);
      src.start();
      this.air = src;
    }
  }

  private level() {
    return this.config.volume ?? 0.18;
  }

  private scheduleLoop() {
    if (!this.ctx || !this.bus || this.timer != null) return;
    const spec = PRESETS[this.config.preset];
    const tick = () => {
      if (!this.ctx || !this.bus || !this.wanted || this.muted) {
        this.timer = null;
        return;
      }
      const when = this.ctx.currentTime + 0.05;
      const chord = spec.chords[this.chordIndex % spec.chords.length];
      playChord(this.ctx, this.bus, chord, when, spec.chordSeconds + 0.4);
      if (spec.pluck) {
        const mid = chord[2] ?? chord[0];
        playPluck(this.ctx, this.bus, mid * 2, when + 2.1);
        playPluck(this.ctx, this.bus, (chord[1] ?? mid) * 2, when + 3.6);
      }
      this.chordIndex += 1;
      this.timer = window.setTimeout(tick, spec.chordSeconds * 1000);
    };
    tick();
  }

  private clearTimer() {
    if (this.timer != null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Start / keep playing under narration. Safe to call on every play. */
  async play() {
    this.wanted = true;
    await this.ensure();
    if (!this.ctx || !this.master) return;
    await this.ctx.resume();
    if (this.muted) return;
    const now = this.ctx.currentTime;
    holdGain(this.master.gain, now);
    this.master.gain.linearRampToValueAtTime(this.level(), now + 1.2);
    this.scheduleLoop();
  }

  /** Soft pause (keep graph; fade down). */
  pause() {
    this.wanted = false;
    this.clearTimer();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    holdGain(this.master.gain, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.6);
  }

  setMuted(muted: boolean) {
    const wasWanted = this.wanted;
    this.muted = muted;
    if (muted) {
      this.clearTimer();
      if (this.ctx && this.master) {
        const now = this.ctx.currentTime;
        holdGain(this.master.gain, now);
        this.master.gain.linearRampToValueAtTime(0, now + 0.4);
      }
      this.wanted = wasWanted;
    } else if (wasWanted) {
      void this.play();
    }
  }

  get isMuted() {
    return this.muted;
  }

  async dispose() {
    this.wanted = false;
    this.clearTimer();
    try {
      this.air?.stop();
    } catch {
      /* already stopped */
    }
    this.air = null;
    await this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.bus = null;
  }
}

export function resolveBgmConfig(input: PhotoVlogFilmBgm | undefined): VlogBgmConfig | null {
  if (!input) return null;
  if (typeof input === "string") return { preset: input };
  return { preset: input.preset, volume: input.volume };
}

/** Film field shape (kept here to avoid a circular types import for authors). */
export type PhotoVlogFilmBgm = VlogBgmPreset | VlogBgmConfig;
