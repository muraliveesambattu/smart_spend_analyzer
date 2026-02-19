import { clamp, formatCurrency, toMonthKey } from "./formatters.js";
import { findSubscriptions } from "./analytics.js";

function getTopSpendingCategory(transactions) {
  const totals = {};
  transactions.forEach((tx) => {
    if (tx.amount < 0 && tx.category !== "Income") {
      totals[tx.category] = (totals[tx.category] || 0) + Math.abs(tx.amount);
    }
  });

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    return { category: "N/A", amount: 0 };
  }
  return { category: entries[0][0], amount: entries[0][1] };
}

function getMonthOverMonth(transactions) {
  const monthlySpend = {};
  transactions.forEach((tx) => {
    if (tx.amount < 0) {
      const key = toMonthKey(tx.date);
      monthlySpend[key] = (monthlySpend[key] || 0) + Math.abs(tx.amount);
    }
  });

  const months = Object.keys(monthlySpend).sort();
  if (months.length < 2) {
    return { changePct: 0, latest: 0, previous: 0, label: "Need 2+ months of data" };
  }

  const latestKey = months[months.length - 1];
  const previousKey = months[months.length - 2];
  const latest = monthlySpend[latestKey];
  const previous = monthlySpend[previousKey];
  const changePct = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
  return {
    changePct,
    latest,
    previous,
    label: `${previousKey} -> ${latestKey}`
  };
}

function calculateHealthScore(transactions, anomalies, monthOverMonth) {
  const income = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const spend = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const net = income - spend;

  let score = 70;

  if (net > 0) {
    score += 12;
  } else {
    score -= 14;
  }

  if (monthOverMonth.changePct > 15) {
    score -= 10;
  } else if (monthOverMonth.changePct < -8) {
    score += 8;
  }

  score -= anomalies.counts.spikes * 4;
  score -= anomalies.counts.recurringChanges * 3;

  return clamp(Math.round(score), 0, 100);
}

function getBiggestSpike(anomalies) {
  const spikeAlerts = anomalies.alerts.filter((alert) => alert.type === "spike");
  if (!spikeAlerts.length) {
    return "No major spend spikes detected.";
  }
  const biggest = spikeAlerts.sort((a, b) => (b.ratio || 0) - (a.ratio || 0))[0];
  return `${biggest.tx.merchant} in ${biggest.tx.category}: ${biggest.message}`;
}

export function generateInsights(transactions, anomalies) {
  const topCategory = getTopSpendingCategory(transactions);
  const monthOverMonth = getMonthOverMonth(transactions);
  const subscriptions = findSubscriptions(transactions).slice(0, 5);
  const healthScore = calculateHealthScore(transactions, anomalies, monthOverMonth);
  const spikeSummary = getBiggestSpike(anomalies);

  const lines = [
    `Top spending category is ${topCategory.category} at ${formatCurrency(topCategory.amount)}.`,
    `Monthly spending change is ${monthOverMonth.changePct.toFixed(1)}% (${monthOverMonth.label}).`,
    subscriptions.length
      ? `Likely subscriptions: ${subscriptions.map((sub) => sub.merchant).join(", ")}.`
      : "No strong recurring subscriptions found yet.",
    `Biggest spike signal: ${spikeSummary}`
  ];

  return {
    topCategory,
    monthOverMonth,
    subscriptions,
    spikeSummary,
    healthScore,
    lines
  };
}
