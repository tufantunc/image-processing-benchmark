import Table from "cli-table3";
import type { BenchmarkResult, BenchmarkRun, Operation, ConvertOp } from "../types";

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
    ],
    style: { head: ["cyan"] },
    colWidths: [25, 18, 12, 12, 12, 12, 14, 12],
  });

  const sorted = [...results].sort((a, b) => {
    const opCmp = a.operation.id.localeCompare(b.operation.id);
    if (opCmp !== 0) return opCmp;
    const fixCmp = `${a.fixture.type}_${a.fixture.size}`.localeCompare(
      `${b.fixture.type}_${b.fixture.size}`
    );
    if (fixCmp !== 0) return fixCmp;
    return a.metrics.medianMs - b.metrics.medianMs;
  });

  for (const r of sorted) {
    table.push([
      r.operation.label,
      `${r.fixture.type}/${r.fixture.size}.${r.fixture.format}`,
      r.adapterName,
      r.metrics.medianMs.toFixed(2),
      r.metrics.meanMs.toFixed(2),
      r.metrics.p95Ms.toFixed(2),
      r.metrics.peakMemoryMB.toFixed(1),
      (r.metrics.outputSizeBytes / 1024).toFixed(1),
    ]);
  }

  console.log(table.toString());
}

export function reportJSON(run: BenchmarkRun): string {
  return JSON.stringify(run, null, 2);
}

export function reportCSV(results: BenchmarkResult[]): string {
  const header =
    "operation_id,operation_label,fixture_type,fixture_size,fixture_format,adapter,median_ms,mean_ms,min_ms,max_ms,p95_ms,p99_ms,peak_memory_mb,mean_memory_mb,output_size_bytes";
  const rows = results.map((r) => {
    const dims = `${r.fixture.width}x${r.fixture.height}`;
    return [
      r.operation.id,
      r.operation.label,
      r.fixture.type,
      r.fixture.size,
      r.fixture.format,
      r.adapterName,
      r.metrics.medianMs.toFixed(3),
      r.metrics.meanMs.toFixed(3),
      r.metrics.minMs.toFixed(3),
      r.metrics.maxMs.toFixed(3),
      r.metrics.p95Ms.toFixed(3),
      r.metrics.p99Ms.toFixed(3),
      r.metrics.peakMemoryMB.toFixed(2),
      r.metrics.meanMemoryMB.toFixed(2),
      r.metrics.outputSizeBytes,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function printProgress(
  current: number,
  total: number,
  adapterName: string,
  operationLabel: string,
  fixtureLabel: string
): void {
  const pct = Math.round((current / total) * 100);
  const bar = "█".repeat(Math.floor(pct / 2.5)) + "░".repeat(40 - Math.floor(pct / 2.5));
  process.stderr.write(
    `\r  [${bar}] ${pct}% | ${adapterName} | ${operationLabel} | ${fixtureLabel}`
  );
}
