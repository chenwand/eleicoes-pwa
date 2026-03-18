import type { EA14Response } from '../types/ea14';

export async function fetchEA14(ciclo: string, eleicaoCd: string, ambiente: string = 'oficial', host: string = 'https://resultados.tse.jus.br'): Promise<EA14Response> {
  // Ajuste do código da eleição com preenchimento de zeros para bater com o padrão de arquivos
  const eleicaoFormatted = eleicaoCd.padStart(6, '0');

  // URL base oficial de onde obtemos os JSON do TSE
  const url = `${host}/${ambiente}/${ciclo}/${eleicaoCd}/dados/br/br-e${eleicaoFormatted}-ab.json`;

  console.log(`[EA14 Request] ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Arquivo de abrangência não encontrado (EA14). O arquivo ainda não pode ter sido gerado para esta eleição.`);
    }
    throw new Error(`Erro ao buscar dados do arquivo EA14 (${response.status})`);
  }

  return response.json();
}
