import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA14 } from '../services/ea14Service';
import { useEnvironment } from '../context/EnvironmentContext';
import { REGIONS, calculateRegionTotals } from '../utils/electionUtils';

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

interface RegionalSummaryProps {
  ciclo: string;
  eleicaoCd: string;
  eleicaoNome: string;
  onClose: () => void;
  onViewRegion: (regionCd: string) => void;
  initialLocalData?: any;
}

export function RegionalSummary({ ciclo, eleicaoCd, eleicaoNome, onClose, onViewRegion, initialLocalData }: RegionalSummaryProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { ambiente, host } = useEnvironment();
  
  const [showRawJson, setShowRawJson] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isModified, setIsModified] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ea14-data', ciclo, eleicaoCd, ambiente, host],
    queryFn: () => fetchEA14(ciclo, eleicaoCd, ambiente, host),
    enabled: !!eleicaoCd && !!ciclo && !initialLocalData,
  });

  const [localData, setLocalData] = useState<any>(initialLocalData || null);

  useEffect(() => {
    if (data && !initialLocalData && !isModified) {
      setLocalData(data);
    }
  }, [data, initialLocalData, isModified]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const regionData = useMemo(() => {
    if (!localData) return [];
    return REGIONS.map(r => ({
      ...r,
      data: calculateRegionTotals(localData, r.cd)
    })).filter(r => !!r.data);
  }, [localData]);

  const brData = regionData.find(r => r.cd === 'BR')?.data;
  const otherRegions = regionData.filter(r => r.cd !== 'BR');

  if (isLoading && !localData) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium font-sans">Carregando Resumo Regional...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black/60 z-[100] flex justify-end backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div
        ref={panelRef}
        className={`w-full max-w-4xl bg-gray-50 dark:bg-slate-900 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isClosing ? 'translate-x-full' : 'translate-x-0'}`}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-base">🌎</span>
                Resumo Regional
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {eleicaoNome} — {ciclo}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className={`p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all text-gray-500 dark:text-gray-400 ${isFetching ? 'animate-spin text-blue-500' : ''}`}
                title="Atualizar dados"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                  showRawJson 
                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                {showRawJson ? 'Resumo' : 'JSON'}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-gray-400 ml-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {brData && (
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 p-1.5 px-2 rounded-lg border border-gray-100 dark:border-slate-800">
               <div className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                EA14 CONSOLIDADO NACIONAL
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Gerado em: <span className="font-bold">{brData.dt} {brData.ht}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50 dark:bg-slate-900/50">
          {isError ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-4 rounded-xl text-center">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">Erro ao carregar dados regionais.</p>
              <button onClick={() => refetch()} className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors">
                Tentar Novamente
              </button>
            </div>
          ) : showRawJson ? (
             <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    Conteúdo do Arquivo EA14
                  </div>
                  <div className="flex gap-1.5">
                    {!isEditing ? (
                      <button
                        onClick={() => {
                          setEditValue(JSON.stringify(localData, null, 2));
                          setIsEditing(true);
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
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
                            } catch (e) {
                              alert("JSON inválido!");
                            }
                          }}
                          className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded transition-colors"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-2.5 py-1 bg-gray-500 hover:bg-gray-600 text-white text-[10px] font-bold rounded transition-colors"
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
                    className="w-full h-[500px] p-3 font-mono text-xs bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none resize-none shadow-inner"
                    spellCheck={false}
                  />
                ) : (
                  <div 
                    onClick={() => {
                      setEditValue(JSON.stringify(localData, null, 2));
                      setIsEditing(true);
                    }}
                    className="bg-[#1e1e1e] rounded-lg p-3 overflow-x-auto shadow-inner border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors group relative"
                  >
                     <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/80 text-white text-[9px] px-1 py-0.5 rounded pointer-events-none">
                        Clique para editar
                     </div>
                    {renderHighlightedJson(localData)}
                  </div>
                )}
             </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* National Summary */}
              {brData && (
                <div 
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-blue-500/30 overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group relative"
                  onClick={() => onViewRegion('BR')}
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                  <div className="p-4 pl-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl drop-shadow-sm">🇧🇷</span>
                        <div>
                          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Brasil</h3>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-0.5">Visão consolidada nacional</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                            brData.and === 'f' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                          }`}>
                            {brData.and === 'f' ? 'Finalizado' : 'Em andamento'}
                          </span>
                          <div className="p-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">Seções Totalizadas</span>
                          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tighter leading-none">{brData.s.pst}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden p-0.5 shadow-inner">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                            style={{ width: `${brData.s.pst.replace(',', '.')}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase tracking-tight opacity-70">
                          <span>{parseInt(brData.s.st).toLocaleString()} processadas</span>
                          <span>{parseInt(brData.s.ts).toLocaleString()} total</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-inner">
                        <div className="text-center">
                          <div className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-0.5">Comparecimento</div>
                          <div className="text-xl font-black text-gray-900 dark:text-white font-mono tracking-tighter">{brData.e.pc}%</div>
                        </div>
                        <div className="text-center border-l border-gray-200 dark:border-slate-700">
                          <div className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-0.5">Abstenção</div>
                          <div className="text-xl font-black text-gray-900 dark:text-white font-mono tracking-tighter">{brData.e.pa}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                {otherRegions.map((r) => (
                  <div 
                    key={r.cd}
                    className="bg-white dark:bg-slate-800 rounded-xl p-3.5 shadow-sm border border-gray-100 dark:border-slate-700 hover:border-blue-500/40 hover:shadow-lg group cursor-pointer transition-all duration-300 relative overflow-hidden"
                    onClick={() => onViewRegion(r.cd)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300">{r.icon}</span>
                        <div>
                          <h4 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tighter leading-tight">{r.nm}</h4>
                          <span className={`text-[7px] font-black uppercase tracking-widest ${
                            r.data.and === 'f' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {r.data.and === 'f' ? 'F' : 'P'}
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Totalizado</span>
                          <span className="font-black text-lg text-blue-600 dark:text-blue-400 tracking-tighter font-mono">{r.data.s.pst}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 shadow-inner">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-700" 
                            style={{ width: `${r.data.s.pst.replace(',', '.')}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center bg-gray-50/80 dark:bg-slate-900/40 p-2 rounded-lg border border-gray-100/50 dark:border-slate-700/50">
                        <div className="flex flex-col">
                          <span className="uppercase font-black text-[7px] tracking-widest text-gray-400">Comp.</span>
                          <span className="text-gray-900 dark:text-white font-black text-xs tracking-tighter font-mono">{r.data.e.pc}%</span>
                        </div>
                        <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
                        <div className="flex flex-col items-end">
                          <span className="uppercase font-black text-[7px] tracking-widest text-gray-400">Abst.</span>
                          <span className="text-gray-900 dark:text-white font-black text-xs tracking-tighter font-mono">{r.data.e.pa}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
