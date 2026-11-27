import { Mascot } from '../../components/ui'
import { findNavItem } from '../../config/navigation'

/** 공모전 정보는 확장 계획 — 이번 출품에서는 '준비 중' 화면만 둠 */
export default function ContestPage() {
  const item = findNavItem('/contest')!
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

      <div className="mt-6 rounded-card bg-white p-6 text-center md:p-10">
        <Mascot className="mx-auto w-36" />
        <h2 className="mt-4 text-lg font-semibold">준비 중이에요</h2>
        <p className="mt-1 text-sm text-slate-500">공모전·대외활동 정보는 다음 업데이트에서 제공할 예정이에요.</p>

        <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left sm:grid-cols-2">
          {item.plannedFeatures.map((feature) => (
            <li key={feature} className="rounded-xl bg-tile px-3 py-2 text-sm text-slate-600">
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
