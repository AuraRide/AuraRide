import { useEffect, useMemo, useState } from "react";
import { emotionMeta } from "../../lib/journal";
import { repo, type Post, type Comment, type SavedRoute } from "../../lib/rideRepo";

// Shared state + actions for the social surface (色彩地图 + 广场). Both pages read
// the same feed; the map aggregates it, the plaza lists it. Keeping the post
// interactions (comment / copy-route / share / delete / 待出行) in one hook means
// the two pages stay in sync and the sheet code isn't duplicated.

export const COLORS = ["calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray"];
export const ME = "me"; // own posts get the ⋮ menu

// ── colour helpers (cities blend to an average hue) ───────────────────
export function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#888").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
export function avgHex(hexes: string[]): string {
  if (!hexes.length) return "#cccccc";
  let r = 0, g = 0, b = 0;
  for (const h of hexes) { const [hr, hg, hb] = hexToRgb(h); r += hr; g += hg; b += hb; }
  const n = hexes.length;
  return "#" + [r, g, b].map((c) => Math.round(c / n).toString(16).padStart(2, "0")).join("");
}
// coverColor may be "#rrggbb" or "rgb(r,g,b)" — parse either, for sorting by tone.
function parseRGB(c: string): [number, number, number] {
  if (c.startsWith("#")) return hexToRgb(c);
  const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return m ? [+m[1], +m[2], +m[3]] : [136, 136, 136];
}
export function lum(c: string): number {
  const [r, g, b] = parseRGB(c);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function useSocial() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [savedSheet, setSavedSheet] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  const reload = () => repo.listFeed().then(setPosts);
  const refreshCounts = () => repo.commentCounts().then(setCounts);
  const refreshSaved = () => repo.savedRouteIds().then((ids) => setSavedIds(new Set(ids)));
  useEffect(() => {
    reload();
    refreshCounts();
    refreshSaved();
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  // ── aggregations for the map ────────────────────────────────────────
  const cities = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts) { if (!m.has(p.city)) m.set(p.city, []); m.get(p.city)!.push(p); }
    return [...m.entries()]
      .map(([city, ps]) => {
        const colors = ps.map((p) => emotionMeta(p.colorId).color);
        return { city, count: ps.length, colors, main: avgHex(colors) };
      })
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  const composition = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of posts) c[p.colorId] = (c[p.colorId] || 0) + 1;
    return COLORS.filter((id) => c[id]).map((id) => ({ id, count: c[id], meta: emotionMeta(id) }));
  }, [posts]);

  const mosaic = useMemo(() => {
    const order = (id: string) => { const i = COLORS.indexOf(id); return i < 0 ? 99 : i; };
    return [...posts].sort((a, b) => order(a.colorId) - order(b.colorId) || lum(a.coverColor) - lum(b.coverColor));
  }, [posts]);

  const doDelete = async () => {
    if (!menuPost) return;
    await repo.deletePost(menuPost.id);
    setMenuPost(null);
    await reload();
    flash("已删除");
  };

  const copyRoute = async (p: Post) => {
    await repo.saveRouteFromPost(p);
    setSavedIds((prev) => new Set(prev).add(p.id));
    flash("已加入待出行路线");
  };

  const openComments = async (p: Post) => {
    setCommentPost(p);
    setComments(await repo.listComments(p.id));
  };
  const sendComment = async () => {
    const t = commentText.trim();
    if (!t || !commentPost) return;
    const c = await repo.addComment(commentPost.id, t);
    setComments((prev) => [...prev, c]);
    setCommentText("");
    setCounts((prev) => ({ ...prev, [commentPost.id]: (prev[commentPost.id] || 0) + 1 }));
  };

  const openSaved = async () => {
    setSavedRoutes(await repo.listSavedRoutes());
    setSavedSheet(true);
  };
  const removeSaved = async (r: SavedRoute) => {
    await repo.removeSavedRoute(r.id);
    setSavedRoutes((prev) => prev.filter((x) => x.id !== r.id));
    if (r.fromPostId) setSavedIds((prev) => { const n = new Set(prev); n.delete(r.fromPostId!); return n; });
  };

  const SHARE_LABELS: Record<string, string> = { wechat: "微信", qq: "QQ", xiaohongshu: "小红书", apple: "Apple 好友" };
  const share = async (target: "wechat" | "qq" | "xiaohongshu" | "apple" | "copy") => {
    if (!menuPost) return;
    const url = `${location.origin}/post/${menuPost.id}`;
    if (target === "copy") {
      try { await navigator.clipboard.writeText(url); flash("链接已复制"); } catch { flash("复制失败"); }
      setMenuPost(null);
      return;
    }
    const data = { title: "光屿骑行", text: menuPost.caption || `${emotionMeta(menuPost.colorId).cn} 的一段骑行`, url };
    if (navigator.share) { try { await navigator.share(data); } catch { /* cancelled */ } }
    else flash(`${SHARE_LABELS[target] || "分享"}：请在手机上分享，或用「复制链接」`);
    setMenuPost(null);
  };

  return {
    posts, counts, savedIds, menuPost, commentPost, comments, commentText, savedSheet, savedRoutes, toast,
    cities, composition, mosaic,
    setMenuPost, setCommentPost, setCommentText, setSavedSheet,
    flash, doDelete, copyRoute, openComments, sendComment, openSaved, removeSaved, share,
  };
}
