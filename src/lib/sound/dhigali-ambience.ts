import { generators, type Voice } from "@/lib/sound/generators";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let air: BiquadFilterNode | null = null;
let voices: Voice[] = [];
let lastStep = 0;
let act: "none" | "duo" | "sax" = "none";
let actTimer: number | null = null;
const phrase = [262, 294, 330, 349, 392, 440, 392, 349, 330, 294];

function layer(kind: "waves" | "wind" | "gulls", level: number) {
  if (!ctx || !master) return;
  const gain = ctx.createGain();
  gain.gain.value = level;
  gain.connect(master);
  voices.push(generators[kind](ctx, gain));
}

function tone(freq: number, when: number, type: OscillatorType, level: number, lowpass?: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(level, when + 0.04);
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.42);
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    osc.connect(filter).connect(env).connect(master);
  } else {
    osc.connect(env).connect(master);
  }
  osc.start(when);
  osc.stop(when + 0.46);
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

  setAct(next: "none" | "duo" | "sax") {
    if (next === act) return;
    act = next;
    if (actTimer != null) window.clearTimeout(actTimer);
    actTimer = null;
    if (next === "none" || !ctx || !master) return;
    let step = 0;
    const play = () => {
      if (act !== next || !ctx || !master) return;
      const t = ctx.currentTime;
      const f = phrase[step % phrase.length]!;
      step += 1;
      if (next === "duo") {
        tone(f, t, "sine", 0.07);
        tone(f * 1.25, t + 0.03, "triangle", 0.045);
        tone(f, t + 0.04, "sawtooth", 0.04, 1400);
      } else {
        tone(f * 1.5, t, "sawtooth", 0.05, 900);
      }
      actTimer = window.setTimeout(play, 480);
    };
    play();
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
    act = "none";
    if (actTimer != null) window.clearTimeout(actTimer);
    actTimer = null;
    for (const voice of voices) voice.stop();
    voices = [];
    void ctx?.close();
    ctx = null;
    master = null;
    air = null;
  },
};
