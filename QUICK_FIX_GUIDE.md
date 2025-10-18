# 🚀 RealTea Quick Fix Guide

## 🔴 CRITICAL FIX #1: Firebase Auth (5 minutes)

**Problem:** Users can't log in - `auth/api-key-not-valid` error

**Solution:**
```bash
# 1. Get the correct API key from Firebase
# Visit: https://console.firebase.google.com/project/reality-3af7f/settings/general

# 2. Update Vercel environment variable
npx vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY production
npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# Paste the API key from Firebase Console

# 3. Redeploy
npx vercel --prod

# 4. Test
# Visit: https://realitea.org/login
# Click "Test Google Sign-In" - should open popup
```

---

## 🔴 CRITICAL FIX #2: Google Maps (10 minutes)

**Problem:** Map page crashes - missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Option A: Get Google Maps API Key (Recommended)
```bash
# 1. Go to Google Cloud Console
# https://console.cloud.google.com/apis/credentials

# 2. Create API key, enable these APIs:
#    - Maps JavaScript API
#    - Geocoding API
#    - Places API

# 3. Add to Vercel
npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
# Paste your API key

# 4. Restrict key to realitea.org domain (security)

# 5. Redeploy
npx vercel --prod
```

### Option B: Use OpenStreetMap (Free, 2 minutes)
```bash
# Maps will work without API key using OpenStreetMap
# Just need to update the map component

# File: src/components/MapView.js
# Change: Google Maps → OpenStreetMap/Leaflet
```

---

## 🟡 HIGH PRIORITY FIX #3: Firestore Index (1 minute)

**Problem:** Query performance warning, some queries may fail

**Solution:**
```bash
# 1. Visit https://realitea.org in browser
# 2. Open Console (F12)
# 3. Look for error with link like:
#    "The query requires an index. You can create it here: https://console.firebase..."
# 4. Click that link
# 5. Click "Create Index"
# 6. Wait 2-5 minutes for index to build
```

Or create manually:
1. Go to: https://console.firebase.google.com/project/reality-3af7f/firestore/indexes
2. Create composite index:
   - Collection: `events`
   - Field 1: `isBreaking` (Ascending)
   - Field 2: `createdAt` (Descending)

---

## 🟡 HIGH PRIORITY FIX #4: History API Error (15 minutes)

**Problem:** `/api/fetchHistory` returns 500 error

**Debug:**
```bash
# Check Vercel logs
npx vercel logs --follow

# Or visit:
# https://vercel.com/asao01s-projects/realtea-timeline/logs

# Look for errors in /api/fetchHistory
```

**Likely Causes:**
1. **Firestore init failure** - Check if Firebase Admin SDK is configured
2. **Missing env var** - May need `FIREBASE_SERVICE_ACCOUNT`
3. **GDELT API issue** - Check if GDELT is accessible

**Test Locally:**
```bash
npm run dev
curl http://localhost:3000/api/fetchHistory | jq .
```

---

## 🟡 MEDIUM PRIORITY FIX #5: AI Heartbeat (20 minutes)

**Problem:** All internal API calls return HTML instead of JSON

**Debug:**
```bash
# Test each endpoint directly
curl https://realitea.org/api/fetchBreaking | jq .
curl https://realitea.org/api/factCheck | jq .
curl https://realitea.org/api/enrichEventFull | jq .

# Check what HTML is being returned
curl https://realitea.org/api/fetchBreaking > response.html
cat response.html
```

**Possible Fixes:**

### Fix 1: Update base URL logic
```javascript
// In: src/app/api/aiHeartbeat/route.js
// Change:
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
               process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
               'http://localhost:3000';

// To:
const protocol = process.env.VERCEL_URL ? 'https' : 'http';
const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';
const baseUrl = `${protocol}://${host}`;
```

### Fix 2: Use relative URLs
```javascript
// Change:
await fetch(`${baseUrl}/api/fetchBreaking`);

// To:
await fetch('/api/fetchBreaking', {
  headers: { 'Content-Type': 'application/json' }
});
```

### Fix 3: Add force-dynamic to all API routes
```javascript
// Add to top of each API route file:
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

---

## 📝 Verification Checklist

After fixes, verify:

- [ ] **Auth:** Login with Google works at https://realitea.org/login
- [ ] **Maps:** Map loads with markers at https://realitea.org/map
- [ ] **Home:** Events display at https://realitea.org
- [ ] **API:** `curl https://realitea.org/api/fetchBreaking` returns JSON
- [ ] **API:** `curl https://realitea.org/api/fetchHistory` returns JSON (not 500)
- [ ] **Heartbeat:** `curl https://realitea.org/api/aiHeartbeat` shows 4/4 success
- [ ] **Console:** No Firestore index errors in browser console

---

## 🔧 Useful Commands

```bash
# Check current environment variables
npx vercel env ls

# Pull environment variables locally
npx vercel env pull .env.local

# Deploy to production
npx vercel --prod

# Check deployment logs
npx vercel logs --follow

# Test API endpoints
curl https://realitea.org/api/fetchBreaking | jq .
curl https://realitea.org/api/fetchHistory | jq .
curl https://realitea.org/api/aiHeartbeat | jq .

# Run health check locally
node scripts/systemHealthCheck.js
```

---

## 📊 Expected Timeline

| Task | Time | Priority |
|------|------|----------|
| Fix Firebase Auth key | 5 min | 🔴 CRITICAL |
| Add Google Maps key | 10 min | 🔴 CRITICAL |
| Create Firestore index | 1 min | 🟡 HIGH |
| Debug History API | 15 min | 🟡 HIGH |
| Fix AI Heartbeat | 20 min | 🟡 MEDIUM |
| **TOTAL** | **~1 hour** | |

---

## 🎯 Success Metrics

After all fixes:
- ✅ Auth success rate: 0% → 100%
- ✅ Map page: Broken → Working
- ✅ API success rate: 50% → 100%
- ✅ AI Heartbeat: 0/4 → 4/4 steps
- ✅ Overall status: DEGRADED → OPERATIONAL

---

## 📞 Need Help?

- **Firebase Issues:** https://firebase.google.com/support
- **Vercel Issues:** https://vercel.com/support
- **Maps Issues:** https://developers.google.com/maps/support

**Health Check Script:** `realtea-timeline/scripts/systemHealthCheck.js`  
**Full Report:** `realtea-timeline/SYSTEM_HEALTH_REPORT.md`  
**Summary:** `realtea-timeline/HEALTH_CHECK_SUMMARY.txt`

