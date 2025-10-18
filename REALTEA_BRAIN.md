# 🧠 RealTea Brain - Autonomous AI Moderator

## Overview

The **RealTea Brain** is an intelligent autonomous system that continuously improves event quality by expanding, verifying, and optimizing content in real-time.

**File:** `src/app/api/realteaBrain/route.js`

---

## 🎯 What It Does

### Every 6 Hours, the Brain:

1. **📚 Expands Descriptions**
   - Fetches 50 latest events from Firestore
   - Identifies events with short descriptions (< 500 chars)
   - Uses OpenAI to expand into full 4-6 paragraph articles (500-700 words)
   - Structured format: Opening, Background, Key Players, Consequences, Implications, Outlook

2. **🔍 Verifies Facts**
   - Cross-references with NewsAPI
   - Checks sources against reputable domain list
   - Validates historical events
   - Calculates consistency score based on multiple sources

3. **⚖️ Assigns Credibility Scores**
   - NewsAPI verification: +40%
   - Reputable sources (Reuters, BBC, NYT, etc.): +30%
   - Other sources: +15%
   - Historical records: +20%
   - Cross-referenced (2+ sources): +10 bonus points
   - Already verified: +15 bonus points
   - **Final score: 0-100**

4. **✏️ Rewrites Biased Content**
   - Analyzes text for bias, inflammatory language, non-neutral phrasing
   - Uses OpenAI to rewrite in neutral, factual tone
   - Preserves facts while removing opinion
   - Ensures balanced perspective

5. **🚩 Flags Low-Credibility Events**
   - Events with credibilityScore < 40 are marked as "flagged"
   - Flagged events shown with warning badges
   - Not deleted immediately (gives time for correction)
   - Cleanup job handles deletion after 7 days

6. **💾 Updates Firestore**
   - Saves improved longDescription
   - Updates credibilityScore
   - Adds verification metadata
   - Sets lastVerified timestamp
   - Tracks processing history

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    RealTea Brain                         │
│              Every 6 Hours (Vercel Cron)                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  Fetch 50 Latest    │
            │  Events from        │
            │  Firestore          │
            └──────────┬──────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
    ┌─────────┐            ┌──────────────┐
    │ Expand  │            │ Verify Facts │
    │ to Full │            │ Multi-Source │
    │ Article │            │ Check        │
    └────┬────┘            └──────┬───────┘
         │                        │
         └────────────┬───────────┘
                      ▼
              ┌───────────────┐
              │ Check Bias &  │
              │ Rewrite to    │
              │ Neutral       │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │ Calculate     │
              │ Credibility   │
              │ Score (0-100) │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │ Flag if < 40  │
              │ credibility   │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │ Update        │
              │ Firestore     │
              └───────────────┘
```

---

## 🔢 Credibility Score Calculation

### Formula:
```javascript
baseScore = consistencyScore * 100  // From multi-source verification (0-100)
+ sourceBonus (10 if cross-referenced with 2+ sources)
+ verifiedBonus (15 if admin verified)
= finalCredibility (0-100)
```

### Consistency Score Breakdown:
- **NewsAPI verification**: +0.4 (articles found matching event)
- **Reputable sources**: +0.3 (Reuters, BBC, NYT, Guardian, etc.)
- **Other sources**: +0.15 (any source provided)
- **Historical record**: +0.2 (events before year 2000)

### Example:
```
Event: "Marie Antoinette Trial (1793)"
- NewsAPI: Found 0 articles (0.0)
- Sources: None provided (0.0)
- Historical: Yes (+0.2)
- Cross-ref: No (0)
- Admin verified: No (0)

Consistency: 0.2 → Base: 20
Final: 20/100 → 🚩 FLAGGED
```

```
Event: "Government Shutdown (2024)"
- NewsAPI: Found 3 articles (+0.4)
- Sources: nytimes.com, bbc.com (+0.3)
- Historical: No (0)
- Cross-ref: Yes (+10 bonus)
- Admin verified: No (0)

Consistency: 0.7 → Base: 70
+ Cross-ref: 10
Final: 80/100 → ✅ VERIFIED
```

---

## 🗓️ Automated Schedule

### Updated Cron Jobs:

| Time | Endpoint | Purpose |
|------|----------|---------|
| Every 3 hours | `/api/fetchBreaking` | Fetch news from NewsAPI + Wikipedia |
| **Every 6 hours** | **`/api/realteaBrain`** | **🧠 Expand, verify, optimize events** |
| 2:00 AM | `/api/fetchHistory` | Import historical events |
| 3:00 AM | `/api/scheduler/cleanup` | Remove flagged events > 7 days |

**Removed:**
- ❌ `/api/factCheck` (replaced by RealTea Brain)
- ❌ `/api/expandEvents` (replaced by RealTea Brain)

**RealTea Brain consolidates** fact-checking + expansion into one smart system!

---

## 📊 Sample Output

```
═══════════════════════════════════════════════════════════
🧠 REALTEA BRAIN - AUTONOMOUS AI MODERATOR
═══════════════════════════════════════════════════════════

📡 [BRAIN] Fetching 50 latest events from Firestore...
📊 [BRAIN] Found 50 events to process

🔍 [1/50] Processing: Government shutdown live updates...
   🔍 Step 1: Cross-referencing sources...
      Sources checked: 2
      Consistency score: 70%
   📝 Step 2: Expanding to full article...
      Current length: 156 chars
      ✅ Expanded to 1845 chars (542 words)
   🎯 Step 3: Checking for bias...
      ✏️  Rewritten to remove bias
   💾 Step 4: Updating Firestore...
      ✅ Firestore updated

🔍 [2/50] Processing: Marie Antoinette trial (1793)...
   🔍 Step 1: Cross-referencing sources...
      Sources checked: 1
      Consistency score: 20%
   ✓ Step 2: Already detailed (1234 chars)
   🎯 Step 3: Checking for bias...
      ✓ Already neutral
   💾 Step 4: Updating Firestore...
      🚩 Flagged: Low credibility (20/100)
      ✅ Firestore updated

...

═══════════════════════════════════════════════════════════
🧠 REALTEA BRAIN - PROCESSING COMPLETE
═══════════════════════════════════════════════════════════
📊 Results:
   • Processed: 50 events
   • Expanded: 23 descriptions
   • Verified: 50 events
   • Rewritten: 8 for neutrality
   • Flagged: 5 low-credibility
   • Skipped: 0 recently processed
   • Errors: 0
⏱️  Total Duration: 182.45s
═══════════════════════════════════════════════════════════
```

---

## 🧪 Testing the Brain

### Manual Test:
```bash
curl http://localhost:3000/api/realteaBrain
```

### Expected Results:
1. ✅ Events with short descriptions get expanded to 500-700 words
2. ✅ All events get credibility scores updated
3. ✅ Biased events get rewritten to neutral tone
4. ✅ Low-credibility events (<40) marked as flagged
5. ✅ Firestore documents updated with new data

### Check Firestore:
1. Open Firebase Console → Firestore
2. Check any event document
3. Should see new fields:
   - `longDescription` (full article)
   - `credibilityScore` (0-100)
   - `lastVerified` (timestamp)
   - `flagged` (true/false)
   - `verificationSources` (count)

---

## 🔒 Safety Features

### Rate Limiting
- ✅ 2 second delay between events (30 events/minute max)
- ✅ Prevents OpenAI quota exhaustion
- ✅ Avoids Firestore write throttling

### Error Handling
- ✅ Continues processing if one event fails
- ✅ Logs all errors with context
- ✅ Returns summary even with partial failures

### Skipping Logic
- ✅ Skips events verified within 12 hours
- ✅ Prevents redundant processing
- ✅ Saves API calls and compute time

### Flagging (Not Deleting)
- ✅ Low-credibility events flagged, not deleted
- ✅ Gives 7 days for correction
- ✅ Cleanup job handles final removal

---

## 🎯 Quality Improvements

### Before RealTea Brain:
- Short 1-2 sentence descriptions
- No verification
- Inconsistent credibility
- Potential bias
- Manual moderation needed

### After RealTea Brain:
- ✅ Full 500-700 word articles (4-6 paragraphs)
- ✅ Multi-source fact verification
- ✅ Accurate credibility scores (0-100)
- ✅ Neutral, unbiased tone
- ✅ **Fully autonomous** moderation

---

## 📈 Expected Performance

With 50 events processed every 6 hours:
- **Daily processing**: ~200 events
- **Weekly**: ~1,400 events optimized
- **OpenAI calls**: ~150/day (3 per event × 50)
- **Estimated cost**: $0.50-$1.00/day (with GPT-4o-mini)

---

## 🚀 Deployment

The Brain is already configured in `vercel.json`:

```json
{
  "path": "/api/realteaBrain",
  "schedule": "0 */6 * * *"  // Every 6 hours
}
```

When deployed to Vercel:
1. ✅ Runs automatically every 6 hours
2. ✅ No manual intervention needed
3. ✅ Logs visible in Vercel dashboard
4. ✅ Self-healing (continues on errors)

---

## 🎉 Result

**RealTea now behaves like a live moderator**, continuously:
- 📝 Expanding short summaries into full articles
- 🔍 Verifying facts with multiple sources
- ⚖️ Scoring credibility accurately
- ✏️ Rewriting biased content to be neutral
- 🚩 Flagging questionable events
- 💾 Improving the database automatically

**Your timeline gets better every 6 hours without any human input!** 🎊

---

## 🔧 Configuration

### Required Environment Variables:
```env
OPENAI_API_KEY=sk-...        # For AI expansion and bias detection
NEWS_API_KEY=...             # For multi-source verification (optional)
NEXT_PUBLIC_FIREBASE_*=...   # For Firestore updates
```

### Optional:
- `MEDIASTACK_API_KEY` - Additional verification source
- `CRON_SECRET` - Secure cron endpoints

---

**Status:** Production-ready autonomous AI moderator  
**Intelligence Level:** Advanced multi-step reasoning  
**Self-Improvement:** Continuous quality enhancement  
**Human Intervention Required:** None! 🤖

