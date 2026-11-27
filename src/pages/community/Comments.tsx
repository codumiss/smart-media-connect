import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ReportButton } from '../../components/ReportButton'
import { Avatar, Button, ErrorText } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { timeAgo } from '../../lib/format'
import { db } from '../../lib/supabase'

type Comment = {
  id: string
  body: string
  is_anonymous: boolean
  is_hidden: boolean
  created_at: string
  author: { nickname: string } | null
}

export function Comments({ postId }: { postId: string }) {
  const { isAdmin, profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const client = db()
    const { data } = await client
      .from('comments')
      .select('id, body, is_anonymous, is_hidden, created_at, author:profiles!comments_author_id_fkey(nickname)')
      .eq('post_id', postId)
      .order('created_at')
    const list = (data as Comment[] | null) ?? []
    setComments(list)
    // 내가 쓴 댓글 (익명 포함) — 실제 작성자 기록은 본인 것만 조회됨
    if (list.length > 0) {
      const { data: own } = await client
        .from('content_authors')
        .select('target_id')
        .eq('target_type', 'comment')
        .eq('author_id', profile?.id ?? '')
        .in(
          'target_id',
          list.map((c) => c.id),
        )
      setMine(new Set(((own as { target_id: string }[] | null) ?? []).map((r) => r.target_id)))
    }
  }, [postId, profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    setError('')
    const { error: insertError } = await db()
      .from('comments')
      .insert({ post_id: postId, body: body.trim(), is_anonymous: anonymous })
    setSubmitting(false)
    if (insertError) {
      setError(toKoreanError(insertError))
      return
    }
    setBody('')
    await load()
  }

  async function remove(id: string) {
    if (!window.confirm('댓글을 삭제할까요?')) return
    const { error: deleteError } = await db().from('comments').delete().eq('id', id)
    if (deleteError) {
      setError(toKoreanError(deleteError))
      return
    }
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div>
      <h2 className="font-semibold">
        댓글 <span className="text-slate-400">{comments.length}</span>
      </h2>

      <ul className="mt-3 space-y-4">
        {comments.map((comment) => {
          const name = comment.is_anonymous ? '익명' : (comment.author?.nickname ?? '탈퇴한 회원')
          const isMine = mine.has(comment.id)
          return (
            <li key={comment.id} className="flex animate-rise gap-3">
              <Avatar name={name} size="sm" muted={comment.is_anonymous} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    {name}
                    {isMine && <span className="ml-1 font-normal text-brand-600">(나)</span>}
                  </span>
                  <span className="text-slate-400">{timeAgo(comment.created_at)}</span>
                  {comment.is_hidden && <span className="text-red-500">가려진 댓글</span>}
                  <span className="ml-auto flex items-center gap-2">
                    {!isMine && <ReportButton targetType="comment" targetId={comment.id} />}
                    {(isMine || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => void remove(comment.id)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="size-3.5" />
                        삭제
                      </button>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{comment.body}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <form onSubmit={submit} className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="댓글을 남겨 보세요"
          className="w-full resize-none text-base outline-none md:text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="size-3.5 accent-brand-600"
            />
            익명
          </label>
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            등록
          </Button>
        </div>
      </form>
      <div className="mt-2">
        <ErrorText>{error}</ErrorText>
      </div>
    </div>
  )
}
