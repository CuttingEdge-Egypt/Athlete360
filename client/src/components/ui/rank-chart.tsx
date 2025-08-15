import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface RankChartProps {
  data: Array<{ month: string; rank: number }>;
}

export function RankChart({ data }: RankChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: 'World Ranking',
          data: data.map(d => d.rank),
          borderColor: 'hsl(207, 90%, 54%)',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'hsl(207, 90%, 54%)',
          pointBorderColor: 'hsl(222, 47%, 11%)',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'hsl(207, 90%, 54%)',
          pointHoverBorderColor: 'hsl(222, 47%, 11%)',
          pointHoverBorderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'hsl(213, 31%, 91%)',
              font: {
                family: 'Inter, sans-serif',
                size: 14
              }
            }
          },
          tooltip: {
            backgroundColor: 'hsl(215, 28%, 17%)',
            titleColor: 'hsl(213, 31%, 91%)',
            bodyColor: 'hsl(213, 31%, 91%)',
            borderColor: 'hsl(207, 90%, 54%)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            titleFont: {
              family: 'Inter, sans-serif',
              size: 14,
              weight: 600
            },
            bodyFont: {
              family: 'Inter, sans-serif',
              size: 13
            },
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return `Rank: #${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            reverse: true, // Lower rank numbers are better
            ticks: {
              color: 'hsl(215, 20%, 65%)',
              font: {
                family: 'Inter, sans-serif',
                size: 12
              },
              callback: function(value) {
                return '#' + value;
              },
              stepSize: 1
            },
            grid: {
              color: 'hsl(216, 34%, 17%)',
              lineWidth: 1
            },
            title: {
              display: true,
              text: 'Ranking Position',
              color: 'hsl(213, 31%, 91%)',
              font: {
                family: 'Inter, sans-serif',
                size: 14,
                weight: 600
              }
            }
          },
          x: {
            ticks: {
              color: 'hsl(215, 20%, 65%)',
              font: {
                family: 'Inter, sans-serif',
                size: 12
              }
            },
            grid: {
              color: 'hsl(216, 34%, 17%)',
              lineWidth: 1
            },
            title: {
              display: true,
              text: 'Time Period',
              color: 'hsl(213, 31%, 91%)',
              font: {
                family: 'Inter, sans-serif',
                size: 14,
                weight: 600
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        elements: {
          line: {
            tension: 0.4
          }
        },
        layout: {
          padding: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full bg-athlete-gray-700 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-400">No ranking data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <canvas 
        ref={chartRef}
        data-testid="rank-chart"
        className="w-full h-full"
      />
    </div>
  );
}
