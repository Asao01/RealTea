import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";

/**
 * Save event to Firestore with proper error handling and logging
 */
export async function saveEvent(eventData) {
  try {
    // Validate required fields
    if (!eventData?.title) {
      console.warn('⚠️ [FIRESTORE] Cannot save event: missing title');
      return { success: false, error: 'Missing title' };
    }

    // Check if db is initialized
    if (!db) {
      console.error('❌ [FIRESTORE] Database not initialized. Check Firebase config in .env.local');
      return { success: false, error: 'Database not initialized' };
    }

    // Create stable ID from title (first 200 chars, cleaned)
    const cleanTitle = eventData.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 200);
    
    const id = cleanTitle || `event-${Date.now()}`;
    const ref = doc(db, "events", id);
    
    console.log(`📝 [FIRESTORE] Attempting to save event: ${eventData.title.substring(0, 50)}...`);
    
    // Check if document exists
    const snap = await getDoc(ref);

    const twelveHours = 12 * 60 * 60 * 1000;
    const isStale = () => {
      if (!snap.exists()) return true;
      const t = snap.data()?.updatedAt?.toMillis?.() ?? 0;
      return Date.now() - t > twelveHours;
    };

    if (!snap.exists()) {
      console.log(`  ➕ [FIRESTORE] Creating new event: ${id}`);
    } else if (isStale()) {
      console.log(`  🔄 [FIRESTORE] Updating stale event: ${id}`);
    } else {
      console.log(`  ⏭️ [FIRESTORE] Skipping fresh event: ${id}`);
      return { success: true, skipped: true };
    }

    // Prepare event document matching schema
    const eventDoc = {
      title: eventData.title,
      description: eventData.description || (eventData.longDescription?.slice(0, 250) + "...") || "No description available",
      longDescription: eventData.longDescription || eventData.description || "",
      date: eventData.date || new Date().toISOString().split('T')[0],
      location: eventData.location || "Global",
      category: eventData.category || "World",
      region: eventData.region || "Global",
      sources: eventData.sources || [],
      verifiedSource: eventData.verifiedSource || eventData.url || "",
      imageUrl: eventData.imageUrl || "",
      credibilityScore: eventData.credibilityScore ?? 70,
      importanceScore: eventData.importanceScore ?? 60,
      verified: eventData.verified ?? false,
      addedBy: eventData.addedBy || "RealTea AI",
      author: eventData.author || "RealTea Bot",
      newsGenerated: eventData.newsGenerated ?? true,
      aiGenerated: eventData.aiGenerated ?? true,
      createdAt: snap.exists() ? (snap.data()?.createdAt ?? serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Save to Firestore
    await setDoc(ref, eventDoc, { merge: false });
    
    console.log(`  ✅ [FIRESTORE] Successfully saved: ${id}`);
    return { success: true, id, created: !snap.exists() };
    
  } catch (error) {
    console.error('❌ [FIRESTORE] Error saving event:', error);
    console.error('   Error details:', {
      code: error.code,
      message: error.message,
      title: eventData?.title?.substring(0, 50)
    });
    return { success: false, error: error.message };
  }
}

/**
 * Get recent events from Firestore
 * @param {number} limitCount - Number of events to fetch
 * @returns {Promise<Array>} Array of events
 */
export async function getRecentEvents(limitCount = 50) {
  try {
    if (!db) {
      console.error('❌ [FIRESTORE] Database not initialized');
      return [];
    }

    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(eventsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ [FIRESTORE] Error getting recent events:', error);
    return [];
  }
}

/**
 * List events needing enrichment (short descriptions)
 * @returns {Promise<Array>} Events with short or missing longDescription
 */
export async function listEventsForEnrichment() {
  try {
    if (!db) {
      console.error('❌ [FIRESTORE] Database not initialized');
      return [];
    }

    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef,
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(eventsQuery);
    
    // Filter for events needing enrichment
    const needsEnrichment = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(event => {
        const longDesc = event.longDescription || '';
        return longDesc.length < 1200;
      })
      .slice(0, 25); // Limit to 25 per run

    console.log(`📋 [FIRESTORE] Found ${needsEnrichment.length} events needing enrichment`);
    
    return needsEnrichment;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error listing events for enrichment:', error);
    return [];
  }
}

/**
 * List events needing verification
 * @returns {Promise<Array>} Events with low credibility or unverified
 */
export async function listEventsForVerification() {
  try {
    if (!db) {
      console.error('❌ [FIRESTORE] Database not initialized');
      return [];
    }

    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef,
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(eventsQuery);
    
    // Filter for events needing verification
    const needsVerification = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(event => {
        return (
          event.verified === false ||
          (event.credibilityScore || 70) < 70 ||
          !event.lastVerified
        );
      })
      .slice(0, 50); // Limit to 50 per run

    console.log(`📋 [FIRESTORE] Found ${needsVerification.length} events needing verification`);
    
    return needsVerification;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error listing events for verification:', error);
    return [];
  }
}

/**
 * Add event (alias for saveEvent for backward compatibility)
 */
export async function addEvent(eventData) {
  return await saveEvent(eventData);
}

/**
 * Update existing event
 */
export async function updateEvent(eventId, eventData) {
  try {
    if (!db) {
      console.error('❌ [FIRESTORE] Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }

    const ref = doc(db, "events", eventId);
    await setDoc(ref, {
      ...eventData,
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log(`✅ [FIRESTORE] Event updated: ${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ [FIRESTORE] Error updating event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Re-verify event with AI fact-check
 */
export async function reverifyEvent(eventId, user) {
  try {
    if (!db) {
      console.error('❌ [FIRESTORE] Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }

    const ref = doc(db, "events", eventId);
    await setDoc(ref, {
      lastVerified: serverTimestamp(),
      verifiedBy: user?.email || 'system',
      verified: true
    }, { merge: true });

    console.log(`✅ [FIRESTORE] Event re-verified: ${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ [FIRESTORE] Error re-verifying event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate credibility score based on multiple factors
 */
export function calculateCredibilityScore(event) {
  let score = 70; // Base score
  
  // AI verification
  if (event.verifiedByAI) score += 15;
  if (event.verified) score += 10;
  
  // Sources
  const sourceCount = event.sources?.length || 0;
  score += Math.min(sourceCount * 2, 10);
  
  // Existing credibility
  if (event.credibilityScore) {
    score = Math.round((score + event.credibilityScore) / 2);
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Check if event is contested/disputed
 */
export function isContested(event) {
  return event.status === 'disputed' || 
         event.disputed === true ||
         (Array.isArray(event.disputedClaims) && event.disputedClaims.length > 0);
}

/**
 * Get events (alias for getRecentEvents)
 */
export async function getEvents(limitCount = 50) {
  return await getRecentEvents(limitCount);
}