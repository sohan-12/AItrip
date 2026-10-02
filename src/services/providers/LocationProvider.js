/**
 * LocationProvider Abstraction Layer
 * Supports GoogleLocationProvider, GeographicDatasetProvider, and NominatimLocationProvider.
 */

import { GeographicDataProvider } from './GeographicDataProvider.js';
import { COUNTRIES, CITIES, ATTRACTIONS } from '../../components/globe/globeData.js';

export class BaseLocationProvider {
  async search(query) {
    throw new Error('search(query) must be implemented by subclass');
  }

  async resolve(query) {
    throw new Error('resolve(query) must be implemented by subclass');
  }
}

/**
 * GoogleLocationProvider
 * Interfaces with Google Maps Geocoding and Places API
 */
export class GoogleLocationProvider extends BaseLocationProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  }

  isAvailable() {
    return Boolean(this.apiKey && this.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY');
  }

  async search(query) {
    if (!this.isAvailable()) return [];

    try {
      // If Google Maps JS SDK is already loaded in browser window
      if (window.google?.maps?.places) {
        const autocompleteService = new window.google.maps.places.AutocompleteService();
        return new Promise((resolve) => {
          autocompleteService.getPlacePredictions(
            { input: query },
            async (predictions, status) => {
              if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
                return resolve([]);
              }

              const results = [];
              const geocoder = new window.google.maps.Geocoder();

              for (const p of predictions.slice(0, 5)) {
                try {
                  const geoRes = await new Promise((r) =>
                    geocoder.geocode({ placeId: p.place_id }, (res, stat) => {
                      r(stat === 'OK' && res?.[0] ? res[0] : null);
                    })
                  );

                  if (geoRes) {
                    const lat = geoRes.geometry.location.lat();
                    const lng = geoRes.geometry.location.lng();
                    let country = 'World';
                    let region = '';

                    geoRes.address_components?.forEach((comp) => {
                      if (comp.types.includes('country')) country = comp.long_name;
                      if (comp.types.includes('administrative_area_level_1')) region = comp.long_name;
                    });

                    results.push({
                      id: `google-${p.place_id}`,
                      name: p.structured_formatting?.main_text || p.description.split(',')[0],
                      formattedName: p.description,
                      country,
                      region,
                      latitude: lat,
                      longitude: lng,
                      type: p.types?.[0] || 'city',
                      source: 'google',
                      curated: false,
                      providerId: p.place_id,
                    });
                  }
                } catch {
                  // Continue gracefully
                }
              }
              resolve(results);
            }
          );
        });
      }

      // If backend Google geocoding endpoint is configured
      const res = await fetch(`http://127.0.0.1:8000/api/locations/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch (err) {
      console.warn('GoogleLocationProvider search error, falling back:', err);
    }
    return [];
  }
}

/**
 * GeographicDatasetLocationProvider
 * Handles curated destinations and natural physical geographic entities (Oceans, Seas, Mountains, Deserts)
 */
export class GeographicDatasetLocationProvider extends BaseLocationProvider {
  async search(query) {
    if (!query) return [];
    const q = query.toLowerCase().trim();

    // 1. Natural features & global entities
    const naturalMatches = GeographicDataProvider.search(query);

    // 2. Curated Countries
    const countryMatches = COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    ).map((c) => ({
      id: c.id,
      name: c.name,
      formattedName: `${c.name} (${c.flag || '🌍'})`,
      country: c.name,
      region: 'Country',
      latitude: c.lat,
      longitude: c.lng,
      type: 'country',
      source: 'curated',
      curated: true,
      zoomLevel: 'country',
      cameraDistance: 5.1,
    }));

    // 3. Curated Cities
    const cityMatches = CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q)
    ).map((c) => ({
      id: c.id,
      name: c.name,
      formattedName: `${c.name}, ${c.country}`,
      country: c.country,
      region: c.region || c.state || 'City',
      latitude: c.lat,
      longitude: c.lng,
      type: 'city',
      source: 'curated',
      curated: true,
      zoomLevel: 'city',
      cameraDistance: 4.3,
    }));

    // 4. Curated Attractions
    const attractionMatches = ATTRACTIONS.filter(
      (a) => a.name.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q)
    ).map((a) => ({
      id: a.id,
      name: a.name,
      formattedName: `${a.name}, ${a.city}`,
      country: a.country || 'World',
      region: a.city,
      latitude: a.lat,
      longitude: a.lng,
      type: 'landmark',
      source: 'curated',
      curated: true,
      zoomLevel: 'landmark',
      cameraDistance: 3.85,
    }));

    return [...naturalMatches, ...countryMatches, ...cityMatches, ...attractionMatches];
  }
}

/**
 * NominatimLocationProvider
 * OpenStreetMap worldwide geocoding fallback for 100% resilient global search
 */
export class NominatimLocationProvider extends BaseLocationProvider {
  async search(query) {
    if (!query || query.length < 2) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&addressdetails=1&limit=5`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });

      if (!res.ok) return [];
      const items = await res.json();

      return items.map((item) => {
        const address = item.address || {};
        const country = address.country || 'World';
        const region = address.state || address.county || address.region || '';
        const name = item.name || item.display_name.split(',')[0].trim();

        let placeType = 'city';
        if (item.type === 'country' || item.class === 'boundary') placeType = 'country';
        else if (item.class === 'natural') placeType = 'natural_feature';
        else if (item.class === 'tourism' || item.class === 'historic') placeType = 'landmark';

        return {
          id: `osm-${item.place_id}`,
          name,
          formattedName: item.display_name,
          country,
          region,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          type: placeType,
          source: 'nominatim',
          curated: false,
          providerId: String(item.place_id),
          zoomLevel: placeType === 'country' ? 'country' : placeType === 'landmark' ? 'landmark' : 'city',
          cameraDistance: placeType === 'country' ? 5.1 : placeType === 'landmark' ? 3.85 : 4.3,
        };
      });
    } catch {
      return [];
    }
  }
}

/**
 * Unified Location Service Orchestrator
 */
class UnifiedLocationService {
  constructor() {
    this.googleProvider = new GoogleLocationProvider();
    this.datasetProvider = new GeographicDatasetLocationProvider();
    this.nominatimProvider = new NominatimLocationProvider();
  }

  async search(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    // Layer 1: Curated & Geographic Datasets (Oceans, Seas, Mountains, Curated Cities)
    const datasetResults = await this.datasetProvider.search(q);
    if (datasetResults.length > 0) {
      return datasetResults;
    }

    // Layer 2: Google Maps Provider (if API configured)
    if (this.googleProvider.isAvailable()) {
      const googleResults = await this.googleProvider.search(q);
      if (googleResults.length > 0) {
        return googleResults;
      }
    }

    // Layer 3: Nominatim Worldwide Geocoder
    const nominatimResults = await this.nominatimProvider.search(q);
    return nominatimResults;
  }
}

export const unifiedLocationService = new UnifiedLocationService();
