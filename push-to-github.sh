#!/bin/bash
# INTRO 사내 인트라넷 - GitHub 푸시 스크립트 (macOS/Linux)
# 사용법: bash push-to-github.sh https://github.com/USERNAME/REPO.git

set -e

if [ -z "$1" ]; then
  echo "❌ 사용법: bash push-to-github.sh <GitHub 저장소 URL>"
  echo "   예: bash push-to-github.sh https://github.com/USERNAME/intro-intranet.git"
  exit 1
fi

REPO_URL="$1"

echo "📦 INTRO 사내 인트라넷 - GitHub 푸시"
echo ""

# Git 설치 확인
if ! command -v git &> /dev/null; then
  echo "❌ Git이 설치되어 있지 않습니다."
  exit 1
fi

# Git 초기화
if [ ! -d ".git" ]; then
  echo "🔧 Git 초기화 중..."
  git init
fi

echo "📝 파일 스테이징..."
git add .

if [ -n "$(git status --porcelain)" ]; then
  git commit -m "INTRO 사내 인트라넷 배포"
  echo "✅ 커밋 완료"
else
  echo "ℹ️ 변경사항 없음"
fi

git branch -M main

if git remote get-url origin > /dev/null 2>&1; then
  echo "🔄 원격 저장소 업데이트: $REPO_URL"
  git remote set-url origin "$REPO_URL"
else
  echo "🔗 원격 저장소 연결: $REPO_URL"
  git remote add origin "$REPO_URL"
fi

echo "🚀 GitHub로 푸시..."
git push -u origin main

echo ""
echo "✨ 완료! 이제 Vercel에 연결하세요:"
echo "   1. https://vercel.com/new 접속"
echo "   2. GitHub 저장소 Import"
echo "   3. Framework Preset: Other (기본값 유지)"
echo "   4. Deploy 클릭"
