import { config } from "./config";
import { getOperationsByIds } from "./operations/definitions";
import { runBenchmark } from "./core/benchmark";
import { reportTable, reportJSON, reportCSV, printProgress } from "./core/reporter";
import type { BenchmarkResult, BenchmarkRun, Fixture, Operation, ConvertOp, FixtureType, FixtureSize, ImageFormat } from "./types";
import { readdirSync, statSync } from "fs";
import { join, basename } from "path";

const FIXTURE_TYPES: FixtureType[] = ["landscape", "portrait", "city"];
const FIXTURE_SIZES: FixtureSize[] = ["small", "medium", "large"];
const FORMATS: ImageFormat[] = ["jpeg", "png", "webp"];
const FIXTURE_DIMS: Record<string, [number, number]> = {
  landscape_small: [256, 171],
  landscape_medium: [1920, 1281],
  landscape_large: [3840, 2563],
  portrait_small: [256, 384],
  portrait_medium: [1920, 2880],
  portrait_large: [3840, 5760],
  city_small: [256, 170],
  city_medium: [1920, 1280],
  city_large: [3840, 2560],
};

function discoverFixtures(): Fixture[] {
  const fixtures: Fixture[] = [];
  for (const type of FIXTURE_TYPES) {
    for (const size of FIXTURE_SIZES) {
      for (const format of FORMATS) {
        const filename = `${type}_${size}.${format}`;
        const filepath = join(config.fixturesDir, filename);
        try {
          const stat = statSync(filepath);
          const key = `${type}_${size}`;
          const [w, h] = FIXTURE_DIMS[key] || [0, 0];
          fixtures.push({
            type,
            size,
            format,
            path: filepath,
            width: w,
            height: h,
            fileSizeBytes: stat.size,
          });
        } catch {}
      }
    }
  }
  return fixtures;
}

function getFixturesForOperation(
  op: Operation,
  allFixtures: Fixture[]
): Fixture[] {
  if (op.kind === "convert") {
    const conv = op as ConvertOp;
    return allFixtures.filter((f) => f.format === conv.sourceFormat);
  }
  return allFixtures;
}

async function main() {
  const allFixtures = discoverFixtures();
  const operations = getOperationsByIds(config.operations);
  const adapters = config.adapters;

  if (allFixtures.length === 0) {
    console.error("No fixtures found. Run setup first.");
    process.exit(1);
  }

  const tasks: {
    adapter: string;
    op: Operation;
    fixture: Fixture;
  }[] = [];

  for (const adapterName of adapters) {
    for (const op of operations) {
      const relevantFixtures = getFixturesForOperation(op, allFixtures);
      for (const fixture of relevantFixtures) {
        tasks.push({ adapter: adapterName, op, fixture });
      }
    }
  }

  console.log(
    `\n  Image Processing Benchmark\n  ${"─".repeat(50)}\n  Adapters:    ${adapters.join(", ")}\n  Operations:  ${operations.length}\n  Fixtures:    ${allFixtures.length}\n  Total tasks: ${tasks.length}\n  Warmup:      ${config.warmupIterations} iterations\n  Measure:     ${config.measureIterations} iterations\n  ${"─".repeat(50)}\n`
  );

  const results: BenchmarkResult[] = [];
  let completed = 0;

  for (const task of tasks) {
    completed++;
    printProgress(
      completed,
      tasks.length,
      task.adapter,
      task.op.label,
      `${task.fixture.type}/${task.fixture.size}.${task.fixture.format}`
    );

    try {
      const result = await runBenchmark({
        adapterName: task.adapter,
        operation: task.op,
        fixture: task.fixture,
        config,
      });
      results.push(result);
    } catch (err: any) {
      process.stderr.write(`\n  [FATAL] ${err.message}\n`);
    }
  }

  process.stderr.write("\n\n");

  const run: BenchmarkRun = {
    timestamp: new Date().toISOString(),
    runtime: { name: "bun", version: Bun.version },
    config,
    results,
  };

  switch (config.format) {
    case "json":
      console.log(reportJSON(run));
      break;
    case "csv":
      console.log(reportCSV(results));
      break;
    default:
      reportTable(results);
      break;
  }
}

main();
