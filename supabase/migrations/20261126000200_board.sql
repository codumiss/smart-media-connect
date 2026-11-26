-- ============================================================
-- 02. 알림 · 작성자 보호 · 공지 · 학사 일정 · 정보방
-- ============================================================

-- ---------- 알림 ----------
-- 알림은 트리거·함수로만 만들어지고, 본인 것만 보임
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,            -- report / application / application_result / team_join
  title       text not null,
  body        text,
  link        text,                     -- 클릭 시 이동할 화면 경로
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

create policy "notifications: 본인 조회"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: 본인 읽음 처리"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications: 본인 삭제"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- 실제 작성자 보관 ----------
-- 게시글·댓글·채팅 메시지의 실제 작성자를 따로 저장합니다.
-- 익명 글은 본문 테이블의 author_id 가 null 이고, 실제 작성자는 여기에만 있습니다.
-- 이 테이블은 본인 것과 관리자만 볼 수 있어서 다른 학생은 익명 작성자를 알 수 없습니다.
create table public.content_authors (
  target_type text not null check (target_type in ('post', 'comment', 'message')),
  target_id   uuid not null,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (target_type, target_id)
);
create index content_authors_author_idx on public.content_authors (author_id);
alter table public.content_authors enable row level security;

create policy "content_authors: 본인·관리자 조회"
  on public.content_authors for select to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

create or replace function public.is_content_author(p_type text, p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.content_authors
    where target_type = p_type and target_id = p_id and author_id = (select auth.uid())
  );
$$;

-- 글 작성 시: 작성자를 로그인 사용자로 고정하고, 익명이면 author_id 를 비움
-- (클라이언트가 보낸 author_id 는 무시)
create or replace function public.set_content_author()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := coalesce((select auth.uid()), new.author_id);  -- SQL 편집기 시드용
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  new.author_id := case when new.is_anonymous then null else v_uid end;
  insert into public.content_authors (target_type, target_id, author_id)
  values (tg_argv[0], new.id, v_uid);
  return new;
end;
$$;

create or replace function public.delete_content_author()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.content_authors where target_type = tg_argv[0] and target_id = old.id;
  return old;
end;
$$;

-- ---------- 학과 공지 (관리자 작성) ----------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 100),
  body        text not null check (char_length(body) <= 10000),
  is_pinned   boolean not null default false,
  author_id   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index announcements_list_idx on public.announcements (is_pinned desc, created_at desc);
alter table public.announcements enable row level security;
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create policy "announcements: 로그인 회원 조회"
  on public.announcements for select to authenticated using (true);
create policy "announcements: 관리자 작성"
  on public.announcements for insert to authenticated with check (public.is_admin());
create policy "announcements: 관리자 수정"
  on public.announcements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "announcements: 관리자 삭제"
  on public.announcements for delete to authenticated using (public.is_admin());

-- ---------- 학사 일정 (관리자 작성, 공지와 연결 가능) ----------
create table public.schedules (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 1 and 100),
  description      text,
  category         text not null default 'academic'
                   check (category in ('academic', 'exam', 'event', 'council', 'deadline')),
  starts_on        date not null,
  ends_on          date,
  announcement_id  uuid references public.announcements (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index schedules_date_idx on public.schedules (starts_on);
alter table public.schedules enable row level security;

create policy "schedules: 로그인 회원 조회"
  on public.schedules for select to authenticated using (true);
create policy "schedules: 관리자 작성"
  on public.schedules for insert to authenticated with check (public.is_admin());
create policy "schedules: 관리자 수정"
  on public.schedules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "schedules: 관리자 삭제"
  on public.schedules for delete to authenticated using (public.is_admin());

-- ---------- 정보방 게시글 ----------
-- category: notice(학과 소식) / equipment(장비·실습실) / contest(공모전·대외활동)
--           recruit(팀원 모집) / free(자유)
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  category      text not null check (category in ('notice', 'equipment', 'contest', 'recruit', 'free')),
  title         text not null check (char_length(title) between 1 and 100),
  body          text not null check (char_length(body) between 1 and 5000),
  is_anonymous  boolean not null default false,
  author_id     uuid references public.profiles (id) on delete set null,  -- 익명이면 null
  is_hidden     boolean not null default false,                           -- 관리자 숨김 / 신고 누적
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- 팀원 모집 글은 신청·승인을 위해 실명만 가능
  check (category <> 'recruit' or not is_anonymous)
);
create index posts_list_idx on public.posts (category, created_at desc);
alter table public.posts enable row level security;

create trigger posts_set_author before insert on public.posts
  for each row execute function public.set_content_author('post');
create trigger posts_delete_author after delete on public.posts
  for each row execute function public.delete_content_author('post');
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create policy "posts: 조회 (숨김 글은 작성자·관리자만)"
  on public.posts for select to authenticated
  using (not is_hidden or public.is_admin() or public.is_content_author('post', id));
create policy "posts: 로그인 회원 작성"
  on public.posts for insert to authenticated with check (true);
create policy "posts: 작성자 수정"
  on public.posts for update to authenticated
  using (public.is_content_author('post', id))
  with check (public.is_content_author('post', id));
create policy "posts: 작성자·관리자 삭제"
  on public.posts for delete to authenticated
  using (public.is_content_author('post', id) or public.is_admin());

-- ---------- 댓글 ----------
create table public.comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 1000),
  is_anonymous  boolean not null default false,
  author_id     uuid references public.profiles (id) on delete set null,
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;

create trigger comments_set_author before insert on public.comments
  for each row execute function public.set_content_author('comment');
create trigger comments_delete_author after delete on public.comments
  for each row execute function public.delete_content_author('comment');

create policy "comments: 조회"
  on public.comments for select to authenticated
  using (not is_hidden or public.is_admin() or public.is_content_author('comment', id));
create policy "comments: 로그인 회원 작성"
  on public.comments for insert to authenticated with check (true);
create policy "comments: 작성자 수정"
  on public.comments for update to authenticated
  using (public.is_content_author('comment', id))
  with check (public.is_content_author('comment', id));
create policy "comments: 작성자·관리자 삭제"
  on public.comments for delete to authenticated
  using (public.is_content_author('comment', id) or public.is_admin());

-- ---------- 공감 ----------
create table public.post_likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);
alter table public.post_likes enable row level security;

create policy "post_likes: 로그인 회원 조회"
  on public.post_likes for select to authenticated using (true);
create policy "post_likes: 본인 공감"
  on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "post_likes: 본인 취소"
  on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
