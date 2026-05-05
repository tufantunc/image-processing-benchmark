import Table from "cli-table3";
export { reportHTML } from "./report-html";
import type { BenchmarkResult, BenchmarkRun, TaskProgress } from "../types";

const fmtMs = (v: number) => v > 0 ? `${v.toFixed(2)}ms` : "—";
const fmtMB = (v: number) => v > 0 ? `${v.toFixed(1)}MB` : "—";
const fmtKB = (v: number) => v > 0 ? `${(v / 1024).toFixed(1)}KB` : "—";

export function reportTable(results: BenchmarkResult[]): void {
  const table = new Table({
    head: [
      "Operation",
      "Fixture",
      "Adapter",
      "Median (ms)",
      "Mean (ms)",
      "P95 (ms)",
      "Peak RAM (MB)",
      "Output (KB)",
      "Errors",
    ],
    style: { head: ["cyan"] },
    colWidths: [25, 18, 12, 14, 14, 14, 16, 14, 10],
  });

  const sorted = [...results].sort((a, b) => {
    const aFailed = a.metrics.failed ? 1 : 0;
    const bFailed = b.metrics.failed ? 1 : 0;
    if (aFailed !== bFailed) return aFailed - bFailed;
    const opCmp = a.operation.id.localeCompare(b.operation.id);
    if (opCmp !== 0) return opCmp;
    const fixCmp = `${a.fixture.type}_${a.fixture.size}`.localeCompare(
      `${b.fixture.type}_${b.fixture.size}`
    );
    if (fixCmp !== 0) return fixCmp;
    return a.metrics.medianMs - b.metrics.medianMs;
  });

  for (const r of sorted) {
    const isFailed = r.metrics.failed;
    table.push([
      r.operation.label,
      `${r.fixture.type}/${r.fixture.size}.${r.fixture.format}`,
      r.adapterName,
      isFailed ? "—" : fmtMs(r.metrics.medianMs),
      isFailed ? "—" : fmtMs(r.metrics.meanMs),
      isFailed ? "—" : fmtMs(r.metrics.p95Ms),
      isFailed ? "—" : fmtMB(r.metrics.peakMemoryMB),
      isFailed ? "—" : fmtKB(r.metrics.outputSizeBytes),
      r.metrics.errors > 0 ? `🚨 ${r.metrics.errors}` : "—",
    ]);
  }

  console.log(table.toString());
}

export function reportJSON(run: BenchmarkRun): string {
  return JSON.stringify(run, null, 2);
}

export function reportCSV(results: BenchmarkResult[]): string {
  const header =
    "operation_id,operation_label,fixture_type,fixture_size,fixture_format,adapter,median_ms,mean_ms,min_ms,max_ms,p95_ms,p99_ms,peak_memory_mb,mean_memory_mb,output_size_bytes,errors";
  const rows = results.map((r) => {
    const isFailed = r.metrics.failed;
    return [
      r.operation.id,
      r.operation.label,
      r.fixture.type,
      r.fixture.size,
      r.fixture.format,
      r.adapterName,
      isFailed ? "—" : fmtMs(r.metrics.medianMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.meanMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.minMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.maxMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.p95Ms).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.p99Ms).replace("ms", ""),
      isFailed ? "—" : (r.metrics.peakMemoryMB > 0 ? r.metrics.peakMemoryMB.toFixed(2) : "—"),
      isFailed ? "—" : (r.metrics.meanMemoryMB > 0 ? r.metrics.meanMemoryMB.toFixed(2) : "—"),
      isFailed ? "—" : (r.metrics.outputSizeBytes > 0 ? r.metrics.outputSizeBytes.toString() : "—"),
      r.metrics.errors,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function printProgress(p: TaskProgress): void {
  const elapsed = Date.now() - p.startTimeMs;
  const pct = Math.round((p.taskIndex / p.totalTasks) * 100);

  let iterStr = "";
  if (p.iteration) {
    const { phase, iteration, totalIterations } = p.iteration;
    iterStr = ` │ ${phase} ${iteration}/${totalIterations}`;
  }

  const elapsedStr = fmtDuration(elapsed);
  const etaStr = p.taskIndex > 0
    ? fmtDuration((elapsed / p.taskIndex) * (p.totalTasks - p.taskIndex))
    : "—";

  process.stderr.write(
    `\r  [${p.taskIndex}/${p.totalTasks}] ${pct}%${iterStr} │ ${p.adapter} │ ${p.opLabel} │ ${p.fixtureLabel} │ ${elapsedStr} │ ETA ~${etaStr}          `
  );
}
