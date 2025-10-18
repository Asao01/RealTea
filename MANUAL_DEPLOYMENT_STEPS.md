# 🚀 Manual Deployment Steps for RealTea

**Note:** Firebase requires interactive browser authentication. Follow these steps in your own terminal.

---

## ✅ **Pre-Deployment Checklist**

Before you begin:
- [x] Firebase CLI installed (v14.20.0 ✅)
- [x] Functions dependencies installed ✅
- [x] All code committed and ready
- [ ] Logged into Firebase
- [ ] Firebase project selected

---

## 📋 **Step-by-Step Deployment**

### **Step 1: Login to Firebase** (1 min)

Open PowerShell or Command Prompt and run:

```powershell
cd C:\Users\User\Desktop\Works\realtea-timeline
firebase login
```

This will:
1. Open your browser
2. Ask you to sign in with Google
3. Grant permissions to Firebase CLI
4. Return to terminal when complete

**Expected output:**
```
✔  Success! Logged in as your-email@gmail.com
```

---

### **Step 2: Select Firebase Project** (30 sec)

```powershell
firebase use --add
```

This will:
1. Show list of your Firebase projects
2. Ask you to select one (use arrow keys)
3. Ask for an alias (just press Enter for "default")

**Alternative:** If you know your project ID:
```powershell
firebase use YOUR-PROJECT-ID
```

**Verify:**
```powershell
firebase projects:list
```

---

### **Step 3: Set OpenAI API Key in Functions** (30 sec)

```powershell
firebase functions:config:set openai.key="YOUR-OPENAI-API-KEY-HERE"
```

Replace `YOUR-OPENAI-API-KEY-HERE` with your actual OpenAI API key (starts with `sk-`).

**Verify:**
```powershell
firebase functions:config:get
```

Expected output:
```json
{
  "openai": {
    "key": "sk-..."
  }
}
```

---

### **Step 4: Deploy Firestore Rules** (1 min)

```powershell
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  firestore: released rules firestore.rules to cloud.firestore
✔  Deploy complete!
```

---

### **Step 5: Deploy Cloud Functions** (3-5 min)

```powershell
firebase deploy --only functions
```

This will deploy 3 functions:
1. `scheduledDailyUpdate` - Runs daily at 1 AM
2. `backfillHistory` - HTTP endpoint for manual backfill
3. `healthCheck` - System status endpoint

**Expected output:**
```
✔  functions[scheduledDailyUpdate(us-central1)]: Successful update operation.
✔  functions[backfillHistory(us-central1)]: Successful create operation.
✔  functions[healthCheck(us-central1)]: Successful create operation.

✔  Deploy complete!

Function URL (backfillHistory): https://us-central1-YOUR-PROJECT.cloudfunctions.net/backfillHistory
Function URL (healthCheck): https://us-central1-YOUR-PROJECT.cloudfunctions.net/healthCheck
```

**Save these URLs!** You'll need them for testing.

---

### **Step 6: Test AI Updater (Backfill)** (2 min)

Replace `YOUR-PROJECT-ID` with your actual Firebase project ID:

```powershell
curl "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"
```

**Alternative (if curl doesn't work):**

Open in browser:
```
https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/backfillHistory?month=10&day=17&max=5
```

**Expected response:**
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

### **Step 7: Verify Firestore Data** (1 min)

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Navigate to `events` collection
5. Open any recent event
6. **Verify these fields exist:**
   - ✅ `shortSummary` (1-2 sentences)
   - ✅ `summary` (3-5 sentences)
   - ✅ `background`
   - ✅ `keyFigures` (array)
   - ✅ `causes`
   - ✅ `outcomes`
   - ✅ `impact`
   - ✅ `sources` (array of objects)

**Example source structure:**
```json
"sources": [
  {
    "name": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/..."
  },
  {
    "name": "History API",
    "url": "https://history.muffinlabs.com"
  }
]
```

---

### **Step 8: Build Frontend for Production** (3 min)

```powershell
npm run build
```

This creates an optimized production build.

**Expected output:**
```
> realtea-timeline@0.1.0 build
> next build

✓ Creating an optimized production build
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB          95 kB
├ ○ /timeline                           12.3 kB         102 kB
└ ○ /event/[id]                          8.1 kB          98 kB

✓ Build successful!
```

---

### **Step 9: Deploy to Vercel** (2 min)

```powershell
# Install Vercel CLI if you haven't already
npm install -g vercel

# Deploy to production
vercel --prod
```

**Follow the prompts:**
1. Set up and deploy: **Yes**
2. Which scope: Select your account
3. Link to existing project: **No** (first time) or **Yes** (if exists)
4. Project name: `realtea-timeline` (or your choice)
5. Directory: `.` (current directory)
6. Override settings: **No**

**Expected output:**
```
🔍  Inspect: https://vercel.com/your-username/realtea-timeline/...
✅  Production: https://realtea-timeline.vercel.app
```

**Save your production URL!**

---

### **Step 10: Test Live Site** (3 min)

Visit your production URL: `https://realtea-timeline.vercel.app`

**Timeline Page Tests:**
1. ✅ Navigate to `/timeline`
2. ✅ Events display with short summaries (1-2 sentences)
3. ✅ Cards scale slightly on hover
4. ✅ Source count badge visible ("3 sources")

**Modal Tests:**
5. ✅ Click any event card
6. ✅ Modal opens with smooth fade-in
7. ✅ Full summary displayed (longer than digest)
8. ✅ Background section visible
9. ✅ Key Figures as bullet list
10. ✅ Causes section
11. ✅ Outcomes section
12. ✅ Impact section
13. ✅ Sources with clickable links
14. ✅ Source names displayed ("Wikipedia", "NASA History", etc.)
15. ✅ Links open in new tab

**Mobile Tests (Optional):**
16. ✅ Open on mobile device or resize browser
17. ✅ Modal goes full-screen
18. ✅ All text readable
19. ✅ Buttons easily clickable

---

## ✅ **Deployment Complete Checklist**

- [ ] Firebase login successful
- [ ] Firebase project selected
- [ ] OpenAI API key configured in functions
- [ ] Firestore rules deployed
- [ ] Cloud Functions deployed (3 functions)
- [ ] Backfill test successful (5 events created)
- [ ] Firestore events have enriched fields
- [ ] Frontend built successfully
- [ ] Vercel deployment successful
- [ ] Live site shows short summaries
- [ ] Modal opens with full details
- [ ] Sources are clickable

---

## 🔧 **Troubleshooting**

### **Issue: `firebase login` doesn't open browser**

**Solution:**
```powershell
firebase login --reauth
```

Or use CI token:
```powershell
firebase login:ci
# Follow instructions to get token
# Then use: firebase deploy --token YOUR-TOKEN
```

---

### **Issue: Functions deployment fails**

**Check Node version:**
```powershell
node --version
```

Should be 18.x or 20.x. If 22.x (like yours), you may see warnings but it should still work.

**Check functions code:**
```powershell
cd functions
npm install
npm run build  # If you have a build script
```

---

### **Issue: Backfill returns 404**

**Wait:** Functions need 1-2 minutes after deployment to be fully available.

**Check URL:**
```powershell
firebase functions:list
```

Copy the exact URL from the output.

---

### **Issue: Firestore permission denied**

**Redeploy rules:**
```powershell
firebase deploy --only firestore:rules
```

**Check rules in Firebase Console:**
- Firestore Database → Rules
- Verify `allow read: if true;`

---

### **Issue: Frontend build fails**

**Clear cache and rebuild:**
```powershell
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

---

### **Issue: Vercel deployment fails**

**Check build output:**
Make sure `npm run build` succeeds first.

**Alternative: Deploy via Vercel Dashboard:**
1. Go to [vercel.com](https://vercel.com)
2. Import Git repository
3. Or drag & drop the `.next` folder

---

## 📊 **Post-Deployment Monitoring**

### **Check Function Logs:**

```powershell
firebase functions:log --limit 50
```

### **Check Scheduler:**

Wait until 1 AM tomorrow, then check logs:
```powershell
firebase functions:log --only scheduledDailyUpdate
```

### **Monitor OpenAI Costs:**

Visit: https://platform.openai.com/usage

Expected: ~$0.30-0.50 per day (200 events)

### **Monitor Firestore Usage:**

Firebase Console → Firestore → Usage tab

---

## 🎉 **Success Indicators**

You know deployment was successful when:

1. ✅ All 3 Cloud Functions deployed without errors
2. ✅ Backfill created 5 events in Firestore
3. ✅ Events have `shortSummary` field
4. ✅ Sources are objects with `name` and `url`
5. ✅ Frontend builds without errors
6. ✅ Vercel deployment succeeded
7. ✅ Live site shows digest summaries
8. ✅ Modal opens with full details
9. ✅ No console errors in browser
10. ✅ Links work correctly

---

## 📞 **Need Help?**

**Documentation:**
- SYSTEM_HEALTH_REPORT.md - Complete diagnostic
- QUICK_DEPLOYMENT_GUIDE.md - Fast track guide
- ENRICHED_EVENTS_GUIDE.md - Feature overview

**Common Issues:**
1. Login problems → Use `firebase login --reauth`
2. Functions not deploying → Check `functions/package.json`
3. Frontend build fails → Clear cache with `Remove-Item -Recurse -Force .next`
4. Vercel fails → Make sure build succeeds first

---

## ⏱️ **Time Estimate**

| Step | Time |
|------|------|
| Login & Setup | 2 min |
| Firestore Rules | 1 min |
| Deploy Functions | 4 min |
| Test Backfill | 2 min |
| Verify Data | 2 min |
| Build Frontend | 3 min |
| Deploy Vercel | 3 min |
| Test Live Site | 3 min |
| **Total** | **~20 min** |

---

## 🚀 **Quick Commands Summary**

```powershell
# 1. Login
firebase login

# 2. Select project
firebase use --add

# 3. Set API key
firebase functions:config:set openai.key="sk-YOUR-KEY"

# 4. Deploy everything
firebase deploy --only firestore:rules,functions

# 5. Test backfill
curl "https://us-central1-YOUR-PROJECT.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"

# 6. Build & deploy frontend
npm run build
vercel --prod
```

---

**Deployment Guide Complete!** ✅

Follow these steps in your own terminal window (Firebase requires interactive browser auth).

**Estimated time:** 20 minutes  
**Difficulty:** Easy (just follow steps)  
**Result:** Fully functional RealTea with AI-powered enriched events!

---

**Made with ☕ by RealTea Team**

