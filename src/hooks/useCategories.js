import { useState, useEffect } from 'react'
import { loadCategories, saveCategories } from '../utils/storageUtils'
import categoriesData from '../categories.json'
import newsSources from '../news.json'

export const useCategories = (news) => {
  const [categories, setCategories] = useState({ en: [], fr: [] })

  useEffect(() => {
    const loaded = loadCategories()
    setCategories(loaded.categories || { en: [], fr: [] })
  }, [])

  // Extract and update categories from news items
  useEffect(() => {
    if (news.length === 0) return

    const allCategories = { en: new Set(), fr: new Set() }
    
    news.forEach(item => {
      if (item.categories && item.categories.length > 0) {
        // Normalize language code (e.g., 'fr-FR' -> 'fr', 'en-US' -> 'en')
        let lang = item.language || 'en'
        if (lang.startsWith('fr')) {
          lang = 'fr'
        } else if (lang.startsWith('en')) {
          lang = 'en'
        } else {
          // Default to 'en' if language is unknown
          lang = 'en'
        }
        
        // Ensure the Set exists for this language
        if (!allCategories[lang]) {
          allCategories[lang] = new Set()
        }
        
        item.categories.forEach(cat => {
          if (cat && cat.trim()) {
            allCategories[lang].add(cat.trim())
          }
        })
      }
    })
    
    setCategories(prevCats => {
      const updatedCategories = {
        en: Array.from(new Set([...prevCats.en, ...allCategories.en])).sort(),
        fr: Array.from(new Set([...prevCats.fr, ...allCategories.fr])).sort()
      }
      saveCategories(updatedCategories)
      return updatedCategories
    })
  }, [news])

  return categories
}
