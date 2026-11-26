import { Outlet } from 'react-router-dom'
import { PageTransition } from '../motion/PageTransition'
import { BottomNav } from './BottomNav'
import { Logo } from './Logo'
import { Sidebar } from './Sidebar'
import { UserBadge } from './UserBadge'

export function AppLayout() {
  return (
    <div className="flex h-full">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 상단 바 */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <UserBadge compact />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-5 pb-24 md:px-10 md:py-8">
          <div className="mx-auto max-w-5xl">
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
