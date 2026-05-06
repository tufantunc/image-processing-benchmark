import type { BenchmarkRun } from "../../../../types";

export function renderMethodology(run: BenchmarkRun, adapters: string[]): string {
  const cfg = run.config;
  return `
<div class="methodology">
  <h2 class="section-title">Methodology</h2>
  <ul>
    <li>Each benchmark iteration runs in an <strong>isolated child process</strong> to prevent memory leaks from accumulating across runs.</li>
    <li><strong>${cfg.warmupIterations} warmup iterations</strong> are discarded before measurement begins.</li>
    <li><strong>${cfg.measureIterations} measure iterations</strong> are collected; median, mean, min, max, p95, and p99 are computed from these.</li>
    <li>Peak RSS is measured by polling <code>ps -o rss=</code> every <strong>${cfg.memoryPollIntervalMs}ms</strong> during execution.</li>
    <li>Adapters tested: <strong>${adapters.join(", ")}</strong>.</li>
    <li>Runtime: <strong>${run.runtime.name} ${run.runtime.version}</strong>.</li>
    <li>Timestamp: ${run.timestamp}.</li>
  </ul>
</div>`;
}
