-- 회원 본인의 클래스 결제/환불 이력 조회(마이페이지 '내 클래스'). class_payments 는 anon 직접 접근이 막혀 있어 RPC로만 읽는다.
-- 결제가 실제로 승인된 건(paid_at 있음)만 반환하며, 결제번호·결제수단 등 내부 정보는 포함하지 않는다.
CREATE OR REPLACE FUNCTION public.my_class_payments(p_user_id UUID)
RETURNS JSON LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT coalesce(json_agg(r ORDER BY r.paid_at DESC), '[]'::json) FROM (
        SELECT application_id, class_id, amount, status, paid_at, cancelled_at, cancel_reason
          FROM class_payments
         WHERE user_id = p_user_id AND paid_at IS NOT NULL AND status IN ('paid', 'cancelled')
    ) r;
$$;

REVOKE ALL ON FUNCTION public.my_class_payments(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.my_class_payments(UUID) TO anon, authenticated;
