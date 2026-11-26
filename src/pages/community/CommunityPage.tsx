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
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="제목, 내용 검색"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-base outline-none focus:border-brand-500 md:text-sm"
        />
      </div>

      <div className="mt-4">
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
          <ul className="divide-y divide-slate-100">
            {filtered.map((post, i) => {
              const rec = post.recruitments
              return (
                <li key={post.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                  <Link to={`/community/${post.id}`} className="block px-4 py-4 transition-colors hover:bg-slate-50 md:px-5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                        {CATEGORY_LABEL[post.category]}
                      </span>
                      {rec && (
                        <span
                          className={[
                            'rounded-md px-1.5 py-0.5 font-semibold',
                            rec.status === 'open' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400',
                          ].join(' ')}
                        >
                          {rec.status === 'open' ? (rec.deadline ? `모집 중 ${dDayLabel(rec.deadline)}` : '모집 중') : '모집 마감'}
                        </span>
                      )}
                      {post.is_hidden && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-red-600">
                          <EyeOff className="size-3" />
                          가려진 글
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate font-semibold">{post.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{post.body}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <span>{postAuthorName(post)}</span>
                      <span>{timeAgo(post.created_at)}</span>
                      <span className="ml-auto inline-flex items-center gap-1">
                        <Heart className="size-3.5" />
                        {post.post_likes[0]?.count ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3.5" />
                        {post.comments[0]?.count ?? 0}
                      </span>
                    </div>
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
