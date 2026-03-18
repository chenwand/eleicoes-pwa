import type { ElectionData, UF, Turno, Cargo } from '../types/election';

const TSE_BASE_URL = 'https://resultados.tse.jus.br/oficial';

const CARGO_CODES: Record<Cargo, string> = {
  'presidente': '0001',
  'governador': '0003',
  'senador': '0005',
  'deputado-federal': '0011',
  'deputado-estadual': '0013',
  'vereador': '0015'
};

const ELEICAO_CODE = '619';

export function buildElectionURL(
  uf: UF,
  cargo: Cargo
): string {
  const cargoCode = CARGO_CODES[cargo];
  const ufCode = uf === 'BR' ? 'br' : uf.toLowerCase();
  
  return `${TSE_BASE_URL}/ele${ELEICAO_CODE}/${ufCode}-c${cargoCode}-e000000000-u.json`;
}

export function buildUFURL(uf: UF, _turno?: Turno): string {
  return buildElectionURL(uf, 'presidente');
}

export function buildBRURL(_turno?: Turno): string {
  return buildElectionURL('BR', 'presidente');
}

export async function fetchElectionData(url: string): Promise<ElectionData> {
  console.log(`[TSE API Request] ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch election data: ${response.status}`);
  }
  return response.json();
}

export async function fetchBRData(_turno?: Turno): Promise<ElectionData> {
  return fetchElectionData(buildBRURL(_turno));
}

export async function fetchUFData(uf: UF, _turno?: Turno): Promise<ElectionData> {
  return fetchElectionData(buildUFURL(uf, _turno));
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
