// CORS proxy - using multiple fallback options
// Note: Free CORS proxies can be unreliable. For production, consider a backend proxy.
// If proxies fail, you may need to set up your own backend proxy server.
export const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest='
]

// Get CORS proxy URL with fallback
export const getCorsProxy = (url, proxyIndex = 0) => {
  if (proxyIndex >= CORS_PROXIES.length) {
    return null // All proxies failed
  }
  const proxy = CORS_PROXIES[proxyIndex]
  
  // Handle different proxy URL formats
  if (proxy.includes('codetabs')) {
    return `${proxy}${encodeURIComponent(url)}`
  } else {
    return `${proxy}${encodeURIComponent(url)}`
  }
}
