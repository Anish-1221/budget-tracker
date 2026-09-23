import { useEffect, useRef, useState, useCallback } from 'react'
import { loadLocal, saveLocal, loadSettings, saveSettings, merge, findOrCreateGist, pullGist, pushGist, pushGistKeepalive } from './lib/storage.js'
import Overview from './tabs/Overview.jsx'
import Spending from './tabs/Spending.jsx'
import Savings from './tabs/Savings.jsx'
import Investments from './tabs/Investments.jsx'
import Settings from './tabs/Settings.jsx'

const TABS = [
  ['overview', 'Overview'], ['spending', 'Spending'], ['savings', 'Savings'], ['investments', 'Investments'], ['settings', 'Settings'],
]

export default function App() {
  const [data, setData] = useState(loadLocal)
  const [settings, setSettings] = useState(loadSettings)
  const [tab, setTab] = useState(() => location.hash.replace('#', '') || 'overview')
  const [sync, setSync] = useState({ state: settings.token ? 'idle' : 'off', msg: '' })
  const latest = useRef(data); latest.current = data
  const timer = useRef(null)

  useEffect(() => { location.hash = tab }, [tab])

  // update(fn) mutates a copy, stamps it, saves locally and pushes right away
  const update = useCallback(fn => {
    setData(prev => {
      const next = structuredClone(prev); fn(next); next.updatedAt = Date.now()
      saveLocal(next); latest.current = next
      schedulePush(next)
      return next
    })
  }, [settings.token, settings.gistId])

  function schedulePush(d) {
    const { token, gistId } = loadSettings()
    if (!token || !gistId) return
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSync({ state: 'syncing', msg: '' })
      try { await pushGist(token, gistId, latest.current); setSync({ state: 'ok', msg: 'Synced ' + new Date().toLocaleTimeString([], { timeStyle: 'short' }) }) }
      catch (e) { setSync({ state: 'error', msg: e.message }) }
    }, 250)
  }

  // Flush a pending push if the app is backgrounded before the timer fires
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && timer.current) {
        clearTimeout(timer.current); timer.current = null
        const { token, gistId } = loadSettings()
        if (token && gistId) pushGistKeepalive(token, gistId, latest.current)
      }
    }
    document.addEventListener('visibilitychange', flush); window.addEventListener('pagehide', flush)
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush) }
  }, [])

  // Pull on load / when connected
  const pull = useCallback(async () => {
    const { token, gistId } = loadSettings()
    if (!token || !gistId) return
    setSync({ state: 'syncing', msg: '' })
    try {
      const remote = await pullGist(token, gistId)
      const merged = merge(latest.current, remote)
      saveLocal(merged); setData(merged); latest.current = merged
      if (JSON.stringify(merged) !== JSON.stringify(remote)) await pushGist(token, gistId, merged)
      setSync({ state: 'ok', msg: 'Synced ' + new Date().toLocaleTimeString([], { timeStyle: 'short' }) })
    } catch (e) { setSync({ state: 'error', msg: e.message }) }
  }, [])
  useEffect(() => { pull() }, [pull])
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') pull() }
    document.addEventListener('visibilitychange', onVis); return () => document.removeEventListener('visibilitychange', onVis)
  }, [pull])

  async function connect(token) {
    setSync({ state: 'syncing', msg: 'Connecting' })
    try {
      const gistId = await findOrCreateGist(token.trim())
      const s = { ...settings, token: token.trim(), gistId }; saveSettings(s); setSettings(s)
      await pull()
    } catch (e) { setSync({ state: 'error', msg: e.message }) }
  }
  function disconnect() { const s = { ...settings }; delete s.token; delete s.gistId; saveSettings(s); setSettings(s); setSync({ state: 'off', msg: '' }) }

  const props = { data, update, settings, setSettings: s => { saveSettings(s); setSettings(s) }, sync, connect, disconnect, pull, setTab }

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /> Ledger</div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <div className={`sync ${sync.state}`} title={sync.msg}>
          <span className="dot" />{sync.state === 'off' ? 'Local only' : sync.state === 'syncing' ? 'Syncing' : sync.state === 'error' ? 'Sync failed' : 'Synced'}
        </div>
      </header>
      <main>
        {tab === 'overview' && <Overview {...props} />}
        {tab === 'spending' && <Spending {...props} />}
        {tab === 'savings' && <Savings {...props} />}
        {tab === 'investments' && <Investments {...props} />}
        {tab === 'settings' && <Settings {...props} />}
      </main>
      <nav className="bottom" aria-label="Sections">
        {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
    </div>
  )
}
