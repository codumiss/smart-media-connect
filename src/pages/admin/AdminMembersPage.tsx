import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { db } from '../../lib/supabase'
import type { Profile, Role } from '../../lib/types'

type MemberRow = Profile & { profile_private: { student_id: string | null; email: string | null } | null }

export default function AdminMembersPage() {
  const { profile: me } = useAuth()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await db()
      .from('profiles')
      .select('id, name, nickname, grade, avatar_url, role, created_at, profile_private(student_id, email)')
      .order('created_at', { ascending: false })
    if (loadError) setError(toKoreanError(loadError))
    setMembers((data as MemberRow[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      [m.name, m.nickname, m.profile_private?.student_id, m.profile_private?.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [members, keyword])

  async function changeRole(member: MemberRow, role: Role) {
    const message =
      role === 'admin' ? `${member.name}님을 관리자로 지정할까요?` : `${member.name}님의 관리자 권한을 해제할까요?`
    if (!window.confirm(message)) return
    setError('')
    const { error: rpcError } = await db().rpc('set_user_role', { p_user_id: member.id, p_role: role })
    if (rpcError) {
      setError(toKoreanError(rpcError))
      return
    }
    await load()
  }

  return (
    <section>
      <h1 className="text-xl font-bold md:text-2xl">회원 관리</h1>
      <p className="mt-1 text-sm text-slate-500">관리자 지정·해제를 할 수 있어요. 학번과 이메일은 관리자에게만 보여요.</p>

      <div className="relative mt-5">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="이름, 닉네임, 학번, 이메일 검색"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-base outline-none focus:border-brand-500 md:text-sm"
        />
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">회원이 없어요.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {member.name}
                    <span className="ml-1.5 text-slate-400">@{member.nickname}</span>
                    {member.role === 'admin' && (
                      <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                        관리자
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {member.grade ? `${member.grade}학년` : '졸업생'}
                    {member.profile_private?.student_id ? ` · ${member.profile_private.student_id}` : ''}
                    {member.profile_private?.email ? ` · ${member.profile_private.email}` : ''}
                  </p>
                </div>
                {member.id !== me?.id &&
                  (member.role === 'admin' ? (
                    <button
                      type="button"
                      onClick={() => void changeRole(member, 'student')}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
                    >
                      관리자 해제
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void changeRole(member, 'admin')}
                      className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      관리자 지정
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
