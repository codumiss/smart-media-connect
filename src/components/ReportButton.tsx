import { Flag } from 'lucide-react'
import { useState } from 'react'
import { toKoreanError } from '../lib/errors'
import { db } from '../lib/supabase'
import { REPORT_REASON_LABEL, type ReportReason, type ReportTargetType } from '../lib/types'

/**
 * 신고 버튼 — 게시글·댓글·채팅 메시지 어디에든 붙여서 사용
 *   <ReportButton targetType="post" targetId={post.id} />
 * 신고하면 관리자에게 바로 알림이 가고, 3명 이상 신고하면 자동 숨김 처리됨
 */
export function ReportButton({
  targetType,
  targetId,
  className = '',
}: {
  targetType: ReportTargetType
  targetId: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('abuse')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function close() {
    setOpen(false)
    setResult(null)
    setDetail('')
    setReason('abuse')
  }

  async function submit() {
    setSubmitting(true)
    const { error } = await db()
      .from('reports')
      .insert({ target_type: targetType, target_id: targetId, reason, detail: detail.trim() || null })
    setSubmitting(false)
    if (error) {
      setResult({ ok: false, message: error.code === '23505' ? '이미 신고한 내용이에요.' : toKoreanError(error) })
      return
    }
    setResult({ ok: true, message: '신고가 접수됐어요. 관리자가 확인할게요.' })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 ${className}`}
      >
        <Flag className="size-3.5" />
        신고
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center md:p-4" onClick={close}>
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">신고하기</h2>

            {result ? (
              <>
                <p className={`mt-3 text-sm ${result.ok ? 'text-slate-700' : 'text-red-600'}`}>{result.message}</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white"
                >
                  확인
                </button>
              </>
            ) : (
              <>
                <div className="mt-4 space-y-2">
                  {(Object.keys(REPORT_REASON_LABEL) as ReportReason[]).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="report-reason"
                        checked={reason === key}
                        onChange={() => setReason(key)}
                        className="accent-red-500"
                      />
                      {REPORT_REASON_LABEL[key]}
                    </label>
                  ))}
                </div>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="자세한 내용 (선택)"
                  className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-red-400 md:text-sm"
                />
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={close} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm">
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void submit()}
                    className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {submitting ? '접수 중…' : '신고'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
