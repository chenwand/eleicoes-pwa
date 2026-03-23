import { useQuery } from '@tanstack/react-query';
import { fetchEA14 } from '../services/ea14Service';
import { fetchEA12 } from '../services/ea12Service';
import { validateEA14 } from '../services/ea14Validator';
import { useEffect, useRef, useMemo, useState } from 'react';
import { adaptStatsResponse } from '../utils/adapters/statsAdapters';
import { EA15Viewer } from './EA15Viewer';
import { useEnvironment } from '../context/EnvironmentContext';
import { TrendIndicator } from './TrendIndicator';
import { UF_TO_REGION, REGIONS, calculateRegionTotals } from '../utils/electionUtils';
import { useElection } from '../context/ElectionContext';

const renderHighlightedJson = (jsonObj: any) => {
  const json = JSON.stringify(jsonObj, null, 2).replace(/[&<>]/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c;
  });

  const highlighted = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'text-blue-400'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-purple-400 font-semibold'; // key
      } else {
        cls = 'text-green-400 break-all whitespace-pre-wrap'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-orange-400 font-medium'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-red-400 font-medium'; // null
    }
    return `<span class="${cls}">${match}</span>`;
  });

  return (
    <pre
      className="text-xs sm:text-sm text-gray-300 font-mono"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
};

interface EA14ViewerProps {
  ciclo: string;
  eleicaoCd: string;
  eleicaoNome: string;
  onClose: () => void;
  cargosDisponiveis?: { cd: string; nm: string }[];
  initialLocalData?: any;
  initialRegion?: string;
  onBack?: () => void;
}

export function EA14Viewer({ ciclo, eleicaoCd, eleicaoNome, onClose, cargosDisponiveis = [], initialLocalData, initialRegion, onBack }: EA14ViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedUf, setExpandedUf] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [selectedEA15Uf, setSelectedEA15Uf] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'default' | 'recent' | 'eleitores' | 'comparecimento' | 'abstencao' | 'pst'>('default');
  const [isClosing, setIsClosing] = useState(false);
  const [previousData, setPreviousData] = useState<any>(null);
  const [isBrExpanded, setIsBrExpanded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(initialRegion || 'BR');

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match slide-out duration
  };

  const handleBack = () => {
    if (onBack) {
      setIsClosing(true);
      setTimeout(() => {
        onBack();
      }, 300);
    }
  };

  const { ambiente, host } = useEnvironment();
  const { selectedEleicao, switchTurno } = useElection();
  const [localData, setLocalData] = useState<any>(initialLocalData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [editValue, setEditValue] = useState("");

  const { data, isLoading, isError, error, refetch: refetchEA14, isFetching: isEA14Fetching } = useQuery({
    queryKey: ['ea14-data', ciclo, eleicaoCd, ambiente, host],
    queryFn: () => fetchEA14(ciclo, eleicaoCd, ambiente, host),
    select: adaptStatsResponse,
    enabled: !!eleicaoCd && !!ciclo && !initialLocalData,
  });

  const { data: ea12Data } = useQuery({
    queryKey: ['ea12-data', ciclo, eleicaoCd, ambiente, host],
    queryFn: () => fetchEA12(ciclo, eleicaoCd, ambiente, host),
    enabled: !!eleicaoCd && !!ciclo,
    staleTime: Infinity,
  });

  const ufDict = useMemo(() => {
    const dict = new Map<string, string>();
    if (ea12Data?.abr) {
      ea12Data.abr.forEach((uf: any) => {
        if (uf.cd && uf.ds) {
          // Normalize to uppercase for lookup
          const code = uf.cd.toUpperCase();
          // Use a helper for title case if possible, but at least store it
          const name = uf.ds.charAt(0).toUpperCase() + uf.ds.slice(1).toLowerCase();
          dict.set(code, name);
        }
      });
    }
    // Fallbacks or special cases
    if (!dict.has('BR')) dict.set('BR', 'Brasil');
    if (!dict.has('ZZ')) dict.set('ZZ', 'Exterior');

    return dict;
  }, [ea12Data]);

  useEffect(() => {
    if (data) {
      if (localData && localData !== data) {
        setPreviousData(localData);
      }
      setLocalData(data);
      setIsModified(false);
    }
  }, [data]);

  const activeAbr = useMemo(() => {
    return calculateRegionTotals(localData, selectedRegion);
  }, [localData, selectedRegion]);

  const validationResults = useMemo(() => {
    if (!localData) return [];
    return validateEA14(localData);
  }, [localData]);

  const getErrorsForAbr = (cdabr: string) => {
    return validationResults.find(r => r.cdabr === cdabr)?.errors || [];
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    // Slight delay to prevent immediate close if the open trigger button event propagates
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} />
      <div
        ref={panelRef}
        className={`fixed inset-y-0 right-0 z-50 w-[95vw] sm:w-[90vw] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto border-l border-gray-200 dark:border-slate-800 flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      >
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={handleBack}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center shadow-sm"
                  title="Voltar"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Acompanhamento BR (EA14)
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {eleicaoNome}
                  </p>
                  {selectedEleicao && (selectedEleicao.cdt2 || selectedEleicao.t === '2') && (
                    <button
                      onClick={switchTurno}
                      className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                      Ir para {selectedEleicao.t === '1' ? '2º' : '1º'} Turno
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  refetchEA14().then((result) => {
                    if (result.data) {
                      setPreviousData(localData);
                      setLocalData(result.data);
                      setIsModified(false);
                      setIsEditing(false);
                    }
                  });
                }}
                disabled={isEA14Fetching}
                className={`p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors ${isEA14Fetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Atualizar dados (EA14)"
              >
                <svg className={`w-5 h-5 ${isEA14Fetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>
              {!selectedEA15Uf && (
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
                  title="Alternar visualização do JSON"
                >
                  {showRawJson ? 'Painel Visual' : 'Ver JSON'}
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
                title="Fechar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          {!selectedEA15Uf && localData && (() => {
            const paddedCd = eleicaoCd.padStart(6, '0');
            const jsonUrl = `${host}/${ambiente}/${ciclo}/${eleicaoCd}/dados/br/br-e${paddedCd}-ab.json`;
            return (
              <div className="flex flex-col items-end -mt-2 mb-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
                  Arquivo gerado em:{' '}
                  <a
                    href={jsonUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono hover:text-blue-500 dark:hover:text-blue-400 underline underline-offset-2 transition-colors"
                    title="Abrir / baixar JSON EA14"
                  >
                    {localData.dg} {localData.hg} ↓
                  </a>
                </div>
                {isModified && (
                  <div className="mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1 animate-pulse">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Dados editados localmente
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {selectedEA15Uf && localData ? (() => {
          const ufEntry = localData.abr.find((a: any) => a.cdabr === selectedEA15Uf.toLowerCase());
          return (
            <div className="flex-1 bg-gray-50 dark:bg-slate-900/50">
              <EA15Viewer
                ciclo={ciclo}
                eleicaoCd={eleicaoCd}
                uf={selectedEA15Uf}
                onBack={() => setSelectedEA15Uf(null)}
                ea14dg={ufEntry?.dt}
                ea14hg={ufEntry?.ht}
                cargosDisponiveis={cargosDisponiveis}
              />
            </div>
          );
        })() : (
          <div className="p-4 flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Buscando dados de acompanhamento...</p>
              </div>
            ) : isError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-6 text-center">
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Erro ao carregar</h3>
                <p className="text-red-600 dark:text-red-300 text-sm">
                  {error instanceof Error ? error.message : 'Falha na comunicação com o TSE.'}
                </p>
              </div>
            ) : localData && localData.abr ? (
              <div className="space-y-6">

                {showRawJson ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        Conteúdo do Arquivo JSON
                      </span>
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <button
                            onClick={() => {
                              setEditValue(JSON.stringify(localData, null, 2));
                              setIsEditing(true);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            Editar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                try {
                                  const parsed = JSON.parse(editValue);
                                  setPreviousData(localData);
                                  setLocalData(parsed);
                                  setIsModified(true);
                                  setIsEditing(false);
                                  setShowRawJson(false);
                                } catch (e) {
                                  alert("JSON inválido! Por favor corrija antes de salvar.");
                                }
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setIsEditing(false)}
                              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full h-[500px] p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-inner"
                        spellCheck={false}
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditValue(JSON.stringify(localData, null, 2));
                          setIsEditing(true);
                        }}
                        className="bg-[#1e1e1e] rounded-lg p-4 overflow-x-auto shadow-inner border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors group relative"
                        title="Clique para editar"
                      >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">
                          Clique para editar
                        </div>
                        {renderHighlightedJson(localData)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Region Selector */}
                    <div className="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-slate-800/50 rounded-lg w-fit">
                      {REGIONS.map((r) => {
                        const isZZ = r.cd === 'ZZ';
                        const hasData = r.cd === 'BR' || localData.abr.some((a: any) =>
                          isZZ ? a.cdabr === 'zz' : UF_TO_REGION[a.cdabr.toUpperCase()] === r.cd
                        );

                        if (!hasData) return null;

                        return (
                          <button
                            key={r.cd}
                            onClick={() => {
                              setSelectedRegion(r.cd);
                              setIsBrExpanded(false);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${selectedRegion === r.cd
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                              }`}
                          >
                            <span>{r.icon}</span>
                            <span>{r.nm}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Summary Card (National or Region) */}
                    {activeAbr && (() => {
                      const brErrors = getErrorsForAbr(activeAbr.cdabr);
                      const hasErrors = brErrors.length > 0;

                      const relevantUfs = selectedRegion === 'BR'
                        ? localData.abr.filter((a: any) => a.cdabr !== 'br')
                        : localData.abr.filter((a: any) => UF_TO_REGION[a.cdabr.toUpperCase()] === selectedRegion);

                      const ufsFinalizadas = relevantUfs.filter((a: any) => a.and === 'f').length;
                      const ufsParciais = relevantUfs.filter((a: any) => a.and === 'p').length;
                      const totalUfs = relevantUfs.length;
                      const ufsNaoIniciadas = totalUfs - ufsFinalizadas - ufsParciais;
                      const maxUfs = Math.max(ufsFinalizadas, ufsParciais, ufsNaoIniciadas);

                      const getBarHeight = (val: number) => {
                        if (val === 0) return '0%';
                        if (maxUfs === 0) return '0%';
                        const values = [ufsFinalizadas, ufsParciais, ufsNaoIniciadas].filter(v => v > 0).sort((a: any, b: any) => b - a);
                        const uniqueValues = Array.from(new Set(values));
                        if (val === uniqueValues[0]) return '100%';
                        if (uniqueValues.length > 1 && val === uniqueValues[1]) return '60%';
                        return '30%';
                      };

                      const regionName = REGIONS.find(r => r.cd === selectedRegion)?.nm || 'Brasil';
                      const regionIcon = REGIONS.find(r => r.cd === selectedRegion)?.icon || '🇧🇷';

                      return (
                        <div
                          key="summary"
                          onClick={() => setIsBrExpanded(!isBrExpanded)}
                          className={`border-l-4 rounded p-4 shadow-sm flex flex-col md:flex-row gap-6 cursor-pointer hover:shadow-md transition-all ${hasErrors ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'}`}
                        >
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase flex items-center gap-2">
                                {selectedRegion === 'BR' ? (
                                  <img src="/flags/br.svg" alt="Brasil" className="w-5 h-4 object-contain rounded-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                ) : (
                                  <span className="text-xl">{regionIcon}</span>
                                )}
                                {regionName}
                              </h3>
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${activeAbr.and === 'f' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
                                {activeAbr.and === 'f' ? 'Finalizado' : 'Em andamento'}
                              </span>
                            </div>

                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Seções Totalizadas</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                                  {activeAbr.s.pst}%
                                  {selectedRegion === 'BR' && (
                                    <TrendIndicator
                                      current={activeAbr.s.pst}
                                      previous={previousData?.abr?.find((a: any) => a.cdabr === 'br')?.s?.pst}
                                    />
                                  )}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${activeAbr.s._pstNum}%` }}></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>{ufsFinalizadas} de {totalUfs} UFs finalizadas</span>
                                <span>{activeAbr.s._stNum.toLocaleString('pt-BR')} de {activeAbr.s._tsNum.toLocaleString('pt-BR')} seções</span>
                              </div>

                              {isBrExpanded && (
                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex justify-between">
                                    <span>Eleitores:</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{activeAbr.e._teNum.toLocaleString('pt-BR')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Comparecimento:</span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center">
                                      {activeAbr.e._cNum.toLocaleString('pt-BR')} ({activeAbr.e.pc}%)
                                      {selectedRegion === 'BR' && (
                                        <TrendIndicator
                                          current={activeAbr.e.pc}
                                          previous={previousData?.abr?.find((a: any) => a.cdabr === 'br')?.e?.pc}
                                        />
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Abstenção:</span>
                                    <span className="font-medium text-gray-500 flex items-center">
                                      {activeAbr.e._aNum.toLocaleString('pt-BR')} ({activeAbr.e.pa}%)
                                      {selectedRegion === 'BR' && (
                                        <TrendIndicator
                                          current={activeAbr.e.pa}
                                          previous={previousData?.abr?.find((a: any) => a.cdabr === 'br')?.e?.pa}
                                        />
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs pt-1 opacity-60">
                                    <span>Última atualização:</span>
                                    <span>{activeAbr.dt} {activeAbr.ht}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {hasErrors && (
                              <div className="mt-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-2 text-xs text-red-700 dark:text-red-300">
                                <strong className="flex items-center gap-1 mb-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                  Inconsistências Identificadas:
                                </strong>
                                <ul className="list-disc pl-5 space-y-1">
                                  {brErrors.map((err: any, i: number) => <li key={i}>{err}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Chart Side */}
                          <div className="md:w-56 bg-white/60 dark:bg-slate-800/60 rounded p-3 flex flex-col border border-gray-100 dark:border-slate-700/50 shadow-sm shrink-0">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 text-center">
                              Status das UFs ({totalUfs})
                            </div>
                            <div className="flex-1 flex items-end justify-center gap-4 h-32 mt-2">
                              <div className="flex flex-col items-center gap-1 group h-full justify-end w-5 sm:w-6">
                                <div className="text-[10px] font-medium text-gray-500 shrink-0">{ufsNaoIniciadas}</div>
                                <div className="flex-1 w-full relative">
                                  <div className="absolute bottom-0 w-full bg-gray-300 dark:bg-slate-600 rounded-t transition-all duration-500 group-hover:opacity-80 min-h-[2px]" style={{ height: getBarHeight(ufsNaoIniciadas) }}></div>
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium shrink-0" title="Não Iniciadas">NI</div>
                              </div>
                              <div className="flex flex-col items-center gap-1 group h-full justify-end w-5 sm:w-6">
                                <div className="text-[10px] font-medium text-yellow-600 dark:text-yellow-500 shrink-0">{ufsParciais}</div>
                                <div className="flex-1 w-full relative">
                                  <div className="absolute bottom-0 w-full bg-yellow-400 dark:bg-yellow-500 rounded-t transition-all duration-500 group-hover:opacity-80 min-h-[2px]" style={{ height: getBarHeight(ufsParciais) }}></div>
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium shrink-0" title="Parciais">PA</div>
                              </div>
                              <div className="flex flex-col items-center gap-1 group h-full justify-end w-5 sm:w-6">
                                <div className="text-[10px] font-medium text-green-600 dark:text-green-500 shrink-0">{ufsFinalizadas}</div>
                                <div className="flex-1 w-full relative">
                                  <div className="absolute bottom-0 w-full bg-green-500 dark:bg-green-500 rounded-t transition-all duration-500 group-hover:opacity-80 min-h-[2px]" style={{ height: getBarHeight(ufsFinalizadas) }}></div>
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium shrink-0" title="Finalizados">FI</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2 mb-4 mt-6">
                      <h3 className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedRegion === 'BR' ? 'Por Unidade da Federação' : `UFs da Região ${REGIONS.find(r => r.cd === selectedRegion)?.nm}`}
                      </h3>
                      <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                        className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 transition-colors focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="default">Ordenar: Padrão</option>
                        <option value="recent">↓ Mais recentes</option>
                        <option value="pst">↓ % Seções totalizadas</option>
                        <option value="eleitores">↓ Eleitores</option>
                        <option value="comparecimento">↓ % Comparecimento</option>
                        <option value="abstencao">↓ % Abstenção</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {localData.abr
                        .filter((a: any) => {
                          if (a.cdabr === 'br') return false;
                          if (selectedRegion === 'BR') return true;
                          if (selectedRegion === 'ZZ') return a.cdabr === 'zz';
                          return UF_TO_REGION[a.cdabr.toUpperCase()] === selectedRegion;
                        })
                        .sort((aValue: any, bValue: any) => {
                          const a = aValue;
                          const b = bValue;

                          // Sort by most recently updated
                          if (sortMode === 'recent') {
                            const toSortable = (dt: string, ht: string) => {
                              if (!dt) return '';
                              const [d, m, y] = dt.split('/');
                              return `${y}/${m}/${d} ${ht || ''}`;
                            };
                            const tsA = toSortable(a.dt, a.ht);
                            const tsB = toSortable(b.dt, b.ht);
                            return tsB.localeCompare(tsA);
                          }

                          // Default behaviors for other sorts (errors first)
                          const aErrors = getErrorsForAbr(a.cdabr).length;
                          const bErrors = getErrorsForAbr(b.cdabr).length;
                          if (aErrors !== bErrors) return bErrors - aErrors;

                          if (sortMode === 'pst') {
                            const pctA = a.s._pstNum;
                            const pctB = b.s._pstNum;
                            return pctB - pctA;
                          }
                          if (sortMode === 'eleitores') {
                            return b.e._teNum - a.e._teNum;
                          }
                          if (sortMode === 'comparecimento') {
                            return b.e._pcNum - a.e._pcNum;
                          }
                          if (sortMode === 'abstencao') {
                            return b.e._paNum - a.e._paNum;
                          }

                          // Default: % seções descending, then alphabetical
                          const pctA = a.s._pstNum;
                          const pctB = b.s._pstNum;
                          if (pctA !== pctB) return pctB - pctA;
                          return a.cdabr.localeCompare(b.cdabr);
                        })
                        .map((uf: any) => {
                          const pct = uf.s._pstNum;
                          const isDone = uf.and === 'f';
                          const isPartial = uf.and === 'p';
                          const ufErrors = getErrorsForAbr(uf.cdabr);
                          const hasErrors = ufErrors.length > 0;
                          const isExpanded = expandedUf === uf.cdabr;

                          const borderBg = hasErrors
                            ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                            : isDone
                              ? 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                              : isPartial
                                ? 'border-yellow-300 dark:border-yellow-700/50 bg-yellow-50/50 dark:bg-yellow-900/10'
                                : 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10';

                          const pctColor = hasErrors
                            ? 'text-red-600 dark:text-red-400'
                            : isDone
                              ? 'text-green-600 dark:text-green-400'
                              : isPartial
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-blue-600 dark:text-blue-400';

                          const barColor = hasErrors
                            ? 'bg-red-500'
                            : isDone
                              ? 'bg-green-500'
                              : isPartial
                                ? 'bg-yellow-400 dark:bg-yellow-500'
                                : 'bg-blue-500';

                          return (
                            <div
                              key={uf.cdabr}
                              onClick={() => setExpandedUf(isExpanded ? null : uf.cdabr)}
                              className={`border transition-all cursor-pointer hover:shadow-md ${borderBg} rounded p-3 text-sm`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 font-mono font-bold uppercase text-gray-700 dark:text-gray-300">
                                  <img src={`/flags/${uf.cdabr.toLowerCase()}.svg`} alt={uf.cdabr} className="w-4 h-3 object-contain rounded-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                  <span className="truncate max-w-[150px]">{ufDict.get(uf.cdabr.toUpperCase()) || uf.cdabr}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEA15Uf(uf.cdabr.toLowerCase());
                                    }}
                                    title="Ver Municípios (EA15)"
                                    className="p-1 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors ml-1 shadow-sm"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                </div>
                                <span className={`font-semibold flex items-center ${pctColor}`}>
                                  {uf.s.pst}%
                                  <TrendIndicator
                                    current={uf.s.pst}
                                    previous={previousData?.abr?.find((a: any) => a.cdabr === uf.cdabr)?.s?.pst}
                                  />
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-1">
                                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Eleitores: {uf.e._teNum.toLocaleString('pt-BR')}</span>
                                <span className="flex items-center">
                                  Comp: {uf.e.pc}%
                                  <TrendIndicator
                                    current={uf.e.pc}
                                    previous={previousData?.abr?.find((a: any) => a.cdabr === uf.cdabr)?.e?.pc}
                                  />
                                </span>
                              </div>

                              {hasErrors && (
                                <div className="mt-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded p-1.5 text-xs text-red-700 dark:text-red-300">
                                  <ul className="list-disc pl-4 space-y-0.5">
                                    {ufErrors.map((err, i) => <li key={i}>{err}</li>)}
                                  </ul>
                                </div>
                              )}

                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-default" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-between">
                                    <span>Atualizado:</span>
                                    <span className="font-mono">{uf.dt} {uf.ht}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Andamento:</span>
                                    <span className={`font-semibold ${isDone ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                      {isDone ? 'Finalizado' : 'Em andamento'}
                                    </span>
                                  </div>

                                  <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5 mt-1">
                                    <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Eleitores</div>
                                    <div className="flex justify-between">
                                      <span>Total:</span>
                                      <span className="font-medium">{uf.e._teNum.toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Comparecimento:</span>
                                      <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center">
                                        {uf.e._cNum.toLocaleString('pt-BR')} ({uf.e.pc}%)
                                        <TrendIndicator
                                          current={uf.e.pc}
                                          previous={previousData?.abr?.find((a: any) => a.cdabr === uf.cdabr)?.e?.pc}
                                        />
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Abstenção:</span>
                                      <span className="font-medium text-gray-500 flex items-center">
                                        {uf.e._aNum.toLocaleString('pt-BR')} ({uf.e.pa}%)
                                        <TrendIndicator
                                          current={uf.e.pa}
                                          previous={previousData?.abr?.find((a: any) => a.cdabr === uf.cdabr)?.e?.pa}
                                        />
                                      </span>
                                    </div>
                                  </div>

                                  <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5">
                                    <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Seções</div>
                                    <div className="flex justify-between">
                                      <span>Totalizadas:</span>
                                      <span className="font-medium text-green-600 dark:text-green-400">{uf.s._stNum.toLocaleString('pt-BR')} de {uf.s._tsNum.toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Não totalizadas:</span>
                                      <span className="font-medium text-gray-500">{parseInt(uf.s.snt).toLocaleString('pt-BR')}</span>
                                    </div>
                                  </div>

                                  <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5">
                                    <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Municípios</div>
                                    <div className="flex justify-between">
                                      <span>Finalizados:</span>
                                      <span className="font-medium text-green-600 dark:text-green-400 flex items-center">
                                        {parseInt(uf.munf).toLocaleString('pt-BR')} ({uf.pmunf}%)
                                        <TrendIndicator
                                          current={uf.pmunf}
                                          previous={previousData?.abr?.find((a: any) => a.cdabr === uf.cdabr)?.pmunf}
                                        />
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Parciais:</span>
                                      <span className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center">
                                        {parseInt(uf.munpt).toLocaleString('pt-BR')} ({uf.pmunpt}%)
                                        <TrendIndicator
                                          current={uf.pmunpt}
                                          previous={previousData?.abr?.find((a: any) => a.cdabr === uf.cdabr)?.pmunpt}
                                        />
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Não iniciados:</span>
                                      <span className="font-medium text-gray-500 flex items-center">
                                        {parseInt(uf.munnr).toLocaleString('pt-BR')} ({uf.pmunnr}%)
                                        <TrendIndicator
                                          current={uf.pmunnr}
                                          previous={previousData?.abr?.find((a: any) => a.cdabr === uf.cdabr)?.pmunnr}
                                        />
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700 mt-1">
                                    <button
                                      className="w-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium py-1.5 px-3 rounded transition-colors text-xs flex justify-center items-center gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEA15Uf(uf.cdabr);
                                      }}
                                    >
                                      Acompanhamento UF (EA15)
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">Nenhum dado encontrado para esta eleição.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
