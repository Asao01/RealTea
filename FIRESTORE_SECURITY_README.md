# 🔒 RealTea Firestore Security & Backend Setup

## Overview

This guide explains how to set up a **secure Firestore backend** for RealTea with:
- ✅ **Public read access** for all users
- ✅ **Restricted write access** to AI backend only
- ✅ **Validation rules** for data quality
- ✅ **Admin-only access** to special collections
- ✅ **Duplicate prevention** and data integrity

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  FIRESTORE SECURITY MODEL                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PUBLIC USERS (Everyone)                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ✅ READ: events collection                           │  │
│  │  ❌ WRITE: Not allowed                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  AI BACKEND (autofillHistory.js, autoUpdate API)            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ✅ WRITE: events collection (with validation)        │  │
│  │     Requirements:                                      │  │
│  │     • verifiedByAI == true                            │  │
│  │     • credibilityScore >= 60                          │  │
│  │     • addedBy == 'auto'                               │  │
│  │     • Has title, summary, date, sources               │  │
│  │  ❌ UPDATE: Not allowed (prevents tampering)          │  │
│  │  ❌ DELETE: Not allowed (preserves history)           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ADMIN (Your Firebase UID)                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ✅ READ/WRITE: admin collection                      │  │
│  │  ✅ Full database access for management               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Instructions

### Step 1: Configure Firestore Rules

The `firestore.rules` file contains all security rules.

**Deploy rules to Firebase:**

```bash
cd realtea-timeline

# Deploy rules
firebase deploy --only firestore:rules

# Or if not logged in:
firebase login
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔ Firestore rules deployed successfully!
✔ Rules updated for project: your-project-id
```

---

### Step 2: Set Up Admin Access (Optional)

To access the `/admin` collection:

1. **Get your Firebase UID:**
   - Go to: https://console.firebase.google.com/project/[your-project]/authentication/users
   - Click on your user
   - Copy the **User UID** (looks like: `abc123XYZ...`)

2. **Update firestore.rules:**
   ```javascript
   // Line ~50 in firestore.rules
   return request.auth != null && 
          request.auth.uid == 'YOUR_ACTUAL_UID_HERE';  // ← Paste your UID
   ```

3. **Redeploy rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

---

### Step 3: Verify Firebase Configuration

Ensure your `.env.local` has all required credentials:

```bash
# Check if .env.local exists
cat .env.local

# Should contain:
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
OPENAI_API_KEY=sk-proj-...
```

**If missing, pull from Vercel:**
```bash
npx vercel env pull .env.local
```

---

### Step 4: Test the Security Rules

**Test 1: Public read works**
```bash
# Anyone can read events
curl https://realitea.org/api/events

# Should return events successfully
```

**Test 2: Public write fails**
```bash
# Try to write without auth (should fail)
curl -X POST https://realitea.org/api/events/test \
  -H "Content-Type: application/json" \
  -d '{"title": "test"}'

# Expected: 403 Forbidden or similar error
```

**Test 3: AI backend write succeeds**
```bash
# Run auto-fill script
node autofillHistory.js --quick

# Should save events successfully with all validations passing
```

---

## 🛡️ Security Rules Explained

### Events Collection

```javascript
match /events/{eventId} {
  // ✅ Anyone can READ
  allow read: if true;
  
  // ✅ Can CREATE if:
  allow create: if 
    request.resource.data.verifiedByAI == true &&      // AI verified
    request.resource.data.credibilityScore >= 60 &&    // Min 60% score
    request.resource.data.title is string &&           // Has title
    request.resource.data.summary is string &&         // Has summary
    request.resource.data.date is string &&            // Has date
    request.resource.data.sources is list &&           // Has sources
    request.resource.data.addedBy == 'auto' &&         // Added by AI
    request.resource.data.createdAt is timestamp &&    // Has timestamp
    request.resource.data.updatedAt is timestamp;      // Has timestamp
  
  // ❌ Cannot UPDATE existing events (preserves accuracy)
  allow update: if false;
  
  // ❌ Cannot DELETE events (preserves history)
  allow delete: if false;
}
```

**Why these rules?**

1. **Public Read:** Anyone can view the timeline
2. **Restricted Write:** Only AI backend can add events
3. **Quality Validation:** Ensures minimum credibility (60%)
4. **AI Verification Required:** Only AI-verified events accepted
5. **No Updates:** Prevents tampering with historical data
6. **No Deletes:** Preserves complete historical record

---

### Admin Collection

```javascript
match /admin/{document=**} {
  allow read, write: if request.auth != null && 
                        request.auth.uid == 'YOUR_UID';
}
```

**Use cases:**
- System configuration
- Manual overrides
- Monitoring dashboards
- Internal analytics

---

## 🔐 Backend Script Security

### Built-in Validation

The `autofillHistory.js` script includes multiple validation layers:

#### 1. Field Validation
```javascript
if (!eventData.title || !eventData.date) {
  console.log(`⏭️  Skipping invalid event`);
  continue;
}
```

#### 2. Credibility Validation
```javascript
if (eventData.credibilityScore < 60) {
  console.log(`❌ Skipping low credibility (score: ${eventData.credibilityScore})`);
  continue;
}
```

#### 3. AI Verification Validation
```javascript
if (!eventData.verifiedByAI) {
  console.log(`⚠️  Skipping unverified event`);
  continue;
}
```

#### 4. Duplicate Detection
```javascript
const exists = await getDoc(docRef);
if (exists.exists()) {
  console.log(`⏭️  Duplicate found, skipping`);
  continue;
}
```

**Result:** Only high-quality, verified, unique events are saved!

---

## 📝 Event Data Structure

Every event saved includes these **required fields**:

```javascript
{
  // ═══════════════════════════════════════════════════════════
  // REQUIRED FIELDS (validated by Firestore rules)
  // ═══════════════════════════════════════════════════════════
  
  title: "First Moon Landing",                    // Event headline
  summary: "On July 20, 1969...",                 // 2-3 sentences
  date: "1969-07-20",                             // YYYY-MM-DD
  year: "1969",                                   // Year as string
  region: "North America",                        // Geographical region
  sources: ["https://wikipedia.org/..."],         // Source URLs
  
  // ═══════════════════════════════════════════════════════════
  // VERIFICATION FIELDS (validated by rules)
  // ═══════════════════════════════════════════════════════════
  
  credibilityScore: 100,                          // 0-100 (must be >= 60)
  verifiedByAI: true,                             // Must be true
  addedBy: "auto",                                // Must be "auto"
  
  // ═══════════════════════════════════════════════════════════
  // TIMESTAMPS (required by rules)
  // ═══════════════════════════════════════════════════════════
  
  createdAt: Firestore.Timestamp,                 // Auto-generated
  updatedAt: Firestore.Timestamp,                 // Auto-generated
  
  // ═══════════════════════════════════════════════════════════
  // OPTIONAL FIELDS
  // ═══════════════════════════════════════════════════════════
  
  description: "Short summary...",                // 300 char max
  longDescription: "Full AI summary...",          // Full text
  location: "North America",                      // Location string
  category: "Space",                              // Event category
  imageUrl: "https://...",                        // Image URL
  importanceScore: 80,                            // 0-100
  verified: true,                                 // Boolean
  author: "Wikipedia",                            // Source name
  historical: true,                               // Historical event flag
  newsGenerated: false,                           // News vs historical
  aiGenerated: true,                              // AI summary flag
  autoUpdated: true,                              // Auto-update flag
}
```

---

## 🧪 Testing Security

### Test 1: Verify Public Read Access

```javascript
// This should work (anyone can read)
import { collection, getDocs } from 'firebase/firestore';
const snapshot = await getDocs(collection(db, 'events'));
console.log(`Events: ${snapshot.size}`);  // Should show count
```

### Test 2: Verify Write Restrictions

```javascript
// This should FAIL (no auth, or invalid data)
import { doc, setDoc } from 'firebase/firestore';

await setDoc(doc(db, 'events', 'test'), {
  title: 'Test Event',
  // Missing required fields
});

// Expected error: 
// "Missing or insufficient permissions" or
// "Document does not match security rules"
```

### Test 3: Verify Auto-Fill Script Works

```bash
# This should SUCCEED (meets all requirements)
node autofillHistory.js --quick

# Expected output:
# ✅ Batch committed: 20 events saved, 0 skipped
```

### Test 4: Check Firestore Console

1. Go to: https://console.firebase.google.com/project/[your-project]/firestore/data
2. Navigate to `events` collection
3. Verify events have:
   - `addedBy: "auto"`
   - `verifiedByAI: true`
   - `credibilityScore >= 60`

---

## 🔑 Firebase Admin SDK Setup (Optional)

For **server-side operations** that need elevated permissions:

### 1. Generate Service Account Key

1. Go to: https://console.firebase.google.com/project/[project]/settings/serviceaccounts
2. Click "Generate New Private Key"
3. Save as `serviceAccountKey.json` in project root

**⚠️ IMPORTANT:** Add to `.gitignore`:
```bash
echo "serviceAccountKey.json" >> .gitignore
```

### 2. Use Admin SDK in Scripts

```javascript
// For server-side scripts only (not client-side!)
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Now you can bypass security rules for admin operations
await db.collection('events').add({
  // Admin writes bypass rules
});
```

**When to use:**
- Server-side cron jobs
- Administrative scripts
- Bulk operations
- Data migrations

**When NOT to use:**
- Client-side code (browser)
- Public APIs
- Untrusted environments

---

## 📋 Deployment Checklist

### Before Deploying Rules:

- [ ] Review `firestore.rules` file
- [ ] Replace `YOUR_FIREBASE_UID` with your actual UID (if using admin collection)
- [ ] Test rules in Firebase Console Rules Playground
- [ ] Backup existing rules (if any)

### Deploy Rules:

```bash
# 1. Login to Firebase
firebase login

# 2. Initialize project (if not done)
firebase init firestore

# 3. Deploy rules
firebase deploy --only firestore:rules

# 4. Verify deployment
# Visit: https://console.firebase.google.com/project/[project]/firestore/rules
```

### After Deploying Rules:

- [ ] Test public read access
- [ ] Test auto-fill script (`node autofillHistory.js --quick`)
- [ ] Verify events appear in Firestore
- [ ] Check console logs for validation messages
- [ ] Test that direct writes fail (security working)

---

## 🔍 Console Log Examples

### Successful Write

```
📝 [1/20] Processing: Apollo 11 Moon Landing...
  ✅ Summary: On July 20, 1969, American astronauts...
  📍 Region: North America | Category: Space
  ✅ Validation passed: credibilityScore=100, verifiedByAI=true
  ✅ Queued: Apollo 11 Moon Landing (1969)
💾 Batch committed: 1 events saved, 0 skipped
```

### Duplicate Skipped

```
📝 [5/20] Processing: First Moon Landing...
  ⏭️  Duplicate found, skipping: First Moon Landing...
💾 Batch committed: 0 events saved, 1 skipped
```

### Low Credibility Rejected

```
📝 [8/20] Processing: Unverified Claim...
  ❌ Skipping low credibility: Unverified Claim (score: 45)
💾 Batch committed: 0 events saved, 1 skipped
```

### Validation Failed

```
📝 [12/20] Processing: Invalid Event...
  ⚠️  Skipping unverified event: Invalid Event...
  (verifiedByAI = false)
💾 Batch committed: 0 events saved, 1 skipped
```

---

## 🛡️ Why This Security Model?

### Problem: Open Write Access
```javascript
// ❌ BAD: Anyone can write anything
allow write: if true;

// Problems:
// - Spam and fake events
// - No quality control
// - Data tampering
// - Malicious deletions
```

### Solution: Restricted AI-Only Writes
```javascript
// ✅ GOOD: Only verified AI can write
allow create: if 
  request.resource.data.verifiedByAI == true &&
  request.resource.data.credibilityScore >= 60 &&
  request.resource.data.addedBy == 'auto';

// Benefits:
// - Quality assurance
// - Spam prevention
// - Data integrity
// - Audit trail
```

### Additional Protection: No Updates/Deletes
```javascript
// ❌ Prevent tampering with history
allow update: if false;
allow delete: if false;

// Why:
// - Preserves historical accuracy
// - Prevents accidental data loss
// - Creates immutable record
// - Builds trust
```

---

## 📊 Validation Flow

```
Event Data → Firestore Rules → Client-Side Validation → Save
     ↓              ↓                   ↓                  ↓
  {title,    verifiedByAI?      credibilityScore?    ✅ SAVED
   summary,  credibilityScore?   duplicate?          or
   date,     required fields?    valid format?       ❌ REJECTED
   ...}      addedBy='auto'?     
```

**Two layers of validation:**
1. **Firestore Rules** (server-side, enforced)
2. **Script Validation** (client-side, pre-check)

**Double protection ensures:**
- No invalid data reaches Firestore
- Clear error messages
- Efficient processing
- Cost savings

---

## 🔧 Troubleshooting

### Error: "Missing or insufficient permissions"

**Cause:** Firestore rules rejecting write

**Solutions:**

1. **Check if rules are deployed:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verify event data meets requirements:**
   ```javascript
   // Must have these fields:
   verifiedByAI: true
   credibilityScore: >= 60
   addedBy: 'auto'
   title, summary, date, sources (all present)
   ```

3. **Check console logs:**
   ```
   ❌ Skipping low credibility: Event title... (score: 45)
   ```

### Error: "Document already exists"

**Cause:** Duplicate event

**Solution:** This is expected behavior! Script automatically skips duplicates:
```
⏭️  Duplicate found, skipping: Event title...
```

### Error: "OpenAI API quota exceeded"

**Cause:** OpenAI rate limits or no credits

**Solution:**
```bash
# Run without AI (uses original descriptions)
node autofillHistory.js --quick

# Events will have verifiedByAI: false and will be skipped
# To fix: Add credits to OpenAI account or use fallback descriptions
```

---

## 📈 Monitoring & Analytics

### Check Security Rule Violations

**Firebase Console:**
1. Go to: https://console.firebase.google.com/project/[project]/firestore/data
2. Check for failed write attempts
3. Review audit logs

**Enable detailed logging:**
```javascript
// In firestore.rules, add debug logging
allow create: if 
  debug(request.resource.data) &&  // Logs data
  isValidEventWrite();
```

### Monitor Write Patterns

```bash
# Check how many events were added today
# (Run in Firebase CLI or admin script)
db.collection('events')
  .where('createdAt', '>=', startOfDay)
  .get()
  .then(snap => console.log(`Today: ${snap.size} events`));
```

---

## 🎯 Best Practices

### 1. Never Expose Service Account Key

```bash
# ❌ DON'T: Commit to Git
git add serviceAccountKey.json

# ✅ DO: Add to .gitignore
echo "serviceAccountKey.json" >> .gitignore

# ✅ DO: Store in environment variable for production
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

### 2. Use Environment Variables

```bash
# ✅ DO: Store sensitive data in .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=...
OPENAI_API_KEY=...

# ❌ DON'T: Hardcode in source files
const apiKey = "sk-proj-abc123...";  // Bad!
```

### 3. Validate Before Writing

```javascript
// ✅ DO: Validate in script before Firestore
if (eventData.credibilityScore < 60) {
  console.log('❌ Skipping low credibility');
  continue;  // Don't even attempt to write
}

// Saves Firestore write costs
// Provides clear error messages
```

### 4. Log Everything

```javascript
// ✅ DO: Comprehensive logging
console.log(`✅ Queued: ${event.title}`);
console.log(`⏭️  Duplicate found, skipping`);
console.log(`❌ Validation failed: ${reason}`);

// Helps with:
// - Debugging
// - Monitoring
// - Audit trails
```

---

## 🚦 Rule Testing Playground

Firebase provides a **Rules Playground** for testing:

1. Go to: https://console.firebase.google.com/project/[project]/firestore/rules
2. Click "Rules Playground"
3. Test queries:

**Test Read (should pass):**
```
Location: /events/test-event-2024-01-01
Read: Allowed ✅
```

**Test Write without verifiedByAI (should fail):**
```
Location: /events/test-event-2024-01-01
Simulated Data:
{
  "title": "Test",
  "verifiedByAI": false  ← This will fail
}
Write: Denied ❌
```

**Test Write with all requirements (should pass):**
```
Location: /events/test-event-2024-01-01
Simulated Data:
{
  "title": "Test Event",
  "summary": "Test summary",
  "date": "2024-01-01",
  "sources": ["https://example.com"],
  "credibilityScore": 80,
  "verifiedByAI": true,
  "addedBy": "auto",
  "createdAt": <timestamp>,
  "updatedAt": <timestamp>
}
Write: Allowed ✅
```

---

## 📚 Additional Resources

### Firebase Documentation
- **Security Rules:** https://firebase.google.com/docs/firestore/security/get-started
- **Rules Language:** https://firebase.google.com/docs/firestore/security/rules-structure
- **Testing Rules:** https://firebase.google.com/docs/firestore/security/test-rules

### Testing Tools
- **Firebase Emulator:** Test locally before deploying
  ```bash
  firebase emulators:start
  ```
- **Rules Unit Tests:** Write automated tests
  ```bash
  npm install @firebase/rules-unit-testing
  ```

---

## ✅ Summary

Your Firestore is now secured with:

1. ✅ **Public read access** - Anyone can view events
2. ✅ **AI-only writes** - Only verified AI backend can add events
3. ✅ **Quality validation** - Minimum 60% credibility score
4. ✅ **Duplicate prevention** - Automatic deduplication
5. ✅ **Immutable history** - No updates or deletes allowed
6. ✅ **Admin access** - Special admin collection for management
7. ✅ **Comprehensive logging** - Every operation tracked

**Deploy command:**
```bash
firebase deploy --only firestore:rules
```

**Test command:**
```bash
node autofillHistory.js --quick
```

---

**File:** `firestore.rules`  
**Status:** ✅ Ready to deploy  
**Security Level:** High  
**Last Updated:** October 16, 2025

