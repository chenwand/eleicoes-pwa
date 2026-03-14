import { useState } from 'react';
import { useBRData } from '../hooks/useElectionData';
import { CargoSelector } from '../components/CargoSelector';
import { CandidateList } from '../components/CandidateList';
import { VoteChart } from '../components/VoteChart';
import { ProgressBar } from '../components/ProgressBar';
import type { Cargo, Turno } from '../types/election';

interface HomeProps {
  turno: Turno;
}

export function Home({ turno }: HomeProps) {
  const [cargo, setCargo] = useState<Cargo>('presidente');
  const { data, isLoading, isError } = useBRData(turno);

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

  const cargoData = data.carg.find(c => 
    cargo === 'presidente' && c.cd === 1 ||
    cargo === 'governador' && c.cd === 3 ||
    cargo === 'senador' && c.cd === 5 ||
    cargo === 'deputado-federal' && c.cd === 11 ||
    cargo === 'deputado-estadual' && c.cd === 13 ||
    cargo === 'vereador' && c.cd === 15
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 dark:border dark:border-slate-800 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Resultados Nacionais</h1>
        <ProgressBar percentage={data.vp} label="Totalização Nacional" />
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

      <CargoSelector cargo={cargo} onCargoChange={setCargo} />

      {cargoData && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <VoteChart candidates={cargoData.cand} type="bar" />
            <VoteChart candidates={cargoData.cand} type="pie" />
          </div>
          <CandidateList candidates={cargoData.cand} />
        </>
      )}
    </div>
  );
}
