// City autocomplete service using OpenStreetMap Nominatim (free, no API key needed)
export const searchCities = async (query) => {
  if (!query || query.length < 2) {
    return []
  }

  try {
    // Use Nominatim API for city search
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'NewsFeed App' // Required by Nominatim
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch cities')
    }

    const data = await response.json()
    
    // Format results
    return data
      .filter(item => {
        // Filter for cities/towns/villages
        const type = item.type || ''
        const classType = item.class || ''
        return (
          classType === 'place' || 
          type === 'city' || 
          type === 'town' || 
          type === 'village' ||
          type === 'administrative'
        )
      })
      .map(item => {
        const address = item.address || {}
        const cityName = item.name || ''
        const state = address.state || address.region || ''
        const country = address.country || ''
        
        // Build display name
        let displayName = cityName
        if (state) displayName += `, ${state}`
        if (country) displayName += `, ${country}`
        
        return {
          id: item.place_id,
          name: cityName,
          displayName: displayName,
          state: state,
          country: country,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          fullAddress: item.display_name
        }
      })
      .filter((item, index, self) => 
        // Remove duplicates based on name and country
        index === self.findIndex(t => 
          t.name === item.name && t.country === item.country
        )
      )
  } catch (error) {
    console.error('Error searching cities:', error)
    return []
  }
}

// Get city details by name (for default cities)
export const getCityDetails = async (cityName, country = '') => {
  try {
    const query = country ? `${cityName}, ${country}` : cityName
    const results = await searchCities(query)
    return results[0] || null
  } catch (error) {
    console.error('Error getting city details:', error)
    return null
  }
}
