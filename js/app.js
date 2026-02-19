import { mockTransactions } from "./data/mockTransactions.js";
import { renderAlertsPanel } from "./components/alertsPanel.js";
import { renderCharts } from "./components/chartsPanel.js";
import { renderInsightsPanel } from "./components/insightsPanel.js";
import { renderTransactionsTable } from "./components/transactionsTable.js";
import { buildCategorySpendData, buildMonthlyTrendData } from "./utils/analytics.js";
import { aiCategorizeTransactions, aiGenerateInsightLines } from "./utils/aiClient.js";
import { detectAnomalies } from "./utils/anomalyDetector.js";
import { applyCategorization } from "./utils/categorizer.js";
import { generateInsights } from "./utils/insightGenerator.js";
import { parseCsvFile, normalizeMockTransactions } from "./utils/parser.js";

const state = {
  rawTransactions: [],
  transactions: [],
  manualEdits: {},
  merchantOverrides: {},
  anomalies: { byTransaction: {}, alerts: [], counts: {} },
  insights: null,
  sourceLabel: "Mock data",
  aiNarrativeLines: []
};

const dom = {
  csvInput: document.getElementById("csvInput"),
  useMockBtn: document.getElementById("useMockBtn"),
  clearEditsBtn: document.getElementById("clearEditsBtn"),
  openaiKey: document.getElementById("openaiKey"),
  openaiModel: document.getElementById("openaiModel"),
  aiEnhanceBtn: document.getElementById("aiEnhanceBtn"),
  uploadMessage: document.getElementById("uploadMessage"),
  aiMessage: document.getElementById("aiMessage"),
  dataSourceBadge: document.getElementById("dataSourceBadge"),
  insightsPanel: document.getElementById("insightsPanel"),
  alertsPanel: document.getElementById("alertsPanel"),
  tableContainer: document.getElementById("tableContainer"),
  transactionCount: document.getElementById("transactionCount"),
  categoryChart: document.getElementById("categoryChart"),
  trendChart: document.getElementById("trendChart")
};

function setUploadMessage(message, isError = false) {
  dom.uploadMessage.textContent = message;
  dom.uploadMessage.className = `small mt-3 ${isError ? "text-danger" : "text-secondary"}`;
}

function setAiMessage(message, isError = false) {
  dom.aiMessage.textContent = message;
  dom.aiMessage.className = `small mt-2 ${isError ? "text-danger" : "text-secondary"}`;
}

function setAiBusy(isBusy) {
  dom.aiEnhanceBtn.disabled = isBusy;
  dom.aiEnhanceBtn.textContent = isBusy ? "Enhancing..." : "Enhance with AI";
}

function buildAiCategorizationCandidates(transactions) {
  const merchantCount = {};
  transactions.forEach((tx) => {
    const key = tx.merchant.toLowerCase();
    merchantCount[key] = (merchantCount[key] || 0) + 1;
  });

  const candidates = transactions
    .filter((tx) => tx.amount < 0 && tx.category !== "Income")
    .filter((tx) => {
      const key = tx.merchant.toLowerCase();
      return tx.category === "Other" || merchantCount[key] === 1 || Math.abs(tx.amount) >= 300;
    })
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      merchant: tx.merchant,
      currentCategory: tx.category
    }));

  if (candidates.length) {
    return candidates;
  }

  return transactions
    .filter((tx) => tx.amount < 0 && tx.category !== "Income")
    .slice(0, 50)
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      merchant: tx.merchant,
      currentCategory: tx.category
    }));
}

function applyAiCategoryResults(results) {
  const transactionById = Object.fromEntries(state.transactions.map((tx) => [tx.id, tx]));
  let applied = 0;

  results.forEach((result) => {
    const tx = transactionById[result.id];
    if (!tx || tx.category === result.category) {
      return;
    }
    state.manualEdits[tx.id] = result.category;
    state.merchantOverrides[tx.merchant] = result.category;
    applied += 1;
  });

  return applied;
}

function buildAiInsightSnapshot() {
  const totalIncome = state.transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const totalSpend = state.transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return {
    transactions: state.transactions.length,
    totalIncome,
    totalSpend,
    topCategory: state.insights?.topCategory || null,
    monthOverMonth: state.insights?.monthOverMonth || null,
    subscriptions: state.insights?.subscriptions?.map((sub) => ({
      merchant: sub.merchant,
      avgAmount: sub.avgAmount
    })),
    biggestSpike: state.insights?.spikeSummary || "",
    healthScore: state.insights?.healthScore || 0,
    anomalyCounts: state.anomalies?.counts || {}
  };
}

function recalculateAndRender() {
  state.transactions = applyCategorization(state.rawTransactions, state.manualEdits, state.merchantOverrides);
  state.anomalies = detectAnomalies(state.transactions);
  state.insights = generateInsights(state.transactions, state.anomalies);
  if (state.aiNarrativeLines.length) {
    state.insights.lines = state.aiNarrativeLines;
  }

  const categoryData = buildCategorySpendData(state.transactions);
  const trendData = buildMonthlyTrendData(state.transactions);

  renderInsightsPanel(dom.insightsPanel, state.insights);
  renderAlertsPanel(dom.alertsPanel, state.anomalies);
  renderCharts(dom.categoryChart, dom.trendChart, categoryData, trendData);
  renderTransactionsTable(
    dom.tableContainer,
    state.transactions,
    state.anomalies.byTransaction,
    (transactionId, merchant, nextCategory) => {
      state.manualEdits[transactionId] = nextCategory;
      state.merchantOverrides[merchant] = nextCategory;
      state.aiNarrativeLines = [];
      recalculateAndRender();
    }
  );

  dom.transactionCount.textContent = `${state.transactions.length} transactions`;
  dom.dataSourceBadge.textContent = `Source: ${state.sourceLabel}`;
}

function loadTransactions(records, sourceLabel) {
  state.rawTransactions = records;
  state.manualEdits = {};
  state.merchantOverrides = {};
  state.aiNarrativeLines = [];
  state.sourceLabel = sourceLabel;
  recalculateAndRender();
  setAiMessage("");
}

async function handleCsvUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  setUploadMessage("Parsing CSV...");
  try {
    const parsed = await parseCsvFile(file);
    loadTransactions(parsed, `CSV (${file.name})`);
    setUploadMessage(`Loaded ${parsed.length} transactions from ${file.name}.`);
  } catch (error) {
    setUploadMessage(error.message || "Failed to parse CSV.", true);
  }
}

function loadMockData() {
  const normalized = normalizeMockTransactions(mockTransactions);
  loadTransactions(normalized, "Mock data");
  setUploadMessage("Using built-in mock dataset.");
}

function clearManualEdits() {
  state.manualEdits = {};
  state.merchantOverrides = {};
  state.aiNarrativeLines = [];
  recalculateAndRender();
  setUploadMessage("Manual category edits were cleared.");
  setAiMessage("AI summary was reset because categories changed.");
}

async function enhanceWithAi() {
  const apiKey = dom.openaiKey.value.trim();
  const model = dom.openaiModel.value.trim() || "gpt-4.1-mini";

  if (!apiKey) {
    setAiMessage("Paste your OpenAI API key to run AI enhancement.", true);
    return;
  }
  if (!state.transactions.length) {
    setAiMessage("Load transactions first, then run AI enhancement.", true);
    return;
  }

  try {
    setAiBusy(true);
    setAiMessage("Running AI categorization...");

    const candidates = buildAiCategorizationCandidates(state.transactions);
    const categoryResults = await aiCategorizeTransactions({
      apiKey,
      model,
      transactions: candidates
    });
    const appliedCount = applyAiCategoryResults(categoryResults);
    state.aiNarrativeLines = [];
    recalculateAndRender();

    setAiMessage("Generating AI plain-language summary...");
    const aiLines = await aiGenerateInsightLines({
      apiKey,
      model,
      snapshot: buildAiInsightSnapshot()
    });
    if (aiLines.length) {
      state.aiNarrativeLines = aiLines;
      recalculateAndRender();
    }

    setAiMessage(`AI enhancement complete. Updated ${appliedCount} categories using ${model}.`);
  } catch (error) {
    setAiMessage(error.message || "AI enhancement failed.", true);
  } finally {
    setAiBusy(false);
  }
}

function boot() {
  dom.csvInput.addEventListener("change", handleCsvUpload);
  dom.useMockBtn.addEventListener("click", loadMockData);
  dom.clearEditsBtn.addEventListener("click", clearManualEdits);
  dom.aiEnhanceBtn.addEventListener("click", enhanceWithAi);
  loadMockData();
}

boot();
