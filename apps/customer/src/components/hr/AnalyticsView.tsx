// @ts-nocheck
import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, Tag } from 'antd';

const mockGenderData = [
  { name: 'Male', value: 120, color: '#1890ff' },
  { name: 'Female', value: 100, color: '#f39c12' },
  { name: 'Non-Binary/Other', value: 10, color: '#2ecc71' },
];

const mockEthnicityData = [
  { name: 'White', value: 150, color: '#9b59b6' },
  { name: 'Asian', value: 40, color: '#3498db' },
  { name: 'Hispanic/Latinx', value: 25, color: '#e67e22' },
  { name: 'Black/African American', value: 10, color: '#c0392b' },
  { name: 'Other/Declined', value: 5, color: '#7f8c8d' },
];

const mockRetentionData = [
  { tenure: '0-1 Yr', rate: 75, color: '#e74c3c' },
  { tenure: '1-3 Yrs', rate: 88, color: '#f39c12' },
  { tenure: '3-5 Yrs', rate: 95, color: '#2ecc71' },
  { tenure: '5+ Yrs', rate: 98, color: '#1890ff' },
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: '12px', fontWeight: 600 }}
    >
      {`${name || ''} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        padding: '12px',
        background: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontSize: '14px',
      }}>
        <p style={{ fontWeight: 700, color: '#333', marginBottom: '4px' }}>{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} style={{ color: p.color, fontSize: '14px', margin: 0 }}>
            {p.name}: <span style={{ fontWeight: 600 }}>{p.value}{p.name.includes('Rate') ? '%' : ''}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsView: React.FC = () => {
  const overallPayGap = -3.5;
  const gapColor = overallPayGap < 0 ? '#ff4d4f' : '#52c41a';
  const GapIcon = overallPayGap < 0 ? TrendingDown : TrendingUp;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#000', display: 'flex', alignItems: 'center' }}>
        <BarChart3 style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
        Deep Workforce Analytics
      </h2>

      {/* DEI & Pay Gap Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Overall Gender Pay Gap
          </h3>
          <p style={{ fontSize: '28px', fontWeight: 700, color: gapColor, margin: 0 }}>
            {Math.abs(overallPayGap).toFixed(1)}%
          </p>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
            <GapIcon style={{ width: '16px', height: '16px', marginRight: '4px', color: gapColor }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: gapColor }}>
              {overallPayGap < 0 ? 'Favors Male' : 'Favors Female'}
            </span>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Minority Representation
          </h3>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#1890ff', margin: 0 }}>29.1%</p>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Goal: 35% by EOY</p>
        </Card>

        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Turnover in First Year
          </h3>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#ff4d4f', margin: 0 }}>25%</p>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>High-Risk Indicator</p>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
        {/* Diversity Pie Chart */}
        <Card>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
            Ethnicity Breakdown (Total Workforce)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockEthnicityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {mockEthnicityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Retention Bar Chart */}
        <Card>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
            Retention Rate by Tenure Group
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockRetentionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="tenure" stroke="#777" />
              <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} stroke="#777" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" name="Retention Rate" fill="#ff7e41">
                {mockRetentionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsView;

