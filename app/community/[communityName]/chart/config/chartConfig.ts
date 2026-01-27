import { ChartOptions } from 'chart.js';

/**
 * Chart configuration for price vs square footage chart
 */
export const createChartOptions = (): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { 
        font: { weight: 'bold' },
        color: '#2563eb',
        padding: 15,
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function (context: any) {
          const point = context.raw;
          return `Sqft: ${point.x.toLocaleString()} | Price: $${point.y.toLocaleString()}`;
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
        font: { weight: 'bold', size: 14 } 
      },
      ticks: { 
        color: '#2563eb',
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
        font: { weight: 'bold', size: 14 } 
      },
      ticks: { 
        color: '#2563eb',
        callback: function(value) {
          return '$' + Number(value).toLocaleString();
        }
      },
      grid: { color: '#e5e7eb' },
    },
  },
});
