import { normalizeCategory } from './categoryUtils'

// Get combined categories (French/English merged)
export const getCombinedCategories = (categories) => {
  const combined = new Map()
  
  // Process English categories
  categories.en.forEach(cat => {
    const normalized = normalizeCategory(cat)
    if (!combined.has(normalized)) {
      combined.set(normalized, { 
        displayName: cat, 
        variants: [cat],
        languages: ['en'],
        normalized: normalized
      })
    } else {
      const existing = combined.get(normalized)
      if (!existing.variants.includes(cat)) {
        existing.variants.push(cat)
      }
      if (!existing.languages.includes('en')) {
        existing.languages.push('en')
      }
    }
  })
  
  // Process French categories
  categories.fr.forEach(cat => {
    const normalized = normalizeCategory(cat)
    if (!combined.has(normalized)) {
      combined.set(normalized, { 
        displayName: cat, 
        variants: [cat],
        languages: ['fr'],
        normalized: normalized
      })
    } else {
      const existing = combined.get(normalized)
      if (!existing.variants.includes(cat)) {
        existing.variants.push(cat)
      }
      if (!existing.languages.includes('fr')) {
        existing.languages.push('fr')
      }
      // Update display name to show both if different
      if (existing.languages.length > 1) {
        existing.displayName = `${existing.variants[0]} / ${cat}`
      }
    }
  })
  
  return Array.from(combined.values()).sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  )
}

// Get available categories from filtered news
export const getAvailableCategories = (news, combinedCategories, filters) => {
  const { newsFilter, showHighlyRated, searchQuery } = filters
  
  // Get news filtered by language, highly rated, and search (but not category filter)
  const preCategoryFilteredNews = news.filter(item => {
    if (newsFilter !== 'all' && item.language !== newsFilter) {
      return false
    }
    
    if (showHighlyRated) {
      const score = item.popularityScore || 0
      if (score <= 15) {
        return false
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const searchableText = `${item.title} ${item.description || ''} ${item.source} ${(item.categories || []).join(' ')}`.toLowerCase()
      if (!searchableText.includes(query)) {
        return false
      }
    }
    
    return true
  })
  
  // Extract all categories from these articles
  const availableCategorySet = new Set()
  preCategoryFilteredNews.forEach(item => {
    if (item.categories && item.categories.length > 0) {
      item.categories.forEach(cat => {
        const normalized = normalizeCategory(cat)
        const combinedCat = combinedCategories.find(c => c.normalized === normalized)
        if (combinedCat) {
          availableCategorySet.add(combinedCat.displayName)
        }
      })
    }
  })
  
  // Filter combined categories to only those that have matching articles
  return combinedCategories.filter(cat => availableCategorySet.has(cat.displayName))
}
