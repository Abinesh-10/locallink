import { logger } from './logger';

export interface ReverseGeocodeResult {
  address: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Reverse-geocodes lat/lng to a human-readable address using the free
 * OpenStreetMap Nominatim API (no API key required, suitable for an MVP).
 * Swap this out for Google Geocoding API if higher accuracy/quota is needed.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LocalLink/1.0 (hyperlocal-marketplace)' },
    });
    if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
    const data: any = await res.json();
    return {
      address: data.display_name || `${lat}, ${lng}`,
      city: data.address?.city || data.address?.town || data.address?.village,
      state: data.address?.state,
      country: data.address?.country,
    };
  } catch (err: any) {
    logger.error('Reverse geocode failed', { lat, lng, error: err.message });
    // Graceful fallback so the onboarding flow never hard-fails on a geocoding outage.
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

/** Haversine distance in kilometers — used for in-app distance display (DB does the actual radius filtering via earthdistance). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const ALLOWED_RADIUS_KM = [5, 10, 15, 25] as const;
export type AllowedRadius = (typeof ALLOWED_RADIUS_KM)[number];

export function isValidRadius(value: number): value is AllowedRadius {
  return ALLOWED_RADIUS_KM.includes(value as AllowedRadius);
}
