import { useMemo, useState } from 'react'
import { Card, MonthPicker, TxnList, Money } from '../components/ui.jsx'
import { BucketBars } from '../components/charts.jsx'
import { BUCKETS } from '../data/categories.js'
import { monthKey, today, live, inMonth, periodSeries, lastNMonths, lastNWeeks, weekKey, monthLabel, weekLabel, sum, fmt } from '../lib/calc.js'

export default function Spending({ data, update }) {
  const [month, setMonth] = useState(monthKey(today()))
  const [view, setView] = useState('weekly')
  const [bucket, setBucket] = useState('')
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => view === 'weekly' ? periodSeries(data, lastNWeeks(12), weekKey) : periodSeries(data, lastNMonths(12), monthKey), [data, view])
  const all = useMemo(() => inMonth(live(data), month), [data, month])
  const shown = all.filter(t => (kind === 'all' || t.type === kind) && (!bucket || t.bucket === bucket) && (!q || (t.name + ' ' + (t.note || '')).toLowerCase().includes(q.toLowerCase())))
  const shownSpend = sum(shown.filter(t => t.type === 'expense'))

  const thisWeek = useMemo(() => { const k = weekKey(today()); return sum(live(data).filter(t => t.type === 'expense' && weekKey(t.date) === k)) }, [data])
  const avgWeek = useMemo(() => { const r = rows.slice(0, -1).filter(x => x.total > 0); return r.length ? sum(r, x => x.total) / r.length : 0 }, [rows])

  return (
    <div className="grid">
      <Card className="span-all" title={view === 'weekly' ? 'Last 12 weeks' : 'Last 12 months'} aside={
        <div className="seg small"><button className={view === 'weekly' ? 'on' : ''} onClick={() => setView('weekly')}>Weekly</button><button className={view === 'monthly' ? 'on' : ''} onClick={() => setView('monthly')}>Monthly</button></div>}>
        <BucketBars rows={rows} labelFn={view === 'weekly' ? weekLabel : monthLabel} />
        {view === 'weekly' && <p className="muted small-note">This week so far <b className="num">{fmt(thisWeek)}</b>{avgWeek ? <> · average full week <b className="num">{fmt(avgWeek)}</b></> : null}. Weeks start on Monday.</p>}
      </Card>

      <Card className="span-all" title="Transactions" aside={<MonthPicker value={month} onChange={setMonth} />}>
        <div className="filters">
          <div className="seg small">
            {[['all', 'All'], ['expense', 'Expenses'], ['income', 'Income'], ['transfer', 'Transfers']].map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
          </div>
          <select value={bucket} onChange={e => setBucket(e.target.value)}><option value="">Every bucket</option>{BUCKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
          <input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
          <span className="muted">{shown.length} shown{shownSpend ? <> · <Money v={-shownSpend} cents={false} /></> : null}</span>
        </div>
        <TxnList txns={shown} data={data} update={update} empty="No transactions match. Add one from the Overview tab." />
      </Card>
    </div>
  )
}
