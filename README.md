# YNAB Budget Cloner

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/VijaySelvaraju/ynab-budget-cloner)

A browser-only web UI that clones transactions from your real YNAB budget into a sandbox "Fresh Start" budget. Its primary purpose is to give you a safe environment for testing other YNAB integrations without touching your live data.

---

## Why it exists

When building or evaluating YNAB integrations, you need a budget that looks real but isn't. The official Fresh Start feature wipes a budget clean — this tool then fills it back up with a copy of your actual transactions (filtered by date range and account) so you have realistic data to test against, without any risk to your real budget.

---

## Setup

### 1. Get a YNAB Personal Access Token

1. Log in to YNAB and go to **Account Settings → Developer Settings**
   (direct link: https://app.ynab.com/settings/developer)
2. Click **New Token**, give it a name, and copy the generated token.

### 2. Prepare your Sandbox budget (Fresh Start)

Before running the cloner, you need an empty destination budget:

1. In YNAB, open the budget you want to use as a sandbox.
2. Go to **Budget → Fresh Start** (see the [YNAB Fresh Start guide](https://support.ynab.com/plan-resets-and-fresh-starts-HkXYR_c0q) for step-by-step instructions).
3. Recreate your account and category structure in the fresh budget, or use the cloner's pre-flight check to see which accounts/categories need to exist before cloning.

### 3. Run locally

```bash
git clone https://github.com/VijaySelvaraju/ynab-budget-cloner.git
cd ynab-budget-cloner
npm install
npm run dev
```

Open http://localhost:5173, paste your token, pick your budgets, configure filters, run the pre-flight check, and clone.

---

## Core user flow

1. **Enter token** — stored only in your browser's `localStorage`, never sent anywhere except the official YNAB API.
2. **Pick budgets** — Source (🔴 Real Budget) and Destination (🟢 Sandbox). Same-budget selection is blocked.
3. **Read the Fresh Start card** — inline reminder to complete the manual YNAB step first.
4. **Configure filters** — date range (default: last 90 days) and which accounts to include. Persisted in `localStorage`.
5. **Run Pre-flight Check** — shows account/category match table and transaction counts before any writes.
6. **Clone Transactions** — bulk POSTs matched transactions to the destination budget with a live progress bar.
7. **Review results** — see copied/skipped/error counts and download a timestamped JSON log.

---

## One-click Netlify deploy

Click the badge at the top of this file. Netlify will clone the repo and deploy automatically using the settings in `netlify.toml`.

---

## Security

- Your YNAB token is stored **only in your browser's `localStorage`**.
- All API requests go **directly from your browser to `https://api.ynab.com/v1`** (YNAB supports CORS for browser clients).
- There is **no backend server** — nothing is logged, stored, or transmitted by this app other than your direct YNAB API calls.
- You can audit every outbound request in your browser's Network DevTools.

---

## Features

- Dry Run mode — full flow including pre-flight and progress UI, but no POST calls made
- Date range filter with quick-select presets (1 / 3 / 6 / 12 months, All time)
- Per-account multi-select with live transaction counts
- Account and category matching by name (qualified group/category fallback to plain name)
- Split transaction (subtransaction) support
- Downloadable JSON result log with timestamp

---

## Future features

- **Payee copy** — clone payee records alongside transactions
- **Scheduled transactions** — copy recurring/scheduled transactions
- **Budgeted monthly amounts** — copy category budget targets
- **Incremental sync** — re-run the cloner and skip already-cloned transactions
- **Account mapping UI** — manually map source accounts to destination accounts when names don't match
- **Category mapping UI** — same for categories with mismatched names
