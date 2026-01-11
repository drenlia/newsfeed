// Simple Node.js script to parse OPML files and extract city information
// No external dependencies - uses built-in Node.js modules

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function parseOPML(filePath) {
  const opmlText = fs.readFileSync(filePath, 'utf8')
  const feeds = []
  
  // Extract all outline elements with xmlUrl - handle both single and multi-line
  // Pattern: <outline ... xmlUrl="..." ... title="..." ... />
  const lines = opmlText.split('\n')
  
  lines.forEach(line => {
    if (line.includes('xmlUrl=')) {
      // Extract xmlUrl
      const urlMatch = line.match(/xmlUrl="([^"]+)"/)
      if (urlMatch) {
        const url = urlMatch[1]
        
        // Extract title (can be in title= or text= attribute)
        const titleMatch = line.match(/title="([^"]*)"/) || line.match(/text="([^"]*)"/)
        const title = titleMatch ? titleMatch[1] : ''
        
        // Extract description if available
        const descMatch = line.match(/description="([^"]*)"/)
        const description = descMatch ? descMatch[1] : ''
        
        if (url) {
          feeds.push({
            title: title.trim(),
            url: url.trim(),
            description: description.trim()
          })
        }
      }
    }
  })
  
  return feeds
}

function extractCityInfo(feeds) {
  const cityFeeds = {}
  
  // Common city patterns
  const cityPatterns = {
    // Canadian cities
    'Toronto': ['toronto', 'thestar', 'torontosun', 'cp24'],
    'Montreal': ['montreal', 'montrealgazette', 'radio-canada'],
    'Vancouver': ['vancouver', 'vancouversun', 'theprovince'],
    'Calgary': ['calgary', 'calgaryherald'],
    'Ottawa': ['ottawa', 'ottawacitizen'],
    'Edmonton': ['edmonton', 'edmontonjournal'],
    'Winnipeg': ['winnipeg', 'winnipegfreepress'],
    'Quebec': ['quebec', 'quebec-city'],
    'Hamilton': ['hamilton'],
    'Halifax': ['halifax'],
    'Victoria': ['victoria', 'timescolonist'],
    
    // US cities
    'New York': ['new york', 'nytimes', 'nydailynews', 'nypost', 'nyc'],
    'Los Angeles': ['los angeles', 'latimes', 'dailynews', 'ktla', 'la times'],
    'Chicago': ['chicago', 'chicagotribune', 'suntimes'],
    'Houston': ['houston', 'houstonchronicle'],
    'Phoenix': ['phoenix', 'azcentral'],
    'Philadelphia': ['philadelphia', 'philly', 'inquirer'],
    'San Antonio': ['san antonio', 'express-news'],
    'San Diego': ['san diego', 'union-tribune'],
    'Dallas': ['dallas', 'dallasnews'],
    'San Jose': ['san jose', 'mercurynews'],
    'Austin': ['austin', 'statesman'],
    'Seattle': ['seattle', 'seattletimes'],
    'Boston': ['boston', 'bostonglobe'],
    'Washington': ['washington', 'washingtonpost', 'dc'],
    'Miami': ['miami', 'miamiherald'],
    'Atlanta': ['atlanta', 'ajc'],
    'Detroit': ['detroit', 'freep'],
    'Denver': ['denver', 'denverpost'],
  }
  
  feeds.forEach(feed => {
    const searchText = `${feed.title} ${feed.url}`.toLowerCase()
    
    for (const [city, patterns] of Object.entries(cityPatterns)) {
      if (patterns.some(pattern => searchText.includes(pattern))) {
        if (!cityFeeds[city]) {
          cityFeeds[city] = []
        }
        cityFeeds[city].push(feed)
      }
    }
  })
  
  return cityFeeds
}

function analyzeAllOPMLFiles() {
  const opmlDir = path.join(__dirname, '../external/awesome-rss-feeds/countries/with_category')
  const files = fs.readdirSync(opmlDir).filter(f => f.endsWith('.opml'))
  
  console.log('='.repeat(60))
  console.log('OPML Files Analysis - City-Specific Feeds')
  console.log('='.repeat(60))
  console.log(`\nFound ${files.length} country OPML files\n`)
  
  const allResults = {}
  
  files.forEach(file => {
    const filePath = path.join(opmlDir, file)
    const country = file.replace('.opml', '')
    
    try {
      const feeds = parseOPML(filePath)
      const cityFeeds = extractCityInfo(feeds)
      
      allResults[country] = {
        totalFeeds: feeds.length,
        cities: Object.keys(cityFeeds),
        cityFeeds: cityFeeds,
        allFeeds: feeds
      }
      
      console.log(`\n${country}:`)
      console.log(`  Total feeds: ${feeds.length}`)
      if (Object.keys(cityFeeds).length > 0) {
        console.log(`  Cities with feeds: ${Object.keys(cityFeeds).length}`)
        Object.entries(cityFeeds).forEach(([city, cityFeedList]) => {
          console.log(`    - ${city}: ${cityFeedList.length} feeds`)
        })
      } else {
        console.log(`  No city-specific feeds detected`)
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`)
    }
  })
  
  // Save detailed results
  const outputPath = path.join(__dirname, '../external/opml-analysis.json')
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2))
  
  console.log('\n' + '='.repeat(60))
  console.log(`\nDetailed analysis saved to: ${outputPath}`)
  console.log('\nSummary by city:')
  console.log('='.repeat(60))
  
  // Aggregate all cities
  const allCities = {}
  Object.values(allResults).forEach(result => {
    Object.entries(result.cityFeeds || {}).forEach(([city, feeds]) => {
      if (!allCities[city]) {
        allCities[city] = []
      }
      allCities[city].push(...feeds)
    })
  })
  
  Object.entries(allCities)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([city, feeds]) => {
      console.log(`${city}: ${feeds.length} feeds`)
    })
}

// Run analysis
analyzeAllOPMLFiles()
