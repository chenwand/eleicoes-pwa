import React from 'react';
import type { UFSummary } from '../../utils/nationalBoardUtils';
import { useElection } from '../../context/ElectionContext';

interface UFCardProps {
  summary?: UFSummary;
  onSelect: () => void;
  isLoading?: boolean;
  onRetry?: () => void;
  showElectedCheck?: boolean;
}

export const UFCard: React.FC<UFCardProps> = ({ summary, onSelect, isLoading, onRetry, showElectedCheck = true }) => {
  const { selectAbrangencia } = useElection();

  if (isLoading || !summary) {
    return (
      <div className="p-4 rounded-xl border border-gray-100 dark:bg-slate-800 dark:border-slate-700 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2">
            <div className="h-6 w-8 bg-gray-200 dark:bg-slate-700 rounded"></div>
            <div className="h-3 w-12 bg-gray-100 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="h-8 w-12 bg-gray-100 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-50 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-full bg-gray-50 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const handleClick = () => {
    if (summary.error) return;
    selectAbrangencia({
      ufCd: summary.cd,
      ufNome: summary.nm,
      munCdTse: "",
      munNome: summary.nm,
      isCapital: false,
      isUfWide: true,
      z: []
    });
    // Disparar evento para abrir o visualizador EA20 automaticamente com contexto de origem
    window.dispatchEvent(new CustomEvent('open-ea20', { detail: { fromNationalBoard: true } }));
    onSelect();
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
        ${summary.error
          ? 'bg-red-50 border-red-100 dark:bg-red-900/5 dark:border-red-900/30'
          : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-lg dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500'
        }
      `}
    >
      {/* Badges de Status Suavizados */}
      <div className="absolute top-0 right-0 p-1 flex flex-col gap-0.5 items-end">
        {summary.tf && (
          <span className="px-1.5 py-0.5 bg-green-600 text-white text-[7px] font-black uppercase rounded-bl shadow-sm">Finalizado</span>
        )}
        {summary.md && (summary.md.toLowerCase() === 's' || summary.md.toLowerCase() === 'e') && (
          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[7px] font-black uppercase rounded-bl shadow-sm">
            Definido ({summary.md.toUpperCase() === 'S' ? '2º Turno' : 'Eleito'})
          </span>
        )}
        {summary.esae && (
          <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black uppercase rounded-bl shadow-sm">ESAE</span>
        )}
      </div>

      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tighter">{summary.cd}</span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold truncate max-w-[70px]">
            {summary.nm}
          </span>
        </div>
        <div className="flex flex-col items-end mr-6">
          <span className="text-sm font-black text-blue-600 dark:text-blue-400">
            {summary.pstNum.toFixed(2).replace('.', ',')}%
          </span>
          <span className="text-[8px] text-gray-400 uppercase font-black tracking-tighter">Totalizado</span>
        </div>
      </div>

      <div className="space-y-2">
        {summary.error ? (
          <div className="flex flex-col items-center py-2">
            <span className="text-[10px] text-red-500 font-black uppercase mb-2">Erro de Conexão</span>
            {onRetry && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                className="px-3 py-1 bg-red-100 text-red-600 text-[9px] font-black rounded uppercase hover:bg-red-200 transition-colors"
              >
                Tentar Novamente
              </button>
            )}
          </div>
        ) : summary.top2.length > 0 ? (
          <>
            {summary.top2.map((cand, idx) => (
              <div
                key={cand.id}
                className={`
                  flex justify-between items-center text-xs p-1 rounded-md transition-colors
                  ${idx === 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                `}
              >
                <div className="flex items-center gap-1 truncate mr-2">
                  <span className={`truncate ${idx === 0 ? 'font-black text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400 font-medium'}`}>
                    {cand.nm}
                  </span>
                  {showElectedCheck && (cand.e === 's' || cand.st === 'eleito') && (
                    <span className="text-[9px] text-green-600 dark:text-green-400 font-black">✓</span>
                  )}
                </div>
                <span className={`font-mono text-[10px] shrink-0 ${idx === 0 ? 'text-blue-700 dark:text-blue-300 font-black' : 'text-gray-500 dark:text-gray-400'}`}>
                  {cand.pvap.toFixed(2).replace('.', ',')}%
                </span>
              </div>
            ))}

            {summary.leadDiff !== undefined && (
              <div className="mt-2 pt-1.5 border-t border-gray-50 dark:border-slate-700/50 flex justify-between items-center">
                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Diferença</span>
                <span className="text-[9px] font-mono font-black text-gray-600 dark:text-gray-400">
                  {summary.leadDiff.toFixed(2).replace('.', ',')}%
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-[10px] text-gray-400 italic py-2 text-center font-bold uppercase animate-pulse">
            Sincronizando...
          </div>
        )}
      </div>

      {/* Indicador de Hover */}
      {!summary.error && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
      )}
    </div>
  );
};
