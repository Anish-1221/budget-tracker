# Ledger (budget tracker)

Personal spending, savings and investment tracker. React + Vite + Recharts, deployed to GitHub Pages. Single user, no login, dark theme. Data lives in the browser (localStorage) and syncs through a private GitHub Gist so phone and laptop share one ledger.

Live at https://Anish-1221.github.io/budget-tracker/

## How money is modelled

Everything is a transaction with one of three types:

| Type | What it means | Fields |
|---|---|---|
| Expense | Money spent. Has a bucket and a "paid with" account (credit card, checking or savings). | name, amount, bucket, account, date, note |
| Income | Money coming in (TA stipend, refund, gift). Deposited to checking by default. | source, amount, to, date |
| Transfer | Money moving between your accounts. Never counts as spending. | from, to, amount, date |

Four accounts: **Checking**, **Savings**, **Investments**, **Credit card** (stored as the amount owed). Current balance = opening balance (Settings) + everything logged.

### Credit card
Log purchases when they happen with their real bucket and "Paid with: Credit card". When you pay the bill, log a transfer Checking → Credit card (or use the recurring "Card payment" rule). The Overview shows both: what went on the card this month, how much you paid, and how much was carried in from last month (the card balance at the end of the previous month). Card payments never count as spending, so nothing is double counted.

### "Left" this month (budget view)
`income − all expenses (any account) − moved to savings − moved to investments + taken back out of savings`

The "Out of checking" stat is the cash view: expenses paid from checking + card payments + other transfers out.

### Savings and investments
- Deposit: transfer Checking → Savings. Withdraw: Savings → Checking, then log whatever you spend it on as a normal expense. Invest from savings: Savings → Investments. Spend directly from savings: an expense with "Paid with: Savings".
- Goals are labels on deposits (a `goalId` on the transfer). Progress = deposits toward the goal minus withdrawals from it. The savings balance is still one number.
- Investments track what you put in, not market value.

## Auto bucketing
`src/data/categories.js` holds the buckets and a seed keyword map (stores, items, bill names). `categorize()` in `src/lib/calc.js` checks, in order: learned exact name, learned word, seed phrases (longest first), seed words, prefix guess. When you pick a bucket the app did not guess, the name is saved under `learned` and wins next time. Manage learned words in Settings.

Buckets also carry a kind (fixed / periodic / flex) used for the "Discretionary" stat, following Monarch's flex budgeting idea. Change a bucket's `kind` in `categories.js` if you disagree with the default.

## Recurring bills
Settings → Recurring bills. Each month the Overview lists rules that have no transaction yet and you add them with one tap (amount is editable afterwards). Rules can be expenses, transfers (savings deposit, card payment) or income.

## Data, sync and backups
- Local: `localStorage` under `budget-tracker:data`; settings (token, gist id) under `budget-tracker:settings`.
- Cloud: private Gist named `Budget Tracker data`, file `budget-tracker-data.json`. Every change pushes immediately (250 ms) and flushes with `keepalive` if the app is backgrounded first. On open and on returning to the tab, the app pulls and merges.
- Merge is per entry: for each transaction, rule and goal the copy with the newer `updatedAt` wins, deletions are tombstones (`deleted: true`), so two devices can log on the same day without overwriting each other. Opening balances and limits use their own timestamps.
- Backup: Settings → Download backup. Restore merges the file with what is on the device.
- Token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → tick only `gist`.

## Development and deployment
```
npm install
npm run dev
npm run build
```
Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and deploys `dist/` to GitHub Pages. One-time repo settings: Pages source = GitHub Actions; Actions workflow permissions = read and write.

## Where to change things
- `src/data/categories.js`: buckets, colors, kinds, account list, seed keywords
- `src/lib/calc.js`: categorizer, balances, month summary, week/month series, net worth, recurring logic
- `src/lib/storage.js`: localStorage, merge, Gist API
- `src/styles.css`: theme tokens at the top
- `src/tabs/*.jsx`: the five screens; `src/components/ui.jsx` has the transaction form and list; `src/components/charts.jsx` the charts
