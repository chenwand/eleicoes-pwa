import type { EA20Response } from '../types/ea20';

/**
 * Build the EA20 URL for a municipality or zone result.
 *
 * @param ambiente - e.g. 'oficial'
 * @param ciclo    - e.g. 'ele2024'
 * @param eleicaoCd - election code, e.g. '619'
 * @param uf       - state code, e.g. 'ac'
 * @param cdMun    - 5-digit municipality code, e.g. '01120'
 * @param cdCargo  - 2-4 digit cargo code from EA11, e.g. '11'
 * @param zona     - optional 4-digit zone code, e.g. '0008'
 */
export function buildEA20Url(
  ambiente: string,
  ciclo: string,
  eleicaoCd: string,
  uf: string,
  cdMun: string,
  cdCargo: string,
  zona?: string
): string {
  const paddedEle = eleicaoCd.padStart(6, '0');
  const paddedCargo = cdCargo.padStart(4, '0');
  const ufLower = uf.toLowerCase();
  const base = `https://resultados.tse.jus.br/${ambiente}/${ciclo}/${eleicaoCd}/dados/${ufLower}`;
  const munPart = `${ufLower}${cdMun}`;
  const zonaPart = zona ? `-z${zona}` : '';
  return `${base}/${munPart}${zonaPart}-c${paddedCargo}-e${paddedEle}-u.json`;
}

export function buildCandidatoFotoUrl(
  ambiente: string,
  ciclo: string,
  eleicaoCd: string,
  uf: string,
  sqcand: string
): string {
  return `https://resultados.tse.jus.br/${ambiente}/${ciclo}/${eleicaoCd}/fotos/${uf.toLowerCase()}/${sqcand}.jpeg`;
}

export async function fetchEA20(
  ambiente: string,
  ciclo: string,
  eleicaoCd: string,
  uf: string,
  cdMun: string,
  cdCargo: string,
  zona?: string
): Promise<EA20Response> {
  const url = buildEA20Url(ambiente, ciclo, eleicaoCd, uf, cdMun, cdCargo, zona);
  console.log(`[EA20 Request] ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Resultado não encontrado para este cargo/município (EA20). O arquivo pode ainda não ter sido gerado.`);
    }
    throw new Error(`Erro ao buscar resultado EA20 (${response.status})`);
  }
  return response.json();
}
