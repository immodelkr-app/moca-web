-- users 잠금 3단계: anon/authenticated가 연락처 열(phone, address, address_detail, email, reply_email)을 직접 읽거나 수정하지 못하게 한다.
-- 반드시 20261115_05(RPC) 적용 + 앱 코드(f00fb70 이후, RPC 호출 버전) 배포 + 주요 화면 확인 후에 적용할 것.
-- INSERT 권한은 그대로 둔다(회원가입이 연락처를 함께 저장). 가입 직후 반환값에는 연락처 열을 쓰지 않는다(USER_COLS_SAFE).
-- 적용 후 구버전 앱/캐시된 번들은 프로필·목록의 연락처 조회가 실패한다(권한 오류).
-- 롤백: 20261115_06_users_lock_phase3_ROLLBACK.sql
-- 주의: 이후 users에 연락처 성격의 컬럼을 추가하면 새 컬럼은 GRANT를 따로 하지 않는 한 anon이 읽을 수 없다(의도한 동작).
REVOKE SELECT (phone, address, address_detail, email, reply_email) ON users FROM anon, authenticated;
REVOKE UPDATE (phone, address, address_detail, email, reply_email) ON users FROM anon, authenticated;
