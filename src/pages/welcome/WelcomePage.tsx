import { Flag, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogoBadge, LogoFull } from '../../components/brand/Logo'
import { Mascot } from '../../components/ui'
import { Reveal } from '../../components/motion/Reveal'
import { NAV_ITEMS } from '../../config/navigation'
import { FLOW_STEPS, FlowPhone, useAutoStep } from './FlowPhone'

/**
 * 로그인 전 소개 화면 (/welcome)
 * - 첫 화면: 휴대폰 안에서 팀원 모집 → 팀 채팅 과정이 자동으로 재생
 * - 스크롤: 단계 설명을 내릴 때마다 옆(모바일은 위) 휴대폰 화면이 해당 단계로 바뀜
 */

/** 스크롤 위치(0~1)와 스크롤 여부 */
function useScrollProgress() {
  const [state, setState] = useState({ progress: 0, scrolled: false })
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setState({ progress: max > 0 ? window.scrollY / max : 0, scrolled: window.scrollY > 8 })
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])
  return state
}

const PROBLEMS = [
  { title: '소통 부족', body: '학년이 다르면 서로 알 기회가 적고, 물어볼 곳이 마땅치 않습니다.' },
  { title: '정보 분산', body: '학과 공지, 행사, 공모전 소식이 여러 단톡방과 게시판에 흩어져 있습니다.' },
  { title: '협업의 어려움', body: '공모전이나 프로젝트를 같이 할 팀원을 찾기 어렵고, 팀을 꾸려도 협업 도구를 따로 찾아야 합니다.' },
]

const MENU_ITEMS = NAV_ITEMS.filter((item) => !['/', '/mypage', '/admin'].includes(item.path))

function HeroSection({ authState }: { authState: unknown }) {
  const [step, setStep] = useAutoStep(FLOW_STEPS.length, 3600)

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-28 pb-20 md:grid-cols-[1fr_auto] md:gap-16 md:pt-36 md:pb-28">
        <div>
          <h1 className="text-[clamp(2.3rem,6vw,4.25rem)] leading-[1.12] font-extrabold tracking-[-0.03em] text-ink">
            <span className="block animate-rise">스마트미디어학과</span>
            <span className="block animate-rise [animation-delay:120ms]">전용 소통·협업</span>
            <span className="block animate-rise [animation-delay:240ms]">플랫폼</span>
          </h1>
          <p className="mt-6 max-w-md animate-rise text-[17px] leading-relaxed text-slate-600 [animation-delay:400ms]">
            학과 공지와 학사 일정 확인, 정보 공유, 팀원 모집, 팀 협업을 한곳에서 합니다.
          </p>
          <div className="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:520ms]">
            <Link
              to="/signup"
              state={authState}
              className="rounded-xl bg-brand-600 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand-700 active:scale-[0.97]"
            >
              회원가입
            </Link>
            <Link
              to="/login"
              state={authState}
              className="rounded-xl bg-white px-6 ring-1 ring-black/10 py-3.5 text-[15px] font-semibold text-ink transition hover:bg-tile active:scale-[0.97]"
            >
              로그인
            </Link>
          </div>
        </div>

        <div className="flex animate-pop flex-col items-center [animation-delay:300ms]">
          <div className="relative">
            <div className="absolute -inset-16 -z-10 rounded-full bg-brand-200/50 blur-3xl" />
            <FlowPhone step={step} />
            <Mascot className="pointer-events-none absolute -bottom-6 -left-12 w-36 drop-shadow-[0_12px_24px_rgb(0_0_0/0.15)] md:-left-36 md:w-52 sm:-left-24 sm:w-40" />
          </div>
          <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="시연 단계">
            {FLOW_STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-label={s.title}
                onClick={() => setStep(i)}
                className={[
                  'h-2 rounded-full transition-all duration-500',
                  i === step ? 'w-7 bg-brand-600' : 'w-2 bg-slate-300 hover:bg-slate-400',
                ].join(' ')}
              />
            ))}
          </div>
          <p key={step} className="mt-3 animate-rise text-sm font-medium text-slate-600">
            {step + 1}. {FLOW_STEPS[step].title}
          </p>
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.4fr] md:py-28">
        <Reveal>
          <h2 className="text-3xl leading-snug font-bold tracking-tight text-ink md:text-4xl">
            학과 생활의 불편에서
            <br />
            시작했습니다
          </h2>
        </Reveal>
        <ul className="divide-y divide-slate-200">
          {PROBLEMS.map((p, i) => (
            <li key={p.title}>
              <Reveal delay={i * 120} className="py-6 first:pt-0">
                <h3 className="text-lg font-bold text-ink">{p.title}</h3>
                <p className="mt-1.5 leading-relaxed text-slate-600">{p.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** 스크롤하면 휴대폰 화면이 단계별로 바뀌는 구간 */
function FlowStorySection() {
  const [step, setStep] = useState(0)
  const blockRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setStep(Number((entry.target as HTMLElement).dataset.step))
        }
      },
      // 화면 55~65% 높이를 지나가는 단계가 현재 단계
      { rootMargin: '-55% 0px -35% 0px' },
    )
    for (const el of blockRefs.current) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-5 pt-20 md:pt-28">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">모집부터 협업까지</h2>
          <p className="mt-3 max-w-lg leading-relaxed text-slate-600">
            공모전 팀원을 모으는 과정이 서비스 안에서 이어집니다. 스크롤하면 단계별 화면을 볼 수 있습니다.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto grid max-w-6xl px-5 md:grid-cols-[1fr_auto] md:gap-20">
        {/* 휴대폰: 모바일은 위에 고정, PC 는 오른쪽에 고정 */}
        <div className="sticky top-14 z-10 -mx-5 flex h-[392px] justify-center bg-tile/95 pt-4 backdrop-blur md:order-last md:top-0 md:mx-0 md:h-screen md:items-center md:bg-transparent md:pt-0 md:backdrop-blur-none">
          <FlowPhone step={step} className="origin-top scale-[0.72] md:scale-100" />
        </div>

        <ol>
          {FLOW_STEPS.map((s, i) => (
            <li key={s.title}>
              <div
                ref={(el) => {
                  blockRefs.current[i] = el
                }}
                data-step={i}
                className={[
                  'flex min-h-[62vh] flex-col justify-center transition-opacity duration-500 md:min-h-[85vh]',
                  i === step ? 'opacity-100' : 'opacity-25',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-11 place-items-center rounded-full text-lg font-bold transition-colors duration-500',
                    i === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 text-2xl font-bold tracking-tight text-ink md:text-3xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-[17px] leading-relaxed text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function MenuSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">메뉴 구성</h2>
        </Reveal>
        <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
          {MENU_ITEMS.map(({ path, label, icon: Icon, description, comingSoon }, i) => (
            <li key={path} className="border-t border-black/5">
              <Reveal delay={(i % 2) * 100} className="flex gap-4 py-6">
                <Icon className="mt-0.5 size-6 shrink-0 text-brand-600" />
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                    {label}
                    {comingSoon && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">준비 중</span>
                    )}
                  </h3>
                  <p className="mt-1 leading-relaxed text-slate-600">{description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SafetySection() {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">신고와 관리</h2>
          <p className="mt-4 max-w-md leading-relaxed text-indigo-200">
            익명 소통을 지원하는 대신, 문제가 되는 내용은 학과 구성원 누구나 신고할 수 있습니다.
          </p>
        </Reveal>
        <div className="space-y-6">
          <Reveal delay={100} className="flex gap-4">
            <Flag className="mt-1 size-5 shrink-0 text-indigo-300" />
            <p className="leading-relaxed text-indigo-100">
              게시글, 댓글, 채팅을 신고하면 관리자 화면에 바로 알림이 뜹니다. 관리자는 익명 글의 실제 작성자를 확인할 수
              있습니다.
            </p>
          </Reveal>
          <Reveal delay={200} className="flex gap-4">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-indigo-300" />
            <p className="leading-relaxed text-indigo-100">
              서로 다른 3명이 신고한 내용은 관리자가 확인하기 전까지 자동으로 가려집니다.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default function WelcomePage() {
  const location = useLocation()
  const { progress, scrolled } = useScrollProgress()
  // 로그인 전에 특정 화면으로 들어왔다면, 로그인 후 그 화면으로 돌아가도록 전달
  const authState = location.state

  return (
    <div className="min-h-full bg-canvas">
      <div
        className="fixed top-0 left-0 z-50 h-0.5 bg-brand-600 transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
      />

      <header
        className={[
          'fixed inset-x-0 top-0 z-40 transition-all duration-300',
          scrolled ? 'bg-canvas/85 shadow-[0_1px_0_rgb(0_0_0/0.05)] backdrop-blur-xl' : 'bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <span className="flex items-center gap-2">
            <LogoBadge className="size-9" />
            <span className="text-[13px] leading-tight font-extrabold tracking-tight whitespace-nowrap text-ink sm:text-sm">SMART MEDIA<br className="sm:hidden" /> CONNECT</span>
          </span>
          <nav className="flex items-center gap-1">
            <Link to="/login" state={authState} className="rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-600 hover:text-ink">
              로그인
            </Link>
            <Link
              to="/signup"
              state={authState}
              className="rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-white transition active:scale-[0.97]"
            >
              회원가입
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <HeroSection authState={authState} />
        <ProblemSection />
        <FlowStorySection />
        <MenuSection />
        <SafetySection />

        <section className="mx-auto max-w-6xl px-5 py-20 text-center md:py-28">
          <Reveal>
            <LogoFull className="mx-auto mb-8 w-40 text-ink md:w-48" title="jj univ smart media" />
            <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              스마트미디어학과 재학생과 졸업생은
              <br className="sm:hidden" /> 가입 후 이용할 수 있습니다
            </h2>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/signup"
                state={authState}
                className="rounded-xl bg-brand-600 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand-700 active:scale-[0.97]"
              >
                회원가입
              </Link>
              <Link
                to="/login"
                state={authState}
                className="rounded-xl bg-white px-6 ring-1 ring-black/10 py-3.5 text-[15px] font-semibold text-ink transition hover:bg-tile active:scale-[0.97]"
              >
                로그인
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-black/5 py-8 text-center text-xs text-sub">© 스마트미디어학과 · jj univ smart media</footer>
    </div>
  )
}
