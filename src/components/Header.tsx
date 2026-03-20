import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useEnvironment } from '../context/EnvironmentContext';
import { useElection } from '../context/ElectionContext';
import { SettingsModal } from './SettingsModal';
import { useState, useRef } from 'react';

export function Header({ onLocalFileLoaded }: { onLocalFileLoaded: (data: { type: 'EA11' | 'EA14' | 'EA15' | 'EA20', data: any }) => void }) {
  const { theme, toggleTheme } = useTheme();
  const { ambiente } = useEnvironment();
  const { selectedEleicao, selectedAbrangencia, switchTurno } = useElection();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        onLocalFileLoaded({ type, data: json });
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
              {selectedEleicao && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-bold text-blue-100/80 uppercase tracking-widest">
                      {selectedEleicao.nm.replace(/&#186;/g, 'º')}
                    </span>
                    <span className="text-[10px] text-blue-200/60 font-medium truncate max-w-[250px] sm:max-w-none">
                      Turno {selectedEleicao.t} • {selectedAbrangencia ? `${selectedAbrangencia.munNome} (${selectedAbrangencia.ufCd})` : 'Sem abrangência'} • ID {selectedEleicao.cd}
                    </span>
                  </div>

                  {/* Round Switcher */}
                  {(selectedEleicao.cdt2 || selectedEleicao.t === '2') && (
                    <button
                      className="ml-2 px-2 py-0.5 text-[9px] bg-white/20 hover:bg-white/30 rounded uppercase font-bold transition-colors"
                      title={selectedEleicao.t === '1' ? "Mudar para 2º Turno" : "Mudar para 1º Turno"}
                      onClick={switchTurno}
                    >
                      Mudar Turno
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
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
