/**
 * API Client - Handles all API requests with automatic environment detection
 * Works in development (Vite proxy) and production (same-origin or separate API domain)
 */

const getApiBaseUrl = (): string => {
  // Check if we have an explicit API URL configured
  const configuredUrl = import.meta.env.VITE_API_URL;
  
  // In development, use relative URLs (Vite proxy handles it)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use configured URL or same-origin (for deployments where backend is at same domain)
  if (configuredUrl && configuredUrl !== 'https://api.craven-delivery.com') {
    return configuredUrl;
  }
  
  // Default to same-origin (backend at same domain as frontend)
  return '';
};

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  ok: boolean;
}

/**
 * Makes an API request with automatic error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Server returned non-JSON (likely HTML error page)
      return {
        ok: false,
        error: 'Backend server is not responding. Please contact support or try again later.',
      };
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data.error || data.message || 'An error occurred',
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error: any) {
    // Network error or other failure
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        ok: false,
        error: 'Cannot connect to server. Please check your internet connection.',
      };
    }
    
    return {
      ok: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Support API endpoints
 */
export const supportApi = {
  async verifyAccess(accessCode: string, email: string) {
    return apiRequest('/api/support/verify-access', {
      method: 'POST',
      body: JSON.stringify({
        accessCode: accessCode.toUpperCase().trim(),
        email: email.trim().toLowerCase(),
      }),
    });
  },

  async createCheckout(inviteId: string, amountCents: number, email: string) {
    return apiRequest('/api/support/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        inviteId,
        amountCents,
        email,
      }),
    });
  },
};

/**
 * Health check to verify backend is accessible
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/health`, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return response.ok;
  } catch {
    return false;
  }
}

