/**
 * Admin Configuration
 * Define who has admin privileges in the application
 */

/**
 * List of admin email addresses
 * Add emails here to grant admin access
 */
const ADMIN_EMAILS = [
  // Add your admin emails here
  // 'admin@example.com',
  // 'moderator@example.com',
];

/**
 * Check if a user is an admin
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user is admin
 */
export function isAdmin(user) {
  if (!user || !user.email) return false;
  
  // Check if email is in admin list
  if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }
  
  // Check if user has admin role (from custom claims or Firestore)
  if (user.role === 'admin' || user.isAdmin === true) {
    return true;
  }
  
  // Check if email contains 'admin' (for development/testing)
  // Remove this in production for security
  if (process.env.NODE_ENV === 'development' && user.email.includes('admin')) {
    return true;
  }
  
  return false;
}

/**
 * Check if a user can edit an event
 * @param {Object} user - Current user
 * @param {Object} event - Event object
 * @returns {boolean} - True if user can edit
 */
export function canEditEvent(user, event) {
  if (!user || !user.email) return false;
  
  // Admins can edit all events
  if (isAdmin(user)) return true;
  
  // Authors can edit their own events
  if (event.addedBy === user.email || event.author === user.email) {
    return true;
  }
  
  return false;
}

/**
 * Check if a user can re-verify events
 * @param {Object} user - Current user
 * @returns {boolean} - True if user can re-verify
 */
export function canReverifyEvents(user) {
  // Only admins can re-verify events
  return isAdmin(user);
}

export default {
  isAdmin,
  canEditEvent,
  canReverifyEvents,
  ADMIN_EMAILS,
};

