import { useBRData } from '../hooks/useElectionData';
import { useElection } from '../context/ElectionContext';
import { useEnvironment } from '../context/EnvironmentContext';
import type { Turno } from '../types/election';

interface HomeProps {
  turno: Turno;
}

export function Home({ turno }: HomeProps) {
  const { ciclo, selectedEleicao } = useElection();
  const { ambiente } = useEnvironment();
  const { data, isLoading, isError } = useBRData(ciclo, selectedEleicao?.cd || '', ambiente, turno);


  if (!selectedEleicao || !ciclo) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
        <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p className="text-blue-700 dark:text-blue-300 font-bold text-lg">Nenhuma eleição selecionada</p>
        <p className="text-blue-600 dark:text-blue-400 mt-2">Selecione uma eleição no Dashboard para visualizar os resultados nacionais.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados eleitorais...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">Erro ao carregar dados</p>
        <p className="text-red-500 text-sm">Tente novamente em alguns instantes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 dark:border dark:border-slate-800 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Resultados Nacionais</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.s.toLocaleString('pt-BR')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Eleitores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.v.toLocaleString('pt-BR')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Votos Válidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.vn.toLocaleString('pt-BR')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Votos Nulos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{data.vbl.toLocaleString('pt-BR')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Votos Brancos</div>
          </div>
        </div>
      </div>

    </div>
  );
}
