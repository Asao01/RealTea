# ═══════════════════════════════════════════════════════════════════
# RealTea Post-Deployment Health Audit & Auto-Repair
# Run this script weekly or after any deployment
# ═══════════════════════════════════════════════════════════════════

param(
    [switch]$AutoRepair = $true,
    [switch]$Verbose = $false
)

Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🏥 REALTEA POST-DEPLOYMENT HEALTH AUDIT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

$results = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    checks = @()
    repairs = @()
    warnings = @()
    errors = @()
    overallHealth = 0
}

function Add-Check {
    param($Name, $Status, $Message, $Details = $null)
    
    $icon = switch ($Status) {
        "PASS" { "✅" }
        "WARN" { "⚠️" }
        "FAIL" { "❌" }
        "INFO" { "ℹ️" }
    }
    
    $color = switch ($Status) {
        "PASS" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
        "INFO" { "Cyan" }
    }
    
    Write-Host "$icon [$Name] $Message" -ForegroundColor $color
    if ($Details -and $Verbose) {
        Write-Host "   Details: $Details" -ForegroundColor Gray
    }
    
    $results.checks += @{ name = $Name; status = $Status; message = $Message; details = $Details }
    
    if ($Status -eq "WARN") { $results.warnings += $Message }
    if ($Status -eq "FAIL") { $results.errors += $Message }
}

function Add-Repair {
    param($Component, $Action, $Success)
    
    $icon = if ($Success) { "🔧" } else { "❌" }
    $status = if ($Success) { "SUCCESS" } else { "FAILED" }
    
    Write-Host "$icon [AUTO-REPAIR] $Component - $Action - $status" -ForegroundColor $(if ($Success) {"Green"} else {"Red"})
    
    $results.repairs += @{ component = $Component; action = $Action; success = $Success }
}

# ═══════════════════════════════════════════════════════════════════
# 1️⃣ HOSTING & DEPLOYMENT CHECK
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n1️⃣ HOSTING & DEPLOYMENT CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check build output exists
if (Test-Path ".next") {
    Add-Check "BUILD_OUTPUT" "PASS" "Next.js build output exists (.next folder)"
} else {
    Add-Check "BUILD_OUTPUT" "FAIL" "Missing .next folder"
    
    if ($AutoRepair) {
        Write-Host "   🔧 Running npm run build..." -ForegroundColor Yellow
        $buildResult = npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Repair "BUILD" "Rebuilt application" $true
        } else {
            Add-Repair "BUILD" "Build failed" $false
        }
    }
}

# Check Firebase hosting sites
Write-Host "`nChecking Firebase hosting..." -ForegroundColor Cyan
$hostingSites = firebase hosting:sites:list 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Check "HOSTING_SITES" "PASS" "Firebase hosting configured"
} else {
    Add-Check "HOSTING_SITES" "WARN" "Firebase hosting not accessible (may need login)"
}

# ═══════════════════════════════════════════════════════════════════
# 2️⃣ FUNCTIONS & SCHEDULER CHECK
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n2️⃣ FUNCTIONS & SCHEDULER CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check functions code exists
if (Test-Path "functions\index.js") {
    $functionsContent = Get-Content "functions\index.js" -Raw
    
    if ($functionsContent -match "scheduledDailyUpdate") {
        Add-Check "SCHEDULER_CODE" "PASS" "scheduledDailyUpdate function defined"
    } else {
        Add-Check "SCHEDULER_CODE" "FAIL" "scheduledDailyUpdate function missing"
    }
    
    if ($functionsContent -match "backfillHistory") {
        Add-Check "BACKFILL_CODE" "PASS" "backfillHistory function defined"
    } else {
        Add-Check "BACKFILL_CODE" "FAIL" "backfillHistory function missing"
    }
    
    if ($functionsContent -match "healthCheck") {
        Add-Check "HEALTH_CODE" "PASS" "healthCheck function defined"
    } else {
        Add-Check "HEALTH_CODE" "FAIL" "healthCheck function missing"
    }
    
    # Check OpenAI integration
    if ($functionsContent -match "openai") {
        Add-Check "OPENAI_INTEGRATION" "PASS" "OpenAI SDK integrated in functions"
    } else {
        Add-Check "OPENAI_INTEGRATION" "WARN" "OpenAI integration not detected"
    }
} else {
    Add-Check "FUNCTIONS_FILE" "FAIL" "functions/index.js not found"
}

# Try to list deployed functions
Write-Host "`nChecking deployed functions..." -ForegroundColor Cyan
$functionsList = firebase functions:list 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Check "FUNCTIONS_DEPLOYED" "PASS" "Functions accessible"
    if ($Verbose) {
        Write-Host $functionsList -ForegroundColor Gray
    }
} else {
    Add-Check "FUNCTIONS_DEPLOYED" "WARN" "Cannot list functions (authentication required or not deployed)"
}

# Test health check endpoint
Write-Host "`nTesting health check endpoint..." -ForegroundColor Cyan
try {
    $healthUrl = "https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck"
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10 -ErrorAction Stop
    
    if ($response.status -eq "healthy") {
        Add-Check "HEALTH_ENDPOINT" "PASS" "Health check endpoint responding: $($response.status)"
    } else {
        Add-Check "HEALTH_ENDPOINT" "WARN" "Health check returned unexpected status"
    }
} catch {
    Add-Check "HEALTH_ENDPOINT" "WARN" "Health endpoint not accessible (functions may not be deployed yet)"
}

# ═══════════════════════════════════════════════════════════════════
# 3️⃣ FIRESTORE DATABASE CHECK
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n3️⃣ FIRESTORE DATABASE CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check Firestore rules file
if (Test-Path "firestore.rules") {
    $rulesContent = Get-Content "firestore.rules" -Raw
    
    if ($rulesContent -match "allow read: if true") {
        Add-Check "FIRESTORE_RULES" "PASS" "Public read access configured"
    } else {
        Add-Check "FIRESTORE_RULES" "WARN" "Public read rule may be missing"
    }
    
    if ($rulesContent -match "verifiedByAI") {
        Add-Check "AI_VERIFICATION_RULE" "PASS" "AI verification rule present"
    } else {
        Add-Check "AI_VERIFICATION_RULE" "WARN" "AI verification rule may be missing"
    }
} else {
    Add-Check "FIRESTORE_RULES_FILE" "FAIL" "firestore.rules file not found"
}

# ═══════════════════════════════════════════════════════════════════
# 4️⃣ ENVIRONMENT VARIABLES CHECK
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n4️⃣ ENVIRONMENT VARIABLES CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

$requiredEnvVars = @(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "OPENAI_API_KEY"
)

if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    $missingVars = @()
    
    foreach ($var in $requiredEnvVars) {
        if ($envContent -match $var) {
            Add-Check "ENV_$var" "PASS" "$var present"
        } else {
            $missingVars += $var
            Add-Check "ENV_$var" "FAIL" "$var missing"
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Add-Check "ENV_COMPLETE" "PASS" "All required environment variables present"
    } else {
        Add-Check "ENV_COMPLETE" "FAIL" "$($missingVars.Count) variables missing"
    }
} else {
    Add-Check "ENV_FILE" "FAIL" ".env.local file not found"
    
    if ($AutoRepair) {
        Write-Host "   🔧 Creating .env.local template..." -ForegroundColor Yellow
        @"
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=reality-3af7f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# API Keys
OPENAI_API_KEY=sk-your_openai_key_here
NEWS_API_KEY=your_news_api_key_here
"@ | Out-File ".env.local" -Encoding UTF8
        
        Add-Repair "ENV_FILE" "Created .env.local template" $true
        Write-Host "   ⚠️  Please fill in your actual API keys in .env.local" -ForegroundColor Yellow
    }
}

# Check Firebase functions config
Write-Host "`nChecking Firebase functions config..." -ForegroundColor Cyan
$functionsConfig = firebase functions:config:get 2>&1
if ($LASTEXITCODE -eq 0) {
    if ($functionsConfig -match "openai") {
        Add-Check "FUNCTIONS_CONFIG" "PASS" "OpenAI key configured in Firebase Functions"
    } else {
        Add-Check "FUNCTIONS_CONFIG" "WARN" "OpenAI key may not be set in Firebase Functions"
        Write-Host "   Run: firebase functions:config:set openai.key=`"sk-YOUR-KEY`"" -ForegroundColor Yellow
    }
} else {
    Add-Check "FUNCTIONS_CONFIG" "WARN" "Cannot check functions config (authentication required)"
}

# ═══════════════════════════════════════════════════════════════════
# 5️⃣ FRONT-END HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n5️⃣ FRONT-END HEALTH CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check critical component files
$criticalFiles = @(
    "src\components\TimelineEvent.js",
    "src\lib\firebase.js",
    "src\lib\firestoreService.js",
    "src\lib\realteaAI.js"
)

$allFilesPresent = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Add-Check "FILE_$(Split-Path $file -Leaf)" "PASS" "$(Split-Path $file -Leaf) exists"
    } else {
        Add-Check "FILE_$(Split-Path $file -Leaf)" "FAIL" "Missing: $file"
        $allFilesPresent = $false
    }
}

# Check TimelineEvent for modal implementation
if (Test-Path "src\components\TimelineEvent.js") {
    $timelineContent = Get-Content "src\components\TimelineEvent.js" -Raw
    
    if ($timelineContent -match "detailsModalOpen") {
        Add-Check "MODAL_SYSTEM" "PASS" "Modal popup system implemented"
    } else {
        Add-Check "MODAL_SYSTEM" "FAIL" "Modal system missing"
    }
    
    if ($timelineContent -match "shortSummary") {
        Add-Check "SHORT_SUMMARY" "PASS" "Short summary display implemented"
    } else {
        Add-Check "SHORT_SUMMARY" "WARN" "Short summary may not be used"
    }
    
    if ($timelineContent -match "event\.sources") {
        Add-Check "SOURCES_DISPLAY" "PASS" "Source citations implemented"
    } else {
        Add-Check "SOURCES_DISPLAY" "WARN" "Source display may be missing"
    }
}

# Test build
Write-Host "`nTesting production build..." -ForegroundColor Cyan
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Check "BUILD_TEST" "PASS" "Production build successful"
} else {
    Add-Check "BUILD_TEST" "FAIL" "Build failed"
    
    if ($AutoRepair) {
        Write-Host "   🔧 Attempting build repair..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
        npm install 2>&1 | Out-Null
        $rebuildOutput = npm run build 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Add-Repair "BUILD" "Cleared cache and rebuilt" $true
        } else {
            Add-Repair "BUILD" "Repair failed" $false
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# 6️⃣ CONFIGURATION FILES CHECK
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n6️⃣ CONFIGURATION FILES CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Validate JSON files
$jsonFiles = @{
    "package.json" = "Package configuration"
    "firebase.json" = "Firebase configuration"
    "firestore.indexes.json" = "Firestore indexes"
}

foreach ($file in $jsonFiles.Keys) {
    if (Test-Path $file) {
        try {
            $content = Get-Content $file -Raw | ConvertFrom-Json
            Add-Check "JSON_$file" "PASS" "$($jsonFiles[$file]) valid"
        } catch {
            Add-Check "JSON_$file" "FAIL" "$file has invalid JSON syntax"
        }
    } else {
        if ($file -eq "firestore.indexes.json") {
            Add-Check "JSON_$file" "WARN" "$file missing (optional)"
        } else {
            Add-Check "JSON_$file" "FAIL" "$file missing"
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# 7️⃣ LOGS & ERROR DETECTION
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n7️⃣ LOGS & ERROR DETECTION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check for recent error logs (if authenticated)
Write-Host "Checking Firebase function logs..." -ForegroundColor Cyan
$logs = firebase functions:log --limit 20 2>&1
if ($LASTEXITCODE -eq 0) {
    $errorCount = ($logs | Select-String -Pattern "Error|error|ERROR").Count
    $warningCount = ($logs | Select-String -Pattern "Warning|warning|WARN").Count
    
    if ($errorCount -eq 0) {
        Add-Check "FUNCTION_LOGS" "PASS" "No errors in recent function logs"
    } elseif ($errorCount -lt 5) {
        Add-Check "FUNCTION_LOGS" "WARN" "$errorCount errors found in logs"
    } else {
        Add-Check "FUNCTION_LOGS" "FAIL" "$errorCount errors found - review logs"
    }
    
    if ($Verbose -and $errorCount -gt 0) {
        Write-Host "`n   Recent errors:" -ForegroundColor Red
        $logs | Select-String -Pattern "Error|error|ERROR" | Select-Object -First 5 | ForEach-Object {
            Write-Host "   • $_" -ForegroundColor Red
        }
    }
} else {
    Add-Check "FUNCTION_LOGS" "WARN" "Cannot access function logs (authentication required)"
}

# ═══════════════════════════════════════════════════════════════════
# 8️⃣ DEPENDENCY HEALTH
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n8️⃣ DEPENDENCY HEALTH CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check for outdated packages
Write-Host "Checking for outdated dependencies..." -ForegroundColor Cyan
$outdated = npm outdated 2>&1
if ($outdated -match "Package") {
    Add-Check "DEPENDENCIES" "WARN" "Some packages have updates available"
    if ($Verbose) {
        Write-Host $outdated -ForegroundColor Yellow
    }
} else {
    Add-Check "DEPENDENCIES" "PASS" "All dependencies up-to-date or no critical updates"
}

# Check for vulnerabilities
Write-Host "Checking for security vulnerabilities..." -ForegroundColor Cyan
$audit = npm audit --json 2>&1 | ConvertFrom-Json
if ($audit.metadata) {
    $vulnCount = $audit.metadata.vulnerabilities.total
    if ($vulnCount -eq 0) {
        Add-Check "SECURITY_AUDIT" "PASS" "No security vulnerabilities found"
    } elseif ($vulnCount -lt 5) {
        Add-Check "SECURITY_AUDIT" "WARN" "$vulnCount vulnerabilities found (run: npm audit fix)"
    } else {
        Add-Check "SECURITY_AUDIT" "FAIL" "$vulnCount vulnerabilities - run: npm audit fix --force"
        
        if ($AutoRepair) {
            Write-Host "   🔧 Running npm audit fix..." -ForegroundColor Yellow
            npm audit fix 2>&1 | Out-Null
            Add-Repair "SECURITY" "Ran npm audit fix" $true
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# 9️⃣ GITHUB ACTIONS CHECK
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n9️⃣ GITHUB ACTIONS CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

# Check workflow files
$workflows = @(
    ".github\workflows\firebase-hosting-merge.yml",
    ".github\workflows\firebase-hosting-pull-request.yml",
    ".github\workflows\deploy-firebase-functions.yml"
)

$workflowsPresent = 0
foreach ($workflow in $workflows) {
    if (Test-Path $workflow) {
        $workflowsPresent++
        Add-Check "WORKFLOW_$(Split-Path $workflow -Leaf)" "PASS" "$(Split-Path $workflow -Leaf) exists"
    } else {
        Add-Check "WORKFLOW_$(Split-Path $workflow -Leaf)" "WARN" "Missing: $workflow"
    }
}

if ($workflowsPresent -eq 3) {
    Add-Check "GITHUB_ACTIONS" "PASS" "All 3 GitHub Actions workflows present"
} elseif ($workflowsPresent -gt 0) {
    Add-Check "GITHUB_ACTIONS" "WARN" "Only $workflowsPresent/3 workflows found"
} else {
    Add-Check "GITHUB_ACTIONS" "INFO" "GitHub Actions not configured (optional)"
}

# ═══════════════════════════════════════════════════════════════════
# GENERATE HEALTH REPORT
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 HEALTH AUDIT SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$passCount = ($results.checks | Where-Object { $_.status -eq "PASS" }).Count
$warnCount = ($results.checks | Where-Object { $_.status -eq "WARN" }).Count
$failCount = ($results.checks | Where-Object { $_.status -eq "FAIL" }).Count
$totalChecks = $results.checks.Count

Write-Host "`nTotal Checks: $totalChecks" -ForegroundColor White
Write-Host "✅ Passed: $passCount" -ForegroundColor Green
Write-Host "⚠️  Warnings: $warnCount" -ForegroundColor Yellow
Write-Host "❌ Failed: $failCount" -ForegroundColor Red

# Calculate health percentage
$healthPercentage = if ($totalChecks -gt 0) { [math]::Round(($passCount / $totalChecks) * 100) } else { 0 }
$results.overallHealth = $healthPercentage

Write-Host "`nOVERALL HEALTH: $healthPercentage%" -ForegroundColor $(
    if ($healthPercentage -ge 90) { "Green" }
    elseif ($healthPercentage -ge 75) { "Yellow" }
    else { "Red" }
)

# Status message
if ($healthPercentage -ge 90) {
    Write-Host "🟢 EXCELLENT - System is healthy" -ForegroundColor Green
} elseif ($healthPercentage -ge 75) {
    Write-Host "🟡 GOOD - Minor issues detected" -ForegroundColor Yellow
} elseif ($healthPercentage -ge 50) {
    Write-Host "🟠 NEEDS ATTENTION - Several issues found" -ForegroundColor Yellow
} else {
    Write-Host "🔴 CRITICAL - Major issues require attention" -ForegroundColor Red
}

# List repairs applied
if ($results.repairs.Count -gt 0) {
    Write-Host "`n🔧 REPAIRS APPLIED:" -ForegroundColor Yellow
    $results.repairs | ForEach-Object {
        $status = if ($_.success) { "✅" } else { "❌" }
        Write-Host "   $status $($_.component): $($_.action)" -ForegroundColor $(if ($_.success) {"Green"} else {"Red"})
    }
}

# List warnings
if ($results.warnings.Count -gt 0) {
    Write-Host "`n⚠️  WARNINGS:" -ForegroundColor Yellow
    $results.warnings | ForEach-Object {
        Write-Host "   • $_" -ForegroundColor Yellow
    }
}

# List failures
if ($results.errors.Count -gt 0) {
    Write-Host "`n❌ CRITICAL ISSUES:" -ForegroundColor Red
    $results.errors | ForEach-Object {
        Write-Host "   • $_" -ForegroundColor Red
    }
}

# Recommendations
Write-Host "`n💡 RECOMMENDED ACTIONS:" -ForegroundColor Cyan

if ($failCount -gt 0 -or $warnCount -gt 3) {
    Write-Host "   1. Review issues above and address failures first" -ForegroundColor White
    Write-Host "   2. Run: firebase login (if authentication errors)" -ForegroundColor White
    Write-Host "   3. Run: firebase deploy --only functions,firestore:rules" -ForegroundColor White
} else {
    Write-Host "   1. Deploy if not done: firebase deploy --only `"functions,firestore:rules`"" -ForegroundColor White
    Write-Host "   2. Test backfill: curl https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=17&max=5" -ForegroundColor White
    Write-Host "   3. Deploy frontend: vercel --prod" -ForegroundColor White
}

Write-Host "`n═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Save report to file
$reportFilename = "REALTEA_HEALTH_AUDIT_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').md"
$reportContent = @"
# RealTea Health Audit Report

**Generated:** $($results.timestamp)
**Health Score:** $healthPercentage%

## Summary

- Total Checks: $totalChecks
- Passed: $passCount
- Warnings: $warnCount
- Failed: $failCount

## Checks

$(
    $results.checks | ForEach-Object {
        "- [$($_.status)] $($_.name): $($_.message)"
    } | Out-String
)

## Repairs Applied

$(
    if ($results.repairs.Count -gt 0) {
        $results.repairs | ForEach-Object {
            "- $($_.component): $($_.action) - $(if ($_.success) {"SUCCESS"} else {"FAILED"})"
        } | Out-String
    } else {
        "No repairs needed"
    }
)

## Recommendations

$(
    if ($failCount -gt 0 -or $warnCount -gt 3) {
        "1. Address critical failures first
2. Run: firebase login
3. Deploy: firebase deploy --only functions,firestore:rules"
    } else {
        "System is healthy. Ready for deployment or already deployed successfully."
    }
)

---

*Generated by RealTea Health Audit System*
"@

$reportContent | Out-File $reportFilename -Encoding UTF8
Write-Host "📁 Detailed report saved to: $reportFilename`n" -ForegroundColor Gray

# Final status message
if ($healthPercentage -ge 90) {
    Write-Host "🟢 RealTea health verified. All systems normal.`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  RealTea needs attention. Review issues above.`n" -ForegroundColor Yellow
}

