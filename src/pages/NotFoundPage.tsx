import { Link } from 'react-router-dom'
import { Mascot } from '../components/ui'

export default function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <Mascot className="mx-auto w-44" />
      <p className="num mt-4 text-5xl font-black tracking-tight text-brand-600">404</p>
      <p className="mt-3 text-sub">페이지를 찾을 수 없어요.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
        홈으로
      </Link>
    </section>
  )
}
