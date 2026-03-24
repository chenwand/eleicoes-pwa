// Favorites V1 — data model

export const FAVORITES_VERSION = 1;
export const MAX_FAVORITES = 50;

export interface FavoriteEnvironment {
  ambiente: string;   // ex: 'oficial', 'desenvolvimento'
  host: string;       // ex: '/tse-api', 'https://...'
}

export interface FavoriteContext {
  ciclo: string;      // ex: 'ele2024'
  eleicaoCd: string;  // ex: '546'
  eleicaoNm: string;  // ex: 'Eleições Municipais 2024'
  turno: string;      // ex: '1', '2'
  tipo: string;       // ex: '3' (ordinária)

  // Nível da abrangência explícito para não haver confusão na restauração
  scopeLevel: 'br' | 'uf' | 'municipio';

  // Abrangência (optional — can be BR-wide)
  ufCd?: string;      // ex: 'SP'
  munCdTse?: string;  // ex: '09210'
  munNome?: string;   // ex: 'São Paulo'
  zona?: string;      // ex: '0001'
}

export interface Favorite {
  id: string;                     // crypto.randomUUID()
  version: number;                // FAVORITES_VERSION (migration support)
  name: string;                   // user-editable
  createdAt: number;              // Date.now()
  lastUsedAt: number;             // updated on restore
  environment: FavoriteEnvironment;
  context: FavoriteContext;
}
