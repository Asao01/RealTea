"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const ERAS = [
  { label: "1600s", start: 1600, end: 1699, color: "#8B4513" },
  { label: "1700s", start: 1700, end: 1799, color: "#CD853F" },
  { label: "1800s", start: 1800, end: 1899, color: "#DAA520" },
  { label: "1900s", start: 1900, end: 1999, color: "#FFD700" },
  { label: "2000s", start: 2000, end: 2024, color: "#D4AF37" },
  { label: "Today", start: 2024, end: 2025, color: "#00ffaa" }
];

export default function EraSlider({ onRangeChange, initialRange = [1600, 2025] }) {
  const [yearRange, setYearRange] = useState(initialRange);
  const [selectedEra, setSelectedEra] = useState(null);
  const [isCustom, setIsCustom] = useState(false);

  // Calculate percentage for visual progress bar
  const minYear = 1600;
  const maxYear = 2025;
  const totalYears = maxYear - minYear;
  
  const startPercent = ((yearRange[0] - minYear) / totalYears) * 100;
  const endPercent = ((yearRange[1] - minYear) / totalYears) * 100;

  useEffect(() => {
    if (onRangeChange) {
      onRangeChange(yearRange);
    }
  }, [yearRange, onRangeChange]);

  const handleEraClick = (era) => {
    setSelectedEra(era.label);
    setYearRange([era.start, era.end]);
    setIsCustom(false);
  };

  const handleCustomRange = (index, value) => {
    const newRange = [...yearRange];
    newRange[index] = parseInt(value);
    
    // Ensure min <= max
    if (index === 0 && newRange[0] > newRange[1]) {
      newRange[1] = newRange[0];
    } else if (index === 1 && newRange[1] < newRange[0]) {
      newRange[0] = newRange[1];
    }
    
    setYearRange(newRange);
    setSelectedEra(null);
    setIsCustom(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Era Buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        <motion.button
          onClick={() => {
            setYearRange([minYear, maxYear]);
            setSelectedEra(null);
            setIsCustom(false);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
            !selectedEra && !isCustom
              ? 'bg-[#D4AF37] text-[#0b0b0b] shadow-lg shadow-[#D4AF37]/50'
              : 'bg-[#1a1a1a] text-gray-400 border border-gray-700 hover:border-[#D4AF37]/50'
          }`}
        >
          All Time
        </motion.button>

        {ERAS.map((era) => (
          <motion.button
            key={era.label}
            onClick={() => handleEraClick(era)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
              selectedEra === era.label
                ? 'text-[#0b0b0b] shadow-lg'
                : 'bg-[#1a1a1a] text-gray-400 border border-gray-700 hover:border-[#D4AF37]/50'
            }`}
            style={{
              backgroundColor: selectedEra === era.label ? era.color : undefined,
              boxShadow: selectedEra === era.label ? `0 0 20px ${era.color}50` : undefined
            }}
          >
            {era.label}
          </motion.button>
        ))}
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          {/* Selected Range Highlight */}
          <motion.div
            className="absolute h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C878]"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Era Markers */}
        <div className="absolute top-4 left-0 right-0 flex justify-between px-2">
          {ERAS.map((era) => {
            const position = ((era.start - minYear) / totalYears) * 100;
            return (
              <div
                key={era.label}
                className="flex flex-col items-center"
                style={{ position: 'absolute', left: `${position}%` }}
              >
                <div 
                  className="w-1 h-3 rounded-full"
                  style={{ backgroundColor: era.color }}
                />
                <span className="text-xs text-gray-500 mt-1">{era.start}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Range Sliders */}
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-gray-300">
            📅 Custom Year Range
          </label>
          <div className="text-lg font-bold text-[#D4AF37]">
            {yearRange[0]} - {yearRange[1]}
          </div>
        </div>

        <div className="space-y-4">
          {/* Start Year Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Start Year</span>
              <span className="font-mono text-[#D4AF37]">{yearRange[0]}</span>
            </div>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={yearRange[0]}
              onChange={(e) => handleCustomRange(0, e.target.value)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              style={{
                background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${startPercent}%, #374151 ${startPercent}%, #374151 100%)`
              }}
            />
          </div>

          {/* End Year Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>End Year</span>
              <span className="font-mono text-[#D4AF37]">{yearRange[1]}</span>
            </div>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={yearRange[1]}
              onChange={(e) => handleCustomRange(1, e.target.value)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              style={{
                background: `linear-gradient(to right, #374151 0%, #374151 ${endPercent}%, #D4AF37 ${endPercent}%, #D4AF37 100%)`
              }}
            />
          </div>
        </div>

        {/* Span Info */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Time Span:</span>
            <span className="font-semibold text-[#D4AF37]">
              {yearRange[1] - yearRange[0] + 1} years
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

