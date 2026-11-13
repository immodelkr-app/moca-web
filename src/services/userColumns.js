// users 테이블에서 anon이 읽을 수 있는 컬럼 = password_hash를 뺀 전부.
// password_hash는 DB에서 anon SELECT가 막혀 있어(20261114_02 마이그레이션) select('*')를 쓰면 에러가 난다.
// users에 컬럼을 추가하면 마이그레이션에서 GRANT SELECT (새컬럼)도 함께 해야 하고, 여기에도 추가한다.
export const USER_COLS = 'id,nickname,name,phone,email,address,referral_source,grade,created_at,grade_expires_at,address_detail,shoe_size,career_ad,career_other,height,weight,age,portfolio_link,reply_email,marketing_consent,marketing_consent_at,terms_consent,terms_consent_at,gender,last_platform,master_user_id,user_type,last_active_at,instagram_id,is_staff_judge';
