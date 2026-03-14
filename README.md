# YNAB Budget Cloner

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/VijaySelvaraju/YNAB-budget-cloner)

A browser-only web app that copies transactions from your real YNAB budget into a sandbox "Fresh Start" budget. No backend, no server — every request goes directly from your browser to the official YNAB API.

**Primary use case:** create a realistic test environment for building or evaluating YNAB integrations, without any risk to your live budget.

---

## How it works

The app is a 6-step wizard:

1. **Connect** — paste your YNAB Personal Access Token. It is stored in your browser's `localStorage` and never leaves your device except in direct calls to `api.ynab.com`.

2. **Pick budgets** — choose a source (🔴 **Real Budget**) and a destination (🟢 **Sandbox**). The two pickers are visually distinct and the app blocks you from selecting the same budget for both.

3. **Fresh Start reminder** — an inline card reminds you to run the Fresh Start step in YNAB on your sandbox budget before proceeding, so it has matching accounts and categories but no transactions. [YNAB Fresh Start guide →](https://support.ynab.com/plan-resets-and-fresh-starts-HkXYR_c0q)

4. **Configure filters** — set a date range (default: last 90 days) using manual date pickers or quick-select presets (Last 1 / 3 / 6 / 12 months, All time). Choose which accounts to include from a checklist. Toggle **Dry Run** mode if you want to preview without writing anything.

5. **Pre-flight check** — before any transactions are written, the app reads both budgets and shows you:
   - Which source accounts matched a destination account by name, and how many transactions each contains
   - Which source categories matched a destination category by name
   - A count of transactions that will be copied vs skipped, and why each skip will occur

6. **Clone** — after reviewing the pre-flight results, click Clone. A progress bar tracks each batch. When done, a results screen shows copied / skipped / error counts and lets you **download a full timestamped JSON log** of every transaction's outcome.

---

## Setup

### 1. Get a YNAB Personal Access Token

1. Log in to YNAB and go to **Account Settings → Developer Settings**
   ([direct link](https://app.ynab.com/settings/developer))
2. Click **New Token**, give it a name, and copy it.

### 2. Prepare your sandbox budget

Your destination budget needs to have the same account and category names as your source budget, but no transactions:

1. Open the budget you want to use as a sandbox in YNAB.
2. Go to **Budget → Fresh Start**. ([step-by-step guide](https://support.ynab.com/plan-resets-and-fresh-starts-HkXYR_c0q))
3. Confirm the reset — this wipes all transactions from that budget while keeping its structure.

> **Tip:** Run the pre-flight check first. The account and category match tables will show you exactly which names are missing in the destination so you can create them before cloning.

### 3. Run locally

```bash
git clone https://github.com/VijaySelvaraju/YNAB-budget-cloner.git
cd YNAB-budget-cloner
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), paste your token, and follow the wizard.

---

## Deploy to Netlify

Click the button at the top of this page — Netlify will fork the repo and deploy it automatically. Build settings are pre-configured in `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Build | [Vite](https://vitejs.dev) |
| UI framework | [React 18](https://react.dev) + TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| YNAB API | [ynab npm SDK v4](https://www.npmjs.com/package/ynab) |
| Routing | [React Router v6](https://reactrouter.com) |
| Hosting | [Netlify](https://netlify.com) |

---

## Security

- Your token lives **only in your browser's `localStorage`** — it is never sent to any server other than `api.ynab.com`.
- All API calls are made **directly from your browser** to the official YNAB API. YNAB supports CORS for browser clients.
- There is **no backend** — no server, no database, no logging.
- The app only ever **reads** from your source budget. The only write operation is `POST /budgets/{id}/transactions` on the destination budget. There are no update or delete calls anywhere in the codebase.
- You can verify every outbound request in your browser's Network DevTools.

---

## Features

- **Dry Run mode** — the full flow runs (pre-flight, progress bar, results screen) but no POST calls are made. The completion screen clearly states "Dry Run — nothing was written."
- **Date range filter** — manual From/To date pickers plus quick-select presets. The start date is sent as `since_date` on the YNAB API request (server-side filtering, not fetching everything and slicing in memory).
- **Account filter** — multi-select checklist with a select-all toggle. Only transactions for selected accounts are fetched.
- **Name-based matching** — accounts and categories are matched by name between source and destination. Category matching tries `Group / Category` first, then falls back to plain category name.
- **Split transaction support** — subtransactions are mapped individually. A parent with at least one mappable sub is copied; a parent with zero mappable subs is skipped.
- **Pre-flight diff** — review every account and category match (or mismatch) and see exactly how many transactions will be copied vs skipped before committing.
- **Download log** — the full result (every transaction's status, reason for skipping, destination ID if created) is exportable as a timestamped JSON file.
- **Persistent filters** — date range and account selection are saved to `localStorage` and restored on your next visit.

---

## Future features

- **Payee copy** — clone payee records alongside transactions
- **Scheduled transactions** — copy recurring/scheduled transactions
- **Budgeted monthly amounts** — copy category budget targets
- **Incremental sync** — re-run the cloner and skip transactions that were already copied
- **Account mapping UI** — manually pair source and destination accounts when names don't match
- **Category mapping UI** — same for categories with mismatched names
