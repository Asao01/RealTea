"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, limit, orderBy } from "firebase/firestore";

export default function MapView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markerCount, setMarkerCount] = useState(0);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef([]);
  const markerClusterer = useRef(null);

  // Initialize Google Map
  useEffect(() => {
    const initMap = () => {
      if (!window.google || !mapRef.current) {
        console.log('⏳ [MAP] Waiting for Google Maps API...');
        return;
      }

      console.log('🗺️ [MAP] Initializing Google Map...');

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapId: "REALTEA_DARK_MAP",
        backgroundColor: "#0d1117",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#212121" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
          { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
          { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
          { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
          { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#003f5c" }] },
          { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
        ],
      });

      mapInstance.current = map;
      console.log('✅ [MAP] Google Map initialized');
      setLoading(false);
    };

    // Check if Google Maps is loaded
    if (window.google && window.google.maps) {
      initMap();
    } else {
      // Wait for Google Maps to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, []);

  // Set up Firestore real-time listener
  useEffect(() => {
    if (!db) {
      console.error('❌ [MAP] Firestore not initialized');
      return;
    }

    console.log('🔄 [MAP] Setting up optimized real-time event listener...');

    const eventsRef = collection(db, 'events');
    
    // Optimized query: Only fetch events with coordinates
    const mapQuery = query(
      eventsRef,
      orderBy('createdAt', 'desc'),
      limit(1000) // Limit to 1000 most recent events for performance
    );
    
    const unsubscribe = onSnapshot(mapQuery, (snapshot) => {
      const freshEvents = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data?.headline || data?.title || "Untitled Event",
            description: data?.description || data?.summary || "No description available.",
            date: data?.date || data?.seendate || new Date().toISOString().split('T')[0],
            year: data?.year || (data?.date ? data.date.split('-')[0] : new Date().getFullYear().toString()),
            location: data?.location || data?.sourcecountry || "",
            category: data?.category || "World",
            imageUrl: data?.imageUrl || data?.socialimage || "",
            credibilityScore: data?.credibilityScore ?? 70,
            lat: data?.lat || data?.latitude || data?.coordinates?.lat,
            lng: data?.lng || data?.longitude || data?.coordinates?.lng,
            latitude: data?.lat || data?.latitude || data?.coordinates?.lat,
            longitude: data?.lng || data?.longitude || data?.coordinates?.lng,
            rankScore: data?.rankScore,
            isBreaking: data?.isBreaking || false,
            aiSummary: data?.aiSummary || "",
            biasLabel: data?.biasLabel || "",
            ...data
          };
        })
        .filter(event => {
          // Filter for valid coordinates
          const lat = event.lat || event.latitude || event.coordinates?.lat;
          const lng = event.lng || event.longitude || event.coordinates?.lng;
          return lat !== undefined && lng !== undefined && 
                 !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) &&
                 Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        });

      console.log(`🔄 [MAP] Live update: ${freshEvents.length} mappable events (of ${snapshot.docs.length} total)`);
      setEvents(freshEvents);
    }, (error) => {
      console.error('❌ [MAP] Real-time listener error:', error);
    });

    return () => {
      console.log('🗺️ [MAP] Cleaning up listener');
      unsubscribe();
    };
  }, []);

  // Update markers when events change (with cleanup)
  useEffect(() => {
    if (!mapInstance.current || !window.google) return;

    console.log('📍 [MAP] Updating markers...');

    // Clear existing markers
    markers.current.forEach((marker) => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markers.current = [];

    // Filter events with valid coordinates
    const eventsWithCoords = events.filter((event) => {
      const lat = event?.lat || event?.latitude || event?.coordinates?.lat;
      const lng = event?.lng || event?.longitude || event?.coordinates?.lng;
      return lat !== undefined && lng !== undefined && 
             !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) &&
             Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    });

    console.log(`📍 [MAP] Rendering ${eventsWithCoords.length} events with valid coordinates`);

    // Limit to 300 markers for better performance on mobile
    const limitedEvents = eventsWithCoords.slice(0, 300);

    // Create bounds to auto-zoom
    const bounds = new window.google.maps.LatLngBounds();
    
    // Batch marker creation for better performance
    const newMarkers = [];

    limitedEvents.forEach((event, index) => {
      const lat = parseFloat(event.lat || event.latitude || event.coordinates?.lat);
      const lng = parseFloat(event.lng || event.longitude || event.coordinates?.lng);

      // Double-check validity
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        console.warn(`⚠️ [MAP] Skipping invalid coordinates for event ${event.id}: lat=${lat}, lng=${lng}`);
        return;
      }

      // Determine pin color based on credibility
      const credibility = event.credibilityScore || event.credibility || 50;
      let fillColor;
      if (credibility >= 80) fillColor = "#10b981"; // Green
      else if (credibility >= 60) fillColor = "#fbbf24"; // Gold
      else fillColor = "#ef4444"; // Red

      // Determine pin size based on rank score
      const rankScore = event.rankScore || 50;
      const scale = 6 + (rankScore / 100) * 14; // 6-20px

      // Create marker
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstance.current,
        title: event.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: fillColor,
          fillOpacity: 0.85,
          scale: scale,
          strokeColor: "#000000",
          strokeWeight: 2,
        },
        animation: event.isBreaking ? window.google.maps.Animation.BOUNCE : null,
      });

      // Safe property access for info window
      const safeTitle = event?.title || event?.headline || "Untitled Event";
      const safeDate = event?.date || event?.year || 'Unknown';
      const safeLocation = event?.location || 'Unknown';
      const safeDescription = event?.aiSummary || event?.description || "";
      const safeCategory = event?.category || "";
      const safeBiasLabel = event?.biasLabel || "";
      const safeId = event?.id || 'unknown';
      const isBreaking = event?.isBreaking || false;

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="
            max-width: 280px;
            color: #f5f5f7;
            background: #1a1a1d;
            padding: 16px;
            border-radius: 12px;
            font-family: 'Inter', sans-serif;
          ">
            ${isBreaking ? '<div style="display:inline-block;padding:4px 8px;background:#ef4444;color:#fff;border-radius:6px;font-size:10px;font-weight:bold;margin-bottom:8px;">🔴 BREAKING</div>' : ''}
            
            <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#ffcc33;">
              ${safeTitle}
            </h3>
            
            <div style="display:flex;gap:12px;margin-bottom:8px;font-size:12px;color:#a1a1a6;">
              <span>📅 ${safeDate}</span>
              <span>📍 ${safeLocation}</span>
            </div>
            
            ${safeDescription ? `
              <p style="margin:8px 0;font-size:13px;line-height:1.5;color:#d1d1d6;">
                ${safeDescription.substring(0, 150)}...
              </p>
            ` : ''}
            
            <div style="display:flex;gap:8px;margin:12px 0 8px 0;">
              ${safeCategory ? `<span style="display:inline-block;padding:4px 8px;background:rgba(255,204,51,0.2);color:#ffcc33;border:1px solid rgba(255,204,51,0.3);border-radius:6px;font-size:10px;font-weight:600;">${safeCategory}</span>` : ''}
              ${safeBiasLabel === 'neutral' ? '<span style="display:inline-block;padding:4px 8px;background:rgba(59,130,246,0.2);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);border-radius:6px;font-size:10px;font-weight:600;">NEUTRAL</span>' : ''}
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #2a2a2d;">
              <div style="display:flex;gap:12px;font-size:11px;">
                <span style="padding:3px 6px;background:${credibility >= 80 ? 'rgba(16,185,129,0.2)' : credibility >= 60 ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'};color:${credibility >= 80 ? '#10b981' : credibility >= 60 ? '#fbbf24' : '#ef4444'};border:1px solid ${credibility >= 80 ? 'rgba(16,185,129,0.3)' : credibility >= 60 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'};border-radius:4px;font-weight:700;">
                  Score: ${credibility}
                </span>
                ${rankScore ? `<span style="padding:3px 6px;background:rgba(255,204,51,0.15);color:#ffcc33;border:1px solid rgba(255,204,51,0.25);border-radius:4px;font-weight:700;">Rank: ${rankScore.toFixed(0)}</span>` : ''}
              </div>
              <a href="/event/${safeId}" style="color:#58a6ff;font-size:12px;font-weight:600;text-decoration:none;">
                View Details →
              </a>
            </div>
          </div>
        `,
      });

      // Add click listener
      // Optimized click listener
      marker.addListener("click", () => {
        // Close other info windows to save memory
        markers.current.forEach(m => {
          if (m.infoWindow && m.infoWindow !== infoWindow) {
            m.infoWindow.close();
          }
        });
        infoWindow.open(mapInstance.current, marker);
      });

      marker.infoWindow = infoWindow;
      newMarkers.push(marker);
      bounds.extend({ lat, lng });
    });

    // Update markers array
    markers.current = newMarkers;
    setMarkerCount(newMarkers.length);

    // Auto-fit map to show all markers
    if (limitedEvents.length > 0) {
      mapInstance.current.fitBounds(bounds);
      
      // Adjust zoom if only one marker
      if (limitedEvents.length === 1) {
        mapInstance.current.setZoom(6);
      }
    }

    console.log(`✅ [MAP] ${markers.current.length} markers rendered (of ${eventsWithCoords.length} total)`);

    // Cleanup function
    return () => {
      markers.current.forEach((marker) => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      markers.current = [];
    };
  }, [events]);

  return (
    <div className="relative w-full h-screen">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 bg-[#0e0e10] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-16 w-16 rounded-full border-4 border-t-transparent border-[#ffcc33] animate-spin mb-4" />
            <p className="text-gray-400 text-lg">Loading Google Maps...</p>
            <p className="text-gray-500 text-sm mt-2">Real-time event tracking enabled</p>
          </div>
        </div>
      )}

      {/* Live update indicator */}
      {!loading && events.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 z-[1000] glass-strong rounded-lg px-4 py-2.5 flex items-center gap-3 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm font-semibold text-white">Live</span>
          </div>
          <div className="h-4 w-px bg-gray-600"></div>
          <span className="text-xs text-gray-300">
            {markerCount} pins • {events.length} events
          </span>
        </motion.div>
      )}

      {/* Performance Info (dev only) */}
      {!loading && process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-black/70 rounded px-3 py-1.5 text-xs text-gray-400">
          Memory: Optimized • Max 300 pins
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full rounded-xl shadow-2xl" />
    </div>
  );
}

