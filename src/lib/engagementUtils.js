/**
 * User Engagement Tracking System
 * Tracks views, likes, comments, and shares for events
 */

import { db } from "./firebase";
import { doc, updateDoc, increment, arrayUnion, getDoc, serverTimestamp } from "firebase/firestore";
import { calculateRankScore } from "./rankUtils";

/**
 * Record a view for an event
 * Auto-increments view count
 */
export async function recordView(eventId) {
  if (!eventId) return false;
  
  try {
    const eventRef = doc(db, "events", eventId);
    
    await updateDoc(eventRef, {
      views: increment(1),
      lastViewedAt: serverTimestamp()
    });
    
    console.log(`👁️ [ENGAGEMENT] Recorded view for event: ${eventId}`);
    return true;
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error recording view:', error);
    return false;
  }
}

/**
 * Record a like for an event
 * Prevents duplicate likes from same user
 */
export async function recordLike(eventId, userId) {
  if (!eventId || !userId) return { success: false, error: 'Missing eventId or userId' };
  
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      return { success: false, error: 'Event not found' };
    }
    
    const eventData = eventSnap.data();
    const likedBy = eventData.likedBy || [];
    
    // Check if user already liked
    if (likedBy.includes(userId)) {
      return { success: false, error: 'Already liked', alreadyLiked: true };
    }
    
    // Add like
    await updateDoc(eventRef, {
      upvotes: increment(1),
      likedBy: arrayUnion(userId),
      lastInteractionAt: serverTimestamp()
    });
    
    console.log(`❤️ [ENGAGEMENT] User ${userId} liked event: ${eventId}`);
    
    // Trigger rank recalculation
    await updateRankAfterEngagement(eventId);
    
    return { success: true, newCount: (eventData.upvotes || 0) + 1 };
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error recording like:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a like for an event
 */
export async function removeLike(eventId, userId) {
  if (!eventId || !userId) return { success: false };
  
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      return { success: false, error: 'Event not found' };
    }
    
    const eventData = eventSnap.data();
    const likedBy = eventData.likedBy || [];
    
    if (!likedBy.includes(userId)) {
      return { success: false, error: 'Not liked yet' };
    }
    
    // Remove like
    const { arrayRemove } = await import('firebase/firestore');
    await updateDoc(eventRef, {
      upvotes: increment(-1),
      likedBy: arrayRemove(userId)
    });
    
    console.log(`💔 [ENGAGEMENT] User ${userId} unliked event: ${eventId}`);
    
    // Trigger rank recalculation
    await updateRankAfterEngagement(eventId);
    
    return { success: true, newCount: Math.max(0, (eventData.upvotes || 1) - 1) };
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error removing like:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Record a comment on an event
 */
export async function recordComment(eventId, userId, commentText, username = 'Anonymous') {
  if (!eventId || !userId || !commentText) {
    return { success: false, error: 'Missing required fields' };
  }
  
  try {
    const eventRef = doc(db, "events", eventId);
    
    const newComment = {
      id: `comment_${Date.now()}_${userId}`,
      userId,
      username,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
      upvotes: 0
    };
    
    await updateDoc(eventRef, {
      comments: arrayUnion(newComment),
      commentCount: increment(1),
      lastInteractionAt: serverTimestamp()
    });
    
    console.log(`💬 [ENGAGEMENT] User ${userId} commented on event: ${eventId}`);
    
    // Trigger rank recalculation
    await updateRankAfterEngagement(eventId);
    
    return { success: true, comment: newComment };
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error recording comment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Record a share action
 */
export async function recordShare(eventId, userId, platform = 'unknown') {
  if (!eventId) return false;
  
  try {
    const eventRef = doc(db, "events", eventId);
    
    await updateDoc(eventRef, {
      shares: increment(1),
      sharedBy: arrayUnion({ userId, platform, at: new Date().toISOString() }),
      lastInteractionAt: serverTimestamp()
    });
    
    console.log(`📤 [ENGAGEMENT] Event ${eventId} shared on ${platform}`);
    
    // Trigger rank recalculation
    await updateRankAfterEngagement(eventId);
    
    return true;
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error recording share:', error);
    return false;
  }
}

/**
 * Recalculate rank after engagement change
 */
export async function updateRankAfterEngagement(eventId) {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      console.error('❌ [ENGAGEMENT] Event not found for rank update');
      return false;
    }
    
    const eventData = { id: eventSnap.id, ...eventSnap.data() };
    
    // Calculate new rank score
    const newRankScore = calculateRankScore(eventData);
    
    // Update rank
    await updateDoc(eventRef, {
      rankScore: newRankScore,
      rankedAt: serverTimestamp()
    });
    
    console.log(`📊 [ENGAGEMENT] Updated rank for ${eventId}: ${newRankScore}`);
    return true;
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error updating rank:', error);
    return false;
  }
}

/**
 * Get engagement stats for an event
 */
export async function getEngagementStats(eventId) {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      return null;
    }
    
    const data = eventSnap.data();
    
    return {
      views: data.views || 0,
      upvotes: data.upvotes || 0,
      downvotes: data.downvotes || 0,
      comments: data.comments?.length || 0,
      commentCount: data.commentCount || 0,
      shares: data.shares || 0,
      rankScore: data.rankScore || 0
    };
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error fetching stats:', error);
    return null;
  }
}

/**
 * Check if user has liked an event
 */
export async function hasUserLiked(eventId, userId) {
  if (!eventId || !userId) return false;
  
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) return false;
    
    const likedBy = eventSnap.data().likedBy || [];
    return likedBy.includes(userId);
  } catch (error) {
    console.error('❌ [ENGAGEMENT] Error checking like status:', error);
    return false;
  }
}

export default {
  recordView,
  recordLike,
  removeLike,
  recordComment,
  recordShare,
  updateRankAfterEngagement,
  getEngagementStats,
  hasUserLiked
};

