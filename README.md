# News Feed Application

A modern, bilingual news aggregator that brings together the latest articles from multiple sources in one convenient place. The application automatically fetches news from RSS feeds, displays them in an easy-to-read format, and lets you organize your reading with customizable tabs.

## Features

- **Bilingual Interface**: Switch between French and English with a single click
- **Multiple News Sources**: Aggregates articles from various news outlets
- **Smart Organization**: Create custom tabs to organize news by topic, region, or interest
- **Real-time Updates**: Automatically refreshes news every 5 minutes (can be disabled)
- **Advanced Filtering**: Filter by language, category, date, or search keywords
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile devices
- **Local Caching**: Articles are cached locally for faster loading

## News Sources

The application comes pre-configured with the following sources:

**English Sources:**
- CBC Montreal
- Montreal Gazette

**French Sources:**
- Radio-Canada En-bref
- La Presse
- Le Devoir
- Journal de Montréal

You can easily add, remove, or modify sources through the Settings page.

## Installation (Docker)

The easiest way to run this application is using Docker. Make sure you have Docker and Docker Compose installed on your system.

### Quick Start

1. **Clone or download this repository**

2. **Build and start the application:**
   ```bash
   ./build.sh
   ```
   
   Or manually:
   ```bash
   docker compose up -d --build
   ```

3. **Access the application:**
   Open your web browser and navigate to:
   ```
   http://localhost:3072
   ```

That's it! The application is now running.

### Managing the Application

**View logs:**
```bash
docker compose logs -f newsfeed
```

**Stop the application:**
```bash
docker compose down
```

**Restart the application:**
```bash
docker compose restart
```

**Rebuild after making changes:**
```bash
docker compose up -d --build
```

## Using the Application

### Creating Tabs

You can create multiple tabs to organize different sets of news sources. For example:
- Create a "Local News" tab with Montreal-specific sources
- Create a "International" tab with global news sources
- Create a "Technology" tab with tech-focused sources

### Adding News Sources

1. Click the **Settings** button in the top right
2. Use the search to find news sources by outlet name, city, or country
3. Select sources and click **Add Selected**
4. Sources are automatically saved to your current tab

### Customizing Your Experience

- **Language Filter**: Show all news, French only, or English only
- **Category Filter**: Filter articles by topic (Politics, Sports, Technology, etc.)
- **Search**: Search for specific keywords across all articles
- **Sort Options**: Sort by date (newest first) or popularity
- **Toast Messages**: Toggle on/off to control fetch status notifications

### Tips

- Double-click any tab name to rename it
- Drag tabs to reorder them
- Articles are cached locally, so you may need to refresh after adding/removing sources
- The application remembers your preferences and tab configurations

## Troubleshooting

**Port already in use:**
If port 3072 is already in use, you can change it in `docker-compose.yml`:
```yaml
ports:
  - "YOUR_PORT:3072"
```

**Application won't start:**
- Check that Docker is running: `docker ps`
- View logs: `docker compose logs newsfeed`
- Try rebuilding: `docker compose down && docker compose up -d --build`

**Can't access the application:**
- Make sure the container is running: `docker compose ps`
- Check that port 3072 is not blocked by a firewall
- Try accessing via `http://127.0.0.1:3072`

## Technical Notes

- The application runs on port 3072 by default
- All data (tabs, sources, preferences) is stored in your browser's local storage
- RSS feeds are fetched through a backend proxy to handle CORS restrictions
- The application automatically handles character encoding for international content

## Support

For issues or questions, please check the application logs using:
```bash
docker compose logs -f newsfeed
```
