import { useMemo, useState } from 'react'
import { Card, Money, TxnForm, TxnList, ConfirmButton } from '../components/ui.jsx'
import { BalanceLine } from '../components/charts.jsx'
import { balances, live, netWorthSeries, lastNMonths, monthLabel, goalProgress, uid, fmt, monthKey, today, monthSummary } from '../lib/calc.js'

export default function Savings({ data, update }) {
  const bal = useMemo(() => balances(data), [data])
  const series = useMemo(() => netWorthSeries(data, lastNMonths(12)).map(r => ({ label: monthLabel(r.key), value: r.savings })), [data])
  const txns = useMemo(() => live(data).filter(t => (t.type === 'transfer' && (t.from === 'savings' || t.to === 'savings')) || (t.type === 'expense' && t.account === 'savings') || (t.type === 'income' && t.to === 'savings')), [data])
  const [mode, setMode] = useState('deposit')
  const [goalFor, setGoalFor] = useState(null) // goalId when adding/withdrawing for a goal
  const [newGoal, setNewGoal] = useState({ name: '', target: '' })
  const goals = Object.values(data.goals).filter(g => !g.deleted)
  const thisMonth = monthSummary(data, monthKey(today()))
  const unallocated = bal.savings - goals.reduce((s, g) => s + goalProgress(data, g), 0)

  function addGoal(e) {
    e.preventDefault(); const t = Number(newGoal.target); if (!newGoal.name.trim() || !t) return
    update(d => { const id = uid(); d.goals[id] = { id, name: newGoal.name.trim(), target: t, createdAt: today(), updatedAt: Date.now() } })
    setNewGoal({ name: '', target: '' })
  }

  const formKey = mode + (goalFor || '')
  const defaults = mode === 'deposit' ? { from: 'checking', to: 'savings', name: goalFor ? `Toward ${data.goals[goalFor]?.name}` : 'Savings deposit', goalId: goalFor }
    : mode === 'withdraw' ? { from: 'savings', to: 'checking', name: goalFor ? `From ${data.goals[goalFor]?.name}` : 'Savings withdrawal', goalId: goalFor }
    : mode === 'invest' ? { from: 'savings', to: 'investments', name: 'Savings → investments', goalId: goalFor }
    : { account: 'savings' }

  return (
    <div className="grid">
      <Card className="span-2 hero-card">
        <div className="label">Saved so far</div>
        <div className="num hero acc-savings">{fmt(bal.savings, { cents: true })}</div>
        <div className="muted">{fmt(thisMonth.toSavings)} added this month{thisMonth.fromSavings ? `, ${fmt(thisMonth.fromSavings)} taken out` : ''}{goals.length ? ` · ${fmt(Math.max(0, unallocated))} not tied to a goal` : ''}</div>
        <BalanceLine rows={series} color="#7ED9A1" name="Savings" />
      </Card>

      <Card title="Move money" className="span-1">
        <div className="seg" style={{ marginBottom: 12 }}>
          {[['deposit', 'Deposit'], ['withdraw', 'Withdraw'], ['invest', 'Invest'], ['spend', 'Spend from savings']].map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}
        </div>
        {goals.length > 0 && mode !== 'spend' && (
          <label className="block">Goal
            <select value={goalFor || ''} onChange={e => setGoalFor(e.target.value || null)}><option value="">No specific goal</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          </label>
        )}
        <p className="muted small-note">
          {mode === 'deposit' && 'Moves money from checking into savings. Counts as “set aside” this month.'}
          {mode === 'withdraw' && 'Moves money back to checking. If you then spend it, log that expense normally and it shows in its bucket.'}
          {mode === 'invest' && 'Moves savings straight into investments.'}
          {mode === 'spend' && 'Pay for something directly out of savings. It lands in a bucket like any other expense.'}
        </p>
        <TxnForm key={formKey} data={data} update={update} initialType={mode === 'spend' ? 'expense' : 'transfer'} lockType defaults={defaults} />
      </Card>

      <Card title="Goals" className="span-all">
        <ul className="goals">
          {goals.map(g => { const p = goalProgress(data, g), pct = Math.min(100, 100 * p / g.target); return (
            <li key={g.id}>
              <div className="lim-head"><span>{g.name}</span><span className="num">{fmt(p)} <em>/ {fmt(g.target)}</em> <em>{Math.round(pct)}%</em></span></div>
              <div className={`bar ${pct >= 100 ? 'done' : ''}`}><div style={{ width: pct + '%', background: '#7ED9A1' }} /></div>
              <div className="row end" style={{ marginTop: 6 }}>
                <button className="ghost" onClick={() => { setMode('deposit'); setGoalFor(g.id) }}>Add to goal</button>
                <button className="ghost" onClick={() => { setMode('withdraw'); setGoalFor(g.id) }}>Use it</button>
                <ConfirmButton onConfirm={() => update(d => { d.goals[g.id].deleted = true; d.goals[g.id].updatedAt = Date.now() })} children="Remove" />
              </div>
            </li>) })}
        </ul>
        <form className="row" onSubmit={addGoal}>
          <label className="grow">New goal<input value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="Emergency fund, India trip" /></label>
          <label className="amt">Target<input type="number" inputMode="decimal" min="1" value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })} placeholder="3000" /></label>
          <button className="primary" type="submit" style={{ alignSelf: 'end' }}>Add goal</button>
        </form>
        <p className="muted small-note">Goals are labels on your deposits, not separate accounts: money added “toward” a goal still sits in your one savings balance.</p>
      </Card>

      <Card title="Savings history" className="span-all">
        <TxnList txns={txns} data={data} update={update} empty="No savings activity yet. Make a deposit above." />
      </Card>
    </div>
  )
}
