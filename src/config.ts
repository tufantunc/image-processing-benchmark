import type { BenchmarkConfig } from "./types";

const VALID_FORMATS = ["table", "json", "csv", "html"] as const;
type ValidFormat = (typeof VALID_FORMATS)[number];

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx === -1) return undefined;
  if (args[idx + 1] && !args[idx + 1].startsWith("-")) return args[idx + 1];
  return "true";
}

function showHelp(): never {
  console.log(`
  Image Processing Benchmark

  Usage: bun run src/index.ts [options]

  Options:
    --adapters LIST   Comma-separated adapter names (default: sharp,bun,ffmpeg,jimp,canvas,imagemagick,photon)
    --ops LIST        Comma-separated operation IDs (default: all)
    --warmup N        Warmup iterations (default: 10)
    --iterations N    Measure iterations (default: 50)
    --format FORMAT   Output format: table|json|csv|html (default: table)
    --poll-interval N RSS polling interval in ms (default: 10)
    --help            Show this help
  `);
  process.exit(0);
}

if (getArg("help") !== undefined) showHelp();

const rawFormat = getArg("format") || "table";
if (!VALID_FORMATS.includes(rawFormat as ValidFormat)) {
  console.error(`Invalid format: ${rawFormat}. Must be one of: ${VALID_FORMATS.join(", ")}`);
  process.exit(1);
}

export const config: BenchmarkConfig = {
  warmupIterations: parseInt(getArg("warmup") || "10", 10),
  measureIterations: parseInt(getArg("iterations") || "50", 10),
  memoryPollIntervalMs: parseInt(getArg("poll-interval") || "10", 10),
  fixturesDir: "./fixtures",
  resultsDir: "./results",
  adapters: (getArg("adapters") || "sharp,bun,ffmpeg,jimp,canvas,imagemagick,photon").split(","),
  operations: getArg("ops") ? getArg("ops")!.split(",") : [],
  format: rawFormat as BenchmarkConfig["format"],
};
