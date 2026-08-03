# IM-CORE-AUTH 연동 가이드 — 회원 등급(grade) 동기화

> 작성일: 2026-08-03  
> 대상: MOCA 앱 개발팀  
> 연동 서버: `im-core-auth` (아임모델 통합 인증/포인트 시스템)

---

## 배경

im-core-auth가 MOCA 앱 회원의 **등급(grade)** 을 중앙에서 관리할 수 있도록 방식을 변경했습니다.

**이전 방식 (폐기)**: im-core-auth가 MOCA Supabase DB에 직접 접속해서 등급 조회  
**새 방식**: **MOCA 앱이 등급을 im-core-auth로 직접 push**

MOCA 앱 쪽에서 아래 2가지만 처리해 주시면 됩니다.

---

## 허용 등급 값

```
"NORMAL" | "SILVER" | "GOLD" | "IMODEL" | "VIP"
```

> 대소문자 구분 없이 전달해도 서버에서 자동으로 대문자 처리됩니다.

---

## 1. 로그인/회원가입 시 `grade` 추가 전달

기존에 호출하던 `/api/auth/sync` 요청 body에 `grade` 필드를 **추가**해 주세요.

- **Endpoint**: `POST {IM_CORE_AUTH_URL}/api/auth/sync`
- **Header**: `x-api-secret: {API_SECRET_KEY}`

### Request Body (변경 전)
```json
{
  "phoneNumber": "01012345678",
  "appName": "MOCA",
  "localUserId": "moca-user-uuid",
  "name": "홍길동",
  "nickname": "길동이"
}
```

### Request Body (변경 후 — `grade` 추가)
```json
{
  "phoneNumber": "01012345678",
  "appName": "MOCA",
  "localUserId": "moca-user-uuid",
  "name": "홍길동",
  "nickname": "길동이",
  "grade": "VIP"
}
```

### Response (기존과 동일)
```json
{
  "success": true,
  "masterUserId": "master-user-uuid",
  "integratedPoints": 1500,
  "isNewUser": false,
  "linkedApps": [],
  "grade": "VIP",
  "grade_locked": false
}
```

> **참고**: `grade_locked`가 `true`인 유저는 어드민이 등급을 잠근 상태입니다.  
> 이 경우 grade 값을 보내도 서버에서 자동으로 무시합니다 (오류 없이 처리됨).

---

## 2. 등급 변경 시 실시간 동기화 (신규 API)

MOCA 앱 내부에서 회원 등급이 변경될 때 아래 API를 호출해 주세요.

- **Endpoint**: `POST {IM_CORE_AUTH_URL}/api/moca/grade-update`
- **Header**: `x-api-secret: {API_SECRET_KEY}`

### Request Body
```json
{
  "masterUserId": "master-user-uuid",
  "grade": "GOLD"
}
```
> `masterUserId`는 `/api/auth/sync` 응답에서 받은 `masterUserId` 값입니다.

### Response (성공)
```json
{
  "success": true,
  "grade": "GOLD",
  "grade_locked": false
}
```

### Response (등급 잠금 상태 — 어드민이 잠근 경우)
```json
{
  "success": false,
  "error": "어드민에 의해 등급이 잠겨 있어 변경할 수 없습니다.",
  "code": "GRADE_LOCKED",
  "grade": "VIP",
  "grade_locked": true,
  "reason": "잠금 사유"
}
```
- **HTTP 403** 반환
- MOCA 앱에서는 이 경우 등급 변경을 시도하지 않으면 됩니다 (별도 처리 불필요)

### 에러 코드 일람

| code | HTTP | 설명 |
|------|------|------|
| `MISSING_FIELDS` | 400 | `masterUserId` 또는 `grade` 누락 |
| `INVALID_GRADE` | 400 | 허용되지 않는 등급 값 |
| `USER_NOT_FOUND` | 404 | 해당 masterUserId 없음 |
| `GRADE_LOCKED` | 403 | 어드민에 의해 등급 잠금 |
| `DB_ERROR` | 500 | 서버 DB 오류 |

---

## 공통 인증

모든 요청에 아래 헤더가 필요합니다:

```
x-api-secret: {API_SECRET_KEY}
```

`API_SECRET_KEY`는 MOCA 앱 `.env`에 이미 설정된 값을 그대로 사용합니다.

---

## 구현 체크리스트

- [ ] `/api/auth/sync` 호출 시 `grade` 필드 추가
- [ ] 등급 변경 이벤트 발생 지점에서 `/api/moca/grade-update` 호출 추가
- [ ] `grade_locked: true` 응답(403) 처리 (조용히 무시하거나 로그만 남기면 됨)
