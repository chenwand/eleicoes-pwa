import { useState } from 'react';
import { TrendIndicator } from '../TrendIndicator';
import { dvtBadge } from './utils';
import { DVT_COLORS } from './constants';
import { buildCandidatoFotoUrl } from '../../services/ea20Service';
import type { EA20Vice } from '../../types/ea20';
import type { UI_EA20Agrupamento, UI_EA20Candidato, UI_EA20Partido } from '../../utils/adapters/ea20Adapters';

export function CandCard({
  cand, agr, totalVotos, ambiente, ciclo, eleicaoCd, uf, isProportional, isFavorite, onToggleFavorite, host, previousCand
}: {
  cand: UI_EA20Candidato;
  agr: UI_EA20Agrupamento;
  totalVotos: number;
  ambiente: string;
  ciclo: string;
  eleicaoCd: string;
  uf: string;
  isProportional: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  host: string;
  previousCand?: UI_EA20Candidato;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fotoError, setFotoError] = useState(false);
  const vap = cand._vapNum;
  const pct = totalVotos > 0 ? (vap / totalVotos) * 100 : 0;
  const isEleito = cand.e === 's';
  const dvtNaoValido = cand.dvt && cand.dvt !== 'Válido';

  const borderBg = isEleito
    ? 'border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/10'
    : dvtNaoValido
      ? 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10'
      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40';

  const barColor = isEleito ? 'bg-green-500' : dvtNaoValido ? 'bg-orange-400' : 'bg-blue-500';
  const pctColor = isEleito ? 'text-green-700 dark:text-green-400' : dvtNaoValido ? 'text-orange-600 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400';

  if (isProportional) {
    // Compact table row for proportional cargos
    return (
      <>
        <tr
          className={`border-b border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors ${isEleito ? 'bg-green-50/40 dark:bg-green-900/10' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          <td className="py-2 px-3 font-mono text-xs text-gray-500 w-10">{cand.n}</td>
          <td className="py-2 px-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className={`transition-colors ${isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600 hover:text-amber-400'}`}
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </button>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cand.nmu}</span>
              {dvtBadge(cand.dvt)}
              {isEleito && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold">✓ {cand.st}</span>}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">{agr.par.find(p => p.cand.some(c => c.sqcand === cand.sqcand))?.sg} · {agr.nm}</div>
          </td>
          <td className="py-2 px-3 text-right">
            <div className={`font-mono font-bold text-xs flex items-center justify-end ${pctColor}`}>
              {cand.pvap}%
              <TrendIndicator current={cand.pvap} previous={previousCand?.pvap} />
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">{cand._vapNum.toLocaleString('pt-BR')}</div>
          </td>
        </tr>
        {expanded && (
          <tr>
            <td colSpan={3} className="bg-gray-50 dark:bg-slate-900/50 p-2">
              <div className={`border rounded-lg p-3 shadow-sm transition-all ${borderBg}`}>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                        className={`transition-colors ${isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600 hover:text-amber-400'}`}
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      </button>
                      <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{cand.n}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100">{cand.nmu}</span>
                      {dvtBadge(cand.dvt)}
                      {isEleito && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold">✓ {cand.st}</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {agr.par.find(p => p.cand.some(c => c.sqcand === cand.sqcand))?.sg} · <span className="truncate">{agr.nm}</span>
                    </div>
                    {cand.vs && cand.vs.length > 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Vice: <span className="font-medium text-gray-600 dark:text-gray-300">{cand.vs[0].nmu}</span>
                        {cand.vs[0].sgp ? ` (${cand.vs[0].sgp})` : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold font-mono flex items-center justify-end ${pctColor}`}>
                      {cand.pvap}%
                      <TrendIndicator current={cand.pvap} previous={previousCand?.pvap} />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{cand._vapNum.toLocaleString('pt-BR')} votos</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-3">
                  <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <CandDetail cand={cand} agr={agr} ambiente={ambiente} ciclo={ciclo} eleicaoCd={eleicaoCd} uf={uf} fotoError={fotoError} setFotoError={setFotoError} host={host} isProportional={isProportional} />
              </div>
            </td>
          </tr>
        )}
      </>
    );
  }

  // Card layout for majority cargos
  return (
    <div
      className={`border rounded-lg p-3 shadow-sm transition-all cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 ${borderBg}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex gap-3 mb-2">
        {!fotoError && (
          <img
            src={buildCandidatoFotoUrl(ambiente, ciclo, eleicaoCd, uf, cand.sqcand, host)}
            alt={cand.nmu}
            className="w-12 h-14 object-cover rounded shadow-sm border border-gray-200 dark:border-slate-700 shrink-0"
            onError={() => setFotoError(true)}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                  className={`transition-colors shrink-0 ${isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600 hover:text-amber-400'}`}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </button>
                <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">{cand.n}</span>
                <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{cand.nmu}</span>
                {dvtBadge(cand.dvt)}
                {isEleito && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold shrink-0">✓ Eleito</span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {agr.par.find(p => p.cand.some(c => c.sqcand === cand.sqcand))?.sg} · <span className="truncate">{agr.nm}</span>
              </div>
            </div>
            <div className={`text-right shrink-0`}>
              <div className={`text-lg font-bold font-mono flex items-center justify-end ${pctColor}`}>
                {cand.pvap}%
                <TrendIndicator current={cand.pvap} previous={previousCand?.pvap} />
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{cand._vapNum.toLocaleString('pt-BR')} votos</div>
            </div>
          </div>
          {cand.vs && cand.vs.length > 0 && (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-1">
              Vice: <span className="font-medium text-gray-600 dark:text-gray-300">{cand.vs[0].nmu}</span>
              {cand.vs[0].sgp ? ` (${cand.vs[0].sgp})` : ''}
            </div>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-2">
        <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>


      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
          <CandDetail cand={cand} agr={agr} ambiente={ambiente} ciclo={ciclo} eleicaoCd={eleicaoCd} uf={uf} fotoError={fotoError} setFotoError={setFotoError} host={host} isProportional={isProportional} />
        </div>
      )}
    </div>
  );
}

export function CandDetail({ 
  cand, agr, ambiente, ciclo, eleicaoCd, uf, fotoError, setFotoError, host, isProportional 
}: { 
  cand: UI_EA20Candidato; agr: UI_EA20Agrupamento; ambiente: string; ciclo: string; eleicaoCd: string; uf: string; fotoError: boolean; setFotoError: (e: boolean) => void; host: string; isProportional: boolean; 
}) {
  const fotoUrl = buildCandidatoFotoUrl(ambiente, ciclo, eleicaoCd, uf, cand.sqcand, host);
  const partido = agr.par.find((p: UI_EA20Partido) => p.cand.some((c: UI_EA20Candidato) => c.sqcand === cand.sqcand));
  const showPhotoInDetail = isProportional; // Only show in detail if not already in card

  return (
    <div className="flex gap-3">
      {showPhotoInDetail && !fotoError && (
        <img
          src={fotoUrl}
          alt={cand.nmu}
          className="w-16 h-20 object-cover rounded shadow border border-gray-200 dark:border-slate-600 shrink-0"
          onError={() => setFotoError(true)}
        />
      )}
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div><span className="font-medium text-gray-700 dark:text-gray-300">Nome completo:</span> {cand.nm}</div>
        {cand.dt && <div><span className="font-medium text-gray-700 dark:text-gray-300">Nascimento:</span> {cand.dt}</div>}
        {partido && <div><span className="font-medium text-gray-700 dark:text-gray-300">Partido:</span> {partido.nm} ({partido.sg})</div>}
        <div><span className="font-medium text-gray-700 dark:text-gray-300">Sequencial:</span> {cand.sqcand}</div>
        <div><span className="font-medium text-gray-700 dark:text-gray-300">Destino do voto:</span> <span className={(cand.dvt && DVT_COLORS[cand.dvt]) || ''}>{cand.dvt}</span></div>
        <div><span className="font-medium text-gray-700 dark:text-gray-300">Status:</span> {cand.st}</div>
        {cand.vs && cand.vs.length > 0 && (
          <div><span className="font-medium text-gray-700 dark:text-gray-300">Vice(s):</span>{' '}
            {cand.vs.map((v: EA20Vice) => `${v.nmu} (${v.sgp})`).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
