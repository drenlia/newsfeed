import { translations } from '../constants/translations'
import { NewsItem } from './NewsItem'

export const NewsList = ({ 
  news, 
  uiLanguage, 
  loading, 
  isInitialLoad, 
  error, 
  newItemIds,
  combinedCategories,
  onCategoryClick
}) => {
  const t = translations[uiLanguage]

  if (loading && isInitialLoad) {
    return <div className="loading">{t.loading}</div>
  }

  if (error) {
    return <div className="error">{t.error}: {error}</div>
  }

  if (news.length === 0) {
    return <div className="no-news">{t.noNews}</div>
  }

  return (
    <div className="news-list">
      {news.map((item) => (
        <NewsItem
          key={item.id || `${item.link}-${item.title}`}
          item={item}
          uiLanguage={uiLanguage}
          isNew={newItemIds.has(item.id)}
          combinedCategories={combinedCategories}
          onCategoryClick={onCategoryClick}
        />
      ))}
    </div>
  )
}
