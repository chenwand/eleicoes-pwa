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
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden dark:border dark:border-slate-800 transition-colors duration-300">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">#</th>
              {showParty && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Partido</th>}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Candidato</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">Votos</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {sortedCandidates.map((candidate, index) => (
              <tr key={candidate.sqcand} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">{index + 1}º</span>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: candidateColors[candidate.n] || '#666' }}
                    />
                  </div>
                </td>
                {showParty && (
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    {candidate.cc}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                  {candidate.nm}
                  {candidate.nv && <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">(Vice: {candidate.nv})</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                  {candidate.vap.toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${
                    candidate.pvap > 50 ? 'text-green-600 dark:text-green-400' : 
                    candidate.pvap > 10 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
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
