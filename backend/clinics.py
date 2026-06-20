"""
Find nearby hospitals/clinics for a given pincode using free, keyless
OpenStreetMap services: Nominatim (pincode -> lat/lon) and Overpass
(lat/lon -> nearby hospitals/clinics).
"""
import requests
from math import radians, sin, cos, sqrt, atan2

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "MediPredict/1.0"}


def geocode_pincode(pincode: str, country: str = "India"):
    params = {"postalcode": pincode, "country": country, "format": "json", "limit": 1}
    res = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
    res.raise_for_status()
    data = res.json()
    if not data:
        return None
    return float(data[0]["lat"]), float(data[0]["lon"])


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def format_address(tags: dict) -> str:
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:suburb"),
        tags.get("addr:city"),
        tags.get("addr:postcode"),
    ]
    return ", ".join(p for p in parts if p) or "Address not available"


def find_nearby_facilities(lat: float, lon: float, radius_m: int = 5000):
    query = f"""
    [out:json][timeout:20];
    (
      node["amenity"~"^(hospital|clinic)$"](around:{radius_m},{lat},{lon});
      way["amenity"~"^(hospital|clinic)$"](around:{radius_m},{lat},{lon});
    );
    out center tags;
    """
    res = requests.post(OVERPASS_URL, data={"data": query}, headers=HEADERS, timeout=25)
    res.raise_for_status()

    results = []
    for el in res.json().get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
        elat = el.get("lat") or el.get("center", {}).get("lat")
        elon = el.get("lon") or el.get("center", {}).get("lon")
        if elat is None or elon is None:
            continue
        results.append({
            "name": name,
            "type": tags.get("amenity"),
            "address": format_address(tags),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "lat": elat,
            "lon": elon,
            "distance_km": round(haversine_km(lat, lon, elat, elon), 2),
        })

    results.sort(key=lambda r: r["distance_km"])
    return results[:20]