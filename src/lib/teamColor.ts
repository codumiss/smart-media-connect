/** 팀룸 첫 글자 칸 색 — 이름으로 정해져서 어느 화면에서나 같은 색 */
const TEAM_COLORS = ['bg-brand-600', 'bg-amber-500', 'bg-emerald-600', 'bg-rose-500', 'bg-violet-600']

export function teamColor(name: string) {
  return TEAM_COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TEAM_COLORS.length]
}
