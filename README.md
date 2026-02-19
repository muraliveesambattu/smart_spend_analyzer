# Smart Spend Analyzer

Frontend-only web app built with HTML, CSS, JavaScript, and Bootstrap.

## Features

- CSV upload for `date`, `description`, `amount`
- Transaction parsing and normalization
- Auto categorization with rule-based + history-weighted logic
- Optional AI enhancement (BYOK, no backend):
  - AI category corrections for ambiguous transactions
  - AI plain-language insight lines
- Manual category editing with local state persistence
- Anomaly detection:
  - spending spikes vs category average
  - new merchant detection
  - recurring payment amount changes
- Insights panel:
  - top spending category
  - month-over-month spend change
  - likely subscriptions
  - biggest spike explanation
  - financial health score (0-100)
- Visualizations:
  - category spend doughnut chart
  - monthly spend/income trend chart
- Mock dataset fallback

## Run

Open `/Users/muraliveesambattu/Documents/smart_spend_analyze/index.html` in a browser.

For local static serving:

```bash
cd /Users/muraliveesambattu/Documents/smart_spend_analyze
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## AI Without Backend (BYOK)

- Paste your OpenAI API key in the dashboard.
- Choose model (default: `gpt-4.1-mini`).
- Click `Enhance with AI`.

Notes:

- Key is used in-memory from the page and not stored by this app.
- Because this is frontend-only, API key is visible to the browser session; use only for personal/local testing.
- Prefer running via `http://localhost` (not `file://`) when using API calls.

## CSV Format

```csv
date,description,amount
2026-01-01,Payroll Deposit - Acme Corp,4300.00
2026-01-02,Whole Foods Market,-149.54
2026-01-03,Chevron Gas,-68.45
```
