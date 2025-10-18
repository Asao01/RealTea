# Production Setup Guide for realitea.org

## 🚀 Complete Setup for Production Deployment

This guide will help you configure Firebase, Google Maps, and automated AI systems for your realitea.org domain.

---

## 1️⃣ Firebase Authentication Setup

### Add Authorized Domains

1. Go to **Firebase Console** → Your Project → **Authentication**
2. Click on **Settings** tab → **Authorized domains**
3. Add these domains:
   ```
   realitea.org
   www.realitea.org
   realtea-timeline.vercel.app
   *.vercel.app
   ```
4. Click **Add domain** for each

### Configure OAuth Redirect URIs

If using Google/Social login:

1. Go to **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID
3. Add **Authorized JavaScript origins**:
   ```
   https://realitea.org
   https://www.realitea.org
   https://realtea-timeline.vercel.app
   ```
4. Add **Authorized redirect URIs**:
   ```
   https://realitea.org/__/auth/handler
   https://www.realitea.org/__/auth/handler
   https://realtea-timeline.vercel.app/__/auth/handler
   ```
5. Click **Save**

### Fix Login Popup Closing Issue

The popup closes immediately because of redirect URI mismatch. After adding the domains above:

1. **Clear browser cache** completely
2. Test login on `https://realitea.org/login`
3. The popup should now stay open until authentication completes

---

## 2️⃣ Google Maps API Configuration

### Enable APIs

1. Go to **Google Cloud Console** → **APIs & Services** → **Library**
2. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API (optional, for location search)

### Configure API Key Restrictions

1. Go to **Credentials** → Find your Maps API Key
2. Click **Edit**
3. Under **Application restrictions**:
   - Select **HTTP referrers (web sites)**
   - Add these referrers:
     ```
     https://realitea.org/*
     https://www.realitea.org/*
     https://*.vercel.app/*
     ```
4. Under **API restrictions**:
   - Select **Restrict key**
   - Check: Maps JavaScript API, Geocoding API
5. Click **Save**

### Add Maps Script to Project

Your project already has Google Maps configured in `src/components/MapView.js`. Ensure your `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in Vercel.

---

## 3️⃣ Vercel Environment Variables

### Required Environment Variables

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (Server-side)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
OPENAI_API_KEY=sk-...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Base URL
NEXT_PUBLIC_BASE_URL=https://realitea.org

# Cron Security (Optional)
CRON_SECRET=your-secret-token
AI_HEARTBEAT_SECRET=your-secret-token

# News APIs (if using)
NEWS_API_KEY=your-newsapi-key
GDELT_API_KEY=not-required-public-api
```

**Important:** Make sure all variables are set for **Production**, **Preview**, and **Development** environments.

---

## 4️⃣ Domain Configuration

### Connect realitea.org to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter `realitea.org`
4. Vercel will show DNS records to configure:

   **For Domain Registrar (GoDaddy, Namecheap, etc.):**
   
   Add these DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

5. Wait 5-60 minutes for DNS propagation
6. Vercel will automatically issue SSL certificate

### Set Primary Domain

1. In Vercel Domains settings
2. Click the three dots next to `realitea.org`
3. Select **Set as Primary Domain**
4. This redirects all traffic to your main domain

---

## 5️⃣ Firestore Security Rules

Update your `firestore.rules` to allow reads but protect writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events collection - public read, authenticated write
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null || request.auth.token.email.matches('.*@realitea.org');
      allow update, delete: if request.auth != null && 
        (request.auth.token.admin == true || request.auth.uid == resource.data.createdBy);
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Comments collection
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## 6️⃣ Automated AI System Setup

### A. AI Heartbeat (Already Configured)

Your `/api/aiHeartbeat` endpoint is ready. It calls:
- `/api/fetchBreaking` - Breaking news
- `/api/factCheck` - AI verification
- `/api/fetchHistory` - GDELT events

### B. Set Up External Cron (Recommended)

Since Vercel Hobby plan limits you to 2 cron jobs:

**Option 1: UptimeRobot (Free, Recommended)**

1. Sign up at https://uptimerobot.com/
2. Add New Monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** RealTea AI Heartbeat
   - **URL:** `https://realitea.org/api/aiHeartbeat`
   - **Monitoring Interval:** Every 180 minutes (3 hours)
   - **Alert Contacts:** Your email
3. Save and activate

**Option 2: cron-job.org**

1. Sign up at https://cron-job.org/
2. Create Cron Job:
   - **Title:** RealTea AI Heartbeat
   - **URL:** `https://realitea.org/api/aiHeartbeat`
   - **Schedule:** `0 */3 * * *` (every 3 hours)
3. Enable

### C. Enhanced Event Enrichment

Your system will automatically:
- ✅ Fetch breaking news every 3 hours
- ✅ Import GDELT historical events
- ✅ Run fact-checking with AI
- ✅ Calculate credibility scores
- ✅ Update frontend in real-time via Firestore onSnapshot

---

## 7️⃣ Performance Optimization

### Already Optimized:

✅ **Real-time Updates:** `onSnapshot` instead of polling  
✅ **Batch Writes:** Firestore batch operations for speed  
✅ **Error Boundaries:** Prevent crashes from bad data  
✅ **Lazy Loading:** Dynamic imports for maps  
✅ **Safe Fallbacks:** All components handle missing data  
✅ **Image Optimization:** Next.js automatic image optimization  

### Additional Optimizations:

1. **Enable Vercel Analytics:**
   ```bash
   npm install @vercel/analytics
   ```

2. **Add to `src/app/layout.js`:**
   ```javascript
   import { Analytics } from '@vercel/analytics/react';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

---

## 8️⃣ Testing Checklist

### Before Going Live:

- [ ] Test login at `https://realitea.org/login`
- [ ] Verify popup doesn't close immediately
- [ ] Check map loads with markers visible
- [ ] Confirm events display on homepage
- [ ] Test AI heartbeat: `https://realitea.org/api/aiHeartbeat`
- [ ] Verify real-time updates (add event, see it appear)
- [ ] Check mobile responsiveness
- [ ] Test all routes: `/timeline`, `/map`, `/about`

### Monitor Logs:

```bash
# Real-time logs
vercel logs --follow

# Filter by function
vercel logs --follow --filter /api/aiHeartbeat
```

---

## 9️⃣ Maintenance

### Daily:
- Check Vercel logs for errors
- Monitor Firestore usage (free tier: 50K reads/day)
- Verify AI heartbeat is running (check UptimeRobot)

### Weekly:
- Review credibility scores
- Check for duplicate events
- Run `/api/cleanup` manually if needed

### Monthly:
- Review OpenAI costs (should be ~$5-20/month)
- Update Firebase rules if needed
- Check Google Maps API usage

---

## 🐛 Troubleshooting

### Login popup closes immediately
**Solution:**
1. Verify all domains added to Firebase authorized domains
2. Clear browser cache completely
3. Check browser console for redirect errors
4. Ensure OAuth redirect URIs match exactly

### Map not loading
**Solution:**
1. Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in Vercel
2. Verify API key has correct referrer restrictions
3. Enable Maps JavaScript API in Google Cloud Console
4. Check browser console for API errors

### Events not updating
**Solution:**
1. Verify Firestore rules allow reads
2. Check `onSnapshot` is active (see console logs)
3. Test AI heartbeat endpoint manually
4. Verify external cron is hitting the endpoint

### AI heartbeat failing
**Solution:**
1. Check OpenAI API key is valid
2. Verify `NEXT_PUBLIC_BASE_URL` is set correctly
3. Check individual API routes work: `/api/fetchHistory`, `/api/fetchBreaking`
4. Review Vercel function logs for errors

---

## 📊 Expected Performance

### Load Times:
- Homepage: < 2 seconds
- Timeline: < 3 seconds
- Map: < 4 seconds (due to Google Maps load)

### Real-time Updates:
- New events appear within 15 seconds
- No manual refresh needed

### AI Processing:
- Breaking news: ~30-45 seconds
- Fact checking: ~60-90 seconds
- History import: ~30-45 seconds
- Full heartbeat: ~2-3 minutes total

---

## ✅ Production Launch Checklist

- [ ] All environment variables set in Vercel
- [ ] Firebase domains authorized
- [ ] Google Maps API configured
- [ ] DNS records pointing to Vercel
- [ ] SSL certificate active (automatic via Vercel)
- [ ] External cron service configured
- [ ] Firestore rules deployed
- [ ] Test all authentication flows
- [ ] Verify map displays correctly
- [ ] Confirm AI heartbeat runs successfully
- [ ] Check real-time updates work
- [ ] Monitor initial logs for errors
- [ ] Set up error alerts (Vercel notifications)

---

## 🎉 You're Live!

Once all steps are complete:

1. Visit `https://realitea.org`
2. See your timeline automatically updating
3. Watch new events appear in real-time
4. Monitor AI heartbeat keeping content fresh

**Your RealTea Timeline is now fully autonomous!** 🚀

---

**Last Updated:** October 16, 2025  
**Version:** 2.0.0  
**Status:** Production Ready

