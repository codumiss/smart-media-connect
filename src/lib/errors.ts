/** Supabase 오류 메시지를 화면에 보여줄 한국어 문장으로 바꿉니다. */
export function toKoreanError(error: unknown): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error)
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않아요.'
  if (message.includes('Email not confirmed')) return '이메일 인증이 아직 안 됐어요. 메일함을 확인해 주세요.'
  if (message.includes('User already registered')) return '이미 가입된 이메일이에요.'
  if (message.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 해요.'
  if (message.includes('rate limit')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  if (message.includes('Unable to validate email')) return '이메일 형식이 올바르지 않아요.'
  if (code === '23505') return '이미 처리된 요청이에요.'
  if (code === '42501' || message.includes('row-level security')) return '권한이 없어요.'
  // DB 함수에서 한국어로 raise 한 메시지는 그대로 보여줌
  if (/[가-힣]/.test(message)) return message
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.'
}
