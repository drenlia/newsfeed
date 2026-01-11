# OPML File Sources for RSS Feeds

This document lists publicly available OPML files that contain large collections of RSS feeds, which can be parsed and used to populate the `cityNewsOutlets.json` database.

## Large OPML Collections

### 1. Awesome RSS Feeds (GitHub)
- **Repository**: https://github.com/plenaryapp/awesome-rss-feeds
- **Description**: Curated list of RSS feeds organized by country and category
- **Contains**: OPML files for different countries
- **How to use**: Download OPML files from the repository and parse them

### 2. MoreRSS
- **URL**: https://morerss.com/opml_en.html
- **Description**: Extensive collection of English RSS feeds
- **Contains**: Large OPML file with hundreds/thousands of feeds
- **How to use**: Download the OPML file directly from the website

### 3. Casey's Curated News Feeds
- **URL**: https://www.caseywatts.com/feeds
- **Description**: Multiple OPML files categorized by topic
- **Contains**: News feeds, tech feeds, journalism feeds
- **Categories**: Baltimore Journalism, News, Tech News, etc.

### 4. Marshall Kirkpatrick's OPML Files
- **URL**: https://marshallk.com/five-useful-opml-files
- **Description**: Five OPML files for different categories
- **Contains**: Political Audio, Vlogs, Non-Profit Tech

### 5. Claudio Rimann's RSS Feeds
- **URL**: https://claudiorimann.com/a-bunch-of-rss-feeds-opml/
- **Description**: Personal collection of RSS feeds
- **Contains**: Web design, WordPress, design, arts, photography

## How to Use These OPML Files

1. **Download the OPML file** from one of the sources above
2. **Use the OPML parser utility** (`src/utils/opmlParser.js`) to extract feeds
3. **Filter feeds by city** using the conversion utility
4. **Manually review and add** to `src/data/cityNewsOutlets.json`

## Example Usage

```javascript
import { fetchAndParseOPML, convertOPMLFeedsToOutlets } from './utils/opmlParser'

// Fetch an OPML file
const feeds = await fetchAndParseOPML('https://example.com/feeds.opml')

// Convert to outlets format for a specific city
const torontoOutlets = convertOPMLFeedsToOutlets(feeds, 'Toronto', 'CA')

// Review and add to cityNewsOutlets.json
```

## Notes

- OPML files may contain feeds that are no longer active
- Always validate RSS feed URLs before adding to the database
- Some feeds may not be city-specific and need manual filtering
- Consider the language and type of each feed when organizing

## Contributing

If you find additional large OPML collections, please add them to this list!
