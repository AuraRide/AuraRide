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
}

// ═════════════════════════════════════════════════════════════════════
// localRepo — current implementation (localStorage + seeded sample feed)
// ═════════════════════════════════════════════════════════════════════
const POSTS_KEY = "auraride.posts"; // posts the user published (local mirror)
const LIKES_KEY = "auraride.likes"; // postIds the user liked

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore quota */
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

// seeded sample 广场 — other riders' beautiful routes, one per colour family
const CITIES = ["上海 · 北外滩", "杭州 · 西湖", "成都 · 锦江", "广州 · 珠江", "北京 · 朝阳"];
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

function buildSampleFeed(): Post[] {
  const colors = ["calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray"];
  const base = 1718500000000;
  return colors.map((colorId, i) => {
    const meta = emotionMeta(colorId);
    return {
      id: `sample-${i + 1}`,
      author: SAMPLE_AUTHORS[i],
      colorId,
      city: CITIES[i],
      distanceKm: +(4 + i * 2.3).toFixed(1),
      durationMin: 18 + i * 11,
      caption: SAMPLE_CAPTIONS[i],
      coverColor: meta.color,
      routeShape: shapeFromSeed(97 + i * 53),
      photoUrls: [],
      likes: 12 + i * 27,
      likedByMe: false,
      publishedAt: base - i * 5400000,
    };
  });
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
    photoUrls: ride.photos.map((p) => p.dataUrl).slice(0, 6),
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
    const post = ridePost(ride, opts);
    const mine = readJSON<Post[]>(POSTS_KEY, []).filter((p) => p.id !== post.id);
    mine.unshift(post);
    writeJSON(POSTS_KEY, mine);
    return post;
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
};

// The single repo the app uses. Swap this to `supabaseRepo` once the backend
// lands — no page changes required.
//
// ADR-005 §2: 有 VITE_API_BASE_URL(或 Vite dev proxy 已配置时,即使为空字符串
// 也走 apiRepo)→ apiRepo(fetch 真后端,失败自动降级 localRepo);
// 无 → 继续 localRepo,陈娟本机 dev 体感 0 改动。
import { apiRepo } from "./apiRepo";
export const repo: RideRepo = import.meta.env.VITE_API_BASE_URL ? apiRepo : localRepo;
