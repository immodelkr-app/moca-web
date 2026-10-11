-- 20261011_01_external_castings.sql
-- 모델캐스팅: 외부 사이트 공고(링크 입력 → 어드민이 정리해서 등록) 지원
-- 업체 계정 없이 등록되므로 company_id를 nullable로 바꾸고, 출처 정보 컬럼을 추가한다.
-- 주의: 지원 이메일 등 연락처를 별도 컬럼으로 수집하지 않는다 (지원방법 안내 문구 apply_guide에만 포함).

ALTER TABLE public.model_castings ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'internal'; -- 'internal' | 'external'
ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS source_name TEXT; -- 예: 필름메이커스
ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS producer_name TEXT; -- 외부 공고의 제작사명 (표시용)
ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS apply_guide TEXT; -- 외부 공고 지원방법 안내 문구

-- 내부 공고는 반드시 업체 소속, 외부 공고는 출처 URL 필수
ALTER TABLE public.model_castings DROP CONSTRAINT IF EXISTS model_castings_source_check;
ALTER TABLE public.model_castings ADD CONSTRAINT model_castings_source_check CHECK (
    (source_type = 'internal' AND company_id IS NOT NULL)
    OR (source_type = 'external' AND source_url IS NOT NULL)
);

-- 같은 원문 링크 중복 등록 방지
CREATE UNIQUE INDEX IF NOT EXISTS uq_model_castings_source_url
    ON public.model_castings(source_url) WHERE source_url IS NOT NULL;
