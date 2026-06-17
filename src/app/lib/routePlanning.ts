// Plan a handful of distinct cycling routes around a start point using 高德's
// 骑行路径规划 (AMap.Riding). Coordinates here are GCJ-02 (what AMap expects).

export interface LngLat {
  lng: number;
  lat: number;
}

export interface RoutePlan {
  id: number;
  name: string;
  tag: string;
  color: string;
  path: Array<[number, number]>; // GCJ-02 [lng, lat]
  distanceKm: number;
  durationMin: number;
}

// Three flavors, sent toward different bearings/distances so they don't overlap.
export const ROUTE_VARIANTS = [
  { id: 0, name: "轻松环线", tag: "近 · 舒缓", bearing: 35, distKm: 2.2 },
  { id: 1, name: "探索街区", tag: "中 · 探索", bearing: 155, distKm: 3.6 },
  { id: 2, name: "尽兴长线", tag: "远 · 尽兴", bearing: 275, distKm: 5.4 },
];

const R_KM = 6371;

/** Offset a point by a bearing (deg) and distance (km) — great-circle. */
export function destPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distKm: number
): LngLat {
  const br = (bearingDeg * Math.PI) / 180;
  const dr = distKm / R_KM;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(dr) * Math.cos(lat1),
      Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

/** Plan one riding route start → dest. Resolves null if no route is found. */
export function planRoute(
  AMap: any,
  start: LngLat,
  dest: LngLat
): Promise<{ path: Array<[number, number]>; distanceKm: number; durationMin: number } | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: any) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    // Guard against the service hanging.
    setTimeout(() => finish(null), 12000);
    try {
      const riding = new AMap.Riding({ policy: 0, hideMarkers: true });
      riding.search(
        [start.lng, start.lat],
        [dest.lng, dest.lat],
        (status: string, result: any) => {
          if (status === "complete" && result?.routes?.[0]) {
            const r = result.routes[0];
            const path: Array<[number, number]> = [];
            (r.rides || []).forEach((ride: any) =>
              (ride.path || []).forEach((pt: any) => {
                const lng = pt?.lng ?? pt?.[0];
                const lat = pt?.lat ?? pt?.[1];
                if (lng != null && lat != null) path.push([lng, lat]);
              })
            );
            finish({
              path,
              distanceKm: r.distance / 1000,
              durationMin: Math.max(1, Math.round(r.time / 60)),
            });
          } else {
            finish(null);
          }
        }
      );
    } catch {
      finish(null);
    }
  });
}
