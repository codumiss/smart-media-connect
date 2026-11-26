-- ============================================================
-- 05. 신고 · 관리자 알림 · 관리자 조치
-- ============================================================
-- 신고 접수 → 모든 관리자에게 notifications 생성 (Realtime 으로 관리자 화면에 바로 표시)
-- 서로 다른 학생 3명 이상이 같은 대상을 신고하면 자동으로 숨김 처리

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('post', 'comment', 'message')),
  target_id    uuid not null,
  reason       text not null check (reason in ('abuse', 'spam', 'sexual', 'privacy', 'etc')),
  detail       text check (char_length(detail) <= 500),
  reporter_id  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  status       text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  handled_by   uuid references public.profiles (id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)   -- 같은 사람이 같은 대상을 여러 번 신고할 수 없음
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);
alter table public.reports enable row level security;

create policy "reports: 신고자·관리자 조회"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "reports: 로그인 회원 신고"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'pending');

-- 신고 대상이 존재하고 신고자가 볼 수 있는지 확인 + 자기 글 신고 방지
create or replace function public.report_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_exists boolean;
begin
  new.reporter_id := (select auth.uid());
  if new.reporter_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  v_exists := case new.target_type
    when 'post'    then exists (select 1 from public.posts where id = new.target_id)
    when 'comment' then exists (select 1 from public.comments where id = new.target_id)
    when 'message' then exists (
      select 1 from public.messages m
      join public.chat_members cm on cm.room_id = m.room_id and cm.user_id = new.reporter_id
      where m.id = new.target_id)
  end;
  if not v_exists then
    raise exception '신고할 대상을 찾을 수 없습니다.';
  end if;

  if exists (
    select 1 from public.content_authors
    where target_type = new.target_type and target_id = new.target_id and author_id = new.reporter_id
  ) then
    raise exception '자신이 쓴 글은 신고할 수 없습니다.';
  end if;

  return new;
end;
$$;

create or replace function public.set_content_hidden(p_type text, p_id uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_type = 'post' then
    update public.posts set is_hidden = p_hidden where id = p_id;
  elsif p_type = 'comment' then
    update public.comments set is_hidden = p_hidden where id = p_id;
  elsif p_type = 'message' then
    update public.messages set is_hidden = p_hidden where id = p_id;
  else
    raise exception '알 수 없는 대상입니다.';
  end if;
end;
$$;

create or replace function public.report_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_label  text := case new.target_type when 'post' then '게시글' when 'comment' then '댓글' else '채팅' end;
  v_reason text := case new.reason
                     when 'abuse' then '욕설·비방' when 'spam' then '도배·광고'
                     when 'sexual' then '음란·선정성' when 'privacy' then '개인정보 노출'
                     else '기타' end;
  v_count  int;
begin
  insert into public.notifications (user_id, type, title, body, link)
  select id, 'report', '새 신고가 접수되었습니다', v_label || ' · ' || v_reason, '/admin/reports'
  from public.profiles where role = 'admin';

  select count(*) into v_count from public.reports
  where target_type = new.target_type and target_id = new.target_id and status = 'pending';
  if v_count >= 3 then
    perform public.set_content_hidden(new.target_type, new.target_id, true);
  end if;
  return new;
end;
$$;

create trigger reports_before_insert before insert on public.reports
  for each row execute function public.report_before_insert();
create trigger reports_after_insert after insert on public.reports
  for each row execute function public.report_after_insert();

-- 관리자: 신고 처리
--   p_status = 'resolved'  → 신고 인정, p_hide 가 true 면 대상 숨김
--   p_status = 'dismissed' → 신고 기각, 대상 숨김 해제
-- 같은 대상에 들어온 대기 중 신고를 한 번에 처리
create or replace function public.handle_report(p_report_id uuid, p_status text, p_hide boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports%rowtype;
begin
  if not public.is_admin() then
    raise exception '관리자만 처리할 수 있습니다.';
  end if;
  if p_status not in ('resolved', 'dismissed') then
    raise exception '처리 상태가 올바르지 않습니다.';
  end if;

  select * into v_report from public.reports where id = p_report_id;
  if v_report.id is null then
    raise exception '신고를 찾을 수 없습니다.';
  end if;

  update public.reports
  set status = p_status, handled_by = (select auth.uid()), handled_at = now()
  where target_type = v_report.target_type and target_id = v_report.target_id and status = 'pending';

  perform public.set_content_hidden(
    v_report.target_type, v_report.target_id,
    case when p_status = 'resolved' then p_hide else false end
  );
end;
$$;

-- 관리자: 신고 없이 직접 숨김/해제
create or replace function public.moderate_content(p_type text, p_id uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 처리할 수 있습니다.';
  end if;
  perform public.set_content_hidden(p_type, p_id, p_hidden);
end;
$$;

-- 관리자 화면: 신고 대상 내용과 실제 작성자 확인
create or replace function public.admin_report_detail(p_report_id uuid)
returns table (
  target_type   text,
  target_id     uuid,
  content       text,
  is_hidden     boolean,
  author_id     uuid,
  author_name   text,
  author_nick   text,
  report_count  bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_report public.reports%rowtype;
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다.';
  end if;
  select * into v_report from public.reports where id = p_report_id;

  return query
  select
    v_report.target_type,
    v_report.target_id,
    case v_report.target_type
      when 'post'    then (select p.title || E'\n' || p.body from public.posts p where p.id = v_report.target_id)
      when 'comment' then (select c.body from public.comments c where c.id = v_report.target_id)
      else (select m.body from public.messages m where m.id = v_report.target_id)
    end,
    case v_report.target_type
      when 'post'    then (select p.is_hidden from public.posts p where p.id = v_report.target_id)
      when 'comment' then (select c.is_hidden from public.comments c where c.id = v_report.target_id)
      else (select m.is_hidden from public.messages m where m.id = v_report.target_id)
    end,
    ca.author_id,
    pr.name,
    pr.nickname,
    (select count(*) from public.reports r
     where r.target_type = v_report.target_type and r.target_id = v_report.target_id)
  from (select 1) as one
  left join public.content_authors ca
    on ca.target_type = v_report.target_type and ca.target_id = v_report.target_id
  left join public.profiles pr on pr.id = ca.author_id;
end;
$$;
