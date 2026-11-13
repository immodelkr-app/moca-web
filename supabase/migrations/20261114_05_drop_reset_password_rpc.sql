-- 연락처만으로 비밀번호를 바꿀 수 있던 reset_password RPC 제거. 반드시 SMS 인증 방식(password-reset 함수) 앱 코드 배포 후에 적용.
DROP FUNCTION IF EXISTS reset_password(text, text, text);
