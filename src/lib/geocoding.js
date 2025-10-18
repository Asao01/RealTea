// Geocoding utility using Nominatim (free, no API key required)

const NOMINATIM_API = "https://nominatim.openstreetmap.org/search";

// Common location name to coordinates mapping (fallback)
const KNOWN_LOCATIONS = {
  "moon": { lat: 0, lng: 0 }, // Placeholder for space locations
  "global": { lat: 20, lng: 0 },
  "world wide web": { lat: 46.2044, lng: 6.1432 }, // CERN, Switzerland
  "cape canaveral": { lat: 28.5728, lng: -80.6490 },
  "cape town": { lat: -33.9249, lng: 18.4241 },
  "berlin": { lat: 52.5200, lng: 13.4050 },
  "new york": { lat: 40.7128, lng: -74.0060 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "paris": { lat: 48.8566, lng: 2.3522 },
};

export async function geocodeLocation(locationName) {
  if (!locationName || typeof locationName !== 'string') {
    return null;
  }

  const normalized = locationName.toLowerCase().trim();
  
  // Check known locations first
  if (KNOWN_LOCATIONS[normalized]) {
    return KNOWN_LOCATIONS[normalized];
  }

  // Try to geocode using Nominatim
  try {
    const response = await fetch(
      `${NOMINATIM_API}?q=${encodeURIComponent(locationName)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'RealTea Timeline App'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Geocoding failed for: ${locationName}`);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function geocodeEvents(events) {
  const geocodedEvents = [];

  for (const event of events) {
    if (!event.location) {
      continue; // Skip events without location
    }

    // If event already has coordinates, use them
    if (event.latitude && event.longitude) {
      geocodedEvents.push(event);
      continue;
    }

    // Try to geocode the location
    const coords = await geocodeLocation(event.location);
    
    if (coords) {
      geocodedEvents.push({
        ...event,
        latitude: coords.lat,
        longitude: coords.lng,
      });
    } else {
      console.warn(`Could not geocode: ${event.location} for event: ${event.title}`);
    }

    // Rate limiting: wait 1 second between requests to respect Nominatim's usage policy
    if (events.indexOf(event) < events.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return geocodedEvents;
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'RealTea Timeline App'
        }
      }
    );
    
    if (!res.ok) {
      return "Unknown Location";
    }
    
    const data = await res.json();
    
    // Try to get the most specific location name
    const address = data.address;
    if (!address) return "Unknown Location";
    
    return address.city || 
           address.town || 
           address.village || 
           address.county || 
           address.state || 
           address.country || 
           "Unknown Location";
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return "Unknown Location";
  }
}

