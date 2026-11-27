import { Check, LogOut, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorText, Field, Spinner, Tabs, inputClass } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { timeAgo } from '../../lib/format'
import { db } from '../../lib/supabase'
import { CATEGORY_LABEL, type PostCategory } from '../community/shared'

type Tab = 'profile' | 'posts' | 'comments' | 'applications'

export default function MyPage() {
  const { profile, isAdmin, displayName, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')
  if (!profile) return null

  return (
    <section>
      <div className="flex items-center gap-4">
        <span
          className={[
            'grid size-14 animate-pop place-items-center rounded-full text-xl font-bold',
            isAdmin ? 'bg-slate-900 text-white' : 'bg-brand-100 text-brand-700',
          ].join(' ')}
        >
          {isAdmin ? <ShieldCheck className="size-6" /> : profile.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold md:text-2xl">{isAdmin ? displayName : `${displayName}님`}</h1>
          <p className="text-sm text-slate-500">
            @{profile.nickname} · {profile.grade ? `${profile.grade}학년` : '졸업생'}
            {isAdmin && ' · 관리자 계정'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link to="/admin" className="hidden rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white sm:inline-flex">
              관리자 화면
            </Link>
          )}
          <Button variant="secondary" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'profile', label: '내 정보' },
            { value: 'posts', label: '내 글' },
            { value: 'comments', label: '내 댓글' },
            { value: 'applications', label: '참여 신청' },
          ]}
        />
      </div>

      <div className="mt-4">
        {tab === 'profile' && <ProfileForm />}
        {tab === 'posts' && <MyPosts />}
        {tab === 'comments' && <MyComments />}
        {tab === 'applications' && <MyApplications />}
      </div>
    </section>
  )
}

function ProfileForm() {
  const { profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    nickname: profile?.nickname ?? '',
    grade: profile?.grade ? String(profile.grade) : '',
    studentId: '',
  })
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    void db()
      .from('profile_private')
      .select('student_id, email')
      .eq('id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { student_id: string | null; email: string | null } | null
        setForm((f) => ({ ...f, studentId: row?.student_id ?? '' }))
        setEmail(row?.email ?? '')
      })
  }, [profile])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!profile) return
    if (!form.name.trim()) return setError('이름을 입력해 주세요.')
    if (form.nickname.trim().length < 2) return setError('닉네임은 2자 이상이어야 해요.')
    if (form.studentId && !/^[0-9]{6,12}$/.test(form.studentId)) return setError('학번은 숫자 6~12자리로 입력해 주세요.')
    setBusy(true)
    setError('')
    const client = db()
    const [p, priv] = await Promise.all([
      client
        .from('profiles')
        .update({ name: form.name.trim(), nickname: form.nickname.trim(), grade: form.grade ? Number(form.grade) : null })
        .eq('id', profile.id),
      client.from('profile_private').update({ student_id: form.studentId || null }).eq('id', profile.id),
    ])
    setBusy(false)
    const failed = p.error ?? priv.error
    if (failed) {
      setError(failed.code === '23505' ? '이미 사용 중인 닉네임이에요.' : toKoreanError(failed))
      return
    }
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card className="p-5 md:p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="이름">
            <input className={inputClass} maxLength={30} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="닉네임" hint="정보방에서 보이는 이름">
            <input
              className={inputClass}
              maxLength={20}
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />
          </Field>
          <Field label="학년">
            <select className={inputClass} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
              <option value="4">4학년</option>
              <option value="">졸업생</option>
            </select>
          </Field>
          <Field label="학번" hint="본인과 관리자만 볼 수 있어요">
            <input
              className={inputClass}
              inputMode="numeric"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value.replace(/[^0-9]/g, '') })}
            />
          </Field>
        </div>
        <Field label="이메일">
          <input className={`${inputClass} bg-slate-50 text-slate-500`} value={email} disabled />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex animate-pop items-center gap-1 text-sm font-medium text-signal">
              <Check className="size-4" />
              저장했어요
            </span>
          )}
          <Button type="submit" disabled={busy}>
            저장
          </Button>
        </div>
      </form>
    </Card>
  )
}

type MyPost = { id: string; category: PostCategory; title: string; is_anonymous: boolean; is_hidden: boolean; created_at: string }

/** 내가 쓴 글 — 익명 글도 포함 (실제 작성자 기록은 본인 것만 조회됨) */
function MyPosts() {
  const { profile } = useAuth()
  const [posts, setPosts] = useState<MyPost[] | null>(null)

  useEffect(() => {
    if (!profile) return
    const client = db()
    void (async () => {
      // 관리자는 모든 작성자 기록이 조회되므로 본인 것만 걸러냄
      const { data: own } = await client
        .from('content_authors')
        .select('target_id')
        .eq('target_type', 'post')
        .eq('author_id', profile.id)
      const ids = ((own as { target_id: string }[] | null) ?? []).map((r) => r.target_id)
      if (ids.length === 0) return setPosts([])
      const { data } = await client
        .from('posts')
        .select('id, category, title, is_anonymous, is_hidden, created_at')
        .in('id', ids)
        .order('created_at', { ascending: false })
      setPosts((data as MyPost[] | null) ?? [])
    })()
  }, [profile])

  if (!posts) return <Spinner />
  return (
    <Card className="overflow-hidden">
      {posts.length === 0 ? (
        <EmptyState
          title="아직 쓴 글이 없어요."
          action={
            <Link to="/community/new" className="text-sm font-semibold text-brand-600">
              글쓰기
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {posts.map((p) => (
            <li key={p.id}>
              <Link to={`/community/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 md:px-5">
                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                  {CATEGORY_LABEL[p.category]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                {p.is_anonymous && <span className="shrink-0 text-xs text-slate-400">익명</span>}
                {p.is_hidden && <span className="shrink-0 text-xs text-red-500">가려짐</span>}
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(p.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

type MyComment = { id: string; post_id: string; body: string; is_anonymous: boolean; created_at: string; posts: { title: string } | null }

function MyComments() {
  const { profile } = useAuth()
  const [comments, setComments] = useState<MyComment[] | null>(null)

  useEffect(() => {
    if (!profile) return
    const client = db()
    void (async () => {
      const { data: own } = await client
        .from('content_authors')
        .select('target_id')
        .eq('target_type', 'comment')
        .eq('author_id', profile.id)
      const ids = ((own as { target_id: string }[] | null) ?? []).map((r) => r.target_id)
      if (ids.length === 0) return setComments([])
      const { data } = await client
        .from('comments')
        .select('id, post_id, body, is_anonymous, created_at, posts(title)')
        .in('id', ids)
        .order('created_at', { ascending: false })
      setComments((data as MyComment[] | null) ?? [])
    })()
  }, [profile])

  if (!comments) return <Spinner />
  return (
    <Card className="overflow-hidden">
      {comments.length === 0 ? (
        <EmptyState title="아직 쓴 댓글이 없어요." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {comments.map((c) => (
            <li key={c.id}>
              <Link to={`/community/${c.post_id}`} className="block px-4 py-3.5 hover:bg-slate-50 md:px-5">
                <p className="truncate text-sm">{c.body}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {c.posts?.title ?? '삭제된 글'} · {timeAgo(c.created_at)}
                  {c.is_anonymous && ' · 익명'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

type MyApplication = {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  recruitment_id: string
  recruitments: { project_name: string; team_room_id: string | null } | null
}

const APPLICATION_STATUS = {
  pending: { label: '대기 중', className: 'bg-slate-100 text-slate-600' },
  accepted: { label: '승인됨', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: '거절됨', className: 'bg-red-50 text-red-600' },
} as const

function MyApplications() {
  const { profile } = useAuth()
  const [items, setItems] = useState<MyApplication[] | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await db()
      .from('applications')
      .select('id, status, created_at, recruitment_id, recruitments(project_name, team_room_id)')
      .eq('applicant_id', profile.id)
      .order('created_at', { ascending: false })
    setItems((data as MyApplication[] | null) ?? [])
  }, [profile])

  useEffect(() => {
    void load()
  }, [load])

  if (!items) return <Spinner />
  return (
    <Card className="overflow-hidden">
      {items.length === 0 ? (
        <EmptyState
          title="참여 신청한 모집이 없어요."
          action={
            <Link to="/community?category=recruit" className="text-sm font-semibold text-brand-600">
              모집 중인 팀 보기
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => {
            const status = APPLICATION_STATUS[a.status]
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
                <Link to={`/community/${a.recruitment_id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="truncate text-sm font-medium">{a.recruitments?.project_name ?? '삭제된 모집'}</p>
                  <p className="text-xs text-slate-400">{timeAgo(a.created_at)} 신청</p>
                </Link>
                {a.status === 'accepted' && a.recruitments?.team_room_id && (
                  <Link to={`/team/${a.recruitments.team_room_id}`} className="shrink-0 text-xs font-semibold text-brand-600">
                    팀룸
                  </Link>
                )}
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
