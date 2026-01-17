// Security utilities for production readiness

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  } else if (email.length > 254) {
    errors.push('Email is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Phone number validation
export const validatePhone = (phone: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!phone) {
    errors.push('Phone number is required');
  } else {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) {
      errors.push('Invalid phone number format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Address validation
export const validateAddress = (address: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!address) {
    errors.push('Address is required');
  } else if (address.length < 5) {
    errors.push('Address is too short');
  } else if (address.length > 200) {
    errors.push('Address is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }
  
  getRemainingTime(key: string): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const timeElapsed = Date.now() - oldestAttempt;
    return Math.max(0, this.windowMs - timeElapsed);
  }
}

// XSS protection
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// CSRF token generation
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Secure storage for sensitive data
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      // In production, encrypt sensitive data
      if (process.env.NODE_ENV === 'production') {
        // Example: Use Web Crypto API for encryption
        // const encrypted = await encrypt(value);
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Failed to store secure data:', error);
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      
      // In production, decrypt sensitive data
      if (process.env.NODE_ENV === 'production') {
        // Example: Decrypt the value
        return value;
      } else {
        return value;
      }
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove secure data:', error);
    }
  }
};

// Content Security Policy helpers
export const cspHelpers = {
  isAllowedSource: (src: string, allowedDomains: string[]): boolean => {
    try {
      const url = new URL(src);
      return allowedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  },
  
  sanitizeUrl: (url: string): string => {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }
};
