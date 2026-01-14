// Backend proxy server for RSS feeds (avoids CORS issues)
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// In dev mode, backend runs on 3073 (internal, proxied by Vite)
// In production, backend runs on 3072 (serves both API and static files)
const PORT = process.env.NODE_ENV === 'development' 
  ? (process.env.BACKEND_PORT || 3073)
  : (process.env.PORT || 3072);
const VITE_PORT = process.env.VITE_PORT || 3072;

// Middleware
app.use(express.json());

// CORS headers for API endpoints
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper function to fetch with retries (generic, no feed-specific logic)
async function fetchWithRetry(feedUrl, retries = 2) {
  const maxAttempts = retries + 1;
  let lastError = null;
  
  // Try the URL with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    const attemptNumber = attempt + 1;
    try {
      console.log(`[RSS Proxy] Attempt ${attemptNumber}/${maxAttempts} for ${feedUrl}`);
      
      // Add small delay between retries to avoid rate limiting
      if (attempt > 0) {
        const delay = 1000 * attempt;
        console.log(`[RSS Proxy] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Rotate User-Agent to appear more like different browsers
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
      ];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
          'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,fr-CA;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': new URL(feedUrl).origin + '/',
          'Cache-Control': 'no-cache',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow' // Follow up to 20 redirects (default)
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        // Get response as buffer first to preserve raw bytes
        const buffer = await response.arrayBuffer();
        const rawBuffer = Buffer.from(buffer);
        
        // First, try to detect encoding from Content-Type header
        let detectedEncoding = 'utf8';
        const charsetMatch = contentType.match(/charset=([^;]+)/i);
        if (charsetMatch) {
          detectedEncoding = charsetMatch[1].toLowerCase().trim();
          // Normalize common encoding names
          if (detectedEncoding === 'iso-8859-1' || detectedEncoding === 'latin1') {
            detectedEncoding = 'latin1';
          } else if (detectedEncoding === 'windows-1252' || detectedEncoding === 'cp1252') {
            detectedEncoding = 'win1252';
          } else if (detectedEncoding === 'utf-8' || detectedEncoding === 'utf8') {
            detectedEncoding = 'utf8';
          }
        }
        
        // Read the first part to check XML declaration for encoding
        // Try UTF-8 first to read the XML declaration
        const firstBytes = rawBuffer.slice(0, Math.min(500, rawBuffer.length));
        let firstText = '';
        try {
          firstText = firstBytes.toString('utf8');
        } catch (e) {
          // If UTF-8 fails, try latin1
          firstText = firstBytes.toString('latin1');
        }
        
        const xmlEncodingMatch = firstText.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
        if (xmlEncodingMatch) {
          const xmlEncoding = xmlEncodingMatch[1].toLowerCase().trim();
          // Use encoding from XML declaration if present
          if (xmlEncoding === 'iso-8859-1' || xmlEncoding === 'latin1') {
            detectedEncoding = 'latin1';
          } else if (xmlEncoding === 'windows-1252' || xmlEncoding === 'cp1252') {
            detectedEncoding = 'win1252';
          } else if (xmlEncoding === 'utf-8' || xmlEncoding === 'utf8') {
            detectedEncoding = 'utf8';
          }
        } else {
          // No encoding in XML declaration - check if content looks like UTF-8
          // If we can successfully decode as UTF-8 and it contains valid UTF-8 characters,
          // assume it's UTF-8 (many feeds don't declare encoding but are UTF-8)
          try {
            const testText = rawBuffer.toString('utf8');
            // Check if it contains valid UTF-8 sequences (Portuguese chars, etc.)
            // If the text decodes cleanly as UTF-8 and contains non-ASCII, it's likely UTF-8
            if (testText.includes('<?xml') && /[\u00C0-\u00FF]/.test(testText)) {
              // Contains Portuguese/Latin characters and decodes as UTF-8 - likely UTF-8
              detectedEncoding = 'utf8';
            }
          } catch (e) {
            // UTF-8 decode failed, keep detected encoding
          }
        }
        
        // Convert buffer to string using detected encoding, then to UTF-8
        // Use iconv-lite for proper encoding conversion
        let text;
        
        // First, always try UTF-8 to see if it decodes cleanly
        // Many feeds are UTF-8 but don't declare it, or incorrectly declare ISO-8859-1
        const utf8Test = rawBuffer.toString('utf8');
        // Check if UTF-8 decodes cleanly and contains Portuguese/Latin characters
        const looksLikeUtf8 = utf8Test.includes('<?xml') && 
                              /[^\x00-\x7F]/.test(utf8Test) && // Contains non-ASCII characters
                              /[\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]/.test(utf8Test); // Contains Portuguese/Latin chars
        
        if (detectedEncoding === 'latin1' || detectedEncoding === 'iso-8859-1') {
          // Only use Latin1 if explicitly declared
          // But first, check if it might actually be UTF-8 (common misdeclaration)
          if (looksLikeUtf8) {
            // Looks like valid UTF-8 with Portuguese characters - use UTF-8 instead
            text = utf8Test;
            console.log(`[RSS Proxy] Feed declared ${detectedEncoding} but appears to be UTF-8, using UTF-8`);
          } else {
            // Convert from ISO-8859-1/Latin1 to UTF-8 using iconv-lite
            text = iconv.decode(rawBuffer, 'iso-8859-1');
          }
        } else if (detectedEncoding === 'win1252' || detectedEncoding === 'cp1252' || detectedEncoding === 'windows-1252') {
          // Windows-1252 - try UTF-8 first, fallback to Windows-1252
          if (looksLikeUtf8) {
            text = utf8Test;
          } else {
            // Use iconv-lite for proper Windows-1252 conversion
            text = iconv.decode(rawBuffer, 'windows-1252');
          }
        } else {
          // Default to UTF-8 (most common)
          text = utf8Test;
        }
        
        // Check if response is HTML (error page) instead of XML
        const trimmedText = text.trim();
        if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html')) {
          // Got HTML instead of XML - this is likely a 404 page or error
          const error = new Error('Response is HTML (likely error page), not RSS/XML');
          console.log(`[RSS Proxy] Attempt ${attemptNumber} failed: ${error.message}`);
          lastError = error;
          if (attempt < retries) continue;
          throw error;
        }
        
        // Validate it's XML/RSS
        if (trimmedText.includes('<rss') || 
            trimmedText.includes('<feed') || 
            trimmedText.includes('<?xml') ||
            trimmedText.includes('<RDF')) {
          
          // Normalize XML declaration to ensure UTF-8 encoding
          // This is critical for proper character encoding of accented characters
          let normalizedText = text;
          if (trimmedText.startsWith('<?xml')) {
            // Replace or add encoding="UTF-8" in XML declaration
            normalizedText = text.replace(
              /<\?xml\s+version=["']([^"']+)["'](\s+encoding=["'][^"']+["'])?/i,
              '<?xml version="$1" encoding="UTF-8"'
            );
            // If no XML declaration exists, add one (shouldn't happen, but safety check)
            if (!normalizedText.includes('<?xml')) {
              normalizedText = '<?xml version="1.0" encoding="UTF-8"?>\n' + normalizedText;
            }
          } else if (!trimmedText.includes('<?xml')) {
            // No XML declaration, add one with UTF-8
            normalizedText = '<?xml version="1.0" encoding="UTF-8"?>\n' + text;
          }
          
          console.log(`[RSS Proxy] ✓ Success on attempt ${attemptNumber}/${maxAttempts} for ${feedUrl} (detected encoding: ${detectedEncoding})`);
          return { text: normalizedText, contentType, url: feedUrl };
        } else {
          const error = new Error('Response is not valid RSS/XML feed');
          console.log(`[RSS Proxy] Attempt ${attemptNumber} failed: ${error.message}`);
          lastError = error;
          if (attempt < retries) continue;
          throw error;
        }
      } else {
        // Non-200 response
        const status = response.status;
        const error = new Error(`HTTP ${status} ${response.statusText}`);
        console.log(`[RSS Proxy] Attempt ${attemptNumber} failed: ${error.message}`);
        lastError = error;
        
        // For 403/404, don't retry (these are permanent failures)
        if (status === 403 || status === 404) {
          console.log(`[RSS Proxy] Permanent failure (${status}), not retrying`);
          throw error;
        }
        
        // Other errors - retry if attempts remain
        if (attempt < retries) {
          continue;
        }
        throw error;
      }
      
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError') {
        console.log(`[RSS Proxy] Attempt ${attemptNumber} failed: Request timeout`);
        // Timeout - retry if attempts remain
        if (attempt < retries) {
          continue;
        }
        const timeoutError = new Error('Request timeout after all retries');
        console.log(`[RSS Proxy] ✗ All ${maxAttempts} attempts exhausted for ${feedUrl}: ${timeoutError.message}`);
        throw timeoutError;
      }
      
      // For 403/404, don't retry (these are permanent failures)
      if (error.message.includes('HTTP 403') || error.message.includes('HTTP 404')) {
        console.log(`[RSS Proxy] ✗ Permanent failure on attempt ${attemptNumber}, not retrying: ${error.message}`);
        throw error;
      }
      
      // Network errors or other issues - retry if attempts remain
      if (attempt < retries) {
        console.log(`[RSS Proxy] Attempt ${attemptNumber} failed: ${error.message}, will retry...`);
        continue;
      }
      
      // Last attempt failed
      console.log(`[RSS Proxy] ✗ All ${maxAttempts} attempts exhausted for ${feedUrl}: ${error.message}`);
      throw error;
    }
  }
  
  // Should never reach here, but just in case
  console.log(`[RSS Proxy] ✗ All ${maxAttempts} attempts exhausted for ${feedUrl}: ${lastError?.message || 'Unknown error'}`);
  throw lastError || new Error('Failed after all retries');
}

// RSS Feed Proxy Endpoint
app.get('/api/proxy/rss', async (req, res) => {
  const feedUrl = req.query.url;
  
  if (!feedUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Validate URL
    try {
      new URL(feedUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch with retries (generic, no feed-specific logic)
    const { text, contentType } = await fetchWithRetry(feedUrl);

    // Ensure UTF-8 encoding is specified in Content-Type
    // This is critical for proper character encoding (especially for non-ASCII characters like Portuguese)
    let finalContentType = contentType || 'application/xml';
    if (!finalContentType.includes('charset=')) {
      finalContentType += '; charset=utf-8';
    } else if (!finalContentType.includes('charset=utf-8') && !finalContentType.includes('charset=UTF-8')) {
      // Replace any existing charset with UTF-8 to ensure consistency
      finalContentType = finalContentType.replace(/charset=[^;]+/i, 'charset=utf-8');
    }

    // Return the feed with appropriate content type and UTF-8 encoding
    // Explicitly set charset to ensure proper encoding
    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    // Send as UTF-8 encoded buffer to ensure proper character encoding
    res.send(Buffer.from(text, 'utf8'));

  } catch (error) {
    const statusCode = error.message.includes('HTTP 403') ? 403 :
                      error.message.includes('HTTP 404') ? 404 :
                      error.message.includes('timeout') ? 504 : 500;
    
    console.error(`[RSS Proxy] Error fetching feed ${feedUrl}: ${error.message}`);
    
    if (statusCode === 504) {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    res.status(statusCode).json({ 
      error: `Failed to fetch feed: ${error.message}`,
      url: feedUrl 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'rss-proxy' });
});

// Serve static files from Vite build (in production only)
// In development, Vite dev server handles static files
if (process.env.NODE_ENV === 'production') {
  // Disable caching for index.html to ensure fresh JavaScript bundles
  app.use(express.static(join(__dirname, 'dist'), {
    maxAge: '1y', // Cache static assets for 1 year
    etag: true,
    lastModified: true
  }));
  
  // Fallback to index.html for SPA routing (no cache for HTML)
  app.get('*', (req, res) => {
    // Don't cache index.html to ensure users get the latest version
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// Create HTTP server
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[RSS Proxy] Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`[RSS Proxy] Serving static files from dist/`);
  } else {
    console.log(`[RSS Proxy] Development mode - Vite dev server handles static files`);
  }
});
