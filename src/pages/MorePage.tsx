import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { UserBadge } from '../components/layout/UserBadge'
import { NAV_ITEMS } from '../config/navigation'
import { useAdminAlerts } from '../lib/adminAlerts'
import { useAuth } from '../lib/auth'

/** 모바일 '더보기' 탭: 하단 메뉴에 없는 메뉴 모음 + 내 계정 */
export default function MorePage() {
  const { isAdmin } = useAuth()
  const { pendingCount } = useAdminAlerts()
  const items = NAV_ITEMS.filter((item) => !item.mobileTab && (!item.adminOnly || isAdmin))

  return (
    <section>
      <h1 className="text-xl font-bold">더보기</h1>

      <div className="mt-4">
        <UserBadge />
      </div>

      <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {items.map(({ path, label, icon: Icon, description, adminOnly, comingSoon }) => (
          <li key={path}>
            <Link to={path} className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50">
              <Icon className="size-5 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {label}
                  {comingSoon && <span className="ml-2 text-xs font-normal text-slate-400">준비 중</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{description}</p>
              </div>
              {adminOnly && pendingCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
              <ChevronRight className="size-4 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
