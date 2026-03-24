import type { UF, Cargo } from '../types/election';
import type { EleicaoEA11, EA11Response, AbrangenciaEA11 } from '../types/ea11';
import type { FlatMunicipio } from '../services/ea12Service';
import { adaptStatsResponse } from './adapters/statsAdapters';

export const UF_TO_REGION: Record<string, string> = {
  'AC': 'N', 'AM': 'N', 'AP': 'N', 'PA': 'N', 'RO': 'N', 'RR': 'N', 'TO': 'N',
  'AL': 'NE', 'BA': 'NE', 'CE': 'NE', 'MA': 'NE', 'PB': 'NE', 'PE': 'NE', 'PI': 'NE', 'RN': 'NE', 'SE': 'NE',
  'ES': 'SE', 'MG': 'SE', 'RJ': 'SE', 'SP': 'SE',
  'PR': 'S', 'RS': 'S', 'SC': 'S',
  'DF': 'CO', 'GO': 'CO', 'MT': 'CO', 'MS': 'CO'
};

export const REGIONS = [
  { cd: 'BR', nm: 'Brasil', icon: '🇧🇷' },
  { cd: 'N', nm: 'Norte', icon: '🌲' },
  { cd: 'NE', nm: 'Nordeste', icon: '🌵' },
  { cd: 'SE', nm: 'Sudeste', icon: '🏢' },
  { cd: 'S', nm: 'Sul', icon: '❄️' },
  { cd: 'CO', nm: 'Centro-Oeste', icon: '🌾' },
  { cd: 'ZZ', nm: 'Exterior', icon: '🗼' }
];

export function calculateRegionTotals(localData: any, selectedRegion: string) {
  if (!localData?.abr) return null;

  if (selectedRegion === 'BR') {
    return localData.abr.find((a: any) => a.cdabr === 'br') || null;
  }

  if (selectedRegion === 'ZZ') {
    return localData.abr.find((a: any) => a.cdabr === 'zz') || null;
  }

  const ufsInRegion = localData.abr.filter((a: any) =>
    UF_TO_REGION[a.cdabr.toUpperCase()] === selectedRegion
  );

  if (ufsInRegion.length === 0) return null;

  const toSortable = (dt: string, ht: string) => {
    if (!dt) return '';
    const [d, m, y] = dt.split('/');
    return `${y}/${m}/${d} ${ht || ''}`;
  };

  const sortedByDate = [...ufsInRegion].sort((a, b) => {
    const tsA = toSortable(a.dt, a.ht);
    const tsB = toSortable(b.dt, b.ht);
    return tsB.localeCompare(tsA);
  });

  const sum = {
    cdabr: selectedRegion.toLowerCase(),
    tpabr: 'regiao',
    and: ufsInRegion.every((a: any) => a.and === 'f') ? 'f' : 'p',
    dt: sortedByDate[0].dt,
    ht: sortedByDate[0].ht,
    s: {
      ts: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.ts) || 0), 0).toString(),
      st: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.st) || 0), 0).toString(),
      pst: '',
      snt: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.snt) || 0), 0).toString(),
      si: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.si) || 0), 0).toString(),
    },
    e: {
      te: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.e.te) || 0), 0).toString(),
      c: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.e.c) || 0), 0).toString(),
      pc: '',
      a: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.e.a) || 0), 0).toString(),
      pa: '',
    },
    munf: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.munf) || 0), 0).toString(),
    munpt: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.munpt) || 0), 0).toString(),
    munnr: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.munnr) || 0), 0).toString(),
  };

  const safePct = (val: number, total: number) =>
    total > 0 ? ((val / total) * 100).toFixed(2).replace('.', ',') : '0,00';

  sum.s.pst = safePct(parseInt(sum.s.st), parseInt(sum.s.ts));
  sum.e.pc = safePct(parseInt(sum.e.c), parseInt(sum.e.te));
  sum.e.pa = safePct(parseInt(sum.e.a), parseInt(sum.e.te));

  // The output of this function goes to the UI. Since the UI assumes Phase 4B `_propNum` wrappers,
  // we adapt this synthetic region "abr" object as well.
  const adaptedTemp = adaptStatsResponse({ abr: [sum] });
  return adaptedTemp.abr[0];
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

export function findTargetElectionForTurnoSwitch(
  selectedEleicao: EleicaoEA11,
  ea11Data: EA11Response,
  selectedAbrangencia: FlatMunicipio | null
): { targetEleicao: EleicaoEA11 | undefined; shouldPreserveScope: boolean } {
  let targetCd: string | undefined;
  if (selectedEleicao.t === '1' && selectedEleicao.cdt2) {
    targetCd = selectedEleicao.cdt2;
  } else if (selectedEleicao.t === '2') {
    // Find the T1 election that points to this T2
    const t1 = ea11Data.pl.flatMap(p => p.e).find(e => e.cdt2 === selectedEleicao.cd);
    targetCd = t1?.cd;
  }

  let shouldPreserveScope = false;
  let targetEleicao: EleicaoEA11 | undefined;

  if (targetCd) {
    targetEleicao = ea11Data.pl.flatMap(p => p.e).find(e => e.cd === targetCd);
    if (targetEleicao) {
      if (selectedAbrangencia) {
        // If we are switching from T2 to T1, the geographic scope is inherently valid
        // since T2 is always a geographic subset of T1.
        if (selectedEleicao.t === '2') {
          shouldPreserveScope = true;
        } else {
          // Switching T1 to T2: need to verify if the scope participates in T2
          const isBrasil = selectedAbrangencia.ufCd.toLowerCase() === 'br';
          const targetAbr = targetEleicao.abr.find(a =>
            a.cd.toLowerCase() === (isBrasil ? 'br' : selectedAbrangencia.ufCd.toLowerCase())
          );

          if (targetAbr) {
            // If our current selection is state-wide ("Todas" as municipality) or National
            if (!selectedAbrangencia.munCdTse || isBrasil) {
              shouldPreserveScope = true;
            } else if (targetAbr.mu?.some(m => m.cd === selectedAbrangencia.munCdTse)) {
              // Specific municipality remains valid if explicitly listed in target
              shouldPreserveScope = true;
            } else if (['1', '2', '3', '5', '6', '7', '8', '9'].includes(targetEleicao.tp)) {
              // For Federal/Estadual elections, the entire UF is covered.
              // TSE often omits 'mu' lists for 1st round state-wide elections.
              // If targetAbr matches our UF, we can safely preserve the municipality scope.
              shouldPreserveScope = true;
            }
          }
        }
      }
    }
  }

  return { targetEleicao, shouldPreserveScope };
}

/**
 * Structured result from turno switch eligibility check.
 * `reason` is always populated for debugging/auditing purposes.
 */
export interface TurnoSwitchResult {
  allowed: boolean;
  reason: string;
}

/**
 * Determines whether switching turno is allowed, returning a structured result
 * with the reason for the decision.
 *
 * Rules:
 * - T2 → T1: always allowed.
 * - T1 → T2: requires all of:
 *   1. `cdt2` exists on the current election
 *   2. The target T2 election exists in EA11
 *   3. The current geographic scope is eligible in the target election's `abr[]`
 *   4. If `currentCargoCd` is provided, that cargo must exist in the
 *      target abrangência's `cp[]` (source of truth: EA11 of target election)
 *
 * @param currentCargoCd - Optional. When provided, validates that this cargo
 *   exists in the target election's `cp[]`. When absent, cargo check is skipped
 *   (safe for contexts like Header/EA14/EA15 that don't track cargo).
 */
export function getTurnoSwitchEligibility(
  selectedEleicao: EleicaoEA11 | null,
  ea11Data: EA11Response | undefined,
  selectedAbrangencia: FlatMunicipio | null,
  currentCargoCd?: string
): TurnoSwitchResult {
  if (!selectedEleicao || !ea11Data) {
    return { allowed: false, reason: 'no-election-or-ea11' };
  }

  // T2 → T1: always possible
  if (selectedEleicao.t === '2') {
    return { allowed: true, reason: 't2-to-t1' };
  }

  // T1 without a linked T2: no switch possible
  if (!selectedEleicao.cdt2) {
    return { allowed: false, reason: 'no-cdt2' };
  }

  // Find the target T2 election in EA11
  const targetEleicao = ea11Data.pl.flatMap(p => p.e).find(e => e.cd === selectedEleicao.cdt2);
  if (!targetEleicao) {
    return { allowed: false, reason: 'target-election-not-found' };
  }

  // --- Geographic eligibility ---

  // No abrangência selected or BR-wide: eligible geographically
  const isBr = !selectedAbrangencia || selectedAbrangencia.ufCd.toLowerCase() === 'br';

  let targetAbr: AbrangenciaEA11 | undefined;

  if (!isBr) {
    // UF-wide scope: check if the UF exists in target's abr
    targetAbr = targetEleicao.abr.find(a =>
      a.cd.toLowerCase() === selectedAbrangencia.ufCd.toLowerCase()
    );
    if (!targetAbr) {
      return { allowed: false, reason: 'uf-not-in-target' };
    }

    // Municipality scope: check if it exists in target's abr[].mu[]
    if (selectedAbrangencia.munCdTse) {
      const munFound = targetAbr.mu?.some(m => m.cd === selectedAbrangencia.munCdTse);
      if (!munFound) {
        // For federal/estadual election types, TSE often omits the mu list.
        // If the UF itself exists in abr, the municipality is implicitly covered.
        if (!['1', '2', '5', '6', '8', '9'].includes(targetEleicao.tp)) {
          return { allowed: false, reason: 'municipio-not-in-target' };
        }
      }
    }
  }

  // --- Cargo eligibility (only when currentCargoCd is provided) ---
  if (currentCargoCd) {
    // Determine which abrangência to use for cargo lookup:
    // - If we already resolved a specific UF abrangência, use it
    // - For BR scope, use the 'br' abrangência from the target election
    const cargoAbr = targetAbr ?? targetEleicao.abr.find(a => a.cd.toLowerCase() === 'br');

    if (cargoAbr?.cp) {
      const cargoExists = cargoAbr.cp.some(cp => cp.cd === currentCargoCd);
      if (!cargoExists) {
        return { allowed: false, reason: 'cargo-not-in-target-turno' };
      }
    }
    // If cp is absent on the abrangência, we can't validate → allow (fail-open)
  }

  return { allowed: true, reason: 'eligible' };
}

/**
 * Convenience boolean wrapper around `getTurnoSwitchEligibility`.
 * Used by ElectionContext for the global `turnoSwitchAllowed` flag.
 *
 * @param currentCargoCd - Optional cargo code for cargo-aware check.
 */
export function canSwitchTurno(
  selectedEleicao: EleicaoEA11 | null,
  ea11Data: EA11Response | undefined,
  selectedAbrangencia: FlatMunicipio | null,
  currentCargoCd?: string
): boolean {
  return getTurnoSwitchEligibility(selectedEleicao, ea11Data, selectedAbrangencia, currentCargoCd).allowed;
}
