# Montreal News Feed

A bilingual (French/English) news aggregator web application that displays the latest news from Montreal, QC, Canada.

## Features

- 🌐 **Bilingual Interface**: Auto-detects browser language and allows manual toggle between French (FR) and English (EN)
- 📰 **Multi-source News**: Aggregates news from both French and English sources
- 🔍 **Smart Filtering**: Filter news by language (All, French only, English only)
- 🔄 **Auto-refresh**: Automatically refreshes news every 5 minutes (toggleable)
- 📱 **Responsive Design**: Works on desktop and mobile devices

## News Sources

The application pulls news from various Montreal-based sources:

**English Sources:**
- CBC Montreal
- Montreal Gazette
- CTV News Montreal

**French Sources:**
- Radio-Canada Montréal
- La Presse
- Le Devoir
- Journal de Montréal

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Configuration

Edit `src/news.json` to add or modify RSS feed sources. Each source should have:
- `name`: Display name of the source
- `url`: RSS feed URL
- `language`: `"en"` or `"fr"`
- `region`: Region identifier (e.g., "Montreal")

## Notes

- The app uses a CORS proxy service to fetch RSS feeds. For production, consider setting up your own backend proxy.
- News items are sorted by publication date (most recent first).
- Language badges (FR/EN) indicate the language of each news article.
