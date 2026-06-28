// rideRepo.ts — the app-facing DATA LAYER. Every page talks to this repo instead
// of touching localStorage / journal.ts directly. It is intentionally ASYNC
// (Promises) even though the local implementation is instant, so that swapping in
// a real backend (Supabase / custom API) later is a one-file change with ZERO
// page edits.
//
//   pages ──► repo (RideRepo interface) ──► localRepo  (now)
//                                        └─► supabaseRepo (later, same interface)
//
// It also backs the SOCIAL surface (广场/Discover) with local + seeded data so the
// community UI is fully demoable offline. The teammate replaces localRepo's social
// methods with real API calls — the interface is the contract.

import {
  RideRecord,
  RidePhoto,
  loadRides,
  saveRide as lsSaveRide,
  deleteRide as lsDeleteRide,
  replaceAllRides,
  emotionMeta,
} from "./journal";
import { downscaleDataUrl } from "./image";
import { buildPalette } from "./weave";

export type { RideRecord, RidePhoto };

// ── social domain types ──────────────────────────────────────────────
export interface PublicUser {
  id: string;
  handle: string;
  avatarColor: string; // hex for the avatar block
  dominantColorId: string; // their "主色" identity
}

export interface Post {
  id: string;
  author: PublicUser;
  colorId: string; // emotion bucket of the ride
  city: string;
  distanceKm: number;
  durationMin: number;
  moodText?: string;
  caption?: string;
  coverColor: string; // hex — drives the gradient cover
  routeShape: [number, number][]; // normalised 0..1 polyline for the mini-map
  photoUrls: string[]; // data URLs / remote URLs (may be empty)
  palette?: string[]; // hex swatches (per-photo colours) — lets others rebuild the weave
  likes: number;
  likedByMe: boolean;
  publishedAt: number;
}

export interface FeedFilter {
  colorId?: string; // filter by emotion colour
  city?: string;
  sort?: "new" | "hot";
}

export interface PublishOptions {
  city: string;
  caption?: string;
  photoUrls?: string[]; // featured photos chosen by the user (else all ride photos)
}

// A comment left on a 广场 post.
export interface Comment {
  id: string;
  postId: string;
  author: PublicUser;
  text: string;
  createdAt: number;
}

// A route copied from someone's post into 我的待出行路线 (planned, not yet ridden).
export interface SavedRoute {
  id: string;
  fromPostId?: string;
  colorId: string;
  city: string;
  distanceKm: number;
  durationMin: number;
  routeShape: [number, number][];
  coverColor: string;
  caption?: string;
  savedAt: number;
}

// A ride that is currently in progress — snapshotted every few seconds so a
// reload / app-kill / accidental back can resume instead of losing the ride.
export interface ActiveRide {
  colorId: string;
  moodText?: string;
  startedAt: number;
  updatedAt: number;
  distanceKm: number;
  durationSec: number;
  maxSpeedKmh: number;
  climbM: number;
  plannedDistanceKm?: number;
  photos: RidePhoto[];
  track: { lat: number; lng: number }[];
}

// ── the contract every backend must satisfy ──────────────────────────
export interface RideRepo {
  // own ride journal
  listRides(): Promise<RideRecord[]>;
  getRide(id: string): Promise<RideRecord | null>;
  saveRide(ride: RideRecord): Promise<void>;
  deleteRide(id: string): Promise<void>;
  replaceAll(rides: RideRecord[]): Promise<void>;

  // account
  currentUser(): Promise<PublicUser | null>;

  // community (广场)
  publishRide(rideId: string, opts: PublishOptions): Promise<Post>;
  isPublished(rideId: string): Promise<boolean>;
  listFeed(filter?: FeedFilter): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  toggleLike(postId: string): Promise<Post>;
  deletePost(postId: string): Promise<void>; // own (locally-published) posts only

  // comments on 广场 posts
  listComments(postId: string): Promise<Comment[]>;
  addComment(postId: string, text: string): Promise<Comment>;
  commentCounts(): Promise<Record<string, number>>; // postId → count, for badges

  // 待出行路线 — routes copied from posts, planned but not yet ridden
  listSavedRoutes(): Promise<SavedRoute[]>;
  saveRouteFromPost(post: Post): Promise<SavedRoute>;
  removeSavedRoute(id: string): Promise<void>;
  savedRouteIds(): Promise<string[]>; // postIds already saved, for button state

  // in-progress ride (断点续骑)
  saveActiveRide(state: ActiveRide): Promise<void>;
  getActiveRide(): Promise<ActiveRide | null>;
  clearActiveRide(): Promise<void>;
}

// ═════════════════════════════════════════════════════════════════════
// localRepo — current implementation (localStorage + seeded sample feed)
// ═════════════════════════════════════════════════════════════════════
const POSTS_KEY = "auraride.posts"; // posts the user published (local mirror)
const LIKES_KEY = "auraride.likes"; // postIds the user liked
const ACTIVE_KEY = "auraride.activeRide"; // the ride currently in progress, if any
const COMMENTS_KEY = "auraride.comments"; // Record<postId, Comment[]>
const SAVED_ROUTES_KEY = "auraride.savedRoutes"; // SavedRoute[] — 待出行路线

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, v: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false; // quota exceeded — caller decides how to recover
  }
}

// the local "me" identity — replaced by real auth later
const ME: PublicUser = { id: "me", handle: "我", avatarColor: "#3a2817", dominantColorId: "explore-yellow" };

// deterministic normalised route shape so each sample looks distinct but stable
function shapeFromSeed(seed: number, n = 14): [number, number][] {
  const pts: [number, number][] = [];
  let a = seed;
  const rnd = () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
  let x = 0.18 + rnd() * 0.1;
  let y = 0.9;
  for (let i = 0; i < n; i++) {
    pts.push([x, y]);
    x += (rnd() - 0.45) * 0.16;
    y -= 0.86 / n;
    x = Math.max(0.08, Math.min(0.92, x));
  }
  return pts;
}

// seeded sample 广场 — other riders' beautiful routes, biased per city (see CITY_BIAS)
const SAMPLE_AUTHORS: PublicUser[] = [
  { id: "u1", handle: "拾光的人", avatarColor: "#3a9b4e", dominantColorId: "calm-green" },
  { id: "u2", handle: "深水区", avatarColor: "#2f6fd6", dominantColorId: "lonely-blue" },
  { id: "u3", handle: "街角折返", avatarColor: "#eba81b", dominantColorId: "explore-yellow" },
  { id: "u4", handle: "直道燃尽", avatarColor: "#d23b2c", dominantColorId: "release-red" },
  { id: "u5", handle: "无轨之风", avatarColor: "#7c858d", dominantColorId: "tired-gray" },
];
const SAMPLE_CAPTIONS = [
  "傍晚的江堤，风把心跳调回了潮汐。",
  "一个人潜进暗蓝，喧嚣全沉到底。",
  "宽街收着回声，慢慢走过老城。",
  "把不安全部留在直道上，呼吸归位。",
  "做一阵没有轨迹的风，谁也不必看见。",
];

// shift a #rrggbb hex lighter (+) / darker (-)
function shade(hex: string, amt: number): string {
  const c = (i: number) => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + amt));
  return `rgb(${c(1)},${c(3)},${c(5)})`;
}

// Seed demo posts for the 城市色彩地图 / 广场, spanning all 34 provincial-level
// regions of China — each with a primary "色性" so the map reads as meaningful,
// 2–3 rides apiece. No per-post canvas photos (cards fall back to the route
// ribbon) so seeding ~85 posts stays cheap. Flip off to start empty.
const SHOW_SAMPLE_FEED = true;
const COLOR_KEYS = ["calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray"];

// city string keeps a landmark keyword so CityAvatar can match it
const REGIONS: Array<{ city: string; primary: string }> = [
  { city: "北京 · 朝阳", primary: "tired-gray" },
  { city: "上海 · 北外滩", primary: "lonely-blue" },
  { city: "天津 · 海河", primary: "lonely-blue" },
  { city: "重庆 · 洪崖洞", primary: "release-red" },
  { city: "河北 · 山海关", primary: "tired-gray" },
  { city: "山西 · 平遥", primary: "explore-yellow" },
  { city: "辽宁 · 大连", primary: "lonely-blue" },
  { city: "吉林 · 长春", primary: "tired-gray" },
  { city: "黑龙江 · 哈尔滨", primary: "tired-gray" },
  { city: "江苏 · 南京", primary: "calm-green" },
  { city: "浙江 · 西湖", primary: "calm-green" },
  { city: "安徽 · 黄山", primary: "calm-green" },
  { city: "福建 · 厦门", primary: "lonely-blue" },
  { city: "江西 · 滕王阁", primary: "calm-green" },
  { city: "山东 · 青岛", primary: "explore-yellow" },
  { city: "河南 · 郑州", primary: "explore-yellow" },
  { city: "湖北 · 黄鹤楼", primary: "lonely-blue" },
  { city: "湖南 · 橘子洲", primary: "release-red" },
  { city: "广东 · 珠江", primary: "release-red" },
  { city: "海南 · 三亚", primary: "explore-yellow" },
  { city: "四川 · 锦江", primary: "explore-yellow" },
  { city: "贵州 · 黄果树", primary: "calm-green" },
  { city: "云南 · 大理", primary: "calm-green" },
  { city: "陕西 · 西安", primary: "explore-yellow" },
  { city: "甘肃 · 敦煌", primary: "explore-yellow" },
  { city: "青海 · 青海湖", primary: "lonely-blue" },
  { city: "台湾 · 台北", primary: "calm-green" },
  { city: "内蒙古 · 呼伦贝尔", primary: "calm-green" },
  { city: "广西 · 桂林", primary: "calm-green" },
  { city: "西藏 · 拉萨", primary: "lonely-blue" },
  { city: "宁夏 · 银川", primary: "tired-gray" },
  { city: "新疆 · 天山", primary: "explore-yellow" },
  { city: "香港 · 维港", primary: "lonely-blue" },
  { city: "澳门 · 大三巴", primary: "release-red" },
];

let _sampleCache: Post[] | null = null;
function buildSampleFeed(): Post[] {
  if (!SHOW_SAMPLE_FEED) return [];
  if (_sampleCache) return _sampleCache;
  const base = 1718500000000;
  const out: Post[] = [];
  let n = 0;
  REGIONS.forEach((rg, ci) => {
    let a = 1009 + ci * 131;
    const rnd = () => {
      a = (a * 1664525 + 1013904223) % 4294967296;
      return a / 4294967296;
    };
    const k = 2 + Math.floor(rnd() * 2); // 2 or 3 rides per region
    for (let j = 0; j < k; j++) {
      // mostly the region's primary colour, with some variation
      const colorId = rnd() < 0.7 ? rg.primary : COLOR_KEYS[Math.floor(rnd() * COLOR_KEYS.length)];
      const meta = emotionMeta(colorId);
      const author = SAMPLE_AUTHORS[(ci + j) % SAMPLE_AUTHORS.length];
      out.push({
        id: `sample-${ci}-${j}`,
        author,
        colorId,
        city: rg.city,
        distanceKm: +(3 + rnd() * 14).toFixed(1),
        durationMin: 12 + Math.round(rnd() * 80),
        caption: SAMPLE_CAPTIONS[COLOR_KEYS.indexOf(colorId)] || undefined,
        coverColor: shade(meta.color, Math.round((rnd() - 0.5) * 42)),
        routeShape: shapeFromSeed(97 + n * 53),
        photoUrls: [],
        palette: buildPalette({ photos: [], dominantColor: meta.color, colorId }),
        likes: Math.round(rnd() * 120),
        likedByMe: false,
        publishedAt: base - n * 5400000,
      });
      n++;
    }
  });
  _sampleCache = out;
  return out;
}

function ridePost(ride: RideRecord, opts: PublishOptions): Post {
  const meta = emotionMeta(ride.colorId);
  return {
    id: `post-${ride.id}`,
    author: ME,
    colorId: ride.colorId,
    city: opts.city,
    distanceKm: +ride.distance.toFixed(1),
    durationMin: Math.max(1, Math.round(ride.duration / 60)),
    moodText: ride.moodText,
    caption: opts.caption,
    coverColor: ride.dominantColor || meta.color,
    routeShape: shapeFromSeed(parseInt(ride.id.slice(-6)) || 7),
    photoUrls: (opts.photoUrls ?? ride.photos.map((p) => p.dataUrl)).slice(0, 6),
    palette: buildPalette(ride),
    likes: 0,
    likedByMe: false,
    publishedAt: Date.now(),
  };
}

function applyFilter(posts: Post[], filter?: FeedFilter): Post[] {
  let out = posts.slice();
  if (filter?.colorId) out = out.filter((p) => p.colorId === filter.colorId);
  if (filter?.city) out = out.filter((p) => p.city.includes(filter.city!));
  if (filter?.sort === "hot") out.sort((a, b) => b.likes - a.likes);
  else out.sort((a, b) => b.publishedAt - a.publishedAt);
  return out;
}

export const localRepo: RideRepo = {
  async listRides() {
    return loadRides();
  },
  async getRide(id) {
    return loadRides().find((r) => r.id === id) || null;
  },
  async saveRide(ride) {
    lsSaveRide(ride);
  },
  async deleteRide(id) {
    lsDeleteRide(id);
  },
  async replaceAll(rides) {
    replaceAllRides(rides);
  },

  async currentUser() {
    return ME;
  },

  async publishRide(rideId, opts) {
    const ride = loadRides().find((r) => r.id === rideId);
    if (!ride) throw new Error("ride not found");

    // Compress the featured photos before they enter the posts store — feed
    // covers don't need full-res, and copying multi-MB data-URLs is what blows
    // the localStorage quota (and made publishing silently fail).
    const srcUrls = (opts.photoUrls ?? ride.photos.map((p) => p.dataUrl)).slice(0, 6);
    const photoUrls = await Promise.all(srcUrls.map((u) => downscaleDataUrl(u, 1080, 0.7)));
    const post = ridePost(ride, { ...opts, photoUrls });

    const mine = readJSON<Post[]>(POSTS_KEY, []).filter((p) => p.id !== post.id);
    mine.unshift(post);
    if (writeJSON(POSTS_KEY, mine)) return post;

    // Quota hit — reclaim space by compacting the journal (drop GPS tracks +
    // downscale stored ride photos), then retry once.
    try {
      const compacted = await Promise.all(
        loadRides().map(async (r) => ({
          ...r,
          track: undefined,
          photos: await Promise.all(
            r.photos.map(async (p) => ({ ...p, dataUrl: await downscaleDataUrl(p.dataUrl, 1080, 0.7) }))
          ),
        }))
      );
      replaceAllRides(compacted);
    } catch {
      /* best-effort */
    }
    if (writeJSON(POSTS_KEY, mine)) return post;
    throw new Error("QUOTA_EXCEEDED");
  },
  async isPublished(rideId) {
    return readJSON<Post[]>(POSTS_KEY, []).some((p) => p.id === `post-${rideId}`);
  },
  async listFeed(filter) {
    const liked = new Set(readJSON<string[]>(LIKES_KEY, []));
    const mine = readJSON<Post[]>(POSTS_KEY, []);
    const all = [...mine, ...buildSampleFeed()].map((p) => ({
      ...p,
      likedByMe: liked.has(p.id),
      likes: p.likes + (liked.has(p.id) && !p.likedByMe ? 1 : 0),
    }));
    return applyFilter(all, filter);
  },
  async getPost(id) {
    const all = await this.listFeed();
    return all.find((p) => p.id === id) || null;
  },
  async toggleLike(postId) {
    const liked = new Set(readJSON<string[]>(LIKES_KEY, []));
    if (liked.has(postId)) liked.delete(postId);
    else liked.add(postId);
    writeJSON(LIKES_KEY, [...liked]);
    const post = await this.getPost(postId);
    if (!post) throw new Error("post not found");
    return post;
  },
  async deletePost(postId) {
    const mine = readJSON<Post[]>(POSTS_KEY, []).filter((p) => p.id !== postId);
    writeJSON(POSTS_KEY, mine);
  },

  async listComments(postId) {
    const all = readJSON<Record<string, Comment[]>>(COMMENTS_KEY, {});
    return (all[postId] || []).slice().sort((a, b) => a.createdAt - b.createdAt);
  },
  async addComment(postId, text) {
    const all = readJSON<Record<string, Comment[]>>(COMMENTS_KEY, {});
    const comment: Comment = { id: uid("c"), postId, author: ME, text: text.trim(), createdAt: Date.now() };
    all[postId] = [...(all[postId] || []), comment];
    writeJSON(COMMENTS_KEY, all);
    return comment;
  },
  async commentCounts() {
    const all = readJSON<Record<string, Comment[]>>(COMMENTS_KEY, {});
    const out: Record<string, number> = {};
    for (const k of Object.keys(all)) out[k] = all[k].length;
    return out;
  },

  async listSavedRoutes() {
    return readJSON<SavedRoute[]>(SAVED_ROUTES_KEY, []);
  },
  async saveRouteFromPost(post) {
    const list = readJSON<SavedRoute[]>(SAVED_ROUTES_KEY, []);
    const existing = list.find((r) => r.fromPostId === post.id);
    if (existing) return existing; // idempotent — copying twice is a no-op
    const route: SavedRoute = {
      id: uid("route"),
      fromPostId: post.id,
      colorId: post.colorId,
      city: post.city,
      distanceKm: post.distanceKm,
      durationMin: post.durationMin,
      routeShape: post.routeShape,
      coverColor: post.coverColor,
      caption: post.caption,
      savedAt: Date.now(),
    };
    writeJSON(SAVED_ROUTES_KEY, [route, ...list]);
    return route;
  },
  async removeSavedRoute(id) {
    writeJSON(SAVED_ROUTES_KEY, readJSON<SavedRoute[]>(SAVED_ROUTES_KEY, []).filter((r) => r.id !== id));
  },
  async savedRouteIds() {
    return readJSON<SavedRoute[]>(SAVED_ROUTES_KEY, [])
      .map((r) => r.fromPostId)
      .filter((x): x is string => !!x);
  },

  async saveActiveRide(state) {
    writeJSON(ACTIVE_KEY, state);
  },
  async getActiveRide() {
    return readJSON<ActiveRide | null>(ACTIVE_KEY, null);
  },
  async clearActiveRide() {
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  },
};

// The single repo the app uses. Swap this to `supabaseRepo` once the backend
// lands — no page changes required.
//
// ADR-005 §2: 有 VITE_API_BASE_URL(或 Vite dev proxy 已配置时,即使为空字符串
// 也走 apiRepo)→ apiRepo(fetch 真后端,失败自动降级 localRepo);
// 无 → 继续 localRepo,陈娟本机 dev 体感 0 改动。
import { apiRepo } from "./apiRepo";
export const repo: RideRepo = import.meta.env.VITE_API_BASE_URL ? apiRepo : localRepo;
