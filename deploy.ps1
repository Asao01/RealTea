Write-Host '🌐 Syncing environment variables with Vercel...' -ForegroundColor Cyan
npx vercel env pull .env.local --yes
Write-Host '🚀 Deploying to production...' -ForegroundColor Green
npx vercel --prod --yes
Write-Host '🩺 Checking system health...' -ForegroundColor Yellow
Start-Sleep -Seconds 10
try {
    $response = Invoke-WebRequest -Uri 'https://realitea.org/api/aiHeartbeat' -UseBasicParsing -TimeoutSec 60
    Write-Host '✅ AI Heartbeat responded!' -ForegroundColor Green
} catch {
    Write-Host '⚠️ Could not reach AI backend yet. Wait ~2 min for propagation.' -ForegroundColor Yellow
}
Write-Host '✅ Done! Your site is live at https://realitea.org' -ForegroundColor Green
