# 🏛️ RealTea Historical Backfill System

## Overview

The **RealTea Backfill System** is a one-time script that populates your Firestore database with **400 years of verified historical events** (1600-2025) from free public APIs.

---

## ✨ Key Features

### 🆓 Free Public APIs (No Keys Needed)
- **MuffinLabs History API** - Historical events database
- **Wikipedia REST API** - "On This Day" events
- **Wikipedia Page Summaries** - Detailed event information

### 🔄 Revision Tracking
- **First run:** Creates new events
- **Subsequent runs:** Adds revisions instead of overwriting
- **Preserves history:** Original data never lost
- **Tracks changes:** All updates logged in `revisions` array

### 🚀 Smart Processing
- **Duplicate detection:** Skips if title + year match
- **Batch writes:** 100 events per Firestore batch
- **Resume capability:** Can stop/restart anytime
- **Progress tracking:** Saves progress to file
- **AI enhancement:** Optional OpenAI summaries

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd realtea-timeline
npm install node-fetch openai firebase
```

### 2. Set Up .env.local

```env
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other Firebase config

# OpenAI (Optional but recommended)
OPENAI_API_KEY=sk-proj-...
```

### 3. Run Backfill

```bash
# Quick test (5 dates, ~100 events)
node backfillHistory.js --quick

# Single year
node backfillHistory.js --year 1969

# Year range
node backfillHistory.js --start 1900 --end 2000

# Full backfill (1600-2025)
node backfillHistory.js
```

---

## 📖 Usage Modes

### Mode 1: Quick Test (Recommended First)

```bash
node backfillHistory.js --quick
```

**What it does:**
- Samples 5 significant calendar dates
- Processes ~100 events
- Tests all APIs and connections
- **Duration:** 5-8 minutes
- **Cost:** ~$0.10 (OpenAI)

**Perfect for:**
- Testing the system
- Verifying configuration
- Checking data quality

### Mode 2: Single Year

```bash
node backfillHistory.js --year 1969
```

**What it does:**
- Processes all 365 calendar dates
- Finds events from 1969 on each date
- **Duration:** 30-45 minutes
- **Events:** ~200-400
- **Cost:** ~$0.50 (OpenAI)

### Mode 3: Year Range

```bash
node backfillHistory.js --start 2000 --end 2025
```

**What it does:**
- Processes 26 years
- **Duration:** 12-18 hours
- **Events:** ~5,000-10,000
- **Cost:** ~$10-15 (OpenAI)

### Mode 4: Full Backfill (400 Years)

```bash
node backfillHistory.js
```

**What it does:**
- Processes 1600-2025 (426 years)
- All 365 calendar dates × 426 years
- **Duration:** 150-200 hours (~7-8 days)
- **Events:** ~80,000-120,000
- **Cost:** ~$150-200 (OpenAI)

**⚠️ Recommendation:** Run in chunks (e.g., 50 years at a time)

---

## 🔄 Revision Tracking System

### How Revisions Work

**First Run:**
```javascript
{
  title: "Moon Landing",
  summary: "Apollo 11 landed on the moon...",
  year: "1969",
  date: "1969-07-20",
  revisions: [],  // Empty initially
  credibilityScore: 100,
  ...
}
```

**Second Run (new info found):**
```javascript
{
  title: "Moon Landing",
  summary: "Updated: Apollo 11 landed on the moon...",
  year: "1969",
  date: "1969-07-20",
  revisions: [
    {
      updatedAt: "2025-10-16T10:30:00Z",
      aiSummary: "Apollo 11 landed on the moon...",
      sourcesChecked: ["MuffinLabs", "Wikipedia", ...],
      credibilityScore: 1.0,
      region: "North America",
      category: "Space"
    }
  ],
  credibilityScore: 100,
  updatedAt: <new timestamp>,
  ...
}
```

**Benefits:**
- ✅ Preserves original data
- ✅ Tracks all changes over time
- ✅ Allows fact-checking evolution
- ✅ Audit trail for updates

---

## 📊 Document Schema

Every event saved with this structure:

```javascript
{
  // ═══════ CORE FIELDS ═══════
  title: "First Moon Landing",
  summary: "On July 20, 1969, American astronauts Neil Armstrong...",
  description: "Short version (300 chars max)",
  longDescription: "Full AI summary",
  
  // ═══════ DATE FIELDS ═══════
  date: "1969-07-20",
  year: "1969",
  
  // ═══════ CLASSIFICATION ═══════
  region: "North America",
  category: "Space",
  location: "North America",
  
  // ═══════ SOURCES ═══════
  sources: [
    "MuffinLabs",
    "Wikipedia",
    "https://en.wikipedia.org/wiki/Apollo_11"
  ],
  verifiedSource: "https://en.wikipedia.org/wiki/Apollo_11",
  
  // ═══════ VERIFICATION ═══════
  credibilityScore: 100,        // 0-100 scale
  importanceScore: 80,
  verified: true,
  verifiedByAI: true,
  
  // ═══════ ATTRIBUTION ═══════
  addedBy: "backfill",          // vs "auto" (daily updates)
  author: "Wikipedia + MuffinLabs",
  
  // ═══════ FLAGS ═══════
  historical: true,
  newsGenerated: false,
  aiGenerated: true,
  autoUpdated: true,
  
  // ═══════ REVISION TRACKING ═══════
  revisions: [
    {
      updatedAt: "2025-10-17T12:00:00Z",
      aiSummary: "Updated summary with new info...",
      sourcesChecked: ["MuffinLabs", "Wikipedia"],
      credibilityScore: 0.95,
      region: "North America",
      category: "Space"
    }
  ],
  
  // ═══════ TIMESTAMPS ═══════
  createdAt: Firestore.Timestamp,
  updatedAt: Firestore.Timestamp,
  
  // ═══════ MEDIA ═══════
  imageUrl: "https://..."
}
```

---

## 🔄 Resume Capability

The script automatically saves progress to `backfill-progress.json`:

```json
{
  "1969": {
    "created": 245,
    "updated": 12,
    "skipped": 23,
    "duration": "15.3",
    "completed": true
  },
  "1970": {
    "created": 189,
    ...
  }
}
```

**To resume after interruption:**

```bash
# Just run the same command again
node backfillHistory.js --start 1600 --end 2025

# Output will show:
# 📂 Loaded progress: 125 years completed
# 📊 Years to process: 301 (125 already completed)
```

**The script will:**
- ✅ Skip completed years automatically
- ✅ Continue from where it stopped
- ✅ No duplicate processing
- ✅ Progress preserved

---

## 📈 Performance & Costs

### Execution Speed

| Scope | Events | Duration | OpenAI Cost |
|-------|--------|----------|-------------|
| **Quick Test** | ~100 | 5-8 min | ~$0.10 |
| **Single Year** | ~300 | 30-45 min | ~$0.50 |
| **10 Years** | ~3,000 | 5-7 hours | ~$5.00 |
| **50 Years** | ~15,000 | 25-35 hours | ~$25.00 |
| **100 Years** | ~30,000 | 50-70 hours | ~$50.00 |
| **400 Years** | ~100,000 | 150-200 hours | ~$150-200 |

### Cost Breakdown

**OpenAI (GPT-4-mini):**
- $0.0015 per 1K input tokens
- $0.0006 per 1K output tokens
- ~$0.002 per event summary
- 100,000 events × $0.002 = **~$200**

**Firestore:**
- 20,000 writes/day FREE
- 100,000 events = 100,000 writes
- Spread over 5+ days = **FREE**

**APIs:**
- MuffinLabs: **FREE** (no limits)
- Wikipedia: **FREE** (no limits)

**Total Est. Cost:** ~$200 for full 400-year backfill

---

## 🎯 Recommended Strategy

### Week 1: Test & Validate

```bash
# Day 1: Quick test
node backfillHistory.js --quick

# Day 2-3: Recent history (most searched)
node backfillHistory.js --start 2000 --end 2025
```

**Result:** ~5,000 modern events

### Week 2: Major Eras

```bash
# 20th century
node backfillHistory.js --start 1900 --end 1999
```

**Result:** ~20,000 events

### Week 3: Earlier History

```bash
# 19th century
node backfillHistory.js --start 1800 --end 1899

# 18th century
node backfillHistory.js --start 1700 --end 1799
```

**Result:** ~30,000 total events

### Month 2+: Complete the Rest

```bash
# Remaining years
node backfillHistory.js --start 1600 --end 1699
```

**Result:** 100,000+ total events

---

## 🔍 Monitoring Progress

### Real-Time Monitoring

The script outputs detailed logs:

```
═══════════════════════════════════════════════════════════
📆 PROCESSING YEAR: 1969
═══════════════════════════════════════════════════════════

📅 Month 7/1969 (31 days):

  📅 7/1 - Fetching events...
    📚 Fetched: 45 total (MuffinLabs: 20, Wikipedia: 25)
    🔍 Processing 40 unique events...
    
    📦 Processing batch 1/1...
      ✅ Creating new: Apollo 11 Moon Landing (1969)
      ✅ Creating new: First Moon Landing (1969)
      🔄 Updating with revision: Moon Exploration...
      ⏭️  No changes, skipping: Lunar Mission...
    💾 Batch committed: 2 created, 1 updated, 1 skipped

✅ YEAR 1969 COMPLETE
   ✨ Created: 245
   🔄 Updated: 12
   ⏭️  Skipped: 23
   ⏱️  Duration: 15.3 minutes
```

### Check Firestore

**Console:**
```
https://console.firebase.google.com/project/[your-project]/firestore/data/events
```

**Filter by backfill:**
```
addedBy == "backfill"
```

### Progress File

Check `backfill-progress.json`:

```bash
cat backfill-progress.json | jq .
```

**Shows:**
```json
{
  "1969": { "created": 245, "completed": true },
  "1970": { "created": 189, "completed": true },
  ...
}
```

---

## 🛠️ Troubleshooting

### Issue: "Firebase initialization failed"

**Solution:**
```bash
# Verify .env.local exists and has credentials
cat .env.local | grep FIREBASE_API_KEY

# If missing, pull from Vercel
npx vercel env pull .env.local
```

### Issue: "OpenAI quota exceeded"

**Solution:**
```bash
# Option 1: Add credits to OpenAI account
# Visit: https://platform.openai.com/account/billing

# Option 2: Run without AI
# Remove OPENAI_API_KEY from .env.local temporarily
# Events will use original descriptions
```

### Issue: Script stops midway

**Solution:**
```bash
# Just run again - it will resume automatically
node backfillHistory.js --start 1600 --end 2025

# Progress is saved in backfill-progress.json
# Completed years are skipped
```

### Issue: "Batch commit failed"

**Possible causes:**
- Network interruption
- Firestore security rules blocking
- Invalid data format

**Solution:**
```bash
# Check Firestore rules
firebase deploy --only firestore:rules

# Verify rules allow writes with addedBy="backfill"
# Check console for specific error message
```

### Issue: Too slow / Taking forever

**Solutions:**
1. **Reduce AI calls:**
   ```javascript
   // Set in backfillHistory.js
   AI_DELAY_MS: 500  // Reduce from 1000 to 500ms
   ```

2. **Increase events per date:**
   ```javascript
   MAX_EVENTS_PER_DATE: 100  // Increase from 50
   ```

3. **Run in parallel:**
   ```bash
   # Terminal 1
   node backfillHistory.js --start 1600 --end 1700
   
   # Terminal 2
   node backfillHistory.js --start 1700 --end 1800
   
   # Terminal 3
   node backfillHistory.js --start 1800 --end 1900
   
   # etc.
   ```

---

## 🔄 Backfill vs Daily Update

| Feature | Backfill Mode | Daily Update Mode |
|---------|---------------|-------------------|
| **Purpose** | One-time historical population | Ongoing maintenance |
| **Trigger** | Manual: `node backfillHistory.js` | Automated: Vercel cron |
| **Frequency** | Once (or as needed) | Daily at 1 AM |
| **Scope** | All calendar dates, all years | Today's date only |
| **Field: addedBy** | `"backfill"` | `"auto"` |
| **Revisions** | Creates + updates | Only updates |
| **Duration** | Hours/days | 2-5 minutes |

### When to Use Each

**Backfill Mode:**
- ✅ Initial database population
- ✅ Filling gaps in history
- ✅ Major updates to existing events
- ✅ One-time migration

**Daily Update Mode:**
- ✅ Keeping "On This Day" fresh
- ✅ Adding new historical discoveries
- ✅ Maintaining timeline automatically
- ✅ Zero maintenance needed

---

## 📝 Step-by-Step Process

### What Happens When You Run It

```
1. INITIALIZATION
   ├─ Load Firebase config from .env.local
   ├─ Initialize Firestore connection
   ├─ Initialize OpenAI (if key present)
   └─ Load progress from backfill-progress.json

2. FOR EACH YEAR (1600 → 2025)
   └─ FOR EACH MONTH (1 → 12)
      └─ FOR EACH DAY (1 → 31)
         ├─ Fetch from MuffinLabs API
         ├─ Fetch from Wikipedia API
         ├─ Combine and deduplicate
         ├─ FOR EACH EVENT:
         │  ├─ Fetch Wikipedia summary
         │  ├─ Generate AI summary (2-3 sentences)
         │  ├─ Extract region and category
         │  ├─ Check for duplicate (title + year)
         │  ├─ IF duplicate:
         │  │  ├─ Compare summaries
         │  │  ├─ IF different: Add to revisions[]
         │  │  └─ IF same: Skip
         │  └─ IF new: Create document
         └─ Batch write to Firestore (100 per batch)

3. SAVE PROGRESS
   ├─ Write year stats to backfill-progress.json
   ├─ Log completion message
   └─ Update global statistics

4. FINAL SUMMARY
   └─ Print total created, updated, skipped, errors
```

---

## 📂 Progress Tracking

### Progress File Structure

`backfill-progress.json`:

```json
{
  "1969": {
    "created": 245,
    "updated": 12,
    "skipped": 23,
    "duration": "15.3",
    "completed": true
  },
  "1970": {
    "created": 189,
    "updated": 8,
    "skipped": 17,
    "duration": "14.8",
    "completed": true
  }
}
```

### Check Progress

```bash
# View progress file
cat backfill-progress.json | jq .

# Count completed years
cat backfill-progress.json | jq 'keys | length'

# Get specific year stats
cat backfill-progress.json | jq '."1969"'
```

### Resume After Stop

If the script stops (Ctrl+C, crash, etc.):

```bash
# Just run again with same command
node backfillHistory.js --start 1600 --end 2025

# Script will:
# 1. Load backfill-progress.json
# 2. Skip completed years
# 3. Continue from next year
```

**Example output:**
```
📂 Loaded progress: 125 years completed
📊 Years to process: 301 (125 already completed)
🚀 Starting backfill of 301 years...
```

---

## 🎓 Best Practices

### 1. Run in Batches

**Instead of:**
```bash
node backfillHistory.js  # 200 hours!
```

**Do this:**
```bash
# Week 1
node backfillHistory.js --start 2000 --end 2025

# Week 2  
node backfillHistory.js --start 1950 --end 1999

# Week 3
node backfillHistory.js --start 1900 --end 1949

# etc.
```

### 2. Run Overnight

```bash
# Linux/Mac: Run in background
nohup node backfillHistory.js --start 1900 --end 2000 > backfill.log 2>&1 &

# Monitor progress
tail -f backfill.log

# Windows: Use Task Scheduler or run in terminal with screen recording
```

### 3. Monitor Resources

```bash
# Check OpenAI usage
# Visit: https://platform.openai.com/account/usage

# Check Firestore usage
# Visit: https://console.firebase.google.com/project/[project]/usage
```

### 4. Validate Results

```bash
# After first batch, spot-check in Firestore
# Verify:
# - Summaries are factual and well-written
# - Regions are correctly detected
# - Categories make sense
# - Dates are formatted correctly
```

---

## 🔒 Security

### Firestore Rules Compatibility

The backfill script writes with:
```javascript
addedBy: "backfill"
verifiedByAI: true
credibilityScore: 100
```

**Update your `firestore.rules` to allow:**

```javascript
allow create: if 
  request.resource.data.verifiedByAI == true &&
  request.resource.data.credibilityScore >= 60 &&
  (request.resource.data.addedBy == 'auto' || 
   request.resource.data.addedBy == 'backfill');  // ← Add this
```

**Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Testing Commands

```bash
# Test 1: Environment check
cat .env.local | grep -E "FIREBASE|OPENAI"

# Test 2: Quick run
node backfillHistory.js --quick

# Test 3: Single year
node backfillHistory.js --year 2020

# Test 4: Small range
node backfillHistory.js --start 2020 --end 2025

# Test 5: Check Firestore
# Visit: https://console.firebase.google.com/project/[project]/firestore
# Filter: addedBy == "backfill"
```

---

## 📊 Expected Results

### After Quick Test

```
✅ BACKFILL COMPLETE

📊 FINAL STATISTICS:
   Total Events Processed: 100
   ✨ New Events Created: 85
   🔄 Events Updated (revisions): 5
   ⏭️  Skipped (no changes): 10
   ❌ Errors: 0
   📅 Years Completed: 5/426
   ⏱️  Total Duration: 6.2 minutes
   📈 Average Rate: 13.7 events/min
```

### After Full Backfill (1600-2025)

```
✅ BACKFILL COMPLETE

📊 FINAL STATISTICS:
   Total Events Processed: 150,000+
   ✨ New Events Created: 95,000
   🔄 Events Updated (revisions): 5,000
   ⏭️  Skipped (no changes): 50,000
   ❌ Errors: 324
   📅 Years Completed: 426/426
   ⏱️  Total Duration: 12,500 minutes (~8.7 days)
   📈 Average Rate: 7.6 events/min
```

---

## 🗓️ Scheduling

### One-Time Backfill (This Script)

```bash
# Run once manually
node backfillHistory.js --start 1600 --end 2025
```

### Daily Automated Updates (After Backfill)

```bash
# Deploy Vercel cron for ongoing updates
npx vercel --prod

# Configured in vercel.json:
{
  "path": "/api/populateDaily",
  "schedule": "0 1 * * *"  // Daily at 1 AM
}
```

**Result:** Timeline stays fresh with daily "On This Day" updates

---

## 🔗 Related Documentation

- **Security Rules:** `FIRESTORE_SECURITY_README.md`
- **Auto-Update System:** `AUTO_UPDATE_SYSTEM.md`
- **FactCheck API:** `FACTCHECK_API.md`
- **System Health:** `SYSTEM_HEALTH_REPORT.md`

---

## ✅ Pre-Flight Checklist

Before running full backfill:

- [ ] `.env.local` exists with Firebase credentials
- [ ] `OPENAI_API_KEY` is set (or willing to run without AI)
- [ ] Tested with `--quick` mode successfully
- [ ] Firestore security rules deployed
- [ ] Internet connection stable
- [ ] Sufficient disk space for logs
- [ ] OpenAI account has sufficient credits
- [ ] Ready to run for extended period

---

## 💡 Tips

### Save Logs

```bash
# Redirect all output to file
node backfillHistory.js --start 1600 --end 2025 2>&1 | tee backfill-full.log

# Compress logs after
gzip backfill-full.log
```

### Check Progress Remotely

```bash
# If running on server, check progress
ssh user@server
cd /path/to/realtea-timeline
tail -100 backfill-full.log

# Check progress file
cat backfill-progress.json | jq 'keys | length'
```

### Estimate Time Remaining

```bash
# Years completed
COMPLETED=$(cat backfill-progress.json | jq 'keys | length')

# Years total
TOTAL=426

# Percent done
echo "scale=2; ($COMPLETED / $TOTAL) * 100" | bc
```

---

## 🎉 Success Indicators

After completion, you should see:

✅ **100,000+ events** in Firestore  
✅ **All years 1600-2025** covered  
✅ **All events AI-summarized** (if OpenAI enabled)  
✅ **Revision tracking** working  
✅ **No duplicate events** (same title + year)  
✅ **Rich categories** and regions  
✅ **backfill-progress.json** shows 426 completed years  

---

**Script:** `backfillHistory.js`  
**Mode:** One-time backfill  
**Status:** ✅ Ready to run  
**Command:** `node backfillHistory.js --quick`  
**Last Updated:** October 16, 2025

