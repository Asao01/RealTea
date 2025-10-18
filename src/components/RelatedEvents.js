"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

/**
 * RelatedEvents Component
 * Displays linked events with relationship types and confidence scores
 */
export default function RelatedEvents({ eventId, eventDate, eventTitle }) {
  const [relatedEvents, setRelatedEvents] = useState({
    supporting: [],
    opposing: [],
    consequential: []
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasRelations, setHasRelations] = useState(false);

  useEffect(() => {
    if (expanded && eventId) {
      fetchRelatedEvents();
    }
  }, [expanded, eventId]);

  const fetchRelatedEvents = async () => {
    if (!db || loading) return;
    
    setLoading(true);
    
    try {
      console.log(`🔗 [RELATED] Fetching related events for: ${eventId}`);

      // Fetch all events
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(
        eventsRef,
        orderBy('credibilityScore', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(eventsQuery);
      const allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter events with relatedTo field containing this event
      const related = allEvents.filter(event => {
        if (!event.relatedTo || !Array.isArray(event.relatedTo)) return false;
        return event.relatedTo.some(rel => rel.eventId === eventId);
      });

      console.log(`🔗 [RELATED] Found ${related.length} related events`);

      // Group by relationship type
      const grouped = {
        supporting: [],
        opposing: [],
        consequential: []
      };

      related.forEach(event => {
        const relation = event.relatedTo.find(r => r.eventId === eventId);
        if (!relation) return;

        // Only include if credibility and confidence >= 0.6
        const credibility = (event.credibilityScore || 0) / 100;
        const confidence = relation.confidence || 0;

        if (credibility >= 0.6 && confidence >= 0.6) {
          const enrichedEvent = {
            ...event,
            relationConfidence: confidence,
            relationType: relation.type
          };

          if (relation.type === 'supporting') {
            grouped.supporting.push(enrichedEvent);
          } else if (relation.type === 'opposing') {
            grouped.opposing.push(enrichedEvent);
          } else if (relation.type === 'consequential') {
            grouped.consequential.push(enrichedEvent);
          }
        }
      });

      // Sort each group by credibility, then confidence
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => {
          const credDiff = (b.credibilityScore || 0) - (a.credibilityScore || 0);
          if (credDiff !== 0) return credDiff;
          return (b.relationConfidence || 0) - (a.relationConfidence || 0);
        });
      });

      setRelatedEvents(grouped);
      const totalRelated = grouped.supporting.length + grouped.opposing.length + grouped.consequential.length;
      setHasRelations(totalRelated > 0);

      console.log(`🔗 [RELATED] Grouped: ${grouped.supporting.length} supporting, ${grouped.opposing.length} opposing, ${grouped.consequential.length} consequential`);

    } catch (error) {
      console.error('❌ [RELATED] Error fetching related events:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRelated = relatedEvents.supporting.length + relatedEvents.opposing.length + relatedEvents.consequential.length;

  return (
    <div className="mt-4">
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="font-semibold text-gray-700">
            Related Events
            {!expanded && totalRelated > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[#D4AF37] text-white text-xs rounded-full">
                {totalRelated}
              </span>
            )}
          </span>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Related Events Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="py-8 text-center">
                <div className="inline-block h-8 w-8 rounded-full border-4 border-t-transparent border-[#D4AF37] animate-spin"></div>
                <p className="mt-3 text-sm text-gray-600">Finding related events...</p>
              </div>
            ) : !hasRelations ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500">No related events yet</p>
                <p className="text-xs text-gray-400 mt-2">Relationships are automatically discovered by AI</p>
              </div>
            ) : (
              <div className="py-4 space-y-6">
                {/* Supporting Events */}
                {relatedEvents.supporting.length > 0 && (
                  <RelationGroup
                    title="Supporting Evidence"
                    events={relatedEvents.supporting}
                    icon="🔹"
                    accentColor="green"
                    description="Events that agree with or corroborate this event"
                  />
                )}

                {/* Opposing Events */}
                {relatedEvents.opposing.length > 0 && (
                  <RelationGroup
                    title="Conflicting Information"
                    events={relatedEvents.opposing}
                    icon="🔸"
                    accentColor="red"
                    description="Events that contradict or dispute this event"
                  />
                )}

                {/* Consequential Events */}
                {relatedEvents.consequential.length > 0 && (
                  <RelationGroup
                    title="Consequences & Follow-ups"
                    events={relatedEvents.consequential}
                    icon="⚪"
                    accentColor="gray"
                    description="Events that resulted from or followed this event"
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Relation Group Component
 * Displays a group of related events with consistent styling
 */
function RelationGroup({ title, events, icon, accentColor, description }) {
  const accentClasses = {
    green: {
      border: 'border-l-green-500',
      bg: 'bg-green-50',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700'
    },
    red: {
      border: 'border-l-red-500',
      bg: 'bg-red-50',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700'
    },
    gray: {
      border: 'border-l-gray-500',
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-700'
    }
  };

  const colors = accentClasses[accentColor] || accentClasses.gray;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h4 className={`font-semibold ${colors.text}`}>{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <span className={`ml-auto px-2 py-1 ${colors.badge} text-xs font-bold rounded-full`}>
          {events.length}
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={`/event/${event.id}`}>
              <div className={`p-4 ${colors.bg} border-l-4 ${colors.border} rounded-r-lg hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 mb-1">
                      {event.title}
                    </h5>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {event.description || event.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>📅 {event.date || event.year}</span>
                      <span>📍 {event.region || event.location}</span>
                      {event.category && (
                        <span className="px-2 py-0.5 bg-white border border-gray-300 rounded-full">
                          {event.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confidence & Credibility Indicators */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Credibility:</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                        event.credibilityScore >= 80 ? 'bg-green-100 text-green-700' :
                        event.credibilityScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {event.credibilityScore || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                        {Math.round((event.relationConfidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

