import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useEnvironment } from '../context/EnvironmentContext';
import { useElection } from '../context/ElectionContext';
import { useFavorites } from '../hooks/useFavorites';
import { SettingsModal } from './SettingsModal';
import { useState, useRef, useEffect } from 'react';
import { adaptEA20Response } from '../utils/adapters/ea20Adapters';
import { adaptStatsResponse } from '../utils/adapters/statsAdapters';

const TIPO_MACRO: Record<string, string> = {
  '1': 'Estadual', '2': 'Estadual', '3': 'Municipal', '4': 'Municipal',
  '5': 'Nacional', '6': 'Estadual', '7': 'Municipal', '8': 'Federal', '9': 'Federal',
};
const TIPO_NATUREZA: Record<string, string> = {
  '1': 'Ordinária', '2': 'Suplementar', '3': 'Ordinária', '4': 'Suplementar',
  '5': 'Consulta Popular', '6': 'Consulta Popular', '7': 'Consulta Popular',
  '8': 'Ordinária', '9': 'Suplementar',
};

export function Header({ onLocalFileLoaded }: { onLocalFileLoaded: (data: { type: 'EA11' | 'EA14' | 'EA15' | 'EA20', data: any }) => void }) {
  const { theme, toggleTheme } = useTheme();
  const { ambiente, host } = useEnvironment();
  const { selectedEleicao, selectedAbrangencia, switchTurno, turnoSwitchAllowed, ea11Data } = useElection();
  const { captureFavorite, isCurrentContextFavorited, favorites, restoreFavorite, removeFavorite, renameFavorite, pendingFavorite } = useFavorites();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [favToast, setFavToast] = useState<string | null>(null);

  // Dropdown state
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFavoritesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveFavorite = () => {
    const result = captureFavorite();
    setFavToast(result.message);
    setTimeout(() => setFavToast(null), 2000);
  };

  const detectFileType = (data: any): 'EA11' | 'EA14' | 'EA15' | 'EA20' | null => {
    if (data.pl) return 'EA11';
    if (data.v && data.s) return 'EA20';
    if (data.abr && Array.isArray(data.abr)) {
      if (data.abr.some((a: any) => a.tpabr === 'mu')) return 'EA15';
      return 'EA14';
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const type = detectFileType(json);
        if (!type) {
          alert('Tipo de arquivo não reconhecido (não é EA11, EA14, EA15 ou EA20).');
          return;
        }

        let adaptedJson = json;
        if (type === 'EA20') {
          adaptedJson = adaptEA20Response(json);
        } else if (type === 'EA14' || type === 'EA15') {
          adaptedJson = adaptStatsResponse(json);
        }

        onLocalFileLoaded({ type, data: adaptedJson });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        alert('Erro ao processar arquivo JSON: ' + (err instanceof Error ? err.message : 'Arquivo inválido'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <header className="bg-blue-700 dark:bg-blue-900 text-white shadow-lg transition-colors duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* System Name and Icon */}
            <div className="flex flex-col">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    {/* Simplified modern logo: chart bars + checkmark */}
                    <path d="M4 11h3v10H4zM10 6h3v15h-3zM16 2h3v19h-3z" className="opacity-70" />
                    <path fill="var(--success)" d="M19.5 5.5l-8 8-4-4-1.5 1.5 5.5 5.5 9.5-9.5z" />
                  </svg>
                </div>
                <span className="text-xl font-black tracking-tight uppercase">Resultados Dashboard</span>
              </Link>

              {/* Selected Election Info */}
              {(selectedEleicao || pendingFavorite) && (() => {
                const isPending = !selectedEleicao && !!pendingFavorite;
                const activeNm = selectedEleicao ? selectedEleicao.nm.replace(/&#186;/g, 'º') : pendingFavorite!.context.eleicaoNm;
                const activeT = selectedEleicao ? selectedEleicao.t : pendingFavorite!.context.turno;
                const activeCd = selectedEleicao ? selectedEleicao.cd : pendingFavorite!.context.eleicaoCd;
                const activeMun = selectedAbrangencia 
                  ? `${selectedAbrangencia.munNome} (${selectedAbrangencia.ufCd})` 
                  : (pendingFavorite && pendingFavorite!.context.scopeLevel !== 'br' 
                      ? `${pendingFavorite!.context.munNome || pendingFavorite!.context.ufCd} (${pendingFavorite!.context.ufCd})` 
                      : 'Sem abrangência');

                return (
                  <div className={`flex items-center gap-2 mt-1 px-1 transition-all duration-300 ${isPending ? 'opacity-50 animate-pulse' : ''}`}>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-bold text-blue-100/80 uppercase tracking-widest">
                        {activeNm}
                      </span>
                      <span className="text-[10px] text-blue-200/60 font-medium truncate max-w-[250px] sm:max-w-none">
                        Turno {activeT} • {activeMun} • ID {activeCd}
                      </span>
                    </div>

                    {/* Round Switcher */}
                    {turnoSwitchAllowed && !isPending && (
                      <button
                        className="ml-2 px-2 py-0.5 text-[9px] bg-white/20 hover:bg-white/30 rounded uppercase font-bold transition-colors"
                        title={activeT === '1' ? "Mudar para 2º Turno" : "Mudar para 1º Turno"}
                        onClick={switchTurno}
                      >
                        Mudar Turno
                      </button>
                    )}

                    {/* Favorite Star */}
                    {!isPending && (
                      <button
                        className="ml-1 p-1 rounded-full hover:bg-white/20 transition-colors relative"
                        title={isCurrentContextFavorited ? 'Já salvo como favorito' : 'Salvar como favorito'}
                        onClick={handleSaveFavorite}
                      >
                        {isCurrentContextFavorited ? (
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-blue-200/60 hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                        {/* Inline toast */}
                        {favToast && (
                          <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-black/80 text-white text-[9px] font-bold rounded animate-fade-in">
                            {favToast}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Global Favorites Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 flex items-center gap-1.5"
                  title="Meus Favoritos"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {favorites.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {favorites.length}
                    </span>
                  )}
                </button>

                {isFavoritesOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 animate-fade-in flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Acesso Rápido</h3>
                      <span className="text-[10px] text-gray-500 font-medium">Ordenado pelo uso</span>
                    </div>

                    {favorites.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Nenhum favorito salvo
                      </div>
                    ) : (
                      <div className="flex flex-col py-2">
                        {[...favorites].sort((a, b) => b.lastUsedAt - a.lastUsedAt).map((fav) => {
                          const isCurrentEnv = fav.environment.ambiente === ambiente && fav.environment.host === host;
                          const isInvalid = !!(isCurrentEnv && ea11Data && !ea11Data.pl.some(p => p.e.some(ele => ele.cd === fav.context.eleicaoCd)));

                          return (
                            <div
                              key={fav.id}
                              className={`group flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0 ${
                                isInvalid ? 'opacity-60 grayscale-[50%]' : 'cursor-pointer'
                              }`}
                              onClick={() => {
                                if (!isInvalid) {
                                  restoreFavorite(fav);
                                  setIsFavoritesOpen(false);
                                }
                              }}
                            >
                              <div className="flex flex-col gap-1 pr-2 w-full overflow-hidden">
                                {editingId === fav.id ? (
                                  <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      className="w-full text-sm font-semibold bg-gray-50 dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && editName.trim()) {
                                          renameFavorite(fav.id, editName.trim());
                                          setEditingId(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingId(null);
                                        }
                                      }}
                                    />
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => {
                                          if (editName.trim()) {
                                            renameFavorite(fav.id, editName.trim());
                                            setEditingId(null);
                                          }
                                        }}
                                        className="text-[10px] uppercase font-bold text-green-600 hover:text-green-700"
                                      >Salvar</button>
                                      <button 
                                        onClick={() => setEditingId(null)}
                                        className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-500"
                                      >Cancelar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Line 1: Code + Macro+Nature + Turno */}
                                    <div className={`flex items-center gap-1.5 text-xs font-bold ${
                                      isInvalid ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'
                                    }`}>
                                      <span className="text-blue-600 dark:text-blue-400 font-mono">#{fav.context.eleicaoCd}</span>
                                      <span className="text-gray-300 dark:text-gray-600">·</span>
                                      <span className="truncate">{TIPO_MACRO[fav.context.tipo] || '?'} {TIPO_NATUREZA[fav.context.tipo] || ''}</span>
                                      <span className="text-gray-300 dark:text-gray-600">·</span>
                                      <span>{fav.context.turno === '2' ? '2T' : '1T'}</span>
                                    </div>
                                    {/* Line 2: Scope + Location + Ambiente */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        fav.context.scopeLevel === 'br'
                                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                                          : fav.context.scopeLevel === 'uf'
                                            ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300'
                                      }`}>
                                        {fav.context.scopeLevel === 'br' ? 'BR' : fav.context.scopeLevel === 'uf' ? fav.context.ufCd : `${fav.context.munNome || fav.context.munCdTse}`}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        fav.environment.ambiente === 'oficial'
                                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                      }`}>
                                        {fav.environment.ambiente}
                                      </span>
                                      {isInvalid && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-50 text-red-500 dark:bg-red-900/20">
                                          Indisponível
                                        </span>
                                      )}
                                    </div>
                                    {/* Alias (secondary, only if renamed differently from auto-name) */}
                                    {fav.name && !fav.name.includes(fav.context.eleicaoNm) && (
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate italic">
                                        {fav.name}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditName(fav.name);
                                    setEditingId(fav.id);
                                  }}
                                  className="p-1.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                  title="Renomear favorito"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFavorite(fav.id);
                                  }}
                                  className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                  title="Remover favorito"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`hidden sm:block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm ${ambiente === 'oficial'
                  ? 'bg-green-600 border-green-400 text-white'
                  : 'bg-amber-400 border-amber-300 text-amber-900'
                }`}>
                {ambiente}
              </div>

              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                title={theme === 'light' ? 'Escuro' : 'Claro'}
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Hidden File Input for Dashboard */}
        <input
          id="local-file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".json"
          className="hidden"
        />
      </header>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
