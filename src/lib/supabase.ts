import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** .env.local 에 Supabase 값이 들어 있는지 여부 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('[supabase] .env.local 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 설정하세요.')
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * 로그인한 화면(RequireAuth 안쪽)에서 쓰는 클라이언트.
 * 로그인 화면을 통과했다면 Supabase 설정이 되어 있으므로 null 체크 없이 사용할 수 있음.
 */
export function db() {
  if (!supabase) throw new Error('Supabase 설정이 없습니다. .env.local 을 확인하세요.')
  return supabase
}
