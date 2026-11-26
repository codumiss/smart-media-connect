import { CalendarDays, ChevronRight, Megaphone, NotebookText, Pin, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { dDayLabel, formatDate, timeAgo, toDateKey } from '../../lib/format'
import { SCHEDULE_CATEGORY, type Announcement, type Schedule } from '../../lib/schedule'
import { db } from '../../lib/supabase'
import { CATEGORY_LABEL, postAuthorName, type PostRow } from '../community/shared'

type RecruitRow = Pick<PostRow, 'id' | 'title' | 'created_at'> & {
  recruitments: { project_name: string; fields: string | null; deadline: string | null; headcount: number | null } | null
}
type MyTeam = { team_rooms: { id: string; name: string; description: string | null } | null }

type Data = {
  schedules: Schedule[]
  announcements: Announcement[]
  posts: PostRow[]
  recruits: RecruitRow[]
  teams: MyTeam[]
}

/** 홈: 자주 확인하는 정보를 한 화면에 */
export default function HomePage() {
  const { profile, isAdmin, displayName } = useAuth()
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    if (!profile) return
    const client = db()
    const today = toDateKey(new Date())
    void Promise.all([
      client
        .from('schedules')
        .select('id, title, description, category, starts_on, ends_on, announcement_id')
        .or(`ends_on.gte.${today},and(ends_on.is.null,starts_on.gte.${today})`)
        .order('starts_on')
        .limit(4),
      client
        .from('announcements')
        .select('id, title, body, is_pinned, created_at, updated_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4),
      client
        .from('posts')
        .select('id, category, title, body, is_anonymous, is_hidden, author_id, created_at, updated_at, author:profiles!posts_author_id_fkey(name, nickname), recruitments(*)')
        .neq('category', 'recruit')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(5),
      client
        .from('posts')
        .select('id, title, created_at, recruitments!inner(project_name, fields, deadline, headcount, status)')
        .eq('category', 'recruit')
        .eq('is_hidden', false)
        .eq('recruitments.status', 'open')
        .order('created_at', { ascending: false })
        .limit(4),
      client
        .from('team_members')
        .select('team_rooms(id, name, description)')
        .eq('user_id', profile.id)
        .order('joined_at', { ascending: false })
        .limit(4),
    ]).then(([s, a, p, r, t]) => {
      setData({
        schedules: (s.data as Schedule[] | null) ?? [],
        announcements: (a.data as Announcement[] | null) ?? [],
        posts: (p.data as PostRow[] | null) ?? [],
        recruits: (r.data as RecruitRow[] | null) ?? [],
        teams: ((t.data as MyTeam[] | null) ?? []).filter((x) => x.team_rooms),
      })
    })
  }, [profile])

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <section>
      <div className="animate-rise">
        <p className="text-sm text-slate-500">{today}</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">
          {isAdmin ? '관리자님, 안녕하세요' : `${displayName}님, 안녕하세요`}
        </h1>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Widget title="다가오는 일정" icon={CalendarDays} to="/notice?tab=calendar" delay={60}>
          {!data ? (
            <Skeleton />
          ) : data.schedules.length === 0 ? (
            <Empty>예정된 일정이 없어요.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.schedules.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${SCHEDULE_CATEGORY[s.category].dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.title}</span>
                    <span className="text-xs text-slate-500">{formatDate(s.starts_on)}</span>
                  </span>
                  <span
                    className={[
                      'shrink-0 rounded-md px-2 py-0.5 text-xs font-bold',
                      s.starts_on <= toDateKey(new Date()) ? 'bg-brand-600 text-white' : 'bg-white text-slate-600',
                    ].join(' ')}
                  >
                    {dDayLabel(s.starts_on) === '마감' ? '진행 중' : dDayLabel(s.starts_on)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="학과 공지" icon={Megaphone} to="/notice" delay={120}>
          {!data ? (
            <Skeleton />
          ) : data.announcements.length === 0 ? (
            <Empty>등록된 공지가 없어요.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.announcements.map((a) => (
                <li key={a.id}>
                  <Link to={`/notice?id=${a.id}`} className="flex items-center gap-2 py-2.5 hover:text-brand-700">
                    {a.is_pinned && <Pin className="size-3.5 shrink-0 fill-current text-brand-600" />}
                    <span className="min-w-0 flex-1 truncate text-sm">{a.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(a.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="모집 중인 팀" icon={UserPlus} to="/community?category=recruit" delay={180}>
          {!data ? (
            <Skeleton />
          ) : data.recruits.length === 0 ? (
            <Empty>
              모집 중인 팀이 없어요.{' '}
              <Link to="/community/new?category=recruit" className="font-semibold text-brand-600">
                팀원 모집하기
              </Link>
            </Empty>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.recruits.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/community/${r.id}`}
                    className="block h-full rounded-xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm"
                  >
                    <span className="text-xs font-semibold text-brand-700">
                      {r.recruitments?.deadline ? dDayLabel(r.recruitments.deadline) : '모집 중'}
                      {r.recruitments?.headcount ? ` · ${r.recruitments.headcount}명` : ''}
                    </span>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">{r.recruitments?.project_name ?? r.title}</p>
                    {r.recruitments?.fields && <p className="mt-0.5 truncate text-xs text-slate-500">{r.recruitments.fields}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="내 팀룸" icon={Users} to="/team" delay={240}>
          {!data ? (
            <Skeleton />
          ) : data.teams.length === 0 ? (
            <Empty>참여 중인 팀룸이 없어요.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.teams.map(({ team_rooms: t }) =>
                t ? (
                  <li key={t.id}>
                    <Link to={`/team/${t.id}`} className="flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-slate-50">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                        {t.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{t.name}</span>
                        <span className="block truncate text-xs text-slate-500">{t.description ?? ''}</span>
                      </span>
                      <ChevronRight className="size-4 text-slate-300" />
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </Widget>

        <Widget title="정보방 최근 글" icon={NotebookText} to="/community" delay={300} wide>
          {!data ? (
            <Skeleton />
          ) : data.posts.length === 0 ? (
            <Empty>아직 글이 없어요.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.posts.map((p) => (
                <li key={p.id}>
                  <Link to={`/community/${p.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand-700">
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                      {CATEGORY_LABEL[p.category]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                    <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">{postAuthorName(p)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(p.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>
    </section>
  )
}

function Widget({
  title,
  icon: Icon,
  to,
  delay,
  wide = false,
  children,
}: {
  title: string
  icon: LucideIcon
  to: string
  delay: number
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`animate-rise rounded-2xl border border-slate-200 bg-white p-5 ${wide ? 'md:col-span-2' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-brand-600" />
          {title}
        </h2>
        <Link to={to} className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900">
          전체 보기
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-slate-400">{children}</p>
}
