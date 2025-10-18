"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { addComment, voteOnComment, editComment, deleteComment, calculateCommentScore } from "../lib/commentService";
import TrustScoreMeter from "./TrustScoreMeter";
import { formatDistanceToNow } from "date-fns";

export default function CommentThread({ eventId }) {
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [sortBy, setSortBy] = useState('top'); // top, newest, contested
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  // Load comments
  useEffect(() => {
    if (!eventId || !db) return;

    const commentsRef = collection(db, 'events', eventId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setComments(fetchedComments);
      setLoading(false);
      console.log(`💬 Loaded ${fetchedComments.length} comments for event ${eventId}`);
    });

    return () => unsubscribe();
  }, [eventId]);

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (a.deleted || b.deleted) return 0;
    
    switch (sortBy) {
      case 'top':
        return calculateCommentScore(b) - calculateCommentScore(a);
      case 'newest':
        return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
      case 'contested':
        const aRatio = (a.downvotes || 0) / ((a.upvotes || 0) + (a.downvotes || 0) || 1);
        const bRatio = (b.downvotes || 0) / ((b.upvotes || 0) + (b.downvotes || 0) || 1);
        return bRatio - aRatio;
      default:
        return 0;
    }
  });

  // Filter into top-level and replies
  const topLevelComments = sortedComments.filter(c => !c.parentId && !c.deleted);
  const getReplies = (parentId) => 
    sortedComments.filter(c => c.parentId === parentId && !c.deleted);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      alert('Please login to comment');
      return;
    }

    if (!newCommentText.trim()) {
      alert('Please enter a comment');
      return;
    }

    setSubmitting(true);

    try {
      await addComment(
        eventId,
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'Anonymous',
        newCommentText.trim(),
        replyingTo
      );

      setNewCommentText('');
      setReplyingTo(null);
      
    } catch (error) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[#D4AF37]">
          Discussion ({comments.length})
        </h3>
        
        {/* Sort Tabs */}
        <div className="flex gap-2">
          {['top', 'newest', 'contested'].map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === sort
                  ? 'bg-[#D4AF37] text-[#0b0b0b]'
                  : 'bg-[#1a1a1a] text-gray-400 hover:text-[#D4AF37]'
              }`}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-400">
                Replying to comment...
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                Cancel
              </button>
            </div>
          )}
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Share your thoughts, fact-check, or ask questions..."
            rows={3}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none resize-none mb-3"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {newCommentText.length}/1000 characters
            </span>
            <button
              type="submit"
              disabled={submitting || !newCommentText.trim()}
              className="px-6 py-2 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : replyingTo ? 'Post Reply' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 bg-[#1a1a1a] border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm mb-3">
            Please login to join the discussion
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-colors"
          >
            Login
          </a>
        </div>
      )}

      {/* Comments List */}
      {topLevelComments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">💬</div>
          <p>No comments yet. Be the first to discuss!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              eventId={eventId}
              currentUser={user}
              replies={getReplies(comment.id)}
              onReply={(commentId) => setReplyingTo(commentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual Comment Component
 */
function Comment({ comment, eventId, currentUser, replies = [], onReply, depth = 0 }) {
  const [showReplies, setShowReplies] = useState(true);
  const [userVote, setUserVote] = useState(null);
  const [upvotes, setUpvotes] = useState(comment.upvotes || 0);
  const [downvotes, setDownvotes] = useState(comment.downvotes || 0);
  const [voting, setVoting] = useState(false);

  const isOwn = currentUser && comment.userId === currentUser.uid;
  const canEdit = isOwn && comment.createdAt && 
    (Date.now() - comment.createdAt.toDate().getTime()) < 10 * 60 * 1000;

  async function handleVote(voteValue) {
    if (!currentUser) {
      alert('Please login to vote');
      return;
    }

    if (voting) return;
    setVoting(true);

    try {
      await voteOnComment(eventId, comment.id, currentUser.uid, voteValue);
      
      // Update local state
      if (voteValue === 1) {
        if (userVote === 1) {
          setUpvotes(prev => Math.max(0, prev - 1));
          setUserVote(null);
        } else {
          setUpvotes(prev => prev + 1);
          if (userVote === -1) setDownvotes(prev => Math.max(0, prev - 1));
          setUserVote(1);
        }
      } else {
        if (userVote === -1) {
          setDownvotes(prev => Math.max(0, prev - 1));
          setUserVote(null);
        } else {
          setDownvotes(prev => prev + 1);
          if (userVote === 1) setUpvotes(prev => Math.max(0, prev - 1));
          setUserVote(-1);
        }
      }

    } catch (error) {
      alert('Failed to vote: ' + error.message);
    } finally {
      setVoting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-8 md:ml-12' : ''}`}
    >
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C878] flex items-center justify-center text-sm font-bold">
              {comment.username?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">
                  {comment.username || 'Anonymous'}
                </span>
                {comment.trustScoreSnapshot && (
                  <TrustScoreMeter 
                    score={comment.trustScoreSnapshot} 
                    size="xs"
                    showTooltip={true}
                  />
                )}
              </div>
              <span className="text-xs text-gray-500">
                {comment.createdAt && formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
                {comment.edited && ' • (edited)'}
              </span>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <button
                className="text-xs text-gray-500 hover:text-[#D4AF37]"
                onClick={() => {/* Edit handler */}}
              >
                Edit
              </button>
              <button
                className="text-xs text-gray-500 hover:text-red-400"
                onClick={async () => {
                  if (confirm('Delete this comment?')) {
                    await deleteComment(eventId, comment.id, currentUser.uid);
                  }
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Comment Text */}
        <p className="text-sm text-gray-300 leading-relaxed mb-3">
          {comment.text}
        </p>

        {/* Comment Actions */}
        <div className="flex items-center gap-4">
          {/* Voting */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote(1)}
              disabled={voting || !currentUser}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                userVote === 1
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-500 hover:text-green-400'
              } disabled:opacity-50`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">{upvotes}</span>
            </button>

            <button
              onClick={() => handleVote(-1)}
              disabled={voting || !currentUser}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                userVote === -1
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-gray-500 hover:text-red-400'
              } disabled:opacity-50`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">{downvotes}</span>
            </button>
          </div>

          {/* Reply Button */}
          {depth < 2 && currentUser && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-gray-500 hover:text-[#D4AF37] transition-colors"
            >
              Reply
            </button>
          )}

          {/* Reply Count */}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-gray-500 hover:text-[#D4AF37] transition-colors"
            >
              {showReplies ? '▼' : '▶'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {showReplies && replies.length > 0 && (
        <div className="mt-3">
          {replies.slice(0, 50).map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              eventId={eventId}
              currentUser={currentUser}
              replies={[]}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
          {replies.length > 50 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              {replies.length - 50} more replies (load more)
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

