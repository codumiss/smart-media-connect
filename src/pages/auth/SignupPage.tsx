import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toKoreanError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { AuthShell, Field, inputClass, primaryButtonClass } from './AuthShell'

type NicknameState = 'idle' | 'checking' | 'ok' | 'taken'

/**
 * 회원가입
 * 가입하면 모두 일반 회원(student)으로 만들어지고, 관리자는 관리자 화면 또는 SQL 로만 지정합니다.
 * (supabase/migrations/20261126000100_profiles_auth.sql 참고)
 */
export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    studentId: '',
    grade: '1',
    nickname: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [nicknameState, setNicknameState] = useState<NicknameState>('idle')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sentConfirmMail, setSentConfirmMail] = useState(false)

  const update = (key: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'nickname') setNicknameState('idle')
  }

  async function checkNickname() {
    const nickname = form.nickname.trim()
    if (!supabase || nickname.length < 2) return
    setNicknameState('checking')
    const { data, error: rpcError } = await supabase.rpc('is_nickname_available', { p_nickname: nickname })
    if (rpcError) {
      setNicknameState('idle')
      return
    }
    setNicknameState(data ? 'ok' : 'taken')
  }

  function validate() {
    if (form.name.trim().length < 1) return '이름을 입력해 주세요.'
    if (!/^[0-9]{6,12}$/.test(form.studentId.trim())) return '학번은 숫자 6~12자리로 입력해 주세요.'
    if (form.nickname.trim().length < 2 || form.nickname.trim().length > 20) return '닉네임은 2~20자로 입력해 주세요.'
    if (nicknameState === 'taken') return '이미 사용 중인 닉네임이에요.'
    if (form.password.length < 6) return '비밀번호는 6자 이상이어야 해요.'
    if (form.password !== form.passwordConfirm) return '비밀번호가 서로 달라요.'
    return ''
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    setError('')
    setSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          student_id: form.studentId.trim(),
          grade: form.grade,
          nickname: form.nickname.trim(),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    setSubmitting(false)

    if (signUpError) {
      setError(toKoreanError(signUpError))
      return
    }
    // Supabase 에서 이메일 인증을 켜 두었으면 세션 없이 돌아옴 → 메일 확인 안내
    // 인증을 꺼 두었으면 바로 로그인되고 GuestOnly 가 홈으로 이동시킴
    if (!data.session) setSentConfirmMail(true)
  }

  if (sentConfirmMail) {
    return (
      <AuthShell title="메일을 확인해 주세요" description={`${form.email} 로 인증 메일을 보냈어요.`}>
        <p className="text-sm text-slate-600">메일의 링크를 누르면 가입이 끝나고 로그인할 수 있어요.</p>
        <Link to="/login" className={`${primaryButtonClass} mt-5 block text-center`}>
          로그인 화면으로
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="회원가입" description="스마트미디어학과 재학생·졸업생만 가입해 주세요.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="이름">
            <input required className={inputClass} value={form.name} onChange={(e) => update('name')(e.target.value)} />
          </Field>
          <Field label="학년">
            <select className={inputClass} value={form.grade} onChange={(e) => update('grade')(e.target.value)}>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
              <option value="4">4학년</option>
              <option value="">졸업생</option>
            </select>
          </Field>
        </div>

        <Field label="학번">
          <input
            required
            inputMode="numeric"
            className={inputClass}
            value={form.studentId}
            onChange={(e) => update('studentId')(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </Field>

        <Field
          label="닉네임"
          hint={
            nicknameState === 'ok' ? (
              <span className="text-emerald-600">사용할 수 있는 닉네임이에요.</span>
            ) : nicknameState === 'taken' ? (
              <span className="text-red-600">이미 사용 중인 닉네임이에요.</span>
            ) : (
              <span className="text-slate-400">2~20자. 실명 소통에서는 이름, 정보방에서는 닉네임이 보여요.</span>
            )
          }
        >
          <input
            required
            className={inputClass}
            value={form.nickname}
            onChange={(e) => update('nickname')(e.target.value)}
            onBlur={checkNickname}
          />
        </Field>

        <Field label="이메일">
          <input
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            value={form.email}
            onChange={(e) => update('email')(e.target.value)}
          />
        </Field>

        <Field label="비밀번호">
          <input
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
            value={form.password}
            onChange={(e) => update('password')(e.target.value)}
          />
        </Field>
        <Field label="비밀번호 확인">
          <input
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
            value={form.passwordConfirm}
            onChange={(e) => update('passwordConfirm')(e.target.value)}
          />
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" className={primaryButtonClass} disabled={submitting || !supabase}>
          {submitting ? '가입 중…' : '가입하기'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        이미 계정이 있나요?{' '}
        <Link to="/login" className="font-semibold text-brand-600">
          로그인
        </Link>
      </p>
    </AuthShell>
  )
}
