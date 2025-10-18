"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_COLORS = {
  'Conflict': '#e63946',
  'Politics': '#ffd166',
  'Science': '#118ab2',
  'Technology': '#118ab2',
  'Culture': '#ef476f',
  'Environment': '#06d6a0',
  'World': '#4cc9f0',
  'Economy': '#f72585',
  'Revolution': '#ff006e',
  'Exploration': '#8338ec',
  'Disaster': '#fb5607'
};

export default function CategoryChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#D4AF37] mb-4">Event Categories</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0b0b0b] border border-[#D4AF37] rounded-lg p-3 shadow-lg">
          <p className="text-[#D4AF37] font-bold">{payload[0].payload.category}</p>
          <p className="text-gray-300">{payload[0].value} events</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-bold text-[#D4AF37] mb-4">Event Categories Distribution</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis 
            dataKey="category" 
            stroke="#888"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke="#888" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={CATEGORY_COLORS[entry.category] || '#D4AF37'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {data.slice(0, 6).map((item) => (
          <div key={item.category} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#D4AF37' }}
            />
            <span className="text-xs text-gray-400">{item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

