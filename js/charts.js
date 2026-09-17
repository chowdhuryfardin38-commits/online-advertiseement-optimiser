// ═══════════════════════════════════════════
// CHARTS.JS — Canvas-based chart rendering
// ═══════════════════════════════════════════

const CHART_COLORS = {
  primary:  '#6c63ff',
  accent:   '#00d4ff',
  success:  '#22d3a5',
  warning:  '#f59e0b',
  danger:   '#f43f5e',
  muted:    'rgba(255,255,255,0.1)',
  grid:     'rgba(255,255,255,0.05)',
  text:     'rgba(136,146,176,1)'
};

// ─── Line / Area Chart ─────────────────────
function drawLineChart(canvas, labels, datasets, options = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600;
  const H = canvas.offsetHeight || 220;
  canvas.width  = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Find max
  const allVals = datasets.flatMap(d => d.data);
  const maxVal  = Math.max(...allVals) * 1.1 || 100;
  const minVal  = 0;

  // Grid lines
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = pad.top + cH - (i / steps) * cH;
    ctx.beginPath();
    ctx.strokeStyle = CHART_COLORS.grid;
    ctx.lineWidth = 1;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();
    // Label
    const val = ((maxVal - minVal) / steps) * i + minVal;
    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(options.formatY ? options.formatY(val) : Math.round(val), pad.left - 6, y + 4);
  }

  // X labels
  labels.forEach((lbl, i) => {
    const x = pad.left + (i / (labels.length - 1)) * cW;
    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, x, H - pad.bottom + 18);
  });

  // Datasets
  datasets.forEach(ds => {
    const pts = ds.data.map((v, i) => ({
      x: pad.left + (i / (ds.data.length - 1)) * cW,
      y: pad.top + cH - ((v - minVal) / (maxVal - minVal)) * cH
    }));

    // Fill area
    if (ds.fill !== false) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length-1].x, pad.top + cH);
      ctx.lineTo(pts[0].x, pad.top + cH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
      grad.addColorStop(0, (ds.color || CHART_COLORS.primary) + '33');
      grad.addColorStop(1, (ds.color || CHART_COLORS.primary) + '00');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = ds.color || CHART_COLORS.primary;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ds.color || CHART_COLORS.primary;
      ctx.fill();
      ctx.strokeStyle = '#0d1128';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  // Legend
  if (datasets.length > 1) {
    datasets.forEach((ds, i) => {
      const x = pad.left + i * 120;
      const y = 10;
      ctx.fillStyle = ds.color || CHART_COLORS.primary;
      ctx.fillRect(x, y, 12, 3);
      ctx.fillStyle = CHART_COLORS.text;
      ctx.font = '11px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label || '', x + 18, y + 7);
    });
  }
}

// ─── Bar Chart ─────────────────────────────
function drawBarChart(canvas, labels, datasets, options = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600;
  const H = canvas.offsetHeight || 220;
  canvas.width  = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const pad = { top: 20, right: 20, bottom: 40, left: 55 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const allVals = datasets.flatMap(d => d.data);
  const maxVal  = Math.max(...allVals) * 1.15 || 100;

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + cH - (i/4) * cH;
    ctx.beginPath();
    ctx.strokeStyle = CHART_COLORS.grid;
    ctx.lineWidth = 1;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();
    const val = (maxVal / 4) * i;
    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(options.formatY ? options.formatY(val) : Math.round(val), pad.left - 6, y + 4);
  }

  const groupW = cW / labels.length;
  const barW   = Math.min((groupW / datasets.length) * 0.7, 40);
  const groupPad = (groupW - barW * datasets.length) / 2;

  labels.forEach((lbl, gi) => {
    const gx = pad.left + gi * groupW;

    datasets.forEach((ds, di) => {
      const val  = ds.data[gi] || 0;
      const barH = (val / maxVal) * cH;
      const x    = gx + groupPad + di * barW;
      const y    = pad.top + cH - barH;

      const color = Array.isArray(ds.color) ? ds.color[gi] : (ds.color || CHART_COLORS.primary);

      // Rounded top
      const radius = Math.min(4, barH);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '88');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, gx + groupW / 2, H - pad.bottom + 18);
  });
}

// ─── Doughnut Chart ────────────────────────
function drawDoughnutChart(canvas, labels, data, colors, options = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 200;
  const H = canvas.offsetHeight || 200;
  canvas.width  = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const outerR = Math.min(cx, cy) - 10;
  const innerR = outerR * 0.65;

  const total = data.reduce((a, b) => a + b, 0) || 1;
  let startAngle = -Math.PI / 2;

  data.forEach((val, i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#0d1128';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += slice;
  });

  // Center text
  if (options.centerText) {
    ctx.fillStyle = '#f0f2ff';
    ctx.font = `bold 22px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.centerText, cx, cy - 8);
    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '11px Inter';
    ctx.fillText(options.centerLabel || '', cx, cy + 14);
  }
}

// ─── Sparkline ─────────────────────────────
function drawSparkline(canvas, data, color) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 80;
  const H = canvas.offsetHeight || 40;
  canvas.width  = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0, 0, W, H);

  if (!data || data.length < 2) return;

  const min  = Math.min(...data);
  const max  = Math.max(...data);
  const range = max - min || 1;
  const pad  = 4;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad*2),
    y: H - pad - ((v - min) / range) * (H - pad*2)
  }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + '44');
  grad.addColorStop(1, color + '00');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, H);
  ctx.lineTo(pts[0].x, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ─── Generate month labels ──────────────────
function lastNMonths(n) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const result = [];
  for (let i = n-1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(months[d.getMonth()]);
  }
  return result;
}

// ─── Generate trend data ────────────────────
function generateTrend(base, count, variance = 0.2, up = true) {
  const data = [];
  let v = base;
  for (let i = 0; i < count; i++) {
    const delta = v * variance * (Math.random() - (up ? 0.3 : 0.6));
    v = Math.max(0, v + delta);
    data.push(Math.round(v));
  }
  return data;
}
