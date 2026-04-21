import { ChartOptions, Plugin, Chart, TooltipModel } from 'chart.js';

// Draws a dashed vertical line at the hovered x position across all datasets.
export const crosshairPlugin: Plugin<'line'> = {
  id: 'crosshair',
  afterDraw(chart: Chart<'line'>) {
    const tooltip = chart.tooltip;
    if (!tooltip || !tooltip.getActiveElements().length) return;

    const x = tooltip.getActiveElements()[0].element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

type ChartRawPoint = {
  x: number;
  y: number;
  planName?: string;
  company?: string;
  address?: string;
  stories?: string;
  pricePerSqft?: number;
  community?: string;
  segmentLabel?: string;
  lastUpdated?: string;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );

const TOOLTIP_CLASS = 'price-chart-tooltip';

function getOrCreateTooltip(chart: Chart<'line'>): HTMLDivElement {
  const parent = chart.canvas.parentNode as HTMLElement | null;
  if (!parent) throw new Error('Chart canvas has no parent');

  // Ensure the parent can host an absolutely-positioned tooltip
  const parentStyle = window.getComputedStyle(parent);
  if (parentStyle.position === 'static') {
    parent.style.position = 'relative';
  }

  let el = parent.querySelector<HTMLDivElement>(`.${TOOLTIP_CLASS}`);
  if (!el) {
    el = document.createElement('div');
    el.className = TOOLTIP_CLASS;
    el.style.cssText = [
      'position: absolute',
      'pointer-events: none',
      'background: rgba(24, 24, 27, 0.95)',
      'color: #f4f4f5',
      'border: 1px solid #f59e0b',
      'border-radius: 6px',
      'padding: 10px 12px',
      'font-size: 12px',
      'line-height: 1.45',
      'z-index: 10',
      'opacity: 0',
      'transition: opacity 0.12s ease',
      'white-space: nowrap',
      'box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25)',
    ].join(';');
    parent.appendChild(el);
  }
  return el;
}

function renderTooltipHtml(tooltip: TooltipModel<'line'>): string {
  const dataPoints = tooltip.dataPoints || [];

  let html = '';

  dataPoints.forEach((dp, i) => {
    const raw = dp.raw as ChartRawPoint | undefined;
    if (!raw) return;
    const builder = dp.dataset.label ?? '';
    const color =
      (typeof dp.dataset.borderColor === 'string' && dp.dataset.borderColor) ||
      '#94a3b8';

    html += `<div style="margin-top: ${i === 0 ? 2 : 8}px;">`;
    html += `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};border:1px solid rgba(255,255,255,0.5);"></span>
        <span style="font-weight: 600;">${escapeHtml(builder)}</span>
      </div>`;

    // Price — highlighted in amber to stand out from the rest of the details.
    html += `<div style="margin-left:15px;color:#fbbf24;font-weight:600;">Price: $${raw.y.toLocaleString()}</div>`;

    if (raw.planName)
      html += `<div style="margin-left:15px;">Plan: ${escapeHtml(raw.planName)}</div>`;
    if (raw.address && raw.address !== raw.planName)
      html += `<div style="margin-left:15px;">Location: ${escapeHtml(raw.address)}</div>`;
    if (raw.community)
      html += `<div style="margin-left:15px;">Community: ${escapeHtml(raw.community)}</div>`;
    if (raw.stories)
      html += `<div style="margin-left:15px;">Stories: ${escapeHtml(raw.stories)}</div>`;
    if (raw.pricePerSqft)
      html += `<div style="margin-left:15px;">$/sqft: $${raw.pricePerSqft.toLocaleString()}</div>`;
    if (raw.segmentLabel)
      html += `<div style="margin-left:15px;">Product line: ${escapeHtml(raw.segmentLabel)}</div>`;
    if (raw.lastUpdated) {
      const d = new Date(raw.lastUpdated);
      if (!isNaN(d.getTime()))
        html += `<div style="margin-left:15px;">Updated: ${d.toLocaleDateString()}</div>`;
    }
    html += '</div>';
  });

  return html;
}

function externalTooltipHandler(context: {
  chart: Chart<'line'>;
  tooltip: TooltipModel<'line'>;
}) {
  const { chart, tooltip } = context;
  const el = getOrCreateTooltip(chart);

  if (tooltip.opacity === 0) {
    el.style.opacity = '0';
    return;
  }

  if (tooltip.body) {
    el.innerHTML = renderTooltipHtml(tooltip);
  }

  const canvasWidth = chart.canvas.clientWidth;
  const canvasHeight = chart.canvas.clientHeight;

  // Position: keep the tooltip inside the chart area — flip to the left when it would overflow right.
  el.style.opacity = '1';
  const tooltipWidth = el.offsetWidth;
  const tooltipHeight = el.offsetHeight;
  const offset = 12;

  let left = tooltip.caretX + offset;
  if (left + tooltipWidth > canvasWidth) left = tooltip.caretX - tooltipWidth - offset;
  if (left < 0) left = 0;

  let top = tooltip.caretY - tooltipHeight / 2;
  if (top < 0) top = 0;
  if (top + tooltipHeight > canvasHeight) top = canvasHeight - tooltipHeight;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

/**
 * Chart configuration for price vs square footage chart.
 * Includes zoom (wheel, pinch, drag box), pan (e.g. Ctrl+drag), and limits.
 */
export const createChartOptions = (isMobile: boolean = false): ChartOptions<'line'> => ({
  responsive: true,
  // Let the chart fill the parent container height instead of shrinking to a fixed aspect ratio.
  maintainAspectRatio: false,
  plugins: {
    zoom: {
      zoom: {
        wheel: { enabled: true },
        pinch: { enabled: true },
        drag: {
          enabled: true,
          borderColor: 'rgba(37, 99, 235, 0.8)',
          borderWidth: 1,
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
        },
        mode: 'xy',
      },
      pan: {
        enabled: true,
        mode: 'xy',
        modifierKey: 'ctrl',
      },
      limits: {
        x: { min: 'original', max: 'original' },
        y: { min: 'original', max: 'original' },
      },
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        font: { weight: 'bold', size: isMobile ? 11 : 12 },
        color: '#2563eb',
        padding: isMobile ? 10 : 15,
        boxWidth: isMobile ? 30 : 40,
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      enabled: false,
      mode: 'x',
      intersect: false,
      external: externalTooltipHandler,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Square Footage',
        color: '#2563eb',
        font: { weight: 'bold', size: isMobile ? 12 : 14 }
      },
      ticks: {
        color: '#2563eb',
        font: { size: isMobile ? 10 : 12 },
        maxRotation: isMobile ? 45 : 0,
        minRotation: isMobile ? 45 : 0,
        callback: function(value) {
          return value.toLocaleString();
        }
      },
      grid: { color: '#e5e7eb' },
      type: 'linear',
    },
    y: {
      title: {
        display: true,
        text: 'Price ($)',
        color: '#2563eb',
        font: { weight: 'bold', size: isMobile ? 12 : 14 }
      },
      ticks: {
        color: '#2563eb',
        font: { size: isMobile ? 10 : 12 },
        callback: function(value) {
          return '$' + Number(value).toLocaleString();
        }
      },
      grid: { color: '#e5e7eb' },
    },
  },
});
