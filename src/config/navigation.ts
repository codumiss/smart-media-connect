import {
  CalendarDays,
  House,
  LayoutGrid,
  MessagesSquare,
  NotebookText,
  Settings,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
  /** 기획서 메뉴 설명 */
  description: string
  /** 기능 개발용 브랜치 이름 */
  branch?: string
  /** 기획서에 적힌 기능 후보 (확정 아님) */
  plannedFeatures: string[]
  /** 모바일 하단 메뉴에 노출할지 */
  mobileTab?: boolean
  adminOnly?: boolean
}

/** 기획서 7장 사이트 메뉴(IA) 기준 */
export const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: '홈',
    icon: House,
    description: '학과 일정, 공지, 게시글, 모집 중인 팀, 마감 임박 공모전을 한눈에 보는 통합 대시보드',
    branch: 'feature/dashboard',
    plannedFeatures: ['오늘의 학과 일정', '최신 공지사항', '최근 정보방 게시글', '모집 중인 팀 프로젝트', '마감 임박 공모전', '최근 채팅 및 참여 중인 팀룸'],
    mobileTab: true,
  },
  {
    path: '/chat',
    label: '소통',
    icon: MessagesSquare,
    description: '학년과 관계없이 익명·실명으로 소통하는 공간',
    branch: 'feature/chat',
    plannedFeatures: ['익명 채팅', '실명 채팅', '1:1 채팅', '그룹 채팅', '관심사별 채팅방 생성 및 검색', '신고·도배 관리'],
    mobileTab: true,
  },
  {
    path: '/notice',
    label: '학과 일정',
    icon: CalendarDays,
    description: '학과 공지사항과 학사 일정 캘린더',
    branch: 'feature/notice',
    plannedFeatures: ['학과 공지사항', '학사 일정 캘린더', '중요 공지 고정', '일정 상세 보기', '공지 마감일과 캘린더 연결'],
  },
  {
    path: '/community',
    label: '정보방',
    icon: NotebookText,
    description: '전공 및 학교생활 정보를 카테고리별로 공유하는 커뮤니티',
    branch: 'feature/community',
    plannedFeatures: ['카테고리별 게시판', '게시글 등록/수정/삭제', '댓글', '공감/좋아요', '검색', '팀원 모집 게시글'],
    mobileTab: true,
  },
  {
    path: '/team',
    label: '팀룸',
    icon: Users,
    description: '팀을 만들고 초대 코드로 모여 협업하는 공간',
    branch: 'feature/team-room',
    plannedFeatures: ['팀룸 생성', '고유 초대 코드 발급', '코드로 팀룸 참여', '팀 채팅', '회의 일정 등록', '링크/파일 자료 공유', '방장 권한·팀원 관리'],
    mobileTab: true,
  },
  {
    path: '/contest',
    label: '공모전',
    icon: Trophy,
    description: '공모전·대외활동·캠프 정보를 한곳에서',
    branch: 'feature/contest',
    plannedFeatures: ['목록 및 상세 정보', '분야별 필터', '마감일 및 D-day', '관심 공모전 즐겨찾기', '공모전 상세에서 팀원 모집 연결'],
  },
  {
    path: '/mypage',
    label: '마이페이지',
    icon: User,
    description: '내 정보와 활동 내역',
    branch: 'feature/auth',
    plannedFeatures: ['회원가입 및 로그인', '프로필 정보', '학과 구성원 인증', '내 활동 내역'],
  },
  {
    path: '/admin',
    label: '관리자',
    icon: Settings,
    description: '회원·게시물·공지·일정 관리',
    branch: 'feature/admin',
    plannedFeatures: ['공지 작성·수정·삭제', '학사 일정 관리', '회원 및 권한 관리', '신고 처리', '공모전 데이터 관리'],
    adminOnly: true,
  },
]

/** 모바일 하단 메뉴의 '더보기' 탭 */
export const MORE_TAB = { path: '/more', label: '더보기', icon: LayoutGrid }

export const findNavItem = (path: string) => NAV_ITEMS.find((item) => item.path === path)
