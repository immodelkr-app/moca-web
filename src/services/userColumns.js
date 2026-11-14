// users 테이블에서 anon이 읽을 수 있는 컬럼 = password_hash를 뺀 전부.
// password_hash는 DB에서 anon SELECT가 막혀 있어(20261114_02 마이그레이션) select('*')를 쓰면 에러가 난다.
// users에 컬럼을 추가하면 마이그레이션에서 GRANT SELECT (새컬럼)도 함께 해야 하고, 여기에도 추가한다.
export const USER_COLS = 'id,nickname,name,phone,email,address,referral_source,grade,created_at,grade_expires_at,address_detail,shoe_size,career_ad,career_other,height,weight,age,portfolio_link,reply_email,marketing_consent,marketing_consent_at,terms_consent,terms_consent_at,gender,last_platform,master_user_id,user_type,last_active_at,instagram_id,is_staff_judge';

// 연락처 열(phone 등)은 anon이 직접 읽거나 쓸 수 없다(20261115 3단계 잠금). 읽기는 get_my_users/admin_list_users 등 RPC, 쓰기는 update_my_contact RPC로만.
export const CONTACT_COLS = ['phone', 'address', 'address_detail', 'email', 'reply_email'];
// 테이블 직접 조회(.select)에 쓸 수 있는 컬럼 = USER_COLS에서 연락처 열을 뺀 것
export const USER_COLS_SAFE = USER_COLS.split(',').filter((c) => !CONTACT_COLS.includes(c)).join(',');
