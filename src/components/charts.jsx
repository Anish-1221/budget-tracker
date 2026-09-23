import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart, CartesianGrid, Legend, ReferenceLine } from 'recharts'
import { BUCKETS, BUCKET_BY_ID } from '../data/categories.js'
import { fmt } from '../lib/calc.js'

const axis = { stroke: 'var(--muted)', fontSize: 11, tickLine: false, axisLine: false }
const tipStyle = { contentStyle: { background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12, color: 'var(--text)' }, itemStyle: { color: 'var(--text)' }, labelStyle: { color: 'var(--muted)' }, cursor: { fill: 'rgba(255,255,255,0.04)' } }
const money = v => fmt(v)

export function BucketBars({ rows, labelFn, height = 240 }) {
  const used = BUCKETS.filter(b => rows.some(r => r[b.id] > 0))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="key" tickFormatter={labelFn} {...axis} />
        <YAxis tickFormatter={money} {...axis} width={62} />
        <Tooltip {...tipStyle} formatter={(v, n) => [fmt(v, { cents: true }), BUCKET_BY_ID[n]?.label || n]} labelFormatter={labelFn} />
        {used.map(b => <Bar isAnimationActive={false} key={b.id} dataKey={b.id} stackId="s" fill={b.color} radius={[0, 0, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BucketDonut({ byBucket, total, height = 220 }) {
  const items = BUCKETS.map(b => ({ id: b.id, name: b.label, value: byBucket[b.id] || 0, color: b.color })).filter(x => x.value > 0).sort((a, b) => b.value - a.value)
  if (!items.length) return <p className="empty">No expenses this month yet.</p>
  return (
    <div className="donut">
      <div style={{ position: 'relative', width: height, height, flex: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false} data={items} dataKey="value" innerRadius="66%" outerRadius="92%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
              {items.map(x => <Cell key={x.id} fill={x.color} />)}
            </Pie>
            <Tooltip {...tipStyle} formatter={v => fmt(v, { cents: true })} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center"><span className="num big">{fmt(total)}</span><span>spent</span></div>
      </div>
      <ul className="legend">
        {items.map(x => <li key={x.id}><i style={{ background: x.color }} /><span>{x.name}</span><b className="num">{fmt(x.value)}</b><em>{Math.round(100 * x.value / total)}%</em></li>)}
      </ul>
    </div>
  )
}

export function IncomeVsSpend({ rows, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis tickFormatter={money} {...axis} width={62} />
        <Tooltip {...tipStyle} formatter={v => fmt(v, { cents: true })} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="income" name="Income" stroke="#4FD1C5" strokeWidth={2} dot={{ r: 3 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="spent" name="Spent" stroke="#F07A7A" strokeWidth={2} dot={{ r: 3 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="saved" name="Saved + invested" stroke="#B39DFF" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function NetWorthChart({ rows, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4FD1C5" stopOpacity={0.35} /><stop offset="100%" stopColor="#4FD1C5" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis tickFormatter={money} {...axis} width={62} />
        <Tooltip {...tipStyle} formatter={v => fmt(v, { cents: true })} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke="var(--line)" />
        <Area isAnimationActive={false} type="monotone" dataKey="netWorth" name="Net worth" stroke="#4FD1C5" strokeWidth={2} fill="url(#nw)" />
        <Line isAnimationActive={false} type="monotone" dataKey="savings" name="Savings" stroke="#7ED9A1" strokeWidth={1.5} dot={false} />
        <Line isAnimationActive={false} type="monotone" dataKey="investments" name="Investments" stroke="#B39DFF" strokeWidth={1.5} dot={false} />
        <Line isAnimationActive={false} type="monotone" dataKey="credit" name="Card owed" stroke="#F4B860" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function BalanceLine({ rows, color, name, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <defs><linearGradient id={`g-${name}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis tickFormatter={money} {...axis} width={62} />
        <Tooltip {...tipStyle} formatter={v => fmt(v, { cents: true })} />
        <Area isAnimationActive={false} type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} fill={`url(#g-${name})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
