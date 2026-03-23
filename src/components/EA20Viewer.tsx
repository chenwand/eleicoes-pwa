import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA12, flattenEA12Municipios } from '../services/ea12Service';
import { fetchEA20 } from '../services/ea20Service';
import { validateEA20 } from '../services/ea20Validator';
import { useEnvironment } from '../context/EnvironmentContext';
import { useElection } from '../context/ElectionContext';

import type { EA20Response } from '../types/ea20';
import { adaptEA20Response, type UI_EA20Response, type UI_EA20Cargo, type UI_EA20Candidato, type UI_EA20Agrupamento, type UI_EA20Partido } from '../utils/adapters/ea20Adapters';

import { renderHighlightedJson } from './ea20/utils';
import { VoteVisualization } from './ea20/VoteVisualization';
import { SecoesSummary, EleitoresSummary } from './ea20/SummaryCards';
import { CandCard } from './ea20/CandidateCards';
import { RespostaCard } from './ea20/RespostaCard';

export function EA20Viewer({
  ciclo,
  eleicaoCd,
  uf,
  cdMun,
  munNome,
  cargosDisponiveis = [],
  initialZona,
  onBack,
  initialLocalData
}: {
  ciclo?: string;
  eleicaoCd?: string;
  uf?: string;
  cdMun?: string;
  munNome?: string;
  cargosDisponiveis?: { cd: string; nm: string }[];
  initialZona?: string;
  onBack: () => void;
  initialLocalData?: EA20Response;
}) {
  const { ambiente, host } = useEnvironment();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedCargoIdx, setSelectedCargoIdx] = useState(0);
  const [selectedPerguntaIdx, setSelectedPerguntaIdx] = useState(0);
  const [showZonaSelector, setShowZonaSelector] = useState(false);
  const [selectedZona, setSelectedZona] = useState<string | undefined>(initialZona);
  const [showRawJson, setShowRawJson] = useState(false);
  const [localData, setLocalData] = useState<UI_EA20Response | null>(initialLocalData ? adaptEA20Response(initialLocalData) : null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [previousData, setPreviousData] = useState<UI_EA20Response | null>(null);

  // Advanced search/filter/sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fav' | 'eleitos' | 'valido' | 'legenda' | 'anulado' | 'subjudice'>('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'votos' | 'nome' | 'partido' | 'eleito' | 'idade'>('votos');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [validationExpanded, setValidationExpanded] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const key = (ciclo && eleicaoCd) ? `fav_cand_${ciclo}_${eleicaoCd}` : null;
    if (!key) return;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setFavorites(new Set(JSON.parse(saved))); } catch (e) { console.error(e); }
    }
  }, [ciclo, eleicaoCd]);

  const toggleFavorite = (sqcand: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(sqcand)) newFavs.delete(sqcand);
    else newFavs.add(sqcand);
    setFavorites(newFavs);
    localStorage.setItem(`fav_cand_${ciclo}_${eleicaoCd}`, JSON.stringify(Array.from(newFavs)));
  };

  const { data: ea12Data } = useQuery({
    queryKey: ['ea12-data', ciclo, eleicaoCd, ambiente, host],
    queryFn: () => fetchEA12(ciclo!, eleicaoCd!, ambiente, host),
    enabled: !!eleicaoCd && !!ciclo && !initialLocalData,
    staleTime: Infinity,
  });

  const availableZones = useMemo(() => {
    if (!ea12Data || !cdMun) return [];
    const mun = flattenEA12Municipios(ea12Data).find(m => m.munCdTse === cdMun);
    return mun?.z || [];
  }, [ea12Data, cdMun]);

  // Use the first available cargo to load
  const selectedCargo = cargosDisponiveis[selectedCargoIdx];

  const { data: ea20Data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['ea20', ciclo, eleicaoCd, uf, cdMun, selectedCargo?.cd, selectedZona, ambiente, host],
    queryFn: () => fetchEA20(ambiente, ciclo!, eleicaoCd!, uf!, cdMun!, selectedCargo!.cd, selectedZona, host),
    select: adaptEA20Response,
    enabled: !!selectedCargo && !!ciclo && !initialLocalData && (cdMun === "" || !!cdMun),
    staleTime: 30000,
  });

  // Robust reset whenever parameters change to prevent cross-context trending
  useEffect(() => {
    if (!initialLocalData) {
      setLocalData(null);
      setPreviousData(null);
      setIsModified(false);
      setIsEditing(false);
    }
  }, [ciclo, eleicaoCd, uf, cdMun, selectedCargoIdx, setSelectedZona, ambiente, host, initialLocalData]);

  useEffect(() => {
    if (ea20Data) {
      if (localData && localData !== ea20Data) {
        // Double check same context before setting previousData (fallback)
        const sameEle = localData.ele === ea20Data.ele;
        const sameAbr = localData.cdabr === ea20Data.cdabr;
        const sameCargo = localData.carg?.[0]?.cd === ea20Data.carg?.[0]?.cd;
        const samePerg = localData.perg?.[0]?.cd === ea20Data.perg?.[0]?.cd;

        if (sameEle && sameAbr && (sameCargo || samePerg)) {
          setPreviousData(localData);
        }
      }
      setLocalData(ea20Data);
    }
  }, [ea20Data]);

  const validationResults = useMemo(() => {
    if (!localData) return [];
    return validateEA20(localData);
  }, [localData]);

  const handleBack = () => {
    setIsClosing(true);
    setTimeout(onBack, 300);
  };

  // Derive allCandidates for the selected cargo in localData
  const isConsultaPopular = !!localData?.perg;

  const cargoData: UI_EA20Cargo | null = useMemo(() => {
    if (!localData?.carg?.length) return null;
    return localData.carg[0] ?? null;
  }, [localData]);

  const { selectedAbrangencia, selectedEleicao, switchTurno } = useElection();
  // Logic for candidate photo URLs: use 'br' only for President (cargo '1')
  // For other cargos (even in Federal elections), use the actual state identifier
  const isPresident = selectedCargo?.cd === '1' || cargoData?.cd === '1';
  const ufForFoto = isPresident ? 'br' : (uf || selectedAbrangencia?.ufCd || '');

  const perguntaData: any | null = useMemo(() => {
    if (!localData?.perg?.length) return null;
    return localData.perg[selectedPerguntaIdx] ?? localData.perg[0] ?? null;
  }, [localData, selectedPerguntaIdx]);

  const allCandidates = useMemo(() => {
    if (!cargoData) return [];
    return cargoData.agr.flatMap((agr: UI_EA20Agrupamento) => agr.par.flatMap((par: UI_EA20Partido) => par.cand));
  }, [cargoData]);

  const allRespostas = useMemo(() => {
    if (!perguntaData) return [];
    return perguntaData.resp || [];
  }, [perguntaData]);

  const totalVotos = useMemo(() => {
    if (isConsultaPopular) {
      return allRespostas.reduce((sum: number, r: any) => sum + r._vapNum, 0);
    }
    return allCandidates.reduce((sum: number, c: UI_EA20Candidato) => sum + c._vapNum, 0);
  }, [isConsultaPopular, allCandidates, allRespostas]);

  // Derived list of unique parties for the filter
  const parties = useMemo(() => {
    const list = cargoData?.agr.flatMap((a: UI_EA20Agrupamento) => a.par.map((p: UI_EA20Partido) => ({ sg: p.sg, nm: p.nm }))) || [];
    // Unique by sg
    return Array.from(new Map(list.map((p: { sg: string; nm: string }) => [p.sg, p])).values()).sort((a: { sg: string; nm: string }, b: { sg: string; nm: string }) => a.sg.localeCompare(b.sg));
  }, [cargoData]);

  const filteredAndSortedRespostas = useMemo(() => {
    if (!perguntaData) return [];
    let list = perguntaData.resp.map((r: any) => ({ resp: r }));

    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      list = list.filter((item: any) =>
        item.resp.nm.toLowerCase().includes(lowSearch) ||
        item.resp.nmu.toLowerCase().includes(lowSearch) ||
        item.resp.n.includes(searchTerm)
      );
    }

    list.sort((a: any, b: any) => b.resp._vapNum - a.resp._vapNum);
    return list;
  }, [perguntaData, searchTerm]);

  const filteredAndSortedCandidates = useMemo(() => {
    if (!cargoData) return [];

    let list = cargoData.agr.flatMap((agr: UI_EA20Agrupamento) =>
      agr.par.flatMap((par: UI_EA20Partido) => par.cand.map((cand: UI_EA20Candidato) => ({ cand, agr, partido: par })))
    );

    // 1. Search (Name, Number, Party)
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      list = list.filter((item: any) =>
        item.cand.nm.toLowerCase().includes(lowSearch) ||
        item.cand.nmu.toLowerCase().includes(lowSearch) ||
        item.cand.n.includes(searchTerm) ||
        item.partido.sg.toLowerCase().includes(lowSearch)
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      list = list.filter((item: any) => {
        if (statusFilter === 'fav') return favorites.has(item.cand.sqcand);
        if (statusFilter === 'eleitos') return item.cand.e === 's';
        if (statusFilter === 'legenda') return item.cand.dvt === 'Válidos (legenda)';
        if (statusFilter === 'valido') return item.cand.dvt === 'Válido';
        if (statusFilter === 'anulado') return item.cand.dvt === 'Anulado';
        if (statusFilter === 'subjudice') return item.cand.dvt === 'Sub-Judice';
        return true;
      });
    }

    // 3. Party Filter
    if (partyFilter !== 'all') {
      list = list.filter((item: any) => item.partido.sg === partyFilter);
    }

    // 4. Sort
    list.sort((a: any, b: any) => {
      // Favorites ALWAYS on top
      const aFav = favorites.has(a.cand.sqcand) ? 1 : 0;
      const bFav = favorites.has(b.cand.sqcand) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      if (sortMode === 'votos') {
        return b.cand._vapNum - a.cand._vapNum;
      }
      if (sortMode === 'nome') {
        return a.cand.nmu.localeCompare(b.cand.nmu);
      }
      if (sortMode === 'partido') {
        return a.partido.sg.localeCompare(b.partido.sg);
      }
      if (sortMode === 'eleito') {
        if (a.cand.e !== b.cand.e) return a.cand.e === 's' ? -1 : 1;
        return b.cand._vapNum - a.cand._vapNum;
      }
      if (sortMode === 'idade') {
        // Nascimento: older (most idosos) first. Date format DD/MM/YYYY
        const parseDate = (d: string) => {
          if (!d) return new Date(0);
          const parts = d.split('/');
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        };
        const dateA = parseDate(a.cand.dt);
        const dateB = parseDate(b.cand.dt);
        return dateA.getTime() - dateB.getTime(); // Earlier date = older
      }
      // Default: TSE defined order (seq)
      const aSeq = parseInt(a.cand.seq, 10) || 0;
      const bSeq = parseInt(b.cand.seq, 10) || 0;
      if (aSeq !== bSeq) return aSeq - bSeq;

      return a.cand.nmu.localeCompare(b.cand.nmu);
    });

    return list;
  }, [cargoData, searchTerm, statusFilter, partyFilter, sortMode, favorites]);

  const filterCounts = useMemo(() => {
    const raw = cargoData?.agr.flatMap((a: UI_EA20Agrupamento) => a.par.flatMap((p: UI_EA20Partido) => p.cand)) || [];
    return {
      all: isConsultaPopular ? allRespostas.length : raw.length,
      fav: raw.filter((c: any) => favorites.has(c.sqcand)).length,
      eleitos: raw.filter((c: any) => c.e === 's').length,
      legenda: raw.filter((c: any) => c.dvt === 'Válidos (legenda)').length,
      anulado: raw.filter((c: any) => c.dvt === 'Anulado').length,
      subjudice: raw.filter((c: any) => c.dvt === 'Sub-Judice').length,
    };
  }, [cargoData, favorites, isConsultaPopular, allRespostas]);

  // Is this a majority (1 or 2 vacancies) or proportional cargo?
  // Explicitly treat President (1), Governor (3), Senator (5), and Mayor (11) as majority.
  const isMajority = cargoData ? (['1', '3', '5', '11'].includes(cargoData.cd) || parseInt(cargoData.nv, 10) <= 2) : false;

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleBack} />
      <div className={`fixed inset-y-0 right-0 z-[70] w-[95vw] sm:w-[90vw] bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-200 dark:border-slate-800 flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <button onClick={handleBack} className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Resultados (EA20) — {munNome || localData?.cdabr || 'Arquivo Local'} {selectedZona ? ` — Zona ${selectedZona}` : ''}
                </h2>
                {selectedEleicao && (selectedEleicao.cdt2 || selectedEleicao.t === '2') && (
                  <div className="mt-1 mb-1">
                    <button
                      onClick={switchTurno}
                      className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors inline-flex"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                      Ir para {selectedEleicao.t === '1' ? '2º' : '1º'} Turno
                    </button>
                  </div>
                )}
                {localData && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Gerado em: <span className="font-mono">{localData.dg} {localData.hg}</span>
                    {localData.and === 'f'
                      ? <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded text-[10px] font-bold">✓ Finalizado</span>
                      : <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 rounded text-[10px] font-bold">⟳ Em andamento</span>
                    }
                  </div>
                )}
                {isModified && (
                  <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 animate-pulse w-fit">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Dados editados localmente
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  refetch().then(r => {
                    if (r.data) {
                      setPreviousData(localData);
                      setLocalData(r.data);
                      setIsModified(false);
                      setIsEditing(false);
                    }
                  });
                }}
                disabled={isFetching}
                className={`p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors ${isFetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Atualizar dados (EA20)"
              >
                <svg className={`w-4 h-4 text-gray-700 dark:text-gray-300 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
              >
                {showRawJson ? 'Painel Visual' : 'Ver JSON'}
              </button>
              <button
                onClick={handleBack}
                className="p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
                title="Fechar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          {/* ── Cargo / Pergunta pills ── */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {!isConsultaPopular && cargosDisponiveis.map((cg, idx) => (
              <button
                key={cg.cd}
                onClick={() => setSelectedCargoIdx(idx)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCargoIdx === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
              >
                {cg.nm}
              </button>
            ))}

            {isConsultaPopular && localData?.perg?.map((p: any, idx: number) => (
              <button
                key={p.cd}
                onClick={() => setSelectedPerguntaIdx(idx)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedPerguntaIdx === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
              >
                Q{p.cd}
              </button>
            ))}

            <button
              onClick={() => setShowZonaSelector(!showZonaSelector)}
              className={`ml-auto px-3 py-1 rounded-full text-xs font-medium transition-colors ${showZonaSelector ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
              title="Detalhar por zona eleitoral"
            >
              {selectedZona ? `Zona ${selectedZona}` : '⊕ Por Zona'}
            </button>
          </div>

          {/* ── Zone selector ── */}
          {showZonaSelector && (
            <div className="flex items-center gap-2 mt-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Zona:</label>
              <select
                value={selectedZona ?? ''}
                onChange={e => setSelectedZona(e.target.value || undefined)}
                className="text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 w-48 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="">Todas as Zonas</option>
                {availableZones.sort().map(z => (
                  <option key={z} value={z}>Zona {z}</option>
                ))}
              </select>
              {selectedZona && (
                <button onClick={() => setSelectedZona(undefined)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Limpar</button>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando resultados...</p>
            </div>
          )}

          {isError && !localData && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-6 text-center">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Erro ao carregar (EA20)</h3>
              <p className="text-red-600 dark:text-red-300 text-sm">{error instanceof Error ? error.message : 'Falha ao buscar resultados.'}</p>
            </div>
          )}

          {localData && (
            showRawJson ? (
              // ── JSON Editor ──────────────────────────────────────────────
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    Conteúdo do Arquivo JSON
                  </span>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button onClick={() => { setEditValue(JSON.stringify(localData, null, 2)); setIsEditing(true); }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Editar
                      </button>
                    ) : (
                      <>
                        <button onClick={() => {
                          try {
                            const parsed = JSON.parse(editValue);
                            setPreviousData(localData);
                            setLocalData(parsed);
                            setIsModified(true);
                            setIsEditing(false);
                            setShowRawJson(false);
                          } catch { alert('JSON inválido!'); }
                        }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors">Salvar</button>
                        <button onClick={() => setIsEditing(false)}
                          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded transition-colors">Cancelar</button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="w-full h-[500px] p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-inner"
                    spellCheck={false} />
                ) : (
                  <div onClick={() => { setEditValue(JSON.stringify(localData, null, 2)); setIsEditing(true); }}
                    className="bg-[#1e1e1e] rounded-lg p-4 overflow-x-auto shadow-inner border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors group relative"
                    title="Clique para editar">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">Clique para editar</div>
                    {renderHighlightedJson(localData)}
                  </div>
                )}
              </div>
            ) : (
              // ── Visual Panel ─────────────────────────────────────────────
              <div className="space-y-4">
                <div className="space-y-6 pt-2">

                  {/* Validation errors */}
                  {validationResults.length > 0 && (() => {
                    const totalErrors = validationResults.reduce((acc, r) => acc + r.errors.length, 0);
                    return (
                      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg shadow-sm animate-fade-in overflow-hidden">
                        <button
                          onClick={() => setValidationExpanded(!validationExpanded)}
                          className="w-full p-3 flex justify-between items-center hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors text-red-700 dark:text-red-300"
                        >
                          <div className="flex items-center gap-2 text-sm font-bold">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Inconsistências Encontradas
                            <span className="ml-1 px-1.5 py-0.5 bg-red-200 dark:bg-red-800 rounded text-[10px] font-black">{totalErrors}</span>
                          </div>
                          <svg className={`w-4 h-4 transition-transform ${validationExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {validationExpanded && (
                          <div className="p-4 pt-0 text-xs text-red-700 dark:text-red-300 border-t border-red-200/50 dark:border-red-800/50 space-y-4">
                            {validationResults.map((r, i) => (
                              <div key={i} className={i !== 0 ? "pt-3 border-t border-red-100 dark:border-red-900/40" : "pt-3"}>
                                <div className="font-bold uppercase tracking-tight mb-1 opacity-80">{r.cargo}:</div>
                                <ul className="list-disc pl-5 space-y-1">
                                  {r.errors.map((e, j) => (
                                    <li key={j} className="leading-relaxed">{e}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Section + Elector summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SecoesSummary s={localData.s} previousS={previousData?.s} />
                    <EleitoresSummary e={localData.e} previousE={previousData?.e} />
                  </div>

                  {/* Votes breakdown */}
                  <VoteVisualization v={localData.v} previousV={previousData?.v} isProportional={!isMajority && !isConsultaPopular} isConsultaPopular={isConsultaPopular} />

                  {!isConsultaPopular && (
                    <>
                      {/* Search Bar */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Buscar candidato por nome, partido ou número..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5 transition-colors"
                        />
                        {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>

                      {/* Filters Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap gap-1 flex-1">
                          {([
                            { key: 'all', label: `Todos (${filterCounts.all})`, color: 'blue' },
                            { key: 'fav', label: `★ Favoritos (${filterCounts.fav})`, color: 'pink' },
                            { key: 'eleitos', label: `✓ Eleitos (${filterCounts.eleitos})`, color: 'green' },
                            { key: 'valido', label: `Válido`, color: 'indigo' },
                            { key: 'legenda', label: `Legenda (${filterCounts.legenda})`, color: 'cyan', hide: isMajority },
                            { key: 'anulado', label: `Anulado (${filterCounts.anulado})`, color: 'orange' },
                            { key: 'subjudice', label: `Sub Judice (${filterCounts.subjudice})`, color: 'yellow' },
                          ] as { key: string; label: string; color: string; hide?: boolean }[]).filter(f => !f.hide).map(({ key, label, color }) => {
                            const active = statusFilter === key;
                            const activeCls = {
                              blue: 'bg-blue-600 text-white',
                              pink: 'bg-pink-500 text-white',
                              green: 'bg-green-600 text-white',
                              indigo: 'bg-indigo-600 text-white',
                              cyan: 'bg-cyan-600 text-white',
                              orange: 'bg-orange-600 text-white',
                              purple: 'bg-purple-600 text-white',
                            }[color];
                            return (
                              <button
                                key={key}
                                onClick={() => setStatusFilter(key as any)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${active ? activeCls : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        <select
                          value={sortMode}
                          onChange={(e) => setSortMode(e.target.value as any)}
                          className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 transition-colors focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="votos">Ordenar: Votos (↓)</option>
                          <option value="nome">Ordenar: Nome (ABC)</option>
                          <option value="partido">Ordenar: Partido</option>
                          <option value="eleito">Ordenar: Situação</option>
                          <option value="idade">Ordenar: Mais Idosos</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Party filter for proportional */}
                  {!isConsultaPopular && !isMajority && parties.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Partido:</span>
                      <button
                        onClick={() => setPartyFilter('all')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${partyFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'}`}
                      >
                        Todos
                      </button>
                      {parties.map((p: any) => (
                        <button
                          key={p.sg}
                          onClick={() => setPartyFilter(p.sg)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${partyFilter === p.sg ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'}`}
                          title={p.nm}
                        >
                          {p.sg}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Questions / Candidates */}
                  {isConsultaPopular && perguntaData && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Pergunta</div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-snug">
                          {perguntaData.ds}
                        </h3>
                        {perguntaData.dica && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                            {perguntaData.dica}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredAndSortedRespostas.map((item: any) => (
                          <RespostaCard
                            key={item.resp.n}
                            resp={item.resp}
                            previousResp={previousData?.perg?.find((p: any) => p.cd === perguntaData.cd)?.resp?.find((r: any) => r.n === item.resp.n)}
                            pctColor={parseFloat(item.resp.pvap.replace(',', '.')) >= 50 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!isConsultaPopular && cargoData && (
                    <div>
                      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        {cargoData.nmn}
                        <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{cargoData.nv} vaga{parseInt(cargoData.nv) > 1 ? 's' : ''}</span>
                      </h3>

                      {filteredAndSortedCandidates.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                          <p className="text-gray-500 dark:text-gray-400">Nenhum candidato encontrado com os filtros atuais.</p>
                          <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPartyFilter('all'); }} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">Limpar filtros</button>
                        </div>
                      ) : isMajority ? (
                        // ── Majority: cards side-by-side and wrapping ────────
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredAndSortedCandidates.map(({ cand, agr }: { cand: UI_EA20Candidato; agr: UI_EA20Agrupamento; partido: UI_EA20Partido }, idx: number) => (
                            <CandCard
                              key={`${cand.sqcand}-${idx}`}
                              cand={cand}
                              agr={agr}
                              totalVotos={totalVotos}
                              ambiente={ambiente}
                              ciclo={ciclo || ''}
                              eleicaoCd={eleicaoCd || localData?.ele || ''}
                              uf={ufForFoto}
                              isProportional={false}
                              isFavorite={favorites.has(cand.sqcand)}
                              onToggleFavorite={() => toggleFavorite(cand.sqcand)}
                              host={host}
                              previousCand={previousData?.carg?.[0]?.agr?.flatMap((a: any) => a.par.flatMap((p: any) => p.cand))?.find((c: any) => c.sqcand === cand.sqcand)}
                            />
                          ))}
                        </div>
                      ) : (
                        // ── Proportional: table ───────────────────────────────
                        <div className="bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-10">Nº</th>
                                <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Candidato</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Votos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAndSortedCandidates.map(({ cand, agr }: { cand: UI_EA20Candidato; agr: UI_EA20Agrupamento; partido: UI_EA20Partido }, idx: number) => (
                                <CandCard
                                  key={`${cand.sqcand}-${idx}`}
                                  cand={cand}
                                  agr={agr}
                                  totalVotos={totalVotos}
                                  ambiente={ambiente}
                                  ciclo={ciclo || ''}
                                  eleicaoCd={eleicaoCd || localData?.ele || ''}
                                  uf={ufForFoto}
                                  isProportional={true}
                                  isFavorite={favorites.has(cand.sqcand)}
                                  onToggleFavorite={() => toggleFavorite(cand.sqcand)}
                                  host={host}
                                  previousCand={previousData?.carg?.[0]?.agr?.flatMap((a: any) => a.par.flatMap((p: any) => p.cand))?.find((c: any) => c.sqcand === cand.sqcand)}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
