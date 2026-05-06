export function htmlTemplate(body: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Image Processing Benchmark Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>${css}</style>
</head>
<body>
<div class="container">
${body}
</div>
<script>${js}</script>
</body>
</html>`;
}
