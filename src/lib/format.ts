/** 날짜·시간 표시 */

/** 방금 전 / 5분 전 / 3시간 전 / 2일 전 / 11월 3일 */
export function timeAgo(value: string) {
  const diff = (Date.now() - new Date(value).getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return formatDate(value)
}

/** 11월 3일 (해가 다르면 2025년 11월 3일) */
export function formatDate(value: string) {
  const date = new Date(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('ko-KR', { year: sameYear ? undefined : 'numeric', month: 'long', day: 'numeric' })
}

/** 11월 3일 (목) 오후 7:00 */
export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** 오후 7:05 */
export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

/** 로컬 날짜를 'YYYY-MM-DD' 로 (DB date 칸과 비교용) */
export function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'YYYY-MM-DD' 까지 남은 날 (오늘 0, 지났으면 음수) */
export function daysUntil(dateKey: string) {
  const today = new Date(toDateKey(new Date()))
  return Math.round((new Date(dateKey).getTime() - today.getTime()) / 86400000)
}

export function dDayLabel(dateKey: string) {
  const d = daysUntil(dateKey)
  if (d === 0) return 'D-day'
  return d > 0 ? `D-${d}` : '마감'
}
