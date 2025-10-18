# 🚀 DEPLOY REALTEA - RUN THESE COMMANDS

**Copy and paste into PowerShell - Takes 12 minutes total**

---

## ⚡ FAST TRACK - 6 Commands

```powershell
# 1. Navigate to project
cd C:\Users\User\Desktop\Works\realtea-timeline

# 2. Login (opens browser automatically)
firebase login

# 3. Confirm project (already configured)
firebase use reality-3af7f

# 4. Set OpenAI key (REPLACE WITH YOUR KEY!)
firebase functions:config:set openai.key="sk-YOUR-OPENAI-KEY-HERE"

# 5. Deploy EVERYTHING (4-5 min)
firebase deploy --only "functions,firestore:rules"

# 6. Test it works (wait 2 min after step 5)
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=17&max=5"
```

---

## ✅ EXPECTED RESULTS

### **After Step 5 (deploy):**

```
✔  functions[scheduledDailyUpdate(us-central1)]: Successful update operation.
✔  functions[backfillHistory(us-central1)]: Successful update operation.
✔  functions[healthCheck(us-central1)]: Successful update operation.

Function URL (backfillHistory): https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory
Function URL (healthCheck): https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck

✔  Deploy complete!
```

### **After Step 6 (test backfill):**

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

## 🌐 DEPLOY FRONTEND

### **Option A: Vercel (Recommended)**

```powershell
# Install Vercel CLI (first time only)
npm install -g vercel

# Login
vercel login

# Build
npm run build

# Deploy to production
vercel --prod
```

**Result:** Live URL like `https://realtea-timeline.vercel.app`

---

## 📊 VERIFY EVERYTHING WORKS

### **1. Check Functions Deployed:**

```powershell
firebase functions:list
```

**Should show:**
- scheduledDailyUpdate (runs daily 1 AM)
- backfillHistory
- healthCheck

### **2. Check Firestore Data:**

1. Visit: https://console.firebase.google.com
2. Select: reality-3af7f
3. Go to: Firestore Database → events collection
4. Open any event
5. **Verify fields:**
   - ✅ title
   - ✅ shortSummary (1-2 sentences)
   - ✅ summary (3-5 sentences)  
   - ✅ background
   - ✅ keyFigures (array)
   - ✅ causes
   - ✅ outcomes
   - ✅ impact
   - ✅ sources (array of {name, url})

### **3. Test Live Site:**

Visit your Vercel URL and check:
- ✅ Timeline shows events
- ✅ Short summaries displayed (1-2 sentences)
- ✅ Click event → Modal opens
- ✅ Modal shows full details
- ✅ Sources clickable
- ✅ Dark theme consistent

### **4. Test Function Endpoints:**

```powershell
# Health check
curl "https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck"

# Create more events
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=18&max=10"
```

---

## 🎯 SUCCESS CHECKLIST

After running all commands:

- [ ] `firebase login` succeeded (browser auth)
- [ ] Functions deployed (see ✔ Deploy complete!)
- [ ] 3 functions listed (`firebase functions:list`)
- [ ] Backfill created 5 events
- [ ] Firestore has events with enriched data
- [ ] Frontend built successfully
- [ ] Vercel deployment complete
- [ ] Live site loads correctly
- [ ] Modal opens with full details
- [ ] Sources are clickable

---

## 💰 COST ESTIMATE

**Monthly:**
- Firebase Functions: $0 (free tier)
- Firestore: $0 (free tier)
- OpenAI API: $10-15 (200 events/day)
- Vercel: $0 (hobby tier)

**Total: $10-15/month**

---

## 📞 TROUBLESHOOTING

**Login fails:**
```powershell
firebase login --reauth
```

**Deploy fails:**
```powershell
# Check you're in the right directory
cd C:\Users\User\Desktop\Works\realtea-timeline

# Check project
firebase use

# Try again
firebase deploy --only "functions,firestore:rules"
```

**Backfill 404:**
- Wait 2 minutes after deployment
- Functions need time to initialize
- Then try curl command again

**Build fails:**
```powershell
Remove-Item -Recurse -Force .next
npm install
npm run build
```

---

## 🎉 WHEN COMPLETE

You'll have:

✅ **3 Cloud Functions live**
✅ **Daily scheduler running** (1 AM updates)
✅ **AI-generated events** in Firestore
✅ **Frontend deployed** and accessible
✅ **Modal popups** with full details
✅ **Source citations** working

---

**PROJECT:** reality-3af7f  
**REGION:** us-central1  
**TIME:** ~12 minutes  

**READY?** Copy commands above and run in PowerShell! 🚀

