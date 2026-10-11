-- 20261011_04_casting_deadline_nullable.sql
-- 마감일이 없는 공고(상시/미정)를 등록할 수 있도록 deadline을 선택 입력으로 변경
-- 마감일이 없는 공고는 자동 마감되지 않으며, 앱에는 디데이/마감일을 표기하지 않는다.
ALTER TABLE public.model_castings ALTER COLUMN deadline DROP NOT NULL;
