import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA12, flattenEA12Municipios } from '../services/ea12Service';
import { useEnvironment } from '../context/EnvironmentContext';
import { useElection } from '../context/ElectionContext';
import type { EleicaoEA11, EA11Response } from '../types/ea11';
import type { EA12Response } from '../types/ea12';

interface EA11ViewerProps {
  isOpen: boolean;
  onClose: () => void;
  initialEleicaoCd?: string | null; // For "Arquivo unificado (EA20)" pre-filtering, or null to force EA11 list
}

const TIPO_ELEICAO: Record<string, string> = {
  '1': 'Ordinária',
  '2': 'Suplementar',
  '3': 'Ordinária Municipal',
  '4': 'Suplementar Municipal',
  '5': 'Renovação Juntas',
  '6': 'Ordinária Distrito Estadual',
  '7': 'Consulta Popular',
};

function formatTipoEleicao(tpCode: string): string {
  return TIPO_ELEICAO[tpCode] || `Desconhecido (${tpCode})`;
}

const renderHighlightedJson = (jsonObj: EA11Response | EA12Response | null | undefined) => {
  if (!jsonObj) return null;
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

export function EA11Viewer({ isOpen, onClose, initialEleicaoCd }: EA11ViewerProps) {
  const { ambiente, host } = useEnvironment();
  const {
    selectEleicao,
    selectAbrangencia,
    setZona,
    selectedEleicao,
    selectedAbrangencia,
    selectedZona,
    ea11Data,
    isEA11Fetching,
    refetchEA11,
    updateEA11Data
  } = useElection();

  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fav'>('all');
  const [sortMode, setSortMode] = useState<'default' | 'data' | 'tipo' | 'nome'>('default');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'federal' | 'estadual' | 'municipal'>('all');

  const [showRawJson, setShowRawJson] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isModified, setIsModified] = useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('ea11-fav');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const [localSelectedEleicaoCd, setLocalSelectedEleicaoCd] = useState<string | null>(initialEleicaoCd || null);
  const [munSearchText, setMunSearchText] = useState('');
  const [isMunDropdownOpen, setIsMunDropdownOpen] = useState(false);
  const munDropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialEleicaoCd === null) {
        setLocalSelectedEleicaoCd(null);
      } else {
        setLocalSelectedEleicaoCd(initialEleicaoCd || selectedEleicao?.cd || null);
      }
      
      if (selectedAbrangencia && (initialEleicaoCd || selectedEleicao?.cd)) {
        const munPart = selectedAbrangencia.munCdTse ? ` - Cód: ${selectedAbrangencia.munCdTse}` : '';
        setMunSearchText(`${selectedAbrangencia.munNome} (${selectedAbrangencia.ufCd})${munPart}`);
      } else {
        setMunSearchText('');
      }
    }
  }, [isOpen, initialEleicaoCd, selectedEleicao, selectedAbrangencia]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        handleClose();
      }
      if (munDropdownRef.current && !munDropdownRef.current.contains(event.target as Node)) {
        setIsMunDropdownOpen(false);
      }
    }
    if (isOpen) {
      setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const ciclo = ea11Data?.c || '';

  // For EA12 context
  const [editedEA12Data, setEditedEA12Data] = useState<EA12Response | null>(null);
  const { data: ea12Data, isLoading: isEA12Loading, isFetching: isEA12Fetching, refetch: refetchEA12 } = useQuery({
    queryKey: ['ea12-config', ciclo, localSelectedEleicaoCd, ambiente, host],
    queryFn: () => fetchEA12(ciclo, localSelectedEleicaoCd!, ambiente, host),
    enabled: !!localSelectedEleicaoCd && !!ciclo && isOpen,
  });

  const displayData = localSelectedEleicaoCd ? (editedEA12Data || ea12Data) : ea11Data;
  const isFetching = localSelectedEleicaoCd ? isEA12Fetching : isEA11Fetching;
  const refetch = localSelectedEleicaoCd ? refetchEA12 : refetchEA11;

  const paddedCd = localSelectedEleicaoCd ? localSelectedEleicaoCd.padStart(6, '0') : '';
  const currentJsonUrl = localSelectedEleicaoCd
    ? `${host}/${ambiente}/${ciclo}/${localSelectedEleicaoCd}/config/mun-e${paddedCd}-cm.json`
    : `${host}/${ambiente}/comum/config/ele-c.json`;

  useEffect(() => {
    if (ea12Data) setEditedEA12Data(null);
  }, [ea12Data]);

  const normalizeString = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const toggleFavorite = (cd: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(cd)) next.delete(cd);
      else next.add(cd);
      localStorage.setItem('ea11-fav', JSON.stringify([...next]));
      return next;
    });
  };

  const allElections = useMemo(() => {
    if (!ea11Data) return [];
    return ea11Data.pl.flatMap((p) =>
      p.e.map((e) => ({
        ...e,
        pleitoCd: p.cd,
        pleitoDt: p.dt
      })) as (EleicaoEA11 & { pleitoCd: string; pleitoDt: string })[]
    );
  }, [ea11Data]);

  const t2ElectionCodes = useMemo(() => new Set(allElections.map((e) => e.cdt2).filter(Boolean)), [allElections]);
  const topLevelElections = useMemo(() => allElections.filter((e) => !t2ElectionCodes.has(e.cd)), [allElections, t2ElectionCodes]);
  
  const availableTypes = useMemo(() => {
    const types = new Set(allElections.map(e => e.tp));
    return Array.from(types).sort();
  }, [allElections]);

  const filteredElections = useMemo(() => {
    return topLevelElections
      .filter((e) => {
        if (statusFilter === 'fav' && !favorites.has(e.cd)) return false;
        if (typeFilter !== 'all' && e.tp !== typeFilter) return false;
        if (scopeFilter !== 'all') {
          const isFederal = e.abr.some((a) => a.cd === 'br');
          const isMunicipal = e.abr.some((a) => a.mu && a.mu.length > 0);
          const isEstadual = !isFederal && !isMunicipal;
          if (scopeFilter === 'federal' && !isFederal) return false;
          if (scopeFilter === 'municipal' && !isMunicipal) return false;
          if (scopeFilter === 'estadual' && !isEstadual) return false;
        }
        if (searchTerm) {
          const search = normalizeString(searchTerm);
          const eT2 = e.cdt2 ? allElections.find((t) => t.cd === e.cdt2) : null;
          const match1 = normalizeString(e.nm).includes(search) || e.cd.includes(search) || normalizeString(formatTipoEleicao(e.tp)).includes(search);
          const match2 = eT2 ? (normalizeString(eT2.nm).includes(search) || eT2.cd.includes(search) || normalizeString(formatTipoEleicao(eT2.tp)).includes(search)) : false;
          if (!match1 && !match2) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aFav = favorites.has(a.cd) ? 0 : 1;
        const bFav = favorites.has(b.cd) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        if (sortMode === 'data') {
          const [dayA, monthA, yearA] = a.pleitoDt.split('/');
          const dateA = new Date(Number(yearA), Number(monthA) - 1, Number(dayA));
          const [dayB, monthB, yearB] = b.pleitoDt.split('/');
          const dateB = new Date(Number(yearB), Number(monthB) - 1, Number(dayB));
          return dateB.getTime() - dateA.getTime();
        }
        if (sortMode === 'tipo') return formatTipoEleicao(a.tp).localeCompare(formatTipoEleicao(b.tp));
        if (sortMode === 'nome') return a.nm.localeCompare(b.nm);
        return 0;
      });
  }, [topLevelElections, statusFilter, favorites, typeFilter, scopeFilter, searchTerm, allElections, sortMode]);
  
  const availableScopes = useMemo(() => {
    if (!ea12Data) return [];
    let list = flattenEA12Municipios(ea12Data);
    
    // For Federal elections, ensure Brasil (BR) is present
    const currentEleicao = allElections.find(e => e.cd === localSelectedEleicaoCd);
    const isFederal = currentEleicao?.abr.some(a => a.cd === 'br');
    
    if (isFederal && !list.some(m => m.ufCd === 'BR')) {
      list.unshift({
        ufCd: 'BR',
        ufNome: 'BRASIL',
        munCdTse: '',
        munNome: 'BRASIL',
        isCapital: false,
        isUfWide: true,
        z: []
      });
    }
    
    return list;
  }, [ea12Data, localSelectedEleicaoCd, allElections]);

  if (!isOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} />
      <div
        ref={panelRef}
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[800px] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto border-l border-gray-200 dark:border-slate-800 flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      >
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                {localSelectedEleicaoCd ? "Seleção de Abrangência (EA12)" : "Seleção de Eleição (EA11)"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {localSelectedEleicaoCd ? "Configuração de municípios e estados" : "Arquivo de configuração de eleições"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  refetch().then((result) => {
                    if (result.data) {
                      if (localSelectedEleicaoCd) {
                        setEditedEA12Data(null);
                      } else {
                        updateEA11Data(result.data);
                        setIsModified(false);
                      }
                      setIsEditing(false);
                    }
                  });
                }}
                disabled={isFetching}
                className={`p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors ${isFetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={`Atualizar dados (${localSelectedEleicaoCd ? 'EA12' : 'EA11'})`}
              >
                <svg className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
                title="Alternar visualização do JSON"
              >
                {showRawJson ? 'Painel Visual' : `Ver JSON ${localSelectedEleicaoCd ? 'EA12' : 'EA11'}`}
              </button>
              <button
                onClick={handleClose}
                className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
                title="Fechar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end -mt-2 mb-1">
            <div className="text-[10px] text-gray-400 dark:text-gray-500 text-right space-x-2">
              <span>Ciclo: <strong className="text-blue-500">{ciclo || '...'}</strong></span>
              {displayData && (
                <>
                  <span>|</span>
                  <span>Arquivo gerado em:</span>
                  <a
                    href={currentJsonUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono hover:text-blue-500 underline underline-offset-2 transition-colors ml-1"
                    title={`Abrir / baixar JSON ${localSelectedEleicaoCd ? 'EA12' : 'EA11'}`}
                  >
                    {displayData.dg} {displayData.hg} ↓
                  </a>
                </>
              )}
            </div>
            {(localSelectedEleicaoCd ? editedEA12Data : isModified) && (
              <div className="mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1 animate-pulse">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                DADOS EDITADOS LOCALMENTE
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {showRawJson ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                  Configuração {localSelectedEleicaoCd ? 'EA12' : 'EA11'}
                </h3>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <button
                      onClick={() => {
                        setEditValue(JSON.stringify(displayData, null, 2));
                        setIsEditing(true);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded uppercase"
                    >
                      Editar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(editValue);
                            if (localSelectedEleicaoCd) {
                              setEditedEA12Data(parsed);
                            } else {
                              updateEA11Data(parsed);
                              setIsModified(true);
                            }
                            setIsEditing(false);
                            setShowRawJson(false);
                          } catch (e) {
                            alert("JSON inválido!");
                          }
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded uppercase"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-[10px] font-bold rounded uppercase"
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
                  className="w-full h-[500px] p-4 font-mono text-xs bg-gray-900 text-gray-100 rounded-lg border border-gray-700 outline-none resize-none"
                  spellCheck={false}
                />
              ) : (
                <div
                  onClick={() => {
                    setEditValue(JSON.stringify(displayData, null, 2));
                    setIsEditing(true);
                  }}
                  className="bg-[#1e1e1e] rounded-lg p-4 overflow-x-auto shadow-inner border border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {renderHighlightedJson(displayData)}
                </div>
              )}
            </div>
          ) : !localSelectedEleicaoCd ? (
            <>

              {/* Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar eleição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-10 p-2.5 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setStatusFilter('all')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${statusFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>Todas</button>
                  <button onClick={() => setStatusFilter('fav')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${statusFilter === 'fav' ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>Favoritas</button>
                  
                  {/* Dynamic Type Filter */}
                  <select 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)} 
                    className="text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-800 border-none rounded-full px-3 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Tipo: Todos</option>
                    {availableTypes.map(tp => (
                      <option key={tp} value={tp}>{formatTipoEleicao(tp)}</option>
                    ))}
                  </select>

                  <select 
                    value={scopeFilter} 
                    onChange={(e) => setScopeFilter(e.target.value as any)} 
                    className="text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-800 border-none rounded-full px-3 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Abrangência: Todas</option>
                    <option value="federal">Federal</option>
                    <option value="estadual">Estadual</option>
                    <option value="municipal">Municipal</option>
                  </select>

                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-800 border-none rounded-full px-3 py-1 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-blue-500 outline-none ml-auto">
                    <option value="default">Ord: Padrão</option>
                    <option value="data">Ord: Data</option>
                    <option value="tipo">Ord: Tipo</option>
                    <option value="nome">Ord: Nome</option>
                  </select>
                </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                {filteredElections.map((e: any) => (
                  <div key={e.cd} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors" onClick={() => setLocalSelectedEleicaoCd(e.cd)}>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <button onClick={(ev) => toggleFavorite(e.cd, ev)} className={favorites.has(e.cd) ? 'text-pink-500' : 'text-gray-300'}>
                          <svg className="w-5 h-5" fill={favorites.has(e.cd) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </button>
                        {e.nm.replace(/&#186;/g, 'º')}
                      </h3>
                      <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">ID: {e.cd}</span>
                    </div>
                    <div className="flex gap-2 mt-2 text-xs text-gray-500">
                      <span>Turno {e.t}</span>
                      <span>•</span>
                      <span>{formatTipoEleicao(e.tp)}</span>
                      <span>•</span>
                      <span>{e.pleitoDt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => {
                  setLocalSelectedEleicaoCd(null);
                  setMunSearchText('');
                }}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Voltar para lista de eleições
              </button>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <h3 className="font-bold text-blue-800 dark:text-blue-200">
                  {allElections.find(e => e.cd === localSelectedEleicaoCd)?.nm.replace(/&#186;/g, 'º')}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">ID: {localSelectedEleicaoCd}</p>
              </div>

              <div className="space-y-4 relative" ref={munDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selecione a Abrangência (Município/Estado)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={munSearchText}
                    onFocus={() => {
                      setIsMunDropdownOpen(true);
                      if (munSearchText) {
                        setMunSearchText('');
                      }
                    }}
                    onBlur={() => {
                      // Slight delay to allow onClick of dropdown item to fire first
                      setTimeout(() => {
                        if (!munSearchText && selectedAbrangencia) {
                          setMunSearchText(`${selectedAbrangencia.munNome} (${selectedAbrangencia.ufCd}) - Cód: ${selectedAbrangencia.munCdTse}`);
                        }
                        setIsMunDropdownOpen(false);
                      }, 200);
                    }}
                    onChange={(e) => {
                      setMunSearchText(e.target.value);
                      setIsMunDropdownOpen(true);
                    }}
                    placeholder="Buscar município ou estado..."
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                  />
                  {isEA12Loading && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>

                {isMunDropdownOpen && ea12Data && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                    {availableScopes
                      .filter(m => normalizeString(`${m.munNome} ${m.ufCd}`).includes(normalizeString(munSearchText)))
                      .slice(0, 100)
                      .map((m, idx) => (
                        <div
                          key={`${m.ufCd}-${m.munCdTse}-${idx}`}
                          className="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
                          onClick={() => {
                            // Apply selection
                            const eleicaoObj = allElections.find(e => e.cd === localSelectedEleicaoCd);
                            if (eleicaoObj) {
                              selectEleicao(eleicaoObj, ciclo);
                              selectAbrangencia(m);
                              
                              // Always set munSearchText correctly
                              const munPart = m.munCdTse ? ` - Cód: ${m.munCdTse}` : '';
                              setMunSearchText(`${m.munNome} (${m.ufCd})${munPart}`);
                              
                              // Always open EA20 when a scope is selected
                              window.dispatchEvent(new CustomEvent('open-ea20'));
                              
                              handleClose();
                            }
                          }}
                        >
                          <div className={`flex items-center gap-2 ${m.isUfWide ? 'font-bold text-blue-700 dark:text-blue-400' : ''}`}>
                            <img src={`/flags/${m.ufCd.toLowerCase()}.svg`} className="w-4 h-3 rounded-sm shadow-sm" alt={m.ufCd} />
                            <span>{m.munNome} ({m.ufCd})</span>
                            {m.isUfWide && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded uppercase tracking-wider ml-1">
                                {m.ufCd === 'BR' ? 'País' : 'Estado'}
                              </span>
                            )}
                            {m.munCdTse && <span className="text-gray-400 text-xs ml-auto">Cód: {m.munCdTse}</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {selectedAbrangencia && selectedAbrangencia.munCdTse === localSelectedEleicaoCd && (
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zona Eleitoral</label>
                  <select
                    value={selectedZona}
                    onChange={(e) => setZona(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2 text-sm"
                  >
                    <option value="Todas">Todas as Zonas</option>
                    {selectedAbrangencia.z.sort((a, b) => parseInt(a) - parseInt(b)).map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30">
          <button
            onClick={handleClose}
            className="w-full bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold py-2 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}
