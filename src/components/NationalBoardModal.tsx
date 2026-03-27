import React, { useMemo, useState, useEffect } from 'react';
import { useNationalBoard } from '../hooks/useNationalBoard';
import { UFCard } from './national-board/UFCard';
import { NationalSummary } from './national-board/NationalSummary';
import { buildNationalSummary } from '../utils/nationalBoardUtils';
import { useElection } from '../context/ElectionContext';

interface NationalBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NationalBoardModal: React.FC<NationalBoardModalProps> = ({ isOpen, onClose }) => {
  const { selectedEleicao } = useElection();
  const [selectedCargoCd, setSelectedCargoCd] = useState<string | undefined>();
  const { data, ufResults, brData, brRefetch, refetchAll, isPresidente, isLoading, isError } = useNationalBoard({
    enabled: isOpen,
    cargoCd: selectedCargoCd
  });
  const [isClosing, setIsClosing] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editedData, setEditedData] = useState<any[] | null>(null);

  // Sync editedData with data when not manually editing
  useEffect(() => {
    if (!editedData && data.length > 0) {
      // No-op, just showing data. data is already reactive from hook.
    }
  }, [data, editedData]);

  const displayData = editedData || data;

  const renderHighlightedJson = (jsonObj: any) => {
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
        className="text-sm text-gray-300 font-mono"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Sincronizado com a animação
  };

  // Reset isClosing when opened
  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

  // Reset cargo selection when election changes
  useEffect(() => {
    setSelectedCargoCd(undefined);
  }, [selectedEleicao?.cd]);

  // Extrair cargos disponíveis do EA11
  const availableCargos = useMemo(() => {
    if (!selectedEleicao) return [];
    const cargosMap = new Map<string, string>();
    selectedEleicao.abr.forEach(abr => {
      abr.cp?.forEach(cp => {
        cargosMap.set(cp.cd, cp.ds);
      });
    });
    return Array.from(cargosMap.entries())
      .map(([cd, nm]) => ({ cd, nm }))
      .filter(c => ['1', '3', '5'].includes(c.cd)) // Apenas Majoritários
      .sort((a, b) => Number(a.cd) - Number(b.cd));
  }, [selectedEleicao]);

  // Lógica de Default: Presidente (1) ou Governador (3)
  useEffect(() => {
    if (isOpen && availableCargos.length > 0 && !selectedCargoCd) {
      const hasPresident = availableCargos.find(c => c.cd === '1');
      const hasGovernor = availableCargos.find(c => c.cd === '3');
      if (hasPresident) setSelectedCargoCd('1');
      else if (hasGovernor) setSelectedCargoCd('3');
      else setSelectedCargoCd(availableCargos[0].cd);
    }
  }, [isOpen, availableCargos, selectedCargoCd]);

  // Performance: Memoizar Resumo Nacional
  const nationalSummary = useMemo(() => {
    if (!isPresidente || displayData.length === 0) return null;
    return buildNationalSummary(displayData);
  }, [isPresidente, displayData]);

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onClick={handleClose}
      />

      <div className={`fixed inset-y-0 right-0 z-[100] w-[95vw] sm:w-[90vw] flex flex-col bg-slate-50 dark:bg-slate-900 font-sans shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ${isClosing ? 'translate-x-full pointer-events-none' : 'translate-x-0'} ${isOpen ? 'animate-slide-in-right' : ''}`}>
        {/* Header do Modal */}
        <header className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <h2 className="text-xl font-black uppercase tracking-tight">Quadro Nacional</h2>
            </div>
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mt-1">
              {isPresidente ? 'Acompanhamento Presidencial' : 'Acompanhamento por UF'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* JSON Editor Controls */}
            <div className="flex items-center gap-1.5 mr-2">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-black uppercase tracking-wider transition-colors border border-slate-700"
                title="Alternar visualização do JSON consolidado"
              >
                {showRawJson ? 'Voltar ao Dashboard' : 'Ver JSON'}
              </button>

              {showRawJson && (
                <div className="flex gap-1 animate-fade-in">
                  {!isEditing ? (
                    <button
                      onClick={() => {
                        setEditValue(JSON.stringify(displayData, null, 2));
                        setIsEditing(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded uppercase tracking-wider"
                    >
                      Editar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(editValue);
                            setEditedData(parsed);
                            setIsEditing(false);
                            setShowRawJson(false); // Return to view after save
                          } catch (e) {
                            alert("JSON inválido!");
                          }
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded uppercase tracking-wider"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black rounded uppercase tracking-wider"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {editedData && (
                    <button
                      onClick={() => {
                        setEditedData(null);
                        setEditValue('');
                        setIsEditing(false);
                        setShowRawJson(false); // Return to view after reset
                      }}
                      className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-200 text-[10px] font-black rounded uppercase tracking-wider border border-red-800"
                      title="Resetar para dados originais"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setEditedData(null); // Clear override on refresh
                refetchAll();
              }}
              className={`p-2 hover:bg-slate-800 rounded-full transition-all border border-transparent hover:border-slate-700 ${isLoading ? 'animate-spin-slow text-blue-400' : 'text-slate-400 hover:text-white'}`}
              title="Atualizar Dados"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-800 rounded-full transition-all border border-transparent hover:border-slate-700 text-slate-400 hover:text-white"
              title="Fechar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Seletor de Cargos */}
        {availableCargos.length > 1 && !showRawJson && (
          <div className="bg-slate-900 px-4 pb-4 overflow-x-auto scroller-hidden flex gap-2 border-b border-slate-800 shrink-0">
            {availableCargos.map(cargo => (
              <button
                key={cargo.cd}
                onClick={() => setSelectedCargoCd(cargo.cd)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${selectedCargoCd === cargo.cd
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                  }`}
              >
                {cargo.nm}
              </button>
            ))}
          </div>
        )}

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="container mx-auto max-w-7xl">
            {showRawJson ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                    Consolidado Nacional (Estado da UI)
                  </h3>
                  {editedData && (
                    <div className="px-2 py-0.5 bg-amber-900/40 text-amber-300 text-[10px] font-bold rounded border border-amber-800 animate-pulse">
                      DADOS EDITADOS LOCALMENTE
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-[600px] p-6 font-mono text-xs bg-slate-950 text-gray-100 rounded-2xl border border-slate-800 outline-none resize-none shadow-inner"
                    spellCheck={false}
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => {
                      setEditValue(JSON.stringify(displayData, null, 2));
                      setIsEditing(true);
                    }}
                    className="bg-slate-950 rounded-2xl p-6 overflow-x-auto shadow-2xl border border-slate-800 cursor-pointer hover:border-blue-500/50 transition-colors group relative"
                  >
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded">
                      CLIQUE PARA EDITAR
                    </div>
                    {renderHighlightedJson(displayData)}
                  </div>
                )}
              </div>
            ) : (isLoading && data.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin-slow"></div>
                  </div>
                </div>
                <p className="mt-6 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">Iniciando Sincronização Nacional</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-8">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 uppercase tracking-tight">Falha Crítica de Conexão</h3>
                <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed mb-8">
                  Não conseguimos obter os dados da API do TSE. Verifique sua conexão ou tente novamente em alguns instantes.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  Recarregar Aplicação
                </button>
              </div>
            ) : (
              <>
                {/* Seção Superior: Card BR e Resumo (Apenas para Presidente) */}
                {isPresidente && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-stretch">
                    {/* Card BR Fixo */}
                    <div className="lg:col-span-4 flex flex-col">
                      <div className="flex justify-between items-end mb-3 px-1 ml-0.5">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Visão Geral: Brasil</h4>
                        {editedData && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Simulando</span>}
                      </div>
                      <div className="flex-1">
                        {isPresidente && displayData.find(u => u.cd === 'BR') ? (
                          <UFCard
                            summary={displayData.find(u => u.cd === 'BR')}
                            onSelect={handleClose}
                            onRetry={brRefetch}
                            showElectedCheck={true}
                          />
                        ) : brData ? (
                          <UFCard
                            summary={brData}
                            onSelect={handleClose}
                            onRetry={brRefetch}
                            showElectedCheck={true}
                          />
                        ) : (
                          <UFCard isLoading onSelect={() => { }} />
                        )}
                      </div>
                    </div>

                    {/* Resumo Nacional (Apenas Presidente) */}
                    <div className="lg:col-span-8 flex flex-col">
                      <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 px-1 ml-0.5">Indicadores Regionais</h4>
                      <div className="flex-1">
                        {nationalSummary && (
                          <NationalSummary summary={nationalSummary} />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid de UFs */}
                <div className="flex justify-between items-end mb-6 px-1">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resultados das Unidades Federativas</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">
                      {editedData ? `Simulando ${displayData.filter(u => u.cd !== 'BR').length} UFs` : 'Todos os Estados'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {displayData
                    .filter(u => u.cd !== 'BR')
                    .map(item => (
                      <UFCard
                        key={item.cd}
                        summary={item}
                        onSelect={handleClose}
                        onRetry={() => { }} // No individualized retry for simulated data
                        isLoading={false}
                        showElectedCheck={!isPresidente}
                      />
                    ))
                  }
                  {/* Fallback to original results if no edited data and not all UFs loaded yet */}
                  {!editedData && ufResults.length > 0 && data.length < 27 && ufResults.map(res => (
                    !data.find(d => d.cd === res.data?.cd) && (
                      <UFCard
                        key={res.data?.cd || Math.random()}
                        summary={res.data || undefined}
                        onSelect={handleClose}
                        onRetry={res.refetch}
                        isLoading={res.isLoading && !res.data}
                        showElectedCheck={!isPresidente}
                      />
                    )
                  ))}
                  {isLoading && data.length === 0 && Array.from({ length: 27 }).map((_, i) => <UFCard key={i} isLoading onSelect={() => { }} />)}
                </div>

                {/* Footer Informativo */}
                <footer className="mt-16 py-12 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-4 opacity-40">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] mb-2">
                    Sincronização Manual
                  </p>
                  {editedData && (
                    <div className="text-[8px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 font-black uppercase tracking-widest animate-pulse">
                      Simulação Ativa: Dados Editados Localmente
                    </div>
                  )}
                </footer>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
};
