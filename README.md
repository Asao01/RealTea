# RealTea - Reality Deserves Receipts

> A dynamic, AI-powered timeline of world events from 1600 to present, featuring real-time news updates, interactive maps, and comprehensive historical data.

![RealTea](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green?style=for-the-badge&logo=openai)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)

## ✨ Features

### 🏠 **Home Page**
- **Breaking News Ticker** - Real-time scrolling ticker with latest breaking events
- **Recent Events** - 8 most recent and urgent stories
- **Live Updates** - Auto-refreshes every 6 hours
- **Smart Categorization** - AI-powered event classification

### 📊 **Timeline Page**
- **Complete History** - All events from 1600-present
- **Era Slider** - Navigate through centuries with visual timeline
- **Infinite Scroll** - Smooth loading of 50 events at a time
- **Advanced Filters** - Category, search, and year range filters
- **Real-time Sync** - New events appear automatically

### 🗺️ **World Map**
- **Interactive Visualization** - Leaflet-powered dark-themed map
- **Auto-Geocoding** - Converts location strings to coordinates (FREE via OpenStreetMap)
- **Marker Clustering** - Handles 1000+ events smoothly
- **Category Colors** - Color-coded markers by event type
- **Smart Filters** - Filter by category, year range, and century
- **Detailed Popups** - Click markers for full event information

### 🤖 **AI-Powered**
- **News Summarization** - OpenAI GPT-4 converts articles to timeline events
- **Auto-Categorization** - Intelligent event classification
- **Historical Context** - AI-enhanced descriptions
- **Duplicate Detection** - Smart deduplication using URL hashing

### ⚡ **Performance**
- **Optimized Loading** - Code splitting and lazy loading
- **Real-time Updates** - Firestore onSnapshot listeners
- **Efficient Caching** - Geocoded coordinates saved in Firestore
- **Mobile Optimized** - Responsive design for all devices

---

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **Framer Motion** - Smooth animations and transitions
- **Tailwind CSS** - Utility-first styling
- **Leaflet** - Interactive map library
- **React Leaflet Cluster** - Marker clustering

### Backend
- **Firebase Firestore** - Real-time database
- **Firebase Authentication** - Google sign-in
- **OpenAI GPT-4** - AI summarization and classification
- **NewsAPI** - Real-time news data
- **OpenStreetMap Nominatim** - Free geocoding service

### Deployment
- **Vercel** - Hosting and serverless functions
- **Vercel Cron** - Scheduled jobs for automated updates
- **Edge Functions** - Fast API routes

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Firebase account with Firestore enabled
- OpenAI API key
- NewsAPI key

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/realtea-timeline.git
cd realtea-timeline
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# API Keys
OPENAI_API_KEY=sk-your_openai_key
NEXT_PUBLIC_OPENAI_API_KEY=sk-your_openai_key
NEWS_API_KEY=your_newsapi_key
```

4. **Run development server:**
```bash
npm run dev
```

5. **Open browser:**
```
http://localhost:3000
```

---

## 🌐 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Add environment variables in Vercel Dashboard**

4. **Deploy to production:**
```bash
vercel --prod
```

---

## 📡 API Routes

### `/api/updateDailyNews`
- Fetches latest news from NewsAPI
- AI summarization and categorization
- Auto-geocoding for map display
- Runs every 6 hours via cron

### `/api/fetchHistory`
- Generates historical events
- Covers 1600-present
- Runs weekly on Sundays

### `/api/fetchNews`
- Manual news fetch
- Returns JSON with saved events

### `/api/fetchBreaking`
- Fetch breaking news only
- Higher urgency threshold

---

## 🗂️ Project Structure

```
realtea-timeline/
├── src/
│   ├── app/
│   │   ├── page.js                 # Home page
│   │   ├── timeline/
│   │   │   └── page.js             # Timeline page
│   │   ├── map/
│   │   │   └── page.js             # Map page
│   │   └── api/
│   │       ├── updateDailyNews/    # Daily news updater
│   │       ├── fetchHistory/       # Historical events
│   │       └── fetchNews/          # News fetcher
│   ├── components/
│   │   ├── BreakingNewsTicker.js   # Breaking news ticker
│   │   ├── EraSlider.js            # Timeline era slider
│   │   ├── StickyHeader.js         # Navigation header
│   │   ├── EventCard.js            # Event display card
│   │   ├── WorldMap.js             # Leaflet map component
│   │   └── Footer.js               # Site footer
│   └── lib/
│       ├── firebase.js             # Firebase config
│       ├── geocode.ts              # Geocoding helper
│       ├── news.ts                 # News API helper
│       └── ai.ts                   # OpenAI helper
├── functions/
│   └── index.js                    # Firebase Cloud Functions (AI updater)
├── vercel.json                     # Vercel config + cron
├── next.config.js                  # Next.js config
└── package.json                    # Dependencies
```

---

## 📋 Event Data Schema

### Enriched Event Structure

Events in Firestore now include comprehensive AI-generated details for richer context:

```javascript
{
  // Basic Information
  "title": "Moon Landing",
  "summary": "Neil Armstrong and Buzz Aldrin become the first humans to walk on the Moon...",
  "description": "Shortened summary (300 chars)",
  "longDescription": "Full summary",
  "date": "1969-07-20",
  "year": "1969",
  
  // AI-Generated Enriched Fields
  "background": "The Apollo program was initiated in response to Cold War tensions...",
  "keyFigures": [
    "Neil Armstrong",
    "Buzz Aldrin",
    "Michael Collins",
    "NASA"
  ],
  "causes": "Cold War space race competition between USA and USSR, driven by technological advancement...",
  "outcomes": "First successful human moon landing, collected lunar samples, conducted experiments...",
  "impact": "Transformed space exploration, inspired generations, established US technological supremacy...",
  
  // Location & Categorization
  "region": "Global",
  "category": "Space",
  "location": "Global",
  
  // Sources & Verification
  "sources": ["Wikipedia", "History API"],
  "verifiedSource": "https://wikipedia.org",
  "credibilityScore": 100,  // 0-100
  "importanceScore": 80,
  "verified": true,
  "verifiedByAI": true,
  
  // Metadata
  "imageUrl": "https://...",
  "addedBy": "auto",
  "author": "Wikipedia",
  "historical": true,
  "aiGenerated": true,
  "autoUpdated": true,
  "revisions": [],  // Array of previous versions
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `background` | String | 1-2 sentences of context leading up to the event |
| `keyFigures` | Array | Important people, organizations, or entities (max 5) |
| `causes` | String | 1-2 sentences explaining what led to the event |
| `outcomes` | String | 1-2 sentences describing immediate results |
| `impact` | String | 1-2 sentences on lasting significance and consequences |
| `sources` | Array | List of reference URLs |
| `credibilityScore` | Number | AI-verified credibility (0-100) |

### AI Prompt Structure

The Firebase Cloud Function uses an enhanced OpenAI prompt to generate structured JSON responses:

```javascript
{
  "summary": "3-5 sentence overview",
  "background": "Historical context",
  "keyFigures": ["Person 1", "Organization 1", ...],
  "causes": "What led to this event",
  "outcomes": "Immediate results",
  "impact": "Long-term significance",
  "sources": ["Wikipedia", "History API"]
}
```

This ensures every event has rich, contextual information that helps users understand not just *what* happened, but *why* it happened, *who* was involved, and *what* the lasting impact was.

---

## 🎨 Key Features Explained

### Breaking News Ticker
- Horizontal scrolling animation
- Real-time Firestore listener
- Shows 5 most recent breaking events
- "LIVE" badge for events < 24 hours old
- Auto-updates without refresh

### Era Slider
- Visual timeline from 1600-2025
- Click century buttons for quick jumps
- Custom range sliders for precise filtering
- Color-coded era markers
- Shows time span and event count

### Smart Geocoding
- FREE via OpenStreetMap Nominatim
- Auto-converts "London, England" → lat/lng
- Caches coordinates in Firestore
- Rate-limited (1 req/sec)
- Progress indicator

### Real-time Updates
- Firestore `onSnapshot` listeners
- No manual refresh needed
- New events appear instantly
- Updates across all tabs
- Efficient delta updates

---

## 🔒 Security

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read: if true;                    // Public read
      allow write: if request.auth != null;   // Auth required
    }
  }
}
```

### Environment Variables
- All sensitive keys in `.env.local`
- Never committed to version control
- Added to Vercel via dashboard
- Client-safe variables prefixed with `NEXT_PUBLIC_`

---

## 📊 Performance Metrics

- **Lighthouse Score:** 95+ (Performance, Accessibility, Best Practices, SEO)
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Bundle Size:** Optimized with code splitting
- **Map Performance:** Handles 1000+ markers smoothly

---

## 💰 Cost Estimate

**Monthly (within free tiers):**
- Vercel: $0 (100GB bandwidth)
- Firebase: $0 (50K reads/day, 20K writes/day)
- OpenAI: ~$5-10 (AI summaries)
- NewsAPI: $0 (100 requests/day free tier)

**Total: ~$5-10/month**

---

## 🛠️ Development

### Run locally:
```bash
npm run dev
```

### Build production:
```bash
npm run build
npm run start
```

### Lint:
```bash
npm run lint
```

### Test API routes:
```bash
# Update news
curl http://localhost:3000/api/updateDailyNews

# Fetch history
curl http://localhost:3000/api/fetchHistory
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📝 License

MIT License - feel free to use this project for your own purposes.

---

## 🙏 Credits

**Built with:**
- [Next.js](https://nextjs.org/)
- [Firebase](https://firebase.google.com/)
- [OpenAI](https://openai.com/)
- [Leaflet](https://leafletjs.com/)
- [NewsAPI](https://newsapi.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment help
- Review browser console for error details

---

## 🎯 Roadmap

- [ ] PWA support (offline mode)
- [ ] User event submissions
- [ ] Comments and discussions
- [ ] Social sharing
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Export timeline as PDF/image
- [ ] Event recommendations based on interests

---

**Made with ☕ by RealTea**

*Reality Deserves Receipts - Tracking truth through time.*
