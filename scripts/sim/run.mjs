#!/usr/bin/env node
/**
 * Local sim runner — phase1 correctness, phase2 soak, or all.
 *
 *   node scripts/sim/run.mjs phase1
 *   node scripts/sim/run.mjs phase2
 *   node scripts/sim/run.mjs all
 */
import { assertLocalOnly } from "./config.mjs";
import * as reportApi from "./report.mjs";
import { runPhase1 } from "./scenarios/phase1-correctness.mjs";
import { runPhase2 } from "./scenarios/phase2-soak.mjs";

/** @typedef {ReturnType<typeof createSimReport>} SimReport */

const phase = (process.argv[2] ?? "").toLowerCase();

function usage() {
  console.error(`
Usage: node scripts/sim/run.mjs <phase>

  phase1   RLS + auction + order correctness
  phase2   120s concurrent bid soak
  all      Run phase1 then phase2
`);
  process.exit(1);
}

/**
 * Adapter over report.mjs pass/fail/skip for scenario runners.
 * @param {string} phaseName
 */
export function createSimReport(phaseName) {
  reportApi.resetFindings();

  return {
    section(name) {
      console.log(`\n-- ${name} --`);
    },

  /**
   * @param {string} name
   * @param {{ ok: boolean; detail?: string; data?: unknown }} result
   */
    record(name, result) {
      const detail = result.detail ?? "";
      if (result.ok) {
        reportApi.pass(name, detail);
      } else {
        reportApi.fail(name, detail || "failed");
      }
      const mark = result.ok ? "✓" : "✗";
      console.log(`  ${mark} ${name}${detail ? `: ${detail}` : ""}`);
      return result;
    },

    skip(name, reason) {
      reportApi.skip(name, reason);
      console.log(`  ⊘ ${name} (skipped: ${reason})`);
    },

    note(message) {
      console.log(`  · ${message}`);
    },

    getState() {
      const findings = reportApi.getFindings();
      const summary = { pass: 0, fail: 0, skip: 0 };
      for (const f of findings) {
        if (f.status === "pass") summary.pass += 1;
        else if (f.status === "fail") summary.fail += 1;
        else if (f.status === "skip") summary.skip += 1;
      }
      return { phase: phaseName, findings, summary };
    },

    async write(basename) {
      const name = basename.replace(/\.json$/i, "");
      const { jsonPath, mdPath } = reportApi.writeReport(name);
      console.log(`\nReport written to ${jsonPath} and ${mdPath}`);
      return { jsonPath, mdPath };
    },
  };
}

if (!phase || !["phase1", "phase2", "all"].includes(phase)) {
  usage();
}

assertLocalOnly();

let exitCode = 0;

async function runOne(name, fn) {
  console.log(`\n=== ${name} ===\n`);
  const report = createSimReport(name);
  try {
    const result = await fn({ report });
    await report.write(`${name}-${Date.now()}`);
    const { summary } = report.getState();
    console.log(
      `\n${name}: ${result?.ok ? "PASS" : "FAIL"} (${summary.pass} pass, ${summary.fail} fail, ${summary.skip} skip)`,
    );
    if (!result?.ok) exitCode = 1;
  } catch (err) {
    report.record("fatal", {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    await report.write(`${name}-${Date.now()}`);
    console.error(`\n${name}: FATAL`, err);
    exitCode = 1;
  }
}

if (phase === "phase1" || phase === "all") {
  await runOne("phase1", runPhase1);
}

if (phase === "phase2" || phase === "all") {
  await runOne("phase2", runPhase2);
}

process.exit(exitCode);
