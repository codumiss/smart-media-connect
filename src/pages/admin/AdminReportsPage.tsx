import { useCallback, useEffect, useState } from 'react'
import { useAdminAlerts } from '../../lib/adminAlerts'
import { toKoreanError } from '../../lib/errors'
import { db } from '../../lib/supabase'
import { REPORT_REASON_LABEL, REPORT_TARGET_LABEL, type Report, type ReportStatus } from '../../lib/types'

type ReportRow = Report & { reporter: { name: string; nickname: string } | null }

type ReportDetail = {
  content: string | null
  is_hidden: boolean | null
  author_name: string | null
  author_nick: string | null
  report_count: number
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: '대기',
  resolved: '조치 완료',
  dismissed: '문제 없음',
}

const STATUS_CLASS: Record<ReportStatus, string> = {
  pending: 'bg-red-50 text-red-700',
  resolved: 'bg-slate-900 text-white',
  dismissed: 'bg-slate-100 text-slate-600',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminReportsPage() {
  const { pendingCount, refresh: refreshCount } = useAdminAlerts()
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ReportRow | null>(null)
  const [detail, setDetail] = useState<ReportDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let query = db()
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(name, nickname)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (filter === 'pending') query = query.eq('status', 'pending')
    const { data, error: loadError } = await query
    if (loadError) setError(toKoreanError(loadError))
    setReports((data as ReportRow[] | null) ?? [])
    setLoading(false)
  }, [filter])

  // 새 신고가 들어와 대기 건수가 바뀌면 목록도 다시 불러옴
  useEffect(() => {
    void load()
  }, [load, pendingCount])

  async function openDetail(report: ReportRow) {
    setSelected(report)
    setDetail(null)
    setError('')
    const { data, error: rpcError } = await db().rpc('admin_report_detail', { p_report_id: report.id })
    if (rpcError) {
      setError(toKoreanError(rpcError))
      return
    }
    setDetail(((data as ReportDetail[] | null) ?? [])[0] ?? null)
  }

  async function handle(status: 'resolved' | 'dismissed') {
    if (!selected) return
    setBusy(true)
    setError('')
    const { error: rpcError } = await db().rpc('handle_report', {
      p_report_id: selected.id,
      p_status: status,
      p_hide: true,
    })
    setBusy(false)
    if (rpcError) {
      setError(toKoreanError(rpcError))
      return
    }
    setSelected(null)
    await Promise.all([load(), refreshCount()])
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">신고 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            같은 대상에 신고가 3건 이상 쌓이면 자동으로 숨김 처리돼요. 익명 글도 실제 작성자를 확인할 수 있어요.
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-200 p-1 text-sm">
          {(['pending', 'all'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={[
                'rounded-md px-3 py-1.5 font-medium',
                filter === value ? 'bg-white shadow-sm' : 'text-slate-600',
              ].join(' ')}
            >
              {value === 'pending' ? `대기 ${pendingCount}` : '전체'}
            </button>
          ))}
        </div>
      </div>

      {error && !selected && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : reports.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">
            {filter === 'pending' ? '처리할 신고가 없어요.' : '신고 내역이 없어요.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => void openDetail(report)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
                >
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[report.status]}`}>
                    {STATUS_LABEL[report.status]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {REPORT_TARGET_LABEL[report.target_type]} · {REPORT_REASON_LABEL[report.reason]}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      신고자 {report.reporter?.name ?? '알 수 없음'}
                      {report.detail ? ` · ${report.detail}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(report.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 md:rounded-2xl md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{formatDate(selected.created_at)}</p>
                <h2 className="mt-1 text-lg font-bold">
                  {REPORT_TARGET_LABEL[selected.target_type]} 신고 · {REPORT_REASON_LABEL[selected.reason]}
                </h2>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            {selected.detail && <p className="mt-3 text-sm text-slate-600">신고 내용: {selected.detail}</p>}

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              {detail ? (
                <>
                  <p className="text-xs font-semibold text-slate-500">
                    실제 작성자: {detail.author_name ? `${detail.author_name} (${detail.author_nick})` : '삭제된 사용자'}
                    {' · '}누적 신고 {detail.report_count}건{detail.is_hidden ? ' · 현재 숨김 상태' : ''}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{detail.content ?? '(이미 삭제된 내용이에요)'}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400">불러오는 중…</p>
              )}
            </div>

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                닫기
              </button>
              {selected.status === 'pending' && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handle('dismissed')}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    문제 없음
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handle('resolved')}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    숨김 처리
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
