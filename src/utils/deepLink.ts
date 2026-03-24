// Deep Link V1 — URL serialization and parsing

export interface DeepLinkParams {
  eleicaoCd: string;
  ufCd?: string;
  munCdTse?: string;
  zona?: string;
}

/**
 * Parse query string into DeepLinkParams.
 * Returns null if not a valid deep link (missing `e`).
 * Returns { error } sentinel via thrown string if params are structurally invalid.
 */
export function parseDeepLink(search: string): DeepLinkParams | null {
  const params = new URLSearchParams(search);
  const e = params.get('e');
  if (!e) return null; // Not a deep link

  const uf = params.get('uf') || undefined;
  const m = params.get('m') || undefined;
  const z = params.get('z') || undefined;

  // Structural validation — strict, no silent fallbacks
  if (m && !uf) {
    throw new Error('Link inválido: município (m) requer UF (uf)');
  }
  if (z && !m) {
    throw new Error('Link inválido: zona (z) requer município (m)');
  }

  return {
    eleicaoCd: e,
    ufCd: uf,
    munCdTse: m,
    zona: z,
  };
}

/**
 * Build a deep link URL from the current app state.
 */
export function buildDeepLinkUrl(params: {
  eleicaoCd: string;
  ufCd?: string;
  munCdTse?: string;
  zona?: string;
}): string {
  const url = new URL(window.location.href);
  // Clear any existing deep link params
  url.search = '';

  url.searchParams.set('e', params.eleicaoCd);

  if (params.ufCd && params.ufCd.toUpperCase() !== 'BR') {
    url.searchParams.set('uf', params.ufCd);
  }

  if (params.munCdTse) {
    url.searchParams.set('m', params.munCdTse);
  }

  if (params.zona) {
    url.searchParams.set('z', params.zona);
  }

  return url.toString();
}
