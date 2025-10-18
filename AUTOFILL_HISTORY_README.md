# 🏛️ RealTea Historical Auto-Fill Script

## Overview

This script **automatically populates your Firestore database** with verified historical events from **1600-2025** using public APIs and AI-powered summarization.

---

## ✨ Features

- ✅ **Dual Data Sources:** MuffinLabs History API + Wikipedia REST API
- ✅ **AI-Powered Summaries:** 2-3 sentence factual summaries via OpenAI
- ✅ **Smart Categorization:** Auto-assigns categories (Politics, Science, War, etc.)
- ✅ **Regional Tagging:** Extracts geographical regions from summaries
- ✅ **Batch Processing:** Optimized Firestore writes (500 per batch)
- ✅ **Duplicate Detection:** Skips existing events automatically
- ✅ **Progress Tracking:** Real-time console logs and statistics
- ✅ **Three Modes:** Quick test, specific dates, or full calendar

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd realtea-timeline
npm install node-fetch openai firebase
```

### 2. Set Up Environment Variables

Create `.env.local` in the project root:

```env
# ═══════════════════════════════════════════════════════════
# FIREBASE CREDENTIALS (Required)
# Get from: https://console.firebase.google.com/project/[your-project]/settings/general
# ═══════════════════════════════════════════════════════════

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# ═══════════════════════════════════════════════════════════
# OPENAI API KEY (Required for AI summaries)
# Get from: https://platform.openai.com/api-keys
# ═══════════════════════════════════════════════════════════

OPENAI_API_KEY=sk-proj-...
```

### 3. Run the Script

```bash
# Quick test mode (20 events)
node autofillHistory.js --quick

# Process specific date
node autofillHistory.js --month 7 --day 20

# Process all calendar dates (takes ~2-4 hours)
node autofillHistory.js
```

---

## 📖 Usage Examples

### Quick Test (Recommended First Run)

```bash
node autofillHistory.js --quick
```

**What it does:**
- Samples 20 events from 5 significant dates
- Uses AI to summarize each event
- Saves to Firestore
- **Duration:** 2-3 minutes
- **Cost:** ~$0.02 in OpenAI credits
- **Perfect for:** Testing the system before full run

**Expected Output:**
```
🚀 QUICK MODE: Sampling 20 diverse historical events

📅 Processing 7/20...
  📚 Found: MuffinLabs (15) + Wikipedia (12) = 27 events
  🔍 Unique events to process: 20
    📝 [1/20] Processing: Apollo 11 Moon Landing...
      ✅ Summary: On July 20, 1969, American astronauts Neil Armstrong...
      📍 Region: North America | Category: Space
    ✅ Batch committed: 20 events

✅ POPULATION COMPLETE
   Saved to Firestore: 20
```

### Specific Date (e.g., Moon Landing Day)

```bash
node autofillHistory.js --month 7 --day 20
```

**What it does:**
- Fetches all July 20th events across ALL years
- Typically 30-50 events
- **Duration:** 3-5 minutes
- **Cost:** ~$0.05

### Full Calendar Population

```bash
node autofillHistory.js
```

**What it does:**
- Processes ALL calendar dates (12 months × 31 days = 372 dates)
- Fetches events for each date across history
- **Duration:** 2-4 hours with AI
- **Events:** ~4,000-8,000 events
- **Cost:** ~$5-10 in OpenAI credits

**⚠️ Warning:** This is a long-running process. Consider:
- Running overnight
- Using `screen` or `tmux` to prevent interruption
- Or using the daily cron instead

---

## 🔧 How It Works

### Step-by-Step Process

```
For each calendar date (1/1, 1/2, ... 12/31):
  
  1. Fetch events from MuffinLabs API
     GET https://history.muffinlabs.com/date/{month}/{day}
     → Returns events across ALL years for that date
  
  2. Fetch events from Wikipedia API
     GET https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{month}/{day}
     → Returns historical events for that date
  
  3. For each unique event:
     a. Fetch detailed Wikipedia summary
        GET https://en.wikipedia.org/api/rest_v1/page/summary/{title}
        → Get full extract, image, URL
     
     b. Send to OpenAI for factual 2-3 sentence summary
        → GPT-4-mini creates neutral summary
        → Includes region and significance
     
     c. Auto-categorize event
        → Analyzes keywords to assign category
        → 11 categories: Politics, Science, War, etc.
     
     d. Extract geographical region
        → Parses summary for location mentions
        → 8 regions: North America, Europe, Asia, etc.
  
  4. Batch write to Firestore (500 events per batch)
     → Efficient bulk writes
     → Skip duplicates automatically
  
  5. Log progress and statistics
```

---

## ⚙️ Configuration

### Adjust Performance Settings

Edit these constants in `autofillHistory.js`:

```javascript
const CONFIG = {
  BATCH_SIZE: 500,           // Firestore batch limit (don't change)
  AI_DELAY_MS: 1000,         // Wait 1s between AI calls (increase if rate limited)
  DATE_DELAY_MS: 500,        // Wait 0.5s between dates
  MAX_EVENTS_PER_DATE: 20,   // Limit events per date (increase for more data)
  OPENAI_MODEL: 'gpt-4o-mini', // Change to 'gpt-3.5-turbo' for cheaper
  OPENAI_MAX_TOKENS: 150,    // Max tokens for summary
};
```

### Change AI Model

**For cheaper operation:**
```javascript
OPENAI_MODEL: 'gpt-3.5-turbo'  // ~60% cheaper than GPT-4-mini
```

**For better quality:**
```javascript
OPENAI_MODEL: 'gpt-4o'  // Higher quality, ~10x more expensive
```

### Run Without AI (Free & Fast)

The script detects if `OPENAI_API_KEY` is missing and automatically runs without AI:

```bash
# Temporarily remove key
unset OPENAI_API_KEY

# Run script
node autofillHistory.js --quick

# Events will be saved with original descriptions (no AI enhancement)
```

---

## 📊 Performance & Costs

### Execution Speed

| Mode | Events | Duration | OpenAI Cost |
|------|--------|----------|-------------|
| **Quick** | 20 | 2-3 min | ~$0.02 |
| **Single Date** | 30-50 | 3-5 min | ~$0.05 |
| **Full Calendar** | 4,000-8,000 | 2-4 hours | ~$5-10 |

### Firestore Costs

- **Free Tier:** 20,000 writes/day
- **8,000 events** = 8,000 writes = **FREE** (within tier)
- **Beyond free tier:** $0.18 per 100,000 writes

### Optimization Tips

**For large datasets:**
1. Run in batches over multiple days
2. Use `--no-ai` flag first, then enrich later
3. Increase `MAX_EVENTS_PER_DATE` from 20 to 50
4. Run during off-peak hours for faster API responses

---

## 🗓️ Scheduling Options

### Option 1: Vercel Cron (Automated)

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/populateDaily",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**To enable:**
```bash
npx vercel --prod
```

**What it does:**
- Runs daily at 1:00 AM
- Populates events for current calendar date
- ~30-50 events per day
- Full population in ~1 year

### Option 2: System Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 1 AM)
0 1 * * * cd /path/to/realtea-timeline && node autofillHistory.js --month $(date +\%m) --day $(date +\%d) >> /var/log/realtea-autofill.log 2>&1
```

### Option 3: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 1:00 AM
4. Action: Start a program
   - Program: `node`
   - Arguments: `C:\path\to\realtea-timeline\autofillHistory.js --quick`
   - Start in: `C:\path\to\realtea-timeline`

### Option 4: Manual Batches

```bash
# Run different months manually
node autofillHistory.js --month 1 --day 1
node autofillHistory.js --month 2 --day 14
node autofillHistory.js --month 7 --day 4
# etc.
```

---

## 🧪 Testing

### Test 1: Verify Environment Setup

```bash
# Check if .env.local exists
cat .env.local | grep FIREBASE_API_KEY
cat .env.local | grep OPENAI_API_KEY

# Should output your API keys (partially masked)
```

### Test 2: Quick Run

```bash
node autofillHistory.js --quick
```

**Expected output:**
```
✅ Firebase initialized
✅ OpenAI initialized

🚀 QUICK MODE: Sampling 20 diverse historical events

📅 Processing 7/20...
  📚 Found: MuffinLabs (15) + Wikipedia (12) = 27 events
  🔍 Unique events to process: 20
    📝 [1/20] Processing: Apollo 11 Moon Landing...
      ✅ Summary: On July 20, 1969, American astronauts...
      📍 Region: North America | Category: Space
    ✅ Batch committed: 20 events

✅ POPULATION COMPLETE
   Saved to Firestore: 20
```

### Test 3: Verify in Firestore

1. Go to Firebase Console: https://console.firebase.google.com
2. Navigate to Firestore Database
3. Look for `events` collection
4. Should see new documents with `addedBy: "auto"`

---

## 📝 Environment Variables Setup

### Getting Firebase Credentials

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/[your-project]/settings/general

2. **Scroll to "Your apps" section**
   - Click on the Web app icon (</>)
   - Copy the `firebaseConfig` object

3. **Add to `.env.local`:**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

### Getting OpenAI API Key

1. **Go to OpenAI Platform:**
   - https://platform.openai.com/api-keys

2. **Create new secret key:**
   - Click "+ Create new secret key"
   - Copy the key (starts with `sk-proj-...`)

3. **Add to `.env.local`:**
   ```env
   OPENAI_API_KEY=sk-proj-...
   ```

### Quick Setup with Vercel

If you already deployed to Vercel:

```bash
# Pull all environment variables
npx vercel env pull .env.local

# This automatically creates .env.local with all keys
```

---

## 🐛 Troubleshooting

### Error: "Firebase initialization failed"

**Cause:** Missing or invalid Firebase credentials

**Solution:**
```bash
# Check .env.local exists
ls -la .env.local

# Verify it has Firebase credentials
cat .env.local | grep FIREBASE

# If missing, copy from Vercel
npx vercel env pull .env.local
```

### Error: "OPENAI_API_KEY not found"

**Cause:** OpenAI key not set

**Solution:**
```bash
# Add to .env.local
echo 'OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE' >> .env.local

# Or run without AI
# Script will automatically use fallback descriptions
```

### Error: "Rate limit exceeded" (OpenAI)

**Cause:** Too many API calls too quickly

**Solution:**
```javascript
// Increase delay in autofillHistory.js
AI_DELAY_MS: 2000,  // Change from 1000 to 2000 (2 seconds)
```

### Error: "Batch commit failed"

**Cause:** Firestore batch size exceeded or network issue

**Solution:**
```javascript
// Reduce batch size
BATCH_SIZE: 250,  // Change from 500 to 250
```

### No Events Being Saved

**Check:**
1. Firestore rules allow writes
2. Firebase credentials are correct
3. Internet connection is stable
4. Check console logs for specific errors

---

## 📈 Expected Results

### After Quick Mode (`--quick`)
- ✅ **20 events** added
- ✅ **5 different dates** sampled
- ✅ **Diverse categories** represented
- ✅ **All AI-summarized**
- ⏱️ **2-3 minutes**

### After Single Date
- ✅ **30-50 events** for that specific calendar date
- ✅ **All years** represented (1600-2025)
- ✅ **Regional variety**
- ⏱️ **3-5 minutes**

### After Full Run
- ✅ **4,000-8,000 events** total
- ✅ **365 calendar dates** covered
- ✅ **All categories** represented
- ✅ **Global coverage**
- ⏱️ **2-4 hours**

---

## 🎯 Recommended Usage Strategy

### Day 1: Test the System
```bash
# Quick test to verify everything works
node autofillHistory.js --quick

# Check Firestore to see the 20 events
# Visit: https://console.firebase.google.com/project/[your-project]/firestore
```

### Day 2: Populate Significant Dates
```bash
# Major historical dates
node autofillHistory.js --month 7 --day 20   # Moon landing
node autofillHistory.js --month 12 --day 7   # Pearl Harbor
node autofillHistory.js --month 11 --day 9   # Berlin Wall
node autofillHistory.js --month 9 --day 11   # 9/11
```

### Day 3: Full Population
```bash
# Run the full script (takes 2-4 hours)
node autofillHistory.js

# Or run in background
nohup node autofillHistory.js > autofill.log 2>&1 &

# Monitor progress
tail -f autofill.log
```

### Ongoing: Automated Daily Updates
```bash
# Deploy Vercel cron for automatic daily additions
npx vercel --prod

# Cron will run /api/populateDaily every day at 1 AM
```

---

## 📊 Data Quality

### All Historical Events Include:

✅ **Verified Sources**
- MuffinLabs History API
- Wikipedia REST API
- credibilityScore: 100% (historical facts)

✅ **AI-Enhanced Summaries**
- 2-3 factual sentences
- Includes geographical region
- Explains significance
- Neutral tone

✅ **Rich Metadata**
- Category (11 options)
- Region (8 global regions)
- Date (YYYY-MM-DD format)
- Multiple source links
- Images (when available)

✅ **Quality Flags**
- `verified: true`
- `verifiedByAI: true`
- `historical: true`
- `credibilityScore: 100`

---

## 🔄 Resuming After Interruption

The script is **idempotent** - safe to run multiple times:

```javascript
// Automatic duplicate detection
const exists = await eventExists(event.title, eventDate);
if (exists) {
  stats.skipped++;
  continue;  // Skip without error
}
```

**This means:**
- ✅ Can stop at any time (Ctrl+C)
- ✅ Resume from where you left off
- ✅ Won't create duplicates
- ✅ Progress is saved in Firestore

**To resume:**
```bash
# Just run again
node autofillHistory.js

# It will skip already-processed dates
```

---

## 📧 Scheduling for Daily Execution

### Option A: Deploy Vercel Cron (Easiest)

**Already configured!** Just deploy:

```bash
npx vercel --prod
```

The `vercel.json` file includes:
```json
{
  "path": "/api/populateDaily",
  "schedule": "0 1 * * *"  // Daily at 1 AM
}
```

### Option B: GitHub Actions

Create `.github/workflows/autofill.yml`:

```yaml
name: RealTea Historical Auto-Fill

on:
  schedule:
    - cron: '0 1 * * *'  # Daily at 1 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  autofill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - name: Run auto-fill
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          TODAY_MONTH=$(date +%m)
          TODAY_DAY=$(date +%d)
          node autofillHistory.js --month $TODAY_MONTH --day $TODAY_DAY
```

### Option C: Heroku Scheduler

1. Deploy to Heroku
2. Add Heroku Scheduler add-on
3. Configure job:
   ```
   node autofillHistory.js --month $(date +%m) --day $(date +%d)
   ```
4. Set to run daily

---

## 🎓 Understanding the Output

### Console Log Format

```
📅 Processing 7/20...
  📚 Found: MuffinLabs (15) + Wikipedia (12) = 27 events
  🔍 Unique events to process: 20
    📝 [1/20] Processing: First Moon Landing...
      ✅ Summary: On July 20, 1969, American astronauts Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon in the Sea of Tranquility. This achievement marked a pivotal moment in the Space Race and demonstrated humanity's capability for space exploration.
      📍 Region: North America | Category: Space
    📦 Saving 20 events in 1 batch(es)...
    ✅ Batch committed: 20 events

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PROGRESS UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Processed: 20
   ✅ Saved: 20
   ⏭️  Skipped: 0
   ❌ Errors: 0
   ⏱️  Duration: 2.5 minutes
   📈 Rate: 8.0 events/minute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Progress Indicators

| Symbol | Meaning |
|--------|---------|
| 📅 | Processing date |
| 📚 | Events fetched from APIs |
| 🔍 | Unique events after deduplication |
| 📝 | Processing individual event |
| ✅ | Successfully completed |
| ⏭️  | Skipped (duplicate) |
| ❌ | Error occurred |
| 📦 | Batch operation |
| 📊 | Statistics summary |

---

## 🔒 Security Best Practices

### Protect API Keys

```bash
# .env.local should NEVER be committed to Git
echo ".env.local" >> .gitignore

# Verify it's ignored
git status  # Should not show .env.local
```

### Firestore Security Rules

Ensure your `firestore.rules` allows server writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      // Allow public read
      allow read: if true;
      
      // Allow writes from authenticated users or auto-updates
      allow write: if request.auth != null || 
                      request.resource.data.addedBy == "auto";
    }
  }
}
```

---

## 📚 API Documentation

### MuffinLabs History API

**Endpoint:** `https://history.muffinlabs.com/date/{month}/{day}`

**Example:**
```bash
curl https://history.muffinlabs.com/date/7/20
```

**Response:**
```json
{
  "data": {
    "Events": [
      {
        "year": "1969",
        "text": "Apollo 11 Moon Landing",
        "html": "Apollo 11 <a href='...'>Moon Landing</a>",
        "links": [...]
      }
    ]
  }
}
```

### Wikipedia REST API

**Endpoint 1:** `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{month}/{day}`

**Example:**
```bash
curl https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/7/20
```

**Endpoint 2:** `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`

**Example:**
```bash
curl https://en.wikipedia.org/api/rest_v1/page/summary/Apollo_11
```

**Response:**
```json
{
  "title": "Apollo 11",
  "extract": "Apollo 11 was the spaceflight that first landed humans on the Moon...",
  "thumbnail": {
    "source": "https://upload.wikimedia.org/..."
  },
  "content_urls": {
    "desktop": {
      "page": "https://en.wikipedia.org/wiki/Apollo_11"
    }
  }
}
```

---

## 🎯 Success Checklist

After running the script:

- [ ] No errors in console output
- [ ] "✅ POPULATION COMPLETE" message displayed
- [ ] Stats show events saved (> 0)
- [ ] Events visible in Firestore console
- [ ] Events have `addedBy: "auto"` field
- [ ] Events have AI-generated summaries
- [ ] Events properly categorized
- [ ] No duplicate events

---

## 🔗 Related Files

- **Main Script:** `autofillHistory.js` (this file)
- **API Route:** `src/app/api/populateDaily/route.js` (Vercel cron version)
- **Manual Script:** `scripts/populateHistory.js` (advanced version)
- **Cron Config:** `vercel.json` (deployment configuration)

---

## 💡 Tips & Tricks

### Faster Execution

```bash
# Disable AI for 10x faster execution
# Just don't set OPENAI_API_KEY, script auto-detects

# Or modify code:
const openai = null;  // Force disable AI
```

### Higher Quality

```bash
# Use GPT-4 instead of GPT-4-mini
OPENAI_MODEL: 'gpt-4o'

# Increase summary length
OPENAI_MAX_TOKENS: 250
```

### More Events Per Date

```javascript
// In autofillHistory.js
MAX_EVENTS_PER_DATE: 50  // Increase from 20 to 50
```

### Logging to File

```bash
# Save output to log file
node autofillHistory.js > autofill-$(date +%Y%m%d).log 2>&1

# Monitor in real-time
tail -f autofill-*.log
```

---

## 📞 Support

### Common Commands

```bash
# Quick test
node autofillHistory.js --quick

# Specific date
node autofillHistory.js --month 7 --day 20

# Full run
node autofillHistory.js

# Check environment
cat .env.local | grep -E "FIREBASE|OPENAI"

# Deploy cron
npx vercel --prod

# View logs
npx vercel logs --follow
```

### Resources

- **MuffinLabs API:** https://history.muffinlabs.com
- **Wikipedia API:** https://www.mediawiki.org/wiki/API:REST_API
- **OpenAI API:** https://platform.openai.com/docs
- **Firebase Docs:** https://firebase.google.com/docs/firestore

---

## ✅ Summary

This script provides a **turnkey solution** for populating your RealTea timeline with thousands of verified historical events. With just one command, you can fill your database with rich, AI-summarized historical content.

**Quick Start:**
```bash
npm install node-fetch openai firebase
node autofillHistory.js --quick
```

**Production:**
```bash
npx vercel --prod  # Enables daily automated population
```

---

**Version:** 1.0.0  
**Author:** RealTea Dev Team  
**License:** MIT  
**Last Updated:** October 16, 2025

