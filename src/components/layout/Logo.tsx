import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
        SM
      </span>
      <span className="text-sm font-bold leading-tight tracking-tight">
        SMART MEDIA
        <br />
        CONNECT
      </span>
    </Link>
  )
}
