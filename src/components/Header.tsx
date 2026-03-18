import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useEnvironment } from '../context/EnvironmentContext';


export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { ambiente, setAmbiente } = useEnvironment();

  return (
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
          </nav>

          <div className="flex items-center gap-3">
            {/* Environment toggle */}
            <div className="flex items-center bg-blue-800/50 dark:bg-blue-950/50 rounded-full p-0.5 text-sm font-medium shadow-inner">
              <button
                onClick={() => setAmbiente('oficial')}
                className={`px-3 py-1 rounded-full transition-all ${ambiente === 'oficial' ? 'bg-white text-blue-800 shadow font-semibold' : 'text-blue-200 hover:text-white'}`}
                title="Usar dados oficiais do TSE"
              >
                Oficial
              </button>
              <button
                onClick={() => setAmbiente('simulado')}
                className={`px-3 py-1 rounded-full transition-all ${ambiente === 'simulado' ? 'bg-amber-400 text-amber-900 shadow font-semibold' : 'text-blue-200 hover:text-white'}`}
                title="Usar dados do ambiente simulado do TSE"
              >
                Simulado
              </button>
            </div>

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
  );
}

