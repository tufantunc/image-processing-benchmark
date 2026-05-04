# Image Processing Benchmark

Node.js ekosistemindeki image processing araçlarını süre ve RAM kullanımı bazında karşılaştırmak için benchmark framework'ü.

## Hedefler

- `sharp` vs `bun` native image API karşılaştırması
- Her operasyon için **çalışma süresi (ms)** ve **peak RAM kullanımı (MB)** ölçümü
- Plugin/adapter mimarisi ile yeni araçların kolayca entegre edilmesi
- Sonuçların tablo ve JSON formatında raporlanması

## Mimari

```
src/
├── core/
│   ├── runner.ts            # Benchmark runner - her adapter'ı child process'te çalıştırır
│   ├── metrics.ts           # time + RSS ölçüm utilities
│   ├── types.ts             # Ortak tip tanımları (Adapter, Operation, BenchmarkResult)
│   └── reporter.ts          # Sonuçları formatlar (table, JSON, CSV)
├── adapters/
│   ├── base.adapter.ts      # Abstract adapter sınıfı
│   ├── sharp.adapter.ts     # Sharp implementasyonu
│   └── bun-native.adapter.ts # Bun native image API implementasyonu
├── operations/
│   └── definitions.ts       # Ortak operasyon listesi (resize, grayscale, rotate, blur, crop)
├── fixtures/
│   └── generate.ts          # Test görsellerini oluşturur (farklı boyutlarda)
├── config.ts                # Benchmark ayarları (warmup iterasyon, ölçüm iterasyon vs.)
└── index.ts                 # CLI entry point
```

## Adapter Interface

```ts
type OperationName = "resize" | "grayscale" | "rotate" | "blur" | "crop" | "convert" | "compress";

interface Operation {
  name: OperationName;
  params: Record<string, unknown>;
}

interface AdapterRunResult {
  outputBuffer: Buffer;
  durationMs: number;
  peakMemoryBytes: number;
}

interface ImageAdapter {
  name: string;
  supportedOps: OperationName[];
  execute(op: Operation, inputPath: string, outputPath: string): Promise<AdapterRunResult>;
}
```

## Runner Stratejisi

Her benchmark şu şekilde çalışır:

1. **Isolation**: Her adapter ayrı bir child process'te çalışır (`child_process.fork` veya `Bun.spawn`)
   - Böylece bir adapter'ın memory leak'i diğerini etkilemez
   - Peak RSS doğru ölçülebilir (`process.memoryUsage().rss` + `maxRSS`)

2. **Warmup**: İlk N iterasyon atlanır (JIT compilation, cache warmup için)

3. **Measurement**: M iterasyon boyunca her çalıştırmanın süresi ve RSS'i kaydedilir

4. **Aggregation**: Median, mean, min, max, P95, P99 hesaplanır

```
┌──────────┐    spawn     ┌─────────────────────┐
│  Runner   │ ──────────► │  Child Process       │
│  (main)   │             │  ┌───────────────┐   │
│           │ ◄────────── │  │ Adapter.run() │   │
│  metrics  │   result    │  └───────────────┘   │
│  collect  │             └─────────────────────┘
└──────────┘
```

## Memory Ölçüm Yaklaşımları

### Seçenek A: In-process measurement
```ts
// Child process içinde
global.gc?.(); // GC'yi zorla (--expose-gc flag ile çalıştırılmalı)
const startMem = process.memoryUsage();
// ... işlem ...
const endMem = process.memoryUsage();
const peak = Math.max(startMem.heapUsed, endMem.heapUsed);
```

### Seçenek B: OS-level measurement (önerilen)
```ts
// Runner tarafında, child process'in RSS'ini izle
const child = fork("./adapter-runner.js");
const memSamples: number[] = [];
const pollInterval = setInterval(() => {
  // /proc/<pid>/status (Linux) veya ps komutu (macOS)
  const rss = getChildRSS(child.pid!);
  memSamples.push(rss);
}, 10); // 10ms poll interval
```

**Seçenek B önerilir** çünkü:
- In-process heap measurement native addon'ların (libvips/sharp) dışarıda ayırdığı RAM'i göremez
- OS-level RSS tüm memory kullanımını (shared libraries dahil) kapsar

## Benchmark Operasyonları

| Operasyon    | Parametreler                    | Açıklama                          |
|-------------|---------------------------------|-----------------------------------|
| resize      | `{ width, height, fit }`       | Boyutlandırma                     |
| grayscale   | `{}`                            | Siyah-beyaz dönüşümü              |
| rotate      | `{ angle }`                     | Döndürme                          |
| blur        | `{ sigma }`                     | Gaussian blur                     |
| crop        | `{ x, y, width, height }`      | Kırpma                            |
| convert     | `{ format: "jpeg"|"png"|"webp"}` | Format dönüşümü                 |
| compress    | `{ quality }`                   | Sıkıştırma (format bazlı)         |

## Test Fixtures

Farklı boyutlarda test görselleri:

- `small.jpg` (100x100, ~5KB)
- `medium.jpg` (1920x1080, ~500KB)
- `large.jpg` (3840x2160, ~2MB)
- `huge.png` (6000x4000, ~15MB, PNG - decompression stress testi)

## Rapor Formatı

### Tablo (CLI)
```
┌──────────────────┬───────────┬───────────┬──────────┬──────────┬─────────┐
│ Operation        │ Adapter   │ Median ms │ Mean ms  │ P95 ms   │ Peak MB │
├──────────────────┼───────────┼───────────┼──────────┼──────────┼─────────┤
│ resize(800,600)  │ sharp     │ 12.3      │ 13.1     │ 18.2     │ 45.2    │
│ resize(800,600)  │ bun-native│ 8.1       │ 9.4      │ 14.7     │ 22.1    │
│ grayscale        │ sharp     │ 5.2       │ 5.8      │ 8.1      │ 38.4    │
│ grayscale        │ bun-native│ 3.9       │ 4.1      │ 6.3      │ 18.7    │
└──────────────────┴───────────┴───────────┴──────────┴──────────┴─────────┘
```

### JSON
```json
{
  "timestamp": "2026-05-04T...",
  "runtime": { "name": "bun", "version": "1.2.x" },
  "results": [
    {
      "operation": "resize",
      "params": { "width": 800, "height": 600 },
      "adapter": "sharp",
      "fixture": "medium.jpg",
      "iterations": 100,
      "metrics": {
        "medianMs": 12.3,
        "meanMs": 13.1,
        "minMs": 10.8,
        "maxMs": 22.4,
        "p95Ms": 18.2,
        "p99Ms": 20.1,
        "peakMemoryMB": 45.2,
        "meanMemoryMB": 40.1
      }
    }
  ]
}
```

## Yeni Adapter Ekleme (Örnek: Rust)

1. Rust projesini `adapters/rust-image/` altına oluştur
2. CLI binary compile et: input path, operation, params, output path argüman olarak alsın
3. `adapters/rust.adapter.ts` oluştur:

```ts
import { ImageAdapter, Operation, AdapterRunResult } from "../core/types";

export class RustAdapter implements ImageAdapter {
  name = "rust-image";
  supportedOps = ["resize", "grayscale", "blur"];
  private binaryPath = "./adapters/rust-image/target/release/rust-image";

  async execute(op: Operation, inputPath: string, outputPath: string): Promise<AdapterRunResult> {
    const start = performance.now();
    const proc = Bun.spawn([
      this.binaryPath,
      "--input", inputPath,
      "--output", outputPath,
      "--operation", op.name,
      "--params", JSON.stringify(op.params),
    ]);
    await proc.exited;
    const durationMs = performance.now() - start;
    // RSS ölçümü runner tarafından yapılır
    return { outputBuffer: await Bun.file(outputPath).arrayBuffer(), durationMs, peakMemoryBytes: 0 };
  }
}
```

4. `config.ts`'ye adapter'ı kaydet.

## Teknoloji Seçimleri

| Katman       | Seçim        | Sebeç                                       |
|-------------|-------------|----------------------------------------------|
| Runtime      | Bun         | Native image API + hızlı startup             |
| Language     | TypeScript  | Tip güvenliği + adapter pattern için uygun   |
| CLI Framework| Yerleşik    | Sadece `process.argv`, gereksiz dependency yok |
| Table Output | `cli-table3`| En hafif tablo library'si                    |
| Chart (opsiyonel) | `asciichart` | Terminal içi grafik                      |

## CLI Kullanımı (Plan)

```bash
# Tüm benchmark'ları çalıştır
bun run src/index.ts

# Sadece belirli operasyonlar
bun run src/index.ts --ops resize,grayscale

# Sadece belirli adapter'lar
bun run src/index.ts --adapters sharp,bun-native

# İterasyon sayısı
bun run src/index.ts --iterations 500 --warmup 50

# Çıktı formatı
bun run src/index.ts --format json > results.json
bun run src/index.ts --format csv > results.csv
bun run src/index.ts --format table  # default
```

## Geliştirme Aşamaları

### Phase 1: Temel Altyapı
- [ ] `core/types.ts` - Tip tanımları
- [ ] `core/metrics.ts` - Zaman ve RAM ölçüm yardımcıları
- [ ] `core/runner.ts` - Child process tabanlı benchmark runner
- [ ] `core/reporter.ts` - Tablo ve JSON rapor çıktıları
- [ ] `config.ts` - Benchmark konfigürasyonu

### Phase 2: Adapter'lar
- [ ] `adapters/sharp.adapter.ts` - Sharp implementasyonu
- [ ] `adapters/bun-native.adapter.ts` - Bun native image API implementasyonu

### Phase 3: Fixtures & Operasyonlar
- [ ] `operations/definitions.ts` - Tüm operasyon tanımları
- [ ] `fixtures/generate.ts` - Test görseli üretici (sharp ile)

### Phase 4: CLI & Raporlama
- [ ] `index.ts` - CLI entry point
- [ ] Argüman parsing
- [ ] Tablo çıktı formatı (cli-table3)
- [ ] JSON çıktı formatı

### Phase 5: Genişletme
- [ ] Rust adapter örneği
- [ ] Sonuç karşılaştırma modu (önceki çalıştırma ile diff)
- [ ] HTML dashboard (opsiyonel)
