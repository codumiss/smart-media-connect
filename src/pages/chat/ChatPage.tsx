import { ChevronRight, MessagesSquare, Plus, VenetianMask } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, Spinner, Tabs, inputClass } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { timeAgo } from '../../lib/format'
import { db } from '../../lib/supabase'

type OpenRoom = {
  id: string
  name: string
  description: string | null
  is_anonymous: boolean
  last_message_at: string | null
}

type DirectRoom = {
  id: string
  last_message_at: string | null
  chat_members: { user_id: string; profiles: { name: string } | null }[]
}

type Filter = 'all' | 'named' | 'anon' | 'direct'

/** 목록 하나에 모든 방을 두고, 위쪽 칩으로 골라 보기 (탭으로 나누면 방을 찾기 어려워짐) */
export default function ChatPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([])
  const [directRooms, setDirectRooms] = useState<DirectRoom[]>([])
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    const client = db()
    const [openRes, directRes, joinedRes] = await Promise.all([
      client
        .from('chat_rooms')
        .select('id, name, description, is_anonymous, last_message_at')
        .eq('kind', 'open')
        .order('last_message_at', { ascending: false, nullsFirst: false }),
      client
        .from('chat_rooms')
        .select('id, last_message_at, chat_members(user_id, profiles(name))')
        .eq('kind', 'direct')
        .order('last_message_at', { ascending: false, nullsFirst: false }),
      client.from('chat_members').select('room_id').eq('user_id', profile.id),
    ])
    setOpenRooms((openRes.data as OpenRoom[] | null) ?? [])
    // 관리자는 모든 1:1 방이 조회되므로 내가 들어간 방만 표시
    setDirectRooms(
      ((directRes.data as DirectRoom[] | null) ?? []).filter((r) => r.chat_members.some((m) => m.user_id === profile.id)),
    )
    setJoined(new Set(((joinedRes.data as { room_id: string }[] | null) ?? []).map((r) => r.room_id)))
    setLoading(false)
  }, [profile])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section>
      <PageHeader
        title="소통"
        description="학년과 관계없이 익명·실명으로 이야기해요"
        icon={MessagesSquare}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            방 만들기
          </Button>
        }
      />

      <div className="mt-6">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'all', label: '전체' },
            { value: 'named', label: '실명방' },
            { value: 'anon', label: '익명방' },
            { value: 'direct', label: `1:1${directRooms.length ? ` ${directRooms.length}` : ''}` },
          ]}
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          (() => {
            const shownOpen =
              filter === 'direct' ? [] : openRooms.filter((r) => filter === 'all' || (filter === 'anon') === r.is_anonymous)
            const shownDirect = filter === 'all' || filter === 'direct' ? directRooms : []
            if (shownOpen.length + shownDirect.length === 0) {
              return (
                <EmptyState
                  title={
                    filter === 'direct'
                      ? "1:1 대화가 없어요. 정보방 글이나 팀원 목록에서 '1:1 대화'를 눌러 시작할 수 있어요."
                      : '아직 방이 없어요. 첫 방을 만들어 보세요.'
                  }
                />
              )
            }
            return (
              <ul className="divide-y divide-black/5">
                {shownOpen.map((room, i) => (
                  <li key={room.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                    <Link
                      to={`/chat/${room.id}`}
                      className={`flex items-center gap-3 px-4 py-4 md:px-5 ${room.is_anonymous ? 'bg-slate-900/[0.03] hover:bg-slate-900/[0.06]' : 'hover:bg-tile'}`}
                    >
                      <span
                        className={[
                          'grid size-12 shrink-0 place-items-center rounded-2xl',
                          room.is_anonymous ? 'bg-ink text-white' : 'bg-brand-50 text-brand-600',
                        ].join(' ')}
                      >
                        {room.is_anonymous ? <VenetianMask className="size-6" /> : <MessagesSquare className="size-6" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[15px] font-bold">
                          <span className="truncate">{room.name}</span>
                          {room.is_anonymous ? (
                            <span className="shrink-0 rounded-full bg-star px-2 py-0.5 text-[11px] font-bold text-ink">익명</span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-sub">실명</span>
                          )}
                          {joined.has(room.id) && (
                            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                              참여 중
                            </span>
                          )}
                        </p>
                        <p className="truncate text-sm text-sub">{room.description ?? '설명 없음'}</p>
                      </div>
                      {room.last_message_at && <span className="shrink-0 text-xs text-sub">{timeAgo(room.last_message_at)}</span>}
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
                {shownDirect.map((room) => {
                  const other = room.chat_members.find((m) => m.user_id !== profile?.id)
                  const name = other?.profiles?.name ?? '알 수 없음'
                  return (
                    <li key={room.id}>
                      <Link to={`/chat/${room.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-tile md:px-5">
                        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-700">
                          {name.slice(0, 1)}
                        </span>
                        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[15px] font-bold">
                          <span className="truncate">{name}</span>
                          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-sub">1:1</span>
                        </p>
                        {room.last_message_at && <span className="text-xs text-sub">{timeAgo(room.last_message_at)}</span>}
                        <ChevronRight className="size-4 text-slate-300" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )
          })()
        )}
      </Card>

      {creating && <CreateRoomModal onClose={() => setCreating(false)} onCreated={(id) => navigate(`/chat/${id}`)} />}
    </section>
  )
}

function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    const { data, error: insertError } = await db()
      .from('chat_rooms')
      .insert({ name: name.trim(), description: description.trim() || null, is_anonymous: anonymous })
      .select('id')
      .single()
    setSubmitting(false)
    if (insertError || !data) {
      setError(toKoreanError(insertError))
      return
    }
    onCreated(data.id as string)
  }

  return (
    <Modal title="소통방 만들기" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="방 이름">
          <input className={inputClass} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="설명">
          <input
            className={inputClass}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: '실명방', desc: '이름이 보여요' },
            { value: true, label: '익명방', desc: '익명1, 익명2로 보여요' },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setAnonymous(opt.value)}
              className={[
                'rounded-2xl border p-3 text-left transition',
                anonymous === opt.value ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-black/10',
              ].join(' ')}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.desc}</p>
            </button>
          ))}
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={submitting || !name.trim()}>
          만들기
        </Button>
      </form>
    </Modal>
  )
}
