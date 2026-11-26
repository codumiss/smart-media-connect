import type { NavItem } from '../config/navigation'

/** 기능 구현 전 각 메뉴의 임시 화면 */
export function PlaceholderPage({ item }: { item: NavItem }) {
  const Icon = item.icon

  return (
    <section>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold md:text-2xl">{item.label}</h1>
          <p className="text-sm text-slate-500">{item.description}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-5 md:p-6">
        <h2 className="font-semibold">기획서상 기능 후보</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.plannedFeatures.map((feature, i) => (
            <li
              key={feature}
              className="animate-rise rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
              style={{ animationDelay: `${120 + i * 50}ms` }}
            >
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-400">구현 범위는 확정 전입니다.</p>
      </div>
    </section>
  )
}
