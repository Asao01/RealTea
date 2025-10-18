/**
 * Daily News Updater - Automated system to fetch and store verified current events
 * Runs daily via cron or manual trigger
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import crypto from "crypto";

// Helper: Create URL hash for duplicate detection
function hashUrl(url) {
  return crypto.createHash('sha1').update(url).digest('hex').substring(0, 16);
}

// Helper: Geocode location to lat/lng
async function geocodeLocation(location) {
  if (!location || location === 'Unknown' || location === 'Global') return null;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit: 1 req/sec
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'RealTea-Timeline/1.0'
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Geocoding error for ${location}:`, error.message);
    return null;
  }
}

// Helper: Determine event category based on content
function categorizeEvent(title, description, content) {
  const text = `${title} ${description} ${content}`.toLowerCase();
  
  // Keywords for each category
  const categories = {
    'Conflict': ['war', 'military', 'attack', 'bombing', 'strike', 'invasion', 'conflict', 'battle', 'terrorism', 'shooting'],
    'Politics': ['election', 'vote', 'government', 'president', 'minister', 'parliament', 'congress', 'policy', 'legislation', 'senate'],
    'Science': ['research', 'discovery', 'study', 'scientist', 'lab', 'experiment', 'medicine', 'cure', 'space', 'nasa'],
    'Technology': ['tech', 'ai', 'computer', 'software', 'app', 'digital', 'cyber', 'internet', 'launch', 'innovation'],
    'Environment': ['climate', 'weather', 'hurricane', 'flood', 'earthquake', 'wildfire', 'pollution', 'emissions', 'renewable'],
    'Economy': ['economy', 'stock', 'market', 'trade', 'gdp', 'inflation', 'unemployment', 'finance', 'bank'],
    'Culture': ['film', 'music', 'art', 'celebrity', 'sports', 'olympics', 'culture', 'entertainment', 'award']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return 'World';
}

// Helper: Extract location from article
function extractLocation(article) {
  // Try various fields that might contain location
  if (article.location) return article.location;
  if (article.country) return article.country;
  
  // Try to extract from content using common patterns
  const content = `${article.title} ${article.description || ''} ${article.content || ''}`;
  
  // Common location patterns
  const locationPatterns = [
    /in ([A-Z][a-z]+(?: [A-Z][a-z]+)?), ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/,
    /\(([A-Z]{2,})\)/,
    /from ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return 'Unknown';
}

// Main function: Update daily news
export async function GET(request) {
  const startTime = Date.now();
  console.log('\n🌍 ===== DAILY NEWS UPDATE STARTED =====');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const maxArticles = parseInt(searchParams.get('limit')) || 50;
    const category = searchParams.get('category') || null;
    
    console.log(`📊 Settings: Max articles = ${maxArticles}`);
    
    // Check for NewsAPI key
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) {
      console.error('❌ NEWS_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'News API key not configured' },
        { status: 500 }
      );
    }
    
    // Fetch from NewsAPI
    console.log('📰 Fetching articles from NewsAPI...');
    
    const newsUrl = category
      ? `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=${maxArticles}&apiKey=${newsApiKey}`
      : `https://newsapi.org/v2/top-headlines?language=en&pageSize=${maxArticles}&apiKey=${newsApiKey}`;
    
    const newsResponse = await fetch(newsUrl);
    
    if (!newsResponse.ok) {
      throw new Error(`NewsAPI error: ${newsResponse.status}`);
    }
    
    const newsData = await newsResponse.json();
    
    if (!newsData.articles || newsData.articles.length === 0) {
      console.log('⚠️ No articles found from NewsAPI');
      return NextResponse.json({
        message: 'No articles found',
        fetched: 0,
        saved: 0,
        skipped: 0
      });
    }
    
    console.log(`✅ Fetched ${newsData.articles.length} articles from NewsAPI`);
    
    // Process articles
    let saved = 0;
    let skipped = 0;
    let updated = 0;
    
    for (let i = 0; i < newsData.articles.length; i++) {
      const article = newsData.articles[i];
      
      // Skip articles without URL or title
      if (!article.url || !article.title) {
        skipped++;
        continue;
      }
      
      try {
        // Create URL hash for duplicate detection
        const urlHash = hashUrl(article.url);
        
        // Check if already exists
        const eventsRef = collection(db, 'events');
        const existingQuery = query(eventsRef, where('urlHash', '==', urlHash));
        const existingSnapshot = await getDocs(existingQuery);
        
        if (!existingSnapshot.empty) {
          // Update urgency if needed
          const existingDoc = existingSnapshot.docs[0];
          const existingData = existingDoc.data();
          
          if (!existingData.isBreaking && article.publishedAt) {
            const publishedDate = new Date(article.publishedAt);
            const hoursSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
            
            if (hoursSincePublished < 24) {
              await setDoc(doc(db, 'events', existingDoc.id), {
                ...existingData,
                isBreaking: true,
                urgency: 90,
                updatedAt: serverTimestamp()
              });
              updated++;
              console.log(`  🔄 Updated: ${article.title.substring(0, 60)}...`);
            }
          }
          
          skipped++;
          continue;
        }
        
        // Extract location
        const location = extractLocation(article);
        
        // Categorize
        const eventCategory = categorizeEvent(
          article.title,
          article.description || '',
          article.content || ''
        );
        
        // Calculate urgency (0-100)
        let urgency = 50;
        const publishedDate = new Date(article.publishedAt || Date.now());
        const hoursSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSincePublished < 6) urgency = 95;
        else if (hoursSincePublished < 12) urgency = 85;
        else if (hoursSincePublished < 24) urgency = 75;
        else if (hoursSincePublished < 48) urgency = 60;
        
        // Check for breaking news keywords
        const breakingKeywords = ['breaking', 'urgent', 'alert', 'just in', 'developing'];
        const isBreaking = breakingKeywords.some(keyword => 
          article.title.toLowerCase().includes(keyword)
        ) || hoursSincePublished < 24;
        
        // Geocode location
        let latitude = null;
        let longitude = null;
        
        if (location && location !== 'Unknown' && location !== 'Global') {
          console.log(`  📍 Geocoding: ${location}`);
          const coords = await geocodeLocation(location);
          if (coords) {
            latitude = coords.lat;
            longitude = coords.lng;
            console.log(`    ✅ Found: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        }
        
        // Create event document
        const eventDoc = {
          title: article.title,
          description: article.description || article.content?.substring(0, 200) || 'No description available',
          category: eventCategory,
          location: location,
          latitude: latitude,
          longitude: longitude,
          year: publishedDate.getFullYear(),
          date: publishedDate.toISOString().split('T')[0],
          imageUrl: article.urlToImage || '',
          verifiedSource: article.url,
          url: article.url,
          urlHash: urlHash,
          urgency: urgency,
          isBreaking: isBreaking,
          newsGenerated: true,
          source: {
            name: article.source?.name || 'Unknown',
            url: article.url
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Save to Firestore
        const docId = `news_${urlHash}`;
        await setDoc(doc(db, 'events', docId), eventDoc);
        
        saved++;
        console.log(`  ✅ [${saved}/${newsData.articles.length}] Saved: ${article.title.substring(0, 60)}...`);
        console.log(`     📁 Category: ${eventCategory} | 🔥 Breaking: ${isBreaking} | 📍 ${location}`);
        
      } catch (error) {
        console.error(`  ❌ Error processing article: ${error.message}`);
        skipped++;
      }
    }
    
    // Update system status
    await setDoc(doc(db, 'system', 'status'), {
      lastNewsUpdate: serverTimestamp(),
      lastUpdateSuccess: true,
      lastUpdateCount: saved
    }, { merge: true });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 ===== UPDATE SUMMARY =====');
    console.log(`✅ Fetched: ${newsData.articles.length} new stories`);
    console.log(`💾 Saved: ${saved} events`);
    console.log(`🔄 Updated: ${updated} events`);
    console.log(`⏭️  Skipped: ${skipped} duplicates`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Updated Firestore successfully`);
    console.log('🌍 ===== DAILY NEWS UPDATE COMPLETE =====\n');
    
    return NextResponse.json({
      success: true,
      message: 'Daily news updated successfully',
      fetched: newsData.articles.length,
      saved: saved,
      updated: updated,
      skipped: skipped,
      duration: `${duration}s`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
    
  } catch (error) {
    console.error('❌ Daily news update error:', error);
    
    // Update system status with error
    try {
      await setDoc(doc(db, 'system', 'status'), {
        lastNewsUpdate: serverTimestamp(),
        lastUpdateSuccess: false,
        lastUpdateError: error.message
      }, { merge: true });
    } catch (statusError) {
      console.error('Failed to update error status:', statusError);
    }
    
    return NextResponse.json(
      {
        error: 'Failed to update daily news',
        details: error.message
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

