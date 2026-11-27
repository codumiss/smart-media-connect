import { Outlet } from 'react-router-dom'
import { PageTransition } from '../motion/PageTransition'
import { BottomNav } from './BottomNav'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'
import { Sidebar } from './Sidebar'
import { UserBadge } from './UserBadge'

export function AppLayout() {
  return (
    <div className="flex h-full bg-canvas">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 상단 바 (반투명) */}
        <header className="sticky top-0 z-10 flex items-center justify-between bg-canvas px-4 py-3 supports-[backdrop-filter]:bg-canvas/85 supports-[backdrop-filter]:backdrop-blur-xl md:hidden">
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            <NotificationBell placement="header" />
            <UserBadge compact />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-32 md:px-9 md:pt-8 md:pb-10 md:pl-3">
          <div className="mx-auto max-w-6xl">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
