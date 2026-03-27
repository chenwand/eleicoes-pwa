import type { UI_EA20Response } from './adapters/ea20Adapters';
import { UF_TO_REGION } from './electionUtils';

export interface CandidateSummary {
  id: string;
  nm: string;
  v: number;            // Votos nominais (exibição amigável)
  pvap: number;         // % de votos válidos
  st: 'eleito' | 'nao-eleito';
  dvt: 'valido' | 'anulado' | 'sub-judice';
}

export interface UFSummary {
  cd: string;           // Sigla da UF
  nm: string;           // Nome amigável
  pstNum: number;       // % de seções totalizadas
  tf: boolean;          // Totalização final
  md: 'e' | 's' | null;  // Matematicamente Definido
  esae: boolean;        // Sem atribuição de eleitos
  top2: CandidateSummary[];
  leadDiff?: number;     // Diferença entre top1.pvap e top2.pvap
  error?: boolean;      // Flag de falha no carregamento
}

export interface NationalSummary {
  vitoriasPorCandidato: Record<string, { 
    nm: string; 
    vitorias: number;
    ufVitorias: { 
      uf: string; 
      pvap: number;
      tf: boolean;
      md: 'e' | 's' | null;
      esae: boolean;
    }[]; 
  }>;
  vitoriasPorRegiao: Record<string, Record<string, number>>; // Regiao -> CandidateID -> Count
}

/**
 * Calcula a diferença entre o primeiro e o segundo candidato com proteção contra NaN
 */
export function calculateLeadDiff(top2: CandidateSummary[]): number | undefined {
  if (top2.length < 2) return undefined;
  const diff = top2[0].pvap - top2[1].pvap;
  return isFinite(diff) ? Number(diff.toFixed(2)) : undefined;
}

/**
 * Extrai os dados essenciais de uma resposta EA20 para o Quadro Nacional
 */
export function extractUFSummary(response: UI_EA20Response, ufCd: string, ufNome: string): UFSummary {
  const cargo = response.carg?.[0];
  const candidates: CandidateSummary[] = [];
  
  if (cargo) {
    cargo.agr.forEach(agr => {
      agr.par.forEach(par => {
        par.cand.forEach(cand => {
          candidates.push({
            id: cand.sqcand,
            nm: cand.nmu,
            v: cand._vapNum,
            pvap: cand._pvapNum,
            st: cand._adaptedSt,
            dvt: cand._adaptedDvt
          });
        });
      });
    });
  }

  // Ordenar por votos e pegar top 2
  const top2 = candidates
    .sort((a, b) => b.pvap - a.pvap)
    .slice(0, 2);

  return {
    cd: ufCd,
    nm: ufNome,
    pstNum: response.s?._pstNum || 0,
    tf: response.tf === 's',
    md: (response.md as 'e' | 's') || null,
    esae: response.esae === 's',
    top2,
    leadDiff: calculateLeadDiff(top2)
  };
}

/**
 * Calcula o resumo nacional (Presidente) com vitórias por UF e Região
 */
export function buildNationalSummary(ufs: UFSummary[]): NationalSummary {
  const vitoriasPorCandidato: NationalSummary['vitoriasPorCandidato'] = {};
  const vitoriasPorRegiao: Record<string, Record<string, number>> = {};

  ufs.forEach(uf => {
    if (uf.cd === 'BR' || uf.error || uf.top2.length === 0) return;

    const winner = uf.top2[0];
    const region = UF_TO_REGION[uf.cd.toUpperCase()];

    // UF Count and Details
    if (!vitoriasPorCandidato[winner.id]) {
      vitoriasPorCandidato[winner.id] = { nm: winner.nm, vitorias: 0, ufVitorias: [] };
    }
    vitoriasPorCandidato[winner.id].vitorias += 1;
    vitoriasPorCandidato[winner.id].ufVitorias.push({ 
      uf: uf.cd, 
      pvap: winner.pvap,
      tf: uf.tf,
      md: uf.md,
      esae: uf.esae
    });

    // Region Count
    if (region) {
      if (!vitoriasPorRegiao[region]) vitoriasPorRegiao[region] = {};
      vitoriasPorRegiao[region][winner.id] = (vitoriasPorRegiao[region][winner.id] || 0) + 1;
    }
  });

  return {
    vitoriasPorCandidato,
    vitoriasPorRegiao
  };
}
