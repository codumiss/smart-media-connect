-- ============================================================
-- 03. 팀룸 · 채팅
-- ============================================================

-- ---------- 팀룸 ----------
create or replace function public.generate_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 헷갈리는 0/O, 1/I 제외
  code  text;
begin
  loop
    code := 'SM-';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.team_rooms where invite_code = code);
  end loop;
  return code;
end;
$$;

create table public.team_rooms (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 50),
  description  text check (char_length(description) <= 500),
  invite_code  text not null unique,
  owner_id     uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.team_rooms
  alter column invite_code set default public.generate_invite_code();
alter table public.team_rooms enable row level security;

create table public.team_members (
  room_id    uuid not null references public.team_rooms (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index team_members_user_idx on public.team_members (user_id);
alter table public.team_members enable row level security;

create or replace function public.is_team_member(p_room_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members where room_id = p_room_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_team_owner(p_room_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_rooms where id = p_room_id and owner_id = (select auth.uid())
  );
$$;

-- ---------- 채팅 ----------
-- kind: open(누구나 참여하는 소통방) / team(팀룸 전용) / direct(1:1)
create table public.chat_rooms (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null default 'open' check (kind in ('open', 'team', 'direct')),
  name             text check (char_length(name) <= 50),
  description      text check (char_length(description) <= 300),
  is_anonymous     boolean not null default false,
  team_room_id     uuid unique references public.team_rooms (id) on delete cascade,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz,
  check (kind = 'open' or not is_anonymous),          -- 익명은 공개 소통방만
  check (kind <> 'open' or name is not null)
);
alter table public.chat_rooms enable row level security;

create table public.chat_members (
  room_id    uuid not null references public.chat_rooms (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  joined_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index chat_members_user_idx on public.chat_members (user_id);
alter table public.chat_members enable row level security;

-- 익명방에서 사람마다 '익명1', '익명2' 번호를 고정 (실제 사용자와의 연결은 관리자만)
create table public.chat_anon_aliases (
  room_id   uuid not null references public.chat_rooms (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  alias_no  int not null,
  primary key (room_id, user_id),
  unique (room_id, alias_no)
);
alter table public.chat_anon_aliases enable row level security;

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.chat_rooms (id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  is_anonymous  boolean not null default false,
  author_id     uuid references public.profiles (id) on delete set null,  -- 익명방이면 null
  anon_label    text,                                                     -- 예: 익명3
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index messages_room_idx on public.messages (room_id, created_at);
alter table public.messages enable row level security;

create or replace function public.is_chat_member(p_room_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.chat_members where room_id = p_room_id and user_id = (select auth.uid())
  );
$$;

-- ---------- 트리거 ----------

-- 팀룸 생성: 방장 지정 → 방장을 팀원으로 추가 → 팀 채팅방 생성
create or replace function public.team_room_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.owner_id := coalesce((select auth.uid()), new.owner_id);
  if new.owner_id is null then
    raise exception '로그인이 필요합니다.';
  end if;
  return new;
end;
$$;

create or replace function public.team_room_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_chat_id uuid;
begin
  insert into public.team_members (room_id, user_id, role) values (new.id, new.owner_id, 'owner');
  insert into public.chat_rooms (kind, name, team_room_id, created_by)
  values ('team', new.name, new.id, new.owner_id)
  returning id into v_chat_id;
  insert into public.chat_members (room_id, user_id) values (v_chat_id, new.owner_id);
  return new;
end;
$$;

create trigger team_rooms_before_insert before insert on public.team_rooms
  for each row execute function public.team_room_before_insert();
create trigger team_rooms_after_insert after insert on public.team_rooms
  for each row execute function public.team_room_after_insert();

-- 팀원 추가/삭제 시 팀 채팅방 참여자도 같이 맞춤
create or replace function public.sync_team_chat_member()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.chat_members (room_id, user_id)
    select id, new.user_id from public.chat_rooms where team_room_id = new.room_id
    on conflict do nothing;
    return new;
  else
    delete from public.chat_members
    where user_id = old.user_id
      and room_id in (select id from public.chat_rooms where team_room_id = old.room_id);
    return old;
  end if;
end;
$$;

create trigger team_members_sync_chat after insert or delete on public.team_members
  for each row execute function public.sync_team_chat_member();

-- 공개 소통방 생성: 만든 사람 기록 + 자동 참여
create or replace function public.chat_room_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.created_by := coalesce((select auth.uid()), new.created_by);
  return new;
end;
$$;

create or replace function public.chat_room_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.kind = 'open' and new.created_by is not null then
    insert into public.chat_members (room_id, user_id) values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger chat_rooms_before_insert before insert on public.chat_rooms
  for each row execute function public.chat_room_before_insert();
create trigger chat_rooms_after_insert after insert on public.chat_rooms
  for each row execute function public.chat_room_after_insert();

-- 메시지 작성: 작성자 고정, 익명방이면 이름 대신 익명 번호
create or replace function public.message_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_anon  boolean;
  v_no    int;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select is_anonymous into v_anon from public.chat_rooms where id = new.room_id;
  new.is_anonymous := coalesce(v_anon, false);
  new.is_hidden := false;

  if new.is_anonymous then
    select alias_no into v_no from public.chat_anon_aliases
    where room_id = new.room_id and user_id = v_uid;
    if v_no is null then
      select coalesce(max(alias_no), 0) + 1 into v_no
      from public.chat_anon_aliases where room_id = new.room_id;
      insert into public.chat_anon_aliases (room_id, user_id, alias_no) values (new.room_id, v_uid, v_no);
    end if;
    new.author_id := null;
    new.anon_label := '익명' || v_no;
  else
    new.author_id := v_uid;
    new.anon_label := null;
  end if;

  insert into public.content_authors (target_type, target_id, author_id)
  values ('message', new.id, v_uid);
  return new;
end;
$$;

create or replace function public.message_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.chat_rooms set last_message_at = new.created_at where id = new.room_id;
  return new;
end;
$$;

create trigger messages_before_insert before insert on public.messages
  for each row execute function public.message_before_insert();
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.message_after_insert();
create trigger messages_delete_author after delete on public.messages
  for each row execute function public.delete_content_author('message');

-- ---------- RPC ----------

-- 방 키로 팀룸 참여 → 팀룸 id 반환
create or replace function public.join_team_room(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_room public.team_rooms%rowtype;
  v_name text;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_room from public.team_rooms where invite_code = upper(trim(p_code));
  if v_room.id is null then
    raise exception '방 키가 올바르지 않습니다.';
  end if;

  if not exists (select 1 from public.team_members where room_id = v_room.id and user_id = v_uid) then
    insert into public.team_members (room_id, user_id) values (v_room.id, v_uid);
    select name into v_name from public.profiles where id = v_uid;
    if v_room.owner_id is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_room.owner_id, 'team_join', '새 팀원이 참여했습니다',
              v_name || '님이 ' || v_room.name || ' 팀룸에 참여했습니다.', '/team/' || v_room.id);
    end if;
  end if;

  return v_room.id;
end;
$$;

-- 1:1 채팅 시작 (이미 있으면 기존 방 반환)
create or replace function public.start_direct_chat(p_user_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_room uuid;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_user_id = v_uid then
    raise exception '자기 자신과는 대화할 수 없습니다.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception '없는 사용자입니다.';
  end if;

  select r.id into v_room
  from public.chat_rooms r
  where r.kind = 'direct'
    and exists (select 1 from public.chat_members m where m.room_id = r.id and m.user_id = v_uid)
    and exists (select 1 from public.chat_members m where m.room_id = r.id and m.user_id = p_user_id)
  limit 1;

  if v_room is null then
    insert into public.chat_rooms (kind, created_by) values ('direct', v_uid) returning id into v_room;
    insert into public.chat_members (room_id, user_id) values (v_room, v_uid), (v_room, p_user_id);
  end if;
  return v_room;
end;
$$;

-- ---------- RLS ----------

create policy "team_rooms: 팀원·관리자 조회"
  on public.team_rooms for select to authenticated
  using (public.is_team_member(id) or public.is_admin());
create policy "team_rooms: 로그인 회원 생성"
  on public.team_rooms for insert to authenticated with check (true);
create policy "team_rooms: 방장 수정"
  on public.team_rooms for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "team_rooms: 방장·관리자 삭제"
  on public.team_rooms for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

create policy "team_members: 팀원·관리자 조회"
  on public.team_members for select to authenticated
  using (public.is_team_member(room_id) or public.is_admin());
-- 본인 나가기(방장 제외) / 방장이 다른 팀원 내보내기
create policy "team_members: 나가기·내보내기"
  on public.team_members for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or (public.is_team_owner(room_id) and user_id <> (select auth.uid()))
  );

create policy "chat_rooms: 공개방 또는 참여 중인 방 조회"
  on public.chat_rooms for select to authenticated
  using (kind = 'open' or public.is_chat_member(id) or public.is_admin());
create policy "chat_rooms: 공개 소통방 생성"
  on public.chat_rooms for insert to authenticated
  with check (kind = 'open' and team_room_id is null);
create policy "chat_rooms: 만든 사람 수정"
  on public.chat_rooms for update to authenticated
  using (kind = 'open' and created_by = (select auth.uid()))
  with check (kind = 'open' and created_by = (select auth.uid()));
create policy "chat_rooms: 만든 사람·관리자 삭제"
  on public.chat_rooms for delete to authenticated
  using ((kind = 'open' and created_by = (select auth.uid())) or public.is_admin());

create policy "chat_members: 같은 방 참여자 조회"
  on public.chat_members for select to authenticated
  using (public.is_chat_member(room_id) or public.is_admin());
create policy "chat_members: 공개방 참여"
  on public.chat_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.chat_rooms r where r.id = room_id and r.kind = 'open')
  );
create policy "chat_members: 공개방·1:1 나가기"
  on public.chat_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.chat_rooms r where r.id = room_id and r.kind <> 'team')
  );

create policy "chat_anon_aliases: 관리자 조회"
  on public.chat_anon_aliases for select to authenticated using (public.is_admin());

create policy "messages: 참여 중인 방 조회"
  on public.messages for select to authenticated
  using (
    (public.is_chat_member(room_id) and (not is_hidden or public.is_content_author('message', id)))
    or public.is_admin()
  );
create policy "messages: 참여 중인 방에 작성"
  on public.messages for insert to authenticated
  with check (public.is_chat_member(room_id));
create policy "messages: 작성자·관리자 삭제"
  on public.messages for delete to authenticated
  using (public.is_content_author('message', id) or public.is_admin());

-- ---------- 팀 회의 일정 · 자료 링크 ----------
create table public.team_meetings (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.team_rooms (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  starts_at   timestamptz not null,
  place       text check (char_length(place) <= 200),   -- 장소 또는 화상회의 링크
  memo        text check (char_length(memo) <= 1000),
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index team_meetings_room_idx on public.team_meetings (room_id, starts_at);
alter table public.team_meetings enable row level security;

create table public.team_links (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.team_rooms (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  url         text not null check (url ~* '^https?://'),
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index team_links_room_idx on public.team_links (room_id, created_at desc);
alter table public.team_links enable row level security;

create policy "team_meetings: 팀원 조회" on public.team_meetings for select to authenticated
  using (public.is_team_member(room_id) or public.is_admin());
create policy "team_meetings: 팀원 등록" on public.team_meetings for insert to authenticated
  with check (public.is_team_member(room_id) and created_by = (select auth.uid()));
create policy "team_meetings: 팀원 수정" on public.team_meetings for update to authenticated
  using (public.is_team_member(room_id)) with check (public.is_team_member(room_id));
create policy "team_meetings: 등록자·방장 삭제" on public.team_meetings for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_team_owner(room_id));

create policy "team_links: 팀원 조회" on public.team_links for select to authenticated
  using (public.is_team_member(room_id) or public.is_admin());
create policy "team_links: 팀원 등록" on public.team_links for insert to authenticated
  with check (public.is_team_member(room_id) and created_by = (select auth.uid()));
create policy "team_links: 등록자·방장 삭제" on public.team_links for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_team_owner(room_id));
