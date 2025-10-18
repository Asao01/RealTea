"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TRUST_COLORS = {
  'Highly Trusted': '#00ffaa',
  'Trusted': '#4cc9f0',
  'Moderate': '#ffd166',
  'Low Trust': '#e63946'
};

export default function SourceReliabilityChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#D4AF37] mb-4">Source Reliability</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No source data available
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b0b0b] border border-[#D4AF37] rounded-lg p-3 shadow-lg">
          <p className="text-[#D4AF37] font-bold mb-1">{data.domain}</p>
          <p className="text-gray-300 text-sm">Used: {data.count} times</p>
          <p className="text-gray-300 text-sm">Avg Credibility: {data.avgCredibility}/100</p>
          <p className="text-gray-300 text-sm">Trust: {data.trustLevel}</p>
        </div>
      );
    }
    return null;
  };

  // Show top 15 sources
  const topSources = data.slice(0, 15);

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#D4AF37]">Source Reliability Dashboard</h3>
        <span className="text-xs text-gray-500">{data.length} unique sources</span>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topSources}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis 
            dataKey="domain" 
            stroke="#888"
            angle={-45}
            textAnchor="end"
            height={150}
            tick={{ fontSize: 11 }}
          />
          <YAxis stroke="#888" label={{ value: 'Avg Credibility', angle: -90, position: 'insideLeft', fill: '#888' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="avgCredibility" radius={[8, 8, 0, 0]}>
            {topSources.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={TRUST_COLORS[entry.trustLevel] || '#D4AF37'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4">
        {Object.entries(TRUST_COLORS).map(([level, color]) => (
          <div key={level} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-400">{level}</span>
          </div>
        ))}
      </div>
      
      {/* Top 3 Most Trusted */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Most Trusted Sources</h4>
        <div className="space-y-2">
          {topSources
            .filter(s => s.trustLevel === 'Highly Trusted')
            .slice(0, 3)
            .map((source, index) => (
              <div key={source.domain} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#00ffaa]">#{index + 1}</span>
                  <span className="text-gray-300">{source.domain}</span>
                </div>
                <span className="text-gray-500">{source.avgCredibility}/100</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

