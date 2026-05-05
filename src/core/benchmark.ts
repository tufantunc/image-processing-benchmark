import type { Operation, ResizeOp, Fixture, BenchmarkConfig, IterationResult, IterationProgress } from "../types";
import { resolveOpDimensions } from "../operations/definitions";
import { calculateMetrics, getChildRSS } from "./metrics";

interface RunParams {
  adapterName: string;
  operation: Operation;
  fixture: Fixture;
  config: BenchmarkConfig;
  onIteration?: (info: IterationProgress) => void;
}

export async function runBenchmark(params: RunParams) {
  const { adapterName, operation, fixture, config } = params;
  const totalIterations = config.warmupIterations + config.measureIterations;
  const results: IterationResult[] = [];
  let errorCount = 0;

  for (let i = 0; i < totalIterations; i++) {
    const peakSamples: number[] = [];

    const serialized = JSON.stringify({
      adapterName,
      operation: serializeOpForWorker(operation, fixture),
      inputPath: fixture.path,
    });

    const workerPath = import.meta.dir + "/worker.ts";
    const proc = Bun.spawn(["bun", workerPath], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    const pollTimer = setInterval(() => {
      const rss = getChildRSS(proc.pid!);
      if (rss > 0) peakSamples.push(rss);
    }, config.memoryPollIntervalMs);

    proc.stdin.write(serialized);
    proc.stdin.write("\n");
    proc.stdin.end();

    const exitCode = await proc.exited;
    clearInterval(pollTimer);

    const stdout = new TextDecoder().decode(
      await new Response(proc.stdout).arrayBuffer()
    );

    if (exitCode !== 0) {
      if (i >= config.warmupIterations) {
        errorCount++;
        console.error(
          `  [ERROR] ${adapterName} | ${operation.id} | iter ${i}: worker exited ${exitCode}`
        );
      }
      params.onIteration?.({
        iteration: i + 1,
        totalIterations,
        phase: i < config.warmupIterations ? "warmup" : "measure",
      });
      continue;
    }

    try {
      const parsed = JSON.parse(stdout.trim());
      if (parsed.hasError) {
        if (i >= config.warmupIterations) {
          errorCount++;
          console.error(
            `  [ERROR] ${adapterName} | ${operation.id} | iter ${i}: ${parsed.errorMessage || "unknown error"}`
          );
        }
        params.onIteration?.({
          iteration: i + 1,
          totalIterations,
          phase: i < config.warmupIterations ? "warmup" : "measure",
        });
        continue;
      }

      if (i >= config.warmupIterations) {
        results.push({
          durationMs: parsed.durationMs,
          peakMemoryBytes: peakSamples.length > 0 ? Math.max(...peakSamples) : 0,
          outputSizeBytes: parsed.outputSizeBytes,
        });
      }
      params.onIteration?.({
        iteration: i + 1,
        totalIterations,
        phase: i < config.warmupIterations ? "warmup" : "measure",
      });
    } catch {
      if (i >= config.warmupIterations) {
        errorCount++;
        console.error(
          `  [ERROR] ${adapterName} | ${operation.id} | iter ${i}: parse failed`
        );
      }
      params.onIteration?.({
        iteration: i + 1,
        totalIterations,
        phase: i < config.warmupIterations ? "warmup" : "measure",
      });
    }
  }

  return {
    operation,
    adapterName,
    fixture,
    warmup: config.warmupIterations,
    iterations: config.measureIterations,
    metrics: calculateMetrics(results, errorCount),
  };
}

function serializeOpForWorker(op: Operation, fixture: Fixture): Record<string, unknown> {
  if (op.kind === "resize") {
    const { width, height } = resolveOpDimensions(op as ResizeOp, fixture);
    return {
      kind: "resize",
      id: op.id,
      label: op.label,
      targetWidth: width,
      targetHeight: height,
      fit: op.fit,
      kernel: op.kernel,
    };
  }
  return { ...op };
}
