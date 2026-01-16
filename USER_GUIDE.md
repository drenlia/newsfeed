# User Guide

This guide explains all features and options available in the News Feed application.

## News Feed Page

### Header

- **Language Toggle**: Click the language badge (FR/EN) in the top right to switch the interface language
- **Settings Button**: Opens the Settings page to manage tabs, sources, and preferences
- **Tab Navigation**: 
  - Click a tab to switch between different news source configurations
  - Double-click a tab name to rename it

### Subheader Controls

The subheader contains filtering and control options. Click the chevron button (▲/▼) on the right to show or hide these controls.

#### VIEW Section
- **All News**: Show all articles regardless of language
- **French**: Show only French-language articles
- **English**: Show only English-language articles

#### FILTER Section
- **Category Dropdown**: 
  - Click to open the category filter menu
  - Use the search bar inside to find specific categories
  - Select multiple categories to filter articles
  - Categories are displayed in multiple columns for easy browsing
- **Sort By**: 
  - **Date**: Sort articles by publication date (newest first)
  - **Popularity**: Sort articles by popularity score
- **Highly Rated**: Checkbox to show only articles with high popularity scores

#### REFRESH Section
- **Refresh Button**: Manually fetch the latest articles from all sources
- **Auto**: Checkbox to enable automatic refresh every 5 minutes

#### SEARCH Section
- **Search Bar**: Type keywords to search across article titles and descriptions
  - Search is case-insensitive
  - Click the × button to clear the search
- **Clear All Filters**: Reset all filters (language, categories, search, sort) to default

### News Articles

Each article card displays:
- **Thumbnail Image**: Article image if available
- **Title**: Click to open the article in a new tab
- **Source**: News outlet name
- **Description**: Article preview (truncated for long content)
- **Publication Date**: When the article was published
- **Language Badge**: FR or EN indicator
- **Popularity Rating**: Score based on social shares and engagement
- **Categories**: Topic tags (if available)

**New Articles**: Articles that haven't been seen before are highlighted with a yellow background.

**Toast Messages**: 
- Appear when articles are fetched (if enabled in Settings)
- Show success/failure status for each source
- Drag to the right to dismiss manually
- Auto-dismiss after a few seconds

## Settings Page

Access the Settings page by clicking the **Settings** button in the top right of the News Feed page.

### Tab Management

When you have multiple tabs:
- **Create Tab**: Click the "+ Create Tab" button to add a new tab
- **Switch Tabs**: Click a tab name to make it active
- **Rename Tab**: Double-click a tab name to edit it inline
- **Delete Tab**: Click the × button on a tab (cannot delete the last tab)
- **Reorder Tabs**: Drag tabs to change their order

**Note**: News articles are locally cached. When you add or remove sources, you may need to refresh the page to see updated articles.

### Toast Messages Toggle

- **Show fetch messages**: Toggle switch to enable/disable toast notifications when sources are fetched
- Setting is saved automatically and persists across sessions

### Country Filter Sidebar

- **Search Countries**: Use the search box to find specific countries
- **Select Countries**: Click country pills to filter available sources by country
- **Clear Filters**: Button appears when countries are selected to remove all country filters
- Country pills show the number of available sources in parentheses

### Manual RSS Feed Addition

1. **Enter Feed URL**: Type or paste an RSS feed URL in the input field
2. **Validate Feed**: Click "Validate & Add Feed" to check if the feed is valid
3. **Edit Feed Title**: After validation, you can edit the feed title before adding
4. **Add Feed**: Click "Add Selected" to add the validated feed to your active sources

The validation shows:
- Feed validity status
- Feed title (editable)
- Feed description
- Detected language
- Number of items found

### Source Management

#### Available Sources (Left Column)
- **Search**: Use the search bar to find sources by outlet name, city, country, or province
- **Select Sources**: 
  - Check the boxes next to sources you want to add
  - Use "Select All" / "Deselect All" to manage selections
- **Add Selected**: Button appears when sources are selected, showing the count
- **Individual Toggle**: Click the + button on any source to add it immediately
- **Active Indicator**: Sources already in your active list show a ✓ badge

#### Active Sources (Right Column)
- **View All Active Sources**: See all sources currently configured for the active tab
- **Select Sources**: 
  - Check boxes to select multiple sources
  - Use "Select All" / "Deselect All" for bulk operations
- **Remove Selected**: Button appears when sources are selected, showing the count
- **Copy URL**: Click anywhere on an active source card to copy its URL to clipboard
- **Remove Source**: Click the × button on any source to remove it

### Configuration Management

- **Export Configuration**: Download your current tab and source configuration as a JSON file
- **Import Configuration**: Upload a previously exported JSON file to restore your configuration

## Tips and Best Practices

1. **Organize with Tabs**: Create separate tabs for different topics (e.g., "Local News", "Technology", "Sports")

2. **Use Country Filters**: When searching for sources, filter by country to find region-specific news outlets

3. **Category Filtering**: Use categories to focus on specific topics across all your sources

4. **Search Efficiently**: The search bar searches across titles and descriptions, so use specific keywords

5. **Auto-Refresh**: Enable auto-refresh to keep your feed updated automatically, or disable it to save bandwidth

6. **Toast Messages**: Disable toast messages if you find them distracting, or enable them to monitor feed status

7. **Cache Awareness**: Remember that articles are cached. After adding or removing sources, refresh the page to see changes

8. **Tab Management**: Use descriptive tab names and organize them by dragging to match your workflow

9. **Manual Feeds**: You can add any valid RSS feed manually, even if it's not in the pre-configured list

10. **Source URLs**: Click on active sources in Settings to quickly copy their URLs for sharing or backup
