-- 팀룸을 만들 때 결과(id, 방 키)를 바로 돌려받을 수 있도록
-- 방장이 팀원으로 등록되기 전에도 자기가 만든 팀룸은 조회 가능하게 함
drop policy "team_rooms: 팀원·관리자 조회" on public.team_rooms;
create policy "team_rooms: 팀원·방장·관리자 조회"
  on public.team_rooms for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_team_member(id) or public.is_admin());
