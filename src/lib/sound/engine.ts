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

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private scene: Scene | null = null;
  private heading = 0;
  private volume = 0.8;

  get running() {
    return this.ctx?.state === "running";
  }

  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    await this.ctx.resume();
  }

  setScene(specs: LayerSpec[], fadeSeconds = 2.5) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const now = ctx.currentTime;
    const old = this.scene;
    if (old) {
      old.bus.gain.cancelScheduledValues(now);
      old.bus.gain.setValueAtTime(old.bus.gain.value, now);
      old.bus.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      window.setTimeout(() => {
        old.layers.forEach((l) => l.stop());
        old.bus.disconnect();
      }, fadeSeconds * 1000 + 200);
    }

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
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  fadeOut(seconds: number) {
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + seconds);
    }
  }

  async close() {
    this.scene?.layers.forEach((l) => l.stop());
    this.scene = null;
    await this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
