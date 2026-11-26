import { NavLink } from 'react-router-dom'
import { MORE_TAB, NAV_ITEMS } from '../../config/navigation'

const TABS = [...NAV_ITEMS.filter((item) => item.mobileTab), MORE_TAB]

/** 모바일(< md) 하단 탭 메뉴 — 선택한 탭의 아이콘 배경이 커지며 표시됨 */
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
                  'flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors active:scale-95',
                  isActive ? 'text-brand-600' : 'text-slate-500',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'grid h-7 w-12 place-items-center rounded-full transition-all duration-300',
                      isActive ? 'scale-100 bg-brand-50' : 'scale-75 bg-transparent',
                    ].join(' ')}
                  >
                    <Icon className={['size-5 transition-transform duration-300', isActive ? 'scale-110' : 'scale-125'].join(' ')} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
