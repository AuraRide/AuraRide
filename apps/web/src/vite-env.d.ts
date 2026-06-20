/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 高德地图 Web 端 (JS API) key — from https://lbs.amap.com */
  readonly VITE_AMAP_KEY?: string;
  /** 高德安全密钥 (security JS code), if your key requires one */
  readonly VITE_AMAP_SECURITY?: string;
  /** 后端 API base URL — 有值时 rideRepo 走 apiRepo(fetch),无值时走 localRepo(localStorage)。
   *  本机 dev 设为空字符串可让 apiRepo 通过 Vite proxy 命中(target 由 vite.config 决定)。 */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
