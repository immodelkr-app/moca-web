-- 오디션 재진행(시작 때/끝날 때 두 번 등): 같은 클래스의 투표만 지우고 상태를 참가자 등록(draft) 단계로 되돌린다.
-- 투표 테이블에는 공개 DELETE 정책이 없으므로 관리자 토큰을 확인하는 RPC로만 삭제한다.
CREATE OR REPLACE FUNCTION public.admin_reset_class_audition_votes(p_admin_key TEXT, p_class_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    DELETE FROM class_audition_votes WHERE class_id = p_class_id;
    UPDATE classes SET audition_status = 'draft', audition_opened_at = NULL, audition_closed_at = NULL WHERE id = p_class_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_reset_class_audition_votes(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_class_audition_votes(TEXT, UUID) TO anon, authenticated;
