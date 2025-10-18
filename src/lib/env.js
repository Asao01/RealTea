/**
 * Environment Variable Validation
 * Validates required env vars and provides typed getters
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEWS_API_KEY',
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'OPENAI_API_KEY'
];

/**
 * Check which env vars are missing
 */
function validateEnv() {
  const problems = [];
  const warnings = [];
  
  // Check required vars
  REQUIRED_ENV_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      problems.push({
        varName,
        severity: 'error',
        message: `Missing required environment variable: ${varName}`
      });
    }
  });
  
  // Check optional vars
  OPTIONAL_ENV_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      warnings.push({
        varName,
        severity: 'warning',
        message: `Optional environment variable not set: ${varName}`
      });
    }
  });
  
  return { problems, warnings, isValid: problems.length === 0 };
}

// Validate on load (client-side only)
let validation = { problems: [], warnings: [], isValid: true };

if (typeof window !== 'undefined') {
  validation = validateEnv();
  
  if (validation.problems.length > 0) {
    console.error('❌ [ENV] Missing required environment variables:');
    validation.problems.forEach(p => console.error(`   - ${p.varName}`));
    console.error('💡 [ENV] Create .env.local file with Firebase credentials');
    console.error('💡 [ENV] See .env.example for template');
  }
  
  if (validation.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ [ENV] Optional environment variables not set:');
    validation.warnings.forEach(w => console.warn(`   - ${w.varName}`));
  }
  
  if (validation.isValid) {
    console.log('✅ [ENV] All required environment variables loaded');
  }
}

/**
 * Safe getter for env vars with fallback
 */
function getEnv(key, fallback = '') {
  return process.env[key] || fallback;
}

/**
 * Exported env object
 */
export const env = {
  // Firebase (required)
  NEXT_PUBLIC_FIREBASE_API_KEY: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  NEXT_PUBLIC_FIREBASE_APP_ID: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  
  // Optional
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: getEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'),
  NEWS_API_KEY: getEnv('NEWS_API_KEY'),
  NEXT_PUBLIC_OPENAI_API_KEY: getEnv('NEXT_PUBLIC_OPENAI_API_KEY'),
  OPENAI_API_KEY: getEnv('OPENAI_API_KEY'),
  
  // Helpers
  isValid: () => validation.isValid,
  getProblems: () => validation.problems,
  getWarnings: () => validation.warnings,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

export default env;

