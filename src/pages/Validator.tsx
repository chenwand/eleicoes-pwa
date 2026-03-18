import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA11 } from '../services/ea11Service';
import { fetchEA12, flattenEA12Municipios } from '../services/ea12Service';
import { EA14Viewer } from '../components/EA14Viewer';
import { useEnvironment } from '../context/EnvironmentContext';

// Tipos de Eleição (Fonte: EA11 Documentação TSE)
const TIPO_ELEICAO: Record<string, string> = {
  '1': 'Ordinária',
  '2': 'Suplementar',
  '3': 'Ordinária Municipal',
  '4': 'Suplementar Municipal',
  '5': 'Renovação Juntas',
  '6': 'Ordinária Distrito Estadual',
  '7': 'Consulta Popular',
};

function formatTipoEleicao(tpCode: string): string {
  return TIPO_ELEICAO[tpCode] || `Desconhecido (${tpCode})`;
}

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

export function Validator() {
  const { ambiente } = useEnvironment();
  const [eleicaoSearchTerm, setEleicaoSearchTerm] = useState('');
  const [eleicaoStatusFilter, setEleicaoStatusFilter] = useState<'all' | 'fav'>('all');
  const [eleicaoSortMode, setEleicaoSortMode] = useState<'default' | 'data' | 'tipo' | 'nome'>('default');
  
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('ea11-fav');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const toggleFavoriteEleicao = (cd: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(cd)) next.delete(cd); 
      else next.add(cd);
      localStorage.setItem('ea11-fav', JSON.stringify([...next]));
      return next;
    });
  };

  const [selectedEleicaoCd, setSelectedEleicaoCd] = useState<string | null>(null);
  const [munSearchText, setMunSearchText] = useState('');
  const [selectedMunCd, setSelectedMunCd] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState('Todas');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEA14EleicaoCd, setSelectedEA14EleicaoCd] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [localEA11Data, setLocalEA11Data] = useState<any>(null);
  const [isEA11Editing, setIsEA11Editing] = useState(false);
  const [isEA11Modified, setIsEA11Modified] = useState(false);
  const [ea11EditValue, setEA11EditValue] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizeString = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const { data: ea11Data, isLoading: isEA11Loading, isError: isEA11Error, error: error11, refetch: refetchEA11, isFetching: isEA11Fetching } = useQuery({
    queryKey: ['ea11-config', ambiente],
    queryFn: () => fetchEA11(ambiente),
  });

  useEffect(() => {
    if (ea11Data) {
      setLocalEA11Data(ea11Data);
      setIsEA11Modified(false);
    }
  }, [ea11Data]);

  const cicloString = localEA11Data ? localEA11Data.c : '';

  const { data: ea12Data, isLoading: isEA12Loading, isError: isEA12Error } = useQuery({
    queryKey: ['ea12-config', cicloString, selectedEleicaoCd, ambiente],
    queryFn: () => fetchEA12(cicloString, selectedEleicaoCd!, ambiente),
    enabled: !!selectedEleicaoCd && !!cicloString,
  });

  // Auto-selecionar se a eleição tiver apenas 1 município/estado
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ea12Data) {
      const allMuns = flattenEA12Municipios(ea12Data);
      if (allMuns.length === 1 && selectedMunCd !== allMuns[0].munCdTse) {
        const mun = allMuns[0];
        const label = `${mun.munNome} (${mun.ufCd}) - Cód: ${mun.munCdTse}`;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMunSearchText(label);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedMunCd(mun.munCdTse);
      }
    }
  }, [ea12Data]);

  if (isEA11Loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Acessando ele-c.json...</p>
        </div>
      </div>
    );
  }

  if (isEA11Error || !localEA11Data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-6 text-center max-w-2xl mx-auto mt-8 transition-colors duration-300">
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Erro de Conexão</h2>
        <p className="text-red-600 dark:text-red-300">
          {error11 instanceof Error ? error11.message : 'Não foi possível carregar a configuração oficial do TSE.'}
        </p>
      </div>
    );
  }


  // Pre-calculate which elections are being referenced as 2nd round by others
  const t2ElectionCodes = new Set(
    localEA11Data.pl.flatMap((p: any) => p.e).map((e: any) => e.cdt2).filter(Boolean)
  );

  // Flatten all elections and attach their parent pleito for easy rendering
  const allElections = localEA11Data.pl.flatMap((p: any) =>
    p.e.map((e: any) => ({
      ...e,
      pleitoCd: p.cd,
      pleitoDt: p.dt
    }))
  );

  const selectedMun = selectedMunCd && ea12Data
    ? flattenEA12Municipios(ea12Data!).find(m => m.munCdTse === selectedMunCd)
    : null;

  const topLevelElections = allElections.filter((e: any) => !t2ElectionCodes.has(e.cd));

  const topLevelElectionsFiltered = topLevelElections
    .filter((e: any) => {
      if (eleicaoStatusFilter === 'fav' && !favorites.has(e.cd)) return false;

      if (!eleicaoSearchTerm) return true;
      const search = normalizeString(eleicaoSearchTerm);
      
      const eT2 = e.cdt2 ? allElections.find((t: any) => t.cd === e.cdt2) : null;
      const match1 = normalizeString(e.nm).includes(search) || e.cd.includes(search) || normalizeString(formatTipoEleicao(e.tp)).includes(search);
      const match2 = eT2 ? (normalizeString(eT2.nm).includes(search) || eT2.cd.includes(search) || normalizeString(formatTipoEleicao(eT2.tp)).includes(search)) : false;

      return match1 || match2;
    })
    .sort((a: any, b: any) => {
      const aFav = favorites.has(a.cd) ? 0 : 1;
      const bFav = favorites.has(b.cd) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;

      if (eleicaoSortMode === 'data') {
        const [dayA, monthA, yearA] = a.pleitoDt.split('/');
        const dateA = new Date(Number(yearA), Number(monthA) - 1, Number(dayA));
        const [dayB, monthB, yearB] = b.pleitoDt.split('/');
        const dateB = new Date(Number(yearB), Number(monthB) - 1, Number(dayB));
        return dateB.getTime() - dateA.getTime();
      }

      if (eleicaoSortMode === 'tipo') {
        return formatTipoEleicao(a.tp).localeCompare(formatTipoEleicao(b.tp));
      }

      if (eleicaoSortMode === 'nome') {
        return a.nm.localeCompare(b.nm);
      }

      const isOrdinariaA = ['1', '3', '6'].includes(a.tp);
      const isOrdinariaB = ['1', '3', '6'].includes(b.tp);

      if (isOrdinariaA && !isOrdinariaB) return -1;
      if (!isOrdinariaA && isOrdinariaB) return 1;

      const [dayA2, monthA2, yearA2] = a.pleitoDt.split('/');
      const dateA2 = new Date(Number(yearA2), Number(monthA2) - 1, Number(dayA2));

      const [dayB2, monthB2, yearB2] = b.pleitoDt.split('/');
      const dateB2 = new Date(Number(yearB2), Number(monthB2) - 1, Number(dayB2));

      return dateB2.getTime() - dateA2.getTime();
    });

  return (
    <div className={`mx-auto space-y-6 transition-all duration-300 ${selectedEleicaoCd ? 'max-w-[1600px] px-4' : 'max-w-5xl'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 dark:border dark:border-slate-800 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              {selectedEleicaoCd && !showRawJson && (
                <button
                  onClick={() => {
                    setSelectedEleicaoCd(null);
                    setMunSearchText('');
                    setSelectedMunCd(null);
                  }}
                  className="p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors flex items-center justify-center"
                  title="Voltar para a lista de eleições"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
              )}
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Arquivo de configuração de eleições (EA11)
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-2">
              Ciclo: <span className="font-semibold text-blue-600 dark:text-blue-400">{localEA11Data.c}</span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              Arquivo gerado em:{' '}
              <a
                href={`https://resultados.tse.jus.br/${ambiente}/comum/config/ele-c.json`}
                target="_blank"
                rel="noreferrer"
                className="font-mono hover:text-blue-500 dark:hover:text-blue-400 underline underline-offset-2 transition-colors ml-1"
                title="Abrir / baixar JSON EA11 (ele-c.json)"
              >
                {localEA11Data.dg} {localEA11Data.hg} ↓
              </a>
            </p>
            {isEA11Modified && (
              <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 animate-pulse w-fit">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Dados de configuração editados localmente
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  refetchEA11().then((result) => {
                    if (result.data) {
                      setLocalEA11Data(result.data);
                      setIsEA11Modified(false);
                      setIsEA11Editing(false);
                    }
                  });
                }}
                disabled={isEA11Fetching}
                className={`p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded transition-colors ${isEA11Fetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Atualizar dados (EA11)"
              >
                <svg className={`w-4 h-4 ${isEA11Fetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>
              {!selectedEleicaoCd && (
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
                  title="Alternar visualização do JSON"
                >
                  {showRawJson ? 'Painel Visual' : 'Ver JSON'}
                </button>
              )}
            </div>
          </div>
        </div>

        {showRawJson ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                Configuração EA11 (ele-c.json)
              </span>
              <div className="flex gap-2">
                {!isEA11Editing ? (
                  <button
                    onClick={() => {
                      setEA11EditValue(JSON.stringify(localEA11Data, null, 2));
                      setIsEA11Editing(true);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Editar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(ea11EditValue);
                          setLocalEA11Data(parsed);
                          setIsEA11Modified(true);
                          setIsEA11Editing(false);
                        } catch (e) {
                          alert("JSON inválido! Por favor corrija antes de salvar.");
                        }
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setIsEA11Editing(false)}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEA11Editing ? (
              <textarea
                value={ea11EditValue}
                onChange={(e) => setEA11EditValue(e.target.value)}
                className="w-full h-[500px] p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-inner"
                spellCheck={false}
              />
            ) : (
              <div
                onClick={() => {
                  setEA11EditValue(JSON.stringify(localEA11Data, null, 2));
                  setIsEA11Editing(true);
                }}
                className="bg-[#1e1e1e] rounded-lg p-4 overflow-x-auto shadow-inner border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors group relative"
                title="Clique para editar"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">
                  Clique para editar
                </div>
                {renderHighlightedJson(localEA11Data)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {!selectedEleicaoCd && (
              <div className="space-y-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar eleição por nome, código ou tipo..."
                    value={eleicaoSearchTerm}
                    onChange={(e) => setEleicaoSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5 transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {([
                      { key: 'all', label: `Todas (${topLevelElections.length})` },
                      { key: 'fav', label: `♥ Favoritas (${favorites.size})` },
                    ] as const).map(({ key, label }) => {
                      const active = eleicaoStatusFilter === key;
                      const colorMap: Record<string, string> = {
                        all: active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                        fav: active ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                      };
                      return (
                        <button
                          key={key}
                          onClick={() => setEleicaoStatusFilter(key)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${colorMap[key]}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <select
                    value={eleicaoSortMode}
                    onChange={(e) => setEleicaoSortMode(e.target.value as typeof eleicaoSortMode)}
                    className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 transition-colors focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="default">Ordenar: Padrão</option>
                    <option value="data">↓ Data do Pleito</option>
                    <option value="tipo">↓ Tipo de Eleição</option>
                    <option value="nome">↓ Nome (Alfabética)</option>
                  </select>
                </div>
              </div>
            )}
            {topLevelElectionsFiltered
              .filter((eleicao: any) => {
                if (selectedEleicaoCd === null) return true;
                if (selectedEleicaoCd === eleicao.cd) return true;
                // Se o selecionado for o T2 deste pleito, mantém o pai visível
                if (eleicao.cdt2 === selectedEleicaoCd) return true;
                return false;
              })
              .map((eleicao: any) => {
                const eleicaoT2 = eleicao.cdt2 ? allElections.find((e: any) => e.cd === eleicao.cdt2) : null;

                return (
                  <div
                    key={eleicao.cd}
                    className="bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm"
                  >
                    <div className="bg-gray-50 dark:bg-slate-800/80 p-4 border-b border-gray-200 dark:border-slate-700">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex-1 flex items-center gap-2">
                          <button
                            onClick={(e) => toggleFavoriteEleicao(eleicao.cd, e)}
                            title={favorites.has(eleicao.cd) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                            className={`transition-colors flex-shrink-0 ${favorites.has(eleicao.cd) ? 'text-pink-500 hover:text-pink-600' : 'text-gray-300 dark:text-gray-600 hover:text-pink-400'}`}
                          >
                            <svg className="w-5 h-5 shrink-0" fill={favorites.has(eleicao.cd) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                          {eleicao.nm.replace(/&#186;/g, 'º')}
                        </h3>
                        <span className="shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap border border-blue-200 dark:border-blue-800">
                          Eleição: {eleicao.cd}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full font-medium text-xs">Turno {eleicao.t}</span>
                        <span>•</span>
                        <span className="font-medium text-xs">{formatTipoEleicao(eleicao.tp)}</span>
                        <span>•</span>
                        <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm border border-gray-200 dark:border-slate-700 text-xs">
                          Pleito: <strong className="text-gray-800 dark:text-gray-200">{eleicao.pleitoCd}</strong> ({eleicao.pleitoDt})
                        </span>
                        {selectedEleicaoCd === eleicao.cd ? (
                          <div className="w-full sm:w-auto flex-1 mt-2 sm:mt-0 relative" ref={dropdownRef}>
                            {isEA12Loading ? (
                              <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900 h-8">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                Carregando...
                              </div>
                            ) : isEA12Error ? (
                              <div className="text-xs text-red-600 dark:text-red-400 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900 h-8 flex items-center">Erro ao carregar locais.</div>
                            ) : ea12Data ? (
                              <>
                                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
                                  <div className="relative flex-1 w-full">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none gap-1.5">
                                      {selectedMun ? (
                                        <img
                                          src={`/flags/${selectedMun.ufCd.toLowerCase()}.svg`}
                                          alt={selectedMun.ufCd}
                                          className="w-4 h-3 object-contain rounded-sm shadow-sm"
                                        />
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      value={munSearchText}
                                      onFocus={() => setIsDropdownOpen(true)}
                                      onClick={() => {
                                        if (selectedMunCd) {
                                          setMunSearchText('');
                                          setSelectedMunCd(null);
                                          setSelectedZona('Todas');
                                        }
                                      }}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setMunSearchText(val);
                                        setIsDropdownOpen(true);
                                        if (!val.trim()) {
                                          setSelectedMunCd(null);
                                        }
                                      }}
                                      placeholder="Selecione a abrangência..."
                                      className="w-full border border-gray-300 dark:border-slate-600 rounded shadow-sm pl-8 pr-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 h-8 placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                  </div>
                                  {selectedMun && (
                                    <div
                                      className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded border shadow-sm h-8"
                                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                                    >
                                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Zona</label>
                                      <select
                                        value={selectedZona}
                                        onChange={(e) => setSelectedZona(e.target.value)}
                                        className="border-none bg-transparent text-sm focus:ring-0 focus:outline-none text-gray-700 dark:text-gray-200 font-medium pr-1 cursor-pointer"
                                      >
                                        <option value="Todas" className="dark:bg-slate-900 dark:text-gray-200">Todas</option>
                                        {selectedMun.z.sort((a, b) => parseInt(a) - parseInt(b)).map(z => (
                                          <option key={z} value={z} className="dark:bg-slate-900 dark:text-gray-200">{z}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                {isDropdownOpen && (
                                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {(() => {
                                      const filtered = flattenEA12Municipios(ea12Data!)
                                        .filter(mun => {
                                          const search = normalizeString(munSearchText);
                                          if (!search) return true;
                                          return normalizeString(`${mun.munNome} ${mun.ufCd} ${mun.munCdTse}`).includes(search);
                                        })
                                        .slice(0, 50);

                                      let lastUf = '';
                                      return filtered.map((mun, idx) => {
                                        const showUfHeader = mun.ufNome !== lastUf;
                                        if (showUfHeader) lastUf = mun.ufNome;
                                        const label = `${mun.munNome} (${mun.ufCd}) - Cód: ${mun.munCdTse}`;
                                        const isSelected = selectedMunCd === mun.munCdTse;
                                        return (
                                          <div key={`${mun.ufCd}-${mun.munCdTse}-${idx}`}>
                                            {showUfHeader && (
                                              <div className="bg-gray-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 z-10 border-y border-gray-200 dark:border-slate-700 flex items-center gap-2">
                                                <img
                                                  src={`/flags/${mun.ufCd.toLowerCase()}.svg`}
                                                  alt={mun.ufCd}
                                                  className="w-4 h-3 object-contain rounded-sm shadow-sm"
                                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                                {mun.ufNome} ({mun.ufCd})
                                              </div>
                                            )}
                                            <div
                                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                                              onClick={() => {
                                                setMunSearchText(label);
                                                setSelectedMunCd(mun.munCdTse);
                                                setSelectedZona('Todas');
                                                setIsDropdownOpen(false);
                                              }}
                                            >
                                              {label}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedEleicaoCd(eleicao.cd);
                                setMunSearchText('');
                                setSelectedMunCd(null);
                                setSelectedZona('Todas');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded transition-all text-xs h-8 flex items-center shadow-sm whitespace-nowrap"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                              Arquivo Unificado (EA20)
                            </button>
                            {['1', '3', '6'].includes(eleicao.tp) && (
                              <button
                                onClick={() => setSelectedEA14EleicaoCd(eleicao.cd)}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-4 rounded transition-all text-xs h-8 flex items-center shadow-sm whitespace-nowrap"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                Arquivo de Acompanhamento BR (EA14)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {eleicaoT2 && (
                      <div className="bg-blue-50/20 dark:bg-blue-900/10 p-4 border-b border-gray-100 dark:border-slate-700 ml-4 border-l-4 border-l-blue-400 dark:border-l-blue-600">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex-1 text-base">
                            ↳ 2º Turno: {eleicaoT2.nm.replace(/&#186;/g, 'º')}
                          </h4>
                          <span className="shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap border border-blue-200 dark:border-blue-800">
                            Eleição: {eleicaoT2.cd}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 pl-4">
                          <span className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full font-medium text-xs">Turno {eleicaoT2.t}</span>
                          <span>•</span>
                          <span className="font-medium text-xs">{formatTipoEleicao(eleicaoT2.tp)}</span>
                          <span>•</span>
                          <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm border border-gray-100 dark:border-slate-800 text-xs">
                            Pleito: <strong className="text-gray-800 dark:text-gray-200">{eleicaoT2.pleitoCd}</strong> ({eleicaoT2.pleitoDt})
                          </span>
                          {selectedEleicaoCd === eleicaoT2.cd ? (
                            <div className="w-full sm:w-auto flex-1 mt-2 sm:mt-0 relative" ref={dropdownRef}>
                              {isEA12Loading ? (
                                <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900 h-8">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                  Carregando...
                                </div>
                              ) : isEA12Error ? (
                                <div className="text-xs text-red-600 dark:text-red-400 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900 h-8 flex items-center">Erro ao carregar locais.</div>
                              ) : ea12Data ? (
                                <>
                                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
                                    <div className="relative flex-1 w-full">
                                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none gap-1.5">
                                        {selectedMun ? (
                                          <img
                                            src={`/flags/${selectedMun.ufCd.toLowerCase()}.svg`}
                                            alt={selectedMun.ufCd}
                                            className="w-4 h-3 object-contain rounded-sm shadow-sm"
                                          />
                                        ) : (
                                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                          </svg>
                                        )}
                                      </div>
                                      <input
                                        type="text"
                                        value={munSearchText}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        onClick={() => {
                                          if (selectedMunCd) {
                                            setMunSearchText('');
                                            setSelectedMunCd(null);
                                            setSelectedZona('Todas');
                                          }
                                        }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setMunSearchText(val);
                                          setIsDropdownOpen(true);
                                          if (!val.trim()) {
                                            setSelectedMunCd(null);
                                          }
                                        }}
                                        placeholder="Selecione a abrangência..."
                                        className="w-full border border-gray-300 dark:border-slate-600 rounded shadow-sm pl-8 pr-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 h-8 placeholder-gray-400 dark:placeholder-gray-500"
                                      />
                                    </div>
                                    {selectedMun && (
                                      <div
                                        className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded border shadow-sm h-8"
                                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                                      >
                                        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Zona</label>
                                        <select
                                          value={selectedZona}
                                          onChange={(e) => setSelectedZona(e.target.value)}
                                          className="border-none bg-transparent text-sm focus:ring-0 focus:outline-none text-gray-700 dark:text-gray-200 font-medium pr-1 cursor-pointer"
                                        >
                                          <option value="Todas" className="dark:bg-slate-900 dark:text-gray-200">Todas</option>
                                          {selectedMun.z.sort((a, b) => parseInt(a) - parseInt(b)).map(z => (
                                            <option key={z} value={z} className="dark:bg-slate-900 dark:text-gray-200">{z}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                  {isDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                      {(() => {
                                        const filtered = flattenEA12Municipios(ea12Data!)
                                          .filter(mun => {
                                            const search = normalizeString(munSearchText);
                                            if (!search) return true;
                                            return normalizeString(`${mun.munNome} ${mun.ufCd} ${mun.munCdTse}`).includes(search);
                                          })
                                          .slice(0, 50);

                                        let lastUf = '';
                                        return filtered.map((mun, idx) => {
                                          const showUfHeader = mun.ufNome !== lastUf;
                                          if (showUfHeader) lastUf = mun.ufNome;
                                          const label = `${mun.munNome} (${mun.ufCd}) - Cód: ${mun.munCdTse}`;
                                          const isSelected = selectedMunCd === mun.munCdTse;
                                          return (
                                            <div key={`${mun.ufCd}-${mun.munCdTse}-${idx}`}>
                                              {showUfHeader && (
                                                <div className="bg-gray-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 z-10 border-y border-gray-200 dark:border-slate-700 flex items-center gap-2">
                                                  <img
                                                    src={`/flags/${mun.ufCd.toLowerCase()}.svg`}
                                                    alt={mun.ufCd}
                                                    className="w-4 h-3 object-contain rounded-sm shadow-sm"
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                  />
                                                  {mun.ufNome} ({mun.ufCd})
                                                </div>
                                              )}
                                              <div
                                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                                                onClick={() => {
                                                  setMunSearchText(label);
                                                  setSelectedMunCd(mun.munCdTse);
                                                  setSelectedZona('Todas');
                                                  setIsDropdownOpen(false);
                                                }}
                                              >
                                                {label}
                                              </div>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  )}
                                </>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedEleicaoCd(eleicaoT2.cd);
                                  setMunSearchText('');
                                  setSelectedMunCd(null);
                                  setSelectedZona('Todas');
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded transition-all text-xs h-8 flex items-center shadow-sm whitespace-nowrap"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                Arquivo unificado (EA20)
                              </button>
                              {['1', '3', '6'].includes(eleicaoT2.tp) && (
                                <button
                                  onClick={() => setSelectedEA14EleicaoCd(eleicaoT2.cd)}
                                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-4 rounded transition-all text-xs h-8 flex items-center shadow-sm whitespace-nowrap"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                  Arquivo de Acompanhamento BR (EA14)
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-white dark:bg-slate-800/20 flex justify-between items-center text-sm">

                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {selectedEA14EleicaoCd && (() => {
        const currentElectionFromAll = allElections.find((e: any) => e.cd === selectedEA14EleicaoCd);
        const isT2ForEA14 = currentElectionFromAll?.t === '2';
        const relatedEA14Eleicao = isT2ForEA14 
          ? allElections.find((e: any) => e.cdt2 === selectedEA14EleicaoCd)
          : allElections.find((e: any) => e.cd === currentElectionFromAll?.cdt2);

        return (
          <EA14Viewer
            ciclo={cicloString}
            eleicaoCd={selectedEA14EleicaoCd}
            eleicaoNome={currentElectionFromAll?.nm.replace(/&#186;/g, 'º') || `Eleição ${selectedEA14EleicaoCd}`}
            relatedEleicaoCd={relatedEA14Eleicao?.cd}
            relatedEleicaoTurno={isT2ForEA14 ? '1' : '2'}
            onChangeEleicao={(cd) => setSelectedEA14EleicaoCd(cd)}
            onClose={() => setSelectedEA14EleicaoCd(null)}
          />
        );
      })()}
    </div>

  );
}
