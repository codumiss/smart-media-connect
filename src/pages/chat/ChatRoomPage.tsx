import { ArrowLeft, LogOut, VenetianMask } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChatRoom } from '../../components/chat/ChatRoom'
import { EmptyState, ErrorText, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { db } from '../../lib/supabase'

type Room = {
  id: string
  kind: 'open' | 'team' | 'direct'
  name: string | null
  description: string | null
  is_anonymous: boolean
  team_room_id: string | null
  chat_members: { user_id: string; profiles: { name: string } | null }[]
}

export default function ChatRoomPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setReady(false)
    async function enter() {
      const client = db()
      const { data } = await client
        .from('chat_rooms')
        .select('id, kind, name, description, is_anonymous, team_room_id, chat_members(user_id, profiles(name))')
        .eq('id', id)
        .maybeSingle()
      const found = data as Room | null
      // 공개 소통방은 들어오면 자동으로 참여
      if (found?.kind === 'open' && !found.chat_members.some((m) => m.user_id === profile?.id)) {
        const { error: joinError } = await client.from('chat_members').insert({ room_id: id })
        if (joinError && joinError.code !== '23505') setError(toKoreanError(joinError))
      }
      if (!active) return
      setRoom(found)
      setReady(true)
    }
    void enter()
    return () => {
      active = false
    }
  }, [id, profile?.id])

  async function leave() {
    if (!window.confirm('이 방에서 나갈까요?')) return
    const { error: leaveError } = await db().from('chat_members').delete().eq('room_id', id).eq('user_id', profile?.id ?? '')
    if (leaveError) setError(toKoreanError(leaveError))
    else navigate('/chat', { replace: true })
  }

  if (!ready) return <Spinner />
  if (!room) {
    return (
      <EmptyState
        title="방을 찾을 수 없어요."
        action={
          <Link to="/chat" className="text-sm font-semibold text-brand-600">
            소통으로
          </Link>
        }
      />
    )
  }
  if (room.kind === 'team' && room.team_room_id) return <Navigate to={`/team/${room.team_room_id}`} replace />

  const title =
    room.kind === 'direct'
      ? (room.chat_members.find((m) => m.user_id !== profile?.id)?.profiles?.name ?? '1:1 대화')
      : (room.name ?? '')

  return (
    <section>
      <div className="flex items-center gap-2">
        <Link to="/chat" aria-label="소통 목록" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 truncate text-lg font-bold md:text-xl">
            {room.is_anonymous && <VenetianMask className="size-5 shrink-0 text-slate-500" />}
            {title}
          </h1>
          <p className="truncate text-xs text-slate-500">
            {room.kind === 'direct'
              ? '1:1 대화'
              : `${room.is_anonymous ? '익명방' : '실명방'} · ${room.description ?? ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void leave()}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
        >
          <LogOut className="size-3.5" />
          나가기
        </button>
      </div>
      <div className="mt-2">
        <ErrorText>{error}</ErrorText>
      </div>
      <ChatRoom roomId={room.id} className="mt-3 h-[calc(100dvh-14rem)] md:h-[calc(100dvh-10rem)]" />
    </section>
  )
}
