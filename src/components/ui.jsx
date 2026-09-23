import { useEffect, useMemo, useState } from 'react'
import { BUCKETS, BUCKET_BY_ID, ACCOUNTS, ACCOUNT_BY_ID } from '../data/categories.js'
import { categorize, uid, today, fmtC, monthLabel, shiftMonth } from '../lib/calc.js'

export function Card({ title, aside, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && <div className="card-head"><h2>{title}</h2>{aside}</div>}
      {children}
    </section>
  )
}

export function MonthPicker({ value, onChange }) {
  return (
    <div className="monthpick">
      <button aria-label="Previous month" onClick={() => onChange(shiftMonth(value, -1))}>‹</button>
      <span>{monthLabel(value).replace(/ (\d\d)$/, ' 20$1')}</span>
      <button aria-label="Next month" onClick={() => onChange(shiftMonth(value, 1))}>›</button>
    </div>
  )
}

export function Money({ v, cents = true, sign = false, className = '' }) {
  const s = cents ? fmtC(v) : fmtC(v).replace(/\.00$/, '')
  return <span className={`num ${className}`}>{sign && v > 0 ? '+' : ''}{s}</span>
}

export function BucketChip({ id }) {
  const b = BUCKET_BY_ID[id] || BUCKET_BY_ID.other
  return <span className="chip"><i style={{ background: b.color }} />{b.label}</span>
}

export function ConfirmButton({ onConfirm, children = 'Delete', className = 'ghost danger' }) {
  const [arm, setArm] = useState(false)
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 2500); return () => clearTimeout(t) }, [arm])
  return <button className={className} onClick={() => arm ? onConfirm() : setArm(true)}>{arm ? 'Sure?' : children}</button>
}

// One form for expenses, income and transfers. `edit` = existing txn to edit.
export function TxnForm({ data, update, initialType = 'expense', edit = null, onDone, lockType = false, defaults = {} }) {
  const [type, setType] = useState(edit?.type || initialType)
  const [name, setName] = useState(edit?.name || defaults.name || '')
  const [amount, setAmount] = useState(edit?.amount ?? defaults.amount ?? '')
  const [date, setDate] = useState(edit?.date || today())
  const [bucket, setBucket] = useState(edit?.bucket || defaults.bucket || '')
  const [account, setAccount] = useState(edit?.account || defaults.account || 'credit')
  const [from, setFrom] = useState(edit?.from || defaults.from || 'checking')
  const [to, setTo] = useState(edit?.to || defaults.to || 'savings')
  const [note, setNote] = useState(edit?.note || '')
  const [touched, setTouched] = useState(!!edit)
  const [saved, setSaved] = useState(false)

  const guess = useMemo(() => type === 'expense' ? categorize(name, data.learned) : null, [name, type, data.learned])
  useEffect(() => { if (type === 'expense' && !touched && guess) setBucket(guess.bucket) }, [guess, touched, type])
  useEffect(() => { if (type === 'expense' && !touched && !guess && !edit) setBucket('') }, [guess, touched, type, edit])

  function submit(e) {
    e.preventDefault()
    const amt = Math.round(Number(amount) * 100) / 100
    if (!amt || amt <= 0) return
    const t = { id: edit?.id || uid(), type, amount: amt, name: name.trim() || (type === 'transfer' ? `${ACCOUNT_BY_ID[from].label} → ${ACCOUNT_BY_ID[to].label}` : 'Income'), date, note: note.trim(), updatedAt: Date.now() }
    if (type === 'expense') { t.bucket = bucket || 'other'; t.account = account }
    if (type === 'income') { t.to = to === 'credit' ? 'checking' : to }
    if (type === 'transfer') { if (from === to) return; t.from = from; t.to = to }
    if (edit?.recurringId) t.recurringId = edit.recurringId
    if (edit?.goalId || defaults.goalId) t.goalId = edit?.goalId || defaults.goalId
    update(d => {
      d.txns[t.id] = t
      // learn: if the chosen bucket differs from the guess (or there was no guess), remember the name
      if (type === 'expense' && name.trim()) {
        const key = name.trim().toLowerCase()
        if (!guess || guess.bucket !== t.bucket) { d.learned[key] = t.bucket; d.meta.learnedUpdatedAt = Date.now() }
      }
    })
    if (onDone) onDone(t)
    else { setName(''); setAmount(''); setNote(''); setBucket(''); setTouched(false); setSaved(true); setTimeout(() => setSaved(false), 1500) }
  }

  const bucketHint = type !== 'expense' ? null : !name.trim() ? 'Type a name and the bucket fills in' : guess ? (guess.confidence === 'learned' ? `Remembered from "${guess.hit}"` : guess.confidence === 'seed' ? `Matched "${guess.hit}"` : `Best guess from "${guess.hit}"`) : 'No match yet. Pick a bucket and it will be remembered.'

  return (
    <form className="txn-form" onSubmit={submit}>
      {!lockType && (
        <div className="seg" role="tablist">
          {['expense', 'income', 'transfer'].map(t => <button type="button" key={t} className={type === t ? 'on' : ''} onClick={() => { setType(t); setTouched(false) }}>{t[0].toUpperCase() + t.slice(1)}</button>)}
        </div>
      )}
      <div className="row">
        <label className="grow">{type === 'income' ? 'Source' : type === 'transfer' ? 'Label (optional)' : 'What was it'}
          <input value={name} onChange={e => setName(e.target.value)} placeholder={type === 'expense' ? 'Gas, flour, car insurance, takeout' : type === 'income' ? 'TA stipend' : 'Monthly savings'} autoComplete="off" required={type === 'expense'} />
        </label>
        <label className="amt">Amount
          <input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        </label>
      </div>
      {type === 'expense' && (
        <div className="row">
          <label className="grow">Bucket
            <select value={bucket} onChange={e => { setBucket(e.target.value); setTouched(true) }} required>
              <option value="" disabled>Pick a bucket</option>
              {BUCKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <small className={guess ? 'hint ok' : 'hint'}>{bucketHint}</small>
          </label>
          <label>Paid with
            <select value={account} onChange={e => setAccount(e.target.value)}>
              <option value="credit">Credit card</option><option value="checking">Checking</option><option value="savings">Savings</option>
            </select>
          </label>
        </div>
      )}
      {type === 'income' && (
        <div className="row"><label>Deposit to
          <select value={to} onChange={e => setTo(e.target.value)}>{ACCOUNTS.filter(a => !a.liability).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
        </label></div>
      )}
      {type === 'transfer' && (
        <div className="row">
          <label className="grow">From<select value={from} onChange={e => setFrom(e.target.value)}>{ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <label className="grow">To<select value={to} onChange={e => setTo(e.target.value)}>{ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
        </div>
      )}
      <div className="row">
        <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
        <label className="grow">Note<input value={note} onChange={e => setNote(e.target.value)} placeholder="optional" /></label>
      </div>
      <div className="row end">
        {onDone && <button type="button" className="ghost" onClick={() => onDone(null)}>Cancel</button>}
        <button type="submit" className="primary">{edit ? 'Save changes' : saved ? 'Added' : type === 'expense' ? 'Add expense' : type === 'income' ? 'Add income' : 'Move money'}</button>
      </div>
    </form>
  )
}

export function TxnList({ txns, data, update, empty = 'Nothing here yet.' }) {
  const [editing, setEditing] = useState(null)
  const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)
  if (!sorted.length) return <p className="empty">{empty}</p>
  return (
    <ul className="txns">
      {sorted.map(t => editing === t.id ? (
        <li key={t.id} className="editing"><TxnForm data={data} update={update} edit={t} lockType onDone={() => setEditing(null)} /></li>
      ) : (
        <li key={t.id}>
          <div className="when">{new Date(t.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <div className="what">
            <div className="name">{t.name}{t.recurringId && <span className="tag">recurring</span>}</div>
            <div className="meta">
              {t.type === 'expense' && <><BucketChip id={t.bucket} /><span>{ACCOUNT_BY_ID[t.account]?.label || 'Checking'}</span></>}
              {t.type === 'income' && <span>Income → {ACCOUNT_BY_ID[t.to]?.label}</span>}
              {t.type === 'transfer' && <span>{ACCOUNT_BY_ID[t.from]?.label} → {ACCOUNT_BY_ID[t.to]?.label}{t.to === 'credit' ? ' (card payment)' : ''}</span>}
              {t.note && <span className="note">{t.note}</span>}
            </div>
          </div>
          <div className={`amt ${t.type}`}><Money v={t.type === 'expense' ? -t.amount : t.amount} sign={t.type === 'income'} /></div>
          <div className="actions">
            <button className="ghost" onClick={() => setEditing(t.id)}>Edit</button>
            <ConfirmButton onConfirm={() => update(d => { d.txns[t.id].deleted = true; d.txns[t.id].updatedAt = Date.now() })} />
          </div>
        </li>
      ))}
    </ul>
  )
}
