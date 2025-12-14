// Input validation utilities for security

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex - RFC 5322 compliant
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Additional checks
  if (email.length > 254) return false; // RFC 5321 limit
  if (email.includes('..')) return false; // No consecutive dots
  if (email.startsWith('.') || email.endsWith('.')) return false;
  if (email.startsWith('@') || email.endsWith('@')) return false;
  
  return emailRegex.test(email.trim());
};

/**
 * Validates phone number format (US/Canada)
 * Accepts: +1XXXXXXXXXX, 1XXXXXXXXXX, XXXXXXXXXX
 */
export const isValidPhoneNumber = (phone: string, countryCode?: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check length (10 digits for US/Canada, 11 if includes country code)
  const code = countryCode?.replace(/\D/g, '') || '1';
  const expectedLength = code === '1' ? 10 : 10; // Adjust for other countries if needed
  
  if (digits.length < expectedLength || digits.length > expectedLength + 3) {
    return false;
  }
  
  // US/Canada: area code cannot start with 0 or 1
  if (code === '1' && digits.length >= 10) {
    const areaCode = digits.slice(-10, -7);
    if (areaCode[0] === '0' || areaCode[0] === '1') {
      return false;
    }
  }
  
  return true;
};

/**
 * Sanitizes string input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates and sanitizes email
 */
export const validateAndSanitizeEmail = (email: string): { valid: boolean; sanitized: string } => {
  const sanitized = sanitizeString(email).toLowerCase();
  const valid = isValidEmail(sanitized);
  return { valid, sanitized };
};

/**
 * Validates and sanitizes phone number
 */
export const validateAndSanitizePhone = (phone: string, countryCode?: string): { valid: boolean; sanitized: string } => {
  const sanitized = sanitizeString(phone);
  const valid = isValidPhoneNumber(sanitized, countryCode);
  return { valid, sanitized };
};

/**
 * Validates password strength
 */
export const isValidPassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

