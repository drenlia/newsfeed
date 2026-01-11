import { translations } from '../constants/translations'

export const Header = ({ uiLanguage, onLanguageToggle, articleCount, totalCount, onSettingsClick, showArticleCount = true, isSettingsPage = false }) => {
  const t = translations[uiLanguage]
  
  return (
    <header className="site-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="site-title">{t.title}</h1>
        </div>
        <div className="header-right">
          {showArticleCount && articleCount !== undefined && (
            <div className="news-counter">
              <span className="counter-text">
                {t.showing} <strong>{articleCount}</strong> {articleCount === 1 ? t.articleCount : t.articlesCount}
                {totalCount !== undefined && totalCount !== articleCount && (
                  <span className="counter-total"> / {totalCount} {t.articlesCount}</span>
                )}
              </span>
            </div>
          )}
          {onSettingsClick && (
            <button 
              className={`header-settings-btn ${isSettingsPage ? 'active' : ''}`}
              onClick={onSettingsClick}
              title={t.settings}
            >
              ⚙️ {t.settings}
            </button>
          )}
          <button 
            className="header-lang-toggle-btn"
            onClick={onLanguageToggle}
            title={uiLanguage === 'fr' ? 'Switch to English' : 'Passer au français'}
          >
            {uiLanguage === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>
      </div>
    </header>
  )
}
