import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEA11 } from '../services/ea11Service';
import { fetchEA12, flattenEA12Municipios } from '../services/ea12Service';

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

export function Validator() {
  const [selectedEleicaoCd, setSelectedEleicaoCd] = useState<string | null>(null);
  const [munSearchText, setMunSearchText] = useState('');
  const [selectedMunCd, setSelectedMunCd] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState('Todas');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const { data: ea11Data, isLoading: isEA11Loading, isError: isEA11Error, error: error11 } = useQuery({
    queryKey: ['ea11-config'],
    queryFn: fetchEA11,
  });

  const cicloString = ea11Data ? ea11Data.c : '';

  const { data: ea12Data, isLoading: isEA12Loading, isError: isEA12Error } = useQuery({
    queryKey: ['ea12-config', cicloString, selectedEleicaoCd],
    queryFn: () => fetchEA12(cicloString, selectedEleicaoCd!),
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

  if (isEA11Error || !ea11Data) {
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
    ea11Data.pl.flatMap(p => p.e).map(e => e.cdt2).filter(Boolean)
  );

  // Flatten all elections and attach their parent pleito for easy rendering
  const allElections = ea11Data.pl.flatMap(p =>
    p.e.map(e => ({
      ...e,
      pleitoCd: p.cd,
      pleitoDt: p.dt
    }))
  );

  const selectedMun = selectedMunCd && ea12Data
    ? flattenEA12Municipios(ea12Data!).find(m => m.munCdTse === selectedMunCd)
    : null;

  const topLevelElections = allElections
    .filter(e => !t2ElectionCodes.has(e.cd))
    .sort((a, b) => {
      const isOrdinariaA = ['1', '3', '6'].includes(a.tp);
      const isOrdinariaB = ['1', '3', '6'].includes(b.tp);

      if (isOrdinariaA && !isOrdinariaB) return -1;
      if (!isOrdinariaA && isOrdinariaB) return 1;

      // Convert DD/MM/YYYY to Date for sorting
      const [dayA, monthA, yearA] = a.pleitoDt.split('/');
      const dateA = new Date(Number(yearA), Number(monthA) - 1, Number(dayA));

      const [dayB, monthB, yearB] = b.pleitoDt.split('/');
      const dateB = new Date(Number(yearB), Number(monthB) - 1, Number(dayB));

      return dateB.getTime() - dateA.getTime();
    });

  return (
    <div className={`mx-auto space-y-6 transition-all duration-300 ${selectedEleicaoCd ? 'max-w-[1600px] px-4' : 'max-w-5xl'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 dark:border dark:border-slate-800 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              {selectedEleicaoCd && (
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
              Validador de Recursos TSE (EA11)
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Ciclo: <span className="font-semibold text-blue-600 dark:text-blue-400">{ea11Data.c}</span> |
              Gerado em: {ea11Data.dg} às {ea11Data.hg}
            </p>
          </div>
          <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-400 dark:border-green-800">
            Ambiente Oficial
          </span>
        </div>

        <div className="space-y-6">
          {topLevelElections
            .filter((eleicao) => {
              if (selectedEleicaoCd === null) return true;
              if (selectedEleicaoCd === eleicao.cd) return true;
              // Se o selecionado for o T2 deste pleito, mantém o pai visível
              if (eleicao.cdt2 === selectedEleicaoCd) return true;
              return false;
            })
            .map((eleicao) => {
              const eleicaoT2 = eleicao.cdt2 ? allElections.find(e => e.cd === eleicao.cdt2) : null;

              return (
                <div
                  key={eleicao.cd}
                  className="bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="bg-gray-50 dark:bg-slate-800/80 p-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex-1">
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
                                      {selectedMun.z.sort((a,b) => parseInt(a) - parseInt(b)).map(z => (
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
                        <button
                          onClick={() => {
                            setSelectedEleicaoCd(eleicao.cd);
                            setMunSearchText('');
                            setSelectedMunCd(null);
                            setSelectedZona('Todas');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded transition-all text-xs h-8 flex items-center shadow-sm whitespace-nowrap"
                        >
                          Selecionar eleição
                        </button>
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
                                        {selectedMun.z.sort((a,b) => parseInt(a) - parseInt(b)).map(z => (
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
                          <button
                            onClick={() => {
                              setSelectedEleicaoCd(eleicaoT2.cd);
                              setMunSearchText('');
                              setSelectedMunCd(null);
                              setSelectedZona('Todas');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded transition-all text-xs h-8 flex items-center shadow-sm whitespace-nowrap"
                          >
                            Selecionar eleição
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-white dark:bg-slate-800/20 flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      Abrangência: <strong className="text-gray-800 dark:text-gray-200">{eleicao.abr.length}</strong> locais
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>

  );
}
