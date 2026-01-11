import { getCorsProxy, CORS_PROXIES } from '../constants/cors'

// Decode HTML entities in text
const decodeHtmlEntities = (text) => {
  if (!text) return ''
  
  // Create a temporary textarea element to decode HTML entities
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

// Extract categories from RSS item
const extractCategories = (item, source) => {
  const categories = []
  
  // Standard RSS category
  item.querySelectorAll('category').forEach(cat => {
    const catText = decodeHtmlEntities(cat.textContent?.trim() || '')
    if (catText) categories.push(catText)
    // Also check domain attribute (some feeds use category domain="...")
    const domain = cat.getAttribute('domain')
    if (domain && !categories.includes(domain)) {
      categories.push(domain)
    }
  })
  
  // Dublin Core subject
  item.querySelectorAll('dc\\:subject').forEach(cat => {
    const catText = decodeHtmlEntities(cat.textContent?.trim() || '')
    if (catText && !categories.includes(catText)) categories.push(catText)
  })
  
  // Media RSS category
  item.querySelectorAll('media\\:category').forEach(cat => {
    const catText = decodeHtmlEntities(cat.textContent?.trim() || '')
    if (catText && !categories.includes(catText)) categories.push(catText)
  })
  
  // Check for categories in other namespaces
  Array.from(item.children).forEach(child => {
    if (child.localName === 'category') {
      const catText = decodeHtmlEntities(child.textContent?.trim() || '')
      if (catText && !categories.includes(catText)) categories.push(catText)
    }
  })
  
  // Some feeds put categories in tags or keywords
  const tags = item.querySelector('tags')?.textContent || 
              item.querySelector('keywords')?.textContent || ''
  if (tags) {
    tags.split(',').forEach(tag => {
      const tagText = tag.trim()
      if (tagText && !categories.includes(tagText)) {
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
    if (process.env.NODE_ENV === 'development') {
      console.debug('[extractThumbnail] Error scanning for type="image" elements:', e)
    }
  }
  
  return ''
}

// Parse RSS item into news article object
const parseRssItem = (item, source) => {
  const title = decodeHtmlEntities(item.querySelector('title')?.textContent || '')
  const link = item.querySelector('link')?.textContent || ''
  const pubDate = item.querySelector('pubDate')?.textContent || ''
  let description = decodeHtmlEntities(item.querySelector('description')?.textContent || '')
  const guid = item.querySelector('guid')?.textContent || ''
  const author = decodeHtmlEntities(item.querySelector('author')?.textContent || 
               item.querySelector('dc\\:creator')?.textContent ||
               item.querySelector('creator')?.textContent || '')
  let content = decodeHtmlEntities(item.querySelector('content\\:encoded')?.textContent || 
                item.querySelector('encoded')?.textContent || '')
  
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
    console.log(`[${source.name}] Thumbnail found:`, thumbnail.substring(0, 80))
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
export const fetchRssFeed = async (source) => {
  const sourceNews = []
  
  try {
    let response = null
    let text = null
    
    // Try direct access first (much faster if CORS allows it)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout for direct access
      
      response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        mode: 'cors' // Explicitly request CORS
      })
      
      clearTimeout(timeoutId)
      
      if (response && response.ok) {
        const directText = await response.text()
        
        // Validate it's actually XML/RSS
        const trimmedText = directText.trim()
        if (trimmedText.includes('<rss') || 
            trimmedText.includes('<feed') || 
            trimmedText.includes('<?xml') ||
            trimmedText.includes('<RDF')) {
          text = directText
          console.log(`[${source.name}] ✓ Direct access successful!`)
        } else {
          // Got response but not XML, try proxies
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[${source.name}] Direct access returned non-XML, trying proxies...`)
          }
        }
      }
    } catch (directError) {
      // Direct access failed (likely CORS), try proxies
      // This is expected for many feeds, so we don't log it
    }
    
    // If direct access failed, try CORS proxies
    if (!text) {
      for (let proxyIndex = 0; proxyIndex < CORS_PROXIES.length; proxyIndex++) {
        try {
          const proxyUrl = getCorsProxy(source.url, proxyIndex)
          if (!proxyUrl) break
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000)
          
          response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            }
          })
          
          clearTimeout(timeoutId)
          
          if (!response || !response.ok) {
            continue // Try next proxy
          }
          
          // Got a response, check if it's valid XML
          text = await response.text()
          
          if (!text || text.trim().length === 0) {
            continue // Try next proxy
          }
          
          // Check if response is HTML (error page) instead of XML
          const trimmedText = text.trim()
          if (trimmedText.startsWith('<!DOCTYPE') || 
              trimmedText.startsWith('<html') || 
              (trimmedText.includes('<!DOCTYPE') && !trimmedText.includes('<rss') && !trimmedText.includes('<feed'))) {
            continue // Try next proxy
          }
          
          // Check if it's actually XML/RSS
          if (!trimmedText.includes('<rss') && 
              !trimmedText.includes('<feed') && 
              !trimmedText.includes('<?xml') &&
              !trimmedText.includes('<RDF')) {
            continue // Try next proxy
          }
          
          // We have valid-looking XML, break out of proxy loop
          break
          
        } catch (err) {
          // Network error, timeout, or DNS error - try next proxy silently
          if (err.name === 'AbortError' || 
              err.message?.includes('ERR_NAME_NOT_RESOLVED') ||
              err.message?.includes('Failed to fetch') ||
              err.message?.includes('NetworkError')) {
            continue
          }
          continue
        }
      }
    }
    
    // If we don't have text at this point, all proxies failed
    if (!text) {
      console.warn(`[${source.name}] All CORS proxies failed. Try accessing the feed directly: ${source.url}`)
      return sourceNews
    }
    
    // Parse the XML we got
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')
    
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
            console.debug(`[${source.name}] XML parse warning (continuing anyway)`)
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
    } else if (sourceNews.length > 0) {
      console.log(`[${source.name}] Successfully fetched ${sourceNews.length} articles`)
    }
    
    return sourceNews
  } catch (err) {
    // Only log unexpected errors (not timeouts, which are handled in the loop)
    if (err.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
      console.debug(`[${source.name}] Unexpected error:`, err.message || err)
    }
    return sourceNews
  }
}
