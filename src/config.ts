import type { BenchmarkConfig } from "./types";

const args = process.argv.slice(2);

function getArg(name: string, short?: string): string | undefined {
  const pattern = short ? `--${name}` : `--${name}`;
  const idx = args.findIndex(
    (a) => a === pattern || (short && a === `-${short}`)
  );
  if (idx === -1) return undefined;
  if (args[idx + 1] && !args[idx + 1].startsWith("-")) return args[idx + 1];
  return "true";
}

export const config: BenchmarkConfig = {
  warmupIterations: parseInt(getArg("warmup") || "10", 10),
  measureIterations: parseInt(getArg("iterations") || "50", 10),
  memoryPollIntervalMs: parseInt(getArg("poll-interval") || "10", 10),
  fixturesDir: "./fixtures",
  resultsDir: "./results",
  adapters: (getArg("adapters") || "sharp,bun,ffmpeg,jimp,canvas").split(","),
  operations: getArg("ops") ? getArg("ops")!.split(",") : [],
  format: (getArg("format") as "table" | "json" | "csv") || "table",
};
