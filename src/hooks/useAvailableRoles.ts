import { useMemo } from 'react';
import type { EleicaoEA11 } from '../types/ea11';
import type { FlatMunicipio } from '../services/ea12Service';

export function useAvailableRoles(
  selectedEleicao: EleicaoEA11 | null,
  selectedAbrangencia: FlatMunicipio | null
) {
  return useMemo(() => {
    if (!selectedEleicao?.abr) return [];
    const uf = selectedAbrangencia?.ufCd?.toUpperCase() || '';

    // Flatten all cargos from all abrangências
    const allCargos = selectedEleicao.abr.flatMap(a => a.cp || []).map(cp => ({ cd: cp.cd, nm: cp.ds }));
    const seen = new Set();

    return allCargos.filter(c => {
      // Rule: Deputado Distrital (8) is DF only. Deputado Estadual (7) is non-DF only.
      if (uf) {
        if (c.cd === '8' && uf !== 'DF') return false;
        if (c.cd === '7' && uf === 'DF') return false;
      }

      const duplicate = seen.has(c.cd);
      seen.add(c.cd);
      return !duplicate;
    });
  }, [selectedEleicao, selectedAbrangencia]);
}
