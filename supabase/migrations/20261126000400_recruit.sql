-- ============================================================
-- 04. 팀원 모집 · 참여 신청
-- ============================================================
-- 흐름: 정보방에 모집 글(category = 'recruit') 작성 → recruitments 에 모집 정보 저장
--       → 다른 학생이 applications 로 신청 → 작성자가 승인
--       → 모집 글에 팀룸이 연결돼 있으면 승인과 동시에 팀룸 팀원으로 자동 추가

create table public.recruitments (
  post_id       uuid primary key references public.posts (id) on delete cascade,
  project_name  text not null check (char_length(project_name) between 1 and 100),
  fields        text check (char_length(fields) <= 200),   -- 모집 분야 (예: 프론트엔드, 디자인)
  headcount     smallint check (headcount between 1 and 20),
  skills        text check (char_length(skills) <= 300),   -- 필요한 기술·역량
  deadline      date,
  method        text check (char_length(method) <= 200),   -- 진행 방식 (온라인/오프라인 등)
  status        text not null default 'open' check (status in ('open', 'closed')),
  team_room_id  uuid references public.team_rooms (id) on delete set null
);
alter table public.recruitments enable row level security;

create or replace function public.is_recruit_owner(p_post_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.posts
    where id = p_post_id and category = 'recruit' and author_id = (select auth.uid())
  );
$$;

create policy "recruitments: 로그인 회원 조회"
  on public.recruitments for select to authenticated using (true);
create policy "recruitments: 모집 글 작성자 등록"
  on public.recruitments for insert to authenticated
  with check (
    public.is_recruit_owner(post_id)
    and (team_room_id is null or public.is_team_owner(team_room_id))
  );
create policy "recruitments: 모집 글 작성자 수정"
  on public.recruitments for update to authenticated
  using (public.is_recruit_owner(post_id))
  with check (
    public.is_recruit_owner(post_id)
    and (team_room_id is null or public.is_team_owner(team_room_id))
  );

create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  recruitment_id  uuid not null references public.recruitments (post_id) on delete cascade,
  applicant_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  message         text check (char_length(message) <= 500),
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  unique (recruitment_id, applicant_id)
);
create index applications_recruit_idx on public.applications (recruitment_id);
create index applications_applicant_idx on public.applications (applicant_id);
alter table public.applications enable row level security;

create policy "applications: 신청자·모집자·관리자 조회"
  on public.applications for select to authenticated
  using (
    applicant_id = (select auth.uid())
    or public.is_recruit_owner(recruitment_id)
    or public.is_admin()
  );
create policy "applications: 모집 중인 글에 신청"
  on public.applications for insert to authenticated
  with check (
    applicant_id = (select auth.uid())
    and status = 'pending'
    and not public.is_recruit_owner(recruitment_id)
    and exists (select 1 from public.recruitments r where r.post_id = recruitment_id and r.status = 'open')
  );
create policy "applications: 대기 중인 신청 취소"
  on public.applications for delete to authenticated
  using (applicant_id = (select auth.uid()) and status = 'pending');

-- 신청 → 모집자에게 알림
create or replace function public.notify_new_application()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner   uuid;
  v_project text;
  v_name    text;
begin
  select p.author_id, r.project_name into v_owner, v_project
  from public.recruitments r join public.posts p on p.id = r.post_id
  where r.post_id = new.recruitment_id;
  select name into v_name from public.profiles where id = new.applicant_id;

  if v_owner is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_owner, 'application', '새 참여 신청이 있습니다',
            v_name || '님이 ' || v_project || '에 참여를 신청했습니다.',
            '/community/' || new.recruitment_id);
  end if;
  return new;
end;
$$;

create trigger applications_notify after insert on public.applications
  for each row execute function public.notify_new_application();

-- 모집자: 신청 승인/거절
create or replace function public.respond_application(p_application_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_app     public.applications%rowtype;
  v_rec     public.recruitments%rowtype;
begin
  select * into v_app from public.applications where id = p_application_id;
  if v_app.id is null then
    raise exception '신청을 찾을 수 없습니다.';
  end if;
  if not public.is_recruit_owner(v_app.recruitment_id) then
    raise exception '모집 글 작성자만 처리할 수 있습니다.';
  end if;
  if v_app.status <> 'pending' then
    raise exception '이미 처리된 신청입니다.';
  end if;

  select * into v_rec from public.recruitments where post_id = v_app.recruitment_id;

  update public.applications
  set status = case when p_accept then 'accepted' else 'rejected' end,
      decided_at = now()
  where id = p_application_id;

  if p_accept and v_rec.team_room_id is not null then
    insert into public.team_members (room_id, user_id)
    values (v_rec.team_room_id, v_app.applicant_id)
    on conflict do nothing;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_app.applicant_id,
    'application_result',
    case when p_accept then '참여 신청이 승인되었습니다' else '참여 신청이 거절되었습니다' end,
    v_rec.project_name,
    case when p_accept and v_rec.team_room_id is not null
         then '/team/' || v_rec.team_room_id
         else '/community/' || v_rec.post_id end
  );
end;
$$;
