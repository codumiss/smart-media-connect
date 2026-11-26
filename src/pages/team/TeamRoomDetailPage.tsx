import { ArrowLeft, CalendarDays, Check, Copy, ExternalLink, Link2, MessageSquare, Plus, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChatRoom } from '../../components/chat/ChatRoom'
import { Avatar, Button, Card, EmptyState, ErrorText, Field, Spinner, Tabs, inputClass } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { formatDateTime } from '../../lib/format'
import { db } from '../../lib/supabase'

type Member = {
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profiles: { name: string; nickname: string; grade: number | null } | null
}

type TeamRoom = {
  id: string
  name: string
  description: string | null
  invite_code: string
  owner_id: string | null
  team_members: Member[]
}

type Meeting = { id: string; title: string; starts_at: string; place: string | null; memo: string | null; created_by: string | null }
type TeamLink = { id: string; title: string; url: string; created_by: string | null; created_at: string }

type Tab = 'chat' | 'meetings' | 'links' | 'members'

export default function TeamRoomDetailPage() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const [room, setRoom] = useState<TeamRoom | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('chat')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const client = db()
    const [roomRes, chatRes] = await Promise.all([
      client
        .from('team_rooms')
        .select('id, name, description, invite_code, owner_id, team_members(user_id, role, joined_at, profiles(name, nickname, grade))')
        .eq('id', id)
        .maybeSingle(),
      client.from('chat_rooms').select('id').eq('team_room_id', id).maybeSingle(),
    ])
    setRoom((roomRes.data as TeamRoom | null) ?? null)
    setChatId((chatRes.data as { id: string } | null)?.id ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function copyCode() {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('방 키를 복사하세요', room.invite_code)
    }
  }

  if (loading) return <Spinner />
  if (!room) {
    return (
      <EmptyState
        icon={Users}
        title="팀룸을 찾을 수 없어요. 팀원만 볼 수 있어요."
        action={
          <Link to="/team" className="text-sm font-semibold text-brand-600">
            팀룸 목록으로
          </Link>
        }
      />
    )
  }

  const isOwner = room.owner_id === profile?.id

  return (
    <section>
      <Link to="/team" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" />
        팀룸
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold md:text-2xl">{room.name}</h1>
          {room.description && <p className="mt-1 text-sm text-slate-500">{room.description}</p>}
        </div>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="group inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-brand-700 transition hover:bg-brand-100 active:scale-95"
          title="방 키 복사"
        >
          <span className="text-xs">방 키</span>
          <span className="font-bold tracking-wider">{room.invite_code}</span>
          {copied ? <Check className="size-4 animate-pop text-signal" /> : <Copy className="size-4" />}
        </button>
      </div>

      <div className="mt-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'chat', label: '채팅' },
            { value: 'meetings', label: '회의 일정' },
            { value: 'links', label: '자료' },
            { value: 'members', label: `팀원 ${room.team_members.length}` },
          ]}
        />
      </div>

      <div className="mt-4">
        {tab === 'chat' &&
          (chatId ? (
            <ChatRoom roomId={chatId} className="h-[calc(100dvh-20rem)] min-h-80 md:h-[calc(100dvh-16rem)]" />
          ) : (
            <Card>
              <EmptyState title="팀 채팅방을 찾을 수 없어요." />
            </Card>
          ))}
        {tab === 'meetings' && <Meetings roomId={room.id} isOwner={isOwner} />}
        {tab === 'links' && <Links roomId={room.id} isOwner={isOwner} />}
        {tab === 'members' && <Members room={room} isOwner={isOwner} onChange={() => void load()} />}
      </div>
    </section>
  )
}

function Meetings({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const { profile } = useAuth()
  const [items, setItems] = useState<Meeting[]>([])
  const [form, setForm] = useState({ title: '', startsAt: '', place: '', memo: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await db()
      .from('team_meetings')
      .select('id, title, starts_at, place, memo, created_by')
      .eq('room_id', roomId)
      .order('starts_at')
    setItems((data as Meeting[] | null) ?? [])
  }, [roomId])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim() || !form.startsAt) return
    const { error: insertError } = await db()
      .from('team_meetings')
      .insert({
        room_id: roomId,
        title: form.title.trim(),
        starts_at: new Date(form.startsAt).toISOString(),
        place: form.place.trim() || null,
        memo: form.memo.trim() || null,
      })
    if (insertError) {
      setError(toKoreanError(insertError))
      return
    }
    setForm({ title: '', startsAt: '', place: '', memo: '' })
    setAdding(false)
    setError('')
    await load()
  }

  async function remove(meetingId: string) {
    if (!window.confirm('회의 일정을 삭제할까요?')) return
    await db().from('team_meetings').delete().eq('id', meetingId)
    await load()
  }

  const now = Date.now()
  const upcoming = items.filter((m) => new Date(m.starts_at).getTime() >= now - 3600_000)
  const past = items.filter((m) => new Date(m.starts_at).getTime() < now - 3600_000).reverse()

  return (
    <div className="space-y-4">
      {adding ? (
        <Card className="animate-rise p-5">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="회의 이름">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  autoFocus
                />
              </Field>
              <Field label="날짜와 시간">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </Field>
            </div>
            <Field label="장소 또는 화상회의 링크">
              <input className={inputClass} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
            </Field>
            <Field label="메모">
              <textarea
                className={inputClass}
                rows={2}
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdding(false)}>
                취소
              </Button>
              <Button type="submit" disabled={!form.title.trim() || !form.startsAt}>
                등록
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          회의 일정 추가
        </Button>
      )}

      <Card className="overflow-hidden">
        {upcoming.length === 0 && past.length === 0 ? (
          <EmptyState icon={CalendarDays} title="등록된 회의가 없어요." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...upcoming, ...past].map((m) => {
              const isPast = new Date(m.starts_at).getTime() < now - 3600_000
              const isUrl = m.place?.startsWith('http')
              return (
                <li key={m.id} className={`flex animate-rise gap-3 px-4 py-4 md:px-5 ${isPast ? 'opacity-50' : ''}`}>
                  <CalendarDays className="mt-0.5 size-5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-sm text-slate-600">{formatDateTime(m.starts_at)}</p>
                    {m.place &&
                      (isUrl ? (
                        <a
                          href={m.place}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                        >
                          화상회의 링크
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <p className="text-sm text-slate-500">{m.place}</p>
                      ))}
                    {m.memo && <p className="mt-1 text-sm whitespace-pre-wrap text-slate-500">{m.memo}</p>}
                  </div>
                  {(m.created_by === profile?.id || isOwner) && (
                    <button
                      type="button"
                      aria-label="삭제"
                      onClick={() => void remove(m.id)}
                      className="self-start p-1 text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Links({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const { profile } = useAuth()
  const [items, setItems] = useState<TeamLink[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await db()
      .from('team_links')
      .select('id, title, url, created_by, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setItems((data as TeamLink[] | null) ?? [])
  }, [roomId])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const fixedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    const { error: insertError } = await db()
      .from('team_links')
      .insert({ room_id: roomId, title: title.trim(), url: fixedUrl })
    if (insertError) {
      setError(toKoreanError(insertError))
      return
    }
    setTitle('')
    setUrl('')
    setError('')
    await load()
  }

  async function remove(linkId: string) {
    await db().from('team_links').delete().eq('id', linkId)
    await load()
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <input className={inputClass} placeholder="이름 (예: 피그마 시안)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={inputClass} placeholder="링크 주소" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button type="submit" disabled={!title.trim() || !url.trim()}>
            <Plus className="size-4" />
            추가
          </Button>
        </form>
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState icon={Link2} title="공유한 자료가 없어요. 피그마, 깃허브, 드라이브 링크를 모아 두세요." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex animate-rise items-center gap-3 px-4 py-3.5 md:px-5">
                <Link2 className="size-4 shrink-0 text-slate-400" />
                <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-slate-400">{item.url}</p>
                </a>
                {(item.created_by === profile?.id || isOwner) && (
                  <button
                    type="button"
                    aria-label="삭제"
                    onClick={() => void remove(item.id)}
                    className="p-1 text-slate-300 hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Members({ room, isOwner, onChange }: { room: TeamRoom; isOwner: boolean; onChange: () => void }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function kick(userId: string, name: string) {
    if (!window.confirm(`${name}님을 팀에서 내보낼까요?`)) return
    const { error: deleteError } = await db().from('team_members').delete().eq('room_id', room.id).eq('user_id', userId)
    if (deleteError) setError(toKoreanError(deleteError))
    else onChange()
  }

  async function leave() {
    if (!window.confirm('팀룸에서 나갈까요?')) return
    const { error: deleteError } = await db()
      .from('team_members')
      .delete()
      .eq('room_id', room.id)
      .eq('user_id', profile?.id ?? '')
    if (deleteError) setError(toKoreanError(deleteError))
    else navigate('/team', { replace: true })
  }

  async function removeRoom() {
    if (!window.confirm('팀룸을 삭제할까요? 채팅, 회의 일정, 자료가 모두 삭제돼요.')) return
    const { error: deleteError } = await db().from('team_rooms').delete().eq('id', room.id)
    if (deleteError) setError(toKoreanError(deleteError))
    else navigate('/team', { replace: true })
  }

  async function chat(userId: string) {
    const { data, error: rpcError } = await db().rpc('start_direct_chat', { p_user_id: userId })
    if (rpcError) setError(toKoreanError(rpcError))
    else navigate(`/chat/${data as string}`)
  }

  const members = [...room.team_members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0))

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {members.map((m) => {
            const name = m.profiles?.name ?? '알 수 없음'
            const isMe = m.user_id === profile?.id
            return (
              <li key={m.user_id} className="flex animate-rise items-center gap-3 px-4 py-3.5 md:px-5">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {name}
                    {isMe && <span className="ml-1 font-normal text-brand-600">(나)</span>}
                    {m.role === 'owner' && (
                      <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">방장</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    @{m.profiles?.nickname} · {m.profiles?.grade ? `${m.profiles.grade}학년` : '졸업생'}
                  </p>
                </div>
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => void chat(m.user_id)}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
                  >
                    <MessageSquare className="size-3.5" />
                    1:1
                  </button>
                )}
                {isOwner && !isMe && (
                  <button type="button" onClick={() => void kick(m.user_id, name)} className="text-xs text-slate-400 hover:text-red-500">
                    내보내기
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <ErrorText>{error}</ErrorText>

      <div className="flex justify-end">
        {isOwner ? (
          <Button variant="ghost" className="text-red-600" onClick={() => void removeRoom()}>
            <Trash2 className="size-4" />
            팀룸 삭제
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => void leave()}>
            팀룸 나가기
          </Button>
        )}
      </div>
    </div>
  )
}
