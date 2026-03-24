// Favorites V1 — pure CRUD over localStorage (no React dependency)

import type { Favorite } from '../types/favorites';
import { MAX_FAVORITES } from '../types/favorites';

const STORAGE_KEY = 'favorites';

type Listener = (favorites: Favorite[]) => void;
const listeners = new Set<Listener>();

export function subscribeFavorites(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notifyListeners(favs: Favorite[]) {
  listeners.forEach(l => l(favs));
}

/** Read all favorites from localStorage. Returns [] on parse error. */
export function getFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let needsSave = false;
    const migrated = parsed.map(item => {
      if (!item || typeof item !== 'object' || !item.context) return null;
      const fav = item as Favorite;
      
      // Migrate from prior versions (e.g. before scopeLevel was introduced)
      if (!fav.version || fav.version < 1) {
        fav.version = 1;
        needsSave = true;
        
        if (!fav.context.scopeLevel) {
          if (fav.context.munCdTse) fav.context.scopeLevel = 'municipio';
          else if (fav.context.ufCd && fav.context.ufCd.toUpperCase() !== 'BR') fav.context.scopeLevel = 'uf';
          else fav.context.scopeLevel = 'br';
        }
      }
      return fav;
    }).filter(Boolean) as Favorite[];

    if (needsSave && migrated.length > 0) {
      // Direct write to avoid cyclic dependencies over saveFavorites
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      // Optionally could notify here, but getFavorites is usually called on mount.
    }

    return migrated;
  } catch {
    return [];
  }
}

/** Persist the full favorites array to localStorage. */
export function saveFavorites(favs: Favorite[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  notifyListeners(favs);
}

/** Add a favorite (prepend). Caps at MAX_FAVORITES. Returns updated list. */
export function addFavorite(fav: Favorite): Favorite[] {
  const favs = getFavorites();
  const updated = [fav, ...favs].slice(0, MAX_FAVORITES);
  saveFavorites(updated);
  return updated;
}

/** Remove a favorite by id. Returns updated list. */
export function removeFavorite(id: string): Favorite[] {
  const favs = getFavorites().filter(f => f.id !== id);
  saveFavorites(favs);
  return favs;
}

/** Rename a favorite by id. Returns updated list. */
export function renameFavorite(id: string, name: string): Favorite[] {
  const favs = getFavorites().map(f =>
    f.id === id ? { ...f, name } : f
  );
  saveFavorites(favs);
  return favs;
}

/** Update lastUsedAt for a favorite. Returns updated list. */
export function updateLastUsed(id: string): Favorite[] {
  const favs = getFavorites().map(f =>
    f.id === id ? { ...f, lastUsedAt: Date.now() } : f
  );
  saveFavorites(favs);
  return favs;
}

/** Check if a context already exists in favorites (same election + abrangência + ambiente). */
export function findExistingFavorite(
  favs: Favorite[],
  eleicaoCd: string,
  ambiente: string,
  scopeLevel: 'br' | 'uf' | 'municipio',
  ufCd?: string,
  munCdTse?: string
): Favorite | undefined {
  return favs.find(f =>
    f.context.eleicaoCd === eleicaoCd &&
    f.environment.ambiente === ambiente &&
    f.context.scopeLevel === scopeLevel &&
    (f.context.ufCd || '') === (ufCd || '') &&
    (f.context.munCdTse || '') === (munCdTse || '')
  );
}
