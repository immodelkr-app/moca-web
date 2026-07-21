# =========================================================
# deploy.ps1 - MOCA 운영 배포 스크립트
# 반드시 이 스크립트로 배포하세요.
# 대상: im-model-app (immoca.kr)
# =========================================================

Write-Host "🔗 Vercel 프로젝트 연결 확인 중 (im-model-app)..." -ForegroundColor Cyan
npx vercel link --project im-model-app --yes

Write-Host ""
Write-Host "🏗️  빌드 및 운영 배포 시작..." -ForegroundColor Yellow
npx vercel --prod --yes

Write-Host ""
Write-Host "✅ 배포 완료! 사이트: https://immoca.kr" -ForegroundColor Green
