import type { NationalSummary as NationalSummaryType } from '../../utils/nationalBoardUtils';
import { useElection } from '../../context/ElectionContext';
import { useEnvironment } from '../../context/EnvironmentContext';
import { buildCandidatoFotoUrl } from '../../services/ea20Service';

interface NationalSummaryProps {
  summary: NationalSummaryType;
}

const REGIONS_NM: Record<string, string> = {
  'N': 'Norte', 'NE': 'Nordeste', 'CO': 'Centro-Oeste', 'SE': 'Sudeste', 'S': 'Sul'
};

export const NationalSummary: React.FC<NationalSummaryProps> = ({ summary }) => {
  const { ambiente, host } = useEnvironment();
  const { ciclo, selectedEleicao } = useElection();
  const eleicaoCd = selectedEleicao?.cd || '';

  const candidates = Object.entries(summary.vitoriasPorCandidato)
    .sort((a, b) => b[1].vitorias - a[1].vitorias);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
      <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Resumo de Lideranças (Estados)
        </h3>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Total por Candidato */}
        <div>
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Vitórias por UF</h4>
          <div className="space-y-6">
            {candidates.length > 0 ? candidates.map(([id, info]) => (
              <div key={id} className="border-b border-gray-50 dark:border-slate-700/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0 border border-gray-100 dark:border-slate-600 shadow-sm">
                      <img
                        src={buildCandidatoFotoUrl(ambiente, ciclo, eleicaoCd, 'BR', id, host)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE2IDd2Mk04IDd2Mm0tMiAxMGgxMmExIDEgMCAwMCAtMSAtMWgtMTBhMSAxIDAgMDAtMSAxek04IDIxYTIgMiAwIDAwNCAwTTEyIDExYTMgMyAwIDExMC02IDMgMyAwIDAxMCA2eiIvPjwvc3ZnPg==';
                          (e.target as HTMLImageElement).classList.add('opacity-70');
                        }}
                      />
                    </div>
                    <span className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{info.nm}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    <span className="text-sm font-black text-blue-700 dark:text-blue-300">{info.vitorias}</span>
                    <span className="text-[8px] text-blue-600/60 dark:text-blue-400/60 font-black uppercase">UFs</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {info.ufVitorias
                    .sort((a, b) => b.pvap - a.pvap)
                    .map(item => {
                      // Status dot color logic
                      let dotColor = 'bg-amber-500'; // Em andamento
                      let pingColor = 'bg-amber-400';

                      if (item.esae) {
                        dotColor = 'bg-orange-600'; // ESAE
                        pingColor = 'bg-orange-400';
                      } else if (item.md && (item.md.toLowerCase() === 's' || item.md.toLowerCase() === 'e')) {
                        dotColor = 'bg-indigo-600'; // MD (Matematicamente Definido)
                        pingColor = 'bg-indigo-400';
                      } else if (item.tf) {
                        dotColor = 'bg-green-600'; // Finalizado
                        pingColor = 'bg-green-400';
                      }

                      return (
                        <div key={item.uf} className="flex flex-col items-center group">
                          <div className="relative">
                            <img
                              src={`/flags/${item.uf.toLowerCase()}.svg`}
                              alt={item.uf}
                              className="w-6 h-4 object-cover rounded-[1px] shadow-sm border border-gray-100 dark:border-slate-700 group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
                            </div>
                          </div>
                          <span className="text-[7px] font-black text-gray-400 dark:text-gray-500 mt-1 uppercase leading-none">
                            {item.uf}
                          </span>
                          <span className="text-[8px] font-black text-gray-700 dark:text-gray-300 mt-0.5 leading-none">
                            {item.pvap.toFixed(1).replace('.', ',')}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic">Nenhuma liderança confirmada ainda.</p>
            )}
          </div>
        </div>

        {/* Por Região */}
        <div className="border-l border-gray-100 dark:border-slate-700 pl-8">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Liderança por Região</h4>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(summary.vitoriasPorRegiao).map(([reg, counts]) => {
              const regionWinnerId = Object.entries(counts as Record<string, number>).sort((a, b) => b[1] - a[1])[0]?.[0];
              const regionWinnerName = regionWinnerId ? summary.vitoriasPorCandidato[regionWinnerId]?.nm : 'Empate/Sem dados';
              const regionWinnerCount = regionWinnerId ? (counts as Record<string, number>)[regionWinnerId] : 0;

              return (
                <div key={reg} className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                  <div className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">{REGIONS_NM[reg]}</div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate" title={regionWinnerName}>
                    {regionWinnerName}
                  </div>
                  {regionWinnerCount > 0 && (
                    <div className="text-[9px] text-gray-400 font-medium">Lidera em {regionWinnerCount} UFs</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
