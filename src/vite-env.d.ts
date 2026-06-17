/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 高德地图 Web 端 (JS API) key — from https://lbs.amap.com */
  readonly VITE_AMAP_KEY?: string;
  /** 高德安全密钥 (security JS code), if your key requires one */
  readonly VITE_AMAP_SECURITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
