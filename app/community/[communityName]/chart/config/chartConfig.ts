import { ChartOptions, TooltipItem, Plugin, Chart } from 'chart.js';

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
      mode: 'x',
      intersect: false,
      callbacks: {
        title: function (tooltipItems: TooltipItem<'line'>[]) {
          const raw = tooltipItems[0]?.raw as { x: number } | undefined;
          if (!raw) return '';
          return `${raw.x.toLocaleString()} sqft`;
        },
        label: function (context: TooltipItem<'line'>) {
          const raw = context.raw as { x: number; y: number; planName?: string } | undefined;
          const builder = context.dataset.label ?? "";
          if (!raw) return builder;
          const lines: string[] = [`${builder}: $${raw.y.toLocaleString()}`];
          if (raw.planName) lines.push(`  ${raw.planName}`);
          return lines;
        },
      },
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
