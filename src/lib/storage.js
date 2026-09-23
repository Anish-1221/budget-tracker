const DATA_KEY = 'budget-tracker:data'
const SETTINGS_KEY = 'budget-tracker:settings'
const GIST_DESC = 'Budget Tracker data'
const GIST_FILE = 'budget-tracker-data.json'

export const emptyData = () => ({
  version: 1, updatedAt: 0,
  txns: {},        // id -> txn
  recurring: {},   // id -> rule
  goals: {},       // id -> goal
  limits: {},      // bucket -> monthly limit
  learned: {},     // keyword -> bucket
  opening: { checking: 0, savings: 0, investments: 0, credit: 0 },
  meta: { openingUpdatedAt: 0, limitsUpdatedAt: 0, learnedUpdatedAt: 0 },
})

export function loadLocal() {
  try { const d = JSON.parse(localStorage.getItem(DATA_KEY)); return d ? { ...emptyData(), ...d, meta: { ...emptyData().meta, ...(d.meta || {}) } } : emptyData() } catch { return emptyData() }
}
export function saveLocal(d) { localStorage.setItem(DATA_KEY, JSON.stringify(d)) }
export function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {} } catch { return {} } }
export function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) }

// Per-entry merge: for each keyed collection keep the entry with the newer updatedAt (tombstones included).
// Whole-object fields (opening, limits, learned) use their own timestamps in meta.
export function merge(a, b) {
  const out = emptyData()
  for (const coll of ['txns', 'recurring', 'goals']) {
    const ids = new Set([...Object.keys(a[coll] || {}), ...Object.keys(b[coll] || {})])
    for (const id of ids) {
      const x = a[coll]?.[id], y = b[coll]?.[id]
      out[coll][id] = !x ? y : !y ? x : (y.updatedAt || 0) > (x.updatedAt || 0) ? y : x
    }
  }
  const pick = (field, stamp) => {
    const ta = a.meta?.[stamp] || 0, tb = b.meta?.[stamp] || 0
    out[field] = tb > ta ? b[field] : a[field]; out.meta[stamp] = Math.max(ta, tb)
  }
  pick('opening', 'openingUpdatedAt'); pick('limits', 'limitsUpdatedAt')
  // learned keywords: union, newer wins on conflict is overkill; union with b overriding only if newer overall
  out.learned = (b.meta?.learnedUpdatedAt || 0) > (a.meta?.learnedUpdatedAt || 0) ? { ...a.learned, ...b.learned } : { ...b.learned, ...a.learned }
  out.meta.learnedUpdatedAt = Math.max(a.meta?.learnedUpdatedAt || 0, b.meta?.learnedUpdatedAt || 0)
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0)
  return out
}

// ---------- Gist ----------
const api = async (token, path, opts = {}) => {
  const r = await fetch('https://api.github.com' + path, { ...opts, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', ...(opts.headers || {}) } })
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 120)}`)
  return r.status === 204 ? null : r.json()
}
export async function findOrCreateGist(token) {
  const list = await api(token, '/gists?per_page=100')
  const hit = list.find(g => g.description === GIST_DESC && g.files[GIST_FILE])
  if (hit) return hit.id
  const g = await api(token, '/gists', { method: 'POST', body: JSON.stringify({ description: GIST_DESC, public: false, files: { [GIST_FILE]: { content: JSON.stringify(emptyData()) } } }) })
  return g.id
}
export async function pullGist(token, id) {
  const g = await api(token, `/gists/${id}`)
  const f = g.files[GIST_FILE]
  let text = f.content
  if (f.truncated) text = await (await fetch(f.raw_url)).text()
  try { return { ...emptyData(), ...JSON.parse(text) } } catch { return emptyData() }
}
export async function pushGist(token, id, data) {
  await api(token, `/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(data) } } }) })
}
// Best-effort push when the page is being hidden (phone pocketed right after saving)
export function pushGistKeepalive(token, id, data) {
  try {
    fetch(`https://api.github.com/gists/${id}`, { method: 'PATCH', keepalive: true, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(data) } } }) })
  } catch { /* ignore */ }
}
