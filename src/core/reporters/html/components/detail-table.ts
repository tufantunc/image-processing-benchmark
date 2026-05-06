import type { BenchmarkRun } from "../../../../types";

export function renderDetailTable(
  run: BenchmarkRun,
  adapterNames: string[],
  adapterColors: Record<string, string>,
): string {
  let adapterChecks = "";
  for (const name of adapterNames) {
    const color = adapterColors[name] || "#888";
    adapterChecks += `<label><input type="checkbox" class="adapter-filter" value="${name}" checked><span style="color:${color};font-weight:600">${name}</span></label>`;
  }

  return `
<div class="table-section">
  <h2 class="section-title">Detailed Results</h2>
  <div class="filters">
    <label>Size: <select id="filterSize">
      <option value="">All</option>
      <option value="small">Small</option>
      <option value="medium">Medium</option>
      <option value="large">Large</option>
    </select></label>
    <label>Kind: <select id="filterKind">
      <option value="">All</option>
      <option value="resize">Resize</option>
      <option value="convert">Convert</option>
    </select></label>
    <div class="adapter-checks">${adapterChecks}</div>
  </div>
  <div class="table-wrap">
    <table class="pivot-table">
      <thead>
        <tr>
          <th data-col="op">Operation <span class="sort-arrow"></span></th>
          <th data-col="adapter">Adapter <span class="sort-arrow"></span></th>
          <th data-col="fixture">Fixture <span class="sort-arrow"></span></th>
          <th data-col="medianMs">Median (ms) <span class="sort-arrow">▲</span></th>
          <th data-col="p95Ms">P95 (ms) <span class="sort-arrow"></span></th>
          <th data-col="peakMB">Peak RAM (MB) <span class="sort-arrow"></span></th>
          <th data-col="meanMB">Mean RAM (MB) <span class="sort-arrow"></span></th>
          <th data-col="speedup">Speedup <span class="sort-arrow"></span></th>
        </tr>
      </thead>
      <tbody id="detailBody"></tbody>
    </table>
  </div>
</div>`;
}
