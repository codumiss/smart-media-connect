import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../config/navigation'
import { useAdminAlerts } from '../../lib/adminAlerts'
import { useAuth } from '../../lib/auth'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'
import { UserBadge } from './UserBadge'

/** PC(≥ md) 왼쪽 사이드바 — 테두리 없이 바탕색으로 구분, 선택된 메뉴는 흰 카드 */
export function Sidebar() {
  const { isAdmin } = useAuth()
  const { pendingCount } = useAdminAlerts()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:px-4 md:py-6">
      <div className="flex items-center justify-between px-2 pb-6">
        <Logo />
        <NotificationBell placement="sidebar" />
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(({ path, label, icon: Icon, adminOnly, comingSoon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] transition-all duration-200 active:scale-[0.98]',
                adminOnly ? 'mt-4' : '',
                isActive
                  ? 'bg-white font-bold text-brand-600 shadow-[0_1px_2px_rgb(0_0_0/0.04)]'
                  : 'font-semibold text-slate-600 hover:bg-white/60 hover:text-ink',
              ].join(' ')
            }
          >
            <Icon className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
            <span className="flex-1">{label}</span>
            {comingSoon && <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] font-semibold text-sub">준비 중</span>}
            {adminOnly && pendingCount > 0 && (
              <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 pt-4">
        <UserBadge />
        <p className="px-2 text-xs text-slate-400">© 스마트미디어학과</p>
      </div>
    </aside>
  )
}
