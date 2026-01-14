// Backend proxy is used instead of CORS proxies

// Decode HTML entities in text
const decodeHtmlEntities = (text) => {
  if (!text) return ''
  
  // Create a temporary textarea element to decode HTML entities
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

// Strip HTML tags from text and decode entities
const stripHtmlTags = (html) => {
  if (!html) return ''
  
  // First decode HTML entities
  let text = decodeHtmlEntities(html)
  
  // Create a temporary div to parse HTML and extract text
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = text
  
  // Get text content (this automatically strips HTML tags)
  let plainText = tempDiv.textContent || tempDiv.innerText || ''
  
  // Clean up extra whitespace
  plainText = plainText.replace(/\s+/g, ' ').trim()
  
  return plainText
}

// Extract categories from RSS item
const extractCategories = (item, source) => {
  const categories = []
  
  // Helper function to check if a category is a valid category (not metadata/technical)
  // Filters out UUIDs, GUIDs, metadata fields, and other non-category identifiers
  const isValidCategory = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return false
    
    // Exclude UUID/GUID patterns (8-4-4-4-12 hex digits with hyphens)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidPattern.test(trimmed)) {
      return false
    }
    
    // Exclude if it's all hex digits and hyphens (no actual words)
    if (/^[0-9a-f\-]+$/i.test(trimmed) && trimmed.length > 10) {
      return false
    }
    
    // Exclude metadata field names (contains "metadata", "taxonomy", "section-path", "content-type")
    const metadataPatterns = [
      /metadata/i,
      /taxonomy/i,
      /section-path/i,
      /content-type/i,
      /dc\.(identifier|source|subject)/i,
      /prism\./i,
      /^[a-z0-9-]+\.com\//i, // URLs like "foxnews.com/metadata/..."
    ]
    if (metadataPatterns.some(pattern => pattern.test(trimmed))) {
      return false
    }
    
    // Exclude very short categories (less than 3 characters) unless they're common category words
    const commonShortCategories = ['us', 'uk', 'ca', 'fr', 'en', 'de', 'it', 'es', 'pt', 'ru', 'cn', 'jp']
    if (trimmed.length < 3 && !commonShortCategories.includes(trimmed.toLowerCase())) {
      return false
    }
    
    // Exclude common non-category words
    const nonCategoryWords = [
      'article', 'fnc', 'rss', 'xml', 'feed', 'item', 'post', 'entry',
      'page', 'url', 'link', 'id', 'guid', 'pubdate', 'date'
    ]
    if (nonCategoryWords.includes(trimmed.toLowerCase())) {
      return false
    }
    
    // Exclude if it's just a domain or looks like a technical path
    // Patterns like "foxnews.com/something" or just domain names
    if (/^[a-z0-9-]+\.(com|org|net|edu|gov|io|co)\/?/i.test(trimmed) && !trimmed.includes('/')) {
      return false
    }
    
    // Must contain at least one letter (a-z, A-Z)
    if (!/[a-zA-Z]/.test(trimmed)) {
      return false
    }
    
    return true
  }
  
  // Standard RSS category
  item.querySelectorAll('category').forEach(cat => {
    const catText = decodeHtmlEntities(cat.textContent?.trim() || '')
    if (catText && isValidCategory(catText)) categories.push(catText)
    // Also check domain attribute (some feeds use category domain="...")
    const domain = cat.getAttribute('domain')
    if (domain && isValidCategory(domain) && !categories.includes(domain)) {
      categories.push(domain)
    }
  })
  
  // Dublin Core subject
  item.querySelectorAll('dc\\:subject').forEach(cat => {
    const catText = decodeHtmlEntities(cat.textContent?.trim() || '')
    if (catText && isValidCategory(catText) && !categories.includes(catText)) categories.push(catText)
  })
  
  // Media RSS category
  item.querySelectorAll('media\\:category').forEach(cat => {
    const catText = decodeHtmlEntities(cat.textContent?.trim() || '')
    if (catText && isValidCategory(catText) && !categories.includes(catText)) categories.push(catText)
  })
  
  // Check for categories in other namespaces
  Array.from(item.children).forEach(child => {
    if (child.localName === 'category') {
      const catText = decodeHtmlEntities(child.textContent?.trim() || '')
      if (catText && isValidCategory(catText) && !categories.includes(catText)) categories.push(catText)
    }
  })
  
  // Some feeds put categories in tags or keywords
  const tags = item.querySelector('tags')?.textContent || 
              item.querySelector('keywords')?.textContent || ''
  if (tags) {
    tags.split(',').forEach(tag => {
      const tagText = tag.trim()
      if (tagText && isValidCategory(tagText) && !categories.includes(tagText)) {
        categories.push(tagText)
      }
    })
  }
  
  return categories
}

// Extract image/thumbnail from RSS item
const extractThumbnail = (item, description) => {
  // Try multiple selectors for different RSS formats
  let thumbnail = ''
  
  // Media RSS (YouTube, etc.)
  thumbnail = item.querySelector('media\\:thumbnail')?.getAttribute('url') || ''
  if (thumbnail) return thumbnail
  
  // Standard thumbnail element
  thumbnail = item.querySelector('thumbnail')?.getAttribute('url') || ''
  if (thumbnail) return thumbnail
  
  // Enclosure with image type
  const enclosure = item.querySelector('enclosure[type^="image"]')
  if (enclosure) {
    thumbnail = enclosure.getAttribute('url') || ''
    if (thumbnail) return thumbnail
  }
  
  // Media content
  const mediaContent = item.querySelector('media\\:content[type^="image"]')
  if (mediaContent) {
    thumbnail = mediaContent.getAttribute('url') || ''
    if (thumbnail) return thumbnail
  }
  
  // Try to extract from description HTML (most common source)
  if (description) {
    try {
      const descParser = new DOMParser()
      const descDoc = descParser.parseFromString(description, 'text/html')
      
      // Try first img tag
      const descImg = descDoc.querySelector('img')
      if (descImg) {
        thumbnail = descImg.getAttribute('src') || descImg.getAttribute('data-src') || ''
        if (thumbnail && !thumbnail.startsWith('data:')) {
          // Clean up relative URLs
          if (thumbnail.startsWith('//')) {
            thumbnail = 'https:' + thumbnail
          } else if (thumbnail.startsWith('/')) {
            // Try to extract base URL from link if available
            const link = item.querySelector('link')?.textContent || ''
            if (link) {
              try {
                const url = new URL(link)
                thumbnail = url.origin + thumbnail
              } catch (e) {
                // Keep original thumbnail
              }
            }
          }
          return thumbnail
        }
      }
      
      // Try meta property og:image
      const ogImage = descDoc.querySelector('meta[property="og:image"]')
      if (ogImage) {
        thumbnail = ogImage.getAttribute('content') || ''
        if (thumbnail) return thumbnail
      }
    } catch (e) {
      // If parsing fails, try regex fallback
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i)
      if (imgMatch && imgMatch[1]) {
        thumbnail = imgMatch[1]
        if (thumbnail && !thumbnail.startsWith('data:')) {
          return thumbnail
        }
      }
    }
  }
  
  // Second attempt: Scan all elements for type="image" or type containing "image"
  // This helps identify thumbnail elements that might not match standard selectors
  try {
    const allElements = item.querySelectorAll('*')
    for (const element of allElements) {
      const typeAttr = element.getAttribute('type')
      if (typeAttr && typeAttr.toLowerCase().includes('image')) {
        // Found an element with type containing "image", try to extract URL
        // Check common attributes that might contain the image URL
        thumbnail = element.getAttribute('url') || 
                   element.getAttribute('href') || 
                   element.getAttribute('src') ||
                   element.getAttribute('content') ||
                   element.textContent?.trim() || ''
        
        if (thumbnail && 
            !thumbnail.startsWith('data:') && 
            (thumbnail.startsWith('http://') || thumbnail.startsWith('https://') || thumbnail.startsWith('//'))) {
          // Clean up protocol-relative URLs
          if (thumbnail.startsWith('//')) {
            thumbnail = 'https:' + thumbnail
          }
          return thumbnail
        }
      }
    }
  } catch (e) {
    // If scanning fails, continue to return empty string
  }
  
  return ''
}

// Parse RSS item into news article object
const parseRssItem = (item, source) => {
  // Get title - try multiple methods
  // Some feeds (like UOL) don't have title elements, use description as fallback
  const titleElement = item.querySelector('title')
  let title = ''
  if (titleElement) {
    // Try textContent first (handles CDATA automatically)
    title = titleElement.textContent || ''
    // If empty, try innerHTML (might be CDATA or HTML)
    if (!title && titleElement.innerHTML) {
      title = stripHtmlTags(titleElement.innerHTML)
    }
    // If still empty, try innerText as fallback
    if (!title && titleElement.innerText) {
      title = titleElement.innerText
    }
    title = decodeHtmlEntities(title.trim())
  }
  
  const link = item.querySelector('link')?.textContent || ''
  const pubDate = item.querySelector('pubDate')?.textContent || ''
  
  // Get description - handle both textContent (plain text) and innerHTML (HTML content)
  // Also handle CDATA sections which textContent handles automatically
  const descriptionElement = item.querySelector('description')
  let description = ''
  if (descriptionElement) {
    // Try textContent first (handles CDATA automatically)
    let descText = descriptionElement.textContent || ''
    let descInnerHTML = descriptionElement.innerHTML || ''
    
    // If textContent is empty but innerHTML exists, use innerHTML
    if (!descText && descInnerHTML) {
      // Check if innerHTML contains CDATA markers - strip them
      if (descInnerHTML.includes('<![CDATA[')) {
        descText = descInnerHTML.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      } else {
        descText = descInnerHTML
      }
    }
    
    // Check if description contains HTML
    if (descInnerHTML && descInnerHTML !== descText && descInnerHTML.includes('<') && !descInnerHTML.includes('<![CDATA[')) {
      description = stripHtmlTags(descInnerHTML)
    } else if (descText) {
      description = decodeHtmlEntities(descText)
    }
    
    // Final fallback - try innerText
    if (!description && descriptionElement.innerText) {
      description = decodeHtmlEntities(descriptionElement.innerText)
    }
    
    // Last resort - try to get text from child nodes
    if (!description && descriptionElement.childNodes.length > 0) {
      const textNodes = Array.from(descriptionElement.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
        .map(node => node.textContent || node.nodeValue || '')
        .join('')
      if (textNodes) {
        description = decodeHtmlEntities(textNodes.trim())
      }
    }
    
    description = description.trim()
  }
  
  // If no title but we have description, use description as title (UOL feed pattern)
  if (!title && description) {
    title = description
    // For UOL, also try to get content:encoded as description
    const contentElement = item.querySelector('content\\:encoded') || item.querySelector('encoded')
    if (contentElement) {
      const contentText = contentElement.textContent || ''
      const contentInnerHTML = contentElement.innerHTML || ''
      if (contentInnerHTML && contentInnerHTML.includes('<')) {
        description = stripHtmlTags(contentInnerHTML)
      } else if (contentText) {
        description = decodeHtmlEntities(contentText)
      }
      description = description.trim()
    } else {
      description = '' // Don't duplicate in description if no content
    }
  }
  
  const guid = item.querySelector('guid')?.textContent || ''
  const author = decodeHtmlEntities(item.querySelector('author')?.textContent || 
               item.querySelector('dc\\:creator')?.textContent ||
               item.querySelector('creator')?.textContent || '')
  
  // Get content - handle both textContent and innerHTML
  const contentElement = item.querySelector('content\\:encoded') || item.querySelector('encoded')
  let content = ''
  if (contentElement) {
    const contentText = contentElement.textContent || ''
    const contentInnerHTML = contentElement.innerHTML || ''
    if (contentInnerHTML !== contentText && contentInnerHTML.includes('<')) {
      content = stripHtmlTags(contentInnerHTML)
    } else {
      content = decodeHtmlEntities(contentText)
    }
  }
  
  // Limit content size to prevent memory issues (max 50KB per field)
  const MAX_CONTENT_SIZE = 50 * 1024 // 50KB
  if (description.length > MAX_CONTENT_SIZE) {
    console.warn(`[${source.name}] Description too long (${description.length} chars), truncating to ${MAX_CONTENT_SIZE}`)
    description = description.substring(0, MAX_CONTENT_SIZE) + '...'
  }
  if (content.length > MAX_CONTENT_SIZE) {
    console.warn(`[${source.name}] Content too long (${content.length} chars), truncating to ${MAX_CONTENT_SIZE}`)
    content = content.substring(0, MAX_CONTENT_SIZE) + '...'
  }
  
  const categories = extractCategories(item, source)
  let thumbnail = extractThumbnail(item, description)
  
  // Clean up thumbnail - remove empty strings, whitespace, and invalid URLs
  if (thumbnail) {
    thumbnail = thumbnail.trim()
    // Filter out obviously invalid thumbnails
    if (thumbnail === '' || 
        thumbnail.startsWith('data:') || 
        thumbnail.length < 10 || // Too short to be a valid URL
        !thumbnail.match(/^https?:\/\//i)) { // Must start with http:// or https://
      thumbnail = ''
    }
  } else {
    thumbnail = ''
  }
  
  // Debug logging for thumbnails (only in development)
  if (process.env.NODE_ENV === 'development' && thumbnail) {
  }
  
  // Extract popularity metrics from RSS if available
  let popularityScore = 0
  const shareCount = item.querySelector('shareCount')?.textContent || 
                    item.querySelector('socialCount')?.textContent || 
                    item.querySelector('engagement')?.textContent || ''
  const facebookShares = item.querySelector('facebookShares')?.textContent || 
                       item.querySelector('fbShares')?.textContent || '0'
  const twitterShares = item.querySelector('twitterShares')?.textContent || 
                      item.querySelector('tweetCount')?.textContent || '0'
  
  if (shareCount) popularityScore += parseInt(shareCount) || 0
  if (facebookShares) popularityScore += parseInt(facebookShares) * 2 || 0
  if (twitterShares) popularityScore += parseInt(twitterShares) || 0
  
  // Parse date
  let publishedAt = new Date(pubDate)
  if (isNaN(publishedAt.getTime())) {
    publishedAt = new Date(pubDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1/$2/$3'))
    if (isNaN(publishedAt.getTime())) {
      return null // Invalid date, skip this item
    }
  }
  
  // Filter to only recent news (last 24 hours instead of strict "today")
  // This is more flexible and accounts for timezone differences
  const now = new Date()
  const articleDate = new Date(publishedAt)
  const hoursDiff = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60)
  
  // Only show articles from the last 24 hours
  if (hoursDiff > 24 || hoursDiff < 0) {
    return null // Too old or future date, skip
  }
  
  const itemId = guid || `${link}-${title}`
  
  // Normalize language code (e.g., 'fr-FR' -> 'fr', 'en-US' -> 'en')
  let normalizedLanguage = source.language || 'en'
  if (normalizedLanguage.startsWith('fr')) {
    normalizedLanguage = 'fr'
  } else if (normalizedLanguage.startsWith('en')) {
    normalizedLanguage = 'en'
  } else {
    // Default to 'en' if language is unknown
    normalizedLanguage = 'en'
  }
  
  return {
    id: itemId,
    title,
    link,
    pubDate,
    description,
    guid,
    author,
    categories,
    content,
    thumbnail,
    source: source.name, // Outlet name
    language: normalizedLanguage, // Normalized language code
    region: source.region || '', // City/region
    publishedAt,
    popularityScore,
    shareCount: parseInt(shareCount) || 0
  }
}

// Fetch RSS feed from a single source
// Returns { news: [], error: { name, message, status } | null }
export const fetchRssFeed = async (source) => {
  const sourceNews = []
  
  try {
    let response = null
    let text = null
    
    // Use backend proxy to avoid CORS issues
    // The backend server fetches RSS feeds server-side, avoiding browser CORS restrictions
    try {
      const proxyUrl = `/api/proxy/rss?url=${encodeURIComponent(source.url)}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response || !response.ok) {
        let errorData = { message: 'Unknown error' }
        try {
          const errorText = await response.text()
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: `HTTP ${response?.status || 'Unknown'}` }
        }
        
        const error = {
          name: source.name,
          message: errorData.error || errorData.message || `HTTP ${response?.status}`,
          status: response?.status || 500
        }
        
        console.warn(`[${source.name}] Backend proxy failed (${error.status}): ${error.message}`)
        return { news: sourceNews, error }
      }
      
      text = await response.text()
      
      // Validate it's actually XML/RSS
      const trimmedText = text.trim()
      if (!trimmedText.includes('<rss') && 
          !trimmedText.includes('<feed') && 
          !trimmedText.includes('<?xml') &&
          !trimmedText.includes('<RDF')) {
        console.warn(`[${source.name}] Backend proxy returned non-XML content`)
        const error = {
          name: source.name,
          message: 'Invalid RSS feed format',
          status: 500
        }
        return { news: sourceNews, error }
      }
      
      
    } catch (err) {
      // Backend proxy failed
      const error = {
        name: source.name,
        message: err.name === 'AbortError' ? 'Request timeout' : (err.message || 'Network error'),
        status: err.name === 'AbortError' ? 504 : 500
      }
      
      if (err.name === 'AbortError') {
        console.warn(`[${source.name}] Backend proxy request timeout`)
      } else {
        console.warn(`[${source.name}] Backend proxy error: ${err.message || err}`)
      }
      return { news: sourceNews, error }
    }
    
    // If we don't have text at this point, proxy failed
    if (!text) {
      const error = {
        name: source.name,
        message: 'Empty response',
        status: 500
      }
      console.warn(`[${source.name}] Failed to fetch feed: ${source.url}`)
      return { news: sourceNews, error }
    }
    
    // Parse the XML we got
    // The server now sends Content-Type with charset=utf-8 and normalizes XML declaration
    // Ensure the XML declaration specifies UTF-8 for proper character encoding
    let xmlText = text
    if (xmlText.trim().startsWith('<?xml')) {
      // Ensure encoding is UTF-8 in XML declaration
      xmlText = xmlText.replace(
        /<\?xml\s+version=["']([^"']+)["'](\s+encoding=["'][^"']+["'])?/i,
        '<?xml version="$1" encoding="UTF-8"'
      )
    } else {
      // No XML declaration, add one with UTF-8
      xmlText = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlText
    }
    
    const parser = new DOMParser()
    // DOMParser will use the encoding specified in the XML declaration (UTF-8)
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    
    const parseError = xmlDoc.querySelector('parsererror')
    if (parseError) {
      // Even if there's a parse error, try to extract items
      const items = xmlDoc.querySelectorAll('item')
      if (items.length === 0) {
        // Only log in dev mode and suppress common parse errors that don't prevent extraction
        if (process.env.NODE_ENV === 'development') {
          const errorText = parseError.textContent || ''
          // Don't log if we can still extract items (some feeds have minor XML issues)
          if (!errorText.includes('mismatch') && !errorText.includes('invalid')) {
          }
        }
        return sourceNews
      }
      // Continue processing even with parse error if we have items
      // Many RSS feeds have minor XML issues but still work
    }
    
    const items = xmlDoc.querySelectorAll('item')
    
    items.forEach(item => {
      const parsedItem = parseRssItem(item, source)
      if (parsedItem) {
        sourceNews.push(parsedItem)
      }
    })
    
    if (sourceNews.length === 0 && items.length > 0) {
      // We parsed items but they were filtered out (likely date filter)
      console.warn(`[${source.name}] Parsed ${items.length} items but none matched the date filter (last 24 hours)`)
      // Log the dates of the first few items to help debug
      const sampleDates = Array.from(items).slice(0, 3).map(item => {
        const pubDate = item.querySelector('pubDate')?.textContent || 
                      item.querySelector('published')?.textContent || 
                      item.querySelector('dc\\:date')?.textContent || 
                      'No date found'
        return pubDate
      })
      console.warn(`[${source.name}] Sample article dates:`, sampleDates)
    } else if (sourceNews.length > 0) {
    } else if (items.length === 0) {
      console.warn(`[${source.name}] Feed contains no items`)
    }
    
    return { news: sourceNews, error: null }
  } catch (err) {
    // Only log unexpected errors (not timeouts, which are handled in the loop)
    const error = {
      name: source.name,
      message: err.message || 'Unexpected error',
      status: 500
    }
    
    if (err.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
      console.debug(`[${source.name}] Unexpected error:`, err.message || err)
    }
    return { news: sourceNews, error }
  }
}
