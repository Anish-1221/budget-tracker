import { useState } from 'react'
import { Card, ConfirmButton, Money } from '../components/ui.jsx'
import { BUCKETS, BUCKET_BY_ID, ACCOUNTS } from '../data/categories.js'
import { uid, fmt, balances } from '../lib/calc.js'
import { emptyData, merge } from '../lib/storage.js'

export default function Settings({ data, update, settings, sync, connect, disconnect, pull }) {
  const [token, setToken] = useState('')
  const [rule, setRule] = useState({ name: '', amount: '', type: 'expense', bucket: 'housing', account: 'checking', to: 'savings', day: 1 })
  const [kw, setKw] = useState({ word: '', bucket: 'groceries' })
  const bal = balances(data)
  const rules = Object.values(data.recurring).filter(r => !r.deleted)
  const learned = Object.entries(data.learned).sort()

  function setOpening(id, v) { update(d => { d.opening[id] = Number(v) || 0; d.meta.openingUpdatedAt = Date.now() }) }
  function setLimit(id, v) { update(d => { if (Number(v) > 0) d.limits[id] = Number(v); else delete d.limits[id]; d.meta.limitsUpdatedAt = Date.now() }) }
  function addRule(e) {
    e.preventDefault(); const a = Number(rule.amount); if (!rule.name.trim() || !a) return
    update(d => { const id = uid(); d.recurring[id] = { ...rule, id, name: rule.name.trim(), amount: a, day: Number(rule.day) || 1, active: true, updatedAt: Date.now() } })
    setRule({ ...rule, name: '', amount: '' })
  }
  function addKw(e) { e.preventDefault(); const w = kw.word.trim().toLowerCase(); if (!w) return; update(d => { d.learned[w] = kw.bucket; d.meta.learnedUpdatedAt = Date.now() }); setKw({ ...kw, word: '' }) }

  function download() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  function restore(e) {
    const f = e.target.files[0]; if (!f) return
    f.text().then(txt => { const inc = JSON.parse(txt); update(d => { const m = merge(d, { ...emptyData(), ...inc }); Object.assign(d, m) }) }).catch(() => alert('That file could not be read as a backup.'))
    e.target.value = ''
  }

  return (
    <div className="grid">
      <Card title="Cloud sync" className="span-all">
        {settings.token ? (
          <div className="row between">
            <p className="muted">Connected to a private Gist. Phone and laptop share the same ledger. {sync.msg && <>{sync.msg}.</>}</p>
            <div className="row"><button className="ghost" onClick={pull}>Sync now</button><ConfirmButton onConfirm={disconnect} children="Disconnect" /></div>
          </div>
        ) : (
          <form className="txn-form" onSubmit={e => { e.preventDefault(); if (token.trim()) connect(token) }}>
            <div className="row">
              <label className="grow">GitHub token (gist scope only)<input value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_..." autoComplete="off" /></label>
              <button className="primary" style={{ alignSelf: 'end' }} type="submit">Connect</button>
            </div>
            <p className="muted small-note" style={{ margin: 0 }}>GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → tick only <b>gist</b>. The token stays in this browser. {sync.state === 'error' && <span className="warn">{sync.msg}</span>}</p>
          </form>
        )}
      </Card>

      <Card title="Opening balances" className="span-1">
        <p className="muted small-note">What each account held before your first entry. Current balance = opening + everything logged.</p>
        {ACCOUNTS.map(a => (
          <label key={a.id} className="block row between">
            <span><i className="swatch" style={{ background: a.color }} />{a.label}{a.liability ? ' (owed)' : ''}</span>
            <span className="row"><input type="number" inputMode="decimal" step="0.01" defaultValue={data.opening[a.id] || ''} placeholder="0" onBlur={e => setOpening(a.id, e.target.value)} style={{ width: 120 }} /><small className="muted">now {fmt(bal[a.id])}</small></span>
          </label>
        ))}
      </Card>

      <Card title="Monthly bucket limits" className="span-2">
        <p className="muted small-note">Leave blank for no limit. Progress shows on the Overview.</p>
        <div className="limit-grid">
          {BUCKETS.map(b => (
            <label key={b.id}><span><i className="swatch" style={{ background: b.color }} />{b.label}</span>
              <input type="number" inputMode="decimal" min="0" defaultValue={data.limits[b.id] || ''} placeholder="—" onBlur={e => setLimit(b.id, e.target.value)} /></label>
          ))}
        </div>
      </Card>

      <Card title="Recurring bills" className="span-all">
        <p className="muted small-note">Rent, insurance, donation, subscriptions, a monthly savings deposit. Each month the Overview lists the ones not logged yet and you add them with one tap, so a changed amount can be edited before it lands.</p>
        {rules.length > 0 && (
          <ul className="due-list">
            {rules.map(r => <li key={r.id}><span>{r.name}</span><span className="muted">{r.type === 'transfer' ? `→ ${r.to}` : r.type === 'income' ? 'income' : BUCKET_BY_ID[r.bucket]?.label} · {r.account} · day {r.day}</span><Money v={r.amount} /><ConfirmButton onConfirm={() => update(d => { d.recurring[r.id].deleted = true; d.recurring[r.id].updatedAt = Date.now() })} children="Remove" /></li>)}
          </ul>
        )}
        <form className="row wrap" onSubmit={addRule}>
          <label className="grow">Name<input value={rule.name} onChange={e => setRule({ ...rule, name: e.target.value })} placeholder="Rent" /></label>
          <label className="amt">Amount<input type="number" inputMode="decimal" step="0.01" value={rule.amount} onChange={e => setRule({ ...rule, amount: e.target.value })} /></label>
          <label>Type<select value={rule.type} onChange={e => setRule({ ...rule, type: e.target.value })}><option value="expense">Expense</option><option value="transfer">Transfer</option><option value="income">Income</option></select></label>
          {rule.type === 'expense' && <label>Bucket<select value={rule.bucket} onChange={e => setRule({ ...rule, bucket: e.target.value })}>{BUCKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label>}
          {rule.type !== 'income' && <label>{rule.type === 'transfer' ? 'From' : 'Paid with'}<select value={rule.account} onChange={e => setRule({ ...rule, account: e.target.value })}>{ACCOUNTS.filter(a => rule.type === 'transfer' || a.id !== 'investments').map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>}
          {rule.type === 'transfer' && <label>To<select value={rule.to} onChange={e => setRule({ ...rule, to: e.target.value })}>{ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>}
          <label>Day<input type="number" min="1" max="31" value={rule.day} onChange={e => setRule({ ...rule, day: e.target.value })} style={{ width: 70 }} /></label>
          <button className="primary" type="submit" style={{ alignSelf: 'end' }}>Add rule</button>
        </form>
      </Card>

      <Card title="Learned keywords" className="span-all">
        <p className="muted small-note">Whenever you pick a bucket the app did not guess, the name is remembered here and wins next time. Add your own too: a store name, a friend's name for money you send them, anything.</p>
        {learned.length > 0 && (
          <ul className="kw-list">
            {learned.map(([w, b]) => <li key={w}><span>{w}</span><span className="chip"><i style={{ background: BUCKET_BY_ID[b]?.color }} />{BUCKET_BY_ID[b]?.label}</span><button className="ghost danger" onClick={() => update(d => { delete d.learned[w]; d.meta.learnedUpdatedAt = Date.now() })}>×</button></li>)}
          </ul>
        )}
        <form className="row" onSubmit={addKw}>
          <label className="grow">Word or phrase<input value={kw.word} onChange={e => setKw({ ...kw, word: e.target.value })} placeholder="heb, akshaya patra, venmo mom" /></label>
          <label>Bucket<select value={kw.bucket} onChange={e => setKw({ ...kw, bucket: e.target.value })}>{BUCKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
          <button className="primary" type="submit" style={{ alignSelf: 'end' }}>Remember</button>
        </form>
      </Card>

      <Card title="Backup" className="span-all">
        <div className="row">
          <button className="ghost" onClick={download}>Download backup</button>
          <label className="ghost btn-like">Restore from file<input type="file" accept="application/json" onChange={restore} hidden /></label>
          <p className="muted small-note">Restore merges the file with what is here (newer entry wins), so it is safe to use on a device that already has data.</p>
        </div>
      </Card>
    </div>
  )
}
