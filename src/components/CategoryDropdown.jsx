import { useState, useEffect } from 'react'
import { translations } from '../constants/translations'

export const CategoryDropdown = ({
  uiLanguage,
  selectedCategories,
  availableCategories,
  onToggleCategory,
  onClearCategories
}) => {
  const handleToggle = (categoryName) => {
    if (categoryName === null) {
      // Always clear when clicking "All Categories"
      onClearCategories()
    } else {
      // When toggling a specific category, if "All Categories" is currently selected (size === 0),
      // we need to clear it first, then add the new category
      if (selectedCategories.size === 0) {
        // This shouldn't happen, but handle it just in case
        onToggleCategory(categoryName)
      } else {
        onToggleCategory(categoryName)
      }
    }
  }
  
  const handleAllCategoriesClick = () => {
    // Always clear all categories when clicking "All Categories"
    onClearCategories()
  }
  const t = translations[uiLanguage]
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('.category-dropdown')
      if (dropdown && !dropdown.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('') // Clear search when closing
      }
    }
    // Use mousedown to catch clicks before they propagate
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter categories based on search query
  const filteredCategories = availableCategories.filter(catGroup => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return catGroup.displayName.toLowerCase().includes(query) ||
           catGroup.variants.some(variant => variant.toLowerCase().includes(query))
  })


  return (
    <div className="control-group category-filter-group">
      <div className="category-dropdown">
        <button 
          className="category-dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedCategories.size === 0 
            ? t.allCategories 
            : `${selectedCategories.size} ${selectedCategories.size === 1 ? 'category' : 'categories'} selected`}
          <span className="dropdown-arrow">▼</span>
        </button>
        <div className={`category-dropdown-content ${isOpen ? 'show' : ''}`}>
          {/* Search input */}
          <div className="category-search-wrapper">
            <input
              type="text"
              className="category-search-input"
              placeholder={t.searchCategories || 'Search categories...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') {
                  setIsOpen(false)
                  setSearchQuery('')
                }
              }}
            />
            {searchQuery && (
              <button
                className="category-search-clear"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchQuery('')
                }}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="category-dropdown-items-container">
            <div className="category-dropdown-item">
              <label>
                <input
                  type="checkbox"
                  checked={selectedCategories.size === 0}
                  onChange={handleAllCategoriesClick}
                  onClick={(e) => {
                    // Prevent double-triggering
                    if (selectedCategories.size > 0) {
                      e.stopPropagation()
                    }
                  }}
                />
                <span>{t.allCategories}</span>
              </label>
            </div>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((catGroup, idx) => (
                <div key={idx} className="category-dropdown-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(catGroup.displayName)}
                      onChange={() => handleToggle(catGroup.displayName)}
                    />
                    <span>{catGroup.displayName}</span>
                    {catGroup.languages.length > 1 && (
                      <span className="category-lang-indicator">
                        {catGroup.languages.join('/')}
                      </span>
                    )}
                  </label>
                </div>
              ))
            ) : searchQuery.trim() ? (
              <div className="category-dropdown-no-results">
                {t.noCategoryResults || 'No categories found'}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
