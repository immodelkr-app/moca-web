-- 클래스 등록 시 자동 앱 푸시 발송 중단 (알림은 운영자가 수동 발송)
-- 복구가 필요하면: CREATE TRIGGER trigger_notify_classes AFTER INSERT ON public.classes FOR EACH ROW EXECUTE FUNCTION notify_push_server();
DROP TRIGGER IF EXISTS trigger_notify_classes ON public.classes;
