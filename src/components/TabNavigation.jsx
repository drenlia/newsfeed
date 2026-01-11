import { loadTabs, getActiveTabId, setActiveTabId } from '../utils/tabsStorage'

export const TabNavigation = ({ tabs, activeTabId, onTabClick, uiLanguage }) => {
  // Don't show tabs if only one exists
  if (!tabs || tabs.length <= 1) {
    return null
  }

  const handleTabClick = (tabId) => {
    setActiveTabId(tabId)
    onTabClick(tabId)
  }

  return (
    <div className="tab-navigation">
      <div className="tab-nav-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-nav-item ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>
    </div>
  )
}
