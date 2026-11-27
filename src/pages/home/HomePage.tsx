import {
  CalendarDays,
  ChevronRight,
  Heart,
  KeyRound,
  Megaphone,
  MessageCircle,
  NotebookText,
  Pin,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, Mascot } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { dDayLabel, daysUntil, formatDate, timeAgo, toDateKey } from '../../lib/format'
import { SCHEDULE_CATEGORY, type Announcement, type Schedule } from '../../lib/schedule'
import { db } from '../../lib/supabase'
import { teamColor } from '../../lib/teamColor'
import { CATEGORY_LABEL, postAuthorName, type PostRow } from '../community/shared'

type RecruitRow = Pick<PostRow, 'id' | 'title' | 'created_at'> & {
  recruitments: { project_name: string; fields: string | null; deadline: string | null; headcount: number | null } | null
}
type MyTeam = {
  team_rooms: { id: string; name: string; description: string | null; team_members: { count: number }[] } | null
}
type HomePost = PostRow & { comments: { count: number }[]; post_likes: { count: number }[] }

type Data = {
  schedules: Schedule[]
  announcements: Announcement[]
  posts: HomePost[]
  recruits: RecruitRow[]
  teams: MyTeam[]
}

/**
 * 홈: 크기가 다른 카드(벤토)로 '지금 가장 중요한 것'이 먼저 보이게
 * - 가장 큰 카드: 다음 일정 D-day
 * - 그다음: 내 팀룸, 학과 공지, 모집 중인 팀, 정보방 최근 글
 */
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
        .select(
          'id, category, title, body, is_anonymous, is_hidden, author_id, created_at, updated_at, author:profiles!posts_author_id_fkey(name, nickname), recruitments(*), comments(count), post_likes(count)',
        )
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
        .select('team_rooms(id, name, description, team_members(count))')
        .eq('user_id', profile.id)
        .order('joined_at', { ascending: false })
        .limit(3),
    ]).then(([s, a, p, r, t]) => {
      setData({
        schedules: (s.data as Schedule[] | null) ?? [],
        announcements: (a.data as Announcement[] | null) ?? [],
        posts: (p.data as HomePost[] | null) ?? [],
        recruits: (r.data as RecruitRow[] | null) ?? [],
        teams: ((t.data as MyTeam[] | null) ?? []).filter((x) => x.team_rooms),
      })
    })
  }, [profile])

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <section>
      <div className="animate-rise">
        <p className="text-sm font-semibold text-sub">{today}</p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.03em] md:text-[30px]">
          {isAdmin ? '관리자님, 안녕하세요' : `${displayName}님, 안녕하세요`} 👋
        </h1>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:mt-6 md:grid-cols-2 md:gap-4 lg:grid-cols-12">
        {/* 1. 다음 일정 D-day (가장 큰 카드) */}
        <div className="animate-rise md:col-span-2 lg:col-span-8" style={{ animationDelay: '40ms' }}>
          <HeroSchedule schedules={data?.schedules ?? null} />
        </div>

        {/* 모바일: 숫자 요약 2칸 */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          <MiniStat to="/team" icon={Users} label="내 팀룸" value={data?.teams.length} unit="개" />
          <MiniStat to="/community?category=recruit" icon={UserPlus} label="모집 중인 팀" value={data?.recruits.length} unit="팀" />
        </div>

        {/* 2. 내 팀룸 */}
        <Widget title="내 팀룸" icon={Users} to="/team" delay={80} className="hidden md:block lg:col-span-4">
          {!data ? (
            <Skeleton />
          ) : data.teams.length === 0 ? (
            <EmptyState size="sm" title="참여 중인 팀룸이 없어요." />
          ) : (
            <ul className="space-y-2">
              {data.teams.map(({ team_rooms: t }) =>
                t ? (
                  <li key={t.id}>
                    <Link
                      to={`/team/${t.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-tile p-3 transition hover:-translate-y-0.5 active:scale-[0.99]"
                    >
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-[14px] text-[17px] font-extrabold text-white ${teamColor(t.name)}`}
                      >
                        {t.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold">{t.name}</span>
                        <span className="block truncate text-[13px] text-sub">
                          팀원 {t.team_members[0]?.count ?? 1}명{t.description ? ` · ${t.description}` : ''}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          )}
          <Link
            to="/team"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-[14px] bg-tile py-2.5 text-sm font-bold transition hover:bg-black/5"
          >
            <KeyRound className="size-4" />
            방 키로 참여하기
          </Link>
        </Widget>

        {/* 3. 학과 공지 */}
        <Widget title="학과 공지" icon={Megaphone} to="/notice" delay={120} className="lg:col-span-4">
          {!data ? (
            <Skeleton />
          ) : data.announcements.length === 0 ? (
            <EmptyState size="sm" title="아직 등록된 공지가 없어요. 새 공지가 올라오면 여기서 알려드릴게요." />
          ) : (
            <ul className="divide-y divide-black/5">
              {data.announcements.map((a) => (
                <li key={a.id}>
                  <Link to={`/notice?id=${a.id}`} className="flex items-center gap-2 py-3 hover:text-brand-700">
                    {a.is_pinned && <Pin className="size-3.5 shrink-0 fill-current text-brand-600" />}
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{a.title}</span>
                    <span className="shrink-0 text-xs text-sub">{formatDate(a.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        {/* 4. 모집 중인 팀 */}
        <Widget title="모집 중인 팀" icon={UserPlus} to="/community?category=recruit" delay={160} className="md:col-span-1 lg:col-span-8">
          {!data ? (
            <Skeleton />
          ) : data.recruits.length === 0 ? (
            <EmptyState
              size="sm"
              title="모집 중인 팀이 없어요. 함께할 팀원을 먼저 찾아보세요."
              action={
                <Link to="/community/new?category=recruit" className="text-sm font-bold text-brand-600">
                  팀원 모집하기
                </Link>
              }
            />
          ) : (
            <ul className="-mr-5 flex snap-x gap-3 overflow-x-auto pr-5 pb-1 md:mr-0 md:grid md:grid-cols-2 md:overflow-visible md:pr-0">
              {data.recruits.map((r) => (
                <li key={r.id} className="min-w-[78%] snap-start md:min-w-0">
                  <RecruitCard post={r} />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        {/* 5. 정보방 최근 글 */}
        <Widget title="정보방 최근 글" icon={NotebookText} to="/community" delay={200} className="md:col-span-2 lg:col-span-12">
          {!data ? (
            <Skeleton />
          ) : data.posts.length === 0 ? (
            <EmptyState size="sm" title="아직 글이 없어요. 첫 글을 남겨 보세요." />
          ) : (
            <ul className="divide-y divide-black/5">
              {data.posts.map((p) => (
                <li key={p.id}>
                  <Link to={`/community/${p.id}`} className="flex items-center gap-3 py-3 hover:text-brand-700">
                    <span className="shrink-0 rounded-lg bg-tile px-2 py-1 text-xs font-bold text-sub">
                      {CATEGORY_LABEL[p.category]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.title}</span>
                    <span className="hidden shrink-0 text-xs text-sub sm:inline">{postAuthorName(p)}</span>
                    <span className="num inline-flex shrink-0 items-center gap-1 text-xs text-sub">
                      <Heart className="size-3.5" />
                      {p.post_likes?.[0]?.count ?? 0}
                    </span>
                    <span className="num inline-flex shrink-0 items-center gap-1 text-xs text-sub">
                      <MessageCircle className="size-3.5" />
                      {p.comments?.[0]?.count ?? 0}
                    </span>
                    <span className="hidden shrink-0 text-xs text-sub sm:inline">{timeAgo(p.created_at)}</span>
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

/** 다음 일정을 크게 보여주는 파란 카드 */
function HeroSchedule({ schedules }: { schedules: Schedule[] | null }) {
  const next = schedules?.[0]
  const rest = schedules?.slice(1, 3) ?? []
  const todayKey = toDateKey(new Date())
  const ongoing = next ? next.starts_on <= todayKey : false
  const left = next ? daysUntil(next.starts_on) : 0

  return (
    <Link
      to="/notice?tab=calendar"
      className="relative block min-h-[300px] overflow-hidden rounded-[28px] bg-hero p-6 text-white transition active:scale-[0.995] md:min-h-[318px] md:p-8"
    >
      <span className="pointer-events-none absolute -top-20 -right-20 size-[340px] rounded-full bg-white/[0.07]" />
      <Mascot className="pointer-events-none absolute -right-4 -bottom-5 w-[46%] max-w-[300px] drop-shadow-[0_10px_24px_rgb(0_0_0/0.18)] md:-right-1.5 md:-bottom-7" />

      <div className="relative max-w-[60%] md:max-w-[62%]">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/85">
          <CalendarDays className="size-4" />
          다음 일정
          {next && (ongoing || left <= 3) && (
            <span className="rounded-full bg-star px-2.5 py-0.5 text-xs font-bold text-ink">{ongoing ? '진행 중' : '임박'}</span>
          )}
        </p>

        {!schedules ? (
          <div className="mt-4 space-y-3">
            <div className="h-16 w-32 animate-pulse rounded-2xl bg-white/15" />
            <div className="h-6 w-48 animate-pulse rounded-lg bg-white/15" />
          </div>
        ) : !next ? (
          <>
            <p className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">예정된 일정이 없어요</p>
            <p className="mt-2 text-[15px] text-white/85">학과 일정이 등록되면 여기에 가장 먼저 보여드릴게요.</p>
          </>
        ) : (
          <>
            <p className="num mt-3 text-[64px] leading-none font-black tracking-[-0.04em] md:text-[84px]">
              {ongoing ? 'D-day' : dDayLabel(next.starts_on)}
            </p>
            <p className="mt-3 text-xl font-extrabold tracking-[-0.02em] md:text-2xl">{next.title}</p>
            <p className="mt-1.5 text-sm text-white/85 md:text-[15px]">
              {formatDate(next.starts_on)}
              {next.ends_on && next.ends_on !== next.starts_on ? ` ~ ${formatDate(next.ends_on)}` : ''} ·{' '}
              {SCHEDULE_CATEGORY[next.category].label}
            </p>
            {rest.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {rest.map((s) => (
                  <li key={s.id} className="max-w-full truncate rounded-xl bg-white/15 px-3 py-2 text-[13px] font-semibold">
                    <b className="num mr-1.5 text-star">{dDayLabel(s.starts_on) === '마감' ? '진행 중' : dDayLabel(s.starts_on)}</b>
                    {s.title}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Link>
  )
}

/** 모집 글 카드: 노란 '모집중' 배지, 마감 D-day, 분야 태그 */
function RecruitCard({ post }: { post: RecruitRow }) {
  const rec = post.recruitments
  const tags = (rec?.fields ?? '')
    .split(/[,·/]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3)
  return (
    <Link
      to={`/community/${post.id}`}
      className="flex h-full flex-col gap-2.5 rounded-[20px] bg-tile p-4 transition hover:-translate-y-0.5 active:scale-[0.99] md:p-5"
    >
      <span className="flex items-center gap-1.5">
        <span className="rounded-full bg-star px-2.5 py-0.5 text-xs font-bold text-ink">● 모집중</span>
        {rec?.deadline && (
          <span className="num rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-sub">마감 {dDayLabel(rec.deadline)}</span>
        )}
      </span>
      <span className="line-clamp-2 text-[17px] font-extrabold tracking-[-0.02em]">{rec?.project_name ?? post.title}</span>
      {tags.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {t}
            </span>
          ))}
        </span>
      )}
      <span className="mt-auto flex items-center justify-between pt-1 text-[13px] text-sub">
        <span className="num">{rec?.headcount ? `${rec.headcount}명 모집` : '인원 협의'}</span>
        <span className="rounded-xl bg-brand-600 px-3.5 py-2 text-[13px] font-bold text-white">자세히 보기</span>
      </span>
    </Link>
  )
}

function MiniStat({
  to,
  icon: Icon,
  label,
  value,
  unit,
}: {
  to: string
  icon: LucideIcon
  label: string
  value: number | undefined
  unit: string
}) {
  return (
    <Link to={to} className="animate-rise rounded-[22px] bg-white p-4 active:scale-[0.98]" style={{ animationDelay: '80ms' }}>
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-sub">
        <Icon className="size-4 text-brand-600" />
        {label}
      </span>
      <span className="mt-2 block">
        <b className="num text-[28px] font-black tracking-[-0.03em]">{value ?? '–'}</b>
        <span className="ml-0.5 text-[15px] font-bold">{unit}</span>
      </span>
    </Link>
  )
}

function Widget({
  title,
  icon: Icon,
  to,
  delay,
  className = '',
  children,
}: {
  title: string
  icon: LucideIcon
  to: string
  delay: number
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`animate-rise rounded-card bg-white p-5 md:p-[22px] ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-[-0.02em]">
          <Icon className="size-[18px] text-brand-600" />
          {title}
        </h2>
        <Link to={to} className="inline-flex items-center text-[13px] text-sub hover:text-ink">
          전체
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
        <div key={i} className="h-11 animate-pulse rounded-2xl bg-tile" />
      ))}
    </div>
  )
}
