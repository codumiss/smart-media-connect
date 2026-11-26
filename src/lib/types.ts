/** DB 테이블 구조는 supabase/migrations 의 SQL 이 기준입니다. */

export type Role = 'student' | 'admin'

export type Profile = {
  id: string
  name: string
  nickname: string
  grade: number | null
  avatar_url: string | null
  role: Role
  created_at: string
}

export type ReportTargetType = 'post' | 'comment' | 'message'
export type ReportReason = 'abuse' | 'spam' | 'sexual' | 'privacy' | 'etc'
export type ReportStatus = 'pending' | 'resolved' | 'dismissed'

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  abuse: '욕설·비방',
  spam: '도배·광고',
  sexual: '음란·선정성',
  privacy: '개인정보 노출',
  etc: '기타',
}

export const REPORT_TARGET_LABEL: Record<ReportTargetType, string> = {
  post: '게시글',
  comment: '댓글',
  message: '채팅',
}

export type Report = {
  id: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  detail: string | null
  reporter_id: string
  status: ReportStatus
  handled_by: string | null
  handled_at: string | null
  created_at: string
}
