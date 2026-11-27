import { Link } from 'react-router-dom'
import { LogoBadge } from '../brand/Logo'

/** 학과 로고(검은 원) + 서비스 이름 */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="SMART MEDIA CONNECT 홈">
      <LogoBadge className={size === 'sm' ? 'size-9' : 'size-11'} />
      {size === 'sm' ? (
        <span className="text-sm font-extrabold tracking-tight">SMART MEDIA CONNECT</span>
      ) : (
        <span className="leading-tight">
          <span className="block text-[15px] font-extrabold tracking-tight">
            SMART MEDIA
            <br />
            CONNECT
          </span>
          <span className="block text-[11px] text-sub italic">jj univ smart media</span>
        </span>
      )}
    </Link>
  )
}
