export type ScheduleCategory = 'academic' | 'exam' | 'event' | 'council' | 'deadline'

export type Schedule = {
  id: string
  title: string
  description: string | null
  category: ScheduleCategory
  starts_on: string
  ends_on: string | null
  announcement_id: string | null
}

export type Announcement = {
  id: string
  title: string
  body: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export const SCHEDULE_CATEGORY: Record<ScheduleCategory, { label: string; dot: string; chip: string }> = {
  academic: { label: '학사', dot: 'bg-brand-500', chip: 'bg-brand-50 text-brand-700' },
  exam: { label: '시험', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700' },
  event: { label: '행사', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  council: { label: '학생회', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  deadline: { label: '마감', dot: 'bg-slate-800', chip: 'bg-slate-100 text-slate-700' },
}

/** 일정이 그 날짜에 걸쳐 있는지 (dateKey: 'YYYY-MM-DD') */
export function isOnDate(schedule: Schedule, dateKey: string) {
  const end = schedule.ends_on ?? schedule.starts_on
  return schedule.starts_on <= dateKey && dateKey <= end
}
