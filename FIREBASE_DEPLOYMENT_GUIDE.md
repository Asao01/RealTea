# 🚀 Firebase Cloud Functions Deployment Guide

## Prerequisites

1. ✅ Firebase CLI installed
2. ✅ OpenAI API key (get from https://platform.openai.com/api-keys)
3. ✅ Firebase project initialized (`reality-3af7f`)

## Step-by-Step Deployment

### 1. Configure OpenAI API Key

The functions need an OpenAI API key to generate enriched event data.

**Option A: Using .env file (Recommended)**
```bash
cd realtea-timeline/functions
cp .env.example .env
# Edit .env and add your OpenAI API key
```

**Option B: Using Firebase Secrets (Production)**
```bash
cd realtea-timeline
firebase functions:secrets:set OPENAI_API_KEY
# Paste your OpenAI API key when prompted
```

### 2. Deploy Functions

```bash
cd realtea-timeline
firebase deploy --only functions
```

This deploys:
- `scheduledDailyUpdate` - Runs daily at 1 AM EST
- `backfillHistory` - HTTP trigger for manual backfilling
- `healthCheck` - HTTP endpoint to verify deployment

### 3. Enable Cloud Scheduler

Cloud Scheduler is automatically enabled when you deploy a scheduled function.

**Verify it's working:**
```bash
firebase functions:log
```

**Or check in Firebase Console:**
https://console.firebase.google.com/project/reality-3af7f/functions/logs

### 4. Run Backfill to Populate Events

Trigger the backfill function to add enriched fields to existing events:

```bash
# Get your function URL
firebase functions:config:get

# Trigger backfill for today's date (as a test)
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory"

# Or specify a specific date
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=18&max=50"
```

**Parameters:**
- `month` (optional): Month to backfill (1-12), defaults to current month
- `day` (optional): Day to backfill (1-31), defaults to current day
- `max` (optional): Max events to process, defaults to 200

### 5. Verify Enriched Fields

Check that events now have the enriched AI fields:

**Via Firebase Console:**
1. Go to: https://console.firebase.google.com/project/reality-3af7f/firestore
2. Open the `events` collection
3. Click on any event document
4. Verify these fields exist:
   - `background` (string)
   - `keyFigures` (array)
   - `causes` (string)
   - `outcomes` (string)
   - `impact` (string)
   - `summary` (string)
   - `shortSummary` (string)

**Via Node.js Script:**
```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function checkEnrichedFields() {
  const snapshot = await db.collection('events')
    .where('aiGenerated', '==', true)
    .limit(5)
    .get();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Event: ${data.title}`);
    console.log(`  ✓ Background: ${data.background ? 'YES' : 'NO'}`);
    console.log(`  ✓ Key Figures: ${data.keyFigures?.length || 0}`);
    console.log(`  ✓ Causes: ${data.causes ? 'YES' : 'NO'}`);
    console.log(`  ✓ Outcomes: ${data.outcomes ? 'YES' : 'NO'}`);
    console.log(`  ✓ Impact: ${data.impact ? 'YES' : 'NO'}`);
  });
}

checkEnrichedFields();
```

## Function Details

### `scheduledDailyUpdate`

**Purpose:** Automatically populates "On This Day" historical events

**Schedule:** Daily at 1:00 AM EST  
**Trigger:** Cloud Scheduler (Pub/Sub)  
**Sources:** 
- Wikipedia "On This Day" API
- MuffinLabs History API

**What it does:**
1. Fetches events for current date from both APIs
2. Deduplicates events by year + title
3. Enriches each event with AI analysis:
   - Background context
   - Key figures/entities involved
   - Causes (what led to it)
   - Outcomes (immediate results)
   - Impact (long-term significance)
4. Saves to Firestore with full metadata

**AI Model:** GPT-4o-mini (fast, cost-effective)

### `backfillHistory`

**Purpose:** Manual trigger to populate past dates

**Trigger:** HTTPS (callable from browser/curl)  
**URL:** `https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory`

**Example Usage:**
```bash
# Backfill October 18
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=10&day=18"

# Backfill with limit
curl "https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory?month=7&day=4&max=100"
```

**Response:**
```json
{
  "success": true,
  "date": "10/18",
  "stats": {
    "created": 45,
    "updated": 3,
    "skipped": 12,
    "errors": 0
  },
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

### `healthCheck`

**Purpose:** Verify deployment and connectivity

**URL:** `https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck`

**Response:**
```json
{
  "status": "healthy",
  "firestore": "connected",
  "openai": "configured",
  "autoEvents": "found",
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

## Enriched Event Fields

Each event processed by the AI functions will have:

### Core Fields
- `title`: Event name
- `date`: ISO date string (YYYY-MM-DD)
- `year`: Year as string
- `summary`: 3-5 sentence overview
- `shortSummary`: 1-2 sentence digest

### Enriched AI Fields
- `background`: Context leading up to the event (1-2 sentences)
- `keyFigures`: Array of important people/organizations (max 5)
- `causes`: What led to this event (1-2 sentences)
- `outcomes`: Immediate results (1-2 sentences)
- `impact`: Lasting significance (1-2 sentences)

### Metadata
- `region`: Geographic region (North America, Europe, Asia, etc.)
- `category`: Event type (War, Politics, Science, Technology, etc.)
- `credibilityScore`: 0-100 score (Wikipedia + AI = high credibility)
- `sources`: Array of source objects with name and URL
- `verified`: true
- `verifiedByAI`: true
- `aiGenerated`: true
- `addedBy`: "auto"

### Example Event Document
```json
{
  "id": "moon-landing-1969-07-20",
  "title": "Apollo 11 Moon Landing",
  "date": "1969-07-20",
  "year": "1969",
  "summary": "Apollo 11 successfully landed the first humans on the Moon...",
  "shortSummary": "Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon.",
  "background": "The Apollo program was initiated by President Kennedy in 1961...",
  "keyFigures": [
    "Neil Armstrong",
    "Buzz Aldrin",
    "Michael Collins",
    "NASA",
    "President John F. Kennedy"
  ],
  "causes": "The Space Race between the United States and Soviet Union...",
  "outcomes": "Successful lunar landing and safe return to Earth...",
  "impact": "Demonstrated American technological supremacy and inspired...",
  "region": "North America",
  "category": "Space",
  "credibilityScore": 100,
  "verified": true,
  "verifiedByAI": true,
  "sources": [
    { "name": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Apollo_11" },
    { "name": "MuffinLabs History API", "url": "https://history.muffinlabs.com" }
  ]
}
```

## Cost Estimation

**OpenAI API Costs:**
- Model: GPT-4o-mini
- Cost per event: ~$0.002 (2 API calls per event)
- Daily run (~100 events): ~$0.20/day
- Monthly cost: ~$6/month

**Firebase Costs:**
- Cloud Functions: Free tier covers most usage
- Firestore: Writes included in free tier
- Cloud Scheduler: $0.10/job/month = $0.10/month

**Total: ~$6-7/month**

## Monitoring

### View Logs
```bash
firebase functions:log
```

### Check Function Status
```bash
firebase functions:list
```

### Monitor in Console
https://console.firebase.google.com/project/reality-3af7f/functions/logs

## Troubleshooting

### Issue: OpenAI API Key Not Working

**Solution:**
```bash
cd realtea-timeline/functions
cat .env  # Verify key is present
# Or
firebase functions:secrets:access OPENAI_API_KEY
```

### Issue: Scheduled Function Not Running

**Check Cloud Scheduler:**
```bash
gcloud scheduler jobs list --project=reality-3af7f
```

**Force a run:**
```bash
gcloud scheduler jobs run firebase-schedule-scheduledDailyUpdate-us-central1 --project=reality-3af7f
```

### Issue: Low Credibility Scores

Events with credibility < 60 are skipped. Check:
1. Source data quality
2. AI response format
3. Adjust `CONFIG.MIN_CREDIBILITY` in functions/index.js

## Next Steps

After deployment:

1. ✅ Run backfillHistory for multiple dates to populate timeline
2. ✅ Monitor logs for first few days
3. ✅ Update frontend to display enriched fields (see FRONTEND_UPDATE.md)
4. ✅ Set up alerts for function failures
5. ✅ Consider increasing MAX_EVENTS_PER_RUN if needed

## Support

For issues:
- Check Firebase Console logs
- Review function code in `functions/index.js`
- Test locally with Firebase Emulator Suite

```bash
cd realtea-timeline
firebase emulators:start --only functions
```

---

**Last Updated:** October 18, 2025  
**Status:** Ready for deployment  
**Functions Version:** 1.0.0

