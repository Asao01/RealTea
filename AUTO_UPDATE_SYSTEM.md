# 🤖 RealTea AI Auto-Update System

## Overview

The RealTea Auto-Update System is a **fully automated background service** that fetches, verifies, and adds new world events to your Firestore database **24/7**.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                   EVERY 6 HOURS                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. Fetch from Multiple News Sources                  │  │
│  │     • NewsAPI (breaking news)                         │  │
│  │     • GDELT (global events)                           │  │
│  │     • Wikipedia (historical events)                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  2. Group Similar Events                              │  │
│  │     • Finds duplicate stories from different sources  │  │
│  │     • Groups by >50% title word overlap               │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  3. AI Fact-Checking (OpenAI GPT-4)                   │  │
│  │     • Summarizes event (150-250 words)                │  │
│  │     • Verifies across sources                         │  │
│  │     • Extracts location, category, region             │  │
│  │     • Calculates agreement ratio                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  4. Credibility Scoring                               │  │
│  │     • Source count (5+ sources = max weight)          │  │
│  │     • Agreement ratio (how much sources agree)        │  │
│  │     • Recency (events <7 days old score higher)       │  │
│  │     • Final score: 0.0 - 1.0                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  5. Validation & Filtering                            │  │
│  │     ✅ Accept if:                                      │  │
│  │        - credibilityScore >= 0.6                      │  │
│  │        - sourceCount >= 2                             │  │
│  │     ❌ Reject if:                                      │  │
│  │        - credibilityScore < 0.6                       │  │
│  │        - sourceCount < 2                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  6. Save to Firestore                                 │  │
│  │     • Creates unique document ID from title + date    │  │
│  │     • Skips if updated in last 12 hours               │  │
│  │     • Adds timestamps and metadata                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  7. Email Summary (Mondays only)                      │  │
│  │     • Stats: saved, rejected, errors                  │  │
│  │     • Sent to admin email                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Features

### ✅ Automated Fetching
- **NewsAPI:** Real-time breaking news from 80,000+ sources
- **GDELT:** Global news events database
- **Wikipedia:** Historical "On This Day" events
- **Runs every 6 hours** automatically

### ✅ AI-Powered Verification
- **OpenAI GPT-4-mini** analyzes each event
- Summarizes in 150-250 words
- Verifies credibility across sources
- Extracts location, category, region

### ✅ Smart Filtering
- **Minimum credibility:** 0.6 (60%)
- **Minimum sources:** 2 independent sources
- **Deduplication:** Skips events updated in last 12 hours
- **Grouping:** Combines similar stories from different outlets

### ✅ Quality Scoring
- **Source Weight:** More sources = higher credibility
- **Agreement Ratio:** How much sources agree
- **Recency Bonus:** Recent events (<7 days) score higher
- **Final Score:** 0.0 - 1.0 scale

### ✅ Monitoring
- **Detailed Logs:** Every step logged to console
- **Stats Tracking:** Processed, saved, rejected, errors
- **Email Summaries:** Weekly digest (Mondays)

---

## 🚀 Deployment

### Option 1: Vercel Cron (Recommended)

**Advantages:**
- ✅ Free on Hobby plan (up to 2 cron jobs)
- ✅ Automatic execution
- ✅ No external dependencies
- ✅ Integrated with your Vercel deployment

**Setup:**

1. **Configure cron in `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/autoUpdate",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

2. **Deploy to Vercel:**
```bash
npx vercel --prod
```

3. **Verify in Vercel Dashboard:**
   - Go to: https://vercel.com/[your-account]/realtea-timeline/settings/cron
   - Should see: `/api/autoUpdate` running every 6 hours

**Schedule Syntax:**
```
0 */6 * * *  →  Every 6 hours at :00 (12am, 6am, 12pm, 6pm)
0 */4 * * *  →  Every 4 hours
0 0 * * *    →  Daily at midnight
0 */12 * * * →  Every 12 hours
```

---

### Option 2: External Cron Service (if Vercel limit reached)

Use services like **cron-job.org** or **UptimeRobot**:

1. **Create account** at https://cron-job.org (free)

2. **Add new cron job:**
   - URL: `https://realitea.org/api/autoUpdate`
   - Method: GET or POST
   - Schedule: Every 6 hours
   - Optional: Add header `Authorization: Bearer YOUR_SECRET`

3. **Set CRON_SECRET:**
```bash
npx vercel env add CRON_SECRET production
# Enter a random secret string
```

4. **Test manually:**
```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://realitea.org/api/autoUpdate
```

---

### Option 3: Firebase Cloud Functions

**Note:** Firebase Functions requires paid plan for external HTTP calls.

**Setup:**

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

2. **Create function:**
```javascript
// functions/index.js
const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.autoUpdate = functions.pubsub
  .schedule('every 6 hours')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const response = await fetch('https://realitea.org/api/autoUpdate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${functions.config().cron.secret}`
      }
    });
    
    const data = await response.json();
    console.log('Auto-update result:', data);
    return null;
  });
```

3. **Deploy:**
```bash
firebase deploy --only functions
```

---

## 🔑 Environment Variables

### Required

```env
# OpenAI (for AI verification)
OPENAI_API_KEY=sk-proj-...

# NewsAPI (for breaking news)
NEWS_API_KEY=...

# Firebase (for database)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other Firebase vars
```

### Optional

```env
# Mediastack (additional news source)
MEDIASTACK_API_KEY=...

# Cron authentication
CRON_SECRET=your-random-secret-string

# Email service (for weekly summaries)
SENDGRID_API_KEY=...
ADMIN_EMAIL=admin@realitea.org
```

---

## 🧪 Testing

### Manual Trigger

Test the system without waiting for cron:

```bash
# Local development
curl http://localhost:3000/api/autoUpdate

# Production
curl https://realitea.org/api/autoUpdate
```

### Check Logs

```bash
# Vercel logs (real-time)
npx vercel logs --follow

# Or visit Vercel Dashboard
https://vercel.com/[your-account]/realtea-timeline/logs
```

### Expected Output

```json
{
  "success": true,
  "stats": {
    "processed": 25,
    "saved": 12,
    "rejected": 10,
    "errors": 3,
    "durationSeconds": 85.4,
    "timestamp": "2025-10-16T14:30:00Z"
  },
  "message": "Auto-update completed: 12 events saved, 10 rejected"
}
```

---

## 📊 Credibility Calculation

### Formula

```javascript
function calculateCredibilityScore(sourceCount, agreementRatio, recency) {
  const sourceWeight = Math.min(sourceCount / 5, 1);
  const agreementWeight = Math.min(agreementRatio, 1);
  const recencyWeight = recency > 7 ? 0.9 : 1;
  return ((sourceWeight + agreementWeight + recencyWeight) / 3).toFixed(2);
}
```

### Examples

**High Credibility Event (0.85):**
- 8 sources (sourceWeight = 1.0)
- 90% agreement (agreementWeight = 0.9)
- 2 days old (recencyWeight = 1.0)
- **Score:** (1.0 + 0.9 + 1.0) / 3 = **0.97**

**Medium Credibility Event (0.65):**
- 3 sources (sourceWeight = 0.6)
- 70% agreement (agreementWeight = 0.7)
- 5 days old (recencyWeight = 1.0)
- **Score:** (0.6 + 0.7 + 1.0) / 3 = **0.77**

**Low Credibility Event (0.35 - REJECTED):**
- 1 source (sourceWeight = 0.2)
- 50% agreement (agreementWeight = 0.5)
- 10 days old (recencyWeight = 0.9)
- **Score:** (0.2 + 0.5 + 0.9) / 3 = **0.53** ❌

---

## 📧 Email Summaries

Weekly email sent every **Monday morning** with stats:

```
Subject: RealTea Auto-Update Summary (Week of Oct 16-22)

📊 This Week's Stats:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ New Events Added: 42
❌ Rejected (low credibility): 18
⚠️  Errors: 3
⏱️  Total Processing Time: 12.5 minutes

🔥 Top Categories:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Politics: 15 events
2. Science: 10 events
3. Technology: 8 events
4. World: 9 events

📍 Top Regions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. North America: 18 events
2. Europe: 12 events
3. Asia: 8 events
4. Global: 4 events

🎯 Average Credibility: 0.74 (74%)
```

### Email Service Setup

**Option A: SendGrid**
```bash
npm install @sendgrid/mail
npx vercel env add SENDGRID_API_KEY production
npx vercel env add ADMIN_EMAIL production
```

**Option B: Resend**
```bash
npm install resend
npx vercel env add RESEND_API_KEY production
```

**Implementation:**
```javascript
// Add to autoUpdate/route.js
import { sendEmail } from '@/lib/email';

const emailBody = `
  New Events: ${stats.saved}
  Rejected: ${stats.rejected}
  Errors: ${stats.errors}
`;

await sendEmail({
  to: process.env.ADMIN_EMAIL,
  subject: 'RealTea Weekly Summary',
  text: emailBody
});
```

---

## 🛡️ Validation Rules

### ✅ Acceptance Criteria

An event is **accepted** and saved to Firestore if:

1. ✅ **Credibility Score ≥ 0.6** (60%)
2. ✅ **Source Count ≥ 2** (at least 2 independent sources)
3. ✅ **Not updated in last 12 hours** (prevents duplicates)

### ❌ Rejection Criteria

An event is **rejected** if:

1. ❌ Credibility score < 0.6
2. ❌ Less than 2 independent sources
3. ❌ Already exists and was updated < 12 hours ago
4. ❌ AI verification fails completely

---

## 📁 Files Created

### API Endpoint
- `src/app/api/autoUpdate/route.js` - Main auto-update logic

### Configuration
- `vercel.json` - Cron job configuration (updated)

### Documentation
- `AUTO_UPDATE_SYSTEM.md` - This file
- `FACTCHECK_API.md` - Fact-check API docs

---

## 🔧 Configuration

### Cron Schedule

Edit `vercel.json` to change frequency:

```json
{
  "crons": [
    {
      "path": "/api/autoUpdate",
      "schedule": "0 */6 * * *"  ← Change this
    }
  ]
}
```

**Common Schedules:**
- `0 */6 * * *` - Every 6 hours (**default**)
- `0 */4 * * *` - Every 4 hours (more frequent)
- `0 */12 * * *` - Every 12 hours (less frequent)
- `0 0,6,12,18 * * *` - At 12am, 6am, 12pm, 6pm
- `0 0 * * *` - Once daily at midnight

### Rate Limiting

**Built-in delays:**
- 2 seconds between processing each event
- 15 second timeout for API calls
- 5 minute maximum execution time

**Adjust in code:**
```javascript
// Line ~180 in autoUpdate/route.js
await new Promise(resolve => setTimeout(resolve, 2000));
                                                  // ↑ Change this
```

### Credibility Threshold

**Change minimum score:**
```javascript
// Line ~150 in autoUpdate/route.js
if (credibilityScore < 0.6) {
                      // ↑ Change this (0.5 = 50%, 0.7 = 70%)
  rejected++;
  continue;
}
```

---

## 📈 Performance

### Expected Execution Times

| Scenario | Duration | Events Saved |
|----------|----------|--------------|
| **Low Activity** | 30-60 seconds | 3-5 events |
| **Normal Activity** | 1-2 minutes | 10-15 events |
| **High Activity** | 2-4 minutes | 20-30 events |
| **Breaking News** | 3-5 minutes | 30-50 events |

### Resource Usage

- **API Calls:** ~20-30 per run
  - NewsAPI: 1 call
  - GDELT: 1 call
  - Wikipedia: 1 call
  - OpenAI: 10-20 calls (varies by event count)
  
- **Firestore Operations:** ~20-40 per run
  - Read: 10-20 (duplicate checks)
  - Write: 10-20 (new events)

- **Cost Estimates:**
  - OpenAI: ~$0.10 - $0.30 per run
  - Vercel: Free (Hobby plan includes crons)
  - Firestore: Free tier covers it

---

## 🔒 Security

### Authentication

Add a secret to prevent unauthorized access:

```bash
# Generate random secret
openssl rand -base64 32

# Add to Vercel
npx vercel env add CRON_SECRET production
# Paste the generated secret
```

**Code automatically checks:**
```javascript
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### API Key Protection

Never expose these in logs or client-side:
- ✅ Stored in environment variables
- ✅ Only used server-side
- ✅ Not included in browser bundles

---

## 📊 Monitoring

### Check Cron Job Status

**Vercel Dashboard:**
1. Go to: https://vercel.com/[account]/realtea-timeline/settings/cron
2. View execution history
3. Check success/failure rates

**Check Logs:**
```bash
# Real-time logs
npx vercel logs --follow

# Filter for auto-update
npx vercel logs | grep "AUTO-UPDATE"
```

### Success Indicators

Look for these in logs:
```
✅ AUTO-UPDATE COMPLETE
📊 Processed: 25
✅ Saved: 12
❌ Rejected: 10
⚠️  Errors: 3
⏱️  Duration: 85.4s
```

### Error Indicators

Watch for:
```
❌ [AUTO] Fatal error: ...
❌ [AUTO] NewsAPI error: ...
❌ [AUTO] AI verification error: ...
❌ [AUTO] Firestore save error: ...
```

---

## 🐛 Troubleshooting

### Issue: No events being saved

**Check:**
1. Verify API keys are set:
   ```bash
   npx vercel env ls | grep "NEWS_API_KEY\|OPENAI_API_KEY"
   ```

2. Check credibility threshold:
   - Most events rejected? Lower threshold from 0.6 to 0.5

3. Check source count:
   - All rejected for <2 sources? Increase to fetch more articles

### Issue: Cron not running

**Solutions:**
1. Verify cron is enabled in Vercel dashboard
2. Check Vercel plan supports crons (Pro plan = unlimited)
3. Use external cron service as backup

### Issue: API rate limits

**NewsAPI:**
- Free tier: 100 requests/day
- Solution: Cache results or upgrade plan

**OpenAI:**
- Check quota at: https://platform.openai.com/usage
- Solution: Add error handling for rate limits

### Issue: Duplicate events

**If seeing duplicates:**
1. Check deduplication logic (12-hour threshold)
2. Increase threshold to 24 hours
3. Improve title matching in grouping function

---

## 📝 Firestore Schema

Events saved with this structure:

```javascript
{
  // Core fields
  title: "String",
  description: "String (300 chars max)",
  longDescription: "String (full AI summary)",
  date: "YYYY-MM-DD",
  
  // Classification
  location: "City, Country or Global",
  category: "Politics|Science|Technology|etc",
  region: "Global|North America|Europe|etc",
  
  // Verification
  sources: ["url1", "url2", "url3"],
  verifiedSource: "url",
  credibilityScore: 0-100,
  importanceScore: 0-100,
  verified: true/false,
  verifiedByAI: true,
  
  // Media
  imageUrl: "url",
  
  // Attribution
  addedBy: "RealTea AI Auto-Update",
  author: "RealTea Bot",
  newsGenerated: true,
  aiGenerated: true,
  autoUpdated: true,
  
  // Metadata
  metadata: {
    sourceCount: 5,
    agreementRatio: 0.85,
    recencyDays: 2,
    keyPoints: ["point 1", "point 2"],
    processedAt: "ISO timestamp"
  },
  
  // Timestamps
  createdAt: Firestore.Timestamp,
  updatedAt: Firestore.Timestamp
}
```

---

## 🎓 Best Practices

### 1. **Monitor Regularly**
- Check logs weekly
- Review rejected events
- Adjust credibility threshold if needed

### 2. **Optimize Costs**
- Use GPT-4-mini instead of GPT-4 (10x cheaper)
- Cache AI responses when possible
- Limit articles fetched per source

### 3. **Quality Control**
- Manually review low-credibility events
- Flag problematic sources
- Adjust validation rules based on results

### 4. **Backup Strategy**
- Export Firestore data weekly
- Store cron execution history
- Keep failed events for manual review

---

## 📚 API Endpoints

### `/api/autoUpdate`
- **Method:** GET or POST
- **Auth:** Optional (Bearer token)
- **Schedule:** Every 6 hours (Vercel cron)
- **Purpose:** Main auto-update orchestrator

### `/api/factCheck`
- **Method:** POST
- **Auth:** None (public)
- **Purpose:** Manual fact-checking
- **Used by:** Auto-update system internally

### `/api/aiHeartbeat`
- **Method:** GET or POST
- **Auth:** Optional
- **Schedule:** Hourly (if configured)
- **Purpose:** System health check

---

## 🚦 System Status

### Health Check

```bash
curl https://realitea.org/api/autoUpdate
```

**Success Response:**
```json
{
  "success": true,
  "stats": {
    "processed": 25,
    "saved": 12,
    "rejected": 10,
    "errors": 3
  }
}
```

**Failure Response:**
```json
{
  "success": false,
  "error": "OpenAI API key not configured",
  "stats": {...}
}
```

---

## 🔗 Related Documentation

- **FactCheck API:** `FACTCHECK_API.md`
- **System Health Check:** `SYSTEM_HEALTH_REPORT.md`
- **Deployment Guide:** `DEPLOYMENT_SUCCESS.md`
- **Vercel Cron Docs:** https://vercel.com/docs/cron-jobs

---

## 📞 Support

### Common Issues

1. **"OpenAI API key not configured"**
   - Add `OPENAI_API_KEY` to Vercel env vars

2. **"Firestore not initialized"**
   - Check Firebase credentials in env vars

3. **"No articles fetched"**
   - Verify `NEWS_API_KEY` is valid
   - Check API rate limits

### Get Help

- **Vercel Support:** https://vercel.com/support
- **Firebase Support:** https://firebase.google.com/support
- **OpenAI Support:** https://help.openai.com

---

## 🎯 Success Metrics

After 1 week of running:
- ✅ 40-80 new events added
- ✅ 20-40 events rejected (quality control working)
- ✅ 0.7+ average credibility score
- ✅ <5% error rate

After 1 month:
- ✅ 150-300 new events
- ✅ Rich, diverse event coverage
- ✅ High-quality, verified content
- ✅ Automated system running smoothly

---

## 📝 Changelog

### v1.0.0 (2025-10-16)
- ✅ Initial release
- ✅ Multi-source fetching (NewsAPI, GDELT, Wikipedia)
- ✅ AI-powered verification (OpenAI GPT-4-mini)
- ✅ Credibility scoring system
- ✅ Automatic validation (0.6 threshold, 2+ sources)
- ✅ Firestore integration
- ✅ Vercel cron support
- ✅ Detailed logging
- ✅ Weekly email summaries (placeholder)

---

**System:** RealTea AI Auto-Update v1.0  
**Endpoint:** `/api/autoUpdate`  
**Schedule:** Every 6 hours  
**Status:** ✅ Active (after deployment)  
**Last Updated:** October 16, 2025

