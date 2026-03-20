import type { ElectionData, UF, Turno, Cargo } from '../types/election';
import { DEFAULT_TSE_HOST } from './config';

const CARGO_CODES: Record<Cargo, string> = {
  'presidente': '0001',
  'governador': '0003',
  'senador': '0005',
  'deputado-federal': '0011',
  'deputado-estadual': '0013',
  'vereador': '0015'
};

export function buildElectionURL(
  ciclo: string,
  eleicaoCd: string,
  ambiente: string,
  uf: UF,
  cargo: Cargo
): string {
  const cargoCode = CARGO_CODES[cargo];
  const ufCode = uf.toLowerCase();
  const paddedCd = eleicaoCd.padStart(6, '0');
  
  return `${DEFAULT_TSE_HOST}/${ambiente}/${ciclo}/${eleicaoCd}/dados/${ufCode}/${ufCode}-c${cargoCode}-e${paddedCd}-u.json`;
}

export function buildUFURL(ciclo: string, eleicaoCd: string, ambiente: string, uf: UF, _turno?: Turno): string {
  return buildElectionURL(ciclo, eleicaoCd, ambiente, uf, 'presidente');
}

export function buildBRURL(ciclo: string, eleicaoCd: string, ambiente: string, _turno?: Turno): string {
  return buildElectionURL(ciclo, eleicaoCd, ambiente, 'BR', 'presidente');
}

export async function fetchElectionData(url: string): Promise<ElectionData> {
  console.log(`[TSE API Request] ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch election data: ${response.status}`);
  }
  return response.json();
}

export async function fetchBRData(ciclo: string, eleicaoCd: string, ambiente: string, _turno?: Turno): Promise<ElectionData> {
  return fetchElectionData(buildBRURL(ciclo, eleicaoCd, ambiente, _turno));
}

export async function fetchUFData(uf: UF, ciclo: string, eleicaoCd: string, ambiente: string, _turno?: Turno): Promise<ElectionData> {
  return fetchElectionData(buildUFURL(ciclo, eleicaoCd, ambiente, uf, _turno));
}


export function getCargoName(cargo: Cargo): string {
  const names: Record<Cargo, string> = {
    'presidente': 'Presidente',
    'governador': 'Governador',
    'senador': 'Senador',
    'deputado-federal': 'Deputado Federal',
    'deputado-estadual': 'Deputado Estadual',
    'vereador': 'Vereador'
  };
  return names[cargo];
}

export function getUFName(uf: UF): string {
  const names: Record<UF, string> = {
    AC: 'Acre', AM: 'Amazonas', AP: 'Amapá', PA: 'Pará', RO: 'Rondônia', RR: 'Roraima', TO: 'Tocantins',
    AL: 'Alagoas', BA: 'Bahia', CE: 'Ceará', MA: 'Maranhão', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', RN: 'Rio Grande do Norte', SE: 'Sergipe',
    ES: 'Espírito Santo', MG: 'Minas Gerais', RJ: 'Rio de Janeiro', SP: 'São Paulo',
    PR: 'Paraná', RS: 'Rio Grande do Sul', SC: 'Santa Catarina',
    DF: 'Distrito Federal', GO: 'Goiás', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
    BR: 'Brasil', ZZ: 'Exterior'
  };
  return names[uf];
}
