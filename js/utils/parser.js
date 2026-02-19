import { extractMerchant } from "./categorizer.js";

const REQUIRED_HEADERS = ["date", "description", "amount"];

function parseAmount(value) {
  if (typeof value === "number") {
    return value;
  }
  const input = String(value || "").trim();
  if (!input) {
    return NaN;
  }

  const negativeFromParens = /^\(.*\)$/.test(input);
  const normalized = input.replace(/[,$()]/g, "");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    return NaN;
  }
  return negativeFromParens ? -Math.abs(parsed) : parsed;
}

function normalizeHeaderMap(row) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[String(key).trim().toLowerCase()] = value;
  });
  return normalized;
}

function normalizeDate(value) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${parsedDate.getFullYear()}-${month}-${day}`;
}

function validateHeaders(fields) {
  if (!fields || fields.length === 0) {
    throw new Error("CSV appears to be empty.");
  }
  const normalized = fields.map((field) => String(field).trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((required) => !normalized.includes(required));
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}.`);
  }
}

function normalizeRows(rows) {
  const normalizedTransactions = [];
  rows.forEach((rawRow, index) => {
    const row = normalizeHeaderMap(rawRow);
    const date = normalizeDate(row.date);
    const description = String(row.description || "").trim();
    const amount = parseAmount(row.amount);

    if (!date || !description || Number.isNaN(amount)) {
      return;
    }

    normalizedTransactions.push({
      id: `tx-${index}-${date}-${description.slice(0, 12).replace(/\s+/g, "-").toLowerCase()}`,
      date,
      description,
      amount,
      merchant: extractMerchant(description)
    });
  });
  return normalizedTransactions;
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    if (!window.Papa) {
      reject(new Error("CSV parser failed to load."));
      return;
    }

    window.Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          validateHeaders(results.meta.fields);
          const normalizedTransactions = normalizeRows(results.data);
          if (normalizedTransactions.length === 0) {
            reject(new Error("No valid transactions found after parsing."));
            return;
          }
          resolve(normalizedTransactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function normalizeMockTransactions(rawTransactions) {
  return rawTransactions
    .map((entry, index) => {
      const date = normalizeDate(entry.date);
      const description = String(entry.description || "").trim();
      const amount = parseAmount(entry.amount);
      if (!date || !description || Number.isNaN(amount)) {
        return null;
      }
      return {
        id: `mock-${index}-${date}`,
        date,
        description,
        amount,
        merchant: extractMerchant(description)
      };
    })
    .filter(Boolean);
}
