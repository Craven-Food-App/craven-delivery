/**
 * Name formatting utilities for privacy
 * - Customers see driver's first name only
 * - Drivers see customer's first name + first initial of surname
 */

/**
 * Format driver name for customer view (first name only)
 */
export const formatDriverNameForCustomer = (fullName: string | null | undefined): string => {
  if (!fullName) return 'Driver';
  const parts = fullName.trim().split(' ');
  return parts[0] || 'Driver';
};

/**
 * Format customer name for driver view (first name + first initial of surname)
 * Example: "John Smith" -> "John S."
 */
export const formatCustomerNameForDriver = (fullName: string | null | undefined): string => {
  if (!fullName) return 'Customer';
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'Customer';
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastNameInitial}.`;
};

/**
 * Get full name from user metadata or profile
 */
export const getUserFullName = (
  userMetadata: { full_name?: string; first_name?: string; last_name?: string } | null | undefined,
  profile?: { full_name?: string; first_name?: string; last_name?: string } | null
): string | null => {
  // Try user metadata first
  if (userMetadata?.full_name) {
    return userMetadata.full_name;
  }
  
  if (userMetadata?.first_name || userMetadata?.last_name) {
    return [userMetadata.first_name, userMetadata.last_name].filter(Boolean).join(' ');
  }
  
  // Try profile
  if (profile?.full_name) {
    return profile.full_name;
  }
  
  if (profile?.first_name || profile?.last_name) {
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  }
  
  return null;
};

