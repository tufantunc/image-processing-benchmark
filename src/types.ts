export type FixtureType = "landscape" | "portrait" | "city";
export type FixtureSize = "small" | "medium" | "large";
export type ImageFormat = "jpeg" | "png" | "webp";
export type FitMode = "fill" | "inside";

export interface Fixture {
  type: FixtureType;
  size: FixtureSize;
  format: ImageFormat;
  path: string;
  width: number;
  height: number;
  fileSizeBytes: number;
}

export interface ResizeOp {
  kind: "resize";
  id: string;
  label: string;
  targetWidth: number | ((f: Fixture) => number);
  targetHeight: number | ((f: Fixture) => number);
  fit: FitMode;
  kernel: string;
}

export interface ConvertOp {
  kind: "convert";
  id: string;
  label: string;
  sourceFormat: ImageFormat;
  targetFormat: ImageFormat;
  quality?: number;
}

export type Operation = ResizeOp | ConvertOp;

export interface Adapter {
  name: string;
  execute(operation: Operation, inputPath: string): Promise<Buffer>;
}

export interface IterationResult {
  durationMs: number;
  peakMemoryBytes: number;
  outputSizeBytes: number;
}

export interface Metrics {
  errors: number;
  failed: boolean;
  medianMs: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
  peakMemoryMB: number;
  meanMemoryMB: number;
  outputSizeBytes: number;
}

export interface BenchmarkResult {
  operation: Operation;
  adapterName: string;
  fixture: Fixture;
  warmup: number;
  iterations: number;
  metrics: Metrics;
}

export interface BenchmarkRun {
  timestamp: string;
  runtime: { name: string; version: string };
  config: BenchmarkConfig;
  results: BenchmarkResult[];
}

export interface BenchmarkConfig {
  warmupIterations: number;
  measureIterations: number;
  memoryPollIntervalMs: number;
  fixturesDir: string;
  resultsDir: string;
  adapters: string[];
  operations: string[];
  format: "table" | "json" | "csv" | "html";
}

export interface IterationProgress {
  iteration: number;
  totalIterations: number;
  phase: "warmup" | "measure";
}

export interface TaskProgress {
  taskIndex: number;
  totalTasks: number;
  adapter: string;
  opLabel: string;
  fixtureLabel: string;
  startTimeMs: number;
  iteration?: IterationProgress;
}
