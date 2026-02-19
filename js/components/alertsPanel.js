import { ANOMALY_COLORS } from "../utils/constants.js";
import { formatDate } from "../utils/formatters.js";

export function renderAlertsPanel(container, anomalies) {
  if (!anomalies.alerts.length) {
    container.innerHTML = `
      <div class="alert alert-success mb-0">
        No anomalies detected in the current dataset.
      </div>
    `;
    return;
  }

  const topAlerts = anomalies.alerts.slice(0, 8);
  container.innerHTML = `
    <div class="d-flex justify-content-between mb-3 small-note">
      <span>Total alerts: ${anomalies.counts.total}</span>
      <span>Spikes: ${anomalies.counts.spikes}</span>
    </div>
    <div class="list-group list-group-flush">
      ${topAlerts
        .map((alert) => {
          const color = ANOMALY_COLORS[alert.severity] || "secondary";
          return `
          <div class="list-group-item px-0 py-2 border-0 border-bottom">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <span class="badge text-bg-${color}">${alert.type.replace("_", " ")}</span>
                <div class="small mt-2">${alert.message}</div>
              </div>
              <span class="small text-secondary text-nowrap">${formatDate(alert.tx.date)}</span>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}
