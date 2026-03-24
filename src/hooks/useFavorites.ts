// Favorites V1 — reactive hook wrapping favoritesStorage

import { useState, useRef, useEffect, useCallback } from 'react';
import { useElection } from '../context/ElectionContext';
import { useEnvironment } from '../context/EnvironmentContext';
import type { Favorite } from '../types/favorites';
import { FAVORITES_VERSION } from '../types/favorites';
import {
  getFavorites,
  addFavorite as storageAdd,
  removeFavorite as storageRemove,
  renameFavorite as storageRename,
  updateLastUsed as storageUpdateLastUsed,
  findExistingFavorite,
  subscribeFavorites,
} from '../utils/favoritesStorage';

export interface RestoreResult {
  success: boolean;
  message: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(() => getFavorites());
  const { ambiente, host, setAmbiente, setHost } = useEnvironment();

  useEffect(() => {
    const unsubscribe = subscribeFavorites(newFavs => setFavorites(newFavs));
    return unsubscribe;
  }, []);
  const {
    selectedEleicao, selectedAbrangencia, selectedZona, ciclo,
    selectEleicao, selectAbrangencia, setZona,
    ea11Data, isEA11Loading,
  } = useElection();

  // Pending favorite for cross-environment restore
  const pendingFavoriteRef = useRef<Favorite | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<RestoreResult | null>(null);

  // --- Capture ---

  const captureFavorite = useCallback((): RestoreResult => {
    if (!selectedEleicao) {
      return { success: false, message: 'Nenhuma eleição selecionada' };
    }

    const abr = selectedAbrangencia;
    
    let scopeLevel: 'br' | 'uf' | 'municipio' = 'br';
    if (abr) {
      if (abr.ufCd.toUpperCase() === 'BR') {
        scopeLevel = 'br';
      } else if (!abr.munCdTse || abr.isUfWide) {
        scopeLevel = 'uf';
      } else {
        scopeLevel = 'municipio';
      }
    }

    // Check for duplicates
    const existing = findExistingFavorite(
      favorites, selectedEleicao.cd, ambiente, scopeLevel, abr?.ufCd, abr?.munCdTse
    );
    if (existing) {
      return { success: false, message: 'Favorito já existe' };
    }

    const name = [
      selectedEleicao.nm.replace(/&#186;/g, 'º'),
      abr ? `${abr.munNome} (${abr.ufCd})` : 'BR',
      ambiente,
    ].join(' · ');

    const fav: Favorite = {
      id: crypto.randomUUID(),
      version: FAVORITES_VERSION,
      name,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      environment: { ambiente, host },
      context: {
        ciclo,
        eleicaoCd: selectedEleicao.cd,
        eleicaoNm: selectedEleicao.nm.replace(/&#186;/g, 'º'),
        turno: selectedEleicao.t,
        tipo: selectedEleicao.tp,
        scopeLevel,
        ufCd: abr?.ufCd,
        munCdTse: abr?.munCdTse,
        munNome: abr?.munNome,
        zona: selectedZona !== 'Todas' ? selectedZona : undefined,
      },
    };

    storageAdd(fav);
    return { success: true, message: 'Favorito salvo ✓' };
  }, [selectedEleicao, selectedAbrangencia, selectedZona, ciclo, ambiente, host, favorites]);

  // --- Remove ---

  const handleRemove = useCallback((id: string) => {
    storageRemove(id);
  }, []);

  // --- Rename ---

  const handleRename = useCallback((id: string, name: string) => {
    storageRename(id, name);
  }, []);

  // --- Restore (same environment) ---

  const applyFavorite = useCallback((fav: Favorite) => {
    if (!ea11Data) {
      setRestoreStatus({ success: false, message: 'EA11 ainda carregando' });
      return;
    }

    const eleicao = ea11Data.pl
      .flatMap(pl => pl.e)
      .find(e => e.cd === fav.context.eleicaoCd);

    if (!eleicao) {
      setRestoreStatus({ success: false, message: 'Eleição não disponível neste ambiente' });
      pendingFavoriteRef.current = null;
      return;
    }

    // Select the election
    selectEleicao(eleicao, fav.context.ciclo);

    // Apply abrangência based on explicitly saved scopeLevel
    if (fav.context.scopeLevel === 'br') {
      selectAbrangencia(null);
    } else if (fav.context.scopeLevel === 'uf') {
      selectAbrangencia({
        ufCd: fav.context.ufCd || '',
        ufNome: fav.context.munNome || fav.context.ufCd || '',
        munCdTse: '',
        munNome: fav.context.munNome || fav.context.ufCd || '',
        isCapital: false,
        isUfWide: true,
        z: [],
      });
    } else if (fav.context.scopeLevel === 'municipio') {
      selectAbrangencia({
        ufCd: fav.context.ufCd || '',
        ufNome: '',
        munCdTse: fav.context.munCdTse || '',
        munNome: fav.context.munNome || '',
        isCapital: false,
        isUfWide: false,
        z: [],
      });
    }

    // Apply zone if present
    if (fav.context.zona) {
      setZona(fav.context.zona);
    }

    // Update lastUsedAt
    storageUpdateLastUsed(fav.id);

    setRestoreStatus({ success: true, message: 'Favorito restaurado ✓' });
    pendingFavoriteRef.current = null;
  }, [ea11Data, selectEleicao, selectAbrangencia, setZona]);

  // --- Restore (cross-environment) ---

  const restoreFavorite = useCallback((fav: Favorite) => {
    setRestoreStatus(null);

    const needsEnvSwitch =
      fav.environment.ambiente !== ambiente ||
      fav.environment.host !== host;

    if (!needsEnvSwitch) {
      applyFavorite(fav);
      return;
    }

    // Set pending and switch environment
    pendingFavoriteRef.current = fav;
    setAmbiente(fav.environment.ambiente);
    setHost(fav.environment.host);
    // applyFavorite will be called via the useEffect below once EA11 loads
  }, [ambiente, host, setAmbiente, setHost, applyFavorite]);

  // Watch for EA11 load after environment switch
  useEffect(() => {
    if (pendingFavoriteRef.current && ea11Data && !isEA11Loading) {
      applyFavorite(pendingFavoriteRef.current);
    }
  }, [ea11Data, isEA11Loading, applyFavorite]);

  // --- Helpers ---

  const currentScopeLevel: 'br' | 'uf' | 'municipio' = (() => {
    if (!selectedAbrangencia) return 'br';
    if (selectedAbrangencia.ufCd.toUpperCase() === 'BR') return 'br';
    if (!selectedAbrangencia.munCdTse || selectedAbrangencia.isUfWide) return 'uf';
    return 'municipio';
  })();

  const isCurrentContextFavorited = selectedEleicao
    ? !!findExistingFavorite(favorites, selectedEleicao.cd, ambiente, currentScopeLevel, selectedAbrangencia?.ufCd, selectedAbrangencia?.munCdTse)
    : false;

  return {
    favorites,
    captureFavorite,
    removeFavorite: handleRemove,
    renameFavorite: handleRename,
    restoreFavorite,
    restoreStatus,
    isCurrentContextFavorited,
    isPendingRestore: !!pendingFavoriteRef.current,
    pendingFavorite: pendingFavoriteRef.current,
  };
}
