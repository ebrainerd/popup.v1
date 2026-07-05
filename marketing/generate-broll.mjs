/**
 * Generate cinematic ceramic-studio b-roll for the PopUp product demo video
 * using Veo 3.1 (Gemini API). Image-to-video shots start from the demo photos
 * in public/marketing/demo/ so the footage stays on-brand.
 *
 * Usage:
 *   GEMINI_API_KEY=... node marketing/generate-broll.mjs            # all shots
 *   GEMINI_API_KEY=... node marketing/generate-broll.mjs wheel kiln # subset
 *
 * Output: marketing/video/broll/<shot>.mp4 (16:9, 1080p, 8s, native audio)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMO = path.join(ROOT, "public/marketing/demo");
const OUT_DIR = path.join(ROOT, "marketing/video/broll");
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = "veo-3.1-generate-preview";

const STYLE =
  "Cinematic, shallow depth of field, warm natural light, filmic color grade, " +
  "soft highlight rolloff, fine film grain, premium brand commercial. No text, no captions, no watermarks, no logos.";

/** @type {Record<string, {prompt: string, image?: string}>} */
const SHOTS = {
  // Hero shot: continues from the exact stream placeholder used in the app.
  wheel: {
    image: path.join(DEMO, "stream.jpg"),
    prompt:
      "Slow, steady push-in on a ceramicist's hands shaping wet clay on a spinning pottery wheel in a cozy home studio. " +
      "The clay walls rise gently under her fingertips, wet slip glistening, wheel spinning smoothly. " +
      "Quiet ambience: soft wheel hum, wet clay sounds. " +
      STYLE,
  },
  // Shelf parallax: continues from the Mini Vase Set product photo.
  shelf: {
    image: path.join(DEMO, "vase.jpg"),
    prompt:
      "Slow lateral dolly with gentle parallax across a wooden shelf of handmade ceramic cups and vases on a warm cream wall, " +
      "soft morning window light raking across the glazes, dust motes drifting. Nothing moves except the camera. " +
      STYLE,
  },
  // Macro glaze/kiln shot (text-to-video, no good source still).
  kiln: {
    prompt:
      "Extreme macro shot inside a dim ceramics studio: molten glossy glaze slowly dripping down the shoulder of a bisque-fired vase, " +
      "lit by deep warm kiln glow like embers, tiny specks of reflected orange light, very shallow depth of field, dark moody background. " +
      STYLE,
  },
  // Finished-piece payoff shot in warm home light.
  mug: {
    prompt:
      "A woman's hands gently pick up a finished speckled ceramic mug with cream glaze from a sunlit wooden kitchen table, " +
      "slow motion, she turns it slightly to admire the speckle pattern, warm golden morning home light, steam rising from coffee nearby. " +
      STYLE,
  },
  // Dark moody product beauty shot: continues from the Ocean Glaze Bowl photo.
  bowls: {
    prompt:
      "Very slow orbital drift around a stack of dark metallic-glazed handmade ceramic bowls on black crumpled paper, " +
      "a single soft key light slowly intensifying, glints traveling across the iridescent glaze, dark moody editorial still-life. " +
      STYLE,
    image: path.join(DEMO, "bowl.jpg"),
  },
};

async function startShot(name, shot) {
  const instance = { prompt: shot.prompt };
  if (shot.image) {
    instance.image = {
      bytesBase64Encoded: readFileSync(shot.image).toString("base64"),
      mimeType: shot.image.endsWith(".png") ? "image/png" : "image/jpeg",
    };
  }
  // The Veo preview tier is heavily rate-limited (requests/minute), so retry
  // 429s with a long backoff instead of failing the shot.
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE}/models/${VEO_MODEL}:predictLongRunning`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          aspectRatio: "16:9",
          resolution: "1080p",
          durationSeconds: 8,
          negativePrompt:
            "text, captions, subtitles, watermark, logo, ui, interface, cartoon, low quality, deformed hands",
        },
      }),
    });
    const body = await res.json();
    if (res.status === 429 && attempt <= 20) {
      const wait = Math.min(60_000 * attempt, 300_000);
      console.log(`[${name}] rate-limited, retrying in ${wait / 1000}s (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`${name}: start failed ${res.status} ${JSON.stringify(body)}`);
    console.log(`[${name}] started: ${body.name}`);
    return body.name;
  }
}

async function pollOperation(name, opName) {
  for (;;) {
    await new Promise((r) => setTimeout(r, 10_000));
    const res = await fetch(`${BASE}/${opName}`, {
      headers: { "x-goog-api-key": API_KEY },
    });
    const body = await res.json();
    if (body.error) throw new Error(`${name}: ${JSON.stringify(body.error)}`);
    if (body.done) {
      const sample =
        body.response?.generateVideoResponse?.generatedSamples?.[0] ??
        body.response?.generatedVideos?.[0];
      const uri = sample?.video?.uri;
      if (!uri) throw new Error(`${name}: no video in response ${JSON.stringify(body.response)}`);
      return uri;
    }
    console.log(`[${name}] generating...`);
  }
}

async function download(name, uri) {
  const res = await fetch(uri, { headers: { "x-goog-api-key": API_KEY }, redirect: "follow" });
  if (!res.ok) throw new Error(`${name}: download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(OUT_DIR, `${name}.mp4`);
  writeFileSync(file, buf);
  console.log(`[${name}] saved ${file} (${(buf.length / 1e6).toFixed(1)} MB)`);
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const requested = process.argv.slice(2);
  const names = requested.length ? requested : Object.keys(SHOTS);
  let failed = false;
  // Sequential: the preview tier only allows a couple of requests per minute.
  for (const name of names) {
    try {
      const shot = SHOTS[name];
      if (!shot) throw new Error(`unknown shot "${name}"`);
      if (existsSync(path.join(OUT_DIR, `${name}.mp4`)) && !requested.length) {
        console.log(`[${name}] already exists, skipping (pass shot name to regenerate)`);
        continue;
      }
      const op = await startShot(name, shot);
      const uri = await pollOperation(name, op);
      await download(name, uri);
    } catch (err) {
      failed = true;
      console.error(`FAILED ${name}:`, err?.message ?? err);
    }
  }
  process.exit(failed ? 1 : 0);
}

run();
