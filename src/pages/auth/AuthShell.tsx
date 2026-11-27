import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LogoBadge } from '../../components/brand/Logo'
import { isSupabaseConfigured } from '../../lib/supabase'

/** 로그인·회원가입 화면 공통 틀 */
export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/welcome" className="inline-flex animate-pop flex-col items-center" title="소개 화면으로">
            <LogoBadge className="size-16" />
            <span className="mt-3 text-sm font-extrabold tracking-tight text-ink">SMART MEDIA CONNECT</span>
            <span className="text-[11px] text-sub italic">jj univ smart media</span>
          </Link>
          <h1 className="mt-6 animate-rise text-2xl font-bold [animation-delay:80ms]">{title}</h1>
          <p className="mt-1 animate-rise text-sm text-slate-500 [animation-delay:140ms]">{description}</p>
        </div>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Supabase 설정이 없어요. <code>.env.local</code> 파일을 만들어 주세요. (README 참고)
          </p>
        )}

        <div className="animate-rise rounded-card bg-white p-5 [animation-delay:200ms] md:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs">{hint}</div>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 md:text-sm'

export const primaryButtonClass =
  'w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
