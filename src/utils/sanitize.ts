/**
 * HTML Sanitization Utility
 * 
 * SECURITY: This module provides XSS protection by sanitizing HTML content
 * before rendering it in the DOM.
 * 
 * Usage:
 * - Use sanitizeHtml() for user-generated HTML content
 * - Use sanitizeText() for plain text that might contain HTML
 * - Use createSafeMarkup() for React dangerouslySetInnerHTML
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @param dirty - Untrusted HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(
  dirty: string,
  options?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowLinks?: boolean;
  }
): string {
  if (!dirty) return '';

  const config: DOMPurify.Config = {
    ALLOWED_TAGS: options?.allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span', 'div'
    ],
    ALLOWED_ATTR: options?.allowedAttributes || {
      '*': ['class', 'id'],
      'a': ['href', 'title', 'target', 'rel'],
    },
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  };

  // Remove links if not explicitly allowed
  if (!options?.allowLinks) {
    config.ALLOWED_TAGS = config.ALLOWED_TAGS?.filter(tag => tag !== 'a');
  } else {
    // Ensure safe link handling
    config.ADD_ATTR = ['target', 'rel'];
  }

  return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize text content (strips all HTML tags)
 * 
 * @param text - Untrusted text that might contain HTML
 * @returns Plain text with all HTML removed
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Create safe markup object for React's dangerouslySetInnerHTML
 * 
 * @param html - HTML string to sanitize
 * @param options - Sanitization options
 * @returns Object with __html property containing sanitized HTML
 * 
 * @example
 * <div dangerouslySetInnerHTML={createSafeMarkup(userContent)} />
 */
export function createSafeMarkup(
  html: string,
  options?: Parameters<typeof sanitizeHtml>[1]
): { __html: string } {
  return {
    __html: sanitizeHtml(html, options),
  };
}

/**
 * Sanitize document/template content with rich formatting support
 * 
 * @param html - Document HTML content
 * @returns Sanitized HTML preserving document structure
 */
export function sanitizeDocumentHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span', 'div', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'hr'
    ],
    ALLOWED_ATTR: {
      '*': ['class', 'id', 'style'],
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'table': ['border', 'cellpadding', 'cellspacing'],
    },
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  });
}

/**
 * Sanitize email content (allows more formatting)
 * 
 * @param html - Email HTML content
 * @returns Sanitized HTML safe for email rendering
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span', 'div', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'hr', 'font', 'center'
    ],
    ALLOWED_ATTR: {
      '*': ['class', 'id', 'style'],
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'table': ['border', 'cellpadding', 'cellspacing', 'width'],
      'td': ['colspan', 'rowspan', 'align', 'valign'],
      'th': ['colspan', 'rowspan', 'align', 'valign'],
      'font': ['color', 'face', 'size'],
    },
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  });
}

/**
 * Check if a string contains potentially dangerous HTML
 * 
 * @param html - HTML string to check
 * @returns true if potentially dangerous content detected
 */
export function containsDangerousHtml(html: string): boolean {
  if (!html) return false;

  const dangerous = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<form/i,
    /<input/i,
  ];

  return dangerous.some(pattern => pattern.test(html));
}

/**
 * Escape HTML special characters
 * 
 * @param text - Text to escape
 * @returns Escaped text safe for HTML context
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, char => map[char]);
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 * 
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if dangerous
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    console.warn('Blocked dangerous URL:', url);
    return '';
  }

  // Allow only http, https, mailto, tel
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') || // Relative URLs
    trimmed.startsWith('#') // Anchor links
  ) {
    return url;
  }

  // Default to empty for unknown protocols
  console.warn('Blocked unknown protocol URL:', url);
  return '';
}

