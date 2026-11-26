-- ============================================================
-- 06. 권한(GRANT) · Realtime
-- ============================================================
-- RLS(어떤 행을) + 컬럼 권한(어떤 칸을) 두 단계로 막습니다.
-- 예: 학생은 자기 profiles 행을 수정할 수 있지만 role 칸은 수정할 수 없음
--     게시글 is_hidden 은 학생이 직접 바꿀 수 없고 관리자 함수로만 변경

-- 로그인 안 한 사용자(anon)는 테이블에 접근 불가
revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (name, nickname, grade, avatar_url) on public.profiles to authenticated;

grant select on public.profile_private to authenticated;
grant update (student_id) on public.profile_private to authenticated;

grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

grant select on public.content_authors to authenticated;

grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.schedules to authenticated;

grant select, delete on public.posts to authenticated;
grant insert (category, title, body, is_anonymous) on public.posts to authenticated;
grant update (title, body) on public.posts to authenticated;

grant select, delete on public.comments to authenticated;
grant insert (post_id, body, is_anonymous) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

grant select, delete on public.post_likes to authenticated;
grant insert (post_id) on public.post_likes to authenticated;

grant select on public.recruitments to authenticated;
grant insert (post_id, project_name, fields, headcount, skills, deadline, method, team_room_id)
  on public.recruitments to authenticated;
grant update (project_name, fields, headcount, skills, deadline, method, status, team_room_id)
  on public.recruitments to authenticated;

grant select, delete on public.applications to authenticated;
grant insert (recruitment_id, message) on public.applications to authenticated;

grant select, delete on public.team_rooms to authenticated;
grant insert (name, description) on public.team_rooms to authenticated;
grant update (name, description) on public.team_rooms to authenticated;

grant select, delete on public.team_members to authenticated;

grant select, delete on public.team_meetings to authenticated;
grant insert (room_id, title, starts_at, place, memo) on public.team_meetings to authenticated;
grant update (title, starts_at, place, memo) on public.team_meetings to authenticated;

grant select, delete on public.team_links to authenticated;
grant insert (room_id, title, url) on public.team_links to authenticated;

grant select, delete on public.chat_rooms to authenticated;
grant insert (name, description, is_anonymous) on public.chat_rooms to authenticated;
grant update (name, description) on public.chat_rooms to authenticated;

grant select, delete on public.chat_members to authenticated;
grant insert (room_id) on public.chat_members to authenticated;

grant select on public.chat_anon_aliases to authenticated;

grant select, delete on public.messages to authenticated;
grant insert (room_id, body) on public.messages to authenticated;

grant select on public.reports to authenticated;
grant insert (target_type, target_id, reason, detail) on public.reports to authenticated;

-- ---------- 함수 실행 권한 ----------
-- 내부용 함수(set_content_hidden, 트리거 함수)는 직접 호출할 수 없게 막음
revoke execute on all functions in schema public from public, anon, authenticated;

-- RLS 정책에서 쓰는 확인용 함수
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_content_author(text, uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;
grant execute on function public.is_chat_member(uuid) to authenticated;
grant execute on function public.is_recruit_owner(uuid) to authenticated;
grant execute on function public.generate_invite_code() to authenticated;  -- 팀룸 방 키 기본값

-- 화면에서 호출하는 RPC
grant execute on function public.is_nickname_available(text) to anon, authenticated;
grant execute on function public.join_team_room(text) to authenticated;
grant execute on function public.start_direct_chat(uuid) to authenticated;
grant execute on function public.respond_application(uuid, boolean) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.handle_report(uuid, text, boolean) to authenticated;
grant execute on function public.moderate_content(text, uuid, boolean) to authenticated;
grant execute on function public.admin_report_detail(uuid) to authenticated;

-- 이후 새로 만드는 테이블·함수가 자동으로 공개되지 않도록
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------- Realtime ----------
-- 채팅 메시지, 알림, 신고를 실시간으로 받음 (RLS 가 적용되어 볼 수 있는 행만 전달됨)
alter publication supabase_realtime add table public.messages, public.notifications, public.reports;
