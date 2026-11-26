import { LogOut, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { db } from '../../lib/supabase'

// TODO: 프로필 수정, 내 활동 내역 (내 글·댓글·참여 중인 팀룸)
export default function MyPage() {
  const { profile, isAdmin, displayName, signOut } = useAuth()
  const [privateInfo, setPrivateInfo] = useState<{ student_id: string | null; email: string | null } | null>(null)

  useEffect(() => {
    if (!profile) return
    void db()
      .from('profile_private')
      .select('student_id, email')
      .eq('id', profile.id)
      .maybeSingle()
      .then(({ data }) => setPrivateInfo(data))
  }, [profile])

  if (!profile) return null

  const rows = [
    ['이름', profile.name],
    ['닉네임', profile.nickname],
    ['학년', profile.grade ? `${profile.grade}학년` : '졸업생'],
    ['학번', privateInfo?.student_id ?? '-'],
    ['이메일', privateInfo?.email ?? '-'],
  ]

  return (
    <section>
      <h1 className="text-xl font-bold md:text-2xl">마이페이지</h1>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span
            className={[
              'grid size-12 place-items-center rounded-full text-lg font-bold',
              isAdmin ? 'bg-slate-900 text-white' : 'bg-brand-100 text-brand-700',
            ].join(' ')}
          >
            {isAdmin ? <ShieldCheck className="size-5" /> : profile.name.slice(0, 1)}
          </span>
          <div>
            <p className="text-lg font-bold">{isAdmin ? displayName : `${displayName}님`}</p>
            <p className="text-sm text-slate-500">{isAdmin ? '관리자 계정' : '일반 회원'}</p>
          </div>
        </div>

        <dl className="mt-5 divide-y divide-slate-100 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {isAdmin && (
            <Link to="/admin" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              관리자 화면
            </Link>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            <LogOut className="size-4" />
            로그아웃
          </button>
        </div>
      </div>
    </section>
  )
}
