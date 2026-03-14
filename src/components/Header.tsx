import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import type { Turno } from '../types/election';

interface HeaderProps {
  turno: Turno;
  onTurnoChange: (turno: Turno) => void;
}

export function Header({ turno, onTurnoChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-blue-700 dark:bg-blue-900 text-white shadow-lg transition-colors duration-300">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold">
              Eleições 2026
            </Link>
            <span className="bg-blue-800 dark:bg-blue-950 px-3 py-1 rounded text-sm">
              {turno}º Turno
            </span>
          </div>
          
          <nav className="flex gap-2">
            <Link 
              to="/" 
              className="px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-800 transition"
            >
              Consultar Pleito
            </Link>
            <Link 
              to="/resultados" 
              className="px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-800 transition"
            >
              Resultados Prévios
            </Link>
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
              Evolução
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-2">
              <span className="text-sm">Turno:</span>
              <select
                value={turno}
                onChange={(e) => onTurnoChange(Number(e.target.value) as Turno)}
                className="bg-blue-800 dark:bg-blue-950 text-white px-3 py-1 rounded border-none cursor-pointer"
              >
                <option value={1}>1º Turno</option>
                <option value={2}>2º Turno</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
