import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NAV_ITEMS } from '../config/navigation'

/** 모바일 '더보기' 탭: 하단 메뉴에 없는 메뉴 모음 */
export default function MorePage() {
  const items = NAV_ITEMS.filter((item) => !item.mobileTab)

  return (
    <section>
      <h1 className="text-xl font-bold">더보기</h1>
      <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {items.map(({ path, label, icon: Icon, description }) => (
          <li key={path}>
            <Link to={path} className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50">
              <Icon className="size-5 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-slate-500">{description}</p>
              </div>
              <ChevronRight className="size-4 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
