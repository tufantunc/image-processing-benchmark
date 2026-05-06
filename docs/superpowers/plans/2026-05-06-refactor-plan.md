# Refactor Implementation Plan: Modular Architecture + Dashboard HTML + New Adapters

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the image-processing-benchmark project for modular code architecture, professional dashboard HTML output, and two new adapters (ImageMagick, Photon).

**Architecture:** Adapter registry pattern replaces hardcoded if-else chains. Reporter monolith split into modular files under `reporters/`. HTML report rebuilt as dashboard with leaderboard, heatmap, radar chart, and rich interactive filters. Two new CLI-based adapters added.

**Tech Stack:** TypeScript, Bun runtime, Chart.js (CDN), cli-table3, sharp, jimp, @napi-rs/canvas, @aspect-build/photon-rs (new), ImageMagick CLI (new)

---

## File Structure

### New files to create:
- `src/adapters/registry.ts` — Adapter registration and lookup
- `src/fixtures/meta.ts` — FIXTURE_DIMS map + discoverFixtures()
- `src/core/reporters/index.ts` — Format router
- `src/core/reporters/table.ts` — CLI table output (extracted from reporter.ts)
- `src/core/reporters/json.ts` — JSON output
- `src/core/reporters/csv.ts` — CSV output
- `src/core/reporters/html/index.ts` — HTML report assembler
- `src/core/reporters/html/template.ts` — HTML skeleton
- `src/core/reporters/html/styles.ts` — CSS string
- `src/core/reporters/html/scripts.ts` — Client-side JS
- `src/core/reporters/html/charts.ts` — Chart data generation
- `src/core/reporters/html/components/summary-cards.ts` — Summary card HTML
- `src/core/reporters/html/components/leaderboard.ts` — Scoreboard HTML
- `src/core/reporters/html/components/methodology.ts` — Methodology section
- `src/core/reporters/html/components/detail-table.ts` — Pivot table HTML
- `src/core/reporters/html/components/footer.ts` — Footer HTML
- `src/adapters/imagemagick.adapter.ts` — ImageMagick adapter
- `src/adapters/photon.adapter.ts` — Photon adapter

### Files to modify:
- `src/types.ts` — Add FixtureMeta, update Adapter interface
- `src/config.ts` — Fix type safety, add --help, remove unused short param
- `src/index.ts` — Use fixtures/meta.ts, use reporters/index.ts, update default adapters
- `src/core/worker.ts` — Registry-based loading, pass fixtureMeta
- `src/core/benchmark.ts` — Serialize fixtureMeta to worker
- `src/core/metrics.ts` — Unchanged
- `src/operations/definitions.ts` — Unchanged
- `src/adapters/sharp.adapter.ts` — Use fixtureMeta, register
- `src/adapters/bun.adapter.ts` — Use fixtureMeta, register
- `src/adapters/ffmpeg.adapter.ts` — Use fixtureMeta, register
- `src/adapters/jimp.adapter.ts` — Use fixtureMeta, register
- `src/adapters/canvas.adapter.ts` — Use fixtureMeta, register
- `Dockerfile` — Add imagemagick
- `package.json` — Add @aspect-build/photon-rs, update scripts
- `AGENTS.md` — Update for new structure

### Files to delete:
- `src/core/reporter.ts` — Replaced by reporters/ directory
- `src/core/report-html.ts` — Replaced by reporters/html/ directory

---

## Task 1: Update types.ts with FixtureMeta and new Adapter interface

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add FixtureMeta interface and update Adapter interface**

Replace the current `Adapter` interface (lines 37-40) with:

```ts
export interface FixtureMeta {
  width: number;
  height: number;
  format: ImageFormat;
}

export interface Adapter {
  name: string;
  execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer>;
}
```

Keep everything else in types.ts unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "refactor: add FixtureMeta interface and update Adapter signature"
```

---

## Task 2: Create fixture metadata module

**Files:**
- Create: `src/fixtures/meta.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create `src/fixtures/meta.ts`**

Extract `FIXTURE_DIMS`, `FIXTURE_TYPES`, `FIXTURE_SIZES`, `FORMATS`, and `discoverFixtures()` from `src/index.ts` into a new file:

```ts
import type { Fixture, FixtureType, FixtureSize, ImageFormat } from "../types";
import { statSync } from "fs";
import { join } from "path";

export const FIXTURE_TYPES: FixtureType[] = ["landscape", "portrait", "city"];
export const FIXTURE_SIZES: FixtureSize[] = ["small", "medium", "large"];
export const FORMATS: ImageFormat[] = ["jpeg", "png", "webp"];

export const FIXTURE_DIMS: Record<string, [number, number]> = {
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

export function discoverFixtures(fixturesDir: string): Fixture[] {
  const fixtures: Fixture[] = [];
  for (const type of FIXTURE_TYPES) {
    for (const size of FIXTURE_SIZES) {
      for (const format of FORMATS) {
        const filename = `${type}_${size}.${format}`;
        const filepath = join(fixturesDir, filename);
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
```

- [ ] **Step 2: Update `src/index.ts` to import from fixtures/meta.ts**

Remove the `FIXTURE_TYPES`, `FIXTURE_SIZES`, `FORMATS`, `FIXTURE_DIMS` constants and `discoverFixtures` function from `src/index.ts`. Replace the import at the top:

```ts
import { discoverFixtures } from "./fixtures/meta";
```

Change the call from `discoverFixtures()` to `discoverFixtures(config.fixturesDir)`.

- [ ] **Step 3: Commit**

```bash
git add src/fixtures/meta.ts src/index.ts
git commit -m "refactor: extract fixture metadata into fixtures/meta.ts"
```

---

## Task 3: Create adapter registry

**Files:**
- Create: `src/adapters/registry.ts`

- [ ] **Step 1: Create `src/adapters/registry.ts`**

```ts
import type { Adapter, FixtureMeta } from "../types";

export interface AdapterEntry {
  name: string;
  create: () => Promise<Adapter>;
  color: string;
}

const entries: Map<string, AdapterEntry> = new Map();

export function registerAdapter(entry: AdapterEntry): void {
  entries.set(entry.name, entry);
}

export function getAdapterEntry(name: string): AdapterEntry | undefined {
  return entries.get(name);
}

export function getAllEntries(): AdapterEntry[] {
  return [...entries.values()];
}

export function getAdapterNames(): string[] {
  return [...entries.keys()];
}

export const ADAPTER_COLORS: Record<string, string> = {};

export function registerAdapterColor(name: string, color: string): void {
  ADAPTER_COLORS[name] = color;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/adapters/registry.ts
git commit -m "refactor: add adapter registry module"
```

---

## Task 4: Update all existing adapters to use registry and FixtureMeta

**Files:**
- Modify: `src/adapters/sharp.adapter.ts`
- Modify: `src/adapters/bun.adapter.ts`
- Modify: `src/adapters/ffmpeg.adapter.ts`
- Modify: `src/adapters/jimp.adapter.ts`
- Modify: `src/adapters/canvas.adapter.ts`

Each adapter needs:
1. Import `FixtureMeta` and update `execute()` signature
2. Use `fixtureMeta` instead of reading metadata from file
3. Register itself in the registry
4. Remove fake Fixture construction

- [ ] **Step 1: Update `sharp.adapter.ts`**

```ts
import sharp from "sharp";
import type { Adapter, Operation, ResizeOp, ConvertOp, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";

registerAdapterColor("sharp", "#f47067");

export class SharpAdapter implements Adapter {
  name = "sharp";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const pipeline = sharp(inputPath);

    if (operation.kind === "resize") {
      return this.executeResize(pipeline, operation, fixtureMeta);
    }
    return this.executeConvert(pipeline, operation);
  }

  private async executeResize(
    pipeline: sharp.Sharp,
    op: ResizeOp,
    fixtureMeta: FixtureMeta
  ): Promise<Buffer> {
    const targetWidth = typeof op.targetWidth === "function" ? op.targetWidth({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetWidth;
    const targetHeight = typeof op.targetHeight === "function" ? op.targetHeight({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetHeight;

    const sharpFit = op.fit === "inside" ? "inside" : "fill";
    const sharpKernel = this.mapKernel(op.kernel);

    return pipeline
      .resize(targetWidth, targetHeight, { fit: sharpFit, kernel: sharpKernel })
      .toBuffer();
  }

  private mapKernel(kernel: string): sharp.KernelEnum {
    switch (kernel) {
      case "nearest": return "nearest";
      case "lanczos2": return "lanczos2";
      case "lanczos3": return "lanczos3";
      case "mitchell": return "mitchell";
      case "linear":
      case "bilinear": return "linear";
      case "cubic": return "cubic";
      default: return "lanczos3";
    }
  }

  private async executeConvert(pipeline: sharp.Sharp, op: ConvertOp): Promise<Buffer> {
    switch (op.targetFormat) {
      case "jpeg":
        return pipeline.jpeg({ quality: op.quality ?? 80 }).toBuffer();
      case "png":
        return pipeline.png().toBuffer();
      case "webp":
        return pipeline.webp({ quality: op.quality ?? 80 }).toBuffer();
    }
  }
}

registerAdapter({
  name: "sharp",
  create: async () => new SharpAdapter(),
  color: "#f47067",
});
```

- [ ] **Step 2: Update `bun.adapter.ts`**

```ts
import type { Adapter, Operation, ResizeOp, ConvertOp, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";

registerAdapterColor("bun", "#70d0ff");

export class BunAdapter implements Adapter {
  name = "bun";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    if (operation.kind === "resize") {
      return this.executeResize(inputPath, operation, fixtureMeta);
    }
    return this.executeConvert(inputPath, operation);
  }

  private async executeResize(inputPath: string, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const targetWidth = typeof op.targetWidth === "function" ? op.targetWidth({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetWidth;
    const targetHeight = typeof op.targetHeight === "function" ? op.targetHeight({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetHeight;

    const options: Record<string, unknown> = {};
    if (op.fit === "inside") options.fit = "inside";
    if (op.kernel && op.kernel !== "lanczos3") options.filter = op.kernel;

    const img = new (Bun as any).Image(inputPath).resize(targetWidth, targetHeight, options);
    const buf = await img.buffer();
    return Buffer.from(buf);
  }

  private async executeConvert(inputPath: string, op: ConvertOp): Promise<Buffer> {
    const img = new (Bun as any).Image(inputPath);
    switch (op.targetFormat) {
      case "jpeg":
        return Buffer.from(await img.jpeg({ quality: op.quality ?? 80 }).buffer());
      case "png":
        return Buffer.from(await img.png().buffer());
      case "webp":
        return Buffer.from(await img.webp({ quality: op.quality ?? 80 }).buffer());
    }
  }
}

registerAdapter({
  name: "bun",
  create: async () => new BunAdapter(),
  color: "#70d0ff",
});
```

- [ ] **Step 3: Update `ffmpeg.adapter.ts`**

Same pattern: import registry, update `execute()` signature to include `fixtureMeta`, use `fixtureMeta.width/height/format` directly instead of calling `this.probe()`. Remove `probe()` method entirely. Keep `runFFmpeg()` and other helpers. Add `registerAdapter()` call at bottom.

The `executeResize` method changes to:
```ts
private async executeResize(inputPath: string, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
  const targetWidth = typeof op.targetWidth === "function" ? op.targetWidth({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetWidth;
  const targetHeight = typeof op.targetHeight === "function" ? op.targetHeight({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetHeight;

  const flags = KERNEL_FLAGS[op.kernel] || "lanczos";
  let scaleFilter = `scale=${targetWidth}:${targetHeight}:flags=${flags}`;
  if (op.fit === "inside") {
    scaleFilter += ":force_original_aspect_ratio=decrease";
  }

  const ext = FORMAT_EXT[fixtureMeta.format] || "jpg";
  const outFormat = fixtureMeta.format === "webp" ? "png" : fixtureMeta.format;
  const outExt = outFormat === "jpeg" ? "jpg" : outFormat;
  return this.runFFmpeg(inputPath, outExt, ["-vf", scaleFilter]);
}
```

Remove the `probe()` method. Color: `#bc8cff`.

- [ ] **Step 4: Update `jimp.adapter.ts`**

Import registry, update `execute()` to accept `fixtureMeta`. In `executeResize`, use `fixtureMeta.width` and `fixtureMeta.height` directly instead of reading from `image.width/height`. Color: `#e3b341`.

- [ ] **Step 5: Update `canvas.adapter.ts`**

Import registry, update `execute()` to accept `fixtureMeta`. In `executeResize`, use `fixtureMeta.width` and `fixtureMeta.height` directly instead of reading from `image.width/height`. Color: `#39d353`.

- [ ] **Step 6: Commit**

```bash
git add src/adapters/
git commit -m "refactor: update all adapters to use registry and FixtureMeta"
```

---

## Task 5: Update worker.ts to use registry and pass FixtureMeta

**Files:**
- Modify: `src/core/worker.ts`

- [ ] **Step 1: Rewrite worker.ts**

The worker dynamically imports all adapter files (which self-register), then looks up the adapter by name from the registry. It also receives `fixtureMeta` from stdin.

```ts
import type { Operation, Adapter, FixtureMeta } from "../types";
import { getAdapterEntry } from "../adapters/registry";

import "../adapters/sharp.adapter";
import "../adapters/bun.adapter";
import "../adapters/ffmpeg.adapter";
import "../adapters/jimp.adapter";
import "../adapters/canvas.adapter";

interface WorkerInput {
  adapterName: string;
  operation: Operation;
  inputPath: string;
  fixtureMeta: FixtureMeta;
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  const input = JSON.parse(Buffer.concat(chunks).toString()) as WorkerInput;

  const entry = getAdapterEntry(input.adapterName);
  if (!entry) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: `Unknown adapter: ${input.adapterName}` }));
    return;
  }

  let adapter: Adapter;
  try {
    adapter = await entry.create();
  } catch (err: any) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: `Adapter load failed: ${err.message}` }));
    return;
  }

  if (typeof globalThis.gc === "function") globalThis.gc();

  const start = performance.now();
  try {
    const result = await adapter.execute(input.operation, input.inputPath, input.fixtureMeta);
    const durationMs = performance.now() - start;
    console.log(JSON.stringify({ durationMs, outputSizeBytes: result.byteLength }));
  } catch (err: any) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: err.message || String(err) }));
  }
}

main();
```

- [ ] **Step 2: Commit**

```bash
git add src/core/worker.ts
git commit -m "refactor: worker uses adapter registry, receives FixtureMeta"
```

---

## Task 6: Update benchmark.ts to serialize FixtureMeta

**Files:**
- Modify: `src/core/benchmark.ts`

- [ ] **Step 1: Add fixtureMeta to serialized worker payload**

In `runBenchmark()`, update the `serialized` object:

```ts
const serialized = JSON.stringify({
  adapterName,
  operation: serializeOpForWorker(operation, fixture),
  inputPath: fixture.path,
  fixtureMeta: {
    width: fixture.width,
    height: fixture.height,
    format: fixture.format,
  },
});
```

Remove the import of `resolveOpDimensions` if it's no longer used elsewhere in this file. Keep `serializeOpForWorker()` function as-is.

- [ ] **Step 2: Commit**

```bash
git add src/core/benchmark.ts
git commit -m "refactor: serialize FixtureMeta to worker payload"
```

---

## Task 7: Create reporter modules (table, json, csv)

**Files:**
- Create: `src/core/reporters/index.ts`
- Create: `src/core/reporters/table.ts`
- Create: `src/core/reporters/json.ts`
- Create: `src/core/reporters/csv.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create `src/core/reporters/table.ts`**

Extract `reportTable()` from the current `reporter.ts`. Move `fmtMs`, `fmtMB`, `fmtKB` helper functions here.

```ts
import Table from "cli-table3";
import type { BenchmarkResult } from "../../types";

const fmtMs = (v: number) => v > 0 ? `${v.toFixed(2)}ms` : "—";
const fmtMB = (v: number) => v > 0 ? `${v.toFixed(1)}MB` : "—";
const fmtKB = (v: number) => v > 0 ? `${(v / 1024).toFixed(1)}KB` : "—";

export function reportTable(results: BenchmarkResult[]): void {
  const table = new Table({
    head: ["Operation", "Fixture", "Adapter", "Median (ms)", "Mean (ms)", "P95 (ms)", "Peak RAM (MB)", "Output (KB)", "Errors"],
    style: { head: ["cyan"] },
    colWidths: [25, 18, 12, 14, 14, 14, 16, 14, 10],
  });

  const sorted = [...results].sort((a, b) => {
    const aFailed = a.metrics.failed ? 1 : 0;
    const bFailed = b.metrics.failed ? 1 : 0;
    if (aFailed !== bFailed) return aFailed - bFailed;
    const opCmp = a.operation.id.localeCompare(b.operation.id);
    if (opCmp !== 0) return opCmp;
    const fixCmp = `${a.fixture.type}_${a.fixture.size}`.localeCompare(`${b.fixture.type}_${b.fixture.size}`);
    if (fixCmp !== 0) return fixCmp;
    return a.metrics.medianMs - b.metrics.medianMs;
  });

  for (const r of sorted) {
    const isFailed = r.metrics.failed;
    table.push([
      r.operation.label,
      `${r.fixture.type}/${r.fixture.size}.${r.fixture.format}`,
      r.adapterName,
      isFailed ? "—" : fmtMs(r.metrics.medianMs),
      isFailed ? "—" : fmtMs(r.metrics.meanMs),
      isFailed ? "—" : fmtMs(r.metrics.p95Ms),
      isFailed ? "—" : fmtMB(r.metrics.peakMemoryMB),
      isFailed ? "—" : fmtKB(r.metrics.outputSizeBytes),
      r.metrics.errors > 0 ? `🚨 ${r.metrics.errors}` : "—",
    ]);
  }

  console.log(table.toString());
}

export { fmtMs, fmtMB, fmtKB };
```

- [ ] **Step 2: Create `src/core/reporters/json.ts`**

```ts
import type { BenchmarkRun } from "../../types";

export function reportJSON(run: BenchmarkRun): string {
  return JSON.stringify(run, null, 2);
}
```

- [ ] **Step 3: Create `src/core/reporters/csv.ts`**

Extract `reportCSV()` from current `reporter.ts`:

```ts
import type { BenchmarkResult } from "../../types";
import { fmtMs } from "./table";

export function reportCSV(results: BenchmarkResult[]): string {
  const header = "operation_id,operation_label,fixture_type,fixture_size,fixture_format,adapter,median_ms,mean_ms,min_ms,max_ms,p95_ms,p99_ms,peak_memory_mb,mean_memory_mb,output_size_bytes,errors";
  const rows = results.map((r) => {
    const isFailed = r.metrics.failed;
    return [
      r.operation.id,
      r.operation.label,
      r.fixture.type,
      r.fixture.size,
      r.fixture.format,
      r.adapterName,
      isFailed ? "—" : fmtMs(r.metrics.medianMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.meanMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.minMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.maxMs).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.p95Ms).replace("ms", ""),
      isFailed ? "—" : fmtMs(r.metrics.p99Ms).replace("ms", ""),
      isFailed ? "—" : (r.metrics.peakMemoryMB > 0 ? r.metrics.peakMemoryMB.toFixed(2) : "—"),
      isFailed ? "—" : (r.metrics.meanMemoryMB > 0 ? r.metrics.meanMemoryMB.toFixed(2) : "—"),
      isFailed ? "—" : (r.metrics.outputSizeBytes > 0 ? r.metrics.outputSizeBytes.toString() : "—"),
      r.metrics.errors,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}
```

- [ ] **Step 4: Create `src/core/reporters/index.ts`**

```ts
import type { BenchmarkResult, BenchmarkRun } from "../../types";
import { reportTable } from "./table";
import { reportJSON } from "./json";
import { reportCSV } from "./csv";
import { reportHTML } from "./html";

export function reportResults(format: string, run: BenchmarkRun): void {
  switch (format) {
    case "json":
      console.log(reportJSON(run));
      break;
    case "csv":
      console.log(reportCSV(run.results));
      break;
    case "html":
      console.log(reportHTML(run));
      break;
    default:
      reportTable(run.results);
      break;
  }
}

export { fmtDuration, printProgress } from "../util";
```

Note: `fmtDuration` and `printProgress` are utility functions that need their own small file.

- [ ] **Step 5: Create `src/core/util.ts`**

Extract `fmtDuration` and `printProgress` from current `reporter.ts`:

```ts
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
```

- [ ] **Step 6: Update `src/index.ts` imports**

Replace:
```ts
import { reportTable, reportJSON, reportCSV, reportHTML, printProgress, fmtDuration } from "./core/reporter";
```

With:
```ts
import { reportResults } from "./core/reporters";
import { printProgress, fmtDuration } from "./core/util";
```

And replace the switch block at the bottom of `main()` with:
```ts
reportResults(config.format, run);
```

- [ ] **Step 7: Delete old reporter files**

Delete `src/core/reporter.ts` and `src/core/report-html.ts`.

- [ ] **Step 8: Commit**

```bash
git add -A src/core/reporters/ src/core/util.ts src/index.ts
git rm src/core/reporter.ts src/core/report-html.ts
git commit -m "refactor: split reporter into modular files under reporters/"
```

---

## Task 8: Create HTML report module — skeleton and styles

**Files:**
- Create: `src/core/reporters/html/template.ts`
- Create: `src/core/reporters/html/styles.ts`
- Create: `src/core/reporters/html/index.ts` (placeholder, completed in Task 12)

- [ ] **Step 1: Create `src/core/reporters/html/styles.ts`**

Dashboard-style CSS as a single exported string. Includes:

- CSS variables for dark theme colors (`--bg`, `--surface`, `--border`, `--text`, `--text2`, `--accent`, adapter-specific colors)
- Base reset and body styles
- `.container` with max-width 1400px
- `.header` with title and metadata
- `.cards` grid with `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`
- `.card` with surface background, border, border-radius, box-shadow
- `.leaderboard` section with `.score-row` flex layout
- `.charts-grid` with 2-column layout, collapsing to 1 on tablet
- `.chart-wrap` with card styling
- `.table-wrap` with overflow scroll, sticky headers
- `.pivot-table` with hover rows, adapter color headers
- `.filters` flex layout with selects and checkboxes
- `.footer` centered
- Responsive breakpoints: `@media (max-width: 1024px)` for tablet, `@media (max-width: 768px)` for mobile
- `.badge` pills per adapter color
- Tooltip styling for Chart.js customization

The CSS string will be ~200 lines covering all visual elements described in the design spec.

- [ ] **Step 2: Create `src/core/reporters/html/template.ts`**

```ts
export function htmlTemplate(body: string, styles: string, scripts: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
${styles}
</style>
</head>
<body>
${body}
<script>
${scripts}
</script>
</body>
</html>`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/core/reporters/html/styles.ts src/core/reporters/html/template.ts
git commit -m "refactor: add HTML report template and dashboard styles"
```

---

## Task 9: Create HTML components — summary cards, leaderboard, methodology, detail table, footer

**Files:**
- Create: `src/core/reporters/html/components/summary-cards.ts`
- Create: `src/core/reporters/html/components/leaderboard.ts`
- Create: `src/core/reporters/html/components/methodology.ts`
- Create: `src/core/reporters/html/components/detail-table.ts`
- Create: `src/core/reporters/html/components/footer.ts`

Each component exports a function that takes `BenchmarkRun` (and any adapters info) and returns an HTML string.

- [ ] **Step 1: Create `summary-cards.ts`**

```ts
import type { BenchmarkRun, BenchmarkResult } from "../../../../types";

interface SummaryStats {
  totalOps: number;
  fastest: { name: string; wins: number; total: number };
  leanest: { name: string; wins: number; total: number };
  avgMedian: number;
  peakRam: number;
}

function getAdapterStats(results: BenchmarkResult[]): SummaryStats { ... }

export function renderSummaryCards(run: BenchmarkRun): string {
  const validResults = run.results.filter(r => !r.metrics.failed);
  const stats = getAdapterStats(run.results);
  // Returns HTML string with 5 cards in a .cards div
  // Each card: <div class="card"><div class="label">...</div><div class="value ...">...</div></div>
  ...
}
```

The `getAdapterStats` function is the same logic from current `report-html.ts` lines 417-450.

- [ ] **Step 2: Create `leaderboard.ts`**

```ts
import type { BenchmarkRun, BenchmarkResult } from "../../../../types";

interface AdapterScore {
  name: string;
  color: string;
  speedWins: number;
  ramWins: number;
  totalScore: number;
  rank: number;
}

function computeScores(results: BenchmarkResult[], adapters: string[], colors: Record<string, string>): AdapterScore[] { ... }

export function renderLeaderboard(run: BenchmarkRun, adapters: string[], colors: Record<string, string>): string {
  const scores = computeScores(run.results, adapters, colors);
  // Returns HTML string with:
  // - A .leaderboard section
  // - Each adapter as a .score-row with: rank badge, name, speed wins bar, RAM wins bar, total score
  // - Bars are div elements with width proportional to score
  ...
}
```

- [ ] **Step 3: Create `methodology.ts`**

```ts
import type { BenchmarkRun } from "../../../../types";

export function renderMethodology(run: BenchmarkRun, adapters: string[]): string {
  // Same methodology section as current report-html.ts but extracted
  // Returns HTML string with .methodology div
  ...
}
```

- [ ] **Step 4: Create `detail-table.ts`**

```ts
import type { BenchmarkRun } from "../../../../types";

export function renderDetailTable(run: BenchmarkRun, adapters: string[]): string {
  // Returns HTML string with:
  // - .filters div (size select, kind select, format select, adapter checkboxes)
  // - .table-wrap with .pivot-table (thead + tbody, populated by JS)
  // - Same structure as current report-html.ts pivot table
  ...
}
```

- [ ] **Step 5: Create `footer.ts`**

```ts
import type { BenchmarkRun } from "../../../../types";

export function renderFooter(run: BenchmarkRun): string {
  // Returns HTML string with <footer> containing:
  // - "Generated by image-processing-benchmark"
  // - Runtime + version + timestamp
  // - GitHub link with SVG icon
  ...
}
```

- [ ] **Step 6: Commit**

```bash
git add src/core/reporters/html/components/
git commit -m "refactor: add HTML report components (cards, leaderboard, table, footer)"
```

---

## Task 10: Create HTML charts data module and client scripts

**Files:**
- Create: `src/core/reporters/html/charts.ts`
- Create: `src/core/reporters/html/scripts.ts`

- [ ] **Step 1: Create `charts.ts`**

Exports functions that generate Chart.js data configurations from benchmark results:

```ts
import type { BenchmarkRun } from "../../types";

export interface ChartDataSet {
  resizeData: { labels: string[]; datasets: any[]; pctDiffs: any[] };
  convertData: { labels: string[]; datasets: any[]; pctDiffs: any[] };
  memoryData: { labels: string[]; datasets: any[]; pctDiffs: any[] };
  radarData: { labels: string[]; datasets: any[] };
  heatmapData: { ops: string[]; adapters: string[]; values: number[][] };
}

export function generateAllCharts(run: BenchmarkRun, adapters: string[], colors: Record<string, string>): ChartDataSet {
  // Aggregates results per operation/adapter for medium fixtures
  // Generates datasets for: resize bar, convert bar, memory bar, radar, heatmap
  ...
}
```

The aggregation logic comes from current `report-html.ts` `aggregate()`, `makeBarData()`, `computePctDiffs()` functions (lines 174-215).

- [ ] **Step 2: Create `scripts.ts`**

Exports a function that returns the full client-side JS string:

```ts
import type { BenchmarkRun } from "../../types";
import type { ChartDataSet } from "./charts";

export function generateScripts(run: BenchmarkRun, adapters: string[], colors: Record<string, string>, chartData: ChartDataSet): string {
  // Returns JS string with:
  // 1. window.BENCHMARK_DATA assignment
  // 2. Chart.js chart initializations (resize, convert, memory)
  // 3. Radar chart initialization
  // 4. Heatmap rendering (custom HTML/CSS)
  // 5. pctLabelPlugin (from current report-html.ts)
  // 6. Filter/table logic (from current report-html.ts)
  // 7. Sort handlers
  // 8. Adapter toggle logic
  ...
}
```

- [ ] **Step 3: Commit**

```bash
git add src/core/reporters/html/charts.ts src/core/reporters/html/scripts.ts
git commit -m "refactor: add chart data generation and client-side scripts modules"
```

---

## Task 11: Assemble HTML report index

**Files:**
- Create: `src/core/reporters/html/index.ts`

- [ ] **Step 1: Create the HTML report assembler**

```ts
import type { BenchmarkRun } from "../../types";
import { htmlTemplate } from "./template";
import { styles } from "./styles";
import { generateAllCharts } from "./charts";
import { generateScripts } from "./scripts";
import { renderSummaryCards } from "./components/summary-cards";
import { renderLeaderboard } from "./components/leaderboard";
import { renderMethodology } from "./components/methodology";
import { renderDetailTable } from "./components/detail-table";
import { renderFooter } from "./components/footer";
import { ADAPTER_COLORS } from "../../../adapters/registry";

export function reportHTML(run: BenchmarkRun): string {
  const adapters = [...new Set(run.results.map(r => r.adapterName))];
  const colors = ADAPTER_COLORS;
  const chartData = generateAllCharts(run, adapters, colors);
  const scripts = generateScripts(run, adapters, colors, chartData);

  const body = [
    renderHeader(run, adapters),
    renderSummaryCards(run),
    renderLeaderboard(run, adapters, colors),
    renderMethodology(run, adapters),
    renderChartSections(chartData),
    renderDetailTable(run, adapters),
    renderFooter(run),
  ].join("\n");

  return htmlTemplate(body, styles, scripts, "Image Processing Benchmark");
}

function renderHeader(run: BenchmarkRun, adapters: string[]): string {
  // Header with title, runtime info, date, adapter badges
  ...
}

function renderChartSections(chartData: any): string {
  // 2-column grid with resize chart, convert chart
  // Full-width memory chart
  // Full-width radar chart
  // Full-width heatmap
  ...
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/reporters/html/index.ts
git commit -m "refactor: add HTML report assembler"
```

---

## Task 12: Create ImageMagick adapter

**Files:**
- Create: `src/adapters/imagemagick.adapter.ts`
- Modify: `src/core/worker.ts` (add import)
- Modify: `Dockerfile` (add imagemagick)
- Modify: `src/config.ts` (update default adapters)

- [ ] **Step 1: Create `imagemagick.adapter.ts`**

```ts
import type { Adapter, Operation, ResizeOp, ConvertOp, ImageFormat, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";

registerAdapterColor("imagemagick", "#ff7b72");

const FORMAT_EXT: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const KERNEL_MAP: Record<string, string> = {
  lanczos3: "Lanczos",
  lanczos2: "Lanczos2",
  bilinear: "Bilinear",
  linear: "Bilinear",
  cubic: "Catrom",
  nearest: "Point",
  mitchell: "Mitchell",
};

export class ImageMagickAdapter implements Adapter {
  name = "imagemagick";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    if (operation.kind === "resize") {
      return this.executeResize(inputPath, operation, fixtureMeta);
    }
    return this.executeConvert(inputPath, operation);
  }

  private async executeResize(inputPath: string, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const targetWidth = typeof op.targetWidth === "function" ? op.targetWidth({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetWidth;
    const targetHeight = typeof op.targetHeight === "function" ? op.targetHeight({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetHeight;

    const filter = KERNEL_MAP[op.kernel] || "Lanczos";
    let geometry = `${targetWidth}x${targetHeight}`;
    if (op.fit === "inside") {
      geometry += ">";
    } else {
      geometry += "^";
    }

    const ext = FORMAT_EXT[fixtureMeta.format] || "jpg";
    return this.runImageMagick(inputPath, ext, ["-filter", filter, "-resize", geometry]);
  }

  private async executeConvert(inputPath: string, op: ConvertOp): Promise<Buffer> {
    const ext = FORMAT_EXT[op.targetFormat];
    const args: string[] = [];

    if (op.targetFormat === "jpeg") {
      args.push("-quality", String(op.quality ?? 80));
    } else if (op.targetFormat === "webp") {
      args.push("-quality", String(op.quality ?? 80));
    }

    return this.runImageMagick(inputPath, ext, args);
  }

  private async runImageMagick(inputPath: string, ext: string, extraArgs: string[]): Promise<Buffer> {
    const tmpOut = join(tmpdir(), `bench_im_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);

    const cmd = this.detectCommand();
    const args = [inputPath, ...extraArgs, tmpOut];

    const proc = Bun.spawn([cmd, ...args], { stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = new TextDecoder().decode(await new Response(proc.stderr).arrayBuffer());
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      throw new Error(`ImageMagick exited ${exitCode}: ${stderr.slice(0, 200)}`);
    }

    try {
      return Buffer.from(await Bun.file(tmpOut).arrayBuffer());
    } finally {
      try { unlinkSync(tmpOut); } catch {}
    }
  }

  private detectCommand(): string {
    try {
      const result = Bun.spawnSync(["which", "magick"], { stdout: "pipe" });
      if (result.exitCode === 0) return "magick";
    } catch {}
    return "convert";
  }
}

registerAdapter({
  name: "imagemagick",
  create: async () => new ImageMagickAdapter(),
  color: "#ff7b72",
});
```

- [ ] **Step 2: Add import to `src/core/worker.ts`**

Add after existing adapter imports:
```ts
import "../adapters/imagemagick.adapter";
```

- [ ] **Step 3: Update `Dockerfile`**

Add `imagemagick` to the `apt-get install` line:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    unzip \
    ffmpeg \
    libvips-dev \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 4: Update `src/config.ts` default adapters**

Change the default from `"sharp,bun,ffmpeg,jimp,canvas"` to `"sharp,bun,ffmpeg,jimp,canvas,imagemagick"` (photon added in next task).

- [ ] **Step 5: Commit**

```bash
git add src/adapters/imagemagick.adapter.ts src/core/worker.ts Dockerfile src/config.ts
git commit -m "feat: add ImageMagick adapter"
```

---

## Task 13: Create Photon adapter

**Files:**
- Create: `src/adapters/photon.adapter.ts`
- Modify: `src/core/worker.ts` (add import)
- Modify: `src/config.ts` (update default adapters)
- Modify: `package.json` (add dependency)

- [ ] **Step 1: Install photon-rs dependency**

```bash
bun add @aspect-build/photon-rs
```

If `@aspect-build/photon-rs` doesn't exist, try alternative packages:
- `photon-rs` (official WASM build)
- `@nicktomlin/photon-rs`

If none available, create the adapter as a stub that throws "Photon WASM bindings not yet available" and mark as experimental.

- [ ] **Step 2: Create `photon.adapter.ts`**

```ts
import type { Adapter, Operation, ResizeOp, ConvertOp, ImageFormat, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";

registerAdapterColor("photon", "#d2a8ff");

const SAMPLING_FILTERS: Record<string, number> = {
  lanczos3: 1,  // Lanczos3
  nearest: 2,   // Nearest
  bilinear: 3,  // Bilinear
  linear: 3,
  cubic: 4,     // CatmullRom
  gaussian: 5,
  lanczos2: 1,
  mitchell: 4,
};

export class PhotonAdapter implements Adapter {
  name = "photon";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const photon = await import("photon-rs" as string);
    const img = photon.open_image(inputPath);

    try {
      if (operation.kind === "resize") {
        return this.executeResize(photon, img, operation, fixtureMeta);
      }
      return this.executeConvert(photon, img, operation);
    } finally {
      // cleanup if photon exposes it
    }
  }

  private async executeResize(photon: any, img: any, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const targetWidth = typeof op.targetWidth === "function" ? op.targetWidth({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetWidth;
    const targetHeight = typeof op.targetHeight === "function" ? op.targetHeight({ ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any) : op.targetHeight;

    const filter = SAMPLING_FILTERS[op.kernel] ?? 1;
    photon.resize(img, targetWidth, targetHeight, filter);

    const output = photon.get_bytes(img);
    return Buffer.from(output);
  }

  private async executeConvert(photon: any, img: any, op: ConvertOp): Promise<Buffer> {
    switch (op.targetFormat) {
      case "jpeg": {
        const bytes = photon.get_bytes_jpeg(img, op.quality ?? 80);
        return Buffer.from(bytes);
      }
      case "png": {
        const bytes = photon.get_bytes_png(img);
        return Buffer.from(bytes);
      }
      case "webp":
        throw new Error("Photon adapter does not support WebP output");
    }
  }
}

registerAdapter({
  name: "photon",
  create: async () => new PhotonAdapter(),
  color: "#d2a8ff",
});
```

Note: The exact photon-rs API depends on which npm package is available. The implementation may need adjustment based on the actual package API discovered during Task 13 Step 1.

- [ ] **Step 3: Add import to `src/core/worker.ts`**

```ts
import "../adapters/photon.adapter";
```

- [ ] **Step 4: Update `src/config.ts` default adapters**

Change to `"sharp,bun,ffmpeg,jimp,canvas,imagemagick,photon"`.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/photon.adapter.ts src/core/worker.ts src/config.ts package.json bun.lock
git commit -m "feat: add Photon WASM adapter"
```

---

## Task 14: Fix config.ts type safety and add --help

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Rewrite config.ts**

```ts
import type { BenchmarkConfig } from "./types";

const VALID_FORMATS = ["table", "json", "csv", "html"] as const;
type ValidFormat = typeof VALID_FORMATS[number];

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
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "refactor: fix config type safety, add --help flag"
```

---

## Task 15: Update AGENTS.md and README.md

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: Update AGENTS.md**

Update the file structure section, default adapters list, and architecture description to reflect the new modular structure. Add notes about the adapter registry pattern and how to add new adapters.

- [ ] **Step 2: Update README.md**

Update the adapters table to include ImageMagick and Photon rows. Update the architecture diagram. Update default adapter list in CLI flags table.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: update AGENTS.md and README for new architecture"
```

---

## Task 16: Smoke test

**Files:**
- No new files

- [ ] **Step 1: Run a quick benchmark with 2 adapters and 2 iterations**

```bash
bun run src/index.ts --adapters sharp,bun --ops resize_down_half --warmup 1 --iterations 2 --format table
```

Expected: Table output with results, no errors.

- [ ] **Step 2: Run HTML output**

```bash
bun run src/index.ts --adapters sharp,bun --ops resize_down_half --warmup 1 --iterations 2 --format html > /tmp/test-report.html
```

Expected: HTML file generated without errors. Open in browser to verify dashboard renders.

- [ ] **Step 3: Run JSON output**

```bash
bun run src/index.ts --adapters sharp,bun --ops resize_down_half --warmup 1 --iterations 2 --format json > /tmp/test-results.json
```

Expected: Valid JSON output.

- [ ] **Step 4: Run CSV output**

```bash
bun run src/index.ts --adapters sharp,bun --ops resize_down_half --warmup 1 --iterations 2 --format csv
```

Expected: CSV output with header and data rows.

- [ ] **Step 5: Test --help**

```bash
bun run src/index.ts --help
```

Expected: Help text printed, process exits 0.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: smoke test complete, refactoring finalized"
```
