/**
 * Synthesizes the UI sound-design palette for the demo video as WAV files in
 * marketing/remotion/public/sfx/. Everything is generated from oscillators and
 * filtered noise — no licensed audio anywhere.
 *
 * Run automatically by `npm run studio` / `npm run render` (via sync-assets).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/sfx");

const wav = (samples) => {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
};

const seconds = (s) => Math.round(s * SR);
const env = (i, attack, decay, len) => {
  const a = Math.min(1, i / Math.max(1, attack));
  const d = Math.exp(-(Math.max(0, i - attack)) / decay);
  return i < len ? a * d : 0;
};

let noiseState = 12345;
const noise = () => {
  noiseState = (noiseState * 1103515245 + 12345) & 0x7fffffff;
  return (noiseState / 0x3fffffff) - 1;
};

/** Deep sub-bass hit with pitch drop — kinetic type slams. */
const bassHit = () => {
  const len = seconds(0.7);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 120 * Math.exp(-t * 6) + 44;
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) + 0.4 * Math.sin(phase * 2);
    const thump = noise() * Math.exp(-t * 90) * 0.5;
    out[i] = (body * 0.9 + thump) * env(i, 30, seconds(0.16), len);
  }
  return out;
};

/** Airy noise whoosh with band sweep — zoom-through transitions. */
const whoosh = () => {
  const len = seconds(0.55);
  const out = new Float32Array(len);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const cutoff = 0.03 + 0.4 * Math.pow(t, 1.6);
    lp += cutoff * (noise() - lp);
    lp2 += cutoff * (lp - lp2);
    const rise = Math.pow(t, 1.2);
    const fall = Math.pow(1 - t, 1.8);
    out[i] = lp2 * rise * fall * 5.2;
  }
  return out;
};

/** Short pitch-up blip — chat bubbles / chips popping in. */
const pop = () => {
  const len = seconds(0.16);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 380 + 620 * Math.min(1, t / 0.05);
    phase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(phase) * env(i, 18, seconds(0.035), len) * 0.7;
  }
  return out;
};

/** Compressed click + confirm blip — the buy press. */
const click = () => {
  const len = seconds(0.34);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const snap = noise() * Math.exp(-t * 300) * 0.9;
    const f = t < 0.06 ? 520 : 780;
    phase += (2 * Math.PI * f) / SR;
    const tone = Math.sin(phase) * env(i, 12, seconds(0.06), len) * 0.55;
    out[i] = snap + tone;
  }
  return out;
};

/** Dry mechanical tick — inventory counter. */
const tick = () => {
  const len = seconds(0.09);
  const out = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    lp += 0.35 * (noise() - lp);
    out[i] = lp * Math.exp(-i / seconds(0.012)) * 1.6;
  }
  return out;
};

/** Heavy stamp: bass + noise burst + metallic ring — SOLD OUT. */
const stamp = () => {
  const len = seconds(0.9);
  const out = new Float32Array(len);
  let phase = 0, phase2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 90 * Math.exp(-t * 9) + 38;
    phase += (2 * Math.PI * f) / SR;
    phase2 += (2 * Math.PI * 1318) / SR;
    const body = Math.sin(phase) * 1.1;
    const burst = noise() * Math.exp(-t * 55) * 0.8;
    const ring = Math.sin(phase2) * Math.exp(-t * 10) * 0.12;
    out[i] = (body + burst + ring) * env(i, 20, seconds(0.22), len);
  }
  return out;
};

/** Soft rising shimmer — outro logo reveal. */
const shimmer = () => {
  const len = seconds(1.4);
  const out = new Float32Array(len);
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    freqs.forEach((f, k) => {
      const start = k * 0.09;
      if (t > start) {
        const lt = t - start;
        v += Math.sin(2 * Math.PI * f * lt) * Math.exp(-lt * 3.2) * 0.16;
      }
    });
    out[i] = v * Math.min(1, i / 400);
  }
  return out;
};

/** Cash-register style confirm: two quick ascending blips. */
const cha = () => {
  const len = seconds(0.42);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    [[0, 880], [0.09, 1174.66]].forEach(([start, f]) => {
      if (t > start) {
        const lt = t - start;
        v += Math.sin(2 * Math.PI * f * lt) * Math.exp(-lt * 22) * 0.5;
      }
    });
    out[i] = v;
  }
  return out;
};

mkdirSync(OUT, { recursive: true });
const bank = { bass_hit: bassHit, whoosh, pop, click, tick, stamp, shimmer, cha };
for (const [name, gen] of Object.entries(bank)) {
  writeFileSync(path.join(OUT, `${name}.wav`), wav(gen()));
  console.log(`sfx: ${name}.wav`);
}
