import { Bell } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { timeAgo } from '../../lib/format'
import { supabase } from '../../lib/supabase'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

/**
 * 알림 벨: 참여 신청, 승인 결과, 팀원 참여, (관리자) 신고 알림
 * 새 알림은 실시간으로 들어오고, 누르면 해당 화면으로 이동하며 읽음 처리
 */
export function NotificationBell({ placement }: { placement: 'sidebar' | 'header' }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const channelId = useId()
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !profile) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    setItems((data as Notification[] | null) ?? [])
  }, [profile])

  useEffect(() => {
    if (!supabase || !profile) return
    const client = supabase
    void load()
    const channel = client
      .channel(`notifications-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev].slice(0, 30)),
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [profile, load, channelId])

  // 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const unread = items.filter((n) => !n.is_read).length

  async function openItem(item: Notification) {
    setOpen(false)
    if (!item.is_read && supabase) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
      await supabase.from('notifications').update({ is_read: true }).eq('id', item.id)
    }
    if (item.link) navigate(item.link)
  }

  async function readAll() {
    if (!supabase || unread === 0) return
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label={`알림 ${unread}개`}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 grid min-w-4 animate-pop place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={[
            'fixed z-50 flex max-h-[70vh] animate-rise flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl',
            placement === 'header' ? 'inset-x-3 top-14' : 'top-4 left-[15.5rem] w-80',
          ].join(' ')}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold">알림</p>
            <button type="button" onClick={() => void readAll()} className="text-xs text-slate-500 hover:text-slate-900">
              모두 읽음
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">새 알림이 없어요.</p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${item.is_read ? 'bg-transparent' : 'bg-brand-600'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.title}</span>
                      {item.body && <span className="block truncate text-xs text-slate-500">{item.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(item.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
