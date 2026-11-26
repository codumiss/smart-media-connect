import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { REPORT_REASON_LABEL, REPORT_TARGET_LABEL, type Report } from './types'

/**
 * 관리자 신고 알림
 * - 처리 대기 중인 신고 수를 사이드바 배지로 표시
 * - 새 신고가 들어오면 화면 오른쪽 위에 알림을 띄움 (Supabase Realtime)
 * - 관리자가 브라우저 알림을 허용했다면 기기 알림도 표시
 * 일반 회원은 아무 동작도 하지 않음
 */

type AdminAlertsState = {
  pendingCount: number
  refresh: () => Promise<void>
}

type Toast = { id: string; title: string; body: string }

const AdminAlertsContext = createContext<AdminAlertsState>({
  pendingCount: 0,
  refresh: async () => {},
})

export function AdminAlertsProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])

  const refresh = useCallback(async () => {
    if (!supabase || !isAdmin) {
      setPendingCount(0)
      return
    }
    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingCount(count ?? 0)
  }, [isAdmin])

  useEffect(() => {
    if (!supabase || !isAdmin) return
    const client = supabase
    void refresh()

    const channel = client
      .channel('admin-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        void refresh()
        if (payload.eventType !== 'INSERT') return

        const report = payload.new as Report
        const title = '새 신고가 접수되었습니다'
        const body = `${REPORT_TARGET_LABEL[report.target_type]} · ${REPORT_REASON_LABEL[report.reason]}`
        setToasts((prev) => [...prev, { id: report.id, title, body }])
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== report.id)), 8000)

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, { body, icon: '/pwa-192x192.png' })
          } catch {
            // 일부 모바일 브라우저는 페이지에서 직접 알림을 만들 수 없음
          }
        }
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [isAdmin, refresh])

  return (
    <AdminAlertsContext.Provider value={{ pendingCount, refresh }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 left-4 z-50 flex flex-col items-end gap-2 md:left-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-white p-4 shadow-lg"
            >
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" />
              <Link
                to="/admin/reports"
                className="min-w-0 flex-1"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              >
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{toast.body}</p>
              </Link>
              <button
                type="button"
                aria-label="닫기"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminAlertsContext.Provider>
  )
}

export function useAdminAlerts() {
  return useContext(AdminAlertsContext)
}
