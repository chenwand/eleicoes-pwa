import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchBRData, fetchUFData } from '../services/tseApi';
import type { UF, Turno } from '../types/election';

const POLLING_INTERVAL = 30000;

const ALL_UFS: UF[] = ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE', 'ES', 'MG', 'RJ', 'SP', 'PR', 'RS', 'SC', 'DF', 'GO', 'MT', 'MS'];

export function useBRData(ciclo: string, eleicaoCd: string, ambiente: string, turno: Turno = 1) {
  return useQuery({
    queryKey: ['election', 'br', ciclo, eleicaoCd, ambiente, turno],
    queryFn: () => fetchBRData(ciclo, eleicaoCd, ambiente, turno),
    refetchInterval: POLLING_INTERVAL,
    staleTime: 10000,
    enabled: !!ciclo && !!eleicaoCd,
  });
}

export function useUFData(uf: UF, ciclo: string, eleicaoCd: string, ambiente: string, turno: Turno = 1) {
  return useQuery({
    queryKey: ['election', uf, ciclo, eleicaoCd, ambiente, turno],
    queryFn: () => fetchUFData(uf, ciclo, eleicaoCd, ambiente, turno),
    refetchInterval: POLLING_INTERVAL,
    staleTime: 10000,
    enabled: !!ciclo && !!eleicaoCd && uf !== 'BR' && uf !== 'ZZ'
  });
}

export function useAllUFData(ciclo: string, eleicaoCd: string, ambiente: string, turno: Turno = 1) {
  return useQueries({
    queries: ALL_UFS.map(uf => ({
      queryKey: ['election', uf, ciclo, eleicaoCd, ambiente, turno],
      queryFn: () => fetchUFData(uf, ciclo, eleicaoCd, ambiente, turno),
      refetchInterval: POLLING_INTERVAL,
      staleTime: 10000,
      enabled: !!ciclo && !!eleicaoCd && uf !== 'BR' && uf !== 'ZZ'
    }))
  });
}

