import { NavLink } from 'react-router-dom'
import { MORE_TAB, NAV_ITEMS } from '../../config/navigation'

const TABS = [...NAV_ITEMS.filter((item) => item.mobileTab), MORE_TAB]

/**
 * 모바일(< md) 하단 탭 메뉴
 * 화면 아래에 떠 있는 둥근 바. 반투명 효과는 여기에만 쓰고(본문 가독성 보호), 지원 안 되는 브라우저는 불투명 배경
 */
export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20 rounded-[26px] bg-white shadow-float supports-[backdrop-filter]:bg-white/85 supports-[backdrop-filter]:backdrop-blur-xl md:hidden"
      aria-label="주요 메뉴"
    >
      <ul className="grid grid-cols-5 px-1.5 py-2">
        {TABS.map(({ path, label, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 text-[11px] transition-colors active:scale-95',
                  isActive ? 'font-extrabold text-brand-600' : 'font-semibold text-slate-500',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'grid h-8 w-13 place-items-center rounded-full transition-all duration-300',
                      isActive ? 'bg-brand-50' : 'bg-transparent',
                    ].join(' ')}
                  >
                    <Icon className={['size-[22px] transition-transform duration-300', isActive ? 'scale-105' : ''].join(' ')} />
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
