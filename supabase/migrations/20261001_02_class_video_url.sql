-- 모카클래스 상세 페이지에 지난 수업 영상(유튜브/비메오) 링크 표시
ALTER TABLE classes ADD COLUMN IF NOT EXISTS video_url TEXT;
