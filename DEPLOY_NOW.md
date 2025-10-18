# 🚀 Deploy RealTea NOW - Simple Commands

**Run these commands in YOUR PowerShell terminal (I cannot run interactive commands)**

---

## ⚡ Quick Deploy (5 commands)

Open PowerShell and run these commands **one at a time**:

### **1. Login to Firebase**
```powershell
cd C:\Users\User\Desktop\Works\realtea-timeline
firebase login
```
*Browser will open → Sign in with Google → Grant permissions*

---

### **2. Confirm Project**
```powershell
firebase use reality-3af7f
```
*Should show: "Now using project reality-3af7f"*

---

### **3. Set OpenAI Key (if not done)**
```powershell
firebase functions:config:set openai.key="YOUR-OPENAI-API-KEY-HERE"
```
*Replace with your actual key (starts with sk-)*

---

### **4. Deploy Everything**
```powershell
firebase deploy --only "functions,firestore:rules"
```
*This deploys:*
- Firestore security rules
- 3 Cloud Functions (scheduledDailyUpdate, backfillHistory, healthCheck)
- Takes 3-5 minutes

---

### **5. Test Backfill**
```powershell
# After deployment, copy the URL from output and run:
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"
```

---

## 🌐 Deploy Frontend

### **Option A: Vercel (Recommended)**
```powershell
npm install -g vercel
npm run build
vercel --prod
```

### **Option B: Firebase Hosting**
```powershell
# First, configure Next.js for static export
# Then:
npm run build
firebase deploy --only hosting
```

---

## ✅ Verification

### **Check Functions:**
```powershell
firebase functions:list
```
Should show:
- scheduledDailyUpdate
- backfillHistory
- healthCheck

### **Check Firestore:**
1. Open: https://console.firebase.google.com
2. Go to Firestore Database
3. Check `events` collection
4. Verify events have:
   - shortSummary ✅
   - sources (array of objects) ✅
   - background, causes, outcomes, impact ✅

### **Check Logs:**
```powershell
firebase functions:log --limit 20
```

---

## 🎯 Expected Output

### **During Deployment:**
```
=== Deploying to 'reality-3af7f'...

i  deploying firestore, functions
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules file firestore.rules compiled successfully
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing codebase default for deployment
i  functions: packaged C:\Users\User\Desktop\Works\realtea-timeline\functions (96.8 KB) for uploading
✔  functions: functions folder uploaded successfully

i  functions: updating Node.js 18 function scheduledDailyUpdate(us-central1)...
i  functions: updating Node.js 18 function backfillHistory(us-central1)...
i  functions: updating Node.js 18 function healthCheck(us-central1)...
✔  functions[scheduledDailyUpdate(us-central1)]: Successful update operation.
✔  functions[backfillHistory(us-central1)]: Successful create operation.
✔  functions[healthCheck(us-central1)]: Successful create operation.

Function URL (backfillHistory(us-central1)): https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory
Function URL (healthCheck(us-central1)): https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck

✔  Deploy complete!
```

### **Backfill Response:**
```json
{
  "success": true,
  "date": "10/17",
  "stats": {
    "created": 5,
    "updated": 0,
    "skipped": 0,
    "errors": 0
  },
  "timestamp": "2025-10-17T..."
}
```

---

## 🔧 Troubleshooting

### **"Error: HTTP Error: 401, Request had invalid authentication credentials"**

**Solution:**
```powershell
firebase login --reauth
```

---

### **"Error: Functions did not deploy properly"**

**Check Node version:**
```powershell
node --version
```
Should be 18.x, 20.x, or 22.x

**Check OpenAI key:**
```powershell
firebase functions:config:get
```
Should show:
```json
{
  "openai": {
    "key": "sk-..."
  }
}
```

---

### **"Backfill returns 404"**

**Wait 2 minutes** after deployment for functions to initialize.

Then try again:
```powershell
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"
```

---

## 📊 After Deployment

### **Your RealTea will have:**

✅ **3 Cloud Functions Deployed:**
- `scheduledDailyUpdate` - Runs daily at 1 AM EST
- `backfillHistory` - HTTP endpoint for manual data generation
- `healthCheck` - System status endpoint

✅ **Firestore Database:**
- `events` collection with enriched AI-generated data
- Each event has: title, shortSummary, summary, background, keyFigures, causes, outcomes, impact, sources[]

✅ **Automatic Daily Updates:**
- Scheduler fetches "On This Day" events
- AI generates comprehensive summaries
- ~200 events per day
- Cost: ~$10-15/month

✅ **HTTP Endpoints:**
- Backfill: `https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=MM&day=DD&max=N`
- Health: `https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck`

---

## 🌐 Frontend Deployment

### **After functions are deployed, deploy frontend:**

**Vercel (Easiest):**
```powershell
npm install -g vercel
vercel login
npm run build
vercel --prod
```

**Firebase Hosting:**
```powershell
# Note: Next.js needs static export for Firebase Hosting
# Update next.config.js with: output: 'export'
npm run build
firebase deploy --only hosting
```

---

## 📈 Monitoring

### **Check Function Execution:**
```powershell
firebase functions:log --only scheduledDailyUpdate
```

### **Test Endpoints:**
```powershell
# Health check
curl "https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck"

# Create more events
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=18&max=10"
```

### **Monitor Costs:**
- **OpenAI Dashboard:** https://platform.openai.com/usage
- **Firebase Console:** https://console.firebase.google.com → Usage

---

## 🎉 Success Checklist

- [ ] `firebase login` succeeds
- [ ] `firebase deploy` completes without errors
- [ ] 3 functions show in `firebase functions:list`
- [ ] Backfill creates 5 events in Firestore
- [ ] Events have `shortSummary` and `sources` array
- [ ] Health check endpoint returns "healthy"
- [ ] Frontend deployed (Vercel or Firebase Hosting)
- [ ] Live site shows events with modal popups

---

## ⏱️ Time Estimate

| Step | Time |
|------|------|
| Login | 1 min |
| Deploy Functions | 4 min |
| Test Backfill | 1 min |
| Verify Firestore | 1 min |
| Deploy Frontend | 3 min |
| Test Live Site | 2 min |
| **Total** | **~12 min** |

---

## 💡 Quick Copy-Paste

**All commands in one block (run in PowerShell):**

```powershell
# Navigate to project
cd C:\Users\User\Desktop\Works\realtea-timeline

# Login (opens browser)
firebase login

# Confirm project
firebase use reality-3af7f

# Set OpenAI key (replace with yours)
firebase functions:config:set openai.key="sk-YOUR-KEY"

# Deploy backend
firebase deploy --only "functions,firestore:rules"

# Wait 2 minutes, then test
Start-Sleep -Seconds 120
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"

# Check deployment
firebase functions:list

# Deploy frontend (Vercel)
npm run build
vercel --prod
```

---

**Ready to deploy? Copy the commands above and run in your PowerShell!** 🚀

**Expected result:** Fully deployed RealTea with AI-powered timeline in 12 minutes!

---

**Made with ☕ by RealTea Team**

