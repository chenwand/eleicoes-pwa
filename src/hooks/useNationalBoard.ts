import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useElection } from '../context/ElectionContext';
import { useEnvironment } from '../context/EnvironmentContext';
import { fetchEA20 } from '../services/ea20Service';
import { fetchEA12 } from '../services/ea12Service';
import { adaptEA20Response } from '../utils/adapters/ea20Adapters';
import { extractUFSummary, type UFSummary } from '../utils/nationalBoardUtils';
import { getUFName } from '../utils/electionUtils';
import { type UF } from '../types/election';

interface UseNationalBoardOptions {
  enabled?: boolean;
  cargoCd?: string;
}

export function useNationalBoard({ enabled = true, cargoCd }: UseNationalBoardOptions = {}) {
  const { ambiente, host } = useEnvironment();
  const { selectedEleicao, ciclo } = useElection();

  // 1. Identificar o cargo alvo
  const targetCargoCode = useMemo(() => {
    const defaultMajoritarios = ['1', '3', '5'];
    
    // Lista de cargos REALMENTE disponíveis nesta eleição (majoritários)
    const trulyAvailable = selectedEleicao?.abr.flatMap(a => a.cp?.map(c => c.cd) || []) || [];
    const availableMajoritarios = [...new Set(trulyAvailable)].filter(c => defaultMajoritarios.includes(c));

    // Se o cargoCd do usuário for válido para esta eleição, use-o
    if (cargoCd && availableMajoritarios.includes(cargoCd)) return cargoCd;
    
    if (!selectedEleicao) return '1';
    
    // Fallback: Prioridade Presidente > Governador > Senador dentro dos disponíveis
    if (availableMajoritarios.includes('1')) return '1';
    if (availableMajoritarios.includes('3')) return '3';
    if (availableMajoritarios.includes('5')) return '5';
    
    // Fallback absoluto se nada bater (não deveria ocorrer com majoritários)
    return availableMajoritarios[0] || '1';
  }, [cargoCd, selectedEleicao]);

  console.log(`[NationalBoard] Target Cargo: ${targetCargoCode}, isNational: ${selectedEleicao?.abr.some(a => a.cd.toLowerCase() === 'br')}`);

  const isPresidente = targetCargoCode === '1';

  // 2. Buscar EA12 se for eleição nacional (BR no EA11)
  const isNational = useMemo(() => {
    return selectedEleicao?.abr.some(a => a.cd.toLowerCase() === 'br') ?? false;
  }, [selectedEleicao]);

  const { data: ea12Data, isLoading: isEA12Loading } = useQuery({
    queryKey: ['ea12-config', ambiente, ciclo, selectedEleicao?.cd],
    queryFn: () => fetchEA12(ciclo, selectedEleicao!.cd, ambiente, host),
    enabled: enabled && isNational && !!selectedEleicao && !!ciclo,
    staleTime: Infinity, // Configurações mudam raramente
  });

  // 3. Determinar lista de UFs para carregar
  const ufsToFetch = useMemo(() => {
    const list: UF[] = [];
    if (!selectedEleicao) return list;

    if (isNational) {
        // Se for nacional (tem 'BR' no EA11), sempre usar EA12 para descobrir UFs participantes
        if (isPresidente) {
            list.push('BR' as UF);
        }
        if (ea12Data) {
            ea12Data.abr.forEach(abr => {
                const ufCd = abr.cd.toUpperCase();
                if (ufCd !== 'BR' && ufCd !== 'ZZ') {
                    list.push(ufCd as UF);
                }
            });
            // ZZ (Exterior) apenas se for Presidente (1)
            if (isPresidente && ea12Data.abr.some(a => a.cd.toLowerCase() === 'zz')) {
                list.push('ZZ' as UF);
            }
        }
    } else {
        // Regra para outros cargos ou se não for nacional: seguir EA11.abr
        selectedEleicao.abr.forEach(abr => {
            const ufCdLower = abr.cd.toLowerCase();
            if (ufCdLower === 'br') return; 

            const hasCargo = abr.cp ? abr.cp.some(c => c.cd === targetCargoCode) : true;
            if (hasCargo) {
                list.push(abr.cd.toUpperCase() as UF);
            }
        });
    }
    console.log(`[NationalBoard] UFs to fetch: ${list.length}`, list);
    return list;
  }, [selectedEleicao, isPresidente, isNational, ea12Data, targetCargoCode]);

  // 4. Executar queries em paralelo
  const results = useQueries({
    queries: ufsToFetch.map(uf => ({
      queryKey: ['ea20-national', ambiente, ciclo, selectedEleicao?.cd, uf, targetCargoCode],
      queryFn: () => fetchEA20(
        ambiente,
        ciclo,
        selectedEleicao!.cd,
        uf.toLowerCase(),
        '00000',
        targetCargoCode,
        undefined,
        host
      ),
      enabled: enabled && !!selectedEleicao && !!ciclo && (!isNational || !!ea12Data),
      select: (data: any) => {
        const adapted = adaptEA20Response(data);
        return extractUFSummary(adapted, uf, getUFName(uf));
      },
      staleTime: Infinity, 
      retry: 1,
      refetchOnWindowFocus: false,
    }))
  });

  const allDataWithResults = results
    .map((r, index) => {
      const uf = ufsToFetch[index];
      const data = r.data;
      if (data) return { data, refetch: r.refetch, isLoading: r.isLoading, isError: r.isError };
      if (r.isError) return { 
        data: { 
          cd: uf, 
          nm: getUFName(uf), 
          pstNum: 0,
          tf: false,
          md: null,
          esae: false,
          top2: [], 
          error: true 
        } as UFSummary,
        refetch: r.refetch,
        isLoading: r.isLoading,
        isError: r.isError
      };
      return { data: null, refetch: r.refetch, isLoading: r.isLoading, isError: r.isError };
    })
    .filter((res) => res.data !== null);

  const brResult = allDataWithResults.find(r => r.data?.cd === 'BR');
  const ufResults = allDataWithResults
    .filter(r => r.data?.cd !== 'BR')
    .sort((a, b) => (b.data?.pstNum || 0) - (a.data?.pstNum || 0));

  return {
    data: ufResults.map(r => r.data as UFSummary),
    ufResults,
    brData: brResult?.data as UFSummary | undefined,
    brRefetch: brResult?.refetch,
    refetchAll: () => {
      results.forEach(r => r.refetch());
    },
    isPresidente,
    isLoading: enabled && (isEA12Loading || results.some(r => r.isLoading && !r.data)),
    isError: enabled && results.length > 0 && results.every(r => r.isError && !r.data),
  };
}
