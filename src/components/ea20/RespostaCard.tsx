import { TrendIndicator } from '../TrendIndicator';
import type { UI_EA20Resposta } from '../../utils/adapters/ea20Adapters';

export function RespostaCard({ resp, previousResp, pctColor }: { resp: UI_EA20Resposta, previousResp?: Partial<UI_EA20Resposta>, pctColor: string }) {
  const pct = resp._pvapNum;
  const isEleito = resp.e === 's';
  const barColor = isEleito ? 'bg-green-500' : 'bg-blue-500';
  const borderBg = isEleito ? 'border-green-200 bg-green-50/30 dark:border-green-900/40 dark:bg-green-900/10' : 'border-gray-200 dark:border-slate-800';

  return (
    <div className={`border rounded-lg p-3 shadow-sm transition-all ${borderBg}`}>
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">{resp.n}</span>
            <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{resp.nm}</span>
            {isEleito && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold shrink-0">✓ Eleito</span>
            )}
          </div>
        </div>
        <div className={`text-right shrink-0`}>
          <div className={`text-lg font-bold font-mono flex items-center justify-end ${pctColor}`}>
            {resp.pvap}%
            <TrendIndicator current={resp.pvap} previous={previousResp?.pvap} />
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">{resp._vapNum.toLocaleString('pt-BR')} votos</div>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
