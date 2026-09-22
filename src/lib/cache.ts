const PREFIX = "inv:";
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

export const cache = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const { d, t } = JSON.parse(raw);
      if (Date.now() - t > TTL_MS) {
        localStorage.removeItem(PREFIX + key);
        return null;
      }
      return d as T;
    } catch {
      return null;
    }
  },
  set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ d: data, t: Date.now() }));
    } catch {
    }
  },
  clear(key: string): void {
    try { localStorage.removeItem(PREFIX + key); } catch {}
  },
};