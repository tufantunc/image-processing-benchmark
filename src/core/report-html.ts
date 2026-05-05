import type { BenchmarkRun, BenchmarkResult, Metrics } from "../types";

export function reportHTML(run: BenchmarkRun): string {
  const dataJson = JSON.stringify(run);

  const resizeResults = run.results.filter(
    (r) => r.operation.kind === "resize"
  );
  const convertResults = run.results.filter(
    (r) => r.operation.kind === "convert"
  );

  const adapters = [...new Set(run.results.map((r) => r.adapterName))];
  const resizeOps = [
    ...new Set(resizeResults.map((r) => r.operation.label)),
  ];
  const convertOps = [
    ...new Set(convertResults.map((r) => r.operation.label)),
  ];

  const validResults = run.results.filter(r => !r.metrics.failed);
  const totalOps = validResults.length;
  const avgMedian =
    validResults.length > 0
      ? validResults.reduce((a, r) => a + r.metrics.medianMs, 0) /
        validResults.length
      : 0;
  const peakRam =
    validResults.length > 0
      ? Math.max(...validResults.map((r) => r.metrics.peakMemoryMB))
      : 0;

  const stats = getAdapterStats(run.results);

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Image Processing Benchmark</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
:root{--bg:#0d1117;--surface:#161b22;--border:#30363d;--text:#e6edf3;--text2:#8b949e;--accent:#58a6ff;--green:#3fb950;--orange:#d29922;--red:#f85149;--sharp:#f47067;--bun:#70d0ff;--ffmpeg:#bc8cff;--jimp:#e3b341;--canvas:#39d353}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 24px 64px}
.container{max-width:1200px;margin:0 auto}
h1{font-size:1.8rem;font-weight:700;padding:32px 0 8px;letter-spacing:-.02em}
h2{font-size:1.2rem;font-weight:600;margin:40px 0 16px;color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:8px}
.subtitle{color:var(--text2);font-size:.95rem;margin-bottom:24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:24px 0}
.card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:20px}
.card .label{color:var(--text2);font-size:.8rem;text-transform:uppercase;letter-spacing:.05em}
.card .value{font-size:1.6rem;font-weight:700;margin-top:4px}
.card .value.green{color:var(--green)}
.card .value.orange{color:var(--orange)}
.card .value.accent{color:var(--accent)}
.charts{display:grid;gap:32px;margin:24px 0}
.chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:20px}
.chart-wrap canvas{max-height:400px}
.chart-title{font-size:.95rem;font-weight:600;margin-bottom:12px}
.methodology{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:24px;margin:24px 0;font-size:.9rem;color:var(--text2)}
.methodology strong{color:var(--text)}
.methodology ul{margin:8px 0 8px 20px}
.methodology li{margin:4px 0}
.filters{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;align-items:center}
.filters label{color:var(--text2);font-size:.85rem}
.filters select{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:.85rem}
.filter-label{color:var(--text2);font-size:.85rem}
.adapter-check{display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.adapter-check input{accent-color:var(--accent);cursor:pointer}
.pivot-table{width:100%;border-collapse:collapse;font-size:.85rem}
.pivot-table thead tr:nth-child(1) th{position:sticky;top:0;z-index:3;background:var(--surface)}
.pivot-table thead tr:nth-child(2) th{position:sticky;top:39px;z-index:3;background:var(--surface)}
.pivot-table thead th{text-align:left;padding:10px 12px;border-bottom:2px solid var(--border);color:var(--text2);cursor:pointer;user-select:none;white-space:nowrap}
.pivot-table thead th:hover{color:var(--text)}
.pivot-table thead th.adapter-head{border-bottom:2px solid}
.pivot-table thead th.head-sharp{border-bottom-color:var(--sharp);color:var(--sharp)}
.pivot-table thead th.head-bun{border-bottom-color:var(--bun);color:var(--bun)}
.pivot-table thead th.head-ffmpeg{border-bottom-color:var(--ffmpeg);color:var(--ffmpeg)}
.pivot-table thead th.head-jimp{border-bottom-color:var(--jimp);color:var(--jimp)}
.pivot-table thead th.head-canvas{border-bottom-color:var(--canvas);color:var(--canvas)}
.pivot-table tbody td{padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap}
.pivot-table tbody tr:hover{background:rgba(88,166,255,.06)}
.adapter-sharp{color:var(--sharp)}
.adapter-bun{color:var(--bun)}
.adapter-ffmpeg{color:var(--ffmpeg)}
.adapter-jimp{color:var(--jimp)}
.adapter-canvas{color:var(--canvas)}
.table-wrap{overflow-x:auto;max-height:700px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:8px}
footer{text-align:center;color:var(--text2);font-size:.8rem;margin-top:48px;padding:24px 0;border-top:1px solid var(--border)}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:600;margin-left:4px}
.badge-sharp{background:rgba(244,112,103,.15);color:var(--sharp)}
.badge-bun{background:rgba(112,208,255,.15);color:var(--bun)}
.badge-ffmpeg{background:rgba(188,140,255,.15);color:var(--ffmpeg)}
.badge-jimp{background:rgba(227,179,65,.15);color:var(--jimp)}
.badge-canvas{background:rgba(57,211,83,.15);color:var(--canvas)}
</style>
</head>
<body>
<div class="container">
<h1>Image Processing Benchmark <a href="https://github.com/tufantunc/image-processing-benchmark" target="_blank" rel="noopener" style="vertical-align:middle;margin-left:8px;color:var(--text2)"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a></h1>
<p class="subtitle">
  ${run.runtime.name} ${run.runtime.version} &middot; ${new Date(run.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} &middot;
  ${adapters.map((a) => `<span class="badge badge-${a}">${a}</span>`).join(" ")}
</p>

<div class="cards">
  <div class="card"><div class="label">Tests Run</div><div class="value">${totalOps}</div></div>
  <div class="card"><div class="label">Fastest Adapter</div><div class="value green">${stats.fastest.name} <span style="font-size:.9rem;color:var(--text2)">${stats.fastest.wins}/${stats.fastest.total} wins</span></div></div>
  <div class="card"><div class="label">Least RAM Usage</div><div class="value green">${stats.leanest.name} <span style="font-size:.9rem;color:var(--text2)">${stats.leanest.wins}/${stats.leanest.total} wins</span></div></div>
  <div class="card"><div class="label">Avg Median</div><div class="value accent">${avgMedian.toFixed(1)} ms</div></div>
  <div class="card"><div class="label">Peak RAM</div><div class="value orange">${peakRam.toFixed(0)} MB</div></div>
</div>

<div class="methodology">
  <strong>Methodology</strong>
  <ul>
    <li>Each operation runs in an isolated child process to prevent memory leak accumulation</li>
    <li>${run.config.warmupIterations} warmup iterations are discarded; ${run.config.measureIterations} measure iterations are collected</li>
    <li>Peak RSS measured by polling <code>ps -o rss=</code> every ${run.config.memoryPollIntervalMs}ms</li>
    <li>27 test fixtures: 3 types (landscape, portrait, city) &times; 3 sizes &times; 3 formats (JPEG, PNG, WebP)</li>
    <li>Adapters: ${adapters.map((a) => `<code>${a}</code>`).join(", ")}</li>
    <li>Charts show median values aggregated across medium fixtures for visual clarity</li>
  </ul>
</div>

<h2>Resize Performance</h2>
${resizeOps.length > 0 ? `<div class="chart-wrap">
  <div class="chart-title">Median Duration by Operation (ms) &mdash; Medium Fixtures</div>
  <canvas id="resizeChart"></canvas>
</div>` : `<div class="chart-wrap"><p style="color:var(--text2);text-align:center;padding:32px 0">No resize operations in this benchmark run.</p></div>`}

<h2>Format Conversion Performance</h2>
${convertOps.length > 0 ? `<div class="chart-wrap">
  <div class="chart-title">Median Duration by Conversion (ms) &mdash; Medium Fixtures</div>
  <canvas id="convertChart"></canvas>
</div>` : `<div class="chart-wrap"><p style="color:var(--text2);text-align:center;padding:32px 0">No convert operations in this benchmark run.</p></div>`}

<h2>Memory Usage</h2>
${validResults.length > 0 ? `<div class="chart-wrap">
  <div class="chart-title">Peak RAM by Operation (MB) &mdash; Medium Fixtures</div>
  <canvas id="memoryChart"></canvas>
</div>` : `<div class="chart-wrap"><p style="color:var(--text2);text-align:center;padding:32px 0">No results available.</p></div>`}

<h2>Detailed Results</h2>
<div class="filters">
  <label>Size: <select id="filterSize"><option value="">All</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
  <label>Kind: <select id="filterKind"><option value="">All</option><option value="resize">Resize</option><option value="convert">Convert</option></select></label>
  <span class="filter-label">Adapters:</span>
  ${adapters.map((a) => `<label class="adapter-check"><input type="checkbox" class="adapter-filter" value="${a}" checked /><span class="badge badge-${a}">${a}</span></label>`).join("")}
</div>
<div class="table-wrap">
  <table class="pivot-table">
    <thead id="tableHead"></thead>
    <tbody id="tableBody"></tbody>
  </table>
</div>

<footer>
  Generated by <strong>image-processing-benchmark</strong> &middot; ${run.runtime.name} ${run.runtime.version} &middot; ${run.timestamp}
  &middot; <a href="https://github.com/tufantunc/image-processing-benchmark" target="_blank" rel="noopener" style="color:var(--text2);text-decoration:none"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle;margin-right:4px"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>GitHub</a>
</footer>
</div>

<script>
window.BENCHMARK_DATA = ${dataJson};

const COLORS = {${adapters.map((a) => {
    const c = a === "sharp" ? "#f47067" : a === "ffmpeg" ? "#bc8cff" : a === "jimp" ? "#e3b341" : a === "canvas" ? "#39d353" : "#70d0ff";
    return `${a}: '${c}'`;
  }).join(", ")}};
const adapters = ${JSON.stringify(adapters)};

function aggregate(results, kind, sizeFilter) {
  const grouped = {};
  results.filter(r => r.operation.kind === kind && (!sizeFilter || r.fixture.size === sizeFilter) && !r.metrics.failed).forEach(r => {
    const key = r.operation.label + "||" + r.adapterName;
    if (!grouped[key]) grouped[key] = { op: r.operation.label, adapter: r.adapterName, vals: [] };
    grouped[key].vals.push(r.metrics.medianMs);
  });
  return grouped;
}

function makeBarData(grouped) {
  const ops = [...new Set(Object.values(grouped).map(g => g.op))];
  const datasets = adapters.map(a => ({
    label: a,
    data: ops.map(op => {
      const g = grouped[op + "||" + a];
      return g ? g.vals.reduce((s,v) => s+v, 0) / g.vals.length : 0;
    }),
    backgroundColor: COLORS[a] + "cc",
    borderColor: COLORS[a],
    borderWidth: 1,
    borderRadius: 4,
  }));
  return { labels: ops, datasets };
}

function computePctDiffs(grouped) {
  const ops = [...new Set(Object.values(grouped).map(g => g.op))];
  return ops.map(op => {
    const vals = adapters.map(a => {
      const g = grouped[op + "||" + a];
      return g ? g.vals.reduce((s,v) => s+v, 0) / g.vals.length : 0;
    });
    const nonZero = vals.filter(v => v > 0);
    if (nonZero.length < 2) return null;
    const bestIdx = vals.indexOf(Math.min(...nonZero));
    const slower = Math.max(...nonZero);
    if (slower === 0) return null;
    const pct = ((slower - Math.min(...nonZero)) / slower * 100).toFixed(0);
    return { bestIdx, label: adapters[bestIdx] + " " + pct + "% faster" };
  });
}

const pctLabelPlugin = {
  id: 'pctLabels',
  afterDatasetsDraw(chart) {
    const diffs = chart.options._pctDiffs;
    if (!diffs || adapters.length < 2) return;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    diffs.forEach((info, i) => {
      if (!info) return;
      const meta = chart.getDatasetMeta(info.bestIdx);
      if (!meta.data[i]) return;
      const bar = meta.data[i];
      const labelY = bar.y - 4;
      const labelX = bar.x;
      const textWidth = ctx.measureText(info.label).width;
      const pillW = textWidth + 10;
      const pillH = 16;
      const pillX = labelX - pillW / 2;
      const pillY = labelY - pillH - 1;
      ctx.fillStyle = 'rgba(63,185,80,0.9)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(info.label, labelX, labelY - 3);
    });
    ctx.restore();
  }
};

const chartOpts = (title) => ({
  responsive: true,
  layout: { padding: { top: 24 } },
  plugins: { legend: { labels: { color: "#e6edf3" } } },
  scales: {
    x: { ticks: { color: "#8b949e", maxRotation: 45 }, grid: { color: "#30363d44" } },
    y: { ticks: { color: "#8b949e" }, grid: { color: "#30363d" }, title: { display: true, text: title, color: "#8b949e" } },
  },
});

const data = window.BENCHMARK_DATA;
const resizeG = aggregate(data.results, "resize", "medium");
const convertG = aggregate(data.results, "convert", "medium");

const resizeEl = document.getElementById("resizeChart");
if (resizeEl) new Chart(resizeEl, { type: "bar", data: makeBarData(resizeG), options: { ...chartOpts("Median ms"), _pctDiffs: computePctDiffs(resizeG) }, plugins: [pctLabelPlugin] });
const convertEl = document.getElementById("convertChart");
if (convertEl) new Chart(convertEl, { type: "bar", data: makeBarData(convertG), options: { ...chartOpts("Median ms"), _pctDiffs: computePctDiffs(convertG) }, plugins: [pctLabelPlugin] });

const memGrouped = {};
data.results.filter(r => r.fixture.size === "medium" && !r.metrics.failed).forEach(r => {
  const key = r.operation.label + "||" + r.adapterName;
  if (!memGrouped[key]) memGrouped[key] = { op: r.operation.label, adapter: r.adapterName, vals: [] };
  memGrouped[key].vals.push(r.metrics.peakMemoryMB);
});
const memOps = [...new Set(Object.values(memGrouped).map(g => g.op))];
const memPctDiffs = memOps.map(op => {
  const vals = adapters.map(a => { const g = memGrouped[op+"||"+a]; return g ? g.vals.reduce((s,v)=>s+v,0)/g.vals.length : 0; });
  const nonZero = vals.filter(v => v > 0);
  if (nonZero.length < 2) return null;
  const bestIdx = vals.indexOf(Math.min(...nonZero));
  const slower = Math.max(...nonZero);
  if (slower === 0) return null;
  const pct = ((slower - Math.min(...nonZero)) / slower * 100).toFixed(0);
  return { bestIdx, label: adapters[bestIdx] + " " + pct + "% less RAM" };
});
const memEl = document.getElementById("memoryChart");
if (memEl) new Chart(memEl, {
  type: "bar",
  data: {
    labels: memOps,
    datasets: adapters.map(a => ({
      label: a,
      data: memOps.map(op => { const g = memGrouped[op+"||"+a]; return g ? g.vals.reduce((s,v)=>s+v,0)/g.vals.length : 0; }),
      backgroundColor: COLORS[a] + "cc", borderColor: COLORS[a], borderWidth: 1, borderRadius: 4,
    })),
  },
  options: { ...chartOpts("Peak RAM (MB)"), _pctDiffs: memPctDiffs },
  plugins: [pctLabelPlugin],
});

const tbody = document.getElementById("tableBody");
const thead = document.getElementById("tableHead");
const filterS = document.getElementById("filterSize");
const filterK = document.getElementById("filterKind");
const adapterChecks = document.querySelectorAll(".adapter-filter");
let sortCol = null, sortDir = 1;

function getVisibleAdapters() {
  return Array.from(adapterChecks).filter(cb => cb.checked).map(cb => cb.value);
}

function renderHead() {
  const vis = getVisibleAdapters();
  thead.innerHTML =
    '<tr>' +
      '<th data-col="op" rowspan="2">Operation</th>' +
      '<th data-col="fixture" rowspan="2">Fixture</th>' +
      vis.map(a => '<th colspan="2" class="adapter-head head-' + a + '">' + a + '</th>').join("") +
      '<th data-col="winner" rowspan="2">Winner</th>' +
      '<th data-col="speedup" rowspan="2">Speedup</th>' +
    '</tr>' +
    '<tr>' +
      vis.map(a => '<th class="adapter-head head-' + a + '">Median (ms)</th><th class="adapter-head head-' + a + '">RAM (MB)</th>').join("") +
    '</tr>';
  bindSortHandlers();
}

function renderTable() {
  const fs = filterS.value, fk = filterK.value;
  const vis = getVisibleAdapters();
  let rows = data.results.filter(r => (!fs || r.fixture.size === fs) && (!fk || r.operation.kind === fk));

  const groups = {};
  rows.forEach(r => {
    const k = r.operation.id + "|" + r.fixture.type + "|" + r.fixture.size + "|" + r.fixture.format;
    if (!groups[k]) groups[k] = { op: r.operation, fixture: r.fixture, byAdapter: {} };
    groups[k].byAdapter[r.adapterName] = r.metrics;
  });
  let entries = Object.values(groups);

  if (sortCol !== null) {
    const colMap = {
      op: e => e.op.label,
      fixture: e => e.fixture.type + "/" + e.fixture.size,
      winner: e => { const present = adapters.filter(a => e.byAdapter[a] && !e.byAdapter[a].failed); if (present.length < 2) return ""; return present.reduce((b,a) => e.byAdapter[a].medianMs < e.byAdapter[b].medianMs ? a : b, present[0]); },
      speedup: e => { const present = adapters.filter(a => e.byAdapter[a] && !e.byAdapter[a].failed); if (present.length < 2) return 0; const vals = present.map(a => e.byAdapter[a].medianMs); const minVal = Math.min(...vals); return minVal > 0 ? Math.max(...vals) / minVal : 0; },
    };
    adapters.forEach((a, i) => {
      colMap[a + "_median"] = e => (e.byAdapter[a] || { medianMs: 0 }).medianMs;
      colMap[a + "_ram"] = e => (e.byAdapter[a] || { peakMemoryMB: 0 }).peakMemoryMB;
    });
    entries.sort((a, b) => { const va = colMap[sortCol](a), vb = colMap[sortCol](b); return (va < vb ? -1 : va > vb ? 1 : 0) * sortDir; });
  }

  tbody.innerHTML = entries.map(e => {
    let winner = null, speedup = null;
    {
      const present = adapters.filter(a => e.byAdapter[a] && !e.byAdapter[a].failed);
      if (present.length >= 2) {
        winner = present.reduce((b,a) => e.byAdapter[a].medianMs < e.byAdapter[b].medianMs ? a : b, present[0]);
        const vals = present.map(a => e.byAdapter[a].medianMs);
        const minVal = Math.min(...vals);
        if (minVal > 0) {
          speedup = (Math.max(...vals) / minVal).toFixed(1) + "x";
        }
      }
    }

    const adapterCells = vis.map(a => {
      const m = e.byAdapter[a];
      if (!m || m.failed) return '<td style="color:var(--text2)">—</td><td style="color:var(--text2)">—</td>';
      return '<td>' +
        m.medianMs.toFixed(2) + '</td>' +
        '<td>' + m.peakMemoryMB.toFixed(1) + '</td>';
    }).join("");

    const winnerCell = winner ? '<td class="adapter-' + winner + '">' + winner + '</td>' : '<td>-</td>';
    const speedupCell = speedup && winner ? '<td style="color:var(--green);font-weight:600">' + speedup + '</td>' : '<td>-</td>';

    return '<tr><td>' + e.op.label + '</td><td>' + e.fixture.type + '/' + e.fixture.size + '.' + e.fixture.format + '</td>' + adapterCells + winnerCell + speedupCell + '</tr>';
  }).join("");
}

function bindSortHandlers() {
  document.querySelectorAll(".pivot-table thead th[data-col]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
      renderTable();
    });
  });
  document.querySelectorAll(".pivot-table thead tr:nth-child(2) th").forEach((th, i) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const vis = getVisibleAdapters();
      const adapterIdx = Math.floor(i / 2);
      const isRam = i % 2 === 1;
      if (adapterIdx >= vis.length) return;
      const col = vis[adapterIdx] + (isRam ? "_ram" : "_median");
      if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
      renderTable();
    });
  });
}

function refresh() { renderHead(); renderTable(); }

filterS.addEventListener("change", refresh);
filterK.addEventListener("change", refresh);
adapterChecks.forEach(cb => cb.addEventListener("change", refresh));
refresh();
</script>
</body>
</html>`;
}

function getAdapterStats(results: BenchmarkResult[]): { fastest: { name: string; wins: number; total: number }; leanest: { name: string; wins: number; total: number } } {
  if (results.length === 0) return { fastest: { name: "N/A", wins: 0, total: 0 }, leanest: { name: "N/A", wins: 0, total: 0 } };
  const groups: Record<string, { median: Record<string, number>; ram: Record<string, number> }> = {};
  for (const r of results) {
    if (r.metrics.failed) continue;
    const key = `${r.operation.id}|${r.fixture.type}|${r.fixture.size}|${r.fixture.format}`;
    if (!groups[key]) groups[key] = { median: {}, ram: {} };
    groups[key].median[r.adapterName] = r.metrics.medianMs;
    groups[key].ram[r.adapterName] = r.metrics.peakMemoryMB;
  }
  const total = Object.keys(groups).length;
  const speedWins: Record<string, number> = {};
  const ramWins: Record<string, number> = {};
  for (const g of Object.values(groups)) {
    const speedEntries = Object.entries(g.median).filter(([, v]) => v > 0);
    if (speedEntries.length >= 2) {
      const best = speedEntries.reduce((a, b) => (a[1] <= b[1] ? a : b));
      speedWins[best[0]] = (speedWins[best[0]] || 0) + 1;
    }
    const ramEntries = Object.entries(g.ram).filter(([, v]) => v > 0);
    if (ramEntries.length >= 2) {
      const best = ramEntries.reduce((a, b) => (a[1] <= b[1] ? a : b));
      ramWins[best[0]] = (ramWins[best[0]] || 0) + 1;
    }
  }
  const pick = (wins: Record<string, number>) => {
    let bestName = "", bestCount = 0;
    for (const [name, count] of Object.entries(wins)) {
      if (count > bestCount) { bestCount = count; bestName = name; }
    }
    return { name: bestName, wins: bestCount, total };
  };
  return { fastest: pick(speedWins), leanest: pick(ramWins) };
}
