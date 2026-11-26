import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/** 메뉴를 이동할 때마다 새 화면이 살짝 떠오르며 바뀜 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="animate-page">
      {children}
    </div>
  )
}
