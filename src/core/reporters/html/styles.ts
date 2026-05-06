export const styles = `
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --surface2: #1c2129;
  --border: #30363d;
  --text: #e6edf3;
  --text2: #8b949e;
  --text3: #6e7681;
  --accent: #58a6ff;
  --sharp: #f47067;
  --bun: #70d0ff;
  --ffmpeg: #bc8cff;
  --jimp: #e3b341;
  --canvas: #39d353;
  --imagemagick: #ff7b72;
  --photon: #d2a8ff;
  --radius: 10px;
  --shadow: 0 2px 8px rgba(0,0,0,0.3);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: clamp(13px, 1.1vw, 16px); }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  padding: 2rem 1rem;
}

.container { max-width: 1400px; margin: 0 auto; }

h1 {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.subtitle { color: var(--text2); margin-bottom: 2rem; }

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow);
}

.card-label {
  font-size: 0.8rem;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.card-value {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 700;
}

.card-sub { font-size: 0.85rem; color: var(--text2); margin-top: 0.3rem; }

.section-title {
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.leaderboard { margin-bottom: 2rem; }

.score-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
}

.score-rank {
  font-weight: 700;
  font-size: 1.2rem;
  width: 2rem;
  text-align: center;
  flex-shrink: 0;
}

.score-name {
  font-weight: 600;
  width: 120px;
  flex-shrink: 0;
}

.score-bar-wrap {
  flex: 1;
  height: 28px;
  background: var(--surface2);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.score-bar {
  height: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  transition: width 0.4s ease;
  min-width: 40px;
}

.score-details {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text2);
  flex-shrink: 0;
}

.score-details span { white-space: nowrap; }

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.chart-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow);
}

.chart-wrap.full-width {
  grid-column: 1 / -1;
}

.chart-title {
  font-weight: 600;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

canvas { max-width: 100%; }

.heatmap-wrap {
  margin-bottom: 2rem;
  overflow-x: auto;
}

.heatmap-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 3px;
}

.heatmap-table th {
  background: var(--surface);
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text2);
  text-align: center;
  border-radius: 4px;
}

.heatmap-table td {
  padding: 0.6rem 0.75rem;
  text-align: center;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  min-width: 80px;
}

.heatmap-table td.op-label {
  text-align: left;
  font-weight: 600;
  background: var(--surface);
  color: var(--text);
  white-space: nowrap;
}

.methodology {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.methodology ul {
  padding-left: 1.5rem;
  color: var(--text2);
}

.methodology li { margin-bottom: 0.5rem; }

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.filters label {
  font-size: 0.85rem;
  color: var(--text2);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.filters select, .filters input {
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}

.adapter-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.adapter-checks label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.adapter-checks input[type="checkbox"] {
  width: auto;
  accent-color: var(--accent);
}

.table-wrap {
  overflow-x: auto;
  margin-bottom: 2rem;
}

.pivot-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.85rem;
}

.pivot-table thead th {
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--text2);
  border-bottom: 2px solid var(--border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.pivot-table thead th:hover { color: var(--text); }

.pivot-table thead th .sort-arrow {
  margin-left: 0.3rem;
  opacity: 0.4;
}

.pivot-table thead th.sorted .sort-arrow { opacity: 1; }

.pivot-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.pivot-table tbody tr:hover { background: var(--surface2); }

.pivot-table tbody tr.winner td { background: rgba(88,166,255,0.08); }

.pivot-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.pivot-table .adapter-col {
  font-weight: 600;
}

.pivot-table .speedup {
  color: var(--canvas);
  font-weight: 600;
}

.pivot-table .failed {
  color: var(--sharp);
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
}

.footer {
  text-align: center;
  color: var(--text3);
  font-size: 0.85rem;
  padding: 2rem 0;
  border-top: 1px solid var(--border);
  margin-top: 2rem;
}

.footer a { color: var(--accent); text-decoration: none; }
.footer a:hover { text-decoration: underline; }

@media (max-width: 1024px) {
  .charts-grid { grid-template-columns: 1fr; }
  .cards { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
}

@media (max-width: 768px) {
  body { padding: 1rem 0.5rem; }
  .cards { grid-template-columns: 1fr 1fr; }
  .score-row { flex-wrap: wrap; gap: 0.5rem; }
  .score-bar-wrap { min-width: 100%; order: 10; }
  .filters { flex-direction: column; align-items: flex-start; }
  .pivot-table { font-size: 0.75rem; }
}
`;
