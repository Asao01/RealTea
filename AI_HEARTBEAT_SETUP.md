# AI Heartbeat - Autonomous System Setup

## 🤖 Overview

The AI Heartbeat is an autonomous system coordinator that keeps your RealTea Timeline fresh with verified events. It orchestrates multiple API endpoints in sequence to fetch breaking news, run fact-checks, and import historical events from GDELT.

---

## 📋 What It Does

The `/api/aiHeartbeat` route sequentially calls:

1. **`/api/fetchBreaking`** - Fetches breaking news
2. **`/api/factCheck`** - Runs AI fact-checking on events
3. **`/api/fetchHistory`** - Imports historical events from GDELT

Each step is independent - if one fails, the others continue.

---

## 🚀 Setup Options

### Option 1: Vercel Cron Job (Recommended if under 2 job limit)

Since you're on Vercel Hobby plan with a 2-cron-job limit, and you already have 2 crons configured (`fetchHistory` and `cleanup`), you have two choices:

**A. Replace one of your existing crons with aiHeartbeat:**

Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/aiHeartbeat",
      "schedule": "0 */3 * * *"
    },
    {
      "path": "/api/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**B. Keep your existing setup and use Option 2**

### Option 2: External Cron Service (Current Recommendation)

Use a free external service to ping the aiHeartbeat endpoint every 3 hours:

#### **UptimeRobot** (Free - Recommended)
1. Go to https://uptimerobot.com/
2. Create account
3. Add New Monitor:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `RealTea AI Heartbeat`
   - URL: `https://realtea-timeline-n25k1swv2-asao01s-projects.vercel.app/api/aiHeartbeat`
   - Monitoring Interval: **Every 3 hours** (180 minutes)
4. Save!

#### **cron-job.org** (Alternative)
1. Go to https://cron-job.org/
2. Sign up
3. Create New Cron Job:
   - Title: `RealTea AI Heartbeat`
   - URL: `https://realtea-timeline-n25k1swv2-asao01s-projects.vercel.app/api/aiHeartbeat`
   - Schedule: Every 3 hours (`0 */3 * * *`)
4. Enable!

#### **EasyCron** (Alternative)
1. Go to https://www.easycron.com/
2. Sign up for free
3. Add Cron Job:
   - URL: `https://realtea-timeline-n25k1swv2-asao01s-projects.vercel.app/api/aiHeartbeat`
   - Interval: Every 3 hours
4. Activate!

---

## 🔐 Security (Optional)

To prevent abuse, set an environment variable in Vercel:

```bash
CRON_SECRET=your-secret-token-here
```

Then configure your external cron service to send:
```
Authorization: Bearer your-secret-token-here
```

**Without this:** The endpoint is publicly accessible (fine for most use cases)  
**With this:** Only requests with the correct token will succeed

---

## ✅ Real-Time Updates

The frontend automatically updates when new events are added:

### Homepage (`src/app/page.js`)
✅ Already using `onSnapshot` - updates every 15 seconds automatically

### Timeline (`src/components/Timeline.js`)  
✅ Already using `onSnapshot` - updates in real-time

### Map (`src/components/MapView.js`)
✅ Already using `onSnapshot` - markers update automatically

**No manual refresh needed!** When the AI Heartbeat adds new events to Firestore, the frontend sees them immediately.

---

## 🧪 Testing

### Manual Test
Visit your endpoint directly:
```
https://realtea-timeline-n25k1swv2-asao01s-projects.vercel.app/api/aiHeartbeat
```

### Expected Response
```json
{
  "success": true,
  "timestamp": "2025-10-16T08:42:00.000Z",
  "durationSeconds": 45.23,
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  },
  "results": [
    {
      "step": "fetchBreaking",
      "success": true,
      "data": { "processed": 50, "saved": 45 }
    },
    {
      "step": "factCheck",
      "success": true,
      "data": { "analyzed": 10 }
    },
    {
      "step": "fetchHistory",
      "success": true,
      "data": { "processed": 50, "saved": 48 }
    }
  ]
}
```

### Check Logs
```bash
vercel logs --follow
```

Look for:
```
🤖 ===== AI HEARTBEAT STARTED =====
📰 [1/3] Fetching breaking news...
✅ Breaking news updated
🔍 [2/3] Running fact-check...
♻️ Fact-check complete
🕐 [3/3] Fetching historical events...
🕐 Historical events refreshed
🤖 AI HEARTBEAT COMPLETE
✅ Success: 3/3
```

---

## 📊 Monitoring

### Check Homepage
Visit your site and verify events are updating:
```
https://realtea-timeline-n25k1swv2-asao01s-projects.vercel.app/
```

You should see:
- Fresh events every 3 hours
- Live update indicator showing "Updated X minutes ago"
- Diverse mix of categories

### Firestore Console
Check your Firebase Console to see new events being added in real-time.

---

## 🔧 Customization

### Change Frequency

Edit the schedule in your external cron service:
- Every hour: `0 * * * *`
- Every 2 hours: `0 */2 * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 9 AM: `0 9 * * *`

### Add More Steps

Edit `src/app/api/aiHeartbeat/route.js` and add:

```javascript
// 4️⃣ YOUR NEW STEP
console.log('\n🎯 [4/4] Running custom step...');
try {
  const response = await fetch(`${baseUrl}/api/yourNewEndpoint`);
  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Custom step complete');
    results.push({ step: 'yourNewEndpoint', success: true, data });
  }
} catch (error) {
  console.error('❌ Custom step failed:', error.message);
  results.push({ step: 'yourNewEndpoint', success: false, error: error.message });
}
```

### Adjust Timeouts

Each API call has a timeout to prevent hanging:
- Breaking news: 60 seconds
- Fact check: 120 seconds (AI processing takes longer)
- History fetch: 60 seconds

To change:
```javascript
signal: AbortSignal.timeout(90000) // 90 seconds
```

---

## 🐛 Troubleshooting

### Issue: Heartbeat times out
**Solution:** Individual steps have timeouts, but the overall route has a 5-minute max (Vercel limit). Increase individual step timeouts or reduce work per call.

### Issue: "Base URL not found"
**Solution:** Set `NEXT_PUBLIC_BASE_URL` in Vercel environment variables:
```
NEXT_PUBLIC_BASE_URL=https://realtea-timeline-n25k1swv2-asao01s-projects.vercel.app
```

### Issue: One step fails but others work
**Solution:** This is expected! Each step is independent. Check logs to see which failed and why.

### Issue: Frontend not updating
**Solution:** 
1. Check browser console - should see `onSnapshot` log messages
2. Verify Firestore rules allow reads
3. Hard refresh (Ctrl+Shift+R)

---

## 📈 Performance

- **Execution Time:** ~30-60 seconds (depends on API response times)
- **Cost:** Free (within Vercel Hobby plan limits)
- **External Pings:** Free (UptimeRobot, cron-job.org have free tiers)
- **OpenAI Costs:** Minimal (only factCheck uses AI, ~$0.01-0.05 per run)

---

## 🎯 Current Status

✅ **Endpoint Created:** `/api/aiHeartbeat`  
✅ **Real-time Sync:** `onSnapshot` active on Homepage, Timeline, and Map  
✅ **Safe Fallbacks:** All components handle missing data gracefully  
✅ **Error Boundaries:** Frontend won't crash on errors  
✅ **GDELT Integration:** Historical events from global news database  

**Next Step:** Set up external cron service (UptimeRobot recommended) to call `/api/aiHeartbeat` every 3 hours!

---

## 📚 API Endpoints Referenced

| Endpoint | Description | Frequency |
|----------|-------------|-----------|
| `/api/aiHeartbeat` | Orchestrates all steps | Every 3 hours |
| `/api/fetchBreaking` | Breaking news from APIs | Called by heartbeat |
| `/api/factCheck` | AI fact-checking | Called by heartbeat |
| `/api/fetchHistory` | GDELT historical events | Called by heartbeat |
| `/api/cleanup` | Database maintenance | Daily at 2 AM (Vercel cron) |

---

**Created:** October 16, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
