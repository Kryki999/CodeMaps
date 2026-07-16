/**
 * CodeMaps Phase 4 — drift report CLI (no map writes).
 *
 * Usage:
 *   npx tsx scripts/check-codemaps-drift.ts
 *   npx tsx scripts/check-codemaps-drift.ts --json
 *   CODEMAPS_DRIFT_ALLOW=1 npx tsx scripts/check-codemaps-drift.ts
 */

import {
  buildDriftReport,
  driftReportHasBlockingFindings,
  formatDriftReportText,
} from "../src/lib/drift-report";

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const allow =
  args.has("--allow") ||
  process.env.CODEMAPS_DRIFT_ALLOW === "1" ||
  process.env.CODEMAPS_DRIFT_ALLOW === "true";

async function main() {
  const report = await buildDriftReport();

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatDriftReportText(report));
  }

  const blocking = driftReportHasBlockingFindings(report);
  if (!blocking) {
    process.exit(0);
  }

  if (allow) {
    console.warn(
      "[codemaps-drift] Blocking findings present but ALLOWED via --allow / CODEMAPS_DRIFT_ALLOW.",
    );
    process.exit(0);
  }

  console.error(
    "[codemaps-drift] FAIL — patch `.codemaps/architecture.json` manually (or ask the agent Flow E), then re-run.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("[codemaps-drift] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
