// Script to analyze OPML files and extract city information
const fs = require('fs')
const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')

// Parse OPML file
function parseOPML(filePath) {
  const opmlText = fs.readFileSync(filePath, 'utf8')
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(opmlText, 'text/xml')
  
  const feeds = []
  const outlines = xmlDoc.getElementsByTagName('outline')
  
  for (let i = 0; i < outlines.length; i++) {
    const outline = outlines[i]
    const xmlUrl = outline.getAttribute('xmlUrl')
    const title = outline.getAttribute('title') || outline.getAttribute('text') || ''
    const category = outline.getAttribute('category') || ''
    
    if (xmlUrl) {
      feeds.push({
        title: title.trim(),
        url: xmlUrl.trim(),
        category: category.trim()
      })
    }
  }
  
  return feeds
}

// Extract potential city names from feeds
function extractCities(feeds) {
  const cityPatterns = [
    /(Toronto|Montreal|Vancouver|Calgary|Ottawa|Edmonton|Winnipeg|Quebec|Hamilton|Kitchener)/gi,
    /(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose)/gi,
    /([A-Z][a-z]+ (?:City|Town|Bay|Beach|Springs|Falls|Harbor|Harbour))/gi,
  ]
  
  const cities = new Set()
  
  feeds.forEach(feed => {
    const text = `${feed.title} ${feed.url} ${feed.category}`.toLowerCase()
    
    // Check for common Canadian cities
    const canadianCities = ['toronto', 'montreal', 'vancouver', 'calgary', 'ottawa', 'edmonton', 
                           'winnipeg', 'quebec', 'hamilton', 'kitchener', 'london', 'halifax',
                           'victoria', 'saskatoon', 'regina', 'sherbrooke', 'kelowna', 'barrie']
    
    canadianCities.forEach(city => {
      if (text.includes(city)) {
        cities.add(city.charAt(0).toUpperCase() + city.slice(1))
      }
    })
    
    // Check for US cities
    const usCities = ['new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
                     'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
                     'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis',
                     'seattle', 'denver', 'washington', 'boston', 'el paso', 'detroit', 'nashville']
    
    usCities.forEach(city => {
      if (text.includes(city)) {
        cities.add(city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      }
    })
  })
  
  return Array.from(cities).sort()
}

// Main analysis
function analyzeOPMLFiles() {
  const opmlDir = path.join(__dirname, '../external/awesome-rss-feeds/countries/with_category')
  const files = fs.readdirSync(opmlDir).filter(f => f.endsWith('.opml'))
  
  console.log('Analyzing OPML files...\n')
  
  const results = {}
  
  files.forEach(file => {
    const filePath = path.join(opmlDir, file)
    const country = file.replace('.opml', '')
    
    try {
      const feeds = parseOPML(filePath)
      const cities = extractCities(feeds)
      
      results[country] = {
        totalFeeds: feeds.length,
        cities: cities,
        sampleFeeds: feeds.slice(0, 10).map(f => f.title)
      }
      
      console.log(`\n${country}:`)
      console.log(`  Total feeds: ${feeds.length}`)
      console.log(`  Cities found: ${cities.length > 0 ? cities.join(', ') : 'None detected'}`)
    } catch (error) {
      console.error(`Error parsing ${file}:`, error.message)
    }
  })
  
  // Save results
  fs.writeFileSync(
    path.join(__dirname, '../external/opml-analysis.json'),
    JSON.stringify(results, null, 2)
  )
  
  console.log('\n\nAnalysis complete! Results saved to external/opml-analysis.json')
}

analyzeOPMLFiles()
