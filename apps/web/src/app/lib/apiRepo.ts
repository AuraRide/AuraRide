// apiRepo.ts — fetch-based RideRepo implementation that talks to the real
// backend. The active repo is selected in rideRepo.ts based on
// `import.meta.env.VITE_API_BASE_URL`:
//
//   has VITE_API_BASE_URL → apiRepo (this file)            // chenzhuowen / staging
//   no  VITE_API_BASE_URL → localRepo (localStorage only)   // 陈娟 本机 dev,零依赖
//
// Disaster-friendly design: every method wraps fetch in try/catch and falls
// back to `localRepo` on network/parse failure. If staging dies or the user is
// offline, the UI keeps working off the last known local snapshot instead of
// hard-crashing.

import {
  RideRepo,
  Post,
  PublicUser,
  FeedFilter,
  PublishOptions,
  RideRecord,
  localRepo,
} from "./rideRepo";

// Base path. Empty string when undefined means "same-origin /api" so the Vite
// dev proxy (see vite.config.ts) transparently forwards to the real backend.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function url(path: string): string {
  // Always hit /api/* under whichever origin we resolved to.
  return `${BASE}${path}`;
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${init?.method || "GET"} ${input} → ${res.status}`);
  // DELETE / PUT may legitimately return empty bodies.
  const text = await res.text();
  return (text ? JSON.parse(text) : (undefined as unknown)) as T;
}

function warn(scope: string, err: unknown) {
  // eslint-disable-next-line no-console
  console.warn(`[apiRepo] ${scope} failed, falling back to localRepo:`, err);
}

export const apiRepo: RideRepo = {
  async listRides() {
    try {
      return await jsonFetch<RideRecord[]>(url("/api/rides"));
    } catch (e) {
      warn("listRides", e);
      return localRepo.listRides();
    }
  },

  async getRide(id) {
    try {
      return await jsonFetch<RideRecord | null>(url(`/api/rides/${encodeURIComponent(id)}`));
    } catch (e) {
      warn("getRide", e);
      return localRepo.getRide(id);
    }
  },

  async saveRide(ride) {
    try {
      await jsonFetch<void>(url("/api/rides"), {
        method: "POST",
        body: JSON.stringify(ride),
      });
    } catch (e) {
      warn("saveRide", e);
      return localRepo.saveRide(ride);
    }
  },

  async deleteRide(id) {
    try {
      await jsonFetch<void>(url(`/api/rides/${encodeURIComponent(id)}`), {
        method: "DELETE",
      });
    } catch (e) {
      warn("deleteRide", e);
      return localRepo.deleteRide(id);
    }
  },

  async replaceAll(rides) {
    try {
      await jsonFetch<void>(url("/api/rides"), {
        method: "PUT",
        body: JSON.stringify(rides),
      });
    } catch (e) {
      warn("replaceAll", e);
      return localRepo.replaceAll(rides);
    }
  },

  async currentUser() {
    try {
      return await jsonFetch<PublicUser | null>(url("/api/me"));
    } catch (e) {
      warn("currentUser", e);
      return localRepo.currentUser();
    }
  },

  async publishRide(rideId, opts: PublishOptions) {
    try {
      return await jsonFetch<Post>(url("/api/posts"), {
        method: "POST",
        body: JSON.stringify({ rideId, ...opts }),
      });
    } catch (e) {
      warn("publishRide", e);
      return localRepo.publishRide(rideId, opts);
    }
  },

  async isPublished(rideId) {
    try {
      // Backend convention: returns `{ published: boolean }` or a bare boolean.
      const v = await jsonFetch<boolean | { published: boolean }>(
        url(`/api/posts/published/${encodeURIComponent(rideId)}`),
      );
      return typeof v === "boolean" ? v : !!v?.published;
    } catch (e) {
      warn("isPublished", e);
      return localRepo.isPublished(rideId);
    }
  },

  async listFeed(filter?: FeedFilter) {
    try {
      const qs = new URLSearchParams();
      if (filter?.colorId) qs.set("colorId", filter.colorId);
      if (filter?.city) qs.set("city", filter.city);
      if (filter?.sort) qs.set("sort", filter.sort);
      const q = qs.toString();
      return await jsonFetch<Post[]>(url(`/api/posts${q ? `?${q}` : ""}`));
    } catch (e) {
      warn("listFeed", e);
      return localRepo.listFeed(filter);
    }
  },

  async getPost(id) {
    try {
      return await jsonFetch<Post | null>(url(`/api/posts/${encodeURIComponent(id)}`));
    } catch (e) {
      warn("getPost", e);
      return localRepo.getPost(id);
    }
  },

  async toggleLike(postId) {
    try {
      return await jsonFetch<Post>(url(`/api/posts/${encodeURIComponent(postId)}/like`), {
        method: "POST",
      });
    } catch (e) {
      warn("toggleLike", e);
      return localRepo.toggleLike(postId);
    }
  },
};
