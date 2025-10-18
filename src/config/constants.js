/**
 * Application-wide constants and configuration
 * Centralizes all reusable values for consistency
 */

// Theme Colors
export const COLORS = {
  gold: {
    primary: '#D4AF37',
    secondary: '#A67C00',
    light: '#FFD700',
  },
  background: {
    dark: '#0B0B0B',
    darkSecondary: '#1a1a1a',
    light: '#E6E6E6',
    lightSecondary: '#F5F5F5',
  },
  text: {
    dark: '#0B0B0B',
    light: '#FFFFFF',
  },
};

// Event Categories
export const CATEGORIES = [
  "Politics",
  "Science",
  "Culture",
  "Conflict",
  "Technology",
  "Economy",
  "Environment",
  "Sports",
  "Other"
];

// All categories including "All" for filters
export const CATEGORIES_WITH_ALL = ["All", ...CATEGORIES];

// AI Configuration
export const AI_CONFIG = {
  rateLimit: {
    perMinute: 10,
    perHour: 50,
  },
  models: {
    factCheck: 'gpt-4o-mini',
    generate: 'gpt-4o-mini',
    summary: 'gpt-4o-mini',
  },
  costs: {
    perFactCheck: 0.002,
    perGeneration: 0.005,
    perSummary: 0.003,
  },
};

// Credibility Thresholds
export const CREDIBILITY = {
  verified: 70,    // Score >= 70 is verified
  review: 40,      // Score 40-69 needs review
  unverified: 39,  // Score < 40 is unverified
};

// Animation Durations (in seconds)
export const ANIMATIONS = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  theme: 0.6,
};

// Routes
export const ROUTES = {
  home: '/',
  timeline: '/timeline',
  map: '/map',
  today: '/today',
  submit: '/submit',
  about: '/about',
  contact: '/contact',
  login: '/login',
  admin: '/admin',
};

// Firestore Collections
export const COLLECTIONS = {
  events: 'events',
  pendingEvents: 'pendingEvents',
  eventRevisions: 'eventRevisions',
  adminActions: 'adminActions',
  auditLogs: 'auditLogs',
  users: 'users',
};

// Pagination
export const PAGINATION = {
  eventsPerPage: 12,
  recentEventsHome: 6,
};

// Site Metadata
export const SITE_META = {
  title: 'RealTea - The Timeline of Truth',
  description: 'A living timeline of real events. No bias. No filters. Just truth. AI-powered fact-checking for every submission.',
  url: 'https://realtea.vercel.app',
  ogImage: '/og-image.png',
  themeColor: '#D4AF37',
  author: 'RealTea Team',
};

// Feature Flags
export const FEATURES = {
  aiFactChecking: true,
  autoGeneration: true,
  mapView: true,
  todayInHistory: true,
  adminPanel: true,
  socialSharing: true,
};

// Error Messages
export const ERRORS = {
  apiKeyMissing: 'OpenAI API key not configured. Add NEXT_PUBLIC_OPENAI_API_KEY to .env.local',
  rateLimitExceeded: 'Rate limit exceeded. Please wait a moment before trying again.',
  authRequired: 'You must be signed in to perform this action.',
  adminRequired: 'Admin access required.',
  networkError: 'Network error. Please check your connection and try again.',
};

// Success Messages
export const SUCCESS = {
  eventCreated: 'Event added successfully!',
  eventUpdated: 'Event updated successfully!',
  eventDeleted: 'Event deleted successfully!',
  verified: 'Event verified successfully!',
  copied: 'Copied to clipboard!',
};

