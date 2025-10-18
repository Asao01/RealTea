# 🤖 RealTea Automated Deployment Guide

**Use this PowerShell script to deploy RealTea automatically!**

---

## 🚀 Quick Start (5 minutes)

### **Step 1: Open PowerShell**

Right-click on `deploy-realtea.ps1` and select **"Run with PowerShell"**

**OR** in PowerShell:
```powershell
cd C:\Users\User\Desktop\Works\realtea-timeline
.\deploy-realtea.ps1
```

### **Step 2: Authenticate (Browser Opens)**

The script will open your browser for Firebase authentication. Sign in when prompted.

### **Step 3: Wait for Completion**

The script will automatically:
- ✅ Deploy Firestore rules
- ✅ Deploy Cloud Functions (3 functions)
- ✅ Test backfill (create 5 events)
- ✅ Build frontend
- ✅ Generate deployment report

---

## ✨ What the Script Does

### **Automated Steps:**

1. **Prerequisites Check**
   - Verifies Firebase CLI installed
   - Checks Node.js version
   - Validates authentication

2. **Dependency Installation**
   - Installs Functions dependencies
   - Ensures all packages up-to-date

3. **Firestore Rules Deployment**
   - Deploys security rules
   - Public read, verified writes only

4. **Cloud Functions Deployment** (3-5 minutes)
   - `scheduledDailyUpdate` - Daily cron at 1 AM
   - `backfillHistory` - HTTP manual trigger
   - `healthCheck` - System status

5. **Backfill Test**
   - Calls backfill endpoint
   - Creates 5 test events
   - Verifies AI generation

6. **Frontend Build**
   - Builds Next.js production bundle
   - Optimizes for performance

7. **Verification**
   - Checks all functions deployed
   - Confirms scheduler active
   - Validates endpoints

8. **Report Generation**
   - Creates JSON report
   - Shows success/warning/error counts
   - Provides next steps

---

## 📋 What to Expect

### **Console Output:**

```
═══════════════════════════════════════════════════════════════════
🚀 REALTEA AUTOMATED DEPLOYMENT
═══════════════════════════════════════════════════════════════════

1️⃣ CHECKING PREREQUISITES
─────────────────────────────────────────────────────────────────
✅ [FIREBASE_CLI] Firebase CLI installed: 14.20.0
✅ [NODE_JS] Node.js installed: v22.20.0
✅ [FIREBASE_AUTH] Authenticated with Firebase
ℹ️ [PROJECT_ID] Using project: reality-3af7f

2️⃣ INSTALLING DEPENDENCIES
─────────────────────────────────────────────────────────────────
✅ [FUNCTIONS_DEPS] Functions dependencies installed

3️⃣ DEPLOYING FIRESTORE RULES
─────────────────────────────────────────────────────────────────
✅ [FIRESTORE_RULES] Firestore security rules deployed

4️⃣ DEPLOYING CLOUD FUNCTIONS
─────────────────────────────────────────────────────────────────
⏳ This may take 3-5 minutes...
✅ [FUNCTIONS] Cloud Functions deployed successfully

5️⃣ TESTING AI BACKFILL
─────────────────────────────────────────────────────────────────
✅ [BACKFILL] Backfill completed: 5 events created
  Created: 5
  Updated: 0
  Skipped: 0
  Errors: 0

6️⃣ BUILDING FRONTEND
─────────────────────────────────────────────────────────────────
✅ [BUILD] Frontend built successfully

7️⃣ FRONTEND DEPLOYMENT
─────────────────────────────────────────────────────────────────
Do you want to deploy to Firebase Hosting? (Y/N)

8️⃣ VERIFYING DEPLOYMENT
─────────────────────────────────────────────────────────────────
✅ [SCHEDULER] Scheduler function deployed (runs daily at 1 AM)
✅ [BACKFILL_FUNC] Backfill function deployed (HTTP endpoint)
✅ [HEALTH_CHECK] Health check function deployed

═══════════════════════════════════════════════════════════════════
📊 DEPLOYMENT REPORT
═══════════════════════════════════════════════════════════════════

SUMMARY:
  Total Steps: 12
  ✅ Success: 12
  ⚠️  Warnings: 0
  ❌ Errors: 0

🎉 DEPLOYMENT SUCCESSFUL!
═══════════════════════════════════════════════════════════════════

✅ REALTEA IS NOW RUNNING!

Your RealTea timeline is deployed and operational:
  • Firestore: Connected & secured
  • Functions: 3 deployed (scheduler, backfill, health)
  • AI Updater: Ready (runs daily at 1 AM)
  • Backfill: 5 events created
  • Cost: ~$10-15/month (OpenAI API)

🌐 LIVE URLS:
  Backfill: https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory
  Health: https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck

📋 NEXT STEPS:
  1. Visit Firebase Console to see your events
  2. Deploy frontend: vercel --prod
  3. Monitor logs: firebase functions:log
  4. Check costs: OpenAI Dashboard
```

---

## 🔧 Troubleshooting

### **Issue: "Cannot be loaded because running scripts is disabled"**

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run the script again.

---

### **Issue: "Firebase login failed"**

**Solution:**
```powershell
firebase login --reauth
```

Then run the script again.

---

### **Issue: "Functions deployment failed"**

**Check:**
1. OpenAI API key set:
   ```powershell
   firebase functions:config:get
   ```

2. If missing, set it:
   ```powershell
   firebase functions:config:set openai.key="sk-YOUR-KEY"
   ```

3. Run script again

---

### **Issue: "Backfill test failed"**

**Wait 2 minutes** for functions to fully initialize, then test manually:
```powershell
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"
```

---

## 📊 Deployment Report

The script generates a JSON report with full details:

```json
{
  "timestamp": "2025-10-17 14:30:00",
  "steps": [
    {
      "step": "FIREBASE_CLI",
      "status": "SUCCESS",
      "message": "Firebase CLI installed: 14.20.0",
      "timestamp": "14:30:01"
    },
    ...
  ],
  "errors": [],
  "warnings": []
}
```

**Location:** `DEPLOYMENT_REPORT_[timestamp].json`

---

## ✅ Success Indicators

### **You'll know it worked when:**

1. ✅ Script completes with "DEPLOYMENT SUCCESSFUL"
2. ✅ 3 functions listed in output
3. ✅ Backfill creates 5 events
4. ✅ No errors in summary
5. ✅ Function URLs provided

### **Verify in Firebase Console:**

1. **Functions Tab:**
   - scheduledDailyUpdate ✅
   - backfillHistory ✅
   - healthCheck ✅

2. **Firestore Tab:**
   - events collection exists
   - 5+ documents present
   - Each has: shortSummary, sources, background, etc.

3. **Logs Tab:**
   - No errors
   - Successful deployment messages

---

## 🌐 Deploy Frontend

After functions are deployed, deploy the frontend:

### **Option 1: Vercel (Recommended)**

```powershell
npm install -g vercel
vercel --prod
```

### **Option 2: Firebase Hosting**

The script will prompt you to deploy to Firebase Hosting.
Or run manually:
```powershell
firebase deploy --only hosting
```

---

## 📈 Monitoring

### **Check Function Logs:**

```powershell
firebase functions:log --limit 50
```

### **Test Endpoints:**

```powershell
# Health check
curl "https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck"

# Backfill (creates more events)
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=18&max=10"
```

### **Monitor Costs:**

- **OpenAI:** https://platform.openai.com/usage
- **Firebase:** Console → Usage tab

---

## 🎯 What Happens After Deployment

### **Automatic Daily Updates:**

- **1 AM EST:** Scheduler runs automatically
- **Fetches:** "On This Day" historical events
- **Generates:** Enriched data with AI
- **Stores:** In Firestore
- **Cost:** ~$0.30-0.50 per day

### **Manual Backfills:**

Use the backfill endpoint anytime:
```powershell
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=19&max=20"
```

---

## 📞 Need Help?

### **Documentation:**

1. **MANUAL_DEPLOYMENT_STEPS.md** - Manual process
2. **SYSTEM_HEALTH_REPORT.md** - System diagnostic
3. **DEPLOYMENT_CHECKLIST.md** - Verification steps

### **Quick Fixes:**

- Script won't run → `Set-ExecutionPolicy RemoteSigned`
- Login fails → `firebase login --reauth`
- Functions fail → Check OpenAI key
- Build fails → `Remove-Item -Recurse -Force .next && npm install`

---

## ⏱️ Time Estimate

| Phase | Time |
|-------|------|
| Prerequisites | 1 min |
| Authentication | 1 min |
| Functions Deploy | 3-5 min |
| Build & Test | 2 min |
| Verification | 1 min |
| **Total** | **8-10 min** |

---

## 🎉 Success!

When you see:

```
🎉 DEPLOYMENT SUCCESSFUL!
✅ REALTEA IS NOW RUNNING!
```

Your RealTea timeline is live with:
- ✨ AI-powered enriched events
- 📝 Auto-generated short summaries
- 📖 Modal popups with full details
- 🔗 Proper source citations
- 🤖 Daily automatic updates
- 🌐 Production-ready hosting

---

**Run the script now:** `.\deploy-realtea.ps1`

**Expected time:** 8-10 minutes  
**Difficulty:** Easy (mostly automated)  
**Result:** Fully deployed RealTea application!

---

**Made with ☕ by RealTea Team**

