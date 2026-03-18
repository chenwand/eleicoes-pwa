import { useQuery } from '@tanstack/react-query';
import { fetchEA15 } from '../services/ea15Service';
import { fetchEA12, flattenEA12Municipios } from '../services/ea12Service';
import { useMemo, useState, useEffect } from 'react';
import { useEnvironment } from '../context/EnvironmentContext';
import { validateEA15, getEA15ErrorsForAbr } from '../services/ea15Validator';
import { EA20Viewer } from './EA20Viewer';

const renderHighlightedJson = (jsonObj: any) => {
  const json = JSON.stringify(jsonObj, null, 2).replace(/[&<>]/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c;
  });
  const highlighted = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-blue-400';
    if (/^"/.test(match)) {
      cls = /:$/.test(match) ? 'text-purple-400 font-semibold' : 'text-green-400 break-all whitespace-pre-wrap';
    } else if (/true|false/.test(match)) {
      cls = 'text-orange-400 font-medium';
    } else if (/null/.test(match)) {
      cls = 'text-red-400 font-medium';
    }
    return `<span class="${cls}">${match}</span>`;
  });
  return <pre className="text-xs sm:text-sm text-gray-300 font-mono" dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

interface EA15ViewerProps {
  ciclo: string;
  eleicaoCd: string;
  uf: string;
  onBack: () => void;
  relatedEleicaoCd?: string;
  relatedEleicaoTurno?: '1' | '2';
  onChangeEleicao?: (cd: string) => void;
  ea14dg?: string;
  ea14hg?: string;
  /** Cargos from EA11 to pass to EA20Viewer */
  cargosDisponiveis?: { cd: string; nm: string }[];
  initialLocalData?: any;
}

export function EA15Viewer({ ciclo, eleicaoCd, uf, onBack, relatedEleicaoCd, relatedEleicaoTurno, onChangeEleicao, ea14dg, ea14hg, cargosDisponiveis = [], initialLocalData }: EA15ViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [expandedMun, setExpandedMun] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'f' | 'p' | 'nr' | 'fav'>('all');
  const [sortMode, setSortMode] = useState<'default' | 'recent' | 'eleitores' | 'comparecimento' | 'abstencao' | 'pst'>('default');
  const [isClosing, setIsClosing] = useState(false);
  const { ambiente, host } = useEnvironment();
  const [localData, setLocalData] = useState<any>(initialLocalData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [ea20Mun, setEa20Mun] = useState<{ cdabr: string; nome: string } | null>(null);

  const handleBack = () => {
    setIsClosing(true);
    setTimeout(() => {
      onBack();
    }, 300); // Match slide-out duration
  };

  // Favorites — persisted per election + UF
  const favKey = `ea15-fav-${eleicaoCd}-${uf.toLowerCase()}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(favKey);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const toggleFavorite = (cdabr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(cdabr)) next.delete(cdabr); else next.add(cdabr);
      localStorage.setItem(favKey, JSON.stringify([...next]));
      return next;
    });
  };

  // Fetch EA15 Data
  const { data: ea15Data, isLoading: isEA15Loading, isError: isEA15Error, error: ea15Error, refetch: refetchEA15, isFetching: isEA15Fetching } = useQuery({
    queryKey: ['ea15-data', ciclo, eleicaoCd, uf, ambiente, host],
    queryFn: () => fetchEA15(ciclo, eleicaoCd, uf, ambiente, host),
    enabled: !!eleicaoCd && !!ciclo && !!uf && !initialLocalData,
    staleTime: 30000,
  });

  useEffect(() => {
    if (ea15Data) {
      setLocalData(ea15Data);
      setIsModified(false);
    }
  }, [ea15Data]);

  // Fetch EA12 to resolve municipality codes to names
  const { data: ea12Data, isLoading: isEA12Loading } = useQuery({
    queryKey: ['ea12-data', ciclo, eleicaoCd, ambiente, host],
    queryFn: () => fetchEA12(ciclo, eleicaoCd, ambiente, host),
    enabled: !!eleicaoCd && !!ciclo,
    staleTime: Infinity,
  });

  // Normalize string for searching
  const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Create a dictionary for optimized municipality name lookups and a set of capitals
  const { munDict, capitalSet } = useMemo(() => {
    if (!ea12Data) return { munDict: new Map<string, string>(), capitalSet: new Set<string>() };
    const flat = flattenEA12Municipios(ea12Data);
    const munDict = new Map<string, string>();
    const capitalSet = new Set<string>();
    flat.forEach(m => {
      munDict.set(m.munCdTse, m.munNome);
      if (m.isCapital) capitalSet.add(m.munCdTse);
    });
    return { munDict, capitalSet };
  }, [ea12Data]);

  // Run semantic validation on the whole EA15 dataset (must be before filteredMuns)
  const validationResults = useMemo(() => {
    if (!localData) return [];
    return validateEA15(localData);
  }, [localData]);

  const getErrorsForMun = (cdabr: string) => getEA15ErrorsForAbr(validationResults, cdabr);

  // Filter and sort municipalities
  const filteredMuns = useMemo(() => {
    if (!localData || !localData.abr) return [];

    const ufObj = localData.abr.find((a: any) => a.cdabr === uf.toLowerCase());
    if (!ufObj) return [];

    // UFs sometimes send the state tracking data inside the abr array along with municipalities
    const munsOnly = localData.abr.filter((a: any) => a.tpabr === 'mun' || (a.cdabr !== uf.toLowerCase() && a.cdabr !== 'br'));

    return munsOnly
      .filter((mun: any) => {
        // Status filter
        if (statusFilter === 'fav' && !favorites.has(mun.cdabr)) return false;
        if (statusFilter === 'f' && mun.and !== 'f') return false;
        if (statusFilter === 'p' && mun.and !== 'p') return false;
        if (statusFilter === 'nr' && (mun.and === 'f' || mun.and === 'p')) return false;
        // Text search
        if (!searchTerm) return true;
        const name = munDict.get(mun.cdabr) || '';
        const search = normalize(searchTerm);
        return normalize(name).includes(search) || mun.cdabr.includes(search);
      })
      .sort((a: any, b: any) => {
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
        // Numeric metric sorts — favorites still pinned first
        const aFav = favorites.has(a.cdabr) ? 0 : 1;
        const bFav = favorites.has(b.cdabr) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;

        if (sortMode === 'eleitores') return parseInt(b.e.te) - parseInt(a.e.te);
        if (sortMode === 'comparecimento') return parseFloat(b.e.pc.replace(',', '.')) - parseFloat(a.e.pc.replace(',', '.'));
        if (sortMode === 'abstencao') return parseFloat(b.e.pa.replace(',', '.')) - parseFloat(a.e.pa.replace(',', '.'));
        if (sortMode === 'pst') return parseFloat(b.s.pst.replace(',', '.')) - parseFloat(a.s.pst.replace(',', '.'));

        const aErrors = getEA15ErrorsForAbr(validationResults, a.cdabr).length;
        const bErrors = getEA15ErrorsForAbr(validationResults, b.cdabr).length;
        if (aErrors !== bErrors) return bErrors - aErrors;

        const pctA = parseFloat(a.s.pst.replace(',', '.'));
        const pctB = parseFloat(b.s.pst.replace(',', '.'));
        if (pctA !== pctB) return pctB - pctA;

        const nameA = munDict.get(a.cdabr) || a.cdabr;
        const nameB = munDict.get(b.cdabr) || b.cdabr;
        return nameA.localeCompare(nameB);
      });
  }, [localData, searchTerm, munDict, uf, validationResults, statusFilter, sortMode, favorites]);

  // Counts for filter pill labels
  const munCounts = useMemo(() => {
    if (!localData?.abr) return { all: 0, f: 0, p: 0, nr: 0, fav: 0 };
    const muns = localData.abr.filter((a: any) => a.tpabr === 'mun' || (a.cdabr !== uf.toLowerCase() && a.cdabr !== 'br'));
    return {
      all: muns.length,
      f: muns.filter((m: any) => m.and === 'f').length,
      p: muns.filter((m: any) => m.and === 'p').length,
      nr: muns.filter((m: any) => m.and !== 'f' && m.and !== 'p').length,
      fav: muns.filter((m: any) => favorites.has(m.cdabr)).length,
    };
  }, [localData, uf, favorites]);

  // Try to extract General UF stats from the JSON (usually it's the item matching the UF code or the first item if none matches)
  const ufStats = useMemo(() => {
    if (!localData?.abr) return null;
    return localData.abr.find((a: any) => a.cdabr === uf.toLowerCase() || a.tpabr === 'uf') || null;
  }, [localData, uf]);

  // Check if EA15 is outdated compared to EA14
  const isEA15Outdated = useMemo(() => {
    if (!localData || !ea14dg || !ea14hg) return false;

    const parseTimestamp = (dg: string, hg: string) => {
      const [d, m, y] = dg.split('/').map(Number);
      const [h, min, s] = hg.split(':').map(Number);
      return new Date(y, m - 1, d, h, min, s).getTime();
    };

    const ea15Ts = parseTimestamp(localData.dg, localData.hg);
    const ea14Ts = parseTimestamp(ea14dg, ea14hg);

    return ea15Ts < ea14Ts;
  }, [localData, ea14dg, ea14hg]);


  if (isEA15Loading || isEA12Loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Validando acompanhamento UF...</p>
      </div>
    );
  }

  if (isEA15Error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Voltar</h3>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-6 text-center">
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Erro ao carregar (EA15)</h3>
          <p className="text-red-600 dark:text-red-300 text-sm">
            {ea15Error instanceof Error ? ea15Error.message : 'Falha ao buscar acompanhamento dessa UF.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900 relative rounded-md shadow-sm ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center shadow-sm"
              title="Voltar para Acompanhamento BR"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span>Acompanhamento UF (EA15)</span>
                <span className="uppercase text-gray-500 dark:text-gray-400 text-base font-semibold">· {uf}</span>
              </h2>
              {relatedEleicaoCd && onChangeEleicao && (
                <div className="mt-1">
                  <button
                    onClick={() => onChangeEleicao(relatedEleicaoCd)}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors inline-flex"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    Ir para {relatedEleicaoTurno}º Turno
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refetchEA15().then((result) => {
                  if (result.data) {
                    setLocalData(result.data);
                    setIsModified(false);
                    setIsEditing(false);
                  }
                });
              }}
              disabled={isEA15Fetching}
              className={`p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors ${isEA15Fetching ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Atualizar dados (EA15)"
            >
              <svg className={`w-5 h-5 ${isEA15Fetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
            >
              {showRawJson ? 'Painel Visual' : 'Ver JSON'}
            </button>
          </div>
        </div>

        {localData && (() => {
          const ufLower = uf.toLowerCase();
          const paddedCd = eleicaoCd.padStart(6, '0');
          const jsonUrl = `${host}/${ambiente}/${ciclo}/${eleicaoCd}/dados/${ufLower}/${ufLower}-e${paddedCd}-ab.json`;
          return (
            <div className="flex flex-col items-end -mt-2 mb-3">
              <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
                Arquivo gerado em:{' '}
                <a
                  href={jsonUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono hover:text-blue-500 dark:hover:text-blue-400 underline underline-offset-2 transition-colors"
                  title="Abrir / baixar JSON EA15"
                >
                  {localData.dg} {localData.hg} ↓
                </a>
              </div>
              {isModified && (
                <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 animate-pulse">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Dados editados localmente
                </div>
              )}
              {isEA15Outdated && (
                <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 animate-pulse">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Arquivo desatualizado (UF no EA14 em {ea14hg} &gt; EA15 em {localData.hg})
                </div>
              )}
            </div>
          );
        })()}

        {!showRawJson && ufStats && (() => {
          const ufNome = ea12Data?.abr?.find((a: any) => a.cd.toLowerCase() === uf.toLowerCase())?.ds || uf.toUpperCase();
          const isDone = ufStats.and === 'f';
          const munsFinalizadas = parseInt(ufStats.munf || '0');
          const munsParciais = parseInt(ufStats.munpt || '0');
          const munsNaoIniciadas = parseInt(ufStats.munnr || '0');
          const totalMuns = munsFinalizadas + munsParciais + munsNaoIniciadas;
          const maxMuns = Math.max(munsFinalizadas, munsParciais, munsNaoIniciadas);

          const getBarHeight = (val: number) => {
            if (val === 0) return '0%';
            if (maxMuns === 0) return '0%';

            const values = [munsFinalizadas, munsParciais, munsNaoIniciadas]
              .filter(v => v > 0)
              .sort((a, b) => b - a);

            const uniqueValues = Array.from(new Set(values));

            if (val === uniqueValues[0]) return '100%';
            if (uniqueValues.length > 1 && val === uniqueValues[1]) return '60%';
            if (uniqueValues.length > 2 && val === uniqueValues[2]) return '30%';

            return '30%'; // fallback
          };

          return (
            <div className={`mb-4 border-l-4 rounded p-4 shadow-sm flex flex-col md:flex-row gap-6 ${isDone ? 'bg-green-50 dark:bg-green-900/10 border-green-500' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'}`}>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase flex items-center gap-2">
                    <img src={`/flags/${uf.toLowerCase()}.svg`} alt={uf} className="w-5 h-4 object-contain rounded-sm shadow-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    {ufNome}
                  </h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDone ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
                    {isDone ? 'Finalizado' : 'Em andamento'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Seções Totalizadas</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{ufStats.s.pst}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${isDone ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${parseFloat(ufStats.s.pst.replace(',', '.'))}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{parseInt(ufStats.s.st).toLocaleString('pt-BR')} de {parseInt(ufStats.s.ts).toLocaleString('pt-BR')} seções</span>
                  </div>
                </div>

                {(() => {
                  const ufErrors = getErrorsForMun(ufStats.cdabr);
                  if (ufErrors.length === 0) return null;
                  return (
                    <div className="mt-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded p-3 text-xs text-red-700 dark:text-red-300">
                      <strong className="flex items-center gap-1 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        Inconsistências no Consolidado UF:
                      </strong>
                      <ul className="list-disc pl-5 space-y-1">
                        {ufErrors.map((err: any, i: number) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  );
                })()}
              </div>

              {/* Chart Side */}
              <div className="md:w-56 bg-white/60 dark:bg-slate-800/60 rounded p-3 flex flex-col border border-gray-100 dark:border-slate-700/50 shadow-sm">
                <div className="text-xs font-semibold text-gray-60:0 dark:text-gray-400 mb-1 text-center">
                  Status dos Municípios ({totalMuns})
                </div>
                <div className="flex-1 flex items-end justify-center gap-4 h-32 mt-2">
                  <div className="flex flex-col items-center gap-1 group h-full justify-end w-5 sm:w-6">
                    <div className="text-[10px] font-medium text-gray-500 shrink-0">{munsNaoIniciadas}</div>
                    <div className="flex-1 w-full relative">
                      <div className="absolute bottom-0 w-full bg-gray-300 dark:bg-slate-600 rounded-t transition-all duration-500 group-hover:opacity-80 min-h-[2px]" style={{ height: getBarHeight(munsNaoIniciadas) }}></div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium shrink-0" title="Não Iniciados">NI</div>
                  </div>
                  <div className="flex flex-col items-center gap-1 group h-full justify-end w-5 sm:w-6">
                    <div className="text-[10px] font-medium text-yellow-600 dark:text-yellow-500 shrink-0">{munsParciais}</div>
                    <div className="flex-1 w-full relative">
                      <div className="absolute bottom-0 w-full bg-yellow-400 dark:bg-yellow-500 rounded-t transition-all duration-500 group-hover:opacity-80 min-h-[2px]" style={{ height: getBarHeight(munsParciais) }}></div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium shrink-0" title="Parciais">PA</div>
                  </div>
                  <div className="flex flex-col items-center gap-1 group h-full justify-end w-5 sm:w-6">
                    <div className="text-[10px] font-medium text-green-600 dark:text-green-500 shrink-0">{munsFinalizadas}</div>
                    <div className="flex-1 w-full relative">
                      <div className="absolute bottom-0 w-full bg-green-500 dark:bg-green-500 rounded-t transition-all duration-500 group-hover:opacity-80 min-h-[2px]" style={{ height: getBarHeight(munsFinalizadas) }}></div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium shrink-0" title="Finalizados">FI</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {!showRawJson && <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Buscar município por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5 transition-colors"
            />
          </div>

          {/* Filter pills + sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 flex-1">
              {([
                { key: 'all', label: `Todos (${munCounts.all})` },
                { key: 'fav', label: `♥ Favoritos (${munCounts.fav})` },
                { key: 'f', label: `✓ Finalizados (${munCounts.f})` },
                { key: 'p', label: `⟳ Parciais (${munCounts.p})` },
                { key: 'nr', label: `○ Não recebidos (${munCounts.nr})` },
              ] as const).map(({ key, label }) => {
                const active = statusFilter === key;
                const colorMap: Record<string, string> = {
                  all: active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                  fav: active ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                  f: active ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                  p: active ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                  nr: active ? 'bg-gray-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                };
                return (
                  <button
                    key={key}
                    onClick={() => { setStatusFilter(key); setExpandedMun(null); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${colorMap[key]}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
              className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 transition-colors"
            >
              <option value="default">Ordenar: Padrão</option>
              <option value="recent">↓ Mais recentes</option>
              <option value="pst">↓ % Seções totalizadas</option>
              <option value="eleitores">↓ Eleitores</option>
              <option value="comparecimento">↓ % Comparecimento</option>
              <option value="abstencao">↓ % Abstenção</option>
            </select>
          </div>
        </div>}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredMuns.map((mun: any) => {
              const pct = parseFloat(mun.s.pst.replace(',', '.'));
              const isDone = mun.and === 'f';
              const isPartial = mun.and === 'p';
              const munErrors = getErrorsForMun(mun.cdabr);
              const hasErrors = munErrors.length > 0;
              const munName = munDict.get(mun.cdabr) || `Cod: ${mun.cdabr}`;
              const isCapital = capitalSet.has(mun.cdabr);
              const isFav = favorites.has(mun.cdabr);

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
                  key={mun.cdabr}
                  onClick={() => setExpandedMun(expandedMun === mun.cdabr ? null : mun.cdabr)}
                  className={`border rounded p-3 text-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-all ${borderBg}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 leading-tight flex items-center gap-1.5 flex-wrap">
                        {isCapital && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                            ⭐ Capital
                          </span>
                        )}
                        {munName}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => toggleFavorite(mun.cdabr, e)}
                          title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          className={`p-0.5 rounded transition-colors ${isFav ? 'text-pink-500 hover:text-pink-600' : 'text-gray-300 dark:text-gray-600 hover:text-pink-400'}`}
                        >
                          <svg className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                        <span className={`font-mono font-bold text-xs ${pctColor}`}>
                          {mun.s.pst}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                      <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>Eleitores: <strong className="text-gray-700 dark:text-gray-300">{parseInt(mun.e.te).toLocaleString('pt-BR')}</strong></span>
                      <span>Comp: <strong className="text-blue-600 dark:text-blue-400">{mun.e.pc}%</strong></span>
                    </div>

                    {hasErrors && (
                      <div className="mt-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded p-1.5 text-xs text-red-700 dark:text-red-300" onClick={(e) => e.stopPropagation()}>
                        <strong className="flex items-center gap-1 mb-1">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          Inconsistências:
                        </strong>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {munErrors.map((err: any, i: number) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}

                    {expandedMun === mun.cdabr && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-1.5 text-xs text-gray-600 dark:text-gray-400" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between">
                          <span>Código:</span>
                          <span className="font-mono">{mun.cdabr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Atualizado:</span>
                          <span className="font-mono">{mun.dt} {mun.ht}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Andamento:</span>
                          <span className={`font-semibold ${isDone ? 'text-green-600 dark:text-green-400' : isPartial ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {isDone ? 'Finalizado' : isPartial ? 'Parcial' : 'Não iniciado'}
                          </span>
                        </div>
                        <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5 mt-1">
                          <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Eleitores</div>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">{parseInt(mun.e.te).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Comparecimento:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{parseInt(mun.e.c).toLocaleString('pt-BR')} ({mun.e.pc}%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Abstenção:</span>
                            <span className="font-medium text-gray-500">{parseInt(mun.e.a).toLocaleString('pt-BR')} ({mun.e.pa}%)</span>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5">
                          <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Seções</div>
                          <div className="flex justify-between">
                            <span>Totalizadas:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{parseInt(mun.s.st).toLocaleString('pt-BR')} de {parseInt(mun.s.ts).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Não totalizadas:</span>
                            <span className="font-medium text-gray-500">{parseInt(mun.s.snt).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        {cargosDisponiveis && cargosDisponiveis.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                            <button
                              className="w-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium py-1.5 px-3 rounded transition-colors text-xs flex justify-center items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEa20Mun({ cdabr: mun.cdabr, nome: munName });
                              }}
                            >
                              Ver Resultados (EA20)
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredMuns.length === 0 && !showRawJson && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p className="text-sm font-medium">Nenhum município encontrado</p>
            {searchTerm && <p className="text-xs mt-1">Tente buscar por outro termo.</p>}
          </div>
        )}

        {/* ── EA20 Viewer Overlay ── */}
        {ea20Mun && (
          <EA20Viewer
            ciclo={ciclo}
            eleicaoCd={eleicaoCd}
            uf={uf}
            cdMun={ea20Mun.cdabr}
            munNome={ea20Mun.nome}
            cargosDisponiveis={cargosDisponiveis}
            onBack={() => setEa20Mun(null)}
          />
        )}
      </div>
    </div>
  );
}
