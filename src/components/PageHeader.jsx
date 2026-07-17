export function PageHeaderStats({ stats }) {
  return (
    <div className="grid grid-flow-col divide-x divide-white/15 overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
      {stats.map((stat) => (
        <div key={stat.label} className="px-5 py-3">
          <strong className="block text-xl font-semibold">{stat.value}</strong>
          <span className="text-xs text-slate-300">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="rounded-2xl bg-slate-900 px-6 py-5 text-white shadow-sm sm:px-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-xl text-sm text-slate-300">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  )
}
