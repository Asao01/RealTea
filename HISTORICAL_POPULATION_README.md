# 🏛️ RealTea Historical Timeline Population System

## Overview

This system automatically fills your RealTea timeline with **verified historical events from 1600-2025** using multiple data sources and AI-powered summarization.

---

## 🎯 Features

### Data Sources
- ✅ **Wikipedia "On This Day"** - 365 days × 400+ years = ~146,000 events
- ✅ **MuffinLabs History API** - Historical events database
- ✅ **OpenAI GPT-4-mini** - AI-generated factual summaries

### Quality Standards
- ✅ **All events credibilityScore: 1.0** (100%) - Historical facts from verified sources
- ✅ **2-sentence AI summaries** - Includes region and significance
- ✅ **Auto-categorized** - 11 categories (Politics, Science, War, etc.)
- ✅ **Regional tagging** - 8 global regions
- ✅ **Batch processing** - 500 events per Firestore batch for speed

### Automation Options
- ✅ **Vercel Cron** - Daily automated population
- ✅ **Manual Script** - Run specific years on-demand
- ✅ **Quick Mode** - Sample 50 events for testing

---

## 🚀 Quick Start

### Option 1: Quick Test (50 Sample Events)

```bash
cd realtea-timeline
node scripts/populateHistory.js --quick
```

**What it does:**
- Samples 50 significant events from various years
- Uses AI to summarize each event
- Saves to Firestore
- **Duration:** ~3-5 minutes
- **Cost:** ~$0.05 in OpenAI credits

### Option 2: Populate Specific Year

```bash
# Populate all events from 1969
node scripts/populateHistory.js --year 1969

# Populate a range
node scripts/populateHistory.js --start 1900 --end 2000

# Without AI (faster, cheaper)
node scripts/populateHistory.js --year 1969 --no-ai
```

### Option 3: Automated Daily Population (Vercel Cron)

**Runs automatically every day at 1:00 AM**

```bash
# Deploy to enable cron
npx vercel --prod

# Test manually
curl https://realitea.org/api/populateDaily
```

**What it does:**
- Fetches all historical events for current date (e.g., October 16th)
- Gets events from ALL years (1600-2025)
- Summarizes with AI
- Saves to Firestore
- **Runs:** Daily at 1:00 AM
- **Duration:** 2-5 minutes per day
- **Result:** ~20-50 new events per day

---

## 📁 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               HISTORICAL POPULATION SYSTEM                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Option A: Manual Script (scripts/populateHistory.js)      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • Run specific years on-demand                       │  │
│  │  • Full control over date ranges                      │  │
│  │  • Progress tracking per year                         │  │
│  │  • Resume capability                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Option B: Vercel Cron (/api/populateDaily)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • Runs daily at 1:00 AM                              │  │
│  │  • Populates "On This Day" events                     │  │
│  │  • Fully automated                                    │  │
│  │  • Zero maintenance                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Data Flow:                                                 │
│  ──────────                                                 │
│  1. Fetch from Wikipedia + MuffinLabs                       │
│  2. Deduplicate by year + title                             │
│  3. AI summarize (2 sentences, region, significance)        │
│  4. Auto-categorize (Politics, Science, War, etc.)          │
│  5. Extract region (North America, Europe, Asia, etc.)      │
│  6. Batch write to Firestore (500 per batch)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
cd realtea-timeline
npm install node-fetch openai
```

### 2. Configure Environment Variables

Ensure `.env.local` has:

```env
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# OpenAI (required for AI summaries)
OPENAI_API_KEY=sk-proj-...

# Optional: Cron authentication
CRON_SECRET=your-random-secret
```

### 3. Test the Script

```bash
# Quick test (50 events)
node scripts/populateHistory.js --quick

# Check Firestore
# Visit: https://console.firebase.google.com/project/[your-project]/firestore
```

### 4. Deploy Automated Daily Cron

```bash
# Deploy to Vercel
npx vercel --prod

# Verify cron is active
# Visit: https://vercel.com/[account]/realtea-timeline/settings/cron
```

---

## 📊 Usage Examples

### Populate Recent History (2000-2025)

```bash
node scripts/populateHistory.js --start 2000 --end 2025
```

**Expected:**
- ~9,125 events (25 years × 365 days)
- Duration: ~3-4 hours with AI
- Cost: ~$5-10 in OpenAI credits

### Populate Significant Decade (1960s)

```bash
node scripts/populateHistory.js --start 1960 --end 1969
```

**Expected:**
- ~3,650 events (10 years × 365 days)
- Duration: ~1-2 hours with AI
- Cost: ~$2-4 in OpenAI credits

### Populate Without AI (Fast Mode)

```bash
node scripts/populateHistory.js --start 1900 --end 2000 --no-ai
```

**Expected:**
- ~36,500 events (100 years × 365 days)
- Duration: ~30-60 minutes without AI
- Cost: $0 (no AI calls)

### Test Single Year

```bash
node scripts/populateHistory.js --year 1969
```

**Expected:**
- ~365 events
- Duration: ~5-10 minutes
- Cost: ~$0.20 in OpenAI credits

---

## 📈 Performance & Costs

### Execution Speed

| Mode | Events/Hour | Duration (100 years) |
|------|-------------|---------------------|
| **With AI** | ~600 | ~60 hours |
| **Without AI** | ~3,000 | ~12 hours |
| **Quick Mode** | 50 events | 5 minutes |

### OpenAI Costs

| Model | Cost per Event | 1,000 Events | 10,000 Events |
|-------|---------------|--------------|---------------|
| GPT-4-mini | ~$0.0005 | ~$0.50 | ~$5.00 |
| GPT-3.5-turbo | ~$0.0002 | ~$0.20 | ~$2.00 |

**Estimate for full population (100,000 events):**
- With GPT-4-mini: ~$50
- With GPT-3.5-turbo: ~$20
- Without AI: $0

### Firestore Costs

- **Writes:** 100,000 events = 100,000 writes
- **Free Tier:** 20,000 writes/day
- **Cost:** First 20K free, then $0.18 per 100K writes

**Recommendation:** Populate gradually (1-2 years per day) to stay within free tier.

---

## ⚙️ Configuration

### Modify Batch Size

```javascript
// In populateHistory.js, line ~300
const BATCH_SIZE = 500;  // Change this (max 500 for Firestore)
```

### Change AI Model

```javascript
// In populateHistory.js or populateDaily/route.js
model: "gpt-4o-mini"  // Change to "gpt-3.5-turbo" for cheaper/faster
```

### Adjust Rate Limiting

```javascript
// Wait time between AI calls
await new Promise(resolve => setTimeout(resolve, 1000));  // 1 second
                                                  // ↑ Adjust this
```

---

## 🗓️ Cron Schedules

### Vercel Cron Configuration

Edit `vercel.json`:

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

**Schedule Options:**

| Schedule | Description | Best For |
|----------|-------------|----------|
| `0 1 * * *` | Daily at 1:00 AM | **Recommended** - Steady growth |
| `0 */12 * * *` | Every 12 hours | Faster population |
| `0 0 * * 0` | Weekly (Sundays) | Conservative approach |
| `0 3 * * 1-5` | Weekdays at 3 AM | Business days only |

### External Cron (cron-job.org)

If you exceed Vercel's cron limit:

1. Go to https://cron-job.org (free)
2. Create job:
   - URL: `https://realitea.org/api/populateDaily`
   - Schedule: Daily at 1:00 AM
   - Method: GET
3. Optional: Add header `Authorization: Bearer YOUR_SECRET`

---

## 📝 Firestore Schema

Each historical event saved as:

```javascript
{
  // Core info
  title: "First Moon Landing",
  description: "Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon...",
  longDescription: "Full 2-sentence AI summary including region and significance",
  
  // Dates
  date: "1969-07-20",
  year: "1969",
  
  // Classification
  location: "North America",
  category: "Space",
  region: "North America",
  
  // Verification
  sources: ["https://wikipedia.org/wiki/Apollo_11"],
  verifiedSource: "https://wikipedia.org/wiki/Apollo_11",
  credibilityScore: 100,
  importanceScore: 80,
  verified: true,
  verifiedByAI: true,
  
  // Attribution
  addedBy: "auto",
  author: "Wikipedia",
  historical: true,
  newsGenerated: false,
  aiGenerated: true,
  autoUpdated: true,
  
  // Media
  imageUrl: "https://...",
  
  // Timestamps
  createdAt: Firestore.Timestamp,
  updatedAt: Firestore.Timestamp
}
```

---

## 🎓 Best Practices

### Strategy: Gradual Population

**Week 1:** Populate significant years
```bash
node scripts/populateHistory.js --year 1969  # Moon landing
node scripts/populateHistory.js --year 1945  # WWII end
node scripts/populateHistory.js --year 1776  # Independence
node scripts/populateHistory.js --year 1989  # Berlin Wall
node scripts/populateHistory.js --year 2001  # 9/11
```

**Week 2:** Fill in recent history (2000-2025)
```bash
node scripts/populateHistory.js --start 2000 --end 2025
```

**Week 3+:** Let daily cron fill in the rest
- Runs automatically every day
- Adds ~20-50 events per day
- Complete in ~1-2 years

### Strategy: Fast Population

**Day 1:** Run without AI (fast, free)
```bash
node scripts/populateHistory.js --start 1600 --end 2025 --no-ai
```

**Day 2+:** Use API to enrich with AI summaries
```bash
curl https://realitea.org/api/enrichEventFull?limit=100
```

---

## 📊 Progress Tracking

### Check Progress in Firestore

```javascript
// Count total historical events
db.collection('events')
  .where('historical', '==', true)
  .get()
  .then(snap => console.log(`Historical events: ${snap.size}`));

// Count by year
db.collection('events')
  .where('year', '==', '1969')
  .get()
  .then(snap => console.log(`1969 events: ${snap.size}`));
```

### Monitor Logs

**Manual Script:**
```bash
node scripts/populateHistory.js --year 2020
```

Output shows:
```
═══════════════════════════════════════════════
📆 PROCESSING YEAR: 2020
═══════════════════════════════════════════════

📅 Month 1/2020 (31 days)
📅 Processing 1/1...
  📚 Found 42 events (Muffin: 20, Wiki: 22)
  ✅ Queued: Event title...
  💾 Batch saved: 42 events

✅ YEAR 2020 COMPLETE
   Events saved: 1,245
   Duration: 15.3 minutes
```

**Vercel Cron:**
```bash
npx vercel logs --follow | grep "DAILY POPULATION"
```

---

## 🔧 Advanced Configuration

### Custom Date Range

```javascript
// Modify populateHistory.js
const startYear = 1600;  // Change start
const endYear = 2025;    // Change end
```

### Filter by Importance

```javascript
// Only save major events
if (event.links && event.links.length > 2) {
  // Event has multiple Wikipedia links = more significant
  eventData.importanceScore = 90;
} else {
  eventData.importanceScore = 70;
}
```

### Custom Categories

```javascript
// Add custom category logic in categorizeEvent()
if (/your-pattern/i.test(text)) return 'YourCategory';
```

---

## 🐛 Troubleshooting

### Issue: "Firestore not initialized"

**Solution:**
```bash
# Check .env.local exists and has Firebase credentials
cat .env.local | grep FIREBASE_API_KEY

# If missing, pull from Vercel
npx vercel env pull .env.local
```

### Issue: "OpenAI API key not found"

**Solution:**
```bash
# Add to .env.local
echo 'OPENAI_API_KEY=sk-proj-...' >> .env.local

# Or add to Vercel
npx vercel env add OPENAI_API_KEY production
```

### Issue: Rate limits exceeded

**NewsAPI:**
- Free: 100 requests/day
- Solution: Run script in smaller chunks

**OpenAI:**
- Check quota: https://platform.openai.com/usage
- Solution: Use `--no-ai` flag or reduce batch size

**Firestore:**
- Free: 20,000 writes/day
- Solution: Spread over multiple days

### Issue: Duplicate events

**Check:**
```javascript
// Script automatically skips duplicates by ID
const docId = `${cleanTitle}-${eventDate}`;
const existing = await getDoc(docRef);
if (existing.exists()) {
  skipped++;
  continue;
}
```

---

## 📅 Cron Schedule Details

### Daily Population Schedule

**`vercel.json` configuration:**
```json
{
  "path": "/api/populateDaily",
  "schedule": "0 1 * * *"
}
```

**What it does:**
- **Every day at 1:00 AM** (server time)
- Fetches historical events for current date (month/day)
- Example: On October 16, fetches all "October 16" events from 1600-2025
- Typically 20-50 events per day

**Timeline to full population:**
- 365 days × ~30 events/day = **~10,950 events in 1 year**
- Coverage: ~50-100 significant events per year
- Quality: All AI-summarized and verified

### Full Population Timeline

| Strategy | Duration | Total Events | AI Cost |
|----------|----------|--------------|---------|
| **Daily Cron** | 1 year | ~11,000 | ~$10 |
| **Manual (with AI)** | 60 hours | ~100,000 | ~$50 |
| **Manual (no AI)** | 12 hours | ~100,000 | $0 |
| **Hybrid** | 2 weeks | ~50,000 | ~$5 |

---

## 🎯 Recommended Strategy

### Phase 1: Quick Start (Day 1)
```bash
# Add 50 diverse sample events
node scripts/populateHistory.js --quick
```
**Result:** Timeline immediately has content

### Phase 2: Key Years (Week 1)
```bash
# Populate significant years
for year in 1969 1945 1776 1914 1989 2001 2020; do
  node scripts/populateHistory.js --year $year
  sleep 60
done
```
**Result:** Major historical moments covered

### Phase 3: Recent History (Week 2)
```bash
# Last 25 years (most searched)
node scripts/populateHistory.js --start 2000 --end 2025
```
**Result:** Modern events populated

### Phase 4: Automated Fill (Ongoing)
```bash
# Deploy cron to Vercel
npx vercel --prod
```
**Result:** Daily automated additions, full coverage in ~1 year

---

## 📧 Weekly Email Summary

Add email notifications for population progress:

```javascript
// In populateDaily/route.js, add after completion:

import { sendEmail } from '@/lib/email';

// Every Monday
const day = new Date().getDay();
if (day === 1) {
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: 'RealTea Historical Population Update',
    text: `
      This Week's Progress:
      - Events Added: ${stats.saved}
      - Total Historical Events: ${totalCount}
      - Coverage: ${(totalCount / 146000 * 100).toFixed(1)}%
    `
  });
}
```

---

## 🚦 Monitoring

### Check Progress

**Firestore Console:**
```
https://console.firebase.google.com/project/[project-id]/firestore/data
```

**Query by field:**
```
addedBy == "auto"
historical == true
```

### View Logs

**Manual script:**
```bash
node scripts/populateHistory.js --year 2020 2>&1 | tee population.log
```

**Vercel cron:**
```bash
npx vercel logs --follow
```

### Database Stats

```bash
# Create a stats endpoint
curl https://realitea.org/api/stats

# Response:
{
  "totalEvents": 1245,
  "historicalEvents": 892,
  "modernEvents": 353,
  "coverage": {
    "1600-1700": 45,
    "1700-1800": 123,
    ...
  }
}
```

---

## 🔒 Security

### API Authentication

Add to `.env.local`:
```env
CRON_SECRET=generate-random-secret-here
```

**Generate secret:**
```bash
openssl rand -base64 32
```

### Firestore Rules

Ensure automated writes are allowed:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      // Allow server-side writes
      allow write: if request.auth != null || 
                      request.resource.data.addedBy == "auto";
      allow read: if true;
    }
  }
}
```

---

## 📦 File Structure

```
realtea-timeline/
├── scripts/
│   └── populateHistory.js          ← Manual population script
├── src/app/api/
│   ├── populateDaily/
│   │   └── route.js                ← Daily cron endpoint
│   └── autoUpdate/
│       └── route.js                ← Real-time news updates
├── vercel.json                     ← Cron configuration
├── .env.local                      ← Environment variables
└── HISTORICAL_POPULATION_README.md ← This file
```

---

## 🧪 Testing

### Test Manual Script

```bash
# Test with 1 year
node scripts/populateHistory.js --year 1969

# Check logs for success
# ✅ YEAR 1969 COMPLETE
#    Events saved: 365
```

### Test API Endpoint

```bash
# Trigger manually
curl http://localhost:3000/api/populateDaily

# Check response
{
  "success": true,
  "stats": {
    "processed": 42,
    "saved": 35,
    "skipped": 7,
    "errors": 0
  }
}
```

### Verify in Firestore

```bash
# Use Firebase CLI
firebase firestore:get events --limit 10

# Or visit console
https://console.firebase.google.com/project/[project]/firestore
```

---

## 📚 API Reference

### `/api/populateDaily`

**Method:** GET or POST  
**Schedule:** Daily at 1:00 AM (Vercel cron)  
**Auth:** Optional Bearer token

**Response:**
```json
{
  "success": true,
  "stats": {
    "processed": 42,
    "saved": 35,
    "skipped": 7,
    "errors": 0,
    "date": "10/16",
    "durationSeconds": 125.4,
    "timestamp": "2025-10-16T01:00:00Z"
  }
}
```

---

## 🎯 Expected Results

### After 1 Week
- ✅ ~200-350 historical events
- ✅ Coverage: ~10-20 significant years
- ✅ All AI-summarized and categorized

### After 1 Month  
- ✅ ~1,000-1,500 events
- ✅ Coverage: Recent history well-populated
- ✅ "On This Day" feature fully functional

### After 6 Months
- ✅ ~6,000-9,000 events
- ✅ Coverage: 50-75% of timeline
- ✅ Rich, diverse historical content

### After 1 Year
- ✅ ~11,000-15,000 events
- ✅ Coverage: ~75% of significant events
- ✅ Comprehensive timeline from 1600-2025

---

## 🔄 Resume Capability

The script automatically skips existing events:

```javascript
const existing = await getDoc(docRef);
if (existing.exists()) {
  skipped++;
  continue;
}
```

**This means:**
- ✅ Safe to run multiple times
- ✅ Won't create duplicates
- ✅ Can stop and resume anytime
- ✅ Idempotent operation

---

## 📞 Support & Resources

### Documentation
- **MuffinLabs API:** https://history.muffinlabs.com
- **Wikipedia API:** https://api.wikimedia.org
- **OpenAI API:** https://platform.openai.com/docs
- **Firestore Batch Writes:** https://firebase.google.com/docs/firestore/manage-data/transactions

### Common Commands

```bash
# Quick test
node scripts/populateHistory.js --quick

# Specific year
node scripts/populateHistory.js --year 2020

# Range
node scripts/populateHistory.js --start 1900 --end 2000

# No AI (faster)
node scripts/populateHistory.js --year 2020 --no-ai

# Check cron logs
npx vercel logs | grep "DAILY POPULATION"

# Deploy updates
npx vercel --prod
```

---

## ✅ Deployment Checklist

- [ ] Install dependencies: `npm install node-fetch openai`
- [ ] Configure `.env.local` with Firebase credentials
- [ ] Add `OPENAI_API_KEY` to environment
- [ ] Test locally: `node scripts/populateHistory.js --quick`
- [ ] Verify events in Firestore console
- [ ] Deploy to Vercel: `npx vercel --prod`
- [ ] Confirm cron is active in Vercel dashboard
- [ ] Monitor first execution in logs
- [ ] Set up weekly email summaries (optional)

---

## 🎉 Success Metrics

After full deployment:
- ✅ 10,000+ historical events
- ✅ All AI-summarized with region and significance
- ✅ Auto-categorized and verified
- ✅ Daily automated additions
- ✅ Zero manual maintenance
- ✅ Rich, searchable timeline

---

**System:** RealTea Historical Timeline Populator v1.0  
**Script:** `scripts/populateHistory.js`  
**API:** `/api/populateDaily`  
**Schedule:** Daily at 1:00 AM  
**Status:** ✅ Ready to deploy  
**Last Updated:** October 16, 2025

