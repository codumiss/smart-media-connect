import { ChevronRight, KeyRound, Plus, Users } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, Spinner, inputClass } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { timeAgo } from '../../lib/format'
import { db } from '../../lib/supabase'

type MyRoom = {
  role: 'owner' | 'member'
  team_rooms: {
    id: string
    name: string
    description: string | null
    created_at: string
    team_members: { count: number }[]
  } | null
}

export default function TeamRoomPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<MyRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'join' | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await db()
      .from('team_members')
      .select('role, team_rooms(id, name, description, created_at, team_members(count))')
      .eq('user_id', profile.id)
      .order('joined_at', { ascending: false })
    setRooms(((data as MyRoom[] | null) ?? []).filter((r) => r.team_rooms))
    setLoading(false)
  }, [profile])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section>
      <PageHeader
        title="팀룸"
        description="팀을 만들고 방 키로 모여 협업해요"
        icon={Users}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModal('join')}>
              <KeyRound className="size-4" />
              방 키로 참여
            </Button>
            <Button onClick={() => setModal('create')}>
              <Plus className="size-4" />
              팀룸 만들기
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        {loading ? (
          <Spinner />
        ) : rooms.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="참여 중인 팀룸이 없어요. 팀룸을 만들거나, 팀장에게 받은 방 키로 참여해 보세요."
            />
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rooms.map(({ role, team_rooms: room }, i) =>
              room ? (
                <li key={room.id} className="animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
                  <Link
                    to={`/team/${room.id}`}
                    className="group flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">
                      {room.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <span className="truncate">{room.name}</span>
                        {role === 'owner' && (
                          <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            방장
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{room.description ?? '설명 없음'}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        팀원 {room.team_members[0]?.count ?? 1}명 · {timeAgo(room.created_at)} 생성
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>

      {modal === 'create' && <CreateModal onClose={() => setModal(null)} onDone={(id) => navigate(`/team/${id}`)} />}
      {modal === 'join' && <JoinModal onClose={() => setModal(null)} onDone={(id) => navigate(`/team/${id}`)} />}
    </section>
  )
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    const { data, error: insertError } = await db()
      .from('team_rooms')
      .insert({ name: name.trim(), description: description.trim() || null })
      .select('id')
      .single()
    setSubmitting(false)
    if (insertError || !data) {
      setError(toKoreanError(insertError))
      return
    }
    onDone(data.id as string)
  }

  return (
    <Modal title="팀룸 만들기" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="팀 이름" hint="예: 웹 개발 공모전 팀">
          <input className={inputClass} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="설명">
          <textarea
            className={inputClass}
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <p className="text-xs text-slate-500">만들면 방 키가 발급돼요. 팀원에게 방 키를 알려 주면 바로 들어올 수 있어요.</p>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={submitting || !name.trim()}>
          만들기
        </Button>
      </form>
    </Modal>
  )
}

function JoinModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [code, setCode] = useState('SM-')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const { data, error: rpcError } = await db().rpc('join_team_room', { p_code: code })
    setSubmitting(false)
    if (rpcError) {
      setError(toKoreanError(rpcError))
      return
    }
    onDone(data as string)
  }

  return (
    <Modal title="방 키로 참여" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="방 키">
          <input
            className={`${inputClass} text-center text-lg font-bold tracking-[0.2em] uppercase`}
            maxLength={9}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={submitting || code.length < 9}>
          참여하기
        </Button>
      </form>
    </Modal>
  )
}
