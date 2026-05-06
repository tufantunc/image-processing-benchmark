import type { BenchmarkResult } from "../../types";
import { fmtMs } from "./table";

export function reportCSV(results: BenchmarkResult[]): string {
  const header = "operation_id,operation_label,fixture_type,fixture_size,fixture_format,adapter,median_ms,mean_ms,min_ms,max_ms,p95_ms,p99_ms,peak_memory_mb,mean_memory_mb,output_size_bytes,errors";
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
