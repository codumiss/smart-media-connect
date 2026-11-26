import { Megaphone } from 'lucide-react'

// TODO: 공지(announcements)·학사 일정(schedules) 작성 화면
// DB 와 권한(관리자만 작성)은 준비돼 있음 → supabase/migrations/20261126000200_board.sql
export default function AdminNoticesPage() {
  return (
    <section>
      <h1 className="text-xl font-bold md:text-2xl">공지·일정 관리</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Megaphone className="mx-auto size-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">공지 작성·수정, 학사 일정 등록 화면이 들어갈 자리예요.</p>
      </div>
    </section>
  )
}
