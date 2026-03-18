import type { EA14Response } from '../types/ea14';

export async function fetchEA15(ciclo: string, eleicaoCd: string, uf: string, ambiente: string = 'oficial', host: string = 'https://resultados.tse.jus.br'): Promise<EA14Response> {
  const eleicaoFormatted = eleicaoCd.padStart(6, '0');
  const ufLower = uf.toLowerCase();

  const url = `${host}/${ambiente}/${ciclo}/${eleicaoCd}/dados/${ufLower}/${ufLower}-e${eleicaoFormatted}-ab.json`;

  console.log(`[EA15 Request] ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Arquivo de abrangência UF (${uf.toUpperCase()}) não encontrado (EA15).`);
    }
    throw new Error(`Erro ao buscar dados do arquivo EA15 (${response.status})`);
  }

  return response.json();
}
