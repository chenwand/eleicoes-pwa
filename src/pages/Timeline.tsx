import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getCachedTimeline, getLatestSnapshot, processElectionDataForTimeline } from '../services/timelineService';
import { buildBRURL } from '../services/tseApi';
import { ProgressBar } from '../components/ProgressBar';
import type { TimelineEntry, Turno } from '../types/election';

interface TimelineProps {
  turno: Turno;
}

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

export function Timeline({ turno }: TimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestData, setLatestData] = useState<TimelineEntry | null>(null);

  useEffect(() => {
    const loadTimeline = async () => {
      setLoading(true);
      try {
        const entries = await getCachedTimeline();
        setTimeline(entries);
        
        const latest = await getLatestSnapshot(buildBRURL(turno));
        if (latest) {
          setLatestData(processElectionDataForTimeline(latest));
        }
      } catch (error) {
        console.error('Error loading timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTimeline();
    const interval = setInterval(loadTimeline, 30000);
    return () => clearInterval(interval);
  }, [turno]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando evolução da votação...</p>
        </div>
      </div>
    );
  }

  const chartData = timeline.map((entry) => {
    const data: Record<string, string | number> = {
      time: new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      totalVotes: entry.totalVotes,
      totalized: entry.percentageTotalized
    };
    
    entry.candidates.forEach((cand) => {
      data[cand.name] = cand.percentage;
    });
    
    return data;
  });

  const allCandidates = latestData?.candidates ?? [];
  const topCandidates = allCandidates.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Evolução da Votação - Presidente
        </h1>
        {latestData && (
          <ProgressBar percentage={latestData.percentageTotalized} label="Totalização Atual" />
        )}
      </div>

      {chartData.length > 1 ? (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Evolução Percentual por Candidato
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(2)}%`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              {topCandidates.map((cand, index) => (
                <Line
                  key={cand.candidateId}
                  type="monotone"
                  dataKey={cand.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={cand.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-700">
            Dados insuficientes para gráfico de evolução. 
            Aguarde mais atualizações da totalização.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          Histórico de Atualizações
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Horário</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Votos</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Totalizado</th>
              </tr>
            </thead>
            <tbody>
              {timeline.slice(-10).reverse().map((entry, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(entry.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {entry.totalVotes.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {entry.percentageTotalized.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
