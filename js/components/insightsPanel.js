import { formatCurrency } from "../utils/formatters.js";

export function renderInsightsPanel(container, insights) {
  const monthDirection = insights.monthOverMonth.changePct > 0 ? "up" : "down";
  const monthChangeClass = insights.monthOverMonth.changePct > 0 ? "text-danger" : "text-success";
  const subscriptionText = insights.subscriptions.length
    ? insights.subscriptions
        .map((item) => `${item.merchant} (${formatCurrency(item.avgAmount)})`)
        .slice(0, 3)
        .join(", ")
    : "No recurring services detected";

  container.innerHTML = `
    <div class="stats-grid mb-4">
      <div class="stat-card">
        <div class="stat-label">Top Category</div>
        <div class="stat-value">${insights.topCategory.category}</div>
        <div class="small-note">${formatCurrency(insights.topCategory.amount)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">MoM Change</div>
        <div class="stat-value ${monthChangeClass}">
          ${insights.monthOverMonth.changePct.toFixed(1)}%
        </div>
        <div class="small-note">${monthDirection === "up" ? "Spending increased" : "Spending decreased"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Subscriptions</div>
        <div class="stat-value">${insights.subscriptions.length}</div>
        <div class="small-note">${subscriptionText}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Health Score</div>
        <div class="stat-value">${insights.healthScore}/100</div>
        <div class="health-meter mt-2">
          <div class="health-meter-fill" style="width: ${insights.healthScore}%"></div>
        </div>
      </div>
    </div>
    <ul class="insight-lines ps-3 mb-0">
      ${insights.lines.map((line) => `<li>${line}</li>`).join("")}
    </ul>
  `;
}
