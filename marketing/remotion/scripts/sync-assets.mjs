/**
 * Copies render-time assets into marketing/remotion/public/ (gitignored):
 *  - demo product photos from public/marketing/demo/
 *  - Veo b-roll clips from marketing/video/broll/
 *  - Geist fonts from the repo's node_modules
 *
 * Run automatically by `npm run studio` / `npm run render`.
 */

import { cpSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REMOTION = path.resolve(HERE, "..");
const REPO = path.resolve(REMOTION, "../..");
const PUB = path.join(REMOTION, "public");

const jobs = [
  [path.join(REPO, "public/marketing/demo"), path.join(PUB, "demo")],
  [path.join(REPO, "marketing/video/broll"), path.join(PUB, "broll")],
  [path.join(REPO, "node_modules/geist/dist/fonts/geist-sans"), path.join(PUB, "fonts/geist-sans")],
  [path.join(REPO, "node_modules/geist/dist/fonts/geist-mono"), path.join(PUB, "fonts/geist-mono")],
];

for (const [src, dest] of jobs) {
  if (!existsSync(src)) {
    console.warn(`sync-assets: missing ${src} (skipped)`);
    continue;
  }
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`sync-assets: ${src} -> ${dest} (${readdirSync(dest).length} files)`);
}
