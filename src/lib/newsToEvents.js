/**
 * News to Timeline Events Converter
 * Fetches news and converts them to timeline events using AI
 */

import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Console logging with dark mode style
const log = {
  info: (msg) => console.log(`🌙 [NEWS] ${msg}`),
  success: (msg) => console.log(`✅ [NEWS] ${msg}`),
  error: (msg) => console.error(`❌ [NEWS] ${msg}`),
  warn: (msg) => console.warn(`⚠️ [NEWS] ${msg}`),
  progress: (msg) => console.log(`⚡ [NEWS] ${msg}`)
};

/**
 * Fetch top news headlines from News API
 */
async function fetchNewsHeadlines() {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEWS_API_KEY not found in environment variables');
  }

  log.info('Fetching top 5 headlines from News API...');

  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${apiKey}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(`News API returned status: ${data.status}`);
    }

    log.success(`Fetched ${data.articles?.length || 0} headlines`);
    return data.articles || [];
  } catch (error) {
    log.error(`Failed to fetch news: ${error.message}`);
    throw error;
  }
}

/**
 * Convert news article to timeline event using OpenAI
 */
async function convertNewsToEvent(article) {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_OPENAI_API_KEY not found');
  }

  log.progress(`Converting: "${article.title?.substring(0, 50)}..."`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a timeline event creator. Convert news articles into concise, factual timeline events. Respond ONLY with valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: `Convert this news article into a timeline event. Return ONLY valid JSON:

Title: ${article.title}
Description: ${article.description || ''}
Content: ${article.content?.substring(0, 200) || ''}
Source: ${article.source?.name || ''}
Published: ${article.publishedAt}

Return format:
{
  "title": "Concise event title (under 100 chars)",
  "description": "2-3 sentences summarizing the event (150-300 chars)",
  "category": "one of: Technology, Politics, Science, Culture, Business, Sports, World",
  "location": "Primary location mentioned or 'Multiple Locations'",
  "date": "YYYY-MM-DD format of the event"
}

Focus on the main event, keep it factual and neutral.`
          }
        ],
        temperature: 0.7,
        max_tokens: 250
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI error: ${response.status} - ${errorData.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content from OpenAI');
    }

    // Parse JSON response
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const eventData = JSON.parse(cleanContent);

    // Validate required fields
    if (!eventData.title || !eventData.description) {
      throw new Error('Missing required fields in AI response');
    }

    // Add metadata
    const event = {
      title: eventData.title,
      description: eventData.description,
      category: eventData.category || 'News',
      location: eventData.location || 'Unknown',
      date: eventData.date || new Date().toISOString().split('T')[0],
      year: eventData.date ? eventData.date.split('-')[0] : new Date().getFullYear().toString(),
      verifiedSource: article.url || '',
      imageUrl: article.urlToImage || '',
      addedBy: 'News Bot',
      sourceArticle: {
        source: article.source?.name || 'Unknown',
        publishedAt: article.publishedAt,
        author: article.author || 'Unknown'
      },
      aiGenerated: true,
      newsGenerated: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    log.success(`✨ Converted: "${event.title}"`);
    return event;
  } catch (error) {
    log.error(`Failed to convert article: ${error.message}`);
    throw error;
  }
}

/**
 * Check if event already exists in Firestore (by title similarity)
 */
async function isDuplicate(title) {
  try {
    const eventsRef = collection(db, 'events');
    const snapshot = await getDocs(eventsRef);
    
    // Simple duplicate check by title
    const normalizedTitle = title.toLowerCase().trim();
    
    for (const doc of snapshot.docs) {
      const existingTitle = doc.data().title?.toLowerCase().trim() || '';
      
      // Check if titles are very similar (contains or exact match)
      if (existingTitle === normalizedTitle || 
          existingTitle.includes(normalizedTitle) || 
          normalizedTitle.includes(existingTitle)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    log.error(`Error checking duplicates: ${error.message}`);
    return false; // If check fails, proceed anyway
  }
}

/**
 * Save event to Firestore
 */
async function saveEvent(event) {
  try {
    const eventsRef = collection(db, 'events');
    const docRef = await addDoc(eventsRef, event);
    log.success(`💾 Saved: ${event.title} (ID: ${docRef.id})`);
    return docRef.id;
  } catch (error) {
    log.error(`Failed to save event: ${error.message}`);
    throw error;
  }
}

/**
 * Main function: Fetch news and convert to timeline events
 */
export async function fetchAndProcessNews() {
  log.info('═══════════════════════════════════════════════');
  log.info('🌙 NEWS TO TIMELINE - STARTING');
  log.info('═══════════════════════════════════════════════');
  
  const startTime = Date.now();
  let processed = 0;
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Step 1: Fetch news
    const articles = await fetchNewsHeadlines();
    
    if (!articles || articles.length === 0) {
      log.warn('No articles fetched');
      return { success: true, processed: 0, saved: 0, skipped: 0, errors: 0 };
    }

    log.info(`Processing ${articles.length} articles...`);

    // Step 2: Process each article
    for (const article of articles) {
      try {
        processed++;
        
        // Check for duplicates
        const duplicate = await isDuplicate(article.title);
        
        if (duplicate) {
          log.warn(`⏭️  Skipping duplicate: "${article.title?.substring(0, 50)}..."`);
          skipped++;
          continue;
        }

        // Convert to event
        const event = await convertNewsToEvent(article);
        
        // Save to Firestore
        await saveEvent(event);
        saved++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        log.error(`Error processing article: ${error.message}`);
        errors++;
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log.info('═══════════════════════════════════════════════');
    log.success('🌙 NEWS TO TIMELINE - COMPLETE');
    log.info(`📊 Results:`);
    log.info(`   Processed: ${processed}`);
    log.success(`   Saved: ${saved}`);
    log.warn(`   Skipped: ${skipped}`);
    if (errors > 0) log.error(`   Errors: ${errors}`);
    log.info(`   Duration: ${duration}s`);
    log.info('═══════════════════════════════════════════════');

    return {
      success: true,
      processed,
      saved,
      skipped,
      errors,
      duration: parseFloat(duration)
    };
  } catch (error) {
    log.error('═══════════════════════════════════════════════');
    log.error(`🌙 NEWS TO TIMELINE - FAILED: ${error.message}`);
    log.error('═══════════════════════════════════════════════');
    
    throw error;
  }
}

