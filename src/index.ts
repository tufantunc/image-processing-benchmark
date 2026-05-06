import { config } from "./config";
import { getOperationsByIds } from "./operations/definitions";
import { runBenchmark } from "./core/benchmark";
import { reportTable, reportJSON, reportCSV, reportHTML, printProgress, fmtDuration } from "./core/reporter";
import { discoverFixtures } from "./fixtures/meta";
import type { BenchmarkResult, BenchmarkRun, Fixture, Operation, ConvertOp } from "./types";

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
  const allFixtures = discoverFixtures(config.fixturesDir);
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

  process.stderr.write(
    `\n  Image Processing Benchmark\n  ${"─".repeat(50)}\n  Adapters:    ${adapters.join(", ")}\n  Operations:  ${operations.length}\n  Fixtures:    ${allFixtures.length}\n  Total tasks: ${tasks.length}\n  Warmup:      ${config.warmupIterations} iterations\n  Measure:     ${config.measureIterations} iterations\n  ${"─".repeat(50)}\n`
  );

  const results: BenchmarkResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskIndex = i + 1;

    try {
      const result = await runBenchmark({
        adapterName: task.adapter,
        operation: task.op,
        fixture: task.fixture,
        config,
        onIteration: (iterInfo) => {
          printProgress({
            taskIndex,
            totalTasks: tasks.length,
            adapter: task.adapter,
            opLabel: task.op.label,
            fixtureLabel: `${task.fixture.type}/${task.fixture.size}.${task.fixture.format}`,
            startTimeMs: startTime,
            iteration: iterInfo,
          });
        },
      });
      results.push(result);
    } catch (err: any) {
      results.push({
        operation: task.op,
        adapterName: task.adapter,
        fixture: task.fixture,
        warmup: config.warmupIterations,
        iterations: config.measureIterations,
        metrics: {
          errors: config.measureIterations,
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
        },
      });
      process.stderr.write(`\n  [FATAL] ${err.message}\n`);
    }
  }

  const totalElapsed = fmtDuration(Date.now() - startTime);
  process.stderr.write(`\n\n  Tamamlandı: ${tasks.length} görev, ${totalElapsed}\n\n`);

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
    case "html":
      console.log(reportHTML(run));
      break;
    default:
      reportTable(results);
      break;
  }
}

main();
