import { SendHorizontal, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { formatTime } from '../../lib/format'
import { db } from '../../lib/supabase'
import { ReportButton } from '../ReportButton'
import { Avatar } from '../ui'

type Message = {
  id: string
  room_id: string
  body: string
  is_anonymous: boolean
  author_id: string | null
  anon_label: string | null
  is_hidden: boolean
  created_at: string
}

/**
 * 채팅 화면 (소통방, 1:1, 팀 채팅 공용)
 * - 새 메시지는 Supabase Realtime 으로 바로 들어옴
 * - 익명방은 이름 대신 '익명1', '익명2' 로 표시. 내 메시지는 오른쪽
 */
export function ChatRoom({ roomId, className = '' }: { roomId: string; className?: string }) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const namesRef = useRef(names)
  useEffect(() => {
    namesRef.current = names
  }, [names])

  const loadNames = useCallback(async (ids: (string | null)[]) => {
    const missing = [...new Set(ids.filter((v): v is string => !!v && !(v in namesRef.current)))]
    if (missing.length === 0) return
    const { data } = await db().from('profiles').select('id, name').in('id', missing)
    const rows = (data as { id: string; name: string }[] | null) ?? []
    setNames((prev) => ({ ...prev, ...Object.fromEntries(rows.map((r) => [r.id, r.name])) }))
  }, [])

  useEffect(() => {
    let active = true
    const client = db()

    async function load() {
      const { data, error: loadError } = await client
        .from('messages')
        .select('id, room_id, body, is_anonymous, author_id, anon_label, is_hidden, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(150)
      if (!active) return
      if (loadError) setError(toKoreanError(loadError))
      const list = ((data as Message[] | null) ?? []).reverse()
      setMessages(list)
      void loadNames(list.map((m) => m.author_id))
      if (list.length > 0) {
        const { data: own } = await client
          .from('content_authors')
          .select('target_id')
          .eq('target_type', 'message')
          .eq('author_id', profile?.id ?? '')
          .in(
            'target_id',
            list.map((m) => m.id),
          )
        if (active) setMine(new Set(((own as { target_id: string }[] | null) ?? []).map((r) => r.target_id)))
      }
    }
    void load()

    const channel = client
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as Message
          setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
          void loadNames([message.author_id])
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const oldId = (payload.old as { id?: string }).id
        if (oldId) setMessages((prev) => prev.filter((m) => m.id !== oldId))
      })
      .subscribe()

    return () => {
      active = false
      void client.removeChannel(channel)
    }
  }, [roomId, loadNames, profile?.id])

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  async function send(event: FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    const { data, error: sendError } = await db()
      .from('messages')
      .insert({ room_id: roomId, body })
      .select('id, room_id, body, is_anonymous, author_id, anon_label, is_hidden, created_at')
      .single()
    setSending(false)
    if (sendError || !data) {
      setError(toKoreanError(sendError))
      return
    }
    const message = data as Message
    setText('')
    setMine((prev) => new Set(prev).add(message.id))
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
  }

  async function remove(id: string) {
    if (!window.confirm('메시지를 삭제할까요?')) return
    const { error: deleteError } = await db().from('messages').delete().eq('id', id)
    if (deleteError) setError(toKoreanError(deleteError))
    else setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  const isMine = (m: Message) => mine.has(m.id) || (!!m.author_id && m.author_id === profile?.id)

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">첫 메시지를 보내 보세요.</p>
        )}
        {messages.map((m, i) => {
          const me = isMine(m)
          const name = m.is_anonymous ? (m.anon_label ?? '익명') : m.author_id ? (names[m.author_id] ?? '…') : '탈퇴한 회원'
          const prev = messages[i - 1]
          const sameAuthor =
            prev && (prev.is_anonymous ? prev.anon_label === m.anon_label : prev.author_id === m.author_id)
          return (
            <div key={m.id} className={`group flex animate-rise gap-2 ${me ? 'flex-row-reverse' : ''}`}>
              {!me && (sameAuthor ? <span className="w-7 shrink-0" /> : <Avatar name={name} size="sm" muted={m.is_anonymous} />)}
              <div className={`flex max-w-[78%] flex-col ${me ? 'items-end' : 'items-start'}`}>
                {!me && !sameAuthor && <span className="mb-1 text-xs text-slate-500">{name}</span>}
                <div className={`flex items-end gap-1.5 ${me ? 'flex-row-reverse' : ''}`}>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId((v) => (v === m.id ? null : m.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelectedId((v) => (v === m.id ? null : m.id))
                    }}
                    className={[
                      'cursor-pointer rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
                      me ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800',
                      m.is_hidden ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    {m.body}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">{formatTime(m.created_at)}</span>
                </div>
                {/* 메시지를 누르면(PC 는 마우스를 올리면) 신고·삭제 버튼 표시 */}
                <div className={`mt-0.5 gap-2 group-hover:flex ${selectedId === m.id ? 'flex' : 'hidden'}`}>
                  {me ? (
                    <button
                      type="button"
                      onClick={() => void remove(m.id)}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="size-3" />
                      삭제
                    </button>
                  ) : (
                    <ReportButton targetType="message" targetId={m.id} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter 전송, Shift+Enter 줄바꿈 (한글 조합 중에는 전송하지 않음)
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="메시지 입력"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl bg-slate-100 px-3.5 py-2.5 text-base outline-none focus:bg-white focus:ring-2 focus:ring-brand-100 md:text-sm"
        />
        <button
          type="submit"
          aria-label="보내기"
          disabled={!text.trim() || sending}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition active:scale-90 disabled:bg-slate-200 disabled:text-slate-400"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </div>
  )
}
