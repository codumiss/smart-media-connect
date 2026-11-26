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
| 백엔드 / DB / 인증 | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| PWA | vite-plugin-pwa (Web App Manifest, Service Worker) |
| 아이콘 | lucide-react |

## 실행 방법

```bash
npm install
cp .env.example .env.local   # Supabase URL / anon key 입력
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
src/
├─ App.tsx                  # 라우팅
├─ config/navigation.ts     # 메뉴(IA) 정의: 라벨, 아이콘, 담당 브랜치
├─ components/
│  ├─ layout/               # AppLayout, Sidebar(PC), BottomNav(모바일), Logo
│  └─ PlaceholderPage.tsx   # 기능 구현 전 임시 화면
├─ lib/supabase.ts          # Supabase 클라이언트
└─ pages/                   # 기능별 폴더 (브랜치 1개 = 폴더 1개)
   ├─ home/  chat/  notice/  community/
   ├─ team/  contest/  mypage/  admin/
   ├─ MorePage.tsx          # 모바일 '더보기'
   └─ NotFoundPage.tsx
```

## 브랜치 전략

```
main      ← 제출/배포용 (안정 버전만)
 └─ develop   ← 기능을 합치는 통합 브랜치
     ├─ feature/auth        회원가입·로그인·마이페이지
     ├─ feature/notice      학과 공지·학사 일정
     ├─ feature/community   정보방
     ├─ feature/chat        익명·실명 채팅
     ├─ feature/team-room   팀룸
     ├─ feature/contest     공모전
     ├─ feature/admin       관리자
     ├─ feature/dashboard   메인 대시보드
     └─ feature/pwa         PWA 마무리
```

작업 순서

```bash
git switch feature/notice          # 1. 기능 브랜치로 이동
git merge develop                  # 2. 최신 develop 반영
# ... 개발 ...
git add . && git commit -m "feat(notice): 공지 목록 화면"
git push -u origin feature/notice  # 3. 푸시

git switch develop                 # 4. 기능 완성 후 develop에 합치기
git merge --no-ff feature/notice
git push

# 5. 제출 직전 develop → main
git switch main && git merge --no-ff develop && git push
```

- 각 기능은 되도록 **자기 폴더(`src/pages/<기능>/`) 안에서만** 수정합니다. 다른 브랜치와 충돌이 줄어듭니다.
- 공통 파일(`App.tsx`, `navigation.ts`, `lib/`)을 고칠 일이 생기면 develop에서 먼저 고치고, 각 기능 브랜치에서 `git merge develop`으로 받아갑니다.

커밋 메시지 규칙: `feat`(기능), `fix`(버그), `style`(UI), `refactor`, `docs`, `chore`(설정)

## 공모전 일정

| 구분 | 일정 |
|---|---|
| 작품 결과물 제출 | 11/30(월) 14:00 |
| 발표 자료(PPT) 제출 | 12/2(수) 09:00 |
| 최종 발표 | 12/2(수) 16:30, 공학1관 231호 (발표 5분 + 질의응답 2분) |
