export const FAVORITES_KEY = 'evil-baike-favs';
export const FAVORITES_CHANGED = 'evil-baike:favs-changed';
export const favoriteTypes = ['event', 'person', 'organization'] as const;
export type FavoriteType = typeof favoriteTypes[number];
export type Favorite = { id: string; title: string; ts: number };
export type Favorites = Record<FavoriteType, Favorite[]>;
const empty = (): Favorites => ({ event: [], person: [], organization: [] });

/** Accept the old string-array format and discard invalid or duplicate records. */
export function normalizeFavorites(value: unknown): Favorites {
  const result = empty();
  if (!value || typeof value !== 'object') return result;
  for (const type of favoriteTypes) {
    const entries = (value as Record<string, unknown>)[type];
    if (!Array.isArray(entries)) continue;
    const ids = new Set<string>();
    for (const candidate of entries) {
      const item = typeof candidate === 'string' ? { id: candidate } : candidate;
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) continue;
      ids.add(item.id);
      result[type].push({ id: item.id, title: typeof item.title === 'string' ? item.title : '', ts: typeof item.ts === 'number' && Number.isFinite(item.ts) ? item.ts : 0 });
    }
  }
  return result;
}

export function readFavorites(): Favorites {
  try { return normalizeFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null')); }
  catch { return empty(); }
}

/** A failed storage write must never be presented as a saved favorite. */
export function saveFavorites(favorites: Favorites): boolean {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(normalizeFavorites(favorites)));
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED));
    return true;
  } catch { return false; }
}
