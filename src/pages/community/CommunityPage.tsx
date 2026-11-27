import { EyeOff, Heart, MessageCircle, NotebookText, PenLine, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorText, PageHeader, Spinner, Tabs, buttonClass } from '../../components/ui'
import { toKoreanError } from '../../lib/errors'
import { dDayLabel, timeAgo } from '../../lib/format'
import { db } from '../../lib/supabase'
import { CATEGORIES, CATEGORY_LABEL, postAuthorName, type PostCategory, type PostRow } from './shared'

type ListRow = PostRow & { comments: { count: number }[]; post_likes: { count: number }[] }

export default function CommunityPage() {
  const [params, setParams] = useSearchParams()
  const category = (params.get('category') as PostCategory | null) ?? 'all'
  const [posts, setPosts] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    let query = db()
      .from('posts')
      .select(
        'id, category, title, body, is_anonymous, is_hidden, author_id, created_at, updated_at, author:profiles!posts_author_id_fkey(name, nickname), recruitments(*), comments(count), post_likes(count)',
      )
      .order('created_at', { ascending: false })
      .limit(100)
    if (category !== 'all') query = query.eq('category', category)
    void query.then(({ data, error: loadError }) => {
      if (!active) return
      if (loadError) setError(toKoreanError(loadError))
      setPosts((data as ListRow[] | null) ?? [])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [category])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((p) => `${p.title} ${p.body}`.toLowerCase().includes(q))
  }, [posts, keyword])

  const currentCategory = CATEGORIES.find((c) => c.value === category)

  return (
    <section>
      <PageHeader
        title="정보방"
        description={currentCategory?.description ?? '전공 및 학교생활 정보를 카테고리별로 공유해요'}
        icon={NotebookText}
        action={
          <Link
            to={`/community/new${category !== 'all' ? `?category=${category}` : ''}`}
            className={buttonClass('primary')}
          >
            <PenLine className="size-4" />
            글쓰기
          </Link>
        }
      />

      <div className="mt-6">
        <Tabs
          value={category}
          onChange={(value) => setParams(value === 'all' ? {} : { category: value })}
          items={[{ value: 'all' as const, label: '전체' }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
        />
      </div>

      <div className="relative mt-4">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="제목, 내용 검색"
          className="w-full rounded-2xl bg-white py-3 pr-3 pl-10 text-base outline-none focus:ring-2 focus:ring-brand-100 md:text-sm"
        />
      </div>

      <div className="mt-4">
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="mt-2 overflow-hidden rounded-card bg-white">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={NotebookText}
            title={keyword ? '검색 결과가 없어요.' : '아직 글이 없어요. 첫 글을 남겨 보세요.'}
            action={
              !keyword && (
                <Link to="/community/new" className={buttonClass('secondary', 'sm')}>
                  글쓰기
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-black/5">
            {filtered.map((post, i) => {
              const rec = post.recruitments
              if (rec) return <RecruitItem key={post.id} post={post} index={i} />
              return (
                <li key={post.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                  <Link to={`/community/${post.id}`} className="block px-4 py-4 transition-colors hover:bg-tile md:px-5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-lg bg-tile px-2 py-0.5 font-bold text-sub">{CATEGORY_LABEL[post.category]}</span>
                      {post.is_hidden && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-red-600">
                          <EyeOff className="size-3" />
                          가려진 글
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-[17px] font-bold tracking-[-0.01em]">{post.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-sub">{post.body}</p>
                    <PostMeta post={post} />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function PostMeta({ post }: { post: ListRow }) {
  return (
    <div className="mt-2 flex items-center gap-3 text-xs text-sub">
      <span>{postAuthorName(post)}</span>
      <span>{timeAgo(post.created_at)}</span>
      <span className="num ml-auto inline-flex items-center gap-1">
        <Heart className="size-3.5" />
        {post.post_likes[0]?.count ?? 0}
      </span>
      <span className="num inline-flex items-center gap-1">
        <MessageCircle className="size-3.5" />
        {post.comments[0]?.count ?? 0}
      </span>
    </div>
  )
}

/** 팀원 모집 글: 일반 글보다 크게, 모집 상태·마감·분야가 바로 보이게 */
function RecruitItem({ post, index }: { post: ListRow; index: number }) {
  const rec = post.recruitments!
  const open = rec.status === 'open'
  const tags = (rec.fields ?? '')
    .split(/[,·/]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 4)
  return (
    <li className="animate-rise p-2.5 md:p-3" style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}>
      <Link
        to={`/community/${post.id}`}
        className={`block rounded-[20px] p-4 transition hover:-translate-y-0.5 md:p-5 ${open ? 'bg-tile' : 'bg-tile/60 opacity-70'}`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${open ? 'bg-star text-ink' : 'bg-black/10 text-sub'}`}>
            {open ? '● 모집중' : '모집 마감'}
          </span>
          {open && rec.deadline && (
            <span className="num rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-sub">마감 {dDayLabel(rec.deadline)}</span>
          )}
          {post.is_hidden && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
              <EyeOff className="size-3" />
              가려진 글
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-extrabold tracking-[-0.02em]">{rec.project_name || post.title}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-sub">{post.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {t}
            </span>
          ))}
          {rec.headcount && <span className="num text-xs font-semibold text-sub">· {rec.headcount}명 모집</span>}
          {rec.method && <span className="text-xs text-sub">· {rec.method}</span>}
        </div>
        <PostMeta post={post} />
      </Link>
    </li>
  )
}
