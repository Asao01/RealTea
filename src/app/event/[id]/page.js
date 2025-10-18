"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { db } from "../../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, onSnapshot } from "firebase/firestore";
import Footer from "../../../components/Footer";
import VotingButtons from "../../../components/VotingButtons";

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [event, setEvent] = useState(null);
  const [aiComments, setAiComments] = useState([]);
  const [biasMetrics, setBiasMetrics] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(true);

  // Fetch event details
  useEffect(() => {
    if (!id || !db) return;
    
    async function fetchEvent() {
      try {
        const eventRef = doc(db, 'events', id);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
          const eventData = { id: eventSnap.id, ...eventSnap.data() };
          setEvent(eventData);
          
          // Fetch related events
          fetchRelatedEvents(eventData);
        } else {
          setEvent(null);
          setLoadingRelated(false);
        }
      } catch (error) {
        console.error('❌ Error fetching event:', error);
        setEvent(null);
        setLoadingRelated(false);
      } finally {
        setLoading(false);
      }
    }
    
    fetchEvent();
  }, [id]);

  // Real-time AI comments listener
  useEffect(() => {
    if (!id || !db) return;
    
    const commentsRef = collection(db, `events/${id}/ai_comments`);
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAiComments(comments);
      setLoadingComments(false);
      console.log(`💬 [EVENT] Loaded ${comments.length} AI comments`);
    }, (error) => {
      console.error('❌ Error fetching AI comments:', error);
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [id]);

  // Real-time bias metrics listener
  useEffect(() => {
    if (!id || !db) return;
    
    const fetchBiasMetrics = async () => {
      try {
        const biasRef = doc(db, `events/${id}/biasMetrics`, 'latest');
        const biasSnap = await getDoc(biasRef);
        
        if (biasSnap.exists()) {
          setBiasMetrics(biasSnap.data());
          console.log(`📊 [EVENT] Loaded bias metrics`);
        }
      } catch (error) {
        console.error('❌ Error fetching bias metrics:', error);
      }
    };
    
    fetchBiasMetrics();
  }, [id]);

  // Fetch related events
  async function fetchRelatedEvents(currentEvent) {
    try {
      const eventsRef = collection(db, 'events');
      
      // Find events in same category or region
      const relatedQuery = query(
        eventsRef,
        where('category', '==', currentEvent.category),
        orderBy('credibilityScore', 'desc'),
        limit(6)
      );
      
      const relatedSnap = await getDocs(relatedQuery);
      const related = relatedSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(e => e.id !== currentEvent.id)
        .slice(0, 5);
      
      setRelatedEvents(related);
      console.log(`✅ Found ${related.length} related events`);
    } catch (error) {
      console.error('❌ Error fetching related events:', error);
      setRelatedEvents([]);
    } finally {
      setLoadingRelated(false);
    }
  }

  // Get verification badge
  function getVerificationBadge(event) {
    if (event.verified === true) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg text-sm font-semibold">
          <span>✅</span>
          <span>Verified</span>
        </div>
      );
    } else if (event.verified === false && (event.credibilityScore ?? 70) < 40) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm font-semibold">
          <span>❌</span>
          <span>Disputed</span>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg text-sm font-semibold">
          <span>⚠️</span>
          <span>Under Review</span>
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b]">
        <div className="max-w-4xl mx-auto px-4 py-20 mt-24">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-800 rounded w-3/4"></div>
            <div className="h-64 bg-gray-800 rounded-xl"></div>
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            <div className="h-4 bg-gray-800 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0b0b0b]">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-300 mb-2">Event Not Found</h2>
            <p className="text-gray-500">The event you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <div className="max-w-4xl mx-auto px-4 py-20 mt-24">
        {/* Event Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-sm font-medium">
              {event.category}
            </span>
            {event.year && (
              <span className="px-3 py-1 bg-[#1a1a1a] text-gray-400 rounded-lg text-sm">
                {event.year}
              </span>
            )}
            {getVerificationBadge(event)}
            {event.credibilityScore && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm border border-blue-500/30">
                Credibility: {event.credibilityScore}/100
              </span>
            )}
            {event.importanceScore && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm border border-purple-500/30">
                Importance: {event.importanceScore}/100
              </span>
            )}
            {/* Bias Analysis Badges */}
            {event.alignment && (
              <span 
                className="px-3 py-1 bg-gray-700/20 text-gray-300 rounded-lg text-sm border border-gray-600/30"
                title={event.biasSummary || 'Political alignment analysis'}
              >
                {event.alignment === 'Left' && '⬅️ Left'}
                {event.alignment === 'Right' && '➡️ Right'}
                {event.alignment === 'Neutral' && '⚖️ Neutral'}
                {event.alignment === 'State' && '🏛️ State'}
              </span>
            )}
            {event.toneScore !== undefined && (
              <span 
                className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm border border-indigo-500/30"
                title={`Tone: ${event.toneScore <= 40 ? 'Emotional' : event.toneScore <= 60 ? 'Measured' : 'Factual'}`}
              >
                Tone: {event.toneScore}/100
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-[#e5e5e5] mb-4">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            {event.date && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{event.date}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Event Image */}
        {event.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-xl overflow-hidden"
          >
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-64 object-cover"
            />
          </motion.div>
        )}

        {/* Long Description Article */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] border border-gray-700 rounded-xl p-8 mb-6"
        >
          <div className="prose prose-invert prose-lg max-w-none">
            {event.longDescription && event.longDescription.length > 200 ? (
              <div className="text-gray-200 leading-relaxed space-y-4">
                {event.longDescription.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-lg">{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-gray-200 leading-relaxed text-lg">
                {event.description || 'No description available'}
              </p>
            )}
          </div>

          {/* Bias Analysis Section - from subcollection or main doc */}
          {(biasMetrics || event.biasSummary) && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h4 className="text-sm font-semibold text-[#D4AF37] mb-3">📊 Coverage Analysis</h4>
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">Bias Spectrum:</span>
                      <span className="text-sm font-medium text-gray-200">
                        {biasMetrics ? biasMetrics.biasLabel : 
                          (event.biasScore <= -50 ? '🚨 Propaganda' :
                           event.biasScore > -50 && event.biasScore <= -20 ? '⚠️ Partisan' :
                           event.biasScore > -20 && event.biasScore < 20 ? '✅ Balanced' :
                           event.biasScore >= 20 && event.biasScore < 50 ? '📰 Editorial' :
                           event.biasScore >= 50 ? '🔍 Investigative' : 'Unknown')}
                        {' '}({(biasMetrics?.biasScore || event.biasScore || 0) > 0 ? '+' : ''}{biasMetrics?.biasScore || event.biasScore || 0})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">Tone:</span>
                      <span className="text-sm font-medium text-gray-200">
                        {biasMetrics ? biasMetrics.toneLabel :
                          (event.toneScore <= 40 ? '🔥 Emotional' :
                           event.toneScore > 40 && event.toneScore <= 60 ? '📢 Persuasive' :
                           event.toneScore > 60 && event.toneScore <= 80 ? '📊 Factual' :
                           event.toneScore > 80 ? '🔬 Clinical' : 'Unknown')}
                        {' '}({biasMetrics?.toneScore || event.toneScore || 50}/100)
                      </span>
                    </div>
                    {biasMetrics?.perspectiveDiversity && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        Perspectives: 
                        {biasMetrics.perspectiveDiversity.western > 0 && ' 🌎 Western'}
                        {biasMetrics.perspectiveDiversity.eastern > 0 && ' 🌏 Eastern'}
                        {biasMetrics.perspectiveDiversity.globalSouth > 0 && ' 🌍 Global South'}
                        {biasMetrics.perspectiveDiversity.independent > 0 && ' 🔍 Independent'}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-300 italic">
                  {biasMetrics?.biasSummary || event.biasSummary}
                </p>
                {biasMetrics?.analyzedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Analyzed: {biasMetrics.analyzedAt.toDate?.()?.toLocaleString() || 'Recently'}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Sources */}
        {(event.sources?.length > 0 || event.verifiedSource) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6 mb-6"
          >
            <h3 className="text-lg font-bold text-[#D4AF37] mb-4">📚 Verified Sources</h3>
            <div className="space-y-2">
              {event.sources && event.sources.length > 0 ? (
                event.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-[#D4AF37] transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                    <span className="break-all">{source}</span>
                  </a>
                ))
              ) : event.verifiedSource ? (
                <a
                  href={event.verifiedSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-[#D4AF37] transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  <span className="break-all">{event.verifiedSource}</span>
                </a>
              ) : null}
            </div>
          </motion.div>
        )}

        {/* AI Verification Comments */}
        {!loadingComments && aiComments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6 mb-6"
          >
            <h3 className="text-lg font-bold text-[#D4AF37] mb-4">🤖 AI Verification Comments</h3>
            <div className="space-y-4">
              {aiComments.map((comment) => (
                <div key={comment.id} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-[#D4AF37]">{comment.author}</span>
                    <span className="text-xs text-gray-500">
                      {comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{comment.text}</p>
                  {comment.credibilityScore && (
                    <div className="mt-2 text-xs text-gray-500">
                      Score: {comment.credibilityScore}/100
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Voting */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#141414] border border-gray-700 rounded-xl p-6 mb-6"
        >
          <h3 className="text-sm font-medium text-gray-400 mb-3">Rate this event's accuracy</h3>
          <VotingButtons
            eventId={event.id}
            initialUpvotes={event.upvotes || 0}
            initialDownvotes={event.downvotes || 0}
          />
        </motion.div>

        {/* Related Events */}
        {!loadingRelated && relatedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 pt-12 border-t border-gray-800"
          >
            <h2 className="text-2xl font-bold text-[#D4AF37] mb-6">
              Related Events in {event.category}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedEvents.map((relatedEvent) => (
                <Link key={relatedEvent.id} href={`/event/${relatedEvent.id}`}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="bg-[#141414] border border-gray-700 rounded-lg p-4 hover:border-[#D4AF37] transition-all cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-200 mb-2 line-clamp-2 text-sm">
                      {relatedEvent.title}
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">
                      {relatedEvent.year}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {relatedEvent.description}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-12 flex items-center justify-between"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-lg hover:border-[#D4AF37] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>

          <Link href="/timeline">
            <button className="px-6 py-3 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-colors">
              View Full Timeline
            </button>
          </Link>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
