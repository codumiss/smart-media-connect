import { Check, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Button, Card, ErrorText, buttonClass } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { dDayLabel, formatDate, timeAgo } from '../../lib/format'
import { db } from '../../lib/supabase'
import type { Recruitment } from './shared'

type Application = {
  id: string
  applicant_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  applicant: { name: string; nickname: string; grade: number | null } | null
}

const STATUS_LABEL = { pending: '대기 중', accepted: '승인됨', rejected: '거절됨' } as const

/** 팀원 모집 정보 + 신청(신청자) / 신청자 관리(작성자) */
export function RecruitPanel({
  recruitment,
  isOwner,
  onChange,
}: {
  recruitment: Recruitment
  isOwner: boolean
  onChange: () => void
}) {
  const { profile } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    // 작성자는 모든 신청을, 다른 학생은 자기 신청만 조회됨 (RLS)
    const { data } = await db()
      .from('applications')
      .select(
        'id, applicant_id, message, status, created_at, applicant:profiles!applications_applicant_id_fkey(name, nickname, grade)',
      )
      .eq('recruitment_id', recruitment.post_id)
      .order('created_at')
    setApplications((data as Application[] | null) ?? [])
  }, [recruitment.post_id])

  useEffect(() => {
    void load()
  }, [load])

  const myApplication = applications.find((a) => a.applicant_id === profile?.id)
  const acceptedCount = applications.filter((a) => a.status === 'accepted').length
  const isOpen = recruitment.status === 'open'

  async function run(task: () => PromiseLike<{ error: unknown }>, after?: () => void) {
    setBusy(true)
    setError('')
    const { error: taskError } = await task()
    setBusy(false)
    if (taskError) {
      setError(toKoreanError(taskError))
      return
    }
    after?.()
    await load()
  }

  const rows: [string, string | null][] = [
    ['프로젝트', recruitment.project_name],
    ['모집 분야', recruitment.fields],
    ['모집 인원', recruitment.headcount ? `${recruitment.headcount}명` : null],
    ['필요 역량', recruitment.skills],
    ['진행 방식', recruitment.method],
    ['마감일', recruitment.deadline ? `${formatDate(recruitment.deadline)} (${dDayLabel(recruitment.deadline)})` : null],
  ]

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">모집 정보</h2>
        <span
          className={[
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            isOpen ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500',
          ].join(' ')}
        >
          {isOpen ? '모집 중' : '모집 마감'}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-16 shrink-0 text-slate-400">{k}</dt>
              <dd className="text-slate-700">{v}</dd>
            </div>
          ))}
      </dl>

      {recruitment.team_room_id && (isOwner || myApplication?.status === 'accepted') && (
        <Link to={`/team/${recruitment.team_room_id}`} className={`${buttonClass('secondary', 'sm')} mt-4`}>
          <Users className="size-4" />
          팀룸으로 가기
        </Link>
      )}

      <div className="mt-5 border-t border-slate-100 pt-5">
        {isOwner ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                신청자 {applications.length}명
                <span className="ml-1 font-normal text-slate-400">(승인 {acceptedCount}명)</span>
              </h3>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      db()
                        .from('recruitments')
                        .update({ status: isOpen ? 'closed' : 'open' })
                        .eq('post_id', recruitment.post_id),
                    onChange,
                  )
                }
              >
                {isOpen ? '모집 마감하기' : '다시 모집하기'}
              </Button>
            </div>
            {applications.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">아직 신청자가 없어요.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {applications.map((app) => (
                  <li key={app.id} className="flex animate-rise items-start gap-3 rounded-xl bg-tile p-3">
                    <Avatar name={app.applicant?.name ?? '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {app.applicant?.name}
                        <span className="ml-1 font-normal text-slate-400">
                          @{app.applicant?.nickname} · {app.applicant?.grade ? `${app.applicant.grade}학년` : '졸업생'}
                        </span>
                      </p>
                      {app.message && <p className="mt-0.5 text-sm text-slate-600">{app.message}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">{timeAgo(app.created_at)}</p>
                    </div>
                    {app.status === 'pending' ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              db().rpc('respond_application', { p_application_id: app.id, p_accept: false }),
                            )
                          }
                        >
                          거절
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void run(() => db().rpc('respond_application', { p_application_id: app.id, p_accept: true }))
                          }
                        >
                          승인
                        </Button>
                      </div>
                    ) : (
                      <span
                        className={[
                          'shrink-0 animate-pop rounded-full px-2 py-0.5 text-xs font-semibold',
                          app.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                        ].join(' ')}
                      >
                        {STATUS_LABEL[app.status]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : myApplication ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                내 신청: <span className={myApplication.status === 'accepted' ? 'text-emerald-600' : ''}>
                  {STATUS_LABEL[myApplication.status]}
                </span>
              </p>
              {myApplication.status === 'accepted' && recruitment.team_room_id && (
                <p className="text-xs text-slate-500">팀룸에 자동으로 참여했어요.</p>
              )}
            </div>
            {myApplication.status === 'pending' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void run(() => db().from('applications').delete().eq('id', myApplication.id))}
              >
                신청 취소
              </Button>
            )}
          </div>
        ) : isOpen ? (
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="간단한 소개 (할 수 있는 것, 참여하고 싶은 이유)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 md:text-sm"
            />
            <Button
              className="mt-2 w-full"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    db()
                      .from('applications')
                      .insert({ recruitment_id: recruitment.post_id, message: message.trim() || null }),
                  () => setMessage(''),
                )
              }
            >
              <Check className="size-4" />
              참여 신청
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">모집이 마감됐어요.</p>
        )}
      </div>

      <div className="mt-3">
        <ErrorText>{error}</ErrorText>
      </div>
    </Card>
  )
}
