import { LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../lib/auth'

/**
 * 로그인한 사용자 표시
 * - 관리자: '관리자' + 방패 아이콘
 * - 일반 회원: 이름 + 학년
 */
export function UserBadge({ compact = false }: { compact?: boolean }) {
  const { profile, isAdmin, displayName, signOut } = useAuth()
  if (!profile) return null

  const sub = isAdmin ? profile.name : profile.grade ? `${profile.grade}학년` : '졸업생'

  if (compact) {
    return (
      <span
        className={[
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
          isAdmin ? 'bg-slate-900 text-white' : 'bg-brand-50 text-brand-700',
        ].join(' ')}
      >
        {isAdmin && <ShieldCheck className="size-3.5" />}
        {isAdmin ? displayName : `${displayName}님`}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span
        className={[
          'grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold',
          isAdmin ? 'bg-slate-900 text-white' : 'bg-brand-100 text-brand-700',
        ].join(' ')}
      >
        {isAdmin ? <ShieldCheck className="size-4" /> : profile.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{isAdmin ? displayName : `${displayName}님`}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        aria-label="로그아웃"
        title="로그아웃"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}
