import { NavLink } from 'react-router-dom'
import { MORE_TAB, NAV_ITEMS } from '../../config/navigation'

const TABS = [...NAV_ITEMS.filter((item) => item.mobileTab), MORE_TAB]

/** 모바일(< md) 하단 탭 메뉴 */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map(({ path, label, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
                  isActive ? 'text-brand-600' : 'text-slate-500',
                ].join(' ')
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
