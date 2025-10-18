/**
 * Comment Service
 * Handles all comment operations with moderation and trust scoring
 */

import { db } from "./firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  where,
  serverTimestamp,
  increment 
} from "firebase/firestore";
import { moderateContent, logSystemAction } from "./antiAbuse";
import { getUserTrustScore, updateTrustScore } from "./trustScoreUpdater";

/**
 * Add comment to event
 * Includes moderation and rate limiting
 */
export async function addComment(eventId, userId, username, text, parentId = null) {
  try {
    // Check rate limit (max 3 comments per minute)
    const rateLimit = await checkCommentRateLimit(userId);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Please wait ${rateLimit.waitSeconds}s`);
    }

    // Moderate content
    const moderation = moderateContent(text);
    if (!moderation.clean) {
      // Flag for review
      await addDoc(collection(db, 'reviewQueue'), {
        type: 'comment',
        eventId,
        userId,
        content: text,
        reason: moderation.reason,
        severity: moderation.severity,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      throw new Error(`Comment flagged for moderation: ${moderation.reason}`);
    }

    // Get user trust score
    const trustScore = await getUserTrustScore(userId);

    // Create comment
    const commentsRef = collection(db, 'events', eventId, 'comments');
    const commentDoc = await addDoc(commentsRef, {
      userId,
      username,
      text,
      parentId: parentId || null,
      trustScoreSnapshot: trustScore,
      upvotes: 0,
      downvotes: 0,
      replies: 0,
      edited: false,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update parent reply count if this is a reply
    if (parentId) {
      const parentRef = doc(db, 'events', eventId, 'comments', parentId);
      await updateDoc(parentRef, {
        replies: increment(1)
      });
    }

    // Update rate limit
    await incrementCommentRateLimit(userId);

    // Log action
    await logSystemAction({
      actionType: 'comment_added',
      userId,
      eventId,
      commentId: commentDoc.id,
      result: 'accepted',
      metadata: { trustScore, parentId }
    });

    console.log(`✅ Comment added: ${commentDoc.id} by ${username}`);

    return { 
      success: true, 
      commentId: commentDoc.id,
      trustScore 
    };

  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Vote on comment
 */
export async function voteOnComment(eventId, commentId, userId, voteValue) {
  try {
    const commentRef = doc(db, 'events', eventId, 'comments', commentId);
    const voteRef = doc(db, 'commentVotes', `${userId}_${commentId}`);
    
    // Check existing vote
    const voteSnap = await getDoc(voteRef);
    const existingVote = voteSnap.exists() ? voteSnap.data().vote : null;

    let upvoteChange = 0;
    let downvoteChange = 0;

    if (voteValue === 1) {
      if (existingVote === 1) {
        // Remove upvote
        upvoteChange = -1;
        await deleteDoc(voteRef);
      } else if (existingVote === -1) {
        // Change to upvote
        upvoteChange = 1;
        downvoteChange = -1;
        await updateDoc(voteRef, { vote: 1, votedAt: serverTimestamp() });
      } else {
        // New upvote
        upvoteChange = 1;
        await addDoc(collection(db, 'commentVotes'), {
          userId,
          commentId,
          eventId,
          vote: 1,
          votedAt: serverTimestamp()
        });
      }
    } else if (voteValue === -1) {
      if (existingVote === -1) {
        // Remove downvote
        downvoteChange = -1;
        await deleteDoc(voteRef);
      } else if (existingVote === 1) {
        // Change to downvote
        upvoteChange = -1;
        downvoteChange = 1;
        await updateDoc(voteRef, { vote: -1, votedAt: serverTimestamp() });
      } else {
        // New downvote
        downvoteChange = 1;
        await addDoc(collection(db, 'commentVotes'), {
          userId,
          commentId,
          eventId,
          vote: -1,
          votedAt: serverTimestamp()
        });
      }
    }

    // Update comment vote counts
    if (upvoteChange !== 0 || downvoteChange !== 0) {
      const commentSnap = await getDoc(commentRef);
      const commentData = commentSnap.data();
      
      await updateDoc(commentRef, {
        upvotes: Math.max(0, (commentData.upvotes || 0) + upvoteChange),
        downvotes: Math.max(0, (commentData.downvotes || 0) + downvoteChange)
      });

      // Update commenter's trust score if their comment got upvoted/downvoted
      if (upvoteChange > 0 && commentData.userId) {
        await updateTrustScore(commentData.userId, 'verified_upvote', {
          context: 'comment_upvoted'
        });
      } else if (downvoteChange > 0 && commentData.userId) {
        await updateTrustScore(commentData.userId, 'flagged_content', {
          context: 'comment_downvoted'
        });
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error voting on comment:', error);
    throw error;
  }
}

/**
 * Edit comment (within 10 minutes)
 */
export async function editComment(eventId, commentId, userId, newText) {
  try {
    const commentRef = doc(db, 'events', eventId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentSnap.data();

    // Check ownership
    if (commentData.userId !== userId) {
      throw new Error('Unauthorized: You can only edit your own comments');
    }

    // Check time limit (10 minutes)
    const createdAt = commentData.createdAt?.toDate();
    const now = new Date();
    const timeDiff = now - createdAt;
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff > 10) {
      throw new Error('Edit time expired (10 minutes limit)');
    }

    // Moderate new content
    const moderation = moderateContent(newText);
    if (!moderation.clean) {
      throw new Error(`Content flagged: ${moderation.reason}`);
    }

    // Update comment
    await updateDoc(commentRef, {
      text: newText,
      edited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Comment edited: ${commentId}`);

    return { success: true };

  } catch (error) {
    console.error('Error editing comment:', error);
    throw error;
  }
}

/**
 * Delete comment (within 10 minutes)
 */
export async function deleteComment(eventId, commentId, userId) {
  try {
    const commentRef = doc(db, 'events', eventId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentSnap.data();

    // Check ownership
    if (commentData.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own comments');
    }

    // Check time limit (10 minutes)
    const createdAt = commentData.createdAt?.toDate();
    const now = new Date();
    const timeDiff = now - createdAt;
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff > 10) {
      throw new Error('Delete time expired (10 minutes limit)');
    }

    // Soft delete (keep for audit trail)
    await updateDoc(commentRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      text: '[deleted]'
    });

    console.log(`✅ Comment deleted: ${commentId}`);

    return { success: true };

  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Check comment rate limit (max 3 per minute)
 */
async function checkCommentRateLimit(userId) {
  try {
    const rateLimitRef = doc(db, 'rateLimits', `${userId}_comment`);
    const rateLimitSnap = await getDoc(rateLimitRef);

    if (!rateLimitSnap.exists()) {
      return { allowed: true, remaining: 3 };
    }

    const data = rateLimitSnap.data();
    const minuteAgo = Date.now() - (60 * 1000);
    const lastReset = data.lastReset?.toDate()?.getTime() || 0;

    // Reset if more than a minute has passed
    if (lastReset < minuteAgo) {
      await updateDoc(rateLimitRef, {
        count: 0,
        lastReset: serverTimestamp()
      });
      return { allowed: true, remaining: 3 };
    }

    const count = data.count || 0;
    const remaining = Math.max(0, 3 - count);

    if (count >= 3) {
      const waitSeconds = Math.ceil((lastReset + 60000 - Date.now()) / 1000);
      return { 
        allowed: false, 
        remaining: 0,
        waitSeconds
      };
    }

    return { allowed: true, remaining };

  } catch (error) {
    console.error('Error checking comment rate limit:', error);
    return { allowed: true, remaining: 3 };
  }
}

/**
 * Increment comment rate limit
 */
async function incrementCommentRateLimit(userId) {
  try {
    const rateLimitRef = doc(db, 'rateLimits', `${userId}_comment`);
    const rateLimitSnap = await getDoc(rateLimitRef);

    if (!rateLimitSnap.exists()) {
      await addDoc(collection(db, 'rateLimits'), {
        userId,
        type: 'comment',
        count: 1,
        lastReset: serverTimestamp()
      });
    } else {
      await updateDoc(rateLimitRef, {
        count: increment(1)
      });
    }
  } catch (error) {
    console.error('Error incrementing comment rate limit:', error);
  }
}

/**
 * Calculate comment score
 * Used for sorting "Top Comments"
 */
export function calculateCommentScore(comment) {
  const upvotes = comment.upvotes || 0;
  const downvotes = comment.downvotes || 0;
  const netVotes = upvotes - downvotes;
  
  // Time decay factor
  const ageInHours = comment.createdAt 
    ? (Date.now() - comment.createdAt.toDate().getTime()) / (1000 * 60 * 60)
    : 0;
  
  const timeDecay = Math.pow(0.95, ageInHours / 24);
  
  // Trust score bonus
  const trustBonus = (comment.trustScoreSnapshot || 50) / 100;
  
  // Final score
  const score = (netVotes * trustBonus * timeDecay) + (comment.replies || 0) * 0.5;
  
  return score;
}

export default {
  addComment,
  voteOnComment,
  editComment,
  deleteComment,
  calculateCommentScore
};

