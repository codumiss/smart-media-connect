import { CalendarDays, Megaphone, Pencil, Pin, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button, Card, EmptyState, ErrorText, Field, Tabs, inputClass } from '../../components/ui'
import { toKoreanError } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { SCHEDULE_CATEGORY, type Announcement, type Schedule, type ScheduleCategory } from '../../lib/schedule'
import { db } from '../../lib/supabase'

/** 관리자: 학과 공지 · 학사 일정 등록/수정/삭제 */
export default function AdminNoticesPage() {
  const [tab, setTab] = useState<'notice' | 'schedule'>('notice')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const load = useCallback(async () => {
    const client = db()
    const [a, s] = await Promise.all([
      client
        .from('announcements')
        .select('id, title, body, is_pinned, created_at, updated_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      client.from('schedules').select('id, title, description, category, starts_on, ends_on, announcement_id').order('starts_on'),
    ])
    setAnnouncements((a.data as Announcement[] | null) ?? [])
    setSchedules((s.data as Schedule[] | null) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section>
      <h1 className="text-xl font-bold md:text-2xl">공지·일정 관리</h1>
      <p className="mt-1 text-sm text-slate-500">여기서 등록한 공지와 일정은 학과 일정 화면과 홈에 바로 보여요.</p>
      <div className="mt-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'notice', label: `공지 ${announcements.length}` },
            { value: 'schedule', label: `학사 일정 ${schedules.length}` },
          ]}
        />
      </div>
      <div className="mt-4">
        {tab === 'notice' ? (
          <AnnouncementManager items={announcements} onChange={load} />
        ) : (
          <ScheduleManager items={schedules} announcements={announcements} onChange={load} />
        )}
      </div>
    </section>
  )
}

function AnnouncementManager({ items, onChange }: { items: Announcement[]; onChange: () => Promise<void> }) {
  const empty = { title: '', body: '', isPinned: false }
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setBusy(true)
    const values = { title: form.title.trim(), body: form.body.trim(), is_pinned: form.isPinned }
    const { error: saveError } = editingId
      ? await db().from('announcements').update(values).eq('id', editingId)
      : await db().from('announcements').insert(values)
    setBusy(false)
    if (saveError) {
      setError(toKoreanError(saveError))
      return
    }
    setForm(empty)
    setEditingId(null)
    setError('')
    await onChange()
  }

  async function remove(id: string) {
    if (!window.confirm('공지를 삭제할까요?')) return
    await db().from('announcements').delete().eq('id', id)
    await onChange()
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-3">
          <h2 className="font-semibold">{editingId ? '공지 수정' : '새 공지'}</h2>
          <Field label="제목">
            <input className={inputClass} maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="내용">
            <textarea
              className={`${inputClass} min-h-32`}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
              className="size-4 accent-brand-600"
            />
            상단 고정 (중요 공지)
          </label>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            {editingId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null)
                  setForm(empty)
                }}
              >
                취소
              </Button>
            )}
            <Button type="submit" disabled={busy || !form.title.trim() || !form.body.trim()}>
              {editingId ? '수정' : '등록'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState icon={Megaphone} title="등록된 공지가 없어요." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                {item.is_pinned ? (
                  <Pin className="size-4 shrink-0 fill-current text-brand-600" />
                ) : (
                  <Megaphone className="size-4 shrink-0 text-slate-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(item.created_at)}</p>
                </div>
                <button
                  type="button"
                  aria-label="수정"
                  onClick={() => {
                    setEditingId(item.id)
                    setForm({ title: item.title, body: item.body, isPinned: item.is_pinned })
                    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => void remove(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function ScheduleManager({
  items,
  announcements,
  onChange,
}: {
  items: Schedule[]
  announcements: Announcement[]
  onChange: () => Promise<void>
}) {
  const empty = { title: '', description: '', category: 'academic' as ScheduleCategory, startsOn: '', endsOn: '', announcementId: '' }
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim() || !form.startsOn) return
    setBusy(true)
    const values = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      starts_on: form.startsOn,
      ends_on: form.endsOn || null,
      announcement_id: form.announcementId || null,
    }
    const { error: saveError } = editingId
      ? await db().from('schedules').update(values).eq('id', editingId)
      : await db().from('schedules').insert(values)
    setBusy(false)
    if (saveError) {
      setError(toKoreanError(saveError))
      return
    }
    setForm(empty)
    setEditingId(null)
    setError('')
    await onChange()
  }

  async function remove(id: string) {
    if (!window.confirm('일정을 삭제할까요?')) return
    await db().from('schedules').delete().eq('id', id)
    await onChange()
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-3">
          <h2 className="font-semibold">{editingId ? '일정 수정' : '새 일정'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="일정 이름">
              <input className={inputClass} maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="분류">
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ScheduleCategory })}
              >
                {(Object.keys(SCHEDULE_CATEGORY) as ScheduleCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {SCHEDULE_CATEGORY[key].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="시작일">
              <input type="date" className={inputClass} value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} />
            </Field>
            <Field label="종료일" hint="하루짜리 일정이면 비워 두세요">
              <input
                type="date"
                className={inputClass}
                min={form.startsOn || undefined}
                value={form.endsOn}
                onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
              />
            </Field>
          </div>
          <Field label="설명">
            <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="관련 공지" hint="연결하면 공지에 일정이, 캘린더에 '관련 공지 보기'가 표시돼요">
            <select
              className={inputClass}
              value={form.announcementId}
              onChange={(e) => setForm({ ...form, announcementId: e.target.value })}
            >
              <option value="">연결 안 함</option>
              {announcements.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </Field>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            {editingId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null)
                  setForm(empty)
                }}
              >
                취소
              </Button>
            )}
            <Button type="submit" disabled={busy || !form.title.trim() || !form.startsOn}>
              {editingId ? '수정' : '등록'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="등록된 일정이 없어요." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className={`size-2.5 shrink-0 rounded-full ${SCHEDULE_CATEGORY[s.category].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-slate-400">
                    {SCHEDULE_CATEGORY[s.category].label} · {formatDate(s.starts_on)}
                    {s.ends_on && s.ends_on !== s.starts_on ? ` ~ ${formatDate(s.ends_on)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="수정"
                  onClick={() => {
                    setEditingId(s.id)
                    setForm({
                      title: s.title,
                      description: s.description ?? '',
                      category: s.category,
                      startsOn: s.starts_on,
                      endsOn: s.ends_on ?? '',
                      announcementId: s.announcement_id ?? '',
                    })
                    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => void remove(s.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
