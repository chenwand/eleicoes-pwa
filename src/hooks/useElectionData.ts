import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchBRData, fetchUFData } from '../services/tseApi';
import { saveEA20Snapshot } from '../services/timelineService';
import type { UF, Turno } from '../types/election';

const POLLING_INTERVAL = 30000;

const ALL_UFS: UF[] = ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE', 'ES', 'MG', 'RJ', 'SP', 'PR', 'RS', 'SC', 'DF', 'GO', 'MT', 'MS'];

export function useBRData(turno: Turno = 1) {
  return useQuery({
    queryKey: ['election', 'br', turno],
    queryFn: async () => {
      const data = await fetchBRData(turno);
      saveEA20Snapshot(data);
      return data;
    },
    refetchInterval: POLLING_INTERVAL,
    staleTime: 10000,
  });
}

export function useUFData(uf: UF, turno: Turno = 1) {
  return useQuery({
    queryKey: ['election', uf, turno],
    queryFn: async () => {
      const data = await fetchUFData(uf, turno);
      return data;
    },
    refetchInterval: POLLING_INTERVAL,
    staleTime: 10000,
    enabled: uf !== 'BR' && uf !== 'ZZ'
  });
}

export function useAllUFData(turno: Turno = 1) {
  return useQueries({
    queries: ALL_UFS.map(uf => ({
      queryKey: ['election', uf, turno],
      queryFn: () => fetchUFData(uf, turno),
      refetchInterval: POLLING_INTERVAL,
      staleTime: 10000,
      enabled: uf !== 'BR' && uf !== 'ZZ'
    }))
  });
}
