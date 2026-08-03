# Rules

- **용어 정의 (Terminology)**: 사용자 및 코드 베이스 관련 대화 시, 통합 포인트 및 회원 서버(`im-core-auth`)를 **"아임모델 공화국"**으로 지칭합니다.

---

## API 공통 헤더 규칙

아임모델 공화국(`im-core-auth`)으로 보내는 **모든 API 요청**에는 반드시 아래 헤더를 포함해야 합니다:

```
x-api-secret: {API_SECRET_KEY}
Content-Type: application/json
```

- `API_SECRET_KEY`는 `.env` 파일의 `IM_CORE_AUTH_SECRET` 값을 사용합니다.
- 헤더 누락 시 서버에서 `401 Unauthorized` 또는 `403 Forbidden`을 반환합니다.
- 코드 작성 시 이 헤더를 빠뜨리는 실수를 하지 않도록, API 호출 함수는 반드시 헤더를 포함한 공통 유틸 함수를 통해 호출합니다.

---

## 등급(Grade) 처리 정책

### 허용 등급 값
```
"NORMAL" | "SILVER" | "GOLD" | "IMODEL" | "VIP"
```
대소문자 구분 없이 전달해도 서버에서 자동으로 대문자 처리합니다.

### 등급 동기화 시점 (MOCA 앱 책임)
1. **로그인/회원가입 시** → `POST /api/auth/sync` 요청 body에 `grade` 필드 포함
2. **등급 변경 이벤트 발생 시** → `POST /api/moca/grade-update` 즉시 호출

### grade_locked 처리
- 아임모델 공화국 어드민이 특정 유저의 등급을 수동으로 잠글 수 있습니다 (`grade_locked: true`).
- `grade-update` 호출 시 서버가 `403 GRADE_LOCKED`를 반환하면 **MOCA 앱은 조용히 무시**합니다 (유저에게 오류 노출 불필요).
- `sync` 호출 시 `grade_locked: true` 유저의 등급 값은 서버에서 자동 무시하므로 MOCA 앱 별도 처리 불필요.

### 등급 로직은 MOCA 앱이 소유
- 등급 산정 기준(누적 예약 수, 활동 점수 등)은 MOCA 앱 내부 로직으로 결정합니다.
- 아임모델 공화국은 등급 **저장 및 표시**만 담당하며, 등급 계산 로직을 갖지 않습니다.
