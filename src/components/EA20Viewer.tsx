import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA20, buildCandidatoFotoUrl } from '../services/ea20Service';
import { validateEA20 } from '../services/ea20Validator';
import { useEnvironment } from '../context/EnvironmentContext';
import type { EA20Cargo, EA20Candidato, EA20Agrupamento } from '../types/ea20';

// ── helpers ──────────────────────────────────────────────────────────────────

const DVT_COLORS: Record<string, string> = {
  'Válido': '',
  'Anulado': 'text-orange-600 dark:text-orange-400',
  'Sub-Judice': 'text-purple-600 dark:text-purple-400',
  'Nulo': 'text-red-500 dark:text-red-400',
};

function dvtBadge(dvt: string) {
  if (!dvt || dvt === 'Válido') return null;
  const cls = DVT_COLORS[dvt] || 'text-gray-500';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls} border-current ml-1 shrink-0`}>
      {dvt}
    </span>
  );
}

const renderHighlightedJson = (jsonObj: any) => {
  const json = JSON.stringify(jsonObj, null, 2).replace(/[&<>]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c
  ));
  const highlighted = json.replace(
    /(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-blue-400';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'text-purple-400 font-semibold' : 'text-green-400 break-all whitespace-pre-wrap';
      else if (/true|false/.test(match)) cls = 'text-orange-400 font-medium';
      else if (/null/.test(match)) cls = 'text-red-400 font-medium';
      return `<span class="${cls}">${match}</span>`;
    }
  );
  return <pre className="text-xs sm:text-sm text-gray-300 font-mono" dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

function VoteVisualization({ v, isProportional }: { v: any, isProportional: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const parseNum = (s: string) => parseInt(s || '0', 10);

  const tv = parseNum(v.tv);
  const vvc = parseNum(v.vvc);
  const vv = parseNum(v.vv);
  const vnom = parseNum(v.vnom);
  const vl = parseNum(v.vl);
  const vb = parseNum(v.vb);
  const van = parseNum(v.van);
  const vansj = parseNum(v.vansj);
  const tvn = parseNum(v.tvn);

  const getPct = (val: number) => tv > 0 ? (val / tv) * 100 : 0;
  const parsePct = (val: string) => parseFloat((val || '0').replace(',', '.')) || 0;

  const segments = [
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

          {/* VVC Level */}
          <div className="pl-4 border-l-2 border-gray-200 dark:border-slate-700 space-y-1.5 mt-1">
            <div className="flex justify-between items-center font-semibold text-gray-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                <span>Votos Válidos Conc. (vvc)</span>
              </div>
              <span className="flex items-center gap-1">
                {vvc.toLocaleString('pt-BR')}
                <span className="text-[10px] font-normal text-gray-400">({getPct(vvc).toFixed(1)}%)</span>
                {Math.abs(getPct(vvc) - parsePct(v.pvvc)) > 0.1 && (
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
                {Math.abs(getPct(vb) - parsePct(v.pvb)) > 0.1 && (
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
                {Math.abs(getPct(tvn) - parsePct(v.ptvn)) > 0.1 && (
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

function SecoesSummary({ s }: { s: any }) {
  const [expanded, setExpanded] = useState(false);
  const parseNum = (val: string) => parseInt(val, 10) || 0;
  const parsePct = (val: string) => parseFloat((val || '0').replace(',', '.')) || 0;

  const ts = parseNum(s.ts);
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
        <span className="font-semibold text-gray-800 dark:text-gray-200">{s.pst}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
        <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${parsePct(s.pst)}%` }} />
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
                  {Math.abs((ts > 0 ? (st / ts) * 100 : 0) - parsePct(s.pst)) > 0.1 && (
                    <span className="text-[9px] text-yellow-600 dark:text-yellow-500" title={`Arquivo: ${s.pst}%`}>⚠️</span>
                  )}
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

function EleitoresSummary({ e }: { e: any }) {
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
        <span className="font-semibold text-gray-800 dark:text-gray-200">{e.pc}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
        <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${parsePct(e.pc)}%` }} />
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
                {/* c and a are intentionally omitted here as they are in the card header bar */}
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

// ── PropTypes ─────────────────────────────────────────────────────────────────

interface EA20ViewerProps {
  ciclo: string;
  eleicaoCd: string;
  uf: string;
  cdMun: string;      // e.g. "01120"
  munNome: string;
  /** Cargos disponíveis (code + name) from EA11 */
  cargosDisponiveis: { cd: string; nm: string }[];
  onBack: () => void;
}

// ── Candidate card component ──────────────────────────────────────────────────

function CandCard({
  cand, agr, totalVotos, ambiente, ciclo, eleicaoCd, uf, isProportional, isFavorite, onToggleFavorite
}: {
  cand: EA20Candidato;
  agr: EA20Agrupamento;
  totalVotos: number;
  ambiente: string;
  ciclo: string;
  eleicaoCd: string;
  uf: string;
  isProportional: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fotoError, setFotoError] = useState(false);
  const vap = parseInt(cand.vap, 10) || 0;
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
              {isEleito && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold">✓ Eleito</span>}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">{agr.par.find(p => p.cand.some(c => c.sqcand === cand.sqcand))?.sg} · {agr.nm}</div>
          </td>
          <td className="py-2 px-3 text-right">
            <div className={`font-mono font-bold text-xs ${pctColor}`}>{cand.pvap}%</div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">{parseInt(cand.vap).toLocaleString('pt-BR')}</div>
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
                      {isEleito && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold">✓ Eleito</span>}
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
                    <div className={`text-lg font-bold font-mono ${pctColor}`}>{cand.pvap}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{parseInt(cand.vap).toLocaleString('pt-BR')} votos</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-3">
                  <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <CandDetail cand={cand} agr={agr} ambiente={ambiente} ciclo={ciclo} eleicaoCd={eleicaoCd} uf={uf} fotoError={fotoError} setFotoError={setFotoError} />
              </div>
            </td>
          </tr>
        )}
      </>
    );
  }

  // Card layout for majority cargos
  return (
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
            {isEleito && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold">✓ Eleito</span>
            )}
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
        <div className={`text-right shrink-0`}>
          <div className={`text-lg font-bold font-mono ${pctColor}`}>{cand.pvap}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{parseInt(cand.vap).toLocaleString('pt-BR')} votos</div>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-2">
        <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        {expanded ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
          <CandDetail cand={cand} agr={agr} ambiente={ambiente} ciclo={ciclo} eleicaoCd={eleicaoCd} uf={uf} fotoError={fotoError} setFotoError={setFotoError} />
        </div>
      )}
    </div>
  );
}

function CandDetail({ cand, agr, ambiente, ciclo, eleicaoCd, uf, fotoError, setFotoError }: any) {
  const fotoUrl = buildCandidatoFotoUrl(ambiente, ciclo, eleicaoCd, uf, cand.sqcand);
  const partido = agr.par.find((p: any) => p.cand.some((c: any) => c.sqcand === cand.sqcand));
  return (
    <div className="flex gap-3">
      {!fotoError && (
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
            {cand.vs.map((v: any) => `${v.nmu} (${v.sgp})`).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EA20Viewer({ ciclo, eleicaoCd, uf, cdMun, munNome, cargosDisponiveis, onBack }: EA20ViewerProps) {
  const { ambiente } = useEnvironment();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedCargoIdx, setSelectedCargoIdx] = useState(0);
  const [showZonaSelector, setShowZonaSelector] = useState(false);
  const [selectedZona, setSelectedZona] = useState<string | undefined>(undefined);
  const [showRawJson, setShowRawJson] = useState(false);
  const [localData, setLocalData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Advanced search/filter/sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fav' | 'eleitos' | 'valido' | 'legenda' | 'anulado' | 'subjudice'>('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'votos' | 'nome' | 'partido' | 'eleito' | 'idade'>('votos');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [validationExpanded, setValidationExpanded] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`fav_cand_${ciclo}_${eleicaoCd}`);
    if (saved) {
      try { setFavorites(new Set(JSON.parse(saved))); } catch (e) { console.error(e); }
    }
  }, [ciclo, eleicaoCd]);

  const toggleFavorite = (sqcand: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(sqcand)) newFavs.delete(sqcand);
    else newFavs.add(sqcand);
    setFavorites(newFavs);
    localStorage.setItem(`fav_cand_${ciclo}_${eleicaoCd}`, JSON.stringify(Array.from(newFavs)));
  };

  // Use the first available cargo to load
  const selectedCargo = cargosDisponiveis[selectedCargoIdx];

  const { data: ea20Data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['ea20', ciclo, eleicaoCd, uf, cdMun, selectedCargo?.cd, selectedZona, ambiente],
    queryFn: () => fetchEA20(ambiente, ciclo, eleicaoCd, uf, cdMun, selectedCargo.cd, selectedZona),
    enabled: !!selectedCargo && !!cdMun,
    staleTime: 30000,
  });

  useEffect(() => {
    if (ea20Data) {
      setLocalData(ea20Data);
      setIsModified(false);
      setIsEditing(false);
    } else if (isLoading) {
      setLocalData(null);
      setIsModified(false);
      setIsEditing(false);
    }
  }, [ea20Data, isLoading]);

  const validationResults = useMemo(() => {
    if (!localData) return [];
    return validateEA20(localData);
  }, [localData]);

  const handleBack = () => {
    setIsClosing(true);
    setTimeout(onBack, 300);
  };

  // Derive allCandidates for the selected cargo in localData
  const cargoData: EA20Cargo | null = useMemo(() => {
    if (!localData?.carg?.length) return null;
    // The returned JSON only has one cargo per file
    return localData.carg[0] ?? null;
  }, [localData]);

  const allCandidates = useMemo(() => {
    if (!cargoData) return [];
    return cargoData.agr.flatMap(agr => agr.par.flatMap(par => par.cand));
  }, [cargoData]);

  const totalVotos = useMemo(() => {
    return allCandidates.reduce((sum, c) => sum + (parseInt(c.vap, 10) || 0), 0);
  }, [allCandidates]);

  // Derived list of unique parties for the filter
  const parties = useMemo(() => {
    const list = cargoData?.agr.flatMap(a => a.par.map(p => ({ sg: p.sg, nm: p.nm }))) || [];
    // Unique by sg
    return Array.from(new Map(list.map(p => [p.sg, p])).values()).sort((a, b) => a.sg.localeCompare(b.sg));
  }, [cargoData]);

  const filteredAndSortedCandidates = useMemo(() => {
    if (!cargoData) return [];

    let list = cargoData.agr.flatMap(agr =>
      agr.par.flatMap(par => par.cand.map(cand => ({ cand, agr, partido: par })))
    );

    // 1. Search (Name, Number, Party)
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      list = list.filter(item =>
        item.cand.nm.toLowerCase().includes(lowSearch) ||
        item.cand.nmu.toLowerCase().includes(lowSearch) ||
        item.cand.n.includes(searchTerm) ||
        item.partido.sg.toLowerCase().includes(lowSearch)
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      list = list.filter(item => {
        if (statusFilter === 'fav') return favorites.has(item.cand.sqcand);
        if (statusFilter === 'eleitos') return item.cand.e === 's';
        if (statusFilter === 'legenda') return item.cand.dvt === 'Válidos (legenda)';
        if (statusFilter === 'valido') return item.cand.dvt === 'Válido';
        if (statusFilter === 'anulado') return item.cand.dvt === 'Anulado';
        if (statusFilter === 'subjudice') return item.cand.dvt === 'Sub-Judice';
        return true;
      });
    }

    // 3. Party Filter
    if (partyFilter !== 'all') {
      list = list.filter(item => item.partido.sg === partyFilter);
    }

    // 4. Sort
    list.sort((a, b) => {
      // Favorites ALWAYS on top
      const aFav = favorites.has(a.cand.sqcand) ? 1 : 0;
      const bFav = favorites.has(b.cand.sqcand) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      if (sortMode === 'votos') {
        return (parseInt(b.cand.vap, 10) || 0) - (parseInt(a.cand.vap, 10) || 0);
      }
      if (sortMode === 'nome') {
        return a.cand.nmu.localeCompare(b.cand.nmu);
      }
      if (sortMode === 'partido') {
        return a.partido.sg.localeCompare(b.partido.sg);
      }
      if (sortMode === 'eleito') {
        if (a.cand.e !== b.cand.e) return a.cand.e === 's' ? -1 : 1;
        return (parseInt(b.cand.vap, 10) || 0) - (parseInt(a.cand.vap, 10) || 0);
      }
      if (sortMode === 'idade') {
        // Nascimento: older (most idosos) first. Date format DD/MM/YYYY
        const parseDate = (d: string) => {
          if (!d) return new Date(0);
          const parts = d.split('/');
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        };
        const dateA = parseDate(a.cand.dt);
        const dateB = parseDate(b.cand.dt);
        return dateA.getTime() - dateB.getTime(); // Earlier date = older
      }
      return 0;
    });

    return list;
  }, [cargoData, searchTerm, statusFilter, partyFilter, sortMode, favorites]);

  const filterCounts = useMemo(() => {
    const raw = cargoData?.agr.flatMap(a => a.par.flatMap(p => p.cand)) || [];
    return {
      all: raw.length,
      fav: raw.filter(c => favorites.has(c.sqcand)).length,
      eleitos: raw.filter(c => c.e === 's').length,
      legenda: raw.filter(c => c.dvt === 'Válidos (legenda)').length,
      anulado: raw.filter(c => c.dvt === 'Anulado').length,
      subjudice: raw.filter(c => c.dvt === 'Sub-Judice').length,
    };
  }, [cargoData, favorites]);

  // Is this a majority (1 vaga) or proportional cargo?
  const isMajority = cargoData ? parseInt(cargoData.nv, 10) <= 2 : false;

  const parseNum = (s: string) => parseInt(s, 10) || 0;
  const parsePct = (s: string) => parseFloat((s || '0').replace(',', '.')) || 0;

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleBack} />
      <div className={`fixed inset-y-0 right-0 z-[70] w-[90vw] bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-200 dark:border-slate-800 flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <button onClick={handleBack} className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  Resultados (EA20) — {munNome}
                </h2>
                {localData && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Gerado em: <span className="font-mono">{localData.dg} {localData.hg}</span>
                    {localData.and === 'f'
                      ? <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded text-[10px] font-bold">✓ Finalizado</span>
                      : <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 rounded text-[10px] font-bold">⟳ Em andamento</span>
                    }
                  </div>
                )}
                {isModified && (
                  <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 animate-pulse w-fit">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Dados editados localmente
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  refetch().then(r => { if (r.data) { setLocalData(r.data); setIsModified(false); setIsEditing(false); } });
                }}
                disabled={isFetching}
                className={`p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors ${isFetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Atualizar dados (EA20)"
              >
                <svg className={`w-4 h-4 text-gray-700 dark:text-gray-300 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
              >
                {showRawJson ? 'Painel Visual' : 'Ver JSON'}
              </button>
            </div>
          </div>

          {/* ── Cargo pills ── */}
          {cargosDisponiveis.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {cargosDisponiveis.map((cg, idx) => (
                <button
                  key={cg.cd}
                  onClick={() => setSelectedCargoIdx(idx)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCargoIdx === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                >
                  {cg.nm}
                </button>
              ))}
              <button
                onClick={() => setShowZonaSelector(!showZonaSelector)}
                className={`ml-auto px-3 py-1 rounded-full text-xs font-medium transition-colors ${showZonaSelector ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                title="Detalhar por zona eleitoral"
              >
                {selectedZona ? `Zona ${selectedZona}` : '⊕ Por Zona'}
              </button>
            </div>
          )}

          {/* ── Zone selector ── */}
          {showZonaSelector && (
            <div className="flex items-center gap-2 mt-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Zona:</label>
              <input
                type="text"
                value={selectedZona ?? ''}
                onChange={e => setSelectedZona(e.target.value.trim().padStart(4, '0') || undefined)}
                placeholder="ex: 0008"
                className="font-mono text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-0.5 w-28 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
              />
              {selectedZona && (
                <button onClick={() => setSelectedZona(undefined)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Limpar zona</button>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando resultados...</p>
            </div>
          )}

          {isError && !localData && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-6 text-center">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Erro ao carregar (EA20)</h3>
              <p className="text-red-600 dark:text-red-300 text-sm">{error instanceof Error ? error.message : 'Falha ao buscar resultados.'}</p>
            </div>
          )}

          {localData && (
            showRawJson ? (
              // ── JSON Editor ──────────────────────────────────────────────
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    Conteúdo do Arquivo JSON
                  </span>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button onClick={() => { setEditValue(JSON.stringify(localData, null, 2)); setIsEditing(true); }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Editar
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { try { setLocalData(JSON.parse(editValue)); setIsModified(true); setIsEditing(false); } catch { alert('JSON inválido!'); } }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors">Salvar</button>
                        <button onClick={() => setIsEditing(false)}
                          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded transition-colors">Cancelar</button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="w-full h-[500px] p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-inner"
                    spellCheck={false} />
                ) : (
                  <div onClick={() => { setEditValue(JSON.stringify(localData, null, 2)); setIsEditing(true); }}
                    className="bg-[#1e1e1e] rounded-lg p-4 overflow-x-auto shadow-inner border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors group relative"
                    title="Clique para editar">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">Clique para editar</div>
                    {renderHighlightedJson(localData)}
                  </div>
                )}
              </div>
            ) : (
              // ── Visual Panel ─────────────────────────────────────────────
              <div className="space-y-4">
                <div className="space-y-6 pt-2">

                  {/* Validation errors */}
                  {validationResults.length > 0 && (() => {
                    const totalErrors = validationResults.reduce((acc, r) => acc + r.errors.length, 0);
                    return (
                      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg shadow-sm animate-fade-in overflow-hidden">
                        <button 
                          onClick={() => setValidationExpanded(!validationExpanded)}
                          className="w-full p-3 flex justify-between items-center hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors text-red-700 dark:text-red-300"
                        >
                          <div className="flex items-center gap-2 text-sm font-bold">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Inconsistências Encontradas
                            <span className="ml-1 px-1.5 py-0.5 bg-red-200 dark:bg-red-800 rounded text-[10px] font-black">{totalErrors}</span>
                          </div>
                          <svg className={`w-4 h-4 transition-transform ${validationExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {validationExpanded && (
                          <div className="p-4 pt-0 text-xs text-red-700 dark:text-red-300 border-t border-red-200/50 dark:border-red-800/50 space-y-4">
                            {validationResults.map((r, i) => (
                              <div key={i} className={i !== 0 ? "pt-3 border-t border-red-100 dark:border-red-900/40" : "pt-3"}>
                                <div className="font-bold uppercase tracking-tight mb-1 opacity-80">{r.cargo}:</div>
                                <ul className="list-disc pl-5 space-y-1">
                                  {r.errors.map((e, j) => (
                                    <li key={j} className="leading-relaxed">{e}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Section + Elector summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SecoesSummary s={localData.s} />
                    <EleitoresSummary e={localData.e} />
                  </div>

                  {/* Votes breakdown */}
                  <VoteVisualization v={localData.v} isProportional={!isMajority} />

                  {/* Search Bar */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar candidato por nome, partido ou número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5 transition-colors"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-1 flex-1">
                      {([
                        { key: 'all', label: `Todos (${filterCounts.all})`, color: 'blue' },
                        { key: 'fav', label: `♥ Favoritos (${filterCounts.fav})`, color: 'pink' },
                        { key: 'eleitos', label: `✓ Eleitos (${filterCounts.eleitos})`, color: 'green' },
                        { key: 'valido', label: `Válido`, color: 'indigo' },
                        { key: 'legenda', label: `Legenda (${filterCounts.legenda})`, color: 'cyan', hide: isMajority },
                        { key: 'anulado', label: `Anulado (${filterCounts.anulado})`, color: 'orange' },
                        { key: 'subjudice', label: `Sub-Judice (${filterCounts.subjudice})`, color: 'purple' },
                      ] as { key: string; label: string; color: string; hide?: boolean }[]).filter(f => !f.hide).map(({ key, label, color }) => {
                        const active = statusFilter === key;
                        const activeCls = {
                          blue: 'bg-blue-600 text-white',
                          pink: 'bg-pink-500 text-white',
                          green: 'bg-green-600 text-white',
                          indigo: 'bg-indigo-600 text-white',
                          cyan: 'bg-cyan-600 text-white',
                          orange: 'bg-orange-600 text-white',
                          purple: 'bg-purple-600 text-white',
                        }[color];
                        return (
                          <button
                            key={key}
                            onClick={() => setStatusFilter(key as any)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${active ? activeCls : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as any)}
                      className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 transition-colors focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="votos">Ordenar: Votos (↓)</option>
                      <option value="nome">Ordenar: Nome (ABC)</option>
                      <option value="partido">Ordenar: Partido</option>
                      <option value="eleito">Ordenar: Situação</option>
                      <option value="idade">Ordenar: Mais Idosos</option>
                    </select>
                  </div>

                  {/* Party filter for proportional */}
                  {!isMajority && parties.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Partido:</span>
                      <button
                        onClick={() => setPartyFilter('all')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${partyFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'}`}
                      >
                        Todos
                      </button>
                      {parties.map(p => (
                        <button
                          key={p.sg}
                          onClick={() => setPartyFilter(p.sg)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${partyFilter === p.sg ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'}`}
                          title={p.nm}
                        >
                          {p.sg}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Candidates */}
                  {cargoData && (
                    <div>
                      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        {cargoData.nmn}
                        <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{cargoData.nv} vaga{parseInt(cargoData.nv) > 1 ? 's' : ''}</span>
                      </h3>

                      {filteredAndSortedCandidates.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                          <p className="text-gray-500 dark:text-gray-400">Nenhum candidato encontrado com os filtros atuais.</p>
                          <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPartyFilter('all'); }} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">Limpar filtros</button>
                        </div>
                      ) : isMajority ? (
                        // ── Majority: cards sorted by votes ───────────────────
                        <div className="space-y-3">
                          {filteredAndSortedCandidates.map(({ cand, agr }) => (
                            <CandCard key={cand.sqcand} cand={cand} agr={agr} totalVotos={totalVotos} ambiente={ambiente} ciclo={ciclo} eleicaoCd={eleicaoCd} uf={uf} isProportional={false} isFavorite={favorites.has(cand.sqcand)} onToggleFavorite={() => toggleFavorite(cand.sqcand)} />
                          ))}
                        </div>
                      ) : (
                        // ── Proportional: table ───────────────────────────────
                        <div className="bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-10">Nº</th>
                                <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Candidato</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Votos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAndSortedCandidates.map(({ cand, agr }) => (
                                <CandCard key={cand.sqcand} cand={cand} agr={agr} totalVotos={totalVotos} ambiente={ambiente} ciclo={ciclo} eleicaoCd={eleicaoCd} uf={uf} isProportional={true} isFavorite={favorites.has(cand.sqcand)} onToggleFavorite={() => toggleFavorite(cand.sqcand)} />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
