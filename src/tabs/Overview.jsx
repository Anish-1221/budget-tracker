import { useMemo, useState } from 'react'
import { Card, MonthPicker, Money, TxnForm } from '../components/ui.jsx'
import { BucketDonut, IncomeVsSpend, NetWorthChart } from '../components/charts.jsx'
import { BUCKETS, BUCKET_BY_ID } from '../data/categories.js'
import { monthKey, today, monthSummary, balances, dueRecurring, recurringDate, uid, lastNMonths, monthLabel, shiftMonth, fmt, netWorthSeries, acct } from '../lib/calc.js'

export default function Overview({ data, update, setTab }) {
  const [month, setMonth] = useState(monthKey(today()))
  const s = useMemo(() => monthSummary(data, month), [data, month])
  const prev = useMemo(() => monthSummary(data, shiftMonth(month, -1)), [data, month])
  const bal = useMemo(() => balances(data), [data])
  const isCurrent = month === monthKey(today())
  const due = isCurrent ? dueRecurring(data, month) : []
  const trend = useMemo(() => lastNMonths(6, month).map(k => { const x = monthSummary(data, k); return { label: monthLabel(k), income: x.income, spent: x.spent, saved: x.toSavings + x.toInvest } }), [data, month])

  function addRecurring(r) {
    update(d => {
      const t = { id: uid(), recurringId: r.id, name: r.name, amount: r.amount, date: recurringDate(r, month), note: '', updatedAt: Date.now() }
      if (r.type === 'transfer') { t.type = 'transfer'; t.from = acct(r.account); t.to = acct(r.to) }
      else { t.type = r.type === 'income' ? 'income' : 'expense'; if (t.type === 'expense') { t.bucket = r.bucket; t.account = acct(r.account) } else t.to = 'checking' }
      d.txns[t.id] = t
    })
  }

  const nw = useMemo(() => netWorthSeries(data, lastNMonths(12, month)).map(r => ({ ...r, label: monthLabel(r.key) })), [data, month])
  const limits = BUCKETS.filter(b => data.limits[b.id] > 0)
  const strip = strips(s)

  return (
    <div className="grid">
      <div className="span-all head-row">
        <MonthPicker value={month} onChange={setMonth} />
        <div className="balances">
          <span>Checking <Money v={bal.checking} cents={false} /></span>
          <span>Savings <Money v={bal.savings} cents={false} /></span>
          <span>Net worth <Money v={bal.checking + bal.savings + bal.investments} cents={false} /></span>
        </div>
      </div>

      <Card className="span-all strip-card">
        <div className="strip-top">
          <div>
            <div className="label">Income this month</div>
            <div className="num hero">{fmt(s.income)}</div>
          </div>
          <div className={`left-box ${s.left < 0 ? 'neg' : ''}`}>
            <div className="label">{s.left < 0 ? 'Over by' : 'Left'}</div>
            <div className="num hero">{fmt(Math.abs(s.left))}</div>
          </div>
        </div>
        {s.income > 0 || s.spent > 0 ? (
          <>
            <div className="strip" aria-label="Where this month's income went">
              {strip.map(seg => <div key={seg.id} className={`seg-part ${seg.id}`} style={{ flexGrow: seg.value, background: seg.color }} title={`${seg.label}: ${fmt(seg.value, { cents: true })}`} />)}
            </div>
            <ul className="strip-legend">
              {strip.filter(x => x.value > 0 && x.id !== 'left').slice(0, 8).map(x => <li key={x.id}><i style={{ background: x.color }} />{x.label} <b className="num">{fmt(x.value)}</b></li>)}
            </ul>
          </>
        ) : <p className="empty">Add this month's income and your first expense to see where the money goes.</p>}
        <dl className="stats">
          <div><dt>Spent</dt><dd><Money v={s.spent} cents={false} /><small>{prev.spent ? `${s.spent >= prev.spent ? '+' : ''}${Math.round(100 * (s.spent - prev.spent) / prev.spent)}% vs last month` : `${s.count} expenses`}</small></dd></div>
          <div><dt>Per day</dt><dd><Money v={s.perDay} cents={false} /><small>{s.count} expenses so far</small></dd></div>
          <div><dt>Biggest bucket</dt><dd>{s.top ? <><Money v={s.top[1]} cents={false} /><small>{BUCKET_BY_ID[s.top[0]]?.label}</small></> : <><Money v={0} cents={false} /><small>nothing yet</small></>}</dd></div>
          <div><dt>Set aside</dt><dd><Money v={s.toSavings + s.toInvest} cents={false} /><small>{fmt(s.toSavings)} saved, {fmt(s.toInvest)} invested</small></dd></div>
          <div><dt>Discretionary</dt><dd><Money v={s.byKind.flex} cents={false} /><small>{fmt(s.byKind.fixed)} fixed, {fmt(s.byKind.recurring)} periodic</small></dd></div>
          <div><dt>Out of checking</dt><dd><Money v={s.checkingOut} cents={false} /><small>{fmt(s.checkingIn)} came in</small></dd></div>
        </dl>
      </Card>

      {due.length > 0 && (
        <Card title="Due this month" className="span-all due" aside={<button className="ghost" onClick={() => due.forEach(addRecurring)}>Add all</button>}>
          <ul className="due-list">
            {due.map(r => <li key={r.id}><span>{r.name}</span><span className="muted">{r.type === 'transfer' ? 'transfer' : r.type === 'income' ? 'income' : BUCKET_BY_ID[r.bucket]?.label} · day {r.day}</span><Money v={r.amount} /><button className="ghost" onClick={() => addRecurring(r)}>Add</button></li>)}
          </ul>
        </Card>
      )}

      <Card title="Add" className="span-2">
        <TxnForm data={data} update={update} />
      </Card>

      <Card title="This month by bucket">
        <BucketDonut byBucket={s.byBucket} total={s.spent} />
      </Card>

      {limits.length > 0 && (
        <Card title="Bucket limits" aside={<button className="ghost" onClick={() => setTab('settings')}>Edit</button>}>
          <ul className="limits">
            {limits.map(b => { const v = s.byBucket[b.id] || 0, lim = data.limits[b.id], p = Math.min(100, 100 * v / lim); return (
              <li key={b.id}>
                <div className="lim-head"><span><i className="swatch" style={{ background: b.color }} />{b.label}</span><span className="num">{fmt(v)} <em>/ {fmt(lim)}</em></span></div>
                <div className={`bar ${v > lim ? 'over' : p > 85 ? 'near' : ''}`}><div style={{ width: p + '%', background: b.color }} /></div>
              </li>) })}
          </ul>
        </Card>
      )}

      <Card title="Six-month trend" className={limits.length ? 'span-2' : 'span-all'}>
        <IncomeVsSpend rows={trend} />
      </Card>

      <Card title="Net worth" className="span-all">
        <NetWorthChart rows={nw} />
        <p className="muted small-note">Checking + savings + invested at the end of each month.</p>
      </Card>
    </div>
  )
}

function strips(s) {
  const parts = BUCKETS.map(b => ({ id: b.id, label: b.label, color: b.color, value: s.byBucket[b.id] || 0 })).filter(x => x.value > 0).sort((a, b) => b.value - a.value)
  parts.push({ id: 'saved', label: 'Saved', color: '#7ED9A1', value: s.toSavings })
  parts.push({ id: 'invested', label: 'Invested', color: '#B39DFF', value: s.toInvest })
  parts.push({ id: 'left', label: 'Left', color: 'rgba(255,255,255,0.08)', value: Math.max(0, s.left) })
  return parts
}
