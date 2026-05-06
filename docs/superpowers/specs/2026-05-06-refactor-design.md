# Refactor Design: Code Architecture + HTML Dashboard

**Date:** 2026-05-06
**Status:** Approved
**Approach:** B — Modular Architecture + Template Engine

---

## Goals

1. Cleaner, modular code architecture with adapter registry pattern
2. Professional dashboard-style HTML report with interactive charts
3. Two new adapters: ImageMagick and Photon
4. Better type safety, reduced code duplication
5. Responsive design for all screen sizes

## Non-Goals

- CI/CD pipeline (deferred)
- Light/dark theme toggle
- Historical benchmark comparison
- New operations or test fixtures

---

## 1. Code Architecture

### 1.1 Adapter Registry Pattern

Replace hardcoded if-else chain in `worker.ts` with a central registry.

**`src/adapters/registry.ts`:**

```ts
import type { Adapter } from "../types";

interface AdapterEntry {
  name: string;
  create: () => Promise<Adapter>;
  color: string;
}

const entries: AdapterEntry[] = [];

export function registerAdapter(entry: AdapterEntry): void {
  entries.push(entry);
}

export function getAdapterByName(name: string): AdapterEntry | undefined {
  return entries.find((e) => e.name === name);
}

export function getAllAdapterEntries(): AdapterEntry[] {
  return entries;
}
```

Each adapter file self-registers via a top-level call:

```ts
// src/adapters/sharp.adapter.ts
import { registerAdapter } from "./registry";

class SharpAdapter implements Adapter { ... }

registerAdapter({
  name: "sharp",
  create: async () => new SharpAdapter(),
  color: "#f47067",
});
```

`worker.ts` does a dynamic import of the registry file and looks up the adapter by name. Adding a new adapter = create one file + add import line to registry.

### 1.2 Adapter Metadata Standardization

Currently every adapter creates a fake `Fixture` object to resolve dimensions via `resolveOpDimensions()`. This is redundant because the worker already receives fixture metadata.

**Changes:**

- `Adapter.execute()` signature changes to: `execute(operation, inputPath, fixtureMeta)` where `fixtureMeta: { width: number; height: number; format: ImageFormat }`
- Benchmark runner serializes fixture metadata into the worker payload alongside operation data
- Adapters use `fixtureMeta` directly instead of reading metadata from the file
- Removes duplicate metadata reading in sharp, bun, ffmpeg, jimp, canvas adapters
- Sharp can skip `pipeline.metadata()` call entirely for resize operations (still used for convert to know input format, but `fixtureMeta.format` covers this)

### 1.3 Reporter Modularization

Split `reporter.ts` and `report-html.ts` into separate modules:

```
src/core/reporters/
├── index.ts            # Format router
├── table.ts            # CLI table output
├── json.ts             # JSON output
├── csv.ts              # CSV output
└── html/
    ├── index.ts        # Main HTML generator (assembles parts)
    ├── template.ts     # HTML skeleton (head, body open/close)
    ├── styles.ts       # CSS string
    ├── scripts.ts      # Client-side JS (Chart.js logic, filters, sort)
    ├── charts.ts       # Chart data generation functions
    └── components/     # HTML fragment generators
        ├── summary-cards.ts
        ├── leaderboard.ts
        ├── methodology.ts
        ├── detail-table.ts
        └── footer.ts
```

Each file exports a function that returns an HTML string. The main `index.ts` calls them in order and concatenates.

### 1.4 Config Type Safety

Fix `config.ts`:

- Remove unused `short` parameter from `getArg()`
- Add format validation (`table | json | csv | html`)
- Type the return of `getArg` properly
- Add `--help` flag support

### 1.5 Fixture Metadata Extraction

Move `FIXTURE_DIMS` map and `discoverFixtures()` from `index.ts` to `src/fixtures/meta.ts`.

### 1.6 Final File Structure

```
src/
├── index.ts                        # CLI entry (orchestration only)
├── config.ts                       # Typed CLI parsing
├── types.ts                        # All TypeScript interfaces
├── fixtures/
│   └── meta.ts                     # FIXTURE_DIMS + discoverFixtures
├── core/
│   ├── benchmark.ts                # Spawns worker, polls RSS
│   ├── worker.ts                   # Registry-based adapter loading
│   ├── metrics.ts                  # Stats calculation
│   └── reporters/
│       ├── index.ts                # Format router
│       ├── table.ts
│       ├── json.ts
│       ├── csv.ts
│       └── html/
│           ├── index.ts
│           ├── template.ts
│           ├── styles.ts
│           ├── scripts.ts
│           ├── charts.ts
│           └── components/
│               ├── summary-cards.ts
│               ├── leaderboard.ts
│               ├── methodology.ts
│               ├── detail-table.ts
│               └── footer.ts
├── adapters/
│   ├── registry.ts                 # Adapter lookup
│   ├── sharp.adapter.ts
│   ├── bun.adapter.ts
│   ├── ffmpeg.adapter.ts
│   ├── jimp.adapter.ts
│   ├── canvas.adapter.ts
│   ├── imagemagick.adapter.ts      # New
│   └── photon.adapter.ts           # New
└── operations/
    └── definitions.ts              # Unchanged
```

---

## 2. HTML Report Design (Dashboard)

### 2.1 Layout

Full-width dashboard grid layout. Dark theme with colored accents per adapter.

```
┌─────────────────────────────────────────────────┐
│  Header: Title + Runtime + Date + Adapter badges │
├────────┬────────┬────────┬────────┬─────────────┤
│ Tests  │ Fastest│ Leanest│ Avg ms │ Peak RAM    │
│ Run    │ Adapter│ RAM    │        │             │
├────────┴────────┴────────┴────────┴─────────────┤
│  Leaderboard / Scoreboard                        │
│  (Speed wins, RAM wins, total score per adapter) │
├──────────────────────┬──────────────────────────┤
│  Resize Bar Chart    │  Convert Bar Chart       │
│  (comparative)       │  (comparative)           │
├──────────────────────┴──────────────────────────┤
│  Memory Heatmap (adapter x operation grid)       │
├──────────────────────────────────────────────────┤
│  Radar Chart: Adapter strength/weakness profile  │
├──────────────────────────────────────────────────┤
│  Detailed Pivot Table (filterable, sortable)     │
└──────────────────────────────────────────────────┘
```

### 2.2 Chart Components

1. **Summary Cards** — 5 cards in a responsive grid: Tests Run, Fastest Adapter, Least RAM, Avg Median, Peak RAM. Same as current but improved styling.

2. **Leaderboard/Scoreboard** — New section. Per adapter: speed wins count, RAM wins count, total score (speed + RAM combined), rank. Visual bar chart showing relative scores. Color-coded per adapter.

3. **Resize Bar Chart** — Grouped bar chart (Chart.js). Median duration per operation, grouped by adapter. Percentage diff labels on fastest bar. Rich tooltips showing: median, mean, min, max, p95, p99, iterations, output size.

4. **Convert Bar Chart** — Same pattern as resize, for convert operations.

5. **Memory Heatmap** — New chart. Grid layout: rows = operations, columns = adapters. Cell color intensity based on peak RAM (darker = more RAM). Hover shows exact value. Implemented as Chart.js matrix plugin or custom HTML table with CSS gradients.

6. **Radar Chart** — New chart. Per adapter, axes: resize speed, convert speed, memory efficiency, small image perf, large image perf. Normalized scores. Shows strength/weakness profile at a glance.

7. **Detailed Pivot Table** — Enhanced version of current table. Filter controls: Size (All/Small/Medium/Large), Kind (All/Resize/Convert), Format (All/JPEG/PNG/WebP). Adapter checkbox toggles. Sortable columns. Winner highlighting with adapter color. Speedup column.

### 2.3 Interactive Features

- **Filter segments:** Size, Kind, Format dropdowns — all charts update simultaneously
- **Adapter toggle:** Checkboxes per adapter — all charts update simultaneously
- **Rich tooltips:** On chart hover show min/max/mean/p95/p99 + iterations + output size
- **Chart.js tooltip callbacks** for custom formatting

### 2.4 Responsive Design

- **Desktop (>1024px):** 2-column grid for charts, 5 summary cards in row
- **Tablet (768-1024px):** Single column charts, 3+2 summary cards, table scrollable
- **Mobile (<768px):** Single column everything, horizontal scroll on table, smaller fonts, stacked cards
- CSS Grid + `clamp()` for fluid typography
- `@media` breakpoints at 768px and 1024px

### 2.5 Visual Style

- Dark dashboard theme (background: #0d1117, surface: #161b22, border: #30363d)
- Per-adapter colors:
  - sharp: `#f47067` (red)
  - bun: `#70d0ff` (blue)
  - ffmpeg: `#bc8cff` (purple)
  - jimp: `#e3b341` (yellow)
  - canvas: `#39d353` (green)
  - imagemagick: `#ff7b72` (coral)
  - photon: `#d2a8ff` (lavender)
- Cards with subtle box-shadow and border-radius
- Chart areas in separate cards
- Chart.js for all charts (CDN loaded, no build step)

---

## 3. New Adapters

### 3.1 ImageMagick Adapter

- Uses `magick` CLI command (ImageMagick 7) with fallback to `convert` (v6)
- Resize: `-resize WxH` with `>` modifier for "inside" fit, `^` for "fill" fit
- Convert: `-quality N` for JPEG/WebP, auto for PNG
- Kernel mapping: `-filter Lanczos/Point/Mitchell/Bilinear`
- WebP support: yes (if system libwebp available)
- Temp file approach: pipe to stdout when possible, tmpfile fallback for complex operations
- Docker: `apt-get install imagemagick` added to Dockerfile

### 3.2 Photon Adapter

- Uses `@aspect-build/photon-rs` npm package (Rust WASM bindings)
- Resize: `photon.resize(img, width, height, sampling_filter)` — supports Lanczos3, Nearest, Bilinear, CatmullRom, Gaussian
- Convert: JPEG and PNG output supported. WebP output may not be supported — adapter will throw for unsupported conversions
- If WASM bindings are not stable enough, adapter marked as "experimental" in docs
- Zero native system dependencies (pure WASM)

### 3.3 Docker Changes

```dockerfile
RUN apt-get install -y ... imagemagick ...
```

Photon needs no system deps (WASM).

---

## 4. Adapter Interface Changes

### Before

```ts
interface Adapter {
  name: string;
  execute(operation: Operation, inputPath: string): Promise<Buffer>;
}
```

### After

```ts
interface Adapter {
  name: string;
  execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer>;
}

interface FixtureMeta {
  width: number;
  height: number;
  format: ImageFormat;
}
```

This eliminates duplicate metadata reading in every adapter.

---

## 5. Migration Notes

- `Bun.Image` cast as `(Bun as any).Image` remains (canary-only type)
- Worker process isolation pattern unchanged
- RSS polling mechanism unchanged
- CLI flags unchanged (backward compatible)
- `--adapters` default updated to include all 7 adapters
- HTML output remains self-contained (inline data + Chart.js CDN)
