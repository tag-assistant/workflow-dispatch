// localStorage helpers for favorites, last-used, and dispatchable cache

const FAVORITES_KEY = 'workflow-dispatch-favorites';
const LAST_USED_KEY = 'workflow-dispatch-last-used';
const DISPATCHABLE_KEY = 'workflow-dispatch-dispatchable';

// --- Favorites ---
export function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); }
  catch { return []; }
}

export function toggleFavorite(key: string): boolean {
  const favs = getFavorites();
  const idx = favs.indexOf(key);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.push(key); }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return idx < 0; // returns true if now favorited
}

export function isFavorite(key: string): boolean {
  return getFavorites().includes(key);
}

// --- Last Used ---
export function getLastUsed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LAST_USED_KEY) || '{}'); }
  catch { return {}; }
}

export function markLastUsed(key: string) {
  const lu = getLastUsed();
  lu[key] = Date.now();
  localStorage.setItem(LAST_USED_KEY, JSON.stringify(lu));
}

export function getLastUsedTime(key: string): number {
  return getLastUsed()[key] || 0;
}

// --- Dispatchable cache ---
export function getDispatchableCache(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(DISPATCHABLE_KEY) || '{}'); }
  catch { return {}; }
}

export function setDispatchable(key: string, value: boolean) {
  const cache = getDispatchableCache();
  cache[key] = value;
  localStorage.setItem(DISPATCHABLE_KEY, JSON.stringify(cache));
}

export function isDispatchableCached(key: string): boolean | undefined {
  const cache = getDispatchableCache();
  return key in cache ? cache[key] : undefined;
}

// --- Workflow key helper ---
export function workflowKey(owner: string, repo: string, workflowId: string | number): string {
  return `${owner}/${repo}/${workflowId}`;
}
