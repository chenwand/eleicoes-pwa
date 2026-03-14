import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import type { Candidate } from '../types/election';

interface VoteChartProps {
  candidates: Candidate[];
  type?: 'bar' | 'pie';
}

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e91e63', '#00bcd4'];

interface ChartDataPoint {
  name: string;
  fullName: string;
  votes: number;
  percentage: number;
  party: string;
}

export function VoteChart({ candidates, type = 'bar' }: VoteChartProps) {
  const { theme } = useTheme();
  const sortedCandidates = [...candidates].sort((a, b) => b.pvap - a.pvap);
  const topCandidates = sortedCandidates.slice(0, 6);
  
  const chartData: ChartDataPoint[] = topCandidates.map(c => ({
    name: c.nm.length > 15 ? c.nm.substring(0, 15) + '...' : c.nm,
    fullName: c.nm,
    votes: c.vap,
    percentage: c.pvap,
    party: c.cc
  }));

  const labelColor = theme === 'dark' ? '#9ca3af' : '#4b5563';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e5e7eb';
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#1e293b' : '#e5e7eb';
  const tooltipText = theme === 'dark' ? '#f9fafb' : '#111827';

  if (type === 'pie') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 dark:border dark:border-slate-800 transition-colors duration-300">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Distribuição de Votos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="percentage"
              nameKey="name"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={({ percent, name }: any) => {
                return `${name}: ${(percent * 100).toFixed(1)}%`;
              }}
              labelLine={false}
              style={{ fontSize: '12px', fill: labelColor }}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number, name: string) => [`${value.toFixed(2)}%`, name]) as any}
              contentStyle={{ 
                borderRadius: '8px', 
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                color: tooltipText,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
              }}
              itemStyle={{ color: tooltipText }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 dark:border dark:border-slate-800 transition-colors duration-300">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Votação por Candidato</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            type="number" 
            tickFormatter={(v) => v.toLocaleString('pt-BR')} 
            tick={{ fill: labelColor, fontSize: 10 }}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={100}
            tick={{ fontSize: 11, fill: labelColor }}
            axisLine={{ stroke: gridColor }}
          />
          <Tooltip 
            formatter={(value: number | string, _name: string, props: any) => [
              `${Number(value).toLocaleString('pt-BR')} votos (${props.payload.percentage.toFixed(2)}%)`,
              props.payload.fullName || _name
            ]}
            contentStyle={{ 
              borderRadius: '8px', 
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              color: tooltipText,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
            }}
            itemStyle={{ color: tooltipText }}
          />
          <Bar dataKey="votes" fill="#3498db" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
