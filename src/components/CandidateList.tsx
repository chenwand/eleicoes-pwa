import type { Candidate } from '../types/election';

interface CandidateListProps {
  candidates: Candidate[];
  showParty?: boolean;
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

export function CandidateList({ candidates, showParty = true }: CandidateListProps) {
  const sortedCandidates = [...candidates].sort((a, b) => b.pvap - a.pvap);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
              {showParty && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Partido</th>}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Candidato</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Votos</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">%</th>
            </tr>
          </thead>
          <tbody>
            {sortedCandidates.map((candidate, index) => (
              <tr key={candidate.sqcand} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">{index + 1}º</span>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: candidateColors[candidate.n] || '#666' }}
                    />
                  </div>
                </td>
                {showParty && (
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {candidate.cc}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-800">
                  {candidate.nm}
                  {candidate.nv && <span className="text-gray-500 text-sm ml-1">(Vice: {candidate.nv})</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {candidate.vap.toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${
                    candidate.pvap > 50 ? 'text-green-600' : 
                    candidate.pvap > 10 ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {candidate.pvap.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
