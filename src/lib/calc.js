import { KEYWORDS, BUCKETS, ACCOUNTS } from '../data/categories.js'

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
export const today = () => toISO(new Date())
export const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const monthKey = iso => iso.slice(0, 7)
export const fmt = (n, opts = {}) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: opts.cents ? 2 : 0, ...opts })
export const fmtC = n => fmt(n, { cents: true, minimumFractionDigits: 2 })

// Monday-start week key: ISO date of the Monday
export function weekKey(iso) {
  const d = parseISO(iso); const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day); return toISO(d)
}
export function monthLabel(key) { const [y, m] = key.split('-'); return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' }) }
export function weekLabel(key) { const d = parseISO(key); return d.toLocaleString('en-US', { month: 'short', day: 'numeric' }) }
export function shiftMonth(key, n) { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
export function lastNMonths(n, from = monthKey(today())) { return Array.from({ length: n }, (_, i) => shiftMonth(from, i - n + 1)) }
export function lastNWeeks(n) { const k = weekKey(today()); return Array.from({ length: n }, (_, i) => { const d = parseISO(k); d.setDate(d.getDate() - 7 * (n - 1 - i)); return toISO(d) }) }

// ---------- auto categorization ----------
const SEED = Object.entries(KEYWORDS).flatMap(([b, ws]) => ws.map(w => [w, b])).sort((a, b) => b[0].length - a[0].length)
export function categorize(name, learned = {}) {
  const raw = (name || '').trim().toLowerCase()
  if (!raw) return null
  if (learned[raw]) return { bucket: learned[raw], confidence: 'learned', hit: raw }
  const words = raw.split(/[^a-z0-9&'+-]+/).filter(Boolean)
  for (const w of words) if (learned[w]) return { bucket: learned[w], confidence: 'learned', hit: w }
  const wordSet = new Set(words)
  for (const [k, b] of SEED) {
    const phrase = /[^a-z0-9]/.test(k)
    if (phrase ? raw.includes(k) : wordSet.has(k)) return { bucket: b, confidence: 'seed', hit: k }
  }
  // fuzzy: word starts with key (e.g. "groceries" vs "grocer", "donations")
  for (const w of words) for (const [k, b] of SEED) if (k.length >= 4 && (w.startsWith(k) || k.startsWith(w) && w.length >= 4)) return { bucket: b, confidence: 'guess', hit: k }
  return null
}

// ---------- transactions ----------
// txn: { id, type: 'expense'|'income'|'transfer', amount, name, date, bucket?, account?, from?, to?, note?, goalId?, updatedAt, deleted? }
export const live = data => Object.values(data.txns || {}).filter(t => !t.deleted)
export const inMonth = (txns, key) => txns.filter(t => monthKey(t.date) === key)
export const sum = (arr, f = x => x.amount) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)

// Card purchases count against checking the moment they are logged, so there is no card account.
// Entries from before this change that still say 'credit' map to checking; old card-payment transfers are ignored.
export const acct = a => (a === 'credit' || !a ? 'checking' : a)
export const isCardPayment = t => t.type === 'transfer' && (t.to === 'credit' || t.from === 'credit')
export function balances(data, upTo = null) {
  const b = { checking: 0, savings: 0, investments: 0 }
  const ob = data.opening || {}
  for (const a of ACCOUNTS) b[a.id] = Number(ob[a.id]) || 0
  for (const t of live(data)) {
    if (upTo && t.date > upTo) continue
    const amt = Number(t.amount) || 0
    if (t.type === 'income') b[acct(t.to)] += amt
    else if (t.type === 'expense') b[acct(t.account)] -= amt
    else if (t.type === 'transfer' && !isCardPayment(t)) { b[acct(t.from)] -= amt; b[acct(t.to)] += amt }
  }
  return b
}
export const netWorth = b => b.checking + b.savings + b.investments

export function monthSummary(data, key) {
  const txns = inMonth(live(data), key)
  const expenses = txns.filter(t => t.type === 'expense')
  const income = sum(txns.filter(t => t.type === 'income'))
  const spent = sum(expenses)
  const toSavings = sum(txns.filter(t => t.type === 'transfer' && t.to === 'savings' && t.from !== 'investments'))
  const fromSavings = sum(txns.filter(t => t.type === 'transfer' && t.from === 'savings'))
  const toInvest = sum(txns.filter(t => t.type === 'transfer' && t.to === 'investments'))
  const byBucket = {}
  for (const t of expenses) byBucket[t.bucket || 'other'] = (byBucket[t.bucket || 'other'] || 0) + Number(t.amount)
  const byKind = { fixed: 0, recurring: 0, flex: 0 }
  for (const b of BUCKETS) byKind[b.kind] += byBucket[b.id] || 0
  // Budget view: what remains of this month's income after everything you spent (any card) and set aside
  const left = income - spent - toSavings - toInvest + fromSavings
  // Cash view: what actually left checking this month
  const checkingOut = sum(expenses.filter(t => acct(t.account) === 'checking')) + sum(txns.filter(t => t.type === 'transfer' && !isCardPayment(t) && acct(t.from) === 'checking'))
  const checkingIn = income + sum(txns.filter(t => t.type === 'transfer' && !isCardPayment(t) && acct(t.to) === 'checking'))
  const top = Object.entries(byBucket).sort((a, b) => b[1] - a[1])[0] || null
  const [yy, mm] = key.split('-').map(Number)
  const daysElapsed = key === monthKey(today()) ? Number(today().slice(8, 10)) : new Date(yy, mm, 0).getDate()
  return { key, txns, expenses, income, spent, toSavings, fromSavings, toInvest, byBucket, byKind, left, checkingOut, checkingIn, count: expenses.length, top, perDay: spent / Math.max(1, daysElapsed) }
}

export function periodSeries(data, keys, keyFn) {
  const ex = live(data).filter(t => t.type === 'expense')
  return keys.map(k => {
    const row = { key: k, total: 0 }
    for (const t of ex) if (keyFn(t.date) === k) { row[t.bucket || 'other'] = (row[t.bucket || 'other'] || 0) + Number(t.amount); row.total += Number(t.amount) }
    return row
  })
}

export function netWorthSeries(data, months) {
  return months.map(k => {
    const [y, m] = k.split('-').map(Number); const end = toISO(new Date(y, m, 0))
    const b = balances(data, end)
    return { key: k, netWorth: netWorth(b), savings: b.savings, investments: b.investments, checking: b.checking }
  })
}

// Recurring bills: { id, name, amount, bucket, account, day, type:'expense'|'transfer', to?, active }
// Returns the ones due for `monthKey` that have no txn yet.
export function dueRecurring(data, key) {
  const applied = new Set(live(data).filter(t => t.recurringId && monthKey(t.date) === key).map(t => t.recurringId))
  return Object.values(data.recurring || {}).filter(r => r.active !== false && !r.deleted && !applied.has(r.id) && r.to !== 'credit')
}
export function recurringDate(r, key) {
  const [y, m] = key.split('-').map(Number); const last = new Date(y, m, 0).getDate()
  return `${key}-${String(Math.min(Number(r.day) || 1, last)).padStart(2, '0')}`
}

export function goalProgress(data, goal) {
  const t = live(data).filter(x => x.goalId === goal.id && x.type === 'transfer')
  return sum(t.filter(x => x.to === 'savings')) - sum(t.filter(x => x.from === 'savings'))
}
