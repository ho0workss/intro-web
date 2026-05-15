# INTRO 사내 인트라넷

Next.js 없이 동작하는 **순수 정적 HTML/JS** 사내 인트라넷 워크스페이스.

## ✨ 주요 기능

- **🏠 홈**: 공지사항, 휴가 관리 요약, 회의 일정
- **☕ 휴가 관리**: 입사일 기반 자동 연차 계산, 자동 차감, 과거/현재 내역
- **📅 회의 워크스페이스**: 노션 스타일 블록 에디터 + **구글시트급 스프레드시트** (30+ 함수, 셀 병합, 행/열 삽입, 글자색, 드래그 범위 선택)
- **💬 메신저**: 실시간 메시지 동기화(`BroadcastChannel`), 폴더, 드래그&드롭 순서 변경, @멘션, @AI 호출, 우클릭 메뉴, 별도 팝업창
- **🤖 ChatGPT**: 프로젝트(폴더) + 일반 대화, 드래그로 이동, 시스템 프롬프트/모델 설정, 공유 링크 생성
- **🤝 거래처**: 멤버별 매핑된 거래처만 표시, 필터, 발주/판매/재고/정산
- **🛍️ 이커머스 / 🏷️ 행사 / 🎨 디자인 / 📣 광고**: 추가/삭제/편집 가능한 데이터 테이블
- **⚙️ 설정**: 멤버 관리, 부서·역할 권한, 거래처 관리, AI API 설정, **커스텀 역할 추가**
- **🔐 인증**: 로그인 / 회원가입 신청(관리자 승인) / 다크 모드
- **💾 영구 저장**: 모든 데이터 `localStorage`에 자동 저장

---

## 🚀 빠른 시작 (로컬)

### 옵션 1: 브라우저에서 직접 열기
```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

### 옵션 2: 로컬 서버 (권장)
```bash
npx serve .
# 또는
python -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속.

### 기본 계정
| 아이디 | 비밀번호 | 권한 |
|---|---|---|
| `intro` | `dlsxmfh1!` | 관리자 |
| `kim` | `1234` | 매니저 (디자인) |
| `lee` | `1234` | 멤버 (마케팅) |
| `park` | `1234` | 멤버 (개발) |

---

## 🌐 GitHub + Vercel 배포

### 1단계: GitHub 저장소 생성

```bash
# 이 deploy 폴더에서 시작
cd /path/to/deploy

# Git 초기화
git init
git add .
git commit -m "INTRO 사내 인트라넷 - 초기 배포"

# GitHub에 비어있는 저장소를 만든 후 (예: intro-intranet)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/intro-intranet.git
git push -u origin main
```

### 2단계: Vercel 연결 (가장 쉬운 방법)

1. https://vercel.com 접속 후 **GitHub로 로그인**
2. **Add New... → Project** 클릭
3. GitHub 저장소 `intro-intranet` 선택 → **Import**
4. 설정 화면에서 **그대로 두고** (vercel.json이 모든 것을 처리):
   - Framework Preset: **Other**
   - Build Command: **비워두기**
   - Output Directory: **비워두기**
   - Install Command: **비워두기**
5. **Deploy** 클릭
6. 약 30초 후 배포 완료 → `https://intro-intranet.vercel.app` 같은 URL 발급

### 3단계: 사용자 공유

- 회사 구성원에게 배포된 URL을 공유
- **각자 브라우저에 데이터가 저장되며**, 동일 브라우저 내에서는 새로고침해도 데이터 유지
- 메인 창 ↔ 팝업 메신저 창은 `BroadcastChannel`로 실시간 동기화 (동일 사용자 다중 탭)

---

## ⚠️ 단일 브라우저 데모 vs 진짜 멀티유저

이 정적 배포는 **각 사용자의 브라우저에 데이터가 저장**되는 데모입니다.
> A 사용자가 보낸 메시지는 B 사용자에게 실시간 전송되지 않습니다.
> 모든 데이터는 사용자별로 독립적입니다.

**진짜 사내 협업 시스템**으로 만들려면:
- 백엔드 (Supabase / Firebase / 자체 서버)
- 실시간 동기화 (WebSocket / Realtime)
- 파일 스토리지 (S3 / Supabase Storage)
- 인증 (OAuth / JWT)
- 데이터베이스 (PostgreSQL / MongoDB)

연동 가이드는 별도로 요청해주세요.

---

## 📁 파일 구조

```
deploy/
├── index.html              ← 메인 진입점 (=demo.html)
├── demo-app.js             ← 모든 비즈니스 로직 (3000+줄)
├── messenger-popup.html    ← 별도 팝업 메신저 창
├── vercel.json             ← Vercel 정적 배포 설정
├── package.json            ← 메타데이터
├── .gitignore
└── README.md               ← 이 파일
```

---

## 🛠️ 기술 스택

- **HTML5** + **Tailwind CSS (CDN)** + **Vanilla JavaScript**
- 외부 의존성: Tailwind CDN, Google Fonts (Noto Sans KR)
- 데이터: 브라우저 `localStorage`
- 실시간(동일 브라우저 다중 탭): `BroadcastChannel API`

---

## 📝 라이선스

내부 사용 전용. 외부 공개/판매 금지.
