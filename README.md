<h1 align="center">Image Processing Benchmark</h1>

<p align="center">
  <strong>Fair, reproducible benchmarks comparing popular image processing libraries on speed and memory usage.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/runtime-Bun-canary-orange" alt="Bun Canary">
  <img src="https://img.shields.io/badge/language-TypeScript-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/badge/adapters-5-purple" alt="5 Adapters">
</p>

---

## Why This Exists

Choosing an image processing library often comes down to word-of-mouth or outdated blog posts. This project provides a **transparent, reproducible** benchmark suite so you can compare adapters on your own hardware with your own test images — and see exactly how the numbers are produced.

**Key design goals:**

- **Isolation** — each iteration runs in a separate process so memory leaks don't accumulate
- **Fairness** — adapters are loaded dynamically so one library's native bindings don't inflate another's memory footprint
- **Reproducibility** — Docker support, fixed test fixtures, and deterministic CLI flags

## Table of Contents

- [Adapters](#adapters)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Operations](#operations)
- [HTML Report](#html-report)
- [Architecture](#architecture)
- [Extending](#extending)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

## Adapters

| Adapter | Type | WebP In | WebP Out | Notes |
|---------|------|:-------:|:--------:|-------|
| **sharp** | Native (libvips) | ✅ | ✅ | Most popular Node.js image library |
| **bun** | Native (Rust) | ✅ | ✅ | Bun's built-in `Bun.Image` API |
| **ffmpeg** | CLI tool | ✅ | ❌ | Multimedia framework; resize only |
| **jimp** | Pure JavaScript | ❌ | ✅ | Zero native dependencies (WebP via WASM) |
| **canvas** | Native (Skia) | ✅ | ✅ | `@napi-rs/canvas`, zero system deps |

## Quick Start

### Docker (recommended)

No local tool installation needed:

```bash
./run-bench.sh --format html > results.html
```

### Local

> **Prerequisites:** [Bun canary](https://bun.sh) (`bun upgrade --canary`) and [FFmpeg](https://ffmpeg.org/) on PATH.

```bash
bun install
bun run src/index.ts
```

## Usage

```bash
# All adapters, all operations, table output (default)
bun run src/index.ts

# Specific adapters and operations
bun run src/index.ts --adapters sharp,bun --ops resize_down_half --iterations 20

# Output formats
bun run src/index.ts --format json > results.json
bun run src/index.ts --format csv > results.csv
bun run src/index.ts --format html > results.html

# Tune benchmark parameters
bun run src/index.ts --warmup 5 --iterations 50 --poll-interval 10
```

### Docker wrapper (`run-bench.sh`)

```bash
./run-bench.sh --format html > results.html
./run-bench.sh --adapters sharp,bun --ops resize_down_half --iterations 20
./run-bench.sh --build --format table          # force rebuild
./run-bench.sh --fixtures-dir ./my-fixtures    # custom test images
```

Or use Docker directly:

```bash
docker build -t image-processing-benchmark .
docker run --rm image-processing-benchmark --format html > results.html
docker run --rm -v $(pwd)/my-fixtures:/app/fixtures:ro image-processing-benchmark --format json
```

### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--adapters` | `sharp,bun,ffmpeg,jimp,canvas` | Comma-separated adapter names |
| `--ops` | All operations | Comma-separated operation IDs |
| `--warmup` | `10` | Warmup iterations (discarded) |
| `--iterations` | `50` | Measure iterations |
| `--format` | `table` | `table`, `json`, `csv`, or `html` |
| `--poll-interval` | `10` | RSS polling interval (ms) |

## How It Works

### Isolation

Each benchmark iteration runs in an **isolated child process** (`Bun.spawn`). This prevents memory leaks from accumulating across runs and ensures accurate peak RSS measurement.

Workers use dynamic `import()` to load only the adapter being tested — this prevents heavy native libraries (e.g., libvips ~40 MB) from inflating other adapters' RSS measurements.

### Measurement

- **Time:** `performance.now()` before and after `adapter.execute()` in the worker process
- **Memory:** Peak RSS measured by polling `ps -o rss= -p <pid>` at a configurable interval
- **Metrics:** Median, mean, min, max, P95, P99 computed across all measure iterations
- **Warmup:** First N iterations are discarded to allow JIT compilation and cache warming

### Test Fixtures

27 test images: **3 types** (landscape, portrait, city) × **3 sizes** (small, medium, large) × **3 formats** (JPEG, PNG, WebP).

| Size | Resolution | Approx. file size |
|------|-----------|-------------------|
| Small | 256 px | 2–50 KB |
| Medium | 1920 px | 50–5 000 KB |
| Large | 3840 px | 200–15 000 KB |

## Operations

### Resize (7 operations)

| ID | Description |
|----|-------------|
| `resize_down_half` | Resize to 50% dimensions |
| `resize_inside_800x600` | Resize to fit inside 800×600 |
| `resize_fill_800x600` | Resize to fill 800×600 |
| `resize_thumbnail_256` | Resize to 256×256 thumbnail |
| `resize_upscale_2x` | Upscale to 200% dimensions |
| `resize_kernel_nearest` | Resize 50% with nearest-neighbor |
| `resize_kernel_lanczos3` | Resize 50% with Lanczos3 |

### Format Conversion (6 operations)

| ID | Description |
|----|-------------|
| `convert_jpeg_to_png` | JPEG → PNG |
| `convert_jpeg_to_webp` | JPEG → WebP (quality 80) |
| `convert_png_to_jpeg` | PNG → JPEG (quality 85) |
| `convert_png_to_webp` | PNG → WebP (quality 80) |
| `convert_webp_to_jpeg` | WebP → JPEG (quality 85) |
| `convert_webp_to_png` | WebP → PNG |

## HTML Report

The HTML report is a self-contained page with inline data and Chart.js charts:

```bash
bun run src/index.ts --format html > docs/index.html
```

**Features:**

- Summary cards (fastest adapter, least RAM, avg median, peak RAM)
- Bar charts for resize, convert, and memory with percentage comparison labels
- Sortable/filterable pivot table with per-adapter metrics
- Dark theme, responsive layout

## Architecture

```
src/
├── index.ts                          # CLI entry point
├── config.ts                         # CLI argument parsing
├── types.ts                          # Shared type definitions
├── core/
│   ├── benchmark.ts                  # Spawns worker per iteration, polls RSS
│   ├── worker.ts                     # Reads stdin, runs adapter, writes stdout
│   ├── metrics.ts                    # calculateStats, getChildRSS
│   ├── reporter.ts                   # reportTable, reportJSON, reportCSV
│   └── report-html.ts               # Full HTML report with Chart.js
├── adapters/
│   ├── sharp.adapter.ts             # sharp (libvips)
│   ├── bun.adapter.ts               # Bun.Image
│   ├── ffmpeg.adapter.ts            # ffmpeg CLI
│   ├── jimp.adapter.ts              # Jimp (pure JS + WASM WebP)
│   └── canvas.adapter.ts            # @napi-rs/canvas (Skia)
├── operations/
│   └── definitions.ts               # Operation definitions + helpers
fixtures/                             # 27 test images
```

## Extending

### Adding a New Adapter

1. Create `src/adapters/<name>.adapter.ts` implementing the `Adapter` interface:

```ts
import type { Adapter, Operation } from "../types";

export class MyAdapter implements Adapter {
  name = "my-adapter";

  async execute(operation: Operation, inputPath: string): Promise<Buffer> {
    // resize: operation.kind === "resize"
    // convert: operation.kind === "convert"
    return outputBuffer;
  }
}
```

2. Add a dynamic import branch in `src/core/worker.ts`:

```ts
} else if (input.adapterName === "my-adapter") {
  const { MyAdapter } = await import("../adapters/my-adapter.adapter");
  adapter = new MyAdapter();
}
```

3. Add a CSS color in `src/core/report-html.ts` (`COLORS` map + CSS variables).
4. Run: `bun run src/index.ts --adapters my-adapter`

### Adding a New Operation

1. Add an entry to `RESIZE_OPERATIONS` or `CONVERT_OPERATIONS` in `src/operations/definitions.ts`
2. Convert operations only run on fixtures matching `sourceFormat`; resize operations run on all fixtures

## Known Limitations

- **Jimp** cannot read WebP images (no decode support). WebP fixtures will show 0.00 for Jimp.
- **FFmpeg** WebP output encoding depends on build-time libwebp support. The Docker image includes it; some local builds may not.
- **Jimp** does not support Lanczos resampling. Lanczos operations fall back to bicubic interpolation.
- `Bun.Image` must be cast as `(Bun as any).Image` because `@types/bun` doesn't include canary-only types yet.

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. Create a **feature branch**: `git checkout -b my-feature`
3. **Commit** your changes: `git commit -am 'Add new feature'`
4. **Push** to the branch: `git push origin my-feature`
5. Open a **Pull Request**

Ideas for contributions:

- New adapters (e.g., Squoosh, ImageMagick, Photon)
- New operations or test fixtures
- Improvements to the HTML report
- Platform-specific benchmarks (Windows, ARM)

Please ensure your changes work by running:

```bash
bun run src/index.ts --adapters <your-adapter> --iterations 5
```

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Bun | `Bun.Image` native API, fast startup |
| Language | TypeScript | Type safety, adapter pattern |
| CLI | `process.argv` | Zero dependencies |
| Tables | `cli-table3` | Lightweight table formatting |
| Charts | Chart.js | HTML report visualization |

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
