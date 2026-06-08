// WGS-84 → GCJ-02 ("Mars") coordinate conversion.
//
// Raw GPS (from the Geolocation API) is WGS-84. Chinese map providers (高德 /
// 百度* ) render in GCJ-02, which is intentionally offset by tens-to-hundreds of
// meters inside mainland China. To plot a GPS trace on a Chinese basemap without
// it floating off the road, every point must be converted WGS-84 → GCJ-02 first.
//
// Distance/speed math does NOT need this — those are computed from raw WGS-84 and
// are already accurate; conversion is purely for map alignment.
//
// (* 百度 uses BD-09, one further transform on top of GCJ-02 — add if you switch
// providers. This module covers WGS-84 → GCJ-02, which is what 高德 needs.)

const PI = Math.PI;
const A = 6378245.0; // Krasovsky 1940 semi-major axis (meters)
const EE = 0.00669342162296594323; // eccentricity squared

// Outside mainland China the offset is not applied (and is illegal to apply),
// so coordinates pass through unchanged.
export function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret =
    -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  ret += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
  ret += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  ret += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
  ret += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
  return ret;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Convert a raw GPS (WGS-84) point to GCJ-02 for Chinese map providers. */
export function wgs84ToGcj02(lat: number, lng: number): LatLng {
  if (outOfChina(lat, lng)) return { lat, lng };
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return { lat: lat + dLat, lng: lng + dLng };
}
