import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useEnvironment } from '../context/EnvironmentContext';
import { SettingsModal } from './SettingsModal';
import { useState, useRef } from 'react';
import type { EA20Response } from '../types/ea20';


export function Header({ onLocalFileLoaded }: { onLocalFileLoaded: (data: EA20Response) => void }) {
  const { theme, toggleTheme } = useTheme();
  const { ambiente } = useEnvironment();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onLocalFileLoaded(json);
        // Reset input
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
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold">
              Validador de Arquivos de Resultados
            </Link>
          </div>

          <nav className="flex gap-2">
            <Link
              to="/regioes"
              className="px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-800 transition"
            >
              Por Região
            </Link>
            <Link
              to="/timeline"
              className="px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-800 transition"
            >
              Download
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded bg-blue-800 dark:bg-slate-800 hover:bg-blue-900 dark:hover:bg-slate-700 transition flex items-center gap-2 border border-blue-400 dark:border-slate-600 shadow-inner"
              title="Abrir e validar um arquivo EA20 local (.json)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span>Local EA20</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </nav>

          <div className="flex items-center gap-3">
            {/* Quick Environment Status */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm transition-all border ${
              ambiente === 'oficial' 
                ? 'bg-blue-600 border-blue-400 text-white' 
                : 'bg-amber-400 border-amber-300 text-amber-900'
            }`}>
              <span className="capitalize">{ambiente}</span>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-blue-600 dark:hover:bg-blue-800 transition-colors"
              title="Configurações do Sistema"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-blue-600 dark:hover:bg-blue-800 transition-colors"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
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
    </header>
    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
  </>
  );
}

