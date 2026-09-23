import { useMemo, useState } from 'react'
import { Card, TxnForm, TxnList } from '../components/ui.jsx'
import { BalanceLine } from '../components/charts.jsx'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { balances, live, netWorthSeries, lastNMonths, monthLabel, monthKey, fmt, sum, today, monthSummary } from '../lib/calc.js'

export default function Investments({ data, update }) {
  const bal = useMemo(() => balances(data), [data])
  const months = lastNMonths(12)
  const series = useMemo(() => netWorthSeries(data, months).map(r => ({ label: monthLabel(r.key), value: r.investments })), [data])
  const txns = useMemo(() => live(data).filter(t => (t.type === 'transfer' && (t.from === 'investments' || t.to === 'investments')) || (t.type === 'income' && t.to === 'investments')), [data])
  const contrib = useMemo(() => months.map(k => ({ label: monthLabel(k), value: sum(txns.filter(t => t.type === 'transfer' && t.to === 'investments' && monthKey(t.date) === k)) - sum(txns.filter(t => t.type === 'transfer' && t.from === 'investments' && monthKey(t.date) === k)) })), [txns])
  const [mode, setMode] = useState('add')
  const thisMonth = monthSummary(data, monthKey(today()))
  const avg = useMemo(() => { const r = contrib.slice(0, -1).filter(x => x.value !== 0); return r.length ? sum(r, x => x.value) / r.length : 0 }, [contrib])
  const defaults = mode === 'add' ? { from: 'checking', to: 'investments', name: 'Investment' } : { from: 'investments', to: 'checking', name: 'Sold / cashed out' }

  return (
    <div className="grid">
      <Card className="span-2 hero-card">
        <div className="label">Invested so far</div>
        <div className="num hero acc-invest">{fmt(bal.investments, { cents: true })}</div>
        <div className="muted">{fmt(thisMonth.toInvest)} this month{avg ? ` · ${fmt(avg)} a month on average` : ''}. Tracks what you put in, not market value.</div>
        <BalanceLine rows={series} color="#B39DFF" name="Invested" />
      </Card>

      <Card title={mode === 'add' ? 'Add an investment' : 'Cash out'} className="span-1" aside={
        <div className="seg small"><button className={mode === 'add' ? 'on' : ''} onClick={() => setMode('add')}>Add</button><button className={mode === 'out' ? 'on' : ''} onClick={() => setMode('out')}>Cash out</button></div>}>
        <p className="muted small-note">{mode === 'add' ? 'Money leaves checking (or savings, change “From”) and adds to your invested total.' : 'Money comes back to checking and reduces your invested total.'}</p>
        <TxnForm key={mode} data={data} update={update} initialType="transfer" lockType defaults={defaults} />
      </Card>

      <Card title="Monthly contributions" className="span-all">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={contrib} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={v => fmt(v)} stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} width={62} />
            <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }} formatter={v => [fmt(v, { cents: true }), 'Net contribution']} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar isAnimationActive={false} dataKey="value" fill="#B39DFF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Investment history" className="span-all">
        <TxnList txns={txns} data={data} update={update} empty="Nothing invested yet." />
      </Card>
    </div>
  )
}
