// session.ts — a deliberately tiny "is the rider signed in" flag. The auth sheet
// is a front-end stub (no real backend yet), so all we persist is a display name;
// its presence is what the personal pages use to decide whether to show the
// 登录 / 注册 entry in their profile header.

const KEY = "auraride.account";

export function getAccount(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function setAccount(name: string) {
  try {
    localStorage.setItem(KEY, name || "骑行者");
  } catch {
    /* ignore */
  }
}
export function clearAccount() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
