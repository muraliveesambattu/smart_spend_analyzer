import { CATEGORIES } from "./constants.js";

const CATEGORY_RULES = {
  Food: ["grocery", "market", "restaurant", "cafe", "pizza", "doordash", "ubereats", "coffee", "bakery"],
  Transport: ["uber", "lyft", "shell", "chevron", "metro", "train", "fuel", "parking", "toll", "gas"],
  Shopping: ["amazon", "target", "walmart", "ikea", "mall", "store", "best buy", "nike", "purchase"],
  Bills: ["electric", "water", "internet", "rent", "mortgage", "utility", "insurance", "phone", "bill", "tax"],
  Subscriptions: ["netflix", "spotify", "prime", "hulu", "icloud", "adobe", "subscription", "patreon", "gym", "saas"]
};

const STOP_WORDS = new Set([
  "payment",
  "purchase",
  "debit",
  "credit",
  "card",
  "transfer",
  "online",
  "pos",
  "ach",
  "withdrawal",
  "check",
  "txn"
]);

function toTitleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(" ");
}

export function extractMerchant(description) {
  const cleaned = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b\d+\b/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .slice(0, 3)
    .join(" ");

  return cleaned ? toTitleCase(cleaned) : "Unknown Merchant";
}

function keywordScore(description, keywords) {
  return keywords.reduce((score, keyword) => {
    if (description.includes(keyword)) {
      return score + 2;
    }
    return score;
  }, 0);
}

function merchantHistoryScore(merchant, category, merchantCategoryStats) {
  if (!merchantCategoryStats[merchant]) {
    return 0;
  }
  return merchantCategoryStats[merchant][category] || 0;
}

function guessByAmount(amount) {
  if (amount > 0) {
    return "Income";
  }
  return "Other";
}

export function categorizeTransaction(transaction, context = {}) {
  const { merchantOverrides = {}, merchantCategoryStats = {} } = context;
  const description = transaction.description.toLowerCase();
  const merchant = transaction.merchant;

  if (transaction.amount > 0) {
    return "Income";
  }

  if (merchantOverrides[merchant]) {
    return merchantOverrides[merchant];
  }

  const candidates = CATEGORIES.filter((category) => category !== "Income");
  let topCategory = guessByAmount(transaction.amount);
  let topScore = 0;

  for (const category of candidates) {
    const rules = CATEGORY_RULES[category] || [];
    const score = keywordScore(description, rules) + merchantHistoryScore(merchant, category, merchantCategoryStats);
    if (score > topScore) {
      topCategory = category;
      topScore = score;
    }
  }

  if (topCategory === "Other" && /\bmonthly|annual|renew|membership\b/.test(description)) {
    return "Subscriptions";
  }

  return topCategory;
}

export function applyCategorization(transactions, manualEdits = {}, merchantOverrides = {}) {
  const merchantCategoryStats = {};
  const ordered = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  return ordered.map((transaction) => {
    const manualCategory = manualEdits[transaction.id];
    const category =
      manualCategory ||
      categorizeTransaction(transaction, {
        merchantOverrides,
        merchantCategoryStats
      });

    if (!merchantCategoryStats[transaction.merchant]) {
      merchantCategoryStats[transaction.merchant] = {};
    }
    merchantCategoryStats[transaction.merchant][category] =
      (merchantCategoryStats[transaction.merchant][category] || 0) + 1;

    return {
      ...transaction,
      category
    };
  });
}
