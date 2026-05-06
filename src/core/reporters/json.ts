import type { BenchmarkRun } from "../../types";

export function reportJSON(run: BenchmarkRun): string {
  return JSON.stringify(run, null, 2);
}
