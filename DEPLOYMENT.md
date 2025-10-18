# Deployment Guide for Vercel

## Prerequisites
1. A [Vercel](https://vercel.com) account
2. Firebase project with Authentication and Firestore enabled
3. Your Firebase configuration values

## Environment Variables Setup

### Step 1: Create `.env.local` locally
Copy `.env.example` to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Firebase values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123XYZ
```

### Step 2: Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project settings
4. Scroll down to "Your apps" section
5. Click on your web app or create one
6. Copy the config values

## Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import Project in Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your Git repository

3. **Configure Environment Variables**
   - In the project setup, go to "Environment Variables"
   - Add each `NEXT_PUBLIC_FIREBASE_*` variable
   - Values should match your `.env.local` file
   - Make sure to add them for "Production", "Preview", and "Development" environments

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Add Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
   vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
   vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Firebase Configuration for Production

### Enable Authentication
1. Go to Firebase Console → Authentication
2. Enable "Email/Password" sign-in method
3. Enable "Google" sign-in method
4. Add your Vercel domain to authorized domains:
   - Click "Settings" tab in Authentication
   - Scroll to "Authorized domains"
   - Add your Vercel domain (e.g., `your-app.vercel.app`)

### Configure Firestore Rules
1. Go to Firebase Console → Firestore Database
2. Click "Rules" tab
3. Update your security rules (example):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events collection - read for all, write for authenticated users
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    
    // Pending events - write for authenticated users
    match /pendingEvents/{eventId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && request.auth.token.email == resource.data.author;
    }
  }
}
```

## Post-Deployment Checklist

- [ ] Environment variables are set in Vercel
- [ ] Firebase Authentication is enabled (Email/Password and Google)
- [ ] Vercel domain is added to Firebase authorized domains
- [ ] Firestore security rules are configured
- [ ] Test login functionality on production
- [ ] Test event submission on production
- [ ] Verify dark/light mode works
- [ ] Check mobile responsiveness

## Testing Locally Before Deployment

Run these commands to ensure everything works:

```bash
# Install dependencies
npm install

# Test build
npm run build

# Test production build locally
npm run start
```

## Troubleshooting

### Build Errors
- Make sure all environment variables are set
- Check for console errors in build logs
- Verify Firebase SDK versions are compatible

### Authentication Issues
- Verify domain is added to Firebase authorized domains
- Check that environment variables are correct
- Ensure Firebase project has billing enabled (if required)

### Deployment Issues
- Check Vercel build logs for specific errors
- Verify next.config.js is correctly configured
- Make sure .gitignore doesn't block necessary files

## Performance Optimization

Your app is already optimized with:
- ✅ SWC minification enabled
- ✅ Image optimization configured
- ✅ Console logs removed in production
- ✅ React strict mode enabled
- ✅ SSR-compatible Firebase initialization

## Support

For issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Check [Next.js Documentation](https://nextjs.org/docs)
- Check [Firebase Documentation](https://firebase.google.com/docs)
