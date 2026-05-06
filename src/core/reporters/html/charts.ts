import type { BenchmarkRun } from "../../../types";

interface AggRow {
  key: { opId: string; opLabel: string; opKind: string; adapterName: string };
  medianMs: number;
  peakMemoryMB: number;
  meanMemoryMB: number;
  count: number;
}

export function aggregateByOperation(run: BenchmarkRun): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const r of run.results) {
    if (r.metrics.failed) continue;
    const k = `${r.operation.id}::${r.adapterName}`;
    const existing = map.get(k);
    if (existing) {
      existing.medianMs += r.metrics.medianMs;
      existing.peakMemoryMB = Math.max(existing.peakMemoryMB, r.metrics.peakMemoryMB);
      existing.meanMemoryMB += r.metrics.meanMemoryMB;
      existing.count++;
    } else {
      map.set(k, {
        key: {
          opId: r.operation.id,
          opLabel: r.operation.label,
          opKind: r.operation.kind,
          adapterName: r.adapterName,
        },
        medianMs: r.metrics.medianMs,
        peakMemoryMB: r.metrics.peakMemoryMB,
        meanMemoryMB: r.metrics.meanMemoryMB,
        count: 1,
      });
    }
  }
  const rows = [...map.values()];
  for (const row of rows) {
    row.medianMs /= row.count;
    row.meanMemoryMB /= row.count;
  }
  return rows;
}

function avgScore(
  results: BenchmarkRun["results"],
  adapterNames: string[],
  metric: "medianMs" | "peakMemoryMB",
  invert: boolean,
): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const n of adapterNames) buckets[n] = [];
  for (const r of results) {
    if (r.metrics.failed) continue;
    const v = r.metrics[metric] as number;
    if (v > 0) buckets[r.adapterName].push(v);
  }
  const avgs: Record<string, number> = {};
  let lo = Infinity,
    hi = 0;
  for (const n of adapterNames) {
    const arr = buckets[n];
    avgs[n] = arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
    if (avgs[n] > 0) {
      lo = Math.min(lo, avgs[n]);
      hi = Math.max(hi, avgs[n]);
    }
  }
  const range = hi - lo || 1;
  const out: Record<string, number> = {};
  for (const n of adapterNames) {
    if (avgs[n] === 0) { out[n] = 0; continue; }
    out[n] = invert
      ? ((hi - avgs[n]) / range) * 100
      : ((avgs[n] - lo) / range) * 100;
  }
  return out;
}

export function generateBarData(
  agg: AggRow[],
  kind: string,
  adapterNames: string[],
  adapterColors: Record<string, string>,
) {
  const ops = [...new Set(agg.filter((a) => a.key.opKind === kind).map((a) => a.key.opLabel))];
  const datasets = adapterNames.map((name) => {
    const data = ops.map((opLabel) => {
      const row = agg.find((a) => a.key.adapterName === name && a.key.opLabel === opLabel);
      return row ? Math.round(row.medianMs * 100) / 100 : 0;
    });
    return {
      label: name,
      data,
      backgroundColor: (adapterColors[name] || "#888") + "cc",
      borderColor: adapterColors[name] || "#888",
      borderWidth: 1,
      borderRadius: 4,
    };
  });
  return { labels: ops, datasets };
}

export function generateMemoryData(
  agg: AggRow[],
  adapterNames: string[],
  adapterColors: Record<string, string>,
) {
  const ops = [...new Set(agg.map((a) => a.key.opLabel))];
  const datasets = adapterNames.map((name) => {
    const data = ops.map((opLabel) => {
      const row = agg.find((a) => a.key.adapterName === name && a.key.opLabel === opLabel);
      return row ? Math.round(row.peakMemoryMB * 10) / 10 : 0;
    });
    return {
      label: name,
      data,
      backgroundColor: (adapterColors[name] || "#888") + "cc",
      borderColor: adapterColors[name] || "#888",
      borderWidth: 1,
      borderRadius: 4,
    };
  });
  return { labels: ops, datasets };
}

export function generateRadarData(
  run: BenchmarkRun,
  adapterNames: string[],
  adapterColors: Record<string, string>,
) {
  const ok = run.results.filter((r) => !r.metrics.failed);
  const resizeSpeed = avgScore(ok.filter((r) => r.operation.kind === "resize"), adapterNames, "medianMs", true);
  const convertSpeed = avgScore(ok.filter((r) => r.operation.kind === "convert"), adapterNames, "medianMs", true);
  const memEff = avgScore(ok, adapterNames, "peakMemoryMB", true);
  const smallPerf = avgScore(ok.filter((r) => r.fixture.size === "small"), adapterNames, "medianMs", true);
  const largePerf = avgScore(ok.filter((r) => r.fixture.size === "large"), adapterNames, "medianMs", true);

  const datasets = adapterNames.map((name) => ({
    label: name,
    data: [
      Math.round(resizeSpeed[name] ?? 0),
      Math.round(convertSpeed[name] ?? 0),
      Math.round(memEff[name] ?? 0),
      Math.round(smallPerf[name] ?? 0),
      Math.round(largePerf[name] ?? 0),
    ],
    backgroundColor: (adapterColors[name] || "#888") + "33",
    borderColor: adapterColors[name] || "#888",
    borderWidth: 2,
    pointBackgroundColor: adapterColors[name] || "#888",
    pointBorderColor: "#fff",
    pointRadius: 4,
  }));

  return {
    labels: ["Resize Speed", "Convert Speed", "Memory Efficiency", "Small Perf", "Large Perf"],
    datasets,
  };
}

export function generateHeatmapData(
  run: BenchmarkRun,
  adapterNames: string[],
) {
  const ops = [...new Set(run.results.map((r) => `${r.operation.kind}::${r.operation.label}`))];
  const opLabels = ops.map((o) => o.split("::")[1]);
  const values: (number | null)[][] = [];

  for (const opKey of ops) {
    const [kind, label] = opKey.split("::");
    const row: (number | null)[] = [];
    for (const adapterName of adapterNames) {
      const matches = run.results.filter(
        (r) =>
          r.operation.kind === kind &&
          r.operation.label === label &&
          r.adapterName === adapterName &&
          !r.metrics.failed,
      );
      if (matches.length === 0) {
        row.push(null);
      } else {
        row.push(Math.round(Math.max(...matches.map((m) => m.metrics.peakMemoryMB)) * 10) / 10);
      }
    }
    values.push(row);
  }

  return { opLabels, values };
}
