import { fromMonthKey, toMonthKey } from "./formatters.js";

export function buildCategorySpendData(transactions) {
  const totals = {};
  transactions.forEach((tx) => {
    if (tx.amount >= 0 || tx.category === "Income") {
      return;
    }
    totals[tx.category] = (totals[tx.category] || 0) + Math.abs(tx.amount);
  });

  return Object.entries(totals)
    .map(([category, total]) => ({
      category,
      total: Number(total.toFixed(2))
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildMonthlyTrendData(transactions) {
  const buckets = {};
  transactions.forEach((tx) => {
    const monthKey = toMonthKey(tx.date);
    if (!buckets[monthKey]) {
      buckets[monthKey] = { month: fromMonthKey(monthKey), spend: 0, income: 0, net: 0 };
    }
    if (tx.amount < 0) {
      buckets[monthKey].spend += Math.abs(tx.amount);
    } else {
      buckets[monthKey].income += tx.amount;
    }
    buckets[monthKey].net = buckets[monthKey].income - buckets[monthKey].spend;
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([, value]) => ({
      month: value.month,
      spend: Number(value.spend.toFixed(2)),
      income: Number(value.income.toFixed(2)),
      net: Number(value.net.toFixed(2))
    }));
}

export function findSubscriptions(transactions) {
  const byMerchant = {};
  transactions.forEach((tx) => {
    if (tx.amount < 0) {
      if (!byMerchant[tx.merchant]) {
        byMerchant[tx.merchant] = [];
      }
      byMerchant[tx.merchant].push(tx);
    }
  });

  const subscriptions = [];
  Object.entries(byMerchant).forEach(([merchant, entries]) => {
    const sorted = entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length < 2) {
      return;
    }

    let recurringHits = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      const current = new Date(sorted[i].date);
      const previous = new Date(sorted[i - 1].date);
      const dayGap = Math.abs(current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);
      if (dayGap >= 20 && dayGap <= 40) {
        recurringHits += 1;
      }
    }

    if (recurringHits > 0) {
      const avg = sorted.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / sorted.length;
      subscriptions.push({
        merchant,
        avgAmount: Number(avg.toFixed(2))
      });
    }
  });

  return subscriptions.sort((a, b) => b.avgAmount - a.avgAmount);
}
