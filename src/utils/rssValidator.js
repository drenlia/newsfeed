// Utility to validate RSS feeds and extract channel metadata
import { getCorsProxy } from '../constants/cors'

/**
 * Validates an RSS feed URL and extracts channel metadata
 * @param {string} feedUrl - The RSS feed URL to validate
 * @returns {Promise<{valid: boolean, channel?: Object, errors?: Array<string>, warnings?: Array<string>}>}
 */
export const validateRssFeed = async (feedUrl) => {
  const errors = []
  const warnings = []
  
  // Basic URL validation
  try {
    new URL(feedUrl)
  } catch (e) {
    return {
      valid: false,
      errors: ['Invalid URL format'],
      warnings: []
    }
  }
  
  let xmlText = null
  
  // Try to fetch the feed
  try {
    // Try direct access first (will fail silently on CORS, then try proxy)
    let directAccessFailed = false
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      let response = null
      try {
        response = await fetch(feedUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          },
          mode: 'cors'
        })
      } catch (fetchError) {
        // CORS or network error - this is expected, will try proxy
        directAccessFailed = true
        clearTimeout(timeoutId)
        // Silently continue to proxy attempt
      }
      
      if (response) {
        clearTimeout(timeoutId)
        
        if (response.ok) {
          xmlText = await response.text()
          // Validate it's actually XML/RSS
          const trimmedText = xmlText.trim()
          if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html') || 
              (!trimmedText.includes('<rss') && !trimmedText.includes('<feed') && !trimmedText.includes('<?xml'))) {
            xmlText = null // Not valid XML/RSS
          }
        } else if (response.status === 404) {
          // 404 from direct access - feed doesn't exist
          return {
            valid: false,
            errors: [`Feed not found (404). Please check the URL: ${feedUrl}`],
            warnings: []
          }
        }
      } else {
        directAccessFailed = true
      }
    } catch (directError) {
      // Any other error - will try proxy
      directAccessFailed = true
    }
    
    // Fallback to proxy if direct failed
    if (!xmlText && directAccessFailed) {
      // Try multiple proxy fallbacks
      let proxySuccess = false
      for (let proxyIndex = 0; proxyIndex < 2; proxyIndex++) {
        try {
          const proxyUrl = getCorsProxy(feedUrl, proxyIndex)
          if (!proxyUrl) continue
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000)
          
          const response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            }
          })
          
          clearTimeout(timeoutId)
          
          if (response && response.ok) {
            xmlText = await response.text()
            // Validate it's actually XML/RSS
            const trimmedText = xmlText.trim()
            if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html') || 
                (!trimmedText.includes('<rss') && !trimmedText.includes('<feed') && !trimmedText.includes('<?xml'))) {
              xmlText = null // Not valid XML/RSS, try next proxy
              continue
            }
            proxySuccess = true
            break
          } else if (response && response.status === 404) {
            return {
              valid: false,
              errors: [`Feed not found (404). Please check the URL: ${feedUrl}`],
              warnings: []
            }
          }
        } catch (proxyError) {
          // Try next proxy
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[RSS Validator] Proxy ${proxyIndex} failed:`, proxyError.message)
          }
          continue
        }
      }
      
      if (!proxySuccess && !xmlText) {
        return {
          valid: false,
          errors: [
            'Unable to fetch feed. This could be due to:',
            '1. CORS restrictions (feed server blocks cross-origin requests)',
            '2. Network connectivity issues',
            '3. Invalid or inaccessible feed URL',
            `URL attempted: ${feedUrl}`
          ],
          warnings: []
        }
      }
    }
    
    if (!xmlText || xmlText.trim().length === 0) {
      return {
        valid: false,
        errors: ['Feed returned empty content'],
        warnings: []
      }
    }
    
    // Check if response is HTML (error page) instead of XML
    // This can happen even when Content-Type header says RSS/XML (like this site does)
    const trimmedText = xmlText.trim()
    if (trimmedText.startsWith('<!DOCTYPE') || 
        trimmedText.startsWith('<html') || 
        (trimmedText.includes('<!DOCTYPE') && !trimmedText.includes('<rss') && !trimmedText.includes('<feed'))) {
      // Check if it's a 404 page
      const is404Page = trimmedText.includes('404') || 
                        trimmedText.toLowerCase().includes('page introuvable') ||
                        trimmedText.toLowerCase().includes('not found') ||
                        trimmedText.toLowerCase().includes('page not found') ||
                        trimmedText.toLowerCase().includes('désolé')
      
      return {
        valid: false,
        errors: [
          is404Page 
            ? `Feed not found (404). The server returned an HTML 404 error page instead of RSS feed.`
            : 'Feed returned HTML instead of RSS/XML. Please check the URL.',
          `URL: ${feedUrl}`
        ],
        warnings: []
      }
    }
    
    // Parse XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    
    // Check for parse errors
    const parseError = xmlDoc.querySelector('parsererror')
    if (parseError) {
      const errorText = parseError.textContent || 'Unknown XML parsing error'
      return {
        valid: false,
        errors: [`XML parsing error: ${errorText.substring(0, 100)}`],
        warnings: []
      }
    }
    
    // Check if it's RSS or Atom feed
    const rss = xmlDoc.querySelector('rss')
    const feed = xmlDoc.querySelector('feed') // Atom feed
    const rdf = xmlDoc.querySelector('RDF') // RDF feed
    
    if (!rss && !feed && !rdf) {
      return {
        valid: false,
        errors: ['Not a valid RSS, Atom, or RDF feed'],
        warnings: []
      }
    }
    
    // Extract channel/item information
    let channel = null
    let items = []
    
    if (rss) {
      // RSS 2.0 format
      channel = rss.querySelector('channel')
      items = channel ? channel.querySelectorAll('item') : []
    } else if (feed) {
      // Atom format
      channel = feed
      items = feed.querySelectorAll('entry')
    } else if (rdf) {
      // RDF format
      channel = rdf.querySelector('channel')
      items = rdf.querySelectorAll('item')
    }
    
    if (!channel) {
      return {
        valid: false,
        errors: ['Feed does not contain a channel element'],
        warnings: []
      }
    }
    
    // Validate required fields in channel
    const channelTitle = channel.querySelector('title')?.textContent || ''
    const channelDescription = channel.querySelector('description')?.textContent || 
                              channel.querySelector('subtitle')?.textContent || '' // Atom uses subtitle
    
    // Check for items
    if (items.length === 0) {
      warnings.push('Feed contains no items/articles')
    }
    
    // Validate required fields in items
    const requiredFields = {
      title: false,
      description: false,
      pubDate: false,
      category: false
    }
    
    const sampleItems = Array.from(items).slice(0, 5) // Check first 5 items
    
    if (sampleItems.length > 0) {
      sampleItems.forEach(item => {
        if (item.querySelector('title')?.textContent) requiredFields.title = true
        if (item.querySelector('description')?.textContent || 
            item.querySelector('summary')?.textContent || 
            item.querySelector('content')?.textContent) requiredFields.description = true
        if (item.querySelector('pubDate')?.textContent || 
            item.querySelector('published')?.textContent ||
            item.querySelector('dc\\:date')?.textContent) requiredFields.pubDate = true
        if (item.querySelector('category') || 
            item.querySelector('dc\\:subject') ||
            item.querySelector('media\\:category')) requiredFields.category = true
      })
    } else {
      // No items to validate, but feed structure is valid
      warnings.push('Feed structure is valid but contains no items to validate')
    }
    
    // Build error list for missing required fields
    const missingFields = []
    if (!requiredFields.title) missingFields.push('title')
    if (!requiredFields.description) missingFields.push('description')
    if (!requiredFields.pubDate) missingFields.push('pubDate')
    if (!requiredFields.category) missingFields.push('category')
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        errors: [`Feed items are missing required fields: ${missingFields.join(', ')}`],
        warnings: warnings,
        channel: {
          title: channelTitle,
          description: channelDescription,
          link: channel.querySelector('link')?.textContent || feedUrl,
          language: channel.querySelector('language')?.textContent || '',
          itemCount: items.length
        }
      }
    }
    
    // Extract channel metadata
    const channelData = {
      title: channelTitle || 'Untitled Feed',
      description: channelDescription || '',
      link: channel.querySelector('link')?.textContent || 
            channel.querySelector('link')?.getAttribute('href') || 
            feedUrl,
      language: channel.querySelector('language')?.textContent || 
                channel.getAttribute('xml:lang') || 
                'en',
      itemCount: items.length,
      lastBuildDate: channel.querySelector('lastBuildDate')?.textContent || 
                     channel.querySelector('updated')?.textContent || 
                     null
    }
    
    return {
      valid: true,
      channel: channelData,
      errors: [],
      warnings: warnings
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        valid: false,
        errors: ['Request timed out. Please check the URL and try again.'],
        warnings: []
      }
    }
    
    return {
      valid: false,
      errors: [`Error validating feed: ${error.message || 'Unknown error'}`],
      warnings: []
    }
  }
}
