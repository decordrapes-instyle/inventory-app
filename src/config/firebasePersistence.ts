import { getDatabase } from "firebase/database";

let _enabled = false;

export async function initOfflinePersistence(): Promise<boolean> {
  if (_enabled) return true;

  try {
    const mod: any = await import("firebase/database");

    if (typeof mod.enableIndexedDbPersistence === "function") {
      await mod.enableIndexedDbPersistence(getDatabase());
      _enabled = true;
      if (import.meta.env.DEV) console.info("[FB] offline persistence enabled (legacy API)");
      return true;
    }

    _enabled = true;
    if (import.meta.env.DEV) console.info("[FB] persistence handled at init (modern API)");
    return true;
  } catch (err: any) {
    if (err?.code === "failed-precondition") {
      console.warn("[FB] persistence: multiple tabs open");
    } else if (err?.code === "unimplemented") {
      console.warn("[FB] persistence: browser unsupported");
    } else {
      console.warn("[FB] persistence error:", err);
    }
    return false;
  }
}