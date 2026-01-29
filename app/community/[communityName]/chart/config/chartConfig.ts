import { ChartOptions } from 'chart.js';

/**
 * Chart configuration for price vs square footage chart
 */
export const createChartOptions = (isMobile: boolean = false): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: isMobile ? 0.9 : 2, // Taller on mobile (0.9), wider on desktop (2)
  plugins: {
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
