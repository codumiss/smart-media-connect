import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../config/navigation'
import { useAdminAlerts } from '../../lib/adminAlerts'
import { useAuth } from '../../lib/auth'
import { Logo } from './Logo'
import { UserBadge } from './UserBadge'

/** PC(≥ md) 왼쪽 사이드바 */
export function Sidebar() {
  const { isAdmin } = useAuth()
  const { pendingCount } = useAdminAlerts()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-white">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ path, label, icon: Icon, adminOnly, comingSoon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                adminOnly ? 'mt-4 border-t border-slate-100 pt-4' : '',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
            <span className="flex-1">{label}</span>
            {comingSoon && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">준비 중</span>}
            {adminOnly && pendingCount > 0 && (
              <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 px-3 py-4">
        <UserBadge />
        <p className="px-2 text-xs text-slate-400">© 스마트미디어학과</p>
      </div>
    </aside>
  )
}
