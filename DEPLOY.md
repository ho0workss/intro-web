# 🚀 Vercel Postgres + 실시간 동기화 배포 가이드

이 가이드는 **Vercel Postgres + Blob + 실시간 SSE**로 진짜 멀티 유저 협업이 되는 인트라넷을 배포합니다.

## 준비물
- ✅ GitHub 저장소: https://github.com/ho0workss/intro-web (이미 푸시됨)
- ⏳ **Vercel Pro 계정** ($20/월) - Postgres/Blob/Serverless 함수 시간 늘리려면 필수
- ⏳ Git 설치

> 💡 Hobby(무료) 플랜으로도 작동하지만 함수 실행시간 10초 제한이 있어 실시간 SSE는 짧아집니다.

---

## 1️⃣ Vercel 프로젝트 생성

1. https://vercel.com/new → GitHub의 `intro-web` 저장소 Import
2. **설정 그대로** (vercel.json이 처리):
   - Framework: `Other`
   - Build/Output/Install Command: **비워둠**
3. **Deploy** 클릭 → 정적 사이트로 1차 배포 완료 (백엔드는 아직 작동 안 함)

---

## 2️⃣ Vercel Postgres 데이터베이스 연결

1. 프로젝트 대시보드 → 상단 **Storage** 탭
2. **Create Database** → **Postgres** 선택
3. 데이터베이스 이름 입력 (예: `intro-db`) → **Create**
4. 자동으로 환경변수 `POSTGRES_URL` 등이 프로젝트에 주입됩니다
5. **Continue** 후 **Connect Project** 확인

> 자동 환경변수: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NO_SSL`, 등

---

## 3️⃣ Vercel Blob 스토리지 연결 (파일 업로드용)

1. 같은 **Storage** 탭 → **Create Database** → **Blob** 선택
2. 이름 입력 (예: `intro-files`) → **Create**
3. 자동으로 `BLOB_READ_WRITE_TOKEN` 환경변수가 추가됩니다

---

## 4️⃣ 초기화 키 환경변수 설정

DB 스키마 초기화는 비밀키로 보호됩니다.

1. 프로젝트 **Settings** → **Environment Variables**
2. 새 변수 추가:
   - Key: `INIT_KEY`
   - Value: 강력한 무작위 문자열 (예: `super-secret-2026-abc123xyz`)
   - Environment: **Production, Preview, Development** 모두 체크
3. **Save**

---

## 5️⃣ 재배포 (환경변수 반영)

1. 프로젝트 대시보드 → **Deployments** 탭
2. 최근 배포의 ⋯ 메뉴 → **Redeploy** 클릭
3. 약 30~60초 후 완료

또는 로컬에서 빈 커밋 푸시:
```bash
cd deploy
git commit --allow-empty -m "redeploy with env vars"
git push
```

---

## 6️⃣ DB 스키마 초기화 (한 번만)

배포된 URL에 다음 경로로 접속 (`YOUR_INIT_KEY`를 5단계에서 설정한 값으로 변경):

```
https://YOUR-PROJECT.vercel.app/api/init?key=YOUR_INIT_KEY
```

브라우저에 다음과 같은 JSON이 보이면 성공:
```json
{ "ok": true, "count": 9, "results": [...] }
```

이때 자동 생성되는 것:
- ✅ users, rooms, messages, announcements, leaves, signup_requests, partners, sessions 테이블
- ✅ 기본 관리자 계정 `intro` / `dlsxmfh1!`
- ✅ 기본 채팅방 `전체 공지방`

---

## 7️⃣ 사용 시작!

배포 URL 접속 → `intro` / `dlsxmfh1!` 로 로그인:

화면 좌측 하단에 🟢 **백엔드 연동 (실시간)** 인디케이터가 표시되면 성공.

이제:
- 메시지를 보내면 **다른 사용자에게 실시간 전송** (SSE)
- 공지/휴가/사용자 데이터가 **DB에 영구 저장**
- 파일 첨부는 **Vercel Blob**에 업로드되어 다른 사용자가 다운로드 가능
- 회원가입 → 관리자 승인 → 즉시 로그인 가능

---

## 8️⃣ 추가 사용자 가입

신규 직원이 가입하는 방법:
1. 배포 URL 접속 → **회원가입 신청** 클릭
2. 이름, 전화번호, 아이디, 비밀번호, 부서, 입사일 입력 → 신청
3. 관리자(`intro`)가 로그인 → 설정 → 가입 승인 → 부서/권한/거래처 매핑 후 승인
4. 신규 직원이 발급받은 아이디/비밀번호로 로그인

---

## 🔧 문제 해결

### "Failed to fetch /api/init"
- INIT_KEY 환경변수가 안 들어갔거나 재배포가 안 됐습니다 → 5단계 다시
- Vercel 함수 로그 확인: 프로젝트 대시보드 → **Logs**

### "백엔드 연동" 인디케이터가 ⚫ 로컬 모드로 표시됨
- 토큰이 없거나 만료됨 → 다시 로그인
- 콘솔(F12)에서 `Sync.isEnabled` 확인

### 메시지가 실시간으로 안 보임
- SSE 함수 실행시간 제한 (Hobby: 10초 / Pro: 30초)
- 자동 재연결 코드가 있으나 네트워크 따라 지연 가능
- 콘솔에서 EventSource 오류 확인

### "Postgres connection error"
- Storage 탭에서 DB가 프로젝트에 정확히 연결되어 있는지 확인
- 환경변수 `POSTGRES_URL`이 자동 주입되었는지 Settings에서 확인

### 함수 시간 초과 (504)
- Vercel Hobby는 10초 제한 → Pro 업그레이드 ($20/월) 권장

---

## 💰 예상 비용 (30명 사내 사용 기준)

| 항목 | Hobby 무료 | Pro $20/월 |
|---|---|---|
| 함수 시간 | 100 GB-Hours | 1,000 GB-Hours |
| Postgres | 60h 컴퓨팅 / 256MB | 100h / 256MB (확장 가능) |
| Blob | 1GB | 100GB |
| 함수 실행 | 10초 제한 | 60초 제한 (실시간 SSE 길어짐) |
| 권장 사용자 수 | 5~10명 | 30~100명 |

---

## 📝 보안 권장사항

1. **INIT_KEY 보호**: 한 번 초기화 후 환경변수를 삭제하거나 더 복잡한 값으로 교체
2. **데이터베이스 백업**: Vercel 대시보드 → Storage → Postgres → Backup 설정
3. **HTTPS 강제**: Vercel은 기본적으로 HTTPS 적용됨
4. **세션 만료**: 기본 7일 (DB의 `sessions.expires_at` 변경 가능)
5. **비밀번호**: 신규 가입은 bcrypt 해시되어 저장됨

---

## 🆘 백엔드 끄기 (localStorage로만 사용)

브라우저 콘솔(F12)에서:
```javascript
localStorage.removeItem('intro_api_token');
location.reload();
```

자동으로 로컬 모드로 폴백됩니다.
