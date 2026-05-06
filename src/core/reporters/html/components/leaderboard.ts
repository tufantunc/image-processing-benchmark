import type { BenchmarkRun } from "../../../../types";

interface ScoreEntry {
  adapter: string;
  speedWins: number;
  ramWins: number;
  totalScore: number;
}

export function renderLeaderboard(
  run: BenchmarkRun,
  adapterNames: string[],
  adapterColors: Record<string, string>,
): string {
  const speedWins: Record<string, number> = {};
  const ramWins: Record<string, number> = {};
  const totalOps: Record<string, number> = {};

  const groups = new Map<string, typeof run.results>();
  for (const r of run.results) {
    const key = `${r.operation.id}::${r.fixture.size}::${r.fixture.format}`;
    const g = groups.get(key) || [];
    g.push(r);
    groups.set(key, g);
  }

  for (const [, group] of groups) {
    const nonFailed = group.filter((r) => !r.metrics.failed);
    if (nonFailed.length < 2) continue;
    const fastest = nonFailed.reduce((a, b) =>
      a.metrics.medianMs < b.metrics.medianMs ? a : b,
    );
    speedWins[fastest.adapterName] = (speedWins[fastest.adapterName] || 0) + 1;
    const leastRam = nonFailed.reduce((a, b) =>
      a.metrics.peakMemoryMB < b.metrics.peakMemoryMB ? a : b,
    );
    ramWins[leastRam.adapterName] = (ramWins[leastRam.adapterName] || 0) + 1;
    for (const r of nonFailed) {
      totalOps[r.adapterName] = (totalOps[r.adapterName] || 0) + 1;
    }
  }

  const entries: ScoreEntry[] = adapterNames.map((a) => ({
    adapter: a,
    speedWins: speedWins[a] || 0,
    ramWins: ramWins[a] || 0,
    totalScore: (speedWins[a] || 0) + (ramWins[a] || 0),
  }));

  entries.sort((a, b) => b.totalScore - a.totalScore);
  const maxScore = Math.max(...entries.map((e) => e.totalScore), 1);

  let html = `<div class="leaderboard"><h2 class="section-title">Leaderboard</h2>`;
  entries.forEach((e, i) => {
    const color = adapterColors[e.adapter] || "#888";
    const pct = (e.totalScore / maxScore) * 100;
    html += `
<div class="score-row">
  <div class="score-rank">${i + 1}</div>
  <div class="score-name" style="color:${color}">${e.adapter}</div>
  <div class="score-bar-wrap">
    <div class="score-bar" style="width:${Math.max(pct, 8)}%;background:${color}">${e.totalScore}</div>
  </div>
  <div class="score-details">
    <span>Speed: ${e.speedWins}</span>
    <span>RAM: ${e.ramWins}</span>
  </div>
</div>`;
  });
  html += `</div>`;
  return html;
}
