import { generators, type SoundKind, type Voice } from "./generators";

export interface LayerSpec {
  kind: SoundKind;
  gain: number;
  /** Compass bearing (0 = north, clockwise) the sound comes from. Omit for surround ambience. */
  bearing?: number;
  label?: string;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

class Layer {
  private readonly level: GainNode;
  private readonly shade: BiquadFilterNode;
  private readonly pan: StereoPannerNode;
  private readonly voice: Voice;

  constructor(
    private readonly ctx: AudioContext,
    readonly spec: LayerSpec,
    dest: AudioNode,
    heading: number,
  ) {
    const input = ctx.createGain();
    this.shade = ctx.createBiquadFilter();
    this.shade.type = "lowpass";
    this.shade.frequency.value = 20000;
    this.pan = ctx.createStereoPanner();
    this.level = ctx.createGain();
    this.level.gain.value = spec.gain;
    input.connect(this.shade).connect(this.pan).connect(this.level).connect(dest);
    this.voice = generators[spec.kind](ctx, input);
    this.orient(heading, true);
  }

  orient(heading: number, immediate = false) {
    if (this.spec.bearing === undefined) return;
    const rel = toRad(this.spec.bearing - heading);
    const facing = (Math.cos(rel) + 1) / 2;
    const t = this.ctx.currentTime;
    const smooth = immediate ? 0 : 0.08;
    this.pan.pan.setTargetAtTime(Math.sin(rel) * 0.85, t, smooth);
    this.level.gain.setTargetAtTime(this.spec.gain * (0.35 + 0.65 * facing), t, smooth);
    this.shade.frequency.setTargetAtTime(900 + facing * facing * 17000, t, smooth);
  }

  stop() {
    this.voice.stop();
  }
}

interface Scene {
  bus: GainNode;
  layers: Layer[];
}

function holdGain(param: AudioParam, now: number) {
  if (typeof param.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(now);
  } else {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
  }
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private scene: Scene | null = null;
  private heading = 0;
  private volume = 0.8;
  private muted = false;
  private lastSpecs: LayerSpec[] = [];
  private muteTimer: number | null = null;

  get running() {
    return this.ctx?.state === "running";
  }

  get isMuted() {
    return this.muted;
  }

  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (!this.muted) await this.ctx.resume();
  }

  setScene(specs: LayerSpec[], fadeSeconds = 2.5) {
    this.lastSpecs = specs;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    this.clearScene(fadeSeconds);

    if (this.muted) return;

    const now = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + fadeSeconds);
    bus.connect(master);
    this.scene = { bus, layers: specs.map((s) => new Layer(ctx, s, bus, this.heading)) };
  }

  setHeading(deg: number) {
    this.heading = deg;
    this.scene?.layers.forEach((l) => l.orient(deg));
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.muted || !this.ctx || !this.master) return;
    holdGain(this.master.gain, this.ctx.currentTime);
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Mute stops generators after the fade so nothing keeps ticking in the background. */
  async setMuted(muted: boolean, fadeSeconds = 1.5) {
    if (this.muteTimer !== null) {
      window.clearTimeout(this.muteTimer);
      this.muteTimer = null;
    }

    this.muted = muted;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const now = ctx.currentTime;
    holdGain(master.gain, now);

    if (muted) {
      master.gain.linearRampToValueAtTime(0, now + Math.max(0.05, fadeSeconds));
      this.muteTimer = window.setTimeout(() => {
        this.muteTimer = null;
        if (!this.muted) return;
        this.clearScene(0);
        void ctx.suspend();
      }, Math.max(0.05, fadeSeconds) * 1000 + 50);
    } else {
      master.gain.linearRampToValueAtTime(this.volume, now + Math.max(0.05, fadeSeconds));
      await ctx.resume();
      if (!this.scene && this.lastSpecs.length) this.setScene(this.lastSpecs, fadeSeconds);
    }
  }

  /** @deprecated use setMuted(true) */
  fadeOut(seconds: number) {
    void this.setMuted(true, seconds);
  }

  private clearScene(fadeSeconds: number) {
    const ctx = this.ctx;
    const old = this.scene;
    this.scene = null;
    if (!old || !ctx) return;

    if (fadeSeconds <= 0) {
      old.layers.forEach((l) => l.stop());
      old.bus.disconnect();
      return;
    }

    const now = ctx.currentTime;
    old.bus.gain.cancelScheduledValues(now);
    old.bus.gain.setValueAtTime(old.bus.gain.value, now);
    old.bus.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    window.setTimeout(() => {
      old.layers.forEach((l) => l.stop());
      old.bus.disconnect();
    }, fadeSeconds * 1000 + 200);
  }

  async close() {
    if (this.muteTimer !== null) {
      window.clearTimeout(this.muteTimer);
      this.muteTimer = null;
    }
    this.clearScene(0);
    this.lastSpecs = [];
    await this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
