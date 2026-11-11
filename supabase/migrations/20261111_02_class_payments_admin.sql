-- 어드민 클래스 결제내역 조회. class_payments 는 anon 권한이 없으므로 관리자 키(기존 Q&A 어드민과 동일 검증)를 확인하는 RPC로만 조회한다.
CREATE OR REPLACE FUNCTION public.class_payments_admin_list(p_admin_key TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    RETURN coalesce((
        SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
            SELECT p.id, p.created_at, p.paid_at, p.cancelled_at, p.cancel_reason, p.status, p.amount, p.pay_type,
                   p.payapp_mul_no, p.settlement_return_needed, p.class_id,
                   c.title AS class_title, a.selected_dates, a.approval_status,
                   u.name AS user_name, u.nickname AS user_nickname, u.phone AS user_phone
              FROM class_payments p
              LEFT JOIN classes c ON c.id = p.class_id
              LEFT JOIN class_applications a ON a.id = p.application_id
              LEFT JOIN users u ON u.id = p.user_id
        ) r
    ), '[]'::json);
END $$;

REVOKE ALL ON FUNCTION public.class_payments_admin_list(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.class_payments_admin_list(TEXT) TO anon, authenticated;
