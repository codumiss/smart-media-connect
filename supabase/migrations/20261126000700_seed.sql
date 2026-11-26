-- ============================================================
-- 07. 기본 데이터
-- ============================================================

-- 기본 소통방
insert into public.chat_rooms (kind, name, description, is_anonymous) values
  ('open', '익명 자유방', '학년 상관없이 편하게 이야기하는 익명 공간', true),
  ('open', '학과 질문방', '수업·실습·학과 생활 질문 (실명)', false),
  ('open', '공모전·프로젝트방', '공모전, 팀 프로젝트 이야기 (실명)', false);

-- 학과 일정 예시 (README 에 적힌 공모전 일정)
insert into public.schedules (title, description, category, starts_on) values
  ('작품 결과물 제출 마감', '11/30(월) 14:00까지', 'deadline', date '2026-11-30'),
  ('발표 자료(PPT) 제출 마감', '12/2(수) 09:00까지', 'deadline', date '2026-12-02'),
  ('작품 최종 발표', '12/2(수) 16:30, 공학1관 231호', 'event', date '2026-12-02');
