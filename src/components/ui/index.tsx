import { X, type LucideIcon } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'

/** 화면 제목 + 오른쪽 버튼 영역 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-brand-600">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-[-0.03em] md:text-[28px]">{title}</h1>
          {description && <p className="text-sm text-sub">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const BUTTON_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-ink ring-1 ring-black/5 hover:bg-tile',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-black/5',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: 'sm' | 'md' = 'md') {
  return [
    'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm md:py-2.5',
    BUTTON_CLASS[variant],
  ].join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />
}

export const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 md:text-sm'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card bg-white ${className}`}>{children}</div>
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center py-10 ${className}`}>
      <span className="size-6 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
    </div>
  )
}

/** 내용이 없을 때: 학과 캐릭터와 함께 무엇을 하면 되는지 안내 */
export function EmptyState({
  icon: Icon,
  title,
  action,
  mascot = true,
  size = 'md',
}: {
  icon?: LucideIcon
  title: string
  action?: ReactNode
  /** 캐릭터 이미지 표시 (기본 표시, false 면 아이콘) */
  mascot?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`flex flex-col items-center gap-3 px-4 text-center ${size === 'sm' ? 'py-4' : 'py-10'}`}>
      {mascot ? (
        <Mascot className={size === 'sm' ? 'w-24' : 'w-32'} />
      ) : (
        Icon && <Icon className="size-8 text-slate-300" />
      )}
      <p className="max-w-xs text-sm leading-relaxed text-sub">{title}</p>
      {action}
    </div>
  )
}

/** 학과 캐릭터 (public/images/mascot.png) */
export function Mascot({ className = '' }: { className?: string }) {
  return <img src="/images/mascot.png" alt="" aria-hidden="true" draggable={false} className={`select-none ${className}`} />
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="animate-rise rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>
}

/** 이름 첫 글자 동그라미 */
export function Avatar({ name, size = 'md', muted = false }: { name: string; size?: 'sm' | 'md'; muted?: boolean }) {
  return (
    <span
      className={[
        'grid shrink-0 place-items-center rounded-full font-bold',
        size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-sm',
        muted ? 'bg-slate-200 text-slate-500' : 'bg-brand-100 text-brand-700',
      ].join(' ')}
    >
      {name.slice(0, 1)}
    </span>
  )
}

/** 아래에서 올라오는(모바일) / 가운데 뜨는(PC) 창 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-md animate-rise overflow-y-auto rounded-t-3xl bg-white p-5 shadow-float md:rounded-3xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

/** 탭 버튼 묶음 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="flex gap-1 overflow-x-auto" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={[
            'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
            value === item.value ? 'bg-ink text-white' : 'bg-white text-slate-600 hover:bg-tile',
          ].join(' ')}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
