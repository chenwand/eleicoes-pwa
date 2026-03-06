import type { RegionData } from '../types/election';
import { ProgressBar } from './ProgressBar';

interface RegionCardProps {
  regionData: RegionData;
  onClick?: () => void;
}

const candidateColors: Record<number, string> = {
  1: '#e74c3c',
  2: '#3498db', 
  3: '#2ecc71',
  4: '#f39c12',
  5: '#9b59b6',
  6: '#1abc9c',
  7: '#e91e63',
  8: '#00bcd4',
};

export function RegionCard({ regionData, onClick }: RegionCardProps) {
  const leader = regionData.candidates[0];
  
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition cursor-pointer ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <h3 className="text-lg font-bold text-gray-800 mb-2">
        {regionData.regionName}
      </h3>
      
      <ProgressBar 
        percentage={regionData.percentageTotalized} 
        label="Totalizado"
      />
      
      <div className="mt-4">
        {leader ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: candidateColors[leader.candidateId % 8] || '#666' }}
              />
              <span className="font-semibold text-gray-800">
                {leader.name}
              </span>
              <span className="text-sm text-gray-500">
                ({leader.party})
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {leader.percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              {leader.votes.toLocaleString('pt-BR')} votos
            </div>
          </>
        ) : (
          <div className="text-gray-500">Dados não disponíveis</div>
        )}
      </div>
      
      <div className="mt-3 text-sm text-gray-500">
        Total: {regionData.totalVotes.toLocaleString('pt-BR')} votos
      </div>
    </div>
  );
}
