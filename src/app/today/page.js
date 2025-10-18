"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import TimelineEvent from "../../components/TimelineEvent";
import { generateAndStoreEvents } from "../../lib/autoEvents";

export default function TodayInHistoryPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  // Format date as MM-DD for matching
  function getMonthDay(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  // Fetch events for the selected date
  async function fetchEventsForDate(date) {
    setLoading(true);
    try {
      const monthDay = getMonthDay(date);
      
      // Fetch all events from Firestore
      const eventsRef = collection(db, "events");
      const snapshot = await getDocs(eventsRef);
      
      // Filter events that match the month and day
      const matchingEvents = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(event => {
          if (!event.date) return false;
          // Extract MM-DD from event date (handles YYYY-MM-DD format)
          const eventMonthDay = event.date.substring(5, 10); // Gets MM-DD
          return eventMonthDay === monthDay;
        })
        .sort((a, b) => {
          // Sort by year ascending (oldest first)
          return a.date.localeCompare(b.date);
        });

      setEvents(matchingEvents);

      // If NO events found, automatically generate with AI
      if (matchingEvents.length === 0) {
        await generateEventsForToday(date, matchingEvents.length);
      }
    } catch (error) {
      console.error("Error fetching today's events:", error);
    } finally {
      setLoading(false);
    }
  }

  // Generate AI events for today's date
  async function generateEventsForToday(date, currentCount) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      return;
    }

    setGenerating(true);
    
    try {
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const day = date.getDate();
      const monthDay = getMonthDay(date);

      console.log(`📅 Generating events for ${month} ${day}...`);

      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      const prompt = `Generate 3 factual historical events that happened on ${month} ${day} in past years (different years).

Each event must include:
- title: Brief, compelling title
- date: ISO format (YYYY-${monthDay}) where YYYY is the actual year it occurred
- location: City, Country or Region
- category: One of (Politics, Science, Culture, Conflict, Technology, Economy, Environment, Sports, Other)
- description: 2-3 sentences with key facts
- verifiedSource: A real, credible source URL

Return ONLY a valid JSON object with an "events" array:
{
  "events": [
    {
      "title": "Event Title",
      "date": "1969-${monthDay}",
      "location": "City, Country",
      "category": "Science",
      "description": "Detailed description...",
      "verifiedSource": "https://..."
    }
  ]
}`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a historical events curator. Generate accurate, well-documented historical events that occurred on specific dates in history.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content;
      const parsedData = JSON.parse(text);
      const generatedEvents = parsedData.events || [];

      // Save and fact-check each event
      const { addDoc, serverTimestamp, updateDoc, doc } = await import("firebase/firestore");
      const { factCheckEvent } = await import("../../lib/aiFactCheck");

      for (const event of generatedEvents) {
        
        // Create event
        const docRef = await addDoc(collection(db, "events"), {
          title: event.title || "Untitled Event",
          date: event.date || `${new Date().getFullYear()}-${monthDay}`,
          location: event.location || "",
          latitude: null,
          longitude: null,
          category: event.category || "Other",
          verifiedSource: event.verifiedSource || "",
          description: event.description || "",
          imageUrl: "",
          addedBy: "AI Generator",
          author: "AI Generator",
          sources: [],
          credibilityScore: null,
          verifiedSummary: "AI fact-checking in progress...",
          aiSources: [],
          factCheckStatus: "pending",
          aiGenerated: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Fact-check the event
        
        try {
          const factCheckResult = await factCheckEvent(event);
          
          await updateDoc(doc(db, "events", docRef.id), {
            credibilityScore: factCheckResult.credibilityScore,
            verifiedSummary: factCheckResult.verifiedSummary,
            aiSources: factCheckResult.aiSources,
            factCheckStatus: factCheckResult.factCheckStatus,
            factCheckedAt: factCheckResult.factCheckedAt || null,
            factCheckError: factCheckResult.factCheckError || null,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          
          // Update with failure status
          await updateDoc(doc(db, "events", docRef.id), {
            factCheckStatus: "failed",
            factCheckError: err.message,
            verifiedSummary: "Fact-check failed, manual verification recommended",
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Refresh to show new events
      await fetchEventsForDate(date);
    } catch (error) {
      // Silent fail - user will see empty state
    } finally {
      setGenerating(false);
    }
  }

  // Load events when component mounts or date changes
  useEffect(() => {
    fetchEventsForDate(selectedDate);
  }, [selectedDate]);

  // Handle date change
  function handleDateChange(e) {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    setAiSummary(""); // Clear summary when date changes
  }

  // Handle share button
  async function handleShare() {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Generate AI summary of all events for this day
  async function generateDaySummary() {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      alert("OpenAI API key not configured. Cannot generate summary.");
      return;
    }

    if (events.length === 0) {
      alert("No events to summarize.");
      return;
    }

    setGeneratingSummary(true);

    try {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Prepare event list for AI
      const eventList = events.map((e, idx) => 
        `${idx + 1}. ${e.title} (${e.date}) - ${e.category}: ${e.description || 'No description'}`
      ).join('\n');

      const prompt = `You are a historical summarizer. Given these events that all occurred on ${displayDate} (different years), write ONE compelling paragraph (3-4 sentences) that captures the essence of this day in history.

Events:
${eventList}

Create a narrative summary that flows well, like:
"On this day, humanity made strides in science, politics, and art — from the launch of X in [year] to the signing of Y in [year]."

Make it engaging and highlight the diversity of human achievement. Return ONLY the paragraph text, no JSON.`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an eloquent historical writer who creates compelling narratives from lists of events.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const summary = response.choices[0]?.message?.content;
      
      if (summary) {
        setAiSummary(summary.trim());
      } else {
        throw new Error("No summary generated");
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setGeneratingSummary(false);
    }
  }

  // Format date for display
  const displayDate = selectedDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-accent-gradient">🕰️ This Day in History</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Events that happened on <span className="font-semibold text-gold-primary">{displayDate}</span>
          </p>
        </motion.div>

        {/* Date Selector and Action Buttons */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Date Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 text-center">
                Select a Different Date
              </label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={handleDateChange}
                className="w-full px-6 py-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-gold-primary focus:ring-gold-primary/20 transition-all duration-500 text-center text-lg font-medium"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              {/* Share Button */}
              <motion.button
                onClick={handleShare}
                className="px-5 py-2.5 text-sm font-medium bg-white dark:bg-[#1a1a1a] border border-gold-primary/30 text-gold-primary hover:bg-gold-primary/10 rounded-xl transition-all duration-300 flex items-center gap-2"
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                {copied ? (
                  <>
                    <span>✅</span>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>Share This Day</span>
                  </>
                )}
              </motion.button>

              {/* Generate Summary Button */}
              <motion.button
                onClick={generateDaySummary}
                disabled={generatingSummary || events.length === 0}
                className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-gold-primary to-gold-secondary text-bg-dark hover:shadow-lg hover:shadow-gold-primary/50 rounded-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!generatingSummary && events.length > 0 ? { scale: 1.05 } : {}}
                whileTap={!generatingSummary && events.length > 0 ? { scale: 0.95 } : {}}
              >
                {generatingSummary ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      🤖
                    </motion.span>
                    <span>Generating Summary...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate AI Summary</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* AI Summary Card */}
        <AnimatePresence>
          {aiSummary && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 max-w-4xl mx-auto"
            >
              <div className="relative p-6 rounded-2xl border-2 border-gold-primary bg-gradient-to-br from-gold-primary/5 via-gold-primary/10 to-gold-secondary/5 shadow-2xl shadow-gold-primary/20">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gold-primary/5 blur-xl -z-10" />
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center shadow-lg">
                      <span className="text-2xl">✨</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gold-primary mb-3 flex items-center gap-2">
                      <span>AI Summary of {displayDate}</span>
                    </h3>
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-base italic">
                      "{aiSummary}"
                    </p>
                  </div>
                  <button
                    onClick={() => setAiSummary("")}
                    className="flex-shrink-0 text-gray-500 hover:text-gold-primary transition-colors"
                    title="Close summary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading ? (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="inline-block w-16 h-16 border-4 border-gold-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-gray-600 dark:text-gray-400 mt-6 text-lg font-medium">
              Loading events for {displayDate}...
            </p>
          </motion.div>
        ) : (
          <>
            {/* Events Count */}
            <motion.div
              className="mb-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-gray-600 dark:text-gray-400">
                Found <span className="font-semibold text-gold-primary">{events.length}</span> event{events.length !== 1 ? 's' : ''} on this day
              </p>
              {generating && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    🤖
                  </motion.span>
                  Generating additional events with AI...
                </p>
              )}
            </motion.div>

            {/* Events Grid */}
            {events.length === 0 ? (
              <motion.div 
                className="text-center py-20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  No events found for {displayDate}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {generating ? "Generating historical events with AI..." : "Try selecting a different date"}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedDate.toISOString()}
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {events.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="relative"
                    >
                      {/* "Happened on this day" badge */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: idx * 0.1 + 0.2 }}
                          className="px-3 py-1 bg-gold-gradient rounded-full shadow-lg"
                        >
                          <span className="text-bg-dark font-semibold text-xs whitespace-nowrap">
                            🕰️ Happened on this day
                          </span>
                        </motion.div>
                      </div>

                      <TimelineEvent 
                        event={event} 
                        currentUser={user}
                        onEventUpdated={() => fetchEventsForDate(selectedDate)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}

        {/* Info Section */}
        <motion.div
          className="mt-12 p-6 bg-gradient-to-br from-gold-primary/10 to-gold-secondary/5 border border-gold-primary/30 rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>About This Day in History</span>
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            This page shows all events from the RealTea timeline that occurred on <span className="font-semibold text-gold-primary">{displayDate}</span>, 
            regardless of the year. Each event is verified with AI fact-checking and includes sources for further reading.
            {events.length < 3 && " If we have fewer than 3 events, AI automatically generates additional historical events for this date."}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

