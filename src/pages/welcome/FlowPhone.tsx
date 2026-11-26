import { Bell, CalendarDays, Check, KeyRound, Send, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

/**
 * 소개 화면의 휴대폰 시연 화면
 * 팀원 모집 → 신청 → 승인 → 팀룸 참여 → 팀 채팅 순서를 실제 서비스 화면처럼 보여줌
 * step 이 바뀌면 해당 화면이 넘어오면서 안쪽 애니메이션이 처음부터 다시 재생됨
 */

export const FLOW_STEPS = [
  {
    title: '팀원 모집 글 작성',
    body: '정보방에 공모전 이름, 모집 분야, 인원, 마감일을 적어 올립니다.',
  },
  {
    title: '참여 신청',
    body: '다른 학년 학생이 모집 글을 보고 한 줄 소개와 함께 신청합니다.',
  },
  {
    title: '작성자 승인',
    body: '작성자가 신청자를 확인하고 승인합니다. 결과는 신청자에게 알림으로 갑니다.',
  },
  {
    title: '팀룸 자동 참여',
    body: '승인된 학생은 모집 글에 연결된 팀룸에 바로 들어갑니다. 방 키를 받아 직접 들어올 수도 있습니다.',
  },
  {
    title: '팀 채팅과 회의 일정',
    body: '팀원끼리 채팅하고, 회의 일정과 자료 링크를 팀룸 한곳에 모읍니다.',
  },
] as const

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** active 가 된 뒤 ms 만큼 지나면 true */
function useAfter(active: boolean, ms: number) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active) {
      setDone(false)
      return
    }
    if (reducedMotion()) {
      setDone(true)
      return
    }
    const id = window.setTimeout(() => setDone(true), ms)
    return () => window.clearTimeout(id)
  }, [active, ms])
  return done
}

/** active 동안 글자가 한 글자씩 입력됨 */
function useTypewriter(text: string, active: boolean, startDelay = 300, speed = 55) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) {
      setCount(0)
      return
    }
    if (reducedMotion()) {
      setCount(text.length)
      return
    }
    let i = 0
    let interval = 0
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        i += 1
        setCount(i)
        if (i >= text.length) window.clearInterval(interval)
      }, speed)
    }, startDelay)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [active, text, startDelay, speed])
  return text.slice(0, count)
}

function ScreenHeader({ children }: { children: ReactNode }) {
  return <p className="border-b border-slate-100 px-4 pt-3 pb-2.5 text-[11px] font-semibold text-slate-500">{children}</p>
}

function RecruitScreen({ active }: { active: boolean }) {
  const pressed = useAfter(active, 1600)
  return (
    <>
      <ScreenHeader>정보방 / 팀원 모집</ScreenHeader>
      <div className="p-3">
        <div className="rounded-2xl border border-slate-200 p-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">모집 중</span>
            <span className="text-slate-400">마감 D-3</span>
          </div>
          <p className="mt-2 text-[13px] leading-snug font-bold">웹 개발 공모전 같이 나갈 팀원 구해요</p>
          <dl className="mt-3 space-y-1.5 text-[11px]">
            {[
              ['분야', '프론트엔드, UI 디자인'],
              ['인원', '2명'],
              ['방식', '주 2회 오프라인'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-7 text-slate-400">{k}</dt>
                <dd className="text-slate-700">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            tabIndex={-1}
            className={[
              'mt-4 w-full rounded-xl py-2 text-[12px] font-semibold text-white transition-all duration-300',
              pressed ? 'scale-95 bg-brand-700' : 'animate-ping-soft bg-brand-600',
            ].join(' ')}
          >
            {pressed ? '신청서 작성 중…' : '참여 신청'}
          </button>
        </div>
        <div className="mt-2.5 space-y-2 opacity-60">
          <div className="h-14 rounded-2xl bg-slate-100" />
          <div className="h-14 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </>
  )
}

function ApplyScreen({ active }: { active: boolean }) {
  const message = 'React로 과제 해 봤어요. 프론트 맡고 싶습니다!'
  const typed = useTypewriter(message, active)
  const sent = useAfter(active, 300 + message.length * 55 + 500)
  return (
    <>
      <ScreenHeader>참여 신청</ScreenHeader>
      <div className="p-3">
        <p className="text-[12px] font-bold">웹 개발 공모전 같이 나갈 팀원 구해요</p>
        <div className="mt-3 min-h-24 rounded-xl border border-brand-200 bg-white p-3 text-[12px] leading-relaxed">
          {typed}
          {!sent && <span className="ml-px inline-block h-3.5 w-px animate-caret bg-brand-600 align-middle" />}
        </div>
        <div
          className={[
            'mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition-colors duration-300',
            sent ? 'bg-signal text-white' : 'bg-slate-100 text-slate-400',
          ].join(' ')}
        >
          {sent ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
          {sent ? '신청 완료' : '보내기'}
        </div>
        {sent && <p className="mt-2 animate-rise text-center text-[11px] text-slate-500">작성자에게 알림이 갔어요</p>}
      </div>
    </>
  )
}

function ApproveScreen({ active }: { active: boolean }) {
  const approved = useAfter(active, 1400)
  return (
    <>
      <ScreenHeader>내 모집 글 / 신청자 2명</ScreenHeader>
      <ul className="space-y-2 p-3">
        <li className="rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">도</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold">도윤 · 2학년</p>
              <p className="truncate text-[10px] text-slate-500">React로 과제 해 봤어요. 프론트 맡고…</p>
            </div>
          </div>
          <div
            className={[
              'mt-2.5 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all duration-500',
              approved ? 'bg-signal text-white' : 'bg-brand-600 text-white',
            ].join(' ')}
          >
            {approved && <Check className="size-3.5" />}
            {approved ? '승인됨' : '승인'}
          </div>
        </li>
        <li className="rounded-2xl border border-slate-200 p-3 opacity-70">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">서</span>
            <div>
              <p className="text-[12px] font-semibold">서연 · 1학년</p>
              <p className="text-[10px] text-slate-500">디자인 해 보고 싶어요</p>
            </div>
          </div>
        </li>
      </ul>
      {approved && (
        <p className="mx-3 animate-rise rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
          도윤 님이 팀룸에 추가됐어요
        </p>
      )}
    </>
  )
}

function TeamRoomScreen({ active }: { active: boolean }) {
  const code = 'SM-8KHMG7'
  const showBanner = useAfter(active, 1500)
  return (
    <>
      <ScreenHeader>팀룸</ScreenHeader>
      {showBanner && (
        <div className="absolute inset-x-2 top-8 z-10 flex animate-drop items-center gap-2 rounded-xl bg-ink px-3 py-2 text-white shadow-lg">
          <Bell className="size-3.5 shrink-0" />
          <p className="text-[11px]">새 팀원이 참여했습니다</p>
        </div>
      )}
      <div className="p-3">
        <p className="text-[13px] font-bold">웹 개발 공모전 팀</p>
        <div className="mt-3 rounded-2xl bg-brand-50 p-3">
          <p className="flex items-center gap-1 text-[10px] font-semibold text-brand-700">
            <KeyRound className="size-3" />방 키
          </p>
          <p className="mt-1 flex font-bold tracking-wider text-ink">
            {active &&
              code.split('').map((ch, i) => (
                <span key={i} className="animate-pop text-[20px]" style={{ animationDelay: `${150 + i * 70}ms` }}>
                  {ch}
                </span>
              ))}
          </p>
        </div>
        <p className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          <Users className="size-3.5" />
          팀원 3명
        </p>
        <div className="mt-2 flex -space-x-2">
          {active &&
            ['아', '도', '민'].map((ch, i) => (
              <span
                key={ch}
                className="grid size-9 animate-pop place-items-center rounded-full border-2 border-white bg-brand-100 text-[12px] font-bold text-brand-700"
                style={{ animationDelay: `${800 + i * 160}ms` }}
              >
                {ch}
              </span>
            ))}
        </div>
      </div>
    </>
  )
}

function ChatScreen({ active }: { active: boolean }) {
  const messages = [
    { me: false, name: '도윤', text: '다들 반가워요!' },
    { me: true, name: '', text: '목요일 7시에 첫 회의 어때요?' },
    { me: false, name: '민준', text: '좋아요. 자료 링크도 올려둘게요' },
  ]
  return (
    <>
      <ScreenHeader>웹 개발 공모전 팀 / 채팅</ScreenHeader>
      <div className="p-3">
        <div className="space-y-2">
        {active &&
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex animate-rise flex-col ${m.me ? 'items-end' : 'items-start'}`}
              style={{ animationDelay: `${200 + i * 650}ms` }}
            >
              {m.name && <span className="mb-0.5 text-[10px] text-slate-400">{m.name}</span>}
              <span
                className={[
                  'max-w-[85%] rounded-2xl px-3 py-1.5 text-[12px]',
                  m.me ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100',
                ].join(' ')}
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>
        {active && (
          <div
            className="mt-4 flex animate-rise items-center gap-2 rounded-xl border border-slate-200 p-2.5"
            style={{ animationDelay: '2200ms' }}
          >
            <CalendarDays className="size-4 text-brand-600" />
            <div>
              <p className="text-[11px] font-semibold">첫 회의</p>
              <p className="text-[10px] text-slate-500">목요일 19:00</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const SCREENS = [RecruitScreen, ApplyScreen, ApproveScreen, TeamRoomScreen, ChatScreen]

export function FlowPhone({ step, className = '' }: { step: number; className?: string }) {
  return (
    <div
      className={`relative h-[500px] w-[260px] shrink-0 rounded-[2.4rem] border-[7px] border-ink bg-white shadow-2xl shadow-brand-600/20 ${className}`}
      aria-hidden="true"
    >
      <span className="absolute top-2 left-1/2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" />
      <div className="absolute inset-0 overflow-hidden rounded-[1.9rem]">
        {SCREENS.map((Screen, i) => {
          const active = i === step
          return (
            <div
              key={i}
              className={[
                'absolute inset-0 pt-7 transition-all duration-500 ease-[var(--ease-soft)]',
                active
                  ? 'translate-x-0 opacity-100'
                  : i < step
                    ? 'pointer-events-none -translate-x-8 opacity-0'
                    : 'pointer-events-none translate-x-8 opacity-0',
              ].join(' ')}
            >
              <Screen active={active} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 일정 시간마다 다음 단계로 넘어감 (마지막 다음은 처음으로) */
export function useAutoStep(count: number, intervalMs: number, enabled = true) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), intervalMs)
    return () => window.clearInterval(id)
  }, [count, intervalMs, enabled])
  return [step, setStep] as const
}
