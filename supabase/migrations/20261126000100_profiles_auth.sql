-- ============================================================
-- 01. 회원(profiles) · 권한 · 공통 함수
-- ============================================================
-- 역할: student(일반) / admin(관리자)
-- 관리자는 회원가입으로 될 수 없고, 관리자가 지정하거나 SQL로만 지정합니다.
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = '관리자이메일');

-- 공개 프로필: 로그인한 학과 구성원 모두 볼 수 있음
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 30),
  nickname    text not null unique check (char_length(nickname) between 2 and 20),
  grade       smallint check (grade between 1 and 4),
  avatar_url  text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  created_at  timestamptz not null default now()
);

-- 개인 정보: 본인과 관리자만 볼 수 있음
create table public.profile_private (
  id          uuid primary key references public.profiles (id) on delete cascade,
  student_id  text check (student_id ~ '^[0-9]{6,12}$'),
  email       text
);

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;

-- ---------- 공통 함수 ----------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 회원가입 시 auth.users → profiles 자동 생성
-- (role 은 항상 student. 가입 정보로 관리자가 될 수 없음)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name    text  := nullif(trim(meta ->> 'name'), '');
  v_nick    text  := nullif(trim(meta ->> 'nickname'), '');
  v_grade   smallint;
  v_student text  := nullif(trim(meta ->> 'student_id'), '');
begin
  if (meta ->> 'grade') ~ '^[1-4]$' then
    v_grade := (meta ->> 'grade')::smallint;
  end if;

  v_name := coalesce(v_name, split_part(new.email, '@', 1));
  v_nick := coalesce(v_nick, 'user_' || substr(new.id::text, 1, 8));
  -- 닉네임이 이미 있으면 뒤에 붙여서 가입 실패를 막음
  if exists (select 1 from public.profiles where nickname = v_nick) then
    v_nick := left(v_nick, 15) || '_' || substr(new.id::text, 1, 4);
  end if;

  if v_student is not null and v_student !~ '^[0-9]{6,12}$' then
    v_student := null;
  end if;

  insert into public.profiles (id, name, nickname, grade)
  values (new.id, left(v_name, 30), v_nick, v_grade);

  insert into public.profile_private (id, student_id, email)
  values (new.id, v_student, new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 가입 화면에서 닉네임 중복 확인 (로그인 전에도 호출 가능)
create or replace function public.is_nickname_available(p_nickname text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.profiles where nickname = trim(p_nickname));
$$;

-- 관리자: 회원 역할 변경
create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 변경할 수 있습니다.';
  end if;
  if p_role not in ('student', 'admin') then
    raise exception '알 수 없는 역할입니다.';
  end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception '자기 자신의 관리자 권한은 해제할 수 없습니다.';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- ---------- RLS ----------

create policy "profiles: 로그인 회원 조회"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles: 본인 수정"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profile_private: 본인·관리자 조회"
  on public.profile_private for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profile_private: 본인 수정"
  on public.profile_private for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
