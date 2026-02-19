import { CATEGORIES } from "../utils/constants.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";

function anomalyBadgeMarkup(anomalies = []) {
  if (!anomalies.length) {
    return '<span class="badge text-bg-light border">None</span>';
  }
  return anomalies
    .map((anomaly) => {
      const className = anomaly.severity === "high" ? "danger" : anomaly.severity === "medium" ? "warning" : "info";
      return `<span class="badge text-bg-${className}">${anomaly.type.replace("_", " ")}</span>`;
    })
    .join("");
}

export function renderTransactionsTable(container, transactions, anomaliesByTransaction, onCategoryChange) {
  if (!transactions.length) {
    container.innerHTML = `<div class="alert alert-light border mb-0">No transactions to display.</div>`;
    return;
  }

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table align-middle table-hover">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col">Merchant</th>
            <th scope="col" class="text-end">Amount</th>
            <th scope="col">Category</th>
            <th scope="col">Anomalies</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map((transaction) => {
              const amountClass = transaction.amount < 0 ? "amount-negative" : "amount-positive";
              const anomalyMarkup = anomalyBadgeMarkup(anomaliesByTransaction[transaction.id] || []);
              return `
                <tr>
                  <td>${formatDate(transaction.date)}</td>
                  <td>${transaction.description}</td>
                  <td>${transaction.merchant}</td>
                  <td class="text-end ${amountClass}">${formatCurrency(transaction.amount)}</td>
                  <td>
                    <select class="form-select form-select-sm category-select" data-transaction-id="${transaction.id}" data-merchant="${transaction.merchant}">
                      ${CATEGORIES.map(
                        (category) =>
                          `<option value="${category}" ${
                            category === transaction.category ? "selected" : ""
                          }>${category}</option>`
                      ).join("")}
                    </select>
                  </td>
                  <td><div class="anomaly-badges">${anomalyMarkup}</div></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll(".category-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const transactionId = event.target.dataset.transactionId;
      const merchant = event.target.dataset.merchant;
      const nextCategory = event.target.value;
      onCategoryChange(transactionId, merchant, nextCategory);
    });
  });
}
