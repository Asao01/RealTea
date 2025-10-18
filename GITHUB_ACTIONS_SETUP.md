# 🚀 GitHub Actions Continuous Deployment Setup

**Complete guide to set up automatic deployments for RealTea**

---

## ✅ What I've Created

I've created **3 GitHub Actions workflows**:

1. **`firebase-hosting-merge.yml`** - Deploy frontend on push to main
2. **`firebase-hosting-pull-request.yml`** - Preview deployments for PRs
3. **`deploy-firebase-functions.yml`** - Deploy Cloud Functions on changes

These workflows will **automatically deploy** whenever you push to GitHub!

---

## 📋 Setup Steps

### **PART 1: Install Git (if not installed)**

1. Download Git for Windows:
   - Visit: https://git-scm.com/download/win
   - Download and install
   - Restart PowerShell after installation

2. Verify installation:
   ```powershell
   git --version
   ```
   Should show: `git version 2.x.x`

---

### **PART 2: Create GitHub Repository**

1. **Visit GitHub:**
   - Go to: https://github.com/new
   - Repository name: `realtea-timeline`
   - Description: "AI-powered historical timeline with enriched event data"
   - Privacy: Public or Private (your choice)
   - **Don't** initialize with README (we have code already)
   - Click: "Create repository"

2. **Copy the repository URL** shown on screen:
   ```
   https://github.com/YOUR-USERNAME/realtea-timeline.git
   ```

---

### **PART 3: Initialize Git and Push**

Open PowerShell in the project folder:

```powershell
cd C:\Users\User\Desktop\Works\realtea-timeline

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial RealTea release with AI-powered enriched events"

# Set main as default branch
git branch -M main

# Add remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/realtea-timeline.git

# Push to GitHub
git push -u origin main
```

---

### **PART 4: Configure GitHub Secrets**

**Navigate to GitHub repository → Settings → Secrets and variables → Actions**

Click **"New repository secret"** for each of these:

#### **Firebase Configuration Secrets:**

1. `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value: From your `.env.local` file

2. `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - Value: From your `.env.local` file

3. `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Value: `reality-3af7f`

4. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - Value: From your `.env.local` file

5. `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - Value: From your `.env.local` file

6. `NEXT_PUBLIC_FIREBASE_APP_ID`
   - Value: From your `.env.local` file

7. `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-`)

8. `NEWS_API_KEY` (optional)
   - Value: Your NewsAPI key

#### **Firebase Service Account Secret:**

9. `FIREBASE_SERVICE_ACCOUNT_REALITY_3AF7F`
   
   **To get this:**
   ```powershell
   # In your terminal
   firebase login
   firebase init hosting:github
   ```
   
   Follow prompts:
   - Select repository: `YOUR-USERNAME/realtea-timeline`
   - Set up automatic builds: **Yes**
   - GitHub workflow file: `.github/workflows/firebase-hosting-merge.yml` (already exists)
   
   **Firebase will automatically add this secret to your GitHub repo!**

#### **Firebase CI Token:**

10. `FIREBASE_TOKEN`
    
    **Get the token:**
    ```powershell
    firebase login:ci
    ```
    
    This will:
    - Open browser for authentication
    - Generate a CI token
    - Display token in terminal
    
    **Copy the token** and add it as a GitHub secret.

---

### **PART 5: Verify Workflows**

1. **Check workflow files exist:**
   ```
   .github/
     workflows/
       - firebase-hosting-merge.yml ✅
       - firebase-hosting-pull-request.yml ✅
       - deploy-firebase-functions.yml ✅
   ```

2. **Push workflows to GitHub:**
   ```powershell
   git add .github/workflows/
   git commit -m "Add GitHub Actions workflows"
   git push
   ```

3. **Check GitHub Actions:**
   - Go to: https://github.com/YOUR-USERNAME/realtea-timeline/actions
   - Should see: "Deploy RealTea to Firebase Hosting" running
   - Wait for: ✅ Green checkmark

---

## 🔄 How Auto-Deployment Works

### **After Setup:**

Every time you push to `main` branch:

1. **GitHub Actions triggers automatically**
2. **Installs dependencies** (`npm ci`)
3. **Builds Next.js app** (`npm run build`)
4. **Deploys to Firebase Hosting**
5. **If functions changed**, deploys Cloud Functions too
6. **Shows status** in GitHub Actions tab

### **Workflow Triggers:**

- **`firebase-hosting-merge.yml`**: Runs on every push to main
- **`firebase-hosting-pull-request.yml`**: Creates preview for PRs
- **`deploy-firebase-functions.yml`**: Runs when functions/ folder changes

---

## ✅ Success Checklist

### **Initial Deployment:**

- [ ] Git installed
- [ ] GitHub repo created
- [ ] Code pushed to GitHub
- [ ] Firebase logged in
- [ ] Functions deployed manually first time
- [ ] Firestore has events
- [ ] Frontend accessible

### **Continuous Deployment:**

- [ ] GitHub secrets configured (10 secrets)
- [ ] Workflows pushed to repo
- [ ] First workflow run successful
- [ ] Hosting URL accessible
- [ ] Future pushes auto-deploy

---

## 🎯 Quick Command Summary

### **One-Time Setup:**

```powershell
# 1. Install Git (download from git-scm.com)

# 2. Initialize repo
cd C:\Users\User\Desktop\Works\realtea-timeline
git init
git add .
git commit -m "Initial RealTea release"
git branch -M main

# 3. Connect to GitHub (create repo first on github.com)
git remote add origin https://github.com/YOUR-USERNAME/realtea-timeline.git
git push -u origin main

# 4. Deploy Firebase (first time)
firebase login
firebase use reality-3af7f
firebase deploy --only "functions,firestore:rules"

# 5. Set up GitHub Actions
firebase init hosting:github
# This adds FIREBASE_SERVICE_ACCOUNT secret automatically

# 6. Get CI token for functions deployment
firebase login:ci
# Copy token → Add as FIREBASE_TOKEN secret in GitHub
```

### **Every Future Update:**

```powershell
# Make your changes, then:
git add .
git commit -m "Update: your changes description"
git push

# GitHub Actions automatically:
# ✅ Builds the app
# ✅ Deploys to Firebase Hosting
# ✅ Deploys functions if changed
```

---

## 🌐 URLs After Deployment

### **Frontend:**
- **Production:** `https://reality-3af7f.web.app`
- **Alternative:** `https://reality-3af7f.firebaseapp.com`

### **Functions:**
- **Health Check:** `https://us-central1-reality-3af7f.cloudfunctions.net/healthCheck`
- **Backfill:** `https://us-central1-reality-3af7f.cloudfunctions.net/backfillHistory`

### **Firebase Console:**
- **Dashboard:** `https://console.firebase.google.com/project/reality-3af7f`
- **Firestore:** `https://console.firebase.google.com/project/reality-3af7f/firestore`
- **Functions:** `https://console.firebase.google.com/project/reality-3af7f/functions`

### **GitHub:**
- **Repository:** `https://github.com/YOUR-USERNAME/realtea-timeline`
- **Actions:** `https://github.com/YOUR-USERNAME/realtea-timeline/actions`

---

## 📊 Workflow Details

### **1. Firebase Hosting Deploy (Main Branch)**

**File:** `.github/workflows/firebase-hosting-merge.yml`

**Triggers on:**
- Push to `main` branch

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Build Next.js with environment variables
5. Deploy to Firebase Hosting (live channel)

**Duration:** ~3-5 minutes

---

### **2. Firebase Hosting Preview (Pull Requests)**

**File:** `.github/workflows/firebase-hosting-pull-request.yml`

**Triggers on:**
- Pull request opened/updated

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Build Next.js
5. Deploy to preview channel
6. Comments PR with preview URL

**Duration:** ~3-5 minutes

---

### **3. Firebase Functions Deploy**

**File:** `.github/workflows/deploy-firebase-functions.yml`

**Triggers on:**
- Push to `main` when `functions/` folder changes
- Push to `main` when Firestore rules change
- Manual trigger via workflow_dispatch

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install Firebase CLI
4. Install functions dependencies
5. Deploy functions and Firestore rules
6. List deployed functions

**Duration:** ~4-6 minutes

---

## 🔐 Required GitHub Secrets

### **Firebase Configuration (10 secrets):**

Copy from your `.env.local` file:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
OPENAI_API_KEY
NEWS_API_KEY (optional)
```

### **Firebase Service Account:**

```
FIREBASE_SERVICE_ACCOUNT_REALITY_3AF7F
```

**Get this by running:**
```powershell
firebase init hosting:github
```

This command automatically adds the secret to your GitHub repo!

### **Firebase CI Token:**

```
FIREBASE_TOKEN
```

**Get this by running:**
```powershell
firebase login:ci
```

Copy the token and add it as a GitHub secret.

---

## 🎯 Testing Auto-Deployment

### **After Setup:**

1. **Make a small change:**
   ```powershell
   # Edit README.md or any file
   git add .
   git commit -m "Test auto-deployment"
   git push
   ```

2. **Watch GitHub Actions:**
   - Go to: GitHub → Actions tab
   - See: "Deploy RealTea to Firebase Hosting" workflow running
   - Wait for: ✅ Green checkmark

3. **Verify deployment:**
   - Visit: `https://reality-3af7f.web.app`
   - See: Your changes live!

---

## 💡 Benefits of Auto-Deployment

### **With GitHub Actions:**

✅ **Automatic Builds** - Every push triggers build  
✅ **Automatic Deploys** - Successful builds auto-deploy  
✅ **Preview Channels** - PRs get preview URLs  
✅ **History Tracking** - All deployments logged  
✅ **Rollback Easy** - Revert to previous commit  
✅ **No Manual Steps** - Just `git push` and done!  

### **Without GitHub Actions:**

❌ Manual deployment needed each time  
❌ Run `firebase deploy` for every change  
❌ Easy to forget to deploy  
❌ No preview for testing  

---

## 🔧 Troubleshooting

### **Issue: Workflow fails with "Firebase Service Account not found"**

**Solution:**
```powershell
firebase init hosting:github
```

Follow prompts to connect GitHub and auto-add secret.

---

### **Issue: Build fails with "Environment variable not found"**

**Solution:**
Add all environment variables as GitHub secrets:
- GitHub → Settings → Secrets → Actions
- Add each variable from `.env.local`

---

### **Issue: Functions deploy fails in workflow**

**Solution:**
1. Get Firebase CI token:
   ```powershell
   firebase login:ci
   ```

2. Add as GitHub secret: `FIREBASE_TOKEN`

3. Push again to trigger workflow

---

## 📊 Deployment Status Dashboard

### **Check Deployment Status:**

**GitHub Actions:**
- https://github.com/YOUR-USERNAME/realtea-timeline/actions
- Shows: Build status, deployment history, logs

**Firebase Console:**
- https://console.firebase.google.com/project/reality-3af7f/hosting
- Shows: Deployment history, rollback options

---

## 🎉 End Result

### **After Complete Setup:**

✅ **Push code to GitHub** → Automatically builds and deploys  
✅ **Functions update** → Automatically deployed  
✅ **Firestore rules change** → Automatically applied  
✅ **Pull requests** → Get preview URLs  
✅ **Main branch** → Goes live immediately  

### **Your Workflow:**

```
Edit code → git add . → git commit -m "..." → git push
   ↓
GitHub Actions runs (3-5 min)
   ↓
Live site updated automatically ✅
```

**No more manual deployments!** Just push and it's live! 🚀

---

## ⏱️ Time Estimate

### **Initial Setup (One-Time):**

| Task | Time |
|------|------|
| Install Git | 5 min |
| Create GitHub repo | 2 min |
| Push code | 2 min |
| Configure secrets | 5 min |
| Run `firebase init hosting:github` | 2 min |
| Get CI token | 1 min |
| First deployment | 5 min |
| **Total** | **22 min** |

### **Future Updates:**

| Task | Time |
|------|------|
| Edit code | varies |
| `git push` | 10 sec |
| **Auto-deploy** | **3-5 min** |

---

## 📞 Need Help?

### **Documentation:**

- **GITHUB_ACTIONS_SETUP.md** (this file) - Setup guide
- **MANUAL_DEPLOYMENT_STEPS.md** - Initial deployment
- **⚡_DEPLOY_IN_3_STEPS.txt** - Quick commands

### **Quick Links:**

- Git Download: https://git-scm.com/download/win
- GitHub New Repo: https://github.com/new
- Firebase Console: https://console.firebase.google.com
- GitHub Actions Docs: https://docs.github.com/actions

---

## ✅ Quick Start Checklist

- [ ] Git installed on your computer
- [ ] GitHub account created
- [ ] Firebase project: reality-3af7f selected
- [ ] OpenAI API key ready
- [ ] `.env.local` file with all variables
- [ ] Terminal/PowerShell ready

---

**Ready to set up auto-deployment?** Follow the steps above! 🚀

**Estimated time:** 22 minutes for complete setup  
**Result:** Push to GitHub = Automatic deployment!  

---

**Made with ☕ by RealTea Team**

