import { useState } from 'react';
import { useBRData, useAllUFData } from '../hooks/useElectionData';
import { useUFDataByRegion, useRegionAggregation } from '../hooks/useRegionAggregation';
import { RegionMap } from '../components/RegionMap';
import { RegionCard } from '../components/RegionCard';
import { ProgressBar } from '../components/ProgressBar';
import type { Turno, Region } from '../types/election';

interface ByRegionProps {
  turno: Turno;
}

export function ByRegion({ turno }: ByRegionProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const { data: brData, isLoading: brLoading } = useBRData(turno);
  
  const ufQueries = useAllUFData(turno);
  const ufData = ufQueries.map(q => q.data);
  const isLoading = brLoading;
  const isError = ufQueries.some(q => q.isError);
  
  const dataByUF = useUFDataByRegion(ufData);
  const regions = useRegionAggregation(dataByUF);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados por região...</p>
        </div>
      </div>
    );
  }

  if (isError || !brData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">Erro ao carregar dados</p>
      </div>
    );
  }

  const handleRegionClick = (region: string) => {
    setSelectedRegion(region as Region);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 dark:border dark:border-slate-800 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Votação por Região - Presidente
        </h1>
        <ProgressBar percentage={brData.vp} label="Totalização Nacional" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Mapa do Brasil</h2>
          <RegionMap regions={regions} onRegionClick={handleRegionClick} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Regiões</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {regions.map((region) => (
              <RegionCard
                key={region.region}
                regionData={region}
                onClick={() => handleRegionClick(region.region)}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedRegion && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto dark:border dark:border-slate-800 transition-colors duration-300">
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {regions.find(r => r.region === selectedRegion)?.regionName}
              </h2>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-4">
              <RegionCard regionData={regions.find(r => r.region === selectedRegion)!} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
