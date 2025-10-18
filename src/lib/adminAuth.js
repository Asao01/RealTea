/**
 * Admin Authentication Helper
 * Check if user is authorized admin
 */

// Admin emails - add your email here
const ADMIN_EMAILS = [
  'system@realtea.com',
  'admin@realtea.com',
  // Add your email here:
  // 'your.email@gmail.com',
];

export function isAdmin(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export function requireAdmin(user) {
  if (!isAdmin(user)) {
    throw new Error('Unauthorized: Admin access required');
  }
  return true;
}

export { ADMIN_EMAILS };

