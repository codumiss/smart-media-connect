import { ArrowLeft, EyeOff, Heart, MessageSquare, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ReportButton } from '../../components/ReportButton'
import { Avatar, Button, Card, EmptyState, ErrorText, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { toKoreanError } from '../../lib/errors'
import { timeAgo } from '../../lib/format'
import { db } from '../../lib/supabase'
import { Comments } from './Comments'
import { RecruitPanel } from './RecruitPanel'
import { CATEGORY_LABEL, postAuthorName, type PostRow } from './shared'

export default function PostDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuth()
  const [post, setPost] = useState<PostRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMine, setIsMine] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const client = db()
    const [postRes, likeRes, mineRes] = await Promise.all([
      client
        .from('posts')
        .select(
          'id, category, title, body, is_anonymous, is_hidden, author_id, created_at, updated_at, author:profiles!posts_author_id_fkey(name, nickname), recruitments(*)',
        )
        .eq('id', id)
        .maybeSingle(),
      client.from('post_likes').select('user_id').eq('post_id', id),
      client
        .from('content_authors')
        .select('target_id')
        .eq('target_type', 'post')
        .eq('target_id', id)
        .eq('author_id', profile?.id ?? ''),
    ])
    setPost((postRes.data as PostRow | null) ?? null)
    const likes = (likeRes.data as { user_id: string }[] | null) ?? []
    setLikeCount(likes.length)
    setLiked(likes.some((l) => l.user_id === profile?.id))
    setIsMine(((mineRes.data as unknown[] | null) ?? []).length > 0)
    setLoading(false)
  }, [id, profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleLike() {
    const client = db()
    // 화면 먼저 바꾸고 저장 (실패하면 되돌림)
    setLiked(!liked)
    setLikeCount((c) => c + (liked ? -1 : 1))
    const { error: likeError } = liked
      ? await client.from('post_likes').delete().eq('post_id', id).eq('user_id', profile?.id ?? '')
      : await client.from('post_likes').insert({ post_id: id })
    if (likeError) {
      setLiked(liked)
      setLikeCount((c) => c + (liked ? 1 : -1))
    }
  }

  async function remove() {
    if (!window.confirm('글을 삭제할까요? 댓글과 신청 내역도 함께 삭제돼요.')) return
    const { error: deleteError } = await db().from('posts').delete().eq('id', id)
    if (deleteError) {
      setError(toKoreanError(deleteError))
      return
    }
    navigate('/community', { replace: true })
  }

  async function toggleHidden() {
    if (!post) return
    const { error: rpcError } = await db().rpc('moderate_content', { p_type: 'post', p_id: id, p_hidden: !post.is_hidden })
    if (rpcError) setError(toKoreanError(rpcError))
    else await load()
  }

  async function startChat() {
    if (!post?.author_id) return
    const { data, error: rpcError } = await db().rpc('start_direct_chat', { p_user_id: post.author_id })
    if (rpcError) setError(toKoreanError(rpcError))
    else navigate(`/chat/${data as string}`)
  }

  if (loading) return <Spinner />
  if (!post) {
    return (
      <EmptyState
        title="글을 찾을 수 없어요. 삭제됐거나 가려진 글이에요."
        action={
          <Link to="/community" className="text-sm font-semibold text-brand-600">
            정보방으로
          </Link>
        }
      />
    )
  }

  const authorName = postAuthorName(post)
  const canChat = !post.is_anonymous && post.author_id && post.author_id !== profile?.id

  return (
    <section className="space-y-5">
      <Link
        to={`/community?category=${post.category}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        {CATEGORY_LABEL[post.category]}
      </Link>

      <Card className="p-5 md:p-6">
        {post.is_hidden && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <EyeOff className="size-4" />
            신고 또는 관리자 조치로 가려진 글이에요. 작성자와 관리자만 볼 수 있어요.
          </p>
        )}
        <h1 className="text-xl leading-snug font-bold md:text-2xl">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Avatar name={authorName} size="sm" muted={post.is_anonymous} />
          <span className="font-medium">
            {authorName}
            {isMine && <span className="ml-1 text-brand-600">(나)</span>}
          </span>
          <span className="text-slate-400">{timeAgo(post.created_at)}</span>
          {canChat && (
            <button
              type="button"
              onClick={() => void startChat()}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
            >
              <MessageSquare className="size-3.5" />
              1:1 대화
            </button>
          )}
        </div>

        <p className="mt-5 leading-relaxed whitespace-pre-wrap text-slate-800">{post.body}</p>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => void toggleLike()}
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-90',
              liked ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            <Heart className={`size-4 transition-transform ${liked ? 'scale-110 fill-current' : ''}`} />
            공감 {likeCount}
          </button>
          <span className="ml-auto flex items-center gap-3">
            {!isMine && <ReportButton targetType="post" targetId={post.id} />}
            {isAdmin && (
              <button type="button" onClick={() => void toggleHidden()} className="text-xs text-slate-400 hover:text-slate-700">
                {post.is_hidden ? '숨김 해제' : '숨김'}
              </button>
            )}
            {(isMine || isAdmin) && (
              <Button size="sm" variant="ghost" onClick={() => void remove()}>
                <Trash2 className="size-3.5" />
                삭제
              </Button>
            )}
          </span>
        </div>
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      </Card>

      {post.recruitments && <RecruitPanel recruitment={post.recruitments} isOwner={isMine} onChange={() => void load()} />}

      <Card className="p-5 md:p-6">
        <Comments postId={post.id} />
      </Card>
    </section>
  )
}
