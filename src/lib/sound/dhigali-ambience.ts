import { generators, type Voice } from "@/lib/sound/generators";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let air: BiquadFilterNode | null = null;
let voices: Voice[] = [];
let lastStep = 0;

function layer(kind: "waves" | "wind" | "gulls", level: number) {
  if (!ctx || !master) return;
  const gain = ctx.createGain();
  gain.gain.value = level;
  gain.connect(master);
  voices.push(generators[kind](ctx, gain));
}

export const dhigaliAmbience = {
  async start() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.75;
      air = ctx.createBiquadFilter();
      air.type = "lowpass";
      air.frequency.value = 18000;
      master.connect(air).connect(ctx.destination);
      layer("waves", 0.55);
      layer("wind", 0.22);
      layer("gulls", 0.07);
    }
    await ctx.resume();
  },

  setOn(on: boolean) {
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(on ? 0.75 : 0, ctx.currentTime, 0.08);
  },

  dive(under: boolean) {
    if (!ctx || !air) return;
    air.frequency.setTargetAtTime(under ? 420 : 18000, ctx.currentTime, 0.15);
  },

  step(gap = 380) {
    if (!ctx || !master || ctx.state !== "running") return;
    const now = performance.now();
    if (now - lastStep < gap) return;
    lastStep = now;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90 + Math.random() * 40, t);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 0.1);
  },

  boom() {
    if (!ctx || !master || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.45);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 0.6);

    for (let i = 0; i < 4; i++) {
      const pop = ctx.createOscillator();
      pop.type = "triangle";
      const when = t + 0.08 + i * 0.05;
      pop.frequency.setValueAtTime(900 + Math.random() * 1400, when);
      const popEnv = ctx.createGain();
      popEnv.gain.setValueAtTime(0.0001, when);
      popEnv.gain.exponentialRampToValueAtTime(0.08, when + 0.01);
      popEnv.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
      pop.connect(popEnv).connect(master);
      pop.start(when);
      pop.stop(when + 0.14);
    }
  },

  stop() {
    for (const voice of voices) voice.stop();
    voices = [];
    void ctx?.close();
    ctx = null;
    master = null;
    air = null;
  },
};
