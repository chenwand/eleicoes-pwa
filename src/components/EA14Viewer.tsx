import { useQuery } from '@tanstack/react-query';
import { fetchEA14 } from '../services/ea14Service';
import { validateEA14 } from '../services/ea14Validator';
import { useEffect, useRef, useMemo, useState } from 'react';
import { EA15Viewer } from './EA15Viewer';
import { useEnvironment } from '../context/EnvironmentContext';

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
  relatedEleicaoCd?: string;
  relatedEleicaoTurno?: '1' | '2';
  onChangeEleicao?: (cd: string) => void;
}

export function EA14Viewer({ ciclo, eleicaoCd, eleicaoNome, onClose, relatedEleicaoCd, relatedEleicaoTurno, onChangeEleicao }: EA14ViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedUf, setExpandedUf] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [selectedEA15Uf, setSelectedEA15Uf] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'default' | 'recent' | 'eleitores' | 'comparecimento' | 'abstencao' | 'pst'>('default');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match slide-out duration
  };

  const { ambiente } = useEnvironment();

  const { data, isLoading, isError, error, refetch: refetchEA14, isFetching: isEA14Fetching } = useQuery({
    queryKey: ['ea14-data', ciclo, eleicaoCd, ambiente],
    queryFn: () => fetchEA14(ciclo, eleicaoCd, ambiente),
    enabled: !!eleicaoCd && !!ciclo,
  });

  const validationResults = useMemo(() => {
    if (!data) return [];
    return validateEA14(data);
  }, [data]);

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
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] md:w-1/2 lg:w-7/12 xl:w-8/12 bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto border-l border-gray-200 dark:border-slate-800 flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      >
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Acompanhamento BR (EA14)
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {eleicaoNome}
                </p>
                {relatedEleicaoCd && onChangeEleicao && (
                  <button
                    onClick={() => onChangeEleicao(relatedEleicaoCd)}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    Ir para {relatedEleicaoTurno}º Turno
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchEA14()}
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

          {!selectedEA15Uf && data && (
            <div className="text-xs text-gray-400 dark:text-gray-500 text-right -mt-2">
              Arquivo gerado em:{' '}
              <a
                href={`https://resultados.tse.jus.br/${ambiente}/${ciclo}/${eleicaoCd}/dados/br/br-e${eleicaoCd.padStart(6, '0')}-ab.json`}
                target="_blank"
                rel="noreferrer"
                className="font-mono hover:text-blue-500 dark:hover:text-blue-400 underline underline-offset-2 transition-colors"
                title="Abrir / baixar JSON EA14"
              >
                {data.dg} {data.hg} ↓
              </a>
            </div>
          )}
        </div>

        {selectedEA15Uf ? (
          <div className="flex-1 bg-gray-50 dark:bg-slate-900/50">
            <EA15Viewer
              ciclo={ciclo}
              eleicaoCd={eleicaoCd}
              uf={selectedEA15Uf}
              onBack={() => setSelectedEA15Uf(null)}
              relatedEleicaoCd={relatedEleicaoCd}
              relatedEleicaoTurno={relatedEleicaoTurno}
              onChangeEleicao={onChangeEleicao}
            />
          </div>
        ) : (
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
            ) : data && data.abr ? (
              <div className="space-y-6">

                {showRawJson ? (
                  <div className="bg-[#1e1e1e] rounded-lg p-4 overflow-x-auto shadow-inner border border-gray-700">
                    {renderHighlightedJson(data)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Find the BR entry to put it at the top if it exists */}
                    {data.abr.filter((a: any) => a.cdabr === 'br').map((br: any) => {
                      const brErrors = getErrorsForAbr('br');
                      const hasErrors = brErrors.length > 0;
                      const ufsFinalizadas = data.abr.filter(a => a.cdabr !== 'br' && a.and === 'f').length;
                      const totalUfs = data.abr.filter(a => a.cdabr !== 'br').length;

                      return (
                        <div key="br" className={`border-l-4 rounded p-4 shadow-sm mb-6 ${hasErrors ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase flex items-center gap-2">
                              <img src="/flags/br.svg" alt="Brasil" className="w-5 h-4 object-contain rounded-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              Brasil
                            </h3>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${br.and === 'f' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
                              {br.and === 'f' ? 'Finalizado' : 'Em andamento'}
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Seções Totalizadas</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{br.s.pst}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${parseFloat(br.s.pst.replace(',', '.'))}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <span>{ufsFinalizadas} de {totalUfs} UFs finalizadas</span>
                              <span>{parseInt(br.s.st).toLocaleString('pt-BR')} de {parseInt(br.s.ts).toLocaleString('pt-BR')} seções</span>
                            </div>
                          </div>

                          {hasErrors && (
                            <div className="mt-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-2 text-xs text-red-700 dark:text-red-300">
                              <strong className="flex items-center gap-1 mb-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                Inconsistências Identificadas:
                              </strong>
                              <ul className="list-disc pl-5 space-y-1">
                                {brErrors.map((err, i) => <li key={i}>{err}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
                      <h3 className="font-medium text-gray-700 dark:text-gray-300">
                        Por Unidade da Federação
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
                      {data.abr
                        .filter((a: any) => a.cdabr !== 'br')
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
                            const pctA = parseFloat(a.s.pst.replace(',', '.'));
                            const pctB = parseFloat(b.s.pst.replace(',', '.'));
                            return pctB - pctA;
                          }
                          if (sortMode === 'eleitores') {
                            return parseInt(b.e.te) - parseInt(a.e.te);
                          }
                          if (sortMode === 'comparecimento') {
                            return parseFloat(b.e.pc.replace(',', '.')) - parseFloat(a.e.pc.replace(',', '.'));
                          }
                          if (sortMode === 'abstencao') {
                            return parseFloat(b.e.pa.replace(',', '.')) - parseFloat(a.e.pa.replace(',', '.'));
                          }

                          // Default: % seções descending, then alphabetical
                          const pctA = parseFloat(a.s.pst.replace(',', '.'));
                          const pctB = parseFloat(b.s.pst.replace(',', '.'));
                          if (pctA !== pctB) return pctB - pctA;
                          return a.cdabr.localeCompare(b.cdabr);
                        })
                        .map((uf: any) => {
                          const pct = parseFloat(uf.s.pst.replace(',', '.'));
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
                                  {uf.cdabr}
                                </div>
                                <span className={`font-semibold ${pctColor}`}>{uf.s.pst}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-1">
                                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Eleitores: {parseInt(uf.e.te).toLocaleString('pt-BR')}</span>
                                <span>Comp: {uf.e.pc}%</span>
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
                                      <span className="font-medium">{parseInt(uf.e.te).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Comparecimento:</span>
                                      <span className="font-medium text-blue-600 dark:text-blue-400">{parseInt(uf.e.c).toLocaleString('pt-BR')} ({uf.e.pc}%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Abstenção:</span>
                                      <span className="font-medium text-gray-500">{parseInt(uf.e.a).toLocaleString('pt-BR')} ({uf.e.pa}%)</span>
                                    </div>
                                  </div>

                                  <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5">
                                    <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Seções</div>
                                    <div className="flex justify-between">
                                      <span>Totalizadas:</span>
                                      <span className="font-medium text-green-600 dark:text-green-400">{parseInt(uf.s.st).toLocaleString('pt-BR')} de {parseInt(uf.s.ts).toLocaleString('pt-BR')}</span>
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
                                      <span className="font-medium text-green-600 dark:text-green-400">{parseInt(uf.munf).toLocaleString('pt-BR')} ({uf.pmunf}%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Parciais:</span>
                                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{parseInt(uf.munpt).toLocaleString('pt-BR')} ({uf.pmunpt}%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Não iniciados:</span>
                                      <span className="font-medium text-gray-500">{parseInt(uf.munnr).toLocaleString('pt-BR')} ({uf.pmunnr}%)</span>
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
