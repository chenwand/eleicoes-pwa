// Deep Link V1 — restore hook
// Reads URL params on mount, waits for EA11 to load, applies context, cleans URL.

import { useEffect, useRef, useState } from 'react';
import { useElection } from '../context/ElectionContext';
import { parseDeepLink } from '../utils/deepLink';

export function useDeepLinkRestore() {
  const {
    ea11Data, isEA11Loading,
    selectEleicao, selectAbrangencia, setZona,
  } = useElection();

  // Parse once on mount, store in ref
  const parsedRef = useRef<ReturnType<typeof parseDeepLink> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const appliedRef = useRef(false);

  // Parse on first render only
  if (parsedRef.current === undefined) {
    try {
      parsedRef.current = parseDeepLink(window.location.search);
    } catch (err) {
      parsedRef.current = null;
      setError(err instanceof Error ? err.message : 'Link inválido');
    }
  }

  useEffect(() => {
    const params = parsedRef.current;
    if (!params || appliedRef.current) return;
    if (isEA11Loading || !ea11Data) return;

    // Find election by cd
    const eleicao = ea11Data.pl
      .flatMap(pl => pl.e)
      .find(e => e.cd === params.eleicaoCd);

    if (!eleicao) {
      setError(`Eleição #${params.eleicaoCd} não disponível neste ambiente`);
      cleanUrl();
      appliedRef.current = true;
      return;
    }

    // Apply election
    selectEleicao(eleicao, ea11Data.c);

    // Apply abrangência
    if (params.ufCd && params.munCdTse) {
      // Município
      selectAbrangencia({
        ufCd: params.ufCd,
        ufNome: params.ufCd,
        munCdTse: params.munCdTse,
        munNome: params.munCdTse, // Fallback to code
        isCapital: false,
        isUfWide: false,
        z: [],
      });
    } else if (params.ufCd) {
      // UF
      selectAbrangencia({
        ufCd: params.ufCd,
        ufNome: params.ufCd,
        munCdTse: '',
        munNome: params.ufCd,
        isCapital: false,
        isUfWide: true,
        z: [],
      });
    } else {
      // BR
      selectAbrangencia(null);
    }

    // Apply zona
    if (params.zona) {
      setZona(params.zona);
    }

    cleanUrl();
    appliedRef.current = true;
  }, [ea11Data, isEA11Loading, selectEleicao, selectAbrangencia, setZona]);

  return { deepLinkError: error };
}

function cleanUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.pathname);
}
