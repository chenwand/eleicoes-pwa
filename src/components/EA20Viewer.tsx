import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA20, buildCandidatoFotoUrl } from '../services/ea20Service';
import { validateEA20 } from '../services/ea20Validator';
import { useEnvironment } from '../context/EnvironmentContext';
import type { EA20Cargo, EA20Candidato, EA20Agrupamento } from '../types/ea20';

// ── helpers ──────────────────────────────────────────────────────────────────

const DVT_COLORS: Record<string, string> = {
  'Válido':     '',
  'Anulado':    'text-orange-600 dark:text-orange-400',
  'Sub-Judice': 'text-purple-600 dark:text-purple-400',
  'Nulo':       'text-red-500 dark:text-red-400',
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
    return Array.from(new Map(list.map(p => [p.sg, p])).values()).sort((a,b) => a.sg.localeCompare(b.sg));
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

                <div className="space-y-6 pt-2">

                {/* Validation errors */}
                {validationResults.length > 0 && (
                  <div className="space-y-2">
                    {validationResults.map((r, i) => (
                      <div key={i} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
                        <strong className="flex items-center gap-1 mb-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          Inconsistências — {r.cargo}:
                        </strong>
                        <ul className="list-disc pl-5 space-y-0.5">{r.errors.map((e, j) => <li key={j}>{e}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section + Elector summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Seções</div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Totalizadas</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{localData.s.pst}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
                      <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${parsePct(localData.s.pst)}%` }} />
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{parseNum(localData.s.st).toLocaleString('pt-BR')} de {parseNum(localData.s.ts).toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Eleitores</div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Comparecimento</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{localData.e.pc}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${parsePct(localData.e.pc)}%` }} />
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {parseNum(localData.e.c).toLocaleString('pt-BR')} comparecimentos · {parseNum(localData.e.a).toLocaleString('pt-BR')} abstenções
                    </div>
                  </div>
                </div>

                {/* Votes breakdown */}
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Distribuição de Votos</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'Total (tv)', val: localData.v.tv, pct: '100', color: 'text-gray-800 dark:text-gray-100 font-bold' },
                        { label: 'Vál. Conc. (vvc)', val: localData.v.vvc, pct: localData.v.pvvc, color: 'text-green-700 dark:text-green-300' },
                        { label: 'Válidos (vv)', val: localData.v.vv, pct: localData.v.pvv, color: 'text-green-600 dark:text-green-400' },
                        { label: 'Nominais (vnom)', val: localData.v.vnom, pct: localData.v.pvnom, color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Legenda (vl)', val: localData.v.vl, pct: localData.v.pvl, color: 'text-blue-500 dark:text-blue-400' },
                        { label: 'Brancos (vb)', val: localData.v.vb, pct: localData.v.pvb, color: 'text-gray-500 dark:text-gray-400' },
                        { label: 'Anulados (van)', val: localData.v.van, pct: localData.v.pvan, color: 'text-orange-600 dark:text-orange-400' },
                        { label: 'Anul. SJ (vansj)', val: localData.v.vansj, pct: localData.v.pvansj, color: 'text-purple-600 dark:text-purple-400' },
                        { label: 'Total Nulos (tvn)', val: localData.v.tvn, pct: localData.v.ptvn, color: 'text-red-600 dark:text-red-400' },
                        { label: 'Nulos (vn)', val: localData.v.vn, pct: localData.v.pvn, color: 'text-red-500 dark:text-red-450' },
                        { label: 'Nulos Técn. (vnt)', val: localData.v.vnt, pct: localData.v.pvnt, color: 'text-red-400 dark:text-red-500' },
                        { label: 'Sem Cand. (vscv)', val: localData.v.vscv, pct: '-', color: 'text-gray-400 dark:text-gray-600' },
                      ].map(({ label, val, pct, color }) => (
                        <div key={label} className="bg-white dark:bg-slate-900 rounded p-2 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                          <div className={`text-xs font-bold ${color}`}>{parseInt(val || '0', 10).toLocaleString('pt-BR')}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">{pct}%</div>
                          <div className="text-[9px] text-gray-500 dark:text-gray-400 font-medium leading-tight">{label}</div>
                        </div>
                      ))}
                    </div>
                </div>

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
