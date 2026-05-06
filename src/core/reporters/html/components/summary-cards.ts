import type { BenchmarkRun } from "../../../../types";

export function renderSummaryCards(run: BenchmarkRun): string {
  const ok = run.results.filter((r) => !r.metrics.failed);
  const total = run.results.length;
  const failedCount = run.results.filter((r) => r.metrics.failed).length;

  const speedWins: Record<string, number> = {};
  const ramWins: Record<string, number> = {};

  const groups = new Map<string, typeof run.results>();
  for (const r of run.results) {
    const key = `${r.operation.id}::${r.fixture.size}::${r.fixture.format}`;
    const g = groups.get(key) || [];
    g.push(r);
    groups.set(key, g);
  }

  for (const [, group] of groups) {
    const nonFailed = group.filter((r) => !r.metrics.failed);
    if (nonFailed.length === 0) continue;
    const fastest = nonFailed.reduce((a, b) =>
      a.metrics.medianMs < b.metrics.medianMs ? a : b,
    );
    speedWins[fastest.adapterName] = (speedWins[fastest.adapterName] || 0) + 1;

    const leastRam = nonFailed.reduce((a, b) =>
      a.metrics.peakMemoryMB < b.metrics.peakMemoryMB ? a : b,
    );
    ramWins[leastRam.adapterName] = (ramWins[leastRam.adapterName] || 0) + 1;
  }

  const fastestAdapter = Object.entries(speedWins).sort((a, b) => b[1] - a[1])[0];
  const leastRamAdapter = Object.entries(ramWins).sort((a, b) => b[1] - a[1])[0];

  const avgMedian =
    ok.length > 0
      ? (ok.reduce((s, r) => s + r.metrics.medianMs, 0) / ok.length).toFixed(1)
      : "—";
  const peakRam =
    ok.length > 0
      ? Math.max(...ok.map((r) => r.metrics.peakMemoryMB)).toFixed(1)
      : "—";

  return `
<div class="cards">
  <div class="card">
    <div class="card-label">Tests Run</div>
    <div class="card-value">${total}</div>
    <div class="card-sub">${failedCount} failed</div>
  </div>
  <div class="card">
    <div class="card-label">Fastest Adapter</div>
    <div class="card-value">${fastestAdapter ? fastestAdapter[0] : "—"}</div>
    <div class="card-sub">${fastestAdapter ? fastestAdapter[1] + " wins" : ""}</div>
  </div>
  <div class="card">
    <div class="card-label">Least RAM</div>
    <div class="card-value">${leastRamAdapter ? leastRamAdapter[0] : "—"}</div>
    <div class="card-sub">${leastRamAdapter ? leastRamAdapter[1] + " wins" : ""}</div>
  </div>
  <div class="card">
    <div class="card-label">Avg Median</div>
    <div class="card-value">${avgMedian} ms</div>
  </div>
  <div class="card">
    <div class="card-label">Peak RAM</div>
    <div class="card-value">${peakRam} MB</div>
  </div>
</div>`;
}
