// Category translation/mapping for combining similar categories
export const categoryEquivalents = {
  'food': ['nourriture', 'alimentation', 'cuisine'],
  'nourriture': ['food', 'alimentation', 'cuisine'],
  'health': ['santé', 'sante', 'santé publique'],
  'santé': ['health', 'sante', 'santé publique'],
  'sante': ['health', 'santé', 'santé publique'],
  'sports': ['sport'],
  'sport': ['sports'],
  'politics': ['politique'],
  'politique': ['politics'],
  'technology': ['technologie'],
  'technologie': ['technology'],
  'business': ['affaires', 'économie', 'economie'],
  'affaires': ['business', 'économie', 'economie'],
  'économie': ['business', 'affaires', 'economie'],
  'economie': ['business', 'affaires', 'économie']
}

// Source importance scores for popularity calculation
export const sourceScores = {
  'CBC Montreal': 15,
  'Radio-Canada Montréal': 15,
  'La Presse': 12,
  'Le Devoir': 12,
  'Montreal Gazette': 10,
  'CTV News Montreal': 10,
  'Journal de Montréal': 10
}

// Important categories that boost popularity score
export const importantCategories = ['breaking', 'breaking news', 'actualité', 'politique', 'politics', 'santé', 'health']

// Important keywords in titles that suggest importance
export const importantKeywords = ['urgent', 'breaking', 'exclusive', 'important', 'major', 'urgent', 'exclusif', 'important']
