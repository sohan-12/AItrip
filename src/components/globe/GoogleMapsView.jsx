import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, MapPin, Layers, Compass, ExternalLink, Navigation, Target } from 'lucide-react';
import L from 'leaflet';

/**
 * GoogleMapsView
 * 
 * Supports both Official Google Maps Platform Satellite/Hybrid View
 * and an Instant Zero-Config Leaflet Satellite Fallback with Target Goal Pinning.
 */
export function GoogleMapsView({
  selectedLocation,
  curatedCities = [],
  onSelectCity,
  currentLevel = 'world',
}) {
  const mapContainerRef = useRef(null);
  const leafletContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const goalMarkerRef = useRef(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // 1. Official Google Maps Platform Loader
  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setApiKeyMissing(true);
      return;
    }

    setApiKeyMissing(false);

    if (!window.google?.maps) {
      const existingScript = document.getElementById('google-maps-js-sdk');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-maps-js-sdk';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => initGoogleMap();
        script.onerror = () => setApiKeyMissing(true);
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', initGoogleMap);
      }
    } else {
      initGoogleMap();
    }

    function initGoogleMap() {
      if (!mapContainerRef.current || !window.google?.maps) return;

      const defaultCenter = selectedLocation
        ? {
            lat: Number(selectedLocation.latitude ?? selectedLocation.lat),
            lng: Number(selectedLocation.longitude ?? selectedLocation.lng),
          }
        : { lat: 20.0, lng: 0.0 };

      const defaultZoom = currentLevel === 'world' ? 2.5 : currentLevel === 'country' ? 5 : 13;

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        mapTypeId: window.google.maps.MapTypeId.HYBRID,
        tilt: 45,
        heading: 0,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: false,
        backgroundColor: '#000000',
      });

      mapInstanceRef.current = map;
      setIsMapLoaded(true);

      renderGoogleMarkers(map);
      updateGoogleGoalMarker(map, selectedLocation);
    }

    return () => {
      clearGoogleMarkers();
    };
  }, [apiKey]);

  // Synchronize Google Maps camera and Goal Marker when selectedLocation changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation || apiKeyMissing) return;

    const lat = Number(selectedLocation.latitude ?? selectedLocation.lat);
    const lng = Number(selectedLocation.longitude ?? selectedLocation.lng);

    if (isNaN(lat) || isNaN(lng)) return;

    const target = { lat, lng };
    mapInstanceRef.current.panTo(target);

    let targetZoom = 12;
    if (selectedLocation.type === 'country') targetZoom = 5;
    else if (selectedLocation.type === 'region') targetZoom = 8;
    else if (selectedLocation.type === 'ocean') targetZoom = 4;
    else if (selectedLocation.type === 'landmark' || selectedLocation.type === 'mountain') targetZoom = 15;

    mapInstanceRef.current.setZoom(targetZoom);
    updateGoogleGoalMarker(mapInstanceRef.current, selectedLocation);
  }, [selectedLocation, apiKeyMissing]);

  function clearGoogleMarkers() {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (goalMarkerRef.current) {
      goalMarkerRef.current.setMap(null);
      goalMarkerRef.current = null;
    }
  }

  function renderGoogleMarkers(map) {
    clearGoogleMarkers();
    if (!window.google?.maps) return;

    curatedCities.slice(0, 20).forEach((city) => {
      const marker = new window.google.maps.Marker({
        position: { lat: city.lat, lng: city.lng },
        map,
        title: city.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#06b6d4',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      marker.addListener('click', () => {
        if (onSelectCity) onSelectCity(city);
      });

      markersRef.current.push(marker);
    });
  }

  function updateGoogleGoalMarker(map, location) {
    if (!window.google?.maps || !location) return;
    const lat = Number(location.latitude ?? location.lat);
    const lng = Number(location.longitude ?? location.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    if (goalMarkerRef.current) {
      goalMarkerRef.current.setMap(null);
    }

    const goalMarker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      title: `GOAL DESTINATION: ${location.name}`,
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 7,
        fillColor: '#f43f5e',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px; color: #0f172a;">
          <div style="font-size: 10px; font-weight: bold; color: #f43f5e; text-transform: uppercase;">
            🎯 TARGET GOAL DESTINATION
          </div>
          <div style="font-size: 14px; font-weight: 800; margin: 2px 0;">
            ${location.name}
          </div>
          <div style="font-size: 11px; color: #64748b;">
            ${location.country || 'Global'} • ${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E
          </div>
        </div>
      `,
    });

    infoWindow.open(map, goalMarker);
    goalMarkerRef.current = goalMarker;
  }

  // 2. Leaflet Satellite Fallback (Instant 0ms, Zero API Key needed)
  useEffect(() => {
    if (!apiKeyMissing || !leafletContainerRef.current) return;

    const lat = selectedLocation ? Number(selectedLocation.latitude ?? selectedLocation.lat) : 20.0;
    const lng = selectedLocation ? Number(selectedLocation.longitude ?? selectedLocation.lng) : 78.0;
    const initialCenter = [isNaN(lat) ? 20.0 : lat, isNaN(lng) ? 78.0 : lng];

    if (!leafletInstanceRef.current) {
      const map = L.map(leafletContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(initialCenter, 13);

      // Esri World Imagery (Satellite)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      ).addTo(map);

      // CartoDB labels overlay for streets and place names
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        { maxZoom: 18, subdomains: 'abcd' }
      ).addTo(map);

      leafletInstanceRef.current = map;
    }

    const map = leafletInstanceRef.current;
    map.setView(initialCenter, 13);

    // Goal Marker in Leaflet
    const goalIcon = L.divIcon({
      className: 'leaflet-goal-pin',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #f43f5e;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 14px;
            height: 14px;
            background: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });

    const marker = L.marker(initialCenter, { icon: goalIcon }).addTo(map);
    if (selectedLocation) {
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <div style="font-size: 10px; color: #f43f5e; font-weight: bold;">🎯 TARGET GOAL</div>
          <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${selectedLocation.name}</div>
          <div style="font-size: 11px; color: #64748b;">${selectedLocation.country || 'Global'}</div>
        </div>
      `).openPopup();
    }
  }, [apiKeyMissing, selectedLocation]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Official Google Maps Container */}
      {!apiKeyMissing && <div ref={mapContainerRef} className="w-full h-full" />}

      {/* Instant Zero-Key Interactive Satellite Fallback */}
      {apiKeyMissing && (
        <div className="w-full h-full relative">
          <div ref={leafletContainerRef} className="w-full h-full" />
          {/* Top Banner explaining Google Maps API key */}
          <div className="absolute top-4 left-4 right-4 z-[500] max-w-lg mx-auto bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                <strong className="text-white">Satellite View Active:</strong> Pointing to{' '}
                <span className="text-cyan-300 font-bold">{selectedLocation?.name || 'Goal Destination'}</span>.
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Set <code className="text-cyan-400">VITE_GOOGLE_MAPS_API_KEY</code> for Google 3D
            </span>
          </div>
        </div>
      )}

      {/* Bottom Attribution */}
      <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded bg-black/80 text-[10px] text-slate-400 font-mono border border-white/10 pointer-events-none">
        {!apiKeyMissing ? 'Powered by Google Maps Platform' : 'Interactive Satellite & Street Hybrid Engine'}
      </div>
    </div>
  );
}
