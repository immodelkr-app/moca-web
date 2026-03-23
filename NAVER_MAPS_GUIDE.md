# 🚨 네이버 지도 API 인증 해결 (최종 점검)

URL 등록을 완료해주셔서 감사합니다!
네이버 서버에 설정이 전파되는 데 **약 5~10분**이 걸립니다.
기다리시는 동안, **가장 중요한 서비스 체크**가 되었는지 마지막으로 확인해주세요.

## 1. Web Dynamic Map 서비스 체크 (필수!)
URL을 등록했어도 **이 서비스가 체크되어 있지 않으면** 지도가 나오지 않습니다.

1. [네이버 클라우드 콘솔](https://console.ncloud.com/naver-service/application) > **Application**
2. 앱(`IMMODEL`)의 **[변경]** 버튼 클릭
3. **[Maps]** 카테고리 > **`Web Dynamic Map`** 체크박스 확인
   - **(V) 체크됨** 상태여야 합니다.

## 2. 등록된 URL 확인
사용자님이 공유해주신 아래 URL들은 완벽합니다:
- `http://localhost:5173`
- `https://im-model-app.vercel.app`
- `https://im-model-app.vercel.app/` (중요)
- `http://localhost:5173/`

## 3. 마무리
위 **Web Dynamic Map** 체크까지 확실하다면, 이제 시간 문제입니다.
**5~10분 뒤에 페이지를 새로고침** 해보세요.
