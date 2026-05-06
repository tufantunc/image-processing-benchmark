import Table from "cli-table3";
import type { BenchmarkResult } from "../../types";

const fmtMs = (v: number) => v > 0 ? `${v.toFixed(2)}ms` : "—";
const fmtMB = (v: number) => v > 0 ? `${v.toFixed(1)}MB` : "—";
const fmtKB = (v: number) => v > 0 ? `${(v / 1024).toFixed(1)}KB` : "—";

export function reportTable(results: BenchmarkResult[]): void {
  const table = new Table({
    head: ["Operation", "Fixture", "Adapter", "Median (ms)", "Mean (ms)", "P95 (ms)", "Peak RAM (MB)", "Output (KB)", "Errors"],
    style: { head: ["cyan"] },
    colWidths: [25, 18, 12, 14, 14, 14, 16, 14, 10],
  });

  const sorted = [...results].sort((a, b) => {
    const aFailed = a.metrics.failed ? 1 : 0;
    const bFailed = b.metrics.failed ? 1 : 0;
    if (aFailed !== bFailed) return aFailed - bFailed;
    const opCmp = a.operation.id.localeCompare(b.operation.id);
    if (opCmp !== 0) return opCmp;
    const fixCmp = `${a.fixture.type}_${a.fixture.size}`.localeCompare(`${b.fixture.type}_${b.fixture.size}`);
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

export { fmtMs, fmtMB, fmtKB };
