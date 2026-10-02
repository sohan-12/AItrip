from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from backend.models.location import NormalizedLocation, LocationSearchResponse, LocationResolveRequest, NearbyPlace
from backend.services.curated_service import CuratedLocationService
from backend.services.google_places_service import (
    search_places_google,
    get_place_details_google,
    search_nearby_google,
)
from backend.services.geocoding_service import GeocodingService

router = APIRouter(prefix="/api/locations", tags=["locations"])

@router.get("/search", response_model=LocationSearchResponse)
async def search_locations(
    q: str = Query(..., min_length=1, description="Location search query"),
    lang: str = Query("en", description="Preferred language code (en)"),
):
    query = q.strip()
    results: List[NormalizedLocation] = []
    seen = set()

    # LAYER 1: Showcase Curated Destinations
    curated = CuratedLocationService.search(query)
    for c in curated:
        key = f"{c.name.lower()}-{c.country.lower()}"
        if key not in seen:
            seen.add(key)
            results.append(c)

    # LAYER 2: Official Google Places API (New) Runtime Resolution
    try:
        google_results = await search_places_google(query, language_code=lang)
        for g in google_results:
            key = f"{g.name.lower()}-{g.country.lower()}"
            if key not in seen:
                seen.add(key)
                results.append(g)
    except Exception:
        # Fallback to universal geocoding service
        try:
            fallback_results = await GeocodingService.search(query, limit=6)
            for f in fallback_results:
                key = f"{f.name.lower()}-{f.country.lower()}"
                if key not in seen:
                    seen.add(key)
                    results.append(f)
        except Exception:
            pass

    return LocationSearchResponse(
        query=query,
        results=results,
        total=len(results),
    )

@router.post("/resolve", response_model=NormalizedLocation)
async def resolve_location(req: LocationResolveRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # 1. Check curated showcase
    curated_match = CuratedLocationService.get_by_name(query)
    if curated_match:
        return curated_match

    # 2. Check Google Places
    try:
        google_matches = await search_places_google(query, language_code="en")
        if google_matches:
            return google_matches[0]
    except Exception:
        pass

    # 3. Check universal resolver
    resolved = await GeocodingService.resolve(query)
    if resolved:
        return resolved

    raise HTTPException(status_code=404, detail="Location not found. Try another spelling or place name.")

@router.get("/details", response_model=Optional[NormalizedLocation])
async def get_place_details(
    placeId: str = Query(..., description="Google Place ID or internal place ID"),
    lang: str = Query("en", description="Preferred language code"),
):
    details = await get_place_details_google(placeId, language_code=lang)
    if not details:
        raise HTTPException(status_code=404, detail=f"Place details not found for ID '{placeId}'")
    return details

@router.get("/nearby", response_model=List[NearbyPlace])
async def get_nearby(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(15000.0, description="Search radius in meters"),
    lang: str = Query("en", description="Preferred language code"),
    limit: int = Query(6, ge=1, le=20),
):
    try:
        places = await search_nearby_google(lat, lng, radius=radius, language_code=lang, limit=limit)
        return places
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving nearby places: {str(e)}")
