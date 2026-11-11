-- 클래스/신청을 삭제해도 결제 기록(회계·환불 근거)은 남긴다.
-- 기존: class_payments.application_id 가 class_applications 에 ON DELETE CASCADE 라서, 클래스 삭제 → 신청 삭제 → 결제기록 삭제로 이어졌다.
-- 변경: 신청이 지워지면 application_id 만 NULL 로 두고, 클래스 이름은 결제 시점 값을 class_title 에 보관한다.
ALTER TABLE public.class_payments ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE public.class_payments DROP CONSTRAINT IF EXISTS class_payments_application_id_fkey;
ALTER TABLE public.class_payments
    ADD CONSTRAINT class_payments_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES public.class_applications(id) ON DELETE SET NULL;

ALTER TABLE public.class_payments ADD COLUMN IF NOT EXISTS class_title TEXT;
UPDATE public.class_payments p SET class_title = c.title FROM public.classes c WHERE c.id = p.class_id AND p.class_title IS NULL;

CREATE OR REPLACE FUNCTION public._class_payments_set_title() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF NEW.class_title IS NULL THEN SELECT title INTO NEW.class_title FROM classes WHERE id = NEW.class_id; END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_class_payments_set_title ON public.class_payments;
CREATE TRIGGER trg_class_payments_set_title BEFORE INSERT ON public.class_payments
    FOR EACH ROW EXECUTE FUNCTION public._class_payments_set_title();

-- 어드민 결제내역: 삭제된 클래스도 결제 시점 이름으로 표시
CREATE OR REPLACE FUNCTION public.class_payments_admin_list(p_admin_key TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    RETURN coalesce((
        SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
            SELECT p.id, p.created_at, p.paid_at, p.cancelled_at, p.cancel_reason, p.status, p.amount, p.pay_type,
                   p.payapp_mul_no, p.settlement_return_needed, p.class_id,
                   coalesce(c.title, p.class_title) AS class_title, (c.id IS NULL) AS class_deleted,
                   a.selected_dates, a.approval_status,
                   u.name AS user_name, u.nickname AS user_nickname, u.phone AS user_phone
              FROM class_payments p
              LEFT JOIN classes c ON c.id = p.class_id
              LEFT JOIN class_applications a ON a.id = p.application_id
              LEFT JOIN users u ON u.id = p.user_id
        ) r
    ), '[]'::json);
END $$;
