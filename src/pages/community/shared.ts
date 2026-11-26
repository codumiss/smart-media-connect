export type PostCategory = 'notice' | 'equipment' | 'contest' | 'recruit' | 'free'

export const CATEGORIES: { value: PostCategory; label: string; description: string }[] = [
  { value: 'free', label: '자유', description: '질문, 정보 공유, 학교생활 이야기' },
  { value: 'recruit', label: '팀원 모집', description: '공모전·프로젝트·스터디 팀원 모집' },
  { value: 'contest', label: '공모전·대외활동', description: '공모전, 캠프, 해커톤, 교육 프로그램' },
  { value: 'equipment', label: '장비·실습실', description: '실습실 이용, 장비 사용법, 기자재 질문' },
  { value: 'notice', label: '학과 소식', description: '학생회·학과 행사 소식 공유' },
]

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<PostCategory, string>

export type Recruitment = {
  post_id: string
  project_name: string
  fields: string | null
  headcount: number | null
  skills: string | null
  deadline: string | null
  method: string | null
  status: 'open' | 'closed'
  team_room_id: string | null
}

export type PostRow = {
  id: string
  category: PostCategory
  title: string
  body: string
  is_anonymous: boolean
  is_hidden: boolean
  author_id: string | null
  created_at: string
  updated_at: string
  author: { name: string; nickname: string } | null
  recruitments: Recruitment | null
}

/** 정보방에서는 닉네임, 익명 글은 '익명' */
export function postAuthorName(post: { is_anonymous: boolean; author: { nickname: string } | null }) {
  if (post.is_anonymous) return '익명'
  return post.author?.nickname ?? '탈퇴한 회원'
}
