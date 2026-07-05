#!/usr/bin/env node
/**
 * Generate a marketing walkthrough video from seller screenshots.
 *
 *   node marketing/generate-marketing-video.mjs
 *
 * Prerequisites:
 *   - ffmpeg installed
 *   - Screenshots in marketing/screenshots/ (run capture-screenshots + capture-studio-steps)
 */
import { spawnSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS = join(__dirname, "screenshots");
const OUT_DIR = join(__dirname, "video");
const TMP = join(OUT_DIR, ".tmp");
const OUT_FILE = join(OUT_DIR, "create-shop-walkthrough.mp4");
const ARTIFACTS = "/opt/cursor/artifacts/create-shop-walkthrough.mp4";

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const W = 1920;
const H = 1080;
const FPS = 30;
const FADE = 0.5;

/** @type {{ type?: 'title' | 'cta', file?: string, title: string, subtitle: string, duration: number }[]} */
const SLIDES = [
  {
    type: "title",
    title: "PopUp",
    subtitle: "Create your ceramics drop in minutes",
    duration: 3,
  },
  {
    file: "dashboard.png",
    title: "Your seller dashboard",
    subtitle: "Manage drops, orders, and sales in one place",
    duration: 3.5,
  },
  {
    file: "step-shop.png",
    title: "Step 1 · Name your drop",
    subtitle: "Add a cover photo and shop description",
    duration: 3.5,
  },
  {
    file: "step-products.png",
    title: "Step 2 · Add your products",
    subtitle: "Upload photos straight from your phone",
    duration: 3.5,
  },
  {
    file: "step-stream.png",
    title: "Step 3 · Go live",
    subtitle: "Stream from your studio or embed YouTube",
    duration: 3.5,
  },
  {
    file: "step-design.png",
    title: "Step 4 · Make it yours",
    subtitle: "Pick a theme, layout, and accent color",
    duration: 3.5,
  },
  {
    file: "step-launch.png",
    title: "Step 5 · Schedule your drop",
    subtitle: "Set your open window and publish",
    duration: 3.5,
  },
  {
    file: "live-shop.png",
    title: "Buyers shop while you stream",
    subtitle: "Chat, checkout, and sell in real time",
    duration: 4.5,
  },
  {
    type: "cta",
    title: "Start your drop on PopUp",
    subtitle: "popupdrop.co",
    duration: 3,
  },
];

function esc(text) {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.status !== 0) throw new Error(`${cmd} failed: ${res.status}`);
}

function frames(duration) {
  return Math.round(duration * FPS);
}

function imageFilter(title, subtitle, duration) {
  const d = frames(duration);
  const t1 = esc(title);
  const t2 = esc(subtitle);
  return [
    `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x121212`,
    `zoompan=z='min(zoom+0.0012,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=${W}x${H}:fps=${FPS}`,
    `drawbox=x=0:y=h-280:w=${W}:h=280:color=0x000000@0.82:t=fill`,
    `drawtext=fontfile=${FONT}:text='${t1}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=h-195:shadowcolor=black@0.9:shadowx=3:shadowy=3`,
    `drawtext=fontfile=${FONT_REG}:text='${t2}':fontsize=30:fontcolor=0xf0f0f0:x=(w-text_w)/2:y=h-115:shadowcolor=black@0.9:shadowx=2:shadowy=2`,
  ].join(",");
}

function titleFilter(title, subtitle, duration, accent = false) {
  const d = frames(duration);
  const t1 = esc(title);
  const t2 = esc(subtitle);
  const size = accent ? 96 : 72;
  const color = accent ? "0xff3b8b" : "white";
  return [
    `drawtext=fontfile=${FONT}:text='${t1}':fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=(h-text_h)/2-30:shadowcolor=black@0.5:shadowx=3:shadowy=3`,
    `drawtext=fontfile=${FONT_REG}:text='${t2}':fontsize=36:fontcolor=0xcccccc:x=(w-text_w)/2:y=(h-text_h)/2+50`,
  ].join(",");
}

function renderSlide(slide, index) {
  const out = join(TMP, `seg-${String(index).padStart(2, "0")}.mp4`);
  const duration = slide.duration;

  if (slide.type === "title" || slide.type === "cta") {
    const bg = slide.type === "title" ? "0x121212" : "0x1a0a12";
    const filter = titleFilter(slide.title, slide.subtitle, duration, slide.type === "title");
    run("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${bg}:s=${W}x${H}:d=${duration}`,
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(FPS),
      out,
    ]);
    return out;
  }

  const input = join(SCREENSHOTS, slide.file);
  if (!existsSync(input)) throw new Error(`Missing screenshot: ${input}`);

  run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    input,
    "-vf",
    imageFilter(slide.title, slide.subtitle, duration),
    "-t",
    String(duration),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    out,
  ]);
  return out;
}

function concatWithXfade(segments) {
  if (segments.length === 1) return segments[0];

  const inputs = segments.flatMap((s) => ["-i", s]);
  let filter = "";
  let last = "[0:v]";
  let offset = SLIDES[0].duration - FADE;

  for (let i = 1; i < segments.length; i++) {
    const out = i === segments.length - 1 ? "[vout]" : `[v${i}]`;
    filter += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${out};`;
    last = out;
    offset += SLIDES[i].duration - FADE;
  }

  filter = filter.replace(/;$/, "");
  const out = join(OUT_DIR, "create-shop-walkthrough.mp4");

  const args = ["-y", ...inputs, "-filter_complex", filter, "-map", "[vout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", out];
  run("ffmpeg", args);
  return out;
}

function main() {
  console.log("Generating marketing walkthrough video…\n");

  for (const f of SLIDES.filter((s) => s.file).map((s) => s.file)) {
    if (!existsSync(join(SCREENSHOTS, f))) {
      console.error(`Missing ${f}. Run:`);
      console.error("  node marketing/capture-screenshots.mjs");
      console.error("  node marketing/capture-studio-steps.mjs");
      process.exit(1);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
  mkdirSync(TMP);

  const segments = SLIDES.map((slide, i) => {
    console.log(`  Rendering slide ${i + 1}/${SLIDES.length}: ${slide.title}`);
    return renderSlide(slide, i);
  });

  console.log("\n  Crossfading segments…");
  concatWithXfade(segments);

  rmSync(TMP, { recursive: true });

  try {
    mkdirSync(dirname(ARTIFACTS), { recursive: true });
    run("cp", [OUT_FILE, ARTIFACTS]);
    console.log(`\n✓ Video saved to ${OUT_FILE}`);
    console.log(`✓ Artifact copy: ${ARTIFACTS}`);
  } catch {
    console.log(`\n✓ Video saved to ${OUT_FILE}`);
  }
}

main();
