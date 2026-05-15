# INTRO 사내 인트라넷

Vercel Postgres + Blob + 실시간 SSE로 동작하는 풀스택 사내 인트라넷.

## ✨ 주요 기능

- **🏠 홈**: 공지사항, 휴가 관리 요약, 회의 일정
- **☕ 휴가 관리**: 입사일 기반 연차 자동 계산, 자동 차감, 과거/현재 내역
- **📅 회의 워크스페이스**: 노션 스타일 블록 에디터 + 구글시트급 스프레드시트 (30+ 함수, 셀 병합, 행/열 삽입, 글자색, Ctrl+클릭 다중 참조)
- **💬 메신저**: **Postgres + SSE 실시간 동기화**, 폴더, 드래그&드롭 순서 변경, @멘션, @AI 호출, 우클릭 메뉴, 별도 팝업창
- **🤖 ChatGPT**: 프로젝트(폴더) + 일반 대화, 드래그로 이동, 시스템 프롬프트/모델 설정, 공유 링크 생성
- **🤝 거래처**: 멤버별 매핑된 거래처만 표시, 필터, 발주/판매/재고/정산
- **🛍️ 이커머스 / 🏷️ 행사 / 🎨 디자인 / 📣 광고**: 추가/삭제/편집 가능한 데이터 테이블
- **⚙️ 설정**: 멤버 관리, 부서·역할 권한, 거래처 관리, AI API 설정, 커스텀 역할 추가
- **🔐 인증**: 로그인 / 회원가입 신청(관리자 승인) / 다크 모드
- **💾 저장**: Vercel Postgres (백엔드 활성) 또는 localStorage 폴백

---

## 🚀 빠른 시작

### 옵션 A: 풀스택 (실시간 동기화) - 권장
→ **[DEPLOY.md](./DEPLOY.md)** 참조: Vercel Postgres + Blob 셋업

### 옵션 B: 로컬 데모 (백엔드 없이)
```bash
npx serve .
```
http://localhost:3000 접속 → `intro` / `dlsxmfh1!`

---

## 📁 파일 구조

```
deploy/
├── index.html              ← 메인 진입점
├── demo-app.js             ← 프론트엔드 비즈니스 로직 (3000+줄)
├── sync.js                 ← 백엔드 API 클라이언트
├── bridge.js               ← demo-app ↔ 백엔드 브릿지 (자동 동기화)
├── messenger-popup.html    ← 별도 팝업 메신저
├── api/
│   ├── init.js             ← DB 스키마 초기화 (GET ?key=)
│   ├── auth.js             ← 로그인/회원가입/로그아웃 (POST)
│   ├── messages.js         ← 메시지 CRUD
│   ├── stream.js           ← 실시간 SSE 엔드포인트
│   ├── announcements.js    ← 공지사항 CRUD
│   ├── leaves.js           ← 휴가 신청/조회
│   ├── users.js            ← 사용자 관리
│   ├── requests.js         ← 가입 요청 승인/거절
│   └── upload.js           ← Vercel Blob 파일 업로드
├── lib/
│   ├── db.js               ← Postgres 클라이언트
│   └── schema.sql          ← DB 스키마
├── vercel.json             ← Vercel 배포 설정 (functions + headers)
├── package.json            ← @vercel/postgres, @vercel/blob, bcryptjs
├── .env.example            ← 환경변수 템플릿
├── .gitignore
├── README.md               ← 이 파일
├── DEPLOY.md               ← 상세 배포 가이드
├── push-to-github.ps1
└── push-to-github.sh
```

---

## 🛠️ 기술 스택

### 프론트엔드
- HTML5 + Tailwind CSS (CDN) + Vanilla JavaScript
- 외부 라이브러리: Tailwind CDN, Noto Sans KR

### 백엔드 (Vercel)
- **Vercel Postgres** (Neon) - 모든 영구 데이터
- **Vercel Blob** - 파일 첨부 저장소
- **Serverless Functions** (Node.js 18+) - API 라우트
- **SSE (Server-Sent Events)** - 실시간 메시지 전송
- **bcryptjs** - 비밀번호 해싱
- **세션 토큰** - 7일 만료, DB에 저장

### 데이터 흐름
```
[브라우저]
   ↓ login/POST /api/auth?action=login
[Vercel Function] → [Postgres: users, sessions]
   ↓ token 반환
[브라우저 localStorage에 token 저장]

[메시지 전송] → POST /api/messages → Postgres: messages
[실시간 수신] → SSE /api/stream → 풀링 → 새 메시지 푸시
```

---

## 🔄 백엔드 모드 vs 로컬 모드

화면 좌측 하단 인디케이터:
- 🟢 **백엔드 연동 (실시간)**: Postgres에 데이터 저장, 사용자 간 실시간 동기화
- ⚫ **로컬 모드**: localStorage에 저장, 단일 브라우저만 작동

브릿지(`bridge.js`)가 자동으로 모드를 감지하고 동작합니다.
백엔드 호출 실패 시 자동으로 localStorage로 폴백되어 끊김 없이 사용 가능.

---

## 🔧 로컬 개발

### Vercel CLI 설치
```bash
npm i -g vercel
```

### 환경변수 받아오기
```bash
vercel link  # 프로젝트 연결
vercel env pull .env.local  # 환경변수 다운로드
```

### 로컬 실행 (서버리스 함수 포함)
```bash
npm install
npm run dev  # vercel dev
```

http://localhost:3000

---

## 📝 라이선스

내부 사용 전용.
