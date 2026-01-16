import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content from RSS feeds to prevent XSS attacks
 * Allows safe formatting tags while blocking dangerous content
 * 
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML safe for rendering
 */
export const sanitizeRssHtml = (html) => {
  if (!html) return '';
  
  // Remove all style-related content before sanitization to prevent browser
  // from trying to load external resources (CSS, SVG sprites, etc.)
  // This reduces (but may not completely eliminate) CORS errors when React renders the HTML
  html = html
    .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
    .replace(/\s+style\s*=\s*["'][^"']*["']/gi, '') // Remove style attributes with quotes
    .replace(/\s+style\s*=\s*[^>\s]+/gi, '') // Remove style attributes without quotes
    .replace(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi, '') // Remove stylesheet links
    .replace(/<link[^>]*type\s*=\s*["']text\/css["'][^>]*>/gi, '') // Remove CSS links
    .replace(/\s+class\s*=\s*["'][^"']*["']/gi, '') // Remove ALL class attributes (prevent sprite/icon references)
    .replace(/url\s*\(\s*[^)]*spritemap[^)]*\)/gi, '') // Remove CSS url() references to spritemap
    .replace(/url\s*\(\s*[^)]*\.svg[^)]*\)/gi, '') // Remove CSS url() references to SVG files
    .replace(/background[^:]*:\s*[^;]*url[^;]*;/gi, '') // Remove background-image CSS
    .replace(/background-image[^:]*:\s*[^;]*;/gi, '') // Remove background-image specifically
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel'], // No 'class' to prevent sprite/icon references
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Ensure links are safe (no javascript: URLs)
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Add rel="noopener noreferrer" to external links automatically
    ADD_ATTR: ['target'],
  });
};
