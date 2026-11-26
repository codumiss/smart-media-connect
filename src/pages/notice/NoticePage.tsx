import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Megaphone, Pin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, EmptyState, PageHeader, Spinner, Tabs } from '../../components/ui'
import { dDayLabel, formatDate, toDateKey } from '../../lib/format'
import { SCHEDULE_CATEGORY, isOnDate, type Announcement, type Schedule } from '../../lib/schedule'
import { db } from '../../lib/supabase'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function NoticePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'calendar' ? 'calendar' : 'notice'
  const openId = params.get('id')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = db()
    void Promise.all([
      client
        .from('announcements')
        .select('id, title, body, is_pinned, created_at, updated_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      client
        .from('schedules')
        .select('id, title, description, category, starts_on, ends_on, announcement_id')
        .order('starts_on'),
    ]).then(([a, s]) => {
      setAnnouncements((a.data as Announcement[] | null) ?? [])
      setSchedules((s.data as Schedule[] | null) ?? [])
      setLoading(false)
    })
  }, [])

  const showAnnouncement = (id: string) => setParams({ id })

  return (
    <section>
      <PageHeader title="학과 일정" description="학과 공지사항과 학사 일정" icon={CalendarDays} />
      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={(value) => setParams(value === 'calendar' ? { tab: 'calendar' } : {})}
          items={[
            { value: 'notice', label: '공지사항' },
            { value: 'calendar', label: '캘린더' },
          ]}
        />
      </div>
      <div className="mt-4">
        {loading ? (
          <Spinner />
        ) : tab === 'notice' ? (
          <AnnouncementList
            items={announcements}
            openId={openId}
            onToggle={(id) => setParams(id === openId ? {} : { id })}
            schedules={schedules}
          />
        ) : (
          <Calendar schedules={schedules} onOpenAnnouncement={showAnnouncement} />
        )}
      </div>
    </section>
  )
}

function AnnouncementList({
  items,
  openId,
  onToggle,
  schedules,
}: {
  items: Announcement[]
  openId: string | null
  onToggle: (id: string) => void
  schedules: Schedule[]
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={Megaphone} title="등록된 공지가 없어요." />
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {items.map((item, i) => {
          const open = item.id === openId
          const linked = schedules.filter((s) => s.announcement_id === item.id)
          return (
            <li key={item.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 md:px-5"
              >
                {item.is_pinned ? (
                  <Pin className="size-4 shrink-0 fill-current text-brand-600" />
                ) : (
                  <Megaphone className="size-4 shrink-0 text-slate-300" />
                )}
                <span className={`min-w-0 flex-1 truncate ${item.is_pinned ? 'font-semibold' : 'font-medium'}`}>
                  {item.title}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(item.created_at)}</span>
                <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-5 md:px-5 md:pl-12">
                    <p className="leading-relaxed whitespace-pre-wrap text-slate-700">{item.body}</p>
                    {linked.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {linked.map((s) => (
                          <span
                            key={s.id}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${SCHEDULE_CATEGORY[s.category].chip}`}
                          >
                            <CalendarDays className="size-3.5" />
                            {s.title} · {formatDate(s.starts_on)} ({dDayLabel(s.starts_on)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Calendar({ schedules, onOpenAnnouncement }: { schedules: Schedule[]; onOpenAnnouncement: (id: string) => void }) {
  const todayKey = toDateKey(new Date())
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState(todayKey)

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [month])

  const move = (diff: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + diff, 1))
  const selectedItems = schedules.filter((s) => isOnDate(s, selected))
  const upcoming = schedules.filter((s) => (s.ends_on ?? s.starts_on) >= todayKey).slice(0, 5)

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="이전 달" onClick={() => move(-1)} className="rounded-lg p-1.5 hover:bg-slate-100">
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-bold">
            {month.getFullYear()}년 {month.getMonth() + 1}월
          </p>
          <button type="button" aria-label="다음 달" onClick={() => move(1)} className="rounded-lg p-1.5 hover:bg-slate-100">
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-xs font-medium text-slate-400">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}>
              {w}
            </span>
          ))}
        </div>
        <div key={month.toISOString()} className="mt-1 grid animate-page grid-cols-7 gap-0.5">
          {days.map((d) => {
            const key = toDateKey(d)
            const inMonth = d.getMonth() === month.getMonth()
            const items = schedules.filter((s) => isOnDate(s, key))
            const isToday = key === todayKey
            const isSelected = key === selected
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={[
                  'flex aspect-square flex-col items-center rounded-xl pt-1.5 text-sm transition md:aspect-auto md:h-16',
                  isSelected ? 'bg-brand-600 text-white' : 'hover:bg-slate-100',
                  inMonth ? '' : 'opacity-30',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-6 place-items-center rounded-full text-[13px]',
                    isToday && !isSelected ? 'bg-brand-100 font-bold text-brand-700' : '',
                  ].join(' ')}
                >
                  {d.getDate()}
                </span>
                <span className="mt-1 flex gap-0.5">
                  {items.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      className={`size-1.5 rounded-full ${isSelected ? 'bg-white' : SCHEDULE_CATEGORY[s.category].dot}`}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          {Object.values(SCHEDULE_CATEGORY).map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1">
              <span className={`size-2 rounded-full ${c.dot}`} />
              {c.label}
            </span>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4 md:p-5">
          <p className="font-semibold">{formatDate(selected)}</p>
          {selectedItems.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">일정이 없어요.</p>
          ) : (
            <ul key={selected} className="mt-3 space-y-2">
              {selectedItems.map((s) => (
                <ScheduleItem key={s.id} schedule={s} onOpenAnnouncement={onOpenAnnouncement} />
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4 md:p-5">
          <p className="font-semibold">다가오는 일정</p>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">예정된 일정이 없어요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map((s) => (
                <ScheduleItem key={s.id} schedule={s} onOpenAnnouncement={onOpenAnnouncement} showDate />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function ScheduleItem({
  schedule: s,
  onOpenAnnouncement,
  showDate = false,
}: {
  schedule: Schedule
  onOpenAnnouncement: (id: string) => void
  showDate?: boolean
}) {
  const cat = SCHEDULE_CATEGORY[s.category]
  return (
    <li className="flex animate-rise gap-3 rounded-xl bg-slate-50 p-3">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${cat.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{s.title}</p>
        <p className="text-xs text-slate-500">
          {cat.label}
          {showDate && ` · ${formatDate(s.starts_on)}${s.ends_on && s.ends_on !== s.starts_on ? ` ~ ${formatDate(s.ends_on)}` : ''}`}
        </p>
        {s.description && <p className="mt-1 text-xs text-slate-600">{s.description}</p>}
        {s.announcement_id && (
          <button
            type="button"
            onClick={() => onOpenAnnouncement(s.announcement_id!)}
            className="mt-1 text-xs font-semibold text-brand-600"
          >
            관련 공지 보기
          </button>
        )}
      </div>
      <span className="shrink-0 text-xs font-semibold text-slate-500">{dDayLabel(s.starts_on)}</span>
    </li>
  )
}
