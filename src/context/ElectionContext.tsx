import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA11 } from '../services/ea11Service';
import { useEnvironment } from './EnvironmentContext';
import type { EleicaoEA11, EA11Response } from '../types/ea11';
import type { FlatMunicipio } from '../services/ea12Service';

interface ElectionContextType {
  selectedEleicao: EleicaoEA11 | null;
  selectedAbrangencia: FlatMunicipio | null;
  selectedZona: string;
  ciclo: string;
  ea11Data: EA11Response | undefined;
  isEA11Loading: boolean;
  isEA11Fetching: boolean;
  
  // Actions
  selectEleicao: (eleicao: EleicaoEA11, ciclo: string) => void;
  selectAbrangencia: (mun: FlatMunicipio) => void;
  setZona: (zona: string) => void;
  clearSelection: () => void;
  switchTurno: () => void;
  refetchEA11: () => Promise<any>;
  updateEA11Data: (data: EA11Response) => void;
  
  // Derived state
  isOrdinary: boolean;
  hasSelection: boolean;
}

const ElectionContext = createContext<ElectionContextType | undefined>(undefined);

export function ElectionProvider({ children }: { children: ReactNode }) {
  const { ambiente, host } = useEnvironment();
  
  const { data: ea11Data, isLoading: isEA11Loading, isFetching: isEA11Fetching, refetch: refetchEA11 } = useQuery({
    queryKey: ['ea11-config', ambiente, host],
    queryFn: () => fetchEA11(ambiente, host),
  });

  const [editedEA11Data, setEditedEA11Data] = useState<EA11Response | null>(null);

  useEffect(() => {
    if (ea11Data) setEditedEA11Data(null);
  }, [ea11Data]);

  const displayEA11Data = editedEA11Data || ea11Data;

  const [selectedEleicao, setSelectedEleicao] = useState<EleicaoEA11 | null>(() => {
    const stored = localStorage.getItem('selected-eleicao');
    return stored ? JSON.parse(stored) : null;
  });
  
  const [selectedAbrangencia, setSelectedAbrangencia] = useState<FlatMunicipio | null>(() => {
    const stored = localStorage.getItem('selected-abrangencia');
    return stored ? JSON.parse(stored) : null;
  });
  
  const [selectedZona, setSelectedZona] = useState<string>(() => {
    return localStorage.getItem('selected-zona') || 'Todas';
  });
  
  const [ciclo, setCiclo] = useState<string>(() => {
    return localStorage.getItem('selected-ciclo') || '';
  });

  useEffect(() => {
    if (selectedEleicao) localStorage.setItem('selected-eleicao', JSON.stringify(selectedEleicao));
    else localStorage.removeItem('selected-eleicao');
  }, [selectedEleicao]);

  useEffect(() => {
    if (selectedAbrangencia) localStorage.setItem('selected-abrangencia', JSON.stringify(selectedAbrangencia));
    else localStorage.removeItem('selected-abrangencia');
  }, [selectedAbrangencia]);

  useEffect(() => {
    localStorage.setItem('selected-zona', selectedZona);
  }, [selectedZona]);

  useEffect(() => {
    localStorage.setItem('selected-ciclo', ciclo);
  }, [ciclo]);

  const selectEleicao = (eleicao: EleicaoEA11, newCiclo: string) => {
    setSelectedEleicao(eleicao);
    setCiclo(newCiclo);
    if (selectedEleicao?.cd !== eleicao.cd) {
      setSelectedAbrangencia(null);
      setSelectedZona('Todas');
    }
  };

  const selectAbrangencia = (mun: FlatMunicipio) => {
    setSelectedAbrangencia(mun);
    setSelectedZona('Todas');
  };

  const setZona = (zona: string) => {
    setSelectedZona(zona);
  };

  const clearSelection = () => {
    setSelectedEleicao(null);
    setSelectedAbrangencia(null);
    setSelectedZona('Todas');
    setCiclo('');
  };

  const switchTurno = () => {
    if (!selectedEleicao || !ea11Data) return;
    
    let targetCd: string | undefined;
    if (selectedEleicao.t === '1' && selectedEleicao.cdt2) {
      targetCd = selectedEleicao.cdt2;
    } else if (selectedEleicao.t === '2') {
      // Find the T1 election that points to this T2
      const t1 = ea11Data.pl.flatMap(p => p.e).find(e => e.cdt2 === selectedEleicao.cd);
      targetCd = t1?.cd;
    }

    if (targetCd) {
      const targetEleicao = ea11Data.pl.flatMap(p => p.e).find(e => e.cd === targetCd);
      if (targetEleicao) {
        selectEleicao(targetEleicao, ea11Data.c);
      }
    }
  };

  const isOrdinary = selectedEleicao ? ['1', '3', '8'].includes(selectedEleicao.tp) : false;
  const hasSelection = !!selectedEleicao;

  return (
    <ElectionContext.Provider value={{
      selectedEleicao,
      selectedAbrangencia,
      selectedZona,
      ciclo,
      ea11Data: displayEA11Data,
      isEA11Loading,
      isEA11Fetching,
      selectEleicao,
      selectAbrangencia,
      setZona,
      clearSelection,
      switchTurno,
      refetchEA11,
      updateEA11Data: setEditedEA11Data,
      isOrdinary,
      hasSelection
    }}>
      {children}
    </ElectionContext.Provider>
  );
}

export function useElection() {
  const context = useContext(ElectionContext);
  if (context === undefined) {
    throw new Error('useElection must be used within an ElectionProvider');
  }
  return context;
}
