"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp, increment } from "firebase/firestore";

export default function VotingButtons({ eventId, initialUpvotes = 0, initialDownvotes = 0 }) {
  const [user, setUser] = useState(null);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(null); // 'up', 'down', or null
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && eventId) {
      loadUserVote();
    }
  }, [user, eventId]);

  async function loadUserVote() {
    try {
      const voteRef = doc(db, 'votes', `${user.uid}_${eventId}`);
      const voteSnap = await getDoc(voteRef);
      
      if (voteSnap.exists()) {
        setUserVote(voteSnap.data().vote);
      }
    } catch (error) {
      console.error('Error loading vote:', error);
    }
  }

  async function handleVote(voteType) {
    if (!user) {
      alert('Please login to vote');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      // Rate limiting check
      const rateLimitRef = doc(db, 'rateLimits', `${user.uid}_vote`);
      const rateLimitSnap = await getDoc(rateLimitRef);
      
      if (rateLimitSnap.exists()) {
        const lastVote = rateLimitSnap.data().lastVoteAt?.toDate();
        const timeSinceLastVote = Date.now() - lastVote?.getTime();
        
        if (timeSinceLastVote < 2000) { // 2 second cooldown
          alert('Please wait before voting again');
          setLoading(false);
          return;
        }
      }

      const voteRef = doc(db, 'votes', `${user.uid}_${eventId}`);
      const eventRef = doc(db, 'events', eventId);

      // Check if user already voted
      const existingVote = userVote;

      if (existingVote === voteType) {
        // Remove vote
        await setDoc(voteRef, { vote: null, removedAt: serverTimestamp() });
        
        if (voteType === 'up') {
          await setDoc(eventRef, { upvotes: increment(-1) }, { merge: true });
          setUpvotes(prev => Math.max(0, prev - 1));
        } else {
          await setDoc(eventRef, { downvotes: increment(-1) }, { merge: true });
          setDownvotes(prev => Math.max(0, prev - 1));
        }
        
        setUserVote(null);
      } else {
        // Change or add vote
        await setDoc(voteRef, {
          vote: voteType,
          userId: user.uid,
          eventId: eventId,
          votedAt: serverTimestamp()
        });

        // Update event document
        if (existingVote === 'up') {
          await setDoc(eventRef, { 
            upvotes: increment(-1),
            downvotes: increment(1)
          }, { merge: true });
          setUpvotes(prev => Math.max(0, prev - 1));
          setDownvotes(prev => prev + 1);
        } else if (existingVote === 'down') {
          await setDoc(eventRef, {
            upvotes: increment(1),
            downvotes: increment(-1)
          }, { merge: true });
          setUpvotes(prev => prev + 1);
          setDownvotes(prev => Math.max(0, prev - 1));
        } else {
          // First vote
          if (voteType === 'up') {
            await setDoc(eventRef, { upvotes: increment(1) }, { merge: true });
            setUpvotes(prev => prev + 1);
          } else {
            await setDoc(eventRef, { downvotes: increment(1) }, { merge: true });
            setDownvotes(prev => prev + 1);
          }
        }

        setUserVote(voteType);
      }

      // Update rate limit
      await setDoc(rateLimitRef, {
        lastVoteAt: serverTimestamp(),
        userId: user.uid
      });

      console.log(`✅ Vote ${voteType} recorded for event ${eventId}`);

    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to record vote');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Upvote */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => handleVote('up')}
        disabled={loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all ${
          userVote === 'up'
            ? 'bg-green-500/20 border-green-500 text-green-400'
            : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-green-500/50 hover:text-green-400'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">{upvotes}</span>
      </motion.button>

      {/* Downvote */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => handleVote('down')}
        disabled={loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all ${
          userVote === 'down'
            ? 'bg-red-500/20 border-red-500 text-red-400'
            : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-red-500/50 hover:text-red-400'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">{downvotes}</span>
      </motion.button>
    </div>
  );
}

