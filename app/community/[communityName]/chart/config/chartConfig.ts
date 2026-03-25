import { ChartOptions, TooltipItem } from 'chart.js';

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
      callbacks: {
        title: function (tooltipItems: TooltipItem<'line'>[]) {
          const raw = tooltipItems[0]?.raw as { planName?: string } | undefined;
          return raw?.planName ?? "";
        },
        label: function (context: TooltipItem<'line'>) {
          const raw = context.raw as { x: number; y: number } | undefined;
          const builder = context.dataset.label ?? "";
          if (!raw) return builder;
          const detail = `Sqft: ${raw.x.toLocaleString()} | Price: $${raw.y.toLocaleString()}`;
          return [builder, detail];
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
