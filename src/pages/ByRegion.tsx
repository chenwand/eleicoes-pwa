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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Votação por Região - Presidente
        </h1>
        <ProgressBar percentage={brData.vp} label="Totalização Nacional" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Mapa do Brasil</h2>
          <RegionMap regions={regions} onRegionClick={handleRegionClick} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Regiões</h2>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {regions.find(r => r.region === selectedRegion)?.regionName}
              </h2>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
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
