-- users 잠금 1단계: anon/authenticated가 password_hash를 읽거나 바꾸지 못하게, 회원 삭제도 못 하게 막는다.
-- 반드시 20261114_02 적용 + 이를 쓰는 앱 코드(userColumns/login_user RPC) 배포 후에 적용할 것.
-- 롤백: 20261114_03_users_lock_phase1_ROLLBACK.sql
-- 주의: users에 컬럼을 추가하면 새 컬럼은 anon이 읽을 수 없으니 GRANT SELECT (새컬럼) 을 따로 해야 한다.
-- (src/services/userColumns.js의 USER_COLS도 함께 갱신)

REVOKE SELECT, UPDATE, DELETE ON users FROM anon, authenticated;

GRANT SELECT (id,nickname,name,phone,email,address,referral_source,grade,created_at,grade_expires_at,address_detail,shoe_size,career_ad,career_other,height,weight,age,portfolio_link,reply_email,marketing_consent,marketing_consent_at,terms_consent,terms_consent_at,gender,last_platform,master_user_id,user_type,last_active_at,instagram_id,is_staff_judge)
  ON users TO anon, authenticated;

GRANT UPDATE (id,nickname,name,phone,email,address,referral_source,grade,created_at,grade_expires_at,address_detail,shoe_size,career_ad,career_other,height,weight,age,portfolio_link,reply_email,marketing_consent,marketing_consent_at,terms_consent,terms_consent_at,gender,last_platform,master_user_id,user_type,last_active_at,instagram_id,is_staff_judge)
  ON users TO anon, authenticated;
