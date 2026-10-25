import { noiseSource } from "./noise";

export type SoundKind =
  | "waves"
  | "gulls"
  | "wind"
  | "birds"
  | "leaves"
  | "cafe"
  | "market";

export interface Voice {
  stop(): void;
}

type Generator = (ctx: AudioContext, out: AudioNode) => Voice;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function lfo(ctx: AudioContext, freq: number, depth: number, ...targets: AudioParam[]) {
  const osc = ctx.createOscillator();
  osc.frequency.value = freq;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  osc.connect(amount);
  for (const t of targets) amount.connect(t);
  osc.start(ctx.currentTime + rand(0, 1 / freq));
  return osc;
}

function filter(ctx: AudioContext, type: BiquadFilterType, frequency: number, Q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
}

function gain(ctx: AudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function voice(nodes: AudioScheduledSourceNode[], timers: { stopped: boolean; ids: number[] } = { stopped: false, ids: [] }): Voice {
  return {
    stop() {
      timers.stopped = true;
      timers.ids.forEach((id) => clearTimeout(id));
      for (const n of nodes) {
        try {
          n.stop();
        } catch {}
      }
    },
  };
}

function repeat(timers: { stopped: boolean; ids: number[] }, minMs: number, maxMs: number, fn: () => void) {
  const tick = () => {
    if (timers.stopped) return;
    fn();
    timers.ids = [window.setTimeout(tick, rand(minMs, maxMs))];
  };
  timers.ids = [window.setTimeout(tick, rand(0, maxMs * 0.5))];
}

const waves: Generator = (ctx, out) => {
  const body = noiseSource(ctx, "brown");
  const bodyLp = filter(ctx, "lowpass", 600, 0.3);
  const bodyAmp = gain(ctx, 0.5);
  body.connect(bodyLp).connect(bodyAmp).connect(out);

  const foam = noiseSource(ctx, "pink");
  const foamHp = filter(ctx, "highpass", 1800);
  const foamAmp = gain(ctx, 0.08);
  foam.connect(foamHp).connect(foamAmp).connect(out);

  const swell = lfo(ctx, 0.085, 0.32, bodyAmp.gain);
  const swellBright = lfo(ctx, 0.085, 450, bodyLp.frequency);
  const foamSwell = lfo(ctx, 0.085, 0.07, foamAmp.gain);
  const drift = lfo(ctx, 0.031, 0.15, bodyAmp.gain);

  return voice([body, foam, swell, swellBright, foamSwell, drift]);
};

const gulls: Generator = (ctx, out) => {
  const timers = { stopped: false, ids: [] as number[] };
  repeat(timers, 5000, 14000, () => {
    const calls = Math.floor(rand(2, 5));
    const base = rand(1300, 1700);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.7, 0.7);
    pan.connect(out);
    for (let i = 0; i < calls; i++) {
      const t = ctx.currentTime + 0.05 + i * rand(0.32, 0.42);
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(base * 1.15, t);
      osc.frequency.exponentialRampToValueAtTime(base * 0.62, t + 0.28);
      const bp = filter(ctx, "bandpass", base, 3);
      const env = gain(ctx, 0);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.09, t + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
      osc.connect(bp).connect(env).connect(pan);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  });
  return voice([], timers);
};

const wind: Generator = (ctx, out) => {
  const src = noiseSource(ctx, "pink");
  const bp = filter(ctx, "bandpass", 500, 0.6);
  const amp = gain(ctx, 0.45);
  src.connect(bp).connect(amp).connect(out);
  const gust = lfo(ctx, 0.07, 260, bp.frequency);
  const gustAmp = lfo(ctx, 0.11, 0.3, amp.gain);
  const slow = lfo(ctx, 0.023, 0.12, amp.gain);
  return voice([src, gust, gustAmp, slow]);
};

const birds: Generator = (ctx, out) => {
  const timers = { stopped: false, ids: [] as number[] };
  repeat(timers, 900, 4500, () => {
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.8, 0.8);
    pan.connect(out);
    const notes = Math.floor(rand(1, 6));
    const base = rand(2400, 4800);
    const step = rand(0.09, 0.15);
    const osc = ctx.createOscillator();
    const env = gain(ctx, 0);
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < notes; i++) {
      const t = t0 + i * step;
      osc.frequency.setValueAtTime(base * rand(0.9, 1.25), t);
      osc.frequency.exponentialRampToValueAtTime(base * rand(0.7, 1.5), t + step * 0.7);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.07, t + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0008, t + step * 0.8);
    }
    osc.connect(env).connect(pan);
    osc.start(t0);
    osc.stop(t0 + notes * step + 0.05);
  });
  return voice([], timers);
};

const leaves: Generator = (ctx, out) => {
  const src = noiseSource(ctx, "white");
  const hp = filter(ctx, "highpass", 2800);
  const amp = gain(ctx, 0.12);
  src.connect(hp).connect(amp).connect(out);
  const sway = lfo(ctx, 0.17, 0.08, amp.gain);
  const flutter = lfo(ctx, 1.3, 0.025, amp.gain);

  const timers = { stopped: false, ids: [] as number[] };
  repeat(timers, 2500, 9000, () => {
    const t = ctx.currentTime + 0.05;
    const knocks = Math.floor(rand(1, 4));
    for (let i = 0; i < knocks; i++) {
      const at = t + i * rand(0.08, 0.2);
      const osc = ctx.createOscillator();
      osc.frequency.value = rand(280, 520);
      const env = gain(ctx, 0);
      env.gain.setValueAtTime(0.05, at);
      env.gain.exponentialRampToValueAtTime(0.0005, at + 0.12);
      osc.connect(env).connect(out);
      osc.start(at);
      osc.stop(at + 0.14);
    }
  });
  return voice([src, sway, flutter], timers);
};

function murmur(ctx: AudioContext, out: AudioNode, bands: number[], level: number, speed: number) {
  const nodes: AudioScheduledSourceNode[] = [];
  for (const freq of bands) {
    const src = noiseSource(ctx, "pink");
    const bp = filter(ctx, "bandpass", freq, 1.1);
    const amp = gain(ctx, level);
    src.connect(bp).connect(amp).connect(out);
    nodes.push(
      src,
      lfo(ctx, rand(0.6, 1.1) * speed, level * 0.35, amp.gain),
      lfo(ctx, rand(1.7, 2.6) * speed, level * 0.25, amp.gain),
      lfo(ctx, rand(0.2, 0.4), level * 0.2, amp.gain),
    );
  }
  return nodes;
}

function clink(ctx: AudioContext, out: AudioNode, level: number) {
  const t = ctx.currentTime + 0.05;
  const base = rand(2400, 3400);
  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.6, 0.6);
  pan.connect(out);
  for (const ratio of [1, 1.58, 2.33]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = base * ratio;
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(level / ratio, t);
    env.gain.exponentialRampToValueAtTime(0.0003, t + rand(0.25, 0.5));
    osc.connect(env).connect(pan);
    osc.start(t);
    osc.stop(t + 0.55);
  }
}

const cafe: Generator = (ctx, out) => {
  const nodes = murmur(ctx, out, [450, 900], 0.22, 1);
  const timers = { stopped: false, ids: [] as number[] };
  repeat(timers, 1800, 6500, () => clink(ctx, out, 0.035));

  const steam = { stopped: false, ids: [] as number[] };
  repeat(steam, 18000, 40000, () => {
    const t = ctx.currentTime + 0.05;
    const src = noiseSource(ctx, "white");
    const hp = filter(ctx, "highpass", 3500);
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.05, t + 0.3);
    env.gain.setValueAtTime(0.05, t + 2);
    env.gain.linearRampToValueAtTime(0, t + 2.6);
    src.connect(hp).connect(env).connect(out);
    src.stop(t + 2.7);
  });

  const v = voice(nodes, timers);
  return {
    stop() {
      v.stop();
      voice([], steam).stop();
    },
  };
};

const market: Generator = (ctx, out) => {
  const nodes = murmur(ctx, out, [380, 800, 1500], 0.26, 1.6);
  const timers = { stopped: false, ids: [] as number[] };
  repeat(timers, 400, 2200, () => {
    if (Math.random() < 0.35) {
      clink(ctx, out, 0.03);
      return;
    }
    const t = ctx.currentTime + 0.05;
    const src = noiseSource(ctx, "white");
    const bp = filter(ctx, "bandpass", rand(900, 2600), 2);
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0.12, t);
    env.gain.exponentialRampToValueAtTime(0.0005, t + rand(0.04, 0.12));
    src.connect(bp).connect(env).connect(out);
    src.stop(t + 0.15);
  });
  return voice(nodes, timers);
};

export const generators: Record<SoundKind, Generator> = {
  waves,
  gulls,
  wind,
  birds,
  leaves,
  cafe,
  market,
};

export const soundLabels: Record<SoundKind, string> = {
  waves: "파도",
  gulls: "갈매기",
  wind: "바람",
  birds: "새소리",
  leaves: "대숲·나뭇잎",
  cafe: "카페",
  market: "시장",
};
