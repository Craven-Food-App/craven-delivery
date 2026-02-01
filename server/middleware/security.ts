import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Helmet.js security headers configuration
 * Provides comprehensive HTTP security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline scripts (consider nonces in production)
        "https://js.stripe.com",
        "https://api.mapbox.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline styles
        "https://fonts.googleapis.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://*.supabase.co",
        "https://api.mapbox.com",
        "https://events.mapbox.com",
        "wss://*.supabase.co", // WebSocket connections
        "http://localhost:*", // Development
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://hooks.stripe.com",
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS
    },
  },
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // X-Content-Type-Options
  noSniff: true,
  // X-XSS-Protection (legacy, but doesn't hurt)
  xssFilter: true,
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },
  // X-Frame-Options
  frameguard: {
    action: 'sameorigin',
  },
});

/**
 * Additional custom security headers
 */
export const additionalSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Permissions Policy (Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), microphone=(), camera=(), payment=(self)'
  );

  // X-Content-Type-Options (redundant with Helmet, but explicit)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Cross-Origin Resource Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  // Cross-Origin Embedder Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Cross-Origin Opener Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  next();
};

/**
 * Security middleware for development environment
 * Less strict CSP for hot module replacement
 */
export const devSecurityHeaders = helmet({
  contentSecurityPolicy: false, // Disable CSP in development
  hsts: false, // No HTTPS enforcement in dev
});












