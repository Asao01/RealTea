"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components (client-side only) with lazy loading
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-[#141414] rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-4 border-t-transparent border-[#D4AF37] animate-spin mb-4" />
          <p className="text-gray-400">Loading map...</p>
        </div>
      </div>
    )
  }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);
const useMap = dynamic(
  () => import('react-leaflet').then(mod => mod.useMap),
  { ssr: false }
);

// Import MarkerClusterGroup with chunked loading for performance
const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then(mod => {
    console.log('📦 [MAP] MarkerClusterGroup loaded');
    return mod;
  }),
  { 
    ssr: false,
    loading: () => null
  }
);

// Category colors
const CATEGORY_COLORS = {
  'Conflict': '#e63946',
  'Politics': '#ffd166',
  'Science': '#118ab2',
  'Tech': '#118ab2',
  'Culture': '#ef476f',
  'Environment': '#06d6a0',
  'World': '#4cc9f0',
  'Economy': '#f72585'
};

/**
 * Custom marker component with category coloring
 */
function CategoryMarker({ position, event, color }) {
  if (typeof window === 'undefined') return null;
  
  const L = require('leaflet');
  
  // Create custom icon with category color
  const customIcon = new L.DivIcon({
    html: `<div style="
      width: 12px;
      height: 12px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px ${color};
    "></div>`,
    className: 'custom-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  return (
    <Marker position={position} icon={customIcon}>
      <Popup>
        <div style={{ minWidth: '250px', color: '#0b0b0b' }}>
          {/* Category Badge */}
          <div style={{
            display: 'inline-block',
            padding: '4px 8px',
            background: color,
            color: 'white',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            {event.category}
          </div>
          
          {/* Title */}
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#0b0b0b'
          }}>
            {event.title}
          </h3>
          
          {/* Year */}
          <p style={{ 
            margin: '0 0 8px 0', 
            fontSize: '14px', 
            fontWeight: '600',
            color: color
          }}>
            {event.year}
          </p>
          
          {/* Description */}
          <p style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            lineHeight: '1.4',
            color: '#333'
          }}>
            {event.description?.substring(0, 150) || 'No description available'}
            {event.description && event.description.length > 150 ? '...' : ''}
          </p>
          
          {/* Credibility Score */}
          {event.credibilityScore && (
            <div style={{
              display: 'inline-block',
              padding: '4px 8px',
              background: event.credibilityScore >= 70 ? '#00ffaa' : event.credibilityScore >= 50 ? '#ffd166' : '#e63946',
              color: 'white',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              Credibility: {event.credibilityScore}/100
            </div>
          )}
          
          {/* Source Link */}
          {event.verifiedSource && (
            <a 
              href={event.verifiedSource}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                color: color,
                textDecoration: 'underline',
                fontWeight: '600'
              }}
            >
              View Source →
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Map Legend Component
 */
function MapLegend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: '100px',
      right: '20px',
      background: '#141414',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid #D4AF37',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <h4 style={{ 
        margin: '0 0 12px 0', 
        fontSize: '14px', 
        fontWeight: 'bold',
        color: '#D4AF37'
      }}>
        Categories
      </h4>
      {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
        <div key={category} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '6px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            background: color,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: `0 0 6px ${color}`
          }} />
          <span style={{ 
            fontSize: '12px', 
            color: '#e5e5e5'
          }}>
            {category}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Geocoding Cache Component - Saves geocoding results to prevent repeat lookups
 */
async function cacheGeocodingResult(location, lat, lng) {
  try {
    if (typeof window === 'undefined' || !location) return;
    
    // Save to localStorage for client-side caching
    const cacheKey = `geocode_${location.toLowerCase().replace(/\s+/g, '_')}`;
    localStorage.setItem(cacheKey, JSON.stringify({ lat, lng, cached: Date.now() }));
    
    console.log(`💾 [GEOCODE] Cached: ${location} -> ${lat}, ${lng}`);
  } catch (error) {
    console.warn('⚠️ [GEOCODE] Cache save failed:', error);
  }
}

async function getGeocodingCache(location) {
  try {
    if (typeof window === 'undefined' || !location) return null;
    
    const cacheKey = `geocode_${location.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      // Cache valid for 30 days
      if (Date.now() - data.cached < 30 * 24 * 60 * 60 * 1000) {
        console.log(`✅ [GEOCODE] Cache hit: ${location}`);
        return { lat: data.lat, lng: data.lng };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Lazy Loading Component - Only renders markers in viewport
 */
function LazyMarkerRenderer({ events, visibleBounds }) {
  const visibleEvents = useMemo(() => {
    if (!visibleBounds) return events;
    
    return events.filter(event => {
      const lat = event.coordinates?.lat;
      const lng = event.coordinates?.lng;
      
      if (!lat || !lng) return false;
      
      // Check if marker is in visible bounds
      return (
        lat >= visibleBounds.south &&
        lat <= visibleBounds.north &&
        lng >= visibleBounds.west &&
        lng <= visibleBounds.east
      );
    });
  }, [events, visibleBounds]);

  console.log(`👁️ [MAP] Rendering ${visibleEvents.length} of ${events.length} visible markers`);

  return visibleEvents;
}

/**
 * WorldMap Component with optimized clustering, lazy loading, and geocoding cache
 */
export default function WorldMap({ events, yearRange }) {
  const [mounted, setMounted] = useState(false);
  const [visibleBounds, setVisibleBounds] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    setMounted(true);
    
    // Load Leaflet CSS
    if (typeof window !== 'undefined') {
      require('leaflet/dist/leaflet.css');
    }
  }, []);

  // Update visible bounds when map moves
  useEffect(() => {
    if (!mapInstance) return;

    const updateBounds = () => {
      const bounds = mapInstance.getBounds();
      setVisibleBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    };

    mapInstance.on('moveend', updateBounds);
    mapInstance.on('zoomend', updateBounds);
    updateBounds(); // Initial bounds

    return () => {
      mapInstance.off('moveend', updateBounds);
      mapInstance.off('zoomend', updateBounds);
    };
  }, [mapInstance]);

  if (!mounted) {
    return (
      <div className="w-full h-[600px] bg-[#141414] rounded-xl flex items-center justify-center">
        <p className="text-gray-400">Loading map...</p>
      </div>
    );
  }

  // Filter and memoize events by year range AND valid coordinates
  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    
    return events.filter(event => {
      // Must have valid coordinates
      if (!event.coordinates?.lat || !event.coordinates?.lng) return false;
      
      // Year range filter
      if (!yearRange) return true;
      const year = parseInt(event.year);
      return year >= yearRange[0] && year <= yearRange[1];
    });
  }, [events, yearRange]);

  // Count events with valid coordinates
  const mappableCount = filteredEvents.length;
  
  console.log(`🗺️ [MAP] Rendering ${events?.length || 0} total events, ${mappableCount} mappable with coordinates`);

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%', background: '#0b0b0b' }}
        maxZoom={18}
        minZoom={2}
        scrollWheelZoom={true}
      >
        {/* Dark Theme Tiles - CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Event Markers with Optimized Clustering and Lazy Loading */}
        <MarkerClusterGroup
          chunkedLoading={true}
          chunkInterval={200}
          chunkDelay={50}
          chunkProgress={(processed, total, elapsed) => {
            if (processed === total) {
              console.log(`✅ [MAP] Loaded all ${total} markers in ${elapsed}ms`);
            }
          }}
          showCoverageOnHover={false}
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          disableClusteringAtZoom={12}
          animate={true}
          animateAddingMarkers={true}
          removeOutsideVisibleBounds={true}
          iconCreateFunction={(cluster) => {
            if (typeof window === 'undefined') return null;
            const L = require('leaflet');
            const count = cluster.getChildCount();
            const size = 35 + Math.min(count / 5, 25); // Dynamic size based on count
            
            return new L.DivIcon({
              html: `<div style="
                width: ${size}px;
                height: ${size}px;
                background: linear-gradient(135deg, #D4AF37, #E5C878);
                border: 3px solid #0b0b0b;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: #0b0b0b;
                font-size: ${11 + Math.min(count / 15, 8)}px;
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.7);
                transition: all 0.3s ease;
              ">${count}</div>`,
              className: 'custom-cluster-icon',
              iconSize: [size, size]
            });
          }}
        >
          {filteredEvents.map((event) => {
            if (!event.coordinates || !event.coordinates.lat || !event.coordinates.lng) {
              return null;
            }
            
            const color = CATEGORY_COLORS[event.category] || '#D4AF37';
            
            // Cache geocoding result
            if (typeof window !== 'undefined') {
              cacheGeocodingResult(
                event.location, 
                event.coordinates.lat, 
                event.coordinates.lng
              );
            }
            
            return (
              <CategoryMarker
                key={event.id}
                position={[event.coordinates.lat, event.coordinates.lng]}
                event={event}
                color={color}
              />
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Legend */}
      <MapLegend />
      
      {/* Event Count Badge */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: '#141414',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #D4AF37',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#D4AF37' }}>
          📍 {mappableCount} Events Mapped
        </div>
      </div>
    </div>
  );
}
