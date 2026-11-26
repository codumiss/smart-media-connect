import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export function FullScreenLoading() {
  return (
    <div className="grid h-full place-items-center">
      <span className="size-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
    </div>
  )
}

/** 로그인한 학과 구성원만 볼 수 있는 화면 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth()
  const location = useLocation()

  if (!ready) return <FullScreenLoading />
  if (!session) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />
  return children
}

/** 관리자만 볼 수 있는 화면. 일반 회원은 홈으로 보냄 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { ready, session, isAdmin } = useAuth()
  const location = useLocation()

  if (!ready) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

/**
 * 로그인·회원가입 화면용.
 * 로그인에 성공하면 관리자는 관리자 화면으로, 일반 회원은 원래 가려던 화면(없으면 홈)으로 이동
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { ready, session, isAdmin } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  if (!ready) return <FullScreenLoading />
  if (session) return <Navigate to={isAdmin ? '/admin' : (from ?? '/')} replace />
  return children
}
