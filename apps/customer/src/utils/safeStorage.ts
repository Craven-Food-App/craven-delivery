/**
 * Safe Storage Utilities
 * Handles iOS Safari's tracking prevention which blocks localStorage/sessionStorage
 */

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`localStorage.getItem blocked for key: ${key}`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`localStorage.setItem blocked for key: ${key}`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`localStorage.removeItem blocked for key: ${key}`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('localStorage.clear blocked', error);
      return false;
    }
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`sessionStorage.getItem blocked for key: ${key}`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`sessionStorage.setItem blocked for key: ${key}`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`sessionStorage.removeItem blocked for key: ${key}`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.warn('sessionStorage.clear blocked', error);
      return false;
    }
  }
};

// Check if storage is available
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const isSessionStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

