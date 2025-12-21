/**
 * Rate Limiting Utility for Supabase Edge Functions
 * 
 * SECURITY: Prevents abuse by limiting request frequency
 * 
 * Usage:
 * ```typescript
 * import { checkRateLimit, RateLimitConfig } from '../_shared/rateLimit.ts';
 * 
 * const rateLimitConfig: RateLimitConfig = {
 *   maxRequests: 10,
 *   windowMs: 60000, // 1 minute
 *   identifier: 'auth-endpoint'
 * };
 * 
 * const rateLimitResult = await checkRateLimit(req, supabase, rateLimitConfig);
 * if (!rateLimitResult.allowed) {
 *   return new Response(
 *     JSON.stringify({ error: 'Too many requests' }),
 *     { status: 429, headers: corsHeaders }
 *   );
 * }
 * ```
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Unique identifier for this rate limit (e.g., 'login', 'payment') */
  identifier: string;
  /** Custom message to return when rate limited */
  message?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Time until rate limit resets (in seconds) */
  resetIn: number;
  /** Error message if rate limited */
  message?: string;
}

/**
 * Get client identifier from request
 * Uses IP address, user ID, or API key
 */
function getClientIdentifier(req: Request, userId?: string): string {
  // Priority: User ID > IP Address > API Key
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from headers
  const ip = 
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Check if request should be rate limited
 * 
 * @param req - Incoming request
 * @param supabase - Supabase client
 * @param config - Rate limit configuration
 * @param userId - Optional user ID for user-specific limits
 * @returns Rate limit result
 */
export async function checkRateLimit(
  req: Request,
  supabase: SupabaseClient,
  config: RateLimitConfig,
  userId?: string
): Promise<RateLimitResult> {
  const clientId = getClientIdentifier(req, userId);
  const key = `ratelimit:${config.identifier}:${clientId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Get or create rate limit record
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found" - allow request but log error
      console.error('Rate limit check error:', fetchError);
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetIn: Math.ceil(config.windowMs / 1000),
      };
    }

    if (!existing) {
      // First request - create record
      await supabase
        .from('rate_limits')
        .insert({
          key,
          count: 1,
          window_start: new Date(now).toISOString(),
          expires_at: new Date(now + config.windowMs).toISOString(),
        });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetIn: Math.ceil(config.windowMs / 1000),
      };
    }

    const existingWindowStart = new Date(existing.window_start).getTime();

    // Check if window has expired
    if (existingWindowStart < windowStart) {
      // Window expired - reset counter
      await supabase
        .from('rate_limits')
        .update({
          count: 1,
          window_start: new Date(now).toISOString(),
          expires_at: new Date(now + config.windowMs).toISOString(),
        })
        .eq('key', key);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetIn: Math.ceil(config.windowMs / 1000),
      };
    }

    // Window still active - check count
    if (existing.count >= config.maxRequests) {
      const resetIn = Math.ceil((existingWindowStart + config.windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: config.message || `Too many requests. Please try again in ${resetIn} seconds.`,
      };
    }

    // Increment counter
    await supabase
      .from('rate_limits')
      .update({
        count: existing.count + 1,
      })
      .eq('key', key);

    const resetIn = Math.ceil((existingWindowStart + config.windowMs - now) / 1000);

    return {
      allowed: true,
      remaining: config.maxRequests - existing.count - 1,
      resetIn,
    };
  } catch (error) {
    // On error, allow request but log
    console.error('Rate limit error:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetIn: Math.ceil(config.windowMs / 1000),
    };
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /** Strict limit for authentication endpoints (5 requests per minute) */
  AUTH: {
    maxRequests: 5,
    windowMs: 60000,
    identifier: 'auth',
    message: 'Too many authentication attempts. Please try again in a minute.',
  } as RateLimitConfig,

  /** Strict limit for payment endpoints (3 requests per minute) */
  PAYMENT: {
    maxRequests: 3,
    windowMs: 60000,
    identifier: 'payment',
    message: 'Too many payment requests. Please try again in a minute.',
  } as RateLimitConfig,

  /** Medium limit for API endpoints (30 requests per minute) */
  API: {
    maxRequests: 30,
    windowMs: 60000,
    identifier: 'api',
  } as RateLimitConfig,

  /** Lenient limit for read operations (100 requests per minute) */
  READ: {
    maxRequests: 100,
    windowMs: 60000,
    identifier: 'read',
  } as RateLimitConfig,

  /** Very strict for phone verification (3 requests per hour) */
  PHONE_VERIFY: {
    maxRequests: 3,
    windowMs: 3600000,
    identifier: 'phone-verify',
    message: 'Too many verification attempts. Please try again in an hour.',
  } as RateLimitConfig,

  /** Strict for password reset (3 requests per hour) */
  PASSWORD_RESET: {
    maxRequests: 3,
    windowMs: 3600000,
    identifier: 'password-reset',
    message: 'Too many password reset attempts. Please try again in an hour.',
  } as RateLimitConfig,
};

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 1 : 0)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetIn),
  };
}

