import { formatDate } from '../utils/dateUtils'
import { normalizeCategory } from '../utils/categoryUtils'

export const NewsItem = ({ item, uiLanguage, isNew, combinedCategories, onCategoryClick }) => {
  const formatDateLocalized = (date) => formatDate(date, uiLanguage)

  return (
    <article 
      key={item.id || `${item.link}-${item.title}`} 
      className={`news-item ${isNew ? 'new-item' : ''}`}
    >
      <div className="news-content-wrapper">
        {item.thumbnail && item.thumbnail.trim() !== '' && (
          <div className="news-image-container">
            <a 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="news-image-link"
            >
              <img 
                src={item.thumbnail} 
                alt={item.title || 'Article thumbnail'}
                className="news-image"
                onError={(e) => {
                  // Hide the image container if image fails to load
                  e.target.parentElement.parentElement.style.display = 'none'
                }}
              />
            </a>
          </div>
        )}
        <div className="news-text-content">
          <div className="news-header">
            {item.title && item.title.trim() !== '' ? (
              <h2 className="news-title">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </h2>
            ) : null}
            <div className="news-meta">
              <span className={`lang-badge ${item.language}`}>
                {item.language.toUpperCase()}
              </span>
              <span className="news-source">{item.source}</span>
              <span className="news-date">{formatDateLocalized(item.publishedAt)}</span>
              {item.popularityScore > 0 && (
                <span className="popularity-badge" title="Popularity Score">
                  {item.popularityScore}
                </span>
              )}
            </div>
            {item.categories && item.categories.length > 0 && (
              <div className="news-categories">
                {item.categories.map((cat, idx) => {
                  const combinedCat = combinedCategories.find(c => 
                    c.variants.some(v => v.toLowerCase() === cat.toLowerCase())
                  )
                  const displayName = combinedCat ? combinedCat.displayName : cat
                  return (
                    <span 
                      key={idx} 
                      className="category-badge"
                      onClick={() => onCategoryClick(displayName)}
                      title="Filter by category"
                    >
                      {cat}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          {item.description && (
            item.title && item.title.trim() !== '' ? (
              // If title exists, description is just text
              <p 
                className="news-description" 
                dangerouslySetInnerHTML={{ 
                  __html: item.description
                    .replace(/<img[^>]*>/gi, '') // Remove all img tags from description
                    .replace(/<figure[^>]*>.*?<\/figure>/gi, '') // Remove figure tags with images
                    .replace(/<picture[^>]*>.*?<\/picture>/gi, '') // Remove picture tags
                    .replace(/<div[^>]*class="[^"]*image[^"]*"[^>]*>.*?<\/div>/gi, '') // Remove divs with image classes
                    .replace(/<div[^>]*style="[^"]*background-image[^"]*"[^>]*>.*?<\/div>/gi, '') // Remove divs with background images
                    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes (YouTube, etc.)
                    .replace(/<embed[^>]*>.*?<\/embed>/gi, '') // Remove embed tags
                    .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remove object tags
                    .replace(/<video[^>]*>.*?<\/video>/gi, '') // Remove video tags
                    .replace(/<audio[^>]*>.*?<\/audio>/gi, '') // Remove audio tags
                    .replace(/<core-commerce[^>]*>.*?<\/core-commerce>/gi, '') // Remove custom elements
                }} 
              />
            ) : (
              // If no title, make description a clickable link
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="news-description news-description-link"
                dangerouslySetInnerHTML={{ 
                  __html: item.description
                    .replace(/<img[^>]*>/gi, '') // Remove all img tags from description
                    .replace(/<figure[^>]*>.*?<\/figure>/gi, '') // Remove figure tags with images
                    .replace(/<picture[^>]*>.*?<\/picture>/gi, '') // Remove picture tags
                    .replace(/<div[^>]*class="[^"]*image[^"]*"[^>]*>.*?<\/div>/gi, '') // Remove divs with image classes
                    .replace(/<div[^>]*style="[^"]*background-image[^"]*"[^>]*>.*?<\/div>/gi, '') // Remove divs with background images
                    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes (YouTube, etc.)
                    .replace(/<embed[^>]*>.*?<\/embed>/gi, '') // Remove embed tags
                    .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remove object tags
                    .replace(/<video[^>]*>.*?<\/video>/gi, '') // Remove video tags
                    .replace(/<audio[^>]*>.*?<\/audio>/gi, '') // Remove audio tags
                    .replace(/<core-commerce[^>]*>.*?<\/core-commerce>/gi, '') // Remove custom elements
                }} 
              />
            )
          )}
        </div>
      </div>
    </article>
  )
}
