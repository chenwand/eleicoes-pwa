import { useState } from 'react';
import { TrendIndicator } from '../TrendIndicator';
import type { UI_EA20Secoes, UI_EA20Eleitores } from '../../utils/adapters/ea20Adapters';

export function SecoesSummary({ s, previousS }: { s: UI_EA20Secoes, previousS?: Partial<UI_EA20Secoes> }) {
  const [expanded, setExpanded] = useState(false);
  const parseNum = (val: string) => parseInt(val, 10) || 0;
  
  const ts = parseNum(s.ts);
  const pct = s._pstNum;
  const st = parseNum(s.st);
  const snt = parseNum(s.snt);
  const si = parseNum(s.si);
  const sni = parseNum(s.sni);
  const sa = parseNum(s.sa);
  const sna = parseNum(s.sna);

  return (
    <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-slate-700 cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Seções</div>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400 text-xs">Totalizadas</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
          {pct.toFixed(2).replace('.', ',')}%
          <TrendIndicator current={pct} previous={previousS?._pstNum} />
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
        <div className="h-2 rounded-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-gray-400 dark:text-gray-500">{st.toLocaleString('pt-BR')} de {ts.toLocaleString('pt-BR')}</div>

      {expanded && (
        <div className="mt-4 space-y-2 text-xs border-t border-gray-100 dark:border-slate-700 pt-3 animate-fade-in" onClick={e => e.stopPropagation()}>
          <div className="space-y-1">
            <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
              <span>Total de Seções (ts)</span>
              <span>{ts.toLocaleString('pt-BR')}</span>
            </div>
            <div className="pl-4 border-l border-gray-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between text-gray-700 dark:text-gray-300 font-medium">
                <span>Totalizadas (st)</span>
                <span className="flex items-center gap-1">
                  {st.toLocaleString('pt-BR')}
                  <span className="text-[10px] font-normal text-gray-400">
                    ({(ts > 0 ? (st / ts) * 100 : 0).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="pl-4 border-l border-gray-100 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                  <span>Instaladas (si)</span>
                  <span>{si.toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-gray-400">({(st > 0 ? (si / st) * 100 : 0).toFixed(1)}%)</span></span>
                </div>
                <div className="pl-4 border-l border-gray-50 dark:border-slate-900 space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>Apuradas (sa)</span>
                    <span>{sa.toLocaleString('pt-BR')} <span className="text-[10px] text-gray-400">({(si > 0 ? (sa / si) * 100 : 0).toFixed(1)}%)</span></span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Não Apuradas (sna)</span>
                    <span>{sna.toLocaleString('pt-BR')} <span className="text-[10px] text-gray-400">({(si > 0 ? (sna / si) * 100 : 0).toFixed(1)}%)</span></span>
                  </div>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Não Instaladas (sni)</span>
                  <span>{sni.toLocaleString('pt-BR')} <span className="text-[10px] text-gray-400">({(st > 0 ? (sni / st) * 100 : 0).toFixed(1)}%)</span></span>
                </div>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Não Totalizadas (snt)</span>
                <span>{snt.toLocaleString('pt-BR')} <span className="text-[10px] text-gray-400">({(ts > 0 ? (snt / ts) * 100 : 0).toFixed(1)}%)</span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EleitoresSummary({ e, previousE }: { e: UI_EA20Eleitores, previousE?: Partial<UI_EA20Eleitores> }) {
  const [expanded, setExpanded] = useState(false);
  const parseNum = (val: string) => parseInt(val, 10) || 0;
  const parsePct = (val: string) => parseFloat((val || '0').replace(',', '.')) || 0;

  const te = parseNum(e.te);
  const est = parseNum(e.est);
  const esnt = parseNum(e.esnt);
  const c = parseNum(e.c);
  // a is not used in the detail view as per user request
  const esi = parseNum(e.esi);
  const esni = parseNum(e.esni);
  const esa = parseNum(e.esa);
  const esna = parseNum(e.esna);

  return (
    <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-slate-700 cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Eleitores</div>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400 text-xs">Comparecimento</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
          {e.pc}%
          <TrendIndicator current={e._pcNum} previous={previousE?._pcNum} />
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
        <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${e._pcNum}%` }} />
      </div>
      <div className="text-[10px] text-gray-400 dark:text-gray-500">
        {c.toLocaleString('pt-BR')} de {est.toLocaleString('pt-BR')}
      </div>

      {expanded && (
        <div className="mt-4 space-y-2 text-xs border-t border-gray-100 dark:border-slate-700 pt-3 animate-fade-in" onClick={evt => evt.stopPropagation()}>
          <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
            <span>Total de Eleitores (te)</span>
            <span>{te.toLocaleString('pt-BR')}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
              <span>Em seções totalizadas (est)</span>
              <span className="flex items-center gap-1">
                {est.toLocaleString('pt-BR')}
                <span className="text-[10px] font-normal text-gray-400">
                  ({(te > 0 ? (est / te) * 100 : 0).toFixed(1)}%)
                </span>
                {Math.abs((te > 0 ? (est / te) * 100 : 0) - parsePct(e.pest)) > 0.1 && (
                  <span className="text-[9px] text-yellow-600 dark:text-yellow-500" title={`Arquivo: ${e.pest}%`}>⚠️</span>
                )}
              </span>
            </div>
            <div className="pl-4 border-l border-gray-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between text-gray-700 dark:text-gray-300 font-medium">
                <span>Em seções instaladas (esi)</span>
                <span>{esi.toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-gray-400">({(est > 0 ? (esi / est) * 100 : 0).toFixed(1)}%)</span></span>
              </div>
              <div className="pl-4 border-l border-gray-100 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                  <span>Em seções apuradas (esa)</span>
                  <span>{esa.toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-gray-400">({(esi > 0 ? (esa / esi) * 100 : 0).toFixed(1)}%)</span></span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Em seções não apuradas (esna)</span>
                  <span>{esna.toLocaleString('pt-BR')} <span className="text-[10px] text-gray-400">({(esi > 0 ? (esna / esi) * 100 : 0).toFixed(1)}%)</span></span>
                </div>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Em seções não instaladas (esni)</span>
                <span>{esni.toLocaleString('pt-BR')} <span className="text-[10px] text-gray-400">({(est > 0 ? (esni / est) * 100 : 0).toFixed(1)}%)</span></span>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-gray-500">
            <span>Em seções não totalizadas (esnt)</span>
            <span>{esnt.toLocaleString('pt-BR')} <span className="text-[10px] text-gray-400">({(te > 0 ? (esnt / te) * 100 : 0).toFixed(1)}%)</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
