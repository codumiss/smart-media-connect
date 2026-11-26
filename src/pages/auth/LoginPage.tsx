import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toKoreanError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { AuthShell, Field, inputClass, primaryButtonClass } from './AuthShell'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setError('')
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)
    if (signInError) setError(toKoreanError(signInError))
    // 성공하면 GuestOnly 가 역할(관리자/일반)에 맞는 화면으로 이동시킴
  }

  return (
    <AuthShell title="로그인" description="스마트미디어학과 구성원 전용 서비스예요.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="이메일">
          <input
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="비밀번호">
          <input
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" className={primaryButtonClass} disabled={submitting || !supabase}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        처음이신가요?{' '}
        <Link to="/signup" className="font-semibold text-brand-600">
          회원가입
        </Link>
      </p>
    </AuthShell>
  )
}
