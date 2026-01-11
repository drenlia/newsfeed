// Extract all feeds from OPML files and save to cityNewsOutlets.json
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Country code mapping
const COUNTRY_CODES = {
  'Australia': 'AU',
  'Bangladesh': 'BD',
  'Brazil': 'BR',
  'Canada': 'CA',
  'France': 'FR',
  'Germany': 'DE',
  'Hong Kong SAR China': 'HK',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran': 'IR',
  'Ireland': 'IE',
  'Italy': 'IT',
  'Japan': 'JP',
  'Mexico': 'MX',
  'Myanmar (Burma)': 'MM',
  'Nigeria': 'NG',
  'Pakistan': 'PK',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Russia': 'RU',
  'South Africa': 'ZA',
  'Spain': 'ES',
  'Ukraine': 'UA',
  'United Kingdom': 'GB',
  'United States': 'US'
}

// City detection patterns
const CITY_PATTERNS = {
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
  
  // Australian cities
  'Sydney': ['sydney', 'smh', 'dailytelegraph'],
  'Melbourne': ['melbourne', 'theage', 'heraldsun'],
  'Brisbane': ['brisbane', 'couriermail', 'brisbanetimes'],
  'Perth': ['perth', 'perthnow'],
  'Canberra': ['canberra', 'canberratimes'],
  'Hobart': ['hobart', 'mercury'],
  
  // UK cities
  'London': ['london', 'telegraph', 'guardian', 'times'],
  'Manchester': ['manchester'],
  'Birmingham': ['birmingham'],
  'Edinburgh': ['edinburgh'],
  'Glasgow': ['glasgow'],
  
  // French cities
  'Paris': ['paris', 'parisstaronline'],
  
  // Indian cities
  'Mumbai': ['mumbai', 'timesofindia'],
  'Delhi': ['delhi', 'hindu'],
  'Bangalore': ['bangalore', 'bengaluru'],
  'Kolkata': ['kolkata', 'calcutta'],
  'Chennai': ['chennai', 'madras'],
  
  // Other
  'Hong Kong': ['hong kong', 'hongkong'],
  'Tokyo': ['tokyo'],
  'Mexico City': ['mexico city', 'mexicocity'],
  'São Paulo': ['são paulo', 'saopaulo', 'folha'],
  'Berlin': ['berlin'],
  'Madrid': ['madrid'],
  'Rome': ['rome'],
  'Moscow': ['moscow'],
}

// Detect language from feed
function detectLanguage(title, url, description) {
  const text = `${title} ${url} ${description}`.toLowerCase()
  if (text.includes('français') || text.includes('french') || text.includes('.fr/') || 
      text.includes('le ') || text.includes('la ') || text.includes('de ')) {
    return 'fr'
  }
  if (text.includes('español') || text.includes('spanish') || text.includes('.es/')) {
    return 'es'
  }
  if (text.includes('deutsch') || text.includes('german') || text.includes('.de/')) {
    return 'de'
  }
  if (text.includes('italiano') || text.includes('italian') || text.includes('.it/')) {
    return 'it'
  }
  if (text.includes('português') || text.includes('portuguese') || text.includes('.br/')) {
    return 'pt'
  }
  if (text.includes('中文') || text.includes('chinese') || text.includes('.cn/')) {
    return 'zh'
  }
  if (text.includes('日本語') || text.includes('japanese') || text.includes('.jp/')) {
    return 'ja'
  }
  return 'en' // Default
}

// Detect outlet type
function detectType(title, category) {
  const text = `${title} ${category}`.toLowerCase()
  if (text.includes('tv') || text.includes('television') || text.includes('broadcast') || 
      text.includes('news channel') || text.includes('cbc') || text.includes('ctv')) {
    return 'broadcast'
  }
  if (text.includes('radio')) {
    return 'radio'
  }
  if (text.includes('newspaper') || text.includes('times') || text.includes('herald') || 
      text.includes('gazette') || text.includes('journal') || text.includes('post') ||
      text.includes('star') || text.includes('sun') || text.includes('tribune') ||
      text.includes('citizen') || text.includes('mail') || text.includes('express')) {
    return 'newspaper'
  }
  return 'online'
}

// Detect city from feed
function detectCity(title, url, description) {
  const searchText = `${title} ${url} ${description}`.toLowerCase()
  
  for (const [city, patterns] of Object.entries(CITY_PATTERNS)) {
    if (patterns.some(pattern => searchText.includes(pattern))) {
      return city
    }
  }
  
  return '' // No city detected - national/international feed
}

// Parse OPML file
function parseOPML(filePath) {
  const opmlText = fs.readFileSync(filePath, 'utf8')
  const feeds = []
  const lines = opmlText.split('\n')
  
  lines.forEach(line => {
    if (line.includes('xmlUrl=')) {
      const urlMatch = line.match(/xmlUrl="([^"]+)"/)
      if (urlMatch) {
        const url = urlMatch[1]
        const titleMatch = line.match(/title="([^"]*)"/) || line.match(/text="([^"]*)"/)
        const title = titleMatch ? titleMatch[1] : ''
        const descMatch = line.match(/description="([^"]*)"/)
        const description = descMatch ? descMatch[1] : ''
        
        if (url && title) {
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

// Main extraction function
function extractAllFeeds() {
  const opmlDir = path.join(__dirname, '../external/awesome-rss-feeds/countries/with_category')
  const files = fs.readdirSync(opmlDir).filter(f => f.endsWith('.opml'))
  
  console.log(`Processing ${files.length} OPML files...\n`)
  
  const database = {
    version: '2.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    cities: {}
  }
  
  files.forEach(file => {
    const filePath = path.join(opmlDir, file)
    const countryName = file.replace('.opml', '')
    const countryCode = COUNTRY_CODES[countryName] || 'XX'
    
    try {
      const feeds = parseOPML(filePath)
      console.log(`${countryName}: ${feeds.length} feeds`)
      
      feeds.forEach(feed => {
        const city = detectCity(feed.title, feed.url, feed.description)
        const language = detectLanguage(feed.title, feed.url, feed.description)
        const type = detectType(feed.title, feed.description)
        
        // Use city name as key, or country name if no city
        const cityKey = city || countryName
        
        if (!database.cities[cityKey]) {
          database.cities[cityKey] = {
            country: countryCode,
            province: '', // Can be filled in later
            outlets: []
          }
        }
        
        // Check if this feed already exists (avoid duplicates)
        const exists = database.cities[cityKey].outlets.some(
          o => o.url === feed.url || o.name === feed.title
        )
        
        if (!exists) {
          database.cities[cityKey].outlets.push({
            name: feed.title,
            url: feed.url,
            language: language,
            type: type
          })
        }
      })
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message)
    }
  })
  
  // Sort cities alphabetically
  const sortedCities = {}
  Object.keys(database.cities).sort().forEach(key => {
    sortedCities[key] = database.cities[key]
  })
  database.cities = sortedCities
  
  // Save to JSON file
  const outputPath = path.join(__dirname, '../src/data/cityNewsOutlets.json')
  fs.writeFileSync(outputPath, JSON.stringify(database, null, 2))
  
  console.log('\n' + '='.repeat(60))
  console.log('Extraction Complete!')
  console.log('='.repeat(60))
  console.log(`Total cities/regions: ${Object.keys(database.cities).length}`)
  
  let totalFeeds = 0
  Object.values(database.cities).forEach(city => {
    totalFeeds += city.outlets.length
  })
  console.log(`Total feeds: ${totalFeeds}`)
  
  console.log(`\nSaved to: ${outputPath}`)
  
  // Show some stats
  console.log('\nTop cities by feed count:')
  Object.entries(database.cities)
    .sort((a, b) => b[1].outlets.length - a[1].outlets.length)
    .slice(0, 10)
    .forEach(([city, data]) => {
      console.log(`  ${city}: ${data.outlets.length} feeds`)
    })
}

// Run extraction
extractAllFeeds()
