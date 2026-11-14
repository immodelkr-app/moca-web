-- users 잠금 2단계: anon/authenticated가 등급·운영진·user_type·master_user_id·id·created_at을 직접 수정하지 못하게 한다.
-- 반드시 20261115_01 적용 + 이를 쓰는 앱 코드(RPC 호출 버전) 배포 후에 적용할 것. 구버전 앱은 등급 관련 직접 수정이 실패한다.
-- 롤백: 20261115_02_users_lock_phase2_ROLLBACK.sql
REVOKE UPDATE (id, created_at, grade, grade_expires_at, is_staff_judge, user_type, master_user_id) ON users FROM anon, authenticated;
