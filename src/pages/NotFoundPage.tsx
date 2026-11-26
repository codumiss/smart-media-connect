import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="py-20 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <p className="mt-3 text-slate-600">페이지를 찾을 수 없어요.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
        홈으로
      </Link>
    </section>
  )
}
