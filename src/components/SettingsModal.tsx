import { useState } from 'react';
import { useEnvironment } from '../context/EnvironmentContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { 
    ambiente, setAmbiente, 
    host, setHost, 
    availableEnvironments, setAvailableEnvironments 
  } = useEnvironment();

  const [tempHost, setTempHost] = useState(host);
  const [tempAmbiente, setTempAmbiente] = useState(ambiente);
  const [newEnv, setNewEnv] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    setHost(tempHost);
    setAmbiente(tempAmbiente);
    onClose();
  };

  const addEnvironment = () => {
    if (newEnv && !availableEnvironments.includes(newEnv)) {
      setAvailableEnvironments([...availableEnvironments, newEnv]);
      setNewEnv('');
    }
  };

  const removeEnvironment = (env: string) => {
    if (availableEnvironments.length > 1) {
      setAvailableEnvironments(availableEnvironments.filter(e => e !== env));
      if (tempAmbiente === env) {
        setTempAmbiente(availableEnvironments.find(e => e !== env) || '');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configurações do Sistema
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Host Configuration */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              Host da API (Base URL)
            </label>
            <input
              type="text"
              value={tempHost}
              onChange={(e) => setTempHost(e.target.value)}
              placeholder="https://resultados.tse.jus.br"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                'https://resultados.tse.jus.br',
                'https://resultados-hmg.tse.jus.br',
                '/tse-api'
              ].map(h => (
                <button
                  key={h}
                  onClick={() => setTempHost(h)}
                  className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                    tempHost === h 
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300' 
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {h === '/tse-api' ? 'Local Proxy' : h.replace('https://', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Environment Configuration */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ambiente de Dados
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableEnvironments.map((env) => (
                <div key={env} className="relative group">
                  <button
                    onClick={() => setTempAmbiente(env)}
                    className={`w-full px-3 py-2 text-sm rounded-lg border transition-all flex items-center justify-between ${
                      tempAmbiente === env
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="capitalize">{env}</span>
                    {tempAmbiente === env && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                  {!['oficial', 'simulado'].includes(env) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeEnvironment(env); }}
                      className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={newEnv}
                onChange={(e) => setNewEnv(e.target.value.toLowerCase())}
                placeholder="Novo ambiente..."
                className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={addEnvironment}
                className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
