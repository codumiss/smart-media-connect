import { Bell, Flag, NotebookText, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAlerts } from '../../lib/adminAlerts'
import { db } from '../../lib/supabase'

export default function AdminHomePage() {
  const { pendingCount } = useAdminAlerts()
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [postCount, setPostCount] = useState<number | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  )

  useEffect(() => {
    const client = db()
    void client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setMemberCount(count ?? 0))
    void client
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setPostCount(count ?? 0))
  }, [])

  async function enableBrowserNotification() {
    if (!('Notification' in window)) return
    setPermission(await Notification.requestPermission())
  }

  const cards = [
    { label: '처리 대기 신고', value: pendingCount, icon: Flag, to: '/admin/reports', alert: pendingCount > 0 },
    { label: '전체 회원', value: memberCount, icon: Users, to: '/admin/members', alert: false },
    { label: '정보방 게시글', value: postCount, icon: NotebookText, to: '/community', alert: false },
  ]

  return (
    <section>
      <h1 className="text-xl font-bold md:text-2xl">관리자 대시보드</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, to, alert }) => (
          <Link
            key={label}
            to={to}
            className={[
              'rounded-2xl border bg-white p-5 transition-shadow hover:shadow-sm',
              alert ? 'border-red-200' : 'border-slate-200',
            ].join(' ')}
          >
            <Icon className={alert ? 'size-5 text-red-500' : 'size-5 text-slate-400'} />
            <p className="mt-3 text-sm text-slate-500">{label}</p>
            <p className={['mt-1 text-2xl font-bold', alert ? 'text-red-600' : ''].join(' ')}>{value ?? '–'}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <Bell className="size-5 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">신고 알림</p>
          <p className="text-sm text-slate-500">
            신고가 들어오면 화면 오른쪽 위에 바로 표시돼요. 브라우저 알림을 켜면 다른 탭을 보고 있을 때도 알려줘요.
          </p>
        </div>
        {permission === 'granted' ? (
          <span className="text-sm font-medium text-emerald-600">브라우저 알림 켜짐</span>
        ) : permission === 'denied' ? (
          <span className="text-sm text-slate-500">브라우저 설정에서 알림이 차단돼 있어요</span>
        ) : permission === 'unsupported' ? (
          <span className="text-sm text-slate-500">이 브라우저는 알림을 지원하지 않아요</span>
        ) : (
          <button
            type="button"
            onClick={enableBrowserNotification}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            브라우저 알림 켜기
          </button>
        )}
      </div>
    </section>
  )
}
