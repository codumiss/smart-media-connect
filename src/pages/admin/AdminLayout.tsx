import { ArrowLeft, Flag, LayoutDashboard, Megaphone, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogoBadge } from '../../components/brand/Logo'
import { UserBadge } from '../../components/layout/UserBadge'
import { PageTransition } from '../../components/motion/PageTransition'
import { useAdminAlerts } from '../../lib/adminAlerts'

type AdminNavItem = { path: string; label: string; icon: LucideIcon; badge?: 'reports' }

const ADMIN_NAV: AdminNavItem[] = [
  { path: '/admin', label: '대시보드', icon: LayoutDashboard },
  { path: '/admin/reports', label: '신고 관리', icon: Flag, badge: 'reports' },
  { path: '/admin/members', label: '회원 관리', icon: Users },
  { path: '/admin/notices', label: '공지·일정 관리', icon: Megaphone },
]

/** 관리자 전용 화면 틀 (일반 서비스 화면과 분리) — RequireAdmin 으로 감싸서 사용 */
export default function AdminLayout() {
  const { pendingCount } = useAdminAlerts()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
    ].join(' ')

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* PC 사이드바 */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:bg-slate-900">
        <div className="flex items-center gap-2 px-5 py-5 text-white">
          <LogoBadge className="size-9 ring-1 ring-white/20" />
          <span className="text-sm font-bold leading-tight">
            SM CONNECT
            <br />
            관리자
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {ADMIN_NAV.map(({ path, label, icon: Icon, badge }) => (
            <NavLink key={path} to={path} end={path === '/admin'} className={navLinkClass}>
              <Icon className="size-5" />
              <span className="flex-1">{label}</span>
              {badge === 'reports' && pendingCount > 0 && (
                <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 px-3 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            서비스 화면으로
          </Link>
          <UserBadge />
        </div>
      </aside>

      {/* 모바일 상단 바 + 탭 */}
      <header className="sticky top-0 z-10 bg-slate-900 text-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-1 text-sm text-slate-300">
            <ArrowLeft className="size-4" />
            서비스
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <ShieldCheck className="size-4" />
            관리자
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {ADMIN_NAV.map(({ path, label, badge }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/admin'}
              className={({ isActive }) =>
                [
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  isActive ? 'bg-white text-slate-900' : 'text-slate-300',
                ].join(' ')
              }
            >
              {label}
              {badge === 'reports' && pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{pendingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto bg-tile px-4 py-5 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
