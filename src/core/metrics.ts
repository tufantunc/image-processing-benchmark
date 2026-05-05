import type { IterationResult, Metrics } from "../types";

export function calculateMetrics(results: IterationResult[], errors: number): Metrics {
  if (results.length === 0) {
    return {
      errors,
      failed: true,
      medianMs: 0,
      meanMs: 0,
      minMs: 0,
      maxMs: 0,
      p95Ms: 0,
      p99Ms: 0,
      peakMemoryMB: 0,
      meanMemoryMB: 0,
      outputSizeBytes: 0,
    };
  }

  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const memories = results.map((r) => r.peakMemoryBytes);
  const outputSize = results[results.length - 1].outputSizeBytes;

  return {
    errors,
    failed: false,
    medianMs: percentile(durations, 50),
    meanMs: avg(durations),
    minMs: durations[0],
    maxMs: durations[durations.length - 1],
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    peakMemoryMB: Math.max(...memories) / 1024 / 1024,
    meanMemoryMB: avg(memories) / 1024 / 1024,
    outputSizeBytes: outputSize,
  };
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

export function getChildRSS(pid: number): number {
  try {
    const result = Bun.spawnSync(["ps", "-o", "rss=", "-p", String(pid)]);
    const output = new TextDecoder().decode(result.stdout).trim();
    return parseInt(output, 10) * 1024;
  } catch {
    return 0;
  }
}
