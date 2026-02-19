import { CATEGORY_COLORS } from "../utils/constants.js";
import { formatCurrency } from "../utils/formatters.js";

let categoryChartInstance = null;
let trendChartInstance = null;

export function renderCharts(categoryCanvas, trendCanvas, categoryData, trendData) {
  if (!window.Chart) {
    return;
  }

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  const categoryLabels = categoryData.map((item) => item.category);
  const categoryValues = categoryData.map((item) => item.total);
  const categoryColors = categoryData.map((item) => CATEGORY_COLORS[item.category] || "#94a3b8");

  categoryChartInstance = new window.Chart(categoryCanvas, {
    type: "doughnut",
    data: {
      labels: categoryLabels,
      datasets: [
        {
          data: categoryValues,
          backgroundColor: categoryColors,
          borderWidth: 0
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || "";
              const value = Number(context.parsed || 0);
              return `${label}: ${formatCurrency(value)}`;
            }
          }
        }
      }
    }
  });

  trendChartInstance = new window.Chart(trendCanvas, {
    type: "line",
    data: {
      labels: trendData.map((item) => item.month),
      datasets: [
        {
          label: "Monthly Spend",
          data: trendData.map((item) => item.spend),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.1)",
          tension: 0.35,
          fill: true
        },
        {
          label: "Monthly Income",
          data: trendData.map((item) => item.income),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.1)",
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(Number(context.parsed.y || 0))}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatCurrency(Number(value))
          }
        }
      }
    }
  });
}
