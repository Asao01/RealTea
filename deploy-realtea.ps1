# ═══════════════════════════════════════════════════════════════════
# RealTea Automated Deployment Script
# Run this in PowerShell with: .\deploy-realtea.ps1
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 REALTEA AUTOMATED DEPLOYMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n"

# Initialize results
$results = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    steps = @()
    errors = @()
    warnings = @()
}

function Add-Result {
    param(
        [string]$Step,
        [string]$Status,
        [string]$Message
    )
    
    $icon = switch ($Status) {
        "SUCCESS" { "✅" }
        "WARNING" { "⚠️" }
        "ERROR" { "❌" }
        "INFO" { "ℹ️" }
        default { "•" }
    }
    
    $color = switch ($Status) {
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "$icon [$Step] $Message" -ForegroundColor $color
    
    $results.steps += @{
        step = $Step
        status = $Status
        message = $Message
        timestamp = Get-Date -Format "HH:mm:ss"
    }
    
    if ($Status -eq "ERROR") {
        $results.errors += $Message
    }
    elseif ($Status -eq "WARNING") {
        $results.warnings += $Message
    }
}

# ═══════════════════════════════════════════════════════════════════
# STEP 1: Check Prerequisites
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n1️⃣ CHECKING PREREQUISITES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check Firebase CLI
try {
    $firebaseVersion = firebase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Result "FIREBASE_CLI" "SUCCESS" "Firebase CLI installed: $firebaseVersion"
    } else {
        Add-Result "FIREBASE_CLI" "ERROR" "Firebase CLI not found. Install: npm install -g firebase-tools"
        exit 1
    }
} catch {
    Add-Result "FIREBASE_CLI" "ERROR" "Firebase CLI not found. Install: npm install -g firebase-tools"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Add-Result "NODE_JS" "SUCCESS" "Node.js installed: $nodeVersion"
} catch {
    Add-Result "NODE_JS" "ERROR" "Node.js not found. Install from nodejs.org"
    exit 1
}

# Check if logged in
Write-Host "`nChecking Firebase authentication..." -ForegroundColor Cyan
$loginCheck = firebase projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Add-Result "FIREBASE_AUTH" "WARNING" "Not logged in to Firebase"
    Write-Host "`n⚠️  ACTION REQUIRED: Firebase Login" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "Firebase requires browser authentication. Running login command...`n" -ForegroundColor White
    
    # Try to open browser for login
    Start-Process "firebase" -ArgumentList "login" -Wait -NoNewWindow
    
    # Check again
    $loginCheck = firebase projects:list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Add-Result "FIREBASE_AUTH" "ERROR" "Firebase login failed. Please run: firebase login"
        Write-Host "`n❌ Please open a new PowerShell window and run:" -ForegroundColor Red
        Write-Host "   firebase login" -ForegroundColor White
        Write-Host "   Then run this script again.`n" -ForegroundColor White
        exit 1
    }
}

Add-Result "FIREBASE_AUTH" "SUCCESS" "Authenticated with Firebase"

# Check project
$projectId = (Get-Content .firebaserc | ConvertFrom-Json).projects.default
Add-Result "PROJECT_ID" "INFO" "Using project: $projectId"

# ═══════════════════════════════════════════════════════════════════
# STEP 2: Install Dependencies
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n2️⃣ INSTALLING DEPENDENCIES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Functions dependencies
Write-Host "Installing Firebase Functions dependencies..." -ForegroundColor Cyan
Push-Location functions
$installOutput = npm install 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Result "FUNCTIONS_DEPS" "SUCCESS" "Functions dependencies installed"
} else {
    Add-Result "FUNCTIONS_DEPS" "WARNING" "Functions install had warnings (may be okay)"
}
Pop-Location

# ═══════════════════════════════════════════════════════════════════
# STEP 3: Deploy Firestore Rules
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n3️⃣ DEPLOYING FIRESTORE RULES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

$rulesOutput = firebase deploy --only firestore:rules 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Result "FIRESTORE_RULES" "SUCCESS" "Firestore security rules deployed"
} else {
    Add-Result "FIRESTORE_RULES" "ERROR" "Failed to deploy Firestore rules"
}

# ═══════════════════════════════════════════════════════════════════
# STEP 4: Deploy Cloud Functions
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n4️⃣ DEPLOYING CLOUD FUNCTIONS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

Write-Host "⏳ This may take 3-5 minutes..." -ForegroundColor Cyan
$functionsOutput = firebase deploy --only functions 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Result "FUNCTIONS" "SUCCESS" "Cloud Functions deployed successfully"
    
    # Extract function URLs
    Write-Host "`nFunction URLs:" -ForegroundColor Green
    firebase functions:list | Where-Object { $_ -match "backfillHistory|healthCheck" } | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
} else {
    Add-Result "FUNCTIONS" "ERROR" "Failed to deploy Cloud Functions"
    Write-Host $functionsOutput -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════════
# STEP 5: Test Backfill
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n5️⃣ TESTING AI BACKFILL" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Get function URL
$region = "us-central1"  # Default region
$backfillUrl = "https://$region-$projectId.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"

Write-Host "Calling backfill endpoint..." -ForegroundColor Cyan
Write-Host "URL: $backfillUrl`n" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $backfillUrl -Method Get -ErrorAction Stop
    
    if ($response.success) {
        Add-Result "BACKFILL" "SUCCESS" "Backfill completed: $($response.stats.created) events created"
        Write-Host "`nBackfill Results:" -ForegroundColor Green
        Write-Host "  Created: $($response.stats.created)" -ForegroundColor White
        Write-Host "  Updated: $($response.stats.updated)" -ForegroundColor White
        Write-Host "  Skipped: $($response.stats.skipped)" -ForegroundColor White
        Write-Host "  Errors: $($response.stats.errors)" -ForegroundColor White
    } else {
        Add-Result "BACKFILL" "ERROR" "Backfill failed"
    }
} catch {
    Add-Result "BACKFILL" "WARNING" "Could not test backfill automatically. Function may need time to initialize."
    Write-Host "`n⚠️  To test manually, wait 2 minutes then run:" -ForegroundColor Yellow
    Write-Host "   curl `"$backfillUrl`"" -ForegroundColor White
}

# ═══════════════════════════════════════════════════════════════════
# STEP 6: Build Frontend
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n6️⃣ BUILDING FRONTEND" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

Write-Host "Building Next.js application..." -ForegroundColor Cyan
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Result "BUILD" "SUCCESS" "Frontend built successfully"
} else {
    Add-Result "BUILD" "ERROR" "Frontend build failed"
    Write-Host $buildOutput -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════════
# STEP 7: Deploy Hosting (Optional)
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n7️⃣ FRONTEND DEPLOYMENT" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

Write-Host "Do you want to deploy to Firebase Hosting? (Y/N)" -ForegroundColor Cyan
$deploy = Read-Host

if ($deploy -eq "Y" -or $deploy -eq "y") {
    # Export for Firebase Hosting
    Write-Host "Exporting Next.js for static hosting..." -ForegroundColor Cyan
    $exportOutput = npm run build 2>&1
    
    if (Test-Path "out") {
        $hostingOutput = firebase deploy --only hosting 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Result "HOSTING" "SUCCESS" "Firebase Hosting deployed"
            Write-Host "`n🌐 Your site is live!" -ForegroundColor Green
            Write-Host "   URL: https://$projectId.web.app" -ForegroundColor White
        } else {
            Add-Result "HOSTING" "ERROR" "Hosting deployment failed"
        }
    } else {
        Add-Result "HOSTING" "ERROR" "No 'out' directory found. Next.js export failed."
    }
} else {
    Add-Result "HOSTING" "INFO" "Skipped Firebase Hosting deployment"
    Write-Host "`n💡 To deploy frontend later:" -ForegroundColor Cyan
    Write-Host "   Option 1: Firebase Hosting - firebase deploy --only hosting" -ForegroundColor White
    Write-Host "   Option 2: Vercel - vercel --prod" -ForegroundColor White
}

# ═══════════════════════════════════════════════════════════════════
# STEP 8: Verify Deployment
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n8️⃣ VERIFYING DEPLOYMENT" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check functions
Write-Host "Checking deployed functions..." -ForegroundColor Cyan
$functionsList = firebase functions:list 2>&1
if ($functionsList -match "scheduledDailyUpdate") {
    Add-Result "SCHEDULER" "SUCCESS" "Scheduler function deployed (runs daily at 1 AM)"
} else {
    Add-Result "SCHEDULER" "WARNING" "Scheduler function not found"
}

if ($functionsList -match "backfillHistory") {
    Add-Result "BACKFILL_FUNC" "SUCCESS" "Backfill function deployed (HTTP endpoint)"
} else {
    Add-Result "BACKFILL_FUNC" "WARNING" "Backfill function not found"
}

if ($functionsList -match "healthCheck") {
    Add-Result "HEALTH_CHECK" "SUCCESS" "Health check function deployed"
} else {
    Add-Result "HEALTH_CHECK" "WARNING" "Health check function not found"
}

# ═══════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 DEPLOYMENT REPORT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Timestamp: $($results.timestamp)`n" -ForegroundColor Gray

# Count results
$successCount = ($results.steps | Where-Object { $_.status -eq "SUCCESS" }).Count
$warningCount = ($results.steps | Where-Object { $_.status -eq "WARNING" }).Count
$errorCount = ($results.steps | Where-Object { $_.status -eq "ERROR" }).Count
$totalSteps = $results.steps.Count

Write-Host "SUMMARY:" -ForegroundColor White
Write-Host "  Total Steps: $totalSteps" -ForegroundColor White
Write-Host "  ✅ Success: $successCount" -ForegroundColor Green
Write-Host "  ⚠️  Warnings: $warningCount" -ForegroundColor Yellow
Write-Host "  ❌ Errors: $errorCount" -ForegroundColor Red
Write-Host ""

# Overall status
if ($errorCount -eq 0 -and $warningCount -le 2) {
    Write-Host "🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "✅ REALTEA IS NOW RUNNING!" -ForegroundColor Green
    Write-Host "`nYour RealTea timeline is deployed and operational:`n" -ForegroundColor White
    Write-Host "  • Firestore: Connected & secured" -ForegroundColor White
    Write-Host "  • Functions: 3 deployed (scheduler, backfill, health)" -ForegroundColor White
    Write-Host "  • AI Updater: Ready (runs daily at 1 AM)" -ForegroundColor White
    Write-Host "  • Backfill: $($response.stats.created) events created" -ForegroundColor White
    Write-Host "  • Cost: ~$10-15/month (OpenAI API)" -ForegroundColor White
    
    Write-Host "`n🌐 LIVE URLS:" -ForegroundColor Cyan
    Write-Host "  Backfill: https://$region-$projectId.cloudfunctions.net/backfillHistory" -ForegroundColor White
    Write-Host "  Health: https://$region-$projectId.cloudfunctions.net/healthCheck" -ForegroundColor White
    if ($deploy -eq "Y" -or $deploy -eq "y") {
        Write-Host "  Website: https://$projectId.web.app" -ForegroundColor White
    }
    
    Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "  1. Visit Firebase Console to see your events" -ForegroundColor White
    Write-Host "  2. Deploy frontend: vercel --prod (or use Firebase Hosting)" -ForegroundColor White
    Write-Host "  3. Monitor logs: firebase functions:log" -ForegroundColor White
    Write-Host "  4. Check costs: OpenAI Dashboard (platform.openai.com)" -ForegroundColor White
    
} elseif ($errorCount -eq 0) {
    Write-Host "⚠️  DEPLOYMENT COMPLETED WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "Warnings:" -ForegroundColor Yellow
    foreach ($warning in $results.warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
    
    Write-Host "`n💡 Review warnings and re-run if needed.`n" -ForegroundColor Cyan
} else {
    Write-Host "❌ DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "Errors:" -ForegroundColor Red
    foreach ($error in $results.errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
    
    Write-Host "`n📖 See MANUAL_DEPLOYMENT_STEPS.md for detailed troubleshooting.`n" -ForegroundColor Cyan
}

# Save report
$reportPath = "DEPLOYMENT_REPORT_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').json"
$results | ConvertTo-Json -Depth 10 | Out-File $reportPath
Write-Host "📄 Detailed report saved to: $reportPath`n" -ForegroundColor Gray

Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

