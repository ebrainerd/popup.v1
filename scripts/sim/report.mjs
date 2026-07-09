import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = join(__dirname, "artifacts");

/** @type {Array<{ id: string, status: 'pass' | 'fail' | 'skip', msg: string, severity?: string, at: string }>} */
const findings = [];

export function pass(id, msg) {
  findings.push({ id, status: "pass", msg, at: new Date().toISOString() });
}

export function fail(id, msg, { severity = "error" } = {}) {
  findings.push({ id, status: "fail", msg, severity, at: new Date().toISOString() });
}

export function skip(id, msg) {
  findings.push({ id, status: "skip", msg, at: new Date().toISOString() });
}

export function getFindings() {
  return [...findings];
}

export function resetFindings() {
  findings.length = 0;
}

function buildSummary() {
  const counts = { pass: 0, fail: 0, skip: 0 };
  for (const f of findings) counts[f.status] += 1;
  return {
    generatedAt: new Date().toISOString(),
    counts,
    findings,
  };
}

function toMarkdown(summary) {
  const lines = [
    "# Sim report",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    `| Pass | Fail | Skip |`,
    `| ---: | ---: | ---: |`,
    `| ${summary.counts.pass} | ${summary.counts.fail} | ${summary.counts.skip} |`,
    "",
  ];

  for (const f of summary.findings) {
    const tag = f.status.toUpperCase();
    const sev = f.severity ? ` (${f.severity})` : "";
    lines.push(`- **${tag}** \`${f.id}\`${sev}: ${f.msg}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Write JSON + markdown summary under scripts/sim/artifacts/.
 *
 * @param {string} basename filename without extension (e.g. "battery-01")
 */
export function writeReport(basename) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const summary = buildSummary();
  const jsonPath = join(ARTIFACTS_DIR, `${basename}.json`);
  const mdPath = join(ARTIFACTS_DIR, `${basename}.md`);
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  writeFileSync(mdPath, toMarkdown(summary));
  return { jsonPath, mdPath, summary };
}
