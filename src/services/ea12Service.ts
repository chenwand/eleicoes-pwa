import type { EA12Response } from '../types/ea12';

// Pad o código da eleição com zeros à esquerda até atingir 6 caracteres
function formatCodigoEleicao(cd: string): string {
  return cd.padStart(6, '0');
}

export async function fetchEA12(ciclo: string, cdEleicao: string): Promise<EA12Response> {
  const paddedCd = formatCodigoEleicao(cdEleicao);
  const url = `https://resultados.tse.jus.br/oficial/${ciclo}/${cdEleicao}/config/mun-e${paddedCd}-cm.json`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch EA12 for election ${cdEleicao} (Status: ${response.status})`);
  }

  const data = await response.json();
  return data as EA12Response;
}

// Helper para transformar as abrangências do EA12 em uma lista plana para a Combobox
export interface FlatMunicipio {
  ufCd: string;
  ufNome: string;
  munCdTse: string;
  munNome: string;
  isCapital: boolean;
  z: string[];
}

export function flattenEA12Municipios(ea12: EA12Response): FlatMunicipio[] {
  const result: FlatMunicipio[] = [];
  
  ea12.abr.forEach(uf => {
    // Se uf for 'br', 'zz' ou similar, podemos ter tratamentos específicos.
    uf.mu.forEach(mun => {
      result.push({
        ufCd: uf.cd.toUpperCase(),
        ufNome: uf.ds,
        munCdTse: mun.cd,
        munNome: mun.nm,
        isCapital: mun.c === 's',
        z: mun.z
      });
    });
  });

  // Ordena por Nome da UF e depois Município alfabeticamente
  return result.sort((a, b) => {
    if (a.ufNome !== b.ufNome) {
      return a.ufNome.localeCompare(b.ufNome);
    }
    return a.munNome.localeCompare(b.munNome);
  });
}
