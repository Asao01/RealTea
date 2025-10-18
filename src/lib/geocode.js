/**
 * Geocoding Helper with Caching
 * Converts location strings to lat/lng coordinates
 */

// In-memory cache for geocoded locations
const geocodeCache = new Map();

/**
 * Geocode a location using OpenStreetMap Nominatim (free, no API key needed)
 * @param {string} location - Location string (e.g., "Paris, France")
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodeLocation(location) {
  if (!location || location === 'Unknown' || location === 'Global' || location === 'Multiple Locations') {
    return null;
  }

  // Check cache first
  const cacheKey = location.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    console.log(`📍 [GEOCODE] Cache hit: ${location}`);
    return geocodeCache.get(cacheKey);
  }

  console.log(`🌍 [GEOCODE] Looking up: ${location}`);

  try {
    // Use Nominatim (OpenStreetMap) - free, no API key required
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'RealTea-Timeline/1.0' // Nominatim requires user agent
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };

      // Cache the result
      geocodeCache.set(cacheKey, coords);
      console.log(`✅ [GEOCODE] Found: ${location} → ${coords.lat}, ${coords.lng}`);

      // Small delay to respect Nominatim rate limits (1 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1100));

      return coords;
    } else {
      console.warn(`⚠️ [GEOCODE] No results for: ${location}`);
      geocodeCache.set(cacheKey, null);
      return null;
    }
  } catch (error) {
    console.error(`❌ [GEOCODE] Error for ${location}:`, error.message);
    return null;
  }
}

/**
 * Batch geocode multiple locations
 * @param {Array<string>} locations - Array of location strings
 * @returns {Promise<Map>} Map of location → {lat, lng}
 */
export async function geocodeBatch(locations) {
  const results = new Map();
  
  console.log(`🗺️ [GEOCODE] Batch geocoding ${locations.length} locations...`);

  for (const location of locations) {
    const coords = await geocodeLocation(location);
    if (coords) {
      results.set(location, coords);
    }
  }

  console.log(`✅ [GEOCODE] Batch complete: ${results.size}/${locations.length} successful`);
  return results;
}

/**
 * Get cache statistics
 */
export function getGeocodeCacheStats() {
  return {
    size: geocodeCache.size,
    keys: Array.from(geocodeCache.keys())
  };
}

/**
 * Clear geocode cache (for testing)
 */
export function clearGeocodeCache() {
  geocodeCache.clear();
  console.log('🗑️ [GEOCODE] Cache cleared');
}

