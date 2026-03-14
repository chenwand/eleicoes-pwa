import type { Cargo } from '../types/election';
import { getCargoName } from '../services/tseApi';

interface CargoSelectorProps {
  cargo: Cargo;
  onCargoChange: (cargo: Cargo) => void;
}

const Cargos: Cargo[] = [
  'presidente',
  'governador',
  'senador',
  'deputado-federal',
  'deputado-estadual',
  'vereador'
];

export function CargoSelector({ cargo, onCargoChange }: CargoSelectorProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 dark:border dark:border-slate-800 transition-colors duration-300">
      <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Selecione o Cargo</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Cargos.map((c) => (
          <button
            key={c}
            onClick={() => onCargoChange(c)}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              cargo === c
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {getCargoName(c)}
          </button>
        ))}
      </div>
    </div>
  );
}
