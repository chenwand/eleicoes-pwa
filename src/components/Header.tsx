import { Link } from 'react-router-dom';
import type { Turno } from '../types/election';

interface HeaderProps {
  turno: Turno;
  onTurnoChange: (turno: Turno) => void;
}

export function Header({ turno, onTurnoChange }: HeaderProps) {
  return (
    <header className="bg-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold">
              Eleições 2026
            </Link>
            <span className="bg-blue-800 px-3 py-1 rounded text-sm">
              {turno}º Turno
            </span>
          </div>
          
          <nav className="flex gap-2">
            <Link 
              to="/" 
              className="px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Consultar Pleito
            </Link>
            <Link 
              to="/resultados" 
              className="px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Resultados Prévios
            </Link>
            <Link 
              to="/regioes" 
              className="px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Por Região
            </Link>
            <Link 
              to="/timeline" 
              className="px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Evolução
            </Link>
          </nav>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">Turno:</span>
            <select
              value={turno}
              onChange={(e) => onTurnoChange(Number(e.target.value) as Turno)}
              className="bg-blue-800 text-white px-3 py-1 rounded border-none"
            >
              <option value={1}>1º Turno</option>
              <option value={2}>2º Turno</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
