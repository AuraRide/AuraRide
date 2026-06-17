// Shared 高德 (AMap) JS API loader.
//
// Loads the AMap script once (deduped) using the key/security from env. Plugins
// like AMap.Riding are pulled in on demand via AMap.plugin(...) by callers.

export const AMAP_KEY = import.meta.env.VITE_AMAP_KEY as string | undefined;
const AMAP_SECURITY = import.meta.env.VITE_AMAP_SECURITY as string | undefined;

let loadPromise: Promise<any> | null = null;

export function loadAMap(): Promise<any> {
  const w = window as any;
  if (w.AMap) return Promise.resolve(w.AMap);
  if (loadPromise) return loadPromise;
  if (!AMAP_KEY) return Promise.reject(new Error("VITE_AMAP_KEY not set"));
  if (AMAP_SECURITY) w._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY };

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
    script.async = true;
    script.onload = () => resolve(w.AMap);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("AMap script failed to load"));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/** Load an AMap plugin (e.g. "AMap.Riding") and resolve when ready. */
export function loadPlugin(AMap: any, name: string): Promise<void> {
  return new Promise((resolve) => AMap.plugin(name, () => resolve()));
}
