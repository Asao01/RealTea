# 🚀 RealTea Quick Start - Firebase AI Functions

## 1. Set OpenAI API Key (1 minute)

```bash
cd C:\Users\User\Desktop\Works\realtea-timeline\functions
echo OPENAI_API_KEY=sk-your-actual-openai-key-here > .env
```

Get your key from: https://platform.openai.com/api-keys

## 2. Deploy Functions (2-3 minutes)

```bash
cd C:\Users\User\Desktop\Works\realtea-timeline
firebase deploy --only functions
```

Wait for deployment to complete. You'll see:
```
✔  functions: Finished running predeploy script.
✔  functions[scheduledDailyUpdate]: Successful create operation.
✔  functions[backfillHistory]: Successful create operation.
✔  functions[healthCheck]: Successful create operation.
```

## 3. Test Health Endpoint (30 seconds)

```bash
curl https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck
```

Should return:
```json
{
  "status": "healthy",
  "firestore": "connected",
  "openai": "configured"
}
```

## 4. Populate Events (2-3 minutes)

```bash
# Test with today's date
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory"

# Or specific date
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=18&max=50"
```

## 5. Verify in Firebase Console (1 minute)

1. Go to: https://console.firebase.google.com/project/reality-3af7f/firestore
2. Open `events` collection
3. Click any event
4. Confirm these fields exist:
   - background ✓
   - keyFigures ✓
   - causes ✓
   - outcomes ✓
   - impact ✓

## Done! 🎉

Your AI-powered timeline is now live and will update daily at 1 AM EST.

**View logs:**
```bash
firebase functions:log
```

**Monitor in console:**
https://console.firebase.google.com/project/reality-3af7f/functions/logs

---

## What Happened?

✅ Map page removed from navigation  
✅ Navbar enhanced with smooth animations  
✅ Firebase Functions deployed:
   - `scheduledDailyUpdate` (runs daily at 1 AM EST)
   - `backfillHistory` (manual HTTP trigger)
   - `healthCheck` (health verification)

✅ AI enrichment configured:
   - Wikipedia API + MuffinLabs API for historical events
   - OpenAI GPT-4o-mini for analysis
   - Cross-verification of facts
   - Structured data extraction

✅ Events now include:
   - Background context
   - Key figures involved
   - Causes that led to the event
   - Outcomes and results
   - Long-term historical impact

## Next Steps

Update the frontend to display enriched fields in the event detail modal. See `DEPLOYMENT_SUMMARY.md` for code examples.

## Support

- **Full Documentation:** `FIREBASE_DEPLOYMENT_GUIDE.md`
- **Deployment Summary:** `DEPLOYMENT_SUMMARY.md`
- **Functions Code:** `functions/index.js`
- **Firestore Rules:** `firestore.rules`

**Cost:** ~$6-7/month (mostly OpenAI API usage)

