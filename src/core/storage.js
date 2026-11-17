export const STORAGE_VERSION = 1;

const KEY_PREFIX = "ozatroom:core:v1:";

function parseJSON(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function readCollection(name, legacyKey, fallback) {
  const key = KEY_PREFIX + name;
  const current = parseJSON(localStorage.getItem(key), null);
  if (current !== null) return current;

  const legacy = parseJSON(localStorage.getItem(legacyKey), fallback);
  writeCollection(name, legacy);
  return legacy;
}

export function writeCollection(name, value) {
  try {
    localStorage.setItem(KEY_PREFIX + name, JSON.stringify(value));
    localStorage.setItem("ozatroom:core:meta", JSON.stringify({
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    console.error("OZATROOM storage write failed:", error);
    return false;
  }
}

export function getStorageInfo() {
  const meta = parseJSON(localStorage.getItem("ozatroom:core:meta"), {});
  return {
    version: meta.version || STORAGE_VERSION,
    updatedAt: meta.updatedAt || null,
    persistent: true
  };
}
