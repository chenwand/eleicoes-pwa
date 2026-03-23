import { useState } from 'react';
import { TrendIndicator } from '../TrendIndicator';
import type { UI_EA20Votos } from '../../utils/adapters/ea20Adapters';

export function VoteVisualization({ v, previousV, isProportional, isConsultaPopular }: { v: UI_EA20Votos, previousV?: Partial<UI_EA20Votos>, isProportional: boolean, isConsultaPopular?: boolean }) {
  const [expanded, setExpanded] = useState(true);

  const tv = v._tvNum;
  const vvc = v._vvcNum;
  const vv = v._vvNum;
  const vnom = v._vnomNum;
  const vl = v._vlNum;
  const vb = v._vbNum;
  const van = v._vanNum;
  const vansj = v._vansjNum;
  const tvn = v._tvnNum;

  const segmentsTotal = isConsultaPopular ? (vvc + vb + tvn) : tv;
  const getPct = (val: number) => segmentsTotal > 0 ? (val / segmentsTotal) * 100 : 0;

  const segments = isConsultaPopular
    ? [
      { label: 'Válidos', val: vvc, pct: getPct(vvc), color: 'bg-blue-600', text: 'text-blue-600' },
      { label: 'Brancos', val: vb, pct: getPct(vb), color: 'bg-gray-400', text: 'text-gray-500' },
      { label: 'Nulos', val: tvn, pct: getPct(tvn), color: 'bg-gray-600', text: 'text-gray-700' },
    ]
    : [
      { label: 'Válidos', val: vv, pct: getPct(vv), color: 'bg-blue-600', text: 'text-blue-600' },
      { label: 'Anulados', val: van, pct: getPct(van), color: 'bg-yellow-500', text: 'text-yellow-600' },
      { label: 'Sub Judice', val: vansj, pct: getPct(vansj), color: 'bg-red-600', text: 'text-red-600' },
      { label: 'Brancos', val: vb, pct: getPct(vb), color: 'bg-gray-400', text: 'text-gray-500' },
      { label: 'Nulos', val: tvn, pct: getPct(tvn), color: 'bg-gray-600', text: 'text-gray-700' },
    ];

  return (
    <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Distribuição de Votos</div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>

      {/* Stake Bar Chart */}
      <div className="w-full h-4 flex rounded-full overflow-hidden mb-2 bg-gray-200 dark:bg-slate-700 shadow-inner">
        {segments.map((seg, i) => seg.pct > 0 && (
          <div
            key={i}
            style={{ width: `${seg.pct}%` }}
            className={`${seg.color} h-full transition-all hover:brightness-110 relative group`}
            title={`${seg.label}: ${seg.pct.toFixed(2)}%`}
          >
            {seg.pct > 5 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {seg.pct.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {expanded && (
        <div className="mt-6 space-y-1.5 text-sm transition-all animate-fade-in" onClick={e => e.stopPropagation()}>
          {/* Total */}
          <div className="flex justify-between items-center font-bold text-gray-800 dark:text-slate-100">
            <span>Total de Votos (tv)</span>
            <span>{tv.toLocaleString('pt-BR')}</span>
          </div>

          {/* VVC Level (Hidden for Popular Consultations) */}
          {!isConsultaPopular && (
            <div className="pl-4 border-l-2 border-gray-200 dark:border-slate-700 space-y-1.5 mt-1">
              <div className="flex justify-between items-center font-semibold text-gray-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  <span>Votos a Votáveis Concorrentes (vvc)</span>
                </div>
                <span className="flex items-center gap-1">
                  {vvc.toLocaleString('pt-BR')}
                  <span className="text-[10px] font-normal text-gray-400">({getPct(vvc).toFixed(1)}%)</span>
                  <TrendIndicator current={getPct(vvc).toFixed(1)} previous={previousV ? ((parseInt(previousV.vvc as unknown as string || '0') / (isConsultaPopular ? (parseInt(previousV.vvc as unknown as string || '0') + parseInt(previousV.vb as unknown as string || '0') + parseInt(previousV.tvn as unknown as string || '0')) : parseInt(previousV.tv as unknown as string || '0'))) * 100).toFixed(1) : undefined} />
                  {Math.abs(getPct(vvc) - v._pvvcNum) > 0.1 && (
                    <span className="text-[9px] text-yellow-600 dark:text-yellow-500" title={`Arquivo: ${v.pvvc}%`}>⚠️</span>
                  )}
                </span>
              </div>

              {/* VV, VAN, VANSJ Level */}
              <div className="pl-4 border-l-2 border-gray-100 dark:border-slate-800 space-y-1 mt-1">
                <div className="flex justify-between items-center text-gray-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>Válidos (vv)</span>
                  </div>
                  <span className="flex items-center gap-1">
                    {vv.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* VNOM, VL (Proportional only) */}
                {isProportional && (
                  <div className="pl-6 text-[11px] text-gray-500 dark:text-slate-500 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span>Nominais (vnom)</span>
                      <span className="flex items-center gap-1">
                        {vnom.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Legenda (vl)</span>
                      <span className="flex items-center gap-1">
                        {vl.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-gray-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span>Anulados (van)</span>
                  </div>
                  <span className="flex items-center gap-1">
                    {van.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    <span>Anulados Sub Judice (vansj)</span>
                  </div>
                  <span className="flex items-center gap-1">
                    {vansj.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isConsultaPopular && (
            <div className="pl-4 border-l-2 border-transparent space-y-1.5 mt-1">
              <div className="flex justify-between items-center text-gray-700 dark:text-slate-300 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Válidos (vvc)</span>
                </div>
                <span className="flex items-center gap-1">
                  {vvc.toLocaleString('pt-BR')}
                  <span className="text-[10px] text-gray-400">({getPct(vvc).toFixed(1)}%)</span>
                  <TrendIndicator current={getPct(vvc).toFixed(1)} previous={previousV ? ((parseInt(previousV.vvc as unknown as string || '0') / (isConsultaPopular ? (parseInt(previousV.vvc as unknown as string || '0') + parseInt(previousV.vb as unknown as string || '0') + parseInt(previousV.tvn as unknown as string || '0')) : parseInt(previousV.tv as unknown as string || '0'))) * 100).toFixed(1) : undefined} />
                </span>
              </div>
            </div>
          )}

          {/* VB and TVN Level */}
          <div className="pl-4 border-l-2 border-transparent space-y-1.5 mt-2">
            <div className="flex justify-between items-center text-gray-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span>Brancos (vb)</span>
              </div>
              <span className="flex items-center gap-1">
                {vb.toLocaleString('pt-BR')}
                <span className="text-[10px] text-gray-400">({getPct(vb).toFixed(1)}%)</span>
                <TrendIndicator current={getPct(vb).toFixed(1)} previous={previousV ? ((parseInt(previousV.vb as unknown as string || '0') / (isConsultaPopular ? (parseInt(previousV.vvc as unknown as string || '0') + parseInt(previousV.vb as unknown as string || '0') + parseInt(previousV.tvn as unknown as string || '0')) : parseInt(previousV.tv as unknown as string || '0'))) * 100).toFixed(1) : undefined} />
                {Math.abs(getPct(vb) - v._pvbNum) > 0.1 && (
                  <span className="text-[9px] text-yellow-600 dark:text-yellow-500" title={`Arquivo: ${v.pvb}%`}>⚠️</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                <span>Nulos (tvn)</span>
              </div>
              <span className="flex items-center gap-1">
                {tvn.toLocaleString('pt-BR')}
                <span className="text-[10px] text-gray-400">({getPct(tvn).toFixed(1)}%)</span>
                <TrendIndicator current={getPct(tvn).toFixed(1)} previous={previousV ? ((parseInt(previousV.tvn as unknown as string || '0') / (isConsultaPopular ? (parseInt(previousV.vvc as unknown as string || '0') + parseInt(previousV.vb as unknown as string || '0') + parseInt(previousV.tvn as unknown as string || '0')) : parseInt(previousV.tv as unknown as string || '0'))) * 100).toFixed(1) : undefined} />
                {Math.abs(getPct(tvn) - v._ptvnNum) > 0.1 && (
                  <span className="text-[9px] text-yellow-600 dark:text-yellow-500" title={`Arquivo: ${v.ptvn}%`}>⚠️</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
