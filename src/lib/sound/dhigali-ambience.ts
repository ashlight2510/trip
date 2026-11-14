import { generators, type Voice } from "@/lib/sound/generators";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let air: BiquadFilterNode | null = null;
let voices: Voice[] = [];
let lastStep = 0;
let musicBus: GainNode | null = null;
let act: "none" | "duo" | "sax" = "none";
let actTimer: number | null = null;
const phrase = [262, 294, 330, 349, 392, 440, 392, 349, 330, 294, 262];

function layer(kind: "waves" | "wind" | "gulls", level: number) {
  if (!ctx || !master) return;
  const gain = ctx.createGain();
  gain.gain.value = level;
  gain.connect(master);
  voices.push(generators[kind](ctx, gain));
}

function tone(freq: number, when: number, type: OscillatorType, level: number, pan = 0, lowpass?: number) {
  if (!ctx || !musicBus) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = type === "sawtooth" ? 5.5 : 4.2;
  lfoGain.gain.value = freq * 0.012;
  lfo.connect(lfoGain).connect(osc.frequency);
  lfo.start(when);
  lfo.stop(when + 0.7);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(level, when + 0.06);
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.62);
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass ?? 2400;
  osc.connect(filter).connect(env).connect(panner).connect(musicBus);
  osc.start(when);
  osc.stop(when + 0.66);
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
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.9;
      const echo = ctx.createDelay(0.5);
      echo.delayTime.value = 0.28;
      const echoGain = ctx.createGain();
      echoGain.gain.value = 0.28;
      musicBus.connect(master);
      musicBus.connect(echo).connect(echoGain).connect(master);
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
        tone(f, t, "sine", 0.06, -0.45, 1800);
        tone(f * 1.26, t + 0.05, "triangle", 0.045, 0.45, 1600);
        tone(f, t + 0.02, "sawtooth", 0.035, 0, 1100);
        if (step % 4 === 0) tone(f / 2, t, "sine", 0.04, 0, 400);
      } else {
        tone(f * 1.5, t, "triangle", 0.055, 0.15, 1400);
        tone(f * 0.75, t, "sine", 0.03, -0.2, 500);
      }
      actTimer = window.setTimeout(play, 560);
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
    musicBus = null;
  },
};
