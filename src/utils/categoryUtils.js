import { categoryEquivalents } from '../constants/categories'

// Normalize and combine similar categories
export const normalizeCategory = (cat) => {
  const lower = cat.toLowerCase().trim()
  // Check if this category has equivalents
  for (const [key, equivalents] of Object.entries(categoryEquivalents)) {
    if (key === lower || equivalents.includes(lower)) {
      return key
    }
  }
  return lower
}
