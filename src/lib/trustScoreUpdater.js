/**
 * Trust Score Updater
 * Automatically adjusts user trust scores based on actions
 */

import { db } from "./firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { calculateTrustScore } from "./antiAbuse";
import { logSystemAction } from "./antiAbuse";

/**
 * Update trust score based on action
 * 
 * Actions and adjustments:
 * - 'verified_upvote': +2 (voting with majority on credible events)
 * - 'post_verified': +1 (posting fact-checked event)
 * - 'flagged_content': -2 (repeated flags or low-credibility posts)
 * - 'abuse_detected': -5 (flagged by anti-abuse filters)
 * - 'approved_correction': +3 (correction approved by admin)
 * - 'rejected_correction': -1 (correction rejected)
 */
export async function updateTrustScore(userId, actionType, metadata = {}) {
  try {
    if (!userId) return;

    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);

    if (!userStatsSnap.exists()) {
      console.log(`⚠️ User stats not found for ${userId}`);
      return;
    }

    const currentStats = userStatsSnap.data();
    const oldTrustScore = calculateTrustScore(currentStats);

    // Determine adjustment based on action
    let adjustment = 0;
    let reason = '';

    switch (actionType) {
      case 'verified_upvote':
        adjustment = 2;
        reason = 'Voted with majority on credible event';
        break;
      
      case 'post_verified':
        adjustment = 1;
        reason = 'Posted fact-checked event';
        break;
      
      case 'flagged_content':
        adjustment = -2;
        reason = 'Content flagged by moderators';
        break;
      
      case 'abuse_detected':
        adjustment = -5;
        reason = 'Flagged by anti-abuse system';
        break;
      
      case 'approved_correction':
        adjustment = 3;
        reason = 'Correction approved by admin';
        break;
      
      case 'rejected_correction':
        adjustment = -1;
        reason = 'Correction rejected';
        break;
      
      case 'burst_voting':
        adjustment = -3;
        reason = 'Burst voting detected';
        break;
      
      default:
        console.log(`⚠️ Unknown action type: ${actionType}`);
        return;
    }

    // Update user stats with the action
    const updates = {
      lastTrustUpdate: serverTimestamp(),
      lastTrustUpdateAction: actionType,
      lastTrustUpdateReason: reason
    };

    // Apply specific stat updates
    if (actionType === 'verified_upvote') {
      updates.alignedVotes = (currentStats.alignedVotes || 0) + 1;
    } else if (actionType === 'flagged_content') {
      updates.flaggedContent = (currentStats.flaggedContent || 0) + 1;
    } else if (actionType === 'approved_correction') {
      updates.approvedCorrections = (currentStats.approvedCorrections || 0) + 1;
    } else if (actionType === 'abuse_detected') {
      updates.ipViolations = (currentStats.ipViolations || 0) + 1;
    } else if (actionType === 'burst_voting') {
      updates.burstVoting = true;
      updates.burstDetectedAt = serverTimestamp();
    }

    await updateDoc(userStatsRef, updates);

    // Recalculate trust score
    const updatedStatsSnap = await getDoc(userStatsRef);
    const newTrustScore = calculateTrustScore(updatedStatsSnap.data());

    // Log the trust score change
    await logSystemAction({
      actionType: 'trust_score_update',
      userId: userId,
      result: 'updated',
      metadata: {
        action: actionType,
        reason: reason,
        oldScore: oldTrustScore,
        newScore: newTrustScore,
        adjustment: adjustment,
        ...metadata
      }
    });

    console.log(`✅ Trust score updated for user: ${oldTrustScore} → ${newTrustScore} (${actionType}: ${adjustment >= 0 ? '+' : ''}${adjustment})`);

    return {
      oldScore: oldTrustScore,
      newScore: newTrustScore,
      adjustment: adjustment,
      reason: reason
    };

  } catch (error) {
    console.error('❌ Error updating trust score:', error);
    throw error;
  }
}

/**
 * Recalculate all user trust scores
 * Should be run via cron job every 6 hours
 */
export async function recalculateAllTrustScores() {
  try {
    console.log('🔄 Recalculating all trust scores...');
    
    const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
    const userStatsRef = collection(db, 'userStats');
    const snapshot = await getDocs(userStatsRef);

    let updated = 0;
    let unchanged = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const currentScore = data.cachedTrustScore || 50;
      const newScore = calculateTrustScore(data);

      if (newScore !== currentScore) {
        await updateDoc(doc(db, 'userStats', docSnap.id), {
          cachedTrustScore: newScore,
          lastTrustRecalculation: serverTimestamp()
        });
        updated++;
      } else {
        unchanged++;
      }
    }

    console.log(`✅ Trust score recalculation complete: ${updated} updated, ${unchanged} unchanged`);

    return { updated, unchanged, total: snapshot.size };

  } catch (error) {
    console.error('❌ Error recalculating trust scores:', error);
    throw error;
  }
}

/**
 * Get user trust score (cached for performance)
 */
export async function getUserTrustScore(userId) {
  try {
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);

    if (!userStatsSnap.exists()) {
      return 50; // Default score for new users
    }

    const data = userStatsSnap.data();
    
    // Use cached score if available and recent (< 1 hour old)
    if (data.cachedTrustScore && data.lastTrustRecalculation) {
      const cacheAge = Date.now() - data.lastTrustRecalculation.toDate().getTime();
      if (cacheAge < 60 * 60 * 1000) { // 1 hour
        return data.cachedTrustScore;
      }
    }

    // Recalculate if cache is stale
    const newScore = calculateTrustScore(data);
    
    // Update cache
    await updateDoc(userStatsRef, {
      cachedTrustScore: newScore,
      lastTrustRecalculation: serverTimestamp()
    });

    return newScore;

  } catch (error) {
    console.error('Error getting trust score:', error);
    return 50; // Default on error
  }
}

export default {
  updateTrustScore,
  recalculateAllTrustScores,
  getUserTrustScore
};

