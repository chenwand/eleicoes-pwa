import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getCachedTimeline, getLatestSnapshot, processElectionDataForTimeline } from '../services/timelineService';
import { buildBRURL } from '../services/tseApi';
import { ProgressBar } from '../components/ProgressBar';
import { useTheme } from '../context/ThemeContext';
import type { TimelineEntry, Turno } from '../types/election';

interface TimelineProps {
  turno: Turno;
}

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

export function Timeline({ turno }: TimelineProps) {
  const { theme } = useTheme();
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando evolução da votação...</p>
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

  const labelColor = theme === 'dark' ? '#9ca3af' : '#4b5563';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e5e7eb';
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#1e293b' : '#e5e7eb';
  const tooltipText = theme === 'dark' ? '#f9fafb' : '#111827';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 dark:border dark:border-slate-800 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Evolução da Votação - Presidente
        </h1>
        {latestData && (
          <ProgressBar percentage={latestData.percentageTotalized} label="Totalização Atual" />
        )}
      </div>

      {chartData.length > 1 ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 dark:border dark:border-slate-800 transition-colors duration-300">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
            Evolução Percentual por Candidato
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="time" 
                tick={{ fill: labelColor, fontSize: 10 }}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis 
                domain={[0, 100]} 
                tickFormatter={(v) => `${v}%`} 
                tick={{ fill: labelColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
              />
              <Tooltip 
                formatter={(value: number | string, name: string) => [`${Number(value).toFixed(2)}%`, name]}
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  color: tooltipText,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
                }}
                itemStyle={{ color: tooltipText }}
              />
              <Legend />
              {topCandidates.map((cand, index) => (
                <Line
                  key={cand.candidateId}
                  type="monotone"
                  dataKey={cand.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={3}
                  dot={{ r: 4, fill: COLORS[index % COLORS.length], strokeWidth: 2, stroke: tooltipBg }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name={cand.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 text-center">
          <p className="text-yellow-700 dark:text-yellow-400">
            Dados insuficientes para gráfico de evolução. 
            Aguarde mais atualizações da totalização.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 dark:border dark:border-slate-800 transition-colors duration-300">
        <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
          Histórico de Atualizações
        </h2>
        <div className="overflow-x-auto rounded-lg border dark:border-slate-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Horário</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Votos</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Totalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {timeline.slice(-10).reverse().map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    {new Date(entry.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                    {entry.totalVotes.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-semibold">
                      {entry.percentageTotalized.toFixed(1)}%
                    </span>
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
