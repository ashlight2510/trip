export type NoiseColor = "white" | "pink" | "brown";

const cache = new WeakMap<BaseAudioContext, Map<NoiseColor, AudioBuffer>>();

function fill(color: NoiseColor, data: Float32Array) {
  if (color === "white") {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } else if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last;
    }
  }

  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] /= peak;
}

function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor) {
  let byColor = cache.get(ctx);
  if (!byColor) {
    byColor = new Map();
    cache.set(ctx, byColor);
  }
  let buffer = byColor.get(color);
  if (!buffer) {
    const seconds = 6;
    buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) fill(color, buffer.getChannelData(ch));
    byColor.set(color, buffer);
  }
  return buffer;
}

export function noiseSource(ctx: BaseAudioContext, color: NoiseColor) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, color);
  src.loop = true;
  src.start(0, Math.random() * src.buffer.duration);
  return src;
}
