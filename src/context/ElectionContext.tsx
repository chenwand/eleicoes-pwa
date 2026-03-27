import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA11 } from '../services/ea11Service';
import { useEnvironment } from './EnvironmentContext';
import { findTargetElectionForTurnoSwitch, canSwitchTurno as checkCanSwitchTurno, getTurnoSwitchEligibility } from '../utils/electionUtils';
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
  selectEleicao: (eleicao: EleicaoEA11, ciclo: string, preserveScope?: boolean) => void;
  selectAbrangencia: (mun: FlatMunicipio | null) => void;
  setZona: (zona: string) => void;
  clearSelection: () => void;
  switchTurno: () => void;
  refetchEA11: () => Promise<any>;
  updateEA11Data: (data: EA11Response) => void;
  setEA11Required: (required: boolean) => void;

  // Derived state
  isOrdinary: boolean;
  hasSelection: boolean;
  turnoSwitchAllowed: boolean;
}

const ElectionContext = createContext<ElectionContextType | undefined>(undefined);

export function ElectionProvider({ children }: { children: ReactNode }) {
  const { ambiente, host } = useEnvironment();

  const [isEA11Required, setEA11Required] = useState(() => {
    // Enable automatically if we have a deep link or existing selection
    const hasDeepLink = window.location.search.includes('e=');
    return hasDeepLink;
  });
  
  const { data: ea11Data, isLoading: isEA11Loading, isFetching: isEA11Fetching, refetch: refetchEA11 } = useQuery({
    queryKey: ['ea11-config', ambiente, host],
    queryFn: () => fetchEA11(ambiente, host),
    enabled: isEA11Required,
    staleTime: Infinity, // Prevent "toda hora" fetching as requested
  });

  const [editedEA11Data, setEditedEA11Data] = useState<EA11Response | null>(null);

  useEffect(() => {
    if (ea11Data) setEditedEA11Data(null);
  }, [ea11Data, ambiente, host]);

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

  const selectEleicao = (eleicao: EleicaoEA11, newCiclo: string, preserveScope = false) => {
    setSelectedEleicao(eleicao);
    setCiclo(newCiclo);
    if (!preserveScope && selectedEleicao?.cd !== eleicao.cd) {
      setSelectedAbrangencia(null);
      setSelectedZona('Todas');
    }
  };

  const selectAbrangencia = (mun: FlatMunicipio | null) => {
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

  const [prevEnv, setPrevEnv] = useState(`${ambiente}-${host}`);
  useEffect(() => {
    const currentEnv = `${ambiente}-${host}`;
    if (prevEnv !== currentEnv) {
      clearSelection();
      setPrevEnv(currentEnv);
    }
  }, [ambiente, host, prevEnv]);

  const switchTurno = () => {
    if (!selectedEleicao || !ea11Data) return;

    // Defensive guard: block switch if eligibility check fails
    const eligibility = getTurnoSwitchEligibility(selectedEleicao, ea11Data, selectedAbrangencia);
    if (!eligibility.allowed) {
      console.warn('[switchTurno] Switch blocked:', eligibility.reason);
      return;
    }

    const { targetEleicao, shouldPreserveScope } = findTargetElectionForTurnoSwitch(
      selectedEleicao,
      ea11Data,
      selectedAbrangencia
    );

    if (targetEleicao) {
      selectEleicao(targetEleicao, ea11Data.c, shouldPreserveScope);
    }
  };

  const isOrdinary = selectedEleicao ? ['1', '3', '8'].includes(selectedEleicao.tp) : false;
  const hasSelection = !!selectedEleicao;
  const turnoSwitchAllowed = checkCanSwitchTurno(selectedEleicao, displayEA11Data, selectedAbrangencia);

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
      setEA11Required,
      isOrdinary,
      hasSelection,
      turnoSwitchAllowed
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
