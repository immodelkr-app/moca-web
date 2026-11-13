-- 모카TV 방송에 연결한 모델뷰티 상품(slug 배열, 가격은 열 때 모델뷰티에서 조회). 결제는 항상 modelbeauty.kr에서 진행.
ALTER TABLE moca_live_streams ADD COLUMN IF NOT EXISTS mb_products jsonb NOT NULL DEFAULT '[]'::jsonb;
