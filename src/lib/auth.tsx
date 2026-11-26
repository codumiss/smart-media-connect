import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Profile } from './types'

type AuthState = {
  session: Session | null
  profile: Profile | null
  /** 세션과 프로필 확인이 끝났는지 (false 동안은 로딩 화면) */
  ready: boolean
  isAdmin: boolean
  /** 화면에 표시할 이름: 관리자는 '관리자', 일반 회원은 이름 */
  displayName: string
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export async function fetchProfile(userId: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, nickname, grade, avatar_url, role, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) console.error('[auth] 프로필 조회 실패', error)
  return (data as Profile | null) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessionChecked, setSessionChecked] = useState(!supabase)
  // 어떤 사용자 id 의 프로필까지 불러왔는지 (로그인 직후 프로필이 오기 전 깜빡임 방지)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      setLoadedFor(null)
      return
    }
    const next = await fetchProfile(userId)
    setProfile(next)
    setLoadedFor(userId)
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionChecked(true)
      void loadProfile(data.session?.user.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      // 이 콜백 안에서 바로 Supabase 를 호출하면 멈출 수 있어서 다음 틱으로 미룸
      setTimeout(() => {
        if (active) void loadProfile(nextSession?.user.id)
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const ready = sessionChecked && (!session || loadedFor === session.user.id)
  const isAdmin = profile?.role === 'admin'

  const value: AuthState = {
    session,
    profile,
    ready,
    isAdmin,
    displayName: isAdmin ? '관리자' : (profile?.name ?? ''),
    refreshProfile: async () => {
      await loadProfile(session?.user.id)
    },
    signOut: async () => {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다.')
  return context
}
