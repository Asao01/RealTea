# RealTea Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Firebase Project**: Active Firebase project with Firestore enabled
3. **API Keys**: OpenAI API key and NewsAPI key

---

## Step 1: Environment Variables Setup

### Create `.env.local` file

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ (Settings) → Project Settings
4. Scroll to "Your apps" section
5. Click on your web app or create one
6. Copy the config values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Get API Keys

**OpenAI API Key:**
1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy and add to `.env.local`:
```env
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
OPENAI_API_KEY=sk-...
```

**NewsAPI Key:**
1. Go to [newsapi.org](https://newsapi.org/register)
2. Sign up for free account
3. Copy API key:
```env
NEWS_API_KEY=abc123...
```

---

## Step 2: Test Build Locally

Before deploying, ensure the project builds successfully:

```bash
npm run build
```

If you see errors:
- Check all environment variables are set
- Ensure Firebase config is correct
- Verify API keys are valid

Test the production build locally:

```bash
npm run start
```

Visit `http://localhost:3000` to verify everything works.

---

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd realtea-timeline
vercel
```

4. **Follow the prompts:**
   - Set up and deploy? **Yes**
   - Which scope? **Select your account**
   - Link to existing project? **No** (first time)
   - Project name? **realtea-timeline**
   - Directory? **./  (press Enter)**
   - Override settings? **No**

5. **Set Environment Variables:**
```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# Paste your value when prompted
# Repeat for all environment variables
```

Or use the Vercel dashboard to add them all at once.

6. **Deploy to Production:**
```bash
vercel --prod
```

### Option B: Deploy via GitHub (Alternative)

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/realtea-timeline.git
git push -u origin main
```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select "Import Git Repository"
   - Choose your GitHub repo
   - Click "Import"

3. **Configure Project:**
   - Framework Preset: **Next.js**
   - Root Directory: **./  (leave as default)**
   - Build Command: **npm run build**
   - Output Directory: **.next**

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add all variables from `.env.local`
   - Click "Deploy"

---

## Step 4: Configure Firebase for Production

### Update Firestore Security Rules

1. Go to Firebase Console → Firestore Database → Rules
2. Update rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read access for events
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users
    }
    
    // System status (public read, admin write)
    match /system/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. **Publish** the rules

### Add Authorized Domains

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel domain:
   - `realtea-timeline.vercel.app`
   - Your custom domain (if applicable)

---

## Step 5: Setup Cron Jobs

### Configure Vercel Cron

The `vercel.json` file already includes cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/updateDailyNews",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/fetchHistory",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

This will:
- Update news every 6 hours
- Fetch historical events weekly (Sundays at 2 AM)

**Note:** Cron jobs require a **Pro** Vercel plan. On the free tier, you can:
- Manually trigger endpoints via browser
- Use external services like [cron-job.org](https://cron-job.org)
- Set up GitHub Actions to hit your API routes

---

## Step 6: Post-Deployment Checks

### 1. Verify Deployment

Visit your deployment URL (e.g., `https://realtea-timeline.vercel.app`)

**Check:**
- ✅ Home page loads
- ✅ Breaking news ticker appears
- ✅ Timeline shows events
- ✅ Map displays with markers
- ✅ No console errors (F12)

### 2. Test API Routes

Visit these URLs to verify APIs work:
- `https://your-domain.vercel.app/api/updateDailyNews`
- `https://your-domain.vercel.app/api/fetchHistory`

Check browser console for logs.

### 3. Verify Firebase Connection

Open browser console and look for:
```
✅ [HOME] Real-time update: X events fetched
✅ [TIMELINE] Timeline loaded X events
✅ [MAP] Plotted X events on map
```

### 4. Test Real-time Updates

1. Add an event manually via `/submit`
2. Watch it appear on Timeline and Home page
3. Verify onSnapshot listeners are working

---

## Step 7: Custom Domain (Optional)

### Add Custom Domain

1. **Purchase Domain:**
   - Namecheap, Google Domains, Cloudflare, etc.
   - Suggested: `realtea.world` or `realtea.app`

2. **Add to Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Click "Add"
   - Enter your domain (e.g., `realtea.world`)
   - Follow DNS configuration instructions

3. **Update DNS Records:**

Add these records at your domain registrar:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. **Wait for DNS Propagation:**
   - Usually takes 5-60 minutes
   - Check status in Vercel dashboard

5. **Update Firebase:**
   - Add your custom domain to Firebase authorized domains

---

## Troubleshooting

### Build Errors

**Error:** "Firebase is not initialized"
- ✅ Check all `NEXT_PUBLIC_FIREBASE_*` variables are set in Vercel
- ✅ Verify no typos in environment variable names

**Error:** "OpenAI API error"
- ✅ Check `OPENAI_API_KEY` is set
- ✅ Verify API key is valid and has credits

**Error:** "Module not found"
- ✅ Run `npm install` locally
- ✅ Commit `package-lock.json`
- ✅ Redeploy

### Runtime Errors

**Firestore connection fails:**
- ✅ Check Firebase security rules
- ✅ Verify domain is in authorized domains list
- ✅ Check browser console for specific error

**Map not loading:**
- ✅ Leaflet CSS is imported in `WorldMap.js`
- ✅ Check for JavaScript errors in console
- ✅ Verify events have valid coordinates

**Breaking news ticker empty:**
- ✅ Run `/api/updateDailyNews` to fetch news
- ✅ Check Firestore for events with `isBreaking: true`
- ✅ Verify NewsAPI key is valid

### Performance Issues

**Slow loading:**
- ✅ Enable compression in Vercel (automatic)
- ✅ Use Edge Functions for API routes
- ✅ Check Firestore query indexes

**Map lag:**
- ✅ Reduce number of visible markers
- ✅ Ensure clustering is enabled
- ✅ Use year/category filters

---

## Monitoring & Analytics

### Vercel Analytics

1. Go to Vercel Dashboard → Your Project → Analytics
2. View:
   - Page views
   - Load times
   - User locations
   - Error rates

### Firebase Usage

1. Go to Firebase Console → Usage
2. Monitor:
   - Firestore reads/writes
   - Bandwidth
   - Storage

### Cost Estimation

**Free Tier Limits:**
- Vercel: 100GB bandwidth, unlimited deployments
- Firebase: 50K reads/day, 20K writes/day
- OpenAI: Pay-per-use (~$5-10/month)
- NewsAPI: Free tier (100 requests/day)

**Expected Monthly Cost:**
- $0 (if within free tiers)
- OpenAI: ~$5-10 (AI summaries)

---

## Next Steps

### Enhancements

1. **SEO Optimization:**
   - Add meta tags
   - Generate sitemap
   - Submit to Google Search Console

2. **PWA Support:**
   - Add service worker
   - Enable offline mode
   - Add app manifest

3. **Performance:**
   - Image optimization
   - Code splitting
   - Lazy loading

4. **Features:**
   - User accounts
   - Event submissions
   - Comments/discussions
   - Social sharing

---

## Support

**Documentation:**
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)

**Issues:**
- Check browser console for errors
- Review Vercel deployment logs
- Check Firebase security rules

---

## ✅ Deployment Checklist

- [ ] `.env.local` created with all credentials
- [ ] `npm run build` succeeds locally
- [ ] Vercel project created
- [ ] Environment variables added to Vercel
- [ ] Deployed to production
- [ ] Firebase authorized domains updated
- [ ] Firestore security rules configured
- [ ] Cron jobs configured (if Pro plan)
- [ ] Site tested and working
- [ ] Custom domain added (optional)
- [ ] Analytics enabled

---

**🎉 Congratulations! RealTea is now live!**

Visit your site at: `https://realtea-timeline.vercel.app`

Or your custom domain: `https://realtea.world`

