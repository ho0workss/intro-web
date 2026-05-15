# 🚀 배포 가이드 (3분 컷)

## 사전 준비
- [GitHub 계정](https://github.com)
- [Vercel 계정](https://vercel.com) (GitHub로 로그인 추천)
- [Git 설치](https://git-scm.com/downloads)

---

## 1️⃣ GitHub 저장소 만들기 (1분)

1. https://github.com/new 접속
2. **Repository name**: `intro-intranet` (원하는 이름)
3. **Public** 또는 **Private** 선택 (사내용이면 Private 추천)
4. **Add a README file** 체크 ❌ (이미 있음)
5. **Create repository** 클릭

생성된 저장소 URL 복사 (예: `https://github.com/USERNAME/intro-intranet.git`)

---

## 2️⃣ 파일 푸시 (1분)

PowerShell 또는 터미널에서 이 `deploy/` 폴더로 이동 후:

```bash
# Git 초기화 & 커밋
git init
git add .
git commit -m "INTRO 사내 인트라넷 초기 배포"
git branch -M main

# GitHub 연결 (URL을 본인의 것으로 바꾸세요!)
git remote add origin https://github.com/YOUR_USERNAME/intro-intranet.git
git push -u origin main
```

❓ **인증 오류 발생 시**: GitHub의 [Personal Access Token](https://github.com/settings/tokens) 발급 후 비밀번호 대신 사용.

---

## 3️⃣ Vercel 배포 (1분)

1. https://vercel.com/new 접속
2. **Import Git Repository** → 방금 만든 `intro-intranet` 선택 → **Import**
3. 설정 화면 — **그대로 두기** (`vercel.json`이 모두 처리):
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: *(비워둠)*
   - Output Directory: *(비워둠)*
4. **Deploy** 클릭
5. 약 30초 대기 → 🎉 **배포 완료**!

발급된 URL을 사내 구성원에게 공유하세요. 예: `https://intro-intranet.vercel.app`

---

## 4️⃣ 커스텀 도메인 (선택사항)

Vercel 대시보드 → 프로젝트 → **Settings → Domains** → 회사 도메인 추가
예: `intranet.yourcompany.com` → CNAME `cname.vercel-dns.com`

---

## 5️⃣ 업데이트 배포

이후 변경사항이 있을 때:
```bash
git add .
git commit -m "기능 업데이트"
git push
```
→ Vercel이 자동으로 재배포 (약 30초)

---

## ⚠️ 알아두기

- **데이터 저장 위치**: 각 사용자의 **브라우저 localStorage** (서버 X)
- **사용자 간 데이터 공유 X**: A 사용자의 메시지는 B 사용자에게 보이지 않음
- **동일 브라우저의 여러 탭/팝업**: `BroadcastChannel`로 실시간 동기화 OK
- **실제 사내 협업 시스템으로 확장하려면**: Supabase/Firebase 같은 백엔드 연동 필요

---

## 🆘 문제 해결

### "Vercel 배포가 실패해요"
- Vercel 설정에서 Framework Preset이 **Other**로 되어있는지 확인
- Build Command, Output Directory를 **비워둠** 확인
- 로그를 확인 → `vercel.json`에 오타가 있는지 점검

### "배포는 됐는데 화면이 비어있어요"
- 브라우저 콘솔(F12)에서 JavaScript 오류 확인
- Tailwind CDN이 차단되었는지 (사내 방화벽) 확인
- 시크릿/익명 모드에서 다시 접속해보기

### "데이터가 다 날아갔어요"
- 브라우저 캐시/쿠키 삭제 시 localStorage도 삭제됩니다
- 시크릿 모드에서는 닫는 즉시 데이터 소실
- 영구 보관은 **백엔드 연동** 필요

---

## 📞 도움이 필요하면

- 백엔드(Supabase) 연동 가이드 요청
- 추가 기능 개발 요청
- 디자인 수정 요청

각각 별도로 요청해주세요.
