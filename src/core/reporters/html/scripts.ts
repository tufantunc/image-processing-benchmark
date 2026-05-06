import type { BenchmarkRun } from "../../../types";

export function generateScripts(
  run: BenchmarkRun,
  adapterNames: string[],
  adapterColors: Record<string, string>,
  resizeBarData: ReturnType<typeof import("./charts")["generateBarData"]>,
  convertBarData: ReturnType<typeof import("./charts")["generateBarData"]>,
  memoryData: ReturnType<typeof import("./charts")["generateMemoryData"]>,
  radarData: ReturnType<typeof import("./charts")["generateRadarData"]>,
  heatmapData: ReturnType<typeof import("./charts")["generateHeatmapData"]>,
): string {
  const dataJSON = JSON.stringify({
    results: run.results,
    adapterNames,
    adapterColors,
    resizeBarData,
    convertBarData,
    memoryData,
    radarData,
    heatmapData,
  });

  return `
window.BENCHMARK_DATA = ${dataJSON};

(function() {
  var D = window.BENCHMARK_DATA;
  var colors = D.adapterColors;
  var adapters = D.adapterNames;

  Chart.defaults.color = '#8b949e';
  Chart.defaults.borderColor = '#30363d';
  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

  var pctLabelPlugin = {
    id: 'pctLabel',
    afterDatasetsDraw: function(chart) {
      var ctx = chart.ctx;
      chart.data.datasets.forEach(function(ds, di) {
        var meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        var fastest = Infinity;
        var allVals = [];
        chart.data.datasets.forEach(function(d2) {
          d2.data.forEach(function(v, idx) {
            if (v > 0) { allVals.push(v); fastest = Math.min(fastest, v); }
          });
        });
        if (!isFinite(fastest)) return;
        meta.data.forEach(function(bar, idx) {
          var val = ds.data[idx];
          if (!val || val === 0) return;
          var pct = ((val - fastest) / fastest * 100).toFixed(0);
          if (pct === '0') return;
          ctx.save();
          ctx.fillStyle = '#e6edf3';
          ctx.font = '600 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+' + pct + '%', bar.x, bar.y - 6);
          ctx.restore();
        });
      });
    }
  };

  var barOpts = function(title) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: false },
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'rectRounded' } },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          padding: 10,
          callbacks: {
            label: function(ctx) {
              return ctx.dataset.label + ': ' + ctx.parsed.y + ' ms';
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45 } },
        y: {
          grid: { color: '#21262d' },
          title: { display: true, text: title, color: '#8b949e' },
          beginAtZero: true,
        }
      }
    };
  };

  new Chart(document.getElementById('resizeChart'), {
    type: 'bar',
    data: D.resizeBarData,
    options: barOpts('Median time (ms)'),
    plugins: [pctLabelPlugin],
  });

  new Chart(document.getElementById('convertChart'), {
    type: 'bar',
    data: D.convertBarData,
    options: barOpts('Median time (ms)'),
    plugins: [pctLabelPlugin],
  });

  new Chart(document.getElementById('memoryChart'), {
    type: 'bar',
    data: D.memoryData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'rectRounded' } },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + ' MB'; }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45 } },
        y: {
          grid: { color: '#21262d' },
          title: { display: true, text: 'Peak RAM (MB)', color: '#8b949e' },
          beginAtZero: true,
        }
      }
    },
    plugins: [pctLabelPlugin],
  });

  new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: D.radarData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          grid: { color: '#21262d' },
          angleLines: { color: '#21262d' },
          pointLabels: { color: '#e6edf3', font: { size: 11 } },
          ticks: { display: false },
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
        }
      }
    }
  });

  (function renderHeatmap() {
    var container = document.getElementById('heatmapContainer');
    if (!container) return;
    var hd = D.heatmapData;
    var ops = hd.opLabels;
    var vals = hd.values;

    var allNums = vals.flat().filter(function(v) { return v !== null; });
    var minV = Math.min.apply(null, allNums);
    var maxV = Math.max.apply(null, allNums);
    var range = maxV - minV || 1;

    var html = '<table class="heatmap-table"><thead><tr><th>Operation</th>';
    adapters.forEach(function(a) {
      html += '<th>' + a + '</th>';
    });
    html += '</tr></thead><tbody>';

    ops.forEach(function(op, oi) {
      html += '<tr><td class="op-label">' + op + '</td>';
      adapters.forEach(function(a, ai) {
        var v = vals[oi] ? vals[oi][ai] : null;
        if (v === null) {
          html += '<td style="background:#161b22;color:#6e7681">—</td>';
        } else {
          var ratio = (v - minV) / range;
          var r = Math.round(30 + ratio * 200);
          var g = Math.round(60 - ratio * 40);
          var b = Math.round(80 - ratio * 30);
          html += '<td style="background:rgba(' + r + ',' + g + ',' + b + ',0.6)">' + v + ' MB</td>';
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  })();

  (function initTable() {
    var results = D.results;
    var sizeSelect = document.getElementById('filterSize');
    var kindSelect = document.getElementById('filterKind');
    var adapterChecks = document.querySelectorAll('.adapter-filter');
    var tbody = document.getElementById('detailBody');
    var ths = document.querySelectorAll('.pivot-table thead th[data-col]');

    var sortCol = 'medianMs';
    var sortDir = 1;

    function getEnabledAdapters() {
      var out = [];
      adapterChecks.forEach(function(cb) {
        if (cb.checked) out.push(cb.value);
      });
      return out;
    }

    function render() {
      var size = sizeSelect ? sizeSelect.value : '';
      var kind = kindSelect ? kindSelect.value : '';
      var enabled = getEnabledAdapters();

      var filtered = results.filter(function(r) {
        if (size && r.fixture.size !== size) return false;
        if (kind && r.operation.kind !== kind) return false;
        if (enabled.indexOf(r.adapterName) === -1) return false;
        return true;
      });

      var grouped: Record<string, typeof filtered> = {};
      filtered.forEach(function(r) {
        var key = r.operation.label + '::' + r.fixture.size + '::' + r.fixture.format;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      });

      var rows: any[] = [];
      Object.keys(grouped).forEach(function(key) {
        var group = grouped[key];
        var bestMs = Infinity;
        group.forEach(function(r) {
          if (!r.metrics.failed && r.metrics.medianMs < bestMs) bestMs = r.metrics.medianMs;
        });
        group.forEach(function(r) {
          var speedup = bestMs > 0 && !r.metrics.failed ? r.metrics.medianMs / bestMs : null;
          rows.push({
            op: r.operation.label,
            kind: r.operation.kind,
            adapter: r.adapterName,
            fixture: r.fixture.type + '/' + r.fixture.size + '.' + r.fixture.format,
            size: r.fixture.size,
            format: r.fixture.format,
            medianMs: r.metrics.medianMs,
            p95Ms: r.metrics.p95Ms,
            peakMB: r.metrics.peakMemoryMB,
            meanMB: r.metrics.meanMemoryMB,
            failed: r.metrics.failed,
            speedup: speedup,
            isWinner: !r.metrics.failed && r.metrics.medianMs === bestMs,
          });
        });
      });

      rows.sort(function(a, b) {
        var va = a[sortCol];
        var vb = b[sortCol];
        if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
        if (va === null) return 1;
        if (vb === null) return -1;
        return (va - vb) * sortDir;
      });

      var html = '';
      rows.forEach(function(r) {
        var cls = r.isWinner ? ' class="winner"' : '';
        var color = colors[r.adapter] || '#888';
        html += '<tr' + cls + '>';
        html += '<td>' + r.op + '</td>';
        html += '<td class="adapter-col"><span class="badge" style="background:' + color + '">' + r.adapter + '</span></td>';
        html += '<td>' + r.fixture + '</td>';
        if (r.failed) {
          html += '<td class="failed">FAILED</td>';
          html += '<td class="failed">—</td>';
          html += '<td class="failed">—</td>';
          html += '<td class="failed">—</td>';
          html += '<td class="failed">—</td>';
        } else {
          html += '<td>' + r.medianMs.toFixed(1) + '</td>';
          html += '<td>' + r.p95Ms.toFixed(1) + '</td>';
          html += '<td>' + r.peakMB.toFixed(1) + '</td>';
          html += '<td>' + r.meanMB.toFixed(1) + '</td>';
          html += '<td class="speedup">' + (r.speedup !== null ? r.speedup.toFixed(2) + 'x' : '—') + '</td>';
        }
        html += '</tr>';
      });

      if (tbody) tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center;color:#6e7681;padding:2rem">No matching results</td></tr>';
    }

    if (sizeSelect) sizeSelect.addEventListener('change', render);
    if (kindSelect) kindSelect.addEventListener('change', render);
    adapterChecks.forEach(function(cb) { cb.addEventListener('change', render); });

    ths.forEach(function(th) {
      th.addEventListener('click', function() {
        var col = th.getAttribute('data-col');
        if (!col) return;
        if (sortCol === col) {
          sortDir *= -1;
        } else {
          sortCol = col;
          sortDir = 1;
        }
        ths.forEach(function(t) { t.classList.remove('sorted'); });
        th.classList.add('sorted');
        var arrow = th.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = sortDir === 1 ? '▲' : '▼';
        render();
      });
    });

    render();
  })();
})();
`;
}
