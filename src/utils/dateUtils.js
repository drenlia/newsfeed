// Format date based on language
export const formatDate = (date, language = 'en') => {
  if (!date || isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
