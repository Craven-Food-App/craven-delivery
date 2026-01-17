import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Legend,
} from 'recharts';
import { GlassmorphicCard } from './GlassmorphicCard';

interface ChartProps {
  data: any[];
  type?: 'line' | 'area' | 'bar' | 'pie' | 'radar' | 'composed';
  title?: string;
  height?: number;
  colors?: string[];
  dataKeys?: { [key: string]: string };
}

const defaultColors = [
  '#2563eb',
  '#059669',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#0ea5e9',
  '#65a30d',
];

export const FuturisticChart: React.FC<ChartProps> = ({
  data,
  type = 'line',
  title,
  height = 300,
  colors = defaultColors,
  dataKeys = {},
}) => {
  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[1]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors[1]} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#475467" />
              <YAxis stroke="#475467" />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937',
                }}
              />
              <Legend />
              <Area type="monotone" dataKey={dataKeys.revenue || 'Revenue'} stroke={colors[0]} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey={dataKeys.profit || 'Profit'} stroke={colors[1]} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#475467" />
              <YAxis stroke="#475467" />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937',
                }}
              />
              <Legend />
              <Bar dataKey={dataKeys.revenue || 'Revenue'} fill={colors[0]} radius={[8, 8, 0, 0]} />
              <Bar dataKey={dataKeys.expenses || 'Expenses'} fill={colors[1]} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={data}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" stroke="#475467" />
              <PolarRadiusAxis stroke="#e5e7eb" />
              <Radar name="Value" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );
      
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#475467" />
              <YAxis yAxisId="left" stroke="#475467" />
              <YAxis yAxisId="right" orientation="right" stroke="#475467" />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937',
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey={dataKeys.revenue || 'Revenue'} fill={colors[0]} fillOpacity={0.6} stroke={colors[0]} />
              <Bar yAxisId="right" dataKey={dataKeys.expenses || 'Expenses'} fill={colors[1]} radius={[8, 8, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey={dataKeys.profit || 'Profit'} stroke={colors[2]} strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      
      default: // line
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#475467" />
              <YAxis stroke="#475467" />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey={dataKeys.revenue || 'Revenue'} stroke={colors[0]} strokeWidth={3} dot={{ fill: colors[0], r: 4 }} />
              <Line type="monotone" dataKey={dataKeys.profit || 'Profit'} stroke={colors[1]} strokeWidth={3} dot={{ fill: colors[1], r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <GlassmorphicCard>
      {title && (
        <h3 style={{
          color: '#101828',
          fontSize: '20px',
          fontWeight: 700,
          marginBottom: '20px',
        }}>
          {title}
        </h3>
      )}
      {renderChart()}
    </GlassmorphicCard>
  );
};

