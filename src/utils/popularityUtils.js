import { sourceScores, importantCategories, importantKeywords } from '../constants/categories'

// Calculate popularity score for articles
export const calculatePopularityScores = (newsItems) => {
  return newsItems.map(item => {
    let score = item.popularityScore || 0
    
    // Source importance (major news outlets get higher base score)
    score += sourceScores[item.source] || 5
    
    // Recency bonus (newer articles get slight boost)
    const hoursSincePublished = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSincePublished < 1) score += 5
    else if (hoursSincePublished < 3) score += 3
    else if (hoursSincePublished < 6) score += 1
    
    // Category importance (breaking news, politics get higher scores)
    if (item.categories && item.categories.some(cat => 
      importantCategories.some(imp => cat.toLowerCase().includes(imp))
    )) {
      score += 8
    }
    
    // Title keywords that suggest importance
    const titleLower = item.title.toLowerCase()
    if (importantKeywords.some(keyword => titleLower.includes(keyword))) {
      score += 5
    }
    
    return {
      ...item,
      popularityScore: Math.round(score)
    }
  })
}
