-- 024: 후기 알림 자동 발송을 위한 pg_cron 스케줄
-- pg_cron과 pg_net 확장이 Supabase 대시보드에서 활성화되어야 합니다.

-- 매 1시간마다 review-reminder Edge Function을 호출
-- 실제 배포 시 project-ref와 service-role-key를 환경에 맞게 설정해야 합니다.
-- Supabase 대시보드 > Database > Extensions에서 pg_cron, pg_net을 먼저 활성화하세요.

-- 아래는 참고용 SQL입니다. Supabase 대시보드의 SQL Editor에서 직접 실행하세요.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'review-reminder-job',
--   '0 * * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/review-reminder',
--     headers := json_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
