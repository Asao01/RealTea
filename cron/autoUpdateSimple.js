/**
 * Simple Auto-Update Cron Job
 * Can be run as a standalone Node.js script or deployed to Vercel/Render
 * 
 * Usage:
 * - node cron/autoUpdateSimple.js
 * - Or schedule with cron: 0 */6 * * * node /path/to/autoUpdateSimple.js
 */

import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Calculate simple credibility score
 */
function calculateCredibilityScore(sourceCount, agreementRatio, recency) {
  const sourceWeight = Math.min(sourceCount / 5, 1);
  const agreementWeight = Math.min(agreementRatio, 1);
  const recencyWeight = recency > 7 ? 0.9 : 1;
  return parseFloat(((sourceWeight + agreementWeight + recencyWeight) / 3).toFixed(2));
}

/**
 * Main handler function
 */
export async function handler() {
  console.log('\n🤖 RealTea Auto-Update Started');
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  let processed = 0;
  let saved = 0;
  let rejected = 0;

  try {
    // Fetch from NewsAPI
    console.log('📡 Fetching from NewsAPI...');
    const newsRes = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`
    );
    const newsData = await newsRes.json();
    const articles = newsData.articles || [];
    
    console.log(`✅ Fetched ${articles.length} articles\n`);

    // Process each article
    for (const article of articles.slice(0, 10)) {
      try {
        processed++;
        
        if (!article.title || !article.url) {
          console.log(`⏭️  Skipping article without title/URL`);
          continue;
        }

        console.log(`📝 [${processed}/10] ${article.title.substring(0, 60)}...`);

        // Simple credibility calculation
        // In a real system, you'd check multiple sources and use AI
        const hasDescription = article.description && article.description.length > 50;
        const hasImage = article.urlToImage && article.urlToImage.length > 0;
        const hasSource = article.source?.name;
        
        // Basic scoring (0-1 scale)
        let credibilityScore = 0.5; // Base score
        if (hasDescription) credibilityScore += 0.15;
        if (hasImage) credibilityScore += 0.10;
        if (hasSource) credibilityScore += 0.15;
        
        // Recency bonus (published in last 24 hours)
        const publishedDate = new Date(article.publishedAt);
        const hoursSince = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) credibilityScore += 0.10;

        console.log(`   Credibility: ${credibilityScore.toFixed(2)}`);

        // Reject if credibility < 0.6
        if (credibilityScore < 0.6) {
          console.log(`   ❌ REJECTED: Score ${credibilityScore} < 0.6\n`);
          rejected++;
          continue;
        }

        console.log(`   ✅ ACCEPTED`);

        // Create unique ID from title
        const cleanTitle = article.title
          .replace(/[^a-zA-Z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .slice(0, 100);
        
        const docId = `${cleanTitle}-${article.publishedAt.split('T')[0]}`;
        const docRef = doc(db, "events", docId);

        // Check if already exists
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
          console.log(`   ⏭️  Already exists, skipping\n`);
          continue;
        }

        // Save to Firestore
        await setDoc(docRef, {
          title: article.title,
          description: article.description || article.title,
          longDescription: article.content || article.description || article.title,
          date: article.publishedAt.split('T')[0],
          location: article.source?.name || 'Global',
          category: 'World',
          region: 'Global',
          sources: [article.url],
          verifiedSource: article.url,
          imageUrl: article.urlToImage || '',
          credibilityScore: Math.round(credibilityScore * 100), // Convert to 0-100
          importanceScore: 70,
          verified: false,
          verifiedByAI: false, // Would be true if using AI verification
          addedBy: 'RealTea Auto-Update',
          author: article.source?.name || 'Unknown',
          newsGenerated: true,
          aiGenerated: false,
          autoUpdated: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        saved++;
        console.log(`   💾 Saved to Firestore\n`);

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ Auto-Update Complete');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Processed: ${processed}`);
    console.log(`✅ Saved: ${saved}`);
    console.log(`❌ Rejected: ${rejected}`);
    console.log('═══════════════════════════════════════\n');

    return {
      success: true,
      stats: { processed, saved, rejected }
    };

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  handler()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

