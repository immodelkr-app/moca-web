-- 정답 맞추기 보기(선택 입력). 판정은 기존대로 keyword 포함 여부, choices는 시청자 화면 표시용.
ALTER TABLE public.moca_live_keyword_event ADD COLUMN IF NOT EXISTS choices TEXT[];
