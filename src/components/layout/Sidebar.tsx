import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../config/navigation'
import { Logo } from './Logo'

/** PC(≥ md) 왼쪽 사이드바 */
export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-white">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ path, label, icon: Icon, adminOnly }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                adminOnly ? 'mt-4 border-t border-slate-100 pt-4' : '',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="px-5 py-4 text-xs text-slate-400">© 스마트미디어학과</p>
    </aside>
  )
}
