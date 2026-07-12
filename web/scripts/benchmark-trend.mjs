import { mkdir, readFile, writeFile } from "node:fs/promises";

const latestPath = process.env.HTMX_BENCH_LATEST_PATH || "benchmarks/latest.json";
const historyPath = process.env.HTMX_BENCH_HISTORY_PATH || "benchmarks/history.json";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pctDelta(current, previous) {
  if (!Number.isFinite(previous) || previous === 0) {
    return 0;
  }
  return ((current - previous) / previous) * 100;
}

async function readJson(path, fallback) {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function main() {
  const latest = await readJson(latestPath, null);
  if (!latest) {
    throw new Error(`Missing benchmark snapshot at ${latestPath}. Run npm run bench:htmx first.`);
  }

  await mkdir("benchmarks", { recursive: true });

  const history = await readJson(historyPath, {
    schema: "htmx-benchmark-history-v1",
    entries: []
  });

  const entries = Array.isArray(history.entries) ? history.entries : [];
  const previous = entries.length > 0 ? entries[entries.length - 1] : null;

  const currentEntry = {
    timestamp: latest.timestamp || new Date().toISOString(),
    processMedianMs: toNumber(latest.processMedianMs),
    mutationMedianMs: toNumber(latest.mutationMedianMs),
    nodeCount: toNumber(latest.nodeCount),
    mutationCount: toNumber(latest.mutationCount),
    sampleCount: toNumber(latest.sampleCount, 1),
    gitSha: process.env.GITHUB_SHA || "local",
    runId: process.env.GITHUB_RUN_ID || "local"
  };

  if (previous) {
    const processDelta = pctDelta(currentEntry.processMedianMs, toNumber(previous.processMedianMs));
    const mutationDelta = pctDelta(currentEntry.mutationMedianMs, toNumber(previous.mutationMedianMs));

    console.log(
      `[htmx-benchmark-trend] process_delta_pct=${processDelta.toFixed(2)} mutation_delta_pct=${mutationDelta.toFixed(2)} ` +
      `current_process_ms=${currentEntry.processMedianMs.toFixed(2)} previous_process_ms=${toNumber(previous.processMedianMs).toFixed(2)} ` +
      `current_mutation_ms=${currentEntry.mutationMedianMs.toFixed(2)} previous_mutation_ms=${toNumber(previous.mutationMedianMs).toFixed(2)}`
    );
  } else {
    console.log("[htmx-benchmark-trend] no previous baseline found; storing first benchmark snapshot");
  }

  entries.push(currentEntry);
  history.entries = entries.slice(-50);

  await writeFile(historyPath, JSON.stringify(history, null, 2), "utf-8");
}

main().catch((error) => {
  console.error("[htmx-benchmark-trend] failed", error);
  process.exitCode = 1;
});
