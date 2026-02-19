import { CATEGORIES } from "./constants.js";

const MAX_CATEGORIZATION_ITEMS = 120;

function extractJsonBlock(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    // Try fenced JSON first.
  }

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch (_) {
      // Continue fallback parsing.
    }
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch && objectMatch[0]) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (_) {
      return null;
    }
  }

  return null;
}

async function callResponsesApi({ apiKey, model, prompt }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  return (data.output_text || "").trim();
}

function validateCategory(category) {
  return CATEGORIES.includes(category) ? category : null;
}

export async function aiCategorizeTransactions({ apiKey, model, transactions }) {
  const limited = transactions.slice(0, MAX_CATEGORIZATION_ITEMS);
  if (!limited.length) {
    return [];
  }

  const categoriesText = CATEGORIES.join(", ");
  const prompt = [
    "You are a financial transaction categorizer.",
    `Allowed categories only: ${categoriesText}.`,
    'Return valid JSON only with this shape: {"items":[{"id":"string","category":"string","confidence":0.0}]}',
    "Do not include markdown or extra keys.",
    "Transactions:",
    JSON.stringify(limited)
  ].join("\n");

  const outputText = await callResponsesApi({ apiKey, model, prompt });
  const parsed = extractJsonBlock(outputText);
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error("AI categorization returned invalid JSON.");
  }

  return parsed.items
    .map((item) => ({
      id: item?.id,
      category: validateCategory(item?.category),
      confidence: typeof item?.confidence === "number" ? item.confidence : null
    }))
    .filter((item) => item.id && item.category);
}

export async function aiGenerateInsightLines({ apiKey, model, snapshot }) {
  const prompt = [
    "You are a financial assistant explaining spending data in plain language.",
    "Return valid JSON only with this shape: {\"lines\":[\"line1\",\"line2\",\"line3\",\"line4\"]}.",
    "Constraints:",
    "- 4 lines only.",
    "- Keep each line under 140 characters.",
    "- Use neutral and practical tone.",
    "- Mention INR amounts when relevant.",
    "Data:",
    JSON.stringify(snapshot)
  ].join("\n");

  const outputText = await callResponsesApi({ apiKey, model, prompt });
  const parsed = extractJsonBlock(outputText);
  if (!parsed || !Array.isArray(parsed.lines)) {
    throw new Error("AI insights returned invalid JSON.");
  }

  return parsed.lines.map((line) => String(line).trim()).filter(Boolean).slice(0, 4);
}
