"use client";

import { motion } from "framer-motion";

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📚' },
  { id: 'Breaking', label: 'Breaking', icon: '🔥' },
  { id: 'World', label: 'World', icon: '🌍' },
  { id: 'Politics', label: 'Politics', icon: '🏛️' },
  { id: 'Science', label: 'Science', icon: '🔬' },
  { id: 'Tech', label: 'Tech', icon: '💻' },
  { id: 'Environment', label: 'Environment', icon: '🌱' },
  { id: 'Conflict', label: 'Conflict', icon: '⚔️' },
  { id: 'Economy', label: 'Economy', icon: '💰' }
];

export default function FilterChips({ selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.id;
        
        return (
          <motion.button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
              isSelected
                ? 'bg-[#D4AF37] text-[#0b0b0b] shadow-lg shadow-[#D4AF37]/30'
                : 'bg-[#1a1a1a] text-gray-400 border border-gray-700 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

