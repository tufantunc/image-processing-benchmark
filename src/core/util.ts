import type { TaskProgress } from "../types";

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
