import { useState, useRef, useEffect, useCallback } from 'react'
import { loadTabs, getActiveTabId, setActiveTabId } from '../utils/tabsStorage'

export const TabNavigation = ({ tabs, activeTabId, onTabClick, onTabRename, uiLanguage }) => {
  const [editingTabId, setEditingTabId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  // Don't show tabs if only one exists
  if (!tabs || tabs.length <= 1) {
    return null
  }

  const handleTabClick = (tabId, e) => {
    // Don't trigger tab switch if we're starting to edit
    if (editingTabId === tabId) {
      return
    }
    setActiveTabId(tabId)
    onTabClick(tabId)
  }

  const handleDoubleClick = (tabId, tabName, e) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingTabId(tabId)
    setEditValue(tabName)
  }

  const handleSave = useCallback((tabId, valueToSave = null) => {
    // Use provided value or fall back to state
    const value = valueToSave !== null ? valueToSave : editValue
    const trimmedValue = value.trim()
    const tab = tabs.find(t => t.id === tabId)
    if (trimmedValue && trimmedValue !== tab?.name) {
      // Only call onTabRename if the name actually changed
      if (onTabRename) {
        onTabRename(tabId, trimmedValue)
      }
    }
    setEditingTabId(null)
    setEditValue('')
  }, [editValue, tabs, onTabRename])

  const handleCancel = () => {
    setEditingTabId(null)
    setEditValue('')
  }

  const handleKeyDown = (e, tabId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave(tabId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingTabId])

  // Handle click outside to save
  useEffect(() => {
    if (!editingTabId) return

    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        // Get current value from input element to avoid stale closure
        handleSave(editingTabId, inputRef.current.value)
      }
    }

    // Use setTimeout to avoid immediate trigger from the double-click event
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingTabId, handleSave])

  return (
    <div className="tab-navigation">
      <div className="tab-nav-container">
        {tabs.map(tab => (
          editingTabId === tab.id ? (
            <input
              key={tab.id}
              ref={inputRef}
              type="text"
              className="tab-nav-item tab-nav-item-editing"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              onBlur={() => {
                // Get value from input to ensure we have the latest
                if (inputRef.current) {
                  handleSave(tab.id, inputRef.current.value)
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              key={tab.id}
              className={`tab-nav-item ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={(e) => handleTabClick(tab.id, e)}
              onDoubleClick={(e) => handleDoubleClick(tab.id, tab.name, e)}
            >
              {tab.name}
            </button>
          )
        ))}
      </div>
    </div>
  )
}
