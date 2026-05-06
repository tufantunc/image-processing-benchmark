import type { BenchmarkRun } from "../../../types";
import { htmlTemplate } from "./template";
import { styles } from "./styles";
import { generateScripts } from "./scripts";
import {
  aggregateByOperation,
  generateBarData,
  generateMemoryData,
  generateRadarData,
  generateHeatmapData,
} from "./charts";
import { renderSummaryCards } from "./components/summary-cards";
import { renderLeaderboard } from "./components/leaderboard";
import { renderMethodology } from "./components/methodology";
import { renderDetailTable } from "./components/detail-table";
import { renderFooter } from "./components/footer";

const ADAPTER_COLORS: Record<string, string> = {
  sharp: "#f47067",
  bun: "#70d0ff",
  ffmpeg: "#bc8cff",
  jimp: "#e3b341",
  canvas: "#39d353",
  imagemagick: "#ff7b72",
  photon: "#d2a8ff",
};

export function reportHTML(run: BenchmarkRun): string {
  const adapterNames = [...new Set(run.results.map((r) => r.adapterName))];

  const agg = aggregateByOperation(run);
  const resizeBarData = generateBarData(agg, "resize", adapterNames, ADAPTER_COLORS);
  const convertBarData = generateBarData(agg, "convert", adapterNames, ADAPTER_COLORS);
  const memoryData = generateMemoryData(agg, adapterNames, ADAPTER_COLORS);
  const radarData = generateRadarData(run, adapterNames, ADAPTER_COLORS);
  const heatmapData = generateHeatmapData(run, adapterNames);

  const body = [
    `<h1>Image Processing Benchmark</h1>`,
    `<p class="subtitle">Adapter comparison across resize and convert operations</p>`,
    renderSummaryCards(run),
    renderLeaderboard(run, adapterNames, ADAPTER_COLORS),
    `<div class="charts-grid">`,
    `<div class="chart-wrap"><div class="chart-title">Resize Performance</div><canvas id="resizeChart"></canvas></div>`,
    `<div class="chart-wrap"><div class="chart-title">Convert Performance</div><canvas id="convertChart"></canvas></div>`,
    `<div class="chart-wrap"><div class="chart-title">Memory Usage</div><canvas id="memoryChart"></canvas></div>`,
    `<div class="chart-wrap"><div class="chart-title">Adapter Strengths</div><canvas id="radarChart"></canvas></div>`,
    `</div>`,
    `<h2 class="section-title">Memory Heatmap (Peak RAM)</h2>`,
    `<div class="heatmap-wrap" id="heatmapContainer"></div>`,
    renderMethodology(run, adapterNames),
    renderDetailTable(run, adapterNames, ADAPTER_COLORS),
    renderFooter(run),
  ].join("\n");

  const js = generateScripts(
    run,
    adapterNames,
    ADAPTER_COLORS,
    resizeBarData,
    convertBarData,
    memoryData,
    radarData,
    heatmapData,
  );

  return htmlTemplate(body, styles, js);
}
