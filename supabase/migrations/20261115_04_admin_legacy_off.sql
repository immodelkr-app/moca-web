-- 번들에 들어 있던 기존 관리자 비밀번호 통로를 닫는다. 새 앱(토큰 방식) 배포 + 엣지함수 배포 후에 적용.
-- admin_set_password() 를 실행했다면 이미 같은 효과이므로 이 파일은 필요 없다(권장: 이 파일 대신 admin_set_password).
-- 주의: 이 파일만 적용하면 기존 비밀번호 로그인도 막히므로 반드시 곧바로 admin_set_password 로 새 비밀번호를 설정해야 한다.
-- 롤백: DELETE FROM admin_config WHERE key = 'legacy_disabled'; (단 admin_set_password 로 비밀번호를 바꿨다면 롤백해도 기존 비밀번호는 로그인 불가)
INSERT INTO admin_config VALUES ('legacy_disabled', '1') ON CONFLICT (key) DO NOTHING;
