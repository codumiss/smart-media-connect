# SMART MEDIA CONNECT (가칭)

> 소통을 연결하고, 가능성을 확장하다.

스마트미디어학과 학생 간 소통 부족과 정보 분산 문제를 해결하기 위한 **학과 전용 소통·정보 공유·협업 플랫폼**입니다.
반응형 웹 + PWA로 PC와 모바일에서 모두 사용할 수 있게 만듭니다.

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19 + Vite + TypeScript |
| 스타일 | Tailwind CSS v4 |
| 라우팅 | React Router |
| 백엔드 / DB / 인증 | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| PWA | vite-plugin-pwa (Web App Manifest, Service Worker) |
| 아이콘 | lucide-react |
| 글꼴 | Pretendard (웹폰트 — 안드로이드·iOS·PC 동일하게 표시) |
| 배포 | Vercel |

## 실행 방법

```bash
npm install
cp .env.example .env.local   # Supabase URL / anon key 입력 (팀원에게 따로 받기)
npm run dev                  # http://localhost:5173
```

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 체크 + 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 (PWA 동작 확인용) |
| `npm run lint` | oxlint 검사 |

## 폴더 구조

```
supabase/migrations/        # DB 테이블·권한(RLS) SQL. DB 구조는 이 파일이 기준
vercel.json                 # 새로고침 404 방지 (모든 경로 → index.html)
src/
├─ App.tsx                  # 라우팅 (로그인 / 관리자 / 일반 화면)
├─ config/navigation.ts     # 메뉴(IA) 정의
├─ components/
│  ├─ auth/guards.tsx       # RequireAuth, RequireAdmin, GuestOnly
│  ├─ layout/               # AppLayout, Sidebar(PC), BottomNav(모바일), Logo, UserBadge
│  ├─ ReportButton.tsx      # 신고 버튼 (게시글·댓글·채팅에 붙여서 사용)
│  └─ PlaceholderPage.tsx   # 기능 구현 전 임시 화면
├─ lib/
│  ├─ supabase.ts           # Supabase 클라이언트 (supabase, db())
│  ├─ auth.tsx              # 로그인 상태, 프로필, isAdmin (useAuth)
│  ├─ adminAlerts.tsx       # 관리자 신고 알림 (실시간)
│  ├─ types.ts  errors.ts
└─ pages/
   ├─ auth/                 # 로그인, 회원가입
   ├─ admin/                # 관리자 전용 (별도 레이아웃): 대시보드, 신고, 회원, 공지·일정
   ├─ home/  chat/  notice/  community/  team/  mypage/
   ├─ contest/              # 확장 계획 — '준비 중' 화면
   ├─ MorePage.tsx          # 모바일 '더보기'
   └─ NotFoundPage.tsx
```

## 로그인 · 관리자

- 로그인하지 않으면 모든 화면이 로그인 화면으로 이동합니다.
- 회원가입하면 모두 **일반 회원**입니다. 화면에 이름이 표시됩니다.
- **관리자** 계정으로 로그인하면 '관리자'로 표시되고 `/admin` 관리자 화면으로 이동합니다. 관리자 화면은 일반 회원이 들어올 수 없습니다.
- 관리자 지정 방법
  - 처음 한 번: 관리자로 쓸 계정을 회원가입한 뒤 Supabase SQL Editor 에서 실행
    ```sql
    update public.profiles set role = 'admin'
    where id = (select id from auth.users where email = '관리자이메일@example.com');
    ```
  - 그다음부터: 관리자 화면 → 회원 관리 → 관리자 지정

화면에서 쓰는 법

```tsx
const { profile, isAdmin, displayName } = useAuth()   // displayName: 관리자면 '관리자', 아니면 이름
```

## Supabase

- 프로젝트: `smart-media-connect` (서울 리전). URL·키는 `.env.local` 에 넣습니다. **GitHub 에 올리지 않습니다.**
- 테이블과 권한은 `supabase/migrations/` 의 SQL 순서대로 적용돼 있습니다.

| 파일 | 내용 |
|---|---|
| `..._profiles_auth.sql` | 회원(profiles), 개인정보(profile_private), 가입 시 프로필 자동 생성, 관리자 함수 |
| `..._board.sql` | 알림, 실제 작성자 보관(content_authors), 공지, 학사 일정, 정보방 글·댓글·공감 |
| `..._team_chat.sql` | 팀룸(방 키), 팀원, 회의 일정, 자료 링크, 채팅방(공개·팀·1:1), 메시지(익명 번호) |
| `..._recruit.sql` | 팀원 모집, 참여 신청, 승인 시 팀룸 자동 참여 |
| `..._reports.sql` | 신고, 관리자 알림, 3건 누적 자동 숨김, 관리자 처리 함수 |
| `..._grants_realtime.sql` | 컬럼 단위 권한, 함수 실행 권한, Realtime(메시지·알림·신고) |
| `..._seed.sql` | 기본 소통방 3개, 공모전 일정 |

권한 규칙 (RLS)

- 로그인하지 않은 사용자는 어떤 테이블도 읽을 수 없습니다.
- **익명 글·댓글·채팅**: 본문 테이블의 `author_id` 가 비어 있고, 실제 작성자는 `content_authors` 에만 있습니다. 본인과 관리자만 볼 수 있습니다.
- 학생은 자기 `role` 을 바꿀 수 없고, 글의 숨김 여부(`is_hidden`)도 직접 바꿀 수 없습니다.
- 팀룸·팀 채팅은 팀원만 볼 수 있습니다. 방 키로 들어갈 때는 `rpc('join_team_room', { p_code })` 를 씁니다.
- 공지·학사 일정은 관리자만 작성합니다.

자주 쓰는 함수 (`supabase.rpc(이름, 인자)`)

| 함수 | 용도 |
|---|---|
| `join_team_room(p_code)` | 방 키로 팀룸 참여 → 팀룸 id |
| `start_direct_chat(p_user_id)` | 1:1 채팅방 열기 → 채팅방 id |
| `respond_application(p_application_id, p_accept)` | 모집 글 작성자가 신청 승인/거절 |
| `is_nickname_available(p_nickname)` | 닉네임 중복 확인 |
| `handle_report` / `moderate_content` / `admin_report_detail` / `set_user_role` | 관리자 전용 |

> **새 테이블을 만들 때**: 기본으로 아무 권한이 없습니다. `enable row level security` + 정책 + `grant` 를 같이 작성하고, `supabase/migrations/` 에 SQL 파일로 남겨 주세요.

> **이메일 인증**: Supabase 기본 설정은 가입 시 인증 메일을 보내고, 무료 메일 발송은 시간당 몇 통으로 제한됩니다. 개발·시연 기간에는 Supabase 대시보드 → Authentication → Sign In / Providers → Email → **Confirm email 끄기**를 권장합니다.

## 브랜치 전략

```
main        ← 제출/배포용. 직접 push 하지 않고 PR 로만 합침
 ├─ arin    ← 조아린 작업 브랜치
 └─ jiseob  ← 신지섭 작업 브랜치
```

작업 순서

```bash
git switch arin                    # 1. 내 브랜치로 이동
git pull origin main               # 2. 작업 시작 전 최신 main 반영
# ... 개발 ...
git add . && git commit -m "feat(notice): 공지 목록 화면"
git push origin arin               # 3. 푸시
# 4. GitHub 에서 arin → main Pull Request 생성 → 상대가 확인 후 Merge
```

- 각 기능은 되도록 **자기 폴더(`src/pages/<기능>/`) 안에서만** 수정합니다. 충돌이 줄어듭니다.
- 공통 파일(`App.tsx`, `navigation.ts`, `lib/`, `supabase/`)을 고칠 때는 먼저 상대에게 알리고, PR 을 빨리 합칩니다.
- PR 이 main 에 합쳐지면 상대도 `git pull origin main` 으로 받아갑니다.

커밋 메시지 규칙: `feat`(기능), `fix`(버그), `style`(UI), `refactor`, `docs`, `chore`(설정)

## 배포 (Vercel)

1. Vercel 에서 GitHub 저장소 Import (Framework: Vite)
2. Environment Variables 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 입력
3. Production Branch: `main`
4. Supabase 대시보드 → Authentication → URL Configuration 의 Site URL 을 Vercel 주소로 변경

`vercel.json` 이 모든 경로를 `index.html` 로 보내서 `/chat` 같은 주소에서 새로고침해도 404 가 나지 않습니다.

## 공모전 일정

| 구분 | 일정 |
|---|---|
| 작품 결과물 제출 | 11/30(월) 14:00 |
| 발표 자료(PPT) 제출 | 12/2(수) 09:00 |
| 최종 발표 | 12/2(수) 16:30, 공학1관 231호 (발표 5분 + 질의응답 2분) |
