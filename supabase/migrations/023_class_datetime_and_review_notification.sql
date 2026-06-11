-- 023: 클래스 구조화된 날짜/시간 + 후기 알림 추적
-- event_datetime: 단발성 클래스의 정확한 시작 날짜/시간
-- review_notification_sent: 자동 후기 알림 발송 여부

ALTER TABLE classes ADD COLUMN IF NOT EXISTS event_datetime TIMESTAMPTZ;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS review_notification_sent BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS review_notification_sent_at TIMESTAMPTZ;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS review_message TEXT; -- 자동 후기 알림 메시지 (관리자 편집 가능)

-- 인덱스: D-day 계산 및 후기 알림 스케줄링 최적화
CREATE INDEX IF NOT EXISTS idx_classes_event_datetime 
  ON classes(event_datetime) WHERE event_datetime IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_review_notification 
  ON classes(review_notification_sent, event_datetime) 
  WHERE status = 'active' AND review_notification_sent = false;
