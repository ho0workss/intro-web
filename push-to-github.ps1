# INTRO 사내 인트라넷 - GitHub 푸시 스크립트 (Windows PowerShell)
# 사용법: 이 폴더에서 PowerShell 열고 → .\push-to-github.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoUrl
)

Write-Host "📦 INTRO 사내 인트라넷 - GitHub 푸시" -ForegroundColor Cyan
Write-Host ""

# Git 설치 확인
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git이 설치되어 있지 않습니다. https://git-scm.com/downloads 에서 설치하세요." -ForegroundColor Red
    exit 1
}

# Git 초기화 (이미 되어 있으면 skip)
if (-not (Test-Path ".git")) {
    Write-Host "🔧 Git 초기화 중..." -ForegroundColor Yellow
    git init
}

Write-Host "📝 파일 스테이징..." -ForegroundColor Yellow
git add .

# 변경사항 있는 경우에만 커밋
$status = git status --porcelain
if ($status) {
    git commit -m "INTRO 사내 인트라넷 배포"
    Write-Host "✅ 커밋 완료" -ForegroundColor Green
} else {
    Write-Host "ℹ️ 변경사항 없음" -ForegroundColor Gray
}

# 메인 브랜치
git branch -M main

# 원격 저장소 설정
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "🔄 원격 저장소 업데이트: $RepoUrl" -ForegroundColor Yellow
    git remote set-url origin $RepoUrl
} else {
    Write-Host "🔗 원격 저장소 연결: $RepoUrl" -ForegroundColor Yellow
    git remote add origin $RepoUrl
}

Write-Host "🚀 GitHub로 푸시..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "✨ 완료! 이제 Vercel에 연결하세요:" -ForegroundColor Green
Write-Host "   1. https://vercel.com/new 접속" -ForegroundColor White
Write-Host "   2. GitHub 저장소 Import" -ForegroundColor White
Write-Host "   3. Framework Preset: Other (기본값 유지)" -ForegroundColor White
Write-Host "   4. Deploy 클릭" -ForegroundColor White
