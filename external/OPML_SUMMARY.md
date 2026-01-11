# OPML Files Analysis Summary

## Repository Downloaded
- **Source**: https://github.com/plenaryapp/awesome-rss-feeds
- **Location**: `external/awesome-rss-feeds/`
- **Total OPML Files**: 25 country files + 34 topic-based files

## Cities Found in OPML Files

### Canada (10 feeds total)
**City-Specific Feeds:**
- **Toronto**: 2 feeds
  - Toronto Star
  - Toronto Sun
- **Ottawa**: 1 feed
  - Ottawa Citizen
- **Vancouver**: 1 feed
  - The Province

**National Feeds (not city-specific):**
- CBC | Top Stories News
- CTVNews.ca - Top Stories
- Global News
- Financial Post
- National Post
- LaPresse.ca

### United States (10 feeds total)
**City-Specific Feeds:**
- **New York**: 1 feed
  - NYT > Top Stories
- **Los Angeles**: 1 feed
  - World & Nation (LA Times)
- **Washington**: 1 feed
  - World (Washington Post)

**National Feeds:**
- FOX News
- CNN.com
- Yahoo News
- CNBC
- Politico Playbook
- WSJ.com World News
- HuffPost World News

### Other Countries
- **Australia**: 16 feeds (mostly national, some city-specific like Sydney, Melbourne, Brisbane, Perth, Canberra, Hobart)
- **United Kingdom**: 5 feeds (mostly national)
- **India**: 36 feeds (mostly national)
- **France**: 11 feeds
- **Germany**: 5 feeds
- And 20+ other countries

## Key Findings

1. **Limited City Coverage**: The OPML files contain mostly **national-level feeds**, not city-specific ones
2. **Canada has good coverage**: Found feeds for Toronto, Ottawa, and Vancouver
3. **US has limited city coverage**: Only found feeds for major cities (NY, LA, Washington)
4. **Australia has city-specific feeds**: Sydney, Melbourne, Brisbane, Perth, Canberra, Hobart

## Recommendations

1. **Use OPML files as a starting point** but expect to manually add more city-specific feeds
2. **Focus on national feeds** from these OPML files - they're more reliable
3. **City-specific feeds** will need to be curated manually or discovered through other means
4. **The "without_category" versions** might have different feeds - worth checking

## Next Steps

1. Extract all feeds from OPML files and add to `cityNewsOutlets.json`
2. Manually identify city-specific feeds from national feeds
3. Use pattern-based discovery for cities not in OPML files
4. Consider checking the "without_category" OPML files for additional feeds

## Files Generated

- `external/opml-analysis.json` - Full analysis with all feeds
- `scripts/parseOPMLCities.js` - Script to parse and analyze OPML files
