import { formatCurrency } from "./formatters.js";

function diffInDays(a, b) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function pushAnomaly(store, transaction, anomaly) {
  if (!store[transaction.id]) {
    store[transaction.id] = [];
  }
  store[transaction.id].push(anomaly);
}

export function detectAnomalies(transactions) {
  const byTransaction = {};
  const alerts = [];
  const ordered = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  const categorySpending = {};
  ordered.forEach((tx) => {
    if (tx.amount < 0 && tx.category !== "Income") {
      if (!categorySpending[tx.category]) {
        categorySpending[tx.category] = [];
      }
      categorySpending[tx.category].push(Math.abs(tx.amount));
    }
  });

  const categoryAverages = {};
  Object.entries(categorySpending).forEach(([category, values]) => {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    categoryAverages[category] = average;
  });

  ordered.forEach((tx) => {
    if (tx.amount >= 0 || tx.category === "Income") {
      return;
    }
    const average = categoryAverages[tx.category] || 0;
    const spend = Math.abs(tx.amount);
    if (average > 0 && spend > average * 1.75) {
      const anomaly = {
        type: "spike",
        severity: "high",
        message: `${tx.category} spend spike at ${formatCurrency(spend)} (avg ${formatCurrency(average)}).`,
        ratio: spend / average
      };
      pushAnomaly(byTransaction, tx, anomaly);
      alerts.push({ ...anomaly, tx });
    }
  });

  const seenMerchants = new Set();
  ordered.forEach((tx) => {
    const merchantKey = tx.merchant.toLowerCase();
    const isNewMerchant = !seenMerchants.has(merchantKey);
    if (isNewMerchant && tx.amount < 0) {
      const anomaly = {
        type: "new_merchant",
        severity: "low",
        message: `First seen merchant: ${tx.merchant}.`
      };
      pushAnomaly(byTransaction, tx, anomaly);
      alerts.push({ ...anomaly, tx });
    }
    seenMerchants.add(merchantKey);
  });

  const byMerchant = {};
  ordered.forEach((tx) => {
    if (tx.amount < 0) {
      if (!byMerchant[tx.merchant]) {
        byMerchant[tx.merchant] = [];
      }
      byMerchant[tx.merchant].push(tx);
    }
  });

  Object.values(byMerchant).forEach((merchantTxns) => {
    if (merchantTxns.length < 2) {
      return;
    }
    for (let i = 1; i < merchantTxns.length; i += 1) {
      const current = merchantTxns[i];
      const previous = merchantTxns[i - 1];
      const dayGap = diffInDays(current.date, previous.date);
      if (dayGap < 20 || dayGap > 40) {
        continue;
      }

      const oldAmount = Math.abs(previous.amount);
      const newAmount = Math.abs(current.amount);
      if (oldAmount === 0) {
        continue;
      }
      const changeRatio = Math.abs(newAmount - oldAmount) / oldAmount;
      if (changeRatio > 0.15 && Math.abs(newAmount - oldAmount) >= 5) {
        const anomaly = {
          type: "recurring_change",
          severity: "medium",
          message: `${current.merchant} recurring amount changed from ${formatCurrency(oldAmount)} to ${formatCurrency(newAmount)}.`
        };
        pushAnomaly(byTransaction, current, anomaly);
        alerts.push({ ...anomaly, tx: current });
      }
    }
  });

  return {
    byTransaction,
    alerts: alerts.sort((a, b) => new Date(b.tx.date) - new Date(a.tx.date)),
    counts: {
      total: alerts.length,
      spikes: alerts.filter((item) => item.type === "spike").length,
      recurringChanges: alerts.filter((item) => item.type === "recurring_change").length,
      newMerchants: alerts.filter((item) => item.type === "new_merchant").length
    }
  };
}
