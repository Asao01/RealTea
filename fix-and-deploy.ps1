# 🧠 RealTea Automatic Fix & Redeploy Script
# This script updates missing env vars and redeploys to Vercel
# PowerShell version for Windows

Write-Host "🔧 RealTea Fix & Deploy Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Run this from the realtea-timeline directory" -ForegroundColor Red
    exit 1
}

# Step 1: Check current environment variables
Write-Host "📋 Step 1: Checking current environment variables...`n" -ForegroundColor Yellow

$envVars = @{}
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.+)$') {
            $envVars[$matches[1]] = $matches[2].Trim('"')
        }
    }
}

# Display what we have
Write-Host "✅ Found API Keys:" -ForegroundColor Green
Write-Host "   - NEXT_PUBLIC_FIREBASE_API_KEY: $($envVars['NEXT_PUBLIC_FIREBASE_API_KEY'].Substring(0, 15))..." -ForegroundColor White
Write-Host "   - NEWS_API_KEY: $($envVars['NEWS_API_KEY'].Substring(0, 10))..." -ForegroundColor White
Write-Host "   - OPENAI_API_KEY: sk-proj-..." -ForegroundColor White

# Check for missing Google Maps key
if (-not $envVars.ContainsKey('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY') -or $envVars['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] -eq '') {
    Write-Host "`n⚠️  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is MISSING" -ForegroundColor Yellow
    Write-Host "   The map page won't work without this.`n" -ForegroundColor Yellow
    
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  1. Get a Google Maps API key from: https://console.cloud.google.com/apis/credentials"
    Write-Host "  2. Skip for now (map will be broken but everything else works)`n"
    
    $choice = Read-Host "Enter your choice (1 or 2)"
    
    if ($choice -eq "1") {
        $mapsKey = Read-Host "Enter your Google Maps API key"
        if ($mapsKey) {
            $envVars['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] = $mapsKey
            Write-Host "✅ Maps API key added" -ForegroundColor Green
        }
    } else {
        Write-Host "⏭️  Skipping Maps API key" -ForegroundColor Yellow
    }
} else {
    Write-Host "   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: Found ✅" -ForegroundColor Green
}

# Step 2: Update .env.local with all required vars
Write-Host "`n📝 Step 2: Updating .env.local...`n" -ForegroundColor Yellow

$envContent = @"
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=$($envVars['NEXT_PUBLIC_FIREBASE_API_KEY'])
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=reality-3af7f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=reality-3af7f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=reality-3af7f.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=741139781623
NEXT_PUBLIC_FIREBASE_APP_ID=1:741139781623:web:c969a4b252da1e1a20c36b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ZWHTSQ8G9

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$($envVars['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'])

# News & History APIs
NEWS_API_URL=https://newsapi.org/v2/top-headlines?language=en
NEWS_API_KEY=$($envVars['NEWS_API_KEY'])
HISTORY_API_URL=https://api.gdeltproject.org/api/v2/doc/doc?query=world&format=json
HISTORY_API_KEY=none

# OpenAI
OPENAI_API_KEY=$($envVars['OPENAI_API_KEY'])

# Base URL
NEXT_PUBLIC_BASE_URL=https://realitea.org
"@

Set-Content -Path ".env.local" -Value $envContent
Write-Host "✅ .env.local updated" -ForegroundColor Green

# Step 3: Push environment variables to Vercel
Write-Host "`n🌍 Step 3: Pushing environment variables to Vercel...`n" -ForegroundColor Yellow

# Note: vercel env add is interactive, so we'll need to do this carefully
Write-Host "⚠️  You'll need to manually update Vercel environment variables:" -ForegroundColor Yellow
Write-Host "   Run these commands:`n" -ForegroundColor White

if ($envVars['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']) {
    Write-Host "   echo `"$($envVars['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'])`" | npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production" -ForegroundColor Cyan
}

Write-Host "`n   OR use the Vercel Dashboard:" -ForegroundColor White
Write-Host "   https://vercel.com/asao01s-projects/realtea-timeline/settings/environment-variables`n" -ForegroundColor Cyan

# Step 4: Redeploy to production
Write-Host "🚀 Step 4: Deploying to production...`n" -ForegroundColor Yellow

$deploy = Read-Host "Ready to deploy to production? (y/n)"

if ($deploy -eq "y") {
    Write-Host "`nDeploying..." -ForegroundColor Cyan
    npx vercel --prod --yes
    
    Write-Host "`n✅ Deployment initiated!" -ForegroundColor Green
    Write-Host "`n⏳ Waiting 15 seconds for deployment to complete...`n" -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Step 5: Test endpoints
    Write-Host "🔍 Step 5: Testing API endpoints...`n" -ForegroundColor Yellow
    
    Write-Host "Testing /api/fetchBreaking..." -ForegroundColor Cyan
    $breaking = Invoke-WebRequest -Uri "https://realitea.org/api/fetchBreaking" -UseBasicParsing -TimeoutSec 30
    if ($breaking.StatusCode -eq 200) {
        Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Status: $($breaking.StatusCode)" -ForegroundColor Red
    }
    
    Write-Host "`nTesting home page..." -ForegroundColor Cyan
    $home = Invoke-WebRequest -Uri "https://realitea.org" -UseBasicParsing -TimeoutSec 10
    if ($home.StatusCode -eq 200) {
        Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Status: $($home.StatusCode)" -ForegroundColor Red
    }
    
    Write-Host "`n🎉 Deployment Complete!`n" -ForegroundColor Green
    Write-Host "🌐 Visit: https://realitea.org" -ForegroundColor Cyan
    Write-Host "🔐 Test login: https://realitea.org/login" -ForegroundColor Cyan
    Write-Host "🗺️  Test map: https://realitea.org/map`n" -ForegroundColor Cyan
    
} else {
    Write-Host "`n⏭️  Deployment skipped. Run manually with: npx vercel --prod`n" -ForegroundColor Yellow
}

Write-Host "=====================================`n" -ForegroundColor Cyan
Write-Host "📊 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Visit https://realitea.org/login and test Google Sign-In"
Write-Host "   2. Check browser console (F12) for any errors"
Write-Host "   3. Create Firestore index if prompted"
Write-Host "   4. Run health check: node scripts/systemHealthCheck.js`n"

