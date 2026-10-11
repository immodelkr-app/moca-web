-- 20261011_05_casting_apply_email_optional_link.sql
-- 카페/밴드 등 링크가 없는 외부 공고도 본문 붙여넣기로 등록할 수 있도록:
--  1) 외부 공고의 원문 링크(source_url)를 선택 입력으로 변경
--  2) "이메일로 지원하기" 버튼용 지원 이메일/제목 컬럼 추가
-- 주의: apply_email은 앱의 지원 버튼 표시 용도로만 사용한다. 영업·홍보 목적의 수집/발송에 쓰지 않는다
--       (정보통신망법 제50조·제50조의2 및 개인정보 목적 외 이용 이슈).
ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS apply_email TEXT;
ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS apply_subject TEXT;

ALTER TABLE public.model_castings DROP CONSTRAINT IF EXISTS model_castings_source_check;
ALTER TABLE public.model_castings ADD CONSTRAINT model_castings_source_check CHECK (
    (source_type = 'internal' AND company_id IS NOT NULL)
    OR source_type = 'external'
);
