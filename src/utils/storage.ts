// Secure storage utilities for sensitive data

/**
 * Encrypts data before storing in localStorage
 * Note: This is client-side encryption - for truly sensitive data, use httpOnly cookies
 */
const encrypt = (data: string): string => {
  // Simple base64 encoding (not true encryption, but obfuscates data)
  // For production, consider using Web Crypto API or a library like crypto-js
  try {
    return btoa(encodeURIComponent(data));
  } catch (e) {
    console.error('Encryption error:', e);
    return data; // Fallback to plain text if encoding fails
  }
};

/**
 * Decrypts data from localStorage
 */
const decrypt = (encrypted: string): string => {
  try {
    return decodeURIComponent(atob(encrypted));
  } catch (e) {
    console.error('Decryption error:', e);
    return encrypted; // Return as-is if decryption fails
  }
};

/**
 * Securely stores data in localStorage with expiration
 */
export const secureSetItem = (key: string, value: string, expiresInHours: number = 24): void => {
  try {
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);
    const data = {
      value: encrypt(value),
      expiresAt
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error storing secure data:', e);
    // Fallback to regular storage if secure storage fails
    localStorage.setItem(key, value);
  }
};

/**
 * Securely retrieves data from localStorage
 */
export const secureGetItem = (key: string): string | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    // Try to parse as secure storage format
    try {
      const data = JSON.parse(item);
      if (data.expiresAt && data.expiresAt < Date.now()) {
        // Expired, remove it
        localStorage.removeItem(key);
        return null;
      }
      return decrypt(data.value);
    } catch {
      // Not in secure format, return as-is (backward compatibility)
      return item;
    }
  } catch (e) {
    console.error('Error retrieving secure data:', e);
    return null;
  }
};

/**
 * Removes secure data from localStorage
 */
export const secureRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing secure data:', e);
  }
};

/**
 * Clears all secure storage (useful for logout)
 */
export const clearSecureStorage = (): void => {
  try {
    // Clear known secure keys
    const secureKeys = [
      'github_token',
      'feeder_signup_email',
      'feeder_signup_phone',
      'hub_employee_info'
    ];
    
    secureKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (e) {
    console.error('Error clearing secure storage:', e);
  }
};

