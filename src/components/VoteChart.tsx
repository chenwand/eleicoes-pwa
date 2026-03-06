import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
  const sortedCandidates = [...candidates].sort((a, b) => b.pvap - a.pvap);
  const topCandidates = sortedCandidates.slice(0, 6);
  
  const chartData: ChartDataPoint[] = topCandidates.map(c => ({
    name: c.nm.length > 15 ? c.nm.substring(0, 15) + '...' : c.nm,
    fullName: c.nm,
    votes: c.vap,
    percentage: c.pvap,
    party: c.cc
  }));

  if (type === 'pie') {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Distribuição de Votos</h3>
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
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)}%`}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Votação por Candidato</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => v.toLocaleString('pt-BR')} />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number, name: string, props: { payload: ChartDataPoint }) => [
              `${value.toLocaleString('pt-BR')} votes (${props.payload.percentage.toFixed(2)}%)`,
              props.payload.fullName
            ]}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
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
