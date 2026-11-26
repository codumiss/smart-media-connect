import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, ErrorText, Field, inputClass } from '../../components/ui'
import { toKoreanError } from '../../lib/errors'
import { db } from '../../lib/supabase'
import { CATEGORIES, type PostCategory } from './shared'

export default function PostWritePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialCategory = (CATEGORIES.find((c) => c.value === params.get('category'))?.value ?? 'free') as PostCategory

  const [category, setCategory] = useState<PostCategory>(initialCategory)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [recruit, setRecruit] = useState({
    projectName: '',
    fields: '',
    headcount: '2',
    skills: '',
    deadline: '',
    method: '',
    createRoom: true,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isRecruit = category === 'recruit'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !body.trim()) {
      setError('제목과 내용을 입력해 주세요.')
      return
    }
    if (isRecruit && !recruit.projectName.trim()) {
      setError('모집할 프로젝트 이름을 입력해 주세요.')
      return
    }
    setError('')
    setSubmitting(true)
    const client = db()

    const { data: post, error: postError } = await client
      .from('posts')
      .insert({ category, title: title.trim(), body: body.trim(), is_anonymous: isRecruit ? false : anonymous })
      .select('id')
      .single()
    if (postError || !post) {
      setSubmitting(false)
      setError(toKoreanError(postError))
      return
    }

    if (isRecruit) {
      // 승인한 팀원이 자동으로 들어갈 팀룸을 함께 만듦
      let teamRoomId: string | null = null
      if (recruit.createRoom) {
        const { data: room, error: roomError } = await client
          .from('team_rooms')
          .insert({ name: recruit.projectName.trim(), description: title.trim() })
          .select('id')
          .single()
        if (roomError) {
          await client.from('posts').delete().eq('id', post.id)
          setSubmitting(false)
          setError(toKoreanError(roomError))
          return
        }
        teamRoomId = room.id
      }

      const { error: recruitError } = await client.from('recruitments').insert({
        post_id: post.id,
        project_name: recruit.projectName.trim(),
        fields: recruit.fields.trim() || null,
        headcount: Number(recruit.headcount) || null,
        skills: recruit.skills.trim() || null,
        deadline: recruit.deadline || null,
        method: recruit.method.trim() || null,
        team_room_id: teamRoomId,
      })
      if (recruitError) {
        await client.from('posts').delete().eq('id', post.id)
        if (teamRoomId) await client.from('team_rooms').delete().eq('id', teamRoomId)
        setSubmitting(false)
        setError(toKoreanError(recruitError))
        return
      }
    }

    navigate(`/community/${post.id}`, { replace: true })
  }

  return (
    <section>
      <Link to="/community" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" />
        정보방
      </Link>
      <h1 className="mt-3 text-xl font-bold md:text-2xl">글쓰기</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Card className="space-y-4 p-5">
          <Field label="카테고리">
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as PostCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="제목">
            <input className={inputClass} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="내용">
            <textarea
              className={`${inputClass} min-h-40 leading-relaxed`}
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          {isRecruit ? (
            <p className="text-xs text-slate-500">팀원 모집 글은 신청과 승인을 위해 실명(닉네임)으로만 올라가요.</p>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="size-4 accent-brand-600"
              />
              익명으로 올리기
            </label>
          )}
        </Card>

        {isRecruit && (
          <Card className="animate-rise space-y-4 p-5">
            <h2 className="font-semibold">모집 정보</h2>
            <Field label="프로젝트·공모전 이름">
              <input
                className={inputClass}
                maxLength={100}
                value={recruit.projectName}
                onChange={(e) => setRecruit({ ...recruit, projectName: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="모집 분야" hint="예: 프론트엔드, UI 디자인">
                <input
                  className={inputClass}
                  value={recruit.fields}
                  onChange={(e) => setRecruit({ ...recruit, fields: e.target.value })}
                />
              </Field>
              <Field label="모집 인원">
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputClass}
                  value={recruit.headcount}
                  onChange={(e) => setRecruit({ ...recruit, headcount: e.target.value })}
                />
              </Field>
              <Field label="필요한 기술·역량">
                <input
                  className={inputClass}
                  value={recruit.skills}
                  onChange={(e) => setRecruit({ ...recruit, skills: e.target.value })}
                />
              </Field>
              <Field label="모집 마감일">
                <input
                  type="date"
                  className={inputClass}
                  value={recruit.deadline}
                  onChange={(e) => setRecruit({ ...recruit, deadline: e.target.value })}
                />
              </Field>
            </div>
            <Field label="진행 방식" hint="예: 주 2회 오프라인, 디스코드 회의">
              <input
                className={inputClass}
                value={recruit.method}
                onChange={(e) => setRecruit({ ...recruit, method: e.target.value })}
              />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={recruit.createRoom}
                onChange={(e) => setRecruit({ ...recruit, createRoom: e.target.checked })}
                className="mt-0.5 size-4 accent-brand-600"
              />
              <span>
                팀룸 함께 만들기
                <span className="block text-xs text-slate-500">승인한 신청자가 이 팀룸에 자동으로 들어와요.</span>
              </span>
            </label>
          </Card>
        )}

        <ErrorText>{error}</ErrorText>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            취소
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? '올리는 중…' : '올리기'}
          </Button>
        </div>
      </form>
    </section>
  )
}
