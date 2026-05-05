# AGENTS.md

## Commands

```bash
bun run src/index.ts                                    # full benchmark (all adapters, all ops)
bun run src/index.ts --adapters sharp --ops resize_down_half --warmup 5 --iterations 50
bun run src/index.ts --format json > results.json       # JSON output
bun run src/index.ts --format csv > results.csv         # CSV output
bun run src/index.ts --format html > docs/index.html    # HTML report for GitHub Pages
bun run bench:html                                       # shortcut for the above
```

CLI flags: `--adapters` (comma-separated), `--ops` (comma-separated operation IDs), `--warmup`, `--iterations`, `--format` (table|json|csv|html), `--poll-interval` (RSS polling ms).

## GitHub Pages

- `docs/index.html` is the published page; configure repo Settings → Pages → Source: `docs/` folder
- `bun run bench:html` generates it; commit and push to deploy
- HTML is self-contained with inline data + Chart.js CDN

## Runtime requirement

- **Bun canary** is required (`bun upgrade --canary`). `Bun.Image` is only available in canary builds (≥1.3.14), not in stable 1.3.13.
- **FFmpeg** and **ffprobe** must be on PATH for the `ffmpeg` adapter. Docker image includes them.

## Default adapters

Default is `sharp,bun,ffmpeg,jimp,canvas`. Override with `--adapters sharp,bun` to run a subset.

## Architecture

- `src/index.ts` — CLI entry, discovers fixtures, orchestrates benchmark tasks
- `src/core/benchmark.ts` — spawns `worker.ts` as a child process per iteration, polls RSS via `ps`; accepts `onIteration` callback for per-iteration progress
- `src/core/worker.ts` — reads JSON from stdin, dynamically imports only the needed adapter, writes JSON result to stdout
- `src/core/reporter.ts` — table/JSON/CSV/HTML output formatters, `printProgress()` for terminal progress, `fmtDuration()` for elapsed/ETA formatting
- `src/adapters/*.adapter.ts` — implement `Adapter` interface from `types.ts`
- `src/operations/definitions.ts` — defines benchmark operations (resize + convert); `targetWidth`/`targetHeight` can be functions of fixture dimensions
- `src/types.ts` — all TypeScript interfaces including `TaskProgress` and `IterationProgress` for progress reporting

## Progress reporting

- `printProgress(p: TaskProgress)` in `reporter.ts` writes a `\r`-overwriting line to **stderr** with: task counter, percentage, iteration phase/count, adapter, operation, fixture, elapsed time, ETA
- `runBenchmark()` accepts an `onIteration?: (info: IterationProgress) => void` callback called after every iteration (warmup + measure), even on errors
- `src/index.ts` passes a closure that calls `printProgress()` with full context on each iteration
- All progress goes to stderr so `bench:html` can redirect stdout (HTML) to a file while keeping progress visible in the terminal
- Completion summary ("Tamamlandı: N görev, mm:ss") is written to stderr after all tasks finish

## Key design decisions

- Each benchmark iteration runs in an isolated child process (`Bun.spawn`) so memory leaks don't accumulate across runs
- Worker uses dynamic `import()` to load only the adapter being tested — this prevents sharp/libvips (~40MB) from inflating bun adapter RSS measurements
- Peak RSS is measured by polling `ps -o rss= -p <pid>` at a configurable interval (default 10ms)
- Operation definitions with function-typed `targetWidth`/`targetHeight` are resolved to concrete numbers in `serializeOpForWorker()` before being sent to the worker (functions can't be JSON-serialized)
- Warmup iterations are discarded; only measure iterations are collected

## Adding a new adapter

1. Create `src/adapters/<name>.adapter.ts` implementing the `Adapter` interface from `types.ts`
2. Add a dynamic import branch in `src/core/worker.ts` for the new adapter name
3. The adapter will automatically be available via `--adapters <name>`

## Adding a new operation

1. Add to `RESIZE_OPERATIONS` or `CONVERT_OPERATIONS` in `src/operations/definitions.ts`
2. Convert ops only run on fixtures matching `sourceFormat`; resize ops run on all fixtures

## Gotchas

- `Bun.Image` must be cast as `(Bun as any).Image` because `@types/bun` doesn't include the canary-only type yet
- Sharp's `.metadata()` call on a pipeline doesn't consume it — the same pipeline object can be used for subsequent `.resize().toBuffer()`
- Fixture dimensions are hardcoded in `FIXTURE_DIMS` map in `src/index.ts` rather than read from files at runtime
- There are no tests. The project is a CLI benchmark tool, not a library.
